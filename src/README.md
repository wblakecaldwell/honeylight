# Honeylight code map

The game used to be one big `main.js`. Now `main.js` only builds the game, step by step, and the code lives here in `src/`.
Each file starts with a `// Honeylight: ...` line that says what is in it. This table repeats those lines.

| File | What is in it |
|---|---|
| `core.js` | Small helpers used everywhere: vector names, random, clamp, lerp. |
| `world.js` | The map: world sizes, where every landmark stands, and the shape of the ground. |
| `engine.js` | The look: renderer, shaders, shapes, particles, sun shadows, the glow pass and auto resolution. |
| `day.js` | The sky, the day from afternoon to dusk, and the day card. |
| `hive.js` | The hive: the tree shell, the combs, the birth cell and the door. |
| `bees.js` | The sisters: bodies, hive bees, foragers, the dance, escorts and the bee ball. |
| `plants.js` | Trees and leaves, the dew path, grass, flowers, mushrooms, and how solid they are. |
| `places.js` | The ground, pond, orchard, hedge, log, forest edge, brook, branches and the bramble hollow. |
| `air.js` | Air to ride: warm stones, dew arches, wind, updrafts and petal gusts. |
| `player.js` | You: state, the body, actions, collisions, third person view and coming home. |
| `controls.js` | Keys, mouse and touch, the hint line, the field notes card and first-time tips. |
| `abilities.js` | Earned moves: Dart, Leap and the red clover heat buzz. |
| `wasps.js` | Wasps: bodies, the nest, the chase, raids, rescues, the nest raid and their sound. |
| `hazards.js` | Spider webs and dragonflies. |
| `nectar.js` | Rich blooms, the great sunflower, and staying on a flower to drink. |
| `progress.js` | Honey, unlocks, saving, the HUD and messages. |
| `zones.js` | Scent stones and the places they open. |
| `trails.js` | Nectar trails that drift through the world. |
| `audio.js` | Sound: the audio graph, tones, noise and sweeps. |
| `loop.js` | The frame loop and the big update that flies the bee. |
| `debug.js` | `window.__g`: the handles that tests and tools use. |
| `gaps.js` | Tight spots: small natural openings to fly through, their chime and their lines. |
| `longrun.js` | The long run: the track round the whole map, the zone rules, tiers and bails, the cells, the light and the challenges. |
| `solids.js` | Plain solid shapes for the long run's places (sticks, balls, stones, blocks, pipes) and the test that keeps the bee out of them. |
| `runkit.js` | The building kit for the long run's places: shared materials, lumpy shapes, ferns, grass clearings, and `quietBuild` (its own random numbers). |
| `burrow.js` | The mole tunnel under the big hill. |
| `gardenway.js` | The garden pieces on the long run: the tipped pot, the bean row and the seed trays. |
| `waterway.js` | The spring rock, its rill and waterfall, the lily pads and the reed arches. |
| `mossway.js` | The mossy way in the forest: moss, ferns, big roots, root arches, the old stump and the hollow log. |
| `highbranch.js` | The high branch: the fallen trunk, the boughs under the crowns, and how the run knows the bee is on it. |

Outside `src/`: `night.js` (the night: moon, fireflies, the hollow grove), `moonflowers.js` (the moonflower models), `moths.js` and `moth-model.js` (hawk moths from the second night), and `bat.js` and `bat-model.js` (the bat from the third night) are separate on purpose.
The storm is separate too: `storm.js` (when and where it rains, what rain does to the bee, the rainbow's foot) and `storm-view.js` (what it looks like: rain, the rain front, lightning, the rainbow). It reaches `src/` only through hooks tagged "storm.js".
Add `?night=0` to the address to switch the night off (moths and bat too); `?moths=0` and `?bat=0` switch off only those. `?storm=0` (or `#storm-off`) switches off the storm, and `#storm-now` starts one soon after you fly out. `index.html` loads `main.js`, the night, the storm and the try-out menu.
The try-out menu is `stage-menu.js` (a play-test tool: a list that jumps to a stage, a checkbox that opens all zones). It is hidden unless the address has `#menu-on` (or `?menu=1`); to leave it out of a release, remove its line from `index.html`.

## The rules

1. **The order in `main.js` matters.** The world is built from seeded random numbers. If you move a step, every random number after it changes, and so do the flowers, the wasps and the screenshots. Do not move a step or move code between steps.
2. **A move is not a change.** When you move or rename code, the game must play and look exactly the same. The screenshots must match pixel for pixel without `--update`.
3. **One-line functions take `/* */` comments, never `//`.** A `//` comment inside a one-line function hides the rest of the line, and the game stops loading.
4. **Each name belongs to one file.** A name declared in one module is assigned only in that module. Other modules can read it (imports are read-only).
5. **`core.js` and `world.js` are the base.** `core.js` imports nothing from `src/`. `world.js` imports only from `core.js`. Other modules rely on their constants being ready first.
6. **Run the tests.** After a change run the tests that matter. Before you hand work over, run everything two times (`node tests/run.js --twice`), and once with the night off. See `tests/README.md`.

## Where does new code go?

See `ARCHITECTURE.md` at the top of the game folder. It says where a new feature goes (a feature file, a `src/` module, or a change
to a module that exists), how to split it into behavior and view, and which tests and requirements come with it.
