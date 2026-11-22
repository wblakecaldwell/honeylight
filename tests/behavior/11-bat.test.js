// The bat (bat.js): from the third night the air above the treetops belongs to the bats. Requirement IDs NGT-041 to NGT-048.
// NIGHT.bat.debug.put(u) sets the bat on its round (u = 0..1).
// hold(x, z, up, secs, each): the bee is held `up` above the ground at x, z for `secs` seconds; each(i) runs after every step of 1/30 s.
const night = n => `T.fly(0, -4, 120); T.quiet(); __g.DAY.n = ${n}; NIGHT.debug.begin(0.3, 2); const N = NIGHT, g = __g, P = g.P, B = N.bat, V = g.THREE.Vector3, K = B.debug.K; if (N.moths) N.moths.count = 0;
  const X = -100, Z = -40, r2 = v => +v.toFixed(2);
  const hold = (x, z, up, secs, each) => { const y = g.terrainH(x, z) + up; for (let i = 0; i < secs * 30; i++) { if (P.mode === 'fly') T.place(x, y, z); T.sim(1 / 30); if (each && each(i) === false) break; } };`;
const run = (body, n = 3) => new Function(night(n) + body);
module.exports = [
  { id: 'NGT-041-bat-night-three', req: 'NGT-041', name: 'No bat on the first two nights; from the third night one bat comes after the moon is up',
    async run(t) {
      const a = await t.ev(run(`T.sim(5); return { on: B.on, shown: B.debug.view.group.visible };`, 2)); t.eq(a, { on: false, shown: false }, 'second night: no bat');
      await t.reopen();
      const b = await t.ev(() => { const g = __g, N = NIGHT; T.fly(0, -4, 120); T.quiet(); g.DAY.n = 3; g.DAY.t = 0.9995; T.sim(1); const B = N.bat, o = { on: B.on, early: B.state }; N.k = 1; N.t = 0.11; T.sim(8); o.later = B.state; o.vis = B.vis > 0.9; return o; });
      t.eq(b.on, true, 'third night: the bat is there'); t.eq(b.early, 'roost', 'not at once'); t.check(b.later === 'cruise' || b.later === 'climb', 'then it flies: ' + b.later); t.check(b.vis, 'and it shows');
      return { a, b };
    } },

  { id: 'NGT-042-bat-round', req: 'NGT-042', name: 'The bat flies one fixed round in clear air over the eastern meadow, and comes past the same place again after the same time',
    async run(t) {
      const r = await t.ev(run(`const o = { period: +B.period.toFixed(1) }; let minH = 1e9, maxH = 0, bad = 0, west = 0, p = new V(), q = new V(), v = new V();
        for (let i = 0; i < 240; i++) { B.debug.roundPoint(i / 240, p); const h = p.y - g.terrainH(p.x, p.z); minH = Math.min(minH, h); maxH = Math.max(maxH, h); if (p.x < 40) west++; if (Math.hypot(p.x, p.z) < 60) bad++; q.copy(p); g.collide(q, v.set(0, 0, 0), 2.5); if (q.distanceTo(p) > 0.01) bad++; }
        o.minH = +minH.toFixed(1); o.maxH = +maxH.toFixed(1); o.bad = bad; o.west = west;
        const rest = () => T.place(-100, g.terrainH(-100, -40) + 3, -40); rest(); B.debug.put(0.3); T.sim(3); const p0 = B.p.clone(); T.sim(B.period / 2); o.half = Math.round(B.p.distanceTo(p0)); T.sim(B.period / 2); o.again = +B.p.distanceTo(p0).toFixed(1); o.state = B.state; o.calls = B.calls; return o;`));
      t.check(r.period > 40 && r.period < 65, 'one round takes about 50 seconds: ' + r.period); t.check(r.minH >= 40 && r.maxH <= 50, 'it flies 40 to 50 above the ground, above the limit: ' + r.minH + ' to ' + r.maxH);
      t.eq(r.bad, 0, 'the round is clear of solid things, locked zones and the hive tree'); t.eq(r.west, 0, 'the western meadow has no bat');
      t.check(r.half > 100, 'half a round later it is far away: ' + r.half); t.check(r.again < 10, 'one round later it is back at the same place: ' + r.again); t.eq(r.state, 'cruise', 'with no bee in its air it only cruises'); t.eq(r.calls, 0, 'and the bee hears no calls');
      return r;
    } },

  { id: 'NGT-043-bat-eats', req: 'NGT-043', name: 'A bee above the treetops is heard: a squeak, then calls that come faster and louder, then the bat takes the bee. The bee wakes at home without its pollen',
    async run(t) {
      const r = await t.ev(run(`const o = { log: [], gaps: [], vols: [], dist: [] }; P.load = [2, 2, 2]; P.pollen = 3; const lives = P.lives; let last = B.state; o.before = [B.state === 'hunt', B.heat, B.hunts];
        hold(X, Z, K.CEIL + 6, 12, i => { if (i === 0) { o.toast0 = T.text('toast'); o.hunts = B.hunts; } if (B.state !== last) { o.log.push(r2(i / 30) + ' ' + B.state); last = B.state; }
          if (i % 30 === 29 && B.state === 'hunt') { o.gaps.push(r2(B.gap)); o.vols.push(r2(B.vol * 100)); o.dist.push(Math.round(B.p.distanceTo(P.pos))); } return B.caught === 0; });
        o.caught = B.caught; o.mode = P.mode; o.pollen = P.pollen; o.load = P.load.length; o.reborn = P.lives - lives; o.toast = T.text('toast'); o.heat = B.heat; o.night = N.active; o.honey = g.G.honey; T.sim(4); o.after = B.state; o.calls = B.calls; T.sim(2); o.quiet = B.calls;
        return o;`));
      t.eq(r.before, [false, 0, 0], 'low over the grass nothing hunts the bee'); t.eq(r.hunts, 1, 'above the treetops a bat hears it at once'); t.check(/squeak/i.test(r.toast0), 'a message at the squeak: ' + r.toast0);
      const strike = parseFloat(r.log.find(l => / strike$/.test(l))); t.near(strike, 5.2, 0.4, 'the bat strikes about 5 seconds after the squeak (6 above the limit)');
      t.check(r.gaps.length >= 4 && r.gaps.every((v, i) => i === 0 || v < r.gaps[i - 1]), 'the calls come faster: gaps ' + r.gaps.join(', ')); t.check(r.vols.every((v, i) => i === 0 || v > r.vols[i - 1]), 'and louder: ' + r.vols.join(', '));
      t.check(r.dist.every((v, i) => i === 0 || v < r.dist[i - 1]) && r.dist[0] > 60 && r.dist[r.dist.length - 1] < 40, 'the bat comes nearer: ' + r.dist.join(', '));
      t.eq([r.caught, r.mode, r.reborn], [1, 'cell', 1], 'the bat takes the bee: it wakes in its cell at home'); t.eq([r.pollen, r.load], [0, 0], 'the pollen it carried is gone'); t.check(/The bat caught you/.test(r.toast), 'a message says so: ' + r.toast);
      t.eq([r.heat, r.night], [0, true], 'the hunt is over and the night goes on'); t.check(r.after === 'leave' || r.after === 'climb' || r.after === 'cruise', 'the bat goes back to its round: ' + r.after); t.eq(r.quiet, r.calls, 'no more calls');
      await t.reopen();
      const hi = await t.ev(run(`const o = {}; hold(X, Z, K.CEIL + 45, 8, i => { if (B.state === 'strike' && !o.strike) o.strike = r2(i / 30); return B.caught === 0; }); o.caught = B.caught; return o;`));
      t.near(hi.strike, 3, 0.3, 'much higher up it takes half the time'); t.eq(hi.caught, 1, 'and the bee is taken');
      return { r, hi };
    } },

  { id: 'NGT-044-bat-safe-low', req: 'NGT-044', name: 'Below the treetops the bee is safe at any speed; so it is near the hive tree at any height; and in the daytime',
    async run(t) {
      const r = await t.ev(run(`const o = {}; P.load = [2, 2]; P.pollen = 2; let maxHeat = 0; const st = new Set();
        B.debug.put(0.2); const a = B.debug.roundPoint(0.2 + 24 / B.LEN, new V()), b = B.debug.roundPoint(0.2 + 30 / B.LEN, new V()); T.lookAt(a.x, g.terrainH(a.x, a.z) + 30, a.z, b.x, g.terrainH(b.x, b.z) + 30, b.z); T.key('KeyW'); let minD = 1e9;
        for (let i = 0; i < 240; i++) { T.sim(1 / 30); const gy = g.terrainH(P.pos.x, P.pos.z); P.pos.y = gy + 30; st.add(B.state); maxHeat = Math.max(maxHeat, B.heat); minD = Math.min(minD, B.p.distanceTo(P.pos)); } T.key('KeyW', false);
        o.fast = [...st]; o.fastHeat = maxHeat; o.speed = Math.round(P.vel.length()); o.near = Math.round(minD);
        hold(40, 30, 60, 4); o.hiveTree = B.heat; o.hunts = B.hunts; o.caught = B.caught; o.pollen = P.pollen; return o;`));
      t.eq(r.fast, ['cruise'], 'fast at 30 above the grass, right under the bat: it only cruises'); t.check(r.speed > 15 && r.near < 30, `the bee was fast (${r.speed}) and the bat near (${r.near})`); t.eq(r.fastHeat, 0, 'no heat');
      t.eq(r.hiveTree, 0, 'high up by the hive tree: safe'); t.eq([r.hunts, r.caught, r.pollen], [0, 0, 2], 'nothing is lost');
      await t.reopen();
      const d = await t.ev(() => { const g = __g, P = g.P, B = NIGHT.bat; T.fly(0, -4, 120); T.quiet(); g.DAY.n = 4; g.DAY.t = 0.3; const y = g.terrainH(-100, -40) + 60; for (let i = 0; i < 150; i++) { T.place(-100, y, -40); T.sim(1 / 30); } return { on: B.on, heat: B.heat, mode: P.mode, night: NIGHT.active }; });
      t.eq(d, { on: false, heat: 0, mode: 'fly', night: false }, 'in the daytime the high air is free');
      return { r, d };
    } },

  { id: 'NGT-045-bat-escape', req: 'NGT-045', name: 'Drop below the treetops and the calls fade, the bat turns away; go up again too soon and the hunt goes on from where it was; a drop in the last moment still saves the bee',
    async run(t) {
      const r = await t.ev(run(`const o = {}; P.load = [2, 2]; P.pollen = 2;
        hold(X, Z, K.CEIL + 6, 3); o.heatUp = r2(B.heat); o.gapUp = r2(B.gap); const c0 = B.calls; hold(X, Z, 12, 1); o.heatDown = r2(B.heat); o.gapDown = r2(B.gap); o.state1 = B.state;
        hold(X, Z, K.CEIL + 6, 1); o.heatAgain = r2(B.heat); o.hunts = B.hunts;
        hold(X, Z, 12, K.FADE + 0.2); o.heatOut = B.heat; o.lost = B.lost; o.state2 = B.state; const c1 = B.calls; T.sim(2); o.silent = B.calls === c1; o.called = c1 > c0;
        hold(X, Z, K.CEIL + 6, 10, () => B.state !== 'strike'); o.strike = B.state; o.hunts2 = B.hunts; hold(X, Z, 12, 0.5); o.saved = [B.state, B.caught, B.lost, B.heat <= 0.6]; hold(X, Z, 12, 3);
        o.end = [B.caught, P.pollen, P.mode, B.heat]; return o;`));
      t.near(r.heatUp, 0.57, 0.06, 'three seconds up: more than half way to the strike'); t.check(r.heatDown < r.heatUp - 0.3 && r.gapDown > r.gapUp, `one second down: the calls fade (heat ${r.heatDown}, gap ${r.gapUp} to ${r.gapDown})`); t.eq(r.state1, 'hunt', 'the bat still listens');
      t.check(r.heatAgain > r.heatDown, 'up again too soon: the hunt goes on from where it was: ' + r.heatAgain); t.eq(r.hunts, 1, 'it is the same hunt');
      t.eq([r.heatOut, r.lost], [0, 1], 'long enough below the treetops: the bat has lost the bee'); t.check(r.state2 === 'climb' || r.state2 === 'leave' || r.state2 === 'cruise', 'it turns away: ' + r.state2); t.check(r.called && r.silent, 'the calls have stopped');
      t.eq([r.strike, r.hunts2], ['strike', 2], 'a second time, up to the strike'); t.eq(r.saved, ['hunt', 0, 2, true], 'a drop in the last moment: the bat misses'); t.eq(r.end, [0, 2, 'fly', 0], 'the bee keeps its pollen');
      return r;
    } },

  { id: 'NGT-046-bat-moth', req: 'NGT-046', name: 'Late in the night the bat takes one moth, and no more than one',
    async run(t) {
      const r = await t.ev(run(`const MO = N.moths, o = {}; const rest = () => T.place(-100, g.terrainH(-100, -40) + 3, -40); rest(); MO.count = 3; for (const m of MO.list) m.at = 0; N.t = 0.2; T.sim(20); o.early = B.moths; const hungry = () => { for (const m of MO.list) if (m.i < 3 && m.state !== 'away' && m.state !== 'seek') { if (m.f) m.f.moth = null; m.f = null; m.state = 'seek'; } for (const m of MO.list) m.T = 99; }; /* three moths that have found no flower yet: they fly a slow round of the meadow */ N.t = 0.5;
        for (let i = 0; i < 180 && B.moths < 1; i++) { rest(); hungry(); T.sim(2); N.t = Math.min(N.t, 0.8); } o.late = B.moths; o.taken = MO.taken; N.t = 0.6; for (let i = 0; i < 20; i++) { hungry(); T.sim(2); } o.end = B.moths; o.left = MO.list.filter(m => m.state !== 'away').length; return o;`));
      t.eq(r.early, 0, 'early in the night it leaves the moths alone'); t.eq([r.late, r.taken], [1, 1], 'later it takes one'); t.eq(r.end, 1, 'and no more'); t.eq(r.left, 2, 'two moths are left');
      return r;
    } },

  { id: 'NGT-047-bat-off', req: 'NGT-047', name: 'With ?bat=0 or #bat-off there is no bat and the night is as before',
    open: { query: '?bat=0' },
    async run(t) {
      const a = await t.ev(() => { T.fly(0, -4, 120); T.quiet(); __g.DAY.n = 4; NIGHT.debug.begin(0.3, 2); return { bat: typeof NIGHT.bat, moths: typeof NIGHT.moths, active: NIGHT.active }; });
      t.eq(a, { bat: 'undefined', moths: 'object', active: true }, 'query switch');
      await t.reopen({ query: '#moths-off-bat-off' });
      const b = await t.ev(() => { T.fly(0, -4, 120); T.quiet(); __g.DAY.n = 4; NIGHT.debug.begin(0.3, 2); return { bat: typeof NIGHT.bat, moths: typeof NIGHT.moths, active: NIGHT.active }; });
      t.eq(b, { bat: 'undefined', moths: 'undefined', active: true }, 'hash switch, two parts off at once');
      return { a, b };
    } },

  { id: 'NGT-048-now-switches', req: 'NGT-048', name: 'With #night-now the day starts at dusk; with #moths-now and #bat-now the moths and the bat come on any night',
    open: { query: '#night-now-moths-now-bat-now' },
    async run(t) {
      const r = await t.ev(() => { const g = __g, N = NIGHT, o = { day: g.DAY.n, t: g.DAY.t }; T.fly(0, -4, 120); T.quiet(); const x = -100, z = -40, y = g.terrainH(x, z) + 3;
        for (let i = 0; i < 250; i++) { T.place(x, y, z); T.sim(0.1); } o.night = N.active; o.moths = N.moths.count; o.bat = N.bat.on; return o; });
      t.eq(r, { day: 1, t: 0.96, night: true, moths: 3, bat: true }, 'on day 1'); return r;
    } },
];
