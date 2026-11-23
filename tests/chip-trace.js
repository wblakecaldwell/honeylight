#!/usr/bin/env node
// Honeylight chip trace: does the game itself (not the drawing) run the same on this machine?
// For each picture spot it runs the spot's own setup and, after every step of the game, writes down:
// how many random numbers the game has drawn, which lines of code drew them, and a checksum of where the player, the bees and the wasps are.
//   node tests/chip-trace.js [--only=word]      run, write tests/out/chip-trace-<system>-<cpu>.json.gz
//   node tests/chip-trace.js A.json.gz B.json.gz   compare two machines: for each spot, the first step where they part, and why
// It changes nothing in the game files and takes no pictures.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const H = require('./harness.js');
const arg = n => { const a = process.argv.find(a => a.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : null; };

// runs in the page before the harness script: the first function that is put in Math.random (the seeded one) gets a counter round it
function instrument() {
  const C = window.__chip = { n: 0, ids: new Map(), names: [], cur: new Map(), pats: new Map(), patList: [], steps: [] }; let cur = Math.random, first = true;
  const wrap = f => { const w = function () { C.n++; const st = (new Error().stack || '').split('\n')[2] || '', m = /([^\/\s(]+:\d+:\d+)\)?\s*$/.exec(st), key = m ? m[1] : st.trim();
      let id = C.ids.get(key); if (id === undefined) { id = C.names.length; C.ids.set(key, id); C.names.push(key); } C.cur.set(id, (C.cur.get(id) || 0) + 1); return f(); }; w.__w = true; return w; };
  Object.defineProperty(Math, 'random', { configurable: true, get() { return cur; }, set(f) { if (first && !f.__w) { first = false; cur = wrap(f); } else cur = f; } });
  C.pattern = () => { const s = [...C.cur.entries()].sort((a, b) => a[0] - b[0]).map(e => e[0] + 'x' + e[1]).join(' '); C.cur.clear(); let id = C.pats.get(s); if (id === undefined) { id = C.patList.length; C.pats.set(s, id); C.patList.push(s); } return id; };
}
// runs in the page after the game has loaded: a note after every step
function hook() {
  const C = window.__chip, g = __g, f = new Float64Array(1), u = new Uint32Array(f.buffer);
  const mix = (h, x) => { f[0] = x; h = Math.imul(h ^ u[0], 16777619) >>> 0; return Math.imul(h ^ u[1], 16777619) >>> 0; };
  C.loadDraws = C.n; C.loadPattern = C.pattern(); const orig = g.sim;
  g.sim = secs => { orig(secs); let hp = 2166136261, hb = hp, hw = hp; const P = g.P;
    for (const x of [P.pos.x, P.pos.y, P.pos.z, P.vel.x, P.vel.y, P.vel.z, P.yaw, P.pitch]) hp = mix(hp, x);
    for (const b of g.bees) if (b.p) { hb = mix(hb, b.p.x); hb = mix(hb, b.p.y); hb = mix(hb, b.p.z); }
    for (const w of g.wasps) if (w.p) { hw = mix(hw, w.p.x); hw = mix(hw, w.p.y); hw = mix(hw, w.p.z); }
    C.steps.push(C.n, C.pattern(), hp >>> 0, hb >>> 0, hw >>> 0); };
}
function collect() {
  const C = window.__chip, g = __g, r6 = v => [v.x, v.y, v.z];
  return { loadDraws: C.loadDraws, loadPattern: C.loadPattern, draws: C.n, steps: C.steps, patterns: C.patList, callers: C.names,
    end: { player: r6(g.P.pos), mode: g.P.mode, bees: g.bees.filter(b => b.p).slice(0, 400).map(b => r6(b.p)), wasps: g.wasps.filter(w => w.p).map(w => r6(w.p)) } };
}
const wrapBrowser = b => ({ newContext: async o => { const ctx = await b.newContext(o), np = ctx.newPage.bind(ctx); ctx.newPage = async () => { const p = await np(); await p.addInitScript(instrument); return p; }; return ctx; } });
const loadShots = () => fs.readdirSync(__dirname).filter(f => /^shots(-[a-z0-9]+)?\.js$/.test(f)).sort().flatMap(f => require('./' + f));

function compare(fa, fb) {
  const rd = f => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString()), A = rd(fa), B = rd(fb);
  console.log(`A: ${A.machine}\nB: ${B.machine}\n`); let same = 0;
  const pat = (R, i) => (R.patterns[i] || '').split(' ').filter(Boolean).map(e => { const [id, n] = e.split('x'); return `${R.callers[+id]} x${n}`; });
  for (const a of A.spots) { const b = B.spots.find(x => x.id === a.id); if (!b) continue; if (a.error || b.error) { console.log(`${a.id}: error ${a.error || ''} ${b.error || ''}`); continue; }
    const why = [];
    if (a.loadDraws !== b.loadDraws) why.push(`while the page loaded: ${a.loadDraws} draws on A, ${b.loadDraws} on B\n      A: ${pat(a, a.loadPattern).join(', ')}\n      B: ${pat(b, b.loadPattern).join(', ')}`);
    const n = Math.min(a.steps.length, b.steps.length) / 5; let part = -1, what = '';
    for (let i = 0; i < n && part < 0; i++) { const o = i * 5; const pa = pat(a, a.steps[o + 1]).join(', '), pb = pat(b, b.steps[o + 1]).join(', ');
      if (a.steps[o] - (i ? a.steps[o - 5] : a.loadDraws) !== b.steps[o] - (i ? b.steps[o - 5] : b.loadDraws) || pa !== pb) { part = i; what = `the random draws differ\n      A: ${pa}\n      B: ${pb}`; }
      else if (a.steps[o + 2] !== b.steps[o + 2]) { part = i; what = 'the player is at another place (same draws)'; } else if (a.steps[o + 3] !== b.steps[o + 3]) { part = i; what = 'a bee is at another place (same draws)'; } else if (a.steps[o + 4] !== b.steps[o + 4]) { part = i; what = 'a wasp is at another place (same draws)'; } }
    if (part >= 0) why.push(`step ${part + 1} of ${n} (${((part + 1) / 60).toFixed(2)} s): ${what}`);
    if (a.steps.length !== b.steps.length) why.push(`${a.steps.length / 5} steps on A, ${b.steps.length / 5} on B`);
    if (!why.length) { same++; continue; }
    let far = 0; const na = a.end.bees.length, nb = b.end.bees.length; for (let i = 0; i < Math.min(na, nb); i++) far = Math.max(far, Math.hypot(a.end.bees[i][0] - b.end.bees[i][0], a.end.bees[i][1] - b.end.bees[i][1], a.end.bees[i][2] - b.end.bees[i][2]));
    console.log(`${a.id}:\n   ${why.join('\n   ')}\n   at the end the bee that differs most is ${far.toExponential(2)} apart`); }
  console.log(`\n${same} of ${A.spots.length} spots ran the same on both machines, step for step.`);
}

(async () => {
  const files = process.argv.slice(2).filter(a => !a.startsWith('--')); if (files.length === 2) return compare(files[0], files[1]);
  const only = (arg('only') || '').split(',').filter(Boolean), shots = loadShots().filter(s => !only.length || only.some(o => s.id.includes(o)));
  const browser = await H.launch(), wb = wrapBrowser(browser), spots = [], machine = `${process.platform} ${process.arch}, Chromium ${browser.version()}`; console.log(machine);
  for (const shot of shots) { const t0 = Date.now(); let r;
    try { const game = await H.openGame(wb, { ...(shot.open || {}) }); await game.page.evaluate(hook); await game.page.evaluate(shot.setup); r = await game.page.evaluate(collect); await game.close(); }
    catch (e) { r = { error: String(e.message).split('\n')[0] }; }
    spots.push({ id: shot.id, ...r }); console.log(`  ${shot.id.padEnd(26)} ${r.error ? 'ERROR ' + r.error : `${r.steps.length / 5} steps, ${r.draws} random draws (${r.loadDraws} while loading)`}  ${Date.now() - t0}ms`); }
  await browser.close();
  const dir = path.join(__dirname, 'out'); fs.mkdirSync(dir, { recursive: true }); const file = path.join(dir, `chip-trace-${process.platform}-${process.arch}.json.gz`);
  fs.writeFileSync(file, zlib.gzipSync(JSON.stringify({ machine, spots }))); console.log('saved ' + path.relative(process.cwd(), file));
})().catch(e => { console.error(e); process.exit(1); });
