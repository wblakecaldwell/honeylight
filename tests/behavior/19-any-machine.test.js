// The tests must run on any machine (TST-010 to TST-015): the game takes nothing from the machine into its random numbers,
// the drawing code makes its random-looking numbers only from math that is the same on every chip, and the runner knows two ways to compare a screenshot.
const fs = require('fs'), path = require('path');
const H = require('../harness.js');
const GAME = path.join(__dirname, '..', '..'), SRC = path.join(GAME, 'src');
const gameFiles = () => [...fs.readdirSync(GAME).filter(f => f.endsWith('.js') && !f.startsWith('three.')), ...fs.readdirSync(SRC).filter(f => f.endsWith('.js')).map(f => 'src/' + f)].sort();
const read = f => fs.readFileSync(path.join(GAME, f), 'utf8');

// runs in the page before the game: a sound device with the given rate (0: no sound at all). Every sound call is accepted and does nothing.
function fakeSound(rate) {
  if (!rate) { window.AudioContext = window.webkitAudioContext = undefined; return; }
  const any = () => new Proxy(function () { }, { get: (t, k) => k === 'value' ? 0 : k === Symbol.toPrimitive ? () => 0 : any(), set: () => true, apply: () => any(), construct: () => any() });
  window.AudioContext = window.webkitAudioContext = function () { return new Proxy({}, { get: (t, k) => k === 'sampleRate' ? rate : k === 'state' ? 'running' : k === 'currentTime' ? 0 : k === 'createBuffer' ? (c, n) => ({ getChannelData: () => new Float32Array(n) }) : any(), set: () => true }); };
}
// start the game the way a player does (a click on the title starts the sound), let it run, then say where the random stream and the bees are
const playAndSum = () => { const g = __g; document.getElementById('title').click(); let n = 0; while (g.P.mode === 'cell' && n < 40) { g.chew(); T.sim(0.2); n++; } T.sim(3);
  let sum = 0; for (const b of g.bees) if (b.p) sum += b.p.x * 3 + b.p.y * 5 + b.p.z * 7; return { sound: !!g.A.ctx, rate: g.A.ctx ? g.A.ctx.sampleRate : 0, next: Math.random(), bees: sum, mode: g.P.mode }; };

// two test pictures as PNG (base64): a soft pattern, and the same with a change
const pair = change => { const w = 480, h = 300, mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }, ca = mk(), cb = mk(), xa = ca.getContext('2d'), xb = cb.getContext('2d');
  const img = xa.createImageData(w, h), d = img.data; for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) { d[i] = 60 + (x * 7 + y * 3) % 90; d[i + 1] = 80 + (x * 2 + y * 5) % 70; d[i + 2] = 50 + (x + y) % 40; d[i + 3] = 255; }
  xa.putImageData(img, 0, 0); const at = (x, y) => (y * w + x) * 4, add = (x, y, v) => { const i = at(x, y); d[i] += v; d[i + 1] += v; d[i + 2] += v; };
  if (change === 'grain') for (let n = 0; n < w * h; n += 7) add(n % w, n / w | 0, 1);                                   // every 7th pixel one level off
  if (change === 'edge pixels') for (let n = 0; n < 100; n++) add((n * 97) % w, (n * 61) % h, 100);                         // 100 single pixels far off, spread over the picture
  if (change === 'thin sliver') for (let x = 300; x < 360; x++) add(x, 28, 60);                                            // 60 pixels in a row, one pixel thin (an edge that is nearly level)
  if (change === 'small object') for (let y = 100; y < 104; y++) for (let x = 200; x < 204; x++) add(x, y, 40);            // a 4x4 patch of another colour
  if (change === 'thin line') for (let x = 100; x < 300; x++) add(x, 150, 90);                                             // a line 200 pixels long
  if (change === 'whole picture') for (let n = 0; n < w * h; n++) add(n % w, n / w | 0, 9);                                // all of it a little brighter
  xb.putImageData(img, 0, 0); return [ca.toDataURL('image/png').split(',')[1], cb.toDataURL('image/png').split(',')[1]]; };

module.exports = [
  { id: 'TST-013-sound-takes-no-random', req: 'TST-013', name: 'The sound takes nothing from the game\'s random numbers: the game is the same with a 44100 Hz or a 96000 Hz sound device, or none',
    async run(t) {
      const out = {};
      for (const rate of [44100, 96000, 0]) { await t.reopen({ init: [fakeSound, rate] }); out[rate] = await t.ev(playAndSum); }
      t.eq(out[44100].sound, true, 'the sound started with the 44100 Hz device'); t.eq(out[96000].rate, 96000, 'the second game has the 96000 Hz device'); t.eq(out[0].sound, false, 'the third game has no sound');
      t.eq(out[96000].next, out[44100].next, 'next random number, 96000 Hz against 44100 Hz'); t.eq(out[0].next, out[44100].next, 'next random number, no sound against 44100 Hz');
      t.eq(out[96000].bees, out[44100].bees, 'where the bees are, 96000 Hz against 44100 Hz'); t.eq(out[0].bees, out[44100].bees, 'where the bees are, no sound against 44100 Hz');
      return { next: out[44100].next, bees: out[44100].bees, mode: out[44100].mode };
    } },
  { id: 'TST-013-sound-code-own-random', req: 'TST-013', name: 'The sound code has its own random numbers (sndRnd) and does not use Math.random or rnd',
    async run(t) {
      const a = read('src/audio.js'); t.check(/export const sndRnd\b/.test(a), 'src/audio.js exports sndRnd'); t.check(!/Math\.random|\brnd\(/.test(a), 'src/audio.js uses neither Math.random nor rnd()');
      const bird = read('src/loop.js').split('\n').filter(l => l.includes('birdT -= dt')); t.eq(bird.length, 1, 'the bird song line in src/loop.js'); t.check(bird.length === 1 && !/Math\.random|\brnd\(/.test(bird[0]), 'the bird song uses neither Math.random nor rnd()');
      return null;
    } },
  { id: 'TST-014-hashes-same-on-every-chip', req: 'TST-014', name: 'The drawing code makes its random-looking numbers only from math that is the same on every chip',
    async run(t) {
      const defs = [], sines = [];
      for (const f of gameFiles()) { const s = read(f); if (/float\s+hash21\s*\(/.test(s)) defs.push(f); const m = s.match(/fract\s*\(\s*(sin|cos|tan)\s*\(/g); if (m) sines.push(`${f} (${m.length})`); }
      t.eq(defs, ['src/engine.js'], 'hash21 is written in one place only'); t.eq(sines, [], 'shader hashes of the kind fract(sin(x)*big)');
      const m = /export const HASH = `([^`]*)`/.exec(read('src/engine.js')); t.check(!!m, 'src/engine.js exports HASH');
      if (m) { t.check(!/\b(dot|length|normalize|sin|cos|tan|pow|log|exp)\s*\(/.test(m[1]), 'HASH uses only * + fract and whole-number math'); for (const n of ['hash21', 'ihash11', 'ihash21', 'ihash31']) t.check(new RegExp('float ' + n + '\\(').test(m[1]), 'HASH has ' + n); }
      // the game's hashes and the runner's machine check must be the same text, or the check would test other math than the game uses
      const probe = /const PROBE_HASH = `([^`]*)`/.exec(fs.readFileSync(path.join(__dirname, '..', 'harness.js'), 'utf8')); t.check(!!probe && !!m && probe[1].trim() === m[1].trim(), 'harness.js PROBE_HASH is the same text as HASH in src/engine.js');
      return { files: gameFiles().length };
    } },
  { id: 'TST-011-machine-check', req: 'TST-011', name: 'The machine check gives two checksums, the same each time, and the reference images say which machine made them',
    async run(t) {
      const a = await H.machine(t.page.context()), b = await H.machine(t.page.context());
      t.check(/^[0-9a-f]{8}$/.test(a.exact) && /^[0-9a-f]{8}$/.test(a.chip), 'two checksums of 8 hex digits'); t.eq([b.exact, b.chip], [a.exact, a.chip], 'the second check'); t.check(a.software, 'the browser draws with its software renderer: ' + a.made);
      const mf = path.join(__dirname, '..', 'golden', 'machine.json'); t.check(fs.existsSync(mf), 'tests/golden/machine.json is there');
      if (fs.existsSync(mf)) { const ref = JSON.parse(fs.readFileSync(mf, 'utf8')); t.check(/^[0-9a-f]{8}$/.test(ref.exact) && /^[0-9a-f]{8}$/.test(ref.chip) && !!ref.made, 'machine.json names the machine and its two checksums');
        t.eq(a.exact, ref.exact, 'plain * and +, fract, floor, the hashes and a flat varying give the same bits here as on the reference machine (' + ref.made + ')'); }
      return null; // the checksums belong to the machine, so they are not part of the result that --twice compares
    } },
  { id: 'TST-012-same-to-the-eye', req: 'TST-012', name: 'The "same to the eye" compare lets single pixels and a thin sliver pass and catches a small object, a long line and a change of the whole picture',
    async run(t) {
      const want = { none: true, grain: true, 'edge pixels': true, 'thin sliver': true, 'small object': false, 'thin line': false, 'whole picture': false }, out = {};
      for (const k of Object.keys(want)) { const [a, b] = await t.ev(pair, k), d = await H.diffPng(t.page, Buffer.from(a, 'base64'), Buffer.from(b, 'base64'), true);
        out[k] = { changed: d.changed, far: d.far, solid: d.solid, block: d.block, same: d.same || H.eyeSame(d) }; t.eq(out[k].same, want[k], `"${k}" (${d.changed} pixels differ, ${d.far} far off, ${d.solid} solid squares, squares by ${d.block})`); }
      t.eq(out.none.changed, 0, 'two equal pictures'); t.check(out.grain.changed > 20000, 'the grain picture differs in many pixels');
      return out;
    } },
];
