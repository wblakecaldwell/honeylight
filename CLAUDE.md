# Honeylight: notes for Claude

Honeylight is a browser game: one short life as a honeybee. Plain JavaScript modules and three.js, no build step.

## Read first

- **`ARCHITECTURE.md`**: where a new feature goes and how to split it into modules. Follow it for every change that adds code.
- `src/README.md`: the map of the files in `src/` and the rules for working in them.
- `tests/README.md`: how to run the tests and the screenshot compares.
- `REQUIREMENTS.md`: what the game must do. Section 13 (MOD-001 to MOD-010) is the code structure.

## Hard rules for code

1. Do not change the order of the setup steps in `main.js`, and do not move code between steps. A new step goes at the end.
2. Do not reformat or "clean up" code you were not asked to change. A move or a rename must not change the game.
3. In a one-line function or loop, use `/* */` comments, never `//`.
4. A name declared in one module is assigned only in that module. Other modules only read it.
5. Every file in `src/` starts with a one-line `// Honeylight: ...` header. No "round" or "batch" in function names.
6. Do not remove or rename a key of `window.__g`.

## The owner's standing rules

- **Never name the owner.** In files, comments, requirements and commit messages write "the owner"; in chat say "the user" or "you".
  Do not use their name. (The LICENSE copyright line and the site address are the only places the name belongs.)
- **The deterministic tests must pass.** Before you hand work over, run `node tests/run.js --twice` and
  `node tests/run.js "--query=?night=0" --skip=NGT,shot:night-`. Report the numbers.
- **Pictures stay pixel-exact** unless the change is meant to change the look. Never use `--update` to make a failing screenshot pass;
  find the cause. Use `--update` only for new screenshots or a look change that is the point of the work, and say so.
- **The tests must run on any machine**, for anyone who downloads the repository (TST-010 to TST-015). Nothing from the machine
  (sound device, screen, fonts) may reach the game's random numbers: sound code uses `sndRnd`. A shader makes random-looking numbers
  only with `HASH` from `src/engine.js`, fed with exact values: no `fract(sin(x)*43758.5)`, no smooth varying into a hash. See `tests/README.md`.
- **No Claude attribution in commits or pull requests**: no "Co-Authored-By: Claude" trailer, no "Generated with" line, no session links.
- **Never push** to GitHub without the owner's explicit yes for that push. Local commits are fine.
- **In-game wording stays organic.** Text the player reads uses the bee's world (flowers, sisters, scent, sun, wind),
  never machine or drone language.
