// Honeylight: what a bee can wear: the seven pieces of the wardrobe, and how they sit on the player's bee.
// The acorn cap with a leaf on its stalk, the dandelion scarf with two ends that stream in the air, the leaf cape, the glowworm tips of the antennae,
// moth dust on the wings, and two coats (the orchid bee's metal, sun gold). The coats and the wing dust are switches in the bee shaders (bees.js: b.coat, b.wing).
// The other pieces are models that follow the bee's body. Everything is made once, with its own random numbers, and only shown or hidden afterwards:
// a bee that wears nothing is drawn exactly as before, and nothing here takes a number from the game's random stream.
import * as THREE from '../three.module.min.js';
import { V3 } from './core.js';
import { CT, HTOP, ROUT, terrainH } from './world.js';
import { scene, U, VERT, mat, simple, geoParts, ell, stick, hidden } from './engine.js';
import { COMBS } from './hive.js';
import { me, ants } from './player.js';
import { quietBuild, seeded } from './runkit.js';
import { makeRope } from './rope.js';

// the pieces in the order they are earned (wardrobe.js). slot: where on the bee a piece goes; two pieces of one slot are not worn together
export const PIECES = [
  { id: 'cap', slot: 'head', name: 'Acorn cap' },
  { id: 'scarf', slot: 'neck', name: 'Dandelion scarf' },
  { id: 'cape', slot: 'back', name: 'Leaf cape' },
  { id: 'tips', slot: 'antennae', name: 'Glowworm tips' },
  { id: 'dust', slot: 'wings', name: 'Moth-dust wings' },
  { id: 'orchid', slot: 'coat', name: 'Orchid-bee coat' },
  { id: 'gold', slot: 'coat', name: 'Sun-gold coat' },
];
// what the player's bee has on now: WORN.cap, WORN.scarf, ... are true or false. WORN.any: is anything worn at all (a hook for other code, such as a camera that shows the bee off)
export const WORN = { any: false };

let rnd = null; // the build's own random numbers
const DS = { side: THREE.DoubleSide };
const MV = { value: new THREE.Vector4() }; // the wearer's body motion (the bee shader's aMove), for the soft pieces
let SOFT = ''; // vertex shader for soft pieces that lie on the body: they swing with the abdomen and nod with the head, as the body does in the bee shader (bees.js)
const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.frustumCulled = false; return o; };
const geo = (pos, idx, uv) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); if (idx) g.setIndex(idx); g.computeVertexNormals(); return g; };
const softly = (o, soft) => soft ? { ...o, vert: SOFT, uniforms: { uMv: MV } } : o;

// a soft light that always faces the camera
let glowG = null;
const GLOW_VERT = `uniform float uS; varying vec2 vU; void main(){ vU=position.xy*2.0; vec4 mv=modelViewMatrix*vec4(0.0,0.0,0.0,1.0); mv.xy+=position.xy*uS*length(modelMatrix[0].xyz); gl_Position=projectionMatrix*mv; }`;
const GLOW_FRAG = `uniform vec3 uC; uniform float uK; varying vec2 vU; void main(){ float r=length(vU); float a=exp(-r*r*5.0)*uK+exp(-r*r*40.0)*uK*1.5; gl_FragColor=vec4(uC*a*smoothstep(1.0,0.7,r),1.0); }`;
export function glow(x, y, z, size, col, k, o = {}) { glowG = glowG || new THREE.PlaneGeometry(1, 1);
  const m = mesh(glowG, new THREE.ShaderMaterial({ uniforms: { uC: { value: new V3(...col) }, uS: { value: size }, uK: { value: k } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG, ...o }));
  m.position.set(x, y, z); m.renderOrder = 5; return m; }

// ---------- the models, in bee space (z forward, y up, the bee is about 1.1 long) ----------
// 1. the acorn cap: the scaly cup of an acorn, worn on the back of the head, with its long stalk. grp.cap is the cup itself, grp.tip the end of the stalk
export function capModel() { const grp = new THREE.Group(), R = 0.235;
  const capM = mat(`void main(){ vec3 n=NORMAL; vec3 l=normalize(vL); float v=acos(clamp(l.y,-1.0,1.0)); float row=floor(v*9.0); float u=atan(l.z,l.x)*(3.0+row*2.2)/6.2832+0.5*mod(row,2.0);
    vec2 f=vec2(fract(u)-0.5,fract(v*9.0)); float tip=smoothstep(0.0,0.9,f.y)*(1.0-smoothstep(0.30,0.5,abs(f.x)*(0.6+f.y))); float crease=smoothstep(0.42,0.5,abs(f.x))+smoothstep(0.85,1.0,f.y);
    vec3 alb=mix(vec3(0.30,0.19,0.09),vec3(0.62,0.45,0.24),tip)*(0.8+0.4*hash21(vec2(floor(u),row))); alb*=1.0-0.55*clamp(crease,0.0,1.0);
    if(!gl_FrontFacing) alb=vec3(0.66,0.52,0.33)*(0.8+0.3*vnoise(vL.xz*40.0));
    n=normalize(n+vec3(f.x,0.0,f.x)*0.5*tip);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.25,0.1),vW),1.0); }`, DS);
  const dome = new THREE.SphereGeometry(R, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5); dome.scale(1, 0.9, 1);
  const cap = new THREE.Group(); cap.add(mesh(dome, capM));
  const rim = new THREE.TorusGeometry(R * 0.985, 0.012, 8, 36); rim.rotateX(Math.PI / 2); cap.add(mesh(rim, simple('0.56,0.42,0.24', 0.1, 0.1)));
  const top = R * 0.88, SP = [[0, top, 0], [0.012, top + 0.07, -0.02], [0.03, top + 0.13, -0.065], [0.04, top + 0.17, -0.125]];
  const stalk = geoParts(SP.slice(1).map((p, i) => ({ g: stick(SP[i], p, 0.014 - i * 0.003), c: [0.24 - i * 0.02, 0.15 - i * 0.015, 0.07] })));
  cap.add(mesh(stalk, mat(`void main(){ gl_FragColor=vec4(finish(shade(vC,NORMAL,vW,0.1,0.1),vW),1.0); }`, { vertexColors: true })));
  cap.position.set(0, 0.095, 0.345); cap.rotation.x = -0.42; grp.add(cap); cap.updateMatrix(); grp.cap = cap; grp.tip0 = new V3(...SP[3]); grp.tip = grp.tip0.clone().applyMatrix4(cap.matrix); return grp; }

// fine hairs: thin quads whose shading normal is the way they point (soft, like down)
const HAIR_FRAG = `void main(){ vec3 n=normalize(vN); vec3 c=shade(vC*0.84,n,vW,0.0,1.0)+vC*vec3(0.10,0.10,0.09); gl_FragColor=vec4(finish(c,vW),1.0); }`;
const hairMat = soft => mat(HAIR_FRAG, softly({ vertexColors: true, ...DS }, soft));
// 2. the dandelion scarf: a collar of dandelion down round the neck with seed parachutes standing out of it. tail: one end that hangs back along one side (for a scarf on its peg; a worn scarf has two ends that are ropes in the air)
export function scarfModel(soft, tail = false) { const grp = new THREE.Group(), pos = [], idx = [], col = [], nor = []; let n = 0;
  const hair = (a, b, w, c, nd) => { const d = new V3().subVectors(b, a), s = new V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).cross(d).normalize().multiplyScalar(w), nn = (nd || d).clone().normalize();
    for (const p of [a.clone().sub(s), a.clone().add(s), b.clone().sub(s.clone().multiplyScalar(0.4)), b.clone().add(s.clone().multiplyScalar(0.4))]) { pos.push(p.x, p.y, p.z); col.push(...c); nor.push(nn.x, nn.y, nn.z); } idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); n += 4; };
  const seedAt = (base, dir, len, k = 1) => { // one seed: a short stalk and an umbrella of hairs
    const d = dir.clone().normalize(), top = base.clone().addScaledVector(d, len * 0.55); hair(base, top, 0.003, [0.80, 0.74, 0.58], d);
    const a = new V3(1, 0, 0).cross(d); if (a.lengthSq() < 0.01) a.set(0, 1, 0).cross(d); a.normalize(); const b = new V3().crossVectors(d, a);
    const H = Math.round(20 * k); for (let i = 0; i < H; i++) { const an = i / H * Math.PI * 2 + rnd(0.3), sp = rnd(0.6, 1.0); const e = top.clone().addScaledVector(d, len * 0.42 * rnd(0.5, 1)).addScaledVector(a, Math.cos(an) * len * 0.62 * sp).addScaledVector(b, Math.sin(an) * len * 0.62 * sp); hair(top, e, 0.0022, [1, 1, 1], e.clone().sub(base)); } };
  const C = new V3(0, 0.02, 0.275), R = 0.132, ringP = an => new V3(C.x + Math.cos(an) * R, C.y + Math.sin(an) * R * 1.04, C.z);
  for (let i = 0; i < 620; i++) { const an = rnd(Math.PI * 2), t = rnd(Math.PI * 2), rr = 0.03 * Math.sqrt(rnd()); const out = new V3(Math.cos(an), Math.sin(an), 0), p = ringP(an).addScaledVector(out, Math.cos(t) * rr).add(new V3(0, 0, Math.sin(t) * rr * 1.5));
    const d = out.clone().multiplyScalar(0.55 + Math.cos(t) * 0.6).add(new V3(rnd(-0.5, 0.5), rnd(-0.5, 0.5), Math.sin(t) * 1.1 + rnd(-0.4, 0.4))).normalize(); hair(p, p.clone().addScaledVector(d, rnd(0.03, 0.065)), 0.0032, [0.97, 0.96, 0.92], d); }
  for (let i = 0; i < 22; i++) { const an = i / 22 * Math.PI * 2 + rnd(0.2), dir = new V3(Math.cos(an), Math.sin(an), rnd(-0.45, 0.3)); if (dir.y < -0.8) continue; seedAt(ringP(an).add(new V3(0, 0, rnd(-0.02, 0.02))), dir, rnd(0.09, 0.13)); }
  if (tail) { const tailP = f => new V3(0.135 + 0.06 * Math.sin(f * 3.2), 0.12 + 0.035 * Math.sin(f * 5 + 1) + 0.05 * f, 0.25 - f * 0.62);
    for (let i = 0; i < 260; i++) { const f = Math.pow(rnd(), 0.8), p = tailP(f).add(new V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(0.022 * (1 - f * 0.5))); const d = new V3(rnd(-1, 1), rnd(-0.4, 1), rnd(-1.4, 0.3)).normalize(); hair(p, p.clone().addScaledVector(d, rnd(0.03, 0.06)), 0.003, [0.97, 0.96, 0.92], d); }
    for (let i = 0; i < 8; i++) { const f = i / 7; seedAt(tailP(f), new V3(0.5 + rnd(-0.4, 0.4), 0.8, -0.7 + rnd(-0.3, 0.3)), rnd(0.08, 0.12), 0.8); } }
  const g = geo(pos, idx); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  grp.add(mesh(g, hairMat(soft))); return grp; }

export const leafMat = soft => mat(`void main(){ vec3 n=NORMAL; float u=vUv.x, v=vUv.y; float mid=1.0-smoothstep(0.0,0.05,abs(u)); float sv=abs(fract(v*8.0-abs(u)*1.7)-0.5); float vein=max(mid,(1.0-smoothstep(0.0,0.07,sv))*0.7);
    vec3 alb=mix(vec3(0.07,0.26,0.04),vec3(0.20,0.42,0.08),vnoise(vUv*vec2(6.0,14.0))); alb=mix(alb,vec3(0.55,0.42,0.10),smoothstep(0.55,1.0,v)*smoothstep(0.35,1.0,abs(u))*0.8); alb=mix(alb,vec3(0.42,0.58,0.20),vein*0.75);
    if(!gl_FrontFacing) alb=alb*0.8+vec3(0.03,0.05,0.0);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.35,0.55),vW),1.0); }`, softly({ ...DS }, soft));
// 3. the leaf cape: one leaf tied at the neck by its stalk, lying over the back between the wings, its tip lifting behind
export function capeModel(soft, tied = true) { const grp = new THREE.Group(), NU = 14, NV = 34, pos = [], uv = [], idx = [], ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let j = 0; j <= NV; j++) { const v = j / NV, w = (0.03 + 0.215 * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.72)), 0.85) * ss(0.0, 0.3, v + 0.06)) * (1 - 0.9 * ss(0.93, 1, v)), z = 0.25 - v * 1.0,
      yc = 0.238 + 0.02 * Math.sin(Math.PI * Math.min(v / 0.4, 1)) - 0.125 * ss(0.3, 0.9, v) + 0.06 * ss(0.78, 1, v);
    for (let i = 0; i <= NU; i++) { const u = i / NU * 2 - 1, x = u * w; pos.push(x + 0.014 * Math.sin(v * 9) * v, yc - 1.7 * x * x * (1 - 0.5 * ss(0.7, 1, v)) + 0.012 * Math.sin(u * 3 + v * 11) * v, z); uv.push(u, v); } }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  grp.add(mesh(geo(pos, idx, uv), leafMat(soft)));
  if (tied) { const c = [0.18, 0.36, 0.08], c2 = [0.26, 0.44, 0.10];
    const tie = geoParts([{ g: new THREE.TorusGeometry(0.128, 0.011, 8, 30).translate(0, 0.02, 0).rotateX(0.12).translate(0, 0, 0.268), c }, { g: stick([0, 0.225, 0.25], [0, 0.15, 0.275], 0.012), c }, { g: ell(0.022, 0.022, 0.022, 0.0, -0.105, 0.29, 8), c: c2 }, { g: stick([0.0, -0.105, 0.29], [0.03, -0.17, 0.31], 0.006), c: c2 }, { g: stick([0.0, -0.105, 0.29], [-0.025, -0.16, 0.33], 0.006), c: c2 }]);
    grp.add(mesh(tie, mat(`void main(){ gl_FragColor=vec4(finish(shade(vC,NORMAL,vW,0.2,0.4),vW),1.0); }`, softly({ vertexColors: true }, soft)))); }
  return grp; }

// 4. the glowworm tips: the last joints of the antennae shine yellow-green, like a glowworm's tail
export function tipsModel(k = 1) { const grp = new THREE.Group(), parts = [];
  for (const sd of [1, -1]) { const a = new V3(sd * 0.07, 0.17, 0.54), b = new V3(sd * 0.15, 0.2, 0.74), d = b.clone().sub(a).normalize();
    for (let i = 0; i < 3; i++) { const c = b.clone().addScaledVector(d, -0.03 + i * 0.034); parts.push({ g: ell(0.021 - i * 0.002, 0.021 - i * 0.002, 0.021, c.x, c.y, c.z, 10), c: [1, 1, 1] }); }
    grp.add(glow(b.x + d.x * 0.02, b.y + d.y * 0.02, b.z + d.z * 0.02, 0.26, [0.50, 1.0, 0.16], 0.42 * k)); }
  grp.add(mesh(geoParts(parts), mat(`void main(){ float seg=0.75+0.25*sin(vL.z*185.0); vec3 c=vec3(0.72,1.0,0.20)*(1.5+0.4*sin(uTime*2.3))*seg*${k.toFixed(2)}+shade(vec3(0.5,0.6,0.2),NORMAL,vW,0.3,0.5); gl_FragColor=vec4(finish(c,vW),1.0); }`)));
  return grp; }

// a leaf blade laid along a row of points. lay(P, B, Nn): P the points, B and Nn the directions across and up for each piece between two points
export function leafStrip(N) { const NU = 6, pos = new Float32Array(N * (NU + 1) * 3), uv = [], idx = [];
  for (let j = 0; j < N; j++) for (let i = 0; i <= NU; i++) uv.push(i / NU * 2 - 1, 0.12 + 0.88 * j / (N - 1));
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, c = a + NU + 1; idx.push(a, c, a + 1, a + 1, c, c + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const m = mesh(g, leafMat(false));
  const lay = (P, B, Nn) => { for (let j = 0; j < N; j++) { const f = j / (N - 1), s = Math.min(j, N - 2), b = B[s], n = Nn[s], w = 0.008 + 0.062 * Math.pow(Math.sin(Math.PI * Math.pow(f, 0.7)), 0.8) * (f < 1 ? 1 : 0);
      for (let i = 0; i <= NU; i++) { const u = i / NU * 2 - 1, o = (j * (NU + 1) + i) * 3, cup = -0.9 * u * u * w; pos[o] = P[j].x + b.x * u * w + n.x * cup; pos[o + 1] = P[j].y + b.y * u * w + n.y * cup; pos[o + 2] = P[j].z + b.z * u * w + n.z * cup; } }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals(); };
  return { mesh: m, lay }; }

// dandelion down drawn along a rope: every hair has its place on the rope, and its base and tip in the rope's own frame
function fluffTail(rope, side) { const H = [], N = rope.N;
  const add = (u, base, tip, w, c) => H.push({ u, base, tip, w, c, s: [rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)] });
  for (let i = 0; i < 230; i++) { const f = Math.pow(rnd(), 1.15), u = f * (N - 1.001), a = rnd(Math.PI * 2), rr = (0.028 - 0.016 * f) * Math.sqrt(rnd()), len = rnd(0.03, 0.062) * (1 - 0.35 * f);
    const b = [Math.cos(a) * rr, Math.sin(a) * rr, 0], d = [Math.cos(a) * 0.8 + rnd(-0.5, 0.5), Math.sin(a) * 0.8 + rnd(-0.5, 0.5), rnd(-0.2, 0.9)], dl = Math.hypot(...d); add(u, b, [b[0] + d[0] / dl * len, b[1] + d[1] / dl * len, b[2] + d[2] / dl * len], 0.003, [0.97, 0.96, 0.92]); }
  for (let k = 0; k < 7; k++) { const u = 1.0 + k * 1.9 + rnd(-0.3, 0.3), a = rnd(Math.PI * 2) * 0.5 + (side > 0 ? 0 : Math.PI) + Math.PI * 0.25, L = rnd(0.085, 0.12) * (1 - k * 0.04), d = [Math.cos(a) * 0.75, Math.abs(Math.sin(a)) * 0.75 + 0.3, 0.45], dl = Math.hypot(...d); d[0] /= dl; d[1] /= dl; d[2] /= dl;
    const top = [d[0] * L * 0.55, d[1] * L * 0.55, d[2] * L * 0.55]; add(u, [0, 0, 0], top, 0.003, [0.80, 0.74, 0.58]);
    const ax = [d[1], -d[0], 0], al = Math.hypot(...ax) || 1; ax[0] /= al; ax[1] /= al; const bx = [d[1] * ax[2] - d[2] * ax[1], d[2] * ax[0] - d[0] * ax[2], d[0] * ax[1] - d[1] * ax[0]];
    for (let j = 0; j < 17; j++) { const an = j / 17 * Math.PI * 2 + rnd(0.3), sp = rnd(0.6, 1) * L * 0.62, up = L * 0.42 * rnd(0.5, 1); add(u, top, [top[0] + d[0] * up + (ax[0] * Math.cos(an) + bx[0] * Math.sin(an)) * sp, top[1] + d[1] * up + (ax[1] * Math.cos(an) + bx[1] * Math.sin(an)) * sp, top[2] + d[2] * up + (ax[2] * Math.cos(an) + bx[2] * Math.sin(an)) * sp], 0.0022, [1, 1, 1]); } }
  const n = H.length, pos = new Float32Array(n * 12), nor = new Float32Array(n * 12), col = new Float32Array(n * 12), idx = [];
  H.forEach((h, i) => { for (let k = 0; k < 4; k++) col.set(h.c, i * 12 + k * 3); idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 1, i * 4 + 3, i * 4 + 2); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
  const m = mesh(g, hairMat(false)), A = new V3(), Bv = new V3(), S = new V3(), D = new V3();
  const put = (o, x, y, z) => { pos[o] = x; pos[o + 1] = y; pos[o + 2] = z; };
  const lay = () => { rope.frames(); const P = rope.P;
    for (let i = 0; i < n; i++) { const h = H[i], si = Math.min(N - 2, Math.floor(h.u)), f = h.u - si, T = rope.T[si], B = rope.B[si], Nn = rope.Nn[si], px = P[si].x + (P[si + 1].x - P[si].x) * f, py = P[si].y + (P[si + 1].y - P[si].y) * f, pz = P[si].z + (P[si + 1].z - P[si].z) * f;
      A.set(px + B.x * h.base[0] + Nn.x * h.base[1] + T.x * h.base[2], py + B.y * h.base[0] + Nn.y * h.base[1] + T.y * h.base[2], pz + B.z * h.base[0] + Nn.z * h.base[1] + T.z * h.base[2]);
      Bv.set(px + B.x * h.tip[0] + Nn.x * h.tip[1] + T.x * h.tip[2], py + B.y * h.tip[0] + Nn.y * h.tip[1] + T.y * h.tip[2], pz + B.z * h.tip[0] + Nn.z * h.tip[1] + T.z * h.tip[2]);
      D.copy(Bv).sub(A); S.set(h.s[0], h.s[1], h.s[2]).cross(D).normalize().multiplyScalar(h.w); const o = i * 12;
      put(o, A.x - S.x, A.y - S.y, A.z - S.z); put(o + 3, A.x + S.x, A.y + S.y, A.z + S.z); put(o + 6, Bv.x - S.x * 0.4, Bv.y - S.y * 0.4, Bv.z - S.z * 0.4); put(o + 9, Bv.x + S.x * 0.4, Bv.y + S.y * 0.4, Bv.z + S.z * 0.4);
      D.normalize(); for (let k = 0; k < 4; k++) { nor[o + k * 3] = D.x; nor[o + k * 3 + 1] = D.y; nor[o + k * 3 + 2] = D.z; } }
    g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; };
  return { rope, mesh: m, lay }; }

// ---------- on the player's bee ----------
let rig, headG, capG, collarG, capeG, tipsG, haloG, leaf, trail, floorY = -1e9; const tails = [], fpTips = [];
// the ropes stay out of the world's big solid things: the ground or the hive floor under the bee, and the faces of the combs
function keep(p) { if (p.y < floorY) p.y = floorY;
  if (p.y < HTOP && p.x * p.x + p.z * p.z < ROUT * ROUT) for (const c of COMBS) { const dz = p.z - c.z, h = CT / 2 + 0.02; if (Math.abs(dz) < h && Math.abs(p.x) < c.hw && p.y > c.yb) p.z = c.z + (dz < 0 ? -h : h); } }

// 5. moth dust: the dust itself is in the wing shader (bee.wing = 1); this is the drift of scales the beating wings leave in the air behind them
function makeTrail() { const N = 72, ctr = new Float32Array(N * 12), cor = new Float32Array(N * 8), col = new Float32Array(N * 16), idx = [], Q = [], r = seeded(4471);
  for (let i = 0; i < N; i++) { cor.set([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5], i * 8); idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 1, i * 4 + 3, i * 4 + 2); Q.push({ p: new V3(), v: new V3(), life: 0, max: 1, s: 0, k: 0, c: 0 }); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(ctr, 3)); g.setAttribute('aQ', new THREE.BufferAttribute(cor, 2)); g.setAttribute('aC', new THREE.BufferAttribute(col, 4)); g.setIndex(idx);
  const m = mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec2 aQ; attribute vec4 aC; varying vec2 vU; varying vec3 vK; void main(){ vU=aQ*2.0; vK=aC.rgb; vec4 mv=viewMatrix*vec4(position,1.0); mv.xy+=aQ*aC.a; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec2 vU; varying vec3 vK; void main(){ float r=length(vU); float a=exp(-r*r*5.0)+exp(-r*r*40.0)*1.5; gl_FragColor=vec4(vK*a*smoothstep(1.0,0.7,r),1.0); }` }));
  m.renderOrder = 5; m.visible = false;
  let next = 0, owe = 0, live = 0; const _p = new V3();
  const frame = (dt, on, bm) => { if (!(dt > 0) || (!on && !live && !m.visible)) return; /* nothing in the air: nothing to do */
    if (on) { const sp = me.vel ? me.vel.length() : 0; owe += dt * 24 * Math.min(1, 0.3 + sp / 10);
      while (owe >= 1) { owe -= 1; const q = Q[next]; next = (next + 1) % N; const sd = r() < 0.5 ? 1 : -1; _p.set(sd * r(0.14, 0.62), 0.19 + r(-0.05, 0.08), 0.12 - r(0.3)).applyMatrix4(bm); q.p.copy(_p);
        q.v.set(r(-0.25, 0.25), r(-0.1, 0.3), r(-0.25, 0.25)); if (me.vel) q.v.addScaledVector(me.vel, 0.22); q.life = q.max = r(0.8, 1.6); q.s = r(0.035, 0.085); q.k = 0.5 + r(0.9); q.c = r() < 0.3 ? 1 : 0; } }
    live = 0;
    for (let i = 0; i < N; i++) { const q = Q[i], o = i * 16; let b = 0, s = 0;
      if (q.life > 0) { q.life -= dt; q.v.multiplyScalar(Math.max(0, 1 - dt * 2.2)); q.v.y -= 0.35 * dt; q.p.addScaledVector(q.v, dt); const f = Math.max(0, q.life / q.max); b = q.k * f * (0.65 + 0.35 * Math.sin(q.life * 23 + i)); s = q.s * (0.6 + 0.4 * f); live++; }
      const cr = q.c ? 0.85 : 1.0, cg = q.c ? 0.75 : 0.9, cb = q.c ? 1.0 : 0.62;
      for (let k = 0; k < 4; k++) { ctr[i * 12 + k * 3] = q.p.x; ctr[i * 12 + k * 3 + 1] = q.p.y; ctr[i * 12 + k * 3 + 2] = q.p.z; col[o + k * 4] = cr * b; col[o + k * 4 + 1] = cg * b; col[o + k * 4 + 2] = cb * b; col[o + k * 4 + 3] = s; } }
    m.visible = live > 0; if (live > 0 || frame.was) { g.attributes.position.needsUpdate = true; g.attributes.aC.needsUpdate = true; } frame.was = live > 0; };
  return { mesh: m, frame, Q, count: () => live }; }

function build() {
  SOFT = VERT.replace('void main(){', 'uniform float uTime; uniform vec4 uMv;\nvoid main(){').replace('vec4 w = m*vec4(position,1.0);', `vec3 pp=position; float abd=smoothstep(-0.1,-0.45,pp.z);
  pp.y+=abd*(sin(uTime*2.2+uMv.z)*0.03*(0.3+uMv.w)-uMv.x*0.06)*(-pp.z); pp.x+=abd*uMv.y*0.10*(-pp.z);
  float head=smoothstep(0.24,0.34,pp.z); pp.x+=head*uMv.y*0.05; pp.y+=head*(sin(uTime*1.7+uMv.z)*0.012-uMv.x*0.02);
  vec4 w = m*vec4(pp,1.0);`);
  rig = new THREE.Group(); rig.matrixAutoUpdate = false; rig.visible = false; headG = new THREE.Group(); rig.add(headG);
  capG = capModel(); headG.add(capG); tipsG = tipsModel(1); headG.add(tipsG);
  collarG = scarfModel(true); rig.add(collarG); capeG = capeModel(true); rig.add(capeG);
  haloG = glow(0, 0.05, -0.05, 2.0, [1.0, 0.62, 0.16], 0.055); rig.add(haloG); // 7. the sun-gold coat is in the body shader (bee.coat = 2); this is its faint light
  scene.add(rig); hidden.push(rig); // worn things cast no shadow of their own
  // the scarf's two ends, tied on top of the neck, one each side. slip 1 and throw 3: the ends swing to the outside of a turn (rope.js)
  for (const sd of [1, -1]) { const t = fluffTail(makeRope(me, new V3(sd * 0.075, 0.135, 0.25), 15, 0.085, { drag: 7, slip: 1, throw: 3, grav: 3.4, lift: 0.17, flut: 0.42, splay: sd * 0.10, ph: sd > 0 ? 0 : 2.1, margin: 0.06, back: [sd * 0.35, 0.1, -0.93], keep }), sd); tails.push(t); }
  // the leaf on the cap's long stalk: a short rope with a leaf blade laid along it. Its extra rounded shape is the cap itself
  { const N = 6, rope = makeRope(me, capG.tip, N, 0.05, { drag: 9, slip: 1, throw: 3, grav: 2.6, lift: 0.10, flut: 0.75, ph: 0.7, margin: 0.035, extra: [[0, 0.115, 0.335, 0.24, 0.215, 0.24]], back: [0, 0.25, -0.97], keep }), s = leafStrip(N);
    leaf = { rope, mesh: s.mesh, lay: () => { rope.frames(); s.lay(rope.P, rope.B, rope.Nn); } }; }
  trail = makeTrail();
  for (const o of [tails[0].mesh, tails[1].mesh, leaf.mesh, trail.mesh]) { o.visible = false; scene.add(o); hidden.push(o); }
  // in the bee's own eyes: the tips of the two antennae at the top of the view glow too (player.js: ants)
  ants.forEach((a, i) => { const s = i ? -1 : 1, e = new V3(s * 0.13, -0.01, -0.21), d = new V3(s * 0.045, -0.04, -0.07).normalize(), grp = new THREE.Group();
    const bead = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 1.25, 0.3), transparent: true, depthTest: false });
    for (let k = 0; k < 3; k++) { const b = mesh(new THREE.SphereGeometry(0.0046 - k * 0.0005, 8, 6), bead); b.position.copy(e).addScaledVector(d, -0.012 + k * 0.009); b.renderOrder = 1000; grp.add(b); }
    const gl = glow(e.x + d.x * 0.008, e.y + d.y * 0.008, e.z + d.z * 0.008, 0.075, [0.50, 1.0, 0.16], 0.34, { depthTest: false }); gl.renderOrder = 1001; grp.add(gl);
    grp.visible = false; a.add(grp); hidden.push(grp); fpTips.push(grp); });
}

// called for the player's bee from updateBees (bees.js), with the bee's matrix of this frame
function wornFrame(bm, dt) {
  const shown = me.s.x > 0.5, mx = me.mx || 0, my = me.my || 0, ph = me.ph * 7;
  MV.value.set(mx, my, ph, me.fly ? 1 : 0);
  const hx = my * 0.05, hy = Math.sin(U.uTime.value * 1.7 + ph) * 0.012 - mx * 0.02; // how the head moves in the bee shader: the cap and the tips go with it
  rig.visible = shown && WORN.any; if (rig.visible) { rig.matrix.copy(bm); rig.matrixWorldNeedsUpdate = true; headG.position.set(hx, hy, 0); }
  if (WORN.cap || WORN.scarf) floorY = (me.p.x * me.p.x + me.p.z * me.p.z < ROUT * ROUT && me.p.y > -1 && me.p.y < HTOP + 1 ? 0 : terrainH(me.p.x, me.p.z)) + 0.03;
  if (WORN.cap) { leaf.rope.anchor.set(capG.tip.x + hx, capG.tip.y + hy, capG.tip.z); leaf.rope.step(dt); leaf.mesh.visible = shown; if (shown) leaf.lay(); }
  if (WORN.scarf) for (const t of tails) { t.rope.step(dt); t.mesh.visible = shown; if (shown) t.lay(); }
  trail.frame(dt, shown && WORN.dust && me.fly, bm);
}

// put on exactly these pieces (a list of ids). Of two pieces for one slot the later one in the list wins
export function setWorn(ids) { const was = { ...WORN }, slots = {};
  for (const p of PIECES) WORN[p.id] = false;
  for (const id of ids || []) { const p = PIECES.find(q => q.id === id); if (!p) continue; if (slots[p.slot]) WORN[slots[p.slot]] = false; slots[p.slot] = id; WORN[id] = true; }
  WORN.any = PIECES.some(p => WORN[p.id]);
  capG.visible = WORN.cap; collarG.visible = WORN.scarf; capeG.visible = WORN.cape; tipsG.visible = WORN.tips; haloG.visible = WORN.gold;
  if (!WORN.cap) leaf.mesh.visible = false; else if (!was.cap) leaf.rope.ready = false;
  if (!WORN.scarf) for (const t of tails) t.mesh.visible = false; else if (!was.scarf) for (const t of tails) t.rope.ready = false;
  for (const g of fpTips) g.visible = WORN.tips;
  me.coat = WORN.orchid ? 1 : WORN.gold ? 2 : 0; me.wing = WORN.dust ? 1 : 0;
  return wornList(); }
export const wornList = () => PIECES.filter(p => WORN[p.id]).map(p => p.id);

export function setupWear() {
  quietBuild(40417, () => { rnd = seeded(7); build(); });
  me.worn = wornFrame; setWorn([]);
  window.__wear = { PIECES, WORN, setWorn, wornList, get rig() { return rig; }, get head() { return headG; }, get tails() { return tails; }, get leaf() { return leaf; }, get trail() { return trail; }, get fpTips() { return fpTips; } }; // for the tests
}
