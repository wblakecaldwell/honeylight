// Flight: weight, diving and climbing, the Dart and Leap abilities.
// Open sky well away from the hive tree, below the height limit.
const SKY = [150, 40, 40];
module.exports = [
  { id: 'FLT-002-pollen-weight', req: 'FLT-002', name: 'A full pollen load makes the bee slower with the same thrust',
    async run(t) {
      const r = await t.ev((SKY) => { const g = __g, P = g.P; T.quiet();
        const speed = (n) => { T.fly(...SKY, Math.PI / 2, 0); P.load = Array(n).fill(1); P.pollen = n; T.key('KeyW'); T.sim(4); T.key('KeyW', false);
          return Math.hypot(P.vel.x, P.vel.z); };
        const empty = speed(0), full = speed(g.G.cap); return { empty: +empty.toFixed(2), full: +full.toFixed(2), cap: g.G.cap }; }, SKY);
      t.check(r.empty > 10, 'the empty bee gets up to speed, ' + r.empty);
      t.check(r.full < r.empty * 0.85, `the loaded bee is clearly slower (empty ${r.empty}, full ${r.full})`);
      return r;
    } },

  { id: 'FLT-003-dive', req: 'FLT-003', name: 'Looking down and pressing W makes the bee dive',
    async run(t) {
      const r = await t.ev((SKY) => { const P = __g.P; T.quiet(); T.fly(...SKY, Math.PI / 2, -0.6); const y0 = P.pos.y;
        T.key('KeyW'); T.sim(2); T.key('KeyW', false); return { y0, y1: +P.pos.y.toFixed(2), vy: +P.vel.y.toFixed(2) }; }, SKY);
      t.check(r.y1 < r.y0 - 5, `the bee goes down (from ${r.y0} to ${r.y1})`);
      return r;
    } },

  { id: 'FLT-004-climb', req: 'FLT-004', name: 'Looking up and pressing W makes the bee climb',
    async run(t) {
      const r = await t.ev((SKY) => { const P = __g.P; T.quiet(); T.fly(SKY[0], 20, SKY[2], Math.PI / 2, 0.6); const y0 = P.pos.y;
        T.key('KeyW'); T.sim(2); T.key('KeyW', false); return { y0, y1: +P.pos.y.toFixed(2) }; }, SKY);
      t.check(r.y1 > r.y0 + 5, `the bee goes up (from ${r.y0} to ${r.y1})`);
      return r;
    } },

  { id: 'FLT-005-dart', req: 'FLT-005', name: 'Q (dart) unlocks at 30 honey and gives a burst of speed',
    async run(t) {
      const sp = () => t.ev(() => { T.sim(0.1); return +Math.hypot(__g.P.vel.x, __g.P.vel.z).toFixed(2); });
      await t.ev((SKY) => { T.quiet(); T.fly(...SKY, Math.PI / 2, 0); __g.gainHoney(29); T.sim(0.5); }, SKY);
      await t.page.keyboard.press('KeyQ'); const locked = await sp();
      const unlocked = await t.ev((SKY) => { __g.gainHoney(1); T.fly(...SKY, Math.PI / 2, 0); T.sim(0.5); return __g.G.dart; }, SKY);
      await t.page.keyboard.press('KeyQ'); const after = await sp();
      t.check(locked < 2, 'at 29 honey Q does nothing, speed ' + locked); t.eq(unlocked, true, 'dart unlocked at 30');
      t.check(after > 15, 'at 30 honey Q throws the bee forward, speed ' + after);
      return { locked, after };
    } },

  { id: 'FLT-005-leap', req: 'FLT-005', name: 'E (leap) unlocks at 65 honey and throws the bee straight up',
    async run(t) {
      const vy = () => t.ev(() => { T.sim(0.1); return +__g.P.vel.y.toFixed(2); });
      await t.ev((SKY) => { T.quiet(); T.fly(SKY[0], 20, SKY[2]); __g.gainHoney(64); T.sim(0.5); }, SKY);
      await t.page.keyboard.press('KeyE'); const locked = await vy();
      const unlocked = await t.ev((SKY) => { __g.gainHoney(1); T.fly(SKY[0], 20, SKY[2]); T.sim(0.5); return __g.G.leap; }, SKY);
      await t.page.keyboard.press('KeyE'); const after = await vy();
      t.check(locked < 2, 'at 64 honey E does nothing, vy ' + locked); t.eq(unlocked, true, 'leap unlocked at 65');
      t.check(after > 12, 'at 65 honey E throws the bee up, vy ' + after);
      return { locked, after };
    } },
];
