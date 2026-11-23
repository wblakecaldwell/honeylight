// Reference spots for the world answering the long run (src/runworld.js, runnight.js). Ids start with "run-" so --only=shot:run- picks them; the night spots start with "night-run-", so the night-off run skips them (shot:night-).
// Each spot opens all zones, rides the start of the track with the test autopilot, sets the tier, and rides on a little so the world has answered.
// (A setup runs in the page from its source text, so each one is made from a text body.)
const ride = (tier, secs, third, night) => new Function(`const G = __g, R = __run.RUN; for (const k in G.ZONES) G.G.zones[k] = true; G.G.orchard = true;
  ${night ? 'NIGHT.debug.begin(0.3, 6);' : 'G.DAY.t = 0.2;'} T.fly(0, 0, 0); T.quiet(); G.G.third = ${!!third};
  __run.startAuto({ i: 2, spd: 22 }); T.sim(1.5); R.tier = ${tier}; R.prog = 0; T.sim(${secs});`);
module.exports = [
  { id: 'run-bow-wave', name: 'Bee\'s-eye view at the third tier on the dew path: the grass leans away ahead, little flowers open along the edges, petals stream past', setup: ride(3, 1.6, false) },
  { id: 'run-top-tier', name: 'Bee\'s-eye view at the top tier: sparks in the zone\'s colours, dew lifting off the grass, the light warmer', setup: ride(5, 2.4, false) },
  { id: 'run-follow-view', name: 'Follow view at the fourth tier: the bee in its light, the grass parting ahead of it, flowers open beside the track', setup: ride(4, 1.6, true) },
  { id: 'night-run-fireflies', name: 'Bee\'s-eye view at night at the third tier: the aura lights the grass, fireflies have risen and fly behind', setup: ride(3, 3.5, false, true) },
  { id: 'night-run-follow', name: 'Follow view at night at the third tier: the bee in its light with a tail of fireflies', setup: ride(3, 3.5, true, true) },
];
