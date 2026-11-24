// Honeylight: honey, unlocks, saving, the HUD and messages.
import { $ } from './core.js';
import { DAY, timeOfDay } from './day.js';
import { makeForager } from './bees.js';
import { P } from './player.js';
import { hint } from './controls.js';
import { wasps, MOB } from './wasps.js';
import { GIANT } from './nectar.js';
import { stores } from './zones.js';
import { tone, SCALE } from './audio.js';
import { time } from './loop.js';

// ================= GAME: progression, threats, choices =================
export const G = { spent: 0, zones: {}, honey: 0, workers: 0, cap: 4, speed: 1, weight: 1, orchard: false, passive: 0, toastT: 0, richT: 12, seenRich: false, seenWasp: false, seenWeb: false, windHintT: 0 };
export const UNLOCKS = [
  { at: 8, name: 'Bigger pollen baskets', desc: 'carry 6 pollen', apply: () => G.cap = 6 },
  { at: 20, name: 'The scent stones wake', desc: 'leave honey at a glowing stone and your sisters scout a new place', apply: () => { } },
  { at: 35, name: 'Strong wings', desc: 'faster flight, pollen feels lighter', apply: () => { G.speed = 1.15; G.weight = 0.55; } },
  { at: 55, name: 'Great pollen baskets', desc: 'carry 8 pollen', apply: () => G.cap = 8 },
  { at: 80, name: 'A sister flies with you', desc: 'when a wasp comes for you, she draws it away', apply: () => G.escorts = Math.max(G.escorts, 1) },
  { at: 120, name: 'Swift wings', desc: 'faster still', apply: () => G.speed = 1.27 },
  { at: 160, name: 'A second sister joins you', desc: 'two decoys against the wasps', apply: () => G.escorts = 2 },
  { at: 210, name: 'Bountiful baskets', desc: 'carry 10 pollen', apply: () => G.cap = 10 },
  { at: 250, name: 'The hive glows gold', desc: 'every comb brimming with honey', apply: () => { } },
];

let hud, toastEl;
export function setupProgress() {
  P.load = [];
  try { const s = JSON.parse(localStorage.getItem('honeylight.save2') || 'null'); if (s) { G.honey = s.honey | 0; G.workers = s.workers | 0; G.escapes = s.escapes | 0; G.spent = s.spent | 0; G.zones = s.zones || (G.honey >= 20 ? { garden: true } : {}); G.daySave = s.day || null; } else { G.honey = Math.round((P.honey || 0) * 20); G.zones = G.honey >= 20 ? { garden: true } : {}; } } catch (e) { }
  addEventListener('pagehide', save); setInterval(() => { if (P.mode === 'fly' || P.mode === 'crawl') save(); }, 15000);
  for (let i = 0; i < G.workers; i++) makeForager();
  applyUnlocks(false);
  P.honey = Math.min(1, G.honey / 250);
  hud = $('hud'), toastEl = $('toast');
}

export function save() { try { localStorage.setItem('honeylight.save2', JSON.stringify({ honey: G.honey, workers: G.workers, spent: G.spent, escapes: G.escapes | 0, zones: G.zones, day: typeof DAY === 'object' && DAY ? DAY.save() : undefined })); } catch (e) { } }
export function applyUnlocks(announce) { for (const u of UNLOCKS) if (G.honey >= u.at && !u.done) { u.done = true; u.apply(); if (announce) { toast(`<b>${u.name}</b><br><span>${u.desc}</span>`, 6); [0, 2, 4, 7].forEach((n, i) => tone(SCALE[n], 0.1, 2.6, 'sine', i * 0.12)); } } }
export function toast(html, secs = 5) { toastEl.innerHTML = html; toastEl.style.opacity = 1; G.toastT = secs; }
export function gainHoney(v) {
  G.honey += v; P.honey = Math.min(1, G.honey / 250);
  const want = Math.min(30, Math.floor(G.honey / 10));
  while (G.workers < want) { G.workers++; makeForager(); toast(`<b>A new sister hatched</b><br><span>${G.workers} worker${G.workers > 1 ? 's' : ''} now gather for the hive</span>`, 5); }
  applyUnlocks(true); save();
}
export function addPollen(f) {
  const v = f.rich > 0 ? f.val * 2 : f.val; P.load.push(v); P.pollen = P.load.length;
  if (f.rich > 0) { f.rich = 0; toast('<b>Overflowing nectar!</b> worth double', 3); }
  else if (f.val >= 3) toast(`<b>${f.giant ? 'The great sunflower' : 'A sunbloom'}</b> worth ${v} honey`, 3);
  if (P.pollen >= G.cap) hint('baskets full: take it home to the hive', 4);
}
export function losePollen(n) { let lost = 0; while (n-- > 0 && P.load.length) { P.load.splice((Math.random() * P.load.length) | 0, 1); lost++; } P.pollen = P.load.length; return lost; }
function nextUnlock() { return UNLOCKS.find(u => G.honey < u.at); }
let hudCache = '';
export function updateHud(dt) {
  const show = P.mode !== 'title' && P.mode !== 'cell' && P.mode !== 'emerge';
  hud.style.opacity = show ? 1 : 0;
  let pips = ''; for (let i = 0; i < G.cap; i++) pips += i < P.load.length ? `<i class="on${P.load[i] > 1 ? ' gold' : ''}"></i>` : '<i></i>';
  const nu = nextUnlock(), chasing = wasps.some(w => w.state === 'chase'), coming = !chasing && wasps.some(w => w.state === 'approach' && w.t > 0 && w.p.distanceTo(P.pos) < 70);
  const html = `<div class="row"><span class="jar"></span><b>${G.honey}</b> honey <span class="dim">(${stores()} stored) · ${G.workers} sister${G.workers === 1 ? '' : 's'} foraging${G.escorts ? ` · ${G.escorts} flying with you` : ''}</span></div><div class="row pips">${pips}</div>` +
    (nu ? `<div class="row dim">next at ${nu.at}: ${nu.name.toLowerCase()}</div>` : '') + (chasing ? '<div class="row warn">a wasp is after your pollen!</div>' : coming ? '<div class="row warn">wasps are coming...</div>' : '') + (P.stuck > 0 ? '<div class="row warn">stuck in a web: tap space!</div>' : '') + (G.holdT > 0.2 && time - (G.holdF ? G.holdF.lastLand : 0) < 0.3 ? `<div class="row warn">hold on... ${'●'.repeat(Math.ceil(G.holdT / (G.holdNeed || 2.8) * 4))}${'○'.repeat(Math.max(0, 4 - Math.ceil(G.holdT / (G.holdNeed || 2.8) * 4)))}</div>` : '') + (G.dart || G.leap ? `<div class="row dim">${G.dart ? `<kbd>Q</kbd> dart ${G.dartCD <= 0 ? '●' : '○'}` : ''}${G.leap ? ` &nbsp; <kbd>E</kbd> leap ${G.leapCD <= 0 ? '●' : '○'}` : ''}</div>` : '') + (MOB.active && P.pos.distanceTo(MOB.anchor) > 12 ? '<div class="row warn">a sister needs help: follow the red glow</div>' : '') + (GIANT && GIANT.cool > 0 && Math.hypot(P.pos.x - GIANT.x, P.pos.z - GIANT.z) < 30 ? '<div class="row dim">the great sunflower is refilling</div>' : '') + (P.mode !== 'rest' ? `<div class="row ${DAY.t > 0.78 && !(window.NIGHT && NIGHT.active && NIGHT.t < 0.85) ? 'warn' : 'dim'}">day ${DAY.n} · ${timeOfDay()}</div>` : '') + (G.payZ && time - G.payLast < 0.3 ? `<div class="row warn">leaving honey for the scouts... ${'●'.repeat(Math.ceil(G.payZ.pay / 1.6 * 4))}${'○'.repeat(Math.max(0, 4 - Math.ceil(G.payZ.pay / 1.6 * 4)))}</div>` : '');
  if (html !== hudCache) { hud.innerHTML = html; hudCache = html; }
  if (G.toastT > 0) { G.toastT -= dt; if (G.toastT <= 0) toastEl.style.opacity = 0; }
}
