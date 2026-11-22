# The split tool

This tool cut the old single `main.js` (kept as `backup/main.pre-split.js`) into `main.js` + `src/*.js` on 2026-11-22.
It is kept as a record. After the split, `src/` is the source. Do not run the tool again over newer work.

- `map.js` says which lines of the old file go to which module, and names each build step.
- `split.js` writes the modules. `analyze.js` finds what each piece declares, reads and writes.
- `tokcheck.js` proves that no token of the old file was lost.

It needs `npm install acorn acorn-walk eslint-scope`. Run: `node split.js <folder with the old main.js> <output folder>`.
