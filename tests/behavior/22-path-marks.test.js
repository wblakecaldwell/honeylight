// The long run made easier to follow (src/plants.js, src/pathmarks.js, src/longrun.js): see-through grass near the bee, the mice's fences and boards at the big bends,
// bee-sight lines while racing, and off the track costing time instead of ending the run. __run.startAuto rides the track exactly (a test autopilot).
const allOpen = `() => { const G = __g; for (const k in G.ZONES) G.G.zones[k] = true; G.G.orchard = true; }`;
const ride = `(o, secs) => { T.fly(0, 0, 0); T.quiet(); __run.startAuto(o); T.sim(secs); return __run.RUN.state; }`;
module.exports = [
  { id: 'RUN-032-see-through', req: 'RUN-032', name: 'Low in the grass the blades near the eye and just ahead turn see-through; high up, nothing changes',
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const go = eval(ride), U = __g.U, out = {};
        go({ i: 40, spd: 18 }, 0.5); out.low = +U.uSee.value.w.toFixed(2); __run.stopAuto();
        const P = __g.P, g = __g.terrainH(P.pos.x, P.pos.z); P.pos.y = g + 30; P.vel.set(0, 0, 0); T.sim(1 / 60); out.high = +U.uSee.value.w.toFixed(2);
        out.twins = __g.scene.children.filter(o => o.isMesh && o.material.transparent && o.material.defines && o.material.defines.SEE_PASS === 1).length; return out; }, [allOpen, ride]);
      t.eq(r.low, 1, 'flying low on the track: fully on'); t.eq(r.high, 0, '30 over the ground: off');
      t.eq(r.twins, 2, 'the world\'s grass and the track\'s grass walls each have a see-through twin');
      return r;
    } },
  { id: 'RUN-033-marks', req: 'RUN-033', name: 'A fence stands on the outside of every bend and boards at the big ones, all outside the track; the arrows face the bee coming in; the bee bumps off them',
    async run(t) {
      const r = await t.ev(([allOpen]) => { eval(allOpen)(); const M = __marks.MARKS, K = __marks.MARKK, R = __run.RUN, S = __kit.SOLIDS, out = {};
        out.bends = M.bends.map(b => Math.round(Math.abs(b.deg)) >= K.bendDeg); out.n = M.bends.length; out.big = M.bends.filter(b => Math.abs(b.deg) >= K.boardDeg).length; out.boards = S.filter(s => s.tag === 'board').length;
        // the fence is on the outside: the track after the bend goes away from it
        out.outside = M.bends.every(b => { const N = R.N, t = R.T[(b.i - 15 + N) % N], a = R.S[(b.i + 15) % N], c = R.S[(b.i - 15 + N) % N], go = (a.x - c.x) * -t.z + (a.z - c.z) * t.x, fence = b.deg > 0 ? -1 : 1; return Math.sign(go) === -fence; });
        // every fence and board shape: how far from the track's middle (never on the track)
        const mine = S.filter(s => s.tag === 'fence' || s.tag === 'board'); out.shapes = mine.length;
        out.minLat = Math.min(...mine.map(s => { const x = s.kind === 'block' ? s.c.x : s.a.x, z = s.kind === 'block' ? s.c.z : s.a.z; return __run.nearest(x, z).d; })).toFixed(2);
        // fly into the outside of the first bend, sideways: the fence stops the bee
        const b = M.bends[0], out1 = b.deg > 0 ? -1 : 1, p = R.S[b.i], tg = R.T[b.i], gy = __run.groundAt(p.x, p.z);
        T.fly(0, 0, 0); T.quiet(); const P = __g.P; P.pos.set(p.x - tg.z * out1 * 2.5, gy + 0.8, p.z + tg.x * out1 * 2.5); P.yaw = Math.atan2(tg.z * out1, -tg.x * out1);
        P.vel.set(-tg.z * out1 * 12, 0, tg.x * out1 * 12); T.key('KeyW'); for (let k = 0; k < 40; k++) T.sim(1 / 60); T.key('KeyW', false);
        out.reach = +(((P.pos.x - p.x) * -tg.z + (P.pos.z - p.z) * tg.x) * out1).toFixed(2); return out; }, [allOpen]);
      t.check(r.n >= 8 && r.n <= 20, 'a fence at each bend: ' + r.n); t.check(r.bends.every(Boolean), 'each turns at least 28 degrees'); t.eq(r.boards, r.big * 4, 'four boards at each big bend, two facing each way round (' + r.big + ')'); t.eq(r.outside, true, 'every fence is on the outside of its bend');
      t.check(r.shapes > 50, 'the fences and boards are solid: ' + r.shapes); t.check(+r.minLat >= 3.6, 'nothing stands on the track (nearest ' + r.minLat + ')');
      t.check(r.reach < 3.85, 'the bee is stopped at the fence: ' + r.reach);
      return r;
    } },
  { id: 'RUN-034-bee-sight', req: 'RUN-034', name: 'Bee-sight lines fade in when the race starts and out when the run ends; never drawn otherwise',
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const go = eval(ride), M = __marks.MARKS, U = __g.U, R = __run.RUN, out = {};
        T.fly(0, 0, 0); T.quiet(); T.sim(1); out.idle = [U.uRace.value, M.lines.visible];
        go({ i: 300, spd: 22 }, 0.8); out.early = [R.race, U.uRace.value];
        T.sim(0.9); out.mid = U.uRace.value > 0 && U.uRace.value < 1; T.sim(1.5); out.on = [R.race, U.uRace.value, M.lines.visible];
        R.auto.lat = 20; T.sim(0.1); out.ended = R.state; T.sim(1); out.off = [U.uRace.value, M.lines.visible]; return out; }, [allOpen, ride]);
      t.eq(r.idle, [0, false], 'just flying: no lines'); t.eq(r.early, [false, 0], 'a run but no race yet: no lines');
      t.check(r.mid, 'they fade in'); t.eq(r.on, [true, 1, true], 'racing: the lines are fully in');
      t.eq(r.ended, 'ended', 'the run ended'); t.eq(r.off, [0, false], 'after the run they are gone');
      return r;
    } },
  { id: 'RUN-004-grass-drag', req: 'RUN-004', name: 'Off the track and low in the grass, the grass slows the bee; the run goes on',
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const go = eval(ride), R = __run.RUN, P = __g.P, out = {};
        const coast = lat => { go({ i: 30, spd: 22 }, 1); __run.stopAuto(); const i = Math.round(R.s), p = R.S[i], tg = R.T[i];
          P.pos.set(p.x - tg.z * lat, P.pos.y, p.z + tg.x * lat); P.vel.set(tg.x * 22, 0, tg.z * 22); T.sim(0.5); const v = Math.hypot(P.vel.x, P.vel.z), st = R.state; __run.reset(); return [v, st]; };
        const on = coast(0), off = coast(5.5); out.on = +on[0].toFixed(1); out.off = +off[0].toFixed(1); out.slowed = off[0] < on[0] * 0.75; out.state = off[1]; return out; }, [allOpen, ride]);
      t.check(r.slowed, 'the grass took the speed'); t.eq(r.state, 'run', 'the run goes on');
      return r;
    } },
  { id: 'RUN-003-other-way', req: 'RUN-003', name: 'The loop can be flown the other way round: the run starts, the race and the lines come, the loop ends back at its start line, and it has its own best loop',
    open: { storage: { 'honeylight.run': null } },
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const go = eval(ride), R = __run.RUN, out = {};
        R.mem.ch = 99; R.mem.best = 77; // no challenges in the way; a best loop the first way round, which this run must not touch
        go({ i: 700, spd: 26, dir: -1 }, 2.6); out.start = [R.state, R.dir, R.race, __g.U.uRace.value > 0];
        for (let k = 0; k < 60 * 90 && R.state === 'run'; k++) T.sim(1 / 60);
        out.end = [R.result, +R.mem.best.toFixed(1), R.mem.bestR > 0]; out.saved = JSON.parse(localStorage.getItem('honeylight.run') || '{}').bestR > 0; return out; }, [allOpen, ride]);
      t.eq(r.start, ['run', -1, true, true], 'a run the other way: the race is on and the lines show');
      t.eq(r.end, ['done', 77, true], 'all the way round; the other way has its own best, the first way\'s best is untouched'); t.eq(r.saved, true, 'it is saved');
      return r;
    } },
];
