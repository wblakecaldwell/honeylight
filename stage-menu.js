// Honeylight: the try-out menu. A tool for play testing, not a part of the game.
// A small box at the top right: a day field that warps to the afternoon of any day, a list that jumps to a stage
// (afternoon, storm, dusk, each kind of night) and sets the day that the stage belongs to, and a checkbox that opens all zones without honey.
// Self-contained: it talks to the game through window.__g, window.NIGHT and window.STORM, and does nothing until it is used.
// Hidden unless asked for: add #menu-on to the address (or ?menu=1). To leave it out of a release, remove its line from index.html.
const g = window.__g;
if (g && (/[?&]menu=1(&|$)/.test(location.search) || location.hash.includes('menu-on'))) {
  const { P, G, DAY, ZONES, FDIR, terrainH } = g, N = window.NIGHT, S = window.STORM;
  const KEY = 'honeylight.allZones'; // holds the zones as they were before the box was ticked

  // ---- stages
  const STAGES = [['day', 'Afternoon']];
  if (S) STAGES.push(['storm', 'Storm: it starts to brew'], ['rain', 'Storm: the rain is close'], ['bow', 'Storm: the rain has just passed']);
  STAGES.push(['dusk', 'Dusk']);
  if (N) { // a night stage sets the day to its number; a storm stage sets the day to a storm day (4, 7, 10 ...)
    const who = n => (N.moths ? ['', 'two', 'two', 'three', 'four'][n] + ' moths' : '') + (N.moths && N.bat ? ' and ' : '') + (N.bat ? 'the bat' : '');
    STAGES.push(['night1', 'Night 1: moonflowers and fireflies' + (N.moths || N.bat ? ', ' + who(1) : '')]);
    if (N.moths || N.bat) STAGES.push(['night2', 'Night 2: ' + who(2)], ['night3', 'Night 3: ' + who(3)], ['night4', 'Night 4: ' + who(4)]); }

  // a bee that has not hatched yet skips the start: sound on, in the air between the hive and the flower field
  function wake() {
    const title = document.getElementById('title');
    if (P.mode === 'title') title.click();
    if (P.mode === 'title' || P.mode === 'cell') { const x = FDIR.x * 40, z = FDIR.z * 40; title.style.opacity = 0; title.style.display = 'none';
      P.mode = 'fly'; P.wingsReady = true; P.flown = true; P.vel.set(0, 0, 0); P.pos.set(x, terrainH(x, z) + 12, z); P.yaw = Math.atan2(-FDIR.x, -FDIR.z); P.pitch = 0; }
  }
  // end whatever is going on: a storm, a night
  function calm() { if (S && S.on) S.debug.end(); if (N) { if (N.active) N.debug.end(); N.done = false; N.moonset = false; N.tryNight = 0; } DAY.warned = 0; }
  const stormDay = n => { n = Math.max(n, S.FIRST_DAY); while (!S.isDay(n)) n++; return n; };
  // warp to the afternoon of day n
  function day(n) {
    n = Math.max(1, Math.min(999, n | 0)); if (DAY.ending > 0) { g.hint('the day is ending: pick again in the morning', 4); return false; }
    wake(); calm(); DAY.n = n; DAY.t = 0.05; DAY.honey = 0; g.applyDayLight(); if (S) S.day = 0; g.save(); show();
    g.toast(`<b>Day ${n}</b>` + (S && S.isDay(n) ? '<br><span>a storm will come this afternoon</span>' : ''), 4); return true;
  }
  function go(id) {
    const st = STAGES.find(s => s[0] === id); if (!st) return false;
    if (DAY.ending > 0) { g.hint('the day is ending: pick again in the morning', 4); return false; }
    wake(); calm();
    if (id.slice(0, 5) === 'night') DAY.n = +id.slice(5); else if (id === 'storm' || id === 'rain' || id === 'bow') DAY.n = stormDay(DAY.n);
    if (id === 'day') { DAY.t = 0.05; g.applyDayLight(); }
    else if (id === 'dusk') { DAY.t = 0.9; DAY.warned = 1; g.applyDayLight(); }
    else if (id === 'storm' || id === 'rain' || id === 'bow') { DAY.t = 0.42; g.applyDayLight(); S.debug.begin(id === 'rain' ? 38 : 0);
      if (id === 'bow') S.T = S.BREW + (400 - (P.pos.x * S.ax + P.pos.z * S.az) + S.WIDTH) / S.SPEED + 4; } // the rain left the bee 4 seconds ago
    else N.debug.begin(0.12, 0);                                                                             // the moon is up; the first moth and the bat come within seconds
    if (id !== 'storm' && id.slice(0, 5) !== 'night') g.toast('<b>' + st[1] + '</b><br><span>day ' + DAY.n + '</span>', 3); else g.hint('day ' + DAY.n, 4);
    g.save(); show(); return true;
  }

  // ---- all zones open, without honey. The zones as they were come back when the box is cleared.
  let was = null; try { was = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { }
  function allZones(on) {
    if (on) { if (!was) { was = { zones: { ...G.zones }, orchard: !!G.orchard }; try { localStorage.setItem(KEY, JSON.stringify(was)); } catch (e) { } }
      for (const id of Object.keys(ZONES)) G.zones[id] = true; G.orchard = true; }
    else if (was) { G.zones = { ...was.zones }; G.orchard = !!was.orchard; was = null; try { localStorage.removeItem(KEY); } catch (e) { }
      for (const [id, Z] of Object.entries(ZONES)) if (!G.zones[id]) { Z.fadeT = 0; Z.label.visible = true; Z.glow.visible = true; Z.draw(Z.name, `${Z.cost} honey`); } }
    g.save(); return !!was;
  }
  if (was) allZones(true); // still ticked from the last visit

  // ---- the box
  const box = document.createElement('div'); box.id = 'stagemenu';
  box.style.cssText = 'position:fixed;right:12px;top:10px;z-index:30;display:flex;gap:10px;align-items:center;padding:5px 9px;border:1px solid rgba(255,235,190,.35);border-radius:8px;background:rgba(30,16,4,.6);font:13px Georgia,serif;color:#fff3d6;opacity:.55;transition:opacity .3s;user-select:none';
  const sel = document.createElement('select'); sel.id = 'stagepick'; sel.style.cssText = 'font:inherit;color:#fff3d6;background:#2a1706;border:1px solid rgba(255,235,190,.45);border-radius:5px;padding:2px 4px;max-width:46vw';
  sel.add(new Option('Jump to a stage…', ''));
  for (const [id, label] of STAGES) sel.add(new Option(label, id));
  const dlab = document.createElement('label'); dlab.style.cssText = 'display:flex;gap:5px;align-items:center;white-space:nowrap';
  const num = document.createElement('input'); num.type = 'number'; num.id = 'daypick'; num.min = 1; num.max = 999; num.value = DAY.n; num.style.cssText = 'width:3.4em;font:inherit;color:#fff3d6;background:#2a1706;border:1px solid rgba(255,235,190,.45);border-radius:5px;padding:2px 4px';
  dlab.append('day', num);
  function show() { if (document.activeElement !== num) num.value = DAY.n; }
  setInterval(show, 1000); // the day also changes by itself each morning
  num.addEventListener('change', () => { const n = parseInt(num.value, 10); num.blur(); if (n >= 1) day(n); show(); });
  const lab = document.createElement('label'); lab.style.cssText = 'display:flex;gap:5px;align-items:center;cursor:pointer;white-space:nowrap';
  const chk = document.createElement('input'); chk.type = 'checkbox'; chk.id = 'allzones'; chk.checked = !!was; chk.style.margin = '0';
  lab.append(chk, 'all zones open'); box.append(dlab, sel, lab); document.body.appendChild(box);
  box.addEventListener('mouseenter', () => box.style.opacity = 1); box.addEventListener('mouseleave', () => box.style.opacity = .55);
  for (const ev of ['keydown', 'keyup']) box.addEventListener(ev, e => e.stopPropagation()); // keys typed in the menu do not fly the bee
  sel.addEventListener('change', () => { const id = sel.value; sel.value = ''; sel.blur(); if (id) go(id); });
  chk.addEventListener('change', () => { allZones(chk.checked); chk.blur(); g.toast(chk.checked ? '<b>All zones are open</b><br><span>for testing: no honey was spent</span>' : '<b>The zones are as they were</b>', 3); });

  window.STAGES = { list: STAGES, go, day, allZones, get zonesOpen() { return !!was; } };
}
