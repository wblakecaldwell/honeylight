// Reference spots for the camera that moves on its own (src/lookcam.js). Ids start with "look-".
// Each spot puts the bee down on a big meadow flower (or flies it), waits, and lets the camera move. (A setup runs in the page from its source text.)
const land = `const g = __g, P = g.P; T.quiet(); g.DAY.t = 0.2; let best = null, bd = 1e9;
  for (const f of g.flowers) { if (f.lily || f.giant || f.canopy || f.r < 1.25) continue; const d = Math.hypot(f.x - 60, f.z - 40); if (d < bd) { bd = d; best = f; } }
  T.fly(best.sx ?? best.x, best.y + 2.2, best.sz ?? best.z, 0.6, 0); T.sim(0.3); T.key('ShiftLeft', true); let n = 0; while (!P.landed && n++ < 240) T.sim(1 / 60); T.key('ShiftLeft', false);`;
const wasp = `const w = g.wasps.filter(w => !w.raider && !w.mob && !w.orchard)[0], hold = () => { w.gone = 0; w.decoy = null; w.p.set(P.pos.x - 9, P.pos.y + 2.5, P.pos.z - 9); w.home = w.p.clone(); w.v.set(0, 0, 0); w.state = 'retreat'; w.t = -1e9; };`;
module.exports = [
  { id: 'look-at-yourself', name: 'Sitting still on a flower: the camera has come round to the front of the bee, 45 degrees up and across',
    setup: new Function(land + ` g.G.third = false; T.sim(6.5);`) },
  { id: 'look-danger-sense', name: 'Danger sense: a wasp hangs near a sitting bee, and the camera frames the bee in front and the wasp behind it',
    setup: new Function(land + wasp + ` g.G.third = true; g.G.sense = true; T.sim(5.5); for (let i = 0; i < 150; i++) { hold(); T.sim(1 / 60); }`) },
  { id: 'look-behind', name: 'Holding B in flight: the camera looks back past the bee along the way it came',
    setup: new Function(`const g = __g; T.fly(150, 30, 40, 0.6, 0); T.quiet(); g.DAY.t = 0.2; g.G.third = true; T.key('KeyW', true); T.sim(1.5); T.key('KeyB', true); T.sim(0.8);`) },
];
