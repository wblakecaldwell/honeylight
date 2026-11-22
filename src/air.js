// Honeylight: air to ride: warm stones, dew arches, wind, updrafts and petal gusts.
import * as THREE from '../three.module.min.js';
import { V3, rnd, clamp, lerp, smooth, TAU } from './core.js';
import { FDIR, srnd, HEDGE_R, ORCH, HEDGE_GAPS, HILLS, terrainH, orchTrees } from './world.js';
import { scene, camera, UNTONE, U, mat, simple, parts, pNext, puff } from './engine.js';
import { _v } from './bees.js';
import { flowers } from './plants.js';
import { P, PR, camQuiet } from './player.js';
import { G, toast } from './progress.js';
import { stores } from './zones.js';
import { tone, SCALE } from './audio.js';
import { inHive, outF, time } from './loop.js';

// ================= ROUND 3: air to ride, natural lines =================
// sun-warmed stones: rising air you can ride
export const STONES = [];

export function setupWarmStones() {
  {
    const H = HILLS[0], toHive = Math.atan2(-H.z, -H.x);
    const spots = [[H.x + Math.cos(toHive) * (H.r + 6), H.z + Math.sin(toHive) * (H.r + 6)],
      [ORCH.x + Math.cos(HEDGE_GAPS[0]) * (HEDGE_R + 30), ORCH.z + Math.sin(HEDGE_GAPS[0]) * (HEDGE_R + 30)],
      [FDIR.x * 120 - FDIR.z * 50, FDIR.z * 120 + FDIR.x * 50], [FDIR.x * 200 + FDIR.z * 45, FDIR.z * 200 - FDIR.x * 45], [-70, -60]];
    const warmM = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vW.xz*0.5+vW.y*0.4); vec3 alb=mix(vec3(0.42,0.34,0.27),vec3(0.78,0.66,0.52),a);
    alb=mix(alb,vec3(0.55,0.48,0.20),smoothstep(0.6,0.8,fbm(vW.xz*1.7))*0.5);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.15,0.0)+vec3(0.10,0.04,0.0)*smoothstep(0.3,1.0,n.y),vW),1.0); }`);
    for (const [x, z] of spots) {
      const gy = terrainH(x, z), g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = 0.85 + 0.3 * Math.sin(p.getX(i) * 3 + p.getZ(i) * 2); p.setXYZ(i, p.getX(i) * k, Math.max(p.getY(i), -0.3) * k, p.getZ(i) * k); } g.computeVertexNormals();
      const m = new THREE.Mesh(g, warmM); m.scale.set(8, 3.2, 7); m.rotation.y = srnd(TAU); m.position.set(x, gy + 0.6, z); scene.add(m);
      STONES.push({ x, z, y: gy + 3.5, r: 9 });
    }
  }
}

// arching stems with hanging dewdrops: a natural line from the meadow toward the tall hill
export const ARCHES = [];

let dewMat;
export function setupDewArches() {
  dewMat = mat(`void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW); float fr=pow(1.0-max(dot(n,V),0.0),2.5);
  vec3 R=reflect(-V,n); vec3 c=hazeCol(R)*0.7*fr+vec3(0.15,0.25,0.22)*(1.0-fr)+vec3(6.0,4.6,3.0)*pow(max(dot(R,uSun),0.0),60.0);
  c+=vec3(0.5,0.9,0.7)*pow(max(dot(-V,uSun),0.0),4.0)*0.6;
  gl_FragColor=vec4(finish(c,vW),1.0); }`);
  {
    const H = HILLS[0], A = new V3(FDIR.x * 135, 0, FDIR.z * 135), B = new V3(H.x + Math.cos(Math.atan2(-H.z, -H.x) + 0.5) * (H.r + 12), 0, H.z + Math.sin(Math.atan2(-H.z, -H.x) + 0.5) * (H.r + 12));
    const N = 7, stemM = simple('0.16,0.34,0.07', 0.25, 0.7), bellM = simple('0.42,0.30,0.85', 0.2, 1.0, { side: THREE.DoubleSide });
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N, px = lerp(A.x, B.x, t), pz = lerp(A.z, B.z, t), dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz);
      const sideX = -dz / L, sideZ = dx / L, wob = Math.sin(t * 7.0) * 14; const cx = px + sideX * wob, cz = pz + sideZ * wob;
      const w = srnd(4.5, 6), h = srnd(10, 14), gy = terrainH(cx, cz), pts = [];
      for (let k = 0; k <= 12; k++) { const a = Math.PI * k / 12; pts.push(new V3(cx + sideX * Math.cos(a) * w, gy - 0.5 + Math.sin(a) * h + Math.sin(a * 2) * 0.6, cz + sideZ * Math.cos(a) * w)); }
      const curve = new THREE.CatmullRomCurve3(pts); scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.32, 6), stemM));
      const top = new V3(cx, gy - 0.5 + h, cz);
      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 10, 1, true), bellM); bell.position.set(cx, top.y - 1.1, cz); scene.add(bell);
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), dewMat); drop.scale.set(1, 1.25, 1); drop.position.set(cx, top.y - 2.5, cz); scene.add(drop);
      const samples = []; for (let k = 0; k <= 24; k++) samples.push(curve.getPoint(k / 24));
      ARCHES.push({ samples, drop, home: drop.position.clone(), cool: 0, cx, cz, gy, w, h });
    }
  }
}

// ---------- wind, updrafts, swaying flowers, dewdrops ----------
export const WIND = { dx: 1, dz: 0, s: 0.3 }, SWAY_AMP = 2.0;

export function setupWind() {
  flowers.forEach(f => { f.sx = f.x; f.sz = f.z; f.dsx = 0; f.dsz = 0; });
  G.boost = 0; G.chain = 0; G.chainT = 0; G.seenLift = false; G.seenDew = false;
}

export function updateWind(dt) {
  const a = 0.6 + Math.sin(time * 0.021) * 0.9; WIND.dx = Math.cos(a); WIND.dz = Math.sin(a);
  WIND.s = 0.15 + 0.85 * smooth(0.35, 1, 0.5 + 0.5 * Math.sin(time * 0.16 + Math.sin(time * 0.047) * 3));
  U.uWind.value.set(WIND.dx * SWAY_AMP, WIND.dz * SWAY_AMP, WIND.s);
  for (const f of flowers) { if (!f.sway) continue; const ph = f.x * 0.07 + f.z * 0.05, s = Math.sin(time * 1.3 + ph) * 0.6 + Math.sin(time * 2.9 + ph * 1.7) * 0.25, k = (WIND.s * 0.55 + s * (0.35 + WIND.s * 0.4)) * f.sway;
    const nx = f.x + WIND.dx * SWAY_AMP * k, nz = f.z + WIND.dz * SWAY_AMP * k; f.dsx = nx - f.sx; f.dsz = nz - f.sz; f.sx = nx; f.sz = nz; }
}

// called from the flight code: returns extra acceleration from wind, rising air and dew rush
export function airForces(acc, dt) {
  if (inHive) return;
  const gy = terrainH(P.pos.x, P.pos.z), alt = P.pos.y - gy, dO = Math.hypot(P.pos.x - ORCH.x, P.pos.z - ORCH.z);
  const shelter = P.landed ? 0 : smooth(2, 12, alt) * (dO < HEDGE_R ? 0.35 : 1);
  acc.x += WIND.dx * WIND.s * 10 * shelter; acc.z += WIND.dz * WIND.s * 10 * shelter;
  if (G.kf <= 0 && !P.landed) { let best = null, bd = 1e9; for (const f of flowers) { const d = Math.hypot(P.pos.x - f.sx, P.pos.z - f.sz), Rh = f.r * 0.75 + f.len * 0.85, h = P.pos.y - f.y; if (d < Rh && h > 0 && h < 8 && d < bd) { bd = d; best = f; } }
    if (best) { acc.x -= P.vel.x * 2.5 - best.dsx * 60; acc.z -= P.vel.z * 2.5 - best.dsz * 60; if (G.ku <= 0) acc.y -= 7; } }
  for (const s of STONES) { const d = Math.hypot(P.pos.x - s.x, P.pos.z - s.z), h = P.pos.y - s.y; if (d < s.r + 4 && h > -4 && h < 80) { acc.y += 30 * (1 - h / 80) * smooth(s.r + 4, s.r * 0.4, d); if (!G.seenLift && h > 2) { G.seenLift = true; toast('<b>Warm air rises off the sun-baked stone</b><br><span>let it carry you up</span>', 5); } } }
  // gust flecks drifting past
  if (WIND.s > 0.45 && Math.random() < dt * 40 * WIND.s * shelter) { const q = parts[pNext]; _v.set(P.pos.x + rnd(-14, 14), P.pos.y + rnd(-5, 6), P.pos.z + rnd(-14, 14)); puff(_v, 1, [0.9, 0.88, 0.78], 0, 0.006, 1.4); q.v.set(WIND.dx * 26 * WIND.s, rnd(-1, 1), WIND.dz * 26 * WIND.s); }
}
export function updateAirLife(dt) {
  G.boost = Math.max(0, G.boost - dt); G.chainT -= dt; if (G.chainT <= 0) G.chain = 0;
  const near = P.mode === 'fly' && !inHive;
  for (const s of STONES) { const d = Math.hypot(camera.position.x - s.x, camera.position.z - s.z); if (d < 160 && Math.random() < dt * 12) { const q = parts[pNext]; _v.set(s.x + rnd(-6, 6), s.y + rnd(0, 3), s.z + rnd(-6, 6)); puff(_v, 1, [1.0, 0.85, 0.55], 0, 0.009, 3.5); q.v.set(rnd(-0.5, 0.5), rnd(5, 9), rnd(-0.5, 0.5)); } }
  for (const a of ARCHES) {
    if (a.cool > 0) { a.cool -= dt; a.drop.scale.setScalar(Math.min(1, Math.max(0.01, 1 - a.cool / 1.5 + 1 - 1)) ); if (a.cool <= 0) { a.drop.visible = true; a.drop.scale.set(1, 1.25, 1); } continue; }
    a.drop.position.set(a.home.x + Math.sin(time * 1.7 + a.cx) * 0.12, a.home.y + Math.sin(time * 2.3 + a.cz) * 0.06, a.home.z);
    if (near && P.pos.distanceTo(a.drop.position) < 1.9) {
      a.cool = 14; a.drop.visible = false; G.boost = 2.6; G.chain = G.chainT > 0 ? G.chain + 1 : 1; G.chainT = 4;
      tone(SCALE[Math.min(7, 2 + G.chain)], 0.11, 1.6); tone(SCALE[Math.min(7, 2 + G.chain)] * 2, 0.04, 1.2, 'sine', 0.05); puff(a.drop.position, 18, [0.75, 1.0, 0.9], 2.5, 0.01, 1.0);
      if (!G.seenDew) { G.seenDew = true; toast('<b>A sip of morning dew</b><br><span>a rush of energy. There are more under the arching stems</span>', 5); }
    }
  }
  // blossoms drifting down from the orchard canopies
  if (G.orchard && Math.hypot(camera.position.x - ORCH.x, camera.position.z - ORCH.z) < ORCH.r + 80 && Math.random() < dt * 30) {
    const t = orchTrees[(Math.random() * orchTrees.length) | 0], q = parts[pNext]; _v.set(t.x + rnd(-t.cr, t.cr), t.top + rnd(-2, 4), t.z + rnd(-t.cr, t.cr));
    puff(_v, 1, Math.random() < 0.6 ? [1.0, 0.62, 0.75] : [1.0, 0.92, 0.9], 0, 0.011, 6); q.g = 0; q.v.set(WIND.dx * 6 * WIND.s + rnd(-1, 1), -rnd(1.5, 3), WIND.dz * 6 * WIND.s + rnd(-1, 1));
  }
}

// the arches are solid stems: a swept capsule test so a fast bee can't slip through between frames
export const _aPrev = new V3(), _aD1 = new V3(), _aD2 = new V3(), _aR = new V3(), _aC1 = new V3(), _aC2 = new V3(), _aN = new V3(); let _aHas = false;
export function segSeg(p1, q1, p2, q2) { _aD1.subVectors(q1, p1); _aD2.subVectors(q2, p2); _aR.subVectors(p1, p2);
  const a = _aD1.dot(_aD1), e = _aD2.dot(_aD2), f = _aD2.dot(_aR); let s, t;
  if (a < 1e-8) { s = 0; t = clamp(f / e, 0, 1); } else { const c = _aD1.dot(_aR); const b = _aD1.dot(_aD2), den = a * e - b * b;
    s = den > 1e-8 ? clamp((b * f - c * e) / den, 0, 1) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); } }
  _aC1.copy(p1).addScaledVector(_aD1, s); _aC2.copy(p2).addScaledVector(_aD2, t); return _aC1.distanceTo(_aC2); }
export function archCollide(p, v) {
  if (!_aHas || _aPrev.distanceTo(p) > 6) _aPrev.copy(p); _aHas = true; const r = 0.34 + PR;
  for (const a of ARCHES) { if (Math.abs(p.x - a.cx) > a.w + 4 || Math.abs(p.z - a.cz) > a.w + 4) continue;
    const S = a.samples; for (let i = 0; i < S.length - 1; i++) {
      if (segSeg(_aPrev, p, S[i], S[i + 1]) >= r) continue;
      _aN.subVectors(_aC1, _aC2); let L = _aN.length(); if (L < 1e-4) { _aN.subVectors(_aPrev, _aC2); L = _aN.length() || 1; } _aN.multiplyScalar(1 / L);
      p.copy(_aC2).addScaledVector(_aN, r + 0.01); if (v) { const vn = v.dot(_aN); if (vn < 0) v.addScaledVector(_aN, -vn * 1.3); }
    } }
  _aPrev.copy(p);
}
export function windHint() { if (camQuiet) return; if (time > G.windHintT) { G.windHintT = time + 7; toast(`<b>The hedge winds are too strong</b><br><span>leave 20 honey at the glowing stone by the gate (you have ${stores()} stored)</span>`, 4); } }

// petal gusts: now and then a ribbon of petals rides the wind. Fly inside it and it carries you
export const GN = 70, GUSTS = [];

export function setupPetalGusts() {
  { const gm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: U.uTime },
      vertexShader: `attribute float aA; attribute vec3 aC; varying float vA; varying vec3 vCc; void main(){ vec4 mv=viewMatrix*vec4(position,1.0); vA=aA; vCc=aC; gl_PointSize=clamp(0.5*500.0/max(-mv.z,0.1),2.0,40.0); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: UNTONE + `varying float vA; varying vec3 vCc; void main(){ vec2 q=gl_PointCoord-0.5; float a=smoothstep(0.5,0.3,length(q*vec2(1.0,1.9))); gl_FragColor=vec4(untone(vCc)*1.2,a*vA); }` });
    for (let k = 0; k < 2; k++) { const pos = new Float32Array(GN * 3), al = new Float32Array(GN), col = new Float32Array(GN * 3); for (let i = 0; i < GN; i++) { const c = [[1.0, 0.75, 0.85], [1.0, 0.95, 0.95], [0.95, 0.55, 0.7]][i % 3]; col.set(c, i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aA', new THREE.BufferAttribute(al, 1)); g.setAttribute('aC', new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(g, gm); pts.frustumCulled = false; pts.visible = false; scene.add(pts);
      GUSTS.push({ pts, g, pos, al, on: false, t: 0, next: rnd(15, 35) + k * 20, c: new V3(), dir: new V3(), off: Array.from({ length: GN }, () => [rnd(0, 1), rnd(TAU), rnd(0.3, 1)]) }); } }
  G.seenGust = false;
}

export function updateGusts(dt) {
  for (const G2 of GUSTS) {
    if (!G2.on) { G2.next -= dt; if (G2.next <= 0 && P.mode === 'fly' && !inHive && outF > 0.8) { G2.on = true; G2.t = 0; G2.dir.set(WIND.dx, 0, WIND.dz).normalize();
        G2.c.copy(P.pos).addScaledVector(G2.dir, -rnd(25, 40)).add(new V3(rnd(-12, 12), 0, rnd(-12, 12))); G2.c.y = Math.max(terrainH(G2.c.x, G2.c.z) + rnd(6, 14), P.pos.y + rnd(-3, 3)); G2.pts.visible = true; } continue; }
    G2.t += dt; const life = 14, fade = Math.min(1, G2.t / 1.5) * Math.min(1, (life - G2.t) / 2); G2.c.addScaledVector(G2.dir, dt * 15); G2.c.y += Math.sin(G2.t * 0.8) * dt * 1.5;
    const gy = terrainH(G2.c.x, G2.c.z) + 3; if (G2.c.y < gy) G2.c.y = gy;
    for (let i = 0; i < GN; i++) { const [u, ph, rr] = G2.off[i], s = (u * 22 - 11), sw = Math.sin(G2.t * 2 + u * 9) * 1.5;
      G2.pos[i * 3] = G2.c.x + G2.dir.x * s - G2.dir.z * (Math.cos(ph + G2.t * 3) * 1.6 * rr + sw); G2.pos[i * 3 + 1] = G2.c.y + Math.sin(ph + G2.t * 3) * 1.6 * rr + Math.sin(u * 7 + G2.t) * 0.6; G2.pos[i * 3 + 2] = G2.c.z + G2.dir.z * s + G2.dir.x * (Math.cos(ph + G2.t * 3) * 1.6 * rr + sw);
      G2.al[i] = fade * (0.6 + 0.4 * Math.sin(G2.t * 6 + i)); }
    G2.g.attributes.position.needsUpdate = G2.g.attributes.aA.needsUpdate = true;
    if (P.mode === 'fly') { _v.copy(P.pos).sub(G2.c); const along = _v.dot(G2.dir); _v.addScaledVector(G2.dir, -along);
      if (Math.abs(along) < 12 && _v.length() < 3.2) { G.boost = Math.max(G.boost, 1.2); P.vel.addScaledVector(G2.dir, dt * 10); if (Math.random() < dt * 4) tone(SCALE[(Math.random() * 3 | 0) + 4], 0.03, 0.6);
        if (!G.seenGust) { G.seenGust = true; toast('<b>Caught in a petal gust!</b><br><span>ride the wind with it</span>', 3); } } }
    if (G2.t > life) { G2.on = false; G2.pts.visible = false; G2.next = rnd(25, 50); }
  }
}
