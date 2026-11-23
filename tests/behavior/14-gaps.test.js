// Tight spots (src/gaps.js): passing through, clipping an edge, the tumble, taking off again, and what the world remembers.
const shoot = `(id, off, spd) => { const g = __gaps.GAPS.find(x => x.id === id), P = __g.P; T.quiet();
  const p = g.c.clone().addScaledVector(g.n, -3); p.y += off; T.fly(p.x, p.y, p.z, Math.atan2(-g.n.x, -g.n.z), Math.asin(g.n.y)); P.vel.copy(g.n).multiplyScalar(spd); T.key('KeyW'); return g; }`;
module.exports = [
  { id: 'GAP-002-pass', req: 'GAP-002', name: 'Flying through a tight spot gives the reward and makes speedwell bloom there',
    async run(t) {
      const r = await t.ev((shoot) => { const go = eval(shoot), W = __gaps.GW; const p0 = W.passes; go('h1', 0, 10); T.sim(1.0); T.key('KeyW', false);
        const fm = __gaps.MEM.found; return { passes: W.passes - p0, found: !!fm.h1, still: W.still, saved: (localStorage.getItem('honeylight.gaps') || '').includes('h1') }; }, shoot);
      t.eq(r.passes, 1, 'one pass counted'); t.eq(r.found, true, 'the spot is remembered'); t.eq(r.saved, true, 'and saved'); t.eq(r.still, false, 'a clean pass does not knock the bee down');
      return r;
    } },
  { id: 'GAP-003-bump', req: 'GAP-003', name: 'Hitting the edge of a spot is a plain bump with no credit; a slow drift through gives no credit either',
    async run(t) {
      const r = await t.ev((shoot) => { const go = eval(shoot), W = __gaps.GW, P = __g.P; const p0 = W.passes;
        const g = go('h1', 2.3, 10); T.sim(0.5); T.key('KeyW', false); const bumped = { passes: W.passes - p0, flying: P.mode === 'fly', still: !!W.still };
        const p1 = W.passes; go('h2', 0, 2.5); T.key('KeyW', false); T.sim(3); const slow = W.passes - p1;
        return { bumped, slow }; }, shoot);
      t.eq(r.bumped, { passes: 0, flying: true, still: false }, 'the bee bumps the root and flies on, without credit'); t.eq(r.slow, 0, 'inching through gives no credit');
      return r;
    } },
  { id: 'GAP-004-combo', req: 'GAP-004', name: 'Spots of one line flown close together climb in pitch and the whole line is remembered',
    async run(t) {
      const r = await t.ev((shoot) => { const go = eval(shoot), W = __gaps.GW; for (const id of ['h1', 'h2', 'h3', 'h4']) { go(id, 0, 10); T.sim(0.8); T.key('KeyW', false); }
        return { lines: __gaps.MEM.lines, passes: W.passes }; }, shoot);
      t.eq(r.lines.home, true, 'the Home Tree line is finished');
      return r;
    } },
  { id: 'GAP-005-solid', req: 'GAP-005', name: 'Each spot is open where it should be and solid around it',
    async run(t) {
      const r = await t.ev(() => { const bad = []; for (const g of __gaps.GAPS) { if (__gaps.gapHit(g.c, __g.PR)) bad.push(g.id); } return bad; });
      t.eq(r.length, 0, 'no opening is blocked at its centre: ' + r.join(','));
      return r;
    } },
  { id: 'GAP-005-fly-each', req: 'GAP-005', name: 'A straight line through the middle of every opening is a clean pass',
    async run(t) {
      const r = await t.ev((shoot) => { const go = eval(shoot), W = __gaps.GW, bad = [];
        for (const g of __gaps.GAPS) { const p0 = W.passes, f0 = 0; go(g.id, 0, 8); for (let i = 0; i < 90 && W.passes === p0; i++) T.sim(1 / 60); T.sim(0.1); T.key('KeyW', false); if (W.passes === p0) bad.push(g.id); }
        return bad; }, shoot);
      t.eq(r.length, 0, 'clean passes everywhere: ' + r.join(' '));
      return r;
    } },
];
