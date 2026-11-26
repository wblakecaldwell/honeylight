// Honeylight: the race maps of the long run. A moment into a run the race starts: a round map of the ground just ahead and an outline of the whole loop fade in,
// both turned so the way the bee looks is up. A line marks where the race started. With the whole loop open a clock runs, with the best loop and ahead or behind.
// With part of the track open there is no clock, and no map past the open track or over closed places.
// The round map is a picture of the world from straight above, drawn once, the first time a map shows (bake). It takes no number from the game's random stream.
// ?racemap=0 switches the maps and the clock off.
import * as THREE from '../three.module.min.js';
import { clamp } from './core.js';
import { renderer, scene, U, renderShadows } from './engine.js';
import { P } from './player.js';
import { G } from './progress.js';
import { ZONES } from './zones.js';
import { RUN, RUNK, fmtTime } from './longrun.js';
import { quietBuild } from './runkit.js';

// numbers to tune: the round map shows `reach` units from its middle to its edge; its middle is `ahead` units in front of the bee
export const MAPK = { reach: 60, ahead: 25, size: 1024, fade: 18, circle: 0.163, outline: 0.123 };
export const MAP = { frames: 0, on: true, shown: false, baked: false, img: null, box: null, ppu: 1, ctr: [0, 0], rr: 1, cv: null, timeEl: null };
const GOLD = '#ffc23a';

export function setupRaceMap() {
  MAP.on = !/[?&]racemap=0/.test(location.search);
  window.__racemap = { MAP, MAPK, draw, bake };
  if (!MAP.on || !RUN.N) return;
  const S = RUN.S; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, mx = 0, mz = 0;
  for (const p of S) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); mx += p.x; mz += p.z; }
  const m = 40, side = Math.max(x1 - x0, z1 - z0) + 2 * m, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  MAP.box = { x0: cx - side / 2, z0: cz - side / 2, side }; MAP.ppu = MAPK.size / side;
  MAP.ctr = [mx / S.length, mz / S.length]; MAP.rr = Math.max(...S.map(p => Math.hypot(p.x - MAP.ctr[0], p.z - MAP.ctr[1])));
  const cv = MAP.cv = document.createElement('canvas'); cv.id = 'racemap';
  cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity .9s;z-index:5';
  document.body.appendChild(cv);
  const te = MAP.timeEl = document.createElement('div'); te.id = 'racetime';
  te.style.cssText = 'position:fixed;right:0;top:0;text-align:right;pointer-events:none;opacity:0;transition:opacity .9s;z-index:5;color:#fff3d6;text-shadow:0 1px 6px rgba(0,0,0,.75);line-height:1.15';
  te.innerHTML = '<div><span id="racedelta" style="margin-right:.6em"></span><span id="racenow"></span></div><div id="racebest" style="font-style:italic"></div>';
  document.body.appendChild(te);
}

// what shows: the maps from the race's start until the cells go; the clock only with the whole loop open
export function raceMapFrame() {
  if (!MAP.cv) return;
  const show = (RUN.state === 'run' && RUN.race) || (RUN.state === 'ended' && RUN.race && RUN.result !== 'quit');
  if (show !== MAP.shown) { MAP.shown = show; MAP.cv.style.opacity = show ? 1 : 0; }
  const clock = show && RUN.full && !!RUN.cur;
  MAP.timeEl.style.opacity = clock ? 1 : 0;
  if (clock) {
    const now = document.getElementById('racenow'), dl = document.getElementById('racedelta'), be = document.getElementById('racebest'), m = RUN.mem;
    now.textContent = fmtTime(RUN.raceT);
    if (RUN.delta !== null && RUN.state === 'run') { const d = RUN.delta; dl.textContent = (d < 0 ? '−' : '+') + Math.abs(d).toFixed(1); dl.style.color = d < 0 ? '#bff0a4' : '#ffb38f'; } else dl.textContent = '';
    const best = RUN.dir < 0 ? m.bestR : m.best; be.textContent = best ? 'best  ' + fmtTime(best) : ''; // each way round has its own best
    be.style.color = RUN.newBest ? '#ffd36a' : 'rgba(255,243,214,.85)'; be.style.textShadow = RUN.newBest ? '0 0 10px rgba(255,190,60,.9), 0 1px 6px rgba(0,0,0,.75)' : '';
  }
}

// ---------- the picture from above: drawn once, with the world's own shaders, no haze and no sun shadows, then toned like the screen ----------
export function bake() {
  if (MAP.baked || !MAP.box) return; MAP.baked = true;
  const N = MAPK.size, B = MAP.box, h = 400;
  quietBuild(70417, () => {
    const cam = new THREE.OrthographicCamera(-B.side / 2, B.side / 2, B.side / 2, -B.side / 2, 1, h + 200);
    cam.position.set(B.x0 + B.side / 2, h, B.z0 + B.side / 2); cam.up.set(0, 0, -1); cam.lookAt(B.x0 + B.side / 2, 0, B.z0 + B.side / 2); cam.updateMatrixWorld(true);
    const hdr = new THREE.WebGLRenderTarget(N, N, { type: THREE.HalfFloatType, depthBuffer: true });
    const ldr = new THREE.WebGLRenderTarget(N, N, { type: THREE.UnsignedByteType, depthBuffer: false });
    if (!U.uShadowOn.value) renderShadows(); // the sun's shadow texture must exist before anything samples it, even with shadows off
    const keep = { cam: U.uCam.value.clone(), sh: U.uShadowOn.value, rt: renderer.getRenderTarget(), auto: renderer.autoClear };
    U.uCam.value.copy(cam.position); U.uMapView.value = 1; U.uShadowOn.value = 0;
    renderer.setRenderTarget(hdr); renderer.autoClear = true; renderer.render(scene, cam);
    // tone: the screen's curve (engine.js) with a fixed exposure
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: { t: { value: hdr.texture } }, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
      fragmentShader: 'uniform sampler2D t; varying vec2 vUv; vec3 aces(vec3 c){ return (c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14); } void main(){ vec3 c=max(texture2D(t,vUv).rgb,vec3(0.0))*0.92; if(!(c.r==c.r)) c=vec3(0.0); c=pow(clamp(aces(c),0.0,1.0),vec3(0.4545)); gl_FragColor=vec4(c,1.0); }' }));
    const qs = new THREE.Scene(); qs.add(q); const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    renderer.setRenderTarget(ldr); renderer.render(qs, qc);
    const px = new Uint8Array(N * N * 4); renderer.readRenderTargetPixels(ldr, 0, 0, N, N, px);
    renderer.setRenderTarget(keep.rt); renderer.autoClear = keep.auto; U.uCam.value.copy(keep.cam); U.uMapView.value = 0; U.uShadowOn.value = keep.sh;
    hdr.dispose(); ldr.dispose(); q.geometry.dispose(); q.material.dispose();
    // even it out: a map read at night is lifted to a daytime brightness (at most 4 times)
    let sum = 0; for (let i = 0; i < px.length; i += 4) sum += px[i] * 0.2126 + px[i + 1] * 0.7152 + px[i + 2] * 0.0722;
    const lift = clamp(110 / Math.max(1, sum / (N * N)), 1, 4);
    const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), im = x.createImageData(N, N);
    for (let y = 0; y < N; y++) { const src = (N - 1 - y) * N * 4, dst = y * N * 4; /* the target's rows run bottom up */ for (let k = 0; k < N * 4; k += 4) { im.data[dst + k] = Math.min(255, px[src + k] * lift); im.data[dst + k + 1] = Math.min(255, px[src + k + 1] * lift); im.data[dst + k + 2] = Math.min(255, px[src + k + 2] * lift); im.data[dst + k + 3] = 255; } }
    x.putImageData(im, 0, 0); MAP.img = c; MAP.lift = lift;
  });
}

// ---------- drawing (each frame the maps show; tests call it) ----------
const open = j => RUN.full || j <= RUN.stopAt;
const strength = j => RUN.full ? 1 : clamp((RUN.stopAt - j) / MAPK.fade, 0, 1); // the track fades out where the open track ends
export function draw() {
  if (!MAP.cv || !MAP.box) return;
  const cv = MAP.cv, dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const x = cv.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height);
  if (!MAP.baked && ++MAP.frames > 30) bake(); // in the game the picture is drawn early, while nothing is going on yet
  if (!MAP.shown && MAP.cv.style.opacity === '0') return;
  if (!MAP.baked) bake();
  const s = H / 750, N = RUN.N, fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = -fz, rz = fx, bi = RUN.s, dir = RUN.dir || 1;
  // world to screen, turned so that the way the bee looks is up
  const to = (cx, cy, k, wx, wz) => (px, pz) => { const dx = px - wx, dz = pz - wz; return [cx + (dx * rx + dz * rz) * k, cy - (dx * fx + dz * fz) * k]; };
  const ahead = i => ((dir * (i - bi)) % N + N) % N < N / 2; // ahead the way this run goes
  // ---- the round map ----
  const R = Math.round(Math.min(H * MAPK.circle, W * 0.2)), ccx = 28 * s + R, ccy = H - 28 * s - R, k = R / MAPK.reach;
  const wcx = P.pos.x + fx * MAPK.ahead, wcz = P.pos.z + fz * MAPK.ahead, T1 = to(ccx, ccy, k, wcx, wcz);
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.save(); x.beginPath(); x.arc(ccx, ccy, R, 0, 7); x.clip();
  if (MAP.img) { const B = MAP.box, u = k / MAP.ppu, o = T1(B.x0, B.z0);
    x.save(); x.globalAlpha = 0.9; x.transform(u * rx, -u * fx, u * rz, -u * fz, o[0], o[1]); x.drawImage(MAP.img, 0, 0); x.restore(); }
  const vg = x.createRadialGradient(ccx, ccy, R * 0.62, ccx, ccy, R); vg.addColorStop(0, 'rgba(20,30,15,0)'); vg.addColorStop(1, 'rgba(20,30,15,.55)'); x.fillStyle = vg; x.fillRect(ccx - R, ccy - R, 2 * R, 2 * R);
  // no map over a closed place: the picture is cut away there and the game shows through
  x.globalCompositeOperation = 'destination-out';
  for (const [id, Z] of Object.entries(ZONES)) { const closed = !G.zones[id] || (id === 'garden' && !G.orchard); if (!closed) continue;
    const c = T1(Z.c.x, Z.c.z), r = (Z.ring + 10) * k; const g = x.createRadialGradient(c[0], c[1], Math.max(0, r - 2), c[0], c[1], r + 16 * s); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(c[0], c[1], r + 16 * s, 0, 7); x.fill(); }
  x.globalCompositeOperation = 'source-over';
  const idx = []; const near = (MAPK.reach + 30) ** 2; for (let j = 0; j <= N; j++) { const i = j % N; if (!open(i)) break; const p = RUN.S[i]; idx.push((p.x - wcx) ** 2 + (p.z - wcz) ** 2 < near ? i : -1); }
  const runs = []; let cur = []; for (const i of idx) { if (i >= 0) cur.push(i); else if (cur.length) { runs.push(cur); cur = []; } } if (cur.length) runs.push(cur);
  const P1 = i => T1(RUN.S[i].x, RUN.S[i].z);
  for (const r of runs) { track(x, r, P1, 3.5 * s, i => ahead(i) ? 0 : 0.4 * strength(i), false); track(x, r, P1, 5 * s, i => ahead(i) ? 0.95 * strength(i) : 0, true, s); }
  if (RUN.full && RUN.cur) startBar(x, P1, Math.floor(((RUN.raceS % N) + N) % N), 11 * s, s);
  bee(x, ...T1(P.pos.x, P.pos.z), 6 * s);
  x.restore();
  x.beginPath(); x.arc(ccx, ccy, R, 0, 7); x.strokeStyle = 'rgba(255,248,225,.55)'; x.lineWidth = 2 * s; x.stroke();
  const hl = x.createLinearGradient(ccx - R, ccy - R, ccx, ccy); hl.addColorStop(0, 'rgba(255,255,255,.35)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  x.beginPath(); x.arc(ccx, ccy, R - 5 * s, Math.PI * 1.05, Math.PI * 1.45); x.strokeStyle = hl; x.lineWidth = 3 * s; x.lineCap = 'round'; x.stroke();
  // ---- the whole loop: sized from the whole loop, so it does not jump as places open ----
  const R2 = Math.round(Math.min(H * MAPK.outline, W * 0.15)), ocx = W - 30 * s - R2, ocy = 30 * s + R2, T2 = to(ocx, ocy, R2 / MAP.rr, MAP.ctr[0], MAP.ctr[1]);
  const P2 = i => T2(RUN.S[i].x, RUN.S[i].z), all = []; for (let j = 0; j <= N; j++) { const i = j % N; if (!open(i)) break; all.push(i); }
  track(x, all, P2, 4 * s, i => 0.92 * strength(i), true, s);
  if (RUN.full && RUN.cur) startBar(x, P2, Math.floor(((RUN.raceS % N) + N) % N), 7 * s, s);
  bee(x, ...T2(P.pos.x, P.pos.z), 5.5 * s);
  // the clock sits under the outline
  const te = MAP.timeEl; te.style.top = (ocy + R2 + 8 * s) + 'px'; te.style.right = (34 * s) + 'px'; te.style.fontSize = (30 * s) + 'px';
  te.lastChild.style.fontSize = (15 * s) + 'px'; document.getElementById('racedelta').style.fontSize = (17 * s) + 'px';
}
// the track as one path per run of samples with the same strength (one shadow, no beads)
function track(x, idx, at, w, alpha, shadow, s = 1) {
  x.save(); x.lineJoin = x.lineCap = 'round'; x.lineWidth = w;
  const groups = []; let g = null; for (let n = 0; n + 1 < idx.length; n++) { const a = Math.round(alpha(idx[n]) * 8) / 8; if (!g || g.a !== a) { g = { a, pts: [idx[n]] }; groups.push(g); } g.pts.push(idx[n + 1]); }
  for (const g of groups) { if (g.a <= 0) continue; x.save(); if (shadow && g.a > 0.85) { x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 4 * s; x.shadowOffsetY = s; }
    x.strokeStyle = `rgba(255,255,255,${g.a})`; x.beginPath(); g.pts.forEach((i, k) => { const p = at(i); k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); x.stroke(); x.restore(); }
  x.restore(); }
function startBar(x, at, i, len, s) { const a = at(i), b = at((i + 3) % RUN.N), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  x.save(); x.strokeStyle = 'rgba(255,255,255,.97)'; x.lineWidth = (len > 9 * s ? 3.5 : 2.5) * s; x.lineCap = 'round'; x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 3 * s;
  x.beginPath(); x.moveTo(a[0] - dy / l * len, a[1] + dx / l * len); x.lineTo(a[0] + dy / l * len, a[1] - dx / l * len); x.stroke(); x.restore(); }
// the bee: a small gold drop pointing the way it looks, with a soft glow
function bee(x, cx, cy, r) { x.save(); x.translate(cx, cy);
  const gl = x.createRadialGradient(0, 0, 0, 0, 0, r * 3); gl.addColorStop(0, 'rgba(255,200,80,.55)'); gl.addColorStop(1, 'rgba(255,200,80,0)'); x.fillStyle = gl; x.beginPath(); x.arc(0, 0, r * 3, 0, 7); x.fill();
  x.beginPath(); x.moveTo(0, -r * 1.5); x.bezierCurveTo(r * 1.1, -r * 0.3, r * 0.9, r, 0, r); x.bezierCurveTo(-r * 0.9, r, -r * 1.1, -r * 0.3, 0, -r * 1.5); x.closePath();
  x.fillStyle = GOLD; x.strokeStyle = 'rgba(60,35,5,.85)'; x.lineWidth = 1.4; x.fill(); x.stroke(); x.restore(); }
