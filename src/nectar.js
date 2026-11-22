// Honeylight: rich blooms, the great sunflower, and staying on a flower to drink.
import * as THREE from '../three.module.min.js';
import { rnd, clamp, smooth } from './core.js';
import { scene, parts, pNext, puff } from './engine.js';
import { flowersClosed } from './day.js';
import { _v } from './bees.js';
import { flowers } from './plants.js';
import { WIND } from './air.js';
import { P } from './player.js';
import { hint } from './controls.js';
import { summonRaid } from './wasps.js';
import { G, toast, addPollen } from './progress.js';
import { zoneLocked } from './zones.js';
import { tone, SCALE, sweep } from './audio.js';
import { inHive, time } from './loop.js';

// golden glow columns over flowers that are overflowing with nectar
export const richGlows = [];

export function setupRichGlows() {
  {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d');
    let g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, 'rgba(255,200,90,0)'); g.addColorStop(0.5, 'rgba(255,215,120,1)'); g.addColorStop(1, 'rgba(255,200,90,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 256);
    x.globalCompositeOperation = 'destination-in'; g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.75, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,1)'); x.fillStyle = g; x.fillRect(0, 0, 64, 256);
    const tex = new THREE.CanvasTexture(c);
    for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(2.2, 1.6, 0.7), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); s.scale.set(5, 46, 1); s.center.set(0.5, 0); s.visible = false; scene.add(s); richGlows.push({ s, f: null }); }
  }
}

// --- choices: nectar-rich blooms that appear, glow, and wilt
export function updateRich(dt) {
  G.richT -= dt;
  for (const g of richGlows) {
    if (g.f && !(g.f.rich > 0)) { g.f.raid = false; g.f.cool = 20; g.f = null; }
    if (!g.f) { g.s.material.opacity = Math.max(0, g.s.material.opacity - dt); if (g.s.material.opacity <= 0) g.s.visible = false; continue; }
    const f = g.f; f.rich -= dt; const fr = clamp(f.rich / (f.rich0 || 30), 0, 1);
    const flick = fr < 0.3 ? (Math.random() < 0.3 + (0.3 - fr) ? 0.25 : 1) : 1;
    g.s.visible = true; g.s.material.opacity = (0.6 + 0.2 * Math.sin(time * 3)) * flick * (0.35 + 0.65 * fr); g.s.scale.set(5 * (0.45 + 0.55 * fr), 46 * (0.3 + 0.7 * fr), 1); g.s.position.set(f.sx, f.y - 0.5, f.sz);
    // golden pollen streams off downwind, faster as it runs out
    if (Math.random() < dt * (5 + 30 * (1 - fr))) { const q = parts[pNext]; _v.set(f.sx + rnd(-1.5, 1.5), f.y + rnd(0.3, 1.2), f.sz + rnd(-1.5, 1.5)); puff(_v, 1, [1.0, 0.85, 0.3], 0, 0.012, 2.2); q.g = -0.4; q.v.set(WIND.dx * (4 + 8 * WIND.s) + rnd(-1, 1), rnd(0.5, 2), WIND.dz * (4 + 8 * WIND.s) + rnd(-1, 1)); }
    if (f.rich <= 0) { _v.set(f.sx, f.y + 1, f.sz); puff(_v, 40, [1.0, 0.85, 0.3], 4, 0.014, 1.8, -0.5, 0.5); if (P.pos.distanceTo(_v) < 60) toast('<b>The golden pollen blew away</b>', 2.5); }
  }
  if (G.richT <= 0) {
    G.richT = rnd(18, 30); const slot = richGlows.find(g => !g.f);
    if (slot) { for (let k = 0; k < 30; k++) { const f = flowers[(Math.random() * flowers.length) | 0]; if (f.val > 1 || f.rich > 0 || f.cool > 0 || f.inLog) continue; if (zoneLocked(f) || f.zone || flowersClosed()) continue; const d = Math.hypot(f.x - P.pos.x, f.z - P.pos.z); if (d < 50 || d > 280) continue;
      f.rich = f.rich0 = rnd(26, 34); slot.f = f; if (!G.seenRich && P.mode === 'fly' && !inHive) { G.seenRich = true; toast('<b>A flower is overflowing with nectar</b><br><span>look for the golden glow, but it won\'t last</span>', 6); } break; } }
  }
}
export function richSip(f, dt) {
  if (!f.raid) { f.raid = true; f.sip = 0.5; summonRaid(f); toast('<b>The golden nectar is flowing</b><br><span>stay to fill your baskets, but wasps can smell it</span>', 4); sweep(200, 240, 1.2, 0.02, 'sawtooth'); }
  f.sip -= dt;
  if (f.sip <= 0 && P.pollen < G.cap) { f.sip = 1.05; f.rich -= 2.2; P.load.push(f.val * 2); P.pollen = P.load.length; tone(SCALE[Math.min(7, P.pollen)], 0.12, 1.8); _v.set(f.sx, f.y + 0.6, f.sz); puff(_v, 14, [1.0, 0.9, 0.4], 1.6, 0.012, 1.4, 0.6, 0.8); if (P.pollen >= G.cap) hint('baskets full: get out of there!', 3); }
}

// ---------- round 4: the sunflower must be earned ----------
export let GIANT;
export function setupSunflower() {
  GIANT = flowers.find(f => f.giant);
  G.holdT = 0;
}

export function summitForces(acc, dt) {
  if (!GIANT) return; const d = Math.hypot(P.pos.x - GIANT.x, P.pos.z - GIANT.z), h = P.pos.y - (GIANT.y - 22);
  if (d > 50 || h < 0) return;
  const k = smooth(50, 15, d) * smooth(0, 14, h), gust = Math.max(0, Math.sin(time * 1.15) + 0.6 * Math.sin(time * 2.9 + 1.3) + 0.2);
  const a = time * 0.55 + Math.sin(time * 0.31) * 2.0;
  acc.x += Math.cos(a) * 26 * gust * k * (P.landed ? 0.7 : 1); acc.z += Math.sin(a) * 26 * gust * k * (P.landed ? 0.7 : 1); acc.y += Math.sin(time * 3.7) * 7 * gust * k;
  if (gust * k > 0.6 && Math.random() < dt * 30) { const q = parts[pNext]; _v.set(P.pos.x + rnd(-10, 10), P.pos.y + rnd(-4, 5), P.pos.z + rnd(-10, 10)); puff(_v, 1, [0.95, 0.9, 0.75], 0, 0.006, 1.0); q.v.set(Math.cos(a) * 30, rnd(-3, 3), Math.sin(a) * 30); }
}
export function giantSip(f, dt) {
  // the great sunflower makes you hold on for a few seconds while the summit winds try to blow you off
  if (time - (f.lastLand || -9) > 0.5) G.holdT = 0; f.lastLand = time; G.holdT += dt; G.holdF = f;
  if (Math.random() < dt * 6) { _v.set(f.sx + rnd(-1, 1), f.y + 1.2, f.sz + rnd(-1, 1)); puff(_v, 2, [1.0, 0.85, 0.3], 0.8, 0.01, 0.8, 0.3, 0.6); }
  G.holdNeed = 2.8; if (G.holdT >= 2.8) { G.holdT = 0; f.cool = 150; addPollen(f); }
}

// --- valuable flowers make you stay: dwell time grows with value, and the wasps notice
export function dwellSip(f, dt) {
  const need = f.val >= 3 ? 2.0 : 1.0;
  if (time - (f.lastLand || -9) > 0.5) { G.holdT = 0; if (f.val >= 3) summonRaid(f, 1); } f.lastLand = time; G.holdT += dt; G.holdF = f; G.holdNeed = need;
  if (Math.random() < dt * 6) { _v.set(f.sx + rnd(-0.6, 0.6), f.y + 1, f.sz + rnd(-0.6, 0.6)); puff(_v, 1, [1.0, 0.85, 0.3], 0.6, 0.009, 0.7, 0.3, 0.6); }
  if (G.holdT >= need) { G.holdT = 0; f.cool = f.val >= 3 ? 70 : 30; addPollen(f); }
}
