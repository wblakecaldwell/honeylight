// The long run (src/longrun.js): the loop, the zone rules, tiers and bails, closed zones, the cells, the light and the challenges.
// __run.startAuto rides the track exactly (a test autopilot); RUN-002 flies it with real flight and steering.
const allOpen = `() => { const G = __g; for (const k in G.ZONES) G.G.zones[k] = true; G.G.orchard = true; }`;
// ride with the autopilot for secs, return the run state
const ride = `(o, secs) => { T.fly(0, 0, 0); T.quiet(); __run.startAuto(o); T.sim(secs); const R = __run.RUN; return { state: R.state, tier: R.tier, bails: R.bails, why: R.why, result: R.result }; }`;
module.exports = [
  { id: 'RUN-001-loop', req: 'RUN-001', name: 'The track is one closed loop through every zone, from the dew path start back to it, and nothing solid is on it',
    async run(t) {
      const r = await t.ev((allOpen) => { eval(allOpen)(); const R = __run.RUN, G = __g, V = G.THREE.Vector3, p = new V(), v = new V(), hits = [];
        let maxStep = 0; for (let i = 0; i < R.N; i++) { const a = R.S[i], b = R.S[(i + 1) % R.N]; maxStep = Math.max(maxStep, Math.hypot(b.x - a.x, b.z - a.z)); }
        for (let i = 0; i < R.N; i++) { const s = R.S[i], y = __run.groundAt(s.x, s.z) + 1.4; p.set(s.x, y, s.z); v.set(0, 0, 0); G.collide(p, v); const moved = Math.hypot(p.x - s.x, p.y - y, p.z - s.z); if (moved > 0.05 || window.__gaps.gapHit(new V(s.x, y, s.z), G.PR)) hits.push(i); }
        const sameStart = R.S[0] === undefined ? false : R.S[0].distanceTo(G.DEWPATH.S[0]) < 0.01;
        const zones = [...new Set(R.zone.filter(Boolean))];
        const pond = R.S.some(s => Math.hypot(s.x - G.POND.x, s.z - G.POND.z) < G.POND.r - 10), brook = R.S.filter(s => G.brookSeg(s.x, s.z) && G.brookSeg(s.x, s.z).d < 2).length;
        const ang = s => Math.atan2(s.z - G.ORCH.z, s.x - G.ORCH.x), hedge = R.S.filter(s => Math.abs(Math.hypot(s.x - G.ORCH.x, s.z - G.ORCH.z) - G.HEDGE_R) < 1.5).map(ang);
        return { N: R.N, len: Math.round(R.len), maxStep: +maxStep.toFixed(2), hits: hits.length, firstHit: hits[0], sameStart, zones, pond, brook, hedge: hedge.length, walls: R.wallN }; }, allOpen);
      t.check(r.len > 1300 && r.len < 1900, 'the loop is long: ' + r.len);
      t.check(r.maxStep < 2.0, 'no jump in the track, it closes on itself: largest step ' + r.maxStep);
      t.eq(r.sameStart, true, 'it starts with the dew path');
      t.eq(r.zones.sort(), ['forest', 'garden', 'pond'], 'it goes through every zone');
      t.eq(r.pond, true, 'low over the pond'); t.check(r.brook > 30, 'along the brook: ' + r.brook);
      t.check(r.hedge >= 2, 'it crosses the hedge twice (tunnel and gap): ' + r.hedge);
      t.eq(r.hits, 0, 'nothing solid on the track at flying height (first at sample ' + r.firstHit + ')');
      t.check(r.walls > 10000, 'grass walls line it: ' + r.walls);
      return r;
    } },
  { id: 'RUN-002-fly-lap', req: 'RUN-002', name: 'With normal flight and steering, a bee flies the whole loop in about a minute without a bail',
    async run(t) {
      const r = await t.ev((allOpen) => { eval(allOpen)(); const R = __run.RUN, G = __g, P = G.P, s0 = R.S[2], t0 = R.T[2];
        T.fly(s0.x, __run.groundAt(s0.x, s0.z) + 2.4, s0.z, Math.atan2(-t0.x, -t0.z), 0); T.quiet(); P.vel.set(t0.x * 22, 0, t0.z * 22); T.key('KeyW');
        let i = 2, k = 0, started = false; for (; k < 60 * 100; k++) { const nb = __run.nearest(P.pos.x, P.pos.z, i, 40); i = nb.i; const q = R.S[(i + 6) % R.N], dx = q.x - P.pos.x, dz = q.z - P.pos.z;
          P.yaw = Math.atan2(-dx, -dz); const g0 = __run.groundAt(P.pos.x, P.pos.z), alt = P.pos.y - g0; P.pitch = Math.max(-0.6, Math.min(0.6, (2.6 - alt) * 0.5 + Math.atan2(__run.groundAt(q.x, q.z) - g0, 7.2)));
          T.sim(1 / 60); if (R.state === 'run') started = true; if (started && R.state !== 'run') break; }
        T.key('KeyW', false); return { started, result: R.result, bails: R.bails, secs: +(k / 60).toFixed(1), tier: R.tier, mode: P.mode }; }, allOpen);
      t.eq(r.started, true, 'the run started'); t.eq(r.result, 'done', 'all the way round'); t.eq(r.bails, 0, 'no bail');
      t.check(r.secs > 40 && r.secs < 80, 'in about a minute: ' + r.secs + ' s'); t.eq(r.tier, 5, 'at the top tier at the end');
      return r;
    } },
  { id: 'RUN-003-tiers', req: 'RUN-003', name: 'Each 8 seconds of clean flight adds a tier, up to 5; the run starts only on the start of the track',
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const go = eval(ride), R = __run.RUN, out = {};
        const mid = go({ i: 500, spd: 22 }, 3); out.midStart = mid.state; __run.stopAuto(); __run.reset();
        go({ i: 2, spd: 22 }, 7.5); out.t7 = R.tier; T.sim(1); out.t8 = R.tier; T.sim(8); out.t16 = R.tier; T.sim(28); out.t44 = R.tier; out.bails = R.bails; out.state = R.state; return out; }, [allOpen, ride]);
      t.eq(r.midStart, 'idle', 'flying onto the middle of the track does not start a run');
      t.eq([r.t7, r.t8, r.t16, r.t44], [0, 1, 2, 5], 'a tier every 8 s, capped at 5'); t.eq(r.bails, 0, 'no bails'); t.eq(r.state, 'run', 'still running');
      return r;
    } },
  { id: 'RUN-004-bail', req: 'RUN-004', name: 'A bail (off, high, slow or a bump) drops one tier and the run goes on; off for more than 2 s ends it',
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const go = eval(ride), R = __run.RUN, A = () => R.auto, out = {};
        go({ i: 2, spd: 22 }, 24.5); out.start = R.tier;
        A().lat = 5; T.sim(0.5); A().lat = 0; T.sim(0.5); out.off = [R.tier, R.state, R.why];
        A().alt = 8; T.sim(0.5); A().alt = 1.4; T.sim(0.5); out.high = [R.tier, R.state, R.why];
        A().spd = 8; T.sim(0.5); A().spd = 22; T.sim(0.5); out.slow = [R.tier, R.state, R.why];
        R.lastSpd = 40; T.sim(1 / 60); out.bump = [R.tier, R.state, R.why]; out.bails = R.bails;
        A().lat = 6; T.sim(2.5); out.lost = [R.state, R.result]; return out; }, [allOpen, ride]);
      t.eq(r.start, 3, 'at tier 3 after 24 s');
      t.eq(r.off, [2, 'run', 'off'], 'off the track: one tier down, still running');
      t.eq(r.high, [1, 'run', 'high'], 'too high: one tier down');
      t.eq(r.slow, [0, 'run', 'slow'], 'too slow: one tier down');
      t.eq(r.bump, [0, 'run', 'bump'], 'a bump counts as a bail too (no tier left to lose)'); t.eq(r.bails, 4, 'four bails counted');
      t.eq(r.lost, ['ended', 'lost'], 'off the track for more than 2 s ends the run');
      return r;
    } },
  { id: 'RUN-005-closed', req: 'RUN-005', name: 'With the zones closed the run stops at the walled garden: the trail is overgrown, and no challenge shows',
    async run(t) {
      const r = await t.ev((ride) => { const go = eval(ride), R = __run.RUN; go({ i: 2, spd: 22 }, 4); const goal4 = R.goalShown; for (let k = 0; k < 60 * 20 && R.state === 'run'; k++) T.sim(1 / 60);
        const g = __g, stop = R.S[R.stopAt]; return { full: R.full, goal4, state: R.state, result: R.result, text: document.getElementById('rungoal').textContent, stopInGarden: Math.hypot(stop.x - g.ORCH.x, stop.z - g.ORCH.z) < g.ZONES.garden.ring + 11, mem: R.mem.ch }; }, ride);
      t.eq(r.full, false, 'the loop is not all open'); t.eq(r.goal4, false, 'no challenge line');
      t.eq([r.state, r.result], ['ended', 'stopped'], 'the run stops'); t.eq(r.text, 'The trail is overgrown past here', 'and says why'); t.eq(r.stopInGarden, true, 'at the walled garden'); t.eq(r.mem, 0, 'no challenge won');
      return r;
    } },
  { id: 'RUN-006-cells', req: 'RUN-006', name: 'Five honeycomb cells show the tiers during a run only, the current one filling, and flicker off the track',
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const go = eval(ride), R = __run.RUN, hud = document.getElementById('runcells'), out = {};
        const fills = () => [...hud.children].map(c => parseFloat(c.firstChild.firstChild.style.height));
        T.fly(0, 0, 0); T.sim(0.2); out.idle = hud.style.opacity; go({ i: 2, spd: 22 }, 12); out.run = hud.style.opacity; out.fills = fills();
        R.auto.lat = 5; T.sim(0.3); const o = []; for (let k = 0; k < 8; k++) { T.sim(1 / 60); o.push(hud.children[0].style.opacity); } out.flicker = new Set(o).size > 1;
        R.auto.lat = 6; T.sim(2.5); T.sim(3.5); out.after = hud.style.opacity; out.n = hud.children.length; return out; }, [allOpen, ride]);
      t.eq(r.n, 5, 'five cells'); t.eq(r.idle, '0', 'hidden when not running'); t.eq(r.run, '1', 'shown during a run');
      t.eq(r.fills[0], 100, 'tier 1 cell full'); t.check(r.fills[1] > 40 && r.fills[1] < 60, 'tier 2 cell half full after 12 s: ' + r.fills[1]); t.eq(r.fills.slice(2), [0, 0, 0], 'the rest empty');
      t.eq(r.flicker, true, 'the cells flicker off the track'); t.eq(r.after, '0', 'hidden again after the run');
      return r;
    } },
  { id: 'RUN-007-aura', req: 'RUN-007', name: 'The light round the bee is off out of the zone, grows with each tier, takes the tier colour, and goes out after the run',
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const go = eval(ride), R = __run.RUN, U = __g.U, out = {};
        T.fly(0, 0, 0); T.sim(0.5); out.idle = U.uAura.value.w; go({ i: 2, spd: 22 }, 10); out.t1 = U.uAura.value.w; out.c1 = U.uAuraC.value.toArray().map(v => +v.toFixed(2));
        T.sim(16); out.t3 = U.uAura.value.w; out.c3 = U.uAuraC.value.toArray().map(v => +v.toFixed(2)); out.near = __g.P.pos.distanceTo(new __g.THREE.Vector3(U.uAura.value.x, U.uAura.value.y, U.uAura.value.z)) < 1.5;
        __g.G.third = true; T.sim(0.2); out.halo = __g.scene.children.some(o => o.visible && o.material && o.material.uniforms && o.material.uniforms.uC);
        R.auto.lat = 6; T.sim(2.4); T.sim(3); out.after = U.uAura.value.w; return out; }, [allOpen, ride]);
      t.eq(r.idle, 0, 'no light out of the zone'); t.check(r.t1 > 0.5, 'light at tier 1: ' + r.t1); t.check(r.t3 > r.t1 * 1.5, 'brighter at tier 3: ' + r.t3);
      t.check(r.c1[0] > 0.9 && r.c1[2] < 0.4, 'gold at tier 1: ' + r.c1); t.check(r.c3[2] > 0.9 && r.c3[0] < 0.8, 'lavender at tier 3: ' + r.c3);
      t.eq(r.near, true, 'the light is at the bee'); t.eq(r.halo, true, 'a glow round the bee in follow view'); t.eq(r.after, 0, 'out after the run');
      return r;
    } },
  { id: 'RUN-008-challenges', req: 'RUN-008', name: 'The next challenge shows after 3 s (no prize named); finishing in the bee’s eyes wins it, saved; one per run; follow view does not win the first',
    open: { storage: { 'honeylight.run': null } },
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const go = eval(ride), R = __run.RUN, el = document.getElementById('rungoal'), out = {};
        go({ i: 2, spd: 24 }, 2.5); out.before = R.goalShown; T.sim(1); out.text1 = el.textContent; out.shown = el.style.opacity;
        __g.G.third = true; T.sim(70); out.thirdRun = [R.result, R.mem.ch]; __g.G.third = false; __run.stopAuto(); T.sim(4);
        go({ i: 2, spd: 24 }, 70); out.fpv = [R.result, R.mem.ch, el.textContent]; out.saved = JSON.parse(localStorage.getItem('honeylight.run')).ch; __run.stopAuto(); T.sim(4);
        go({ i: 2, spd: 24 }, 4); out.text2 = el.textContent; T.sim(66); out.second = [R.result, R.mem.ch];
        return out; }, [allOpen, ride]);
      t.eq(r.before, false, 'not before 3 s'); t.eq(r.text1, 'Challenge 1: Finish the loop in bee’s-eye view', 'the first challenge'); t.eq(r.shown, '1', 'it shows');
      t.eq(r.thirdRun, ['done', 0], 'a loop in follow view does not win challenge 1');
      t.eq(r.fpv, ['done', 1, 'Challenge 1 complete'], 'a loop in the bee’s eyes wins it'); t.eq(r.saved, 1, 'and it is saved');
      t.eq(r.text2, 'Challenge 2: Finish the loop while still glowing', 'the next one shows on the next run');
      t.eq(r.second, ['done', 2], 'the glowing finish wins challenge 2 only (one per run), though the run also had no bail and was in the bee’s eyes');
      return r;
    } },
];
