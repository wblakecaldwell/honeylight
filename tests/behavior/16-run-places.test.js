// The long run's places (src/burrow.js, gardenway.js, waterway.js, mossway.js, highbranch.js): the mole tunnel, the garden pieces, the spring and its waterfall,
// the reed arches, the mossy forest way with its hollow log, and the high branch.
// Solid parts are checked with __g.collide, the same test the bee itself gets. __kit.SOLIDS lists every solid shape of the places with a tag.
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '..', '..', 'src');
const allOpen = `() => { const G = __g; for (const k in G.ZONES) G.G.zones[k] = true; G.G.orchard = true; }`;
// mv(x, y, z): how far the game pushes a bee put at that point (0 = free air). Probe a shape a little off its middle: a ball exactly on the middle has no way out and is left alone
const mvSrc = `(x, y, z) => { const V = __g.THREE.Vector3, p = new V(x, y, z), v = new V(); __g.collide(p, v); return +Math.hypot(p.x - x, p.y - y, p.z - z).toFixed(3); }`;
// fly a lap with normal flight and steering, like RUN-002. With high = true the bee takes the high branch: it steers along the wood while it is near it.
// drop: at this sample of the high branch the bee is put 9 lower (it falls off). Returns what happened.
const lapSrc = `(high, drop) => { const R = __run.RUN, G = __g, P = G.P, HB = __high.HIGH, s0 = R.S[2], t0 = R.T[2], out = { upSeen: 0, upMax: 0 };
  T.fly(s0.x, __run.groundAt(s0.x, s0.z) + 2.4, s0.z, Math.atan2(-t0.x, -t0.z), 0); T.quiet(); P.vel.set(t0.x * 22, 0, t0.z * 22); T.key('KeyW');
  let i = 2, k = 0, started = false, dropped = false; for (; k < 60 * 100; k++) { const hn = high ? __high.highNear(P.pos.x, P.pos.z) : null, onH = !!hn && !dropped && i >= HB.i0 - 1 && i <= HB.i1 + 1 && hn.j < HB.N - 2 && (hn.j > 0 || i <= HB.i0 + 3); let q, top, qTop;
    if (onH) { q = HB.S[Math.min(HB.N - 1, hn.j + 6)]; top = hn.top; qTop = q.y; i = Math.round(HB.i0 + hn.j / (HB.N - 1) * (HB.i1 - HB.i0)); if (drop && hn.j >= drop) { dropped = true; out.before = { bails: R.bails, up: R.up }; P.pos.y -= 9; } }
    else { const nb = __run.nearest(P.pos.x, P.pos.z, i, 40); i = nb.i; q = R.S[(i + 6) % R.N]; top = __run.groundAt(P.pos.x, P.pos.z); qTop = __run.groundAt(q.x, q.z); }
    const dx = q.x - P.pos.x, dz = q.z - P.pos.z; P.yaw = Math.atan2(-dx, -dz); const alt = P.pos.y - top; P.pitch = Math.max(-0.7, Math.min(0.7, ((onH ? 2.2 : 2.6) - alt) * 0.5 + Math.atan2(qTop - top, 7.2)));
    const b0 = R.bails; T.sim(1 / 60); if (R.bails > b0) (out.log = out.log || []).push([i, hn ? hn.j : -1, R.why, +P.pos.x.toFixed(1), +P.pos.y.toFixed(1), +P.pos.z.toFixed(1), +alt.toFixed(1), +P.vel.length().toFixed(1), R.up, onH].join(' ')); if (R.up) { out.upSeen++; out.upMax = Math.max(out.upMax, P.pos.y - __run.groundAt(P.pos.x, P.pos.z)); }
    if (dropped && !out.after && R.bails > out.before.bails) { out.after = { bails: R.bails, why: R.why, up: R.up, tier: R.tier }; break; }
    if (R.state === 'run') started = true; if (started && R.state !== 'run') break; }
  T.key('KeyW', false); return Object.assign(out, { started, result: R.result, bails: R.bails, why: R.why, secs: +(k / 60).toFixed(1), tier: R.tier, last: R.last, ch: R.mem.ch, text: document.getElementById('rungoal').textContent, hiN: R.hiN, upN: HB.upN }); }`;

module.exports = [
  { id: 'RUN-011-mole-tunnel', req: 'RUN-011', name: 'The track goes under the big hill by the mole tunnel: the bee can be under the hill inside it, and its wall and roof hold the bee in',
    async run(t) {
      const r = await t.ev(([allOpen, mvSrc]) => { eval(allOpen)(); const mv = eval(mvSrc), B = __burrow.BURROW, G = __g, V = G.THREE.Vector3, m = B.n >> 1, c = B.C[m], d = B.C[m + 1].clone().sub(B.C[m - 1]).setY(0).normalize(), sx = -d.z, sz = d.x, out = {};
        out.closed = B.iOut - B.iIn; out.cover = Math.max(...B.cover); out.fungi = B.fungi.length; out.th = G.terrainH(c.x, c.z); out.fy = B.fy[m];
        out.floorIsGround = __run.groundAt(c.x, c.z) === B.fy[m]; out.free = mv(c.x, B.fy[m] + 1.4, c.z);
        const p = new V(c.x + sx * 2.9, c.y, c.z + sz * 2.9), v = new V(); G.collide(p, v); out.wallBack = +Math.hypot(p.x - c.x, p.z - c.z).toFixed(2);
        const q = new V(c.x, c.y + 2.9, c.z); G.collide(q, v); out.roofBack = +(q.y - c.y).toFixed(2);
        const H0 = G.HILLS[0], u = new V(H0.x, G.terrainH(H0.x, H0.z) - 6, H0.z); G.collide(u, v); out.elsewhere = +(u.y - G.terrainH(H0.x, H0.z)).toFixed(2);
        out.inMid = __burrow.inBurrow(new V(c.x, B.fy[m] + 1.4, c.z)); out.inOver = __burrow.inBurrow(new V(c.x, out.th + 2, c.z));
        out.stones = __kit.SOLIDS.filter(s => s.tag === 'mouth stone' || s.tag === 'mouth root' || s.tag === 'molehill').length; return out; }, [allOpen, mvSrc]);
      t.check(r.closed > 40, 'the roof is closed over a long stretch: ' + r.closed + ' samples'); t.check(r.cover > 10, 'deep under the hill: ' + r.cover.toFixed(1));
      t.check(r.fy < r.th - 10, 'the floor in the middle is far under the hill top there'); t.eq(r.floorIsGround, true, 'the track runs on the tunnel floor');
      t.eq(r.free, 0, 'a bee on the track in the middle of the tunnel is not pushed'); t.eq([r.inMid, r.inOver], [true, false], 'inBurrow knows the bee in it from the bee over the hill');
      t.check(r.wallBack <= 3.0 - 0.36 + 0.05, 'the wall holds the bee in: ' + r.wallBack); t.check(r.roofBack <= 3.0 - 0.36 + 0.05, 'the roof holds the bee in: ' + r.roofBack);
      t.check(r.elsewhere >= 0.3, 'anywhere else under the hill the bee is put back on the ground: ' + r.elsewhere);
      t.check(r.fungi >= 5, 'glowing fungus lights it: ' + r.fungi); t.check(r.stones >= 6, 'stones, roots and molehills at its mouths: ' + r.stones);
      return r;
    } },

  { id: 'RUN-012-garden-pieces', req: 'RUN-012', name: 'In the garden the track goes through a tipped pot, under a bean row and between seed trays; their walls, canes and trays are solid',
    async run(t) {
      const r = await t.ev(([allOpen, mvSrc]) => { eval(allOpen)(); const mv = eval(mvSrc), GW = __gardenway.GARDENWAY, S = __kit.SOLIDS, out = {};
        const a = GW.pot.a, b = GW.pot.b, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, mz = (a.z + b.z) / 2, ri = (GW.pot.r0 + GW.pot.r1) / 2;
        out.potAxis = mv(mx, my, mz); out.potWall = mv(mx - GW.pot.dz * (ri + 0.2), my, mz + GW.pot.dx * (ri + 0.2)); out.potRoof = mv(mx, my + ri + 0.2, mz); out.pots = S.filter(s => s.tag === 'pot').length;
        const canes = S.filter(s => s.tag === 'bean cane'); out.canes = canes.length; const c = canes[0]; out.cane = mv((c.a.x + c.b.x) / 2 + 0.06, (c.a.y + c.b.y) / 2, (c.a.z + c.b.z) / 2 + 0.03);
        const trays = S.filter(s => s.tag === 'seed tray'); out.trays = trays.length; out.tray = mv(trays[0].c.x + 0.06, trays[0].c.y, trays[0].c.z);
        const R = __run.RUN, near = (x, z) => __run.nearest(x, z).d; out.potOnTrack = +near(mx, mz).toFixed(2); out.trayLane = +Math.min(...trays.map(s => near(s.c.x, s.c.z))).toFixed(2); return out; }, [allOpen, mvSrc]);
      t.eq(r.pots, 1, 'one pot'); t.eq(r.potAxis, 0, 'the middle of the pot is free'); t.check(r.potWall > 0.05 && r.potRoof > 0.05, 'its wall is solid: ' + r.potWall + ', ' + r.potRoof); t.check(r.potOnTrack < 1, 'the track goes through it: ' + r.potOnTrack);
      t.check(r.canes >= 8, 'a row of bean canes: ' + r.canes); t.check(r.cane > 0.05, 'a cane is solid: ' + r.cane);
      t.eq(r.trays, 4, 'four seed trays'); t.check(r.tray > 0.05, 'a tray is solid: ' + r.tray); t.check(r.trayLane > 3, 'the trays stand beside the track, not on it: ' + r.trayLane);
      return r;
    } },

  { id: 'RUN-013-spring-waterfall', req: 'RUN-013', name: 'A spring rock by the pond: the rill falls from a flat stone, the track goes under it, and the falling water wets a bee that flies through it',
    async run(t) {
      const r = await t.ev(([allOpen, mvSrc]) => { eval(allOpen)(); const mv = eval(mvSrc), W = __waterway.WATERWAY, G = __g, P = G.P, S = __kit.SOLIDS, out = {};
        const rock = S.filter(s => s.tag === 'spring rock'); out.rocks = rock.length; out.rock = mv(rock[0].c.x + 0.1, rock[0].c.y + 0.1, rock[0].c.z);
        const sl = W.slab, nb = __run.nearest(sl.x, sl.z); out.slabOverTrack = +nb.d.toFixed(2); const s = __run.RUN.S[nb.i]; out.under = mv(s.x, G.WY + 1.4, s.z); out.slabClear = +(sl.y - sl.s[1] - G.WY).toFixed(2); out.inSlab = mv(sl.x + 0.1, sl.y + 0.1, sl.z);
        const f = W.fall; out.fallH = +(f.top - G.WY).toFixed(2); out.fallSide = +__run.nearest(f.x, f.z).d.toFixed(2);
        T.fly(f.x, G.WY + 5, f.z); T.quiet(); P.wet = 0; T.sim(0.3); out.wetIn = +P.wet.toFixed(2);
        T.fly(f.x + f.tx * 7, G.WY + 5, f.z + f.tz * 7); P.wet = 0; T.sim(0.3); out.wetOut = +P.wet.toFixed(2); return out; }, [allOpen, mvSrc]);
      t.check(r.rocks >= 10, 'a rib of rock: ' + r.rocks + ' stones'); t.check(r.rock > 0.3, 'the rock is solid: ' + r.rock);
      t.check(r.slabOverTrack < 2.5, 'the flat stone is over the track: ' + r.slabOverTrack); t.check(r.inSlab > 0.05, 'the flat stone is solid'); t.eq(r.under, 0, 'the track under it is free');
      t.check(r.slabClear > 4, 'room to fly under it: ' + r.slabClear); t.check(r.fallH > 5, 'the water falls a good way: ' + r.fallH); t.check(r.fallSide > 2 && r.fallSide < 6, 'the falling water is beside the track, so the bee passes behind it: ' + r.fallSide);
      t.check(r.wetIn > 0.4, 'the falling water wets the bee: ' + r.wetIn); t.eq(r.wetOut, 0, 'beside it the bee stays dry');
      return r;
    } },

  { id: 'RUN-014-reed-arches', req: 'RUN-014', name: 'Past the waterfall four clumps of reeds lean over the track; their stems are solid at the sides, and the pond’s own reeds stand off the track',
    async run(t) {
      const r = await t.ev(([allOpen, mvSrc]) => { eval(allOpen)(); const mv = eval(mvSrc), W = __waterway.WATERWAY, G = __g, R = __run.RUN, S = __kit.SOLIDS, out = {};
        const stems = S.filter(s => s.tag === 'reed stems'); out.stems = stems.length; out.arches = W.archAt.length; out.stem = mv((stems[0].a.x + stems[0].b.x) / 2 + 0.06, (stems[0].a.y + stems[0].b.y) / 2, (stems[0].a.z + stems[0].b.z) / 2 + 0.03);
        out.sides = W.archAt.map(j => { const p = R.S[j], tg = R.T[j], lat = stems.filter(s => Math.hypot(s.x - p.x, s.z - p.z) < 8).map(s => (s.a.x - p.x) * -tg.z + (s.a.z - p.z) * tg.x); return [lat.filter(l => l < -3.3).length, lat.filter(l => l > 3.3).length, lat.filter(l => Math.abs(l) <= 3.3).length]; });
        out.overWater = W.archAt.every(j => G.terrainH(R.S[j].x, R.S[j].z) < G.WY); out.middle = Math.max(...W.archAt.map(j => mv(R.S[j].x, G.WY + 1.4, R.S[j].z)), ...W.archAt.map(j => mv(R.S[j].x, G.WY + 4.5, R.S[j].z)));
        const pr = __waterway.pondReeds, m = new G.THREE.Matrix4(); let gone = 0, onTrack = 0; for (let i = 0; i < pr.n; i++) { pr.reeds.getMatrixAt(i, m); const e = m.elements; if (Math.abs(e[5]) < 1e-6) { gone++; continue; } if (__run.nearest(e[12], e[14]).d < 4.4) onTrack++; }
        out.reedsGone = gone; out.reedsOnTrack = onTrack; out.reeds = pr.n; out.pads = W.pads.every(p => G.pads.some(q => q.x === p[0] && q.z === p[1])); return out; }, [allOpen, mvSrc]);
      t.eq(r.arches, 4, 'four reed arches'); t.eq(r.sides, [[1, 1, 0], [1, 1, 0], [1, 1, 0], [1, 1, 0]], 'each has a bundle of stems on both sides and none in the middle');
      t.check(r.stem > 0.05, 'the stems are solid: ' + r.stem); t.eq(r.middle, 0, 'the middle is free, low and high (the leaning leaves are not solid)'); t.eq(r.overWater, true, 'they stand in the pond');
      t.check(r.reedsGone > 0 && r.reedsGone < r.reeds, 'some of the pond’s own reeds were taken away: ' + r.reedsGone + ' of ' + r.reeds); t.eq(r.reedsOnTrack, 0, 'none of the pond’s reeds stands on the track');
      t.eq(r.pads, true, 'the new lily pads are real pads');
      return r;
    } },

  { id: 'RUN-015-mossy-way', req: 'RUN-015', name: 'In the forest the grass stands back from the track; roots arch over it at four spots, a hollow log lies on it, and they are solid',
    async run(t) {
      const r = await t.ev(([allOpen, mvSrc]) => { eval(allOpen)(); const mv = eval(mvSrc), M = __mossway.MOSSWAY, G = __g, R = __run.RUN, S = __kit.SOLIDS, out = {}; let grass = 0;
        for (let j = M.iA + 4; j < M.iB - 4; j += 3) { const p = R.S[j], tg = R.T[j]; grass = Math.max(grass, __kit.clearAt(p.x, p.z), __kit.clearAt(p.x - tg.z * 6, p.z + tg.x * 6), __kit.clearAt(p.x + tg.z * 6, p.z - tg.x * 6)); } out.grass = grass; out.zone = R.zone[M.jLog];
        out.arches = M.arches.map(a => { const p = R.S[a.j], g = G.terrainH(p.x, p.z); return [mv(p.x, g + 1.4, p.z), mv(p.x, g + 3.4, p.z), mv(p.x, g + M.arch.high, p.z) > 0.05]; });
        out.archSticks = S.filter(s => s.tag === 'root arch').length; out.roots = S.filter(s => s.tag === 'root').length; out.stump = S.filter(s => s.tag === 'stump').length;
        const sideOf = s => { const x = s.c ? s.c.x : s.x, z = s.c ? s.c.z : s.z, w = s.kind === 'stone' ? Math.max(s.s[0], s.s[2]) : s.r; return __run.nearest(x, z).d - w; };
        out.rootEdge = +Math.min(...S.filter(s => s.tag === 'root').map(sideOf).filter(v => v < 1e6)).toFixed(2); const stones = S.filter(s => s.tag === 'mossy stone'); out.stones = stones.length; out.stoneEdge = +Math.min(...stones.map(sideOf)).toFixed(2); out.stone = mv(stones[0].c.x + 0.1, stones[0].c.y + 0.1, stones[0].c.z);
        const L = M.log, a = L.a, b = L.b, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, mz = (a.z + b.z) / 2; out.logs = S.filter(s => s.tag === 'hollow log').length;
        out.logAxis = mv(mx, my, mz); out.logWall = mv(mx, my + L.r + L.wall / 2, mz); out.logOver = mv(mx, my + L.r + L.wall + 1.2, mz); out.logOnTrack = +__run.nearest(mx, mz).d.toFixed(2); out.logLen = +Math.hypot(b.x - a.x, b.z - a.z).toFixed(1);
        const p = R.S[M.jLog]; out.logTrack = mv(p.x, G.terrainH(p.x, p.z) + 1.4, p.z); return out; }, [allOpen, mvSrc]);
      t.eq(r.grass, 0, 'no tall grass on the way or 6 to its sides'); t.eq(r.zone, 'forest', 'it is in the forest');
      t.eq(r.arches, [[0, 0, true], [0, 0, true], [0, 0, true], [0, 0, true]], 'four root arches: free under them, solid at their top');
      t.check(r.roots >= 40, 'big roots: ' + r.roots + ' solid pieces'); t.eq(r.stump, 1, 'the old stump'); t.check(r.rootEdge >= 3.0, 'roots on the ground keep off the track: ' + r.rootEdge);
      t.check(r.stones >= 5 && r.stone > 0.05, 'mossy stones, solid: ' + r.stones); t.check(r.stoneEdge >= 3.6, 'the solid stones stand outside the track’s width: ' + r.stoneEdge);
      t.eq(r.logs, 1, 'one hollow log'); t.check(r.logOnTrack < 1 && r.logLen > 12, 'it lies along the track: ' + r.logOnTrack + ', ' + r.logLen + ' long');
      t.eq([r.logAxis, r.logTrack, r.logOver], [0, 0, 0], 'free through its middle and over it'); t.check(r.logWall > 0.05, 'its wall is solid: ' + r.logWall);
      return r;
    } },

  { id: 'RUN-016-high-branch', req: 'RUN-016', name: 'The high branch leaves the track before the forest and joins it after: wood under the bee, nothing solid on the way, high under the crowns',
    async run(t) {
      const r = await t.ev(([allOpen, mvSrc]) => { eval(allOpen)(); const mv = eval(mvSrc), HB = __high.HIGH, G = __g, R = __run.RUN, out = {}, S = HB.S;
        out.N = HB.N; out.ends = [+S[0].distanceTo(new G.THREE.Vector3(R.S[HB.i0].x, G.terrainH(R.S[HB.i0].x, R.S[HB.i0].z), R.S[HB.i0].z)).toFixed(2), +Math.hypot(S[HB.N - 1].x - R.S[HB.i1].x, S[HB.N - 1].z - R.S[HB.i1].z).toFixed(2)];
        out.endLift = [+HB.lift[0].toFixed(2), +HB.lift[HB.N - 1].toFixed(2)]; out.maxLift = +Math.max(...HB.lift).toFixed(1); out.zones = [R.zone[HB.i0], R.zone[HB.i1]];
        let step = 0; for (let j = 1; j < HB.N; j++) step = Math.max(step, S[j].distanceTo(S[j - 1])); out.step = +step.toFixed(2);
        let hits = 0, first = -1, wood = 0, span = 0; const jA = HB.trunkJ[0], jB = S.findIndex(p => p.x > HB.way[HB.bough - 1][0]);
        for (let j = 0; j < HB.N; j++) { if (HB.lift[j] < 1) continue; for (const dy of [1.4, 2.4, 3.6]) if (mv(S[j].x, S[j].y + dy, S[j].z) > 0.05) { hits++; if (first < 0) first = j; } if (j >= jA && j <= jB) { span++; if (mv(S[j].x, S[j].y - 0.45, S[j].z) > 0.05) wood++; } }
        out.hits = hits; out.first = first; out.wood = +(wood / span).toFixed(2); out.span = span; out.far = +Math.max(...S.map(p => __run.nearest(p.x, p.z).d > 1e6 ? 99 : __run.nearest(p.x, p.z).d)).toFixed(0);
        const k = __kit.SOLIDS; out.trunk = k.filter(s => s.tag === 'fallen trunk').length; out.boughs = k.filter(s => s.tag === 'bough').length;
        const mid = S[HB.N >> 1], tm = HB.T[HB.N >> 1], hn = __high.highNear(mid.x - tm.z * 2, mid.z + tm.x * 2), away = __high.highNear(0, 0); out.near = hn && [hn.lat < 2.1 && hn.lat > 1.9, Math.abs(hn.top - mid.y) < 0.3]; out.away = away; return out; }, [allOpen, mvSrc]);
      t.check(r.N > 150, 'a long way: ' + r.N + ' samples'); t.check(r.step < 1.5, 'no jump in it: ' + r.step); t.check(r.ends[0] < 0.3 && r.ends[1] < 0.3, 'it starts and ends on the track: ' + r.ends);
      t.check(r.endLift[0] < 0.3 && r.endLift[1] < 0.3, 'on the ground at both ends: ' + r.endLift); t.check(r.maxLift > 17 && r.maxLift < 27, 'high over the forest floor in the middle: ' + r.maxLift);
      t.eq(r.zones, ['', ''], 'it leaves the track before the forest and joins it after'); t.eq(r.hits, 0, 'nothing solid on the way at flying height (first at sample ' + r.first + ')');
      t.check(r.wood > 0.9, 'there is wood under the way from the foot of the trunk to the last bough: ' + r.wood + ' of ' + r.span + ' samples'); t.check(r.trunk >= 8 && r.boughs >= 30, 'the fallen trunk and the boughs are solid: ' + r.trunk + ', ' + r.boughs);
      t.eq(r.near, [true, true], 'highNear finds the way and the height of the wood'); t.eq(r.away, null, 'and nothing far from it');
      return r;
    } },

  { id: 'RUN-016-high-lap', req: 'RUN-016', name: 'With normal flight a bee flies the loop by the high branch without a bail, and that wins challenge 3',
    open: { storage: { 'honeylight.run': JSON.stringify({ ch: 2 }) } },
    async run(t) {
      const r = await t.ev(([allOpen, lapSrc]) => { eval(allOpen)(); const out = eval(lapSrc)(true, 0); out.saved = JSON.parse(localStorage.getItem('honeylight.run')).ch; return out; }, [allOpen, lapSrc]);
      t.eq([r.result, r.bails], ['done', 0], 'all the way round, no bail (bails: ' + JSON.stringify(r.log || []) + ')'); t.eq(r.tier, 5, 'at the top tier at the end');
      t.eq(r.last.high, true, 'the run went by the high branch'); t.check(r.hiN >= 0.85 * r.upN, 'it kept to it: ' + r.hiN + ' of ' + r.upN);
      t.check(r.upMax > 17, 'the bee was high over the forest floor and still in the zone: ' + r.upMax.toFixed(1));
      t.eq([r.ch, r.text, r.saved], [3, 'Challenge 3 complete. Something new is waiting at home.', 3], 'challenge 3 is won and saved'); t.check(r.secs > 40 && r.secs < 85, 'in about a minute: ' + r.secs);
      return { secs: r.secs, hiN: r.hiN, upN: r.upN, upMax: r.upMax };
    } },

  { id: 'RUN-016-low-lap', req: 'RUN-016', name: 'A clean lap by the ground is not "by the high branch": challenge 3 stays open',
    open: { storage: { 'honeylight.run': JSON.stringify({ ch: 2 }) } },
    async run(t) {
      const r = await t.ev(([allOpen, lapSrc]) => { eval(allOpen)(); return eval(lapSrc)(false, 0); }, [allOpen, lapSrc]);
      t.eq([r.result, r.bails], ['done', 0], 'all the way round, no bail'); t.eq(r.last.high, false, 'not by the high branch'); t.check(r.hiN < 0.2 * r.upN, 'it only brushed the ends of the branch: ' + r.hiN + ' of ' + r.upN);
      t.eq([r.ch, r.text], [2, 'All the way round'], 'challenge 3 is not won');
      return { secs: r.secs, hiN: r.hiN };
    } },

  { id: 'RUN-016-high-drop', req: 'RUN-016', name: 'A bee that drops off the high branch gets a bail and is not on it any more; the run does not count as "high"',
    async run(t) {
      const r = await t.ev(([allOpen, lapSrc]) => { eval(allOpen)(); const lap = eval(lapSrc); return lap(true, 100); }, [allOpen, lapSrc]);
      t.eq(r.before, { bails: 0, up: true }, 'up on the branch, clean so far'); t.check(!!r.after, 'the drop gave a bail');
      if (r.after) { t.eq(r.after.bails, 1, 'one bail'); t.eq(r.after.up, false, 'not on the branch any more'); t.check(['off', 'high'].includes(r.after.why), 'because it is off both ways: ' + r.after.why); }
      t.check(r.hiN < 0.85 * r.upN, 'too little of the branch for a "high" run: ' + r.hiN + ' of ' + r.upN);
      return r;
    } },

  { id: 'RUN-017-own-random', req: 'RUN-017', name: 'The places build with their own random numbers: every setup step runs inside quietBuild and none uses the game’s rnd or Math.random',
    async run(t) {
      const files = ['runkit.js', 'burrow.js', 'gardenway.js', 'waterway.js', 'mossway.js', 'highbranch.js', 'solids.js'], bad = [];
      for (const f of files) { const src = fs.readFileSync(path.join(SRC, f), 'utf8');
        src.split('\n').forEach((l, i) => { if (/^export function setup\w+\(/.test(l) && !l.includes('quietBuild(')) bad.push(`${f}:${i + 1} a setup step outside quietBuild`);
          if (/\brnd\b/.test(l.replace(/\/\/.*$/, ''))) bad.push(`${f}:${i + 1} uses rnd`); if (/Math\.random/.test(l.replace(/\/\/.*$/, '')) && !l.startsWith('export function quietBuild')) bad.push(`${f}:${i + 1} uses Math.random`); }); }
      t.eq(bad, [], 'lines that could draw from the game’s random stream');
      const r = await t.ev(() => ({ solids: __kit.SOLIDS.length, tags: [...new Set(__kit.SOLIDS.map(s => s.tag))].sort(), noTag: __kit.SOLIDS.filter(s => !s.tag).length }));
      t.check(r.solids > 150, 'the places have their solid shapes: ' + r.solids); t.eq(r.noTag, 0, 'each solid shape says what it is');
      return r;
    } },

  { id: 'RUN-018-first-loop-stays', req: 'RUN-018', name: 'Where the line of the track has not moved, the samples of the first loop stay: the places change the track only where they stand',
    async run(t) {
      const r = await t.ev(() => { const R = __run.RUN, F = R.first; let h = 0; for (const p of F.S) for (const v of [p.x, p.z]) h = (h * 31 + Math.round(v * 1000)) % 2147483647;
        let moved = 0, stay = 0, order = 0, prev = -1, far = 0, lo = 9, hi = 0; const starts = new Set();
        for (let i = 0; i < R.N; i++) { const a = R.S[i], b = R.S[(i + 1) % R.N], d = Math.hypot(a.x - b.x, a.z - b.z); lo = Math.min(lo, d); hi = Math.max(hi, d);
          if (R.own[i] >= 0) { starts.add(R.own[i]); continue; } const j = R.K[i], q = F.S[j]; stay++; if (!q || q.x !== a.x || q.z !== a.z || !F.keep[j]) moved++; if (j <= prev) order++; prev = j; }
        /* a new sample is laid only for a place: each one is near a mole tunnel, garden, spring or pond point of the loop */
        const at = (x, z) => { const n = __run.nearest(x, z); return n.d < 3 ? R.own[n.i] : -2; };
        return { firstN: F.N, h, N: R.N, dewN: R.dewN, stay, moved, order, starts: starts.size, lo, hi,
          old: [[-148, -222], [-120, 241], [40, 172], [-258, 212]].map(p => at(p[0], p[1])), fresh: [__burrow.BURROW.way[1], __waterway.WATERWAY.way[3]].map(p => at(p[0], p[1])) }; });
      t.eq([r.firstN, r.h], [1353, 744042322], 'the first loop is as it was laid: its number of samples and the sum of where they are (if this fails, the list `first` in longrun.js was edited)');
      t.eq(r.moved, 0, 'a sample that stays is the same point as in the first loop'); t.eq(r.order, 0, 'and they stay in their order');
      t.check(r.stay - r.dewN > 600, 'more than half of the first loop stays: ' + (r.stay - r.dewN) + ' of ' + (r.firstN - r.dewN));
      t.eq(r.old, [-1, -1, -1, -1], 'round the hills, in the forest, in the meadow and by the brook the samples are the first loop’s own');
      t.check(r.fresh.every(o => o >= 0), 'in the mole tunnel and by the spring they are new: ' + r.fresh);
      t.check(r.lo > 0.8 && r.hi < 1.6, 'no gap and no crowd where new samples join old ones: steps from ' + r.lo.toFixed(3) + ' to ' + r.hi.toFixed(3));
      return r;
    } },
];
