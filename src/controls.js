// Honeylight: keys, mouse and touch, the hint line, the field notes card and first-time tips.
import { $ } from './core.js';
import { canvas } from './engine.js';
import { P, look, action } from './player.js';
import { wasps } from './wasps.js';
import { G } from './progress.js';
import { A, initAudio } from './audio.js';
import { inHive, time } from './loop.js';

export const keys = new Set(); export let touchFwd = false, locked = false, dragging = false;

export let hintEl;
export function setupInput() {
  hintEl = $('hint');
}

let hintTimer = 0;
export function hint(html, secs = 6) { hintEl.innerHTML = html; hintEl.style.opacity = 1; clearTimeout(hintTimer); hintTimer = setTimeout(() => hintEl.style.opacity = 0, secs * 1000); }

export function setupListeners() {
  $('title').addEventListener('click', () => {
    initAudio(); if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
    $('title').style.opacity = 0; setTimeout(() => $('title').style.display = 'none', 1700);
    P.mode = 'cell'; P.t = 0; lockPointer();
  });
  document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; });
  canvas.addEventListener('mousedown', e => { if (!locked) { lockPointer(); dragging = true; if (resting) { resting = false; showKeys(); return; } } action(); });
  addEventListener('mouseup', () => dragging = false);
  addEventListener('mousemove', e => { if (locked || dragging) look(e.movementX || 0, e.movementY || 0); });
  addEventListener('keydown', e => { if (e.repeat) return; keys.add(e.code); if (e.code === 'Space') { e.preventDefault(); action(); } });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  { let lx = 0, ly = 0, t0 = 0, moved = 0; canvas.addEventListener('touchstart', e => { const t = e.touches[0]; lx = t.clientX; ly = t.clientY; t0 = performance.now(); moved = 0; touchFwd = true; e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchmove', e => { const t = e.touches[0]; look((t.clientX - lx) * 1.6, (t.clientY - ly) * 1.6); moved += Math.abs(t.clientX - lx) + Math.abs(t.clientY - ly); lx = t.clientX; ly = t.clientY; e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchend', e => { if (!e.touches.length) touchFwd = false; if (performance.now() - t0 < 300 && moved < 12) action(); }); }
}

function lockPointer() { try { const r = canvas.requestPointerLock && canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (e) { } }

// ---------- field notes: the controls card (hold Tab / tap H, and the rest screen when the mouse is freed) ----------
export let TIPS;
let keysEl, keytipEl;
export function setupFieldNotes() {
  keysEl = $('keys'), keytipEl = $('keytip');
  TIPS = (() => { try { return JSON.parse(localStorage.getItem('honeylight.tips') || '{}'); } catch (e) { return {}; } })();
  addEventListener('keydown', e => { if (e.code === 'Tab') { e.preventDefault(); if (!e.repeat) { keysHeld = true; showKeys(); } } else if (e.code === 'KeyH' && !e.repeat) { keysToggled = !keysToggled; showKeys(); } });
  addEventListener('keyup', e => { if (e.code === 'Tab') { keysHeld = false; showKeys(); } });
  addEventListener('blur', () => { keysHeld = false; showKeys(); });
  document.addEventListener('pointerlockchange', () => { const l = document.pointerLockElement === canvas; if (wasLocked && !l && P.mode !== 'title') resting = true; if (l) resting = false; wasLocked = l; keysToggled = false; showKeys(); });
}

let keysHeld = false, keysToggled = false, resting = false, wasLocked = false;
export function tipOnce(id, html, secs = 5) { if (TIPS[id]) return false; TIPS[id] = 1; try { localStorage.setItem('honeylight.tips', JSON.stringify(TIPS)); } catch (e) { } hint(html, secs); return true; }
export function keysHTML() {
  const K = (k) => k.split(' ').map(x => `<kbd>${x}</kbd>`).join(''), row = (k, t, dim) => `<div class="kk${dim ? ' dim' : ''}">${K(k)}</div><div class="${dim ? 'dim' : ''}">${t}</div>`;
  let h = `<h2>${resting ? 'Resting' : 'Field notes'}</h2><div class="k">`;
  if (P.mode === 'crawl' || P.mode === 'cell' || P.mode === 'emerge') h += row('W A S D', 'walk the comb') + row('Space', P.wingsReady ? 'take off' : 'take off, once your wings are dry');
  h += row('Mouse', 'look and steer') + row('W', 'fly forward') + row('S', 'slow down, back up') + row('A D', 'drift sideways') + row('Space', 'rise') + row('Shift', 'sink')
    + row('V', G.third ? 'back to bee\'s-eye view' : 'see yourself from behind')
    + row(G.dart ? 'Q' : 'Q', G.dart ? 'dart: a burst of wing strength' : 'dart, when you grow (30 honey)', !G.dart)
    + row('E', G.leap ? 'leap: spring straight up' : 'leap, when you grow (65 honey)', !G.leap)
    + row('F', G.heat > 0 ? 'heat buzz: knock wasps out of the air' : 'heat buzz, after a sip of red clover', !(G.heat > 0))
    + row('R', G.workers >= 3 ? 'call your sisters to ball a wasp' : `call your sisters (needs 3, you have ${G.workers})`, G.workers < 3)
    + row('Space', 'wriggle free of a web') + row('Tab', 'hold for these notes') + row('Esc', 'rest and free the mouse');
  return h + `</div>${resting ? '<div class="foot">click to fly on</div>' : ''}`;
}
export function showKeys() { const on = keysHeld || keysToggled || resting; if (on) keysEl.innerHTML = keysHTML(); keysEl.classList.toggle('on', on); if (on) TIPS.card = 1; }

// gentle first-time nudges, each shown once
export function tipsTick() {
  if (P.mode === 'title') { keytipEl.style.opacity = 0; return; }
  keytipEl.style.opacity = keysEl.classList.contains('on') ? 0 : 0.5;
  if (P.mode !== 'fly') return;
  if (P.flownAt && time - P.flownAt > 10 && !G.third) tipOnce('v', '<kbd>V</kbd> see yourself from behind', 5);
  if (P.pollen > 0 && !G.third && TIPS.v && P.flownAt && time - P.flownAt > 20) tipOnce('v2', '<kbd>V</kbd> look back at the pollen on your legs', 5);
  if (G.workers >= 3 && !inHive && wasps.some(w => w.state === 'chase')) tipOnce('r', '<kbd>R</kbd> call your sisters to help', 5);
  if (G.heat > 0 && wasps.some(w => w.state !== 'idle' && w.p.distanceTo(P.pos) < 14)) tipOnce('f', '<kbd>F</kbd> blast the wasp with heat', 4);
  if (P.flownAt && time - P.flownAt > 45) tipOnce('tab', 'hold <kbd>Tab</kbd> any time to see your keys', 5);
}
