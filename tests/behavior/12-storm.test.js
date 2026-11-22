// The storm (storm.js): a band of rain that crosses the land on some afternoons. Requirement IDs STM-001 to STM-010.
// STORM.debug.begin(T) starts a storm at second T. stay(x, y, z, secs) holds the bee at one place while time runs.
// spot names: 'open' = in the air over the meadow, between the hive and the flower field. timeIn(pa, d) = the second at which
// the rain front is d past the place whose distance along the storm's axis is pa.
const PRE = `const g = __g, S = STORM, P = g.P; T.fly(0, 40, 120); T.quiet();
  const stay = (x, y, z, secs, each) => { for (let i = 0; i < Math.round(secs * 10); i++) { T.place(x, y, z, P.yaw, P.pitch); T.sim(0.1); if (each) each(i / 10); } };
  const OPEN = (() => { const x = g.FDIR.x * 90, z = g.FDIR.z * 90; return [x, g.terrainH(x, z) + 12, z]; })();
  const along = (x, z) => x * S.ax + z * S.az, timeIn = (pa, d) => S.BREW + (400 - pa + d) / S.SPEED;
  const r2 = v => Math.round(v * 100) / 100;
  window.__land = (f, secs) => { T.place(f.sx, f.y + f.len + 1.5, f.sz); T.key('ShiftLeft'); T.sim(secs); T.key('ShiftLeft', false); };
`;
const run = body => new Function(PRE + body);
module.exports = [
  { id: 'STM-001-storm-days', req: 'STM-001', name: 'No storm on the first three days. On day 4, 7, 10 a storm starts to brew when the afternoon is two fifths gone',
    async run(t) {
      const r = await t.ev(run(`const o = { days: [] }; for (let n = 1; n <= 12; n++) if (S.isDay(n)) o.days.push(n);
        g.DAY.n = 3; g.DAY.t = 0.39; stay(...OPEN, 8); o.day3 = S.on; o.t3 = r2(g.DAY.t);
        g.DAY.n = 4; g.DAY.t = 0.39; stay(...OPEN, 4); o.before = S.on; stay(...OPEN, 4); o.day4 = S.on; o.toast = T.text('toast'); o.label = S.label(); o.shown = S.debug.view.group.visible;
        S.debug.end(); g.DAY.t = 0.39; stay(...OPEN, 8); o.again = S.on; return o;`));
      t.eq(r.days, [4, 7, 10], 'storm days'); t.eq([r.day3, r.t3 > 0.4], [false, true], 'day 3 passes that time with no storm');
      t.eq([r.before, r.day4], [false, true], 'day 4: it starts at that time'); t.check(/The air goes still/.test(r.toast), 'a message says so: ' + r.toast); t.eq(r.label, 'a storm is coming', 'the time of day says so');
      t.eq(r.again, false, 'one storm a day'); return r;
    } },

  { id: 'STM-002-brewing', req: 'STM-002', name: 'While it brews the air goes still, then the wind rises from the storm. The flowers shut before the first rain',
    async run(t) {
      const r = await t.ev(run(`const o = {}; S.debug.begin(0); const far = [S.ax * 330, S.az * 330];
        stay(...OPEN, 12); o.still = r2(g.WIND.s); o.closed12 = S.closed; o.rain12 = S.rainAt(...far);
        stay(...OPEN, 21); o.T = r2(S.T); o.blow = r2(g.WIND.s); o.from = r2(-(g.WIND.dx * S.ax + g.WIND.dz * S.az)); o.closed33 = S.closed; o.uClose = r2(g.U.uClose.value); o.rain33 = S.rainAt(...far); o.dark = S.dark > 0.1;
        const f = g.flowers.filter(f => f.val === 1 && !f.giant && !f.lily && !f.orch && !f.zone)[0]; f.cool = 0; __land(f, 2.5); o.pollen = P.pollen;
        S.T = 42; T.sim(0.1); o.rain42 = S.rainAt(...far); return o;`));
      t.check(r.still < 0.1, 'after 12 s the air is still: ' + r.still); t.eq([r.closed12, r.rain12], [false, 0], 'flowers still open, no rain yet');
      t.check(r.blow > 0.8 && r.from > 0.9, 'at 33 s the wind blows hard from the storm: ' + r.blow + ', ' + r.from); t.eq([r.closed33, r.uClose, r.rain33], [true, 1, 0], 'the flowers are shut and no rain has fallen yet');
      t.check(r.dark, 'the light has started to go'); t.eq(r.pollen, 0, 'a shut flower gives no pollen'); t.eq(r.rain42, 1, 'then rain falls at the far edge'); return r;
    } },

  { id: 'STM-003-rain-band', req: 'STM-003', name: 'The rain is a band that moves toward the hive side at 16 each second. It reaches the far field first and rains about 35 seconds at each place',
    async run(t) {
      const r = await t.ev(run(`const o = {}; S.debug.begin(35); stay(...OPEN, 10); o.front = Math.round(S.front); o.deep = Math.round(S.back - S.front);
        o.field = S.rainAt(S.ax * 300, S.az * 300); o.hive = S.rainAt(0, 0); const at = T2 => { S.T = T2; T.sim(0.1); return r2(S.rainAt(0, 0)); };
        o.h58 = at(58); o.h63 = at(63); o.h93 = at(93); o.h98 = at(98); o.axis = r2(S.ax * g.FDIR.x + S.az * g.FDIR.z); return o;`));
      t.near(r.front, 240, 3, 'after 10 s of rain the front has come 160'); t.eq(r.deep, 560, 'the band is 560 deep'); t.eq([r.field, r.hive], [1, 0], 'it rains on the far field, not yet at the hive');
      t.eq([r.h58, r.h63, r.h93, r.h98], [0, 1, 1, 0], 'at the hive tree it rains from about second 60 to second 95'); t.check(r.axis > 0.85, 'it comes from beyond the flower field: ' + r.axis); return r;
    } },

  { id: 'STM-004-open-rain', req: 'STM-004', name: 'A bee cannot fly in rain: in open rain the wings soak in about 4 seconds and the bee comes down. It can walk, and flutter no higher than the grass tops. No pollen is lost. Over the pond the wings never get that heavy',
    async run(t) {
      const r = await t.ev(run(`const o = {}, alt = () => r2(P.pos.y - g.terrainH(P.pos.x, P.pos.z)); S.debug.begin(0); S.T = timeIn(along(OPEN[0], OPEN[2]), 60); P.load = [1, 1, 1, 1]; P.pollen = 4;
        T.place(OPEN[0], OPEN[1] + 18, OPEN[2]); T.key('Space'); T.sim(2); o.soak2 = r2(P.soak); o.roof = S.roof; o.rain = r2(S.rain); o.exposed = S.exposed; o.t1 = T.text('toast'); T.sim(2.5); o.soak4 = r2(P.soak); o.wet = r2(P.wet); o.top = alt();
        T.sim(8); o.t2 = T.text('toast'); o.flutter = alt(); o.downs = S.downs; T.key('Space', false); T.sim(3); o.down = alt(); const x0 = P.pos.x, z0 = P.pos.z; T.key('KeyW'); T.sim(3); T.key('KeyW', false);
        o.walked = r2(Math.hypot(P.pos.x - x0, P.pos.z - z0)); o.low = alt(); T.key('Space'); T.sim(1.5); T.key('Space', false); o.hop = alt(); o.pollen = P.pollen; o.washed = S.washed; o.label = S.label();
        const W = g.POND; S.debug.begin(0); S.T = timeIn(along(W.x, W.z), 100); P.soak = 0; stay(W.x, g.WY + 12, W.z, 6); o.pond = [r2(S.rain), S.exposed, P.soak <= 0.5 && P.soak >= 0.4]; return o;`));
      t.eq([r.roof, r.rain, r.exposed], [false, 1, true], 'the bee is out in the rain'); t.check(/Rain!/.test(r.t1) && /cannot fly in rain/.test(r.t1), 'a message gives the rule: ' + r.t1);
      t.near(r.soak2, 0.5, 0.06, 'half soaked after 2 seconds'); t.eq(r.soak4, 1, 'soaked after 4.5 seconds'); t.check(r.wet <= 0.75, 'the wings are not as wet as from the pond: ' + r.wet);
      t.check(r.flutter > 4 && r.flutter < 10, `with the rise key held, the bee still comes down to the grass tops (from ${r.top} to ${r.flutter} above the ground)`); t.check(/too wet to fly/.test(r.t2), 'a message: ' + r.t2); t.eq(r.downs, 1, 'counted one time');
      t.check(r.down < 1.5, 'without the key it is on the ground: ' + r.down); t.check(r.walked > 8 && r.walked < 30 && r.low < 1.5, `it walks on the ground: ${r.walked} in 3 s, ${r.low} high`); t.check(r.hop > 3 && r.hop < 10, 'the rise key lifts it over the grass again: ' + r.hop);
      t.eq([r.pollen, r.washed], [4, 0], 'no pollen is lost'); t.eq(r.label, 'rain', 'the time of day says rain'); t.eq(r.pond, [1, true, true], 'over the pond the wings stay light enough to reach the shore'); return r;
    } },

  { id: 'STM-011-wings-dry', req: 'STM-011', name: 'Soaked wings dry in about 2.5 seconds under a roof, and the bee can fly again. They also dry when the rain has passed or the storm is over',
    async run(t) {
      const r = await t.ev(run(`const o = {}, sh = g.shrooms.slice().sort((a, b) => (b.y - b.gy) - (a.y - a.gy))[0], spot = [sh.x, sh.y - 1.3, sh.z]; S.debug.begin(0); S.T = timeIn(along(sh.x, sh.z), 100);
        P.soak = 1; stay(...spot, 1); o.one = r2(P.soak); o.roof = S.roof; stay(...spot, 1.8); o.dry = P.soak; o.hint = T.text('hint'); o.t = T.text('toast');
        S.T = timeIn(along(OPEN[0], OPEN[2]), 100); T.place(...OPEN); P.soak = 0; T.key('Space'); T.sim(1); T.key('Space', false); o.rise = r2(P.pos.y - OPEN[1]); o.again = r2(P.soak);
        S.debug.begin(0); S.T = timeIn(along(OPEN[0], OPEN[2]), S.WIDTH + 80); P.soak = 1; stay(...OPEN, 3); o.passed = [r2(S.rain), P.soak];
        S.debug.begin(0); S.T = timeIn(along(OPEN[0], OPEN[2]), 60); P.soak = 1; S.debug.end(); stay(...OPEN, 3); o.over = [S.on, P.soak]; return o;`));
      t.eq(r.roof, true, 'under the mushroom'); t.near(r.one, 0.6, 0.05, 'drier after 1 second'); t.eq(r.dry, 0, 'dry after 2.8 seconds'); t.check(/wings are dry/.test(r.hint), 'a short note: ' + r.hint); t.check(/Dry under here/.test(r.t), 'and a message under the first roof: ' + r.t);
      t.check(r.rise > 2 && r.again > 0.15 && r.again < 0.35, `out in the rain again it can fly at first (rose ${r.rise} in 1 s) and the wings soak again (${r.again})`);
      t.eq(r.passed, [0, 0], 'when the rain has passed the wings dry in the open'); t.eq(r.over, [false, 0], 'and when the storm is over'); return r;
    } },

  { id: 'STM-005-roofs', req: 'STM-005', name: 'Under a roof the bee stays dry and keeps its pollen: the hive, the crown of the hive tree, a tree, a mushroom, the old log, the bramble hollow',
    async run(t) {
      const r = await t.ev(run(`const o = {}, sh = g.shrooms.slice().sort((a, b) => (b.y - b.gy) - (a.y - a.gy))[0], ft = g.forestTrees[0], L = g.LOG, H = g.HOLLOW;
        const spots = { hive: [0, 12, -5.1], homeCrown: [30, g.terrainH(30, 8) + 6, 8], tree: [ft.x + ft.R + 3, ft.gy + 5, ft.z], mushroom: [sh.x, sh.y - 1.3, sh.z], log: [L.c.x, L.c.y, L.c.z], hollow: [H.x, g.terrainH(H.x, H.z) + 3, H.z] };
        for (const k in spots) { const p = spots[k]; S.debug.begin(0); S.T = timeIn(along(p[0], p[2]), 100); P.wet = 0; P.load = k === 'hive' ? [] : [1, 1]; P.pollen = P.load.length;
          stay(...p, 10); o[k] = [r2(S.rain), S.roof, S.exposed, r2(P.wet) + (P.soak || 0), P.pollen, S.washed]; if (k === 'mushroom') o.hint = T.text('hint'); }
        S.debug.begin(0); S.T = timeIn(0, -30); stay(0, 12, -5.1, 4); o.home = T.text('toast'); return o;`));
      for (const k of ['homeCrown', 'tree', 'mushroom', 'log', 'hollow']) t.eq(r[k], [1, true, false, 0, 2, 0], k + ': rain, roof, not out in it, dry wings, pollen kept');
      t.eq(r.hive, [1, true, false, 0, 0, 0], 'the hive'); t.check(/Home and dry/.test(r.home), 'a bee that is in the hive when the rain gets there is told so: ' + r.home); return r;
    } },

  { id: 'STM-006-after', req: 'STM-006', name: 'When the rain has passed the flowers open, full again, the light and the wind come back, a rainbow stands for about 75 seconds, and then no trace is left',
    async run(t) {
      const r = await t.ev(run(`const o = {}; S.debug.begin(0); const pa = along(OPEN[0], OPEN[2]); S.T = timeIn(pa, 560) - 1; g.flowers.slice(0, 40).forEach(f => f.cool = 20); P.wet = 0.7;
        stay(...OPEN, 2); o.closedIn = S.closed; stay(...OPEN, 14); o.closed = S.closed; o.full = g.flowers.every(f => !(f.cool > 0)); o.toast = T.text('toast'); o.dark = r2(S.dark); o.bow = r2(S.bow.k); o.wet = r2(P.wet);
        o.footOnFlower = g.flowers.some(f => f.x === S.bow.foot.x && f.z === S.bow.foot.z); o.span = Math.round(Math.hypot(S.bow.x - S.bow.foot.x, S.bow.z - S.bow.foot.z)); o.label = S.label();
        stay(...OPEN, 20); o.wind = r2(S.windK); o.label2 = S.label(); o.T = Math.round(S.bow.T); S.bow.T = 74; stay(...OPEN, 10); o.fading = S.on && S.bow.k < 0.6; stay(...OPEN, 5); o.on = S.on;
        const u = g.U.uStorm.value, u2 = g.U.uStorm2.value; o.uniforms = [u.w, u2.x, u2.y, u2.z]; o.shown = S.debug.view.group.visible; T.sim(1); o.uClose = g.U.uClose.value; o.windS = g.WIND.s <= 1; return o;`));
      t.eq([r.closedIn, r.closed, r.full], [true, false, true], 'shut in the rain, then open and full'); t.check(/The rain has passed/.test(r.toast), 'a message: ' + r.toast);
      t.check(r.dark < 0.05, 'the light is back: ' + r.dark); t.check(r.bow > 0.5, 'the rainbow is up: ' + r.bow); t.check(r.wet < 0.1, 'the wings have dried: ' + r.wet);
      t.eq([r.footOnFlower, r.span], [true, 130], 'one foot of the rainbow stands on a flower of the field'); t.eq(r.label, 'the rain has passed', 'the time of day says so');
      t.eq([r.wind, r.label2], [0, ''], 'later the wind and the time of day are the day\'s own again'); t.eq([r.fading, r.on], [true, false], 'the rainbow fades after about 75 s and the storm is over');
      t.eq([r.uniforms, r.shown, r.uClose, r.windS], [[0, 0, 0, 0], false, 0, true], 'no trace is left'); return r;
    } },

  { id: 'STM-007-rainbow-foot', req: 'STM-007', name: 'Near the foot of the rainbow the next harvests are worth 1 more, at most 5 times',
    async run(t) {
      const r = await t.ev(run(`const o = {}; S.debug.begin(0); S.T = timeIn(along(OPEN[0], OPEN[2]), 560) + 22; stay(...OPEN, 8); o.bow = r2(S.bow.k); const B = S.bow;
        const plain = g.flowers.filter(f => f.val === 1 && !f.giant && !f.lily && !f.orch && !f.zone), near = plain.filter(f => Math.hypot(f.x - B.foot.x, f.z - B.foot.z) < 20), far = plain.filter(f => Math.hypot(f.x - B.foot.x, f.z - B.foot.z) > 60)[0];
        o.nearN = near.length; P.load = []; P.pollen = 0; near[0].cool = 0; __land(near[0], 2.5); o.near = P.load.slice(); o.toast = T.text('toast'); o.given = B.given;
        far.cool = 0; __land(far, 2.5); o.far = P.load.slice(); B.given = 5; near[0].cool = 0; __land(near[0], 2.5); o.sixth = P.load.slice(); return o;`));
      t.check(r.bow > 0.5, 'the rainbow is up: ' + r.bow); t.eq([r.near, r.given], [[2], 1], 'a value 1 flower at the foot gives 2'); t.check(/rainbow's foot/.test(r.toast), 'a message: ' + r.toast);
      t.eq(r.far, [2, 1], 'a flower far from the foot gives its own value'); t.eq(r.sixth, [2, 1, 1], 'after 5 the foot gives no more'); return r;
    } },

  { id: 'STM-008-hiding-and-lightning', req: 'STM-008', name: 'In the storm the wasps stay in and no flower overflows. Lightning is light and sound only: it never falls near the bee and takes nothing',
    async run(t) {
      const r = await t.ev(run(`const o = {}, p = [30, g.terrainH(30, 8) + 6, 8]; g.wasps.forEach(w => { w.p.copy(w.home); w.state = 'patrol'; w.gone = 0; });
        S.debug.begin(0); S.T = 45; P.load = [1, 1]; P.pollen = 2; let minD = 1e9, maxF = 0, seen = 0, last = 0;
        stay(...p, 40, () => { maxF = Math.max(maxF, S.flash); if (S.bolt && S.bolt.seed !== last) { last = S.bolt.seed; seen++; minD = Math.min(minD, Math.hypot(S.bolt.x - P.pos.x, S.bolt.z - P.pos.z)); const u = S.bolt.x * S.ax + S.bolt.z * S.az; if (u < S.front || u > S.back) o.outside = true; } });
        o.bolts = seen; o.minD = Math.round(minD); o.maxF = r2(maxF); o.wasps = g.wasps.every(w => w.gone > 0); o.rich = g.flowers.filter(f => f.rich > 0).length; o.pollen = P.pollen; o.outside = !!o.outside; return o;`));
      t.check(r.bolts >= 3 && r.bolts <= 12, 'lightning every few seconds: ' + r.bolts + ' in 40 s'); t.check(r.minD >= 60, 'never close to the bee: ' + r.minD); t.eq(r.outside, false, 'always inside the rain');
      t.check(r.maxF > 0.3 && r.maxF <= 1, 'its light: ' + r.maxF); t.eq([r.wasps, r.rich, r.pollen], [true, 0, 2], 'wasps in, no overflowing flower, pollen kept'); return r;
    } },

  { id: 'STM-009-switches', req: 'STM-009', name: 'With ?storm=0 or #storm-off there is no storm. With #storm-now one starts 15 seconds after the bee flies out',
    open: { query: '?storm=0' },
    async run(t) {
      const a = await t.ev(() => typeof window.STORM); await t.reopen({ query: '#storm-off' }); const b = await t.ev(() => typeof window.STORM);
      await t.reopen({ query: '#storm-now' });
      const c = await t.ev(run(`const o = {}; o.day = g.DAY.n; stay(...OPEN, 14); o.at14 = S.on; stay(...OPEN, 2); o.at16 = S.on; S.debug.end(); stay(...OPEN, 20); o.again = S.on; return o;`));
      t.eq([a, b], ['undefined', 'undefined'], 'switched off'); t.eq(c, { day: 1, at14: false, at16: true, again: false }, '#storm-now on day 1: one storm, 15 s after flying out');
      return { a, b, c };
    } },

  { id: 'STM-010-day-untouched', req: 'STM-010', name: 'On a day without a storm the game plays exactly as with the storm switched off (same positions, same random numbers)',
    async run(t) {
      const script = () => { const g = __g; T.fly(60, 10, 40); g.DAY.t = 0.38; T.key('KeyW'); T.sim(20); g.P.yaw = 2; T.sim(20); T.key('KeyW', false);
        return [g.P.pos.x, g.P.pos.y, g.P.pos.z, g.wasps.map(w => w.p.x + w.p.z), g.DAY.t, g.WIND.s, g.U.uClose.value, Math.random()]; };
      const on = await t.ev(script); const there = await t.ev(() => typeof window.STORM); await t.reopen({ query: '?storm=0' }); const off = await t.ev(script);
      t.eq(there, 'object', 'the storm is loaded'); t.eq(on, off, 'state after 40 seconds of day flight past the storm\'s hour'); return on;
    } },
];
