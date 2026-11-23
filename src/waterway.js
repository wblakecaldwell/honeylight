// Honeylight: the water leg of the long run: the spring rock by the pond, its mossy rill, the little waterfall to fly behind, and the reed arches.
// A spring comes out of a rib of rock, runs along its top in small steps, and falls off a flat stone into the pond. The track goes under that stone,
// between the rock and the falling water, then low over the pond between lily pads and under reeds that lean across.
// The rock and the reed stems are solid (solids.js). The falling water is not: a bee that flies through it gets wet.
import * as THREE from '../three.module.min.js';
import { V3, Q4, M4, lerp, clamp, TAU } from './core.js';
import { terrainH, WY } from './world.js';
import { scene, mat, hidden, addCasters } from './engine.js';
import { addPad, pondReeds } from './places.js';
import { P } from './player.js';
import { seeded, quietBuild, clearBar, clearAt, stoneM, mossM, leafM, caneM, addParts, at, rockGeo, moundGeo, bladeGeo, rodGeo, fernParts } from './runkit.js';
import { addStone, addStick } from './solids.js';
import { RUN, nearest } from './longrun.js';

// ---------- the numbers ----------
export const WATERWAY = {
  // the rill: where the water runs on top of the rock (x, z, height). A jump in height is a small step where the water tumbles
  rill: [[-166, -6, -8.1], [-167.2, 0, -8.2], [-168, 5, -8.25], [-168.2, 8, -9.0], [-168, 14, -9.1], [-167.6, 19, -9.15], [-167, 22, -9.8], [-165.5, 27, -9.9], [-162.5, 31.2, -10.0], [-160, 33, -10.45], [-156, 35.2, -10.5], [-152.4, 36.8, -10.55]],
  slab: { x: -156.5, z: 34.8, y: -11.25, s: [5.6, 0.62, 3.2] },   // the flat stone the water falls from; the track goes under it
  way: [[-159, -30], [-156.8, -8], [-157, 10], [-156.4, 24], [-155.6, 35.5], [-160, 52], [-165, 62], [-171, 72]], // the track's control points
  arches: [[-159.4, 50], [-164.6, 61], [-170.6, 71.5], [-176.6, 80.5]],                                                // reed arches stand on the track near these spots
  pads: [[-166.5, 49, 3.4, 0.7], [-153.6, 47.4, 3.0, 2.9], [-170.8, 58.5, 3.6, 4.4], [-178.5, 74, 3.2, 1.8], [-171.5, 80.5, 2.8, 5.3]],
  wetR: 2.6,                                                                                                          // how near the falling water wets the bee
};
const W = WATERWAY;
// no grass on the rock
{ const R = W.rill; for (let i = 0; i < R.length - 1; i++) clearBar(R[i][0], R[i][1], R[i + 1][0], R[i + 1][1], 5.0, 1.6); }

let rillM, fallM, foamM;
function makeMats() {
  const SKY = `vec3 R=reflect(-V,n); vec3 sk=mix(hazeCol(R),vec3(0.07,0.17,0.46),pow(clamp(R.y,0.0,1.0),0.5));`;
  // running water on the rock: uv.x across, uv.y along (it moves that way); red vertex colour = foam on a step
  rillM = mat(`void main(){ float t=uTime; float f1=fbm(vec2(vUv.x*3.0,vUv.y*1.1-t*1.5)), f2=vnoise(vec2(vUv.x*9.0,vUv.y*3.6-t*3.4));
  float edge=smoothstep(0.0,0.28,min(vUv.x,1.0-vUv.x)); vec3 n=normalize(vec3((f1-0.5)*0.9,1.0,(f2-0.5)*0.9)); vec3 V=normalize(uCam-vW); float fr=pow(1.0-max(dot(n,V),0.0),3.0);
  ${SKY} vec3 c=mix(vec3(0.05,0.17,0.15),sk,0.28+0.72*fr); c+=vec3(4.0,2.6,1.3)*pow(max(dot(R,uSun),0.0),120.0)*2.0*(1.0-uNight);
  float foam=clamp(smoothstep(0.52,0.78,f2)*0.7+vC.r*(0.45+0.55*f1)+step(0.985,vnoise(vec2(vUv.x*14.0,vUv.y*9.0-t*5.0)))*0.8,0.0,1.0); vec3 fc=shade(vec3(0.86,0.91,0.95),vec3(0.0,1.0,0.0),vW,0.0,0.4);
  c=mix(c,fc,foam); gl_FragColor=vec4(finish(c,vW),edge*(0.7+0.3*foam)); }`, { transparent: true, depthWrite: false, vertexColors: true });
  // the falling water: uv.x across, uv.y down
  fallM = mat(`void main(){ float t=uTime; float st=fbm(vec2(vUv.x*6.0,vUv.y*2.0-t*2.4))*0.6+vnoise(vec2(vUv.x*21.0,vUv.y*4.5-t*4.6))*0.4;
  float edge=smoothstep(0.0,0.3,min(vUv.x,1.0-vUv.x)+(st-0.5)*0.22); float body=smoothstep(0.3,0.72,st); float a=(0.46+0.5*body)*edge*(1.0-0.12*vUv.y);
  vec3 lit=shade(vec3(0.82,0.89,0.95),normalize(vN),vW,0.5,0.9); vec3 c=mix(lit*0.5+vec3(0.02,0.05,0.06),lit*1.2,body);
  gl_FragColor=vec4(finish(c,vW),a); }`, { transparent: true, depthWrite: false, side: THREE.DoubleSide });
  // foam and rings on the pond where it lands
  foamM = mat(`void main(){ vec2 q=vUv-0.5; float r=length(q)*2.0; float ring=sin(r*16.0-uTime*4.5)*0.5+0.5; float f=fbm(q*9.0+uTime*0.7);
  float a=smoothstep(1.0,0.15,r)*(0.25+0.55*f)*(0.55+0.45*ring)+smoothstep(0.45,0.0,r)*0.5; vec3 c=shade(vec3(0.86,0.91,0.95),vec3(0.0,1.0,0.0),vW,0.0,0.4);
  gl_FragColor=vec4(finish(c,vW),clamp(a,0.0,0.9)); }`, { transparent: true, depthWrite: false });
}

export function setupWaterway() { quietBuild(77123, () => {
  makeMats();
  const r = seeded(9153), up = new V3(0, 1, 0), stone = [], moss = [], leaf = [], cane = [];
  const curve = new THREE.CatmullRomCurve3(W.rill.map(p => new V3(p[0], p[2], p[1])), false, 'catmullrom', 0.2), LEN = curve.getLength(), N = Math.ceil(LEN / 0.7), pts = curve.getSpacedPoints(N);
  const tanAt = i => pts[Math.min(N, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).setY(0).normalize();

  // ----- the rock: big stones under the rill, a cap stone over the spring, the flat stone at the end -----
  const boulder = (x, y, z, s, yaw, mossy = 1, wet = 1, solid = true) => { stone.push({ g: rockGeo(s[0], s[1], s[2], r(30)), m: at(x, y, z, yaw), c: [mossy, 1, wet] }); if (solid) addStone(new V3(x, y, z), new Q4().setFromAxisAngle(up, yaw), s, 'spring rock'); };
  for (let d = 0; d < LEN - 9.5; d += 4.0) { const i = Math.round(d / LEN * N), p = pts[i], t = tanAt(i), gy = Math.min(terrainH(p.x, p.z), WY), sy = Math.max(2.4, (p.y - 0.3 - gy) / 1.75), last = d + 4.0 >= LEN - 9.5;
    const s = last ? [3.3, sy, 3.2] : [r(3.4, 4.4), sy, r(3.2, 4.0)], lat = last ? 0 : r(-0.6, 0.6); boulder(p.x - t.z * lat, p.y - 0.34 - sy * 1.04, p.z + t.x * lat, s, Math.atan2(-t.z, t.x) + r(-0.3, 0.3)); }
  { const s0 = W.rill[0]; boulder(s0[0] + 0.3, s0[2] + 1.0, s0[1] - 3.4, [3.5, 2.5, 3.1], 0.4); boulder(s0[0] - 2.6, s0[2] - 1.2, s0[1] - 1.2, [2.6, 2.6, 2.4], 1.9); boulder(s0[0] + 2.9, s0[2] - 1.6, s0[1] - 0.8, [2.3, 2.4, 2.6], 4.1); }
  { const sl = W.slab, a = W.rill[W.rill.length - 3], b = W.rill[W.rill.length - 1]; sl.yaw = Math.atan2(-(b[1] - a[1]), b[0] - a[0]); boulder(sl.x, sl.y, sl.z, sl.s, sl.yaw, 0.8, 0.4); }
  // small stones at the rock's foot, on both sides
  for (let k = 0; k < 22; k++) { const i = Math.floor(r(0.02, 0.8) * N), p = pts[i], t = tanAt(i), lat = (r() < 0.5 ? -1 : 1) * r(4.2, 6.0), x = p.x - t.z * lat, z = p.z + t.x * lat, s = r(0.7, 1.5), gy = Math.max(terrainH(x, z), WY - 0.4);
    const far = Math.min(...RUN.S.slice(RUN.dewN).map(q => Math.hypot(q.x - x, q.z - z))); if (far - s * 1.2 < 3.7) continue; boulder(x, gy + s * 0.3, z, [s, s * r(0.6, 0.9), s * r(0.8, 1.2)], r(TAU), 1, 1, s > 1.0); }

  // ----- the bed the water runs in (a shallow cut in the top of the rock), with bank stones and moss -----
  { const pos = [], idx = [], col = [], prof = [[-1.95, -1.7], [-1.45, 0.14], [0, -0.1], [1.45, 0.14], [1.95, -1.7]];
    for (let i = 0; i <= N; i++) { const p = pts[i], t = tanAt(i), wd = 1 + 0.9 * clamp((i / N * LEN - (LEN - 7)) / 7, 0, 1); for (const [lx, ly] of prof) pos.push(p.x - t.z * lx * wd, p.y + ly + 0.05 * Math.sin(i * 0.9 + lx), p.z + t.x * lx * wd);
      if (i) for (let j = 0; j < 4; j++) { const a = (i - 1) * 5 + j, b = a + 5; idx.push(a, a + 1, b, a + 1, b + 1, b); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); stone.push({ g, c: [0.35, 1, 0.3] }); }
  for (let d = 1.5; d < LEN - 2; d += r(1.1, 2.0)) { const i = Math.round(d / LEN * N), p = pts[i], t = tanAt(i), sd = r() < 0.5 ? -1 : 1, lat = sd * r(1.7, 2.5), x = p.x - t.z * lat, z = p.z + t.x * lat;
    if (r() < 0.55) { const s = r(0.5, 1.0); stone.push({ g: rockGeo(s, s * 0.8, s * r(0.8, 1.3), r(30), 1), m: at(x, p.y + 0.1, z, r(TAU)), c: [1, 1, 1] }); }
    else moss.push({ g: moundGeo(r(0.9, 1.7), r(0.4, 0.75), r(30), 10), m: at(x, p.y - 0.05, z, r(TAU)), c: [r(0.8, 1.15), r(0.9, 1.1), 0.9] }); }
  // ferns in the cracks and at the foot, on the side of the track
  for (const [f, lat, size] of [[0.1, -4.6, 3.2], [0.22, 2.4, 2.2], [0.3, -4.9, 3.6], [0.45, -2.3, 2.0], [0.52, -4.8, 3.0], [0.68, 2.6, 2.4], [0.04, 3.0, 2.6]]) { const i = Math.round(f * N), p = pts[i], t = tanAt(i), x = p.x - t.z * lat, z = p.z + t.x * lat, onTop = Math.abs(lat) < 3.2;
    fernParts(leaf, x, onTop ? p.y - 0.1 : Math.max(terrainH(x, z), WY) + 0.2, z, size, r, 7); }

  // ----- the water: the rill on the rock, the fall off the flat stone, and foam on the pond -----
  { const pos = [], uv = [], col = [], idx = [];
    for (let i = 2; i <= N; i++) { const p = pts[i], t = tanAt(i), d = i / N * LEN, w = (0.95 + 0.2 * Math.sin(i * 0.7)) * (1 + 0.9 * clamp((d - (LEN - 7)) / 7, 0, 1)), drop = clamp((pts[Math.max(0, i - 2)].y - pts[Math.min(N, i + 2)].y) * 1.6, 0, 1);
      pos.push(p.x - t.z * -w, p.y + 0.03, p.z + t.x * -w, p.x - t.z * w, p.y + 0.03, p.z + t.x * w); uv.push(0, d * 0.5, 1, d * 0.5); col.push(drop, 0, 0, drop, 0, 0);
      if (i > 2) { const k = (i - 2) * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, rillM); m.frustumCulled = false; m.renderOrder = 3; scene.add(m); hidden.push(m); }
  { const e = pts[N], t = tanAt(N), hw = 2.1, top = e.y + 0.03, H = top - WY, pos = [], uv = [], idx = [], rows = 8;
    for (let k = 0; k <= rows; k++) { const f = k / rows, out = 0.15 + 1.25 * Math.sqrt(f), y = top - H * f * f * 0.35 - H * f * 0.65; for (const s of [-1, 1]) { const bulge = 0.72 + 0.5 * Math.sqrt(f); pos.push(e.x + t.x * out - t.z * hw * s * bulge, y, e.z + t.z * out + t.x * hw * s * bulge); uv.push(s < 0 ? 0 : 1, f * 2.2); }
      if (k) { const a = k * 2; idx.push(a - 2, a, a - 1, a - 1, a, a + 1); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, fallM); m.frustumCulled = false; m.renderOrder = 4; scene.add(m); hidden.push(m);
    W.fall = { x: e.x + t.x * 1.0, z: e.z + t.z * 1.0, top, tx: t.x, tz: t.z, hw };
    const fg = new THREE.PlaneGeometry(8.5, 8.5); fg.rotateX(-Math.PI / 2); const fm = new THREE.Mesh(fg, foamM); fm.position.set(e.x + t.x * 1.5, WY + 0.07, e.z + t.z * 1.5); fm.renderOrder = 3; fm.frustumCulled = false; scene.add(fm); hidden.push(fm); }

  // ----- the pond's own reeds leave the track and the rock free (they shrink to nothing; no random numbers are drawn) -----
  { const { reeds, heads, n } = pondReeds, m = new M4(), none = new M4().makeScale(0, 0, 0); for (let i = 0; i < n; i++) { reeds.getMatrixAt(i, m); const x = m.elements[12], z = m.elements[14]; if (nearest(x, z).d < 4.4 || clearAt(x, z) < 1) { reeds.setMatrixAt(i, none); heads.setMatrixAt(i, none); } }
    reeds.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true; }
  // ----- lily pads beside the track, and reeds that lean across it -----
  for (const [x, z, rad, turn] of W.pads) addCasters(addPad(x, z, rad, turn).mesh);
  W.archAt = [];
  for (const [ax, az] of W.arches) { let bi = RUN.dewN, bd = 1e9; for (let i = RUN.dewN; i < RUN.N; i++) { const d = Math.hypot(RUN.S[i].x - ax, RUN.S[i].z - az); if (d < bd) { bd = d; bi = i; } }
    const p = RUN.S[bi], T = RUN.T[bi], Nn = new V3(-T.z, 0, T.x); W.archAt.push(bi);
    for (const s of [-1, 1]) { const lat0 = 4.4 * s, foot = new V3(p.x + Nn.x * lat0, WY - 0.6, p.z + Nn.z * lat0);
      const P3 = (lat, y, al) => new V3(p.x + Nn.x * lat + T.x * al, WY + y, p.z + Nn.z * lat + T.z * al);
      for (let k = 0; k < 7; k++) { const al = r(-1.3, 1.3), l0 = lat0 + r(-0.6, 0.6) * 1, over = r(0.15, 0.75), hi = r(5.3, 6.4), ph = r(), k2 = r(), col = [lerp(0.20, 0.36, k2), lerp(0.40, 0.55, k2), lerp(0.10, 0.16, k2)];
        leaf.push({ g: bladeGeo([P3(l0, -0.6, al), P3(l0 * 0.95, 2.6, al * 0.9), P3(l0 * 0.62, hi - 1.0, al * 0.7), P3(l0 * 0.12, hi, al * 0.5), P3(-l0 * over, hi - r(0.5, 1.6), al * 0.3)], r(0.5, 0.7), 0.06, T, 1, ph), c: col }); }
      for (let k = 0; k < 11; k++) { const al = r(-1.8, 1.8), l0 = lat0 + s * r(0.0, 1.8), h2 = r(3.2, 6.6), ph = r(), a2 = r(TAU), ac = new V3(Math.cos(a2), 0, Math.sin(a2)), k2 = r(), lean = r(0.3, 1.5);
        leaf.push({ g: bladeGeo([P3(l0, -0.6, al), P3(l0 + s * 0.15 * lean, h2 * 0.6, al + ac.z * 0.2), P3(l0 + s * lean, h2, al + r(-0.7, 0.7))], r(0.42, 0.6), 0.05, ac, 0.8, ph), c: [lerp(0.18, 0.30, k2), lerp(0.38, 0.52, k2), lerp(0.09, 0.15, k2)] }); }
      for (let k = 0; k < 2; k++) { const b0 = P3(lat0 + s * r(0.6, 1.6), -0.6, r(-1.2, 1.2)), b1 = b0.clone().add(new V3(r(-0.4, 0.4), r(7, 9.5), r(-0.4, 0.4))); cane.push({ g: rodGeo(b0, b1, 0.11, 0.08, 5), c: [0.36, 0.52, 0.2] });
        const hd = b1.clone().sub(b0).normalize(), h0 = b1.clone().addScaledVector(hd, -1.9), g = new THREE.CylinderGeometry(0.26, 0.26, 1.6, 7); g.applyQuaternion(new Q4().setFromUnitVectors(up, hd)); g.translate(h0.x + hd.x * 0.8, h0.y + hd.y * 0.8, h0.z + hd.z * 0.8); cane.push({ g, c: [0.34, 0.17, 0.07] }); }
      addStick(foot, P3(lat0 * 0.95, 2.8, 0), 0.5, 'reed stems'); } }

  addParts(stone, stoneM); addParts(moss, mossM); addParts(leaf, leafM); addParts(cane, caneM);
  window.__waterway = { WATERWAY, pondReeds };
}); }

// every frame: a bee that flies through the falling water gets wet
export function waterwayFrame(dt) { const f = W.fall; if (!f || P.mode !== 'fly') return; const dx = P.pos.x - f.x, dz = P.pos.z - f.z, across = Math.abs(-dx * f.tz + dz * f.tx), along = dx * f.tx + dz * f.tz;
  f.in = across < f.hw && Math.abs(along) < 0.9 && P.pos.y < f.top && P.pos.y > WY; if (f.in) { P.wet = Math.min(1, P.wet + dt * 2.5); P.vel.y -= dt * 6; } }
