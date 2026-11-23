// Honeylight: the building kit for the long run's places: shared materials (stone, moss, earth, clay, wood, leaves), lumpy shapes, and grass clearings.
// The places (burrow.js, gardenway.js, waterway.js, mossway.js, highbranch.js) build with it, so they take the same light as the rest of the world.
import * as THREE from '../three.module.min.js';
import { V3, M4, Q4, lerp, clamp, TAU } from './core.js';
import { scene, mat, addCasters, hidden } from './engine.js';
import { SOLIDS } from './solids.js';

// ---------- random numbers of its own: a place never draws from the game's stream ----------
export const seeded = s0 => { let s = s0 >>> 0; return (a = 1, b) => { s = (s * 1664525 + 1013904223) >>> 0; const v = s / 4294967296; return b === undefined ? v * a : a + v * (b - a); }; };
// run fn while Math.random is a seeded generator (three.js takes a random id for each new object), then put the game's generator back
export function quietBuild(seed, fn) { const game = Math.random, r = seeded(seed); Math.random = () => r(); try { return fn(); } finally { Math.random = game; } }

// ---------- clearings: where the world's grass and the track's grass walls must stand short or not at all ----------
// a disc { x, z, r, soft } or a bar { ax, az, bx, bz, r, soft }: no grass inside r, full grass from r + soft on
export const CLEAR = [];
export function clearAt(x, z) { let k = 1;
  for (const c of CLEAR) { let d; if (c.ax === undefined) d = Math.hypot(x - c.x, z - c.z); else { const dx = c.bx - c.ax, dz = c.bz - c.az, t = clamp(((x - c.ax) * dx + (z - c.az) * dz) / (dx * dx + dz * dz || 1), 0, 1); d = Math.hypot(c.ax + dx * t - x, c.az + dz * t - z); }
    if (d < c.r + c.soft) k = Math.min(k, clamp((d - c.r) / c.soft, 0, 1)); }
  return k; }
export const clearDisc = (x, z, r, soft = 1.5) => CLEAR.push({ x, z, r, soft });
export const clearBar = (ax, az, bx, bz, r, soft = 1.5) => CLEAR.push({ ax, az, bx, bz, r, soft });

// ---------- materials (made in setupRunKit: the shader parts exist only after setupShaders) ----------
export let stoneM, mossM, earthM, sandM, clayM, woodM, caneM, leafM, rootM, barkM;
const LEAF_VERT = `uniform float uTime; uniform vec3 uWind;
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv; varying vec3 vL;
void main(){ vec4 w=modelMatrix*vec4(position,1.0); float ph=dot(w.xz,vec2(0.13,0.11))+uv.y*6.2832; float s=sin(uTime*1.7+ph)+0.5*sin(uTime*2.9+ph*1.7);
  w.xyz+=(vec3(uWind.x,0.0,uWind.y)*(0.25+uWind.z)*0.22*s+vec3(0.0,0.07*s,0.0))*uv.x;
  vW=w.xyz; vL=position; vN=normalize(mat3(modelMatrix)*normal); vUv=uv; vC=vec3(1.0);
  #ifdef USE_COLOR
    vC=color;
  #endif
  gl_Position=projectionMatrix*viewMatrix*w; }`;
const MOSS = `vec3 mossC=mix(vec3(0.05,0.17,0.03),vec3(0.34,0.52,0.09),fbm(vW.xz*1.3+vW.y*0.9+2.0))*(0.65+0.7*vnoise(vW.xz*11.0+vW.y*9.0));`;
export function setupRunKit() { window.__kit = { SOLIDS, CLEAR, clearAt }; /* for the tests: every solid shape of the places, and the grass clearings */ quietBuild(11003, makeMaterials); }
// three.js takes random ids for new materials too, so they are made inside quietBuild like everything else here
function makeMaterials() {
  // stone: grey, cracked, with moss on the faces that look up. The vertex colour tints it; its red channel also says how mossy (1 = as mossy as it gets)
  stoneM = mat(`void main(){ vec3 n=NORMAL; vec3 q=vW*0.9; float a=fbm(q.xz*0.9+q.y*0.7), f=fbm(q.xy*3.1+q.z*2.3);
  vec3 alb=mix(vec3(0.17,0.165,0.16),vec3(0.50,0.47,0.42),a)*(0.72+0.55*f);
  float crack=1.0-smoothstep(0.0,0.05,abs(fbm(q.zy*1.7+q.x*1.3+3.0)-0.5)); alb*=1.0-0.4*crack;
  ${MOSS} float moss=smoothstep(0.34,0.56,fbm(q.xz*0.5+q.y*0.3+5.0)+0.3*n.y)*smoothstep(-0.3,0.5,n.y)*vC.r; alb=mix(alb,mossC,moss*0.92);
  float lich=smoothstep(0.78,0.86,vnoise(q.xy*1.1+q.z+7.0)); alb=mix(alb,vec3(0.62,0.66,0.50),lich*0.3*(1.0-moss));
  alb*=mix(1.0,0.55,vC.b<0.5?1.0:0.0); /* a blue channel under 0.5 marks wet stone: darker and shiny */
  n=normalize(n+(vec3(f,a,fbm(q.zy*3.0))-0.5)*0.5*(1.0-moss*0.6));
  gl_FragColor=vec4(finish(shade(alb,n,vW,mix(0.08,0.7,vC.b<0.5?1.0:0.0)*(1.0-moss),moss*0.5),vW),1.0); }`, { vertexColors: true });
  // moss: a soft bright cushion (the vertex colour tints it)
  mossM = mat(`void main(){ vec3 n=NORMAL; ${MOSS} vec3 alb=mossC*vC; n=normalize(n+(vec3(vnoise(vW.yz*9.0),vnoise(vW.xz*9.0),vnoise(vW.xy*9.0))-0.5)*0.9);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.04,0.6),vW),1.0); }`, { vertexColors: true });
  // earth: dark crumbly soil with small stones in it
  earthM = mat(`void main(){ vec3 n=NORMAL; vec3 q=vW*0.8; float a=fbm(q.xz*1.1+q.y*0.9), f=vnoise(q.xy*7.0+q.z*5.0);
  vec3 alb=mix(vec3(0.085,0.058,0.038),vec3(0.30,0.21,0.13),a)*(0.65+0.7*f)*vC;
  n=normalize(n+(vec3(fbm(q.yz*3.0),fbm(q.xz*3.0),fbm(q.xy*3.0))-0.5)*1.0);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.02,0.0),vW),1.0); }`, { vertexColors: true });
  // sand: the pale dry soil a rabbit kicks out
  sandM = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vW.xz*0.9+vW.y), f=vnoise(vW.xz*9.0+vW.y*7.0);
  vec3 alb=mix(vec3(0.34,0.27,0.17),vec3(0.62,0.52,0.36),a)*(0.75+0.45*f)*vC; n=normalize(n+(vec3(f,0.5,vnoise(vW.zx*8.0))-0.5)*0.6);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.03,0.0),vW),1.0); }`, { vertexColors: true });
  // clay: a fired garden pot. uv.y runs along the pot (throwing rings); pale bloom and a little moss low down
  clayM = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vW.xz*1.2+vW.y*1.1), f=vnoise(vW.xy*8.0+vW.z*6.0); float ring=sin(vUv.y*90.0)*0.5+0.5;
  vec3 alb=mix(vec3(0.50,0.21,0.11),vec3(0.80,0.42,0.24),a)*(0.8+0.3*f)*(0.92+0.08*ring)*vC;
  float bloom=smoothstep(0.5,0.75,fbm(vW.xz*0.7+vW.y*0.5+4.0)); alb=mix(alb,vec3(0.78,0.72,0.64),bloom*0.35);
  ${MOSS} float moss=smoothstep(0.45,0.7,fbm(vW.xz*0.9+8.0))*smoothstep(0.1,0.8,n.y)*0.8; alb=mix(alb,mossC,moss);
  alb*=gl_FrontFacing?1.0:0.55; n=normalize(n+vec3(0.0,(ring-0.5)*0.25,0.0)+(vec3(f)-0.5)*0.2);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.1,0.0),vW),1.0); }`, { vertexColors: true, side: THREE.DoubleSide });
  // wood: weathered boards (grain runs along uv.y)
  woodM = mat(`void main(){ vec3 n=NORMAL; float g=fbm(vec2(vUv.x*14.0+vW.y*0.3,vUv.y*1.3+vW.x*0.11+vW.z*0.07)), f=vnoise(vW.xz*6.0+vW.y*5.0);
  vec3 alb=mix(vec3(0.22,0.17,0.12),vec3(0.52,0.44,0.33),g)*(0.8+0.3*f)*vC; alb=mix(alb,vec3(0.5,0.5,0.47),smoothstep(0.55,0.8,fbm(vW.xz*0.6+3.0))*0.35);
  float crack=1.0-smoothstep(0.0,0.04,abs(fract(vUv.x*3.0+g*0.25)-0.5)); alb*=1.0-0.4*crack;
  ${MOSS} float moss=smoothstep(0.5,0.72,fbm(vW.xz*0.8+6.0))*smoothstep(0.2,0.9,n.y)*0.7; alb=mix(alb,mossC,moss);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.05,0.0),vW),1.0); }`, { vertexColors: true });
  // cane: a dry garden cane with knots (uv.y runs along it)
  caneM = mat(`void main(){ vec3 n=NORMAL; float knot=1.0-smoothstep(0.0,0.012,abs(fract(vUv.y*7.0+0.3)-0.5)); float f=vnoise(vec2(vUv.x*20.0,vUv.y*40.0));
  vec3 alb=mix(vec3(0.60,0.50,0.27),vec3(0.80,0.71,0.44),f)*vC*(1.0-0.45*knot);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.25,0.1),vW),1.0); }`, { vertexColors: true });
  // leaf: thin, lit from behind, moves a little in the wind (uv.x = how much it moves, uv.y = its own rhythm). The vertex colour is the leaf colour
  leafM = mat(`void main(){ vec3 n=NORMAL; vec3 alb=vC*(0.78+0.44*vnoise(vW.xz*3.0+vW.y*2.0));
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.22,0.85),vW),1.0); }`, { vertexColors: true, side: THREE.DoubleSide, vert: LEAF_VERT });
  // root: pale brown wood without bark ridges, mossy on top (the vertex colour tints it; red also says how mossy)
  rootM = mat(`void main(){ vec3 n=NORMAL; vec3 q=vW*1.4; float a=fbm(vec2(q.x+q.z,q.y)*vec2(1.2,0.5)), f=vnoise(q.xy*6.0+q.z*4.0);
  vec3 alb=mix(vec3(0.13,0.09,0.06),vec3(0.40,0.30,0.20),a)*(0.75+0.5*f);
  ${MOSS} float moss=smoothstep(0.36,0.6,fbm(q.xz*0.4+q.y*0.2+1.0)+0.25*n.y)*smoothstep(-0.2,0.6,n.y)*vC.r; alb=mix(alb,mossC,moss*0.9);
  n=normalize(n+(vec3(f,a,fbm(q.zy*3.0))-0.5)*0.5);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.06,moss*0.5),vW),1.0); }`, { vertexColors: true });
  // bark: deep furrows along a limb or a log (uv.x goes round it, uv.y along it in world units), mossy on top.
  // Vertex colour: red = how mossy, green = how light, blue under 0.5 = bare rotten wood (the inside of a hollow log)
  barkM = mat(`void main(){ vec3 n=NORMAL; vec2 q=vec2(vUv.x*22.0,vUv.y*0.55); float w=fbm(q*vec2(0.35,1.0)+3.0), fur=fbm(vec2(q.x+w*2.2,q.y)), f=vnoise(vW.xy*6.0+vW.z*5.0);
  vec3 alb=mix(vec3(0.055,0.04,0.03),vec3(0.33,0.25,0.17),smoothstep(0.3,0.68,fur))*(0.78+0.4*f)*vC.g;
  float bare=vC.b<0.5?1.0:0.0; alb=mix(alb,mix(vec3(0.16,0.10,0.055),vec3(0.50,0.38,0.23),fbm(vec2(vUv.x*9.0,vUv.y*1.6)))*(0.7+0.4*f)*vC.g,bare);
  ${MOSS} float moss=smoothstep(0.34,0.58,fbm(vW.xz*0.45+vW.y*0.3+1.0)+0.3*n.y)*smoothstep(-0.25,0.55,n.y)*vC.r*(1.0-bare); alb=mix(alb,mossC,moss*0.92);
  n=normalize(n+(vec3(fur,f,fbm(q.yx*2.0))-0.5)*0.7*(1.0-moss*0.6));
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.04,moss*0.5),vW),1.0); }`, { vertexColors: true, side: THREE.DoubleSide });
}

// ---------- shapes ----------
const _v = new V3(), _c = new V3(), _o = new V3();
// join parts into one geometry with position, normal, colour and uv.
// A part is { g, m (a Matrix4, optional), c ([r,g,b] or a function of the world point), uv ([u,v] for every vertex, optional: for leafM it is [how much it moves, its rhythm]) }
export function joinParts(parts) {
  const pos = [], nor = [], col = [], uvs = [], nm = new THREE.Matrix3();
  for (const { g, m, c, uv } of parts) { const gg = g.index ? g.toNonIndexed() : g, p = gg.attributes.position, n = gg.attributes.normal, u = uv ? null : gg.attributes.uv; if (m) nm.getNormalMatrix(m);
    for (let i = 0; i < p.count; i++) { _v.set(p.getX(i), p.getY(i), p.getZ(i)); if (m) _v.applyMatrix4(m); pos.push(_v.x, _v.y, _v.z);
      const cc = typeof c === 'function' ? c(_v.x, _v.y, _v.z) : c || [1, 1, 1]; col.push(cc[0], cc[1], cc[2]);
      _o.set(n.getX(i), n.getY(i), n.getZ(i)); if (m) _o.applyMatrix3(nm).normalize(); nor.push(_o.x, _o.y, _o.z);
      if (u) uvs.push(u.getX(i), u.getY(i)); else if (uv) uvs.push(uv[0], uv[1]); else uvs.push(0, 0); } }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return out;
}
// one mesh from parts, added to the world. shadow: 'cast' (default), 'none' (it is left out of the sun's shadow pass)
export function addParts(parts, material, shadow = 'cast') { if (!parts.length) return null; const mesh = new THREE.Mesh(joinParts(parts), material); mesh.frustumCulled = false; scene.add(mesh);
  if (shadow === 'cast') addCasters(mesh); else hidden.push(mesh); return mesh; }
// a matrix from a place, a turn about y (and a tilt), and a size
const _e = new THREE.Euler(), _q = new Q4(), _s = new V3();
export function at(x, y, z, yaw = 0, sx = 1, sy = sx, sz = sx, pitch = 0, roll = 0) { _e.set(pitch, yaw, roll, 'YXZ'); return new M4().compose(new V3(x, y, z), _q.setFromEuler(_e), _s.set(sx, sy, sz)); }
// a bent, tapering, slightly lumpy tube through the points (V3), from radius r0 to r1. uv.y runs along it: from 0 to 1, or in world units when uvLen is true (for barkM)
export function lumpTube(pts, r0, r1, seed = 1, rad = 8, lump = 0.07, uvLen = false) {
  const curve = new THREE.CatmullRomCurve3(pts), len = curve.getLength(), segs = Math.max(4, Math.round(len * 1.6));
  const g = new THREE.TubeGeometry(curve, segs, 1, rad, false), p = g.attributes.position;
  for (let i = 0; i <= segs; i++) { const t = i / segs; curve.getPointAt(t, _c);
    for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; _o.set(p.getX(k), p.getY(k), p.getZ(k)).sub(_c);
      const a = j / rad * TAU, r = lerp(r0, r1, t) * (1 + lump * Math.sin(a * 3 + seed + t * 9) + lump * 0.7 * Math.sin(t * 23 + seed * 2.1));
      _o.multiplyScalar(r); p.setXYZ(k, _c.x + _o.x, _c.y + _o.y, _c.z + _o.z); } }
  { const u = g.attributes.uv, k = uvLen ? len : 1; for (let i = 0; i < u.count; i++) u.setXY(i, u.getY(i), u.getX(i) * k); } // TubeGeometry puts "along" in uv.x: swap, so uv.y runs along like a cylinder
  g.computeVertexNormals(); return g;
}
// a lumpy rock with half sizes sx, sy, sz (a pushed-about ball; its underside is flat-ish)
export function rockGeo(sx, sy, sz, seed, detail = 2) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { _v.set(p.getX(i), p.getY(i), p.getZ(i)); const k = 1 + 0.16 * Math.sin(_v.x * 3.1 + seed) * Math.sin(_v.y * 2.7 + seed * 1.3) + 0.08 * Math.sin(_v.z * 6 + seed * 0.7) + 0.06 * Math.sin(_v.x * 7 + _v.y * 5 + seed * 2);
    _v.multiplyScalar(k); _v.y = Math.max(_v.y, -0.75); p.setXYZ(i, _v.x * sx, _v.y * sy, _v.z * sz); }
  g.computeVertexNormals(); return g;
}
// a soft mound (a molehill, a moss cushion): a flattened dome with a wobbly edge, r wide and h high
export function moundGeo(r, h, seed, seg = 14) {
  const g = new THREE.SphereGeometry(1, seg, 8, 0, TAU, 0, Math.PI / 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { _v.set(p.getX(i), p.getY(i), p.getZ(i)); const a = Math.atan2(_v.z, _v.x), k = 1 + 0.14 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 7 + seed * 2.3);
    p.setXYZ(i, _v.x * r * k, (Math.pow(_v.y, 0.8) * (1 + 0.1 * Math.sin(a * 5 + seed))) * h - 0.15, _v.z * r * k); }
  g.computeVertexNormals(); return g;
}
// a straight round rod from a to b (V3), r0 thick at a and r1 at b. uv.y runs along it
const _up = new V3(0, 1, 0);
export function rodGeo(a, b, r0, r1 = r0, sides = 6) { const d = b.clone().sub(a), L = d.length(), g = new THREE.CylinderGeometry(r1, r0, L, sides, 1);
  g.applyQuaternion(new Q4().setFromUnitVectors(_up, d.normalize())); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); return g; }
// one leaflet: a pointed oval, 1 long (along +y) and 1 wide, folded a little along its middle. Its base is at the origin
export function leafletGeo() { const g = new THREE.BufferGeometry(), P = [[0, 0, 0], [-0.5, 0.35, 0.06], [-0.42, 0.7, 0.05], [0, 1, 0], [0.42, 0.7, 0.05], [0.5, 0.35, 0.06], [0, 0.35, -0.07], [0, 0.7, -0.05]];
  const T = [0, 6, 1, 0, 5, 6, 1, 6, 2, 6, 7, 2, 5, 7, 6, 5, 4, 7, 2, 7, 3, 7, 4, 3], pos = []; for (const i of T) pos.push(...P[i]);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; }
// a matrix that puts a shape made along +y (a leaflet, a blade) at p, pointing along dir, turned by spin about dir, with size s (and width w)
const _qa = new Q4(), _qb = new Q4();
export function along(p, dir, s, spin = 0, w = s) { _qa.setFromUnitVectors(_up, _v.copy(dir).normalize()); _qb.setFromAxisAngle(_up, spin); return new M4().compose(p, _qa.multiply(_qb).clone(), new V3(w, s, w)); }
// a flat blade (a reed leaf, a long grass leaf) along the points (V3): w0 wide at its foot, w1 at its tip, lying flat across "across" (V3).
// uv.x grows from 0 at the foot to sway at the tip (leafM moves the tip most); uv.y is its rhythm
export function bladeGeo(pts, w0, w1, across, sway = 1, phase = 0) { const curve = new THREE.CatmullRomCurve3(pts), n = Math.max(4, pts.length * 3), pos = [], uv = [], idx = [], a = _o.copy(across).normalize().clone();
  for (let i = 0; i <= n; i++) { const t = i / n, p = curve.getPoint(t), w = lerp(w0, w1, t) / 2; pos.push(p.x - a.x * w, p.y - a.y * w, p.z - a.z * w, p.x + a.x * w, p.y + a.y * w, p.z + a.z * w); uv.push(t * sway, phase, t * sway, phase);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; }
// a fern frond, len long: it starts at the origin, rises along +y and arches over toward +z. Small leaves (pinnae) stand out on both sides (x).
// uv.x grows toward the tip (leafM moves the tip most); uv.y is its rhythm
export function frondGeo(len, pairs = 12, arch = 1.3, wide = 0.26, phase = 0) { const pos = [], uv = [], k = len / arch, P = t => { const f = t * arch; return new V3(0, k * Math.sin(f), k * (1 - Math.cos(f))); };
  const tri = (a, b, c, t) => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); for (let i = 0; i < 3; i++) uv.push(t, phase); };
  for (let i = 0; i < pairs; i++) { const t0 = i / pairs, t1 = (i + 1) / pairs, a = P(t0), b = P(t1), tg = b.clone().sub(a).normalize(), rw = 0.02 * len * (1 - t0 * 0.8);
    tri(new V3(-rw, a.y, a.z), new V3(rw, a.y, a.z), new V3(0, b.y, b.z), t0); // the stalk
    if (i < 1) continue; const w = len * wide * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * t0)), 0.8), g = len / pairs * 0.46;
    for (const s of [-1, 1]) tri(a.clone().addScaledVector(tg, -g), a.clone().addScaledVector(tg, g), new V3(s * w, a.y + tg.y * w * 0.45 - w * 0.12, a.z + tg.z * w * 0.45), t0); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g; }
// a whole fern: fronds in a ring that arch outward, as parts for leafM. (x, y, z) is its foot; size is the frond length
export function fernParts(list, x, y, z, size, r, n = 8, col = null) { const a0 = r(TAU);
  for (let i = 0; i < n; i++) { const yaw = a0 + i / n * TAU + r(-0.3, 0.3), L = size * r(0.75, 1.1), k = r(), c = col || [lerp(0.10, 0.24, k), lerp(0.36, 0.56, k), lerp(0.05, 0.12, k)];
    list.push({ g: frondGeo(L, Math.round(clamp(L * 3.2, 10, 24)), r(1.0, 1.5), 0.24, r()), m: at(x, y, z, yaw, 1, 1, 1, r(0.15, 0.55)), c }); } }
