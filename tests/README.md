# Honeylight tests

Run from the game folder: `node tests/run.js` (see the top of `run.js` for options).

- `harness.js` makes the game deterministic from outside: seeded `Math.random`, frozen clock, no `requestAnimationFrame`, SwiftShader software renderer, 480x300 window. It needs no change in the game files.
- `behavior/*.test.js` are scripted checks. Each has the ID of the REQUIREMENTS.md line it checks.
- `shots.js` lists fixed camera spots. `golden/` holds the reference images. A screenshot must match its reference pixel for pixel. When it does not, `out/NAME.diff.png` shows the changed pixels in red.
- When a change is meant to alter the look: run, look at `out/*.actual.png` and `out/*.diff.png`, and if the result is right run with `--update` to accept it.
- `--twice` runs everything two times and fails if anything differs. Use it after harness changes.

Needs Node and Playwright with its Chromium. Pixel-exact results need the same Chromium build on the same CPU type; run in one container image to compare across machines.
- Night off: `node tests/run.js "--query=?night=0" --skip=NGT,shot:night-` runs the day tests and day screenshots without the night. `--only` and `--skip` take several words with commas; a screenshot id starts with `shot:`.
