// Split the single-file Honeylight main.js into modules, without changing what runs or in what order.
//   node split.js <game folder with the single main.js> <output folder>
// Rules:
// - A function declaration moves to its module as it is.
// - A constant whose value cannot depend on load order (numbers, plain lists, arrow functions, new V3(...)) stays a constant.
// - All other code that runs at load goes into "setup" functions. main.js calls them in the order of the old file,
//   so the seeded world and every random number stay the same. Names made there become module-level `let`.
const fs = require('fs'), path = require('path'), acorn = require('acorn'), walk = require('acorn-walk'), escope = require('eslint-scope');
const { analyze } = require('./analyze');
const MAP = require(path.resolve(process.argv[4] || path.join(__dirname, 'map.js')));
const SRC = process.argv[2], OUT = process.argv[3];
const src = fs.readFileSync(path.join(SRC, 'main.js'), 'utf8');
const A = analyze(src), S = A.S, V = A.vars;
const fail = []; const warn = [];

// ---- 1. give every statement a module and a step name
const rangeOf = line => { let r = null; for (const e of MAP.ranges) if (e[0] <= line) r = e; else break; return r; };
for (const s of S) {
  const r = rangeOf(s.line0); s.mod = r[1]; s.part = r[2];
  const ov = s.names.map(n => MAP.names[n]).filter(Boolean);
  if (ov.length) { if (ov.length !== s.names.length || new Set(ov).size > 1) fail.push(`names override must cover the whole statement at line ${s.line0}`); s.mod = ov[0]; }
}
for (const v of Object.values(V)) v.mod = S[v.stmt].mod;

// ---- 2. classify: import | fn | static | eager
const PURE = new Set(MAP.pureCtors), THREE_PURE = new Set(['Vector2', 'Vector3', 'Vector4', 'Quaternion', 'Matrix3', 'Matrix4', 'Color', 'Euler']);
const prim = new Map(); // name -> module, for constants with a plain number/string/boolean value
const baseIdx = m => MAP.base.indexOf(m);
function mk(cur) {
  const visible = m => m === cur || (baseIdx(m) >= 0 && (baseIdx(cur) < 0 || baseIdx(m) < baseIdx(cur)));
  const isMath = n => n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier' && n.object.name === 'Math';
  function isPrim(n) {
    switch (n.type) {
      case 'Literal': return !n.regex;
      case 'TemplateLiteral': return n.expressions.every(isPrim);
      case 'UnaryExpression': return ['-', '+', '!', '~'].includes(n.operator) && isPrim(n.argument);
      case 'BinaryExpression': case 'LogicalExpression': return isPrim(n.left) && isPrim(n.right);
      case 'ConditionalExpression': return isPrim(n.test) && isPrim(n.consequent) && isPrim(n.alternate);
      case 'Identifier': return ['Infinity', 'NaN', 'undefined'].includes(n.name) || (prim.has(n.name) && visible(prim.get(n.name)));
      case 'MemberExpression': return isMath(n);
      case 'CallExpression': return isMath(n.callee) && n.callee.property.name !== 'random' && n.arguments.every(isPrim);
    }
    return false;
  }
  const pureNew = n => n.type === 'NewExpression' && ((n.callee.type === 'Identifier' && PURE.has(n.callee.name)) ||
    (n.callee.type === 'MemberExpression' && !n.callee.computed && n.callee.object.type === 'Identifier' && n.callee.object.name === 'THREE' && THREE_PURE.has(n.callee.property.name))) && n.arguments.every(isStatic);
  const pureObj = n => pureNew(n) || (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && !n.callee.computed && pureObj(n.callee.object) && n.arguments.every(isStatic));
  function isStatic(n) {
    if (isPrim(n)) return true;
    switch (n.type) {
      case 'ArrowFunctionExpression': case 'FunctionExpression': return true;
      case 'ArrayExpression': return n.elements.every(e => e && e.type !== 'SpreadElement' && isStatic(e));
      case 'ObjectExpression': return n.properties.every(p => p.type === 'Property' && (!p.computed || isPrim(p.key)) && isStatic(p.value));
      case 'NewExpression': case 'CallExpression': return pureObj(n);
      case 'MemberExpression': return !n.computed && n.object.type === 'Identifier' && n.object.name === 'THREE';
      case 'Identifier': return V[n.name] && V[n.name].kind === 'FunctionName';
    }
    return false;
  }
  return { isPrim, isStatic };
}
for (const s of S) {
  const n = s.node;
  if (n.type === 'ImportDeclaration') { s.cls = 'import'; continue; }
  if (n.type === 'FunctionDeclaration') { s.cls = 'fn'; continue; }
  if (n.type === 'VariableDeclaration' && n.kind !== 'var') {
    const { isPrim, isStatic } = mk(s.mod);
    const added = []; // a declarator may use the ones before it in the same statement
    const ok = n.declarations.every(d => { if (d.id.type !== 'Identifier' || (d.init && !isStatic(d.init))) return false;
      if (n.kind === 'const' && d.init && isPrim(d.init)) { prim.set(d.id.name, s.mod); added.push(d.id.name); } return true; });
    if (ok) { s.cls = 'static'; continue; }
    for (const a of added) prim.delete(a);
  }
  s.cls = 'eager';
}

// ---- 3. checks on the map
for (const v of Object.values(V)) for (const w of v.writers) if (w !== v.stmt && S[w].mod !== v.mod)
  fail.push(`"${v.name}" belongs to ${v.mod} (line ${S[v.stmt].line0}) but is assigned in ${S[w].mod} (line ${S[w].line0})`);

// ---- 4. steps: runs of load-time code for one module, in the old order
const steps = []; { let cur = null;
  for (const s of S) if (s.cls === 'eager') { if (!cur || cur.mod !== s.mod || cur.part !== s.part) { cur = { mod: s.mod, part: s.part, stmts: [] }; steps.push(cur); } cur.stmts.push(s); s.step = cur; } }
const used = {}; for (const st of steps) { const base = 'setup' + st.part[0].toUpperCase() + st.part.slice(1), k = st.mod + '.' + base; used[k] = (used[k] || 0) + 1; st.fn = base + (used[k] > 1 ? used[k] : ''); if (used[k] > 1) warn.push(`step name repeats: ${k} (${st.fn}, line ${st.stmts[0].line0})`); }

// ---- 5. imports and exports
const needs = {}; const exported = new Set(); const usesTHREE = new Set();
for (const m in MAP.modules) needs[m] = {};
for (const s of S) { if (s.cls === 'import') continue;
  for (const set of [s.reads, s.lazyReads, s.writes, s.lazyWrites]) for (const name of set) {
    if (name === 'THREE') { usesTHREE.add(s.mod); continue; }
    const vm = V[name].mod; if (vm !== s.mod) { (needs[s.mod][vm] = needs[s.mod][vm] || new Set()).add(name); exported.add(name); } } }
for (const b of MAP.base) for (const dep in needs[b]) if (baseIdx(dep) < 0 || baseIdx(dep) >= baseIdx(b)) fail.push(`base module ${b} must not import from ${dep}: ${[...needs[b][dep]].join(', ')}`);

// ---- 6. text pieces
const templ = []; walk.simple(A.ast, { TemplateLiteral(n) { templ.push([n.start, n.end]); } });
const inTempl = p => templ.some(([a, b]) => a < p && p < b);
const ind = (a, b, pad) => { let o = ''; for (let i = a; i < b; i++) { o += src[i]; if (src[i] === '\n' && pad && !inTempl(i + 1) && src[i + 1] !== '\n' && i + 1 < b) o += pad; } return o; };
// the text between two statements: what is left on the old line is a trailing comment, the rest leads the next statement
for (let i = 0; i < S.length; i++) {
  const a = i ? S[i - 1].end : 0, b = S[i].start, gap = src.slice(a, b), nl = gap.indexOf('\n');
  if (i) { S[i - 1].trailEnd = nl < 0 ? a : a + nl; }
  S[i].leadStart = nl < 0 ? b : a + nl + 1; S[i].sameLine = i > 0 && nl < 0; S[i].gapStart = a;
}
S[S.length - 1].trailEnd = S[S.length - 1].end + Math.max(0, src.slice(S[S.length - 1].end).search(/\n|$/));
const lead = (s, pad) => { let t = ind(s.leadStart, s.start, pad).replace(/^[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n'); return t; };
const trail = s => src.slice(s.end, s.trailEnd).replace(/\s+$/, '');
const wrap = (head, names, tail, width = 118) => { const lines = []; let cur = head; for (let i = 0; i < names.length; i++) { const piece = names[i] + (i < names.length - 1 ? ',' : ''); if ((cur + ' ' + piece).length > width && cur.trim() !== head.trim()) { lines.push(cur); cur = '  ' + piece; } else cur += (cur.endsWith(' ') || cur === '' ? '' : ' ') + piece; } lines.push(cur + tail); return lines.join('\n'); };

function bodyStatic(s) { const ex = s.names.some(n => exported.has(n)); return (ex ? 'export ' : '') + src.slice(s.start, s.end); }
function bodyEager(s, pad) { const n = s.node;
  if (n.type !== 'VariableDeclaration') return ind(s.start, s.end, pad);
  const ds = n.declarations, simple = ds.every(d => d.init && d.id.type !== 'ObjectPattern');
  if (simple) { const between = src.slice(n.start + n.kind.length, ds[0].start); if (between.trim()) fail.push(`comment after the keyword at line ${s.line0}`); return ind(ds[0].start, s.end, pad); }
  // mixed: write each one out
  for (let k = 0; k < ds.length; k++) { const a = k ? ds[k - 1].end : n.start + n.kind.length, b = ds[k].start; if (src.slice(a, b).replace(/[\s,]/g, '')) fail.push(`comment between declarators at line ${s.line0}`); }
  const tail = src.slice(ds[ds.length - 1].end, s.end); if (tail.replace(/[\s;]/g, '')) fail.push(`text after the last declarator at line ${s.line0}`);
  return ds.filter(d => d.init).map(d => d.id.type === 'ObjectPattern' ? '(' + ind(d.start, d.end, pad) + ');' : ind(d.start, d.end, pad) + ';').join(' ');
}

// ---- 7. write the modules
const files = {};
for (const m in MAP.modules) {
  const mine = S.filter(s => s.mod === m && s.cls !== 'import'); if (!mine.length) { warn.push('empty module ' + m); continue; }
  let o = `// Honeylight: ${MAP.modules[m]}.\n`;
  const imps = []; if (usesTHREE.has(m)) imps.push(`import * as THREE from '../three.module.min.js';`);
  for (const dep in MAP.modules) if (needs[m][dep]) imps.push(wrap('import {', [...needs[m][dep]].sort((a, b) => V[a].stmt - V[b].stmt || a.localeCompare(b)), ` } from './${dep}.js';`));
  if (imps.length) o += imps.join('\n') + '\n';
  let prev = null; const done = new Set();
  for (const s of mine) {
    if (s.cls === 'eager') { const st = s.step; if (done.has(st)) continue; done.add(st);
      const names = st.stmts.flatMap(x => x.names), ex = names.filter(n => exported.has(n)), loc = names.filter(n => !exported.has(n));
      o += '\n' + lead(st.stmts[0], '').replace(/^\n+/, '\n').replace(/\s+$/, '\n').replace(/^\n$/, '');
      if (ex.length) o += wrap('export let', ex, ';') + '\n'; if (loc.length) o += wrap('let', loc, ';') + '\n';
      o += `export function ${st.fn}() {\n`;
      let line = '';
      st.stmts.forEach((x, k) => { const b = bodyEager(x, '  '); const joined = k > 0 && x.sameLine && st.stmts[k - 1].i === x.i - 1;
        if (k > 0 && !joined) { o += line.replace(/\s+$/, '') + '\n'; line = ''; const ld = lead(x, '  ').replace(/\s+$/, ''); if (ld.trim()) o += ld.replace(/^\n+/, '\n').split('\n').map(l => l.trim() ? (l.startsWith('  ') ? l : '  ' + l) : '').join('\n') + '\n'; else if (/\n\s*\n/.test(src.slice(x.gapStart, x.start))) o += '\n'; }
        if (!b) return; // a bare `let x;`
        line += (line ? (joined ? src.slice(x.gapStart, x.start) : ' ') : '  ') + b + trail(x); });
      o += line.replace(/\s+$/, '') + '\n}\n'; prev = null; continue; }
    // a constant or a function: as it was
    const joined = prev && s.sameLine && prev.i === s.i - 1;
    if (joined) o = o.replace(/\n$/, '') + src.slice(s.gapStart, s.start) + bodyStatic(s) + trail(s) + '\n';
    else { const ld = lead(s, ''); o += (prev && !/^\s*\n/.test(ld) && !ld.trim() ? '' : '') + (ld.trim() ? '\n' + ld.replace(/^\n+/, '').replace(/[ \t]+$/, '') : (/\n\s*\n/.test(src.slice(s.gapStart, s.start)) || !prev ? '\n' : '')) + (s.cls === 'fn' ? (exported.has(s.names[0]) ? 'export ' : '') + src.slice(s.start, s.end) : bodyStatic(s)) + trail(s) + '\n'; }
    prev = s;
  }
  files['src/' + m + '.js'] = o.replace(/\n{3,}/g, '\n\n');
}
// main.js: the build order
{ const mods = [...new Set(steps.map(s => s.mod))]; const order = Object.keys(MAP.modules).filter(m => mods.includes(m));
  let o = `// Honeylight. This file only builds the game, one step at a time. The code lives in src/.\n// The order of the steps is the order of the old single file. The seeded world and the random numbers depend on it,\n// so do not move a step unless the tests still pass pixel for pixel (see tests/README.md).\n`;
  o += order.map(m => `import * as ${m} from './src/${m}.js';`).join('\n') + '\n\n';
  o += steps.map(s => `${s.mod}.${s.fn}();`).join('\n') + '\n';
  files['main.js'] = o; }

// ---- 8. verify what was written
const origGlobals = A.globals;
for (const f in files) { let ast;
  try { ast = acorn.parse(files[f], { ecmaVersion: 2022, sourceType: 'module', ranges: true }); } catch (e) { fail.push(`${f}: ${e.message}`); continue; }
  const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
  for (const r of sm.globalScope.through) if (!origGlobals.has(r.identifier.name)) fail.push(`${f}: "${r.identifier.name}" is not defined`); }
const count = { fn: 0, static: 0, eager: 0 }; for (const s of S) if (count[s.cls] !== undefined) count[s.cls]++;
console.log(`statements: ${S.length} (functions ${count.fn}, constants kept ${count.static}, load-time ${count.eager} in ${steps.length} steps)`);
for (const f in files) console.log(' ', f.padEnd(22), String(files[f].split('\n').length).padStart(5), 'lines', String(files[f].length).padStart(7), 'chars');
if (warn.length) console.log('\nwarnings:\n  ' + warn.join('\n  '));
if (fail.length) { console.log('\nFAILED:\n  ' + fail.join('\n  ')); process.exit(1); }
if (OUT) { for (const f in files) { const p = path.join(OUT, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, files[f]); } console.log('written to', OUT); }
