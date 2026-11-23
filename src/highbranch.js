// Honeylight: the high branch of the long run: a second way through the forest. Up a fallen trunk, along big mossy boughs under the crowns, and a glide back down.
// It leaves the track before the forest and joins it again after it. A run that keeps to it for nearly its whole length has gone "by the high branch" (longrun.js).
// It is the riskier way: the wood is narrow, there is no ground under it, and a bee that drops off it is off the track until it is back on one of the two ways.
// The trunk and the boughs are solid (solids.js). Twigs, leaves, ferns, moss and lichen are not.
import * as THREE from '../three.module.min.js';
import { V3, lerp, clamp, TAU } from './core.js';
import { terrainH, forestTrees } from './world.js';
import { seeded, quietBuild, clearBar, mossM, leafM, barkM, addParts, at, along, lumpTube, moundGeo, bladeGeo, leafletGeo, fernParts } from './runkit.js';
import { addStick } from './solids.js';

// ---------- the numbers ----------
export const HIGHK = { under: 1.6, need: 0.85, lift: 1.0 }; // how far under the wood still counts as on it; how much of it a run must keep to; from what height over the ground it counts as "up"
export const HIGH = {
  leave: [-213, 235.9], join: [1.9, 202.1],                 // where it leaves the track and where it is back on it
  // the way (x, z, height of the wood under the bee): the fallen trunk (the first "trunk" points), the boughs (to "bough"), then the glide down over the track
  way: [[-200.5, 246, -10.7], [-187, 253.5, -4.9], [-173.5, 261, 0.85], [-160, 268.5, 6.6], [-150, 270.3, 7.4], [-140, 268, 7.8], [-130, 262.5, 8.0], [-121, 256.6, 8.2], [-112.5, 253, 8.3], [-102, 251.3, 8.4], [-90.5, 252.3, 8.3], [-78, 250.2, 8.0], [-66, 247.3, 7.6], [-56.5, 243, 7.0],
    [-48, 238, 6.0], [-37.5, 230.3, 2.6], [-27.5, 222.8, -2.4], [-15.3, 215.1, -8.2], [-3.9, 206.4, -13.2]],
  trunk: 4, bough: 15,
  limb: { from: -161.5, to: -130, off: 0.3 },                // the fallen tree's own big dead limb goes on from its top along the way
  prop: { tree: 6, at: -162 },                               // a long low limb of this forest tree holds the fallen trunk up, under this spot (x) of the way
  // the boughs: the tree each grows from (its place in forestTrees), where it comes up to the way and where its tip is (x along the way), and which side of the middle it lies on
  boughs: [{ tree: 11, from: -115.5, to: -133, off: -0.4 }, { tree: 11, from: -113, to: -99, off: -0.3 }, { tree: 7, from: -93.5, to: -103, off: 0.4 }, { tree: 7, from: -91.5, to: -73, off: -0.35 },
    { tree: 12, from: -62.5, to: -77, off: 0.4 }, { tree: 12, from: -61, to: -43, off: -0.3 }],
  S: [], T: [], lift: [], N: 0, i0: 0, i1: 0, upN: 0, box: [0, 0, 0, 0],
};
const H = HIGH;
// the tall grass stands back from the foot of the fallen trunk
{ const w = H.way; clearBar(H.leave[0] - 9, H.leave[1] - 3, w[0][0], w[0][1], 6.5, 3.5); clearBar(w[0][0], w[0][1], w[1][0], w[1][1], 6, 3.5); clearBar(w[1][0], w[1][1], (w[1][0] + w[2][0]) / 2, (w[1][1] + w[2][1]) / 2, 4.5, 3); }

// lay the way from the track's samples S (called by longrun.js when the track is built): samples 1.2 apart, like the track's own
export function layHigh(S) {
  const near = (x, z) => { let bi = 0, bd = 1e9; S.forEach((p, i) => { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; bi = i; } }); return bi; };
  H.i0 = near(H.leave[0], H.leave[1]); H.i1 = near(H.join[0], H.join[1]);
  const onG = i => new V3(S[i].x, terrainH(S[i].x, S[i].z), S[i].z), CP = [onG(H.i0 - 4), onG(H.i0), ...H.way.map(p => new V3(p[0], p[2], p[1])), onG(H.i1), onG(H.i1 + 4)];
  const c = new THREE.CatmullRomCurve3(CP, false, 'centripetal'); c.arcLengthDivisions = 4000; const pts = c.getSpacedPoints(Math.ceil(c.getLength() / 1.2));
  const cut = (q, a, b) => { let bi = a, bd = 1e9; for (let i = a; i < b; i++) { const d = pts[i].distanceTo(q); if (d < bd) { bd = d; bi = i; } } return bi; };
  H.S = pts.slice(cut(CP[1], 0, pts.length >> 1), cut(CP[CP.length - 2], pts.length >> 1, pts.length) + 1); H.N = H.S.length;
  H.T = H.S.map((p, i) => { const u = H.S[Math.max(0, i - 1)], w = H.S[Math.min(H.N - 1, i + 1)]; return new V3(w.x - u.x, 0, w.z - u.z).normalize(); });
  H.lift = H.S.map(p => p.y - terrainH(p.x, p.z)); H.upN = H.lift.filter(l => l > HIGHK.lift).length;
  H.box = [Math.min(...H.S.map(p => p.x)) - 6, Math.max(...H.S.map(p => p.x)) + 6, Math.min(...H.S.map(p => p.z)) - 6, Math.max(...H.S.map(p => p.z)) + 6];
}
// the nearest spot of the way to (x, z): { j: its sample, lat: how far to the side, top: the height of the wood there }. null when far from the whole way
const _hn = { j: -1, lat: 0, top: 0 };
export function highNear(x, z) { const S = H.S; if (!H.N || x < H.box[0] || x > H.box[1] || z < H.box[2] || z > H.box[3]) return null; let bi = -1, bd = 1e9;
  for (let i = 0; i < H.N; i++) { const p = S[i], d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z); if (d < bd) { bd = d; bi = i; } }
  let best = 1e9, top = S[bi].y; for (let a = Math.max(0, bi - 1); a < Math.min(H.N - 1, bi + 1); a++) { const p = S[a], q = S[a + 1], dx = q.x - p.x, dz = q.z - p.z, t = clamp(((x - p.x) * dx + (z - p.z) * dz) / (dx * dx + dz * dz || 1), 0, 1), d = Math.hypot(p.x + dx * t - x, p.z + dz * t - z); if (d < best) { best = d; top = lerp(p.y, q.y, t); } }
  _hn.j = bi; _hn.lat = best; _hn.top = top; return _hn; }

export function setupHighBranch() { quietBuild(48211, () => {
  const r = seeded(7741), S = H.S, bark = [], moss = [], leaf = [], UPV = new V3(0, 1, 0);
  const jx = x => { let bi = 0, bd = 1e9; for (let i = 0; i < H.N; i++) { const d = Math.abs(S[i].x - x); if (d < bd) { bd = d; bi = i; } } return bi; }; // the sample of the way at this x (the way runs from west to east)
  const sideOf = j => new V3(-H.T[j].z, 0, H.T[j].x);
  const trunkAt = (t, y) => { const h = y - t.gy; return new V3(t.x + Math.sin(h * 0.11 + t.x) * 0.7, y, t.z + Math.cos(h * 0.09 + t.z) * 0.6); }; // a forest trunk leans a little (places.js)
  const limbs = []; // every limb's run along the way: { ja, jb, off, r0, r1 } for the moss, ferns and twigs on it
  // a limb whose top lies along the way from sample ja to jb (jb may be before ja), "off" to the side. pre: points before it (from a trunk or out of the ground). It is r0 thick at its start and r1 at its tip
  const limb = (pre, ja, jb, off, r0, r1, tag) => { const pts = pre.map(p => p.clone()), nS = Math.max(2, Math.round(Math.abs(jb - ja) / 4)), js = [];
    for (let k = 0; k <= nS; k++) { const j = Math.round(lerp(ja, jb, k / nS)), p = S[j], sd = sideOf(j); js.push(j); pts.push(new V3(p.x + sd.x * off, p.y, p.z + sd.z * off)); }
    const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + pts[k].distanceTo(pts[k - 1])); const rad = k => lerp(r0, r1, cum[k] / cum[cum.length - 1]);
    for (let k = pre.length; k < pts.length; k++) pts[k].y -= rad(k) * 1.07; // the top of the wood is the way
    bark.push({ g: lumpTube(pts, r0, r1, r(9), 10, 0.06, true), c: [1, 1, 1] }); { const e = pts[pts.length - 1], g = new THREE.SphereGeometry(r1 * 1.04, 8, 6); g.translate(e.x, e.y, e.z); bark.push({ g, c: [1, 1, 1] }); }
    for (let k = 0; k + 1 < pts.length; k++) addStick(pts[k], pts[k + 1], Math.max(rad(k), rad(k + 1)), tag);
    limbs.push({ ja, jb, off, r0: rad(pre.length), r1 }); return pts; };

  // ----- the fallen trunk: its foot sunk in the forest floor beside the track, its top caught in the first tree -----
  { const w = H.way, j0 = jx(w[0][0]), j1 = jx(w[H.trunk - 1][0]), a = S[j0], b = S[j0 + 4], back = new V3(a.x - b.x, a.y - b.y, a.z - b.z).normalize();
    const foot = a.clone().addScaledVector(back, 6.5); foot.y = terrainH(foot.x, foot.z) - 2.2; const p1 = a.clone().addScaledVector(back, 3); p1.y = a.y - 1.55 * 1.07 - 0.6;
    limb([foot, p1], j0, j1, 0, 1.6, 0.9, 'fallen trunk'); H.trunkJ = [j0, j1];
    // moss, earth and ferns heaped over its foot, and broken side branches along it
    for (let k = 0; k < 9; k++) { const x = a.x + back.x * r(0, 5) + r(-2.6, 2.6), z = a.z + back.z * r(0, 5) + r(-2.6, 2.6); moss.push({ g: moundGeo(r(1.4, 2.6), r(0.5, 1.3), r(30), 10), m: at(x, terrainH(x, z) - 0.05, z, r(TAU)), c: [r(0.8, 1.2), 1.05, 0.9] }); }
    for (let k = 0; k < 7; k++) { const sd = k % 2 ? 1 : -1, s = sideOf(j0), x = a.x + back.x * r(-3, 4) + s.x * sd * r(2.4, 4.2), z = a.z + back.z * r(-3, 4) + s.z * sd * r(2.4, 4.2); fernParts(leaf, x, terrainH(x, z) + 0.1, z, r(2.6, 4.6), r, 7); }
    for (let k = 0; k < 6; k++) { const j = Math.round(lerp(j0 + 5, j1 - 4, (k + r(0.2, 0.8)) / 6)), p = S[j], s = sideOf(j), sd = k % 2 ? 1 : -1, L = r(1.8, 3.6), base = new V3(p.x + s.x * sd * 1.0, p.y - 1.5, p.z + s.z * sd * 1.0);
      const tip = base.clone().add(new V3(s.x * sd * L, r(-1.6, 0.2), s.z * sd * L)).addScaledVector(H.T[j], r(-0.8, 1.6)); bark.push({ g: lumpTube([base, base.clone().lerp(tip, 0.55).add(new V3(0, 0.3, 0)), tip], 0.36, 0.16, r(9), 6, 0.08, true), c: [0.7, 0.9, 1] }); }
    // the first tree holds it up on a short thick limb
    limb([], jx(H.limb.from), jx(H.limb.to), H.limb.off, 0.95, 0.42, 'fallen trunk');
    // a forest tree holds it up on a long low limb
    const t = forestTrees[H.prop.tree], jS = jx(H.prop.at), u = S[jS], root = trunkAt(t, u.y - 5.5), under = new V3(u.x, u.y - 3.0, u.z), d = under.clone().sub(root).setY(0).normalize(), past = under.clone().addScaledVector(d, 3).add(new V3(0, 1.6, 0));
    const pts = [root, root.clone().lerp(under, 0.33).add(new V3(0, 0.9, 0)), root.clone().lerp(under, 0.68).add(new V3(0, 0.8, 0)), under, past]; bark.push({ g: lumpTube(pts, 1.05, 0.5, r(9), 8, 0.07, true), c: [1, 1, 1] }); for (let k = 0; k < 4; k++) addStick(pts[k], pts[k + 1], 0.95 - k * 0.11, 'bough'); }

  // ----- the boughs: big limbs of the forest trees that reach to the way and run along it -----
  for (const b of H.boughs) { const t = forestTrees[b.tree], ja = jx(b.from), jb = jx(b.to), p = S[ja], root = trunkAt(t, p.y - 3.2), mid = root.clone().lerp(p, 0.62); mid.y = p.y - 1.9; const tip = Math.abs(b.to - b.from) > 14 ? 0.4 : 0.46;
    limb([root, mid], ja, jb, b.off, 1.1, tip, 'bough'); }

  // ----- on the wood: moss cushions, small ferns, hanging lichen -----
  for (const L of limbs) { const n = Math.abs(L.jb - L.ja), dir = Math.sign(L.jb - L.ja) || 1;
    for (let k = 0; k <= n; k++) { const j = L.ja + dir * k, p = S[j], s = sideOf(j), rr = lerp(L.r0, L.r1, k / Math.max(1, n)), on = (lat, dy) => new V3(p.x + s.x * (L.off + lat) + H.T[j].x * r(-0.5, 0.5), p.y + dy, p.z + s.z * (L.off + lat) + H.T[j].z * r(-0.5, 0.5));
      if (r() < 0.55) { const lat = r(-0.55, 0.55) * rr, c = on(lat, -0.1 - 0.22 * Math.abs(lat)); moss.push({ g: moundGeo(r(0.55, 1.0) * Math.max(0.6, rr), r(0.2, 0.36), r(30), 8), m: at(c.x, c.y, c.z, r(TAU)), c: [r(0.8, 1.25), 1.08, 0.9] }); }
      if (r() < 0.1) { const sd = r() < 0.5 ? -1 : 1, c = on(sd * rr * 0.95, -0.7 * rr); fernParts(leaf, c.x, c.y, c.z, r(1.1, 1.9), r, 6); }
      if (r() < 0.5) { const sd = r() < 0.5 ? -1 : 1, top = on(sd * rr * r(0.5, 0.95), -rr * r(1.2, 1.8)), Ls = r(0.7, 2.8), ph = r(), k2 = r(), col = r() < 0.5 ? [lerp(0.36, 0.5, k2), lerp(0.46, 0.58, k2), lerp(0.30, 0.4, k2)] : [lerp(0.2, 0.36, k2), lerp(0.38, 0.52, k2), lerp(0.1, 0.18, k2)];
        leaf.push({ g: bladeGeo([top, top.clone().add(new V3(r(-0.15, 0.15), -Ls * 0.5, r(-0.15, 0.15))), top.clone().add(new V3(r(-0.3, 0.3), -Ls, r(-0.3, 0.3)))], r(0.12, 0.24), 0.03, s, 1, ph), c: col }); } } }

  // ----- twigs with leaves: beside the way, and at some spots from both sides over it, so the bee flies through a window of leaves -----
  const leaflet = leafletGeo();
  const spray = (pts, n, size) => { const c = new THREE.CatmullRomCurve3(pts); bark.push({ g: lumpTube(pts, 0.13, 0.03, r(9), 5, 0.04, true), c: [0.3, 1, 1] });
    for (let k = 0; k < n; k++) { const f = r(0.3, 1), p = c.getPoint(f), tg = c.getTangent(f), out = new V3(r(-1, 1), r(-0.9, 0.5), r(-1, 1)).addScaledVector(tg, 0.6).normalize(), s = size * r(0.75, 1.3), k2 = r();
      leaf.push({ g: leaflet, m: along(p, out, s, r(TAU), s * r(0.5, 0.7)), c: [lerp(0.16, 0.36, k2), lerp(0.42, 0.62, k2), lerp(0.06, 0.14, k2)], uv: [r(0.5, 1), r()] }); } };
  { const j0 = H.trunkJ[0] + 14, j1 = jx(H.way[H.bough - 1][0]); let n = 0;
    for (let j = j0; j < j1; j += Math.round(r(4, 7))) { const p = S[j], s = sideOf(j), T = H.T[j], over = n % 4 === 2; n++;
      { const sd = n % 2 ? 1 : -1, base = new V3(p.x + s.x * sd * 0.9, p.y - 0.8, p.z + s.z * sd * 0.9), al = r(-1.5, 1.5) + (over ? 2.5 : 0), P3 = (lat, up, a2) => new V3(p.x + s.x * sd * lat + T.x * a2, p.y + up, p.z + s.z * sd * lat + T.z * a2);
        if (over) spray([base, P3(3.4, 1.6, al * 0.3), P3(4.4, 3.9, al * 0.6), P3(3.0, 5.6, al * 0.85), P3(0.4, 6.3, al), P3(-2.2, 5.6, al * 1.2), P3(-3.8, 4.3, al * 1.3)], 46, 1.2);
        else spray([base, P3(2.6, 0.6, al * 0.4), P3(4.6, 2.2 + r(-1, 1.2), al * 0.8), P3(6.4, 3.4 + r(-1.4, 1.6), al * 1.2)], 22, 1.2); } } }

  addParts(bark, barkM); addParts(moss, mossM, 'none'); addParts(leaf, leafM);
  window.__high = { HIGH, HIGHK, highNear };
}); }
