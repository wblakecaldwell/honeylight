// Honeylight: the map: world sizes, where every landmark stands, and the shape of the ground.
import { V3, clamp, smooth, TAU } from './core.js';

// ---------- world constants ----------
export const RIN = 10, ROUT = 12.5, HTOP = 22, TY = 3, TR = 1.7, CELL = 0.9, CT = 1.2; // comb thickness
export const GY = -14, WY = GY - 3.2, POND = { x: -125, z: 70, r: 58 };
export const SUN_AZ = -40 * Math.PI / 180, SUN_EL = 17 * Math.PI / 180, FLOWER_AZ = 35 * Math.PI / 180;
export const SUN = new V3(Math.cos(SUN_AZ) * Math.cos(SUN_EL), Math.sin(SUN_EL), Math.sin(SUN_AZ) * Math.cos(SUN_EL));
export const FDIR = { x: Math.cos(FLOWER_AZ), z: Math.sin(FLOWER_AZ) }, FIELD_D = 165;
export const DANCE_A = FLOWER_AZ - SUN_AZ; // angle from "up" on the comb

// ---------- zones & landmarks (round 2) ----------
let _seed = 90210; export const srnd = (a = 1, b) => { _seed = (_seed * 16807) % 2147483647; const r = (_seed - 1) / 2147483646; return b === undefined ? r * a : a + r * (b - a); };
export const ORCH = { x: 40, z: -215, r: 80 }, HEDGE_R = 96, HEDGE_GAP_W = 0.095;

export let HEDGE_GAPS, HEDGE_TUN, LOG;
export function setupLandmarks() {
  HEDGE_GAPS = [Math.atan2(-ORCH.z, -ORCH.x), Math.atan2(-ORCH.z, -ORCH.x) + 2.25];
  HEDGE_TUN = Math.atan2(-ORCH.z, -ORCH.x) - 1.5;
  HOLLOW.a0 = Math.atan2(-HOLLOW.z, -HOLLOW.x) + 0.6;
  LOG = (() => { const axis = new V3(ORCH.x, 0, ORCH.z).normalize(), mid = new V3(22, 0, -88), len = 46, ro = 5.6, ri = 4.5; let mg = -1e9;
    for (let u = -len / 2; u <= len / 2; u += 2) mg = Math.max(mg, terrainH(mid.x + axis.x * u, mid.z + axis.z * u));
    return { c: new V3(mid.x, mg + ri + 0.4, mid.z), axis, len, ro, ri }; })();
  {
    orchTrees.push({ x: ORCH.x, z: ORCH.z, R: 4.2, top: 0, cr: 16, nest: true });
    let guard = 0;
    while (orchTrees.length < 14 && guard++ < 2000) {
      const a = srnd(TAU), d = Math.sqrt(srnd()) * (ORCH.r - 8), x = ORCH.x + Math.cos(a) * d, z = ORCH.z + Math.sin(a) * d;
      if (orchTrees.some(t => Math.hypot(t.x - x, t.z - z) < 26)) continue;
      orchTrees.push({ x, z, R: srnd(2.2, 3.2), top: 0, cr: srnd(10.5, 13.5) });
    }
    for (const t of orchTrees) { t.gy = terrainH(t.x, t.z); t.top = t.gy + (t.nest ? 40 : srnd(24, 32)); }
  }
}

export const inHedgeGap = a => HEDGE_GAPS.some(g => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < HEDGE_GAP_W);
export const HILLS = [{ x: 205, z: -55, r: 75, h: 46 }, { x: -110, z: -175, r: 60, h: 28 }, { x: -235, z: -45, r: 65, h: 34 }, { x: 250, z: 150, r: 70, h: 24 }];

// ---------- batch 2: a misty brook, and a bramble hollow reached through a root ----------
export const BROOK = { pts: [[-200, 112], [-222, 128], [-245, 132], [-262, 152], [-275, 178]], hw: 4.2, depth: 4.0, box: [-290, -185, 95, 195] };
export const HOLLOW = { x: 120, z: 230, r: 16, wallH: 9 };
export function brookSeg(x, z) { const b = BROOK.box; if (x < b[0] - 8 || x > b[1] + 8 || z < b[2] - 8 || z > b[3] + 8) return null; let best = 1e9, bs = 0;
  const P2 = BROOK.pts; for (let i = 0; i < P2.length - 1; i++) { const ax = P2[i][0], az = P2[i][1], dx = P2[i + 1][0] - ax, dz = P2[i + 1][1] - az, L2 = dx * dx + dz * dz; let t = ((x - ax) * dx + (z - az) * dz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = ax + dx * t - x, ez = az + dz * t - z, d = ex * ex + ez * ez; if (d < best) { best = d; bs = i + t; } } return { d: Math.sqrt(best), s: bs }; }
export const brookD = (x, z) => { const r = brookSeg(x, z); return r ? r.d : 1e9; };
export function hollowRootD(x, z) { const ux = Math.cos(HOLLOW.a0), uz = Math.sin(HOLLOW.a0), px = x - HOLLOW.x, pz = z - HOLLOW.z, t = clamp(px * ux + pz * uz, 9, 28); return Math.hypot(px - ux * t, pz - uz * t); }
export function terrainH(x, z) { const h0 = terrainBase(x, z); const bs = brookSeg(x, z); return bs ? h0 - BROOK.depth * smooth(BROOK.hw + 3.5, BROOK.hw - 1.0, bs.d) : h0; }
export function terrainBase(x, z) {
  let h = GY + 2.2 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017) + 1.2 * Math.sin(x * 0.05 + z * 0.043);
  h -= 7.5 * smooth(POND.r + 18, POND.r - 22, Math.hypot(x - POND.x, z - POND.z));
  h += 2.5 * smooth(40, 12, Math.hypot(x, z));
  for (const H of HILLS) h += H.h * smooth(H.r, 0, Math.hypot(x - H.x, z - H.z));
  h += (5 + 3 * Math.sin(x * 0.05) * Math.cos(z * 0.04)) * smooth(ORCH.r + 40, ORCH.r, Math.hypot(x - ORCH.x, z - ORCH.z));
  return h;
}
export const orchTrees = [];

// ---------- round 6: the forest edge (its own seed, so older landmarks stay put) ----------
export const FOREST = { x: -95, z: 262, r: 58 };
export const forestTrees = [], PADS0 = [];

export function setupForestLayout() {
  { let s = 4242; const fr = (a, b) => { s = (s * 16807) % 2147483647; const r = (s - 1) / 2147483646; return a + r * (b - a); };
    let guard = 0;
    while (forestTrees.length < 17 && guard++ < 3000) { const a = fr(0, TAU), d = Math.sqrt(fr(0, 1)) * (FOREST.r + 14), x = FOREST.x + Math.cos(a) * d, z = FOREST.z + Math.sin(a) * d;
      if (forestTrees.some(t => Math.hypot(t.x - x, t.z - z) < 18)) continue;
      forestTrees.push({ x, z, R: fr(1.8, 3.0), cr: fr(9, 12.5), h: fr(34, 48) }); }
    for (const t of forestTrees) { t.gy = terrainH(t.x, t.z); t.top = t.gy + t.h; t.blobs = [];
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + fr(0, 0.6), d = fr(0.2, 0.75) * t.cr; t.blobs.push([t.x + Math.cos(a) * d, t.top + fr(-0.35, 0.2) * t.cr, t.z + Math.sin(a) * d, t.cr * fr(0.5, 0.7), t.cr * fr(0.35, 0.5)]); }
      t.blobs.push([t.x, t.top + t.cr * 0.15, t.z, t.cr * 0.7, t.cr * 0.45]); }
    FOREST.rnd = fr;
  }
}

export const overWater = (x, z) => Math.hypot(x - POND.x, z - POND.z) < POND.r + 25 && terrainH(x, z) < WY - 0.05;
