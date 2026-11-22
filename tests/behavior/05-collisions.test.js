// Solid things: fly straight at each one with W held and check the bee never gets inside.
// RAM runs in the page: __ram(from, to, secs, speed, metric) puts the bee at `from`, looks at `to`, starts at `speed`,
// holds W for `secs` (one frame at a time; holdY keeps the start height, for low thin targets) and returns the smallest value of metric(P.pos) and the end position.
// All zones are opened first, so no breeze pushes the bee away from the target.
const RAM = `window.__ram = (from, to, secs, speed, metric, holdY) => { const g = __g, P = g.P; g.G.zones = { garden: true, pond: true, forest: true }; g.G.orchard = true;
  T.fly(); T.quiet(); T.lookAt(...from, ...to); const d = new g.THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]).normalize(); P.vel.copy(d).multiplyScalar(speed);
  T.key('KeyW'); let min = 1e9; for (let i = 0; i < Math.round(secs * 60); i++) { T.sim(1 / 60); if (holdY) { P.pos.y = from[1]; P.vel.y = 0; } min = Math.min(min, metric(P.pos)); } T.key('KeyW', false);
  return { min: +min.toFixed(3), end: [P.pos.x, P.pos.y, P.pos.z].map(v => +v.toFixed(2)) }; };`;
module.exports = [
  { id: 'COL-001-mushroom', req: 'COL-001', name: 'A mushroom cap is solid',
    async run(t) {
      await t.ev(RAM);
      const r = await t.ev(() => { const s = __g.shrooms[0], y = s.y + 0.6;
        return { R: s.R, ...__ram([s.x - 25, y, s.z], [s.x, y, s.z], 2.5, 10, p => Math.hypot(p.x - s.x, (p.y - s.y) / 0.7, p.z - s.z)) }; });
      t.check(r.min >= r.R, `the bee stays outside the cap (closest ${r.min}, cap radius ${r.R})`);
      return r;
    } },

  { id: 'COL-003-stem', req: 'COL-003', name: 'A flower stem is solid',
    async run(t) {
      await t.ev(RAM);
      const r = await t.ev(() => { const g = __g, f = g.flowers.find(f => f.val === 1 && !f.zone && !f.orch && !f.giant && !f.lily && f.y - 2.4 > g.terrainH(f.sx, f.sz) + 0.8), y = f.y - 2.0;
        return __ram([f.sx - 20, y, f.sz], [f.sx, y, f.sz], 2.5, 8, p => p.y < f.y - 1.4 ? Math.hypot(p.x - f.sx, p.z - f.sz) : 9, true); });
      t.check(r.min < 2, 'the bee reaches the stem, closest ' + r.min); t.check(r.min >= 0.25, 'the bee does not pass through the stem, closest ' + r.min);
      return r;
    } },

  { id: 'COL-005-arch-fast', req: 'COL-005', name: 'An arch leg is solid even at dart speed',
    async run(t) {
      await t.ev(RAM);
      const r = await t.ev(() => { const a = __g.ARCHES[0], S = a.samples, L = S[4], ax = S[S.length - 1].x - S[0].x, az = S[S.length - 1].z - S[0].z, k = 1 / Math.hypot(ax, az);
        const nx = -az * k, nz = ax * k;
        const seg = (p) => { let m = 1e9; for (let i = 0; i < S.length - 1; i++) m = Math.min(m, __g.segSeg(p, p, S[i], S[i + 1])); return m; };
        const out = __ram([L.x - nx * 20, L.y, L.z - nz * 20], [L.x, L.y, L.z], 1.2, 34, seg); return out; });
      // stem radius 0.34 + bee radius 0.36 = 0.7. At 34 units/s one frame moves 0.57, less than the 1.4 width, so a pass-through would show a frame closer than 0.7.
      t.check(r.min < 1, 'the bee reaches the stem, closest ' + r.min); t.check(r.min >= 0.69, 'the bee never gets inside the stem, closest ' + r.min);
      return r;
    } },

  { id: 'COL-006-nest', req: 'COL-006', name: 'The wasp nest is solid',
    async run(t) {
      await t.ev(RAM);
      const r = await t.ev(() => { const N = __g.NEST;
        return __ram([N.x - 25, N.y, N.z], [N.x, N.y, N.z], 2.5, 10, p => Math.hypot((p.x - N.x) / 2.8, (p.y - N.y) / 3.8, (p.z - N.z) / 2.8)); });
      t.check(r.min >= 1, 'the bee stays outside the nest shell, closest (1 = surface) ' + r.min);
      return r;
    } },

  { id: 'COL-007-tree', req: 'COL-007', name: 'A garden tree trunk is solid',
    async run(t) {
      await t.ev(RAM);
      const r = await t.ev(() => { const o = __g.orchTrees.find(o => !o.nest) || __g.orchTrees[1], y = o.gy + 5;
        return { R: o.R, ...__ram([o.x - 25, y, o.z], [o.x, y, o.z], 2.5, 10, p => Math.hypot(p.x - o.x, p.z - o.z)) }; });
      t.check(r.min >= r.R, `the bee stays outside the trunk (closest ${r.min}, trunk radius ${r.R})`);
      return r;
    } },

  { id: 'COL-007-log', req: 'COL-007', name: 'The hollow log wall is solid from the outside',
    async run(t) {
      await t.ev(RAM);
      const r = await t.ev(() => { const L = __g.LOG, A = L.axis, c = L.c, nx = -A.z, nz = A.x;
        const radial = p => { const dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z, u = dx * A.x + dy * A.y + dz * A.z; return Math.hypot(dx - A.x * u, dy - A.y * u, dz - A.z * u); };
        return { ro: L.ro, ...__ram([c.x + nx * 25, c.y, c.z + nz * 25], [c.x, c.y, c.z], 2.5, 10, radial) }; });
      t.check(r.min >= r.ro, `the bee stays outside the log wall (closest ${r.min}, outer radius ${r.ro})`);
      return r;
    } },

  { id: 'COL-007-stone', req: 'COL-007', name: 'A scent stone is solid at its side',
    async run(t) {
      await t.ev(RAM);
      const r = await t.ev(() => { const s = __g.STONES[0], y = s.y + 0.3;
        return __ram([s.x - 25, y, s.z], [s.x, y, s.z], 2.5, 8, p => p.y < s.y + 0.4 ? Math.hypot(p.x - s.x, p.z - s.z) : 99); });
      t.check(r.min >= 7.9, 'the bee does not go into the stone side, closest ' + r.min);
      return r;
    } },

  { id: 'COL-007-hedge', req: 'COL-007', name: 'The garden hedge is solid away from its gaps',
    async run(t) {
      await t.ev(RAM);
      const r = await t.ev(() => { const g = __g, O = g.ORCH, R = g.HEDGE_R, a = g.HEDGE_GAPS[0] + 1.1; // between the two gaps, away from the low tunnel
        const ox = O.x + Math.cos(a) * (R + 25), oz = O.z + Math.sin(a) * (R + 25), y = g.terrainH(ox, oz) + 5;
        return { R, ...__ram([ox, y, oz], [O.x, y, O.z], 2.5, 10, p => Math.hypot(p.x - O.x, p.z - O.z), true) }; });
      t.check(r.min >= r.R + 8.5, `the bee stays outside the hedge (closest ${r.min}, hedge outer edge ${r.R + 8.5})`);
      t.check(r.min < r.R + 10, 'the bee reaches the hedge, closest ' + r.min);
      return r;
    } },
];
