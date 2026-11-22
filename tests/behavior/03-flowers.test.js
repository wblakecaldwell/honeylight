// Flowers, delivery to the hive, unlocks and sisters.
// pick(val) runs in the page: the first open flower of that value (not giant, not a lily, not in a locked zone or the orchard).
const PICK = `window.__pick = (val, skip = 0) => __g.flowers.filter(f => f.val === val && !f.giant && !f.lily && !f.orch && !f.zone)[skip];
  window.__land = (f, secs) => { T.place(f.sx, f.y + f.len + 1.5, f.sz); T.key('ShiftLeft'); T.sim(secs); T.key('ShiftLeft', false); };`;
module.exports = [
  { id: 'FLW-001-top', req: 'FLW-001', name: 'Landing on top of a flower gives pollen; touching it from below does not',
    async run(t) {
      await t.ev(PICK);
      const r = await t.ev(() => { const g = __g, P = g.P, f = __pick(1); T.quiet(); T.fly(); g.DAY.t = 0.4; const out = {};
        // from below: rise into the underside of the bloom, off the stem
        T.place(f.sx + f.r * 0.4, f.y - 3, f.sz); T.key('Space'); T.sim(2); T.key('Space', false); out.below = P.pollen;
        f.cool = 0; __land(f, 2.5); out.top = P.pollen; out.load = P.load.slice(); return out; });
      t.eq(r.below, 0, 'no pollen from under the bloom'); t.eq(r.top, 1, 'one pollen from the top'); t.eq(r.load, [1], 'a value 1 flower gives 1');
      return r;
    } },

  { id: 'FLW-002-hold', req: 'FLW-002', name: 'A value 2 flower gives pollen only after the bee holds on',
    async run(t) {
      await t.ev(PICK);
      const r = await t.ev(() => { const g = __g, P = g.P, f = __pick(2); T.quiet(); T.fly(); g.DAY.t = 0.4;
        T.place(f.sx, f.y + f.len + 1.5, f.sz); T.key('ShiftLeft'); let landedAt = -1, gotAt = -1;
        for (let i = 0; i < 60; i++) { T.sim(0.1); if (landedAt < 0 && P.landed === f) landedAt = i; if (gotAt < 0 && P.pollen > 0) gotAt = i; }
        T.key('ShiftLeft', false); return { landedAt, gotAt, load: P.load.slice() }; });
      t.check(r.landedAt >= 0, 'the bee lands on the flower'); t.check(r.gotAt >= 0, 'the bee gets pollen in the end');
      t.check(r.gotAt - r.landedAt >= 8, `the pollen needs about a second of holding (landed at step ${r.landedAt}, pollen at ${r.gotAt})`);
      t.eq(r.load, [2], 'a value 2 flower gives 2');
      return r;
    } },

  { id: 'FLW-006-cling', req: 'FLW-006', name: 'W does not push the bee off a hold flower; Space lets it go',
    async run(t) {
      await t.ev(PICK);
      const r = await t.ev(() => { const g = __g, P = g.P, f = __pick(2, 1); T.quiet(); T.fly(); g.DAY.t = 0.4; const out = {};
        T.place(f.sx, f.y + f.len + 1.5, f.sz); T.key('ShiftLeft'); for (let i = 0; i < 30 && P.landed !== f; i++) T.sim(0.1); T.key('ShiftLeft', false); out.landed = P.landed === f; out.pollen0 = P.pollen; T.key('KeyW'); T.sim(0.3); out.onAfterW = P.landed === f; T.sim(1.5); T.key('KeyW', false);
        out.pollen = P.pollen; out.dist = +Math.hypot(P.pos.x - f.sx, P.pos.z - f.sz).toFixed(2);
        const y0 = P.pos.y; T.key('Space'); T.sim(1); T.key('Space', false); out.rise = +(P.pos.y - y0).toFixed(2); out.offAfterSpace = P.landed !== f; return out; });
      t.check(r.landed, 'the bee lands'); t.eq(r.pollen0, 0, 'no pollen yet at the touch'); t.check(r.onAfterW, 'still on the flower while W is held');
      t.eq(r.pollen, 1, 'the bee stays and gets the pollen with W held'); t.check(r.rise > 1 && r.offAfterSpace, 'Space lifts the bee off, rise ' + r.rise);
      return r;
    } },

  { id: 'FLW-005-overflow', req: 'FLW-005', name: 'An overflowing flower gives double pollen',
    async run(t) {
      await t.ev(PICK);
      const r = await t.ev(() => { const g = __g, P = g.P, f = __pick(1, 2); T.quiet(); T.fly(); g.DAY.t = 0.4; f.rich = f.rich0 = 30; f.cool = 0;
        __land(f, 1.2); T.quiet(); return { load: P.load.slice(0, 1), toast: T.text('toast') }; });
      t.eq(r.load, [2], 'a value 1 flower that overflows gives 2');
      return r;
    } },

  { id: 'DLV-001-deliver', req: 'GEN-004', name: 'Pollen carried into the hive becomes honey',
    async run(t) {
      const r = await t.ev(() => { const g = __g, P = g.P; T.quiet(); T.fly(); T.place(0, 13, 6, 0, 0); P.load = [1, 2, 1]; P.pollen = 3;
        T.sim(6); return { honey: g.G.honey, pollen: P.pollen, stores: g.stores() }; });
      t.eq(r.honey, 4, 'pollen worth 1 + 2 + 1 becomes 4 honey'); t.eq(r.pollen, 0, 'the baskets are empty'); t.eq(r.stores, 4, 'stores grow too');
      return r;
    } },

  { id: 'GEN-003-unlocks', req: 'GEN-003', name: 'Unlocks at 8, 35 and 55 honey; a new sister for each 10 honey',
    async run(t) {
      const r = await t.ev(() => { const g = __g, G = g.G; T.fly(30, 12, 20); T.quiet(); const s = () => ({ cap: G.cap, speed: G.speed, workers: G.workers, honey: G.honey }); const out = [s()];
        for (const n of [7, 1, 26, 1, 19, 1]) { g.gainHoney(n); out.push(s()); } return out; });
      t.eq(r.map(x => x.cap), [4, 4, 6, 6, 6, 6, 8], 'baskets grow at 8 and 55');
      t.eq(r.map(x => x.speed), [1, 1, 1, 1, 1.15, 1.15, 1.15], 'strong wings at 35');
      t.eq(r.map(x => x.workers), [0, 0, 0, 3, 3, 5, 5], 'one sister for each 10 honey');
      return r.map(x => x.honey);
    } },
];
