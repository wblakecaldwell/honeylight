// Reference spots for the long run's places (the runner loads every shots-*.js). Ids start with "place-" so --only=place- picks them.
// Each spot opens all zones first (a closed zone would push the camera bee out), then looks along the track or at the place.
module.exports = [
  { id: 'place-tunnel-mouth', name: 'The mole tunnel: the hole in the big hill at the end of the dew path, stones and roots round it',
    setup: () => { const G = __g, R = __run.RUN, B = __burrow.BURROW; for (const k in G.ZONES) G.G.zones[k] = true; G.G.orchard = true; T.fly(); T.quiet(); G.DAY.t = 0.2;
      const i = B.i0 + B.iIn - 13, s = R.S[i], t = R.T[i]; T.place(s.x, __run.groundAt(s.x, s.z) + 1.9, s.z, Math.atan2(-t.x, -t.z), 0); T.sim(0.3); } },
  { id: 'place-tunnel-inside', name: 'Inside the mole tunnel: earth walls, hanging roots, pale fungus light',
    setup: () => { const G = __g, R = __run.RUN, B = __burrow.BURROW; for (const k in G.ZONES) G.G.zones[k] = true; G.G.orchard = true; T.fly(); T.quiet(); G.DAY.t = 0.2;
      const i = B.i0 + (B.n >> 1) - 8, s = R.S[i], t = R.T[i]; T.place(s.x, __run.groundAt(s.x, s.z) + 1.6, s.z, Math.atan2(-t.x, -t.z), 0); T.sim(0.3); } },
  { id: 'place-garden-pot', name: 'The tipped clay pot on the track in the walled garden, the bean row beyond',
    setup: () => { const G = __g, R = __run.RUN, P = __gardenway.GARDENWAY.pot; for (const k in G.ZONES) G.G.zones[k] = true; G.G.orchard = true; T.fly(); T.quiet(); G.DAY.t = 0.2;
      const i = __run.nearest(P.a.x, P.a.z).i - 9, s = R.S[i], t = R.T[i]; T.place(s.x, __run.groundAt(s.x, s.z) + 2.0, s.z, Math.atan2(-t.x, -t.z), 0.03); T.sim(0.3); } },
  { id: 'place-bean-row', name: 'Under the bean canes: the track between the leaning canes, leaves and scarlet flowers',
    setup: () => { const G = __g, R = __run.RUN, Bn = __gardenway.GARDENWAY.beans; for (const k in G.ZONES) G.G.zones[k] = true; G.G.orchard = true; T.fly(); T.quiet(); G.DAY.t = 0.2;
      const i = __run.nearest(Bn.ax, Bn.az).i - 7, s = R.S[i], t = R.T[i]; T.place(s.x, __run.groundAt(s.x, s.z) + 2.0, s.z, Math.atan2(-t.x, -t.z), 0.06); T.sim(0.3); } },
  { id: 'place-spring-waterfall', name: 'The spring rock from the pond: the rill on the rock, the flat stone and the falling water',
    setup: () => { const G = __g, W = __waterway.WATERWAY; for (const k in G.ZONES) G.G.zones[k] = true; G.G.orchard = true; T.fly(); T.quiet(); G.DAY.t = 0.2;
      T.lookAt(W.fall.x + 13, G.WY + 5.2, W.fall.z + 6, W.fall.x - 5, G.WY + 3.2, W.fall.z - 3); T.sim(0.3); } },
  { id: 'place-reed-arches', name: 'Low over the pond: reeds lean across the track, lily pads beside it',
    setup: () => { const G = __g, R = __run.RUN, W = __waterway.WATERWAY; for (const k in G.ZONES) G.G.zones[k] = true; G.G.orchard = true; T.fly(); T.quiet(); G.DAY.t = 0.2;
      const i = W.archAt[0] - 7, s = R.S[i], t = R.T[i]; T.place(s.x, __run.groundAt(s.x, s.z) + 1.7, s.z, Math.atan2(-t.x, -t.z), 0.05); T.sim(0.3); } },
  { id: 'place-mossy-way', name: 'The mossy way in the forest: moss, ferns, a root arch and the hollow log on the track',
    setup: () => { const G = __g, R = __run.RUN, M = __mossway.MOSSWAY; for (const k in G.ZONES) G.G.zones[k] = true; G.G.orchard = true; T.fly(); T.quiet(); G.DAY.t = 0.2;
      const i = M.jLog - 15, s = R.S[i], t = R.T[i]; T.place(s.x, __run.groundAt(s.x, s.z) + 1.8, s.z, Math.atan2(-t.x, -t.z), 0.05); T.sim(0.3); } },
  { id: 'place-fallen-trunk', name: 'Where the high branch leaves the track: the fallen trunk leans up into the forest',
    setup: () => { const G = __g, R = __run.RUN, H = __high.HIGH; for (const k in G.ZONES) G.G.zones[k] = true; G.G.orchard = true; T.fly(); T.quiet(); G.DAY.t = 0.2;
      const i = H.i0 + 1, s = R.S[i], t = R.T[i]; T.place(s.x, __run.groundAt(s.x, s.z) + 2.2, s.z, Math.atan2(-t.x, -t.z) - 0.25, 0.12); T.sim(0.3); } },
  { id: 'place-high-bough', name: 'Up on the high branch: a mossy bough under the crowns, the forest floor far below',
    setup: () => { const G = __g, H = __high.HIGH; for (const k in G.ZONES) G.G.zones[k] = true; G.G.orchard = true; T.fly(); T.quiet(); G.DAY.t = 0.2;
      const j = 92, s = H.S[j], t = H.T[j]; T.place(s.x, s.y + 1.9, s.z, Math.atan2(-t.x, -t.z), -0.06); T.sim(0.3); } },
];
