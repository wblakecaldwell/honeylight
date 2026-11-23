// Honeylight: plain solid shapes for the long run's places (sticks, balls, stones, blocks and pipes), and the one test that keeps the bee out of them.
// A place adds its shapes one time, when it is built. collide() in player.js calls solidsCollide for the bee, the camera and the tests.
import { V3, clamp, lerp } from './core.js';

export const SOLIDS = []; // world space; every shape has x, z and reach for a fast "far away" test

const _a = new V3(), _b = new V3(), _n = new V3();
const keep = s => { SOLIDS.push(s); return s; };

// a stick: a round bar from a to b (a root, a cane, a reed)
export function addStick(a, b, r, tag = '') { return keep({ kind: 'stick', a: a.clone(), b: b.clone(), r, tag, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, reach: a.distanceTo(b) / 2 + r + 1 }); }
// a ball
export function addBall(c, r, tag = '') { return keep({ kind: 'ball', c: c.clone(), r, tag, x: c.x, z: c.z, reach: r + 1 }); }
// a stone: an egg shape with half sizes s = [x, y, z], turned by quat
export function addStone(c, quat, s, tag = '') { return keep({ kind: 'stone', c: c.clone(), q: quat.clone(), qi: quat.clone().invert(), s, tag, x: c.x, z: c.z, reach: Math.max(s[0], s[1], s[2]) + 1 }); }
// a block: a box with half sizes s = [x, y, z], turned by quat
export function addBlock(c, quat, s, tag = '') { return keep({ kind: 'block', c: c.clone(), q: quat.clone(), qi: quat.clone().invert(), s, tag, x: c.x, z: c.z, reach: Math.hypot(s[0], s[1], s[2]) + 1 }); }
// a pipe: a hollow tube from a to b. The hole is r0 wide (radius) at a and r1 at b; the wall is "wall" thick. The bee can fly through it.
export function addPipe(a, b, r0, r1, wall, tag = '') { const L = a.distanceTo(b); return keep({ kind: 'pipe', a: a.clone(), u: b.clone().sub(a).normalize(), L, r0, r1, wall, tag, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, reach: L / 2 + Math.max(r0, r1) + wall + 1 }); }

// take the part of the speed that goes into the surface away (with a very small bounce), so the bee slides along it
function slide(v, n) { const vn = v.x * n.x + v.y * n.y + v.z * n.z; if (vn < 0) { v.x -= n.x * vn * 1.1; v.y -= n.y * vn * 1.1; v.z -= n.z * vn * 1.1; } }

export let lastSolid = null; // the shape that was touched last (for tests and for places that react to a touch)
// push the point p (a ball of radius pr) out of every solid shape. Returns true when it touched one.
export function solidsCollide(p, v, pr) {
  let hit = false;
  for (let i = 0; i < SOLIDS.length; i++) { const s = SOLIDS[i]; if (Math.abs(p.x - s.x) > s.reach + pr || Math.abs(p.z - s.z) > s.reach + pr) continue;
    if (s.kind === 'stick') { _b.subVectors(s.b, s.a); const t = clamp(_a.subVectors(p, s.a).dot(_b) / _b.lengthSq(), 0, 1); _a.copy(s.a).addScaledVector(_b, t); _n.subVectors(p, _a); const d = _n.length(), rr = s.r + pr;
      if (d < rr && d > 1e-5) { _n.multiplyScalar(1 / d); p.copy(_a).addScaledVector(_n, rr); slide(v, _n); hit = true; lastSolid = s; } }
    else if (s.kind === 'ball') { _n.subVectors(p, s.c); const d = _n.length(), rr = s.r + pr; if (d < rr && d > 1e-5) { _n.multiplyScalar(1 / d); p.copy(s.c).addScaledVector(_n, rr); slide(v, _n); hit = true; lastSolid = s; } }
    else if (s.kind === 'stone') { _a.subVectors(p, s.c).applyQuaternion(s.qi); const ax = s.s[0] + pr, ay = s.s[1] + pr, az = s.s[2] + pr, e = Math.hypot(_a.x / ax, _a.y / ay, _a.z / az);
      if (e < 1 && e > 1e-5) { _n.set(_a.x / (ax * ax), _a.y / (ay * ay), _a.z / (az * az)).normalize().applyQuaternion(s.q); _a.multiplyScalar(1 / e).applyQuaternion(s.q); p.copy(s.c).add(_a); slide(v, _n); hit = true; lastSolid = s; } }
    else if (s.kind === 'block') { _a.subVectors(p, s.c).applyQuaternion(s.qi); const px = s.s[0] + pr - Math.abs(_a.x), py = s.s[1] + pr - Math.abs(_a.y), pz = s.s[2] + pr - Math.abs(_a.z);
      if (px > 0 && py > 0 && pz > 0) { if (px <= py && px <= pz) { _n.set(Math.sign(_a.x) || 1, 0, 0); _a.x = _n.x * (s.s[0] + pr); } else if (py <= pz) { _n.set(0, Math.sign(_a.y) || 1, 0); _a.y = _n.y * (s.s[1] + pr); } else { _n.set(0, 0, Math.sign(_a.z) || 1); _a.z = _n.z * (s.s[2] + pr); }
        _n.applyQuaternion(s.q); _a.applyQuaternion(s.q); p.copy(s.c).add(_a); slide(v, _n); hit = true; lastSolid = s; } }
    else if (s.kind === 'pipe') { _a.subVectors(p, s.a); const t = _a.dot(s.u) / s.L; if (t < 0 || t > 1) continue; _n.copy(_a).addScaledVector(s.u, -t * s.L); const r = _n.length(), ri = lerp(s.r0, s.r1, t), ro = ri + s.wall;
      if (r > ri - pr && r < ro + pr && r > 1e-5) { const inside = r < ri + s.wall / 2, want = inside ? ri - pr : ro + pr; _n.multiplyScalar(1 / r); p.copy(s.a).addScaledVector(s.u, t * s.L).addScaledVector(_n, want); if (inside) _n.multiplyScalar(-1); slide(v, _n); hit = true; lastSolid = s; } }
  }
  return hit;
}
