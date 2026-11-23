// Reference spots for the wardrobe (src/wear.js, src/wardrobe.js). Ids start with "wardrobe-" so --only=shot:wardrobe- picks them.
// (A setup runs in the page from its source text.)
module.exports = [
  { id: 'wardrobe-cell', name: 'The wardrobe cell in the bee\'s eyes: the cap, the scarf, the cape and the tips are earned, the three dusts are still outlines',
    setup: () => { const D = __ward.WARD; T.fly(D.x, D.y, D.z + 1.8, 0, 0); T.quiet(); __g.DAY.t = 0.2; __run.RUN.mem.ch = 4; T.sim(0.6); } },
  { id: 'wardrobe-worn-hive', name: 'Follow view in the hive: the bee in its acorn cap, dandelion scarf and leaf cape, the scarf\'s ends hanging in the still air',
    setup: () => { T.fly(-2, 4.5, 0, -Math.PI / 2, 0); T.quiet(); __g.DAY.t = 0.2; __g.G.third = true; __wear.setWorn(['cap', 'scarf', 'cape']); T.sim(2.5); } },
  { id: 'wardrobe-worn-flight', name: 'Follow view over the meadow: cap, scarf and cape in flight, the scarf\'s ends streaming behind',
    setup: () => { T.fly(150, 34, 100, 0.6, 0); T.quiet(); __g.DAY.t = 0.2; __g.G.third = true; __wear.setWorn(['cap', 'scarf', 'cape']); T.key('KeyW'); T.sim(2.5); } },
  { id: 'wardrobe-worn-dusk', name: 'Follow view at dusk: glowworm tips, moth-dust wings with their drift of sparks, and the sun-gold coat',
    setup: () => { T.fly(150, 34, 100, 0.6, 0); T.quiet(); __g.DAY.t = 0.95; __g.G.third = true; __wear.setWorn(['tips', 'dust', 'gold']); T.key('KeyW'); T.sim(2.5); } },
  { id: 'wardrobe-eyes-tips', name: 'Bee\'s-eye view at dusk with the glowworm tips: the tips of the two antennae glow',
    setup: () => { T.fly(150, 34, 100, 0.6, 0); T.quiet(); __g.DAY.t = 0.95; __wear.setWorn(['tips']); T.key('KeyW'); T.sim(1.5); } },
];
