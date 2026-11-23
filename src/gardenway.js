// Honeylight: the garden leg of the long run: a tipped clay pot to fly through, a row of bean canes to fly along, and seed trays to fly between.
// The pieces stand at fixed spots (the numbers below). longrun.js leads the track through them with gardenWay(). They are solid (solids.js).
import * as THREE from '../three.module.min.js';
import { V3, Q4, lerp, TAU } from './core.js';
import { terrainH } from './world.js';
import { groundMeshH } from './places.js';
import { seeded, quietBuild, clearDisc, clearBar, clayM, woodM, caneM, leafM, earthM, addParts, at, along, lumpTube, moundGeo, rodGeo, leafletGeo } from './runkit.js';
import { addStick, addBlock, addPipe } from './solids.js';

// ---------- the numbers ----------
export const GARDENWAY = {
  pot: { x: 104, z: -211, dx: -0.671, dz: -0.741, len: 10, r0: 4.4, r1: 3.1, wall: 0.45 },   // r0: the hole at the mouth, r1: at the broken bottom
  beans: { ax: 89.5, az: -230, bx: 82, bz: -254, half: 4.6, top: 9.2, every: 4.4 },          // a row of crossed canes: half = how far each foot is from the middle
  trays: { ax: 24, az: -253, bx: 4, bz: -263, lane: 3.1, len: 10.2, wide: 8, high: 1.7 },    // lane = from the track to a tray's near side
};
const G = GARDENWAY;
// the track's control points through the garden pieces, in order (x, z)
export function gardenWay() { const p = G.pot, b = G.beans, t = G.trays, mid = (o) => [(o.ax + o.bx) / 2, (o.az + o.bz) / 2];
  return [[p.x - p.dx * 7, p.z - p.dz * 7], [p.x + p.dx * 7, p.z + p.dz * 7], [b.ax, b.az], mid(b), [b.bx, b.bz], [76, -262], [62, -264], [48, -260], [t.ax, t.az], mid(t), [t.bx, t.bz]]; }

// no grass where the pieces stand (the lists are read when the track's grass walls are made, before the pieces are built)
{ const p = G.pot, b = G.beans, t = G.trays;
  clearBar(p.x - p.dx * 6, p.z - p.dz * 6, p.x + p.dx * 8, p.z + p.dz * 8, 5.6, 1.5);
  clearBar(b.ax, b.az, b.bx, b.bz, b.half + 1.8, 1.8);
  const L = Math.hypot(t.bx - t.ax, t.bz - t.az), dx = (t.bx - t.ax) / L, dz = (t.bz - t.az) / L; for (const s of [-1, 1]) { const o = (t.lane + t.wide / 2) * s; clearBar(t.ax - dz * o, t.az + dx * o, t.bx - dz * o, t.bz + dx * o, t.wide / 2 + 0.6, 1.4); } }

export function setupGardenWay() { quietBuild(61303, () => {
  const r = seeded(2207), up = new V3(0, 1, 0), clay = [], wood = [], cane = [], leaf = [], earth = [], leaflet = leafletGeo();
  const green = () => { const k = r(); return [lerp(0.13, 0.30, k), lerp(0.38, 0.56, k), lerp(0.06, 0.13, k)]; };

  // ----- the tipped pot: it lies on its side, its bottom broken out, so the wide mouth leads to a smaller way out -----
  { const p = G.pot, L = p.len, a = new V3(p.x - p.dx * L / 2, 0, p.z - p.dz * L / 2), b = new V3(p.x + p.dx * L / 2, 0, p.z + p.dz * L / 2);
    a.y = terrainH(a.x, a.z) + p.r0 - 0.05; b.y = terrainH(b.x, b.z) + p.r1 + 0.15; // the hole's floor is at the ground at both ends
    const prof = [[p.r0, 0], [p.r0 + 0.75, 0], [p.r0 + 0.75, 1.1], [p.r0 + 0.5, 1.25], [p.r1 + p.wall, L], [p.r1, L], [p.r0, 0]].map(q => new THREE.Vector2(q[0], q[1]));
    const g = new THREE.LatheGeometry(prof, 32), q = g.attributes.position;
    for (let i = 0; i < q.count; i++) if (q.getY(i) > L - 0.01) { const an = Math.atan2(q.getZ(i), q.getX(i)); q.setY(i, L - 0.55 - 0.5 * Math.sin(an * 5 + 1) - 0.3 * Math.sin(an * 11 + 2) - 0.25 * Math.sin(an * 2)); } // the broken edge
    g.computeVertexNormals();
    const quat = new Q4().setFromUnitVectors(up, b.clone().sub(a).normalize()); clay.push({ g, m: new THREE.Matrix4().compose(a, quat, new V3(1, 1, 1)) });
    addPipe(a, b, p.r0, p.r1, p.wall, 'pot'); p.a = a; p.b = b;
    // shards of the bottom lie past the way out, off the track
    for (const [al, lat, yaw, roll] of [[7.5, 5.2, 0.4, 0.2], [9.5, -4.8, 2.1, -0.3], [6.2, -6.4, 4.0, 0.25]]) { const x = p.x + p.dx * al - p.dz * lat, z = p.z + p.dz * al + p.dx * lat;
      const sg = new THREE.LatheGeometry([new THREE.Vector2(2.9, 0), new THREE.Vector2(3.1, 1.7), new THREE.Vector2(2.75, 1.75), new THREE.Vector2(2.6, 0.05)], 6, 0, 0.75); sg.translate(-2.6, 0, -1.0);
      clay.push({ g: sg, m: at(x, terrainH(x, z) + 0.25, z, yaw, 1, 1, 1, Math.PI / 2 - 0.25, roll) }); }
    // old earth lies along the pot's floor (it also hides the worn track there)
    { const y0 = terrainH(p.x, p.z); earth.push({ g: moundGeo(1, 1, 5.2, 16), m: at(p.x, y0 + 0.02, p.z, Math.atan2(-p.dz, p.dx), L * 0.62, 0.5, 2.5) }); }
    // a little earth that spilled out at the mouth, to one side
    { const x = a.x - p.dx * 1.5 - p.dz * 3.4, z = a.z - p.dz * 1.5 + p.dx * 3.4; earth.push({ g: moundGeo(2.0, 0.8, 3.1), m: at(x, terrainH(x, z), z) }); } }

  // ----- the bean row: crossed canes in a row, with bean vines up them. The bee flies along under the crossings -----
  { const b = G.beans, L = Math.hypot(b.bx - b.ax, b.bz - b.az), dx = (b.bx - b.ax) / L, dz = (b.bz - b.az) / L, K = Math.round(L / b.every) + 1, sp = L / (K - 1), ridge = [], dir = new V3(dx, 0, dz), side = new V3(-dz, 0, dx);
    for (let k = 0; k < K; k++) { const px = b.ax + dx * sp * k, pz = b.az + dz * sp * k, gy = terrainH(px, pz), X = new V3(px, gy + b.top, pz);
      ridge.push(new V3(px, gy + b.top + 0.3, pz));
      cane.push({ g: new THREE.SphereGeometry(0.42, 8, 6), m: at(X.x, X.y + 0.05, X.z, r(TAU), 1, 0.8, 1), c: [0.62, 0.5, 0.3] }); // the twine at the crossing
      for (const s of [-1, 1]) { const o = 0.22 * s, foot = new V3(px + side.x * b.half * s + dx * o, 0, pz + side.z * b.half * s + dz * o); foot.y = terrainH(foot.x, foot.z) - 0.3;
        const cross = X.clone().addScaledVector(dir, o), tip = cross.clone().addScaledVector(cross.clone().sub(foot), 0.13);
        cane.push({ g: rodGeo(foot, tip, 0.21, 0.16) }); addStick(foot, tip, 0.24, 'bean cane');
        // the vine winds up the cane; leaves in threes stand out from it, away from the middle of the row
        const ax = tip.clone().sub(foot), len = ax.length(), u = ax.clone().normalize(), w1 = new V3().crossVectors(u, dir).normalize(), w2 = new V3().crossVectors(u, w1), pts = [], top = len * r(0.8, 0.95), ph = r(TAU);
        for (let d = 0.3; d < top; d += 0.55) pts.push(foot.clone().addScaledVector(u, d).addScaledVector(w1, Math.cos(d * 1.9 + ph) * 0.3).addScaledVector(w2, Math.sin(d * 1.9 + ph) * 0.3));
        leaf.push({ g: lumpTube(pts, 0.085, 0.045, r(9), 5, 0.03), c: [0.17, 0.36, 0.08], uv: [0, 0] });
        const out = side.clone().multiplyScalar(s);
        for (let d = 1.2; d < top; d += r(0.75, 1.15)) { const base = foot.clone().addScaledVector(u, d), pd = out.clone().multiplyScalar(r(0.5, 1)).addScaledVector(dir, r(-0.8, 0.8)).addScaledVector(up, r(0.1, 0.7)).normalize(), end = base.clone().addScaledVector(pd, r(0.7, 1.3)), ph2 = r();
          leaf.push({ g: rodGeo(base, end, 0.035, 0.025, 4), c: [0.2, 0.4, 0.1], uv: [0.25, ph2] });
          const col = green(), sz = r(1.2, 1.9); for (const t of [-1, 0, 1]) { const ld = pd.clone().multiplyScalar(0.7).addScaledVector(new V3().crossVectors(pd, up).normalize(), t * 0.75).addScaledVector(up, -0.35 + (t === 0 ? 0.1 : 0)).normalize();
            leaf.push({ g: leaflet, m: along(end, ld, sz * (t === 0 ? 1.1 : 0.9), r(-0.5, 0.5), sz * 0.95), c: col, uv: [0.6, ph2] }); }
          // scarlet flowers high up, pods lower down
          if (d > top * 0.55 && r() < 0.45) { const fp = base.clone().addScaledVector(pd, 0.5).addScaledVector(up, 0.3); for (let j = 0; j < 4; j++) leaf.push({ g: leaflet, m: along(fp.clone().add(new V3(r(-0.25, 0.25), j * 0.22, r(-0.25, 0.25))), new V3(r(-1, 1), r(0.2, 1), r(-1, 1)), 0.42, r(TAU), 0.5), c: [0.95, 0.10, 0.06], uv: [0.5, ph2] }); }
          else if (d < top * 0.7 && r() < 0.4) { const pp = base.clone().addScaledVector(pd, 0.45), L2 = r(1.4, 2.2); leaf.push({ g: lumpTube([pp, pp.clone().add(new V3(pd.x * 0.2, -L2 * 0.5, pd.z * 0.2)), pp.clone().add(new V3(pd.x * 0.1, -L2, pd.z * 0.1))], 0.12, 0.045, r(9), 5, 0.12), c: [0.24, 0.50, 0.11], uv: [0.45, ph2] }); } } } }
    const rg = lumpTube([ridge[0].clone().addScaledVector(dir, -1.4), ...ridge, ridge[K - 1].clone().addScaledVector(dir, 1.4)], 0.2, 0.17, 3, 6, 0.02); cane.push({ g: rg });
    for (let k = 0; k < K - 1; k++) addStick(ridge[k], ridge[k + 1], 0.24, 'bean ridge');
    // the bed: dug earth under the row
    { const W = b.half + 1.5, pos = [], idx = [], n0 = Math.ceil((L + 6) / 2), cols = 6; for (let i = 0; i <= n0; i++) { const d = -3 + i * (L + 6) / n0; for (let j = 0; j <= cols; j++) { const lat = lerp(-W, W, j / cols) * (1 + 0.06 * Math.sin(i * 1.7 + j)), x = b.ax + dx * d - dz * lat, z = b.az + dz * d + dx * lat;
        pos.push(x, Math.max(groundMeshH(x, z), terrainH(x, z)) + (j === 0 || j === cols || i === 0 || i === n0 ? -0.1 : 0.14 + 0.1 * Math.sin(lat * 2.2)), z); } }
      for (let i = 0; i < n0; i++) for (let j = 0; j < cols; j++) { const p0 = i * (cols + 1) + j, p1 = p0 + cols + 1; idx.push(p0, p0 + 1, p1, p0 + 1, p1 + 1, p1); }
      const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setIndex(idx); bg.computeVertexNormals(); earth.push({ g: bg }); } }

  // ----- the seed trays: two on each side of the track, with rows of seedlings. The bee flies the lane between them -----
  { const t = G.trays, L = Math.hypot(t.bx - t.ax, t.bz - t.az), dx = (t.bx - t.ax) / L, dz = (t.bz - t.az) / L, yaw0 = Math.atan2(-dz, dx), h = t.high; t.list = [];
    for (const [al, s] of [[L * 0.25, -1], [L * 0.75, -1], [L * 0.27, 1], [L * 0.77, 1]]) { const lat = (t.lane + t.wide / 2 + r(0, 0.3)) * s, x = t.ax + dx * al - dz * lat, z = t.az + dz * al + dx * lat, yaw = yaw0 + r(-0.05, 0.05) * (s > 0 ? 1 : 0.4), y = terrainH(x, z) - 0.25;
      const M = at(x, y, z, yaw), put = (g, list, c, uv) => list.push({ g, m: M, c, uv }), TL = t.len, TW = t.wide;
      for (const sz of [-1, 1]) { const g = new THREE.BoxGeometry(TL, h, 0.45); g.translate(0, h / 2, sz * (TW / 2 - 0.22)); put(g, wood, [1, 1, 1]); }
      for (const sx of [-1, 1]) { const g = new THREE.BoxGeometry(0.45, h, TW - 0.9); g.translate(sx * (TL / 2 - 0.22), h / 2, 0); put(g, wood, [0.93, 0.93, 0.93]); }
      { const g = new THREE.BoxGeometry(TL - 0.9, 0.3, TW - 0.9, 6, 1, 4), q = g.attributes.position; for (let i = 0; i < q.count; i++) if (q.getY(i) > 0) q.setY(i, 0.15 + 0.1 * Math.sin(q.getX(i) * 2.3 + q.getZ(i) * 1.7)); g.translate(0, h - 0.55, 0); g.computeVertexNormals(); put(g, earth, [1, 1, 1]); }
      // seedlings in rows: a thin stem and two seed leaves; some have grown their first true leaves
      for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { if (r() < 0.12) continue; const lx = -TL / 2 + 1.2 + i * (TL - 2.4) / 5 + r(-0.15, 0.15), lz = -TW / 2 + 1.3 + j * (TW - 2.6) / 3 + r(-0.15, 0.15), sh = r(1.5, 3.1), lean = new V3(r(-0.2, 0.2), 1, r(-0.2, 0.2)).normalize(), ph = r();
        const b0 = new V3(lx, h - 0.45, lz), b1 = b0.clone().addScaledVector(lean, sh), col = green();
        put(rodGeo(b0, b1, 0.07, 0.05, 4), leaf, [0.55, 0.62, 0.3], [0.2, ph]);
        const a0 = r(TAU); for (const k of [0, 1]) { const an = a0 + k * Math.PI, d = new V3(Math.cos(an), 0.25, Math.sin(an)); put(leaflet.clone().applyMatrix4(along(b1, d, r(0.95, 1.4), 0, 0.85)), leaf, col, [0.6, ph]); }
        if (sh > 2.2) for (const k of [0, 1]) { const an = a0 + Math.PI / 2 + k * Math.PI, d = new V3(Math.cos(an), 0.8, Math.sin(an)); put(leaflet.clone().applyMatrix4(along(b1.clone().add(new V3(0, 0.1, 0)), d, r(0.8, 1.2), 0, 0.75)), leaf, [col[0] * 0.8, col[1] * 0.9, col[2] * 0.8], [0.7, ph]); } }
      // a plant label, stuck in at a corner
      { const g = new THREE.BoxGeometry(0.55, 2.1, 0.08); g.translate(0, 1.05, 0); g.rotateZ(r(-0.15, 0.15)); g.rotateY(r(TAU)); g.translate(-TL / 2 + 1.0, h - 0.6, s * (TW / 2 - 1.0)); put(g, wood, [1.5, 1.45, 1.3]); }
      addBlock(new V3(x, y + h / 2, z), new Q4().setFromAxisAngle(up, yaw), [TL / 2, h / 2, TW / 2], 'seed tray'); t.list.push({ x, z, y, yaw }); } }

  addParts(clay, clayM); addParts(wood, woodM); addParts(cane, caneM); addParts(earth, earthM); addParts(leaf, leafM);
  window.__gardenway = { GARDENWAY };
}); }
