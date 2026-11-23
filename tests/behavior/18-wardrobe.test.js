// The wardrobe (src/wear.js, src/rope.js, src/wardrobe.js): earning a piece with each challenge, saving, the cell on the comb, its card, what shows in each view, and the ropes in the air.
const fs = require('fs'), path = require('path');
const allOpen = `() => { const G = __g; for (const k in G.ZONES) G.G.zones[k] = true; G.G.orchard = true; }`;
const ride = `(o, secs) => { T.fly(0, 0, 0); T.quiet(); __run.startAuto(o); T.sim(secs); }`;
const save = o => ({ storage: { 'honeylight.run': JSON.stringify(o) } });
const NAMES = ['Acorn cap', 'Dandelion scarf', 'Leaf cape', 'Glowworm tips', 'Moth-dust wings', 'Orchid-bee coat', 'Sun-gold coat'];
module.exports = [
  { id: 'WRD-001-pieces', req: 'WRD-001', name: 'Seven pieces, one place on the bee for each; of two pieces for one place only the later one is worn',
    async run(t) {
      const r = await t.ev(() => { const W = __wear, out = { ids: W.PIECES.map(p => p.id), names: W.PIECES.map(p => p.name), slots: W.PIECES.map(p => p.slot) };
        out.all = W.setWorn(W.PIECES.map(p => p.id)); out.coat = __g.me.coat; out.back = W.setWorn(['gold', 'cap', 'orchid']); out.coat2 = __g.me.coat; out.none = W.setWorn([]); out.coat3 = __g.me.coat; return out; });
      t.eq(r.ids, ['cap', 'scarf', 'cape', 'tips', 'dust', 'orchid', 'gold'], 'the seven pieces in order'); t.eq(r.names, NAMES, 'their names');
      t.eq(r.slots, ['head', 'neck', 'back', 'antennae', 'wings', 'coat', 'coat'], 'their places on the bee');
      t.eq(r.all, ['cap', 'scarf', 'cape', 'tips', 'dust', 'gold'], 'all at once: one coat only (the later one)'); t.eq(r.coat, 2, 'the sun-gold coat is on');
      t.eq([r.back, r.coat2], [['cap', 'orchid'], 1], 'orchid after gold: orchid'); t.eq([r.none, r.coat3], [[], 0], 'and everything off again');
      return r;
    } },

  { id: 'WRD-002-earning', req: 'WRD-002', name: 'Winning challenge 2 earns the second piece: the end line says something new is waiting at home, the scarf is in the cell',
    open: save({ ch: 1, best: 0 }),
    async run(t) {
      const r = await t.ev(([allOpen, ride]) => { eval(allOpen)(); const go = eval(ride), R = __run.RUN, W = __ward, el = document.getElementById('rungoal'), vis = id => W.SHOW[id].real.visible ? 'there' : W.SHOW[id].ghost.visible ? 'outline' : 'gone', out = {};
        out.before = [W.earned(), vis('cap'), vis('scarf'), vis('cape')];
        go({ i: 2, spd: 26 }, 70); out.run = [R.result, R.mem.ch, el.textContent]; T.sim(0.5);
        out.after = [W.earned(), vis('cap'), vis('scarf'), vis('cape')]; out.saved = JSON.parse(localStorage.getItem('honeylight.run')).ch; out.light = W.WARD.newK > 0.1; return out; }, [allOpen, ride]);
      t.eq(r.before, [1, 'there', 'outline', 'outline'], 'one challenge won: the cap is there, the scarf is an outline');
      t.eq(r.run, ['done', 2, 'Challenge 2 complete. Something new is waiting at home.'], 'the end line of the run that wins challenge 2 (no piece named)');
      t.eq(r.after, [2, 'there', 'there', 'outline'], 'now the scarf is there too'); t.eq(r.saved, 2, 'saved'); t.eq(r.light, true, 'a light stands at the cell: something new');
      return r;
    } },

  { id: 'WRD-003-saving', req: 'WRD-003', name: 'An old save keeps its challenges and wears nothing; worn pieces are saved and come back; unearned and doubled pieces are dropped',
    open: save({ ch: 3, best: 12 }),
    async run(t) {
      const read = () => t.ev(() => ({ earned: __ward.earned(), worn: __wear.wornList(), coat: __g.me.coat || 0, wing: __g.me.wing || 0, best: __run.RUN.mem.best, any: __wear.WORN.any }));
      const a = await read(); t.eq([a.earned, a.worn, a.best, a.any], [3, [], 12, false], 'a save from before the wardrobe: three pieces earned, nothing worn, the rest kept');
      await t.reopen(save({ ch: 3, best: 12, worn: ['cap', 'gold', 'scarf', 'nonsense'], seen: 3 }));
      const b = await read(); t.eq([b.worn, b.coat], [['cap', 'scarf'], 0], 'a worn piece that is not earned is dropped');
      await t.reopen(save({ ch: 7, best: 3, worn: ['orchid', 'tips', 'gold'] }));
      const c = await read(); t.eq([c.worn, c.coat], [['tips', 'gold'], 2], 'two coats in a save: one stays');
      const saved = await t.ev(() => { __ward.toggle(4); __ward.toggle(3); return localStorage.getItem('honeylight.run'); });
      t.eq(JSON.parse(saved).worn, ['dust', 'gold'], 'a change is saved at once'); t.eq(JSON.parse(saved).ch, 7, 'with the challenges');
      await t.reopen({ storage: { 'honeylight.run': saved } });
      const d = await read(); t.eq([d.worn, d.coat, d.wing, d.best, d.any], [['dust', 'gold'], 2, 1, 3, true], 'after loading again the bee wears what it wore');
      return { a, b, c, d };
    } },

  { id: 'WRD-004-cell', req: 'WRD-004', name: 'The wardrobe cell is on the walking face of the comb, low and on the door side; earned pieces are in it, the others are outlines; a worn piece leaves its peg, a pot stays',
    open: save({ ch: 5, best: 0, seen: 5 }),
    async run(t) {
      const r = await t.ev(() => { const W = __ward, D = W.WARD, g = __g, c = g.COMBS[D.ci], vis = id => W.SHOW[id].real.visible ? 'there' : W.SHOW[id].ghost.visible ? 'outline' : 'gone', out = {};
        let top = W.cell; while (top.parent) top = top.parent;
        out.place = { ci: D.ci, at: [D.x, D.y, +D.z.toFixed(2)], face: +(c.z + 0.6).toFixed(2), onComb: Math.abs(D.x) + D.r < c.hw && D.y - D.r > c.yb, doorSide: D.x > 0, low: D.y < c.yb + 3, hole: +Math.min(...c.holes.map(h => Math.hypot(h.x - D.x, h.y - D.y) - h.r - D.r)).toFixed(2), inScene: top === g.scene };
        out.show = W.PIECES.map(p => vis(p.id)); out.light0 = W.cell.children.some(o => o === undefined);
        W.toggle(0); W.toggle(3); W.toggle(4); out.worn = W.PIECES.map(p => vis(p.id)); W.toggle(0); out.back = vis('cap'); return out; });
      t.eq([r.place.ci, r.place.at[2]], [2, r.place.face], 'on the +z face of the comb the bee is born on and walks on'); t.eq([r.place.onComb, r.place.doorSide, r.place.low, r.place.inScene], [true, true, true, true], 'on the comb, on the door side, low');
      t.check(r.place.hole > 0.5, 'clear of the hole in the comb: ' + r.place.hole);
      t.eq(r.show, ['there', 'there', 'there', 'there', 'there', 'outline', 'outline'], 'five earned pieces are there, two are outlines');
      t.eq(r.worn, ['gone', 'there', 'there', 'gone', 'there', 'outline', 'outline'], 'the worn cap and tips have left their places; the pot of moth dust stays'); t.eq(r.back, 'there', 'the cap hangs again when it is taken off');
      return r;
    } },

  { id: 'WRD-005-solid', req: 'WRD-005', name: 'The cell is solid: a flying bee cannot enter it from the front or the side, a walking bee stops at the rim and cannot pass under it, the sisters keep off it',
    async run(t) {
      const r = await t.ev(() => { const g = __g, P = g.P, D = __ward.WARD, V = g.THREE.Vector3, out = {};
        const pen = () => Math.min(D.depth + g.PR - (P.pos.z - D.z), D.r + g.PR - Math.hypot(P.pos.x - D.x, P.pos.y - D.y)); /* above 0: the bee is inside the block */
        const push = () => { T.key('KeyW'); let worst = -9; for (let i = 0; i < 150; i++) { T.sim(1 / 60); worst = Math.max(worst, pen()); } T.key('KeyW', false); return +worst.toFixed(3); };
        T.fly(); T.quiet();
        T.lookAt(D.x, D.y, D.z + 1.8, D.x, D.y, D.z); out.front = [push(), +(P.pos.z - D.z).toFixed(2)];
        T.lookAt(D.x - 3.2, D.y + 0.3, D.z + 0.5, D.x, D.y + 0.3, D.z + 0.5); out.side = [push(), +(P.pos.x - D.x).toFixed(2)];
        T.place(D.x + 0.2, D.y, D.z + 0.5); T.sim(1 / 60); out.putIn = +pen().toFixed(3);
        const p = new V(D.x, D.y + 0.4, D.z + 0.45), v = new V(); g.collide(p, v); out.cam = +Math.hypot(p.x - D.x, p.y - D.y - 0.4, p.z - D.z - 0.45).toFixed(2);
        // on foot: walk right into the rim, then along the comb's lower edge toward the strip under the cell
        P.mode = 'crawl'; P.vel.set(0, 0, 0); P.ch = -Math.PI / 2; T.key('KeyW');
        P.pos.set(D.x - 3.2, D.y, D.z + 0.24); T.sim(3); out.walk = [+(P.pos.x - D.x).toFixed(2), +(P.pos.y - D.y).toFixed(2)]; out.card = D.open;
        P.pos.set(D.x - 3.2, D.y - 1.0, D.z + 0.24); T.sim(3); out.under = +(P.pos.x - D.x).toFixed(2); T.key('KeyW', false);
        // the sisters on that face, for 25 s
        let near = 9; for (let i = 0; i < 1500; i++) { T.sim(1 / 60); if (i % 3) continue; for (const b of g.bees) { if (b === g.me || b.s.y < 0.5 || b.p.y < g.COMBS[D.ci].yb || Math.abs(b.p.z - (D.z + 0.19 * b.s.y)) > 0.08) continue; /* only bees that stand on this face of the comb */ const dx = b.p.x - D.x, dy = b.p.y - D.y, d = dy >= 0 ? Math.hypot(dx, dy) : Math.abs(dx); if (d < near) near = d; } }
        out.sisters = +near.toFixed(2);
        // one sister whose own path goes right through the cell: she is drawn outside it, on the comb; far from the cell she is drawn where she walks
        const yb = g.COMBS[D.ci].yb, w = g.bees.find(b => b.th !== undefined && b.s.y > 0.5 && b.p.y > yb && Math.abs(b.p.z - (D.z + 0.19 * b.s.y)) < 0.08), drawn = (x, y) => { w.x = D.x + x; w.y = D.y + y; w.pause = 5; T.sim(1 / 60); const dx = w.p.x - D.x, dy = w.p.y - D.y; return [+(dy >= 0 ? Math.hypot(dx, dy) : Math.abs(dx)).toFixed(2), +(w.p.y - yb).toFixed(2)]; };
        out.through = [[0, 0], [0.5, 0.3], [-0.8, -0.5], [0.1, -0.85], [1.2, 0.9]].map(([x, y]) => drawn(x, y)); drawn(-5, 2); out.away = [+(w.p.x - w.x).toFixed(4), +(w.p.y - w.y).toFixed(4)]; return out; });
      t.check(r.front[0] < 0.05 && r.front[1] > 0.8, 'flying at it from the front, the bee stays out: ' + r.front); t.check(r.side[0] < 0.05 && r.side[1] > 1.7, 'and from the side along the comb it slides round the cell, never through it: ' + r.side);
      t.check(r.putIn < 0.001, 'a bee put inside is pushed out at once: ' + r.putIn); t.check(r.cam > 0.3, 'the camera cannot be in it either: moved ' + r.cam);
      t.check(r.walk[0] < -1.6 && r.walk[0] > -1.8 && Math.abs(r.walk[1]) < 0.05, 'a walking bee stops at the rim: ' + r.walk); t.eq(r.card, true, 'and that opens the card');
      t.check(r.under < -1.6, 'it cannot walk under the cell: ' + r.under);
      t.check(r.sisters > 1.5, 'no sister walks on the cell or under it (the nearest came to ' + r.sisters + ' from its middle; the rim is at 1.39)');
      t.check(r.through.every(d => d[0] > 1.55 && d[1] > 0.3), 'a sister whose path crosses the cell is drawn outside it and on the comb: ' + JSON.stringify(r.through)); t.eq(r.away, [0, 0], 'away from the cell a sister is drawn where she walks');
      return r;
    } },

  { id: 'WRD-006-card', req: 'WRD-006', name: 'The card opens when the bee hovers at the cell, lists earned pieces by name and the others as "Not yet", and the number keys put pieces on and off',
    open: save({ ch: 2, best: 0 }),
    async run(t) {
      const r = await t.ev(() => { const g = __g, P = g.P, W = __ward, D = W.WARD, card = W.card, key = c => dispatchEvent(new KeyboardEvent('keydown', { code: c })), lines = () => card.innerText.split('\n').map(s => s.trim()).filter(Boolean), out = {};
        T.fly(); T.quiet(); key('Digit1'); out.closedKey = __wear.wornList();
        T.place(D.x - 2.5, D.y, D.z + 1.3, -Math.PI / 2, 0); let opened = false; for (let i = 0; i < 40; i++) { P.vel.set(5, 0, 0); T.sim(1 / 60); opened = opened || D.open; } out.fast = opened;
        T.place(D.x, D.y, D.z + 1.6, 0, 0); T.sim(0.2); out.soon = D.open; T.sim(0.3); out.open = [D.open, D.at, card.classList.contains('on')]; out.lines = lines(); out.seen = JSON.parse(localStorage.getItem('honeylight.run')).seen;
        key('Digit1'); out.one = __wear.wornList(); out.linesOn = lines(); key('Digit3'); out.three = __wear.wornList(); key('Digit1'); out.off = __wear.wornList();
        card.querySelector('.wr[data-i="1"]').click(); out.tap = __wear.wornList(); out.saved = JSON.parse(localStorage.getItem('honeylight.run')).worn;
        T.place(D.x - 6, D.y + 3, D.z + 1.4); T.sim(0.2); out.left = [D.open, card.classList.contains('on')];
        __run.RUN.mem.ch = 7; T.place(D.x, D.y, D.z + 1.6, 0, 0); T.sim(0.6); key('Digit6'); const a = __wear.wornList(); key('Numpad7'); out.coats = [a, __wear.wornList(), g.me.coat]; out.all = lines(); return out; });
      t.eq(r.closedKey, [], 'a number key does nothing while the card is closed'); t.eq(r.fast, false, 'flying past fast does not open it'); t.eq(r.soon, false, 'not at once');
      t.eq(r.open, [true, true, true], 'hovering in front of the cell opens it after a moment'); t.eq(r.seen, 2, 'the new pieces count as seen');
      t.eq(r.lines, ['Wardrobe', '1', 'Acorn cap', '2', 'Dandelion scarf', 'Not yet', 'Not yet', 'Not yet', 'Not yet', 'Not yet', 'press a number to put it on or take it off', 'V to see yourself'], 'earned pieces by number and name, the others only "Not yet"; in the bee\'s eyes a line about V');
      t.eq(r.one, ['cap'], '1 puts the cap on'); t.eq(r.linesOn[2], 'Acorn cap on', 'the card says it is on'); t.eq(r.three, ['cap'], '3 does nothing: not earned'); t.eq(r.off, [], '1 again takes it off');
      t.eq([r.tap, r.saved], [['scarf'], ['scarf']], 'a tap on a line works too, and it is saved'); t.eq(r.left, [false, false], 'the card closes when the bee leaves');
      t.eq(r.coats, [['scarf', 'orchid'], ['scarf', 'gold'], 2], 'the two coats: one at a time'); t.eq(r.all.filter(s => NAMES.includes(s.replace(/ on$/, ''))).length, 7, 'with all earned, all seven names');
      return r;
    } },

  { id: 'WRD-007-views', req: 'WRD-007', name: 'In follow view the pieces are on the bee and nod with its head; in the bee\'s eyes only the glowing antenna tips show',
    async run(t) {
      const r = await t.ev(() => { const g = __g, Wr = __wear, V = g.THREE.Vector3, me = g.me, out = {}, tips = () => Wr.fpTips.map(x => x.visible && x.parent.visible);
        T.fly(150, 34, 100, 0.6, 0); T.quiet(); g.DAY.t = 0.2; Wr.setWorn(['cap', 'tips', 'cape']); g.G.third = true; T.key('KeyW'); T.sim(2);
        const hy = Math.sin(g.U.uTime.value * 1.7 + me.ph * 7) * 0.012 - me.mx * 0.02, h = Wr.head.position;
        out.follow = { body: me.s.x, rig: Wr.rig.visible, at: +new V().setFromMatrixPosition(Wr.rig.matrix).distanceTo(me.p).toFixed(4), leaf: Wr.leaf.mesh.visible, tips: tips(), lean: +me.mx.toFixed(2), head: Math.abs(h.y - hy) < 1e-9 && Math.abs(h.x - me.my * 0.05) < 1e-9, nod: +h.y.toFixed(4) };
        g.G.third = false; T.sim(0.5); out.eyes = { body: me.s.x, rig: Wr.rig.visible, leaf: Wr.leaf.mesh.visible, tips: tips() };
        Wr.setWorn(['cap']); T.sim(0.1); out.noTips = tips(); return out; });
      t.eq([r.follow.body, r.follow.rig, r.follow.at, r.follow.leaf], [1, true, 0, true], 'follow view: the pieces are drawn on the bee'); t.eq(r.follow.tips, [false, false], 'and the antennae of the bee\'s-eye view are away');
      t.check(r.follow.head && r.follow.lean > 0.3 && r.follow.nod < -0.005, 'the cap and the tips go with the head as it dips in flight: ' + r.follow.nod);
      t.eq([r.eyes.body < 0.01, r.eyes.rig, r.eyes.leaf], [true, false, false], 'bee\'s-eye view: the body and what it wears are not drawn'); t.eq(r.eyes.tips, [true, true], 'but the tips of the two antennae glow');
      t.eq(r.noTips, [false, false], 'without the glowworm tips they do not');
      return r;
    } },

  { id: 'WRD-008-ropes', req: 'WRD-008', name: 'The scarf\'s ends stream behind in flight, swing to the outside of a turn, hang still in the hive and stay out of the body and the comb',
    async run(t) {
      const r = await t.ev(() => { const g = __g, Wr = __wear, V = g.THREE.Vector3, M4 = g.THREE.Matrix4, me = g.me, out = {};
        // where the two ends are from their knot, in the level frame of the bee: [to its left, up, behind]
        const ends = () => { const f = new V(0, 0, 1).applyQuaternion(me.q).setY(0).normalize(), l = new V(0, 1, 0).cross(f).normalize(); return Wr.tails.map(t => { const d = t.rope.P[t.rope.N - 1].clone().sub(t.rope.P[0]); return [+d.dot(l).toFixed(2), +d.y.toFixed(2), +(-d.dot(f)).toFixed(2)]; }); };
        const left = () => { const e = ends(); return (e[0][0] + e[1][0]) / 2; };
        const BODY = [[0, 0.03, 0.13, 0.18, 0.17, 0.19], [0, -0.012, -0.36, 0.20, 0.19, 0.31], [0, 0.01, 0.38, 0.15, 0.16, 0.11]];
        const inBody = () => { const inv = new M4().compose(me.p, me.q, new V(1, 1, 1)).invert(); let n = 0; for (const t of Wr.tails.concat([Wr.leaf])) for (let i = 1; i < t.rope.N; i++) { const b = t.rope.P[i].clone().applyMatrix4(inv); if (BODY.some(([cx, cy, cz, ex, ey, ez]) => ((b.x - cx) / ex) ** 2 + ((b.y - cy) / ey) ** 2 + ((b.z - cz) / ez) ** 2 < 0.98)) n++; } return n; };
        T.fly(150, 34, 100, 0.6, 0); T.quiet(); g.G.third = true; Wr.setWorn(['scarf', 'cap']); T.key('KeyW'); T.sim(3);
        out.straight = ends(); const s0 = left(); let hit = inBody();
        T.key('ArrowRight'); let mx = -9; for (let i = 0; i < 54; i++) { T.sim(1 / 60); mx = Math.max(mx, left() - s0); hit += inBody(); } T.key('ArrowRight', false); out.rightTurn = +mx.toFixed(2); out.roll = +g.P.roll.toFixed(2);
        T.sim(1.5); const s1 = left();
        T.key('ArrowLeft'); let mn = 9; for (let i = 0; i < 54; i++) { T.sim(1 / 60); mn = Math.min(mn, left() - s1); hit += inBody(); } T.key('ArrowLeft', false); out.leftTurn = +mn.toFixed(2); T.key('KeyW', false); out.inBody = hit;
        // still in the wind outside: the ends lean with the wind
        for (let i = 0; i < 240; i++) { T.place(150, 34, 100, 0.6, 0); T.sim(1 / 60); } { const p = Wr.tails[0].rope.P, d = p[p.length - 1].clone().sub(p[0]); out.wind = +(d.x * g.WIND.dx + d.z * g.WIND.dz).toFixed(2); }
        // still in the hive, beside a comb: they hang straight down, at rest, and not in the comb
        const c = g.COMBS[1], z = c.z + 0.6 + 0.4; for (let i = 0; i < 300; i++) { T.place(-2, 12, z, Math.PI / 2, 0); T.sim(1 / 60); } const before = Wr.tails[0].rope.P[14].clone(); T.place(-2, 12, z, Math.PI / 2, 0); T.sim(1 / 60);
        out.hive = ends(); out.rest = +Wr.tails[0].rope.P[14].distanceTo(before).toFixed(4); out.comb = +Math.min(...Wr.tails.flatMap(t => t.rope.P.map(p => p.z - (c.z + 0.6)))).toFixed(3); return out; });
      t.check(r.straight.every(e => e[2] > 0.8 && Math.abs(e[0]) < 0.45), 'in straight flight the ends stream out behind: ' + JSON.stringify(r.straight));
      t.check(r.rightTurn > 0.2, 'in a right turn they swing to the left, the outside of the turn: ' + r.rightTurn); t.check(r.leftTurn < -0.2, 'in a left turn they swing to the right: ' + r.leftTurn);
      t.eq(r.inBody, 0, 'no point of a rope is inside the bee\'s body'); t.check(r.wind > 0.3, 'held still outside, the ends lean with the wind: ' + r.wind);
      t.check(r.hive.every(e => e[1] < -1.0 && Math.abs(e[0]) < 0.25 && Math.abs(e[2]) < 0.25), 'in the hive they hang straight down: ' + JSON.stringify(r.hive)); t.check(r.rest < 0.002, 'and are at rest in the still air: ' + r.rest);
      t.check(r.comb > 0.015, 'no point is in the comb: ' + r.comb);
      return r;
    } },

  { id: 'WRD-009-dust-and-light', req: 'WRD-009', name: 'Moth dust leaves a drift of sparks behind the wings in flight; the sun-gold coat has its light',
    async run(t) {
      const r = await t.ev(() => { const g = __g, Wr = __wear, out = {}; T.fly(150, 34, 100, 0.6, 0); T.quiet(); g.G.third = true; T.key('KeyW'); T.sim(1.5); out.none = [Wr.trail.count(), Wr.trail.mesh.visible];
        Wr.setWorn(['dust', 'gold']); T.sim(1.5); out.on = [Wr.trail.count(), Wr.trail.mesh.visible, g.me.wing, g.me.coat]; out.far = +Math.max(...Wr.trail.Q.filter(q => q.life > 0).map(q => q.p.distanceTo(g.me.p))).toFixed(1);
        out.halo = Wr.rig.visible && Wr.rig.children.some(o => o.visible && o.material && o.material.blending === g.THREE.AdditiveBlending);
        Wr.setWorn([]); T.sim(2.5); out.after = [Wr.trail.count(), Wr.trail.mesh.visible, g.me.wing || 0]; return out; });
      t.eq(r.none, [0, false], 'no dust, no sparks'); t.check(r.on[0] > 15 && r.on[1] === true, 'with moth dust, sparks drift behind the wings: ' + r.on[0]); t.eq([r.on[2], r.on[3]], [1, 2], 'the wings and the coat are switched in the bee shaders');
      t.check(r.far > 1 && r.far < 40, 'the sparks stay in the air where they were shed: the farthest is ' + r.far + ' behind'); t.eq(r.halo, true, 'the sun-gold coat has its light'); t.eq(r.after, [0, false, 0], 'taken off, the sparks fade out');
      return r;
    } },

  { id: 'WRD-010-unworn', req: 'WRD-010', name: 'A bee that wears nothing has no coat, no dust and no piece drawn; the wardrobe takes no number from the game\'s random stream',
    async run(t) {
      const GAME = path.join(__dirname, '..', '..'), bad = ['wear.js', 'wardrobe.js', 'rope.js'].filter(f => { const s = fs.readFileSync(path.join(GAME, 'src', f), 'utf8'); return /Math\.random/.test(s) || /import \{[^}]*\brnd\b[^}]*\} from '\.\/core\.js'/.test(s); });
      t.eq(bad, [], 'wardrobe files that use the game\'s random numbers');
      const fly = dress => t.ev(dress => { const g = __g, Wr = __wear; T.fly(150, 34, 100, 0.6, 0); T.quiet(); g.G.third = true; if (dress) { __run.RUN.mem.ch = 7; Wr.setWorn(Wr.PIECES.map(p => p.id)); }
        T.seed(4242); T.key('KeyW'); T.sim(2); T.key('ArrowRight'); T.sim(0.5);
        return { next: Math.random(), pos: g.P.pos.toArray(), plain: g.bees.every(b => !b.coat && !b.wing), rig: Wr.rig.visible, drawn: [Wr.leaf.mesh.visible, Wr.tails[0].mesh.visible, Wr.trail.mesh.visible], fp: Wr.fpTips.some(x => x.visible) }; }, dress);
      const a = await fly(false); t.eq([a.plain, a.rig, a.drawn, a.fp], [true, false, [false, false, false], false], 'nothing worn: no bee has a coat or dust, and no piece is drawn');
      await t.reopen(); const b = await fly(true);
      t.eq(b.next, a.next, 'the game\'s next random number is the same with everything worn as with nothing worn'); t.eq(b.pos, a.pos, 'and the flight is the same');
      t.eq([b.rig, b.drawn], [true, [true, true, true]], '(in the second game the pieces were on)');
      return { next: a.next };
    } },

  { id: 'WRD-011-hooks', req: 'WRD-011', name: 'Other code can ask if the bee wears anything, if it is at the cell and if the card is open',
    open: save({ ch: 3, best: 0 }),
    async run(t) {
      const r = await t.ev(() => { const W = __ward, D = W.WARD, Wr = __wear, out = {}; T.fly(); T.quiet(); out.a = [Wr.WORN.any, D.at, D.open];
        T.place(D.x, D.y, D.z + 1.6, 0, 0); T.sim(0.6); W.toggle(2); out.b = [Wr.WORN.any, Wr.WORN.cape, D.at, D.open]; W.toggle(2); T.place(0, 4, 0); T.sim(0.2); out.c = [Wr.WORN.any, D.at, D.open]; return out; });
      t.eq(r.a, [false, false, false], 'at the start: nothing worn, not at the cell'); t.eq(r.b, [true, true, true, true], 'at the cell with the cape on'); t.eq(r.c, [false, false, false], 'and away again with nothing on');
      return r;
    } },

  { id: 'WRD-012-switch', req: 'WRD-012', name: 'The play-test switch ?wardrobe=all makes all seven pieces earned for the visit and leaves the saved challenges alone',
    open: { query: '?wardrobe=all', ...save({ ch: 1, best: 0 }) },
    async run(t) {
      const r = await t.ev(() => { const W = __ward; const out = { earned: W.earned(), all: W.WARD.all }; out.ok = W.toggle(6); out.worn = __wear.wornList(); out.saved = localStorage.getItem('honeylight.run'); return out; });
      t.eq([r.earned, r.all, r.ok, r.worn], [7, true, true, ['gold']], 'all seven can be worn'); t.eq(JSON.parse(r.saved).ch, 1, 'the saved challenges do not change');
      await t.reopen({ query: '', storage: { 'honeylight.run': r.saved } });
      const b = await t.ev(() => ({ earned: __ward.earned(), worn: __wear.wornList() })); t.eq([b.earned, b.worn], [1, []], 'without the switch the piece that was not earned is off again');
      return r;
    } },
];
