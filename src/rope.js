// Honeylight: ropes in the air: short chains of points that stream behind a bee (the ends of the scarf, the leaf on the cap's stalk).
// Each point feels the air that moves past it (the world's wind minus its own speed), a little weight, lift, and a flutter that runs down the chain.
// The length of each piece is kept, and the points are pushed out of three rounded shapes that stand for the bee's body.
// No random numbers: the same flight always gives the same motion.
import { V3, M4 } from './core.js';
import { ROUT, HTOP } from './world.js';
import { WIND } from './air.js';

export const AIR = { k: 6, gust: new V3() }; // k: how fast the breeze is for a rope at wind strength 1; gust: an extra wind that a test can switch on (units a second)
const ONE = new V3(1, 1, 1), _m = new M4(), _mi = new M4(), _v = new V3(), _a = new V3(), _w = new V3(), _d = new V3(), _s = new V3();
// the bee's body in bee space (z forward, y up): thorax, abdomen, head, each [centre x y z, half sizes x y z]
const BODY = [[0, 0.03, 0.13, 0.18, 0.17, 0.19], [0, -0.012, -0.36, 0.20, 0.19, 0.31], [0, 0.01, 0.38, 0.15, 0.16, 0.11]];
const indoors = p => p.y > -1 && p.y < HTOP + 1 && p.x * p.x + p.z * p.z < ROUT * ROUT; // in the hive the air is still
function windAt(p, t) { if (indoors(p)) return _w.set(0, 0, 0); const s = WIND.s * AIR.k * (0.75 + 0.35 * Math.sin(t * 0.9 + p.x * 0.05 + p.z * 0.04)); return _w.set(WIND.dx * s, 0, WIND.dz * s).add(AIR.gust); }

// bee: { p, q } (place and turn). anchor: where the rope is tied, in bee space. N points, each piece seg long.
// o.drag: how hard the air takes a point along. o.grav, o.lift: weight, and lift from air that flows past. o.flut: flutter. o.splay: push to the bee's side.
// o.slip: 1 = the rope does not feel the bee's sideways slip. The bee's nose turns in before its path does, so the true air would blow the rope to the inside of a turn.
// o.throw: sideways weight. When the bee's path bends, the points are thrown against the push, so the rope swings to the outside of the turn.
// o.back: the way the rope lies at rest, in bee space. o.extra: more rounded shapes to stay out of. o.keep(p): keeps a point out of the world's solid things.
export function makeRope(bee, anchor, N, seg, o = {}) {
  const P = [], Q = []; for (let i = 0; i < N; i++) { P.push(new V3()); Q.push(new V3()); }
  const r = { P, N, seg, bee, anchor: new V3().copy(anchor), drag: o.drag ?? 7, grav: o.grav ?? 3.2, lift: o.lift ?? 0.2, flut: o.flut ?? 0.5, splay: o.splay ?? 0, slip: o.slip ?? 0, throw: o.throw ?? 0,
    bp: new V3(), bv: new V3(), ba: 0, seen: 0, ph: o.ph ?? 0, margin: o.margin ?? 0.05, body: BODY.concat(o.extra || []), back: o.back ?? [0, 0, -1], keep: o.keep || null, t: 0, pdt: 1 / 60, ready: false };
  r.reset = () => { _m.compose(bee.p, bee.q, ONE); for (let i = 0; i < N; i++) { P[i].copy(r.anchor).add(_v.set(r.back[0], r.back[1], r.back[2]).multiplyScalar(i * seg)).applyMatrix4(_m); Q[i].copy(P[i]); } r.seen = 0; r.ba = 0; r.ready = true; };
  r.step = (dt) => { if (!r.ready) r.reset(); if (!(dt > 0)) return; r.t += dt; _m.compose(bee.p, bee.q, ONE); _mi.copy(_m).invert();
    const a0 = _a.copy(r.anchor).applyMatrix4(_m), far = Math.max(1.6, 90 * dt);
    if (a0.distanceToSquared(P[0]) > far * far) { _d.copy(a0).sub(P[0]); for (let i = 0; i < N; i++) { P[i].add(_d); Q[i].add(_d); } r.seen = 0; } // the bee was put somewhere else: the rope comes along
    // the bee's own sideways speed (slip) and its sideways push (ba), smoothed and capped
    const sr = _s.set(1, 0, 0).applyQuaternion(bee.q).setY(0).normalize(), srx = sr.x, srz = sr.z, sv = ((a0.x - P[0].x) * srx + (a0.z - P[0].z) * srz) / dt * r.slip, slx = srx * sv, slz = srz * sv;
    const bvx = (bee.p.x - r.bp.x) / dt, bvz = (bee.p.z - r.bp.z) / dt; if (r.seen >= 2) { const as = Math.max(-70, Math.min(70, ((bvx - r.bv.x) * srx + (bvz - r.bv.z) * srz) / dt)); r.ba += (as - r.ba) * (1 - Math.exp(-dt / 0.1)); } else r.ba = 0;
    r.bp.copy(bee.p); r.bv.set(bvx, 0, bvz); r.seen++; const tx = -r.throw * r.ba * srx, tz = -r.throw * r.ba * srz, k = dt / r.pdt;
    P[0].copy(a0); Q[0].copy(a0);
    for (let i = 1; i < N; i++) { const p = P[i], q = Q[i], w = windAt(p, r.t), f = i / (N - 1);
      const vx = (p.x - q.x) / r.pdt, vy = (p.y - q.y) / r.pdt, vz = (p.z - q.z) / r.pdt, rx = w.x + slx - vx, ry = w.y - vy, rz = w.z + slz - vz, rs = Math.hypot(rx, ry, rz), rh = Math.hypot(rx, rz);
      const sx = rh > 1e-3 ? -rz / rh : 1, sz = rh > 1e-3 ? rx / rh : 0; // across the flow, level
      const wv = Math.sin(r.t * (5 + rs * 1.1) - i * 0.85 + r.ph) * r.flut * rs * f, wv2 = Math.cos(r.t * (3.7 + rs * 0.8) - i * 0.6 + r.ph * 1.7) * r.flut * 0.6 * rs * f;
      const ox = _d.set(1, 0, 0).applyQuaternion(bee.q), sp = r.splay * r.drag * rh * Math.min(1, f * 2.5);
      const ax = r.drag * rx + sx * wv + ox.x * sp + tx, ay = r.drag * ry - r.grav + r.lift * r.drag * rh + wv2, az = r.drag * rz + sz * wv + ox.z * sp + tz;
      const nx = p.x + (p.x - q.x) * k + ax * dt * dt, ny = p.y + (p.y - q.y) * k + ay * dt * dt, nz = p.z + (p.z - q.z) * k + az * dt * dt; q.copy(p); p.set(nx, ny, nz); }
    for (let it = 0; it < 3; it++) {
      for (let i = 1; i < N; i++) { _d.copy(P[i]).sub(P[i - 1]); const L = _d.length() || 1e-6; P[i].copy(P[i - 1]).addScaledVector(_d, seg / L); }
      for (let i = 1; i < N; i++) { const b = _v.copy(P[i]).applyMatrix4(_mi); let hit = false;
        for (const [cx, cy, cz, ex, ey, ez] of r.body) { const mx = ex + r.margin, my = ey + r.margin, mz = ez + r.margin, dx = (b.x - cx) / mx, dy = (b.y - cy) / my, dz = (b.z - cz) / mz, d2 = dx * dx + dy * dy + dz * dz; if (d2 < 1) { const kk = 1 / Math.sqrt(Math.max(d2, 1e-6)); b.set(cx + dx * kk * mx, cy + dy * kk * my, cz + dz * kk * mz); hit = true; } }
        if (hit) P[i].copy(b).applyMatrix4(_m); if (r.keep) r.keep(P[i]); } }
    r.pdt = dt; };
  // frames along the rope (T along it, B across, Nn up-ish), carried from one piece to the next so that they do not flip
  r.T = []; r.B = []; r.Nn = []; for (let i = 0; i < N - 1; i++) { r.T.push(new V3()); r.B.push(new V3()); r.Nn.push(new V3()); }
  r.frames = () => { const ref = _a.set(0, 1, 0).applyQuaternion(bee.q); for (let i = 0; i < N - 1; i++) { const T = r.T[i].copy(P[i + 1]).sub(P[i]).normalize(), Nn = r.Nn[i].copy(ref).addScaledVector(T, -ref.dot(T)); if (Nn.lengthSq() < 1e-6) Nn.set(1, 0, 0).addScaledVector(T, -T.x); Nn.normalize(); r.B[i].crossVectors(T, Nn); ref.copy(Nn); } };
  return r; }
