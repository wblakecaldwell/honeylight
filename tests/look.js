#!/usr/bin/env node
// Look tool: take a screenshot of any moment, for a person or a Claude to look at. Not a test.
//   node tests/look.js out.png "T.fly(); T.quiet(); NIGHT.debug.begin(0.4, 3); T.lookAt(60,10,40, 120,0,90); T.sim(0.5);"
// The code runs inside the game page (window.T and window.__g are there). Add --dir=PATH or --query=?night=0 like run.js.
const fs = require('fs'), path = require('path'), H = require('./harness.js');
const arg = n => { const a = process.argv.find(a => a.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : null; };
const rest = process.argv.slice(2).filter(a => !a.startsWith('--'));
(async () => { const b = await H.launch();
  for (let i = 0; i + 1 < rest.length; i += 2) { const game = await H.openGame(b, { dir: arg('dir') || path.join(__dirname, '..'), query: arg('query') || '' });
    const r = await game.page.evaluate(new Function(rest[i + 1])); fs.writeFileSync(rest[i], H.pngBuf(await game.page.evaluate(() => T.png())));
    console.log(rest[i], r === undefined ? '' : JSON.stringify(r), game.errors.length ? game.errors : ''); await game.close(); }
  await b.close(); })();
