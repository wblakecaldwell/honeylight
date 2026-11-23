// Honeylight deterministic test harness.
// Rules that make every run repeat exactly:
//  1. Math.random is replaced by a seeded generator before the game loads.
//  2. The real clock is frozen. performance.now() returns a virtual time that only T.sim() moves.
//  3. requestAnimationFrame is stubbed, so the game never steps or draws by itself (this also keeps
//     the automatic resolution scaling off). Tests step the game with T.sim() in fixed 1/60 s steps.
//  4. The browser draws with the SwiftShader software renderer at a fixed window size and pixel ratio.
//  5. Text that the game draws into a canvas (the place labels) becomes plain blocks, one for each letter: every system has other fonts and its own way to draw letters.
// With these the game plays the same on every machine. Two kinds of chip can still round some drawing math a last bit differently: see machine() below.
// The harness changes nothing in the game files. It works on any copy of the game that has window.__g.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { chromium } = require('playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };
const VIEW = { width: 480, height: 300 };
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-vsync', '--force-device-scale-factor=1', '--force-color-profile=srgb', '--hide-scrollbars', '--disable-dev-shm-usage'];

// runs in the page before any game code
function initScript(seed) {
  let s = seed >>> 0;
  const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Math.random = next;
  let vnow = 0; performance.now = () => vnow;
  window.__raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = () => 0;
  const errors = []; addEventListener('error', e => errors.push(String(e.message)));
  { const C2 = CanvasRenderingContext2D.prototype, px = c => { const m = /(\d+(?:\.\d+)?)px/.exec(c.font); return m ? +m[1] : 10; }, adv = size => Math.round(size * 0.42);
    C2.fillText = function (text, x, y) { text = String(text); const size = px(this), a = adv(size), gap = Math.max(1, Math.round(size * 0.08)), w = text.length * a;
      let x0 = Math.round(x); if (this.textAlign === 'center') x0 -= Math.round(w / 2); else if (this.textAlign === 'right' || this.textAlign === 'end') x0 -= w;
      for (let i = 0; i < text.length; i++) { if (text[i] === ' ') continue; const h = Math.round(size * (/[A-Z0-9bdfhklt]/.test(text[i]) ? 0.7 : 0.48)); this.fillRect(x0 + i * a, Math.round(y) - h, a - gap, h); } };
    C2.strokeText = function () { };
    C2.measureText = function (text) { const size = px(this), width = String(text).length * adv(size); return { width, actualBoundingBoxLeft: 0, actualBoundingBoxRight: width, actualBoundingBoxAscent: Math.round(size * 0.7), actualBoundingBoxDescent: 0, fontBoundingBoxAscent: Math.round(size * 0.7), fontBoundingBoxDescent: Math.round(size * 0.2) }; }; }
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

// The browser is the Chromium build that this version of Playwright downloads for every system ("npx playwright install chromium"), so that every machine draws with the same one.
// channel 'chromium' asks for that full build; without it Playwright takes its small "headless shell", which is not the same build on every machine.
async function launch() {
  try { return await chromium.launch({ channel: 'chromium', args: ARGS }); }
  catch (e) {
    try { const b = await chromium.launch({ args: ARGS }); console.log('Note: the full Chromium build of Playwright is not installed here, so the tests use its small "headless shell" build. "npx playwright install chromium" installs the full one.'); return b; }
    catch (e2) { throw new Error('The test browser is not installed. Run:  npx playwright install chromium\n(' + String(e.message).split('\n')[0] + ')'); }
  }
}

// ---------- which kind of machine is this? ----------
// The pictures are drawn by software on the CPU (SwiftShader). It makes machine code for each shader, and its two makers of machine code round some math differently:
// dot, length, normalize, sin, cos, pow, log and a matrix times a vector come out a last bit apart on, say, an Intel chip and an Apple chip. The picture is the same to the eye, not bit for bit.
// machine() runs a few pieces of drawing math on fixed numbers and returns two checksums of every bit of the results:
//   exact: plain * and +, fract, floor, the game's hashes, a flat varying. The game's random-looking patterns rest on these, so they must be the same on every machine.
//   chip:  the pieces that are known to differ from chip to chip. A machine with the same checksum as the reference machine draws the pictures bit for bit.
// tests/chip-probe.js is the long form of this check, for looking into a new kind of machine.
const PROBE_HASH = `
float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=p.x*(p.x+45.32)+p.y*(p.y+45.32); return fract(p.x*p.y); }
highp uint hu(highp uint x){ x^=x>>16; x*=0x7feb352dU; x^=x>>15; x*=0x846ca68bU; x^=x>>16; return x; }
highp uint fbit(float x){ return x==0.0 ? 0u : floatBitsToUint(x); }
float h01(highp uint x){ return float(x>>8)*5.9604644775390625e-8; }
float ihash11(float a){ return h01(hu(fbit(a)+0x68bc21ebU)); }
float ihash21(vec2 p){ return h01(hu(fbit(p.x)^hu(fbit(p.y)+0x9e3779b9U))); }
float ihash31(vec3 p){ return h01(hu(fbit(p.x)^hu((fbit(p.y)^hu(fbit(p.z)+0x85ebca6bU))+0x9e3779b9U))); }`;
function machineProbe(HASH) {
  const N = 32, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const gl = cv.getContext('webgl2', { antialias: false }); if (!gl) return { error: 'this browser has no WebGL2' };
  const dbg = gl.getExtension('WEBGL_debug_renderer_info'), renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : String(gl.getParameter(gl.RENDERER));
  const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, `#version 300 es
in vec2 aP; in float aC; out float vS; flat out float vF; void main(){ vS=aC; vF=aC; gl_Position=vec4(aP,0.0,1.0); }`));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float; precision highp int; uniform int uK; in float vS; flat in float vF; out uvec4 o;` + HASH + `
void main(){ highp uint i=uint(gl_FragCoord.x), j=uint(gl_FragCoord.y), s=(i+j*64u)*4u;
  float u=h01(hu(s+1u)), v=h01(hu(s+2u)), w=h01(hu(s+3u)), a=u*20.0-10.0, b=v*6.0+0.25, c=w*200.0-100.0; vec3 p=vec3(a,b,c*0.01), q=vec3(b,c*0.02,a); vec4 r;
  if(uK==0) r=vec4(a*b, a+c, a*b+c, fract(a*91.7));
  else if(uK==1) r=vec4(floor(a*3.3), hash21(vec2(float(i),float(j))), hash21(vec2(a*1.7+b,b*3.1+0.5)), vF);
  else if(uK==2) r=vec4(ihash11(a), ihash21(vec2(a,b)), ihash31(p), hash21(vec2(float(i)*7.13+1.0,vF*91.7)));
  else if(uK==3) r=vec4(dot(p,q), length(p), normalize(p).x, vS);
  else if(uK==4) r=vec4(sin(a), cos(c), pow(b,2.2), log(b));
  else { mat4 m=mat4(0.61,0.2,-0.3,0.0, -0.17,0.93,0.11,0.0, 0.35,-0.05,0.74,-1.0, 1.5,-2.25,3.0,4.0); vec4 t=m*vec4(p,1.0); r=vec4(t.x, t.y/t.w, a/b, exp(a*0.3)); }
  o=floatBitsToUint(r); }`));
  gl.bindAttribLocation(pr, 0, 'aP'); gl.bindAttribLocation(pr, 1, 'aC'); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr)); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0.7231, 3, -1, 0.7231, -1, 3, 0.7231]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 12, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 12, 8);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32UI, N, N);
  const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); gl.viewport(0, 0, N, N);
  const px = new Uint32Array(N * N * 4), sums = [2166136261, 2166136261], uK = gl.getUniformLocation(pr, 'uK');
  for (let k = 0; k < 6; k++) { gl.uniform1i(uK, k); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.readPixels(0, 0, N, N, gl.RGBA_INTEGER, gl.UNSIGNED_INT, px);
    let h = sums[k < 3 ? 0 : 1]; for (let n = 0; n < px.length; n++) { const x = px[n]; h = Math.imul(h ^ (x & 65535), 16777619); h = Math.imul(h ^ (x >>> 16), 16777619); } sums[k < 3 ? 0 : 1] = h >>> 0; }
  return { exact: sums[0].toString(16).padStart(8, '0'), chip: sums[1].toString(16).padStart(8, '0'), renderer };
}
async function machine(browser) { // a browser, or a browser context (then the check runs in a new page of that context)
  const page = await browser.newPage(), version = (browser.version ? browser : browser.browser()).version(); let r;
  try { await page.setContent('<!doctype html><title>machine check</title>'); r = await page.evaluate(machineProbe, PROBE_HASH); } finally { await page.close(); }
  if (r.error) throw new Error(r.error);
  const sw = /SwiftShader Device \(([^)]*)\)/.exec(r.renderer);
  return { exact: r.exact, chip: r.chip, software: /SwiftShader/.test(r.renderer), made: `${process.platform} ${process.arch}, Chromium ${version}, ${sw ? 'SwiftShader (' + sw[1] + ')' : r.renderer}` };
}

// open a fresh game. opts: { dir, seed, storage: {key: value}, query: '?mp=0', init: [fn, arg] (a function that runs in the page before the game code) }
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
  if (opts.init) await page.addInitScript(opts.init[0], opts.init[1]);
  await page.goto('http://hl.local/index.html' + (opts.query || ''));
  await page.waitForFunction(() => window.__g, null, { timeout: 180000, polling: 250 });
  return { page, ctx, errors, close: () => ctx.close() };
}

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const pngBuf = dataUrl => Buffer.from(dataUrl.split(',')[1], 'base64');

// "Same to the eye": the limits for a machine that does not draw bit for bit like the reference machine.
//   far:   a pixel is "far off" when a colour channel differs by more than EYE.far levels of 255. At most EYE.farShare of the pixels may be far off.
//   solid: a 2x2 square of far-off pixels. At most EYE.solid of them: single pixels and lines one pixel thin have none, an object that moved or went missing has many.
//   block: the picture is cut into squares of EYE.size pixels. The average difference of a square (each pixel counts with at most EYE.far) may be at most EYE.block levels.
// What passes: pixels that fall on the other side of an edge, and a sliver one pixel thin. What fails: an object that is missing, moved or of another colour, and a change of tint.
// The numbers come from a measurement (Nov 2026, Apple chip against the Intel-kind reference machine, 42 pictures): at most 27 far-off pixels, no solid square, squares up to 3.0.
const EYE = { far: 24, farShare: 0.001, solid: 4, size: 8, block: 6 };
const eyeSame = d => d.changed >= 0 && d.far <= EYE.farShare * d.total && d.solid <= EYE.solid && d.block <= EYE.block;

// compare two PNGs pixel by pixel in the page. Returns { same, changed, total, maxDelta, far, solid, block, diff }
//   changed: pixels that differ at all; far, solid and block: see EYE; diff: a picture (dataURL) with changed pixels in red (with eye = true: far-off pixels red, slight ones blue)
async function diffPng(page, aBuf, bBuf, eye = false) {
  return page.evaluate(async ([a, b, E, eye]) => {
    const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = 'data:image/png;base64,' + src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { same: false, changed: -1, total: ia.width * ia.height, note: `size ${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
    const w = ia.width, h = ia.height, mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c.getContext('2d', { willReadFrequently: true }); };
    const ca = mk(), cb = mk(), cd = mk(); ca.drawImage(ia, 0, 0); cb.drawImage(ib, 0, 0);
    const da = ca.getImageData(0, 0, w, h).data, db = cb.getImageData(0, 0, w, h).data, out = cd.createImageData(w, h), o = out.data; let changed = 0, maxd = 0, far = 0;
    const S = E.size, bw = Math.ceil(w / S), bh = Math.ceil(h / S), sum = new Float64Array(bw * bh * 3), cnt = new Uint32Array(bw * bh), isFar = new Uint8Array(w * h), cap = v => v > E.far ? E.far : v < -E.far ? -E.far : v;
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) { const q = (y / S | 0) * bw + (x / S | 0); cnt[q]++; sum[q * 3] += cap(da[i] - db[i]); sum[q * 3 + 1] += cap(da[i + 1] - db[i + 1]); sum[q * 3 + 2] += cap(da[i + 2] - db[i + 2]);
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2])), g = (da[i] + da[i + 1] + da[i + 2]) / 3 * 0.35 + 20;
      if (d) { changed++; if (d > maxd) maxd = d; if (d > E.far) { far++; isFar[y * w + x] = 1; } }
      if (d && (!eye || d > E.far)) { o[i] = 255; o[i + 1] = 0; o[i + 2] = 0; } else if (d) { o[i] = g * 0.5; o[i + 1] = g * 0.7; o[i + 2] = 255; } else { o[i] = o[i + 1] = o[i + 2] = g; } o[i + 3] = 255; }
    let block = 0, solid = 0; for (let q = 0; q < cnt.length; q++) for (let k = 0; k < 3; k++) block = Math.max(block, Math.abs(sum[q * 3 + k]) / cnt[q]);
    for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) { const p = y * w + x; if (isFar[p] && isFar[p + 1] && isFar[p + w] && isFar[p + w + 1]) solid++; }
    cd.putImageData(out, 0, 0);
    return { same: changed === 0, changed, total: w * h, maxDelta: maxd, far, solid, block: Math.round(block * 100) / 100, diff: cd.canvas.toDataURL('image/png') };
  }, [aBuf.toString('base64'), bBuf.toString('base64'), EYE, eye]);
}

module.exports = { launch, openGame, machine, diffPng, eyeSame, EYE, sha, pngBuf, VIEW };
