// Honeylight: the long run. The worn dew track keeps going: one loop round the whole map, through every open zone and back to the meadow.
// Minigame mode: fly it low, fast and on the track and you get "in the zone". The zone builds in five steps (tiers), each with its own colour.
// A bail (off the track, too high, too slow, or a bump) drops one tier and the run goes on. Off the track, low in the grass, the grass slows the bee: a slip costs time. The run ends when the bee flies away from the track, or stops on it.
// Five honeycomb cells at the bottom of the screen show the tiers. A coloured light round the bee (uAura) and a chord grow with them.
// When the whole loop is open, a challenge line shows after 3 s on the track. Challenges come one at a time, in order (saved in honeylight.run).
// Each challenge won earns one piece of the wardrobe, in the order of wear.js. What the bee has on is saved with the run (wardrobe.js).
// Self-contained: it draws no numbers from the game's random stream (three.js ids use its own stream while it builds).
import * as THREE from '../three.module.min.js';
import { V3, lerp, clamp } from './core.js';
import { terrainH, terrainBase, WY, POND, ORCH, HEDGE_R, HEDGE_GAPS, HEDGE_TUN, BROOK, brookSeg, HOLLOW } from './world.js';
import { scene, mat, U } from './engine.js';
import { P } from './player.js';
import { G } from './progress.js';
import { DEWPATH, grassMesh, seeTwin } from './plants.js';
import { ZONES, zoneBlocked } from './zones.js';
import { A, tone, sweep, SCALE } from './audio.js';
import { clearAt } from './runkit.js';
import { BURROW, layBurrow, burrowFloor } from './burrow.js';
import { gardenWay } from './gardenway.js';
import { WATERWAY } from './waterway.js';
import { HIGH, HIGHK, layHigh, highNear } from './highbranch.js';
import { MARKS, layMarks, marksFrame } from './pathmarks.js';

// ---------- numbers to tune ----------
export const RUNK = { half: 3.6, ceil: 6.0, minSpd: 13, tierT: 8, leave: 14, stall: 2, drag: 1.5, grassTop: 8, showGoal: 3, race: 3, bump: 0.35 };
// leave: off the track by more than this, the bee has left it and the run ends. stall: on the track but too slow for this long, the run ends. drag: off the track, low in the grass, the grass takes this much of the speed each second
// race: seconds into a run when the race starts (racemap.js: the maps fade in, the start line is laid where the bee is, the clock starts)
const SPLIT = 10; // the best loop's time is kept every 10 samples, to tell ahead or behind from any start
const STEP = 1.2; // track samples are 1.2 apart, like the dew path
const TIER_COL = [[1.0, 0.76, 0.22], [1.0, 0.45, 0.68], [0.70, 0.52, 1.0], [0.45, 0.75, 1.0]];
const TIER_CSS = ['#ffc23a', '#ff73ad', '#b48cff', '#73bfff'];
const CHORD = [261.63, 329.63, 392.0, 493.88, 587.33]; // C E G B D, one note per tier
export const CHALLENGES = [
  { text: 'Finish the loop in bee’s-eye view', ok: r => !r.third },
  { text: 'Finish the loop while still glowing', ok: r => r.tierEnd >= 1 },
  { text: 'Finish the loop by the high branch', ok: r => !!r.high }, // the fallen trunk and the boughs in the forest (highbranch.js)
  { text: 'Finish the loop carrying full pollen', ok: r => r.fullPollen },
  { text: 'Finish the loop at night', ok: r => r.night },
  { text: 'Finish the loop without a single bail', ok: r => r.bails === 0 },
  { text: 'Finish the loop in follow view', ok: r => r.allThird },
];
const SAVE_KEY = 'honeylight.run';

export const RUN = { S: [], T: [], zone: [], K: [], own: [], first: { S: [], T: [], keep: [], N: 0 }, N: 0, dewN: 0, state: 'idle', tier: 0, prog: 0, s: 0, s0: 0, offT: 0, clean: false, bails: 0, t: 0, endT: 0, result: '', stopAt: 1e9, open: 0, mem: { ch: 0, best: 0, bestAt: null, worn: [], seen: 0 }, race: false, raceS: 0, raceT: 0, delta: null, newBest: false, auto: null, lastSpd: 0, goalShown: false, why: '' };

// ground under the track: the water top over the pond and the brook, else the ground
export function groundAt(x, z) {
  const bf = burrowFloor(x, z); if (bf !== null) return bf; // burrow.js: under the big hill the track's ground is the tunnel floor
  return openGround(x, z);
}
function openGround(x, z) {
  let h = terrainH(x, z);
  if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 25) h = Math.max(h, WY);
  const bs = brookSeg(x, z); if (bs && bs.d < BROOK.hw + 1.2) h = Math.max(h, terrainBase(x, z) - BROOK.depth + 1.4);
  return h;
}

// ---------- the loop: the dew path, then on round the map and back to its start ----------
// Two lists of points: the first loop as it was laid, and the loop as it is now, with the places on it.
// Where the line has not moved, the first loop's samples stay where they were, and so does the grass that was dealt along them (buildLooks):
// a place built on one stretch must not change the look of the other stretches. So: never edit `first`. Change `now`.
function lines() {
  const D = DEWPATH.S, pol = (a, r) => new V3(ORCH.x + Math.cos(a) * r, 0, ORCH.z + Math.sin(a) * r), xz = p => new V3(p[0], 0, p[1]);
  const t = HEDGE_TUN, g1 = HEDGE_GAPS[1];
  const head = [D[D.length - 2], D[D.length - 1]];
  const hedgeIn = [pol(t, HEDGE_R + 16), pol(t, HEDGE_R), pol(t, HEDGE_R - 14)];                  // into the walled garden through the hedge tunnel
  const hedgeOut = [pol(g1, HEDGE_R - 14), pol(g1, HEDGE_R), pol(g1, HEDGE_R + 16)];              // out by the far gap in the hedge
  const hills = [new V3(-80, 0, -262), new V3(-148, 0, -222), new V3(-178, 0, -150), new V3(-168, 0, -62)]; // round the hills to the pond
  const home = [new V3(-178, 0, 82),
    ...BROOK.pts.map(p => new V3(p[0], 0, p[1])),                                  // along the misty brook
    new V3(-258, 0, 212), new V3(-205, 0, 238), new V3(-151, 0, 238), new V3(-120, 0, 241), new V3(-98, 0, 244), new V3(-78, 0, 240), new V3(-56, 0, 230), new V3(-30, 0, 224), // through the forest edge
    new V3(2, 0, 202), new V3(40, 0, 172), new V3(78, 0, 136), new V3(100, 0, 104),  // home across the meadow
    D[0], D[1]];
  return { D,
    first: [...head, new V3(140, 0, -128), ...hedgeIn, new V3(92, 0, -224), new V3(81, 0, -258), new V3(50, 0, -261), new V3(26, 0, -252), new V3(2, 0, -264), ...hedgeOut,
      ...hills, new V3(-142, 0, -2), new V3(-150, 0, 38), ...home],
    now: [...head,
      ...BURROW.way.map(xz),                                                       // under the big hill by the mole tunnel (burrow.js)
      new V3(224, 0, -142), new V3(214, 0, -160), new V3(196, 0, -175), new V3(172, 0, -184), ...hedgeIn,
      ...gardenWay().map(xz),                                                      // the pot, the bean row and the seed trays (gardenway.js)
      ...hedgeOut, ...hills,
      ...WATERWAY.way.map(xz),                                                     // along the spring rock, behind its waterfall and low over the pond under the reeds (waterway.js)
      ...home] };
}
const curveOf = CP => { const c = new THREE.CatmullRomCurve3(CP, false, 'centripetal'); c.arcLengthDivisions = 20000; return c; };
const tangents = S => S.map((p, i) => { const N = S.length, a = S[(i - 1 + N) % N], b = S[(i + 1) % N]; const v = new V3(b.x - a.x, 0, b.z - a.z); return v.normalize(); });
function buildTrack() {
  const { D, first, now } = lines(), dN = D.length, F = RUN.first;
  // the first loop: samples one STEP apart. Keep those between the dew path's last point and its first: the two ends join the dew path
  const cF = curveOf(first), MF = Math.ceil(cF.getLength() / STEP), pts = cF.getSpacedPoints(MF);
  const near = (q, a, b) => { let bi = a, bd = 1e9; for (let i = a; i < b; i++) { const d = pts[i].distanceTo(q); if (d < bd) { bd = d; bi = i; } } return bi; };
  const iA = near(D[dN - 1], 0, pts.length >> 1), iB = near(D[0], pts.length >> 1, pts.length);
  F.S = D.map(p => p.clone()).concat(pts.slice(iA + 1, iB)); F.N = F.S.length; F.T = tangents(F.S); F.keep = F.S.map((p, j) => j < dN);
  // the loop now. A stretch of the first loop (from its point k to k + 1) is still there if the four points that shape it stand in the list now, in a row
  const cN = curveOf(now), LN = cN.getLength(), len = cN.getLengths(), nF = first.length - 1, nN = now.length - 1;
  const same = (a, b) => !!a && !!b && a.x === b.x && a.z === b.z;
  const inNow = first.map((p, k) => { for (let m = 1; m < nN - 1; m++) if ([-1, 0, 1, 2].every(o => same(first[k + o], now[m + o]))) return m; return -1; });
  const arc = u => { const f = u * (len.length - 1), i = Math.min(Math.floor(f), len.length - 2); return len[i] + (len[i + 1] - len[i]) * (f - i); }; // how far along the loop now its curve parameter u is
  // walk the first loop. A sample on a stretch that is still there stays. Where stretches are gone, lay new samples on the loop now, evenly, from the last sample that stayed to the next
  const S = D.map(p => p.clone()), K = D.map((p, j) => j), own = D.map(() => -1);
  let last = { s: arc(1 / nN), j: dN - 1 }, gone = false; // the last sample that stayed: how far along the loop now, and its number in the first loop
  const fill = to => { const n = Math.max(0, Math.round((to.s - last.s) / STEP) - 1); for (let q = 1; q <= n; q++) { const f = q / (n + 1); S.push(cN.getPointAt((last.s + (to.s - last.s) * f) / LN)); K.push(last.j + (to.j - last.j) * f); own.push(last.j); } };
  for (let i = iA + 1; i < iB; i++) { const j = dN + i - iA - 1, u = cF.getUtoTmapping(i / MF) * nF, k = Math.min(Math.floor(u), nF - 1), m = inNow[k];
    if (m < 0) { gone = true; continue; }
    const here = { s: arc((m + u - k) / nN), j }; if (gone) fill(here); S.push(pts[i].clone()); K.push(j); own.push(-1); F.keep[j] = true; last = here; gone = false; }
  if (gone) fill({ s: arc((nN - 1) / nN), j: F.N });
  // K: each sample's number in the first loop (in between for a new sample). own: -1 for a sample of the first loop, else the number of the first-loop sample its new stretch starts from
  RUN.S = S; RUN.K = K; RUN.own = own; RUN.N = S.length; RUN.dewN = dN; RUN.T = tangents(S);
  RUN.zone = RUN.S.map(p => { for (const [id, Z] of Object.entries(ZONES)) if (Math.hypot(p.x - Z.c.x, p.z - Z.c.z) < Z.ring + 10) return id; return ''; });
  RUN.len = RUN.N * STEP;
}

// a coarse grid over the samples for nearest-point lookups away from the run
const CELL = 10; let grid = new Map();
const gkey = (x, z) => (Math.floor(x / CELL) + 1000) * 4000 + Math.floor(z / CELL) + 1000;
const gridOf = S => { const g = new Map(); S.forEach((p, i) => { const k = gkey(p.x, p.z); if (!g.has(k)) g.set(k, []); g.get(k).push(i); }); return g; };
function buildGrid() { grid = gridOf(RUN.S); }
function nearIn(S, g, x, z) { let bi = -1, bd = 1e18; const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const l = g.get((cx + a + 1000) * 4000 + cz + b + 1000); if (l) for (const i of l) { const p = S[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; bi = i; } } }
  return { i: bi, d: Math.sqrt(bd) }; }
export function nearest(x, z, from = -1, win = 60) { // returns { i, d }
  if (from < 0) return nearIn(RUN.S, grid, x, z);
  let bi = -1, bd = 1e18; const S = RUN.S, N = RUN.N;
  for (let k = -win; k <= win; k++) { const i = ((from + k) % N + N) % N, p = S[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; bi = i; } }
  return { i: bi, d: Math.sqrt(bd) };
}
// lateral distance to the track line (between samples, not just to the nearest sample)
function lateral(x, z, i) { const S = RUN.S, N = RUN.N, p = S[i], q = S[(i + 1) % N], o = S[(i - 1 + N) % N];
  const seg = (a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1; const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / L2, 0, 1); return Math.hypot(a.x + dx * t - x, a.z + dz * t - z); };
  return Math.min(seg(o, p), seg(p, q)); }

// ---------- looks: the worn track past the dew path, thick grass walls along it, the HUD, the light ----------
let ribbon, walls, hud, cells = [], goalEl, edgeEl, haloMesh, pad = null;
function buildLooks() {
  const S = RUN.S, N = RUN.N, from = RUN.dewN - 1;
  { const pos = [], uv = [], idx = [], W = 2.6; let n = 0;
    for (let j = from; j <= N; j++) { const i = j % N, p = S[i], tg = RUN.T[i], q = j === N ? RUN.first.N : RUN.K[i]; /* q: the sample's number in the first loop, so that the width of a stretch does not change when another stretch does */ const w = burrowFloor(p.x, p.z) !== null ? 0 : W * (0.85 + 0.3 * Math.sin(q * 0.37) * Math.sin(q * 0.13)), wet = groundAt(p.x, p.z) > terrainH(p.x, p.z) + 0.05 ? 1 : 0;
      for (const s of [-1, 1]) { const x = p.x - tg.z * s * w, z = p.z + tg.x * s * w; pos.push(x, groundAt(x, z) + 0.06, z); uv.push(s < 0 ? 0 : 1, q * 0.4, wet); }
      if (n) { const k = n * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } n++; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(uv, 3)); g.setIndex(idx); g.computeVertexNormals();
    // same worn earth as the dew path; over water it is a thin drift of duckweed instead
    const m = mat(`varying vec3 vT; void main(){ vec3 n=vec3(0.0,1.0,0.0); float a=fbm(vW.xz*0.9), f=vnoise(vW.xz*6.0);
    vec3 alb=mix(vec3(0.16,0.11,0.06),vec3(0.36,0.27,0.16),a)*(0.8+0.35*f);
    float ed=min(vT.x,1.0-vT.x); float al=smoothstep(0.02,0.32+0.12*vnoise(vW.xz*0.7),ed);
    alb=mix(vec3(0.20,0.24,0.08),alb,smoothstep(0.1,0.4,ed));
    vec3 duck=mix(vec3(0.10,0.22,0.03),vec3(0.30,0.46,0.08),f)*(0.7+0.5*vnoise(vW.xz*14.0)); float dots=smoothstep(0.35,0.6,vnoise(vW.xz*9.0));
    alb=mix(alb,duck,vT.z); al*=mix(1.0,dots*0.85,vT.z);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.03+0.2*vT.z,0.0),vW),al); }`, { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      vert: `attribute vec3 aT; varying vec3 vT; varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv; varying vec3 vL; void main(){ vT=aT; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vN=vec3(0.0,1.0,0.0); vC=vec3(1.0); vUv=aT.xy; vL=position; gl_Position=projectionMatrix*viewMatrix*w; }` });
    ribbon = new THREE.Mesh(g, m); ribbon.renderOrder = 1; ribbon.frustumCulled = false; scene.add(ribbon); }
  // grass walls: tall tufts hugging the new legs (the dew path has its own), with the game's own grass look
  if (grassMesh) { const per = 26, off = [], par = [];
    const rand = seed => { let s = seed; return (a = 1, b) => { s = (s * 1664525 + 1013904223) >>> 0; const v = s / 4294967296; return b === undefined ? v * a : a + v * (b - a); }; };
    const hedge = p => Math.abs(Math.hypot(p.x - ORCH.x, p.z - ORCH.z) - HEDGE_R) < 10; // the hedge is the wall there
    // one sample deals its tufts. far(x, z): how far the spot is from the track. keep(x, z): may the tuft stand (asked after its numbers are drawn, so that a tuft that goes does not change the next ones)
    const deal = (p, tg, r, far, keep) => { for (let k = 0; k < per * STEP; k++) { const side = r() < 0.5 ? -1 : 1, lat = r(2.6, 7.5), along = r(-0.6, 0.6), x = p.x - tg.z * side * lat + tg.x * along, z = p.z + tg.x * side * lat + tg.z * along;
        if (Math.hypot(x - HOLLOW.x, z - HOLLOW.z) < HOLLOW.r + 3) continue; const h = terrainH(x, z); if (h < WY + 0.6) continue; if (far(x, z) < 2.5) continue;
        const q = [r(7, 12), r(Math.PI * 2), r(Math.PI * 2), r(0.7, 1.15)]; if (!keep(x, z)) continue; off.push(x, h - 0.2, z); par.push(...q); } };
    // the first loop deals first, just as it did when it was laid: the grass on a stretch that has not moved since stays the same, blade for blade.
    // A tuft stands only if its own sample stayed, and if it is off the track and off the places as they are now (runkit.js: the places keep their own ground clear)
    { const F = RUN.first, g0 = gridOf(F.S), r = rand(91731);
      for (let j = from + 2; j < F.N - 2; j++) { const p = F.S[j]; if (openGround(p.x, p.z) > terrainH(p.x, p.z) + 0.05) continue; /* no grass on water */ if (hedge(p)) continue;
        deal(p, F.T[j], r, (x, z) => nearIn(F.S, g0, x, z).d, (x, z) => F.keep[j] && nearest(x, z).d >= 2.5 && clearAt(x, z) >= 1); } }
    // then the stretches laid since, each from a seed of its own
    { let r = null, id = -1;
      for (let j = from + 2; j < N - 2; j++) { if (RUN.own[j] < 0) continue; if (RUN.own[j] !== id) { id = RUN.own[j]; r = rand(40503 + id * 7919); }
        const p = S[j]; if (Math.abs(groundAt(p.x, p.z) - terrainH(p.x, p.z)) > 0.05) continue; /* no grass on water, and none over the tunnel */ if (hedge(p)) continue;
        deal(p, RUN.T[j], r, (x, z) => nearest(x, z).d, (x, z) => clearAt(x, z) >= 1); } }
    const gg = new THREE.InstancedBufferGeometry(); const src = grassMesh.geometry; gg.setAttribute('position', src.attributes.position); gg.setIndex(src.index);
    gg.setAttribute('aOff', new THREE.InstancedBufferAttribute(new Float32Array(off), 3)); gg.setAttribute('aPar', new THREE.InstancedBufferAttribute(new Float32Array(par), 4)); gg.instanceCount = off.length / 3;
    walls = new THREE.Mesh(gg, grassMesh.material); walls.frustumCulled = false; scene.add(walls); seeTwin(walls); RUN.wallN = gg.instanceCount;
    // the world's own grass stands short on the track itself (only blade heights change, no random numbers)
    const a = src.attributes.aOff, pa = src.attributes.aPar, n = src.instanceCount;
    for (let i = 0; i < n; i++) { const x = a.getX(i), z = a.getZ(i), nb = nearest(x, z), ck = clearAt(x, z); if (ck < 1) pa.setX(i, pa.getX(i) * Math.max(0.02, ck)); if (nb.i < RUN.dewN || nb.d > 2.6) continue; pa.setX(i, pa.getX(i) * lerp(0.1, 1, clamp((nb.d - 1.4) / 1.2, 0, 1))); }
    pa.needsUpdate = true; }
  // a soft glow round the bee, seen in follow view (in the bee's eyes the light on the grass and the screen edges show it)
  haloMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.ShaderMaterial({ uniforms: { uC: { value: new V3() }, uA: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uC; uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float f=max(dot(normalize(vN),vV),0.0); gl_FragColor=vec4(uC*uA*pow(f,2.2)*0.9,1.0); }` }));
  haloMesh.visible = false; haloMesh.frustumCulled = false; haloMesh.renderOrder = 6; scene.add(haloMesh);
  buildHud();
}

// pathmarks.js: the grass stands short round the mice's fences and boards (only blade heights change, no random numbers)
function shortNear(pts) { if (!pts.length) return; const C = 4, g = new Map(), key = (x, z) => (Math.floor(x / C) + 1000) * 4000 + Math.floor(z / C) + 1000;
  pts.forEach(p => { const k = key(p.x, p.z); if (!g.has(k)) g.set(k, []); g.get(k).push(p); });
  for (const mesh of [grassMesh, walls]) { if (!mesh) continue; const a = mesh.geometry.attributes.aOff, pa = mesh.geometry.attributes.aPar, n = mesh.geometry.instanceCount;
    for (let i = 0; i < n; i++) { const x = a.getX(i), z = a.getZ(i), cx = Math.floor(x / C), cz = Math.floor(z / C); let hit = false;
      for (let u = -1; u <= 1 && !hit; u++) for (let v = -1; v <= 1 && !hit; v++) { const l = g.get((cx + u + 1000) * 4000 + cz + v + 1000); if (l) for (const p of l) if (Math.abs(p.x - x) < 1.8 && Math.abs(p.z - z) < 1.8) { hit = true; break; } }
      if (hit) pa.setX(i, pa.getX(i) * 0.12); }
    pa.needsUpdate = true; } }

function buildHud() {
  const el = (tag, css, parent = document.body) => { const e = document.createElement(tag); e.style.cssText = css; parent.appendChild(e); return e; };
  hud = el('div', 'position:fixed;left:50%;bottom:3.5%;transform:translateX(-50%);display:flex;gap:7px;align-items:flex-end;pointer-events:none;opacity:0;transition:opacity .6s;z-index:5');
  hud.id = 'runcells';
  const hex = 'polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%)';
  for (let i = 0; i < 5; i++) { const lift = [0, 6, 9, 6, 0][i];
    const c = el('div', `position:relative;width:30px;height:26px;margin-bottom:${lift}px;clip-path:${hex};background:rgba(255,226,160,.55)`, hud);
    const inner = el('div', `position:absolute;inset:2px;clip-path:${hex};background:rgba(28,15,4,.55);overflow:hidden`, c);
    const fill = el('div', `position:absolute;left:0;right:0;bottom:0;height:0%;background:${i < 4 ? TIER_CSS[i] : 'linear-gradient(90deg,#ffc23a,#ff73ad,#b48cff,#73bfff)'};box-shadow:0 0 12px ${i < 4 ? TIER_CSS[i] : '#fff'}`, inner);
    cells.push({ c, fill }); }
  goalEl = el('div', 'position:fixed;left:0;right:0;bottom:calc(3.5% + 44px);text-align:center;white-space:pre-line;pointer-events:none;opacity:0;transition:opacity .9s;font-size:17px;letter-spacing:.05em;color:#fff3d6;text-shadow:0 1px 6px #000;z-index:5');
  goalEl.id = 'rungoal';
  edgeEl = el('div', 'position:fixed;inset:0;pointer-events:none;opacity:0;z-index:2'); edgeEl.id = 'runedge';
}
function chordUpdate(on) { // a soft held chord, one note per tier
  if (!A.ctx) return; const c = A.ctx;
  if (!pad) { pad = CHORD.map(f => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.value = 0; o.connect(g); g.connect(A.master); if (A.echo) g.connect(A.echo); o.start(); return g; }); }
  pad.forEach((g, i) => g.gain.setTargetAtTime(on && RUN.tier > i ? 0.022 : 0, c.currentTime, 0.4)); }

// ---------- saving ----------
// ch: how many challenges are won. worn: what the bee has on (ids of wear.js). seen: how many earned pieces the bee has seen at its wardrobe cell.
// A save from before the wardrobe has only ch and best: its pieces are earned, nothing is worn yet and all of them are new
function loadMem() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && typeof s.ch === 'number') RUN.mem = { ch: s.ch, best: s.best || 0, bestAt: Array.isArray(s.bestAt) ? s.bestAt.map(Number) : null, worn: Array.isArray(s.worn) ? s.worn.filter(w => typeof w === 'string') : [], seen: typeof s.seen === 'number' ? s.seen : 0 }; } catch (e) { } }
export function saveMem() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(RUN.mem)); } catch (e) { } }

export function setupLongRun() {
  const gameRandom = Math.random; let ids = 52011; Math.random = () => { ids = (ids * 1664525 + 1013904223) >>> 0; return ids / 4294967296; };
  buildTrack(); layBurrow(RUN.S); layHigh(RUN.S); buildGrid(); buildLooks(); layMarks(RUN.S, RUN.T, groundAt); shortNear(MARKS.keep); loadMem();
  Math.random = gameRandom;
  updateOpen();
  window.__run = { RUN, RUNK, CHALLENGES, nearest, groundAt, startAuto, stopAuto, reset: () => endRun('reset', true), fmt: fmtTime };
}

// how much of the loop is open: the run stops where the first closed zone begins
let openKey = '';
function updateOpen() {
  const key = Object.keys(ZONES).map(k => G.zones[k] ? 1 : 0).join('') + (G.orchard ? 1 : 0); if (key === openKey) return; openKey = key;
  let stop = RUN.N; for (let i = RUN.dewN; i < RUN.N; i++) { const p = RUN.S[i]; if (zoneBlocked(p.x, p.z) || (!G.orchard && RUN.zone[i] === 'garden')) { stop = i; break; } }
  RUN.stopAt = stop; RUN.full = stop >= RUN.N;
  if (ribbon) ribbon.geometry.setDrawRange(0, Math.max(0, (stop - RUN.dewN + 1) * 6 - 6)); }

// ---------- autopilot for tests: rides the track at a speed, height and side offset ----------
function startAuto(o = {}) { const i = o.i || 0; RUN.auto = { s: i, spd: o.spd || 20, alt: o.alt === undefined ? 1.4 : o.alt, lat: o.lat || 0 }; placeAuto(0); }
function stopAuto() { RUN.auto = null; }
function placeAuto(dt) { const a = RUN.auto, N = RUN.N; a.s += a.spd * dt / STEP; const k = Math.floor(a.s), f = a.s - k, p = RUN.S[((k % N) + N) % N], q = RUN.S[(((k + 1) % N) + N) % N], tg = RUN.T[((k % N) + N) % N];
  const x = lerp(p.x, q.x, f) - tg.z * a.lat, z = lerp(p.z, q.z, f) + tg.x * a.lat; P.pos.set(x, groundAt(x, z) + a.alt, z); P.vel.set(tg.x * a.spd, 0, tg.z * a.spd); P.yaw = Math.atan2(-tg.x, -tg.z); P.pitch = 0; RUN.lastSpd = a.spd; }

// ---------- the run itself ----------
function startRun(i) {
  Object.assign(RUN, { state: 'run', tier: 0, prog: 0, s: i, s0: i, offT: 0, slowT: 0, clean: true, bails: 0, t: 0, goalShown: false, why: '', third: !!G.third, allThird: !!G.third, minPollen: P.pollen, nightStart: !!(window.NIGHT && window.NIGHT.active), hj: -1, hiN: 0, up: false, race: false, raceS: i, raceT: 0, delta: null, newBest: false, cell: -1, cur: null });
  hud.style.opacity = 1; goalEl.style.opacity = 0;
}
function endRun(result, quiet = false) {
  if (RUN.state !== 'run') { if (quiet) { RUN.state = 'idle'; hud.style.opacity = 0; goalEl.style.opacity = 0; } return; }
  RUN.result = result; RUN.state = 'ended'; RUN.endT = 0; chordUpdate(false);
  if (quiet) { RUN.state = 'idle'; hud.style.opacity = 0; goalEl.style.opacity = 0; return; }
  let msg = '';
  if (result === 'done') {
    const r = { third: RUN.third, allThird: RUN.allThird, tierEnd: RUN.tier, bails: RUN.bails, fullPollen: RUN.minPollen >= G.cap && P.pollen >= G.cap, night: RUN.nightStart && !!(window.NIGHT && window.NIGHT.active), high: HIGH.upN > 0 && RUN.hiN >= HIGHK.need * HIGH.upN }; // high: it kept to the high branch (highbranch.js)
    RUN.last = r; const ch = CHALLENGES[RUN.mem.ch];
    if (ch && ch.ok(r)) { RUN.mem.ch++; saveMem(); msg = `Challenge ${RUN.mem.ch} complete. Something new is waiting at home.`; /* wardrobe.js: a new piece hangs in the wardrobe cell */ tone(SCALE[2], 0.1, 2.4); tone(SCALE[4], 0.08, 2.4, 'sine', 0.15); tone(SCALE[7], 0.07, 2.6, 'sine', 0.3); }
    else { msg = 'All the way round'; tone(SCALE[4], 0.08, 2); tone(SCALE[7], 0.06, 2.2, 'sine', 0.15); }
    if (RUN.race && RUN.cur) { const lap = RUN.raceT, m = RUN.mem; if (!m.best || lap < m.best) { const had = m.best > 0; m.best = lap; m.bestAt = fillSplits(RUN.cur, lap); RUN.newBest = had; saveMem(); if (had) msg += `\nA new best loop!  ${fmtTime(lap)}`; } /* the first loop sets the best quietly */ }
  } else if (result === 'stopped') msg = 'The trail is overgrown past here';
  else if (result === 'lost') { msg = 'Off the trail'; sweep(500, 260, 0.5, 0.04); }
  if (msg) { goalEl.textContent = msg; goalEl.style.opacity = 1; }
}
// ---------- the race clock ----------
export function fmtTime(t) { const d = Math.floor(t * 10 + 1e-6), m = Math.floor(d / 600), sec = Math.floor(d / 10) % 60; return `${m}:${String(sec).padStart(2, '0')}.${d % 10}`; }
// the time at each SPLIT samples of the loop, counted from the race's start. Ahead or behind: this race's time so far against the time
// the best loop took over the same stretch of track (the best loop may have started anywhere else on it)
function splits(N) { const idx = ((Math.floor(RUN.s) % N) + N) % N, c = Math.floor(idx / SPLIT), n = Math.ceil(N / SPLIT);
  if (c !== RUN.cell) { if (RUN.cell < 0) RUN.cur[c] = 0; else for (let k = (RUN.cell + 1) % n, g = 0; g < n; k = (k + 1) % n, g++) { if (RUN.cur[k] === undefined) RUN.cur[k] = RUN.raceT; if (k === c) break; } RUN.cell = c; }
  const B = RUN.mem.bestAt, a = Math.floor(((Math.floor(RUN.raceS) % N) + N) % N / SPLIT);
  if (!B || !RUN.mem.best || B.length !== n || RUN.s - RUN.raceS < 3 * SPLIT) { RUN.delta = null; return; }
  let seg = B[c] - B[a]; if (seg < 0) seg += RUN.mem.best; RUN.delta = RUN.raceT - seg; }
function fillSplits(cur, lap) { const n = Math.ceil(RUN.N / SPLIT), out = []; for (let k = 0; k < n; k++) out.push(+(cur[k] === undefined ? lap : cur[k]).toFixed(2)); return out; }
function bail(why) { RUN.bails++; RUN.why = why; if (RUN.tier > 0) { RUN.tier--; sweep(700, 330, 0.35, 0.05); } RUN.prog = 0; }

const _tierCol = new V3();
export function runFrame(dt) {
  if (!RUN.N) return;
  updateOpen();
  const flying = P.mode === 'fly', x = P.pos.x, z = P.pos.z, spd = P.vel.length();
  if (RUN.state === 'idle') {
    if (flying) { const nb = nearest(x, z); if (nb.i >= 0 && nb.i < (RUN.full ? RUN.N : RUN.stopAt - 8) && nb.d < RUNK.half) { const alt = P.pos.y - groundAt(x, z), fwd = P.vel.x * RUN.T[nb.i].x + P.vel.z * RUN.T[nb.i].z; if (alt < RUNK.ceil && fwd > RUNK.minSpd) startRun(nb.i); } }
  } else if (RUN.state === 'run') {
    RUN.t += dt;
    if (!RUN.race && RUN.t >= RUNK.race) { RUN.race = true; RUN.raceS = RUN.s; RUN.raceT = 0; RUN.cur = RUN.full ? [] : null; } else if (RUN.race) RUN.raceT += dt;
    if (!flying) { endRun('quit', true); }
    else {
      const N = RUN.N, prevI = ((Math.round(RUN.s) % N) + N) % N; let lat, alt, tg;
      // highbranch.js: is the bee on the high branch (up on the wood, not where it still lies on the ground)? Then the wood is its track and its ground
      const hb = highNear(x, z), up = !!hb && HIGH.lift[hb.j] > HIGHK.lift && hb.lat < RUNK.half && P.pos.y - hb.top > -HIGHK.under && P.pos.y - hb.top < RUNK.ceil;
      if (up) { const at = HIGH.i0 + hb.j / (HIGH.N - 1) * (HIGH.i1 - HIGH.i0); let dh = ((at - RUN.s) % N + N) % N; if (dh > N / 2) dh -= N; RUN.s += dh; /* s counts on round the loop from where the run began */ lat = hb.lat; alt = P.pos.y - hb.top; tg = HIGH.T[hb.j]; if (hb.j > RUN.hj && hb.j - RUN.hj < 8) RUN.hiN += hb.j - RUN.hj; RUN.hj = Math.max(RUN.hj, hb.j); }
      else { const nb = nearest(x, z, prevI, 40); let di = nb.i - prevI; if (di > N / 2) di -= N; if (di < -N / 2) di += N; RUN.s += di; lat = lateral(x, z, nb.i); alt = P.pos.y - groundAt(x, z); tg = RUN.T[nb.i]; }
      RUN.up = up; const fwd = P.vel.x * tg.x + P.vel.z * tg.z;
      const bumped = RUN.lastSpd > 6 && spd < RUN.lastSpd * (1 - RUNK.bump);
      const on = lat < RUNK.half, low = alt < RUNK.ceil, fast = fwd > RUNK.minSpd, clean = on && low && fast && !bumped;
      if (G.third) RUN.allThird = RUN.allThird && true; else RUN.allThird = false; if (G.third) RUN.third = true;
      RUN.minPollen = Math.min(RUN.minPollen, P.pollen);
      if (clean) { RUN.offT = 0; RUN.prog += dt; if (RUN.prog >= RUNK.tierT) { if (RUN.tier < 5) { RUN.tier++; tone(CHORD[RUN.tier - 1] * 2, 0.07, 1.6); } RUN.prog = RUN.tier < 5 ? 0 : RUNK.tierT; } }
      else { if (RUN.clean || bumped) bail(!on ? 'off' : !low ? 'high' : !fast ? 'slow' : 'bump'); if (!on || !fast) RUN.offT += dt; else RUN.offT = 0; }
      RUN.slowT = on && !fast && !bumped ? (RUN.slowT || 0) + dt : 0; // stopped on the track: the run is over after RUNK.stall s (off the track the grass slows the bee, and that does not count)
      // off the track and down in the grass: the grass holds the bee back, so a slip costs time (it no longer ends the run)
      if (!on && !up && alt < RUNK.grassTop && Math.abs(groundAt(x, z) - terrainH(x, z)) < 0.05) { const k = Math.max(0, 1 - RUNK.drag * dt); P.vel.x *= k; P.vel.z *= k; }
      RUN.clean = clean;
      if (RUN.race && RUN.full && RUN.cur) splits(N); // a race that began with part of the track open has no clock, even if a zone opens on the way
      if ((lat > RUNK.leave && nearest(x, z).d > RUNK.leave) || RUN.slowT > RUNK.stall) endRun('lost'); // flown away from the track: the run is over
      else if (RUN.full && RUN.race && RUN.s - RUN.raceS >= N) endRun('done'); // all the way round, back to the line laid when the race started
      else if (!RUN.full && RUN.s >= RUN.stopAt - 4) endRun('stopped');
      else if (RUN.s < RUN.s0 - 20) endRun('lost');
      if (RUN.state === 'run' && RUN.full && !RUN.goalShown && RUN.t > RUNK.showGoal && CHALLENGES[RUN.mem.ch]) { RUN.goalShown = true; goalEl.textContent = `Challenge ${RUN.mem.ch + 1}: ${CHALLENGES[RUN.mem.ch].text}`; goalEl.style.opacity = 1; RUN.goalT = 0; }
      if (RUN.goalShown && RUN.state === 'run') { RUN.goalT += dt; if (RUN.goalT > 5) goalEl.style.opacity = 0; }
      chordUpdate(RUN.state === 'run');
    }
  } else if (RUN.state === 'ended') { RUN.endT += dt; if (RUN.endT > 3) { hud.style.opacity = 0; goalEl.style.opacity = 0; RUN.state = 'idle'; } }
  RUN.lastSpd = spd;
  marksFrame(dt, RUN.state === 'run' && RUN.race, RUN.full ? RUN.N + 1 : RUN.stopAt);
  if (RUN.auto) placeAuto(dt);
  look(dt);
}

// the cells, the light round the bee and the screen edges
let auraK = 0;
function look(dt) {
  const running = RUN.state === 'run', t = RUN.tier;
  cells.forEach((c, i) => { const h = i < t ? 100 : i === t && running ? 100 * RUN.prog / RUNK.tierT : 0; c.fill.style.height = h.toFixed(1) + '%'; c.c.style.opacity = running && RUN.offT > 0 ? (Math.sin(performance.now() * 0.025) > 0 ? 0.35 : 1) : 1; });
  const want = running ? [0, 0.5, 0.8, 1.1, 1.4, 1.8][t] : 0; auraK += (want - auraK) * Math.min(1, dt * 3); if (auraK < 0.004) auraK = 0;
  if (t >= 5) { const h = (performance.now() * 0.0004) % 1, k = h * 4, a = Math.floor(k) % 4, b = (a + 1) % 4, f = k - Math.floor(k); _tierCol.set(lerp(TIER_COL[a][0], TIER_COL[b][0], f), lerp(TIER_COL[a][1], TIER_COL[b][1], f), lerp(TIER_COL[a][2], TIER_COL[b][2], f)); }
  else if (t > 0) _tierCol.set(...TIER_COL[t - 1]);
  if (t > 0) U.uAuraC.value.lerp(_tierCol, Math.min(1, dt * 4));
  const night = window.NIGHT && window.NIGHT.active ? 1 : 0;
  U.uAura.value.set(P.pos.x, P.pos.y + 0.6, P.pos.z, auraK * (night ? 1.0 : 2.4));
  haloMesh.visible = auraK > 0 && !!G.third; if (haloMesh.visible) { haloMesh.position.copy(P.pos); haloMesh.scale.setScalar(0.55 + auraK * 0.3); haloMesh.material.uniforms.uC.value.copy(U.uAuraC.value); haloMesh.material.uniforms.uA.value = auraK * (night ? 0.2 : 0.6); }
  if (auraK > 0) { const c = U.uAuraC.value, css = `rgba(${(c.x * 255) | 0},${(c.y * 255) | 0},${(c.z * 255) | 0},`; edgeEl.style.background = `radial-gradient(ellipse at center,${css}0) 55%,${css}.55) 100%)`; edgeEl.style.opacity = Math.min(1, auraK * (G.third ? 0.18 : 0.4)).toFixed(3); }
  else if (edgeEl.style.opacity !== '0') edgeEl.style.opacity = 0;
}
