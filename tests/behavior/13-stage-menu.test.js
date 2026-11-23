// The try-out menu (stage-menu.js): a day field, a list that jumps to a stage and a checkbox that opens all zones. Requirement IDs TRY-001 to TRY-005.
// pick(id) uses the real list on the page; tick(on) uses the real checkbox.
const PRE = `const g = __g, P = g.P, N = NIGHT, S = STORM, sel = document.getElementById('stagepick'), chk = document.getElementById('allzones');
  const num = document.getElementById('daypick'), setDay = n => { num.value = n; num.dispatchEvent(new Event('change')); };
  const pick = id => { sel.value = id; sel.dispatchEvent(new Event('change')); }, tick = on => { chk.checked = on; chk.dispatchEvent(new Event('change')); };
  const stay = secs => { const x = P.pos.x, y = P.pos.y, z = P.pos.z; for (let i = 0; i < Math.round(secs * 10); i++) { T.place(x, y, z, P.yaw, P.pitch); T.sim(0.1); } };
  const state = () => ({ mode: P.mode, day: g.DAY.n, t: Math.round(g.DAY.t * 100) / 100, night: N.active, moths: N.active ? N.moths.count : 0, bat: N.active && N.bat.on, storm: S.on });
`;
const run = body => new Function(PRE + body);
const ON = { query: '?menu=1' }; // the menu is hidden unless asked for
module.exports = [
  { id: 'TRY-001-menu', open: ON, req: 'TRY-001', name: 'A small menu at the top right lists the stages and has a checkbox for the zones. It is there only with ?menu=1 or #menu-on. Unused, it changes nothing',
    async run(t) {
      const a = await t.ev(run(`return { box: !!document.getElementById('stagemenu'), stages: [...sel.options].map(o => o.value).filter(Boolean), labels: [...sel.options].map(o => o.text), checked: chk.checked, dayField: num.value, right: document.getElementById('stagemenu').style.right };`));
      t.eq(a.box, true, 'the menu is on the page'); t.eq(a.stages, ['day', 'storm', 'rain', 'bow', 'dusk', 'night1', 'night2', 'night3', 'night4'], 'the stages');
      t.eq(a.labels[8], 'Night 3: three moths and the bat', 'a label'); t.eq([a.checked, a.dayField], [false, '1'], 'the zones box starts clear and the day field shows day 1');
      const script = () => { const g = __g; T.fly(60, 10, 40); g.DAY.t = 0.3; T.key('KeyW'); T.sim(20); g.P.yaw = 2; T.sim(20); T.key('KeyW', false); return [g.P.pos.x, g.P.pos.y, g.P.pos.z, g.DAY.t, JSON.stringify(g.G.zones), Math.random()]; };
      const there = () => [typeof window.STAGES, !!document.getElementById('stagemenu')];
      await t.reopen(ON); const on = await t.ev(script); await t.reopen(); const off = await t.ev(script); const none = await t.ev(there);
      await t.reopen({ query: '?menu=0' }); const zero = await t.ev(there); await t.reopen({ query: '#menu-on' }); const hash = await t.ev(() => !!document.getElementById('stagemenu'));
      t.eq(none, ['undefined', false], 'with no flag there is no menu'); t.eq(zero, ['undefined', false], 'with ?menu=0 there is no menu'); t.eq(hash, true, 'with #menu-on the menu is there');
      t.eq(on, off, 'an unused menu changes nothing in 40 seconds of flight'); return a;
    } },

  { id: 'TRY-002-jump-from-start', open: ON, req: 'TRY-002', name: 'A stage picked on the title screen skips the hatching: the bee is in the air outside the hive and the stage starts. A night stage sets the day to its number',
    async run(t) {
      const r = await t.ev(run(`const o = { before: P.mode }; pick('night3'); o.picked = sel.value; o.title = document.getElementById('title').style.display; o.at = state(); o.outside = !g.inHive && Math.hypot(P.pos.x, P.pos.z) > 30;
        o.moon = N.t >= 0.12; stay(12); o.bat = N.bat.state !== 'roost'; o.mothOut = N.moths.list.some(m => m.state !== 'away'); o.day = g.DAY.n; o.field = num.value; o.saved = T.save().day.n; return o;`));
      t.eq(r.before, 'title', 'the game was on its title screen'); t.eq([r.picked, r.title], ['', 'none'], 'the list goes back to its first line and the title is gone');
      t.eq(r.at, { mode: 'fly', day: 3, t: 1, night: true, moths: 3, bat: true, storm: false }, 'night 3: it is day 3, flying, three moths, the bat'); t.eq(r.outside, true, 'outside the hive');
      t.eq([r.moon, r.bat, r.mothOut], [true, true, true], 'the moon is up, and within 12 seconds the bat flies and a moth is out'); t.eq([r.day, r.field, r.saved], [3, '3', 3], 'the day is 3 in the game, in the day field and in the save'); return r;
    } },

  { id: 'TRY-003-jump-between', open: ON, req: 'TRY-003', name: 'Each stage can be picked from any other: a night ends for a storm, a storm ends for an afternoon, and so on',
    async run(t) {
      const r = await t.ev(run(`const o = {}; T.fly(0, 40, 120); T.quiet(); const fx = g.FDIR.x * 90, fz = g.FDIR.z * 90; T.place(fx, g.terrainH(fx, fz) + 12, fz); T.sim(0.1);
        pick('night4'); stay(1); o.night4 = state(); pick('storm'); stay(1); o.storm = state(); o.stormT = Math.round(S.T); o.uNight = g.U.uNight.value; o.toast = T.text('toast');
        pick('rain'); stay(1); o.rainT = Math.round(S.T); o.closed = S.closed; pick('bow'); stay(8); o.bow = S.bow.k > 0.3; o.open = !S.closed; o.past = S.past > 4;
        pick('night1'); stay(1); o.night1 = state(); pick('night2'); stay(1); o.night2 = state();
        pick('dusk'); stay(1); o.dusk = state(); o.shut = g.U.uClose.value > 0.1; pick('day'); stay(1); o.dayS = state(); o.clean = [g.U.uNight.value, g.U.uStorm.value.w, g.U.uClose.value];
        g.DAY.n = 5; pick('storm'); o.storm5 = g.DAY.n; pick('day');
        g.DAY.ending = 1; pick('night3'); o.refused = !N.active; g.DAY.ending = 0; return o;`));
      const st = (day, t, o = {}) => ({ mode: 'fly', day, t, night: false, moths: 0, bat: false, storm: false, ...o });
      t.eq(r.night4, st(4, 1, { night: true, moths: 4, bat: true }), 'night 4 is day 4'); t.eq(r.storm, st(4, 0.42, { storm: true }), 'then a storm: the night is over, and day 4 is a storm day'); t.eq([r.stormT, r.uNight], [1, 0], 'it has just started to brew, in daylight');
      t.check(/The air goes still/.test(r.toast), 'with its own message: ' + r.toast); t.eq([r.rainT, r.closed], [39, true], 'the rain is close: flowers shut'); t.eq([r.bow, r.open, r.past], [true, true, true], 'the rain has just passed: flowers open, the rainbow comes');
      t.eq(r.night1, st(1, 1, { night: true, moths: 2, bat: true }), 'night 1 is day 1: two moths and the bat'); t.eq(r.night2, st(2, 1, { night: true, moths: 2, bat: true }), 'night 2 is day 2: two moths and the bat');
      t.eq([r.dusk, r.shut], [st(2, 0.9), true], 'dusk of the same day: flowers closing'); t.eq([r.dayS, r.clean], [st(2, 0.05), [0, 0, 0]], 'afternoon of the same day: no trace of night or storm');
      t.eq(r.storm5, 7, 'a storm picked on day 5 is on day 7, the next storm day');
      t.eq(r.refused, true, 'no jump while the day card shows'); return r;
    } },

  { id: 'TRY-004-all-zones', open: ON, req: 'TRY-004', name: 'The checkbox opens all zones without honey. It stays on after a reload. Clearing it brings the zones back as they were',
    async run(t) {
      const a = await t.ev(run(`T.fly(0, 40, 120); T.quiet(); const o = {}, lily = g.flowers.find(f => f.zone === 'pond'), zf = g.flowers.find(f => f.zone === 'forest'), orch = g.flowers.find(f => f.orch);
        o.before = [JSON.stringify(g.G.zones), !!g.G.orchard, !!g.zoneLocked(lily), !!g.zoneLocked(zf), !!g.zoneLocked(orch), g.zoneBlocked(g.POND.x, g.POND.z)]; o.spent = g.G.spent | 0;
        tick(true); T.sim(0.5); o.after = [g.G.zones, !!g.G.orchard, !!g.zoneLocked(lily), !!g.zoneLocked(zf), !!g.zoneLocked(orch), g.zoneBlocked(g.POND.x, g.POND.z)]; o.spent2 = g.G.spent | 0; o.toast = T.text('toast');
        o.labels = Object.values(g.ZONES).map(Z => Z.label.visible); o.save = T.save().zones; o.store = { 'honeylight.allZones': localStorage.getItem('honeylight.allZones'), 'honeylight.save2': localStorage.getItem('honeylight.save2') }; return o;`));
      t.eq(a.before, ['{}', false, true, true, true, true], 'a new game: every zone is locked'); t.eq(a.after, [{ garden: true, pond: true, forest: true }, true, false, false, false, false], 'ticked: every zone is open');
      t.eq([a.spent, a.spent2], [0, 0], 'no honey was spent'); t.eq(a.labels, [false, false, false], 'the stones show no price'); t.check(/All zones are open/.test(a.toast), 'a message: ' + a.toast);
      await t.reopen({ ...ON, storage: a.store });
      const b = await t.ev(run(`const o = { checked: chk.checked, zones: g.G.zones, orchard: !!g.G.orchard }; T.fly(0, 40, 120); T.quiet(); tick(false); T.sim(0.5);
        o.back = [JSON.stringify(g.G.zones), !!g.G.orchard, g.zoneBlocked(g.POND.x, g.POND.z)]; o.labels = Object.values(g.ZONES).map(Z => Z.label.visible); o.key = localStorage.getItem('honeylight.allZones'); o.save = T.save().zones; return o;`));
      t.eq([b.checked, b.zones, b.orchard], [true, { garden: true, pond: true, forest: true }, true], 'after a reload the box is still ticked and the zones are open');
      t.eq(b.back, ['{}', false, true], 'cleared: the zones are locked as before'); t.eq([b.labels, b.key, b.save], [[true, true, true], null, {}], 'the stones show their price again and the save holds the old zones'); return { a, b };
    } },

  { id: 'TRY-005-day-field', open: ON, req: 'TRY-005', name: 'The day field shows the day and warps to the afternoon of any day. What belongs to that day then comes by itself: the storm on day 7, four moths and the bat that night',
    async run(t) {
      const r = await t.ev(run(`const o = {}; T.fly(0, 40, 120); T.quiet(); const fx = g.FDIR.x * 90, fz = g.FDIR.z * 90; T.place(fx, g.terrainH(fx, fz) + 12, fz); T.sim(0.1);
        pick('night2'); stay(1); setDay(7); o.at = state(); o.toast = T.text('toast'); o.saved = T.save().day.n; o.field = num.value;
        g.DAY.t = 0.395; stay(4); o.storm = S.on; S.debug.end(); g.DAY.t = 0.9995; stay(2); o.night = state(); setDay(0); o.zero = g.DAY.n;
        setDay(2); g.DAY.t = 0.395; stay(4); o.day2 = state(); return o;`));
      t.eq(r.at, { mode: 'fly', day: 7, t: 0.05, night: false, moths: 0, bat: false, storm: false }, 'day 7, afternoon: the night that was going on is over'); t.check(/Day 7/.test(r.toast) && /storm/.test(r.toast), 'a message: ' + r.toast);
      t.eq([r.saved, r.field], [7, '7'], 'in the save and in the field'); t.eq(r.storm, true, 'the storm of day 7 comes at its hour'); t.eq(r.night, { mode: 'fly', day: 7, t: 1, night: true, moths: 4, bat: true, storm: false }, 'the night of day 7: four moths and the bat');
      t.eq(r.zero, 7, 'day 0 is not a day: nothing changes'); t.eq(r.day2, { mode: 'fly', day: 2, t: 0.4, night: false, moths: 0, bat: false, storm: false }, 'day 2 has no storm'); return r;
    } },
];
