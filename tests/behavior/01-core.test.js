// First example tests. Pattern for every test:
//   id    unique, starts with the requirement ID when one fits
//   req   the REQUIREMENTS.md line this test checks ('' when none)
//   run   gets t: t.ev(fn) runs fn inside the game page (use window.T helpers and window.__g there),
//         t.check / t.eq / t.near record failures, t.reopen({storage}) opens a fresh game.
//         Return a small value that describes the end state: --twice compares it between runs.
// Each test starts with a fresh game, a fixed random seed and a frozen clock. Step time only with T.sim(seconds).
module.exports = [
  { id: 'BOOT-001-loads', req: '', name: 'The game loads with no errors and waits on the title screen',
    async run(t) {
      const r = await t.ev(() => ({ mode: __g.P.mode, flowers: __g.flowers.length, wasps: __g.wasps.length, title: getComputedStyle(document.getElementById('title')).display }));
      t.eq(r.mode, 'title', 'mode at start'); t.check(r.flowers > 100, 'the world has flowers'); t.eq(r.title, 'flex', 'title screen shows');
      return r;
    } },

  { id: 'HIV-001-birth', req: 'HIV-001', name: 'The bee chews out of its cell, walks the comb, then takes off only on request',
    async run(t) {
      await t.page.click('#title');
      t.eq(await t.ev(() => __g.P.mode), 'cell', 'mode after the title click');
      // chew until the cap is gone (Space is the action key)
      const chews = await t.ev(() => { let n = 0; while (__g.P.mode === 'cell' && n < 40) { __g.chew(); T.sim(0.2); n++; } return n; });
      t.check(chews >= 2 && chews < 40, 'chewing opens the cell, chews=' + chews);
      const r = await t.ev(() => { T.sim(12); const P = __g.P; return { mode: P.mode, wings: P.wingsReady }; });
      t.eq(r.mode, 'crawl', 'HIV-002/003: after the birth the bee is on the comb and does not fly');
      const r2 = await t.ev(() => { const P = __g.P; let s = 0; while (!P.wingsReady && s < 60) { T.sim(1); s++; } const before = P.mode; __g.takeOff(); T.sim(0.5); return { before, after: P.mode, waited: s }; });
      t.eq(r2.before, 'crawl', 'still on the comb until take-off'); t.eq(r2.after, 'fly', 'take-off starts flight');
      return { chews, ...r2 };
    } },

  { id: 'ZON-004-dusk', req: 'ZON-004', name: 'A day is 8 minutes; flowers close at dusk; with the night switched off, dusk ends the day',
    open: { query: '?night=0' }, // the night (night.js) holds the end of the day; 08-night.test.js checks that path
    async run(t) {
      const r = await t.ev(() => { const g = __g; T.fly(40, 14, 30); T.quiet(); const out = { len: g.DAY.LEN };
        g.DAY.t = 0.5; T.sim(1); out.closeNoon = g.U.uClose.value;
        g.DAY.t = 0.95; T.sim(1); out.closeDusk = g.U.uClose.value; out.day0 = g.DAY.n;
        g.DAY.t = 0.999; T.sim(3); out.modeNight = g.P.mode; T.sim(10); out.day1 = g.DAY.n; out.modeMorning = g.P.mode; out.t1 = +g.DAY.t.toFixed(4); return out; });
      t.eq(r.len, 480, 'day length in seconds'); t.eq(r.closeNoon, 0, 'flowers open in the afternoon'); t.check(r.closeDusk > 0.5, 'flowers closing at dusk, uClose=' + r.closeDusk);
      t.eq(r.modeNight, 'rest', 'the bee rests when night falls'); t.eq(r.day1, r.day0 + 1, 'the next day starts'); t.eq(r.modeMorning, 'fly', 'the bee flies again in the morning');
      return r;
    } },

  { id: 'ZON-003-breeze', req: 'ZON-003', name: 'A locked zone pushes the bee back',
    async run(t) {
      const r = await t.ev(() => { const g = __g, Z = g.ZONES.pond, c = Z.c; T.quiet();
        // start outside the ring and fly straight at the centre
        const d0 = Z.ring + 30, k = d0 / Math.hypot(c.x, c.z); const sx = c.x - c.x * k, sz = c.z - c.z * k;
        T.fly(); T.lookAt(sx, 14, sz, c.x, 14, c.z); T.key('KeyW'); let min = 1e9;
        for (let i = 0; i < 20; i++) { T.sim(0.5); min = Math.min(min, Math.hypot(g.P.pos.x - c.x, g.P.pos.z - c.z)); }
        T.key('KeyW', false); return { ring: Z.ring, min: +min.toFixed(3), locked: !g.G.zones.pond, toast: T.text('toast') }; });
      t.check(r.locked, 'the pond starts locked'); t.check(r.min >= r.ring - 0.01, `the bee never gets inside the ring (closest ${r.min}, ring ${r.ring})`);
      t.check(/breeze/i.test(r.toast), 'a breeze message shows: ' + r.toast);
      return r;
    } },

  { id: 'ZON-002-stone', req: 'ZON-002', name: 'Landing on a scent stone with enough stored honey opens the zone and spends the honey',
    async run(t) {
      const r = await t.ev(() => { const g = __g, Z = g.ZONES.garden; T.quiet(); T.fly(); const out = {};
        // not enough honey: nothing opens. (An updraft rises over the stone, so the bee must sink to stay on the wax.)
        T.place(Z.x, Z.top + 0.6, Z.z); T.key('ShiftLeft'); T.sim(3); T.key('ShiftLeft', false); out.openPoor = !!g.G.zones.garden;
        g.gainHoney(25); T.place(Z.x, Z.top + 0.6, Z.z); T.key('ShiftLeft'); T.sim(3); T.key('ShiftLeft', false); out.open = !!g.G.zones.garden; out.spent = g.G.spent; out.stores = g.stores(); out.honey = g.G.honey; return out; });
      t.eq(r.openPoor, false, 'no honey, no scouting'); t.eq(r.open, true, 'the garden opens'); t.eq(r.spent, 20, 'the garden costs 20'); t.eq(r.stores, r.honey - 20, 'ZON-001: stores = lifetime honey - spent');
      return r;
    } },

  { id: 'GEN-007-save', req: 'GEN-007', name: 'Progress saves in the browser and comes back after a reload',
    async run(t) {
      const saved = await t.ev(() => { T.fly(30, 12, 20); T.quiet(); __g.gainHoney(37); __g.DAY.t = 0.4; T.sim(1); T.save(); return localStorage.getItem('honeylight.save2'); });
      const s = JSON.parse(saved); t.eq(s.honey, 37, 'saved honey'); t.eq(s.workers, 3, 'saved sisters (one for each 10 honey)');
      await t.reopen({ storage: { 'honeylight.save2': saved } });
      const r = await t.ev(() => ({ honey: __g.G.honey, workers: __g.G.workers, cap: __g.G.cap, speed: __g.G.speed, dayT: +__g.DAY.t.toFixed(2) }));
      t.eq(r, { honey: 37, workers: 3, cap: 6, speed: 1.15, dayT: 0.4 }, 'state after reload (unlocks at 8 and 35 honey apply again)');
      return r;
    } },
];
