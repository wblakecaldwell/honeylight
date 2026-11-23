// Honeylight: the forest leg of the long run: a mossy way under the trees, with big roots, root arches, ferns, an old stump and a hollow log to fly through.
// The tall grass stands back from the track here. Moss cushions, mossy stones and ferns take its place. Big roots run out from the nearest trunks,
// and at four spots roots arch over the track. Near the middle a rotten log lies on the track: the bee flies through it.
// Roots, bigger stones, the stump and the log's wall are solid (solids.js). Ferns and moss are not.
import * as THREE from '../three.module.min.js';
import { V3, Q4, lerp, TAU } from './core.js';
import { terrainH, forestTrees } from './world.js';
import { flowers } from './plants.js';
import { seeded, quietBuild, clearBar, stoneM, mossM, leafM, rootM, barkM, addParts, at, along, lumpTube, rockGeo, moundGeo, bladeGeo, fernParts } from './runkit.js';
import { addStone, addStick, addPipe } from './solids.js';
import { RUN } from './longrun.js';

// ---------- the numbers ----------
export const MOSSWAY = {
  line: [[-198, 239.2], [-180, 239.5], [-151, 238], [-120, 241], [-98, 244], [-78, 240], [-56, 230], [-46, 228]], // the leg (the track's own control points in the forest): the grass stands back along it
  wide: 8.5,                                                                                       // no tall grass nearer the track than this
  // roots arch over the track near these spots. tree: the forest tree they come from (its place in forestTrees); -1: the old stump, which stands "stump" to the side
  arches: [{ at: [-167, 238.5], tree: 6 }, { at: [-136, 239], tree: 10 }, { at: [-75, 239], tree: -1, stump: 8.6 }, { at: [-57.5, 230.7], tree: 8 }],
  arch: { foot: 5.3, high: 5.9, r: 0.6 },                                                          // how far from the track's middle an arch stands, how high its middle is, and how thick it is
  log: { at: [-99, 244], len: 15, r: 2.6, wall: 0.45, lift: 1.9 },                                 // the hollow log: where, how long, the hole's radius, the wall, and how high its middle lies over the ground
};
const M = MOSSWAY, UP = new V3(0, 1, 0);
{ const L = M.line; for (let i = 0; i < L.length - 1; i++) clearBar(L[i][0], L[i][1], L[i + 1][0], L[i + 1][1], M.wide, 4.5); }

export function setupMossway() { quietBuild(60417, () => {
  const r = seeded(31337), S = RUN.S, TG = RUN.T, moss = [], stone = [], leaf = [], root = [], bark = [], G = terrainH;
  // the nearest track sample of this leg to a spot (the leg only, so it also works far from the track)
  const near = (x, z) => { let bi = -1, bd = 1e9; for (let i = RUN.dewN; i < RUN.N; i++) { const p = S[i]; if (Math.abs(p.x - x) > 60 || Math.abs(p.z - z) > 60) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; bi = i; } } return { i: bi, d: bd }; };
  const iA = near(M.line[0][0], M.line[0][1]).i, iB = near(M.line[M.line.length - 1][0], M.line[M.line.length - 1][1]).i, jLog = near(M.log.at[0], M.log.at[1]).i;
  M.iA = iA; M.iB = iB; M.jLog = jLog;
  // a spot beside the track: at sample j, "lat" to the side and "al" along
  const beside = (j, lat, al = 0) => { const p = S[j], t = TG[j]; return [p.x - t.z * lat + t.x * al, p.z + t.x * lat + t.z * al]; };
  const byFlower = (x, z, d) => flowers.some(f => Math.hypot(f.x - x, f.z - z) < d);
  const nearLog = j => Math.abs(j - jLog) < 9;

  // ----- moss: low cushions on the way itself, deeper ones beside it -----
  for (let j = iA; j <= iB; j++) for (let k = 0; k < 3; k++) { const side = r() < 0.5 ? -1 : 1, far = k === 0 ? r(1.3, 3.4) : r(3.0, 11.5), [x, z] = beside(j, side * far, r(-0.6, 0.6));
    const rad = far < 3.4 ? r(1.0, 1.9) : r(1.4, 3.4), h = far < 3.4 ? r(0.12, 0.26) : r(0.3, 0.95), t = r(), yaw = r(TAU), seed = r(30); if (nearLog(j) && far < 3.8) continue;
    moss.push({ g: moundGeo(rad, h, seed, 10), m: at(x, G(x, z) - 0.05, z, yaw), c: [lerp(0.7, 1.25, t), lerp(0.8, 1.15, t), lerp(0.6, 1.0, t)] }); }
  // ----- mossy stones -----
  for (let k = 0; k < 46; k++) { const j = Math.floor(r(iA + 2, iB - 2)), side = r() < 0.5 ? -1 : 1, [x, z] = beside(j, side * r(4.7, 10.5)), s = r(0.6, 1.9), sz = [s, s * r(0.55, 0.85), s * r(0.8, 1.25)], yaw = r(TAU), seed = r(30);
    if (near(x, z).d - Math.max(sz[0], sz[2]) < 3.7 || byFlower(x, z, 3) || (nearLog(j) && near(x, z).d < 6)) continue; const y = G(x, z) + sz[1] * 0.25; stone.push({ g: rockGeo(sz[0], sz[1], sz[2], seed), m: at(x, y, z, yaw), c: [1, 1, 1] });
    if (s > 1.0) addStone(new V3(x, y, z), new Q4().setFromAxisAngle(UP, yaw), sz, 'mossy stone'); }
  // ----- ferns: big ones close by that arch over the way, smaller ones behind -----
  for (let j = iA + 1; j < iB; j += 2) for (const side of [-1, 1]) { const big = r() < 0.42, far = big ? r(4.3, 5.6) : r(5.0, 10), [x, z] = beside(j, side * far, r(-1, 1)), size = big ? r(5.5, 7.5) : r(2.8, 5), skip = r() < 0.22;
    if (skip || near(x, z).d < 4.0 || byFlower(x, z, 3.5)) continue; fernParts(leaf, x, G(x, z) + 0.1, z, size, r, big ? 9 : 7); }

  // ----- roots -----
  const trunkAt = (t, h) => [t.x + Math.sin(h * 0.11 + t.x) * 0.7, t.z + Math.cos(h * 0.09 + t.z) * 0.6]; // a forest trunk leans a little (places.js)
  const rootTube = (pts, r0, r1, tag) => { root.push({ g: lumpTube(pts, r0, r1, r(9), 7, 0.09), c: [1, 1, 1] }); for (let k = 0; k + 1 < pts.length; k++) { const rr = lerp(r0, r1, (k + 0.5) / (pts.length - 1)); if (rr > 0.3) addStick(pts[k], pts[k + 1], rr, tag); } };
  // a root that snakes over the ground from (x0, z0) in the direction a. It stops before the track
  const groundRoot = (x0, z0, y0, a, L, r0) => { const pts = [new V3(x0, y0, z0)], ph = r(TAU), n = Math.max(3, Math.round(L / 2.2));
    for (let k = 1; k <= n; k++) { const d = k / n * L, w = Math.sin(d * 0.45 + ph) * 0.9 * (k / n), x = x0 + Math.cos(a) * d - Math.sin(a) * w, z = z0 + Math.sin(a) * d + Math.cos(a) * w;
      if (near(x, z).d < 4.3) break; const rr = lerp(r0, 0.2, k / n); pts.push(new V3(x, G(x, z) + (k === n ? -0.5 : rr * 0.25), z)); }
    if (pts.length >= 3) rootTube(pts, r0, lerp(r0, 0.2, (pts.length - 1) / n), 'root'); };
  const rootsAbout = (bx, bz, y0, R, n) => { const a0 = r(TAU); for (let k = 0; k < n; k++) { const a = a0 + k / n * TAU + r(-0.35, 0.35), up = r(0.5, 1.0), L = r(7, 14), r0 = r(0.7, 1.05); groundRoot(bx + Math.cos(a) * R * 0.6, bz + Math.sin(a) * R * 0.6, y0 + up * 2.2, a, L, r0); } };
  forestTrees.forEach(t => { const nb = near(t.x, t.z); if (nb.d > 30 || nb.i < iA - 12 || nb.i > iB + 12) return; const [bx, bz] = trunkAt(t, 0); rootsAbout(bx, bz, t.gy, t.R * 1.3, 5); });
  // an arch: two roots from (x0, z0) over the ground to the track at sample j, over it, and into the ground on the other side. Moss on top, rootlets hang from it
  const arch = (j, x0, z0, y0) => { const p = S[j], t = TG[j], A = M.arch, side = Math.sign((x0 - p.x) * -t.z + (z0 - p.z) * t.x) || 1, f = side * A.foot;
    const P3 = (lat, h, al = 0) => { const [x, z] = beside(j, lat, al); return new V3(x, G(x, z) + h, z); };
    for (const [al, rr, hh] of [[0, A.r, A.high], [0.95, A.r * 0.62, A.high - 0.3]]) { const pts = [], [fx, fz] = beside(j, f * 1.25, al), n0 = Math.max(2, Math.round(Math.hypot(fx - x0, fz - z0) / 2.5));
      for (let k = 0; k < n0; k++) { const u = k / n0, wob = Math.sin(u * Math.PI) * 0.7, x = lerp(x0, fx, u) + Math.sin(u * 5 + al * 3) * wob, z = lerp(z0, fz, u) + Math.cos(u * 4 + al) * wob; pts.push(new V3(x, k ? G(x, z) + rr * 0.3 : y0, z)); }
      pts.push(P3(f * 1.25, rr * 0.3, al), P3(f * 1.02, hh * 0.42, al), P3(f * 0.62, hh * 0.86, al), P3(0, hh, al * 0.6), P3(-f * 0.62, hh * 0.86, al * 0.3), P3(-f * 1.02, hh * 0.42, al * 0.2), P3(-f * 1.2, 0.1, al * 0.2), P3(-f * 1.7, -0.7, al * 0.4));
      rootTube(pts, rr * 1.35, rr * 0.8, 'root arch'); }
    for (let k = 0; k < 12; k++) { const lat = r(-4.2, 4.2), u = lat / A.foot, top = P3(lat, A.high * (1 - 0.52 * u * u) - A.r * 0.8, r(-0.2, 0.9)), L = r(0.5, 1.5), ph = r(), k2 = r();
      leaf.push({ g: bladeGeo([top, top.clone().add(new V3(r(-0.15, 0.15), -L * 0.55, r(-0.15, 0.15))), top.clone().add(new V3(r(-0.25, 0.25), -L, r(-0.25, 0.25)))], r(0.12, 0.2), 0.03, t, 1, ph), c: [lerp(0.22, 0.4, k2), lerp(0.36, 0.5, k2), lerp(0.1, 0.2, k2)] }); }
    for (const lat of [-2.2, 0, 2.3]) { const u = lat / A.foot, c = P3(lat, A.high * (1 - 0.52 * u * u) + A.r * 0.35, 0.2); moss.push({ g: moundGeo(r(0.8, 1.2), r(0.35, 0.5), r(30), 10), m: at(c.x, c.y, c.z, r(TAU)), c: [1.1, 1.1, 0.9] }); } };
  // the old stump: broken off, its top jagged, a moss cap on it
  const stump = (x, z, R, H) => { const gy = G(x, z), g = new THREE.CylinderGeometry(R * 0.82, R * 1.3, H + 1.2, 16, 4, true), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), top = p.getY(i) > (H + 1.2) / 2 - 0.01; p.setXYZ(i, p.getX(i) * (1 + 0.1 * Math.sin(a * 5 + 1)) + x, p.getY(i) + (H + 1.2) / 2 - 1.2 + gy + (top ? 0.9 * Math.sin(a * 3 + 2) * Math.sin(a * 7) : 0), p.getZ(i) * (1 + 0.1 * Math.sin(a * 4)) + z); uv.setY(i, uv.getY(i) * H); }
    g.computeVertexNormals(); bark.push({ g, c: [1, 1, 1] });
    { const cap = new THREE.CircleGeometry(R * 0.86, 16); cap.rotateX(-Math.PI / 2); cap.translate(x, gy + H - 0.75, z); bark.push({ g: cap, c: [0, 1, 0] }); }
    moss.push({ g: moundGeo(R * 0.8, 0.9, r(30), 12), m: at(x + 0.2, gy + H - 0.7, z - 0.1, r(TAU)), c: [1.1, 1.1, 0.9] }); fernParts(leaf, x - 0.3, gy + H - 0.3, z + 0.2, 2.6, r, 6);
    addStick(new V3(x, gy - 1, z), new V3(x, gy + H - 0.8, z), R * 1.08, 'stump'); rootsAbout(x, z, gy - 0.6, R * 1.6, 4); };
  for (const a of M.arches) { const j = near(a.at[0], a.at[1]).i; a.j = j;
    if (a.tree >= 0) { const t = forestTrees[a.tree], [bx, bz] = trunkAt(t, 0), d = Math.hypot(S[j].x - bx, S[j].z - bz); arch(j, bx + (S[j].x - bx) / d * t.R, bz + (S[j].z - bz) / d * t.R, t.gy + 1.4); }
    else { const [sx, sz] = beside(j, a.stump, 1.5); stump(sx, sz, 2.3, 4.6); const d = Math.hypot(S[j].x - sx, S[j].z - sz); arch(j, sx + (S[j].x - sx) / d * 2.4, sz + (S[j].z - sz) / d * 2.4, G(sx, sz) + 1.2); } }

  // ----- the hollow log: it lies along the track, open at both ends, sunk a little into the ground -----
  { const L = M.log, a2 = S[jLog - 6], b2 = S[jLog + 6], d2 = new V3(b2.x - a2.x, 0, b2.z - a2.z).normalize(), mid = new V3((a2.x + b2.x) / 2, 0, (a2.z + b2.z) / 2);
    const A = mid.clone().addScaledVector(d2, -L.len / 2), B = mid.clone().addScaledVector(d2, L.len / 2); A.y = G(A.x, A.z) + L.lift; B.y = G(B.x, B.z) + L.lift; L.a = A; L.b = B;
    const dir = B.clone().sub(A).normalize(), e1 = new V3(-dir.z, 0, dir.x).normalize(), e2 = new V3().crossVectors(e1, dir).normalize(); if (e2.y < 0) e2.multiplyScalar(-1);
    const nL = 16, nA = 24, Ro = L.r + L.wall, ring = (k, R, lump) => { const f = k / nL, c = A.clone().lerp(B, f), out = [];
      for (let i = 0; i <= nA; i++) { const a = i / nA * TAU, end = k === 0 ? -1 : k === nL ? 1 : 0, jut = end * (0.35 + 1.0 * Math.abs(Math.sin(a * 3 + 1.7) * Math.sin(a * 1.5 + 0.4))), rr = R * (1 + lump * (0.05 * Math.sin(a * 4 + f * 7) + 0.03 * Math.sin(f * 17 + a)));
        out.push(c.x + dir.x * jut + (e1.x * Math.cos(a) + e2.x * Math.sin(a)) * rr, c.y + dir.y * jut + (e1.y * Math.cos(a) + e2.y * Math.sin(a)) * rr, c.z + dir.z * jut + (e1.z * Math.cos(a) + e2.z * Math.sin(a)) * rr, i / nA, f * L.len); } return out; };
    // a skin from rings of points (x, y, z, u, v). flip turns its faces the other way
    const skin = (rings, flip) => { const pos = [], uv = [], idx = [], w = nA + 1; for (const rg of rings) for (let i = 0; i < rg.length; i += 5) { pos.push(rg[i], rg[i + 1], rg[i + 2]); uv.push(rg[i + 3], rg[i + 4]); }
      for (let k = 0; k + 1 < rings.length; k++) for (let i = 0; i < nA; i++) { const a = k * w + i, b = a + w; if (flip) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
    const outer = [], inner = []; for (let k = 0; k <= nL; k++) { outer.push(ring(k, Ro, 1)); inner.push(ring(k, L.r, 0.6)); }
    // which way do the faces look? Take the first face of the outer skin and turn the skins so the outer one looks out and the inner one looks in
    const test = skin(outer, false), nrm = test.attributes.normal, px = test.attributes.position, c0 = A, outward = (px.getX(0) - c0.x) * nrm.getX(0) + (px.getY(0) - c0.y) * nrm.getY(0) + (px.getZ(0) - c0.z) * nrm.getZ(0) > 0;
    bark.push({ g: skin(outer, !outward), c: [1, 1, 1] }, { g: skin(inner, outward), c: [0, 0.62, 0] }, { g: skin([outer[0], inner[0]], outward), c: [0, 1, 0] }, { g: skin([outer[nL], inner[nL]], !outward), c: [0, 1, 0] });
    addPipe(A, B, L.r, L.r, L.wall, 'hollow log');
    const onLog = (f, ang, lift = 0) => A.clone().lerp(B, f).addScaledVector(e1, Math.sin(ang) * (Ro + lift)).addScaledVector(e2, Math.cos(ang) * (Ro + lift));
    for (let k = 0; k < 16; k++) { const f = r(0.05, 0.95), ang = r(-0.75, 0.75), c = onLog(f, ang, -0.1), out = e1.clone().multiplyScalar(Math.sin(ang)).addScaledVector(e2, Math.cos(ang)); moss.push({ g: moundGeo(r(0.9, 1.6), r(0.3, 0.6), r(30), 10), m: along(c, out, 1, r(TAU)), c: [r(0.85, 1.2), 1.1, 0.9] }); }
    for (const f of [-0.04, 1.04]) for (let k = 0; k < 9; k++) { const ang = r(-1.1, 1.1), top = onLog(f + r(-0.03, 0.03), ang, -L.wall * 0.5), Ls = r(0.5, 1.3), ph = r(), k2 = r();
      leaf.push({ g: bladeGeo([top, top.clone().add(new V3(r(-0.1, 0.1), -Ls * 0.55, r(-0.1, 0.1))), top.clone().add(new V3(r(-0.2, 0.2), -Ls, r(-0.2, 0.2)))], r(0.14, 0.22), 0.03, e1, 1, ph), c: [lerp(0.22, 0.4, k2), lerp(0.38, 0.52, k2), lerp(0.1, 0.2, k2)] }); }
    for (const [f, lat, size] of [[-0.08, 4.3, 4.6], [-0.1, -4.5, 5.2], [1.08, 4.4, 5.0], [1.1, -4.2, 4.4], [0.3, 4.6, 3.6], [0.7, -4.7, 3.8]]) { const c = A.clone().lerp(B, f).addScaledVector(e1, lat); fernParts(leaf, c.x, G(c.x, c.z) + 0.1, c.z, size, r, 8); } }

  addParts(moss, mossM, 'none'); addParts(stone, stoneM); addParts(leaf, leafM); addParts(root, rootM); addParts(bark, barkM);
  window.__mossway = { MOSSWAY };
}); }
