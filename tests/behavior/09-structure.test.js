// Code structure: the build order in main.js and the modules in src/. These checks read files in node; they do not need the game page.
// (A broken import between modules stops the game from loading, so BOOT-001 already catches it.)
const fs = require('fs'), path = require('path');
const GAME = path.join(__dirname, '..', '..'), SRC = path.join(GAME, 'src');
const read = f => fs.readFileSync(path.join(GAME, f), 'utf8');
const srcFiles = () => fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort();
const importsOf = src => { const out = [], re = /^\s*import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/gm; let m; while ((m = re.exec(src))) out.push(m[1]); return out; };
const setupsIn = src => { const out = [], re = /^export function (setup\w+)\s*\(/gm; let m; while ((m = re.exec(src))) out.push(m[1]); return out; };
const words = name => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[\s_]+/); // camelCase parts: setupGround -> setup, ground

module.exports = [
  { id: 'MOD-001-main-only-steps', req: 'MOD-001', name: 'main.js has only comments, module imports and setup calls',
    async run(t) {
      const lines = read('main.js').split('\n'), bad = [], imports = {}, calls = [];
      lines.forEach((l, i) => { const s = l.trim(); let m;
        if (!s || s.startsWith('//')) return;
        if ((m = s.match(/^import \* as (\w+) from '\.\/src\/(\w+)\.js';$/))) { if (m[1] !== m[2]) bad.push(`${i + 1}: alias ${m[1]} is not the file name ${m[2]}`); imports[m[1]] = true; return; }
        if ((m = s.match(/^(\w+)\.(setup\w+)\(\);$/))) { calls.push(m[1] + '.' + m[2]); if (!imports[m[1]]) bad.push(`${i + 1}: ${m[1]} is not imported above this line`); return; }
        bad.push(`${i + 1}: ${s.slice(0, 80)}`); });
      t.eq(bad, [], 'lines that are not a comment, an import or a setup call');
      t.check(calls.length > 20, 'main.js has the build steps: ' + calls.length);
      return { imports: Object.keys(imports).length, calls: calls.length };
    } },

  { id: 'MOD-001-setup-calls', req: 'MOD-001', name: 'Every setup step in src/ is called exactly one time in main.js, and every call exists',
    async run(t) {
      const main = read('main.js'), called = {}, re = /^(\w+)\.(setup\w+)\(\);/gm; let m;
      while ((m = re.exec(main))) { const k = m[1] + '.' + m[2]; called[k] = (called[k] || 0) + 1; }
      const defined = []; for (const f of srcFiles()) for (const s of setupsIn(fs.readFileSync(path.join(SRC, f), 'utf8'))) defined.push(f.replace('.js', '') + '.' + s);
      const notCalled = defined.filter(k => !called[k]), twice = Object.keys(called).filter(k => called[k] > 1), missing = Object.keys(called).filter(k => !defined.includes(k));
      t.eq(notCalled, [], 'setup steps that main.js never calls'); t.eq(twice, [], 'setup steps called more than one time'); t.eq(missing, [], 'calls in main.js with no setup step');
      return { defined: defined.length, calls: Object.keys(called).length };
    } },

  { id: 'MOD-003-base-modules', req: 'MOD-003', name: 'core.js imports nothing from src/; world.js imports only from core.js',
    async run(t) {
      const core = importsOf(read('src/core.js')).filter(p => p.startsWith('./')), world = importsOf(read('src/world.js')).filter(p => p !== './core.js' && !p.startsWith('../three'));
      t.eq(core, [], 'core.js imports from src/'); t.eq(world, [], 'world.js imports other than core.js');
      // and nothing in src/ imports main.js, night.js or moonflowers.js (the night stays a separate file)
      const back = []; for (const f of srcFiles()) for (const p of importsOf(fs.readFileSync(path.join(SRC, f), 'utf8'))) if (/main\.js|night\.js|moonflowers\.js/.test(p)) back.push(f + ' -> ' + p);
      t.eq(back, [], 'src/ files that import main.js or the night');
      return { core: core.length, world: world.length };
    } },

  { id: 'MOD-002-headers', req: 'MOD-002', name: 'Every file in src/ starts with a "// Honeylight: ..." line that says what is in it',
    async run(t) {
      const bad = srcFiles().filter(f => !/^\/\/ Honeylight: \S.{10,}/.test(fs.readFileSync(path.join(SRC, f), 'utf8').split('\n')[0]));
      t.eq(bad, [], 'files with no header line'); t.check(srcFiles().length >= 10, 'src/ has the modules: ' + srcFiles().length);
      return { files: srcFiles().length };
    } },

  { id: 'MOD-004-names', req: 'MOD-004', name: 'No function in src/ is named after a build round or batch',
    async run(t) {
      const bad = []; for (const f of srcFiles().concat(['../night.js', '../moonflowers.js', '../main.js'])) { const src = fs.readFileSync(path.join(SRC, f), 'utf8'), re = /function\s+(\w+)|(\w+)\s*=\s*(?:function\b|\([^)]*\)\s*=>|\w+\s*=>)/g; let m;
        while ((m = re.exec(src))) { const n = m[1] || m[2]; if (words(n).some(w => w === 'round' || w === 'batch' || /^(round|batch)\d+$/.test(w))) bad.push(f + ': ' + n); } }
      t.eq(bad, [], 'function names with round or batch');
      return { bad: bad.length };
    } },
];
