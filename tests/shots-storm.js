// Storm reference spots (the runner loads every shots-*.js). Ids start with "storm-" so --only=storm- picks them.
// STORM.debug.begin(T) jumps into a storm at second T. stay() holds the bee at one place while time runs, as 12-storm.test.js does.
const STAY = 'const stay = (x, y, z, secs) => { for (let i = 0; i < Math.round(secs * 10); i++) { T.place(x, y, z, __g.P.yaw, __g.P.pitch); T.sim(0.1); } };';
module.exports = [
  { id: 'storm-front-meadow', name: 'The rain front coming over the meadow, seen from the field',
    setup: new Function(`const g = __g, S = STORM; T.fly(0, 40, 120); T.quiet(); ${STAY}
      S.debug.begin(48); const x = S.ax * 10 - S.az * 60, z = S.az * 10 + S.ax * 60, y = g.terrainH(x, z) + 28;
      T.lookAt(x, y, z, x + S.ax * 100, y + 8, z + S.az * 100); stay(x, y, z, 2); T.lookAt(x, y, z, x + S.ax * 100, y + 8, z + S.az * 100); T.sim(0.05);`) },
  { id: 'storm-rainbow', name: 'The rainbow on the meadow after the rain',
    setup: new Function(`const g = __g, S = STORM; T.fly(0, 40, 120); T.quiet(); ${STAY}
      S.debug.begin(110); stay(0, 30, 120, 10); const B = S.bow, nx = Math.cos(B.yaw + Math.PI / 2), nz = Math.sin(B.yaw + Math.PI / 2);
      const x = B.x - nx * 230, z = B.z - nz * 230, y = g.terrainH(x, z) + 30; T.lookAt(x, y, z, B.x, y + 25, B.z); stay(x, y, z, 4);`) },
  { id: 'storm-grounded', name: 'A bee with soaked wings in the rain, seen from outside: it can flutter no higher than the grass tops',
    setup: () => { const g = __g, S = STORM, P = g.P; T.fly(0, 40, 120); T.quiet(); const x = g.FDIR.x * 90, z = g.FDIR.z * 90; S.debug.begin(0); S.T = S.BREW + (400 - (x * S.ax + z * S.az) + 60) / S.SPEED;
      g.G.third = true; T.place(x, g.terrainH(x, z) + 14, z, 0.6, 0); T.key('Space'); T.sim(9); } },
];
