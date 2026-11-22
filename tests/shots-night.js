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
];
