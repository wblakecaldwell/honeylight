// The night (night.js): moon clock, moonflowers, fireflies, the hollow grove. Requirement IDs NGT-xxx.
// NIGHT.debug.begin(t, settle) jumps into the night. autoFly(routeIndex) is in tests/night-helpers.js.
const night = `T.fly(60, 10, 40); T.quiet(); NIGHT.debug.begin(0.3, 2); const N = NIGHT, g = __g, P = g.P;`;
const run = body => new Function(night + body);
module.exports = [
  { id: 'NGT-001-night-starts', req: 'NGT-001', name: 'At dusk the day does not end: night falls, the moon is the clock, wasps sleep',
    async run(t) {
      const r = await t.ev(() => { const g = __g; T.fly(60, 10, 40); g.gainHoney(25); g.openZone('garden'); g.DAY.t = 0.999; T.sim(2); const N = NIGHT, o = { active: N.active, mode: g.P.mode, day: g.DAY.n, toast: T.text('toast') };
        T.sim(12); o.k = N.k; o.night = g.U.uNight.value; o.closed = g.U.uClose.value; o.waspsOut = g.wasps.filter(w => !(w.gone > 0)).length; o.hud = T.text('hud'); o.t = +N.t.toFixed(3); o.moonUp = g.U.uSun.value.y > 0; return o; });
      t.eq(r.active, true, 'the night is active'); t.eq(r.mode, 'fly', 'the bee still flies'); t.eq(r.day, 1, 'the day counter has not moved');
      t.check(/Night falls/.test(r.toast), 'a night message shows: ' + r.toast); t.eq(r.night, 1, 'the sky is in night mode'); t.eq(r.closed, 1, 'day flowers are closed');
      t.eq(r.waspsOut, 0, 'no wasp is out'); t.check(/night: the moon is rising/.test(r.hud), 'the HUD shows the moon as the clock: ' + r.hud); t.check(r.moonUp, 'the moon is above the horizon');
      return r;
    } },

  { id: 'NGT-025-moonset', req: 'NGT-025', name: 'When the moon sets the night ends: day card, pollen outside is lost, morning comes',
    async run(t) {
      const r = await t.ev(run(`P.load = [1, 1]; P.pollen = 2; const o = { len: N.LEN }; N.t = 0.86; T.sim(1); o.warn = T.text('toast'); N.t = 0.999; T.sim(1.5); o.active = N.active; o.mode = P.mode; o.card = T.text('dayfade');
        T.sim(10); o.day = g.DAY.n; o.mode2 = P.mode; o.pollen = P.pollen; o.night = g.U.uNight.value; o.lamp = g.U.uLamp.value.w; o.done = N.done; T.sim(1); o.ready = !N.done && !N.active; return o;`));
      t.eq(r.len, 240, 'the night is 240 seconds'); t.check(/moon is sinking/.test(r.warn), 'a warning before moonset: ' + r.warn);
      t.eq(r.active, false, 'the night is over'); t.eq(r.mode, 'rest', 'the bee rests'); t.check(/The moon sets on day 1/.test(r.card), 'the card names the moonset: ' + r.card); t.check(/2 pollen left outside/.test(r.card), 'ZON-004: pollen outside is lost');
      t.eq(r.day, 2, 'the next day starts'); t.eq(r.mode2, 'fly', 'the bee flies in the morning'); t.eq(r.pollen, 0, 'baskets are empty'); t.eq(r.night, 0, 'day sky'); t.eq(r.lamp, 0, 'no firefly light'); t.check(r.ready, 'the night can come again the next dusk');
      return r;
    } },

  { id: 'NGT-004-sleep', req: 'NGT-004', name: 'Resting in the hive with empty baskets for 15 seconds sleeps until morning',
    async run(t) {
      const r = await t.ev(run(`T.place(0, 12, -5.1); const o = {}; T.sim(6); o.hint = T.text('hint'); o.active6 = N.active; T.sim(8); o.active14 = N.active; T.sim(2); o.active16 = N.active; o.mode = P.mode; o.card = T.text('dayfade'); T.sim(10); o.day = g.DAY.n; return o;`));
      t.check(/sleep until morning/.test(r.hint), 'a hint says how to sleep: ' + r.hint); t.eq([r.active6, r.active14, r.active16], [true, true, false], 'the night ends after 15 s of rest'); t.eq(r.mode, 'rest', 'the bee sleeps');
      t.check(/Night falls on day 1/.test(r.card), 'the usual day card: ' + r.card); t.eq(r.day, 2, 'morning of day 2');
      return r;
    } },

  { id: 'NGT-011-moonflower', req: 'NGT-011', name: 'A meadow moonflower gives nectar from the top after a hold, one time each night; by day it is not there',
    async run(t) {
      const day = await t.ev(() => { T.fly(60, 10, 40); T.quiet(); const f = NIGHT.moonflowers[0], P = __g.P; T.place(f.x, f.y + 2.2, f.z); T.key('ShiftLeft'); T.sim(3); T.key('ShiftLeft', false); return { below: P.pos.y < f.y, pollen: P.pollen }; });
      t.check(day.below, 'by day the bee sinks through the place: nothing is there'); t.eq(day.pollen, 0, 'no nectar by day');
      await t.reopen();
      const r = await t.ev(run(`const f = N.moonflowers[0], o = { val: f.val, open: f.open };
        T.place(f.x + 6, f.y - 3, f.z); T.lookAt(f.x + 6, f.y - 3, f.z, f.x, f.y - 3, f.z); T.key('KeyW'); T.sim(2); T.key('KeyW', false); o.stemStops = Math.hypot(P.pos.x - f.x, P.pos.z - f.z) > 0.4; o.under = P.pollen;
        T.place(f.x, f.y + 3.2, f.z); T.key('ShiftLeft'); T.sim(0.6); o.early = P.pollen; T.sim(1.6); T.key('ShiftLeft', false); o.pollen = P.pollen; o.load = P.load.slice(); o.toast = T.text('toast'); o.taken = f.taken;
        T.place(f.x, f.y + 3.2, f.z); T.key('ShiftLeft'); T.sim(3); T.key('ShiftLeft', false); o.again = P.pollen; return o;`));
      t.eq(r.val, 2, 'a meadow moonflower is worth 2'); t.eq(r.open, 1, 'it is open at night'); t.check(r.stemStops, 'the stem is solid'); t.eq(r.under, 0, 'FLW-001: nothing from below');
      t.eq(r.early, 0, 'it needs a hold'); t.eq(r.load, [2], 'one load worth 2'); t.check(/moonflower/i.test(r.toast), 'a message names it: ' + r.toast); t.eq(r.again, 1, 'one time each night');
      return r;
    } },

  { id: 'NGT-017-wake-and-pass', req: 'NGT-017', name: 'Flying through a sleeping cluster wakes it; each loop passed bursts and adds three fireflies to the tail',
    async run(t) {
      const r = await t.ev(run(`const R = N.routes[0], o = { asleep: R.state, shown: R.flies.filter(q => q.b > 0.3).length };
        T.place(R.start.x, R.start.y, R.start.z); T.sim(0.2); o.woke = R.state; o.chain = N.chain === R; o.onLoop = R.flies.filter(q => q.role === 2 && q.L === R.loops[0]).length; o.hint = T.text('hint');
        const L = R.loops[0]; T.lookAt(L.c.x - L.n.x * 6, L.c.y - L.n.y * 6, L.c.z - L.n.z * 6, L.c.x, L.c.y, L.c.z); T.key('KeyW'); T.sim(1.2); T.key('KeyW', false);
        o.k = R.k; o.tail = N.tail; o.lamp = +N.lamp.toFixed(3); o.lampOn = g.U.uLamp.value.w > 0; o.others = N.routes.filter(q => q.state !== 'asleep').length; return o;`));
      t.eq(r.asleep, 'asleep', 'the cluster sleeps'); t.check(r.shown >= 20, 'a sleeping cluster shows its fireflies: ' + r.shown); t.eq(r.woke, 'awake', 'it wakes when the bee flies through it'); t.eq(r.onLoop, 18, 'eighteen fireflies make the first loop');
      t.eq(r.k, 1, 'one loop passed'); t.eq(r.tail, 3, 'three fireflies in the tail'); t.check(r.lampOn, 'the tail gives light'); t.eq(r.others, 1, 'only one chain at a time');
      return r;
    } },

  { id: 'NGT-018-miss', req: 'NGT-018', name: 'If the bee does not reach the next loop in time the fireflies drift back: no penalty, and the cluster can wake again',
    async run(t) {
      const r = await t.ev(run(`const R = N.routes[0], o = {}; P.load = [1, 1, 1]; P.pollen = 3; g.gainHoney(5); T.place(R.start.x, R.start.y, R.start.z); T.sim(0.2);
        const L = R.loops[0]; T.lookAt(L.c.x - L.n.x * 6, L.c.y - L.n.y * 6, L.c.z - L.n.z * 6, L.c.x, L.c.y, L.c.z); T.key('KeyW'); T.sim(1.2); T.key('KeyW', false); o.tail = N.tail;
        T.place(R.start.x - 40, R.start.y + 5, R.start.z - 40); T.sim(R.secs + 1); o.state = R.state; o.tail2 = N.tail; o.chain = N.chain === null; o.pollen = P.pollen; o.honey = g.G.honey; T.sim(8); o.lamp = g.U.uLamp.value.w;
        T.sim(4); T.place(R.start.x, R.start.y, R.start.z); T.sim(0.2); o.again = R.state; return o;`));
      t.eq(r.tail, 3, 'a tail after one loop'); t.eq(r.state, 'asleep', 'the chain ends when time runs out'); t.eq(r.tail2, 0, 'the tail scatters'); t.eq([r.pollen, r.honey], [3, 5], 'nothing is taken from the bee');
      t.eq(r.lamp, 0, 'the light fades out'); t.eq(r.again, 'awake', 'the cluster wakes again');
      return r;
    } },

  ...[0, 1, 2].map(i => ({ id: 'NGT-022-route-' + ['field', 'stone', 'arches'][i], req: 'NGT-022', name: `The ${['field', 'stone', 'arch'][i]} way can be flown: every loop, the root, and the hollow wakes`,
    async run(t) {
      const r = await t.ev(new Function(night + `const R = N.routes[${i}], o = { name: R.name, loops: R.loops.length, grove0: N.moonflowers.filter(f => f.grove).map(f => f.open) }; const a = autoFly(${i}, 60);
        o.lit = N.groveLit; o.state = R.state; o.k = R.k; o.tail = N.tail; o.secs = a.log[a.log.length - 1][1]; o.toast = a.toast; T.sim(4); o.grove = N.moonflowers.filter(f => f.grove).map(f => +f.open.toFixed(2));
        const f = N.moonflowers.find(f => f.grove); P.load = []; P.pollen = 0; T.place(f.x, f.y + 3.2, f.z); T.key('ShiftLeft'); T.sim(3); T.key('ShiftLeft', false); o.load = P.load.slice();
        T.place(0, 12, -5.1); T.sim(0.3); o.tailHome = N.tail; return o;`));
      t.eq(r.grove0, [0, 0, 0, 0, 0], 'the grove is shut before the fireflies come'); t.eq(r.lit, true, 'the hollow wakes'); t.eq(r.k, r.loops, 'every loop was passed'); t.eq(r.tail, r.loops * 3, 'three fireflies joined at each loop');
      t.check(/hollow wakes/i.test(r.toast), 'a message: ' + r.toast); t.eq(r.grove, [1, 1, 1, 1, 1], 'the five grove moonflowers open'); t.eq(r.load, [4], 'a grove moonflower is worth 4'); t.eq(r.tailHome, 0, 'the tail leaves at the hive door');
      return r;
    } })),

  { id: 'NGT-029-routes-clear', req: 'NGT-029', name: 'No loop stands inside something solid or inside a locked zone, and loops are never tiny',
    async run(t) {
      const r = await t.ev(run(`const bad = [], v = new g.THREE.Vector3(), p = new g.THREE.Vector3(); let minR = 9;
        for (const R of N.routes) R.loops.forEach((L, i) => { minR = Math.min(minR, L.r); const last = i === R.loops.length - 1;
          for (let k = -1; k < 8; k++) { const rr = k < 0 ? 0 : L.r * 0.85, a = k * Math.PI / 4; p.copy(L.c).addScaledVector(L.ux, Math.cos(a) * rr).addScaledVector(L.uy, Math.sin(a) * rr); const q = p.clone(); g.collide(q, v.set(0, 0, 0));
            if (q.distanceTo(p) > 0.05 && !(last && k >= 0)) bad.push([R.name, i, k, +q.distanceTo(p).toFixed(2)]); if (p.y < g.terrainH(p.x, p.z) + 0.5) bad.push([R.name, i, k, 'ground']); }
          if (g.zoneBlocked(L.c.x, L.c.z)) bad.push([R.name, i, 'zone']); });
        return { bad, minR: +minR.toFixed(2), n: N.routes.map(R => R.loops.length) };`));
      t.eq(r.bad, [], 'all loops are clear'); t.check(r.minR >= 1.7, 'the smallest loop has radius ' + r.minR); return r;
    } },

  { id: 'NGT-026-switch-off', req: 'NGT-026', name: 'With ?night=0 there is no night: dusk ends the day as before',
    open: { query: '?night=0' },
    async run(t) {
      const r = await t.ev(() => { const g = __g; T.fly(60, 10, 40); T.quiet(); g.DAY.t = 0.999; T.sim(3); return { night: typeof window.NIGHT, mode: g.P.mode, uNight: g.U.uNight.value, lamp: g.U.uLamp.value.w }; });
      t.eq(r, { night: 'undefined', mode: 'rest', uNight: 0, lamp: 0 }, 'no night'); return r;
    } },
  { id: 'NGT-026-switch-off-hash', req: 'NGT-026', name: 'With #night-off at the end of the address there is no night',
    open: { query: '#night-off' },
    async run(t) {
      const r = await t.ev(() => { const g = __g; T.fly(60, 10, 40); T.quiet(); g.DAY.t = 0.999; T.sim(3); return { night: typeof window.NIGHT, mode: g.P.mode }; });
      t.eq(r, { night: 'undefined', mode: 'rest' }, 'no night'); return r;
    } },

  { id: 'NGT-027-day-untouched', req: 'NGT-027', name: 'With the night switched on, the day plays exactly as with it off (same positions, same random numbers)',
    async run(t) {
      const script = () => { const g = __g; T.fly(60, 10, 40); g.DAY.t = 0.3; T.key('KeyW'); T.sim(20); g.P.yaw = 2; T.sim(20); T.key('KeyW', false);
        return [g.P.pos.x, g.P.pos.y, g.P.pos.z, g.wasps.map(w => w.p.x + w.p.z), g.DAY.t, Math.random()]; };
      const on = await t.ev(script); await t.reopen({ query: '?night=0' }); const off = await t.ev(script);
      t.eq(on, off, 'state after 40 seconds of day flight'); return on;
    } },
];
