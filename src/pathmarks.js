// Honeylight: what the field mice put up along their road (the long run's track), so their friends can run it fast.
// At each big bend: a low fence of twigs woven between stakes on the outside of the bend, and two small boards of birch bark
// behind it with an arrow painted in berry juice, pointing the way the track turns. Nothing stands over the track itself.
// Bee sight: while the bee is racing (RUN-026), faint ultraviolet lines show along the edges of the track, like the nectar guides
// that flowers paint for bees. They fade in when the race starts and out when the run ends; at any other time they are not drawn.
// Self-contained: built on a random stream of its own (quietBuild), so the rest of the world stays as it was.
import * as THREE from '../three.module.min.js';
import { V3 } from './core.js';
import { scene, mat, U } from './engine.js';
import { quietBuild, seeded, addParts, rodGeo, lumpTube } from './runkit.js';
import { addStick, addBlock } from './solids.js';

// ---------- numbers to tune ----------
export const MARKK = {
  bendW: 9, bendDeg: 45, // a big bend: the track turns at least 45 degrees between 9 samples before and 9 after
  fenceLat: 3.85, fenceLen: 10, fenceH: 1.5, // the fence: how far from the middle of the track (outside "on the track", RUNK.half), how many samples each way, how high
  boardLat: 4.25, boardW: 1.0, boardH: 1.15, boardAt: [-3, 3], // the boards: behind the fence, at these samples from the bend
  lineLat: 2.5, lineW: 0.09, lineK: 0.32, lineFar: 32, // bee sight: where the lines are, how wide, how bright, how far ahead they fade out
  fadeIn: 1.2, fadeOut: 0.8, // seconds
};
export const MARKS = { bends: [], keep: [], race: 0, lines: null, fence: null, boards: null };

// the bends: where the heading turns most, over the threshold, at least 12 samples from a bigger turn
export function findBends(S, T, W = MARKK.bendW, minDeg = MARKK.bendDeg) {
  const N = S.length, turn = [];
  for (let i = 0; i < N; i++) { const a = T[(i - W + N) % N], b = T[(i + W) % N]; turn.push(Math.atan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z)); }
  const out = [];
  for (let i = 0; i < N; i++) { const t = Math.abs(turn[i]); if (t * 180 / Math.PI < minDeg) continue; let peak = true; for (let k = -12; k <= 12; k++) if (k && Math.abs(turn[(i + k + N) % N]) > t) { peak = false; break; } if (peak) out.push({ i, deg: turn[i] * 180 / Math.PI }); }
  return out;
}

let twigM, boardM;
function makeMaterials() {
  twigM = mat(`void main(){ vec3 n=NORMAL; float f=vnoise(vec2(vUv.x*12.0,vUv.y*30.0)+vW.xz);
    vec3 alb=mix(vec3(0.18,0.12,0.07),vec3(0.42,0.32,0.20),f)*vC.g; gl_FragColor=vec4(finish(shade(alb,n,vW,0.04,0.0),vW),1.0); }`, { vertexColors: true });
  // birch bark, pale and papery with dark dashes; one arrow (a chevron) in berry juice. vC.r > 0.5: the arrow points the other way
  boardM = mat(`void main(){ vec3 n=NORMAL; vec2 u=vUv; if(vC.r>0.5) u.x=1.0-u.x; float f=vnoise(vW.xz*7.0+vW.y*5.0);
    float dash=smoothstep(0.62,0.7,vnoise(vec2(u.x*3.0,u.y*26.0)))*step(0.5,vnoise(vec2(u.x*9.0,u.y*4.0)));
    vec3 birch=mix(vec3(0.80,0.77,0.68),vec3(0.95,0.93,0.86),f)*(1.0-0.75*dash);
    float c=abs(u.x-0.5-(abs(u.y-0.5)-0.25)*0.9); float chev=(1.0-smoothstep(0.10,0.14+0.03*f,c))*step(0.12,u.y)*step(u.y,0.88);
    vec3 ink=mix(vec3(0.42,0.10,0.12),vec3(0.55,0.16,0.16),f); vec3 alb=mix(birch,ink,chev*(0.85+0.15*vnoise(u*40.0)));
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.05,0.2),vW),1.0); }`, { vertexColors: true });
}

// the fence and the boards of one bend. out: -1 or 1, the outside of the bend
function layBend(b, S, T, ground, tw, bd) {
  const N = S.length, out = b.deg > 0 ? -1 : 1, r = seeded(b.i * 17 + 3), K = MARKK, side = (i, l) => ({ x: S[i].x - T[i].z * out * l, z: S[i].z + T[i].x * out * l });
  // stakes, then withies woven in and out between them
  const posts = [];
  for (let k = -K.fenceLen; k <= K.fenceLen; k += 1.5) { const i = Math.round(b.i + k + N) % N, q = side(i, K.fenceLat), g = ground(q.x, q.z), top = g + K.fenceH + r(-0.15, 0.2);
    posts.push({ p: new V3(q.x, g, q.z), i }); MARKS.keep.push(q);
    const a = new V3(q.x, g - 0.2, q.z), e = new V3(q.x + r(-0.08, 0.08), top, q.z + r(-0.08, 0.08)); tw.push({ g: rodGeo(a, e, 0.11, 0.08), c: [1, 0.85, 1] }); addStick(a, e, 0.11, 'fence'); }
  for (let row = 0; row < 9; row++) { const pts = posts.map(({ p, i }, k) => { const w = ((k + row) % 2 ? 1 : -1) * 0.1; return new V3(p.x - T[i].z * out * w, p.y + 0.15 + row * 0.15, p.z + T[i].x * out * w); });
    tw.push({ g: lumpTube(pts, 0.075, 0.06, b.i + row, 5, 0.08), c: [1, 0.7 + 0.3 * r(), 1] }); }
  for (let k = 1; k < posts.length; k++) { const a = posts[k - 1].p, e = posts[k].p; for (const h of [0.45, 1.05]) addStick(new V3(a.x, a.y + h, a.z), new V3(e.x, e.y + h, e.z), 0.42, 'fence'); }
  // the boards, upright, facing a bee coming into the bend, each on a stake
  for (const k of K.boardAt) { const i = (b.i + k + N) % N, q = side(i, K.boardLat), tin = T[(i - 10 + N) % N], g = ground(q.x, q.z), y = g + 2.0 + r(-0.1, 0.1), yaw = Math.atan2(tin.x, tin.z) + Math.PI;
    const m = new THREE.Matrix4().compose(new V3(q.x, y, q.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, r(-0.04, 0.04), 'YXZ')), new V3(1, 1, 1));
    bd.push({ g: new THREE.BoxGeometry(K.boardW, K.boardH, 0.1), m, c: [out < 0 ? 1 : 0, 1, 1] }); MARKS.keep.push(q);
    addBlock(new V3(q.x, y, q.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), [K.boardW / 2, K.boardH / 2, 0.08], 'board');
    const a = new V3(q.x, g - 0.3, q.z), e = new V3(q.x + r(-0.04, 0.04), y + K.boardH * 0.2, q.z + r(-0.04, 0.04)); tw.push({ g: rodGeo(a, e, 0.1, 0.07), c: [1, 0.9, 1] }); addStick(a, e, 0.1, 'fence'); }
}

// bee sight: two thin strips along the track's edges, one sample apart like the track
function layLines(S, T, ground) {
  const N = S.length, K = MARKK, pos = [], uv = [], idx = [];
  for (const lat of [-K.lineLat, K.lineLat]) { const base = pos.length / 3;
    for (let j = 0; j <= N; j++) { const i = j % N, p = S[i], t = T[i];
      for (const e of [-1, 1]) { const l = lat + e * K.lineW, x = p.x - t.z * l, z = p.z + t.x * l; pos.push(x, ground(x, z) + 0.09, z); uv.push(e < 0 ? 0 : 1, j); }
      if (j) { const k = base + j * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const m = new THREE.ShaderMaterial({ uniforms: { uRace: U.uRace, uStop: { value: 1e9 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vU; varying float vD; void main(){ vU=uv; vec4 w=modelMatrix*vec4(position,1.0); vD=length(w.xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uRace; uniform float uStop; varying vec2 vU; varying float vD;
    void main(){ if(uRace<=0.0 || vU.y>uStop) discard; float x=abs(vU.x-0.5)*2.0, core=1.0-smoothstep(0.0,1.0,x); core*=core;
      float near=smoothstep(1.5,5.0,vD)*(1.0-smoothstep(${(K.lineFar * 0.35).toFixed(1)},${K.lineFar.toFixed(1)},vD));
      vec3 c=mix(vec3(0.42,0.22,1.0),vec3(0.72,0.55,1.0),core*core);
      gl_FragColor=vec4(c*(core*0.75+0.25*sqrt(core))*near*uRace*${K.lineK.toFixed(3)},1.0); }` });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 4; mesh.visible = false; mesh.userData.noShadow = true; scene.add(mesh); return mesh;
}

// called by longrun.js once the track is laid. ground(x, z): the track's ground
export function layMarks(S, T, ground) {
  if (/marks=0/.test(location.search)) return; // ?marks=0: no fences, boards or lines
  quietBuild(61027, () => { makeMaterials(); MARKS.bends = findBends(S, T); const tw = [], bd = [];
    for (const b of MARKS.bends) layBend(b, S, T, ground, tw, bd);
    MARKS.fence = addParts(tw, twigM); MARKS.boards = addParts(bd, boardM); MARKS.lines = layLines(S, T, ground); });
  window.__marks = { MARKS, MARKK };
}

// each frame (longrun.js): racing is 1 while the race is on, else 0; stop: the last open sample of the track
export function marksFrame(dt, racing, stop) {
  const L = MARKS.lines; if (!L) return;
  MARKS.race = racing ? Math.min(1, MARKS.race + dt / MARKK.fadeIn) : Math.max(0, MARKS.race - dt / MARKK.fadeOut);
  U.uRace.value = MARKS.race * MARKS.race * (3 - 2 * MARKS.race); L.visible = MARKS.race > 0; L.material.uniforms.uStop.value = stop;
}
