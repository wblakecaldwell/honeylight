// The race maps and the clock of the long run (src/racemap.js, src/longrun.js): the race starts a moment (1 s) into a run, the maps, the start line, the clock and the best loop.
// __run.startAuto rides the track exactly (a test autopilot). __racemap.draw() draws the maps as a frame of the game would (frames do not run in the tests).
const allOpen = `() => { const G = __g; for (const k in G.ZONES) G.G.zones[k] = true; G.G.orchard = true; }`;
const ride = `(o, secs) => { T.fly(0, 0, 0); T.quiet(); __run.startAuto(o); T.sim(secs); return __run.RUN.state; }`;
// what shows: the maps' and the clock's opacity, the clock's text
const seen = `() => ({ map: document.getElementById('racemap').style.opacity, clock: document.getElementById('racetime').style.opacity, now: document.getElementById('racenow').textContent, delta: document.getElementById('racedelta').textContent, best: document.getElementById('racebest').textContent })`;
// how many white pixels the outline drew (its corner of the maps' canvas)
const outlineInk = `() => { __racemap.draw(); const c = document.getElementById('racemap'), x = c.getContext('2d'), w = c.width, h = c.height, d = x.getImageData(Math.round(w * 0.6), 0, w - Math.round(w * 0.6), Math.round(h * 0.45)).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 230 && d[i + 1] > 230 && d[i + 2] > 230 && d[i + 3] > 200) n++; return n; }`;
module.exports = [
  { id: 'RUN-026-race-start', req: 'RUN-026', name: 'A run starts anywhere on the open track; a moment later the race starts where the bee is and the maps fade in',
    async run(t) {
      const r = await t.ev(([allOpen, ride, seen]) => { eval(allOpen)(); const go = eval(ride), see = eval(seen), R = __run.RUN, out = {};
        out.idle = see(); go({ i: 700, spd: 22 }, 0.5); out.start = [R.state, R.s0]; out.early = see(); out.raceEarly = R.race;
        T.sim(2.6); out.race = R.race; out.at = Math.round(R.raceS); out.s = Math.round(R.s); out.mid = see(); return out; }, [allOpen, ride, seen]);
      t.eq(r.idle.map, '0', 'no maps without a run');
      t.eq(r.start[0], 'run', 'a run starts in the middle of the track'); t.check(r.start[1] >= 700 && r.start[1] < 712, 'where the bee joined it: ' + r.start[1]);
      t.eq([r.raceEarly, r.early.map, r.early.clock], [false, '0', '0'], 'no race and no maps in the first moment');
      t.eq(r.race, true, 'the race has started'); t.check(r.at > r.start[1] + 10 && r.at <= r.s, 'its start line is where the bee was when the race started: ' + r.at);
      t.eq([r.mid.map, r.mid.clock], ['1', '1'], 'the maps and the clock show'); t.check(/^0:0[0-2]\.\d$/.test(r.mid.now), 'the clock runs from the start line: ' + r.mid.now);
      return r;
    } },
  { id: 'RUN-029-clock', req: 'RUN-029', name: 'A loop ends at its own start line; the first loop sets the best quietly; a faster loop is a new best, saved; ahead or behind shows',
    open: { storage: { 'honeylight.run': null } },
    async run(t) {
      const r = await t.ev(([allOpen, ride, seen]) => { eval(allOpen)(); const go = eval(ride), see = eval(seen), R = __run.RUN, el = document.getElementById('rungoal'), out = {};
        R.mem.ch = 99; // no challenges in the way
        go({ i: 700, spd: 26 }, 5); const start = R.raceS; let k = 0; for (; k < 60 * 90 && R.state === 'run'; k++) T.sim(1 / 60);
        out.first = { result: R.result, round: Math.round(R.s - start), N: R.N, lap: +R.raceT.toFixed(2), best: +R.mem.best.toFixed(2), text: el.textContent, newBest: R.newBest, clock: see() };
        __run.stopAuto(); T.sim(4); __run.reset();
        // a slower loop from somewhere else on the track: behind
        go({ i: 200, spd: 24 }, 3.2); T.sim(20); out.behind = see().delta;
        for (let k2 = 0; k2 < 60 * 90 && R.state === 'run'; k2++) T.sim(1 / 60); out.slow = { result: R.result, best: +R.mem.best.toFixed(2), newBest: R.newBest, text: el.textContent };
        __run.stopAuto(); T.sim(4); __run.reset();
        // a faster loop from a third place: ahead, then a new best
        go({ i: 1100, spd: 28 }, 3.2); T.sim(20); out.ahead = see().delta;
        for (let k3 = 0; k3 < 60 * 90 && R.state === 'run'; k3++) T.sim(1 / 60); out.fast = { result: R.result, lap: +R.raceT.toFixed(2), best: +R.mem.best.toFixed(2), newBest: R.newBest, text: el.textContent, clock: see() };
        const saved = JSON.parse(localStorage.getItem('honeylight.run')); out.saved = { best: +saved.best.toFixed(2), at: saved.bestAt.length };
        return out; }, [allOpen, ride, seen]);
      const f = r.first, n = Math.ceil(f.N / 10);
      t.eq(f.result, 'done', 'all the way round'); t.check(f.round >= f.N && f.round < f.N + 4, 'it ends back at its own start line: ' + f.round + ' of ' + f.N);
      t.check(Math.abs(f.lap - f.N * 1.2 / 26) < 1.5, 'the time is the loop at 26 a second: ' + f.lap); t.eq(f.best, f.lap, 'the first loop is the best loop');
      t.eq([f.newBest, f.text], [false, 'All the way round'], 'quietly: no "new best" line'); t.eq(f.clock.best, 'best  ' + f.clock.now, 'the clock shows it as the best');
      t.check(/^\+\d+\.\d$/.test(r.behind), 'slower: behind, with a plus: ' + r.behind);
      t.eq([r.slow.result, r.slow.best, r.slow.newBest], ['done', f.best, false], 'a slower loop does not change the best');
      t.check(/^−\d+\.\d$/.test(r.ahead), 'faster: ahead, with a minus: ' + r.ahead);
      t.eq([r.fast.result, r.fast.best, r.fast.newBest], ['done', r.fast.lap, true], 'a faster loop is the new best');
      t.check(r.fast.text.endsWith('A new best loop!  ' + r.fast.clock.now), 'and the end line says so: ' + JSON.stringify(r.fast.text));
      t.eq(r.saved, { best: r.fast.best, at: n }, 'the best loop and its times along the track are saved');
      return r;
    } },
  { id: 'RUN-030-part-open', req: 'RUN-030', name: 'With part of the track open: maps but no clock; the outline stops at the open track; no run past it',
    async run(t) {
      const r = await t.ev(([ride, seen, ink]) => { const go = eval(ride), see = eval(seen), R = __run.RUN, out = {}; const G = __g; G.G.orchard = true; G.G.zones.garden = true;
        T.fly(0, 0, 0); T.sim(0.1); out.full = R.full; out.stop = R.stopAt;
        go({ i: R.stopAt + 60, spd: 22 }, 1); out.past = R.state; __run.stopAuto(); T.sim(3); __run.reset();
        go({ i: Math.max(200, R.stopAt - 160), spd: 22 }, 4); out.state = R.state; out.race = R.race; out.seen = see(); out.ink = eval(ink)();
        for (const k in G.ZONES) G.G.zones[k] = true; T.sim(1 / 60); out.inkAll = eval(ink)(); return out; }, [ride, seen, outlineInk]);
      t.eq(r.full, false, 'part of the track is open');
      t.eq(r.past, 'idle', 'no run starts past the open track');
      t.eq([r.state, r.race], ['run', true], 'a run on the open part, and its race'); t.eq([r.seen.map, r.seen.clock], ['1', '0'], 'the maps show, the clock does not');
      t.check(r.ink > 40 && r.ink < r.inkAll * 0.8, 'the outline draws only the open track: ' + r.ink + ' of ' + r.inkAll + ' white pixels');
      return r;
    } },
  { id: 'RUN-031-quiet', req: 'RUN-031', name: 'The maps take no random numbers, leave the game picture alone, and ?racemap=0 switches them off',
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const go = eval(ride), out = {};
        go({ i: 300, spd: 22 }, 3.5); const a = Math.random(); T.seed(777); const b = Math.random(); T.seed(777); __racemap.MAP.baked = false; __racemap.bake(); __racemap.draw(); const c = Math.random();
        out.random = b === c; out.baked = !!__racemap.MAP.img; out.inGame = document.getElementById('racemap').parentElement === document.body && document.getElementById('racemap') !== document.getElementById('c'); return out; }, [allOpen, ride]);
      t.eq(r.random, true, 'no number drawn from the game\'s random stream'); t.eq(r.baked, true, 'the picture from above is made');
      t.eq(r.inGame, true, 'the maps are their own layer, not the game\'s picture');
      await t.reopen({ query: '?racemap=0' });
      const off = await t.ev(([allOpen, ride]) => { eval(allOpen)(); eval(ride)({ i: 300, spd: 22 }, 4); return { el: !!document.getElementById('racemap'), race: __run.RUN.race }; }, [allOpen, ride]);
      t.eq(off, { el: false, race: true }, 'with ?racemap=0 the race still runs but no maps are made');
      return r;
    } },
];
