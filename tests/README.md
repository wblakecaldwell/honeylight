# Honeylight tests

On any machine, from a fresh copy of the repository:

    npm install                        gets Playwright, the one thing the tests need (the game itself needs nothing)
    npx playwright install chromium    gets the browser the tests run in (one time)
    npm test                           runs everything; the same as: node tests/run.js

It needs Node 20 or newer. If the browser does not start on Linux, `npx playwright install-deps chromium` adds the system libraries it wants. See the top of `run.js` for the options.

- `harness.js` makes the game deterministic from outside: seeded `Math.random`, frozen clock, no `requestAnimationFrame`, SwiftShader software renderer, 480x300 window. It needs no change in the game files.
- `behavior/*.test.js` are scripted checks. Each has the ID of the REQUIREMENTS.md line it checks. They give the same results on every machine.
- `shots.js` and `shots-*.js` list fixed camera spots. `golden/` holds the reference images, and `golden/machine.json` says which machine made them.
- When a screenshot does not match, `out/NAME.actual.png` is what this run drew and `out/NAME.diff.png` shows the changed pixels in red.
- When a change is meant to alter the look: run, look at `out/*.actual.png` and `out/*.diff.png`, and if the result is right run with `--update` to accept it.
- `--twice` runs everything two times and fails if anything differs. Use it after harness changes.
- Night off: `node tests/run.js "--query=?night=0" --skip=NGT,shot:night-` (or `npm run test:night-off`) runs the day tests and day screenshots without the night. `--only` and `--skip` take several words with commas; a screenshot id starts with `shot:`.

## The same tests on every machine

The screenshots are drawn by software on the CPU, so no graphics card is involved. Two kinds of chip can still round a few pieces of drawing math (dot, sin, pow, a matrix times a vector) a last bit differently. The runner deals with it like this:

- First it runs a short check of this machine's drawing math (`machine()` in `harness.js`) and compares two checksums with those in `golden/machine.json`.
- Same checksums: this machine draws like the reference machine. Every screenshot must match **pixel for pixel**.
- Other checksums: screenshots must be the **same to the eye**. At most 0.1% of the pixels may be off by more than 24/255, at most 4 squares of 2x2 pixels may be off like that, and no 8x8 square may differ by more than 6/255 on average (`EYE` in `harness.js`). Single pixels that fall on the other side of an edge pass, and so does a sliver one pixel thin. A missing, moved or recoloured object fails, and so does a change of tint.
- The runner prints which way it compares. `--keep` keeps the pictures of a "same to the eye" pass for a look.
- `--update` on another kind of machine is refused for single screenshots, because the reference images must all come from one kind of machine. Without `--only` and `--skip` it makes all of them again, and this machine becomes the reference machine.

For this to work the game must not let the machine into its numbers (REQUIREMENTS.md TST-013 and TST-014): the sound has its own random numbers, and the drawing code makes its random-looking patterns only with `HASH` from `src/engine.js`, fed with exact values.

Two tools help with a machine that behaves in a new way. Both write to `out/`, and both compare two result files when given two file names:

- `node tests/chip-probe.js` runs about sixty pieces of drawing math and keeps every bit: which pieces differ from another machine, and by how much.
- `node tests/chip-trace.js` plays every screenshot spot and writes down each step of the game: how many random numbers were drawn, by which lines of code, and where the bees are. It finds the first step where two machines part.
