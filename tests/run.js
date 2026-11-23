#!/usr/bin/env node
// Honeylight test runner.
//   node tests/run.js                 run all behavior tests and all screenshot compares
//   node tests/run.js --only=ZON      run tests whose id contains "ZON"
//   node tests/run.js --skip=NGT      leave out tests and shots whose id contains "NGT"
//   node tests/run.js --skip=NGT,shot:night-   several words, with commas (this one leaves out all of the night)
//   node tests/run.js --no-shots      behavior tests only        --shots-only   screenshots only
//   node tests/run.js --update        save the current screenshots as the new reference ("golden") images
//   node tests/run.js --twice         run everything two times and fail if any result differs (determinism proof)
//   node tests/run.js --dir=PATH      test another copy of the game (default: the folder above tests/)
//   node tests/run.js --query=?night=0   add a query string to the game address
//   node tests/run.js --keep          keep NAME.actual.png and NAME.diff.png also for a screenshot that passes as "same to the eye"
// Results: tests/out/results.json, and for each screenshot that differs: NAME.actual.png and NAME.diff.png (changed pixels are red).
//
// The tests run on any machine. The behavior tests give the same results everywhere. The screenshots are compared in one of two ways:
//   pixel for pixel   on a machine that draws like the machine that made the reference images (tests/golden/machine.json says which that was)
//   same to the eye   on any other kind of machine, for example another kind of chip, which rounds some drawing math a last bit differently (the limits: EYE in harness.js)
// The runner finds out which kind this machine is with a short check of its drawing math (harness.js machine()) and says which way it compares.
const fs = require('fs'), path = require('path');
const H = require('./harness.js');
const arg = n => { const a = process.argv.find(a => a.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : null; };
const flag = n => process.argv.includes('--' + n);
const DIR = path.resolve(arg('dir') || path.join(__dirname, '..')), ONLY = (arg('only') || '').split(',').filter(Boolean), SKIP = (arg('skip') || '').split(',').filter(Boolean), keep = id => (!ONLY.length || ONLY.some(o => id.includes(o))) && !SKIP.some(o => id.includes(o)), QUERY = arg('query') || '';
const OUT = path.join(__dirname, 'out'), GOLD = path.join(__dirname, arg('golden') || 'golden');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(GOLD, { recursive: true });

function loadTests() {
  const dir = path.join(__dirname, 'behavior'); let all = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.test.js')).sort()) for (const t of require(path.join(dir, f))) all.push({ ...t, file: f });
  const ids = new Set(); for (const t of all) { if (ids.has(t.id)) throw new Error('duplicate test id ' + t.id); ids.add(t.id); }
  return all.filter(t => keep(t.id));
}
// shots.js holds the day spots; any shots-*.js file (for example shots-night.js) adds more
const loadShots = () => fs.readdirSync(__dirname).filter(f => /^shots(-[a-z0-9]+)?\.js$/.test(f)).sort().flatMap(f => require('./' + f)).filter(s => keep('shot:' + s.id));

// the object each test gets
function makeT(browser, game, fails) {
  const t = {
    page: game.page,
    ev: (fn, a) => t.page.evaluate(fn, a),
    check(cond, msg) { if (!cond) fails.push(msg); return !!cond; },
    eq(a, b, msg) { return t.check(JSON.stringify(a) === JSON.stringify(b), `${msg}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`); },
    near(a, b, tol, msg) { return t.check(Math.abs(a - b) <= tol, `${msg}: got ${a}, wanted ${b} +/- ${tol}`); },
    // close this game and open a fresh one (for example with saved data): t.reopen({ storage: {...} })
    async reopen(opts = {}) { await game.close(); game = await H.openGame(browser, { dir: DIR, query: QUERY, ...opts }); t.page = game.page; t._game = game; return t; },
    _game: game,
  };
  return t;
}

// Which way are screenshots compared on this machine? Returns { M: this machine, ref: the reference machine (or null), exact: true for pixel for pixel }
async function compareWay(browser) {
  const M = await H.machine(browser), mf = path.join(GOLD, 'machine.json'), like = r => r && r.chip === M.chip && r.exact === M.exact;
  let ref = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : null;
  if (!M.software) console.log(`Warning: the browser does not draw with its software renderer here (${M.made}). The screenshots will not match.`);
  if (flag('update')) {
    const part = ONLY.length || SKIP.length;
    if (ref && !like(ref) && part) { console.log(`This machine (${M.made}) does not draw bit for bit like the machine that made the other reference images (${ref.made}).\nSave reference images on a machine of that kind, or make all of them again here (--update without --only and --skip).`); process.exit(2); }
    if (!ref || !part) { ref = { note: 'The machine that made the reference images in this folder, and the checksums of its drawing math (harness.js machine()). The runner compares pixel for pixel on a machine with the same checksums, and "same to the eye" on any other.', made: M.made, exact: M.exact, chip: M.chip }; fs.writeFileSync(mf, JSON.stringify(ref, null, 1) + '\n'); }
  }
  const exact = !ref || like(ref);
  if (!flag('no-shots')) {
    if (!ref) console.log('Screenshots: compared pixel for pixel (no tests/golden/machine.json yet: --update writes it).');
    else if (exact) console.log(`Screenshots: this machine draws like the reference machine (${ref.made}). They are compared pixel for pixel.`);
    else { console.log(`Screenshots: this machine (${M.made}) rounds some drawing math differently from the reference machine (${ref.made}). That is normal for another kind of chip.\n  They are compared as "same to the eye": single pixels and thin slivers along an edge may differ; an object that is missing, moved or of another colour may not (the limits: EYE in harness.js).`);
      if (ref.exact !== M.exact) console.log('  Warning: on this machine even plain * and + in the drawing code give other results than on the reference machine. The game\'s random-looking patterns rest on those, so expect screenshots to fail.\n  Please report this machine (node tests/chip-probe.js prints the details).'); }
  }
  return { M, ref, exact };
}

async function runOnce(browser, pass, way) {
  const res = { tests: [], shots: [] };
  if (!flag('shots-only')) for (const test of loadTests()) {
    const fails = [], t0 = Date.now(); let game, value = null, t;
    try { game = await H.openGame(browser, { dir: DIR, query: QUERY, ...(test.open || {}) }); t = makeT(browser, game, fails); value = await test.run(t); if (value === undefined) value = null;
      for (const e of t._game.errors) fails.push('page error: ' + e); }
    catch (e) { fails.push('threw: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')); }
    try { if (t) await t._game.close(); else if (game) await game.close(); } catch (e) { }
    const r = { id: test.id, req: test.req || '', name: test.name, ok: !fails.length, fails, value, ms: Date.now() - t0 }; res.tests.push(r);
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id.padEnd(28)} ${String(r.ms).padStart(6)}ms  ${r.name}`); for (const f of fails) console.log('        - ' + f);
  }
  if (!flag('no-shots')) for (const shot of loadShots()) {
    const t0 = Date.now(), fails = []; let hash = '', note = '', diff = null;
    try { const game = await H.openGame(browser, { dir: DIR, query: QUERY, ...(shot.open || {}) });
      await game.page.evaluate(shot.setup); const buf = H.pngBuf(await game.page.evaluate(() => T.png())); hash = H.sha(buf);
      for (const e of game.errors) fails.push('page error: ' + e);
      const gp = path.join(GOLD, shot.id + '.png'), ap = path.join(OUT, shot.id + '.actual.png'), dp = path.join(OUT, shot.id + '.diff.png');
      for (const p of [ap, dp]) if (fs.existsSync(p)) fs.unlinkSync(p);
      if (flag('update') && pass === 0) { fs.writeFileSync(gp, buf); note = 'reference saved'; }
      else if (!fs.existsSync(gp)) { fs.writeFileSync(ap, buf); fails.push('no reference image yet (run with --update to save one)'); }
      else { const gold = fs.readFileSync(gp); if (H.sha(gold) !== hash) { const d = await H.diffPng(game.page, gold, buf, !way.exact);
          if (!d.same) { const eye = !way.exact && H.eyeSame(d); if (d.changed >= 0) diff = { changed: d.changed, maxDelta: d.maxDelta, far: d.far, solid: d.solid, block: d.block };
            if (!eye || flag('keep')) { fs.writeFileSync(ap, buf); if (d.diff) fs.writeFileSync(dp, H.pngBuf(d.diff)); }
            if (eye) note = `(same to the eye: ${d.changed} pixels differ, ${d.far} of them by more than ${H.EYE.far}/255)`;
            else fails.push(d.changed < 0 ? d.note : way.exact ? `${d.changed} of ${d.total} pixels differ (largest step ${d.maxDelta}/255): see out/${shot.id}.diff.png`
              : `not the same to the eye: ${d.far} of ${d.total} pixels are off by more than ${H.EYE.far}/255 (allowed ${Math.floor(H.EYE.farShare * d.total)}), ${d.solid} solid 2x2 squares of them (allowed ${H.EYE.solid}), and a ${H.EYE.size}x${H.EYE.size} square differs by ${d.block}/255 on average (allowed ${H.EYE.block}): see out/${shot.id}.diff.png`); } } }
      await game.close(); }
    catch (e) { fails.push('threw: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')); }
    const r = { id: shot.id, name: shot.name, ok: !fails.length, fails, hash, ...(diff ? { diff } : {}), ms: Date.now() - t0 }; res.shots.push(r);
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  shot:${r.id.padEnd(23)} ${String(r.ms).padStart(6)}ms  ${r.name} ${note}`); for (const f of fails) console.log('        - ' + f);
  }
  return res;
}

(async () => {
  const browser = await H.launch(); const t0 = Date.now(); console.log(`Honeylight tests on ${process.platform} ${process.arch}, Chromium ${browser.version()}`);
  const way = await compareWay(browser);
  const a = await runOnce(browser, 0, way); let det = null;
  if (flag('twice')) { console.log('\n--- second run (determinism check) ---'); const b = await runOnce(browser, 1, way); det = [];
    a.tests.forEach((x, i) => { const y = b.tests[i]; if (JSON.stringify([x.ok, x.fails, x.value]) !== JSON.stringify([y.ok, y.fails, y.value])) det.push('test ' + x.id); });
    a.shots.forEach((x, i) => { if (x.hash !== b.shots[i].hash) det.push('shot ' + x.id); });
    console.log(det.length ? 'NOT DETERMINISTIC: ' + det.join(', ') : 'Determinism: both runs gave identical results and identical pixels.'); }
  await browser.close();
  const bad = [...a.tests, ...a.shots].filter(r => !r.ok);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ dir: DIR, query: QUERY, when: new Date().toISOString(), machine: way.M, reference: way.ref, screenshots: way.exact ? 'pixel for pixel' : 'same to the eye', deterministic: det ? !det.length : null, ...a }, null, 1));
  console.log(`\n${a.tests.filter(r => r.ok).length}/${a.tests.length} tests passed, ${a.shots.filter(r => r.ok).length}/${a.shots.length} screenshots match${way.exact || !a.shots.length ? '' : ' (same to the eye)'}. ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  process.exit(bad.length || (det && det.length) ? 1 : 0);
})();
