// Night reference spots (the runner loads every shots-*.js). Ids start with "night-" so --only=night- picks them.
// NIGHT.debug.begin(moon 0..1, settle seconds) jumps into the night. autoFly(route) comes from tests/night-helpers.js (injected into every page).
module.exports = [
  { id: 'night-meadow-moon', name: 'The meadow under the moon, moonflowers open',
    setup: () => { T.fly(); T.quiet(); NIGHT.debug.begin(0.35, 3); const f = NIGHT.moonflowers[2]; T.lookAt(f.x + 18, f.y + 9, f.z + 12, f.x, f.y - 1, f.z); T.sim(0.1); } },
  { id: 'night-sleeping-cluster', name: 'A sleeping firefly cluster',
    setup: () => { T.fly(); T.quiet(); NIGHT.debug.begin(0.35, 3); const s = NIGHT.routes[1].start; T.lookAt(s.x + 9, s.y + 2.5, s.z + 7, s.x, s.y, s.z); T.sim(0.1); } },
  { id: 'night-woken-loop', name: 'A woken loop of fireflies with stragglers',
    setup: () => { T.fly(); T.quiet(); NIGHT.debug.begin(0.35, 3); const R = NIGHT.routes[0], s = R.start; T.place(s.x, s.y, s.z); T.sim(1.5);
      const c = R.loops[0].c, n = R.loops[0].n; T.lookAt(c.x - n.x * 14 + 4, c.y + 3, c.z - n.z * 14 + 4, c.x, c.y, c.z); T.sim(0.1); } },
  { id: 'night-tail-third', name: 'The firefly tail around the bee, seen from behind, after a full chain',
    setup: () => { T.fly(); T.quiet(); NIGHT.debug.begin(0.3, 3); autoFly(0); __g.G.third = true; T.sim(0.5); } },
  { id: 'night-grove-lit', name: 'The lit grove inside the bramble hollow',
    setup: () => { T.fly(); T.quiet(); NIGHT.debug.begin(0.3, 3); autoFly(0); T.sim(3); const H = __g.HOLLOW, f = NIGHT.moonflowers.find(m => m.grove);
      T.lookAt(H.x + (H.x - f.x) * 0.6, f.y + 3.5, H.z + (H.z - f.z) * 0.6, f.x, f.y, f.z); T.sim(0.1); } },
  { id: 'night-moonflower-close', name: 'A meadow moonflower up close',
    setup: () => { T.fly(); T.quiet(); NIGHT.debug.begin(0.35, 3); const f = NIGHT.moonflowers[0]; T.lookAt(f.x + 4.5, f.y + 3.6, f.z + 1.8, f.x, f.y + 0.7, f.z); T.sim(0.1); } },
  // the harder nights: moths from night 2, the bat from night 3. DAY.n is set before the night starts.
  { id: 'night-moth-drinking', name: 'A hawk moth drinking at a meadow moonflower',
    setup: () => { const g = __g; g.DAY.n = 3; T.fly(); T.quiet(); NIGHT.debug.begin(0.4, 2); NIGHT.bat.on = false; NIGHT.moths.debug.put(0, 6); T.sim(4);
      const m = NIGHT.moths.list[0]; T.lookAt(m.p.x + 1.7, m.p.y + 0.9, m.p.z + 2.0, m.p.x, m.p.y - 0.4, m.p.z); T.sim(1 / 30); } },
  { id: 'night-moths-light', name: 'Moths circling the firefly light of the bee, seen from behind',
    setup: () => { const g = __g, N = NIGHT, P = g.P; g.DAY.n = 4; T.fly(); T.quiet(); N.debug.begin(0.3, 3); N.bat.on = false; autoFly(0);
      const H = g.HOLLOW, x = H.x + 34, z = H.z + 6; T.place(x, g.terrainH(x, z) + 9, z, Math.PI / 2, -0.1); T.sim(2.5); /* out of the hollow into the open meadow: the tail follows */
      for (let i = 0; i < 3; i++) { N.moths.debug.put(i, 6 + i); N.moths.list[i].p.set(P.pos.x - 6 + 3 * Math.cos(i * 2), P.pos.y + 1.5, P.pos.z + 3 * Math.sin(i * 2)); }
      g.G.third = true; T.sim(0.8); } },
  { id: 'night-bat-moon', name: 'The bat on its round, against the moon, seen from the meadow',
    setup: () => { const g = __g, B = NIGHT.bat; g.DAY.n = 3; T.fly(); T.quiet(); NIGHT.debug.begin(0.4, 2); B.debug.put(0.3); T.sim(1 / 60);
      const m = g.U.uSun.value, p = B.p; T.lookAt(p.x - m.x * 12, p.y - m.y * 12, p.z - m.z * 12, p.x, p.y, p.z); T.sim(1 / 60); } },
  { id: 'night-bat-hunt', name: 'A bee above the treetops, just before the strike: the bat close in front, seen through the eyes of the bee',
    setup: () => { const g = __g, B = NIGHT.bat, P = g.P; g.DAY.n = 3; T.fly(-100, g.terrainH(-100, -40) + 10, -40); T.quiet(); NIGHT.debug.begin(0.4, 2); const x = -100, z = -40, y = g.terrainH(x, z) + 46;
      for (let i = 0; i < 60 * 20 && B.heat < 0.9; i++) { T.place(x, y, z); T.sim(1 / 60); } T.quiet(); T.lookAt(x, y, z, B.p.x, B.p.y, B.p.z); T.sim(1 / 60); } },
  { id: 'night-bloom-moth', name: 'A night bloom on the widest mushroom, open, with its moth on it',
    setup: () => { const g = __g, N = NIGHT; T.fly(0, 40, 120); T.quiet(); g.DAY.n = 2; N.debug.begin(0.3, 2); const h = N.moths.blooms[1]; T.place(h.x + 60, h.y + 30, h.z); N.moths.debug.lead(0, 1); T.sim(7); T.lookAt(h.x + 7, h.y + 2.5, h.z + 5.5, h.x, h.y - 0.5, h.z); T.sim(0.3); } },
  { id: 'night-moth-guide-dust', name: 'A fed moth on its way to a night bloom, with wing dust behind it',
    setup: () => { const g = __g, N = NIGHT, MO = N.moths, f = N.moonflowers[0], m = MO.list[0]; T.fly(0, 40, 120); T.quiet(); g.DAY.n = 2; N.debug.begin(0.3, 2); T.place(f.x + 40, f.y + 20, f.z + 40); MO.debug.put(0, 0); T.sim(3); f.nectar = 0.02; T.sim(8.5);
      const d = new g.THREE.Vector3().copy(m.v).setY(0).normalize(); T.lookAt(m.p.x - d.x * 34 + d.z * 7, m.p.y + 3, m.p.z - d.z * 34 - d.x * 7, m.p.x - d.x * 10, m.p.y, m.p.z - d.z * 10); T.sim(0.3); } },
];
