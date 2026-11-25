// The world answers the long run (src/runworld.js, runnight.js): the bow wave, the flowers along the track, petals and sparks, dew and warm light, fireflies and moths at night.
// __run.startAuto rides the track exactly (the test autopilot). The tests set the tier straight after the start, so they need not fly 8 seconds for each tier.
const allOpen = `() => { const G = __g; for (const k in G.ZONES) G.G.zones[k] = true; G.G.orchard = true; }`;
// start a run on the dew path, set the tier (it then stays there), ride on for secs
const ride = `(tier, secs) => { __run.RUNK.tierT = 1e9; /* the tier stays where the test puts it */ T.fly(0, 0, 0); T.quiet(); __run.startAuto({ i: 2, spd: 22 }); T.sim(1); const R = __run.RUN; R.tier = tier; R.prog = 0; T.sim(secs); return R; }`;
module.exports = [
  { id: 'RUN-025-calm', req: 'RUN-025', name: 'With no run on nothing shows and the hooks are off; after a run everything fades back to exactly off',
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const G = __g, U = G.U, W = __runworld.W, out = {};
        const state = () => ({ wake: U.uWake.value.z, warm: U.uRunWarm.value, wave: W.wave, open: W.budsOpen, petals: W.petals, sparks: W.sparks, dew: W.dew, shown: G.scene.children.filter(o => o.visible && /runworld/.test(o.userData.rw || '')).length });
        T.fly(0, 0, 0); T.quiet(); T.sim(2); out.idle = state();
        const R = eval(ride)(5, 3); out.top = state();
        R.auto.lat = 20; T.sim(2.6); out.result = R.result; T.sim(12); out.after = state(); return out; }, [allOpen, ride]);
      const zero = { wake: 0, warm: 0, wave: 0, open: 0, petals: 0, sparks: 0, dew: 0, shown: 0 };
      t.eq(r.idle, zero, 'no run: everything off, nothing shown');
      t.check(r.top.wake > 0.9 && r.top.warm > 0 && r.top.open > 3 && r.top.petals > 5 && r.top.sparks > 0 && r.top.dew > 5 && r.top.shown === 3, 'at the top tier all of it is on: ' + JSON.stringify(r.top));
      t.eq(r.result, 'lost', 'the run ended (off the track)');
      t.eq(r.after, zero, 'twelve seconds later everything is exactly off again');
      return r;
    } },
  { id: 'RUN-019-wave', req: 'RUN-019', name: 'The bow wave starts at the first tier, grows with the tiers, lies just ahead of the bee and points along its flight',
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const G = __g, U = G.U, P = G.P, out = {};
        const R = eval(ride)(0, 2); out.t0 = U.uWake.value.z;
        R.tier = 1; T.sim(3); out.t1 = +U.uWake.value.z.toFixed(3); R.tier = 3; T.sim(3); out.t3 = +U.uWake.value.z.toFixed(3); R.tier = 5; T.sim(3); out.t5 = +U.uWake.value.z.toFixed(3);
        const w = U.uWake.value, d = U.uWakeD.value, sp = Math.hypot(P.vel.x, P.vel.z);
        out.along = +((d.x * P.vel.x + d.y * P.vel.z) / sp).toFixed(3); out.ahead = +((w.x - P.pos.x) * d.x + (w.y - P.pos.z) * d.y).toFixed(2); out.side = +Math.abs((w.x - P.pos.x) * d.y - (w.y - P.pos.z) * d.x).toFixed(2); return out; }, [allOpen, ride]);
      t.eq(r.t0, 0, 'no wave below the first tier');
      t.check(r.t1 > 0.5 && r.t1 < r.t3 && r.t3 < r.t5 && r.t5 > 0.95, 'it grows with the tiers: ' + [r.t1, r.t3, r.t5]);
      t.check(r.along > 0.99, 'it points along the flight: ' + r.along);
      t.check(r.ahead > 1 && r.ahead < 3 && r.side < 0.05, 'its centre is just ahead of the bee: ' + r.ahead + ' ahead, ' + r.side + ' to the side');
      return r;
    } },
  { id: 'RUN-020-flowers', req: 'RUN-020', name: 'From the second tier, flowers spring up and open just ahead along both edges, fold behind, and stay off water and out of the tunnel',
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const G = __g, RW = __runworld, W = RW.W, out = {}, N = __run.RUN.N;
        const where = () => { const R = __run.RUN, ahead = [], open = []; for (let i = 0; i < RW.budO.length; i++) { let d = ((RW.budJ[i] - R.s) % N + N) % N; if (d > N / 2) d -= N; if (RW.budO[i] > 0) open.push(d); if (RW.budO[i] > 0.9) ahead.push(d); } return { far: Math.max(...open), near: Math.min(...open), openN: ahead.length, fullAhead: ahead.filter(d => d > 0).length }; };
        const R = eval(ride)(1, 2); out.t1 = W.budsOpen; R.tier = 2; T.sim(1.5); out.t2 = where();
        // where flowers stand: at the edges, never on water or under the hill
        const S = __run.RUN.S, B = G.THREE, bad = []; const geo = G.scene.children.find(o => o.userData.rw === 'runworld-flowers').geometry.attributes.aB;
        for (let i = 0; i < geo.count; i++) { const x = geo.getX(i), z = geo.getZ(i), nb = __run.nearest(x, z); if (nb.d < 1.2 || nb.d > 3.2) bad.push(['edge', i, +nb.d.toFixed(2)]); if (__run.groundAt(x, z) > G.terrainH(x, z) + 0.05) bad.push(['water', i]); }
        out.n = geo.count; out.bad = bad.slice(0, 5); out.badN = bad.length;
        const sides = new Set(); for (let i = 0; i < geo.count; i++) { const x = geo.getX(i), z = geo.getZ(i), j = RW.budJ[i], p = S[j], tg = __run.RUN.T[j]; sides.add(Math.sign((x - p.x) * -tg.z + (z - p.z) * tg.x)); } out.sides = [...sides].sort();
        return out; }, [allOpen, ride]);
      t.eq(r.t1, 0, 'none open at the first tier');
      t.check(r.t2.openN >= 4 && r.t2.fullAhead >= 2, 'at the second tier flowers open ahead: ' + JSON.stringify(r.t2));
      t.check(r.t2.far <= 24 / 1.2 + 0.5, 'none open further ahead than 24: ' + r.t2.far);
      t.check(r.t2.near > -60, 'those far behind have folded away: ' + r.t2.near);
      t.check(r.n > 500, 'flowers line the loop: ' + r.n); t.eq(r.badN, 0, 'all at the edges of the track, none on water: ' + JSON.stringify(r.bad));
      t.eq(r.sides, [-1, 1], 'on both sides');
      return r;
    } },
  { id: 'RUN-021-petals', req: 'RUN-021', name: 'Petals from the third tier, sparks in the light\'s colour from the fourth, and a puff of petals at each bail',
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const W = __runworld.W, out = {};
        const R = eval(ride)(2, 2); out.t2 = [W.petals, W.sparks]; R.tier = 3; T.sim(2); out.t3 = [W.petals, W.sparks]; R.tier = 4; T.sim(2); out.t4 = [W.petals, W.sparks];
        R.tier = 1; T.sim(3); const before = [W.petals, W.puffs]; R.auto.alt = 8; T.sim(0.25); R.auto.alt = 1.4; out.bail = { tier: R.tier, why: R.why, before, petals: W.petals, puffs: W.puffs }; return out; }, [allOpen, ride]);
      t.eq(r.t2, [0, 0], 'none at the second tier');
      t.check(r.t3[0] > 5 && r.t3[1] === 0, 'petals at the third tier, no sparks yet: ' + r.t3);
      t.check(r.t4[0] > r.t3[0] && r.t4[1] > 3, 'more petals and sparks at the fourth: ' + r.t4);
      t.eq([r.bail.tier, r.bail.why], [0, 'high'], 'a bail (too high)');
      t.check(r.bail.before[0] === 0 && r.bail.petals >= 10 && r.bail.puffs === r.bail.before[1] + 1, 'it blows a puff of petals past: ' + JSON.stringify(r.bail));
      return r;
    } },
  { id: 'RUN-022-top', req: 'RUN-022', name: 'At the fifth tier dew lifts off the grass and the light warms; both go below it',
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const G = __g, W = __runworld.W, out = {};
        const R = eval(ride)(4, 2); out.t4 = [W.dew, G.U.uRunWarm.value]; R.tier = 5; T.sim(3); out.t5 = [W.dew, +G.U.uRunWarm.value.toFixed(3)];
        R.tier = 4; T.sim(12); out.back = [W.dew, G.U.uRunWarm.value]; return out; }, [allOpen, ride]);
      t.eq(r.t4, [0, 0], 'no dew and no warmth at the fourth tier');
      t.check(r.t5[0] > 15 && r.t5[1] > 0.4, 'dew and warmer light at the fifth: ' + r.t5);
      t.eq(r.back, [0, 0], 'gone again below the top tier');
      return r;
    } },
  { id: 'RUN-023-fireflies', req: 'RUN-023', name: 'At night three fireflies per tier fall in round the bee; a bail sends three off; the end of the run sends all off',
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); if (!window.NIGHT) { const R = eval(ride)(3, 3); return { off: true, state: R.state }; } const N = NIGHT, out = {}; N.debug.begin(0.3, 4);
        const R = eval(ride)(0, 2); out.t0 = N.runFlies; R.tier = 2; T.sim(5); out.t2 = N.runFlies;
        const P = __g.P, RN = N.runNight; out.near = RN.F.filter(q => q.role === 2).every(q => q.p.distanceTo(P.pos) < 9); out.ahead = RN.F.filter(q => q.role === 2 && (q.p.x - P.pos.x) * P.vel.x + (q.p.z - P.pos.z) * P.vel.z > 0).length;
        R.lastSpd = 40; T.sim(1 / 60); out.bail = [R.tier, R.why]; T.sim(0.5); out.afterBail = N.runFlies;
        R.auto.lat = 20; T.sim(2.6); out.result = R.result; out.ended = N.runFlies; T.sim(4); out.gone = RN.count(0); return out; }, [allOpen, ride]);
      if (r.off) { t.eq(r.state, 'run', 'with the night off the run goes on without fireflies'); return r; }
      t.eq(r.t0, 0, 'none below the first tier'); t.eq(r.t2, 6, 'six at the second tier');
      t.eq(r.near, true, 'they fly round the bee'); t.check(r.ahead >= 1, 'a few beside and just ahead, seen from the bee\'s eyes: ' + r.ahead);
      t.eq(r.bail, [1, 'bump'], 'a bail'); t.eq(r.afterBail, 3, 'three are left');
      t.eq(r.result, 'lost', 'the run ended'); t.eq(r.ended, 0, 'none follow after the run'); t.eq(r.gone, 15, 'all have gone out');
      return r;
    } },
  { id: 'RUN-023-day', req: 'RUN-023', name: 'In the daytime no fireflies come',
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); __g.DAY.t = 0.2; eval(ride)(3, 5); if (!window.NIGHT) return { flies: 0, asleep: 15 }; /* night off: no fireflies at all */ return { flies: NIGHT.runFlies, asleep: NIGHT.runNight.count(0) }; }, [allOpen, ride]);
      t.eq(r, { flies: 0, asleep: 15 }, 'none in the day');
      return r;
    } },
  { id: 'RUN-024-moths', req: 'RUN-024', name: 'A moth near a bee with three fireflies round it leaves its flower and follows the light',
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); if (!window.NIGHT) { const R = eval(ride)(3, 3); return { off: true, state: R.state }; } const N = NIGHT, MO = N.moths; N.debug.begin(0.3, 4);
        const R = eval(ride)(1, 4), P = __g.P, m = MO.list[0]; const flies = N.runFlies;
        MO.count = Math.max(MO.count, 1); m.state = 'seek'; m.vis = 1; m.f = null; m.T = 9; m.p.set(P.pos.x + 6, P.pos.y + 3, P.pos.z + 6); m.v.set(0, 0, 0); T.sim(0.2);
        const st = m.state; T.sim(2); return { tail: N.tail, flies, st, still: m.state, d: +m.p.distanceTo(P.pos).toFixed(1) }; }, [allOpen, ride]);
      if (r.off) { t.eq(r.state, 'run', 'with the night off the run goes on without moths'); return r; }
      t.eq(r.tail, 0, 'the night\'s own fireflies are not with the bee'); t.eq(r.flies, 3, 'three run fireflies follow it');
      t.eq(r.st, 'lured', 'the moth is drawn to them'); t.eq(r.still, 'lured', 'and keeps following'); t.check(r.d < 20, 'it keeps up with the bee: ' + r.d);
      return r;
    } },
  { id: 'RUN-025-own-random', req: 'RUN-025', name: 'The world\'s answer takes no number from the game\'s random stream: it builds inside quietBuild and never calls Math.random while it runs',
    async run(t) {
      const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..', '..'), bad = [];
      for (const f of ['src/runworld.js', 'runnight.js']) fs.readFileSync(path.join(root, f), 'utf8').split('\n').forEach((l, i) => { const c = l.replace(/\/\/.*$/, '');
        if (/import[^;]*\brnd\b/.test(c)) bad.push(`${f}:${i + 1} imports the game's rnd`);
        if (/Math\.random\(/.test(c)) bad.push(`${f}:${i + 1} calls Math.random`); });
      t.eq(bad, [], 'no line could draw from the game\'s stream');
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const orig = Math.random, from = []; if (window.NIGHT) NIGHT.debug.begin(0.3, 2);
        Math.random = () => { const s = new Error().stack || ''; if (/runworld\.js|runnight\.js/.test(s)) from.push(s.split('\n')[2]); return orig(); };
        const R = eval(ride)(5, 4); R.lastSpd = 40; T.sim(1); Math.random = orig; return { calls: from.length, first: from[0] || '' }; }, [allOpen, ride]);
      t.eq(r.calls, 0, 'no call from runworld.js or runnight.js during a run at night at the top tier ' + r.first);
      return r;
    } },
];
