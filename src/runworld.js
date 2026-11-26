// Honeylight: the world answers the long run. While the bee is in the zone, the grass ahead leans away from it (a bow wave), little flowers spring up and open along the track,
// petals and then sparks stream past, and at the top tier dew lifts off the leaves and the light warms. A bail blows a puff of petals past.
// It takes no number from the game's random stream: it has its own, and it builds inside quietBuild (runkit.js). With no run on it draws nothing and changes nothing.
// Draw calls while a run is on: three (the flowers, the petals, the sparks and dew). The bow wave is a hook in the grass shader (plants.js, uWake in engine.js).
import * as THREE from '../three.module.min.js';
import { V3, clamp } from './core.js';
import { terrainH } from './world.js';
import { scene, mat, U, hidden } from './engine.js';
import { P } from './player.js';
import { RUN, groundAt } from './longrun.js';
import { quietBuild, seeded, clearAt } from './runkit.js';
import { burrowFloor } from './burrow.js';

// ---------- numbers to tune ----------
// wave: bow wave strength at each tier (0 to 5). budTier, petalTier, sparkTier, dewTier: the first tier that has them. Rates are per second at each tier.
export const RWK = { wave: [0, 0.6, 0.75, 0.88, 1, 1], waveAhead: 22, waveBehind: 4, waveSide: 10, budTier: 2, budAhead: 24, budBehind: 12, budPop: 3, budFold: 0.6,
  petalTier: 3, petals: [0, 0, 0, 12, 18, 24], puff: 16, sparkTier: 4, sparks: [0, 0, 0, 0, 16, 24], dewTier: 5, dew: 28, warm: 0.6 };
const STEP = 1.2; // track samples are 1.2 apart (longrun.js)
// what the tests and tools read: how strong each part is now
export const W = { wave: 0, buds: 0, budsOpen: 0, petals: 0, sparks: 0, dew: 0, warm: 0, puffs: 0 };

let budMesh, budO, budJ, budLive = false, petalMesh, pP, pQ, glints, gPos, gCol, gSize, rnd;
const PN = 90, GN = 150;
const pv = [], gv = []; // the moving petals and glints: velocity, age, life
const _f = new V3(), _s = new V3(), _q = new V3();

// ---------- little flowers along the track: shut and hidden until a bee in the zone comes, then they spring up and open ----------
function buildBuds() {
  const r = seeded(70429), at = [], par = [], js = [];
  for (let j = 0; j < RUN.N; j += 2) { const p = RUN.S[j], tg = RUN.T[j];
    if (burrowFloor(p.x, p.z) !== null) continue; // none under the hill
    for (const side of [-1, 1]) { const lean = Math.atan2(-tg.x * side, tg.z * side), keep = r() < 0.62, lat = r(1.5, 2.5), along = r(-0.6, 0.6), h = r(0.45, 1.1), size = r(0.5, 0.8), col = Math.floor(r(5)), ph = r(Math.PI * 2), yaw = r(Math.PI * 2);
      if (!keep) continue; const x = p.x - tg.z * side * lat + tg.x * along, z = p.z + tg.x * side * lat + tg.z * along;
      if (burrowFloor(x, z) !== null || groundAt(x, z) > terrainH(x, z) + 0.05 || clearAt(x, z) < 0.6) continue; // not on water, not in the places
      at.push(x, terrainH(x, z) - 0.05, z, lean + (yaw - Math.PI) * 0.15); /* turned to face the track, give or take */ par.push(h, size, col, ph); js.push(j); } }
  // one flower: a stem of two crossed strips, five petals, a round middle. aK says which part a corner belongs to (0 stem, 1 petal, 2 middle)
  const pos = [], kind = [], idx = []; let n = 0;
  const vtx = (x, y, z, k) => { pos.push(x, y, z); kind.push(k); return n++; };
  for (const [ax, az] of [[1, 0], [0, 1]]) { const v = []; for (const y of [0, 0.5, 1]) for (const s of [-1, 1]) v.push(vtx(ax * s * 0.035, y, az * s * 0.035, 0)); for (let k = 0; k < 2; k++) { const a = k * 2; idx.push(v[a], v[a + 1], v[a + 2], v[a + 1], v[a + 3], v[a + 2]); } }
  for (let k = 0; k < 5; k++) { const ang = k / 5 * Math.PI * 2, v = [[0, 0], [0.35, -0.42], [0.78, -0.34], [1, 0], [0.78, 0.34], [0.35, 0.42]].map(([a, b]) => vtx(a, b, ang, 1)); for (let i = 1; i < 5; i++) idx.push(v[0], v[i], v[i + 1]); }
  { const c = vtx(0, 0, 0, 2), ring = []; for (let k = 0; k < 7; k++) ring.push(vtx(Math.cos(k / 7 * Math.PI * 2), Math.sin(k / 7 * Math.PI * 2), 1, 2)); for (let k = 0; k < 7; k++) idx.push(c, ring[k], ring[(k + 1) % 7]); }
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aK', new THREE.Float32BufferAttribute(kind, 1)); g.setIndex(idx);
  budO = new Float32Array(js.length); budJ = Int32Array.from(js);
  g.setAttribute('aB', new THREE.InstancedBufferAttribute(new Float32Array(at), 4)); g.setAttribute('aF', new THREE.InstancedBufferAttribute(new Float32Array(par), 4));
  const oa = new THREE.InstancedBufferAttribute(budO, 1); oa.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aO', oa); g.instanceCount = js.length;
  const m = mat(`void main(){ vec3 n=NORMAL; gl_FragColor=vec4(finish(shade(vC,n,vW,0.06,0.7),vW),1.0); }`, { side: THREE.DoubleSide, vert: `
attribute vec4 aB; attribute vec4 aF; attribute float aO; attribute float aK; uniform float uTime;
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv; varying vec3 vL;
vec3 pal(float i){ return i<0.5?vec3(0.95,0.42,0.68):i<1.5?vec3(0.96,0.95,0.90):i<2.5?vec3(1.0,0.78,0.08):i<3.5?vec3(0.40,0.55,1.0):vec3(0.68,0.42,0.95); }
void main(){ float grow=smoothstep(0.0,0.5,aO), op=smoothstep(0.35,1.0,aO);
  float H=aF.x*grow, S=aF.y*(0.3+0.7*grow), sx=sin(uTime*2.1+aF.w)*0.08*H, sz=cos(uTime*1.7+aF.w*1.3)*0.06*H;
  vec3 top=vec3(sx,H,sz), l, n, col;
  if(aK<0.5){ float y=position.y; l=vec3(position.x*S,y*H,position.z*S)+vec3(sx,0.0,sz)*y*y; n=abs(position.x)>0.0?vec3(0.0,0.0,1.0):vec3(1.0,0.0,0.0); col=vec3(0.15,0.34,0.06)*(0.7+0.5*y); }
  else if(aK<1.5){ float ang=position.z, tl=mix(1.32,0.3,op); vec3 d=vec3(cos(ang)*cos(tl),sin(tl),sin(ang)*cos(tl)), sd=vec3(-sin(ang),0.0,cos(ang));
    l=top+(d*position.x+sd*position.y*mix(0.5,1.0,op))*S; n=normalize(cross(sd,d)); col=mix(vec3(0.22,0.40,0.10),pal(aF.z)*mix(0.72,1.0,position.x),op); }
  else { l=top+vec3(position.x*0.24*S*(0.5+0.5*op),(1.0-position.z)*0.07*S,position.y*0.24*S*(0.5+0.5*op)); n=vec3(0.0,1.0,0.0); col=aF.z>3.5?vec3(0.95,0.95,0.70):vec3(1.0,0.72,0.10); }
  if(aK>0.5){ float L=0.65*op, cl=cos(L), sl=sin(L); vec3 q=l-top; l=top+vec3(q.x*cl+q.y*sl,-q.x*sl+q.y*cl,q.z); n=vec3(n.x*cl+n.y*sl,-n.x*sl+n.y*cl,n.z); } /* the open head leans toward the track */
  float c=cos(aB.w), s=sin(aB.w); vec3 w=aB.xyz+vec3(l.x*c-l.z*s,l.y,l.x*s+l.z*c);
  vW=w; vN=vec3(n.x*c-n.z*s,n.y,n.x*s+n.z*c); vC=col; vUv=position.xy; vL=position; gl_Position=projectionMatrix*viewMatrix*vec4(w,1.0); }` });
  budMesh = new THREE.Mesh(g, m); budMesh.frustumCulled = false; budMesh.visible = false; scene.add(budMesh); hidden.push(budMesh); budMesh.userData.rw = 'runworld-flowers';
  W.buds = js.length;
}

// ---------- petals that stream past: one small quad each, shaped and lit like a petal ----------
function buildPetals() {
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
  pP = new Float32Array(PN * 4); pQ = new Float32Array(PN * 4);
  const a = new THREE.InstancedBufferAttribute(pP, 4), b = new THREE.InstancedBufferAttribute(pQ, 4); a.setUsage(THREE.DynamicDrawUsage); b.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('iP', a); g.setAttribute('iQ', b); g.instanceCount = PN;
  const m = mat(`void main(){ float w=0.32+0.68*smoothstep(-1.0,0.5,vUv.y); if(vUv.x*vUv.x/(w*w)+vUv.y*vUv.y>1.0) discard; vec3 n=NORMAL;
    vec3 alb=vC*(0.8+0.2*vUv.y)*(1.0-0.25*smoothstep(0.0,0.9,abs(vUv.x)/w)); gl_FragColor=vec4(finish(shade(alb,n,vW,0.05,0.9),vW),1.0); }`, { side: THREE.DoubleSide, vert: `
attribute vec4 iP; attribute vec4 iQ; uniform float uTime;
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv; varying vec3 vL;
vec3 pal(float i){ return i<0.5?vec3(1.0,0.55,0.75):i<1.5?vec3(0.97,0.95,0.90):i<2.5?vec3(1.0,0.80,0.20):i<3.5?vec3(0.75,0.58,1.0):vec3(1.0,0.70,0.60); }
void main(){ float a=iQ.x+uTime*iQ.y, b=iQ.x*2.0+uTime*iQ.y*0.7; vec3 l=vec3(position.x*0.55,position.y,0.0)*iP.w;
  float ca=cos(a), sa=sin(a), cb=cos(b), sb=sin(b); l=vec3(l.x,l.y*ca,l.y*sa); l=vec3(l.x*cb+l.z*sb,l.y,-l.x*sb+l.z*cb);
  vec3 n=vec3(0.0,-sa,ca); n=vec3(n.x*cb+n.z*sb,n.y,-n.x*sb+n.z*cb);
  vec3 w=iP.xyz+l; vW=w; vN=n; vC=pal(iQ.z); vUv=position.xy; vL=position; gl_Position=projectionMatrix*viewMatrix*vec4(w,1.0); }` });
  petalMesh = new THREE.Mesh(g, m); petalMesh.frustumCulled = false; petalMesh.visible = false; scene.add(petalMesh); hidden.push(petalMesh); petalMesh.userData.rw = 'runworld-petals';
  for (let i = 0; i < PN; i++) pv.push({ p: new V3(), v: new V3(), age: 0, life: 0, size: 0 });
}

// ---------- sparks in the zone's colour, and dew drops that lift off the leaves: one cloud of soft points ----------
function buildGlints() {
  gPos = new Float32Array(GN * 3); gCol = new Float32Array(GN * 4); gSize = new Float32Array(GN);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(gPos, 3)); g.setAttribute('aC', new THREE.BufferAttribute(gCol, 4)); g.setAttribute('aS', new THREE.BufferAttribute(gSize, 1));
  glints = new THREE.Points(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 aC; attribute float aS; varying vec4 vC4; void main(){ vec4 mv=viewMatrix*vec4(position,1.0); vC4=aC; gl_PointSize=clamp(aS*520.0/max(-mv.z,0.1),2.0,26.0); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec4 vC4; void main(){ float d=length(gl_PointCoord-0.5); float core=smoothstep(0.2,0.0,d), halo=smoothstep(0.5,0.0,d); gl_FragColor=vec4(vC4.rgb*(core*1.4+halo*halo*0.5),1.0); }` }));
  glints.frustumCulled = false; glints.visible = false; glints.renderOrder = 5; scene.add(glints); hidden.push(glints); glints.userData.rw = 'runworld-glints';
  for (let i = 0; i < GN; i++) { gv.push({ p: new V3(0, -900, 0), v: new V3(), age: 0, life: 0, size: 0, c: new V3(), dew: false }); gPos[i * 3 + 1] = -900; }
}

export function setupRunWorld() {
  quietBuild(90211, () => { buildBuds(); buildPetals(); buildGlints(); });
  rnd = seeded(91373); // the numbers it uses while it runs
  window.__runworld = { W, RWK, budJ, budO };
}

// ---------- every frame ----------
let pNext = 0, gNext = 0, pAcc = 0, sAcc = 0, dAcc = 0, lastBails = 0, wasRun = false;
export function updateRunWorld(dt) {
  if (!budMesh || !RUN.N) return;
  const running = RUN.state === 'run', t = running ? RUN.tier : 0;
  if (running && !wasRun) lastBails = RUN.bails; wasRun = running;
  // which way the bee is going: along its flight, or along the track when it hovers
  const sp = P.vel.length(); if (sp > 1) _f.copy(P.vel).multiplyScalar(1 / sp); else _f.set(0, 0, -1);
  _s.set(-_f.z, 0, _f.x); if (_s.lengthSq() < 1e-4) _s.set(1, 0, 0); _s.normalize();
  const under = burrowFloor(P.pos.x, P.pos.z) !== null && P.pos.y < terrainH(P.pos.x, P.pos.z);

  // the bow wave: the grass ahead leans away from the bee's line and stands up again behind it
  W.wave += ((running && !RUN.up ? RWK.wave[t] : 0) - W.wave) * Math.min(1, dt * 2); if (W.wave < 0.002) W.wave = 0;
  { const h = Math.hypot(_f.x, _f.z) || 1, dx = _f.x / h, dz = _f.z / h; U.uWake.value.set(P.pos.x + dx * 2, P.pos.z + dz * 2, W.wave, RWK.waveSide); U.uWakeD.value.set(dx, dz, RWK.waveAhead, RWK.waveBehind); }

  // the little flowers: those just ahead spring up and open, those left behind fold and sink back into the grass
  { const on = running && t >= RWK.budTier && !RUN.up;
    if (on || budLive) { const N = RUN.N, s = RUN.s, ahead = RWK.budAhead / STEP, behind = RWK.budBehind / STEP; let live = 0, open = 0;
      for (let i = 0; i < budO.length; i++) { let d = (((budJ[i] - s) * (RUN.dir || 1)) % N + N) % N; if (d > N / 2) d -= N; /* ahead the way the run goes */
        const want = on && d > -behind && d < ahead, o = budO[i], k = want ? Math.min(1, o + dt * RWK.budPop) : Math.max(0, o - dt * RWK.budFold);
        budO[i] = k; if (k > 0) live++; if (k > 0.9) open++; }
      budLive = live > 0; W.budsOpen = open; budMesh.geometry.attributes.aO.needsUpdate = true; }
    budMesh.visible = budLive; if (!budLive) W.budsOpen = 0; }

  // petals stream past from the third tier on; a bail blows a puff of them past
  pAcc += running ? RWK.petals[t] * dt : 0;
  while (pAcc >= 1) { pAcc--; const rr = rnd(0.9, 2.8), a = rnd(Math.PI * 2); _q.copy(P.pos).addScaledVector(_f, rnd(8, 13)).addScaledVector(_s, Math.cos(a) * rr); _q.y += Math.sin(a) * rr * 0.6 + 0.3;
    petal(_q, rnd(-3, -0.5), 0); }
  if (running && RUN.bails > lastBails) { W.puffs++; for (let k = 0; k < RWK.puff; k++) { const rr = rnd(0.6, 2.2), a = rnd(Math.PI * 2); _q.copy(P.pos).addScaledVector(_f, rnd(1.5, 3.5)).addScaledVector(_s, Math.cos(a) * rr); _q.y += Math.sin(a) * rr * 0.6 + 0.2; petal(_q, 0, rnd(0.5, 0.8)); } }
  if (running) lastBails = RUN.bails;
  let pl = 0;
  for (let i = 0; i < PN; i++) { const q = pv[i], k = i * 4; if (q.life <= 0) { pP[k + 3] = 0; continue; }
    q.age += dt; if (q.age >= q.life) { q.life = 0; pP[k + 3] = 0; continue; } pl++;
    q.v.y -= 0.6 * dt; q.v.multiplyScalar(1 - dt * 0.8); q.p.addScaledVector(q.v, dt);
    const f = Math.min(1, q.age / 0.12) * (1 - clamp((q.age / q.life - 0.75) * 4, 0, 1));
    pP[k] = q.p.x; pP[k + 1] = q.p.y; pP[k + 2] = q.p.z; pP[k + 3] = q.size * f; }
  W.petals = pl; petalMesh.visible = pl > 0; if (pl > 0) { petalMesh.geometry.attributes.iP.needsUpdate = true; petalMesh.geometry.attributes.iQ.needsUpdate = true; }

  // sparks in the zone's colour from the fourth tier on; at the top tier dew lifts off the leaves round the track
  sAcc += running ? RWK.sparks[t] * dt : 0;
  while (sAcc >= 1) { sAcc--; const rr = rnd(0.6, 2.2), a = rnd(Math.PI * 2), q = gv[gNext]; gNext = (gNext + 1) % GN;
    q.p.copy(P.pos).addScaledVector(_f, rnd(5, 11)).addScaledVector(_s, Math.cos(a) * rr); q.p.y += Math.sin(a) * rr * 0.6 + 0.2;
    q.v.copy(_f).multiplyScalar(rnd(-2, 0)); q.v.x += rnd(-0.6, 0.6); q.v.y += rnd(-0.3, 0.8); q.v.z += rnd(-0.6, 0.6);
    q.age = 0; q.life = rnd(0.5, 0.9); q.size = rnd(0.09, 0.14); q.c.copy(U.uAuraC.value).multiplyScalar(2.4); q.dew = false; }
  dAcc += running && t >= RWK.dewTier && !under ? RWK.dew * dt : 0;
  while (dAcc >= 1) { dAcc--; const q = gv[gNext], side = rnd() < 0.5 ? -1 : 1; gNext = (gNext + 1) % GN;
    q.p.copy(P.pos).addScaledVector(_f, rnd(3, 16)).addScaledVector(_s, side * rnd(1.5, 5)); q.p.y = groundAt(q.p.x, q.p.z) + rnd(0.1, 0.8);
    q.v.set(rnd(-0.2, 0.2), rnd(1.2, 2.6), rnd(-0.2, 0.2)); q.age = 0; q.life = rnd(1.8, 2.6); q.size = rnd(0.07, 0.11); q.c.set(1.5, 1.75, 2.0); q.dew = true; }
  let sl = 0, dl = 0;
  for (let i = 0; i < GN; i++) { const q = gv[i], k = i * 3; if (q.life <= 0) { gSize[i] = 0; continue; }
    q.age += dt; if (q.age >= q.life) { q.life = 0; gSize[i] = 0; continue; } if (q.dew) dl++; else sl++;
    if (q.dew) q.v.y *= 1 - dt * 0.3; else q.v.multiplyScalar(1 - dt * 1.5); q.p.addScaledVector(q.v, dt);
    const tw = q.dew ? 0.55 + 0.45 * Math.sin(q.age * 11 + i) : 0.7 + 0.3 * Math.sin(q.age * 23 + i * 1.7), f = Math.min(1, q.age / 0.15) * (1 - clamp((q.age / q.life - 0.6) * 2.5, 0, 1)) * tw;
    gPos[k] = q.p.x; gPos[k + 1] = q.p.y; gPos[k + 2] = q.p.z; gCol[i * 4] = q.c.x * f; gCol[i * 4 + 1] = q.c.y * f; gCol[i * 4 + 2] = q.c.z * f; gCol[i * 4 + 3] = 0; gSize[i] = q.size; }
  W.sparks = sl; W.dew = dl; glints.visible = sl + dl > 0;
  if (glints.visible) { const a = glints.geometry.attributes; a.position.needsUpdate = a.aC.needsUpdate = a.aS.needsUpdate = true; }

  // the light warms at the top tier
  W.warm += ((running && t >= RWK.dewTier ? 1 : 0) - W.warm) * Math.min(1, dt * 0.8); if (W.warm < 0.002) W.warm = 0;
  U.uRunWarm.value = W.warm * RWK.warm;
}
// one petal at p. fwd: its speed along the bee's way (negative: toward the bee). carry: how much of the bee's own speed it starts with (a puff blown along)
function petal(p, fwd, carry) { const q = pv[pNext], k = pNext * 4; pNext = (pNext + 1) % PN;
  q.p.copy(p); q.v.copy(_f).multiplyScalar(fwd).addScaledVector(P.vel, carry); q.v.x += rnd(-0.8, 0.8); q.v.y += rnd(-0.6, 0.6); q.v.z += rnd(-0.8, 0.8);
  if (carry) q.v.addScaledVector(_q.copy(p).sub(P.pos).normalize(), rnd(1, 3));
  q.age = 0; q.life = carry ? rnd(1.2, 1.8) : rnd(0.9, 1.4); q.size = rnd(0.12, 0.2);
  pQ[k] = rnd(Math.PI * 2); pQ[k + 1] = rnd(3, 8) * (rnd() < 0.5 ? -1 : 1); pQ[k + 2] = Math.floor(rnd(5)); pQ[k + 3] = 0; }
