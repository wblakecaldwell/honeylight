// Hidden places and the day: scent trails, the brook, the bramble hollow, petal gusts, the end-of-day card.
// The day-end tests set DAY.t near 1. night.js holds the end of the day for the night, so they run with ?night=0.
const CARD = `window.__card = () => { const d = [...document.querySelectorAll('div')].find(d => d.textContent.startsWith('Night falls')); return d ? d.textContent : ''; };`;
module.exports = [
  { id: 'CHL-003-trail', req: 'CHL-003', name: 'Following a scent trail to its end gives 2 honey and an overflowing flower',
    async run(t) {
      const r = await t.ev(() => { const g = __g, P = g.P, TR = g.TRAIL; T.fly(60, 14, 60); T.quiet(); g.DAY.t = 0.4; g.G.zones = { garden: true, pond: true, forest: true }; g.G.orchard = true;
        const kind = g.trailRoutes()[0].kind, ok = g.startTrail(kind); const pts = TR.pts.map(p => p.clone()), h0 = g.G.honey;
        // fly the motes at 20 units a second (faster than the scent front)
        for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)]; T.place(p.x, p.y, p.z); T.sim(Math.max(1 / 60, p.distanceTo(q) / 20)); }
        T.sim(0.5); return { kind, ok, n: pts.length, honey: g.G.honey - h0, rich: TR.f.rich > 0, state: TR.state, trails: g.G.trails }; });
      t.check(r.ok, 'a trail starts'); t.eq(r.honey, 2, 'the end of the trail gives 2 honey'); t.check(r.rich, 'the flower at the end overflows'); t.eq(r.trails, 1, 'one trail counted');
      return r;
    } },

  { id: 'CHL-003-trail-fades', req: 'CHL-003', name: 'A scent trail that nobody follows fades with no reward',
    async run(t) {
      const r = await t.ev(() => { const g = __g, TR = g.TRAIL; T.fly(60, 14, 60); T.quiet(); g.DAY.t = 0.4; const ok = g.startTrail(g.trailRoutes()[0].kind);
        T.place(150, 40, 40); T.sim(40); return { ok, honey: g.G.honey, trails: g.G.trails, state: TR.state }; });
      t.check(r.ok, 'a trail starts'); t.eq(r.honey, 0, 'no honey'); t.eq(r.trails, 0, 'no trail counted'); t.check(r.state !== 'wait' && r.state !== 'run', 'the trail is over: ' + r.state);
      return r;
    } },

  { id: 'CHL-005-brook', req: 'CHL-005', name: 'Skimming low and fast over the brook gives a boost; high above it does not',
    async run(t) {
      const r = await t.ev(() => { const g = __g, P = g.P, B = g.BROOK.pts, x = (B[1][0] + B[2][0]) / 2, z = (B[1][1] + B[2][1]) / 2, dx = B[2][0] - B[1][0], dz = B[2][1] - B[1][1], k = 1 / Math.hypot(dx, dz);
        T.fly(); T.quiet(); g.G.zones = { garden: true, pond: true, forest: true };
        // find the water level: put the bee under it and let the brook lift it to the surface
        T.place(x, g.terrainH(x, z) + 0.2, z); T.sim(1 / 60); const wy = P.pos.y - 0.51;
        const run = (alt) => { g.G.boost = 0; T.place(x, wy + alt, z, Math.atan2(-dx, -dz), 0); P.vel.set(dx * k * 14, 0, dz * k * 14); let best = 0; for (let i = 0; i < 20; i++) { T.sim(1 / 60); best = Math.max(best, g.G.boost); } return +best.toFixed(2); };
        return { wy: +wy.toFixed(2), low: run(1.5), high: run(9) }; });
      t.check(r.low >= 0.9, 'low and fast: boost ' + r.low); t.check(r.high < 0.5, 'high above: no boost ' + r.high);
      return r;
    } },

  { id: 'CHL-006-hollow', req: 'CHL-006', name: 'The bramble hollow walls are solid; the root tunnel is the way in',
    async run(t) {
      const r = await t.ev(() => { const g = __g, P = g.P, H = g.HOLLOW, S = g.HOLROOT, gy = g.terrainH(H.x + H.r + 20, H.z); T.fly(); T.quiet(); g.G.zones = { garden: true, pond: true, forest: true };
        const dist = () => Math.hypot(P.pos.x - H.x, P.pos.z - H.z); const out = {};
        // fly straight at the wall
        T.lookAt(H.x + H.r + 20, gy + 3, H.z, H.x, gy + 3, H.z); T.key('KeyW'); let min = 1e9; for (let i = 0; i < 180; i++) { T.sim(1 / 60); P.pos.y = gy + 3; min = Math.min(min, dist()); } T.key('KeyW', false); out.wallMin = +min.toFixed(2);
        // follow the root from its outer end
        const a = S[0], b = S[S.length - 1], outer = Math.hypot(a.x - H.x, a.z - H.z) > Math.hypot(b.x - H.x, b.z - H.z) ? 1 : -1, path = outer > 0 ? S : S.slice().reverse();
        T.place(path[0].x, path[0].y, path[0].z); for (let i = 1; i < path.length; i++) { for (let f = 0; f < 120 && P.pos.distanceTo(path[i]) > 0.5; f++) { P.vel.copy(path[i]).sub(P.pos).setLength(6); T.sim(1 / 60); } }
        out.rootEnd = +dist().toFixed(2); out.r = H.r; return out; });
      t.check(r.wallMin > r.r, `the wall stops the bee (closest ${r.wallMin}, wall radius ${r.r})`); t.check(r.rootEnd < r.r - 1.5, `the root leads inside (end ${r.rootEnd} from the centre)`);
      return r;
    } },

  { id: 'GFX-008-bramble', req: 'GFX-008', name: 'The mound over the night grove is a bramble thicket: leaves, arching thorny canes, blackberries; nothing of it hangs in the grove',
    async run(t) {
      const r = await t.ev(() => { const g = __g, H = g.HOLLOW, L = g.HOL, gy = L.gy; let leavesIn = 0, leavesOut = 0, top = 0, im = null;
        g.scene.traverse(o => { if (o.isInstancedMesh && o.count === L.leaves && !im) im = o; });
        const m = im.instanceMatrix.array; for (let i = 0; i < im.count; i++) { const sx = Math.hypot(m[i * 16], m[i * 16 + 1], m[i * 16 + 2]); if (sx < 0.01) continue; const x = m[i * 16 + 12], y = m[i * 16 + 13], z = m[i * 16 + 14], d = Math.hypot(x - H.x, z - H.z);
          if (d < H.r - 2 && y < gy + 8) leavesIn++; else leavesOut++; top = Math.max(top, y - gy); }
        return { berries: L.berries, canes: L.canes, leavesIn, leavesOut, top: +top.toFixed(1) }; });
      t.check(r.leavesOut > 1500, 'leaves cover the thicket: ' + r.leavesOut); t.eq(r.leavesIn, 0, 'no leaves hang in the grove');
      t.check(r.canes >= 30, 'arching canes: ' + r.canes); t.check(r.berries >= 100, 'blackberries: ' + r.berries); t.check(r.top > 16 && r.top < 24, 'the leaves stay close to the solid roof (top ' + r.top + ')');
      return r;
    } },

  { id: 'CHL-007-gust', req: 'CHL-007', name: 'A petal gust carries the bee along with it',
    async run(t) {
      const r = await t.ev(() => { const g = __g, P = g.P, GU = g.GUSTS[0]; T.fly(150, 30, 40); T.quiet(); GU.next = 1e9; g.GUSTS[1].next = 1e9;
        const drift = (gust) => { T.place(150, 30, 40); if (gust) { GU.on = true; GU.t = 3; GU.dir.set(1, 0, 0); GU.c.set(150, 30, 40); } else GU.on = false; T.sim(1.5); return +(P.pos.x - 150).toFixed(2); };
        return { calm: drift(false), gust: drift(true), boost: +g.G.boost.toFixed(2) }; });
      t.check(r.gust > r.calm + 2.5, `the gust carries the bee (with ${r.gust}, without ${r.calm})`);
      return r;
    } },

  { id: 'ZON-005-day-card', req: 'ZON-005', name: 'The end-of-day card shows the bonus: 10 / 22 / 40 honey give +3 / +8 / +15', open: { query: '?night=0' },
    async run(t) {
      await t.ev(CARD);
      const r = await t.ev(() => { const g = __g, D = g.DAY; T.fly(0, 13, 6); T.quiet(); const out = [];
        for (const h of [9, 10, 22, 40]) { D.streak = 0; D.honey = h; D.t = 0.999; const h0 = g.G.honey; T.sim(1.5); const card = __card(); for (let i = 0; i < 30 && D.ending > 0; i++) T.sim(0.5); const m = card.match(/\+(\d+) honey/);
          out.push({ h, shown: m ? +m[1] : 0, got: g.G.honey - h0 }); T.fly(0, 13, 6); }
        return out; });
      t.eq(r.map(x => x.shown), [0, 3, 8, 15], 'bonus on the card'); t.eq(r.map(x => x.got), [0, 3, 8, 15], 'bonus honey given');
      return r;
    } },

  { id: 'ZON-004-night-loss', req: 'ZON-004', name: 'Pollen outside the hive at nightfall is lost', open: { query: '?night=0' },
    async run(t) {
      await t.ev(CARD);
      const r = await t.ev(() => { const g = __g, P = g.P, D = g.DAY; T.fly(150, 30, 40); T.quiet(); P.load = [1, 2, 1]; P.pollen = 3; D.t = 0.999; const h0 = g.G.honey;
        T.sim(1.5); const card = __card(); T.sim(2); return { lost: D.lost, card: /3 pollen left outside/.test(card), load: P.load.length, honey: g.G.honey - h0 }; });
      t.eq(r.lost, 3, '3 pollen lost'); t.check(r.card, 'the card says so'); t.eq(r.load, 0, 'baskets empty in the morning'); t.eq(r.honey, 0, 'no honey from lost pollen');
      return r;
    } },
];
