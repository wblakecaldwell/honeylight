// Honeylight: trees and leaves, the dew path, grass (and how it turns see-through near a bee down in it), flowers, mushrooms, and how solid they are.
import * as THREE from '../three.module.min.js';
import { M4, Q4, V3, rnd, clamp, lerp, smooth, TAU } from './core.js';
import { ROUT, POND, WY, FDIR, FIELD_D, srnd, HEDGE_R, ORCH, HILLS, BROOK, HOLLOW, brookD, hollowRootD, terrainH, LOG,
  orchTrees, FOREST, forestTrees, PADS0, overWater } from './world.js';
import { scene, U, MP, SWAYGLSL, VERT, mat, simple, HASH } from './engine.js';
import { barkMat, trunkGeo } from './hive.js';
import { YA } from './bees.js';
import { P, PR } from './player.js';
import { G } from './progress.js';
import { zoneLocked } from './zones.js';
import { time } from './loop.js';

export const flowers = []; // filled later; foragers reference it lazily

// ---------- model pass: crowns built from leaf sprays, with real limbs ----------
const CARD_VERT = `attribute vec3 aN; attribute float aTint; uniform float uTime; uniform vec3 uWind;
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv; varying vec3 vL; varying vec3 vBN; flat varying float vTint; // flat: vTint feeds a hash, and a smooth varying is rounded differently from chip to chip
void main(){ mat4 m=modelMatrix*instanceMatrix; vec4 w=m*vec4(position,1.0); float sc=length(m[0].xyz);
  float ph=dot(w.xz,vec2(0.071,0.053))+aTint*31.0; float s=sin(uTime*1.6+ph)+0.5*sin(uTime*2.7+ph*1.7);
  w.xyz+=(vec3(uWind.x,0.0,uWind.y)*(0.3+uWind.z)*0.05+aN*0.03*s+vec3(0.0,0.02*s,0.0))*sc*(0.4+uv.y);
  vW=w.xyz; vL=position; vN=normalize(mat3(m)*normal); vUv=uv; vC=vec3(1.0); vBN=aN; vTint=aTint;
  gl_Position=projectionMatrix*viewMatrix*w; }`;
const cardMat = (ta, tb, blos) => mat(`varying vec3 vBN; flat varying float vTint;
void main(){ vec2 p=vUv*2.0-1.0; float fat=1.0+0.7*smoothstep(50.0,220.0,length(uCam-vW)); float best=0.0, vein=0.0, hl=0.0, kk=1.0, uu=0.0, isB=0.0; vec2 ax=vec2(1.0,0.0);
  for(int i=0;i<5;i++){ float fi=float(i); float h=hash21(vec2(fi*7.13+1.0,vTint*91.7));
    float a=fi*1.2566+h*0.8+vTint*6.2832; vec2 dir=vec2(cos(a),sin(a));
    float bl=step(h,${blos.toFixed(2)}); float L=mix(0.50+0.18*h,0.32+0.08*h,bl); vec2 c=dir*(0.12+L*0.95);
    vec2 d=p-c; float u=dot(d,dir)/L; float v=dot(d,vec2(-dir.y,dir.x));
    float w=mix(0.40*L*(1.0-u*u)*(1.0-0.3*u), 0.9*L*sqrt(max(1.0-u*u,0.0))*(0.75+0.25*cos(atan(v,u*L)*5.0)), bl);
    float k=abs(v)/max(w*fat,1e-3);
    if(abs(u)<fat && k<1.0){ float z=(1.0-k*k)*(0.6+h); if(z>best){ best=z; hl=h; kk=k; uu=u; ax=dir; isB=bl;
      vein=(1.0-smoothstep(0.0,0.045,abs(v)))*(1.0-smoothstep(0.6,1.0,u))*(1.0-bl);
      vein=max(vein,(1.0-smoothstep(0.0,0.06,abs(fract(u*3.5-abs(v)*5.0)-0.5)-0.38))*0.5*(1.0-bl)*step(0.15,k)); } } }
  if(best<=0.0) discard;
  vec3 fn=NORMAL; vec3 n0=normalize(vBN*0.75+fn*0.45); vec3 tg=normalize(cross(n0,vec3(0.13,1.0,0.07)));
  vec3 n=normalize(n0+tg*(hl-0.5)*0.9+cross(n0,tg)*(uu*0.35));
  vec3 alb=mix(vec3(${ta}),vec3(${tb}),clamp(hl*0.65+vTint*0.5-0.1,0.0,1.0));
  alb*=0.62+0.38*smoothstep(-0.8,0.7,vBN.y); alb*=1.0-0.28*kk*kk*kk*kk;
  alb=mix(alb,alb*1.45+vec3(0.03,0.04,0.0),vein*0.55);
  vec3 bc=mix(vec3(0.95,0.42,0.62),vec3(1.0,0.86,0.9),hash21(vec2(hl*13.0,vTint)))*(1.0-0.35*kk*kk); bc=mix(bc,vec3(0.95,0.7,0.2),(1.0-smoothstep(0.0,0.25,length(p-ax*0.12)))*0.0);
  alb=mix(alb,bc,isB);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.28*(1.0-isB),0.85),vW),1.0); }`, { vert: CARD_VERT, side: THREE.DoubleSide });
export function leafShell(blobs, o) {
  const size = o.size, dens = (o.dens || 1.7) * 1.5, M = [], N = [], T = [], m4 = new M4(), q = new Q4(), q2 = new Q4(), Z = new V3(0, 0, 1), d = new V3(), nrm = new V3(), pos = new V3(), sc = new V3(), fn = new V3();
  for (const b of blobs) { const rx = b[3], ry = b[4], rz = b[5] || b[3]; const area = 4 * Math.PI * (rx * ry + rx * rz + ry * rz) / 3; const n = Math.min(o.max || 900, Math.round(area * dens / (size * size)));
    for (let i = 0; i < n; i++) { const u = rnd(-1, 1), a = rnd(TAU), s = Math.sqrt(1 - u * u); d.set(s * Math.cos(a), u, s * Math.sin(a));
      const r = rnd(0.95, 1.12); pos.set(b[0] + d.x * rx * r, b[1] + d.y * ry * r, b[2] + d.z * rz * r);
      let buried = false; for (const c of blobs) { if (c === b) continue; const ex = (pos.x - c[0]) / c[3], ey = (pos.y - c[1]) / c[4], ez = (pos.z - c[2]) / (c[5] || c[3]); if (ex * ex + ey * ey + ez * ez < 0.7) { buried = true; break; } }
      if (buried) continue;
      nrm.set(d.x / rx, d.y / ry, d.z / rz).normalize(); fn.set(rnd(-0.7, 0.7), rnd(-0.4, 0.8), rnd(-0.7, 0.7)).add(nrm).normalize();
      q.setFromUnitVectors(Z, fn); q2.setFromAxisAngle(fn, rnd(TAU)); q.premultiply(q2);
      const k = size * rnd(0.75, 1.3); sc.set(k, k, k); m4.compose(pos, q, sc); M.push(m4.clone()); N.push(nrm.x, nrm.y, nrm.z); T.push(rnd()); } }
  const g = new THREE.PlaneGeometry(1, 1); g.setAttribute('aN', new THREE.InstancedBufferAttribute(new Float32Array(N), 3)); g.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array(T), 1));
  const im = new THREE.InstancedMesh(g, cardMat(o.ta, o.tb, o.blos || 0), M.length); M.forEach((m, i) => im.setMatrixAt(i, m)); im.frustumCulled = false; im.userData.noShadow = true; scene.add(im);
  MPSTAT.cards += M.length; return im; }
export const MPSTAT = { cards: 0, limbs: 0 };

// limbs: tapered, slightly kinked boughs from the trunk up into the crown. Solid.
export const LIMBS = [];
function limb(a, b, r0, r1, solid = true) {
  const mid = a.clone().lerp(b, 0.5); mid.x += rnd(-1, 1) * a.distanceTo(b) * 0.08; mid.y += a.distanceTo(b) * rnd(0.04, 0.12); mid.z += rnd(-1, 1) * a.distanceTo(b) * 0.08;
  const rm = (r0 + r1) / 2;
  for (const [p, q, ra, rb] of [[a, mid, r0, rm], [mid, b, rm, r1]]) { const dir = q.clone().sub(p), L = dir.length(); const g = new THREE.CylinderGeometry(rb, ra, L * 1.04, 10, 3);
    const m = new THREE.Mesh(g, barkMat); m.position.copy(p).addScaledVector(dir, 0.5); m.quaternion.setFromUnitVectors(YA, dir.normalize()); scene.add(m);
    if (solid) LIMBS.push({ a: p.clone(), b: q.clone(), r: Math.max(ra, rb) }); MPSTAT.limbs++; } }
const _lp = new V3(), _ld = new V3();
export function limbCollide(p, v) { for (const L of LIMBS) { if (Math.abs(p.x - L.a.x) > 70 || Math.abs(p.z - L.a.z) > 70) continue;
  _ld.subVectors(L.b, L.a); const t = clamp(_ld.dot(_lp.subVectors(p, L.a)) / _ld.lengthSq(), 0, 1); _lp.copy(L.a).addScaledVector(_ld, t);
  const dx = p.x - _lp.x, dy = p.y - _lp.y, dz = p.z - _lp.z, dd = Math.hypot(dx, dy, dz), rr = L.r + PR;
  if (dd < rr && dd > 1e-4) { const nx = dx / dd, ny = dy / dd, nz = dz / dd; p.set(_lp.x + nx * rr, _lp.y + ny * rr, _lp.z + nz * rr); const vn = v.x * nx + v.y * ny + v.z * nz; if (vn < 0) { v.x -= nx * vn * 1.2; v.y -= ny * vn * 1.2; v.z -= nz * vn * 1.2; } } } }
export function crownLimbs(x, base, z, R, blobs, top) { for (const b of blobs) { if (rnd() < 0.15) continue; const a = Math.atan2(b[2] - z, b[0] - x);
  const s = new V3(x + Math.cos(a) * R * 0.45, base + rnd(-0.06, 0.06) * (top - base), z + Math.sin(a) * R * 0.45), e = new V3(b[0] - (b[0] - x) * 0.15, b[1] - b[4] * 0.25, b[2] - (b[2] - z) * 0.15);
  limb(s, e, R * 0.32, Math.max(0.5, R * 0.08)); } }

let leafMat, blobG;
export function setupCrowns() {
  leafMat = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vL.xy*6.0+vL.z*4.0); n=normalize(n+(vec3(fbm(vL.yz*9.0),fbm(vL.xz*9.0),fbm(vL.xy*9.0))-0.5)*1.2);
  vec3 alb=mix(vec3(0.03,0.11,0.02),vec3(0.22,0.40,0.06),a)*${MP ? '0.45' : '1.0'}; gl_FragColor=vec4(finish(shade(alb,n,vW,0.1,0.7),vW),1.0); }`);
  blobG = new THREE.IcosahedronGeometry(1, 3);
  canopy(0, 95, 0, 55, 9, { size: 16, R: ROUT * 0.85, base: 70 });
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + rnd(0.4), d = rnd(260, 420), x = Math.cos(a) * d, z = Math.sin(a) * d, R = rnd(6, 11), b = terrainH(x, z); const t = new THREE.Mesh(trunkGeo(R, b, 70), barkMat); t.position.set(x, 0, z); scene.add(t); canopy(x, b + 80, z, rnd(35, 50), 6, { size: 20, dens: 1.3, R: R * 0.85, base: b + 58 }); }
}

function canopy(x, y, z, r, n, opt) { const bl = []; for (let i = 0; i < n; i++) { const a = rnd(TAU), d = rnd(0.2, 1) * r; const b = [x + Math.cos(a) * d, y + rnd(-0.25, 0.4) * r, z + Math.sin(a) * d, r * rnd(0.5, 0.8), r * rnd(0.35, 0.55), r * rnd(0.5, 0.8)]; bl.push(b);
  const m = new THREE.Mesh(blobG, leafMat); m.position.set(b[0], b[1], b[2]); m.scale.set(b[3], b[4], b[5]).multiplyScalar(MP ? 0.93 : 1); scene.add(m); }
  if (MP && opt) { leafShell(bl, { size: opt.size, dens: opt.dens, ta: '0.05,0.15,0.03', tb: '0.30,0.48,0.08' }); crownLimbs(x, opt.base, z, opt.R, bl, y); }
  return bl; }

// the dew run: a worn little track through thick grass, threading under the dew arches
export let DEWPATH;
export function setupDewPath() {
  DEWPATH = (() => { const H = HILLS[0], A = new V3(FDIR.x * 135, 0, FDIR.z * 135), B = new V3(H.x + Math.cos(Math.atan2(-H.z, -H.x) + 0.5) * (H.r + 12), 0, H.z + Math.sin(Math.atan2(-H.z, -H.x) + 0.5) * (H.r + 12));
    const N = 7, pts = [], dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz), sx = -dz / L, sz = dx / L;
    for (let i = 0; i < N; i++) { const t = (i + 0.5) / N, wob = Math.sin(t * 7.0) * 14; pts.push(new V3(lerp(A.x, B.x, t) + sx * wob, 0, lerp(A.z, B.z, t) + sz * wob)); }
    const pre = pts[0].clone().addScaledVector(pts[0].clone().sub(pts[1]).normalize(), 18), post = pts[N - 1].clone().addScaledVector(pts[N - 1].clone().sub(pts[N - 2]).normalize(), 14);
    const c = new THREE.CatmullRomCurve3([pre, ...pts, post], false, 'centripetal'), S = c.getSpacedPoints(Math.ceil(c.getLength() / 1.2));
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of S) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
    return { S, box: [x0 - 10, x1 + 10, z0 - 10, z1 + 10] }; })();
  { const S = DEWPATH.S, pos = [], uv = [], idx = [], W = 2.6;
    S.forEach((p, i) => { const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)]; let tx = b.x - a.x, tz = b.z - a.z; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
      const w = W * (0.85 + 0.3 * Math.sin(i * 0.37) * Math.sin(i * 0.13));
      for (const s of [-1, 1]) { const x = p.x - tz * s * w, z = p.z + tx * s * w; pos.push(x, terrainH(x, z) + 0.06, z); uv.push(s < 0 ? 0 : 1, i * 0.4); }
      if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = mat(`void main(){ vec3 n=vec3(0.0,1.0,0.0); float a=fbm(vW.xz*0.9), f=vnoise(vW.xz*6.0);
    vec3 alb=mix(vec3(0.16,0.11,0.06),vec3(0.36,0.27,0.16),a)*(0.8+0.35*f);
    float ed=min(vUv.x,1.0-vUv.x); float al=smoothstep(0.02,0.32+0.12*vnoise(vW.xz*0.7),ed);
    alb=mix(vec3(0.20,0.24,0.08),alb,smoothstep(0.1,0.4,ed));
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.03,0.0),vW),al); }`, { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 1; scene.add(mesh); }
}

export function dewPathD(x, z) { const b = DEWPATH.box; if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) return 1e9; let m = 1e18; for (const p of DEWPATH.S) { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < m) m = d; } return Math.sqrt(m); }

// runworld.js hook: the bow wave. Grass ahead of a bee in the zone leans away from its line (uWake, uWakeD in engine.js). At strength 0 it adds nothing
const WAKEGLSL = `if(uWake.z>0.0){ vec2 rel=aOff.xz-uWake.xy, wd=uWakeD.xy; float al=dot(rel,wd); vec2 sv=rel-wd*al; float sl=length(sv);
    float wk=uWake.z*smoothstep(-uWakeD.w,0.0,al)*(1.0-smoothstep(uWakeD.z*0.45,uWakeD.z,al))*(1.0-smoothstep(uWake.w*0.45,uWake.w,sl));
    w.xz+=(sv/max(sl,0.05)*0.9+wd*0.3)*wk*y*y*h*0.55; w.y-=wk*y*y*h*0.2; }`;

// see-through grass: blades between the eye and the bee, and just ahead of the bee, fade to mostly clear, so a bee off the track can still see it.
// Pass 0 (the grass as always) leaves those pixels out; pass 1 (a twin mesh drawn after, see-through) draws only them.
export const SEEK = { r0: 1.2, r1: 3.6, clear: 0.93, ahead: 8, reach: 30 };
const SEEGLSL = `uniform vec4 uSee; uniform vec4 uSeeD;
float seeF(vec3 p){ if(uSee.w<=0.0 || uMapView>0.5) return 0.0; vec3 b=uSee.xyz+uSeeD.xyz*uSeeD.w, ab=b-uCam; float t=clamp(dot(p-uCam,ab)/max(dot(ab,ab),1e-4),0.0,1.0);
  return uSee.w*(1.0-smoothstep(SEE_R0,SEE_R1,length(p-uCam-ab*t))); }
`;
const seeDefs = pass => ({ SEE_PASS: pass, SEE_R0: SEEK.r0.toFixed(2), SEE_R1: SEEK.r1.toFixed(2), SEE_CLEAR: SEEK.clear.toFixed(2) });
// the two passes in a fragment shader: call at the start (after vW is known) and wrap the final colour
const SEE_IN = `float seeA=seeF(vW);
#if SEE_PASS == 0
  if(seeA>0.004) discard;
#else
  if(seeA<=0.004) discard;
#endif
`;
const SEE_OUT = c => `
#if SEE_PASS == 0
  gl_FragColor=vec4(${c},1.0);
#else
  gl_FragColor=vec4(${c},1.0-SEE_CLEAR*seeA);
#endif
`;
// pass 1 vertex shader: blades far from the bee are dropped at once
const SEE_VERT = `
#if defined(SEE_PASS) && SEE_PASS == 1
  if(uSee.w<=0.0 || distance(aOff.xz,uSee.xz)>${SEEK.reach.toFixed(1)}){ gl_Position=vec4(2.0,2.0,2.0,1.0); return; }
#endif
`;
// the see-through twin of a grass mesh: same blades, drawn after the rest. three.js takes a random id for each new object,
// so it is made on a stream of its own: the game's random numbers, and so the whole world, stay as they were
export function seeTwin(mesh) { if (!MP) return null; const game = Math.random; let s = 77017 + mesh.geometry.instanceCount;
  Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  try { const t = new THREE.Mesh(mesh.geometry, GRASS_MP(1)); t.frustumCulled = false; t.renderOrder = 3; t.userData.noShadow = true; scene.add(t); return t; } finally { Math.random = game; } }
// model pass grass: tufts of three slim, twisting blades with a midrib, dry tips and the odd seed spike
function GRASS_MP(pass = 0) { return mat(SEEGLSL + `varying float vH; varying float vT; varying float vSeed; varying float vR;
void main(){ ${SEE_IN} vec3 n=NORMAL; float patchy=fbm(vW.xz*0.015);
  vec3 tipc=mix(vec3(0.30,0.50,0.09),vec3(0.46,0.50,0.16),smoothstep(0.45,0.7,patchy));
  vec3 alb=mix(vec3(0.025,0.08,0.015),tipc,smoothstep(0.0,0.75,vH))*vT*(0.85+0.3*vR);
  alb*=0.8+0.32*(1.0-smoothstep(0.0,0.14,abs(vL.x)));
  float dry=smoothstep(0.8,1.0,vH)*step(0.5,vR); alb=mix(alb,vec3(0.52,0.44,0.20),dry*0.7);
  alb=mix(alb,vec3(0.50,0.42,0.22)*(0.75+0.5*vnoise(vec2(vL.x*9.0,vH*60.0))),vSeed*smoothstep(0.5,0.6,vH));
  vec3 col=finish(shade(alb,n,vW,0.3*vH,0.9),vW); ${SEE_OUT('col')} }`, { side: THREE.DoubleSide, defines: seeDefs(pass), transparent: pass === 1, depthWrite: pass === 0, vert: HASH + `
attribute vec3 aOff; attribute vec4 aPar; uniform float uTime; uniform vec4 uWake; uniform vec4 uWakeD; uniform vec4 uSee; varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv; varying vec3 vL; varying float vH; varying float vT; varying float vSeed; varying float vR;
void main(){ ${SEE_VERT} float bi=position.z, y=position.y, sd=position.x;
  float r1=ihash21(vec2(aPar.z,bi)), r2=fract(r1*91.7+bi*0.37);
  float seed=step(bi,0.5)*step(fract(aPar.z*3.71),0.07);
  float h=aPar.x*(0.65+0.45*r1)*(1.0+0.35*seed);
  float ang=aPar.y+bi*2.2+r2*0.8, c=cos(ang), s=sin(ang);
  vec2 bo=vec2(cos(bi*2.4+aPar.z),sin(bi*2.4+aPar.z))*0.32*step(0.5,bi);
  float wid=mix(0.3*(0.8+0.4*r2)*(1.0-pow(y,1.5)*0.9), mix(0.06,0.3,smoothstep(0.6,0.75,y)), seed);
  float bend=y*y*(0.8+sin(uTime*1.2+aPar.z+bi+aOff.x*0.04+aOff.z*0.03)*0.7)*h*0.2*(1.0+0.6*r1)*(1.0-0.6*seed);
  float tw=y*(r2-0.5)*1.8;
  vec3 l=vec3(sd*wid*cos(tw), y*h-0.3*bend*bend/max(h,1.0), bend+sd*wid*sin(tw));
  vec3 w=aOff+vec3(bo.x,0.0,bo.y)+vec3(l.x*c-l.z*s, l.y, l.x*s+l.z*c);
  ${WAKEGLSL}
  vW=w; vL=vec3(sd,y,bi); vC=vec3(1.0); vUv=vec2(0.0); vN=normalize(vec3(-s,0.0,c)*0.7+vec3(c,0.0,s)*sd*0.7+vec3(0.0,0.5+y*0.4,0.0)); vH=y; vT=aPar.w; vSeed=seed; vR=r2;
  gl_Position=projectionMatrix*viewMatrix*vec4(w,1.0); }` }); }
function grassTuftGeo(g) { const P = [], I = []; for (let b = 0; b < 3; b++) { const o = b * 9; for (const y of [0, 0.3, 0.55, 0.78]) P.push(-0.5, y, b, 0.5, y, b); P.push(0, 1, b);
  for (let s = 0; s < 3; s++) { const k = o + s * 2; I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } I.push(o + 6, o + 7, o + 8); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); }

// grass
export let grassMesh;

export function setupGrass() {
  {
    const N = 84000, NB = 9000, off = new Float32Array((N + NB) * 3), par = new Float32Array((N + NB) * 4); let n = 0, guard = 0;
    // thick walls of taller grass hugging the dew run, so the track reads as a tight little path
    for (let k = 0; k < NB * 3 && n < NB; k++) { const p = DEWPATH.S[(Math.random() * DEWPATH.S.length) | 0], a = rnd(TAU), r = rnd(2.5, 8), x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, h = terrainH(x, z);
      if (h < WY + 0.6 || dewPathD(x, z) < 2.5) continue; off[n * 3] = x; off[n * 3 + 1] = h - 0.2; off[n * 3 + 2] = z; par[n * 4] = rnd(8, 14); par[n * 4 + 1] = rnd(TAU); par[n * 4 + 2] = rnd(TAU); par[n * 4 + 3] = rnd(0.7, 1.15); n++; }
    while (n < N + NB && guard++ < N * 4) { const a = rnd(TAU), d = Math.sqrt(Math.random()) * 330 + 14, x = Math.cos(a) * d, z = Math.sin(a) * d, h = terrainH(x, z); if (h < WY + 0.6 || dewPathD(x, z) < 2.4 || brookD(x, z) < BROOK.hw + 0.6 || Math.abs(Math.hypot(x - HOLLOW.x, z - HOLLOW.z) - HOLLOW.r) < 1.6 || hollowRootD(x, z) < 3.4) continue;
      off[n * 3] = x; off[n * 3 + 1] = h - 0.2; off[n * 3 + 2] = z; par[n * 4] = rnd(4, 11) * (h < WY + 3 ? 1.5 : 1); par[n * 4 + 1] = rnd(TAU); par[n * 4 + 2] = rnd(TAU); par[n * 4 + 3] = rnd(0.7, 1.25); n++; }
    const g = new THREE.InstancedBufferGeometry(); g.instanceCount = n;
    if (MP) grassTuftGeo(g); else { g.setAttribute('position', new THREE.Float32BufferAttribute([-.5, 0, 0, .5, 0, 0, -.5, .5, 0, .5, .5, 0, 0, 1, 0], 3)); g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]); }
    g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3)); g.setAttribute('aPar', new THREE.InstancedBufferAttribute(par, 4));
    const m = MP ? GRASS_MP() : mat(`varying float vH; varying float vT; void main(){ vec3 n=NORMAL; float patchy=fbm(vW.xz*0.015); vec3 alb=mix(vec3(0.03,0.10,0.02),mix(vec3(0.30,0.50,0.09),vec3(0.46,0.50,0.16),smoothstep(0.45,0.7,patchy)),vH)*vT; alb*=0.85+0.25*(1.0-smoothstep(0.0,0.1,abs(vL.x)));
    alb=mix(alb,vec3(0.5,0.45,0.18),smoothstep(0.85,1.0,vH)*step(1.1,vT));
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.25*vH,0.9),vW),1.0); }`, { side: THREE.DoubleSide, vert: `
    attribute vec3 aOff; attribute vec4 aPar; uniform float uTime; uniform vec4 uWake; uniform vec4 uWakeD; varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv; varying vec3 vL; varying float vH; varying float vT;
    void main(){ float h=aPar.x, c=cos(aPar.y), s=sin(aPar.y), y=position.y;
      float bend=y*y*(0.8+sin(uTime*1.2+aPar.z+aOff.x*0.04+aOff.z*0.03)*0.7)*h*0.2;
      vec3 l=vec3(position.x*1.1*(1.0-y*0.8), y*h, bend);
      vec3 w=aOff+vec3(l.x*c-l.z*s, l.y, l.x*s+l.z*c);
      ${WAKEGLSL}
      vW=w; vL=position; vC=vec3(1.0); vUv=vec2(0.0); vN=normalize(vec3(-s*0.7,0.5+y*0.4,c*0.7)); vH=y; vT=aPar.w;
      gl_Position=projectionMatrix*viewMatrix*vec4(w,1.0); }` });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; scene.add(mesh); grassMesh = mesh; seeTwin(mesh);
  }
}

// flowers
const PAL = [
  { p: [0.95, 0.94, 0.90], c: [0.95, 0.62, 0.05], np: [18, 24], len: [2.6, 3.4], kind: 'daisy' },
  { p: [0.92, 0.32, 0.55], c: [0.85, 0.60, 0.06], np: [8, 8], len: [3.0, 4.0], kind: 'cosmos' },
  { p: [0.62, 0.30, 0.85], c: [0.88, 0.66, 0.08], np: [8, 8], len: [2.6, 3.4], kind: 'cosmos' },
  { p: [1.0, 0.72, 0.06], c: [0.22, 0.11, 0.03], np: [16, 22], len: [3.0, 4.2], kind: 'daisy' },
  { p: [0.95, 0.10, 0.03], c: [0.04, 0.03, 0.04], np: [4, 4], len: [3.4, 4.2], kind: 'poppy' },
  { p: [1.0, 0.55, 0.08], c: [0.10, 0.06, 0.03], np: [4, 5], len: [3.0, 3.8], kind: 'poppy' }];

export function setupFlowers() {
  {
    const place = (x, z) => { if (terrainH(x, z) < WY + 1.5 || Math.hypot(x, z) < 22) return; if (Math.hypot(x - FOREST.x, z - FOREST.z) < FOREST.r + 14 || Math.hypot(x - LOG.c.x, z - LOG.c.z) < 30 || Math.abs(Math.hypot(x - ORCH.x, z - ORCH.z) - HEDGE_R) < 10) return; const ty = (Math.random() * PAL.length) | 0, T = PAL[ty];
      for (const f of flowers) if (Math.hypot(f.x - x, f.z - z) < 7) return;
      flowers.push({ x, z, y: terrainH(x, z) + rnd(9, 22), r: rnd(1.0, 1.7), T, np: Math.round(rnd(T.np[0], T.np[1])), len: rnd(T.len[0], T.len[1]), cool: 0, tilt: rnd(0.05, 0.45), ax: rnd(-0.12, 0.12), az: rnd(-0.12, 0.12), val: 1, orch: Math.hypot(x - ORCH.x, z - ORCH.z) < HEDGE_R }); };
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
    let guard = 0; while (flowers.length < 120 && guard++ < 3000) place(FDIR.x * FIELD_D + gauss() * 62, FDIR.z * FIELD_D + gauss() * 62);
    for (let i = 0; i < 7; i++) { const a = rnd(-1.2, 1.9), d = rnd(28, 70); place(Math.cos(a) * d, Math.sin(a) * d); }
    guard = 0; while (flowers.length < 185 && guard++ < 3000) { const a = rnd(TAU), d = rnd(40, 310); place(Math.cos(a) * d, Math.sin(a) * d); }
    // sunblooms crown the orchard canopies (rare, worth 3)
    const SUNPAL = { p: [1.3, 0.85, 0.12], c: [0.95, 0.38, 0.02] };
    const BLOSSOM = { p: [1.15, 0.72, 0.78], c: [0.95, 0.85, 0.3] };
    for (const t of orchTrees) flowers.push({ x: t.x + srnd(-2, 2), z: t.z + srnd(-2, 2), y: t.top + t.cr * 0.68 + 0.4, r: 1.5, T: BLOSSOM, np: 14, len: 3.2, cool: 0, tilt: 0.2, ax: 0, az: 0, val: 1, orch: true, canopy: true });
    for (let i = 0; i < 30; i++) { const a = srnd(TAU), d = Math.sqrt(srnd()) * (ORCH.r - 5), x = ORCH.x + Math.cos(a) * d, z = ORCH.z + Math.sin(a) * d;
      if (orchTrees.some(t => Math.hypot(t.x - x, t.z - z) < t.cr + 2) || flowers.some(f => Math.hypot(f.x - x, f.z - z) < 7)) continue; const T = PAL[(srnd() * PAL.length) | 0];
      flowers.push({ x, z, y: terrainH(x, z) + srnd(8, 15), r: srnd(1, 1.6), T, np: Math.round(srnd(T.np[0], T.np[1])), len: srnd(T.len[0], T.len[1]), cool: 0, tilt: srnd(0.05, 0.45), ax: 0, az: 0, val: 2, orch: true }); }
    { // the ground flowers tucked closest under the canopies become sunblooms (worth 3)
      const g = flowers.filter(f => f.orch && !f.canopy).map(f => [f, Math.min(...orchTrees.map(t => Math.hypot(t.x - f.x, t.z - f.z) - t.cr))]).sort((a, b) => a[1] - b[1]);
      for (const [f] of g.slice(0, 5)) { f.val = 3; f.T = SUNPAL; f.np = 14; f.r = 1.4; f.y = Math.min(f.y, terrainH(f.x, f.z) + 9); } }
    { const H = HILLS[0]; flowers.push({ x: H.x, z: H.z, y: terrainH(H.x, H.z) + 30, r: 5.5, T: { p: [1.2, 0.72, 0.04], c: [0.22, 0.11, 0.03] }, np: 28, len: 12, cool: 0, tilt: 0.25, ax: 0.1, az: -0.05, val: 5, giant: true, sw: 3.5 }); }
    for (const sg of [-1, 1]) { const c = LOG.c.clone().addScaledVector(LOG.axis, sg * 9); flowers.push({ x: c.x, z: c.z, y: c.y - LOG.ri + 1.1, r: 0.8, T: { p: [0.6, 1.15, 0.8], c: [0.9, 1.0, 0.6] }, np: 7, len: 1.6, cool: 0, tilt: 0.2, ax: 0, az: 0, val: 2, inLog: true }); }
    // round 6: pond lilies sitting on the pads (the pads are placed here so the lilies can sit on them)
    { let guard = 0; while (PADS0.length < 11 && guard++ < 500) { const a = rnd(TAU), d = rnd(8, POND.r - 6), x = POND.x + Math.cos(a) * d, z = POND.z + Math.sin(a) * d; if (!overWater(x, z) || terrainH(x, z) > WY - 1.2) continue; if (PADS0.some(p => Math.hypot(p.x - x, p.z - z) < p.r + 9)) continue; PADS0.push({ x, z, r: rnd(4, 7.5) }); }
      const LILY = { p: [1.25, 1.12, 1.15], c: [1.1, 0.75, 0.1] }, LOTUS = { p: [1.3, 0.5, 0.72], c: [1.2, 0.85, 0.15] };
      const big = PADS0.reduce((a, b) => (b.r > a.r ? b : a), PADS0[0]);
      PADS0.forEach((p, i) => { if (i % 2 && p !== big) return; const lotus = p === big, a = rnd(TAU), o = p.r * 0.4;
        flowers.push({ x: p.x + Math.cos(a) * o, z: p.z + Math.sin(a) * o, y: WY + (lotus ? 1.5 : 1.0), r: lotus ? 1.5 : 1.1, T: lotus ? LOTUS : LILY, np: lotus ? 16 : 11, len: lotus ? 2.4 : 1.7, cool: 0, tilt: 0.55, ax: 0, az: 0, val: lotus ? 3 : 2, zone: 'pond', lily: true }); });
    }
    // round 6: woodland flowers: violets low among the roots, foxgloves standing in the shade under the trees
    { const VIOLET = { p: [0.55, 0.3, 1.05], c: [1.1, 0.85, 0.15] }, FOX = { p: [0.95, 0.35, 0.85], c: [1.0, 0.95, 0.85] }, fr = FOREST.rnd; let guard = 0, nv = 0, nf = 0;
      while ((nv < 14 || nf < 5) && guard++ < 4000) { const a = fr(0, TAU), d = Math.sqrt(fr(0, 1)) * FOREST.r, x = FOREST.x + Math.cos(a) * d, z = FOREST.z + Math.sin(a) * d;
        if (forestTrees.some(t => Math.hypot(t.x - x, t.z - z) < t.R + 4) || flowers.some(f => Math.hypot(f.x - x, f.z - z) < 6)) continue;
        const fox = nf < 5 && forestTrees.some(t => Math.hypot(t.x - x, t.z - z) < t.cr * 0.8); if (!fox && nv >= 14) continue;
        const gy = terrainH(x, z); if (fox) nf++; else nv++;
        flowers.push({ x, z, y: gy + (fox ? fr(14, 19) : fr(2.5, 4.5)), r: fox ? 1.2 : 0.9, T: fox ? FOX : VIOLET, np: fox ? 9 : 5, len: fox ? 2.0 : 1.5, cool: 0, tilt: fox ? 0.5 : 0.25, ax: fr(-0.1, 0.1), az: fr(-0.1, 0.1), val: fox ? 3 : 2, zone: 'forest', fox }); }
    }
    // batch 2: clear flowers out of the brook and the bramble wall; moonbells (worth 3) grow hidden in the hollow
    for (let i = flowers.length - 1; i >= 0; i--) { const f = flowers[i]; if (f.lily) continue; if (brookD(f.x, f.z) < BROOK.hw + 2.5 || Math.hypot(f.x - HOLLOW.x, f.z - HOLLOW.z) < HOLLOW.r + 3) flowers.splice(i, 1); }
    { const MOON = { p: [0.62, 0.78, 1.15], c: [1.15, 0.95, 0.45] };
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + 0.4, d = k === 0 ? 0 : 7.5, x = HOLLOW.x + Math.cos(a) * d, z = HOLLOW.z + Math.sin(a) * d;
        flowers.push({ x, z, y: terrainH(x, z) + (k === 0 ? 5.5 : 3.6), r: 1.0, T: MOON, np: 10, len: 1.8, cool: 0, tilt: 0.3, ax: 0, az: 0, val: 3, glade: true }); } }
    const pg = new THREE.PlaneGeometry(1, 1, 10, 6); pg.rotateX(-Math.PI / 2); pg.translate(0.5, 0, 0);
    { const p = pg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const prof = Math.sin(Math.PI * Math.pow(x, 0.62)) * 0.9 + 0.12; p.setZ(i, z * prof); p.setY(i, 0.22 * x * x - 0.5 * z * z * prof + Math.sin(x * 9) * 0.01 + 0.16 * Math.pow(x, 6) - 0.05 * Math.abs(z) * x); } pg.computeVertexNormals(); }
    const totalP = flowers.reduce((s, f) => s + f.np, 0);
    const petalMat = mat(`void main(){ vec3 n=NORMAL; float v=vUv.x; float across=abs(vUv.y-0.5)*2.0;
    vec3 base=vC*(0.72+0.38*v)*(0.9+0.2*vnoise(vUv*vec2(6.0,40.0)));
    base=mix(base, base*0.7, pow(abs(sin(vUv.y*22.0)),8.0)*0.4); float rib=1.0-smoothstep(0.0,0.05,abs(vUv.y-0.5)); base*=1.0-0.2*rib*smoothstep(0.05,0.4,v); base=mix(base,base*0.72,smoothstep(0.8,1.0,across)*0.6);
    float reveal=smoothstep(60.0,16.0,length(vW-uCam));
    float guide=smoothstep(0.62,0.12,v); float veins=pow(abs(sin(vUv.y*15.7)),10.0)*smoothstep(0.95,0.3,v);
    vec3 uvc=mix(vec3(0.30,0.06,0.95),vec3(0.10,0.95,0.90),0.5+0.5*sin(uTime*1.6+v*10.0));
    float k=reveal*clamp(guide*0.75+veins*0.6,0.0,1.0);
    vec3 c=shade(mix(base,base*0.55,k*0.5),n,vW,0.12,1.0)+uvc*k*0.3*(1.0-0.85*uNight);
    gl_FragColor=vec4(finish(c,vW),1.0); }`, { side: THREE.DoubleSide });
    const swayV = (stem, centre) => SWAYGLSL + VERT.replace('vec4 w = m*vec4(position,1.0);', `vec4 w = m*vec4(position,1.0); vec2 o=vec2(m[3][0],m[3][2])${centre ? '' : ''}; w.xz += sway(o)*aSway${stem ? '*position.y*position.y' : ''};`);
    petalMat.vertexShader = swayV(false);
    petalMat.vertexShader = 'uniform float uClose;\n' + petalMat.vertexShader.replace('vec4 w = m*vec4(position,1.0);', 'vec3 pc=position; float ca=uClose*1.2; pc=vec3(pc.x*cos(ca)-pc.y*sin(ca), pc.x*sin(ca)+pc.y*cos(ca), pc.z*(1.0-0.5*uClose)); vec4 w = m*vec4(pc,1.0);');
    const KINDS = ['classic', 'daisy', 'poppy', 'cosmos'], kindOf = f => (f.T && f.T.kind) || 'classic';
    const petalGeo = kind => { if (kind === 'classic') return pg; const g = new THREE.PlaneGeometry(1, 1, 14, 8); g.rotateX(-Math.PI / 2); g.translate(0.5, 0, 0); const P2 = g.attributes.position;
      for (let i = 0; i < P2.count; i++) { let x = P2.getX(i), z = P2.getZ(i), y = 0, prof;
        if (kind === 'daisy') { prof = Math.sin(Math.PI * Math.pow(x, 0.5)) * 0.32 + 0.05; y = 0.12 * x * x - 0.3 * z * z * prof + 0.06 * Math.pow(x, 5); }
        else if (kind === 'poppy') { prof = Math.sin(Math.PI * Math.pow(x, 0.85)) * 1.25 + 0.14; y = 0.28 * x * x - 0.18 * z * z * prof + 0.035 * Math.sin(z * 22 + x * 9) * x + 0.025 * Math.sin(x * 31) * x; }
        else { prof = Math.sin(Math.PI * Math.pow(x, 0.62)) * 0.85 + 0.1; const notch = 0.09 * Math.abs(Math.sin(z * Math.PI * 3 / Math.max(prof, 0.2))) * smooth(0.75, 1, x); x -= notch; y = 0.2 * x * x - 0.35 * z * z * prof + 0.02 * Math.sin(z * 18) * x; }
        P2.setXYZ(i, x, y, z * prof); }
      g.computeVertexNormals(); return g; };
    const kindCount = {}; for (const k of KINDS) kindCount[k] = 0; for (const f of flowers) kindCount[kindOf(f)] += f.np;
    const PM = {}; for (const k of KINDS) { const g = petalGeo(k); const im = new THREE.InstancedMesh(g, petalMat, Math.max(1, kindCount[k])); im.frustumCulled = false; PM[k] = { im, g, sw: new Float32Array(Math.max(1, kindCount[k])), n: 0 }; }
    const petals = PM.classic.im;
    const cen = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 22, 12), mat(`void main(){ vec3 n=NORMAL; vec2 q=vL.xz; float r=length(q); float a=atan(q.y,q.x);
    float s1=sin(a*13.0+r*30.0), s2=sin(a*21.0-r*30.0); float fl=0.5+0.5*s1*s2; fl=mix(fl,vnoise(q*24.0),0.35);
    vec3 alb=vC*(0.6+0.55*fl)*(0.75+0.35*smoothstep(0.1,0.9,r)); alb=mix(alb,vec3(1.0,0.78,0.22),smoothstep(0.55,0.95,r)*0.45*fl);
    float pol=smoothstep(0.72,0.85,vnoise(q*40.0))*smoothstep(0.25,0.8,r); alb=mix(alb,vec3(1.15,0.88,0.28),pol);
    n=normalize(n+vec3(cos(a),0.0,sin(a))*(fl-0.5)*0.45);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.1+0.5*pol,0.45),vW),1.0); }`, { vert: swayV(false) }), flowers.length); cen.frustumCulled = false;
    const stemG = new THREE.CylinderGeometry(0.14, 0.22, 1, 6); stemG.translate(0, 0.5, 0);
    const stems = new THREE.InstancedMesh(stemG, simple('0.12,0.30,0.05', 0.2, 0.4, { vert: swayV(true) }), flowers.length); stems.frustumCulled = false;
    const m = new M4(), q = new Q4(), e = new THREE.Euler(), col = new THREE.Color(); let pi = 0;
    const swP = new Float32Array(totalP), swF = new Float32Array(flowers.length);
    flowers.forEach((f, i) => {
      f.sway = f.giant ? 0.25 : (f.val >= 3 || f.inLog || f.canopy) ? 0 : f.lily ? 0.3 : 1; swF[i] = f.sway;
      const gy = terrainH(f.x, f.z);
      m.compose(new V3(f.x, gy - 0.5, f.z), q.identity(), new V3(f.sw || 1, f.y - gy + 0.3, f.sw || 1)); stems.setMatrixAt(i, m);
      const hq = new Q4().setFromEuler(new THREE.Euler(f.ax, 0, f.az));
      m.compose(new V3(f.x, f.y, f.z), hq, new V3(f.r, f.r * 0.5, f.r)); cen.setMatrixAt(i, m); cen.setColorAt(i, col.setRGB(...f.T.c));
      for (let k = 0; k < f.np; k++) { const a = k / f.np * TAU + i; e.set(0, a, f.tilt + rnd(-0.06, 0.06), 'YXZ'); q.setFromEuler(e).premultiply(hq);
        const off = new V3(f.r * 0.75, -0.1, 0).applyQuaternion(q); const sh = rnd(0.85, 1.1);
        const K = PM[kindOf(f)], kd = kindOf(f), wf = kd === 'daisy' ? 1 : kd === 'poppy' ? 1 : kd === 'cosmos' ? 1 : Math.min(1.1, 7.5 / f.np); if (kd === 'poppy') { e.set(0, a, f.tilt * 0.5 + 0.05 + rnd(-0.06, 0.06), 'YXZ'); q.setFromEuler(e).premultiply(hq); }
        m.compose(new V3(f.x + off.x, f.y + off.y, f.z + off.z), q, new V3(f.len, f.len, f.len * wf)); K.im.setMatrixAt(K.n, m); K.im.setColorAt(K.n, col.setRGB(f.T.p[0] * sh, f.T.p[1] * sh, f.T.p[2] * sh)); K.sw[K.n] = f.sway; K.n++; pi++; }
    });
    for (const k of KINDS) PM[k].g.setAttribute('aSway', new THREE.InstancedBufferAttribute(PM[k].sw, 1)); cen.geometry.setAttribute('aSway', new THREE.InstancedBufferAttribute(swF, 1)); stemG.setAttribute('aSway', new THREE.InstancedBufferAttribute(swF, 1));
    for (const k of KINDS) scene.add(PM[k].im); scene.add(cen, stems);
  }
}

// mushrooms
export const shrooms = [];

export function setupMushrooms() {
  {
    const capM = mat(`void main(){ vec3 n=NORMAL; float sp=smoothstep(0.62,0.7,vnoise(vL.xz*6.5+vW.xz*0.1)); float under=step(vL.y,0.02);
    vec3 alb=mix(vec3(0.50,0.05,0.02),vec3(0.85,0.80,0.68),sp); alb=mix(alb,vec3(0.75,0.68,0.55)*(0.6+0.4*abs(sin(atan(vL.z,vL.x)*40.0))),under);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.5*(1.0-sp),0.3),vW),1.0); }`, { side: THREE.DoubleSide });
    const capG = new THREE.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2), stG = new THREE.CylinderGeometry(0.22, 0.32, 1, 10); stG.translate(0, 0.5, 0); const stM = simple('0.80,0.74,0.62', 0.1, 0.5);
    for (const [a, d, R] of [[0.6, 26, 4.2], [0.9, 32, 2.8], [-0.7, 30, 3.6], [2.6, 40, 5], [4.0, 55, 3.4], [1.5, 80, 4.4], [-1.6, 95, 3.2]]) {
      const x = Math.cos(a) * d, z = Math.sin(a) * d, gy = terrainH(x, z), h = R * 1.4; const c = new THREE.Mesh(capG, capM); c.position.set(x, gy + h, z); c.scale.set(R, R * 0.7, R); const s = new THREE.Mesh(stG, stM); s.position.set(x, gy - 0.5, z); s.scale.set(R, h + 0.6, R); scene.add(c, s);
      shrooms.push({ x, y: gy + h, z, R, gy, mesh: c, sq: 0 });
    }
  }
}

// ---------- round 7: leafy fringe shells around tree crowns, so the outline breaks into leaves ----------
const fringeMat = (blossom) => mat(`void main(){ vec3 n=NORMAL;
  float lf=vnoise(vW.xz*1.7+vW.y*1.4)*0.55+vnoise(vW.xz*4.3-vW.y*3.9)*0.45; if(lf<0.53) discard;
  float a=fbm(vW.xz*0.35+vW.y*0.3); vec3 leaf=mix(vec3(0.04,0.12,0.03),vec3(0.27,0.43,0.08),a);
  vec3 bl=mix(vec3(0.92,0.38,0.58),vec3(1.0,0.80,0.84),vnoise(vW.xz*7.0+vW.y*5.0));
  float isB=${blossom ? 'smoothstep(0.42,0.56,fbm(vW.xz*1.4+vW.y*1.1))' : '0.0'};
  vec3 alb=mix(leaf,bl,isB)*(0.7+1.2*(lf-0.53));
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.05,0.9),vW),1.0); }`);
export function addFringe(im, blossom) { const f = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.13, 3), fringeMat(blossom), im.count); f.instanceMatrix = im.instanceMatrix; f.frustumCulled = false; scene.add(f); return f; }

// --- solid flowers: stems block you; the bloom is a curved cup (centre dome + upturned petals) you land on, bump under, or slide around
export function bloomH(f, d) {
  const dome = d < f.r ? f.r * 0.5 * Math.sqrt(1 - (d / f.r) ** 2) : 0;
  const x = clamp((d - f.r * 0.75) / f.len, 0, 1), pet = d > f.r * 0.75 ? (x * Math.sin(f.tilt + 0.08) + 0.24 * x * x) * f.len : 0;
  return Math.max(dome, pet) + Math.abs(f.ax || 0) * d + Math.abs(f.az || 0) * d;
}
export function flowerHit(f, d, dt) {
  const p = P.pos, v = P.vel, big = f.giant ? 1.5 : 0, cl = f.lily ? 0 : U.uClose.value, tE = Math.min(1.45, f.tilt + cl * 1.2), Rh = lerp(f.r * 0.75 + f.len * 0.85, f.r * 0.75 + f.len * Math.cos(tE) * 0.95 + 0.25, cl), bot = f.y - 1.4 - big, sr = 0.25 * (f.sw || 1) + PR;
  const fx = f.sx, fz = f.sz;
  if (p.y < bot) { if (d < sr) { const k = sr / Math.max(d, 0.01); p.x = fx + (p.x - fx) * k; p.z = fz + (p.z - fz) * k; } return false; }
  if (d > Rh + PR) return false;
  const top = f.y + (cl > 0.01 ? lerp(bloomH(f, Math.min(d, Rh)), f.len * (Math.sin(tE) + 0.24) + Math.abs(f.ax || 0) * d, cl) : bloomH(f, Math.min(d, Rh))) + PR + 0.15;
  const dwell = (f.val >= 2 || f.giant) && !(f.rich > 0), held = dwell && time - (f.lastLand || -9) < 0.3 && !(G.ku > 0) && !(G.kf < 0); // a bee on a rich bloom holds on: forward thrust does not pull her off
  if (p.y > top + (held ? 0.7 : 0.001)) return false;
  const pt = top - p.y, pb = p.y - bot, ps = Rh + PR - d;
  if (pt <= pb && pt <= 1.6 + big + ps) { p.y = top; v.y = Math.max(v.y, 0); v.x *= 1 - Math.min(1, dt * 5); v.z *= 1 - Math.min(1, dt * 5); P.landed = f; p.x += f.dsx; p.z += f.dsz; if (dwell && f.cool <= 0 && P.pollen < G.cap && !zoneLocked(f) && !(G.ku > 0) && !(G.kf < 0) && (held || d < Rh * 0.85)) { const k = Math.min(1, dt * 4); p.x += (fx - p.x) * k; p.z += (fz - p.z) * k; v.set(0, 0, 0); d = Math.hypot(p.x - fx, p.z - fz); } return d < Rh * 0.85; } // only the top of the bloom gives pollen
  else if (pb <= ps) { p.y = bot; v.y = Math.min(v.y, 0); }
  else { const k = (Rh + PR) / Math.max(d, 0.01); p.x = fx + (p.x - fx) * k; p.z = fz + (p.z - fz) * k; const nx = (p.x - fx) / (Rh + PR), nz = (p.z - fz) / (Rh + PR), vn = v.x * nx + v.z * nz; if (vn < 0) { v.x -= vn * nx * 1.3; v.z -= vn * nz * 1.3; } }
  return false;
}
export function shroomSolid(s) {
  const dx = P.pos.x - s.x, dz = P.pos.z - s.z, d = Math.hypot(dx, dz), y = P.pos.y, br = 0.45;
  const stemR = s.R * 0.28 + br;
  if (y > s.gy - 1 && y < s.y && d < stemR) { const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0; P.pos.x = s.x + nx * stemR; P.pos.z = s.z + nz * stemR; const vn = P.vel.x * nx + P.vel.z * nz; if (vn < 0) { P.vel.x -= vn * nx; P.vel.z -= vn * nz; } }
  if (d < s.R + br * 0.5 && y < s.y + 0.05 && y > s.y - 0.5 - br) { P.pos.y = s.y - 0.5 - br; if (P.vel.y > 0) P.vel.y = -P.vel.y * 0.2; }
}
