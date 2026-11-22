// Keys card, one-time hints, the camera view, the old look, and the word check.
const fs = require('fs'), path = require('path');
const GAME = path.join(__dirname, '..', '..'); // the game folder these tests sit in
const BAD = /\b(drones?|courses?|rings?|gates?|checkpoints?)\b/i;
// Allowed on purpose (ask the owner if unsure): the hedge garden gate is a real garden gate, not a race gate.
const ALLOW = [/by the gate/];

// visible text candidates in main.js: string literals on lines that put text on the screen
function screenStrings(src) {
  const out = [];
  for (const line of src.split('\n')) {
    if (!/\b(toast|hint|tipOnce)\(|innerHTML|keysHTML|textContent\s*=/.test(line)) continue;
    const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g; let m;
    while ((m = re.exec(line))) { const s = (m[1] ?? m[2] ?? m[3]).replace(/\$\{[^}]*\}/g, ' ').replace(/<[^>]*>/g, ' ');
      if (/[a-z]{3,} [a-z]{2,}/i.test(s)) out.push(s.trim()); }
  }
  return out;
}
function htmlText(src) { return src.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '); }

module.exports = [
  { id: 'KEY-001-card', req: 'KEY-001', name: 'Holding Tab shows the Field notes card; H turns it on and off',
    async run(t) {
      await t.ev(() => { T.fly(150, 30, 40); T.quiet(); T.sim(0.2); });
      const on = () => t.ev(() => document.getElementById('keys').classList.contains('on'));
      const r = { start: await on() };
      await t.page.keyboard.down('Tab'); r.tabDown = await on(); await t.page.keyboard.up('Tab'); r.tabUp = await on();
      await t.page.keyboard.press('KeyH'); r.h1 = await on(); r.text = (await t.ev(() => document.getElementById('keys').textContent)).length;
      await t.page.keyboard.press('KeyH'); r.h2 = await on();
      t.eq([r.start, r.tabDown, r.tabUp, r.h1, r.h2], [false, true, false, true, false], 'card state: start, Tab down, Tab up, H, H again');
      t.check(r.text > 40, 'the card has text');
      return r;
    } },

  { id: 'KEY-005-tip-once', req: 'KEY-005', name: 'A first-time hint shows one time only, also after a reload',
    async run(t) {
      const first = await t.ev(() => { const g = __g, P = g.P; T.fly(150, 30, 40); T.quiet(); P.flownAt = g.time + 0.001; /* 0 would read as never flown */ let seen = false;
        for (let i = 0; i < 30 && !seen; i++) { T.sim(0.5); seen = /from behind/.test(T.text('hint')); } return { seen, tips: localStorage.getItem('honeylight.tips') }; });
      await t.reopen({ storage: { 'honeylight.tips': first.tips || '{}' } });
      const again = await t.ev(() => { const g = __g, P = g.P; T.fly(150, 30, 40); T.quiet(); P.flownAt = g.time + 0.001; /* 0 would read as never flown */ let seen = false;
        for (let i = 0; i < 30 && !seen; i++) { T.sim(0.5); seen = /from behind/.test(T.text('hint')); } return seen; });
      t.check(first.seen, 'the V hint shows after the first flight'); t.check(/"v"/.test(first.tips || ''), 'it is remembered: ' + first.tips);
      t.eq(again, false, 'it does not show again after a reload');
      return { first: first.seen, again };
    } },

  { id: 'CAM-001-view', req: 'CAM-001', name: 'V changes to the view from behind, and the choice is kept after a reload',
    async run(t) {
      await t.ev(() => { T.fly(150, 30, 40); T.quiet(); T.sim(0.2); });
      const third0 = await t.ev(() => __g.G.third);
      await t.page.keyboard.press('KeyV'); const r = await t.ev(() => ({ third: __g.G.third, view: localStorage.getItem('honeylight.view') }));
      await t.reopen({ storage: { 'honeylight.view': r.view } }); const kept = await t.ev(() => __g.G.third);
      await t.page.keyboard.press('KeyV'); const back = await t.ev(() => __g.G.third);
      t.eq([third0, r.third, kept, back], [false, true, true, false], 'first person, behind, kept after reload, back to first person');
      return { third0, ...r, kept, back };
    } },

  { id: 'CAM-006-outside-first', req: 'CAM-006', name: 'A new game starts with the camera outside the bee. The hatching stays in the cell. V changes to the bee\'s eyes and the game keeps that',
    async run(t) {
      await t.reopen({ storage: { 'honeylight.view': null } });
      const a = await t.ev(() => { const g = __g, o = { third: g.G.third, stored: localStorage.getItem('honeylight.view') }; T.sim(0.5); o.title = [g.P.mode, g.camDist, g.me.s.x < 0.01];
        T.fly(150, 30, 40); T.quiet(); T.key('KeyW'); T.sim(2); T.key('KeyW', false); o.dist = +g.camDist.toFixed(2); o.seen = g.me.s.x === 1; o.behind = +g.camera.position.distanceTo(g.P.pos).toFixed(2);
        g.P.flownAt = g.time - 11; T.sim(0.5); o.tip = T.text('hint'); return o; });
      t.eq([a.third, a.stored], [true, null], 'no stored choice: the view is from outside'); t.eq(a.title, ['title', 0, true], 'in the cell the camera is in the bee and the bee model is not drawn');
      t.check(a.dist > 0.7 && a.seen && a.behind > 2.5, `in flight the camera is ${a.behind} behind the bee and the bee is drawn`); t.check(/bee's eyes/.test(a.tip), 'the V tip tells of the other view: ' + a.tip);
      await t.page.keyboard.press('KeyV'); const v = await t.ev(() => ({ third: __g.G.third, view: localStorage.getItem('honeylight.view') })); t.eq(v, { third: false, view: '1' }, 'V changes to the bee\'s eyes and stores it');
      await t.reopen({ storage: { 'honeylight.view': '1' } }); t.eq(await t.ev(() => __g.G.third), false, 'kept after a reload'); return { a, v };
    } },

  { id: 'HIV-015-waddle', req: 'HIV-015', name: 'Seen from outside, the bee waddles when it walks on the comb: its body swings left and right. It is still when it stands',
    async run(t) {
      await t.reopen({ storage: { 'honeylight.view': null } }); await t.page.click('#title');
      const r = await t.ev(() => { const g = __g, P = g.P, V = g.THREE.Vector3; let n = 0; while (P.mode === 'cell' && n < 40) { g.chew(); T.sim(0.2); n++; } T.sim(6);
        const swing = () => { const f = new V(0, 0, 1).applyQuaternion(g.me.q); return f.x * P.cdir.y - f.y * P.cdir.x; }; /* how far the body points to the side of the way it walks */
        const o = { mode: P.mode, seen: g.me.s.x === 1, still: +Math.abs(swing()).toFixed(3) }; T.key('KeyW'); let lo = 0, hi = 0, flips = 0, last = 0; const y0 = P.pos.y;
        for (let i = 0; i < 120; i++) { T.sim(1 / 60); const s = swing(); lo = Math.min(lo, s); hi = Math.max(hi, s); if (s * last < 0) flips++; if (s) last = s; }
        o.left = +lo.toFixed(3); o.right = +hi.toFixed(3); o.flips = flips; o.walked = +(P.pos.y - y0).toFixed(1); T.key('KeyW', false); T.sim(1.5); o.stopped = +Math.abs(swing()).toFixed(3); return o; });
      t.eq([r.mode, r.seen], ['crawl', true], 'on the comb, seen from outside'); t.eq(r.still, 0, 'a standing bee points straight'); t.check(r.left < -0.05 && r.right > 0.05, `walking, the body swings to both sides (${r.left} to ${r.right})`);
      t.check(r.flips >= 6 && r.flips <= 16, 'about three swings a second, as the sisters: ' + r.flips + ' changes of side in 2 s'); t.check(r.walked > 2.5, 'it walks on: ' + r.walked); t.check(r.stopped < 0.005, 'it is still again after it stops: ' + r.stopped); return r;
    } },

  { id: 'GFX-006-old-look', req: 'GFX-006', name: 'The game loads and flies with ?mp=0 (the old look)', open: { query: '?mp=0' },
    async run(t) {
      const r = await t.ev(() => { T.fly(150, 30, 40); T.quiet(); T.key('KeyW'); T.sim(2); T.key('KeyW', false); __g.snap(); return { mp: !!__g.MP, flowers: __g.flowers.length, moved: +(__g.P.pos.distanceTo(new __g.THREE.Vector3(150, 30, 40))).toFixed(1) }; });
      t.eq(r.mp, false, 'the model pass is off'); t.check(r.flowers > 100, 'the world has flowers'); t.check(r.moved > 5, 'the bee flies');
      return r;
    } },

  { id: 'GEN-002-words', req: 'GEN-002', name: 'No screen text uses drone, course, ring, gate or checkpoint',
    async run(t) {
      const srcDir = path.join(GAME, 'src'), parts = fs.existsSync(srcDir) ? fs.readdirSync(srcDir).filter(f => f.endsWith('.js')).sort().map(f => path.join(srcDir, f)) : []; /* the game code: main.js and, after the module split, src/ */
      const js = [path.join(GAME, 'main.js'), ...parts].map(f => fs.readFileSync(f, 'utf8')).join('\n'), html = fs.readFileSync(path.join(GAME, 'index.html'), 'utf8');
      const extra = ['night.js', 'moonflowers.js'].map(f => fs.readFileSync(path.join(GAME, f), 'utf8')).join('\n');
      const strings = screenStrings(js + '\n' + extra), bad = strings.filter(s => BAD.test(s) && !ALLOW.some(a => a.test(s))), htmlBad = (htmlText(html).match(new RegExp(BAD.source, 'gi')) || []);
      // the live page too: everything the title screen, HUD and keys card show
      const live = await t.ev(() => { T.fly(150, 30, 40); T.sim(0.2); return document.body.innerText; }), liveBad = live.match(new RegExp(BAD.source, 'gi')) || [];
      t.check(strings.length > 40, 'found the screen strings in the game code: ' + strings.length);
      t.eq(bad, [], 'game code screen text'); t.eq(htmlBad, [], 'index.html text'); t.eq(liveBad, [], 'text on the page');
      return { strings: strings.length, bad: bad.length + htmlBad.length + liveBad.length };
    } },
];
