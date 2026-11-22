// Wasps, webs, heat buzz, the bee ball, calm, nest raid, rescue.
// WASP runs in the page: window.__wasp(k) = the k-th plain meadow wasp (not a raider, a mob wasp or an orchard guard).
const WASP = `window.__wasp = (k = 0) => __g.wasps.filter(w => !w.raider && !w.mob && !w.orchard)[k];
  window.__near = (w, dx, dy, dz) => { w.state = 'patrol'; w.t = 0; w.gone = 0; w.decoy = null; w.p.set(__g.P.pos.x + dx, __g.P.pos.y + dy, __g.P.pos.z + dz); w.v.set(0, 0, 0); };`;
const SKY = [150, 30, 40];
module.exports = [
  { id: 'WSP-001-chase-sting', req: 'WSP-001', name: 'A wasp chases a bee that carries pollen, and a sting takes half of it',
    async run(t) {
      await t.ev(WASP);
      const r = await t.ev((SKY) => { const g = __g, P = g.P; T.fly(...SKY); T.quiet(); const w = __wasp(0); const out = {};
        __near(w, 20, 0, 0); T.sim(2); out.noPollen = w.state;
        T.place(...SKY); __near(w, 20, 0, 0); P.load = [1, 1, 1, 1]; P.pollen = 4; let chased = false, i = 0;
        for (; i < 100 && P.pollen === 4; i++) { T.sim(0.1); if (w.state === 'chase') chased = true; }
        out.chased = chased; out.pollen = P.pollen; out.after = w.state; out.steps = i; out.toast = T.text('toast'); return out; }, SKY);
      t.check(r.noPollen !== 'chase', 'no chase when the bee carries nothing: ' + r.noPollen);
      t.check(r.chased, 'the wasp chases the loaded bee'); t.eq(r.pollen, 2, 'the sting takes half the pollen');
      t.check(/Stung/.test(r.toast), 'a sting message shows'); t.eq(r.after, 'retreat', 'the wasp flies off after the sting');
      return r;
    } },

  { id: 'WSP-008-web-hold', req: 'WSP-008', name: 'A spider web catches the bee and holds it still',
    async run(t) {
      const r = await t.ev(() => { const g = __g, P = g.P, w = g.webs[0]; // all webs are in zones: open them so no breeze pushes the bee
        g.G.zones = { garden: true, pond: true, forest: true }; g.G.orchard = true; T.quiet(); T.fly(); T.place(w.c.x, w.c.y, w.c.z); T.sim(0.1);
        const caught = P.stuck > 0, a = P.pos.clone(); T.sim(1.5); return { caught, stuck: P.stuck > 0, moved: +P.pos.distanceTo(a).toFixed(3) }; });
      t.check(r.caught, 'flying into a web catches the bee'); t.check(r.stuck && r.moved < 0.2, 'the bee stays held for 1.5 s, moved ' + r.moved);
      return r;
    } },

  { id: 'WSP-010-heat-buzz', req: 'WSP-010', name: 'F does nothing with cool wings; after a red clover it dazes near wasps only',
    async run(t) {
      await t.ev(WASP);
      await t.ev((SKY) => { T.fly(...SKY); T.quiet(); __near(__wasp(0), 8, 0, 0); __near(__wasp(1), 30, 0, 0); T.sim(0.1); }, SKY);
      await t.page.keyboard.press('KeyF');
      const cool = await t.ev(() => ({ near: __wasp(0).state, hint: T.text('hint') }));
      const sipped = await t.ev(() => { const g = __g, c = g.CLOVERS[0]; T.place(c.x, c.y, c.z); for (let i = 0; i < 30 && !(g.G.heat > 0); i++) T.sim(0.1); return g.G.heat > 0; });
      await t.ev((SKY) => { T.place(...SKY); __near(__wasp(0), 8, 0, 0); __near(__wasp(1), 30, 0, 0); }, SKY);
      await t.page.keyboard.press('KeyF');
      const hot = await t.ev(() => ({ near: __wasp(0).state, far: __wasp(1).state, heatLeft: __g.G.heat }));
      t.check(cool.near !== 'dazed', 'cool wings: no daze'); t.check(sipped, 'a red clover warms the wings');
      t.eq(hot.near, 'dazed', 'the near wasp is dazed'); t.check(hot.far !== 'dazed', 'the far wasp is not dazed'); t.eq(hot.heatLeft, 0, 'the heat is used up');
      return { cool: cool.near, hot };
    } },

  { id: 'WSP-011-bee-ball', req: 'WSP-011', name: 'R calls the sisters only with 3 or more sisters',
    async run(t) {
      await t.ev(WASP);
      await t.ev((SKY) => { T.fly(...SKY); T.quiet(); __g.gainHoney(29); __near(__wasp(0), 10, 0, 0); T.sim(0.1); }, SKY);
      await t.page.keyboard.press('KeyR');
      const two = await t.ev(() => ({ workers: __g.G.workers, active: __g.SWARM.active, hint: T.text('hint') }));
      await t.ev(() => { __g.gainHoney(1); T.sim(0.1); __near(__wasp(0), 10, 0, 0); });
      await t.page.keyboard.press('KeyR');
      const three = await t.ev(() => { const out = { workers: __g.G.workers, active: __g.SWARM.active }; let balled = false; for (let i = 0; i < 80 && !balled; i++) { T.sim(0.1); balled = __wasp(0).state === 'balled' || __wasp(0).state === 'gone'; } out.balled = balled; return out; });
      t.eq(two.active, false, 'with 2 sisters nothing happens'); t.check(/3 sisters/.test(two.hint), 'a hint says 3 sisters are needed: ' + two.hint);
      t.eq(three.active, true, 'with 3 sisters they come'); t.check(three.balled, 'the sisters ball the wasp');
      return { two: two.active, three };
    } },

  { id: 'WSP-012-calm', req: 'WSP-012', name: 'After 5 beaten wasps the others keep away for 60 seconds',
    async run(t) {
      await t.ev(WASP);
      const r = await t.ev((SKY) => { const g = __g, P = g.P; T.fly(...SKY); T.quiet(); const out = {};
        // only two meadow wasps exist: beat the second one five times (each beat counts)
        for (let k = 0; k < 4; k++) g.eatWasp(__wasp(1), 'test'); T.sim(0.1); out.calm4 = g.G.calmT > 0;
        g.eatWasp(__wasp(1), 'test'); T.sim(0.1); out.calm5 = +g.G.calmT.toFixed(1);
        const w = __wasp(0); __near(w, 20, 0, 0); P.load = [1, 1, 1, 1]; P.pollen = 4; let chase = 0;
        for (let i = 0; i < 40; i++) { T.place(...SKY); P.load = [1, 1, 1, 1]; P.pollen = 4; T.sim(0.1); if (w.state === 'chase') chase++; }
        out.pollen = P.pollen; out.chaseSteps = chase; g.G.calmT = 0.05; T.sim(0.1); __near(w, 20, 0, 0); let after = false;
        for (let i = 0; i < 40 && !after; i++) { T.place(...SKY); T.sim(0.1); after = w.state === 'chase'; } out.chaseAfter = after; return out; }, SKY);
      t.eq(r.calm4, false, 'no calm after 4'); t.check(r.calm5 > 59 && r.calm5 <= 60, 'calm for 60 s after 5, calmT=' + r.calm5);
      t.eq(r.pollen, 4, 'no sting while calm'); t.check(r.chaseAfter, 'wasps chase again when the calm ends');
      return r;
    } },

  { id: 'WSP-006-nest-raid', req: 'WSP-006', name: 'Holding at the unguarded nest gives 3 honey balls, then the guards chase',
    async run(t) {
      const r = await t.ev(() => { const g = __g, P = g.P, E = g.NESTR.E; T.fly(); T.quiet(); g.gainHoney(30); g.openZone('garden'); T.sim(0.1); const h0 = g.G.honey;
        for (let i = 0; i < 40 && !g.G.raids; i++) { T.place(E.x, E.y, E.z); T.sim(0.1); }
        return { raids: g.G.raids, load: P.load.slice(), honey: g.G.honey - h0, chasing: g.wasps.filter(w => w.orchard && w.state === 'chase').length, guards: g.wasps.filter(w => w.orchard).length }; });
      t.eq(r.raids, 1, 'the raid happens'); t.eq(r.load, [4, 4, 4], 'three heavy honey balls'); t.eq(r.honey, 6, 'and 6 honey at once');
      t.check(r.chasing > 0 && r.chasing === r.guards, `all nest guards chase (${r.chasing}/${r.guards})`);
      return r;
    } },

  { id: 'WSP-004-rescue', req: 'WSP-004', name: 'Wasps mob a sister; hitting them fast drives them off and she shares pollen',
    async run(t) {
      const r = await t.ev((SKY) => { const g = __g, P = g.P, M = g.MOB; T.fly(...SKY, 0, 0); T.quiet(); let ok = false;
        for (let i = 0; i < 8 && !ok; i++) { T.place(SKY[0], SKY[1], SKY[2] + i * 10, i, 0); ok = g.startMob(); }
        const out = { started: ok, mobbers: g.wasps.filter(w => w.mob && w.state === 'mob').length };
        // ram each mobbing wasp at speed
        for (let k = 0; k < 40 && M.active; k++) { const w = g.wasps.find(w => w.mob && w.state === 'mob'); if (!w) { T.sim(0.1); continue; }
          P.pos.copy(w.p).addScaledVector(new g.THREE.Vector3(1, 0, 0), -1.5); P.vel.set(16, 0, 0); T.sim(1 / 60); }
        T.sim(0.2); out.active = M.active; out.load = P.load.slice(); return out; }, SKY);
      t.check(r.started, 'a rescue starts'); t.check(r.mobbers > 0, 'wasps mob the sister');
      t.eq(r.active, false, 'the rescue ends'); t.eq(r.load, [2, 2, 2], 'the saved sister shares 3 pollen');
      return r;
    } },
  { id: 'WSP-008-web-wriggle', req: 'WSP-008', name: 'Tapping Space wriggles the bee free of a web',
    async run(t) {
      await t.ev(() => { const g = __g, w = g.webs[0]; g.G.zones = { garden: true, pond: true, forest: true }; g.G.orchard = true; T.quiet(); T.fly(); T.place(w.c.x, w.c.y, w.c.z); T.sim(0.1); });
      let taps = 0; while (taps < 20 && await t.ev(() => __g.P.stuck > 0)) { await t.page.keyboard.press('Space'); await t.ev(() => T.sim(0.1)); taps++; }
      const torn = await t.ev(() => __g.webs[0].torn > 0);
      t.check(taps >= 3 && taps <= 8, 'a few taps of Space free the bee, taps=' + taps); t.check(torn, 'the web tears');
      return { taps, torn };
    } },
];
