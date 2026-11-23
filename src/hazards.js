// Honeylight: spider webs and dragonflies.
import * as THREE from '../three.module.min.js';
import { V3, rnd, TAU } from './core.js';
import { POND, WY, srnd, terrainH, orchTrees } from './world.js';
import { scene, camera, mat, geoParts, ell, puff } from './engine.js';
import { _q, YA, orient } from './bees.js';
import { P } from './player.js';
import { hint } from './controls.js';
import { wasps, eatWasp } from './wasps.js';
import { G, toast, losePollen } from './progress.js';
import { noiseHit } from './audio.js';
import { tmp, inHive, time } from './loop.js';

// spider webs strung between orchard trees (and one across a meadow gap)
export const webs = [];

export function setupWebs() {
  {
    const spots = [];
    for (let i = 1; i < orchTrees.length && spots.length < 8; i++) {
      const t = orchTrees[i]; let best = null, bd = 1e9;
      for (let j = 0; j < orchTrees.length; j++) if (j !== i) { const u = orchTrees[j], d = Math.hypot(t.x - u.x, t.z - u.z); if (d < bd) { bd = d; best = u; } }
      if (!best || bd > 46 || spots.some(s => Math.hypot(s.x - (t.x + best.x) / 2, s.z - (t.z + best.z) / 2) < 8)) continue;
      spots.push({ x: (t.x + best.x) / 2, z: (t.z + best.z) / 2, dx: best.x - t.x, dz: best.z - t.z, r: Math.min(10, bd / 2 - 1.5) });
    }
    for (const s of spots) {
      const r = s.r, gy = terrainH(s.x, s.z), c = new V3(s.x, gy + r + srnd(3, 9), s.z);
      const n = new V3(-s.dz, 0, s.dx).normalize();
      const d = Math.hypot(s.dx, s.dz) / 2 / r, m = webMesh(r, d, webs.length);
      m.scale.setScalar(r); m.position.copy(c); m.lookAt(c.clone().add(n)); scene.add(m);
      webs.push({ c, n, r, mesh: m, torn: 0 });
    }
  }
}

// an orb web on a flat card: frame, anchor threads out to the trunks at +/-d (in web radii), spokes, capture spiral, dew
// (one geometry, one material, one mesh, like the old disc, so the seeded random stream does not move)
export function webMesh(r, d, seed) {
  return new THREE.Mesh(new THREE.PlaneGeometry(2 * d + 0.1, 2.5), mat(WEB_FRAG, { uniforms: { uR: { value: r }, uD: { value: d }, uSeed: { value: seed } }, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
}

export const WEB_FRAG = `uniform float uR; uniform float uD; uniform float uSeed;
float wh(float k){ return hash21(vec2(k*1.37+3.1, uSeed*7.13+1.7)); }
float segD(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h); }
vec2 fv(float i){ float a=(i+0.5+0.45*(wh(i+20.0)-0.5))*1.0472; return vec2(cos(a),sin(a))*(0.9+0.12*wh(i+30.0)); }
float spA(float k){ return (k+0.4*(wh(mod(k,30.0))-0.5))*0.20944; }
void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW);
  vec2 p=vL.xy; float aa=max(fwidth(p.x)*uR,0.004), thin=0.008;
  float cov=clamp(2.5*thin/aa,0.3,1.0);
  // frame: a lopsided six-sided loop, held out to the two trunks by anchor threads
  float inner=1e9, dF=1e9; vec2 v0=fv(5.0);
  for(int i=0;i<6;i++){ vec2 v1=fv(float(i)); vec2 e=v1-v0; dF=min(dF,segD(p,v0,v1)); inner=min(inner,(e.x*(p.y-v0.y)-e.y*(p.x-v0.x))/length(e)); v0=v1; }
  vec2 f0=fv(0.0), f1=fv(1.0), f2=fv(2.0), f3=fv(3.0), f4=fv(4.0), f5=fv(5.0);
  float dA=min(min(segD(p,f0,vec2(uD,f0.y+0.25+0.3*wh(40.0))), segD(p,f5,vec2(uD,f5.y-0.2-0.3*wh(41.0)))),
               min(segD(p,f2,vec2(-uD,f2.y+0.25+0.3*wh(42.0))), segD(p,f3,vec2(-uD,f3.y-0.2-0.3*wh(43.0)))));
  float sd=wh(44.0)<0.5?-1.0:1.0; dA=min(dA, min(segD(p,f1,vec2(sd*uD,1.12)), segD(p,f4,vec2(-sd*uD,-1.12))));
  // spokes from a hub that sits a little above the middle
  vec2 q=p-vec2(0.04*(wh(1.0)-0.5),0.07); float r=length(q), a=atan(q.y,q.x);
  float k=floor(a/0.20944); if(a<spA(k)) k-=1.0; else if(a>spA(k+1.0)) k+=1.0;
  float a0=spA(k), a1=spA(k+1.0), dS=min(r*abs(sin(a-a0)), r*abs(sin(a-a1)));
  float ins=step(0.0,inner);
  // capture spiral: straight steps from spoke to spoke, winding outward
  float h=(a1-a0)*0.5, rp=r*cos(a-(a0+a1)*0.5)/cos(h), t=clamp((a-a0)/(a1-a0),0.0,1.0);
  float u=(k+15.0+t)/30.0, R0=0.25, x=max(rp-R0,0.0)/0.7, f=pow(x+1e-4,0.85)*14.0-u, m=floor(f+0.5), sp=1.0/(11.9*pow(x+0.02,-0.15)/0.7);
  float spiral=step(R0-0.01,rp)*step(0.035,inner)*step(0.05,hash21(vec2(k*3.7+uSeed,m*1.3)));
  float dC=abs(f-m)*sp*uR;
  // hub: a tight little mesh where the spider waits
  float hs=0.016, dH=abs(fract(rp/hs)-0.5)*hs*uR;
  float L=(1.0-smoothstep(thin*1.6,thin*1.6+aa,dF*uR))*ins+(1.0-smoothstep(thin*1.6,thin*1.6+aa,dA*uR))*step(inner,0.002);
  L=max(L,(1.0-smoothstep(thin*1.25,thin*1.25+aa,dS*uR))*ins*step(0.012,r));
  L=max(L,(1.0-smoothstep(thin,thin+aa,dC))*spiral);
  L=max(L,(1.0-smoothstep(thin,thin+aa,dH))*step(0.02,r)*step(rp,0.075));
  L=min(L,1.0)*cov;
  // dew beads strung along the sticky spiral
  float bs=0.2, chord=2.0*rp*sin(h)*uR, s=t*chord/bs, bi=floor(s);
  float bh=hash21(vec2(bi+k*17.0, m*3.1+uSeed)), br=0.022+0.05*pow(fract(bh*7.0),3.0);
  float dB=length(vec2((fract(s)-0.5)*bs, dC)), dew=(1.0-smoothstep(br,br+aa,dB))*step(0.62,bh)*spiral*step(m,13.0)*step(0.0,f+0.5);
  float glint=pow(max(dot(reflect(-V,n),uSun),0.0),6.0)+pow(max(dot(-V,uSun),0.0),8.0);
  vec3 ir=0.5+0.5*cos(6.2832*(dot(V,n)*2.0+r*3.0+vec3(0.0,0.33,0.67)));
  vec3 silk=vec3(0.88,0.88,0.84)*(0.45+3.2*glint)+ir*0.35*glint;
  float core=1.0-dB/max(br,1e-3);
  vec3 drop=vec3(0.75,0.85,0.95)*(0.5+0.8*core)+vec3(2.6,2.2,1.6)*(0.3+3.0*glint)*pow(max(core,0.0),3.0);
  vec3 c=mix(silk,drop,dew); float al=max(L*(0.24+0.6*glint),dew*(0.5+0.4*core));
  if(al<0.01) discard;
  gl_FragColor=vec4(finish(c,vW),clamp(al,0.0,1.0)); }
`;

// dragonflies: fast hunters that patrol the pond
export const dragonflies = [];

export function setupDragonflies() {
  {
    const body = geoParts([
      { g: ell(0.15, 0.15, 1.9, 0, 0, -1.95, 10), c: (x, y, z) => Math.sin(z * 7) > 0.55 ? [0.04, 0.08, 0.1] : [0.08, 0.5, 0.58] },
      { g: ell(0.32, 0.3, 0.5, 0, 0, 0.1, 12), c: [0.1, 0.42, 0.32] },
      { g: ell(0.26, 0.24, 0.22, 0.2, 0.05, 0.62, 10), c: [0.3, 0.08, 0.04] }, { g: ell(0.26, 0.24, 0.22, -0.2, 0.05, 0.62, 10), c: [0.3, 0.08, 0.04] }]);
    const bm = mat(`void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW); float ir=pow(1.0-max(dot(n,V),0.0),2.0); vec3 alb=vC+vec3(0.1,0.3,0.45)*ir; gl_FragColor=vec4(finish(shade(alb,n,vW,0.9,0.1),vW),1.0); }`, { vertexColors: true });
    const wg = new THREE.CircleGeometry(1, 16); wg.scale(1.7, 0.27, 1); wg.translate(1.75, 0, 0); wg.rotateX(-Math.PI / 2);
    const wm = mat(`void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW); float v=pow(abs(sin(vL.x*14.0)*sin(vL.z*30.0)),12.0); float fr=pow(1.0-abs(dot(n,V)),2.0);
    vec3 c=vec3(0.8,0.9,1.0)*(0.3+0.7*fr+0.5*v); gl_FragColor=vec4(finish(c,vW),0.16+0.35*fr+0.3*v); }`, { transparent: true, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 2; i++) { const g = new THREE.Group(); g.add(new THREE.Mesh(body, bm)); const wings = [];
      for (const [sx, zo] of [[1, 0.28], [-1, 0.28], [1, -0.12], [-1, -0.12]]) { const w = new THREE.Mesh(wg, wm); w.position.set(0, 0.24, zo); w.scale.x = sx; g.add(w); wings.push(w); }
      g.scale.setScalar(1.3); g.visible = false; scene.add(g);
      dragonflies.push({ g, wings, p: new V3(POND.x + (i ? 20 : -20), WY + 6, POND.z), v: new V3(), state: 'patrol', t: 0, next: 0, cd: 2, tgt: new V3(POND.x, WY + 6, POND.z), face: new V3(0, 0, 1) }); }
  }
}

// --- threats: webs (stick you in place, shake a pollen loose)
export function setupWebHold() {
  P.stuck = 0;
}

export function updateWebs(dt) {
  for (const w of webs) { if (w.torn > 0) { w.torn -= dt; if (w.torn <= 0) w.mesh.visible = true; } }
  if (P.mode !== 'fly' || inHive) return;
  if (P.stuck > 0) {
    P.stuck -= dt * 0.6; P.vel.set(0, 0, 0); P.pos.copy(P.stuckAt).addScaledVector(P.stuckWeb.n, Math.sin(time * 30) * 0.03 * Math.min(1, P.stuck));
    P.stuckWeb.mesh.scale.setScalar(P.stuckWeb.r * (1 + Math.sin(time * 25) * 0.01));
    if (P.stuck <= 0) { const w = P.stuckWeb; w.torn = 40; w.mesh.visible = false; w.mesh.scale.setScalar(w.r); P.vel.copy(w.n).multiplyScalar(P.stuckSide * 9); P.vel.y += 3; noiseHit(2400, 3, 0.12, 0.15); puff(P.pos, 14, [0.9, 0.9, 0.85], 2, 0.008, 1); }
    return;
  }
  for (const w of webs) {
    if (w.torn > 0) continue; tmp.copy(P.pos).sub(w.c); const dn = tmp.dot(w.n);
    if (Math.abs(dn) < 0.55 && tmp.addScaledVector(w.n, -dn).length() < w.r * 0.95) {
      P.stuck = 2.6; P.stuckWeb = w; P.stuckAt = P.pos.clone(); P.stuckSide = Math.sign(dn) || 1;
      const n = losePollen(1); noiseHit(1800, 4, 0.14, 0.3); toast(n ? '<b>Caught in a web!</b> a pollen ball fell' : '<b>Caught in a web!</b>', 3);
      if (!G.seenWeb) { G.seenWeb = true; hint('tap <kbd>space</kbd> or click to wriggle free', 5); }
      break;
    }
  }
}
export function wriggle() { if (P.stuck > 0) { P.stuck = Math.max(0.001, P.stuck - 0.45); /* never below zero: the next update must run the release */ noiseHit(rnd(1500, 2600), 3, 0.06, 0.06); return true; } return false; }

// --- dragonflies over the pond: they hover, eye you, then strike. Dart away or keep moving
export function updateDragonflies(dt) {
  const open = !!G.zones.pond, pb = P.pos;
  for (const d of dragonflies) {
    d.g.visible = open && Math.hypot(camera.position.x - POND.x, camera.position.z - POND.z) < 260; if (!open) continue;
    d.t += dt; d.cd -= dt; const dist = d.p.distanceTo(pb);
    const near = P.mode === 'fly' && P.stuck <= 0 && Math.hypot(pb.x - POND.x, pb.z - POND.z) < POND.r + 16 && pb.y < WY + 24;
    let spd = 18, tgt = d.tgt;
    if (d.state === 'patrol' && d.cd <= 0) { const prey = wasps.find(w => (w.state === 'chase' || w.state === 'webbed') && !(w.gone > 0) && w.p.y > -100 && Math.hypot(w.p.x - POND.x, w.p.z - POND.z) < POND.r + 30 && w.p.distanceTo(d.p) < 55 && !dragonflies.some(o => o.prey === w));
      if (prey) { d.state = 'hunt'; d.prey = prey; d.t = 0; noiseHit(3000, 6, 0.05, 0.2); } }
    if (d.state === 'hunt') { const w = d.prey; spd = 38; d.tgt.copy(w.p);
      if (w.gone > 0 || w.p.y < -100 || w.state === 'idle' || d.t > 6) { d.state = 'patrol'; d.prey = null; d.next = 0; }
      else if (d.p.distanceTo(w.p) < 2.6) { eatWasp(w, 'dragonfly'); d.prey = null; d.state = 'away'; d.t = 0; d.cd = 8; const a = rnd(TAU); d.tgt.set(POND.x + Math.cos(a) * POND.r * 0.5, WY + 7, POND.z + Math.sin(a) * POND.r * 0.5); } }
    else if (d.state === 'patrol') {
      if (d.t > d.next) { d.next = d.t + rnd(0.9, 2.4); const a = rnd(TAU), r = rnd(4, POND.r - 8); d.tgt.set(POND.x + Math.cos(a) * r, WY + rnd(2.5, 9), POND.z + Math.sin(a) * r); }
      if (near && dist < 28 && d.cd <= 0 && !dragonflies.some(o => o !== d && o.state !== 'patrol' && o.state !== 'away')) { d.state = 'eye'; d.t = 0; noiseHit(3000, 6, 0.05, 0.25); }
    } else if (d.state === 'eye') {
      spd = 0; d.face.copy(pb).sub(d.p);
      if (d.t > 0.75) { d.state = 'strike'; d.t = 0; d.tgt.copy(pb); noiseHit(1600, 1.5, 0.12, 0.35, 'bandpass', 4200); }
      else if (!near || dist > 36) { d.state = 'patrol'; d.t = 0; d.next = 0; }
    } else if (d.state === 'strike') {
      d.tgt.lerp(pb, Math.min(1, dt * 2.2)); spd = 36;
      if (dist < 1.9) {
        if (G.dartT > 0) { d.state = 'away'; d.t = 0; d.cd = 3; toast('<b>Dodged!</b>', 1.5); }
        else { tmp.copy(pb).sub(d.p).normalize(); P.vel.addScaledVector(tmp, 15); P.vel.y += 3; const n = losePollen(1); noiseHit(900, 1, 0.3, 0.2, 'lowpass', 200);
          toast(n ? '<b>A dragonfly struck!</b> it knocked a pollen ball loose' : '<b>A dragonfly struck!</b>', 3); d.state = 'away'; d.t = 0; d.cd = 6;
          if (!G.seenDragon) { G.seenDragon = true; hint('when a dragonfly hovers and stares, <kbd>Q</kbd> dart or swerve', 6); } }
        const a = rnd(TAU); d.tgt.set(POND.x + Math.cos(a) * POND.r * 0.6, WY + 8, POND.z + Math.sin(a) * POND.r * 0.6);
      } else if (d.t > 1.5) { d.state = 'patrol'; d.t = 0; d.next = 0; d.cd = 3; }
    } else if (d.state === 'away') { spd = 20; if (d.t > 2.5) { d.state = 'patrol'; d.t = 0; d.next = 0; } }
    tmp.copy(tgt).sub(d.p); const L = tmp.length();
    if (spd > 0 && L > 0.05) tmp.multiplyScalar(spd * Math.min(1, L / 3) / L); else tmp.set(0, 0, 0);
    d.v.lerp(tmp, Math.min(1, dt * (spd > 30 ? 4 : 7))); d.p.addScaledVector(d.v, dt); d.p.y = Math.max(d.p.y, WY + 1.2);
    if (d.state !== 'eye' && d.v.lengthSq() > 1) d.face.lerp(d.v, Math.min(1, dt * 8));
    d.g.position.copy(d.p); d.g.position.y += Math.sin(time * 3 + d.p.x) * 0.15; orient(_q, d.face, YA); d.g.quaternion.slerp(_q, Math.min(1, dt * 10));
    d.wings.forEach((w, i) => { w.rotation.z = (i % 2 ? -1 : 1) * Math.sin(time * 70 + (i < 2 ? 0 : 1.6)) * 0.45; });
    if (dist < 26 && Math.random() < dt * 7) noiseHit(rnd(2600, 3600), 5, 0.025 * (1 - dist / 26), 0.05);
  }
}
