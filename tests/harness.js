// Honeylight deterministic test harness.
// Rules that make every run repeat exactly:
//  1. Math.random is replaced by a seeded generator before the game loads.
//  2. The real clock is frozen. performance.now() returns a virtual time that only T.sim() moves.
//  3. requestAnimationFrame is stubbed, so the game never steps or draws by itself (this also keeps
//     the automatic resolution scaling off). Tests step the game with T.sim() in fixed 1/60 s steps.
//  4. The browser draws with the SwiftShader software renderer at a fixed window size and pixel ratio.
// The harness changes nothing in the game files. It works on any copy of the game that has window.__g.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { chromium } = require('playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };
const VIEW = { width: 480, height: 300 };
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-vsync', '--force-device-scale-factor=1', '--force-color-profile=srgb', '--hide-scrollbars'];

// runs in the page before any game code
function initScript(seed) {
  let s = seed >>> 0;
  const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Math.random = next;
  let vnow = 0; performance.now = () => vnow;
  window.__raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = () => 0;
  const errors = []; addEventListener('error', e => errors.push(String(e.message)));
  window.T = {
    errors,
    seed(n) { s = n >>> 0; },
    // step the game: fixed 1/60 s steps, virtual clock moves with it
    sim(secs) { const n = Math.round(secs * 60); for (let i = 0; i < n; i++) { vnow += 1000 / 60; __g.sim(1 / 60); } },
    // skip the title screen and the birth: the bee is in the air and ready
    fly(x, y, z, yaw = 0, pitch = 0) { const g = __g, P = g.P; document.getElementById('title').style.display = 'none'; P.mode = 'fly'; P.wingsReady = true; P.flown = true; P.vel.set(0, 0, 0); if (x !== undefined) P.pos.set(x, y, z); P.yaw = yaw; P.pitch = pitch; },
    // put the bee at a place and look in a direction, with no speed
    place(x, y, z, yaw = 0, pitch = 0) { const P = __g.P; P.pos.set(x, y, z); P.vel.set(0, 0, 0); P.yaw = yaw; P.pitch = pitch; },
    // look from (x,y,z) toward (tx,ty,tz)
    lookAt(x, y, z, tx, ty, tz) { const dx = tx - x, dy = ty - y, dz = tz - z; this.place(x, y, z, Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); },
    // move all wasps out of the way and stop random events, for tests that need a quiet world
    quiet() { const g = __g; g.wasps.forEach(w => { w.p.y = -500; w.state = 'idle'; }); g.TRAIL.next = 1e9; g.MOB.next = 1e9; },
    key(code, down = true) { down ? __g.keys.add(code) : __g.keys.delete(code); },
    // draw the frame and return a PNG. The game eases its exposure in over many frames, so the first
    // draw is used to read the exposure target, then the second draw is the settled picture.
    png() { const u = __post.finalM.uniforms.uExpo, e0 = u.value; __g.snap(); u.value = (u.value - 0.95 * e0) / 0.05; __g.snap(); return document.getElementById('c').toDataURL('image/png'); },
    text(id) { return document.getElementById(id).textContent; },
    save() { dispatchEvent(new Event('pagehide')); return JSON.parse(localStorage.getItem('honeylight.save2') || 'null'); },
  };
}

async function launch() { return chromium.launch({ args: ARGS }); }

// open a fresh game. opts: { dir, seed, storage: {key: value}, query: '?mp=0' }
// The tests look through the bee's eyes (view '1') unless a test asks for another view: storage { 'honeylight.view': null } gives a new player's game.
async function openGame(browser, opts = {}) {
  const ROOT = path.resolve(opts.dir || path.join(__dirname, '..'));
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.route('http://hl.local/**', r => { const u = new URL(r.request().url()); const f = path.join(ROOT, decodeURIComponent(u.pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: 'not found' });
    r.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) }); });
  await page.addInitScript(initScript, opts.seed === undefined ? 12345 : opts.seed);
  const nh = path.join(__dirname, 'night-helpers.js'); if (fs.existsSync(nh)) await page.addInitScript({ path: nh }); // autoFly(), for night tests and shots
  await page.addInitScript(st => { for (const k in st) if (st[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, st[k]); }, { 'honeylight.view': '1', ...(opts.storage || {}) });
  await page.goto('http://hl.local/index.html' + (opts.query || ''));
  await page.waitForFunction(() => window.__g, null, { timeout: 180000, polling: 250 });
  return { page, ctx, errors, close: () => ctx.close() };
}

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const pngBuf = dataUrl => Buffer.from(dataUrl.split(',')[1], 'base64');

// compare two PNGs pixel by pixel in the page. Returns { same, changed, total, diff: dataURL with changed pixels in red }
async function diffPng(page, aBuf, bBuf) {
  return page.evaluate(async ([a, b]) => {
    const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = 'data:image/png;base64,' + src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { same: false, changed: -1, total: ia.width * ia.height, note: `size ${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
    const w = ia.width, h = ia.height, mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c.getContext('2d', { willReadFrequently: true }); };
    const ca = mk(), cb = mk(), cd = mk(); ca.drawImage(ia, 0, 0); cb.drawImage(ib, 0, 0);
    const da = ca.getImageData(0, 0, w, h).data, db = cb.getImageData(0, 0, w, h).data, out = cd.createImageData(w, h), o = out.data; let changed = 0, maxd = 0;
    for (let i = 0; i < da.length; i += 4) { const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      if (d) { changed++; if (d > maxd) maxd = d; o[i] = 255; o[i + 1] = 0; o[i + 2] = 0; } else { const g = (da[i] + da[i + 1] + da[i + 2]) / 3 * 0.35 + 20; o[i] = o[i + 1] = o[i + 2] = g; } o[i + 3] = 255; }
    cd.putImageData(out, 0, 0);
    return { same: changed === 0, changed, total: w * h, maxDelta: maxd, diff: cd.canvas.toDataURL('image/png') };
  }, [aBuf.toString('base64'), bBuf.toString('base64')]);
}

module.exports = { launch, openGame, diffPng, sha, pngBuf, VIEW };
