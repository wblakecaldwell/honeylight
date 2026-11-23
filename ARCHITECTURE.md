# Honeylight architecture: where new code goes

This is the one guide for adding a feature to Honeylight. Read it before you write code.
`src/README.md` is the map of the files that exist now. `REQUIREMENTS.md` section 13 (MOD-001 to MOD-010) holds the same rules as requirements,
and `tests/behavior/09-structure.test.js` checks part of them.

## The shape of the game

There are three layers. Each one may use the layer above it, never the layer below it.

1. **The base: `src/core.js` and `src/world.js`.** Small helpers (vectors, random, clamp, lerp) and the map (sizes, landmarks, ground shape).
   `core.js` imports nothing from `src/`. `world.js` imports only from `core.js`. Other modules use their constants at load time.
2. **The day world: the other files in `src/`.** One subject in each file (sky, hive, bees, plants, wasps, progress ...).
   `main.js` builds them: it only imports the modules and calls their `setupX()` steps, in a fixed order.
   `src/loop.js` runs every frame and calls each module's `updateX(dt)`. `src/debug.js` puts the handles that others need on `window.__g`.
3. **Features in their own files, next to `main.js`.** The night (`night.js`, `moonflowers.js`), moths (`moths.js`, `moth-model.js`),
   the bat (`bat.js`, `bat-model.js`), the long run's fireflies at night (`runnight.js`), the storm (`storm.js`, `storm-view.js`) and the try-out menu (`stage-menu.js`).
   `index.html` loads each one with its own `<script type="module">` line after `main.js`. Nothing in `src/` imports them.

## Step 1: decide where it goes

Ask these questions in order. Use the first answer that fits.

| Question | Where it goes | Example |
|---|---|---|
| Is it a new thing in the world that a player could do without, or that comes only on some days or nights (a creature, weather, an event, a new stage of life)? | A **feature file** at the top level (step 2). | `storm.js`, `bat.js` |
| Is it more night life? | A feature file that joins the night through `NIGHT.parts` (step 2). | `moths.js` |
| Does it change how something that exists already works (flight, flowers, honey, wasps, the HUD)? | **Edit the `src/` module that owns that subject.** Keep the change small. | a new rule for nectar in `nectar.js` |
| Is it a new, always-on part of the day world that fits no file in `src/`? | A **new `src/` module** (step 3). | `src/gaps.js` (tight spots) |
| Is it only a tool for play tests or for looking at things? | A tool file that is hidden unless asked for, or a script in `tools/` or `tests/`. | `stage-menu.js` (`#menu-on`) |

If you are not sure, choose a feature file. A feature file is easy to switch off, to test alone and to remove.

## Step 2: a feature file

A feature file talks to the game from outside. It does not change the order in which the world is built.

- **Header.** The first line is `// Honeylight: <what it is>.` The next lines say, in plain words, what it does, how it talks to the game,
  and how to switch it off. Copy the top of `storm.js` or `bat.js`.
- **The handles.** Read what you need from `const g = window.__g` (made in `src/debug.js`). If a handle is missing, add it to `debug.js`.
  Never remove or rename a key of `window.__g` (MOD-010).
- **One switch.** Wrap the whole file in `if (g && !off) { ... }`. Off is `?name=0` in the address or `#name-off` in the hash.
  Add `#name-now` (or `?name=1`) to see it at once. A night part uses `NIGHT.off('name')`, so that `?night=0` also switches it off.
- **Its own object.** Put its state on one global, `window.NAME` (like `window.STORM`), with a `debug` object for tests and tools
  (`begin`, `put`, the numbers in `K`).
- **Numbers at the top.** Give every tuning number a name and a short comment in one block near the top (see storm.js "the numbers").
- **Hooks into `src/`.** When a `src/` module must react to the feature, add the smallest guarded call: `if (window.STORM) STORM.wind(WIND);`.
  Put the file name in a comment on that line (`// storm.js: ...`), so that `grep -n "storm.js" src/` finds every hook.
  The game must work the same when the global is not there.
- **Random numbers.** Never use the game's `Math.random` stream at load time, and never while the feature is not active.
  Seed your own generator (see the `rnd` in `storm.js`). three.js takes a random id for each new object, so swap `Math.random` for your
  generator while you build models, then put it back. If you do not do this, every flower and wasp after it moves and all screenshots change.
- **Night life.** Push `{ start(), update(dt, flying), finish() }` onto `NIGHT.parts`. `night.js` calls them; you do not edit `night.js` for it.
- **Load it.** Add one `<script type="module" src="./name.js"></script>` line to `index.html`, after the files it needs.

### Split a feature into behavior and view

When a feature draws something bigger than a few meshes, give it two files:

- `name.js` decides: when, where, how strong, what it does to the bee. It holds the state and the rules, and it is what the tests check.
- `name-model.js` (a creature) or `name-view.js` (weather, effects) only builds and poses what you see. It has one function,
  `makeName(g)`, that returns `{ group, set(s), update(time) }`. `set(s)` takes one plain object with everything the picture needs.
  Write the fields of `s` in the header comment. The behavior file calls `set` every frame.

Rules for a model or view file: no game logic; no `Math.random` (seed your own); no new objects or arrays in a frame (fill fixed arrays);
build with `g.mat`, `g.geoParts`, `g.ell` and `g.stick` so that it takes the same light as the rest of the world; use `g.noShadow(obj)`
for things that must not cast shadows; draw nothing, cheaply, when `vis` or `k` is 0; keep the draw calls few and say how many in the header.

### When to split more

- A file has more than one subject: split it, one subject in each file.
- A file grows past about 400 lines: look for a second subject inside it.
- The look and the rules change for different reasons: split view from behavior as above.
- Do not split a file only to make it shorter, and do not make a file for one small function.

## Step 3: code in `src/`

- **A new module** starts with a `// Honeylight: ...` header line (MOD-002) and gets a row in the table in `src/README.md`.
- **Load-time work** goes in an `export function setupX()` in that module. Call it one time in `main.js`, at the **end** of the list (MOD-009).
  `main.js` holds only comments, `import * as name from './src/name.js';` lines (the alias is the file name) and `name.setupX();` calls (MOD-001).
- **Per-frame work** goes in an `updateX(dt)` in the module that owns it. Call it from `update(dt)` in `src/loop.js`.
- **Names.** A name that a module declares is assigned only in that module (MOD-008). Other modules import it and only read it.
  To change it from outside, export a small function that changes it.
- **Function names** say what the function does. Never name code after a build round or batch (`updateRound5`, `batch2`): MOD-004 fails.
- **Do not move existing steps** in `main.js`, and do not move code from one step to another (MOD-001). The world is built from seeded random
  numbers, so a moved step changes every flower, wasp and screenshot after it.

## Step 4: tests and requirements

Every feature comes with these, in the same change:

1. **Requirements.** Add lines to `REQUIREMENTS.md` in the same plain style (short sentences, one rule in each line), with an ID prefix
   for the feature (`STM-001`, `NGT-041` ...). Add a change-log line. Mark new lines "Not approved by the owner yet".
2. **Behavior tests.** A new file `tests/behavior/NN-name.test.js`. Each test has an `id` that starts with its requirement ID and a `req` field.
   Use the feature's `debug` object and `g.sim(secs)` to get to a state fast.
3. **Screenshots.** Fixed camera spots for the new look in `tests/shots-name.js` (`run.js` loads every `shots-*.js`). Make the new goldens
   with `--update` only for the new spots. Every existing golden must still match pixel for pixel.
4. **Switch-off run.** The game must pass its day tests with the feature switched off.

Then run, from the game folder:

```
node tests/run.js --twice
node tests/run.js "--query=?night=0" --skip=NGT,shot:night-
```

When a screenshot differs and the change was not meant to change the look, do not use `--update`. Find the cause (most often a moved step
or a used random number). See `tests/README.md`.

## Wording in the game

Text the player sees (hints, toasts, field notes, the day card) stays organic: the bee's world in a bee's words. Flowers, sisters, scent, sun, wind.
No machine or drone words (no "units", "systems", "mission", "data", "scan", "target") in anything the player reads.
