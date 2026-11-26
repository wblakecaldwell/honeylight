// The queen's crown (HIV-017): it sits on her head as she walks, and it changes nothing else in the game.
module.exports = [
  { id: 'HIV-017-crown-on-head', req: 'HIV-017', name: 'The queen wears her crown on her head while she walks on the comb',
    async run(t) {
      const r = await t.ev(() => { const { CROWN, queen, HEAD } = window.__crown, g = CROWN.group, m = new __g.THREE.Matrix4(), h = new __g.THREE.Vector3(), c = new __g.THREE.Vector3();
        let far = 0, moved = 0, last = null;
        for (let i = 0; i < 40; i++) { T.sim(0.25); m.compose(queen.p, queen.q, queen.s); h.copy(HEAD).applyMatrix4(m); c.setFromMatrixPosition(g.matrix);
          far = Math.max(far, c.distanceTo(h)); if (last) moved += c.distanceTo(last); last = c.clone(); }
        return { on: CROWN.on, inScene: !!g.parent, far: +far.toFixed(5), moved: +moved.toFixed(3) }; });
      t.check(r.on && r.inScene, 'the crown is in the hive');
      t.check(r.far < 1e-4, 'the crown stays on the top of her head, farthest off ' + r.far);
      t.check(r.moved > 0.3, 'the queen walks and the crown goes with her, moved ' + r.moved);
      return r;
    } },
  { id: 'HIV-017-crown-quiet', req: 'HIV-017', name: 'Building the crown takes no number from the game\'s random stream; ?crown=0 leaves it off',
    async run(t) {
      const probe = () => { T.sim(3); return { next: Math.random(), q: __g.bees.find(b => b.s.z > 1.7).p.toArray().map(x => +x.toFixed(6)), crown: !!(window.__crown && window.__crown.CROWN.on) }; };
      const a = await t.ev(probe); await t.reopen({ query: '?crown=0' }); const b = await t.ev(probe);
      t.check(a.crown && !b.crown, 'the crown is there by default and not with ?crown=0');
      t.eq(a.next, b.next, 'the next random number is the same with and without the crown');
      t.eq(JSON.stringify(a.q), JSON.stringify(b.q), 'the queen walks the same way with and without the crown');
      return { a, b };
    } },
];
