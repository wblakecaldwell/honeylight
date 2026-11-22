// Fixed camera spots for the reference ("golden") screenshots.
// setup runs inside the game page. Use T.fly / T.lookAt / T.quiet / T.sim, and set the world state the shot needs.
// Keep each spot quiet and repeatable: call T.quiet(), set DAY.t, then T.sim a short fixed time.
module.exports = [
  { id: 'meadow-hive-tree', name: 'The meadow and the hive tree in the afternoon',
    setup: () => { T.fly(); T.quiet(); __g.DAY.t = 0.2; T.lookAt(70, 14, 55, 0, 16, 0); T.sim(0.5); } },
  { id: 'inside-hive', name: 'Inside the hive, looking along the combs',
    setup: () => { T.fly(); T.quiet(); __g.DAY.t = 0.2; T.lookAt(-4, 11, -5.1, 6, 10, -5.1); T.sim(0.5); } },
  { id: 'dusk-meadow', name: 'The meadow at dusk, flowers closing',
    setup: () => { T.fly(); T.quiet(); __g.DAY.t = 0.95; T.lookAt(60, 9, 40, 120, 6, 85); T.sim(0.5); } },
  { id: 'fallen-tree', name: 'The old fallen tree by the walled garden: bark, the root end, branch stubs',
    setup: () => { const L = __g.LOG; T.fly(); T.quiet(); __g.DAY.t = 0.2; T.lookAt(L.c.x + L.axis.z * 34 + L.axis.x * 8, L.c.y + 17, L.c.z - L.axis.x * 34 + L.axis.z * 8, L.c.x, L.c.y, L.c.z); T.sim(0.5); } },
  { id: 'fallen-tree-break', name: 'The fallen tree from its broken end: splinters and the hollow',
    setup: () => { const L = __g.LOG; T.fly(); T.quiet(); __g.DAY.t = 0.2; T.lookAt(L.c.x + L.axis.x * 42 + L.axis.z * 14, L.c.y + 8, L.c.z + L.axis.z * 42 - L.axis.x * 14, L.c.x + L.axis.x * 16, L.c.y, L.c.z + L.axis.z * 16); T.sim(0.5); } },
  { id: 'bramble-thicket', name: 'The bramble thicket over the night grove: leaves, arching thorny canes, blackberries',
    setup: () => { const g = __g, H = g.HOLLOW, gy = g.terrainH(H.x, H.z); T.fly(); T.quiet(); g.DAY.t = 0.2; T.lookAt(H.x - 22, gy + 12, H.z - 20, H.x, gy + 8, H.z); T.sim(0.4); } },
  { id: 'outside-view-flight', name: 'The view a new game starts with: the camera outside the bee, in flight over the meadow',
    setup: () => { T.fly(60, 12, 40); T.quiet(); __g.DAY.t = 0.2; __g.G.third = true; T.key('KeyW'); T.sim(2); } },
  { id: 'comb-walk-outside', name: 'On the comb, seen from outside, in the middle of a waddle step',
    setup: () => { const g = __g, P = g.P; g.G.third = true; document.getElementById('title').click(); let n = 0; while (P.mode === 'cell' && n < 40) { g.chew(); T.sim(0.2); n++; } T.sim(6); T.key('KeyW'); T.sim(1.02); } },
];
