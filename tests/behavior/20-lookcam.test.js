// The camera that moves on its own: look at yourself, danger sense, B to look behind, and smooth moves in and out of the bee's eyes (CAM-007 to CAM-014).
// In the page: __land() puts the bee down on a big meadow flower; __cam() says where the camera is from the bee, and how;
// __steps(secs, keysFn) runs 1/60 s steps and keeps the largest jump of the camera between two steps.
const KIT = `
  window.__land = (third = true) => { const g = __g, P = g.P; T.quiet(); g.G.third = third; let best = null, bd = 1e9;
    for (const f of g.flowers) { if (f.lily || f.giant || f.canopy || f.r < 1.25) continue; const d = Math.hypot(f.x - 60, f.z - 40); if (d < bd) { bd = d; best = f; } }
    T.fly(best.sx ?? best.x, best.y + 2.2, best.sz ?? best.z, 0.6, 0); T.sim(0.3); T.key('ShiftLeft', true); let n = 0; while (!P.landed && n++ < 240) T.sim(1 / 60); T.key('ShiftLeft', false); T.sim(0.2);
    return !!P.landed; };
  window.__cam = () => { const g = __g, P = g.P, c = g.camera, o = c.position.clone().sub(P.pos), f = new g.THREE.Vector3(0, 0, -1).applyQuaternion(c.quaternion);
    const h = new g.THREE.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), r = o.length();
    return { r: +r.toFixed(2), el: r > 0.01 ? +Math.asin(o.y / r).toFixed(2) : 0, ahead: r > 0.01 ? +(o.clone().setY(0).normalize().dot(h)).toFixed(2) : 0, lookAhead: +(f.clone().setY(0).normalize().dot(h)).toFixed(2),
      mode: __look.mode, rig: !!__look.rig, drawn: g.me.s.x > 0.5, ants: g.camera.children.every(ch => ch.visible) }; };
  window.__inView = p => { const v = p.clone().project(__g.camera); return Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95 && v.z < 1; };
  window.__steps = (secs, each) => { const g = __g, P = g.P; let jump = 0, prev = g.camera.position.clone().sub(P.pos); const n = Math.round(secs * 60);
    let path = 0; for (let i = 0; i < n; i++) { if (each) each(i / 60); T.sim(1 / 60); const o = g.camera.position.clone().sub(P.pos), d = o.distanceTo(prev); jump = Math.max(jump, d); path += d; prev = o; }
    window.__share = path > 0.3 ? +(jump / path).toFixed(3) : 0; return +jump.toFixed(3); };
  window.__wasp = (k = 0) => __g.wasps.filter(w => !w.raider && !w.mob && !w.orchard)[k];
  window.__hold = (w, dx, dy, dz) => { const P = __g.P; w.gone = 0; w.decoy = null; w.p.set(P.pos.x + dx, P.pos.y + dy, P.pos.z + dz); w.home = w.p.clone(); w.v.set(0, 0, 0); w.state = 'retreat'; w.t = -1e9; }; // hangs where it is
`;
const JUMP = 0.2; // the most the camera may move against the bee in one 1/60 s step: anything more is a snap

module.exports = [
  { id: 'CAM-007-look-at-yourself', req: 'CAM-007', name: 'Sitting still for 3 s in follow view swings the camera round to the front, 45 degrees up and across, with no jump',
    async run(t) {
      await t.ev(KIT);
      const r = await t.ev(() => { const out = { landed: __land(true) }; out.at2 = (__steps(2.4), __cam()); out.jump = __steps(3.6); out.end = __cam(); return out; });
      t.check(r.landed, 'the bee sits on the flower');
      t.eq([r.at2.mode, r.at2.rig], ['base', false], 'after 2.4 s the follow view is unchanged');
      t.eq(r.end.mode, 'look', 'after 3 s the camera looks at the bee');
      t.check(r.end.ahead > 0.5, 'the camera is in front of the bee: ' + r.end.ahead); t.near(r.end.el, 0.79, 0.15, 'about 45 degrees up');
      t.check(r.end.r > 1.2 && r.end.r < 2.0, 'close to the bee: ' + r.end.r); t.check(r.end.drawn, 'the bee is drawn');
      t.check(r.jump < JUMP, 'the swing has no jump: ' + r.jump);
      return r;
    } },

  { id: 'CAM-011-glide-back', req: 'CAM-011', name: 'Taking off glides the camera back to the follow view (most of the way in about 0.6 s), and then the game camera is used exactly',
    async run(t) {
      await t.ev(KIT);
      const r = await t.ev(() => { __land(true); __steps(6); const before = __cam(); const K = s => { T.key('Space', s < 0.4); T.key('KeyW', s > 0.1); };
        const jump = __steps(0.5, K), mid = __cam(); __steps(1.0, K); const end = __cam(); T.key('KeyW', false); return { before, jump, mid, end }; });
      t.eq(r.before.mode, 'look', 'the camera was looking at the bee');
      t.check(r.jump < 0.35, 'no snap on take-off (the bee itself speeds away): ' + r.jump);
      t.eq([r.end.mode, r.end.rig], ['base', false], 'after 1.5 s the rig has let go');
      t.check(r.end.ahead < -0.8 && r.end.lookAhead > 0.8, 'the camera is behind the bee and looks ahead: ' + JSON.stringify(r.end));
      return r;
    } },

  { id: 'CAM-010-not-when-busy', req: 'CAM-010', name: 'No look at yourself with a key held, after a turn of the mouse, with a wasp near, or in rain',
    async run(t) {
      await t.ev(KIT);
      const r = await t.ev(() => { const g = __g, P = g.P, out = {};
        __land(true); T.key('KeyW', false); T.key('KeyB', false); g.keys.add('KeyX'); __steps(4); out.key = __cam().mode; g.keys.delete('KeyX');
        __steps(2); P.yaw += 0.01; __steps(1.5); out.turned = __cam().mode; __steps(2); out.after = __cam().mode;
        const w = __wasp(0); __hold(w, 18, 3, 0); __steps(1.5); out.wasp = __cam().mode; out.waspRig = __look.rig ? 'moving' : 'none'; w.p.y = -500; w.state = 'idle';
        __steps(4); out.clear = __cam().mode; P.soak = 0.5; __steps(1); out.soaked = __cam().mode; P.soak = 0; return out; });
      t.eq(r.key, 'base', 'a held key keeps the follow view');
      t.eq(r.turned, 'base', 'a turn of the mouse starts the 3 s again'); t.eq(r.after, 'look', 'then it looks');
      t.eq(r.wasp, 'base', 'a wasp near (no danger sense yet): back to the follow view');
      t.eq(r.clear, 'look', 'when the wasp is gone it looks again'); t.eq(r.soaked, 'base', 'wet wings: back to the follow view');
      return r;
    } },

  { id: 'CAM-008-danger-sense', req: 'CAM-008', name: 'With danger sense a sitting bee turns to a wasp that comes near: the bee and the wasp are both in the picture',
    async run(t) {
      await t.ev(KIT);
      const r = await t.ev(() => { const g = __g, P = g.P; g.G.sense = true; __land(true); __steps(5.5); const look = __cam().mode;
        const w = __wasp(0); __hold(w, -14, 3, -14); const jump = __steps(2); const c = __cam(), o = g.camera.position.clone().sub(P.pos), tw = w.p.clone().sub(P.pos);
        return { look, mode: c.mode, jump, far: +o.clone().setY(0).normalize().dot(tw.clone().setY(0).normalize()).toFixed(2), bee: __inView(P.pos), wasp: __inView(w.p), drawn: c.drawn }; });
      t.eq(r.look, 'look', 'first it looks at the bee'); t.eq(r.mode, 'danger', 'then it turns to the wasp');
      t.check(r.bee && r.wasp, 'the bee and the wasp are in the picture: ' + JSON.stringify(r));
      t.check(r.far < -0.5, 'the camera is on the far side of the bee from the wasp: ' + r.far); t.check(r.jump < JUMP, 'no jump: ' + r.jump);
      return r;
    } },

  { id: 'CAM-009-look-behind', req: 'CAM-009', name: 'Holding B in flight looks back past the bee; letting go glides back in about 0.2 s; with danger sense B finds the wasp',
    async run(t) {
      await t.ev(KIT);
      const r = await t.ev(() => { const g = __g, P = g.P, out = {}; T.fly(150, 30, 40, 0.6, 0); T.quiet(); g.G.third = true; T.key('KeyW', true); T.sim(1.5);
        out.jump = __steps(0.6, () => T.key('KeyB', true)); out.share = __share; out.held = __cam(); T.key('KeyB', false); __steps(0.25); out.at025 = __cam(); __steps(0.25); out.at05 = __cam();
        g.G.sense = true; const w = __wasp(0); __hold(w, 30, 4, 0); T.key('KeyB', true); __steps(0.8, () => __hold(w, 30, 4, 0)); out.sense = __cam(); out.wasp = __inView(w.p); out.bee = __inView(P.pos);
        T.key('KeyB', false); T.key('KeyW', false); return out; });
      t.eq(r.held.mode, 'behind', 'B held: looking behind');
      t.check(r.held.ahead > 0.5 && r.held.lookAhead < -0.5, 'the camera is ahead of the bee and looks back: ' + JSON.stringify(r.held));
      t.check(r.held.drawn, 'the bee is in the picture'); t.check(r.share < 0.15, 'the swing round has no snap (no one step makes more than 15% of the move): ' + r.share);
      t.check(r.at025.lookAhead > 0.8, 'about 0.2 s after letting go the camera looks ahead again: ' + r.at025.lookAhead);
      t.eq([r.at05.mode, r.at05.rig], ['base', false], 'after 0.5 s the rig has let go');
      t.eq(r.sense.mode, 'danger', 'with danger sense B turns to the wasp'); t.check(r.wasp && r.bee, 'the wasp and the bee are in the picture');
      return r;
    } },

  { id: 'CAM-012-out-of-the-eyes', req: 'CAM-012', name: 'From the bee\'s eyes the camera rises out of the head and back in, the body is drawn only when the camera is clear of it, and V moves smoothly',
    async run(t) {
      await t.ev(KIT);
      const r = await t.ev(() => { const g = __g, P = g.P, out = { landed: __land(false) }; out.start = __cam();
        let bad = 0; const watch = () => { const c = __cam(); if (c.drawn && c.r < 0.35) bad++; if (!c.drawn && c.r > 0.6 && __look.rig) bad++; };
        out.jumpOut = __steps(6, watch); out.look = __cam();
        const K = s => { T.key('Space', s < 0.4); T.key('KeyW', s > 0.1); watch(); };
        out.jumpIn = __steps(1.5, K); out.back = __cam(); out.bad = bad;
        out.atEye = +g.camera.position.distanceTo(P.pos).toFixed(3); T.key('KeyW', false);
        // V in flight: from the eyes to the follow view and back, with no jump
        T.fly(150, 30, 40, 0.6, 0); T.quiet(); T.sim(0.5); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' })); out.jumpV = __steps(1.5); out.v1 = __cam();
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' })); out.jumpV2 = __steps(1.5); out.v2 = __cam(); return out; });
      t.check(r.landed, 'the bee sits'); t.eq([r.start.r < 0.1, r.start.drawn, r.start.ants], [true, false, true], 'it starts in the bee\'s eyes, antennae in view');
      t.eq(r.look.mode, 'look', 'sitting still: the camera comes out to look at the bee'); t.check(r.look.drawn && !r.look.ants, 'the body is drawn, the antennae are gone');
      t.check(r.jumpOut < JUMP, 'no jump on the way out: ' + r.jumpOut); t.check(r.jumpIn < 0.4, 'no snap on the way back in: ' + r.jumpIn);
      t.eq(r.bad, 0, 'the body is never drawn with the camera inside it, and never hidden once the camera is out');
      t.eq([r.back.mode, r.back.rig, r.back.drawn, r.back.ants], ['base', false, false, true], 'back in the eyes: body hidden, antennae in view');
      t.check(r.atEye < 0.1, 'the camera is at the bee\'s eyes: ' + r.atEye);
      t.check(r.jumpV < 0.3 && r.jumpV2 < 0.3, 'V moves the camera smoothly: ' + r.jumpV + ', ' + r.jumpV2);
      t.check(r.v1.r > 2 && r.v1.drawn, 'V: the camera is behind the bee'); t.check(r.v2.r < 0.1 && !r.v2.drawn, 'V again: back in the eyes');
      return r;
    } },

  { id: 'CAM-013-learn-danger-sense', req: 'CAM-013', name: 'Three wasp chases shaken off with pollen still on board teach danger sense; it is saved and the card says so',
    async run(t) {
      await t.ev(KIT);
      const r = await t.ev(() => { const g = __g, P = g.P, G = g.G, out = {}; T.fly(150, 30, 40, 0.6, 0); T.quiet(); P.load = [1, 1]; P.pollen = 2;
        const d = document.createElement('div'); d.innerHTML = g.keysHTML(); out.cardBefore = d.textContent; out.before = [G.escapes, G.sense];
        const w = __wasp(0); for (let i = 0; i < 3; i++) { w.gone = 0; w.decoy = null; w.p.set(P.pos.x + 80, P.pos.y, P.pos.z); w.state = 'chase'; w.t = 0; T.sim(0.05); }
        out.after = [G.escapes, G.sense]; out.toast = T.text('toast'); d.innerHTML = g.keysHTML(); out.cardAfter = d.textContent; out.saved = T.save().escapes; return out; });
      t.eq(r.before, [0, false], 'a new game has no danger sense');
      t.check(/hold to look behind you/.test(r.cardBefore) && !/danger/i.test(r.cardBefore), 'the card shows B, and does not name danger sense yet');
      t.eq(r.after, [3, true], 'three escapes: danger sense'); t.check(/Danger sense/.test(r.toast), 'a message says so: ' + r.toast);
      t.check(/danger sense finds the nearest wasp/.test(r.cardAfter), 'the card says what B does now'); t.eq(r.saved, 3, 'the escapes are saved');
      await t.reopen({ storage: { 'honeylight.save2': JSON.stringify({ honey: 0, workers: 0, spent: 0, zones: {}, escapes: 3 }) } });
      const again = await t.ev(() => __g.G.sense); t.eq(again, true, 'after a reload the bee still has danger sense');
      return r;
    } },

  { id: 'CAM-014-switch-off', req: 'CAM-014', name: '?look=0 switches the moving camera off', open: { query: '?look=0' },
    async run(t) {
      await t.ev(KIT);
      const r = await t.ev(() => { __land(true); __steps(6); const a = __cam(); T.fly(150, 30, 40, 0.6, 0); T.key('KeyW', true); T.sim(1); T.key('KeyB', true); T.sim(0.6); const b = __cam(); T.key('KeyB', false); T.key('KeyW', false); return { a, b }; });
      t.eq([r.a.mode, r.a.rig, r.b.rig], ['base', false, false], 'no look at yourself and no look behind');
      return r;
    } },
];
