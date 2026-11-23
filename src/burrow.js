// Honeylight: the mole tunnel. The long run goes under the big hill: in by an old mole run among molehills, out by a rabbit hole on the far side.
// The ground is a height map, so the tunnel is three things: a hole cut in the ground's picture at each mouth (cutGround in places.js),
// a tube of earth under the hill, and a rule in collide() that lets the bee be under the ground inside the tube (burrowHolds).
// It is dark inside: pale fungus glows on the walls, and the light that the bee carries on the run (uAura) or at night (uLamp) shows the earth.
import * as THREE from '../three.module.min.js';
import { V3, Q4, clamp, lerp, TAU } from './core.js';
import { terrainH } from './world.js';
import { scene, mat, hidden } from './engine.js';
import { groundMeshH, cutGround } from './places.js';
import { PR } from './player.js';
import { seeded, quietBuild, clearDisc, clearBar, stoneM, earthM, sandM, rootM, addParts, at, lumpTube, rockGeo, moundGeo } from './runkit.js';
import { addStone, addStick } from './solids.js';

// ---------- the numbers ----------
// way: the track's control points through the hill (x, z). The first and the last are outside, on the ground.
export const BURROW = { R: 3.0, dip: 1.6, way: [[139.8, -89.7], [153.9, -96.2], [171.8, -93.9], [187.9, -90.3], [204, -93.9], [217, -103.9], [224.6, -118.5], [225.9, -128.3]],
  C: [], fy: [], cover: [], open: [], n: 0, iIn: 0, iOut: 0, box: null, hills: [], fungi: [] };
const STEP = 1.2;

// ---------- the line of the tunnel: longrun.js calls this when the track is laid, before anything is built ----------
// S: the track's samples. The tunnel takes the samples between its first and last control point as its centre line.
export function layBurrow(S) {
  const B = BURROW, w = B.way, near = (x, z) => { let bi = 0, bd = 1e9; S.forEach((p, i) => { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const i0 = near(w[0][0], w[0][1]), i1 = near(w[w.length - 1][0], w[w.length - 1][1]), A = S.slice(i0, i1 + 1), n = A.length;
  const y0 = terrainH(A[0].x, A[0].z), y1 = terrainH(A[n - 1].x, A[n - 1].z);
  let fy = A.map((p, i) => { const u = i / (n - 1); return Math.min(lerp(y0, y1, u) - B.dip * Math.sin(Math.PI * u) ** 2, terrainH(p.x, p.z)); });
  for (let k = 0; k < 4; k++) fy = fy.map((y, i) => i === 0 || i === n - 1 ? y : Math.min((fy[i - 1] + 2 * y + fy[i + 1]) / 4, terrainH(A[i].x, A[i].z)));
  B.n = n; B.i0 = i0; B.fy = fy; B.C = A.map((p, i) => new V3(p.x, fy[i] + B.R, p.z));
  B.cover = A.map((p, i) => terrainH(p.x, p.z) - (fy[i] + 2 * B.R)); // earth over the roof (below 0: the roof is open to the sky)
  B.iIn = B.cover.findIndex(c => c > 0); B.iOut = n - 1 - [...B.cover].reverse().findIndex(c => c > 0);
  B.open = B.cover.map((c, i) => c <= 0 ? 1 : Math.exp(-Math.min(i - B.iIn, B.iOut - i) * STEP / 6)); // daylight: 1 at a mouth, fading inside
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of A) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  B.box = [x0 - B.R - 3, x1 + B.R + 3, z0 - B.R - 3, z1 + B.R + 3];
  // no grass in the two mouths (the open cut that leads into each hole)
  clearBar(A[0].x, A[0].z, A[B.iIn + 2].x, A[B.iIn + 2].z, B.R + 0.9, 1.6); clearBar(A[B.iOut - 2].x, A[B.iOut - 2].z, A[n - 1].x, A[n - 1].z, B.R + 0.9, 1.6);
  // molehills by the way in: [along the line (sample), to the side, radius, height]
  const r = seeded(7741); B.hills = [];
  for (const [i, lat, rad, h] of [[B.iIn - 6, 7.4, 3.9, 3.0], [B.iIn - 1, -7.0, 4.4, 3.4], [B.iIn + 5, 7.8, 3.3, 2.6], [B.iIn - 10, -8.6, 2.9, 2.2], [B.iIn + 9, -8.2, 3.6, 2.8]]) {
    const j = clamp(i, 1, n - 2), p = A[j], q = A[j + 1], tx = (q.x - p.x) / STEP, tz = (q.z - p.z) / STEP, x = p.x - tz * lat, z = p.z + tx * lat;
    B.hills.push({ x, z, y: terrainH(x, z), rad, h, seed: r(10) }); clearDisc(x, z, rad + 0.4, 1.4); }
  // pale sand kicked out in a fan before the way out: [along the line past the end, to the side, radius]
  B.sand = []; { const e = A[n - 1], p = A[n - 2], tx = (e.x - p.x) / STEP, tz = (e.z - p.z) / STEP;
    for (const [al, lat, rad] of [[-2, 0, 4.6], [3.5, 2.6, 3.4], [3, -3.0, 3.0], [8, 0.4, 2.6]]) { const x = e.x + tx * al - tz * lat, z = e.z + tz * al + tx * lat; B.sand.push({ x, z, rad }); clearDisc(x, z, rad * 0.75, 1.2); } }
}

// the tunnel floor under (x, z), or null when (x, z) is not over the tunnel. longrun.js uses it as the ground of the track there
export function burrowFloor(x, z) {
  const B = BURROW, b = B.box; if (!b || x < b[0] || x > b[1] || z < b[2] || z > b[3]) return null;
  let bi = 0, bd = 1e18; for (let i = 0; i < B.n; i++) { const c = B.C[i], d = (c.x - x) ** 2 + (c.z - z) ** 2; if (d < bd) { bd = d; bi = i; } }
  if (bd > (B.R + 0.6) ** 2 || B.cover[bi] < 0.4 - 2 * B.R) return null; // beside it, or at an end where the floor is the ground
  return B.fy[bi];
}

// collide() asks this when the bee is at or under the ground. Inside the tube the bee may stay there: the tube's wall holds it, not the ground.
const _d = new V3(), _q = new V3(), _best = new V3();
export function burrowHolds(p, v) {
  const B = BURROW, b = B.box; if (!b || p.x < b[0] || p.x > b[1] || p.z < b[2] || p.z > b[3]) return false;
  let bd = 1e18; for (let i = 0; i < B.n - 1; i++) { const a = B.C[i]; _d.subVectors(B.C[i + 1], a); const t = clamp(_q.subVectors(p, a).dot(_d) / _d.lengthSq(), 0, 1); _q.copy(a).addScaledVector(_d, t); const d = _q.distanceToSquared(p); if (d < bd) { bd = d; _best.copy(_q); } }
  bd = Math.sqrt(bd);
  if (!(bd < B.R || (bd < B.R + 1.2 && p.y < terrainH(p.x, p.z) - 0.8))) return false; // not in the tube (the second test catches a bee that went a little way into the wall)
  const lim = B.R - PR; if (bd > lim) { _d.subVectors(p, _best).multiplyScalar(1 / bd); p.copy(_best).addScaledVector(_d, lim); const vn = v.dot(_d); if (vn > 0) v.addScaledVector(_d, -vn * 1.1); }
  return true;
}
// is this point inside the dark part of the tunnel? (for tests and for places that want to know)
export function inBurrow(p) { const f = burrowFloor(p.x, p.z); return f !== null && p.y < f + 2 * BURROW.R + 0.5 && p.y < terrainH(p.x, p.z); }

// ---------- what you see ----------
let caveM, fungusM;
const CAVE_VERT = `attribute vec4 aData; attribute vec3 aGlow; varying vec4 vData; varying vec3 vGlow;
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv; varying vec3 vL;
void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vL=position; vN=normalize(mat3(modelMatrix)*normal); vUv=uv; vC=color; vData=aData; vGlow=aGlow; gl_Position=projectionMatrix*viewMatrix*w; }`;
function makeMats() {
  // aData = (height over the ground's picture, daylight 0..1, how near the floor's middle 0..1, kind: 0 earth wall, 1 a root or a stone with its own colour)
  caveM = mat(`varying vec4 vData; varying vec3 vGlow;
  void main(){ if(vData.x>0.0) discard; vec3 n=normalize(vN); vec3 q=vW*0.8; float a=fbm(q.xz*1.1+q.y*0.9), f=vnoise(q.xy*7.0+q.z*5.0);
  vec3 soil=mix(vec3(0.10,0.068,0.045),vec3(0.34,0.24,0.15),a)*(0.65+0.7*f);
  soil=mix(soil,vec3(0.36,0.28,0.19)*(0.8+0.3*f),smoothstep(0.82,0.98,vData.z)*0.8); /* the floor's middle is worn smooth and pale by small feet */
  vec3 alb=mix(soil,vC*(0.7+0.6*f),step(0.5,vData.w));
  n=normalize(n+(vec3(fbm(q.yz*3.0),fbm(q.xz*3.0),fbm(q.xy*3.0))-0.5)*0.9*(1.0-0.6*step(0.5,vData.w)));
  vec3 day=finish(shade(alb,n,vW,0.02,0.0),vW);
  float beat=0.8+0.2*sin(uTime*1.1+vW.x*0.35+vW.z*0.3);
  vec3 dark=alb*(vGlow*beat+vec3(0.010,0.012,0.016));
  if(uLamp.w>0.0){ vec3 Lq=uLamp.xyz-vW; float dq=dot(Lq,Lq); dark+=alb*uLampC*(uLamp.w/(1.0+dq*0.045))*(0.35+0.65*max(dot(n,Lq*inversesqrt(dq+1e-4)),0.0)); }
  if(uAura.w>0.0){ vec3 La=uAura.xyz-vW; float da=dot(La,La); dark+=alb*uAuraC*(uAura.w/(1.0+da*0.06))*(0.4+0.6*max(dot(n,La*inversesqrt(da+1e-4)),0.0)); }
  gl_FragColor=vec4(mix(dark,day,vData.y),1.0); }`, { vert: CAVE_VERT, vertexColors: true, side: THREE.DoubleSide });
  // the fungus gives its own light (it is drawn brighter than white, so the glow pass makes it shine)
  fungusM = mat(`void main(){ vec3 n=normalize(vN); vec3 V=normalize(uCam-vW); float rim=pow(1.0-abs(dot(n,V)),2.0); float beat=0.8+0.2*sin(uTime*1.1+vW.x*0.35+vW.z*0.3);
  gl_FragColor=vec4(vC*(0.75+1.1*rim)*beat,1.0); }`, { vertexColors: true });
}

export function setupBurrow() { quietBuild(40417, () => {
  makeMats();
  const B = BURROW, n = B.n, C = B.C, R = B.R, SEG = 20, r = seeded(5519);
  const tan = i => _d.subVectors(C[Math.min(n - 1, i + 1)], C[Math.max(0, i - 1)]).normalize().clone();
  const frame = i => { const t = tan(i), side = new V3(-t.z, 0, t.x).normalize(), up = new V3().crossVectors(side, t); return { t, side, up }; };
  const wallR = (i, a) => R + 0.1 + 0.2 * (1 + Math.sin(i * 0.31 + a * 2 + 1.3) * Math.sin(i * 0.17 + a * 5 + 0.4)) + 0.1 * Math.sin(i * 1.3 + a * 3);
  const wallAt = (i, a, inset = 0) => { const f = frame(i); return C[i].clone().addScaledVector(f.side, Math.cos(a) * (wallR(i, a) - inset)).addScaledVector(f.up, Math.sin(a) * (wallR(i, a) - inset)); };

  // the fungus first: its light is baked into the walls
  const fparts = [], fung = [];
  for (let i = B.iIn + 4, k = 0; i < B.iOut - 3; i += 6 + Math.floor(r(3)), k++) { const a = [0.45, 2.55, 1.25, 2.9, 0.15, 1.95][k % 6] + r(-0.2, 0.2), c = wallAt(i, a, 0.05), f = frame(i), inward = C[i].clone().sub(c).normalize();
    const col = k % 3 === 2 ? [0.72, 0.86, 1.0] : [0.50, 1.0, 0.78];
    fung.push({ p: c.clone().addScaledVector(inward, 0.25), c: col, k: 1 });
    const caps = 7 + Math.floor(r(6)); for (let j = 0; j < caps; j++) { const s = j < 3 ? r(0.16, 0.3) : r(0.05, 0.12), p = c.clone().addScaledVector(f.t, r(-0.9, 0.9)).addScaledVector(new V3().crossVectors(inward, f.t), r(-0.8, 0.8)).addScaledVector(inward, s * 0.2);
      const m = new THREE.Matrix4().compose(p, new Q4().setFromUnitVectors(new V3(0, 1, 0), inward), new V3(s, s * 0.45, s)); fparts.push({ g: new THREE.SphereGeometry(1, 12, 6), m, c: col }); } }
  B.fungi = fung;
  const glowAt = (p, nrm) => { let gr = 0, gg = 0, gb = 0; for (const f of fung) { _q.subVectors(f.p, p); const d2 = _q.lengthSq(); if (d2 > 200) continue; const d = Math.sqrt(d2) || 1e-3, k = 1.1 / (1 + d2 * 0.3) * (0.3 + 0.7 * Math.max(0, _q.dot(nrm) / d)); gr += f.c[0] * k; gg += f.c[1] * k; gb += f.c[2] * k; } return [gr, gg, gb]; };

  // the tube, and the roots and stones in it, as one mesh
  const pos = [], nor = [], col = [], data = [], glow = [], uv = [];
  const push = (p, nrm, c, open, floor, kind, clip) => { pos.push(p.x, p.y, p.z); nor.push(nrm.x, nrm.y, nrm.z); col.push(c[0], c[1], c[2]); uv.push(0, 0);
    data.push(clip ? p.y - groundMeshH(p.x, p.z) : -1, open, floor, kind); const g = glowAt(p, nrm); glow.push(g[0], g[1], g[2]); };
  const ring = []; for (let i = 0; i < n; i++) { const f = frame(i), row = []; for (let j = 0; j <= SEG; j++) { const a = j / SEG * TAU, dir = f.side.clone().multiplyScalar(Math.cos(a)).addScaledVector(f.up, Math.sin(a));
    row.push({ p: C[i].clone().addScaledVector(dir, wallR(i, a)), n: dir.clone().multiplyScalar(-1), fl: Math.max(0, -Math.sin(a)) }); } ring.push(row); }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < SEG; j++) for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [0, 1], [1, 0], [1, 1]]) { const v = ring[i + di][j + dj]; push(v.p, v.n, [1, 1, 1], B.open[i + di], v.fl, 0, true); }
  const addGeo = (g, c, i) => { const gg = g.index ? g.toNonIndexed() : g, p = gg.attributes.position, nn = gg.attributes.normal; for (let k = 0; k < p.count; k++) push(_q.set(p.getX(k), p.getY(k), p.getZ(k)).clone(), _d.set(nn.getX(k), nn.getY(k), nn.getZ(k)).clone(), c, B.open[i], 0, 1, false); };
  // hanging roots: thin and short, from the roof (they are not solid: they brush past like grass)
  for (let i = B.iIn - 2; i < B.iOut + 2; i += 3 + Math.floor(r(4))) { const a0 = Math.PI / 2 + r(-0.8, 0.8), f = frame(i), nn = 2 + Math.floor(r(4));
    for (let k = 0; k < nn; k++) { const a = a0 + r(-0.22, 0.22), p0 = wallAt(i, a, -0.12).addScaledVector(f.t, r(-0.5, 0.5)), L = r(0.6, 1.5);
      const p1 = p0.clone().addScaledVector(f.t, r(-0.2, 0.2)).addScaledVector(f.side, r(-0.15, 0.15)); p1.y -= L * 0.55; const p2 = p1.clone().addScaledVector(f.t, r(-0.25, 0.25)).addScaledVector(f.side, r(-0.2, 0.2)); p2.y -= L * 0.45;
      addGeo(lumpTube([p0, p1, p2], r(0.035, 0.07), 0.012, r(9), 4), [0.50, 0.40, 0.28], i); } }
  // thick roots that cross the roof like ribs
  for (let i = B.iIn + 6; i < B.iOut - 5; i += 9 + Math.floor(r(6))) { const a0 = r(0.1, 0.5), a1 = Math.PI - r(0.1, 0.5), pts = []; for (let k = 0; k <= 6; k++) pts.push(wallAt(i + (k > 3 ? 1 : 0), lerp(a0, a1, k / 6), 0.16));
    addGeo(lumpTube(pts, r(0.2, 0.3), r(0.12, 0.18), r(9), 6), [0.22, 0.155, 0.10], i); }
  // pebbles and bigger stones bedded in the wall, low down
  for (let i = B.iIn - 4; i < B.iOut + 5; i += 2 + Math.floor(r(5))) { const a = (r() < 0.5 ? r(3.4, 4.2) : r(5.2, 6.0)), c = wallAt(clamp(i, 0, n - 1), a, 0.0), s = r(0.25, 0.7);
    const g = rockGeo(s, s * r(0.6, 0.9), s * r(0.8, 1.3), r(20), 1); g.applyMatrix4(at(c.x, c.y, c.z, r(TAU))); addGeo(g, [0.30, 0.285, 0.27], clamp(i, 0, n - 1)); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aData', new THREE.Float32BufferAttribute(data, 4)); g.setAttribute('aGlow', new THREE.Float32BufferAttribute(glow, 3));
  const tube = new THREE.Mesh(g, caveM); tube.frustumCulled = false; scene.add(tube); hidden.push(tube); // the hill above already shades it
  const fm = addParts(fparts, fungusM, 'none'); B.tube = tube; B.fungusMesh = fm;

  // the hole in the ground's picture at each mouth
  { const segs = [], cut = (a, b) => { for (let i = a; i < b; i += 3) segs.push([C[i], C[Math.min(b, i + 3)]]); };
    cut(0, B.iIn + 3); cut(B.iOut - 3, n - 1);
    const v3 = p => `vec3(${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)})`, box = (i, j) => { const a = C[i], b = C[j]; return `(p.x>${(Math.min(a.x, b.x) - R - 2).toFixed(2)}&&p.x<${(Math.max(a.x, b.x) + R + 2).toFixed(2)}&&p.z>${(Math.min(a.z, b.z) - R - 2).toFixed(2)}&&p.z<${(Math.max(a.z, b.z) + R + 2).toFixed(2)})`; };
    cutGround(`bool groundCut(vec3 p){ if(!(${box(0, B.iIn + 3)}||${box(B.iOut - 3, n - 1)})) return false; float d=1e9; vec3 ab; float t;
    ${segs.map(([a, b]) => `ab=${v3(b)}-${v3(a)}; t=clamp(dot(p-${v3(a)},ab)/dot(ab,ab),0.0,1.0); d=min(d,length(p-${v3(a)}-ab*t));`).join('\n    ')}
    return d<${(R + 0.05).toFixed(2)}; }`); }

  // the way in: molehills, two stones and a root over the hole
  const stones = [], earth = [], sand = [], roots = [], up = new V3(0, 1, 0);
  for (const h of B.hills) { earth.push({ g: moundGeo(h.rad, h.h, h.seed), m: at(h.x, h.y, h.z, h.seed), c: [1, 1, 1] });
    earth.push({ g: moundGeo(h.rad * 0.45, h.h * 0.5, h.seed + 3), m: at(h.x + Math.cos(h.seed) * h.rad * 0.8, terrainH(h.x + Math.cos(h.seed) * h.rad * 0.8, h.z + Math.sin(h.seed) * h.rad * 0.8), h.z + Math.sin(h.seed) * h.rad * 0.8, h.seed * 2), c: [1.1, 1.05, 1] });
    addStone(new V3(h.x, h.y, h.z), new Q4(), [h.rad * 0.88, h.h * 0.92, h.rad * 0.88], 'molehill'); }
  const mouth = (i, sgn, rabbit) => { const f = frame(i), c = C[i], gy = (x, z) => terrainH(x, z);
    for (const s of [-1, 1]) { const lat = (R + r(1.6, 2.3)) * s, j = i - sgn * (s > 0 ? 3 : 1), q = C[clamp(j, 0, n - 1)], x = q.x + f.side.x * lat, z = q.z + f.side.z * lat, sz = [r(1.5, 2.1), r(1.3, 1.9), r(1.4, 2.0)], y = gy(x, z) + sz[1] * 0.35, yaw = r(TAU);
      stones.push({ g: rockGeo(sz[0], sz[1], sz[2], r(20)), m: at(x, y, z, yaw), c: [rabbit ? 0.5 : 0.9, 1, 1] }); addStone(new V3(x, y, z), new Q4().setFromAxisAngle(up, yaw), sz, 'mouth stone'); }
    // a root over the top of the hole, from the ground on one side to the ground on the other
    const L = R + 1.5, pts = []; for (let k = 0; k <= 6; k++) { const a = lerp(-0.25, Math.PI + 0.25, k / 6), p = c.clone().addScaledVector(f.side, Math.cos(a) * L * 1.12).addScaledVector(f.t, sgn * (0.6 * Math.sin(k * 1.7))); p.y = Math.max(c.y + Math.sin(a) * L, gy(p.x, p.z) - 0.4) + (k === 3 ? 0.3 : 0); pts.push(p); }
    roots.push({ g: lumpTube(pts, 0.5, 0.36, r(9), 7), c: [rabbit ? 0.55 : 1, 1, 1] }); for (let k = 0; k < 6; k++) addStick(pts[k], pts[k + 1], 0.42, 'mouth root'); };
  mouth(B.iIn, 1, false); mouth(B.iOut, -1, true);
  // the way out: pale sand kicked out in a fan before the hole
  for (const d of B.sand) sand.push({ g: moundGeo(d.rad, 0.42, r(9)), m: at(d.x, terrainH(d.x, d.z) + 0.02, d.z, r(TAU)), c: [1, 1, 1] });
  addParts(stones, stoneM); addParts(earth, earthM); addParts(sand, sandM); addParts(roots, rootM);
  window.__burrow = { BURROW, burrowFloor, burrowHolds, inBurrow };
}); }
