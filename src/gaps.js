// Honeylight: tight spots. Small natural holes and gaps to fly through or under, in three loose lines and a few loners.
// Nothing on screen marks them. GAPS lists each opening (centre, the way through, and its clear radius) for the pass reward.
import * as THREE from '../three.module.min.js';
import { V3, lerp, clamp, TAU } from './core.js';
import { terrainH, GY, HILLS } from './world.js';
import { scene, mat, addCasters, geoParts, puff } from './engine.js';
import { P, PR } from './player.js';
import { tone, sweep, noiseHit, SCALE } from './audio.js';
import { grassMesh } from './plants.js';
import { YA } from './bees.js';

export const GAPS = [];      // { id, line, c: V3, n: V3 (unit, the way through), r: clear radius, half: half depth of the opening }
export const GAP_SOLIDS = []; // capsules { a: V3, b: V3, r } and balls { c: V3, r } in world space, for clipping

let barkM, silverM, earthM, innerM, stoneM, burrowM, leafM, potM, shardM, fungusM, fenceM, caneM, thornM, bramLeafM;
// ---------- materials (made in setupGaps: the shader parts exist only after setupShaders) ----------
function makeMats() {
const NOISE_N = `n=normalize(n+(vec3(fine,rid,fbm(q.zy*3.0))-0.5)*0.55);`;
const BARK = `vec3 n=NORMAL; vec3 q=vW*1.7; float rid=fbm(vec2(q.x+q.z,q.y)*vec2(1.5,0.4)); float fine=fbm(q.xy*4.0+q.z*3.1);
  float crack=1.0-smoothstep(0.0,0.1,abs(fract(rid*3.0+fine)-0.5));
  vec3 alb=mix(vec3(0.10,0.075,0.05),vec3(0.42,0.33,0.24),smoothstep(0.3,0.75,rid))*(0.7+0.6*fine); alb*=1.0-0.5*crack;
  float moss=smoothstep(0.52,0.72,fbm(q.xz*0.35+q.y*0.2+3.0))*smoothstep(-0.1,0.8,n.y); alb=mix(alb,vec3(0.16,0.29,0.07)*(0.7+0.5*fine),moss*0.85);
  float lich=smoothstep(0.8,0.88,vnoise(q.xy*0.9+q.z+7.0)); alb=mix(alb,vec3(0.55,0.60,0.45),lich*0.25*(1.0-moss)); ${NOISE_N}`;
const bored = holes => holes.map(([a, b, r]) => `{ vec3 A=vec3(${a.map(v => v.toFixed(3))}), B=vec3(${b.map(v => v.toFixed(3))}); vec3 ab=B-A; float t=clamp(dot(vL-A,ab)/dot(ab,ab),0.0,1.0); if(length(vL-A-ab*t)<${r.toFixed(3)}) discard; }`).join('');
barkM = (holes = []) => mat(`void main(){ ${bored(holes)} ${BARK} gl_FragColor=vec4(finish(shade(alb,n,vW,0.03+0.08*moss,0.0),vW),1.0); }`, { side: THREE.DoubleSide });
// the pale inside of hollow wood, rotten and dark where it is deep
innerM = (ax = 'y', half = 3.0) => mat(`void main(){ vec3 n=NORMAL; vec3 q=vW*2.0; float deep=mix(0.12,1.0,smoothstep(${(half - 2.2).toFixed(2)},${half.toFixed(2)},abs(vL.${ax}))); float g=fbm(q.xz+q.y); float f=fbm(q.xy*5.0);
  vec3 alb=mix(vec3(0.16,0.09,0.045),vec3(0.50,0.33,0.17),g)*(0.75+0.4*f); n=normalize(n+(vec3(f,g,fbm(q.zy*4.0))-0.5)*0.6);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.03,0.0)*0.8*deep,vW),1.0); }`, { side: THREE.BackSide });
silverM = (holes = []) => mat(`void main(){ ${bored(holes)} vec3 n=NORMAL; vec3 q=vW*1.3; float rid=fbm(vec2((q.x+q.z)*2.5,q.y*0.25)); float fine=fbm(q.xy*6.0+q.z*2.0);
  vec3 alb=mix(vec3(0.30,0.28,0.25),vec3(0.66,0.63,0.58),rid)*(0.75+0.35*fine); float grain=smoothstep(0.45,0.5,abs(fract(rid*7.0)-0.5)); alb*=1.0-0.35*grain;
  float lich=smoothstep(0.72,0.8,vnoise(q.xy*1.5+q.z)); alb=mix(alb,vec3(0.62,0.70,0.40),lich*0.5); ${NOISE_N}
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.05,0.0),vW),1.0); }`, { side: THREE.DoubleSide });
stoneM = mat(`void main(){ vec3 n=NORMAL; vec3 q=vW*0.9; float a=fbm(q.xz+q.y*0.7); float fine=fbm(q.xy*5.0+q.z*3.0); float rid=a;
  vec3 alb=mix(vec3(0.20,0.19,0.17),vec3(0.46,0.43,0.38),a)*(0.8+0.3*fine);
  float moss=smoothstep(0.55,0.75,fbm(q.xz*0.6+5.0))*smoothstep(0.2,0.9,n.y); alb=mix(alb,vec3(0.18,0.30,0.08)*(0.7+0.5*fine),moss*0.8);
  float lich=smoothstep(0.78,0.85,vnoise(q.xy*1.7+q.z*1.3)); alb=mix(alb,vec3(0.62,0.58,0.32),lich*0.3*(1.0-moss)); ${NOISE_N}
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.04,0.0),vW),1.0); }`);
earthM = holes => mat(`void main(){ ${bored(holes)} vec3 n=NORMAL; vec3 q=vW*1.1; float a=fbm(q.xz+q.y); float fine=fbm(q.xz*6.0+q.y*2.0); float rid=a;
  vec3 alb=mix(vec3(0.20,0.13,0.07),vec3(0.42,0.31,0.19),a)*(0.75+0.4*fine);
  float grass=smoothstep(0.1,0.6,n.y)*smoothstep(0.25,0.5,fbm(q.xz*0.8+2.0)); alb=mix(alb,vec3(0.22,0.36,0.09)*(0.7+0.6*fine),grass);
  float peb=smoothstep(0.82,0.9,vnoise(q.xz*7.0+q.y*3.0)); alb=mix(alb,vec3(0.40,0.37,0.32),peb*0.6*(1.0-grass)); ${NOISE_N}
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.02,0.0),vW),1.0); }`, { side: THREE.DoubleSide });
burrowM = mat(`void main(){ vec3 n=NORMAL; vec3 q=vW*1.6; float deep=mix(0.06,1.0,smoothstep(2.0,4.3,abs(vL.z))); float a=fbm(q.xz+q.y); float f=fbm(q.xy*6.0);
  vec3 alb=mix(vec3(0.12,0.075,0.04),vec3(0.36,0.25,0.14),a)*(0.7+0.5*f); float root=smoothstep(0.47,0.5,abs(fract(fbm(q.xz*0.7)*5.0)-0.5));
  alb=mix(alb,vec3(0.55,0.42,0.28),root*0.6); n=normalize(n+(vec3(f,a,fbm(q.zy*4.0))-0.5)*0.7);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.02,0.0)*0.75*deep,vW),1.0); }`, { side: THREE.BackSide });
leafM = mat(`void main(){ vec3 n=NORMAL; vec2 uv=vUv; float vein=1.0-smoothstep(0.0,0.012,abs(uv.y-0.5));
  float side=1.0-smoothstep(0.0,0.008,abs(fract((uv.x*7.0)-abs(uv.y-0.5)*3.0)-0.5)-0.47); float f=fbm(uv*vec2(14.0,9.0)); float spot=smoothstep(0.7,0.8,vnoise(uv*vec2(30.0,18.0)));
  vec3 alb=mix(vec3(0.42,0.20,0.06),vec3(0.72,0.44,0.14),f); alb=mix(alb,vec3(0.80,0.58,0.22),vein*0.7+side*0.35); alb*=1.0-0.45*spot;
  float edge=smoothstep(0.0,0.08,min(uv.x,1.0-uv.x)); alb*=0.55+0.45*edge; n=normalize(n+(vec3(f,fbm(uv*20.0),f)-0.5)*0.4);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.06,0.35),vW),1.0); }`, { side: THREE.DoubleSide });
potM = mat(`void main(){ vec3 n=NORMAL; vec3 q=vW*2.0; float a=fbm(q.xz*0.7+q.y*0.7); float f=fbm(q.xy*8.0+q.z*5.0);
  vec3 alb=mix(vec3(0.56,0.25,0.12),vec3(0.80,0.42,0.22),a)*(0.85+0.25*f);
  float bloom=smoothstep(0.55,0.8,fbm(q.xz*0.5+q.y*0.3+9.0)); alb=mix(alb,vec3(0.78,0.76,0.66),bloom*0.55);
  float moss=smoothstep(0.62,0.8,fbm(q.xz*0.9+1.0))*smoothstep(0.1,0.8,n.y); alb=mix(alb,vec3(0.18,0.32,0.08),moss*0.8);
  n=normalize(n+(vec3(f,a,fbm(q.zy*5.0))-0.5)*0.25); gl_FragColor=vec4(finish(shade(alb,n,vW,0.05,0.0),vW),1.0); }`, { side: THREE.DoubleSide });
shardM = mat(`void main(){ vec3 n=NORMAL; vec3 q=vW*3.0; float f=fbm(q.xy+q.z); vec3 alb=mix(vec3(0.62,0.33,0.18),vec3(0.86,0.55,0.34),f);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.04,0.0),vW),1.0); }`, { side: THREE.DoubleSide });
fungusM = mat(`void main(){ vec3 n=NORMAL; vec3 q=vL*2.2; float r=length(vL.xz); float band=0.5+0.5*sin(r*5.5+fbm(q.xz)*3.0); float f=fbm(q.xz*3.0+q.y);
  vec3 top=mix(vec3(0.42,0.24,0.10),vec3(0.86,0.62,0.30),band)*(0.8+0.3*f); vec3 under=vec3(0.88,0.80,0.62)*(0.85+0.2*f);
  float edge=smoothstep(0.75,1.0,r/2.6); top=mix(top,vec3(0.95,0.88,0.66),edge*0.7);
  vec3 alb=mix(under,top,smoothstep(-0.3,0.3,n.y)); gl_FragColor=vec4(finish(shade(alb,n,vW,0.08,0.2),vW),1.0); }`, { side: THREE.DoubleSide });
fenceM = mat(`void main(){ vec3 n=NORMAL; vec3 q=vL; float grain=fbm(vec2(q.x*9.0+q.z*9.0,q.y*0.5)); float f=fbm(q.xy*vec2(14.0,2.0)+q.z*7.0);
  vec3 alb=mix(vec3(0.34,0.32,0.29),vec3(0.64,0.60,0.54),grain)*(0.8+0.3*f); float crack=smoothstep(0.46,0.5,abs(fract(grain*6.0)-0.5)); alb*=1.0-0.4*crack;
  float lich=smoothstep(0.74,0.82,vnoise(q.xy*vec2(3.0,1.5)+q.z*4.0)); alb=mix(alb,vec3(0.64,0.72,0.38),lich*0.6);
  float moss=smoothstep(0.62,0.8,fbm(q.xy*vec2(2.0,0.6)+3.0))*smoothstep(1.6,0.0,vL.y); alb=mix(alb,vec3(0.17,0.30,0.08),moss);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.04,0.0),vW),1.0); }`);
caneM = mat(`void main(){ vec3 n=NORMAL; vec3 q=vW*3.0; float f=fbm(q.xy+q.z); vec3 alb=mix(vec3(0.30,0.10,0.14),vec3(0.36,0.42,0.14),fbm(q.xz*0.4+q.y*0.3)); alb*=0.75+0.4*f;
  float bloom=smoothstep(0.5,0.8,fbm(q.xy*2.0+5.0)); alb=mix(alb,vec3(0.55,0.50,0.58),bloom*0.35);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.12,0.1),vW),1.0); }`);
thornM = mat(`void main(){ vec3 n=NORMAL; vec3 alb=mix(vec3(0.75,0.45,0.30),vec3(0.35,0.12,0.08),vUv.y); gl_FragColor=vec4(finish(shade(alb,n,vW,0.2,0.0),vW),1.0); }`);
bramLeafM = mat(`void main(){ vec3 n=NORMAL; vec2 uv=vUv; float f=fbm(uv*12.0); float vein=1.0-smoothstep(0.0,0.03,abs(uv.x-0.5));
  vec3 alb=mix(vec3(0.07,0.17,0.04),vec3(0.20,0.36,0.08),f); alb=mix(alb,vec3(0.32,0.42,0.14),vein*0.5);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.10,0.35),vW),1.0); }`, { side: THREE.DoubleSide });

}

// ---------- shapes ----------
// a bent, tapering, slightly lumpy tube through the points
function tube(pts, r0, r1, m, seed = 1, rad = 10) {
  const curve = new THREE.CatmullRomCurve3(pts), segs = Math.max(8, Math.round(curve.getLength() * 2.2));
  const g = new THREE.TubeGeometry(curve, segs, 1, rad, false), p = g.attributes.position, c = new V3(), o = new V3();
  for (let i = 0; i <= segs; i++) { const t = i / segs; curve.getPointAt(t, c);
    for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; o.set(p.getX(k), p.getY(k), p.getZ(k)).sub(c);
      const a = j / rad * TAU, r = lerp(r0, r1, t) * (1 + 0.07 * Math.sin(a * 3 + seed + t * 9) + 0.05 * Math.sin(t * 23 + seed * 2.1));
      o.multiplyScalar(r); p.setXYZ(k, c.x + o.x, c.y + o.y, c.z + o.z); } }
  g.computeVertexNormals(); const mesh = new THREE.Mesh(g, m);
  // round caps at both ends so a cut end does not show the hollow tube
  for (const [pt, r] of [[pts[0], r0], [pts[pts.length - 1], r1]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, rad, 6), m); s.position.copy(pt); mesh.add(s); }
  return mesh;
}
// a lumpy rock: an icosahedron pushed about
function rock(sx, sy, sz, seed) {
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, v = new V3();
  for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)); const k = 1 + 0.16 * Math.sin(v.x * 3.1 + seed) * Math.sin(v.y * 2.7 + seed * 1.3) + 0.08 * Math.sin(v.z * 6 + seed * 0.7);
    v.multiplyScalar(k); v.y = Math.max(v.y, -0.7); p.setXYZ(i, v.x * sx, v.y * sy, v.z * sz); }
  g.computeVertexNormals(); return new THREE.Mesh(g, stoneM);
}
// a hollow tube: bark outside, rotten wood inside, a pale ring at each end
function hollowLog(len, ro, ri, seed) {
  const grp = new THREE.Group(), N = 28, L = 10, pos = [], idx = [], ip = [], ii = [];
  const jag = (a, s) => 0.35 * Math.sin(a * 5 + seed * s) + 0.25 * Math.sin(a * 11 + seed) + 0.2 * Math.sin(a * 3 + s);
  for (let i = 0; i <= L; i++) for (let j = 0; j <= N; j++) { const a = j / N * TAU, t = i / L, ex = i === 0 ? jag(a, -1) : i === L ? jag(a, 1) : 0, y = (t - 0.5) * len + ex;
    const r = ro * (1 + 0.06 * Math.sin(a * 4 + t * 5 + seed)); pos.push(Math.cos(a) * r, y, Math.sin(a) * r); ip.push(Math.cos(a) * ri, y, Math.sin(a) * ri); }
  for (let i = 0; i < L; i++) for (let j = 0; j < N; j++) { const p = i * (N + 1) + j, q = p + N + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
  const mk = (arr, m) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.setIndex(idx); g.computeVertexNormals(); grp.add(new THREE.Mesh(g, m)); };
  mk(pos, barkM()); mk(ip, innerM('y', len / 2));
  for (const i of [0, L]) { const rp = [], ri2 = []; for (let j = 0; j <= N; j++) { const k = (i * (N + 1) + j) * 3; rp.push(pos[k], pos[k + 1], pos[k + 2], ip[k], ip[k + 1], ip[k + 2]); }
    for (let j = 0; j < N; j++) { const p = j * 2; ri2.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); g.setIndex(ri2); g.computeVertexNormals(); grp.add(new THREE.Mesh(g, silverM())); }
  return grp;
}

// ---------- placing ----------
const _m = new THREE.Matrix4();
const roots = [];
// follow: tip the piece forward or back to lie along the slope of the ground (local z), so a tunnel on a hillside is not buried at its uphill end
function put(grp, x, z, yaw, dy = 0, follow = false) { grp.rotation.order = 'YXZ'; grp.rotation.y = yaw;
  let y = terrainH(x, z); if (follow) { const fx = Math.sin(yaw) * 4, fz = Math.cos(yaw) * 4, a = terrainH(x + fx, z + fz), b = terrainH(x - fx, z - fz); grp.rotation.x = -Math.atan2(a - b, 8); y = Math.max(y, (a + b) / 2); }
  grp.position.set(x, y + dy, z); scene.add(grp); roots.push(grp); grp.updateMatrixWorld(true); return grp; }
// slot (optional): { hw, h0, h1 } a tall gap, half width hw across local x, from h0 to h1 above the centre's height
function gap(grp, id, line, c, n, r, half = 0.4, slot = null) { GAPS.push({ id, spot: id.slice(0, 2), line, c: new V3(...c).applyMatrix4(grp.matrixWorld), n: new V3(...n).transformDirection(grp.matrixWorld), t: new V3(1, 0, 0).transformDirection(grp.matrixWorld), r, half, slot, lc: c }); }
function solidCap(grp, a, b, r) { GAP_SOLIDS.push({ a: new V3(...a).applyMatrix4(grp.matrixWorld), b: new V3(...b).applyMatrix4(grp.matrixWorld), r }); }
function trunkR(y) { const L = [[21.5, GY - 5], [16.5, GY + 3], [13.7, GY + 9], [12.5, GY + 13]]; // the hive tree's flare (see trunkGeo)
  for (let i = 0; i + 1 < L.length; i++) if (y <= L[i + 1][1]) return lerp(L[i][0], L[i + 1][0], clamp((y - L[i][1]) / (L[i + 1][1] - L[i][1]), 0, 1)); return 12.5; }

export const GAP_SPOTS = {}; // id -> { x, y, z } a good place to look at it from, for the look tool

export function setupGaps() {
  const gameRandom = Math.random; let rs = 20261123; Math.random = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
  makeMats(); // inside the own random stream: each new material draws numbers for its id too
  const view = (id, grp, cam, at) => { GAP_SPOTS[id] = { cam: new V3(...cam).applyMatrix4(grp.matrixWorld), at: new V3(...at).applyMatrix4(grp.matrixWorld) }; };

  // ===== Line 1: the Home Tree. Easy (clear radius about 1.4) =====
  { // H1 root arch: a root lifts out of the flare and dives back into the ground. Local x runs out from the trunk
    const a = -2.3, grp = new THREE.Group(), r0 = 16.8, gy = terrainH(Math.cos(a) * 24, Math.sin(a) * 24);
    grp.add(tube([new V3(r0, -1.6, 0), new V3(r0 + 2.0, 1.6, 0.2), new V3(r0 + 4.5, 3.4, -0.1), new V3(r0 + 7.2, 2.6, 0.2), new V3(r0 + 9.0, 0.3, 0), new V3(r0 + 10.0, -1.2, 0)], 0.95, 0.55, barkM(), 1));
    grp.add(tube([new V3(r0 + 6.8, 2.4, 0.2), new V3(r0 + 8.4, 2.1, 1.6), new V3(r0 + 9.8, -0.6, 2.4)], 0.32, 0.18, barkM(), 2)); // a side root
    grp.position.set(0, gy, 0); grp.rotation.y = -a; scene.add(grp); roots.push(grp); grp.updateMatrixWorld(true);
    gap(grp, 'h1', 'home', [r0 + 5.0, 1.15, 0], [0, 0, 1], 1.35); view('h1', grp, [r0 + 4.5, 1.6, 9], [r0 + 5, 1.3, 0]);
    solidCap(grp, [r0 + 2.0, 1.6, 0], [r0 + 4.5, 3.4, 0], 0.85); solidCap(grp, [r0 + 4.5, 3.4, 0], [r0 + 7.2, 2.6, 0], 0.75); solidCap(grp, [r0 + 7.2, 2.6, 0], [r0 + 9.0, 0.3, 0], 0.65);
  }
  { // H2 two shelf fungi on the trunk, one above the other: fly between them
    const a = -1.6, gy = terrainH(Math.cos(a) * 22, Math.sin(a) * 22), grp = new THREE.Group(), y1 = 3.2, y2 = 6.0;
    for (const [y, s] of [[y1, 1.0], [y2, 0.85], [y2 + 2.4, 0.55]]) { const rt = trunkR(gy + y) - 0.6; for (let k = -1; k <= 1; k++) {
      const g = new THREE.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2); g.scale(3.0 * s * (1 - Math.abs(k) * 0.35), 0.55 * s, 2.2 * s * (1 - Math.abs(k) * 0.3));
      const b = new THREE.SphereGeometry(1, 20, 6, 0, TAU, Math.PI / 2, Math.PI / 2); b.scale(3.0 * s * (1 - Math.abs(k) * 0.35), 0.18 * s, 2.2 * s * (1 - Math.abs(k) * 0.3));
      for (const geo of [g, b]) { const m = new THREE.Mesh(geo, fungusM); m.position.set(rt + 0.6, y - Math.abs(k) * 0.35, k * 2.6 * s); m.rotation.z = 0.05; grp.add(m); } } }
    grp.position.set(0, gy, 0); grp.rotation.y = -a; scene.add(grp); roots.push(grp); grp.updateMatrixWorld(true);
    const rm = trunkR(gy + (y1 + y2) / 2);
    gap(grp, 'h2', 'home', [rm + 1.4, (y1 + y2) / 2, 0], [0, 0, 1], 1.15); view('h2', grp, [rm + 7, 4.2, 6.5], [rm + 1, 4.4, 0]);
    solidCap(grp, [trunkR(gy + y1) - 0.6, y1 + 0.1, 0], [trunkR(gy + y1) + 2.2, y1 + 0.1, 0], 0.45); solidCap(grp, [trunkR(gy + y2) - 0.6, y2 + 0.1, 0], [trunkR(gy + y2) + 1.9, y2 + 0.1, 0], 0.4);
  }
  { // H3 an old stump split down the middle: fly through the crack
    const a = -0.9, grp = new THREE.Group(), R = 2.9, H = 4.6, g2 = 1.35;   // g2: half the width of the crack
    const woodFace = mat(`void main(){ vec3 n=NORMAL; vec3 q=vL; float fib=fbm(vec2(q.z*3.0,q.y*0.6)); float ring=0.5+0.5*sin(length(q.xz)*7.0+fbm(q.xz)*4.0);
      vec3 alb=mix(vec3(0.36,0.24,0.13),vec3(0.66,0.50,0.30),fib*0.7+0.3*ring); float rot=smoothstep(0.55,0.8,fbm(q.zy*1.3+4.0)); alb=mix(alb,vec3(0.20,0.12,0.06),rot*0.7);
      n=normalize(n+(vec3(fib,fbm(q.zy*5.0),fib)-0.5)*0.5); gl_FragColor=vec4(finish(shade(alb,n,vW,0.03,0.0),vW),1.0); }`, { side: THREE.DoubleSide });
    for (const s of [-1, 1]) { const half = new THREE.Group(), N = 22, L = 8, pos = [], idx = [];
      const top = (u) => H - 0.5 + 0.55 * Math.sin(u * 9 + s * 2) + 0.35 * Math.sin(u * 23 + s) - 0.9 * Math.pow(Math.abs(u - 0.5) * 2, 3); // jagged broken top
      for (let i = 0; i <= L; i++) for (let j = 0; j <= N; j++) { const u = j / N, th = -Math.PI / 2 + u * Math.PI, t = i / L, y = lerp(-0.6, top(u), t);
        const r = R * (1 + 0.32 * Math.pow(1 - t, 3) + 0.05 * Math.sin(th * 7 + y)); pos.push(Math.cos(th) * r * 0.62, y, Math.sin(th) * r); }
      for (let i = 0; i < L; i++) for (let j = 0; j < N; j++) { const p = i * (N + 1) + j, q = p + N + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); half.add(new THREE.Mesh(g, barkM()));
      // the split face and the broken top, pale wood
      const fp = [], fi = []; for (let j = 0; j <= N; j++) { const u = j / N, th = -Math.PI / 2 + u * Math.PI, z = Math.sin(th) * R; fp.push(0, -0.6, z * 1.3, 0, top(u), z); }
      for (let j = 0; j < N; j++) { const p = j * 2; fi.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setIndex(fi); fg.computeVertexNormals(); half.add(new THREE.Mesh(fg, woodFace));
      const tp = [], ti = []; for (let j = 0; j <= N; j++) { const u = j / N, th = -Math.PI / 2 + u * Math.PI, y = top(u); tp.push(0, y, Math.sin(th) * R, Math.cos(th) * R * 0.62, y, Math.sin(th) * R); }
      for (let j = 0; j < N; j++) { const p = j * 2; ti.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3)); tg.setIndex(ti); tg.computeVertexNormals(); half.add(new THREE.Mesh(tg, woodFace));
      half.position.x = s * g2; half.rotation.y = s > 0 ? 0 : Math.PI; half.rotation.z = -s * 0.06; grp.add(half);
      for (let k = 0; k < 2; k++) { const ang = (k ? 0.5 : -0.5); const x0 = s * (g2 + 1.0), z0 = Math.sin(ang) * R * 0.9;
        grp.add(tube([new V3(x0, 0.4, z0), new V3(x0 + s * 1.8, 0.1, z0 * 1.4), new V3(x0 + s * 3.4, -0.5, z0 * 1.8)], 0.55, 0.22, barkM(), 20 + k + (s > 0 ? 2 : 0))); } }
    put(grp, Math.cos(a) * 25, Math.sin(a) * 25, -a + Math.PI / 2, -0.15);
    gap(grp, 'h3', 'home', [0, 1.9, 0], [0, 0, 1], 1.15, 2.4, { hw: g2 - 0.1, h0: -0.2, h1: H - 1.2 }); view('h3', grp, [2.2, 2.6, 8.5], [0, 1.9, 0]);
    for (const s of [-1, 1]) { solidCap(grp, [s * (g2 + 0.9), -0.5, -1.4], [s * (g2 + 0.9), H - 0.8, -1.4], 0.9); solidCap(grp, [s * (g2 + 0.9), -0.5, 1.4], [s * (g2 + 0.9), H - 0.8, 1.4], 0.9); solidCap(grp, [s * (g2 + 0.9), -0.5, 0], [s * (g2 + 0.9), H - 0.8, 0], 0.9); }
  }
  { // H4 a dropped twig lying across two pebbles: skim under it
    const a = -0.25, grp = new THREE.Group();
    const p1 = rock(1.2, 1.0, 1.0, 1.3), p2 = rock(1.0, 1.15, 1.1, 2.9); p1.position.set(-2.6, 0.45, 0); p2.position.set(2.7, 0.5, 0.1); grp.add(p1, p2);
    grp.add(tube([new V3(-5.2, 0.2, 0.4), new V3(-2.6, 1.85, 0.1), new V3(0, 2.05, 0), new V3(2.7, 2.0, -0.1), new V3(5.8, 1.1, -0.5), new V3(7.2, 0.25, -0.7)], 0.36, 0.2, barkM(), 6));
    grp.add(tube([new V3(1.4, 2.05, 0), new V3(2.2, 2.9, 0.9), new V3(2.6, 3.8, 1.6)], 0.14, 0.06, barkM(), 7)); // a little side shoot
    put(grp, Math.cos(a) * 27, Math.sin(a) * 27, -a + Math.PI / 2, -0.1);
    gap(grp, 'h4', 'home', [0, 0.9, 0], [0, 0, 1], 1.0); view('h4', grp, [1.5, 1.4, 7.5], [0, 0.9, 0]);
    solidCap(grp, [-2.6, 1.85, 0], [2.7, 2.0, 0], 0.4); GAP_SOLIDS.push({ c: p1.getWorldPosition(new V3()), r: 1.05 }, { c: p2.getWorldPosition(new V3()), r: 1.05 });
  }

  // ===== Line 2: the Old Wall, beside the fallen tree. Medium (clear radius about 1.1) =====
  const wallYaw = Math.atan2(-0.98, 0.18); // local z runs along the line, toward the orchard
  const wy = -Math.atan2(0.98, 0.18) + Math.PI / 2; // turns local +z to point down the line
  { // W1 a hollow branch lying in the grass: fly through it
    const grp = new THREE.Group(), h = hollowLog(6.5, 1.65, 1.2, 1.7); h.rotation.x = Math.PI / 2; h.position.y = 1.35; grp.add(h);
    grp.add(tube([new V3(1.4, 2.4, -1.5), new V3(2.6, 3.6, -1.9), new V3(3.1, 4.8, -2.6)], 0.28, 0.12, barkM(), 8)); // a twig still on it
    put(grp, 2, -62, wy, -0.25, true);
    gap(grp, 'w1', 'wall', [0, 1.35, 0], [0, 0, 1], 1.1, 3.0); view('w1', grp, [4.5, 2.6, -7], [0, 1.4, 0]);
    for (let i = 0; i < 8; i++) { const t = i / 8 * TAU; solidCap(grp, [Math.cos(t) * 1.45, 1.35 + Math.sin(t) * 1.45, -3.2], [Math.cos(t) * 1.45, 1.35 + Math.sin(t) * 1.45, 3.2], 0.3); }
  }
  { // W2 a crumbling dry-stone wall with three stones missing: low, middle and high
    const grp = new THREE.Group(), W = 15, H = 5.2, holes = [[-4.2, 0.95], [0.4, 2.55], [4.6, 4.1]], hr = 1.0;
    let seed = 1; const rowH = 0.85, stones = [];
    for (let y = 0.4, row = 0; y < H; y += rowH, row++) {
      let x = -W / 2 + (row % 2) * 0.6; const top = y + rowH > H, endX = W / 2 - (top ? 1.5 : 0) - Math.max(0, (y - 3.4)) * 0.8;
      while (x < endX) { const w = 1.2 + ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1 * 1.0; seed++;
        const cx = x + w / 2, cy = y; let skip = false; for (const [hx, hy] of holes) if (Math.abs(cx - hx) < hr + w * 0.42 && Math.abs(cy - hy) < hr + rowH * 0.42) skip = true;
        if (!skip && cx < endX) { const s = rock(w * 0.52, rowH * 0.55, 0.85, seed); s.userData.sc = [w * 0.52, rowH * 0.55, 0.85]; stones.push(s); s.position.set(cx, cy, (Math.sin(seed * 3.7) * 0.12)); s.rotation.set(0, Math.sin(seed) * 0.1, Math.sin(seed * 1.7) * 0.06); grp.add(s); }
        x += w; } }
    for (let i = 0; i < 4; i++) { const s = rock(0.7, 0.45, 0.6, 30 + i); s.position.set(-5 + i * 3.2, 0.2, 1.4 + (i % 2) * 0.5); grp.add(s); } // fallen stones in the grass
    put(grp, 0, -74, wy, -0.2);
    // the wall is solid stone by stone (each an ellipsoid a little inside the lumpy rock), so the holes are exactly as big as they look
    const wall = { stones: stones.map(m => ({ inv: new THREE.Matrix4().copy(m.matrixWorld).invert(), rot: new THREE.Quaternion().setFromRotationMatrix(m.matrixWorld), s: m.userData.sc.map(v => v * 0.92) })),
      inv: new THREE.Matrix4().copy(grp.matrixWorld).invert(), box: [-W / 2 - 1.5, W / 2 + 1.5, -1, H + 1, -1.2, 1.2] };
    GAP_SOLIDS.push(wall);
    // each hole's clear radius: the widest circle round its centre that touches no stone
    holes.forEach(([hx, hy], i) => { let r = 0.4; const c = new V3(hx, hy, 0).applyMatrix4(grp.matrixWorld), t = new V3(1, 0, 0).transformDirection(grp.matrixWorld), u = new V3(0, 1, 0).transformDirection(grp.matrixWorld);
      for (let rr = 0.4; rr < 2.2; rr += 0.05) { let free = true; for (let k = 0; k < 24 && free; k++) { const a = k / 24 * TAU; _gp.copy(c).addScaledVector(t, Math.cos(a) * rr).addScaledVector(u, Math.sin(a) * rr); if (stoneHit(wall, _gp, 0)) free = false; } if (!free) break; r = rr; }
      gap(grp, 'w2' + 'abc'[i], 'wall', [hx, hy, 0], [0, 0, 1], r, 0.9); });
    view('w2', grp, [2.5, 2.8, -9], [0, 2.3, 0]);
  }
  { // W3 a branch propped against a rock: fly under it
    const grp = new THREE.Group(), r = rock(1.7, 1.6, 1.5, 4.4); r.position.set(3.2, 0.9, 0); grp.add(r);
    grp.add(tube([new V3(-5.5, 0.1, 0.3), new V3(-2.5, 1.5, 0.1), new V3(0.5, 2.55, 0), new V3(2.6, 2.75, -0.1), new V3(4.1, 2.5, -0.2)], 0.48, 0.3, barkM(), 9));
    grp.add(tube([new V3(-1.0, 2.0, 0), new V3(-1.5, 3.1, 0.9), new V3(-1.3, 4.0, 1.6)], 0.18, 0.08, barkM(), 10));
    put(grp, -3, -85, wy + Math.PI / 2 + 0.25, -0.1);
    gap(grp, 'w3', 'wall', [0.4, 1.05, 0], [0, 0, 1], 0.9); view('w3', grp, [1, 1.3, 7.5], [0.5, 1.1, 0]);
    solidCap(grp, [-2.5, 1.5, 0], [0.5, 2.55, 0], 0.5); solidCap(grp, [0.5, 2.55, 0], [2.6, 2.75, 0], 0.45); GAP_SOLIDS.push({ c: r.getWorldPosition(new V3()), r: 1.6 });
  }
  { // W4 a hazel shoot bent over into a hoop, its tip caught in the grass
    const grp = new THREE.Group();
    grp.add(tube([new V3(-1.35, -0.3, 0), new V3(-1.4, 1.2, 0), new V3(-0.9, 2.3, 0.05), new V3(0, 2.65, 0), new V3(0.9, 2.3, -0.05), new V3(1.35, 1.2, 0), new V3(1.4, -0.2, 0.1)], 0.22, 0.1, barkM(), 11));
    grp.add(tube([new V3(-1.5, -0.3, 0.3), new V3(-1.8, 2.2, 0.4), new V3(-1.7, 4.0, 0.6)], 0.22, 0.12, barkM(), 12)); // the stool it grows from
    for (let i = 0; i < 7; i++) { const t = i / 6, a = lerp(-2.4, 2.4, t), g = new THREE.PlaneGeometry(0.9, 1.1, 2, 2); g.translate(0, 0.55, 0);
      const l = new THREE.Mesh(g, bramLeafM); l.position.set(Math.sin(a * 0.6) * 1.35, 0.1 + Math.cos(a * 0.6) * 2.5 + 0.1, (i % 2 ? 0.25 : -0.25)); l.rotation.set(0.6 * (i % 2 ? 1 : -1), a, a * 0.5); grp.add(l); }
    put(grp, -9, -94, wy, -0.1);
    gap(grp, 'w4', 'wall', [0, 1.2, 0], [0, 0, 1], 1.05); view('w4', grp, [1.8, 1.7, -6.5], [0, 1.3, 0]);
    solidCap(grp, [-1.35, 0, 0], [-0.9, 2.3, 0], 0.22); solidCap(grp, [-0.9, 2.3, 0], [0.9, 2.3, 0], 0.25); solidCap(grp, [0.9, 2.3, 0], [1.4, 0, 0], 0.22);
  }
  { // W5 an old flowerpot on its side with its bottom broken out: in the mouth, out the back
    const grp = new THREE.Group(), L = 4.2, Rm = 2.0, Rb = 1.45, N = 32;
    const pts = [new THREE.Vector2(Rb, -L / 2), new THREE.Vector2(Rm, L / 2 - 0.5), new THREE.Vector2(Rm + 0.28, L / 2 - 0.45), new THREE.Vector2(Rm + 0.3, L / 2), new THREE.Vector2(Rm - 0.12, L / 2), new THREE.Vector2(Rm - 0.14, L / 2 - 0.45), new THREE.Vector2(Rb - 0.14, -L / 2)];
    const g = new THREE.LatheGeometry(pts, N); g.rotateX(Math.PI / 2); const pot = new THREE.Mesh(g, potM); pot.position.y = Rm + 0.12; grp.add(pot);
    for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.CircleGeometry(0.5 + i * 0.12, 5), shardM); s.position.set(-1.8 + i * 1.2, 0.08 + i * 0.03, -L / 2 - 1.2 - (i % 2) * 0.7); s.rotation.set(-Math.PI / 2 + 0.2 * (i - 1.5), 0, i); grp.add(s); }
    put(grp, -6, -104, wy, -0.35, true);
    gap(grp, 'w5', 'wall', [0, Rm + 0.12, 0], [0, 0, 1], 1.15, 2.1); view('w5', grp, [2.8, 2.6, 7.5], [0, 2.0, 0]);
    for (let i = 0; i < 8; i++) { const t = i / 8 * TAU; solidCap(grp, [Math.cos(t) * Rb, Rm + 0.12 + Math.sin(t) * Rb, -L / 2], [Math.cos(t) * Rm, Rm + 0.12 + Math.sin(t) * Rm, L / 2], 0.2); }
  }

  // ===== Line 3: Rabbit Bank, the quiet hill to the southwest. Hard (clear radius about 0.85) =====
  const HL = HILLS[1], toTop = Math.atan2(HL.z - -150, HL.x - -80), ry = -toTop + Math.PI / 2; // local +z points up the hill
  { // R1 a rabbit run through a grassy bank: in one hole, out the back
    const grp = new THREE.Group(), A = [0, 1.0, -4.2], B = [0, 1.25, 4.2], tr = 0.95;
    const g = new THREE.SphereGeometry(1, 40, 24, 0, TAU, 0, Math.PI * 0.62); g.scale(5.2, 3.0, 5.6); g.translate(0, -0.6, 0);
    grp.add(new THREE.Mesh(g, earthM([[A.map((v, i) => i === 2 ? v - 2 : v), B.map((v, i) => i === 2 ? v + 2 : v), tr]])));
    const tg = new THREE.CylinderGeometry(tr, tr, 8.6, 18, 6, true); tg.rotateX(Math.PI / 2); const tm = new THREE.Mesh(tg, burrowM); tm.position.set(0, 1.12, 0); tm.rotation.x = -0.03; grp.add(tm);
    for (const z of [-4.6, 4.6]) { const sp = new THREE.Mesh(new THREE.CircleGeometry(1.6, 9), earthM([])); sp.rotation.x = -Math.PI / 2 + 0.08; sp.position.set(0.2, 0.02, z * 1.25); grp.add(sp); } // kicked-out earth at each door
    for (let i = 0; i < 5; i++) { const s = rock(0.35, 0.25, 0.3, 50 + i); s.position.set(Math.sin(i * 2.3) * 3.2, 0.15, (i % 2 ? 5.4 : -5.6) + Math.cos(i) * 0.4); grp.add(s); }
    put(grp, -80, -150, ry, 0.1, true);
    gap(grp, 'r1', 'bank', [0, 1.12, -4.1], [0, 0, 1], 0.85, 0.5); gap(grp, 'r1b', 'bank', [0, 1.12, 4.1], [0, 0, 1], 0.85, 0.5);
    view('r1', grp, [2.6, 2.0, -9.5], [0, 1.1, -4]);
    GAP_SOLIDS.push({ bank: true, grp, inv: new THREE.Matrix4().copy(grp.matrixWorld).invert(), tr, rx: 5.2, ry: 3.0, rz: 5.6, y0: -0.6 });
  }
  { // R2 a dead oak leaf curled into a tube, lying in the grass
    const grp = new THREE.Group(), L = 5.0, R = 0.95, turns = 1.45, N = 40, M = 14, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) for (let j = 0; j <= M; j++) { const s = i / N, t = j / M, a = s * turns * TAU - 1.2, r = R + s * 0.38 + 0.05 * Math.sin(t * 9 + s * 4);
      const lob = 1 - 0.18 * Math.max(0, Math.sin(t * Math.PI * 5)) * s; pos.push(Math.cos(a) * r, Math.sin(a) * r, (t - 0.5) * L * lob); uv.push(t, s); }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const p = i * (M + 1) + j, q = p + M + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const leaf = new THREE.Mesh(g, leafM); leaf.position.y = R + 0.3; grp.add(leaf);
    grp.add(tube([new V3(0, R + 0.3 - R, L / 2 - 0.2), new V3(0.2, 0.2, L / 2 + 0.6), new V3(0.5, 0.1, L / 2 + 1.3)], 0.07, 0.04, barkM(), 13)); // the stalk
    put(grp, -88, -160, ry + 0.3, -0.05, true);
    gap(grp, 'r2', 'bank', [0, R + 0.3, 0], [0, 0, 1], 0.82, 2.4); view('r2', grp, [2.2, 2.1, -6.5], [0, 1.2, 0]);
    for (let i = 0; i < 8; i++) { const t = i / 8 * TAU; solidCap(grp, [Math.cos(t) * (R + 0.15), R + 0.3 + Math.sin(t) * (R + 0.15), -L / 2], [Math.cos(t) * (R + 0.15), R + 0.3 + Math.sin(t) * (R + 0.15), L / 2], 0.12); }
  }
  { // R3 two flat stones leaning together, a narrow slot under where they touch
    const grp = new THREE.Group();
    const s1 = rock(0.55, 3.2, 1.6, 7.7), s2 = rock(0.5, 3.0, 1.5, 8.8); s1.position.set(-1.65, 2.1, 0); s1.rotation.z = -0.42; s2.position.set(1.6, 2.0, 0.1); s2.rotation.z = 0.44; grp.add(s1, s2);
    const cap = rock(1.0, 0.5, 1.1, 9.9); cap.position.set(0, 4.75, 0); cap.rotation.z = 0.1; grp.add(cap);
    put(grp, -96, -166, ry - 0.2, -0.3, true);
    gap(grp, 'r3', 'bank', [0, 1.45, 0], [0, 0, 1], 0.8, 1.0); view('r3', grp, [1.6, 1.9, -6.5], [0, 1.8, 0]);
    solidCap(grp, [-2.8, -0.5, 0], [-0.4, 4.6, 0], 0.62); solidCap(grp, [2.8, -0.6, 0], [0.4, 4.4, 0], 0.58);
  }
  { // R4 a dead snag on the hilltop with a knothole near the top, right through the trunk
    const grp = new THREE.Group(), H = 24, rt = 1.9, ky = H - 4.0, kr = 0.82, hole = [[[-3, ky, 0], [3, ky, 0], kr]];
    const pts = [new THREE.Vector2(rt + 1.6, -1.5), new THREE.Vector2(rt + 0.7, 0.8), new THREE.Vector2(rt + 0.2, 3), new THREE.Vector2(rt, 10), new THREE.Vector2(rt * 0.85, H - 2), new THREE.Vector2(rt * 0.6, H)];
    const g = new THREE.LatheGeometry(pts, 26), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + 0.08 * Math.sin(a * 5 + y * 0.3) + (y > H - 0.5 ? 0.25 * Math.sin(a * 7) : 0); p.setXYZ(i, x * k, y + (y > H - 0.5 ? 0.9 * Math.sin(a * 4) : 0), z * k); }
    g.computeVertexNormals(); grp.add(new THREE.Mesh(g, silverM(hole)));
    const kh = new THREE.CylinderGeometry(kr, kr, rt * 2 + 0.6, 16, 1, true); kh.rotateZ(Math.PI / 2); const km = new THREE.Mesh(kh, innerM('x', rt + 0.3)); km.position.y = ky; grp.add(km);
    for (const s of [-1, 1]) { const lip = new THREE.TorusGeometry(kr + 0.18, 0.2, 8, 20); lip.rotateY(Math.PI / 2); const lm = new THREE.Mesh(lip, silverM()); lm.position.set(s * (rt * 0.86 + 0.05), ky, 0); lm.scale.set(1, 1.25, 1); grp.add(lm); }
    grp.add(tube([new V3(0.3, H - 7, 0.5), new V3(2.6, H - 5.2, 1.2), new V3(4.6, H - 4.6, 1.6)], 0.42, 0.14, silverM(), 14)); // a dead limb
    grp.add(tube([new V3(-0.4, H - 12, -0.3), new V3(-2.8, H - 11, -1.1), new V3(-4.2, H - 9.4, -1.0)], 0.38, 0.12, silverM(), 15));
    put(grp, HL.x + 2, HL.z + 1, ry, 0);
    gap(grp, 'r4', 'bank', [0, ky, 0], [1, 0, 0], kr, rt + 0.3); view('r4', grp, [8, ky + 1.2, 2.2], [0, ky - 0.3, 0]);
    GAP_SOLIDS.push({ snag: true, grp, inv: new THREE.Matrix4().copy(grp.matrixWorld).invert(), rt, H, ky, kr });
  }

  // ===== Loners =====
  { // L1 an old fence in the meadow with one slat missing and one hanging on a nail
    const grp = new THREE.Group(), N = 9, sw = 0.95, sh = 4.6;
    for (let i = 0; i < N; i++) { if (i === 4) continue; const g = new THREE.BoxGeometry(sw * 0.86, sh + Math.sin(i * 2.1) * 0.3, 0.18); g.translate(0, (sh + Math.sin(i * 2.1) * 0.3) / 2, 0);
      const s = new THREE.Mesh(g, fenceM); s.position.set((i - N / 2 + 0.5) * sw, -0.3, 0.2); s.rotation.z = Math.sin(i * 1.3) * 0.03; grp.add(s); }
    const hang = new THREE.BoxGeometry(sw * 0.86, sh * 0.62, 0.18); hang.translate(0, -sh * 0.31, 0); const hs = new THREE.Mesh(hang, fenceM); hs.position.set((4 - N / 2 + 0.5) * sw + 0.25, sh - 0.6, 0.2); hs.rotation.z = 0.5; grp.add(hs);
    for (const y of [1.0, 3.4]) { const g = new THREE.BoxGeometry(N * sw + 0.6, 0.42, 0.24); const r = new THREE.Mesh(g, fenceM); r.position.set(0, y, -0.03); grp.add(r); }
    for (const x of [-N / 2 * sw - 0.3, N / 2 * sw + 0.3]) { const g = new THREE.CylinderGeometry(0.3, 0.34, sh + 1.4, 8); g.translate(0, (sh + 1.4) / 2 - 0.6, 0); grp.add(new THREE.Mesh(g, fenceM)); }
    put(grp, 72, 28, 0.6, 0);
    gap(grp, 'l1', 'loner', [(4 - N / 2 + 0.5) * sw, 2.2, 0.2], [0, 0, 1], 0.4, 0.3); view('l1', grp, [1.5, 2.6, 7.5], [0, 2.2, 0]);
    GAP_SOLIDS.push({ fence: true, grp, inv: new THREE.Matrix4().copy(grp.matrixWorld).invert(), w: N * sw / 2 + 0.3, h: sh, gx: (4 - N / 2 + 0.5) * sw, gw: sw * 0.5 });
  }
  { // L2 a bramble cane arching out of the thicket and rooting its tip in the grass
    const grp = new THREE.Group(), pts = [new V3(-3.2, -0.3, 0), new V3(-2.9, 1.8, 0.1), new V3(-1.6, 3.1, 0), new V3(0, 3.35, -0.1), new V3(1.7, 2.9, 0), new V3(2.9, 1.4, 0.15), new V3(3.2, -0.3, 0.2)];
    grp.add(tube(pts, 0.2, 0.13, caneM, 16, 8));
    const curve = new THREE.CatmullRomCurve3(pts), tp = new V3(), tn = new V3();
    for (let i = 1; i < 40; i++) { const t = i / 40; curve.getPointAt(t, tp); curve.getTangentAt(t, tn); const side = new V3(Math.sin(i * 2.4), Math.cos(i * 1.7), Math.sin(i * 3.1)).normalize(); side.addScaledVector(tn, -side.dot(tn)).normalize();
      const g = new THREE.ConeGeometry(0.05, 0.28, 4); g.translate(0, 0.14, 0); const th = new THREE.Mesh(g, thornM); th.position.copy(tp).addScaledVector(side, 0.15); th.quaternion.setFromUnitVectors(YA, side.addScaledVector(tn, -0.4).normalize()); grp.add(th);
      if (i % 5 === 2) for (let k = 0; k < 3; k++) { const lg = new THREE.PlaneGeometry(0.55, 0.8); lg.translate(0, 0.4, 0); const l = new THREE.Mesh(lg, bramLeafM); l.position.copy(tp); l.rotation.set(0.9 + k * 0.4, i + k * 2.1, 0.5 * (k - 1)); grp.add(l); } }
    put(grp, 101, 213, Math.atan2(213 - 230, 101 - 120), -0.05);
    gap(grp, 'l2', 'loner', [0, 1.4, 0], [0, 0, 1], 1.1); view('l2', grp, [1.6, 1.8, 7], [0, 1.6, 0]);
    for (let i = 0; i + 1 < pts.length; i++) solidCap(grp, pts[i].toArray(), pts[i + 1].toArray(), 0.3);
  }


  // the grass round each spot is cropped short (a little trodden place), and a lane is open in front of and behind each opening
  // so you can see it and line up. Only the blade heights change: no random numbers are drawn.
  if (grassMesh) { const off = grassMesh.geometry.attributes.aOff, par = grassMesh.geometry.attributes.aPar, n = grassMesh.geometry.instanceCount;
    const cs = GAPS.map(g => ({ x: g.c.x, z: g.c.z, nx: g.n.x, nz: g.n.z, nl: Math.hypot(g.n.x, g.n.z) }));
    for (let i = 0; i < n; i++) { const x = off.getX(i), z = off.getZ(i); let k = 1;
      for (const c of cs) { const dx = x - c.x, dz = z - c.z; if (Math.abs(dx) > 16 || Math.abs(dz) > 16) continue;
        const ax = c.nl > 0.3 ? (dx * c.nx + dz * c.nz) / c.nl : 0, sd = c.nl > 0.3 ? Math.abs(dx * c.nz - dz * c.nx) / c.nl : Math.hypot(dx, dz);
        const e = Math.hypot(ax / 13, sd / 5.5); k = Math.min(k, clamp((e - 0.55) / 0.45, 0, 1)); }
      if (k < 1) par.setX(i, par.getX(i) * lerp(0.12, 1, k * k)); }
    par.needsUpdate = true; }
  for (const r of roots) addCasters(r);
  Math.random = gameRandom;
  for (const so of GAP_SOLIDS) { const at = so.a ? so.a.clone().add(so.b).multiplyScalar(0.5) : so.c ? so.c : new V3().setFromMatrixPosition(so.inv.clone().invert());
    let best = null, bd = 1e9; for (const g of GAPS) { const d = g.c.distanceToSquared(at); if (d < bd) { bd = d; best = g; } } so.spot = best.spot; }
  buildGapLife();
  window.__gaps = { GAPS, GAP_SPOTS, GAP_SOLIDS, gapHit, GW, get MEM() { return MEM; } };
}

const _gp = new V3(), _sl = new V3();
function stoneHit(w, p, pr) { _sl.copy(p).applyMatrix4(w.inv); const b = w.box; if (_sl.x < b[0] || _sl.x > b[1] || _sl.y < b[2] || _sl.y > b[3] || _sl.z < b[4] - pr || _sl.z > b[5] + pr) return null;
  for (const st of w.stones) { _sl.copy(p).applyMatrix4(st.inv); const [a, bb, c] = st.s; if (Math.hypot(_sl.x / (a + pr), _sl.y / (bb + pr), _sl.z / (c + pr)) < 1) return new V3(_sl.x / (a * a), _sl.y / (bb * bb), _sl.z / (c * c)).normalize().applyQuaternion(st.rot); }
  return null; }
// does a point (with radius pr) hit any of the solid parts? returns a push-out normal, or null
const _c = new V3(), _d = new V3(), _l = new V3();
export function gapHit(p, pr) {
  for (const s of GAP_SOLIDS) {
    if (s.a) { _d.subVectors(s.b, s.a); const t = clamp(_c.subVectors(p, s.a).dot(_d) / _d.lengthSq(), 0, 1); _c.copy(s.a).addScaledVector(_d, t); _l.subVectors(p, _c); const d = _l.length(); if (d < s.r + pr) { lastHitSolid = s; return _l.multiplyScalar(1 / Math.max(d, 1e-4)).clone(); } continue; }
    if (s.c) { _l.subVectors(p, s.c); const d = _l.length(); if (d < s.r + pr) { lastHitSolid = s; return _l.multiplyScalar(1 / Math.max(d, 1e-4)).clone(); } continue; }
    if (s.stones) { const n = stoneHit(s, p, pr); if (n) { lastHitSolid = s; return n; } continue; }
    if (s.bank) { _l.copy(p).applyMatrix4(s.inv); const e = Math.hypot(_l.x / s.rx, (_l.y - s.y0) / s.ry, _l.z / s.rz); if (e > 1 + pr / 3 || _l.y < s.y0) continue;
      if (Math.hypot(_l.x, _l.y - 1.12) < s.tr - pr) continue; const out = Math.hypot(_l.x, _l.y - 1.12) < s.tr + 0.4 ? new V3(-_l.x, -(_l.y - 1.12), 0) : new V3(_l.x / s.rx, (_l.y - s.y0) / s.ry, _l.z / s.rz);
      lastHitSolid = s; return out.normalize().transformDirection(s.grp.matrixWorld); }
    if (s.snag) { _l.copy(p).applyMatrix4(s.inv); if (_l.y > s.H + 1 || _l.y < -2) continue; const r = Math.hypot(_l.x, _l.z); if (r > s.rt * 1.1 + pr) continue;
      if (Math.abs(_l.x) < s.rt + 0.6 && Math.hypot(_l.y - s.ky, _l.z) < s.kr - pr) continue;
      const inHole = Math.abs(_l.x) < s.rt + 0.6 && Math.hypot(_l.y - s.ky, _l.z) < s.kr + pr; lastHitSolid = s; return (inHole ? new V3(0, -(_l.y - s.ky), -_l.z) : new V3(_l.x, 0, _l.z)).normalize().transformDirection(s.grp.matrixWorld); }
    if (s.fence) { _l.copy(p).applyMatrix4(s.inv); if (Math.abs(_l.x) > s.w || _l.y > s.h || _l.y < -0.5 || Math.abs(_l.z - 0.1) > 0.25 + pr) continue;
      if (Math.abs(_l.x - s.gx) < s.gw - pr && _l.y > 1.2 + pr && _l.y < 3.2 - pr) continue; lastHitSolid = s; return new V3(0, 0, Math.sign(_l.z - 0.1) || 1).transformDirection(s.grp.matrixWorld); }
  }
  return null;
}

// =================== in flight: passing, clipping, and what the world remembers ===================
// GW: state other modules read (roll, pitch and still stay 0/false since the tumble was taken out; the hooks remain)
export const GW = { tumble: false, down: false, still: false, t: 0, roll: 0, pitch: 0, spin: 0, rev: 0, pulse: 0, falls: 0, passes: 0 };
const LINES = { home: ['h1', 'h2', 'h3', 'h4'], wall: ['w1', 'w2', 'w3', 'w4', 'w5'], bank: ['r1', 'r2', 'r3', 'r4'] };
const SAVE_KEY = 'honeylight.gaps';
let MEM = { found: {}, lines: {} }, clock = 0, chain = null, prevS = [], pulseMesh, motes, moteGeo, flowersBy = {}, mossM = {}, bloomT = {};
const _p = new V3(), _q = new V3(), _n = new V3();

function loadMem() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.found) MEM = { found: s.found, lines: s.lines || {} }; } catch (e) { } }
function saveMem() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(MEM)); } catch (e) { } }

// built once at the end of setupGaps: the pulse, the drifting seed fluff, the speedwell and the moss
export function buildGapLife() {
  loadMem();
  const gameRandom = Math.random; let rs = 77123; Math.random = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
  const r01 = () => Math.random();
  // the pulse: a soft shell of light that swells out from the bee and fades (seen from inside in the bee's eyes, from outside in follow view)
  pulseMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float f=1.0-abs(dot(normalize(vN),vV)); float a=uA*(0.18+0.9*pow(f,2.5)); gl_FragColor=vec4(vec3(1.0,0.78,0.32)*a,1.0); }` }));
  pulseMesh.visible = false; pulseMesh.frustumCulled = false; pulseMesh.renderOrder = 5; scene.add(pulseMesh);
  // seed fluff: a few motes per spot that ride the draught through the opening. Their paths come from time alone, so they draw no random numbers
  const MPS = 7; moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(GAPS.length * MPS * 3), 3)); moteGeo.setAttribute('aA', new THREE.Float32BufferAttribute(new Float32Array(GAPS.length * MPS), 1));
  motes = new THREE.Points(moteGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aA; varying float vA; void main(){ vA=aA; vec4 v=viewMatrix*modelMatrix*vec4(position,1.0); gl_PointSize=clamp(90.0/-v.z,1.0,9.0); gl_Position=projectionMatrix*v; }`,
    fragmentShader: `varying float vA; void main(){ vec2 d=gl_PointCoord-0.5; float r=length(d); float a=smoothstep(0.5,0.0,r)*vA; float fil=smoothstep(0.04,0.0,abs(d.x*d.y)*6.0)*0.4; gl_FragColor=vec4(vec3(1.0,0.97,0.86)*(a+fil*vA),1.0); }` }));
  motes.frustumCulled = false; motes.userData.noShadow = true; scene.add(motes); motes.userData.per = MPS;
  // speedwell: small sky-blue four-petalled flowers round the lip of each spot, hidden until you have flown it
  const petal = new THREE.CircleGeometry(1, 7); petal.scale(0.13, 0.17, 1); petal.translate(0, 0.15, 0);
  const spots = {}; for (const g of GAPS) (spots[g.spot] = spots[g.spot] || []).push(g);
  const mossMat = () => mat(`uniform float uMoss; void main(){ vec3 n=NORMAL; float f=fbm(vW.xz*6.0+vW.y*2.0); float d=fbm(vW.xz*18.0);
    vec3 alb=mix(vec3(0.10,0.22,0.05),vec3(0.30,0.48,0.12),f)*(0.7+0.5*d);
    float dots=smoothstep(0.66,0.82,d)*smoothstep(0.35,0.6,f); vec3 c=shade(alb,n,vW,0.05,0.4)*(1.0+uMoss*0.4)+vec3(0.30,0.95,0.50)*uMoss*(0.04+0.9*dots); gl_FragColor=vec4(finish(c,vW),1.0); }`, { uniforms: { uMoss: { value: 0 } } });
  for (const [id, gs] of Object.entries(spots)) {
    const fl = [], mo = [], g0 = gs[0];
    for (const g of gs) { const up = new V3(0, 1, 0), side = g.t;
      for (let k = 0; k < 16; k++) { // around the rim of the opening, and in the grass at its foot
        const a = r01() * TAU, rr = g.slot ? 0 : g.r + 0.25 + r01() * 0.35, onRim = !g.slot && r01() < 0.55;
        _p.copy(g.c).addScaledVector(g.n, (r01() - 0.5) * 2 * Math.min(g.half, 1.2) + (r01() < 0.5 ? -1 : 1) * (g.half + 0.3));
        if (onRim) { _p.copy(g.c).addScaledVector(side, Math.cos(a) * rr).addScaledVector(up, Math.sin(a) * rr).addScaledVector(g.n, (r01() < 0.5 ? -1 : 1) * (g.half + 0.05)); }
        else { _p.addScaledVector(side, (r01() - 0.5) * 2 * (g.r + 1.6)); _p.y = terrainH(_p.x, _p.z) + 0.3 + r01() * 0.5; }
        const c = [0.30 + r01() * 0.1, 0.48 + r01() * 0.12, 0.98], face = new V3(r01() - 0.5, onRim ? r01() - 0.5 : 1.6, r01() - 0.5).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), face), sc = 0.8 + r01() * 0.5;
        for (let pi = 0; pi < 4; pi++) { const pg = petal.clone(); pg.rotateZ(pi * Math.PI / 2 + 0.3); pg.scale(sc, sc, sc); pg.applyQuaternion(q); pg.translate(_p.x - g0.c.x, _p.y - g0.c.y, _p.z - g0.c.z); fl.push({ g: pg, c: pi === 0 ? [c[0] * 0.8, c[1] * 0.8, c[2] * 0.9] : c }); }
        const eye = new THREE.SphereGeometry(0.05, 6, 4); eye.translate(_p.x - g0.c.x + face.x * 0.02, _p.y - g0.c.y + face.y * 0.02, _p.z - g0.c.z + face.z * 0.02); fl.push({ g: eye, c: [1, 0.95, 0.85] }); }
      for (let k = 0; k < 6; k++) { _p.copy(g.c).addScaledVector(g.n, (k % 2 ? -1 : 1) * (g.half + 0.6 + r01() * 1.5)).addScaledVector(side, (r01() - 0.5) * (g.r * 2 + 2)); _p.y = terrainH(_p.x, _p.z) - 0.05;
        const m = new THREE.SphereGeometry(1, 9, 5, 0, TAU, 0, Math.PI / 2); m.scale(0.7 + r01() * 0.9, 0.18 + r01() * 0.12, 0.6 + r01() * 0.8); m.translate(_p.x - g0.c.x, _p.y - g0.c.y, _p.z - g0.c.z); mo.push(m); } }
    const fm = new THREE.Mesh(geoParts(fl), mat(`void main(){ vec3 n=NORMAL; gl_FragColor=vec4(finish(shade(vC,n,vW,0.1,0.6),vW),1.0); }`, { vertexColors: true, side: THREE.DoubleSide }));
    fm.position.copy(g0.c); fm.visible = !!MEM.found[id]; fm.userData.noShadow = true; scene.add(fm);
    const line = g0.line; mossM[line] = mossM[line] || mossMat(); const mg = new THREE.Mesh(geoParts(mo.map(g => ({ g, c: [1, 1, 1] }))), mossM[line]); mg.position.copy(g0.c); scene.add(mg);
    flowersBy[id] = fm; }
  Math.random = gameRandom;
}

// slide a point out of the solid parts. Returns the push normal of the last hit, or null
let lastHitSolid = null;
function pushOut(p) { let hit = null; for (let i = 0; i < 6; i++) { const n = gapHit(p, PR); if (!n) break; hit = n; p.addScaledVector(n, 0.06); } return hit; }

// the keys: nothing to change now (there was a tumble here; the owner found it a pain, so a hit is a plain bump)
export function gapsInput(kf, ks, ku) { return [kf, ks, ku]; }
const PASS_SPEED = 8, TOUCH_GRACE = 1.2; // a pass counts only at speed, and only if the bee has not touched that spot just before
const lastTouch = {};
function passed(g) {
  GW.passes++; GW.rev = 1; GW.pulse = 1;
  const fresh = !MEM.found[g.spot];
  if (!chain || chain.line !== g.line || clock - chain.t > 7) chain = { line: g.line, t: clock, n: 0, spots: {} };
  chain.n++; chain.t = clock; chain.spots[g.spot] = true;
  const k = Math.min(6, chain.n - 1);
  tone(SCALE[k] * 2, 0.06, 0.9); tone(SCALE[Math.min(7, k + 2)] * 2, 0.035, 0.8, 'sine', 0.05); tone(SCALE[k], 0.03, 1.2, 'triangle');
  if (fresh) { MEM.found[g.spot] = true; const fm = flowersBy[g.spot]; if (fm) { fm.visible = true; bloomT[g.spot] = 0; fm.scale.setScalar(0.01); } saveMem(); }
  const L = LINES[g.line];
  if (L && L.every(s => chain.spots[s]) && !chain.done) { chain.done = true; [0, 2, 4, 7].forEach((s, i) => tone(SCALE[s] * 2, 0.06, 1.8, 'sine', 0.12 + i * 0.09));
    if (!MEM.lines[g.line]) { MEM.lines[g.line] = true; saveMem(); } }
}

// one step in the air (the frame loop calls this after the bee has moved and met the world)
export function gapsStep(dt) {
  clock += dt; GW.t += dt;
  // the solid parts: a plain bump, like any branch or stone. The spot that was touched gives no credit for a moment
  const n = pushOut(P.pos);
  if (n) { const vn = P.vel.dot(n); if (vn < 0) P.vel.addScaledVector(n, -vn * 1.2); if (lastHitSolid) lastTouch[lastHitSolid.spot] = clock; }
  // passing through: the bee crossed the middle of an opening, inside its edge
  for (let i = 0; i < GAPS.length; i++) { const g = GAPS[i]; _p.subVectors(P.pos, g.c); if (_p.lengthSq() > 400) { prevS[i] = undefined; continue; }
    const s = _p.dot(g.n), s0 = prevS[i]; prevS[i] = s;
    if (s0 === undefined || (s0 < 0) === (s < 0)) continue;
    if (P.vel.length() < PASS_SPEED || clock - (lastTouch[g.spot] ?? -99) < TOUCH_GRACE) continue; // too slow, or it bumped its way in
    let inside; if (g.slot) { const x = _p.dot(g.t), y = g.lc[1] + _p.y; inside = Math.abs(x) < g.slot.hw && y > g.slot.h0 && y < g.slot.h1; }
    else { _q.copy(_p).addScaledVector(g.n, -s); inside = _q.length() < g.r + 0.05; }
    if (inside) passed(g); }
}

// every frame, flying or not: the pulse, the wing rev fading, the seed fluff, the blooms and the night moss
export function gapsFrame(dt, time) {
  GW.rev = Math.max(0, GW.rev - dt * 3.2);
  if (GW.pulse > 0) { GW.pulse = Math.max(0, GW.pulse - dt * 2.6); const k = 1 - GW.pulse; pulseMesh.visible = GW.pulse > 0; pulseMesh.position.copy(P.pos); pulseMesh.scale.setScalar(0.35 + k * 2.6); pulseMesh.material.uniforms.uA.value = GW.pulse * GW.pulse * 0.9; }
  for (const id in bloomT) { bloomT[id] += dt; const k = clamp(bloomT[id] / 1.4, 0, 1), e = 1 - Math.pow(1 - k, 3); flowersBy[id].scale.setScalar(Math.max(0.01, e * (1 + 0.12 * Math.sin(k * Math.PI)))); if (k >= 1) delete bloomT[id]; }
  const pos = moteGeo.attributes.position, al = moteGeo.attributes.aA, per = motes.userData.per;
  for (let i = 0; i < GAPS.length; i++) { const g = GAPS[i], near = P.pos.distanceToSquared(g.c) < 45 * 45, show = near && !MEM.found[g.spot];
    for (let k = 0; k < per; k++) { const j = i * per + k; if (!show) { al.setX(j, 0); continue; }
      const ph = (time * 0.16 + k / per + i * 0.37) % 1, wob = k * 2.4 + i, rr = (g.slot ? 0.5 : g.r * 0.55) * (0.3 + 0.7 * ((k * 0.618) % 1));
      _p.copy(g.c).addScaledVector(g.n, (ph - 0.5) * (2 * g.half + 7)).addScaledVector(g.t, Math.cos(wob + time * 0.7) * rr); _p.y += Math.sin(wob * 1.3 + time * 0.9) * rr * (g.slot ? 2.5 : 1);
      pos.setXYZ(j, _p.x, _p.y, _p.z); al.setX(j, Math.sin(ph * Math.PI) * 0.85); } }
  pos.needsUpdate = al.needsUpdate = true;
  const night = window.NIGHT && NIGHT.active ? NIGHT.k || 0 : 0;
  for (const l in mossM) { const u = mossM[l].uniforms.uMoss; u.value = lerp(u.value, MEM.lines[l] ? night : 0, Math.min(1, dt * 0.5)); }
}
