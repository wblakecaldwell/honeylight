// The sister who welcomes the newborn bee (HIV-016): after the welcome she flies away like a real bee.
// She never passes through a comb, the hive wall, the floor or the roof, and she does not jump:
// her speed and her change of speed stay inside fixed limits at every step.
const R = 0.25;          // the part of her body that must stay out of the wax (the game keeps her 0.32 away)
const VMAX = 5, AMAX = 16; // the test's limits: a little above the game's own (GREET in src/bees.js)

module.exports = [
  { id: 'HIV-016-greeter-exit', req: 'HIV-016', name: 'After the welcome the sister flies away without passing through the combs',
    async run(t) {
      await t.page.click('#title');
      const r = await t.ev(({ R, VMAX, AMAX }) => {
        const g = __g, P = g.P, h = g.hero, C = g.COMBS, CT = 1.2, RIN = 10, HTOP = 22;
        let n = 0; while (P.mode === 'cell' && n < 40) { g.chew(); T.sim(0.2); n++; }
        // inside a comb: the slab of wax, less its holes
        const inWax = p => { for (let i = 0; i < C.length; i++) { const c = C[i];
          if (Math.abs(p.z - c.z) < CT / 2 + R && Math.abs(p.x) < c.hw + R && p.y > c.yb - R && !c.holes.some(o => Math.hypot(p.x - o.x, p.y - o.y) < o.r - R)) return i; } return -1; };
        const out = { steps: 0, inWax: 0, firstWax: null, outOfHive: 0, vmax: 0, amax: 0, endedWelcome: false, left: 0, lanes: new Set() };
        const lane = z => C.filter(c => c.z < z).length;
        let prev = h.p.clone(), pv = null, wasActive = h.active;
        for (let s = 0; s < 60 * 30; s++) {
          T.sim(1 / 60); out.steps++;
          const p = h.p, v = p.clone().sub(prev).multiplyScalar(60);
          const w = inWax(p); if (w >= 0) { out.inWax++; if (!out.firstWax) out.firstWax = { step: s, comb: w, p: [p.x, p.y, p.z].map(x => +x.toFixed(3)) }; }
          if (Math.hypot(p.x, p.z) > RIN - R || p.y < R || p.y > HTOP - R) out.outOfHive++;
          out.vmax = Math.max(out.vmax, v.length());
          if (pv) { const a = v.clone().sub(pv).length() * 60; if (a > out.amax) { out.amax = a; out.aAt = { s, act: h.active, mode: P.mode, p: [p.x, p.y, p.z].map(x => +x.toFixed(2)) }; } }
          if (wasActive && !h.active) out.endedWelcome = true;
          if (out.endedWelcome) { out.left = Math.max(out.left, p.distanceTo(P.pos)); out.lanes.add(lane(p.z)); }
          wasActive = h.active; pv = v; prev.copy(p);
        }
        out.lanes = out.lanes.size; out.vmax = +out.vmax.toFixed(3); out.amax = +out.amax.toFixed(3); out.left = +out.left.toFixed(2); out.mode = P.mode;
        return out;
      }, { R, VMAX, AMAX });
      t.check(r.endedWelcome, 'the welcome ends and the sister leaves');
      t.check(r.left > 4, 'she flies well away from the newborn bee, farthest ' + r.left);
      t.check(r.lanes >= 2, 'she goes on to other parts of the hive (lanes between combs visited: ' + r.lanes + ')');
      t.eq(r.inWax, 0, 'steps with her body inside a comb' + (r.firstWax ? ' (first: ' + JSON.stringify(r.firstWax) + ')' : ''));
      t.eq(r.outOfHive, 0, 'steps with her body in the wall, floor or roof');
      t.check(r.vmax <= VMAX, 'her speed stays under ' + VMAX + ', top ' + r.vmax);
      t.check(r.amax <= AMAX, 'her change of speed stays under ' + AMAX + ', top ' + r.amax + ' ' + JSON.stringify(r.aAt));
      return r;
    } },
];
