// Analyse a single-file ES module: top-level statements, the names they declare, read and write.
const acorn = require('acorn'), fs = require('fs'), escope = require('eslint-scope');
function analyze(src) {
  const comments = [];
  const ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'module', locations: true, ranges: true, onComment: comments });
  const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
  const mod = sm.globalScope.childScopes[0];
  const body = ast.body;
  const stmtAt = pos => { let lo = 0, hi = body.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (body[m].start <= pos) lo = m; else hi = m - 1; } return lo; };
  const S = body.map((n, i) => ({ i, node: n, start: n.start, end: n.end, line0: n.loc.start.line, line1: n.loc.end.line,
    kind: n.type === 'VariableDeclaration' ? n.kind : n.type, names: [], reads: new Set(), lazyReads: new Set(), writes: new Set(), lazyWrites: new Set() }));
  const vars = {};
  for (const v of mod.variables) {
    const def = v.defs[0]; if (!def) continue;
    const si = stmtAt(def.name.start);
    vars[v.name] = { name: v.name, stmt: si, type: def.type, kind: def.type === 'Variable' ? def.parent.kind : def.type, writers: new Set(), readers: new Set() };
    S[si].names.push(v.name);
    for (const r of v.references) {
      const sj = stmtAt(r.identifier.start);
      let lazy = false; for (let sc = r.from; sc && sc !== mod; sc = sc.upper) if (sc.type === 'function') { lazy = true; break; }
      if (r.isWrite() && !r.init) { (lazy ? S[sj].lazyWrites : S[sj].writes).add(v.name); vars[v.name].writers.add(sj); }
      if (r.isRead() || r.init) { if (!(r.init && sj === si && !r.isRead())) { (lazy ? S[sj].lazyReads : S[sj].reads).add(v.name); vars[v.name].readers.add(sj); } }
    }
  }
  const globals = new Set(sm.globalScope.through.map(r => r.identifier.name));
  return { ast, body, S, vars, globals, comments, src };
}
module.exports = { analyze };
if (require.main === module) {
  const A = analyze(fs.readFileSync(process.argv[2] || '/home/user/hl/main.js', 'utf8'));
  console.log('statements', A.S.length, 'top-level names', Object.keys(A.vars).length);
  console.log('globals:', [...A.globals].sort().join(' '));
  const mut = Object.values(A.vars).filter(v => [...v.writers].some(w => w !== v.stmt));
  console.log('\nnames written outside their own statement:', mut.length);
  for (const v of mut) console.log(' ', v.name.padEnd(14), v.kind.padEnd(6), 'decl line', String(A.S[v.stmt].line0).padStart(5), ' writers at lines', [...v.writers].filter(w => w !== v.stmt).map(w => A.S[w].line0 + (A.S[w].names[0] ? ':' + A.S[w].names[0] : '')).join(', ').slice(0, 150));
}
