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
];
