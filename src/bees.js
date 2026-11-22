// Honeylight: the sisters: bodies, hive bees, foragers, the dance, escorts and the bee ball.
import * as THREE from '../three.module.min.js';
import { M4, Q4, V3, rnd, clamp, lerp, smooth, TAU } from './core.js';
import { CT, HTOP, RIN, ROUT, TR, TY, FDIR, FIELD_D, DANCE_A, terrainH } from './world.js';
import { scene, UNTONE, U, VERT, mat, geoParts, ell, stick } from './engine.js';
import { COMBS, BIRTH } from './hive.js';
import { flowers } from './plants.js';
import { P, PR, me } from './player.js';
import { hint } from './controls.js';
import { heatBuzz } from './abilities.js';
import { wasps, eatWasp } from './wasps.js';
import { G, toast } from './progress.js';
import { tone, SCALE, noiseHit, sweep } from './audio.js';
import { fwd, inHive, time } from './loop.js';

// ---------- bees ----------
export let beeMat, wingGeo, wingMat;
let BEE_VERT, BEE_SEGS, beeGeo, beeMesh, furGeo, FUR_VERT, furMeshes, wingMesh;
export function setupBeeBodies() {
  BEE_VERT = VERT.replace('void main(){', 'uniform float uTime; attribute vec4 aMove; attribute float aPol; varying float vPol;\nvoid main(){').replace('vec4 w = m*vec4(position,1.0);', `vec3 pp=position; float isLeg=0.0; vPol=0.0;
  #ifdef USE_COLOR
  isLeg=step(abs(color.r-0.05),0.004)*step(abs(color.g-0.03),0.004)*step(abs(color.b-0.02),0.003);
  float isPol=step(abs(color.r-0.93),0.004)*step(abs(color.g-0.64),0.004)*step(abs(color.b-0.09),0.004);
  vec3 polC=vec3(sign(pp.x)*0.335,-0.08,-0.175); pp=mix(pp,polC+(pp-polC)*aPol,isPol); isLeg=max(isLeg,isPol); vPol=isPol;
  #endif
  float reach=clamp((abs(pp.x)-0.06)/0.3,0.0,1.0); float ph=aMove.z, fl=aMove.w;
  float wig=0.0;
  pp.z-=isLeg*reach*(aMove.x*0.24+wig*0.04*(0.5+fl));
  pp.x+=isLeg*(reach+clamp(-pp.y*2.0,0.0,1.0))*aMove.y*0.2;
  pp.y-=isLeg*reach*fl*0.11;
  float abd=smoothstep(-0.1,-0.45,pp.z)*(1.0-isLeg);
  pp.y+=abd*(sin(uTime*2.2+ph)*0.03*(0.3+fl)-aMove.x*0.06)*(-pp.z);
  pp.x+=abd*aMove.y*0.10*(-pp.z);
  float head=smoothstep(0.24,0.34,pp.z)*(1.0-isLeg);
  pp.x+=head*aMove.y*0.05; pp.y+=head*(sin(uTime*1.7+ph)*0.012-aMove.x*0.02);
  vec4 w = m*vec4(pp,1.0);`);
  BEE_SEGS = [0, 1, 2, 3, 4, 5].map(i => { const t = i / 5; return [0.205 * Math.pow(Math.sin(Math.PI * (0.18 + t * 0.74)), 0.6) + 0.02, -0.13 - i * 0.092, i % 2 === 1 || i === 5]; });
  beeGeo = (() => {
    const amber = [0.70, 0.42, 0.08], dark = [0.06, 0.035, 0.02], fuzz = [0.25, 0.15, 0.05], leg = [0.05, 0.03, 0.02], ant = [0.04, 0.03, 0.025], eye = [0.012, 0.01, 0.01], head = [0.09, 0.06, 0.04];
    const parts = [
      { g: ell(0.18, 0.17, 0.19, 0, 0.03, 0.13, 20), c: fuzz },
      { g: ell(0.06, 0.06, 0.07, 0, 0.0, -0.06, 10), c: dark },
      { g: ell(0.15, 0.16, 0.11, 0, 0.01, 0.38, 18), c: head },
      { g: ell(0.09, 0.09, 0.07, 0, -0.07, 0.44, 12), c: head },
      { g: ell(0.065, 0.115, 0.085, 0.112, 0.025, 0.392, 14), c: eye }, { g: ell(0.065, 0.115, 0.085, -0.112, 0.025, 0.392, 14), c: eye },
    ];
    for (const sd of [1, -1]) parts.push({ g: stick([sd * 0.04, 0.07, 0.46], [sd * 0.07, 0.17, 0.54], 0.011), c: ant }, { g: stick([sd * 0.07, 0.17, 0.54], [sd * 0.15, 0.2, 0.74], 0.009), c: ant });
    // abdomen: six overlapping rings, amber and dark, tapering to the tip
    BEE_SEGS.forEach(([r, zc, dk]) => parts.push({ g: ell(r, r * 0.92, 0.1, 0, -0.012, zc, 20), c: dk ? dark : amber }));
    // jointed legs: femur, tibia, tarsus; the hind tibia is broad (the pollen basket)
    for (const s of [1, -1]) for (const [k, z0, z1] of [[0, 0.22, 0.38], [1, 0.12, 0.14], [2, 0.02, -0.24]]) {
      const hip = [s * 0.1, -0.08, z0], knee = [s * 0.28, 0.02, (z0 + z1) / 2], ankle = [s * 0.34, -0.17, z1], toe = [s * 0.37, -0.25, z1 + (k === 2 ? -0.05 : 0.04)];
      parts.push({ g: stick(hip, knee, 0.016), c: leg }, { g: stick(knee, ankle, k === 2 ? 0.024 : 0.012), c: leg }, { g: stick(ankle, toe, 0.007), c: leg });
    }
    // pollen packed into the hind-leg baskets (scaled per bee in the shader by aPol)
    for (const s of [1, -1]) parts.push({ g: ell(0.064, 0.06, 0.088, s * 0.335, -0.08, -0.175, 14), c: [0.93, 0.64, 0.09] });
    return geoParts(parts);
  })();
  beeGeo.setAttribute('aMove', new THREE.InstancedBufferAttribute(beeMove, 4));
  beeGeo.setAttribute('aPol', new THREE.InstancedBufferAttribute(beePol, 1));
  beeMat = mat(`varying float vPol; void main(){ vec3 n=normalize(vN); vec3 V=normalize(uCam-vW);
  float fz=hash21(floor(vL.xy*90.0)+floor(vL.z*90.0)); float isF=smoothstep(0.2,0.5,vC.g/(vC.r+0.001)-0.3)*step(0.2,vC.r);
  vec3 alb=vC*(0.8+0.45*fz);
  float isEye=step(vC.r,0.02); if(isEye>0.5){ vec2 hp=vL.yz*150.0; vec2 fc=fract(hp+vec2(0.0,0.5*mod(floor(hp.x),2.0)))-0.5; n=normalize(n+vec3(0.0,fc)*0.07); alb=vec3(0.015,0.013,0.012); }
  if(vPol>0.5){ vec3 gq=floor(vL*150.0); vec3 gr=vec3(hash21(gq.xy),hash21(gq.yz+3.1),hash21(gq.xz+7.7))-0.5; n=normalize(n+gr*0.6); alb=vec3(0.95,0.55,0.07)*(0.7+0.55*hash21(gq.xy+gq.z*1.7)); }
  float rimv=pow(1.0-max(dot(n,V),0.0),2.0);
  float lum=dot(alb,vec3(0.33)); float hard=1.0-smoothstep(0.02,0.12,lum);
  alb*=mix(1.0,0.32,hard); vec3 c=shade(alb,n,vW,0.25+0.5*hard+0.5*isEye,0.25);
  c+=shade(vec3(0.75,0.55,0.25),n,vW,0.0,1.0)*rimv*0.28*(1.0-hard);
  gl_FragColor=vec4(finish(c,vW),1.0); }`, { vertexColors: true, vert: BEE_VERT });
  beeMesh = new THREE.InstancedMesh(beeGeo, beeMat, MAXB); beeMesh.frustumCulled = false; scene.add(beeMesh);
  // ---------- round 7: crisp fur tufts around each bee body (thorax longest) ----------
  furGeo = geoParts([
    { g: ell(0.18, 0.17, 0.19, 0, 0.03, 0.13, 18), c: [0.25, 0.15, 0.05] },
    ...BEE_SEGS.map(([r, zc, dk]) => ({ g: ell(r, r * 0.92, 0.1, 0, -0.012, zc, 16), c: dk ? [0.06, 0.035, 0.02] : [0.70, 0.42, 0.08] }))]);
  furGeo.setAttribute('aMove', beeGeo.getAttribute('aMove'));
  FUR_VERT = BEE_VERT.replace('void main(){', 'uniform float uShell;\nvoid main(){').replace('vec3 pp=position;', `vec3 pp=position;
  #ifdef USE_COLOR
  float furL=color.r>0.5?0.55:(color.g>0.1?1.3:0.5); pp+=normal*uShell*furL;
  #endif
  `);
  furMeshes = [0.2, 0.4, 0.6, 0.8, 1.0].map(k => {
    const m = mat(`uniform float uK; void main(){ vec3 n=normalize(vN); vec3 V=normalize(uCam-vW);
    vec3 q=vL*190.0; vec3 id=floor(q); vec3 j=vec3(hash21(id.xy+id.z*3.1),hash21(id.yz+id.x*7.7),hash21(id.zx+id.y*5.3));
    float d=length(fract(q)-0.25-j*0.5); if(d>0.62*(1.0-uK*0.75)) discard;
    vec3 alb= vC.r>0.5 ? vec3(0.86,0.56,0.16) : (vC.g>0.1 ? mix(vec3(0.62,0.42,0.16),vec3(0.9,0.68,0.32),j.x) : vec3(0.08,0.06,0.045));
    alb*=0.5+0.75*uK;
    float rim=pow(1.0-max(dot(n,V),0.0),1.5);
    vec3 c=shade(alb,n,vW,0.05,1.0)+shade(alb*1.5+0.04,n,vW,0.0,1.0)*rim*0.3*uK;
    gl_FragColor=vec4(finish(c,vW),1.0); }`, { vertexColors: true, vert: FUR_VERT, uniforms: { uShell: { value: 0.042 * k }, uK: { value: k } } });
    const fm = new THREE.InstancedMesh(furGeo, m, MAXB); fm.instanceMatrix = beeMesh.instanceMatrix; fm.frustumCulled = false; fm.count = 0; scene.add(fm); return fm; });

  wingGeo = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(0.12, 0.12, 0.48, 0.14, 0.56, 0.02); s.bezierCurveTo(0.5, -0.1, 0.15, -0.08, 0, 0); const g = new THREE.ShapeGeometry(s, 8); g.rotateX(-Math.PI / 2); return g; })();
  wingMat = mat(`void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW); float cv=abs(dot(n,V)); float f=pow(1.0-cv,2.0);
  vec2 p=vec2(vL.x,vL.z); vec2 g=p*vec2(13.0,19.0); vec2 i0=floor(g), f0=fract(g); float d1=9.0, d2=9.0;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 o=vec2(float(x),float(y)); vec2 hh=vec2(hash21(i0+o),hash21(i0+o+17.3)); vec2 d=o+0.15+hh*0.7-f0; float dd=dot(d,d); if(dd<d1){ d2=d1; d1=dd; } else if(dd<d2) d2=dd; }
  float vein=1.0-smoothstep(0.0,0.07,sqrt(d2)-sqrt(d1));
  float lead=1.0-smoothstep(0.0,0.018,abs(-p.y-0.075*sin(clamp(p.x/0.56,0.0,1.0)*3.1416)-0.01)); vein=max(vein,lead*step(p.x,0.5));
  vec3 film=0.5+0.5*cos(6.2832*(vec3(0.0,0.33,0.67)+(1.0-cv)*1.7+vnoise(p*18.0)*0.7));
  film=mix(vec3(dot(film,vec3(0.333))),film,0.35)*vec3(1.0,0.94,0.82); // soft, warm sheen, not neon
  vec3 lit=shade(vec3(1.0),n,vW,0.0,1.0); float lum=min(dot(lit,vec3(0.3,0.5,0.2)),1.5);
  vec3 mem=shade(vec3(0.82,0.82,0.78),n,vW,1.6,1.0)*0.25+film*(0.12+0.5*f)*0.3*lum;
  vec3 c=mix(mem,shade(vec3(0.10,0.07,0.04),n,vW,0.4,0.2),vein*0.85);
  gl_FragColor=vec4(finish(c,vW),clamp(0.05+0.25*f+vein*0.6,0.0,0.95)); }`, { transparent: true, depthWrite: false, side: THREE.DoubleSide });
  wingMesh = new THREE.InstancedMesh(wingGeo, wingMat, MAXB * 2); wingMesh.frustumCulled = false; scene.add(wingMesh);
}

const MAXB = 300; const beeMove = new Float32Array(MAXB * 4);
const beePol = new Float32Array(MAXB);
export const bees = [];
export function newBee(scale = 1) { const b = { p: new V3(), q: new Q4(), s: new V3(scale, scale, scale), fly: false, ph: rnd(TAU), update: null }; bees.push(b); return b; }
export const _x = new V3(), _y = new V3(), _z = new V3(), _m = new M4(), _m2 = new M4(), _q = new Q4(), _v = new V3(), _v2 = new V3();
export const XA = new V3(1, 0, 0), YA = new V3(0, 1, 0), ZA = new V3(0, 0, 1);
export function orient(q, fwd, up) { _z.copy(fwd).normalize(); _x.crossVectors(up, _z); if (_x.lengthSq() < 1e-6) _x.set(1, 0, 0); _x.normalize(); _y.crossVectors(_z, _x); _m.makeBasis(_x, _y, _z); q.setFromRotationMatrix(_m); }
function setOnFace(b, ci, side, x, y, th, dip = 0) {
  b.p.set(x, y, COMBS[ci].z + side * (CT / 2 + 0.19 * b.s.y - dip * 0.05));
  _v.set(Math.cos(th), Math.sin(th), 0); _v2.set(0, 0, side); orient(b.q, _v, _v2);
  if (dip) b.q.multiply(_q.setFromAxisAngle(XA, dip * 0.5));
}
function makeWalker(ci, side, o = {}) {
  const c = COMBS[ci], b = newBee(o.scale || rnd(0.9, 1.05));
  b.x = o.x ?? rnd(-c.hw + 0.6, c.hw - 0.6); b.y = o.y ?? rnd(c.yb + 0.8, HTOP - 0.6); b.th = rnd(TAU); b.pause = rnd(2); b.dip = 0; b.sp = o.sp || rnd(0.35, 0.8);
  b.turn = 0;
  b.update = dt => {
    if (b.pause > 0) { b.pause -= dt; b.dip = Math.min(1, b.dip + dt * 2.5); }
    else {
      b.dip = Math.max(0, b.dip - dt * 3); b.turn += (rnd(-1, 1) * 6 - b.turn * 1.5) * dt; b.th += b.turn * dt;
      b.x += Math.cos(b.th) * b.sp * dt; b.y += Math.sin(b.th) * b.sp * dt;
      if (Math.random() < dt * 0.3) b.pause = rnd(0.8, 3.5);
      if (Math.abs(b.x) > c.hw - 0.5 || b.y < c.yb + 0.6 || b.y > HTOP - 0.5) { const t = Math.atan2((c.yb + HTOP) / 2 - b.y, -b.x); let d = t - b.th; d = Math.atan2(Math.sin(d), Math.cos(d)); b.th += d * Math.min(1, dt * 4); }
    }
    setOnFace(b, ci, side, b.x, b.y, b.th + Math.sin(performance.now() * 0.02 + b.ph) * 0.05, b.dip);
  };
  return b;
}

let queen, dancer;
export function setupHiveBees() {
  COMBS.forEach((c, ci) => { for (const side of [1, -1]) for (let i = 0; i < 13; i++) makeWalker(ci, side); });
  // queen and her retinue
  queen = makeWalker(1, 1, { x: -1, y: 15, sp: 0.18 }); queen.s.set(1.15, 1.1, 1.75);
  for (let i = 0; i < 8; i++) { const b = newBee(0.95), a = i / 8 * TAU; b.update = (dt, t) => { const rr = 1.25 + 0.1 * Math.sin(t * 2 + i); const x = queen.x + Math.cos(a) * rr, y = queen.y + Math.sin(a) * rr; setOnFace(b, 1, 1, x, y, a + Math.PI + Math.sin(t * 3 + i * 2) * 0.15, 0.3 + 0.3 * Math.sin(t * 1.3 + i)); }; }
  dancer = newBee(1.0); dancer.dp = { x: DANCE.x, y: DANCE.y };
  dancer.update = (dt, t) => {
    const D = DANCE, cyc = D.Tw + D.Tr, k = Math.floor(t / cyc), u = t - k * cyc, sd = k % 2 ? 1 : -1, px = -D.dy, py = D.dx; let x, y, th;
    if (u < D.Tw) { const f = u / D.Tw, wg = Math.sin(t * 82); x = D.x + D.dx * D.L * f + px * wg * 0.07; y = D.y + D.dy * D.L * f + py * wg * 0.07; th = Math.atan2(D.dy, D.dx) + wg * 0.38; }
    else { const f = (u - D.Tw) / D.Tr, a = Math.PI * f, c = Math.cos(a), s = Math.sin(a) * sd; x = D.x + D.dx * D.L / 2 + (D.dx * c + px * s) * D.L / 2; y = D.y + D.dy * D.L / 2 + (D.dy * c + py * s) * D.L / 2; th = Math.atan2(-D.dy * Math.sin(a) + py * sd * Math.cos(a), -D.dx * Math.sin(a) + px * sd * Math.cos(a)); }
    dancer.dp.x = x; dancer.dp.y = y; setOnFace(dancer, D.ci, D.side, x, y, th);
  };
  for (let i = 0; i < 6; i++) { const b = newBee(0.95); b.fx = DANCE.x; b.fy = DANCE.y; const a = i / 6 * TAU + 0.4; b.update = (dt, t) => { const tx = dancer.dp.x + Math.cos(a) * 1.0, ty = dancer.dp.y + Math.sin(a) * 1.0; b.fx += (tx - b.fx) * dt * 2.2; b.fy += (ty - b.fy) * dt * 2.2; setOnFace(b, DANCE.ci, DANCE.side, b.fx, b.fy, Math.atan2(dancer.dp.y - b.fy, dancer.dp.x - b.fx)); }; }
  // festooning builders hanging in chains under the comb edges
  for (const [ci, x0] of [[1, -3], [1, 2.5], [3, -1], [3, 4], [4, 0]]) for (let i = 0; i < 5; i++) { const b = newBee(0.95); b.update = (dt, t) => { const sw = Math.sin(t * 0.8 + x0) * 0.06 * (i + 1); b.p.set(x0 + sw, COMBS[ci].yb - 0.35 - i * 0.72, COMBS[ci].z + Math.sin(t * 0.6 + i) * 0.03); _v.set(sw * 0.3, 1, 0); _v2.set(0, 0, i % 2 ? 1 : -1); orient(b.q, _v, _v2); }; }
  // fanners at the entrance
  for (let i = 0; i < 6; i++) { const b = newBee(1); b.fly = true; const x = 9.9 + i * 0.5, z = (i % 2 ? 0.55 : -0.55) + rnd(-0.2, 0.2); b.update = () => { const a = Math.asin(clamp(z / TR, -1, 1)); b.p.set(x, TY - Math.cos(a) * (TR - 0.2), z); _v.set(-1, 0.25, 0); _v2.set(0, Math.cos(a), -Math.sin(a)); orient(b.q, _v, _v2); }; }
  for (let i = 0; i < 9; i++) { const b = makeFlier(rnd(0.9, 1.05)); const a = rnd(TAU), f1 = rnd(0.15, 0.4), f2 = rnd(0.2, 0.5), r = rnd(2, 6.5), yy = rnd(1.5, 5.5);
    b.update = (dt, t) => { b.p.set(Math.cos(t * f1 + a) * r, yy + Math.sin(t * f2 + a) * 1.2, Math.sin(t * f1 * 1.3 + a) * r); b.face(dt); }; }
}

// waggle dancer
export const DANCE = { ci: 2, side: 1, x: 1.2, y: 10.9, dx: Math.sin(DANCE_A), dy: Math.cos(DANCE_A), L: 1.7, Tw: 1.6, Tr: 1.3 };

// free fliers
export function makeFlier(scale = 1) { const b = newBee(scale); b.fly = true; b.prev = new V3(); b.fwd = new V3(1, 0, 0); b.first = true;
  b.face = (dt) => { _v.copy(b.p).sub(b.prev); if (!b.first && _v.lengthSq() > 1e-6) { b.fwd.lerp(_v.normalize(), Math.min(1, dt * 8)); } b.first = false; b.prev.copy(b.p); orient(b.q, b.fwd, YA); }; return b; }
const foragers = [];
export function makeForager() {
  const b = makeFlier(rnd(0.9, 1.05)); b.t0 = rnd(60); b.A = new V3(rnd(-5, 5), rnd(1.5, 5.5), rnd(-5, 5)); b.off = new V3(rnd(-0.6, 0.6), rnd(-0.6, 0.6), rnd(-0.6, 0.6)); b.D = null; foragers.push(b);
  const B = new V3(9.2, TY, 0), C = new V3(14.5, TY, 0), seg = [2.2, 1.0, 13, 4, 13, 1.0, 2.2, 2.5], total = seg.reduce((a, c) => a + c, 0);
  b.update = (dt, t) => {
    if (!b.D) { const f = flowers[(Math.random() * Math.min(flowers.length, 110)) | 0]; b.D = f ? new V3(f.x, f.y + 1.2, f.z) : new V3(100, 0, 60); }
    let u = (t + b.t0) % total, k = 0; while (u > seg[k]) { u -= seg[k]; k++; } const f = smooth(0, 1, u / seg[k]);
    const pts = [b.A, B, C, b.D, b.D, C, B, b.A, b.A], P0 = pts[k], P1 = pts[k + 1];
    b.pol = k === 3 ? f * 0.8 : (k >= 4 && k <= 6) ? 0.8 : k === 7 ? 0.8 * (1 - f) : 0;
    b.p.lerpVectors(P0, P1, f); if (k === 2 || k === 4) b.p.y += Math.sin(f * Math.PI) * 9;
    const w = (k === 1 || k === 5) ? 0.35 : 1; b.p.x += Math.sin(t * 1.7 + b.ph) * 0.5 * w + b.off.x * w; b.p.y += Math.sin(t * 2.3 + b.ph * 2) * 0.35 * w + b.off.y * w; b.p.z += Math.cos(t * 1.9 + b.ph) * 0.5 * w + b.off.z * w;
    if (k === 7 && u > seg[7] - 0.1) b.D = null;
    b.face(dt);
  };
  return b;
}

export function setupForagers() {
  for (let i = 0; i < 28; i++) makeForager();
}

// scripted sisters: the one who greets you at birth, and three who welcome you home
function makeScripted() { const b = makeFlier(1.02); b.tp = new V3(rnd(-4, 4), rnd(2, 5), rnd(-4, 4)); b.look = null; b.active = false; b.p.copy(b.tp); const a = rnd(TAU), r = rnd(2, 6), yy = rnd(2, 5), f = rnd(0.2, 0.4);
  b.update = (dt, t) => { if (!b.active) { b.tp.set(Math.cos(t * f + a) * r, yy + Math.sin(t * 0.5 + a), Math.sin(t * f * 1.2 + a) * r); _v.set(b.tp.x - BIRTH.x, b.tp.y - BIRTH.y, b.tp.z - BIRTH.z); const dB = _v.length(); if (dB < 3.5) b.tp.addScaledVector(_v.normalize(), 3.5 - dB); }
    b.p.lerp(b.tp, Math.min(1, dt * (b.active ? 3.2 : 1.2))); b.p.y += Math.sin(t * 5 + b.ph) * 0.004;
    if (b.active && b.look) { _v.copy(b.look).sub(b.p); b.fwd.lerp(_v.normalize(), Math.min(1, dt * 6)); orient(b.q, b.fwd, YA); b.q.multiply(_q.setFromAxisAngle(ZA, Math.sin(t * 9 + b.ph) * 0.07)); b.prev.copy(b.p); } else b.face(dt); }; return b; }

export let hero, greeters;
export function setupScriptedSisters() {
  hero = makeScripted(), greeters = [makeScripted(), makeScripted(), makeScripted()];
}

export const _wm = new M4(), _bm = new M4(), _t = new M4(), _r = new M4(), _sc = new M4();
export function updateBees(dt, t) {
  const n = bees.length; beeMesh.count = n; wingMesh.count = n * 2; for (const fm of furMeshes) fm.count = n;
  for (let i = 0; i < n; i++) {
    const b = bees[i]; b.update(dt, t);
    if (!b.lp) { b.lp = b.p.clone(); b.mx = 0; b.my = 0; }
    if (dt > 0) { if (b.vel) _v.copy(b.vel); else _v.copy(b.p).sub(b.lp).multiplyScalar(1 / dt); b.lp.copy(b.p); _q.copy(b.q).invert(); _v.applyQuaternion(_q);
      b.ax = b.ax === undefined ? 0 : b.ax; const fz = clamp(_v.z * 0.05, -0.8, 1.4); b.mx = lerp(b.mx, fz + (fz - (b.pz || 0)) * 0.0, Math.min(1, dt * 4)); b.pz = fz;
      b.my = lerp(b.my, b.bank !== undefined ? b.bank : clamp(-_v.x * 0.08, -1, 1), Math.min(1, dt * 3)); }
    beeMove[i * 4] = b.mx; beeMove[i * 4 + 1] = b.my; beeMove[i * 4 + 2] = b.ph * 7; beeMove[i * 4 + 3] = b.fly ? 1 : 0; beePol[i] = b.pol || 0;
    _bm.compose(b.p, b.q, b.s); beeMesh.setMatrixAt(i, _bm);
    for (let s = 0; s < 2; s++) {
      const sg = s ? -1 : 1;
      const flap = b.fly ? Math.sin(t * 190 + b.ph + i) * 0.85 + 0.15 : 0.03, sweep = b.fly ? 0.25 : 1.25;
      _t.makeTranslation(sg * 0.09, 0.19, 0.16); _r.makeRotationZ(sg * flap); _t.multiply(_r); _r.makeRotationY(sg * sweep); _t.multiply(_r); _sc.makeScale(sg * 1.15, 1, 1.15); _t.multiply(_sc);
      _wm.multiplyMatrices(_bm, _t); wingMesh.setMatrixAt(i * 2 + s, _wm);
    }
  }
  beeMesh.instanceMatrix.needsUpdate = true; wingMesh.instanceMatrix.needsUpdate = true; beeGeo.attributes.aMove.needsUpdate = true; beeGeo.attributes.aPol.needsUpdate = true;
}

// ---------- dance streak + shimmer trail ----------
export const streakU = { uShow: { value: 0.22 } };

let streak;
export function setupDanceTrail() {
  streak = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.1), mat(`uniform float uShow;
void main(){ float a=smoothstep(0.0,0.15,vUv.x)*smoothstep(1.0,0.5,vUv.x)*pow(1.0-abs(vUv.y-0.5)*2.0,2.0);
  float p=0.55+0.45*sin(vUv.x*26.0-uTime*5.0); float sp=step(0.93,hash21(floor(vUv*vec2(60.0,9.0))+floor(uTime*6.0)));
  gl_FragColor=vec4(vec3(1.0,0.72,0.22)*a*(p*0.8+sp*1.5)*uShow,1.0); }`, { uniforms: streakU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  streak.position.set(DANCE.x + DANCE.dx * 3.0, DANCE.y + DANCE.dy * 3.0, CT / 2 + 0.03); streak.rotation.z = Math.atan2(DANCE.dy, DANCE.dx); scene.add(streak);
  {
    const N = 90, pos = [], idx = [];
    for (let i = 0; i < N; i++) { const f = i / (N - 1), d = 16 + f * (FIELD_D - 30); const px = -FDIR.z, pz = FDIR.x, w = Math.sin(f * 9) * 3;
      const x = (i < 6 ? lerp(14, FDIR.x * d, i / 6) : FDIR.x * d) + px * w, z = (i < 6 ? lerp(0, FDIR.z * d, i / 6) : FDIR.z * d) + pz * w;
      pos.push(x, lerp(TY, terrainH(x, z) + 24, smooth(0, 0.5, f)) + Math.sin(f * 14) * 1.5, z); idx.push(i); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aI', new THREE.Float32BufferAttribute(idx, 1));
    const m = new THREE.ShaderMaterial({ uniforms: { ...U, ...trailU }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aI; uniform float uTime; uniform float uShow; varying float vA; void main(){ vec3 p=position; p.y+=sin(uTime*1.3+aI)*0.6; vec4 mv=viewMatrix*vec4(p,1.0);
      float tw=0.5+0.5*sin(uTime*3.0-aI*0.9); vA=uShow*tw*smoothstep(130.0,40.0,-mv.z)*smoothstep(1.0,5.0,-mv.z); gl_PointSize=(2.0+tw*3.0)*120.0/max(-mv.z,1.0)+2.0; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: UNTONE + `varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d); gl_FragColor=vec4(untone(vec3(1.0,0.78,0.3)*a*a*vA)*1.6,1.0); }` });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts);
  }
}

export const trailU = { uShow: { value: 0 } };

// ---------- sisters who fly with you and draw wasps away ----------
export function setupEscorts() {
  G.escorts = G.escorts || 0;
  makeEscort(0); makeEscort(1);
}

const escorts = [];
function makeEscort(i) {
  const b = makeFlier(0.98); b.side = i ? -1 : 1; b.state = 'follow'; b.cool = 0; b.t = 0; b.away = new V3(); b.p.set(0, 5, 0);
  b.update = (dt) => {
    b.cool -= dt; b.t += dt;
    const out = (P.mode === 'fly' || P.mode === 'crawl') && !(i >= G.escorts);
    if (!out) { b.p.set(0, -400, 0); b.s.setScalar(0.001); b.first = true; return; }
    b.s.setScalar(0.98);
    if (b.state === 'decoy') { b.p.lerp(b.away, Math.min(1, dt * 0.9)); if (b.t > 6.5) { b.state = 'follow'; b.cool = 30; } }
    else { _v.set(b.side * 1.9, 0.7 + Math.sin(time * 2 + i) * 0.25, 1.6).applyEuler(new THREE.Euler(0, P.yaw, 0)); _v.add(P.pos); if (b.first) b.p.copy(_v); b.p.lerp(_v, Math.min(1, dt * 3.5)); }
    b.face(dt);
  };
  escorts.push(b); return b;
}
export function tryDecoy(w) {
  const e = escorts.find((b, i) => i < G.escorts && b.state === 'follow' && b.cool <= 0); if (!e) return false;
  e.state = 'decoy'; e.t = 0; _v.copy(w.p).sub(P.pos).setY(0); if (_v.lengthSq() < 0.01) _v.set(1, 0, 0); _v.normalize();
  e.away.copy(P.pos).addScaledVector(_v, -0).add(new V3(-_v.z, 0.4, _v.x).multiplyScalar(60 * (Math.random() < 0.5 ? 1 : -1))); e.away.y = Math.max(e.away.y, terrainH(e.away.x, e.away.z) + 10);
  w.decoy = e; w.t = 0; toast('<b>Your sister draws the wasp away!</b>', 3); tone(880, 0.08, 1.2); tone(1174.66, 0.06, 1.2, 'sine', 0.1); return true;
}
export function beeCollide() {
  if (P.pos.x > RIN - 2 && Math.hypot(P.pos.y - TY, P.pos.z) < TR + 2.5 && P.pos.x < ROUT + 7) return; // sisters make way at the entrance
  for (const b of bees) { if (b === me || b.s.y < 0.05) continue; const rr = 0.4 * b.s.y + PR; const dx = P.pos.x - b.p.x, dy = P.pos.y - b.p.y, dz = P.pos.z - b.p.z;
    if (Math.abs(dx) > rr || Math.abs(dy) > rr || Math.abs(dz) > rr) continue; const d = Math.hypot(dx, dy, dz); if (d >= rr) continue;
    const nx = d > 1e-4 ? dx / d : 0, ny = d > 1e-4 ? dy / d : 1, nz = d > 1e-4 ? dz / d : 0; P.pos.set(b.p.x + nx * rr, b.p.y + ny * rr, b.p.z + nz * rr);
    const vn = P.vel.x * nx + P.vel.y * ny + P.vel.z * nz; if (vn < 0) { P.vel.x -= vn * nx * 1.3; P.vel.y -= vn * ny * 1.3; P.vel.z -= vn * nz * 1.3; } }
}

// the bee ball: call your sisters (R). They swarm the nearest wasp into a glowing, buzzing knot and it drops
export const SWARM = { active: false, t: 0, cd: 0, w: null, c: new V3(), bees: [], phase: '' };

let radTex, ballGlow;
export function setupBeeBall() {
  for (let i = 0; i < 12; i++) { const b = makeFlier(rnd(0.9, 1.05)); b.s.set(0.001, 0.001, 0.001); b.home = new V3(); b.o = new V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(); b.update = (dt) => { if (!SWARM.active) { b.s.set(0.001, 0.001, 0.001); b.fly = false; b.pol = 0; return; } b.fly = true; b.s.setScalar(b.sc || 1); swarmBee(b, dt); b.face(dt); }; b.sc = rnd(0.9, 1.05); SWARM.bees.push(b); }
  radTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
  ballGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radTex, color: new THREE.Color(2.2, 1.1, 0.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  ballGlow.center.set(0.5, 0.5); ballGlow.scale.set(4, 4, 1); ballGlow.visible = false; scene.add(ballGlow);
  addEventListener('keydown', e => { if (e.repeat) return; if (e.code === 'KeyF') heatBuzz(); if (e.code === 'KeyR') callSisters(); });
}

export function callSisters() {
  if (P.mode !== 'fly' || inHive) return;
  if (SWARM.active) return; if (SWARM.cd > 0) { hint(`your sisters are still catching their breath (${Math.ceil(SWARM.cd)}s)`, 2); return; }
  if (G.workers < 3) { hint('you need at least 3 sisters to call for help', 3); return; }
  let best = null, bd = 40; for (const w of wasps) { if (w.gone > 0 || w.p.y < -100 || w.state === 'idle' || w.state === 'balled') continue; const d = w.p.distanceTo(P.pos); if (d < bd) { bd = d; best = w; } }
  [0, 4, 7, 4].forEach((n, k) => tone(SCALE[n] * 0.5, 0.06, 0.5, 'sawtooth', k * 0.12)); sweep(220, 320, 0.6, 0.04, 'sawtooth');
  if (!best) { toast('<b>You buzz for help</b><br><span>but there\'s no wasp close enough</span>', 2.5); SWARM.cd = 4; return; }
  SWARM.active = true; SWARM.t = 0; SWARM.w = best; SWARM.phase = 'go'; SWARM.cd = 35;
  SWARM.bees.forEach((b, i) => { b.p.copy(P.pos).add(new V3(rnd(-8, 8), rnd(-3, 5), rnd(-8, 8))).addScaledVector(fwd, -10); b.first = true; b.prev.copy(b.p); b.spd = rnd(24, 32); });
  toast('<b>Sisters, to me!</b><br><span>your sisters swarm in on the wasp</span>', 2.5);
}
function swarmBee(b, dt) {
  const w = SWARM.w; let tgt;
  if (SWARM.phase === 'go') tgt = w.p; else if (SWARM.phase === 'ball') tgt = _v.copy(SWARM.c).addScaledVector(b.o, 0.75 + 0.15 * Math.sin(time * 20 + b.ph)); else tgt = b.home;
  const sp = SWARM.phase === 'ball' ? 40 : b.spd; _v2.copy(tgt).sub(b.p); const L = _v2.length();
  if (SWARM.phase === 'ball') b.p.lerp(tgt, Math.min(1, dt * 12)); else if (L > 0.01) b.p.addScaledVector(_v2, Math.min(1, sp * dt / L));
  b.p.x += Math.sin(time * 9 + b.ph) * 0.04; b.p.y += Math.cos(time * 11 + b.ph) * 0.04;
}
export function updateSwarm(dt) {
  SWARM.cd -= dt; if (!G.seenRally && G.workers >= 3 && P.mode === 'fly' && wasps.some(w => w.state === 'chase')) { G.seenRally = true; hint('<kbd>R</kbd> buzz for your sisters: they ball up on wasps', 6); }
  if (!SWARM.active) { ballGlow.visible = false; return; }
  SWARM.t += dt; const w = SWARM.w;
  if (SWARM.phase === 'go') {
    const arrived = SWARM.bees.filter(b => b.p.distanceTo(w.p) < 2.5).length;
    if (w.gone > 0 || w.p.y < -100 || SWARM.t > 6) { SWARM.phase = 'home'; SWARM.t = 0; }
    else if (arrived >= 6) { SWARM.phase = 'ball'; SWARM.t = 0; w.state = 'balled'; w.v.set(0, 0, 0); SWARM.c.copy(w.p); noiseHit(400, 0.7, 0.25, 0.5, 'lowpass', 160); sweep(180, 120, 1.5, 0.06, 'sawtooth');
      toast('<b>Bee ball!</b><br><span>your sisters cook the wasp with their heat</span>', 3); }
  } else if (SWARM.phase === 'ball') {
    const gy = terrainH(SWARM.c.x, SWARM.c.z) + 0.9; SWARM.c.y = Math.max(gy, SWARM.c.y - dt * (SWARM.t > 1.2 ? 6 : 0.5)); w.p.copy(SWARM.c);
    ballGlow.visible = true; ballGlow.position.copy(SWARM.c); ballGlow.material.opacity = Math.min(1, SWARM.t) * (0.55 + 0.25 * Math.sin(time * 14)); ballGlow.scale.setScalar(3.5 + 0.3 * Math.sin(time * 9));
    if (Math.random() < dt * 20 && P.pos.distanceTo(SWARM.c) < 60) noiseHit(rnd(180, 320), 2, 0.05, 0.08, 'lowpass', 400);
    if (SWARM.t > 4.0) { eatWasp(w, 'ball'); SWARM.phase = 'home'; SWARM.t = 0; SWARM.bees.forEach(b => { const a = rnd(TAU); b.home.copy(SWARM.c).add(new V3(Math.cos(a) * 60, 30, Math.sin(a) * 60)); }); }
  } else { ballGlow.visible = false; if (SWARM.t < dt * 1.5) SWARM.bees.forEach(b => { const a = rnd(TAU); b.home.copy(b.p).add(new V3(Math.cos(a) * 60, 30, Math.sin(a) * 60)); }); if (SWARM.t > 3) { SWARM.active = false; } }
}
