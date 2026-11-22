// Honeylight: nectar trails that drift through the world.
import * as THREE from '../three.module.min.js';
import { V3, rnd, clamp } from './core.js';
import { POND, WY, HEDGE_R, ORCH, HEDGE_GAPS, terrainH, LOG, orchTrees, forestTrees, PADS0, overWater } from './world.js';
import { scene, UNTONE, puff } from './engine.js';
import { DAY, flowersClosed } from './day.js';
import { _v } from './bees.js';
import { flowers } from './plants.js';
import { ARCHES } from './air.js';
import { P } from './player.js';
import { richGlows } from './nectar.js';
import { G, toast, gainHoney } from './progress.js';
import { zoneLocked } from './zones.js';
import { tone, SCALE } from './audio.js';
import { inHive, outF, time } from './loop.js';

// --- nectar trails: a sweet scent drifts through a gap in the world. Follow it fast, before it fades behind you
const TRAILN = 200, trPos = new Float32Array(TRAILN * 3), trA = new Float32Array(TRAILN), trS = new Float32Array(TRAILN);

export let TRAIL;
let trGeo, trPts;
export function setupTrails() {
  trGeo = new THREE.BufferGeometry(); trGeo.setAttribute('position', new THREE.BufferAttribute(trPos, 3)); trGeo.setAttribute('aA', new THREE.BufferAttribute(trA, 1)); trGeo.setAttribute('aS', new THREE.BufferAttribute(trS, 1));
  trPts = new THREE.Points(trGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aA; attribute float aS; varying float vA; void main(){ vec4 mv=viewMatrix*vec4(position,1.0); vA=aA; gl_PointSize=clamp(aS*500.0/max(-mv.z,0.1),7.0,80.0); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: UNTONE + `varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float core=smoothstep(0.22,0.0,d), halo=smoothstep(0.5,0.0,d); float a=core*1.4+halo*halo*0.6; gl_FragColor=vec4(untone(vec3(1.0,0.78,0.3))*2.4*a*vA,1.0); }` }));
  trPts.frustumCulled = false; trPts.visible = false; scene.add(trPts);
  TRAIL = { state: 'off', pts: [], got: [], n: 0, f: null, front: 0, prog: -1, t: 0, next: rnd(25, 40), kind: '', fade: 1 };
}

const SP = 2.2;
export function trailFlower(p, filt, maxD = 60) { let best = null, bd = maxD; for (const f of flowers) { if (f.inLog || f.rich > 0 || zoneLocked(f) || (filt && !filt(f))) continue; const d = Math.hypot(f.x - p.x, f.z - p.z); if (d < bd) { bd = d; best = f; } } return best; }
const gp = (x, z, h) => new V3(x, terrainH(x, z) + h, z);
export function weave(trees, filt, maxGap) {
  const near = trees.slice().sort((a, b) => Math.hypot(a.x - P.pos.x, a.z - P.pos.z) - Math.hypot(b.x - P.pos.x, b.z - P.pos.z)).slice(0, 5);
  let chain = [];
  for (const cur of near) { const ch = [cur];
    while (ch.length < 5) { let nb = null, nd = maxGap; const c = ch[ch.length - 1]; for (const t of trees) { if (ch.includes(t)) continue; const d = Math.hypot(t.x - c.x, t.z - c.z); if (d < nd && d > (t.R || 3) + (c.R || 3) + 4) { nd = d; nb = t; } } if (!nb) break; ch.push(nb); }
    if (ch.length > chain.length) chain = ch; if (chain.length >= 5) break; }
  if (chain.length < 4) return null; const way = [];
  chain.forEach((t, i) => { const o = chain[Math.min(i + 1, chain.length - 1)], q = chain[Math.max(i - 1, 0)]; let dx = o.x - q.x, dz = o.z - q.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L; const s = i % 2 ? 1 : -1, off = (t.R || 3) + 3.4;
    if (i === 0) way.push(gp(t.x - dx * 14, t.z - dz * 14, 5));
    way.push(gp(t.x - dz * s * off, t.z + dx * s * off, 4.5 + (i % 2) * 1.5)); });
  const last = way[way.length - 1], f = trailFlower(last, filt, 70); return f ? { way, f } : null;
}
export function trailRoutes() {
  const R = [];
  { const A = LOG.axis, c = LOG.c, L = LOG.len, s = Math.sign((P.pos.x - c.x) * A.x + (P.pos.z - c.z) * A.z) || 1, way = [];
    for (const u of [L / 2 + 16, L / 2 + 4, 0, -L / 2 - 4, -L / 2 - 14]) way.push(new V3(c.x + A.x * u * s, c.y - 0.6, c.z + A.z * u * s));
    const e = way[4].clone().addScaledVector(A, -s * 12), f = trailFlower(e, f => !f.canopy); if (f) R.push({ kind: 'log', way, f }); }
  { const ps = ARCHES.map(a => new V3(a.cx, a.gy - 0.5 + a.h * 0.42, a.cz)); if (Math.hypot(P.pos.x - ps[ps.length - 1].x, P.pos.z - ps[ps.length - 1].z) < Math.hypot(P.pos.x - ps[0].x, P.pos.z - ps[0].z)) ps.reverse();
    const pre = ps[0].clone().addScaledVector(ps[0].clone().sub(ps[1]).setY(0).normalize(), 14), post = ps[ps.length - 1].clone().addScaledVector(ps[ps.length - 1].clone().sub(ps[ps.length - 2]).setY(0).normalize(), 10);
    const f = trailFlower(post, f => !f.canopy); if (f) R.push({ kind: 'arches', way: [pre, ...ps, post], f }); }
  if (G.orchard) {
    let ga = HEDGE_GAPS[0], bd = 1e9; for (const g of HEDGE_GAPS) { const d = Math.hypot(P.pos.x - ORCH.x - Math.cos(g) * HEDGE_R, P.pos.z - ORCH.z - Math.sin(g) * HEDGE_R); if (d < bd) { bd = d; ga = g; } }
    const way = [HEDGE_R + 30, HEDGE_R + 11, HEDGE_R, HEDGE_R - 11, HEDGE_R - 26].map(r => gp(ORCH.x + Math.cos(ga) * r, ORCH.z + Math.sin(ga) * r, 6));
    const f = trailFlower(way[4], f => f.orch && !f.canopy && f.val >= 2, 80); if (f) R.push({ kind: 'hedge', way, f });
    const w = weave(orchTrees.filter(t => !t.nest), f => f.orch && !f.canopy && f.val >= 2, 45); if (w) R.push({ kind: 'orchard', ...w });
  }
  if (G.zones.forest) { const w = weave(forestTrees, f => f.zone === 'forest', 40); if (w) R.push({ kind: 'forest', ...w }); }
  if (G.zones.pond) { const lot = flowers.find(f => f.lily && f.val >= 3 && !(f.rich > 0));
    if (lot) { let dx = P.pos.x - POND.x, dz = P.pos.z - POND.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      const e = new V3(POND.x + dx * (POND.r + 10), 0, POND.z + dz * (POND.r + 10)); e.y = Math.max(terrainH(e.x, e.z), WY) + 3;
      const lx = lot.x - e.x, lz = lot.z - e.z, LL = Math.hypot(lx, lz) || 1;
      const pads = PADS0.map(p => ({ p, u: ((p.x - e.x) * lx + (p.z - e.z) * lz) / LL, side: Math.abs(((p.x - e.x) * lz - (p.z - e.z) * lx) / LL) })).filter(o => o.u > 6 && o.u < LL - 6 && o.side < 20).sort((a, b) => a.u - b.u).slice(0, 4);
      R.push({ kind: 'pond', way: [e, ...pads.map(o => new V3(o.p.x, WY + 2.2, o.p.z))], f: lot }); } }
  return R;
}
export function startTrail(kind) {
  let rs = trailRoutes(); if (kind) rs = rs.filter(r => r.kind === kind);
  else rs = rs.filter(r => { const d = Math.hypot(r.way[0].x - P.pos.x, r.way[0].z - P.pos.z); return d > 18 && d < 120; });
  if (!rs.length) return false;
  rs.sort((a, b) => Math.hypot(a.way[0].x - P.pos.x, a.way[0].z - P.pos.z) - Math.hypot(b.way[0].x - P.pos.x, b.way[0].z - P.pos.z));
  const r = kind ? rs[0] : rs[Math.min(rs.length - 1, Math.random() < 0.35 ? 1 : 0)], f = r.f;
  const way = r.way.concat([new V3(f.x, f.y + 1.6, f.z)]);
  for (const p of way) if (r.kind !== 'log') p.y = Math.max(p.y, Math.max(terrainH(p.x, p.z), overWater(p.x, p.z) ? WY : -1e9) + 1.6);
  const curve = new THREE.CatmullRomCurve3(way, false, 'centripetal'), n = Math.min(TRAILN, Math.max(8, Math.floor(curve.getLength() / SP)));
  TRAIL.pts = curve.getSpacedPoints(n - 1); TRAIL.n = TRAIL.pts.length; TRAIL.got = new Array(TRAIL.n).fill(false);
  TRAIL.f = f; TRAIL.kind = r.kind; TRAIL.state = 'wait'; TRAIL.t = 0; TRAIL.front = -1e9; TRAIL.prog = -1; TRAIL.fade = 1; trPts.visible = true;
  TRAIL.pts.forEach((p, i) => { trPos[i * 3] = p.x; trPos[i * 3 + 1] = p.y; trPos[i * 3 + 2] = p.z; trS[i] = i === 0 ? 1.4 : i === TRAIL.n - 1 ? 1.2 : 0.85; });
  for (let i = TRAIL.n; i < TRAILN; i++) trA[i] = 0;
  trGeo.attributes.position.needsUpdate = trGeo.attributes.aS.needsUpdate = true; trGeo.setDrawRange(0, TRAIL.n);
  tone(SCALE[4], 0.05, 2.0); tone(SCALE[7], 0.035, 2.4, 'sine', 0.15);
  toast(G.seenTrail ? '<b>A sweet scent on the breeze</b>' : '<b>A sweet scent drifts on the breeze</b><br><span>follow the golden motes fast, before the scent fades behind you</span>', G.seenTrail ? 2.5 : 6); G.seenTrail = true;
  return true;
}
function endTrail(ok) {
  TRAIL.state = 'fade'; TRAIL.next = rnd(40, 70);
  if (ok) { const f = TRAIL.f; f.rich = f.rich0 = 30; f.cool = 0; let slot = richGlows.find(g => g.f === f) || richGlows.find(g => !g.f);
    if (!slot) { slot = richGlows[0]; slot.f.rich = 0; slot.f.raid = false; } slot.f = f; G.trails++; gainHoney(2);
    [0, 2, 4, 5, 7].forEach((n, k) => tone(SCALE[n], 0.09, 1.8, 'sine', k * 0.08)); _v.set(f.sx, f.y + 1.2, f.sz); puff(_v, 30, [1.0, 0.85, 0.35], 3, 0.014, 1.6, -0.3, 0.6);
    toast('<b>You followed the scent to a brimming flower!</b><br><span>+2 honey, and it\'s overflowing with nectar</span>', 3.5); }
  else if (P.pos.distanceTo(TRAIL.pts[Math.max(0, TRAIL.prog)]) < 80) toast('<b>The scent faded</b>', 2);
}
export function updateTrails(dt) {
  const flying = P.mode === 'fly' && !inHive;
  if (TRAIL.state === 'off') { trPts.visible = false; if (flying && outF > 0.8 && DAY.t < 0.86 && !flowersClosed()) { TRAIL.next -= dt; if (TRAIL.next <= 0) { if (!startTrail()) TRAIL.next = 6; } } return; }
  TRAIL.t += dt; const pts = TRAIL.pts, n = TRAIL.n;
  if (TRAIL.state === 'wait') {
    if (TRAIL.t > 35) endTrail(false);
    else if (flying) for (let i = 0; i < Math.min(10, n); i++) if (P.pos.distanceTo(pts[i]) < 3.4) { TRAIL.state = 'run'; TRAIL.prog = i; TRAIL.front = i - 1.4 * 16 / SP; break; }
  }
  if (TRAIL.state === 'run') {
    TRAIL.front += dt * 16 / SP;
    if (flying) for (let i = Math.max(0, TRAIL.prog - 3); i < Math.min(n, TRAIL.prog + 8); i++) {
      if (TRAIL.got[i] || P.pos.distanceTo(pts[i]) > 3.4) continue;
      TRAIL.got[i] = true; if (i > TRAIL.prog) TRAIL.prog = i; G.boost = Math.max(G.boost, 0.9);
      if (i % 2 === 0) tone(SCALE[Math.min(7, Math.floor(8 * i / n))] * (i > n * 0.5 ? 1 : 0.5), 0.035, 0.5, 'sine');
      puff(pts[i], 3, [1.0, 0.85, 0.4], 1.2, 0.008, 0.6);
    }
    const f = TRAIL.f; _v.set(f.sx, f.y + 1.2, f.sz);
    if (TRAIL.prog >= n - 2 || (flying && P.pos.distanceTo(_v) < 3.6 && TRAIL.prog > n * 0.6)) endTrail(true);
    else if (TRAIL.front > TRAIL.prog + 0.5 || !flying) endTrail(false);
  }
  if (TRAIL.state === 'fade') { TRAIL.fade -= dt * 1.2; if (TRAIL.fade <= 0) { TRAIL.state = 'off'; trPts.visible = false; return; } }
  for (let i = 0; i < n; i++) {
    let a = TRAIL.got[i] ? 0 : (0.6 + 0.4 * Math.sin(time * 5 + i * 0.9)) * clamp((i - TRAIL.front) / 3, 0, 1) * TRAIL.fade;
    if (TRAIL.state === 'wait') a *= Math.min(1, TRAIL.t * 1.5);
    trA[i] = a; const p = pts[i]; trPos[i * 3] = p.x + Math.sin(time * 1.3 + i) * 0.12; trPos[i * 3 + 1] = p.y + Math.sin(time * 1.7 + i * 1.3) * 0.15; trPos[i * 3 + 2] = p.z + Math.cos(time * 1.1 + i) * 0.12;
  }
  trGeo.attributes.aA.needsUpdate = trGeo.attributes.position.needsUpdate = true;
}
