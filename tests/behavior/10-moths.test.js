// Moths (moths.js): from the second night hawk moths drink the moonflowers, and a fed moth leads to a hidden night bloom. Requirement IDs NGT-031 to NGT-040.
// NIGHT.moths.debug.lead(i, bloomIndex) sets moth i as a guide near a night bloom.
// NIGHT.moths.debug.put(i, flowerIndex) sets moth i next to a moonflower.
const night = n => `T.fly(0, 40, 120); T.quiet(); __g.DAY.n = ${n}; NIGHT.debug.begin(0.3, 2); const N = NIGHT, g = __g, P = g.P, MO = N.moths, MF = N.moonflowers, HB = MO.blooms, far = () => T.place(MF[0].x + 60, MF[0].y + 20, MF[0].z + 60);`;
const run = (body, n = 2) => new Function(night(n) + body);
module.exports = [
  { id: 'NGT-031-moths-night-two', req: 'NGT-031', name: 'No moths on the first night; two on the second, then one more each night up to four; they come one after another',
    async run(t) {
      const a = await t.ev(run(`T.sim(30); return { count: MO.count, shown: MO.debug.view.group.visible, toast: T.text('toast') };`, 1));
      t.eq(a.count, 0, 'first night: no moths'); t.eq(a.shown, false, 'nothing is drawn'); t.check(!/Moths/.test(a.toast), 'no moth message on the first night');
      await t.reopen();
      const b = await t.ev(() => { const g = __g, N = NIGHT; T.fly(0, 40, 120); T.quiet(); g.DAY.n = 2; g.DAY.t = 0.9995; T.sim(1); const MO = N.moths, o = { count: MO.count }; N.k = 1; for (const f of N.moonflowers) if (!f.grove) f.open = 1;
        N.t = 0.06; T.sim(1); o.toast = T.text('toast'); o.early = MO.list.filter(m => m.state !== 'away').length; N.t = 0.15; T.sim(1); o.one = MO.list.filter(m => m.state !== 'away').length; N.t = 0.32; T.sim(1); o.two = MO.list.filter(m => m.state !== 'away').length; return o; });
      t.eq(b.count, 2, 'second night: two moths'); t.check(/Moths are out tonight/.test(b.toast), 'a message tells of the moths: ' + b.toast); t.eq([b.early, b.one, b.two], [0, 1, 2], 'they come one after another');
      await t.reopen();
      const c = await t.ev(run(`return { count: MO.count };`, 9)); t.eq(c.count, 4, 'never more than four');
      return { a, b, c };
    } },

  { id: 'NGT-032-moth-drinks', req: 'NGT-032', name: 'A moth hovers at an open moonflower and drinks it dry in about 30 seconds; the flower grows dim and gives nothing that night; then the moth has drunk its fill and drinks no more',
    async run(t) {
      const r = await t.ev(run(`far(); const f = MF[0], m = MO.list[0], o = {}; MO.debug.put(0, 0); T.sim(3); o.state = m.state; o.dist = +Math.hypot(m.p.x - f.sx, m.p.z - f.sz).toFixed(1);
        T.sim(14); o.half = +f.nectar.toFixed(2); o.takenHalf = f.taken; T.sim(18); o.nectar = f.nectar; o.taken = f.taken; o.drained = MO.drained; o.after = m.state;
        T.sim(40); o.next = m.f ? MF.indexOf(m.f) : -1; o.state2 = m.state;
        T.place(f.x, f.y + 3.2, f.z); T.key('ShiftLeft'); T.sim(3); T.key('ShiftLeft', false); o.pollen = P.pollen; return o;`));
      t.eq(r.state, 'drink', 'the moth drinks'); t.near(r.dist, 2, 0.6, 'it hovers in front of the bloom'); t.near(r.half, 0.5, 0.12, 'about half is gone after 15 s'); t.eq(r.takenHalf, false, 'the flower is not spent yet');
      t.eq([r.nectar, r.taken, r.drained], [0, true, 1], 'the flower is drunk dry'); t.eq(r.after, 'guide', 'the moth has drunk its fill and flies off'); t.check(r.next === -1 && (r.state2 === 'guide' || r.state2 === 'perch'), 'it drinks from no other flower that night: ' + r.state2); t.eq(r.pollen, 0, 'a dry flower gives nothing');
      return r;
    } },

  { id: 'NGT-033-moth-shoo', req: 'NGT-033', name: 'Flying close makes a moth flutter off; the flower keeps its nectar and the moth leaves that flower alone for a while',
    async run(t) {
      const r = await t.ev(run(`far(); const f = MF[0], m = MO.list[0], o = {}; MO.debug.put(0, 0); T.sim(6); o.before = +f.nectar.toFixed(2);
        T.place(m.p.x + 1.5, m.p.y + 1.5, m.p.z); T.sim(0.1); o.state = m.state; o.shooed = MO.shooed; far(); T.sim(3); o.away = Math.hypot(m.p.x - f.sx, m.p.z - f.sz) > 8; T.sim(9); o.other = m.f !== f; o.nectar = +f.nectar.toFixed(2);
        T.place(f.x, f.y + 3.2, f.z); T.key('ShiftLeft'); T.sim(3); T.key('ShiftLeft', false); o.load = P.load.slice(); return o;`));
      t.check(r.before > 0.8, 'it had drunk a little: ' + r.before); t.eq(r.state, 'flee', 'the moth is startled'); t.eq(r.shooed, 1, 'one moth sent off'); t.check(r.away, 'it flies away from the flower');
      t.check(r.other, 'it does not come straight back'); t.eq(r.nectar, r.before, 'the nectar that was left is still there'); t.eq(r.load, [2], 'the bee gets the full flower');
      return r;
    } },

  { id: 'NGT-034-half-drunk', req: 'NGT-034', name: 'A moonflower that a moth drank more than half of is worth 1 less',
    async run(t) {
      const r = await t.ev(run(`far(); const f = MF[0], m = MO.list[0], o = {}; MO.debug.put(0, 0); T.sim(21); o.nectar = +f.nectar.toFixed(2);
        T.place(f.x, f.y + 3.2, f.z); T.key('ShiftLeft'); T.sim(3); T.key('ShiftLeft', false); o.load = P.load.slice(); o.toast = T.text('toast'); o.state = m.state; return o;`));
      t.check(r.nectar < 0.5 && r.nectar > 0.2, 'less than half is left: ' + r.nectar); t.eq(r.load, [1], 'worth 1 in place of 2'); t.check(/half drunk by a moth/.test(r.toast), 'the message says why: ' + r.toast);
      return r;
    } },

  { id: 'NGT-035-moth-light', req: 'NGT-035', name: 'A bee with fireflies behind it draws moths off the flowers; when the light is gone they go back',
    async run(t) {
      const r = await t.ev(run(`far(); const f = MF[0], m = MO.list[0], o = {}; MO.debug.put(0, 0); T.sim(5); o.state0 = m.state;
        T.place(f.x + 9, f.y + 3, f.z + 6); T.sim(1); o.noLight = m.state; N.tail = 5; T.sim(1); o.state = m.state; const n0 = f.nectar; T.sim(6); o.kept = f.nectar === n0; o.near = +m.p.distanceTo(P.pos).toFixed(1); o.lured = MO.lured;
        N.tail = 0; T.sim(1); o.gone = m.state; T.sim(12); o.back = m.state; return o;`));
      t.eq(r.state0, 'drink', 'the moth drinks'); t.eq(r.noLight, 'drink', 'a bee without light at 10 away does not disturb it'); t.eq(r.state, 'lured', 'the firefly light draws it');
      t.check(r.kept, 'it drinks no more'); t.check(r.near < 6, 'it circles the bee: ' + r.near); t.eq(r.lured, 1, 'one moth lured'); t.eq(r.gone, 'rest', 'without the light it circles, confused'); t.check(r.back === 'seek' || r.back === 'drink', 'then it goes back to the flowers: ' + r.back);
      return r;
    } },

  { id: 'NGT-037-moth-guides', req: 'NGT-037', name: 'A moth that has drunk a flower dry flies to the nearest shut night bloom and leaves wing dust in the air; a bee or its fireflies do not turn it from its way',
    async run(t) {
      const r = await t.ev(run(`const f = MF[0], m = MO.list[0], o = {}; T.place(f.x + 30, f.y + 15, f.z + 30); MO.debug.put(0, 0); T.sim(3); o.dust0 = MO.debug.dust(); f.nectar = 0.02; T.sim(2);
        const near = HB.slice().sort((a, b) => Math.hypot(a.x - f.x, a.z - f.z) - Math.hypot(b.x - f.x, b.z - f.z))[0], dist = () => Math.hypot(m.p.x - near.x, m.p.z - near.z);
        o.state = m.state; o.toNearest = m.hb === near; o.claimed = near.moth === m; o.toast = T.text('toast'); const d0 = dist(); T.sim(4); o.gain = +(d0 - dist()).toFixed(0); o.dust = MO.debug.dust(); o.shut = near.open;
        T.place(m.p.x + 1.5, m.p.y + 1.5, m.p.z); T.sim(0.1); o.close = m.state; N.tail = 5; T.sim(1); o.light = m.state; N.tail = 0; o.shooed = MO.shooed; o.lured = MO.lured; o.guided = MO.guided; return o;`));
      t.eq(r.state, 'guide', 'the fed moth sets off'); t.eq([r.toNearest, r.claimed], [true, true], 'to the nearest night bloom, which is now its own'); t.check(/drunk its fill/.test(r.toast), 'a message when the bee is near: ' + r.toast);
      t.check(r.gain > 20, 'it comes closer at guide speed: ' + r.gain + ' in 4 s'); t.eq(r.dust0, 0, 'no dust before'); t.check(r.dust > 15, 'wing dust hangs in the air behind it: ' + r.dust + ' points'); t.eq(r.shut, 0, 'the bloom is still shut');
      t.eq([r.close, r.light, r.shooed, r.lured], ['guide', 'guide', 0, 0], 'a bee close by or a firefly tail does not turn it'); t.eq(r.guided, 1, 'one guide');
      return r;
    } },

  { id: 'NGT-038-night-bloom-opens', req: 'NGT-038', name: 'A night bloom is a shut bud that gives nothing. It opens when its moth lands on it, and for no one else',
    async run(t) {
      const r = await t.ev(run(`const f = HB[0], m = MO.list[0], o = {}; T.place(f.x, f.y + 3.2, f.z); T.key('ShiftLeft'); T.sim(4); T.key('ShiftLeft', false); o.bee = [f.open, f.woken, P.pollen];
        T.place(f.x + 14, f.y + 6, f.z + 10); MO.debug.lead(0, 0); T.sim(0.5); o.onWay = [m.state, f.open]; T.sim(3); o.landed = [m.state, f.woken, MO.opened]; o.toast = T.text('toast'); T.sim(3); o.open = +f.open.toFixed(2);
        o.on = +Math.hypot(m.p.x - f.x, m.p.z - f.z).toFixed(1); o.above = +(m.p.y - f.y).toFixed(1); o.wings = m.flap; o.shown = MO.debug.blooms.group.visible; return o;`));
      t.eq(r.bee, [0, false, 0], 'a bee on the shut bud opens nothing and gets nothing'); t.eq(r.onWay, ['guide', 0], 'shut while the moth is on its way'); t.eq(r.landed, ['perch', true, 1], 'the moth lands and the bloom wakes');
      t.check(/night bloom opens/.test(r.toast), 'a message when the bee is near: ' + r.toast); t.eq(r.open, 1, 'the bloom is open 3 seconds later'); t.check(r.on < 0.6 && r.above > 0.5 && r.above < 1.6, `the moth sits on the bloom (${r.on} away, ${r.above} above its base)`);
      t.eq(r.wings, 0.12, 'it fans its wings slowly'); t.eq(r.shown, true, 'the bloom is drawn'); return r;
    } },

  { id: 'NGT-039-night-bloom-nectar', req: 'NGT-039', name: 'An open night bloom gives nectar worth 3 (4 on the highest hill), one time a night. The moth lifts off for the bee, then sits down again and stays',
    async run(t) {
      const r = await t.ev(run(`const f = HB[0], m = MO.list[0], o = { vals: HB.map(h => h.val) }; T.place(f.x + 14, f.y + 6, f.z + 10); MO.debug.lead(0, 0); T.sim(7);
        T.place(f.x, f.y + 3.2, f.z); T.key('ShiftLeft'); T.sim(3); T.key('ShiftLeft', false); o.load = P.load.slice(); o.toast = T.text('toast'); o.lift = +(m.p.y - f.y).toFixed(1); o.state = m.state; o.found = MO.found;
        T.place(f.x, f.y + 3.2, f.z); T.key('ShiftLeft'); T.sim(3); T.key('ShiftLeft', false); o.again = P.load.slice();
        T.place(f.x + 40, f.y + 20, f.z + 40); T.sim(6); o.back = +(m.p.y - f.y).toFixed(1); T.sim(40); o.late = m.state; o.stillOpen = f.open; o.noFlower = m.f === null; return o;`, 3));
      t.eq(r.vals, [3, 3, 4, 3], 'the worth of the four blooms'); t.eq(r.load, [3], 'the bee gets nectar worth 3'); t.check(/A night bloom/.test(r.toast), 'a message: ' + r.toast); t.eq(r.found, 1, 'one bloom found');
      t.check(r.lift > 2.5, 'the moth lifts off while the bee drinks: ' + r.lift + ' above'); t.eq(r.state, 'perch', 'it is not startled'); t.eq(r.again, [3], 'the bloom gives nothing a second time');
      t.check(r.back < 1.6, 'the moth sits down again: ' + r.back); t.eq([r.late, r.stillOpen, r.noFlower], ['perch', 1, true], 'it stays on its bloom and goes to no moonflower'); return r;
    } },

  { id: 'NGT-040-night-blooms-places', req: 'NGT-040', name: 'There are four night blooms at fixed places outside the locked zones. Each moth has its own. They are shut again the next night, and not there on the first night or in the day',
    async run(t) {
      const day = await t.ev(() => { T.fly(0, 40, 120); T.quiet(); T.sim(0.5); return NIGHT.moths.debug.blooms.group.visible; });
      const first = await t.ev(run(`T.sim(5); return MO.debug.blooms.group.visible;`, 1));
      await t.reopen();
      const r = await t.ev(run(`const o = {}, L = g.LOG, cap = g.shrooms.slice().sort((a, b) => b.R - a.R)[0], H = g.HILLS;
        o.n = HB.length; o.log = Math.hypot(HB[0].x - L.c.x, HB[0].z - L.c.z) < L.len / 2 && HB[0].y > L.c.y + L.ro; o.cap = Math.hypot(HB[1].x - cap.x, HB[1].z - cap.z) < 0.1 && HB[1].y > cap.y;
        o.hills = [Math.hypot(HB[2].x - H[0].x, HB[2].z - H[0].z), Math.hypot(HB[3].x - H[1].x, HB[3].z - H[1].z)].map(d => +d.toFixed(1)); o.free = HB.map(h => g.zoneBlocked(h.x, h.z));
        far(); MO.debug.put(0, 0); MO.debug.put(1, 1); T.sim(3); MF[0].nectar = 0.02; MF[1].nectar = 0.02; T.sim(2); const a = MO.list[0], b = MO.list[1]; o.states = [a.state, b.state]; o.own = a.hb !== b.hb && !!a.hb && !!b.hb;
        MO.debug.lead(0, 0); T.sim(7); o.open = HB[0].open; N.debug.end(); T.sim(1); o.dayShown = MO.debug.blooms.group.visible; g.DAY.n = 3; N.debug.begin(0.3, 2); o.next = HB.map(h => [h.open, h.woken, h.taken]); return o;`));
      t.eq([day, first], [false, false], 'nothing in the day or on the first night'); t.eq(r.n, 4, 'four night blooms'); t.eq([r.log, r.cap], [true, true], 'one on the fallen tree, one on the widest mushroom');
      t.eq(r.hills, [7, 7], 'two just behind hill tops'); t.eq(r.free, [false, false, false, false], 'none is in a locked zone'); t.eq(r.states, ['guide', 'guide'], 'two fed moths'); t.eq(r.own, true, 'each goes to its own bloom');
      t.eq(r.open, 1, 'a bloom opened that night'); t.eq(r.dayShown, false, 'not drawn after the night'); t.eq(r.next, [[0, false, false], [0, false, false], [0, false, false], [0, false, false]], 'the next night all four are shut again'); return r;
    } },

  { id: 'NGT-036-moths-off', req: 'NGT-036', name: 'With ?moths=0 or #moths-off there are no moths and the night is as before',
    open: { query: '?moths=0' },
    async run(t) {
      const a = await t.ev(() => { const g = __g; T.fly(0, 40, 120); T.quiet(); g.DAY.n = 3; NIGHT.debug.begin(0.3, 2); return { moths: typeof NIGHT.moths, active: NIGHT.active, open: NIGHT.moonflowers[0].open }; });
      t.eq(a, { moths: 'undefined', active: true, open: 1 }, 'query switch');
      await t.reopen({ query: '#moths-off' });
      const b = await t.ev(() => { const g = __g; T.fly(0, 40, 120); T.quiet(); g.DAY.n = 3; NIGHT.debug.begin(0.3, 2); return { moths: typeof NIGHT.moths, active: NIGHT.active }; });
      t.eq(b, { moths: 'undefined', active: true }, 'hash switch');
      return { a, b };
    } },
];
