# Honeylight

**[Play it in your browser](https://blakecaldwell.net/honeylight/)**

Honeylight: a browser game where you live one short life as a honeybee. FPV-drone-style flight through a giant meadow, built with three.js. Work in progress.

![Scenes from Honeylight](tile.png)

## Run it locally

The game is plain HTML and JavaScript with no build step, but it uses ES modules, so it has to be served over HTTP rather than opened as a file.

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in a desktop browser and click to wake.

Any static file server works (for example `npx serve`).

## Controls

| Key | Action |
| --- | --- |
| Mouse | Look / steer |
| W A S D | Fly or walk |
| Space / Shift | Rise / sink |
| V | Switch between bee's-eye and third-person view |
| Q / E | Dart / leap (unlocked with honey) |
| F | Heat buzz near wasps |
| R | Call your sisters |

Progress is saved in your browser's local storage only.

## Files

- `index.html`, `main.js`: the game
- `three.module.min.js`: [three.js](https://threejs.org) r160, MIT licensed, vendored
- `REQUIREMENTS.md`: design requirements
- `wasp-sounds/`: a small page for auditioning wasp sound effects

## License

[MIT](LICENSE). three.js is © three.js authors, also under the MIT license.
