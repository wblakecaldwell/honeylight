// Honeylight: wasps: bodies, the nest, the chase, raids, rescues, the nest raid and their sound.
import * as THREE from '../three.module.min.js';
import { M4, Q4, V3, rnd, clamp, TAU } from './core.js';
import { TY, FDIR, FIELD_D, srnd, HEDGE_R, ORCH, HILLS, terrainH, orchTrees, overWater } from './world.js';
import { scene, camera, mat, geoParts, ell, stick, puff } from './engine.js';
import { beeMat, wingGeo, wingMat, _v, _v2, YA, orient, makeFlier, _wm, tryDecoy } from './bees.js';
import { P, PR } from './player.js';
import { hint } from './controls.js';
import { webs } from './hazards.js';
import { richGlows } from './nectar.js';
import { G, toast, gainHoney, losePollen } from './progress.js';
import { zoneBlocked } from './zones.js';
import { A, tone, SCALE, noiseHit, sweep, setG } from './audio.js';
import { fwd, tmp, inHive, outF, time } from './loop.js';

// wasp nest hanging under the big middle tree
export let NEST;
export function setupNest() {
  NEST = new V3(ORCH.x + 3, orchTrees[0].top - orchTrees[0].cr * 0.55 - 4, ORCH.z + 2);
  {
    const g = new THREE.SphereGeometry(1, 20, 16); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 1 - Math.max(0, -y) * 0.35; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat(`void main(){ vec3 n=NORMAL; float bands=0.5+0.5*sin(vL.y*38.0+vnoise(vL.xz*6.0)*5.0);
    vec3 alb=mix(vec3(0.42,0.38,0.32),vec3(0.70,0.64,0.55),bands)*(0.8+0.3*vnoise(vL.xz*20.0+vL.y*9.0));
    if(vL.y<-0.8) alb*=0.2;
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.05,0.2),vW),1.0); }`));
    m.scale.set(2.8, 3.8, 2.8); m.position.copy(NEST); scene.add(m);
  }
}

// wasps: slimmer, brighter, meaner-looking cousins of the bees
let waspMat, waspGeo, waspMat2, waspMesh, waspWings;
export function setupWaspBodies() {
  waspMat = new THREE.ShaderMaterial({ uniforms: beeMat.uniforms, vertexShader: beeMat.vertexShader, vertexColors: true,
    fragmentShader: beeMat.fragmentShader.replace('vec3(0.60,0.30,0.05)*(0.8+0.4*fz)', 'vec3(1.05,0.78,0.02)*(0.85+0.3*fz)').replace('sin(t*17.0+0.6)', 'sin(t*23.0+0.6)').replace('vec3 alb=vC*(0.8+0.45*fz);', 'vec3 alb=vC*(0.8+0.45*fz)*vec3(0.5,0.45,0.3);') });
  // wasps: slim, glossy, bright yellow and deep black, narrow waist, long legs
  waspGeo = (() => {
    const blk = [0.02, 0.018, 0.015], face = [0.85, 0.68, 0.0], abd = [1.0, 0.8, 0.0], leg = [0.8, 0.6, 0.04];
    const parts = [
      { g: ell(0.13, 0.13, 0.11, 0, 0.02, 0.43, 14), c: face },
      { g: ell(0.06, 0.095, 0.07, 0.095, 0.045, 0.43, 10), c: blk }, { g: ell(0.06, 0.095, 0.07, -0.095, 0.045, 0.43, 10), c: blk },
      { g: ell(0.14, 0.14, 0.2, 0, 0.03, 0.18, 16), c: blk },
      { g: ell(0.035, 0.035, 0.09, 0, 0.0, -0.06, 8), c: blk },
      { g: ell(0.16, 0.15, 0.4, 0, -0.03, -0.5, 18), c: abd },
    ];
    for (const s of [1, -1]) {
      parts.push({ g: stick([s * 0.04, 0.1, 0.5], [s * 0.12, 0.26, 0.62], 0.01), c: blk }, { g: stick([s * 0.12, 0.26, 0.62], [s * 0.2, 0.22, 0.82], 0.008), c: blk });
      for (const [z0, z1] of [[0.26, 0.5], [0.16, 0.14], [0.06, -0.35]]) {
        parts.push({ g: stick([s * 0.09, -0.08, z0], [s * 0.32, -0.05, (z0 + z1) / 2], 0.011), c: leg }, { g: stick([s * 0.32, -0.05, (z0 + z1) / 2], [s * 0.4, -0.42, z1], 0.008), c: leg });
      }
    }
    return geoParts(parts);
  })();
  waspMat2 = mat(`void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW);
  vec3 alb=vC;
  if(vC.r>0.95 && vC.b<0.02){ float t=vL.z; float band=smoothstep(0.42,0.5,fract(t*5.2+0.15))*(1.0-smoothstep(0.92,1.0,fract(t*5.2+0.15))); alb=mix(vec3(1.15,0.86,0.0),vec3(0.008,0.006,0.004),band); alb=mix(alb,vec3(0.01),smoothstep(-0.12,-0.05,vL.z)); }
  float rimv=pow(1.0-max(dot(n,V),0.0),3.0);
  vec3 c=shade(alb,n,vW,1.1,0.1)+vec3(0.9,0.8,0.5)*rimv*0.15;
  gl_FragColor=vec4(finish(c,vW),1.0); }`, { vertexColors: true });
  waspMesh = new THREE.InstancedMesh(waspGeo, waspMat2, WASPN); waspMesh.frustumCulled = false; scene.add(waspMesh);
  waspWings = new THREE.InstancedMesh(wingGeo, wingMat, WASPN * 2); waspWings.frustumCulled = false; scene.add(waspWings);
  {
    const mh = new V3(FDIR.x * (FIELD_D + 40) - FDIR.z * 35, 0, FDIR.z * (FIELD_D + 40) + FDIR.x * 35); mh.y = terrainH(mh.x, mh.z) + 14;
    wasps.push({ home: mh, R: 38, orchard: false });
    wasps.push({ home: NEST.clone(), R: 8, orchard: true }, { home: NEST.clone(), R: 11, orchard: true }, { home: new V3(0, -500, 0), R: 0, raider: true }, { home: new V3(0, -500, 0), R: 0, raider: true });
    wasps.push({ home: new V3(0, -500, 0), R: 0, mob: true }, { home: new V3(0, -500, 0), R: 0, mob: true });
    { const H = HILLS[0]; wasps.push({ home: new V3(H.x, terrainH(H.x, H.z) + 26, H.z), R: 16, orchard: false, guard: true }); }
    for (const w of wasps) { w.p = w.home.clone(); w.v = new V3(); w.state = 'patrol'; w.t = 0; w.ph = srnd(TAU); w.q = new Q4(); w.fwd = new V3(1, 0, 0); w.buzzT = 0; }
  }
}

const WASPN = 8;
export const wasps = [];

// --- threats: wasps
const _wm2 = new M4(), _wt = new M4(), _wr = new M4(), _wsc = new M4(), _wv = new V3(), _wp = new V3();
export function updateWasps(dt) {
  const flying = P.mode === 'fly' && !inHive;
  wasps.forEach((w, i) => {
    w.t += dt; w.buzzT -= dt;
    const d = w.p.distanceTo(P.pos), active = !w.orchard || G.orchard;
    let target, spd;
    if (w.gone > 0) { w.gone -= dt; if (w.gone > 0) { hideWasp(i, w); return; } w.p.copy(w.home); w.p.y += 12; w.v.set(0, 0, 0); w.state = 'patrol'; w.t = 0; }
    if (w.state === 'webbed') { w.webT -= dt; w.p.copy(w.webAt).addScaledVector(w.web.n, Math.sin(time * 40) * 0.08); w.p.x += Math.sin(time * 31) * 0.05;
      if (w.webT <= 0) { eatWasp(w, 'web'); hideWasp(i, w); return; } target = w.p; spd = 0; }
    if (w.state === 'dazed') { w.dazeT -= dt; const gy = terrainH(w.p.x, w.p.z) + 0.5; w.p.y = Math.max(gy, w.p.y - dt * 14); if (w.p.y <= gy + 0.01) { w.p.x += Math.sin(time * 37 + i) * 0.01; }
      if (w.dazeT <= 0) { if (w.mob) { w.state = 'flee'; w.t = 0; w.away = w.p.clone().add(new V3(rnd(-80, 80), 30, rnd(-80, 80))); } else { w.state = 'retreat'; w.t = 0; } } else { target = w.p; spd = 0; } }
    if (w.state === 'balled') { target = w.p; spd = 0; }
    if (w.raider || w.mob) { const rr = w.mob ? mobUpdate(w, d, flying, dt) : raiderUpdate(w, d, flying, dt);
      if (rr === null) { w.p.set(0, -500, 0); _v2.set(0.001, 0.001, 0.001); _wm2.compose(w.p, w.q, _v2); waspMesh.setMatrixAt(i, _wm2); waspWings.setMatrixAt(i * 2, _wm2); waspWings.setMatrixAt(i * 2 + 1, _wm2); return; }
      if (rr) { target = rr[0]; spd = rr[1]; } }
    if (target) { }
    else if (w.state === 'patrol') {
      const a = time * 0.35 + w.ph; target = _wv.set(w.home.x + Math.cos(a) * w.R, w.home.y + Math.sin(time * 0.9 + w.ph) * 4, w.home.z + Math.sin(a * 1.3) * w.R); spd = 9;
      if (w.orchard && NESTR.out && w.out) { target = _wv.set(w.out.x + Math.cos(time * 0.6 + w.ph) * 9, w.out.y + Math.sin(time * 0.9 + w.ph) * 3, w.out.z + Math.sin(time * 0.7 + w.ph) * 9); spd = 10; }
      if (active && flying && P.load.length > 0 && d < 34) { w.state = 'chase'; w.t = 0; sweep(300, 520, 0.35, 0.05, 'sawtooth'); if (!G.seenWasp) { G.seenWasp = true; toast('<b>A wasp wants your pollen!</b><br><span>heavy bees are slow: outrun it, dive into the hive, or lead it into a spider web</span>', 6); } }
    } else if (w.state === 'chase') {
      if (!w.decoy && d < 15 && tryDecoy(w)) { }
      if (w.decoy) { target = _wv.copy(w.decoy.p); spd = 21; if (w.t > 6) { w.state = 'retreat'; w.t = 0; w.decoy = null; } } else target = _wv.copy(P.pos); if (!w.decoy) spd = 23;
      if (!w.decoy && d < 1.9) {
        const n = losePollen(Math.ceil(P.load.length / 2));
        tmp.copy(P.pos).sub(w.p).normalize(); P.vel.addScaledVector(tmp, 22); P.vel.y += 7; puff(P.pos, 30, [1.0, 0.8, 0.25], 4, 0.014, 1.4, 2);
        noiseHit(700, 1.5, 0.25, 0.25); sweep(500, 180, 0.4, 0.06, 'sawtooth'); toast(n ? `<b>Stung!</b> the wasp stole ${n} pollen` : '<b>Stung!</b>', 3);
        w.state = 'retreat'; w.t = 0;
      } else if (!w.decoy && (w.t > 11 || d > 75 || !flying || P.load.length === 0)) { w.state = 'retreat'; w.t = 0; }
      if (w.raider) spd = 21;

    } else if (w.state === 'retreat') { target = w.home; spd = 14; if (w.t > 7) { w.state = 'patrol'; w.t = 0; } }
    if (!target) { target = w.p; spd = 0; }
    tmp.copy(target).sub(w.p); const L = tmp.length(); if (L > 0.01) tmp.multiplyScalar(Math.min(spd, L * 2) / L);
    w.v.lerp(tmp, Math.min(1, dt * (w.state === 'chase' ? 2.6 : 1.5)));
    _wp.copy(w.p); w.p.addScaledVector(w.v, dt); waspWebCheck(w, _wp); w.p.y += Math.sin(time * 7 + w.ph) * 0.02;
    const gy = terrainH(w.p.x, w.p.z) + 2; if (w.p.y < gy) w.p.y = gy; if (spd === 0) w.v.set(0, 0, 0);
    if (w.v.lengthSq() > 0.5) w.fwd.lerp(_v.copy(w.v).normalize(), Math.min(1, dt * 6));
    orient(w.q, w.fwd, YA); _v2.set(1.75, 1.75, 1.75);
    _wm2.compose(w.p, w.q, _v2); waspMesh.setMatrixAt(i, _wm2);
    for (let s = 0; s < 2; s++) { const sg = s ? -1 : 1, flap = Math.sin(time * 230 + i * 3) * 0.85 + 0.15;
      _wt.makeTranslation(sg * 0.09, 0.19, 0.16); _wr.makeRotationZ(sg * flap); _wt.multiply(_wr); _wr.makeRotationY(sg * 0.3); _wt.multiply(_wr); _wsc.makeScale(sg * 1.0, 1, 1.0); _wt.multiply(_wsc);
      waspWings.setMatrixAt(i * 2 + s, _wm.multiplyMatrices(_wm2, _wt)); }
  });
  waspMesh.instanceMatrix.needsUpdate = true; waspWings.instanceMatrix.needsUpdate = true;
}

// ---------- golden-nectar raids: stay to fill up, but the wasps smell it ----------
export function setupRaiders() {
  for (const w of wasps) if (w.raider || w.mob) { w.state = 'idle'; }
}

export function summonRaid(f, lim = 2) {
  let n = 0;
  for (const w of wasps) { if (!w.raider || w.state !== 'idle') continue; const a = rnd(TAU), r = rnd(65, 85);
    w.p.set(f.sx + Math.cos(a) * r, f.y + rnd(8, 16), f.sz + Math.sin(a) * r); w.v.set(0, 0, 0); w.state = 'approach'; w.t = -n * 2.5; w.target = f; n++; if (n >= lim) break; }
}
function raiderUpdate(w, d, flying, dt) {
  // returns [target, speed] or null when parked
  if (w.state === 'idle') return null;
  if (w.state === 'approach') {
    const f = w.target; if (w.t < 0) return [w.p, 0];
    _wv.set(f.sx + Math.cos(time * 1.4 + w.ph) * 5, f.y + 2.5 + Math.sin(time * 2 + w.ph), f.sz + Math.sin(time * 1.4 + w.ph) * 5);

    if (flying && P.load.length > 0 && d < 16) { w.state = 'chase'; w.t = 0; sweep(300, 520, 0.35, 0.05, 'sawtooth'); }
    else if (w.t > 16 || !(f.rich > 0)) { w.state = 'retreat'; w.t = 0; }
    return [_wv, 15];
  }
  if (w.state === 'retreat') {
    if (!w.away) { w.away = w.p.clone().add(_v.copy(w.p).sub(P.pos).setY(0).normalize().multiplyScalar(90)); w.away.y += 35; }
    const tgt = w.away; if (w.t > 6) { w.state = 'idle'; w.away = null; }
    return [tgt, 16];
  }
  return undefined; // chase handled by the normal code
}

// --- rescue events: a sister mobbed by wasps
export let MOB;
let mobGlow;
export function setupRescue() {
  MOB = { active: false, t: 0, next: 45, sis: makeFlier(1.0), home: false, anchor: new V3(), beat: 0 };
  MOB.sis.update = (dt) => {
    const s = MOB.sis;
    if (!MOB.active && !MOB.home) { s.p.set(0, -400, 0); s.s.setScalar(0.001); s.first = true; return; }
    s.s.setScalar(1.0);
    if (MOB.home) { _v.set(0, TY, 14); s.p.lerp(_v, Math.min(1, dt * 0.35)); if (s.p.distanceTo(_v) < 3) MOB.home = false; }
    else { s.p.set(MOB.anchor.x + Math.sin(time * 11) * 0.25, MOB.anchor.y + Math.sin(time * 7.3) * 0.3, MOB.anchor.z + Math.cos(time * 9.1) * 0.25); }
    s.face(dt);
  };
  mobGlow = new THREE.Sprite(richGlows[0].s.material.clone()); mobGlow.material.color = new THREE.Color(2.4, 0.9, 0.35); mobGlow.center.set(0.5, 0); mobGlow.scale.set(3, 30, 1); mobGlow.visible = false; scene.add(mobGlow);
}

function mobUpdate(w, d, flying, dt) {
  w.hitCool = (w.hitCool || 0) - dt;
  if (w.state === 'idle') return null;
  if (w.state === 'mob') {
    const s = MOB.sis.p; _wv.set(s.x + Math.cos(time * 3.3 + w.ph) * 2.3, s.y + Math.sin(time * 4.1 + w.ph) * 0.9, s.z + Math.sin(time * 3.3 + w.ph) * 2.3);
    if (flying && d < 2.4) {
      const sp = P.vel.length();
      if (sp > 11 || G.dartT > 0) { w.state = 'flee'; w.t = 0; _v.copy(w.p).sub(P.pos).normalize(); w.away = w.p.clone().addScaledVector(_v, 90); w.away.y += 25; w.v.copy(_v).multiplyScalar(32);
        noiseHit(500, 1.2, 0.25, 0.2, 'lowpass', 120); sweep(520, 200, 0.4, 0.05, 'sawtooth'); puff(w.p, 18, [1.0, 0.9, 0.4], 3, 0.012, 0.8); toast('<b>Bonk!</b> the wasp tumbles away', 1.5); }
      else if (w.hitCool <= 0) { w.hitCool = 2; const n = losePollen(Math.ceil(P.load.length / 2)); tmp.copy(P.pos).sub(w.p).normalize(); P.vel.addScaledVector(tmp, 18); noiseHit(700, 1.5, 0.22, 0.25); toast(`<b>Stung!</b>${n ? ` you dropped ${n} pollen.` : ''} Hit them fast`, 2.5); }
    }
    return [_wv, 18];
  }
  if (w.state === 'flee') { if (w.t > 5) { w.state = 'idle'; } return [w.away, 26]; }
  return [w.p, 0];
}
export function startMob() {
  _v.set(fwd.x, 0, fwd.z); if (_v.lengthSq() < 0.01) _v.set(1, 0, 0); _v.normalize().applyAxisAngle(YA, rnd(-0.9, 0.9)).multiplyScalar(rnd(45, 70)).add(P.pos);
  if (Math.hypot(_v.x, _v.z) > 300 || overWater(_v.x, _v.z) || zoneBlocked(_v.x, _v.z)) return false;
  MOB.anchor.set(_v.x, terrainH(_v.x, _v.z) + rnd(7, 12), _v.z); MOB.active = true; MOB.t = 0; MOB.home = false; MOB.sis.p.copy(MOB.anchor);
  for (const w of wasps) if (w.mob) { w.state = 'mob'; w.t = 0; w.p.copy(MOB.anchor).add(new V3(rnd(-3, 3), rnd(-1, 2), rnd(-3, 3))); w.v.set(0, 0, 0); }
  toast('<b>A sister is in trouble!</b><br><span>wasps are mobbing her. Hit them hard and fast to drive them off</span>', 5); return true;
}
export function endMob(saved) {
  MOB.active = false; MOB.home = true; MOB.next = rnd(55, 95); mobGlow.visible = false;
  if (saved) { const room = Math.max(0, G.cap - P.load.length), give = Math.min(room, 3); for (let i = 0; i < give; i++) P.load.push(2); P.pollen = P.load.length; if (give < 3) gainHoney((3 - give) * 2);
    [0, 2, 4, 7].forEach((n, i) => tone(SCALE[n], 0.1, 2.2, 'sine', i * 0.1)); puff(MOB.sis.p, 24, [1.0, 0.85, 0.3], 2, 0.012, 1.4); toast('<b>Your sister is safe!</b><br><span>she shares her pollen with you</span>', 4); }
  else { for (const w of wasps) if (w.mob && w.state === 'mob') { w.state = 'flee'; w.t = 0; w.away = w.p.clone().add(new V3(rnd(-80, 80), 30, rnd(-80, 80))); } if (P.pos.distanceTo(MOB.anchor) < 150) toast('<b>The wasps made off with her pollen</b>', 3); }
}
export function updateMob(dt) {
  if (!MOB.active) { if (P.mode === 'fly' && !inHive && outF > 0.8) { MOB.next -= dt; if (MOB.next <= 0) { if (!startMob()) MOB.next = 5; } } return; }
  MOB.t += dt; const d = P.pos.distanceTo(MOB.anchor);
  mobGlow.visible = true; mobGlow.position.set(MOB.anchor.x, MOB.anchor.y + 1.5, MOB.anchor.z); mobGlow.material.opacity = 0.35 + 0.25 * Math.sin(time * 6);
  MOB.beat -= dt; if (MOB.beat <= 0 && d < 160) { MOB.beat = 0.6; sweep(rnd(900, 1100), rnd(1300, 1500), 0.15, 0.02 + 0.03 * (1 - d / 160)); }
  if (wasps.every(w => !w.mob || w.state !== 'mob')) endMob(true); else if (MOB.t > 32) endMob(false);
}

// --- wasps sound different: a harsh, higher whine that pans and rises as they close in
const WA = { on: false };
export function waspAudio() {
  if (!A.ctx || !A.master) return; const c = A.ctx;
  if (!WA.on) { // "hornet drone": two detuned saws and a sub-octave, distorted, with a rough wingbeat flutter
    WA.o1 = c.createOscillator(); WA.o1.type = 'sawtooth'; WA.o2 = c.createOscillator(); WA.o2.type = 'sawtooth'; WA.sub = c.createOscillator(); WA.sub.type = 'triangle';
    WA.mix = c.createGain(); WA.mix.gain.value = 0.5; WA.sh = c.createWaveShaper(); { const n = 1024, cv = new Float32Array(n); for (let i = 0; i < n; i++) cv[i] = Math.tanh((i / n * 2 - 1) * 3.5); WA.sh.curve = cv; }
    WA.f = c.createBiquadFilter(); WA.f.type = 'lowpass'; WA.f.frequency.value = 1400; WA.f.Q.value = 2.5;
    WA.trem = c.createGain(); WA.trem.gain.value = 0.75; WA.am = c.createOscillator(); WA.am.frequency.value = 118; WA.amg = c.createGain(); WA.amg.gain.value = 0.25; WA.am.connect(WA.amg); WA.amg.connect(WA.trem.gain);
    WA.g = c.createGain(); WA.g.gain.value = 0; [WA.o1, WA.o2, WA.sub].forEach(o => o.connect(WA.mix)); WA.mix.connect(WA.sh); WA.sh.connect(WA.f); WA.f.connect(WA.trem); WA.trem.connect(WA.g);
    WA.p = c.createStereoPanner ? c.createStereoPanner() : null; if (WA.p) { WA.g.connect(WA.p); WA.p.connect(A.master); } else WA.g.connect(A.master);
    [WA.o1, WA.o2, WA.sub, WA.am].forEach(o => o.start()); WA.on = true;
  }
  let best = null, bd = 1e9; for (const w of wasps) { if (w.state === 'idle' || w.gone > 0) continue; const d = w.p.distanceTo(camera.position); if (d < bd) { bd = d; best = w; } }
  const angry = best && (best.state === 'chase' || best.state === 'mob' || best.state === 'approach' || best.state === 'webbed'), near = best ? Math.max(0, 1 - bd / 90) : 0;
  setG(WA.g.gain, best ? near * near * (angry ? 0.14 : 0.06) : 0, 0.12);
  if (best) { _v.copy(best.p).sub(camera.position); const L = Math.max(0.01, _v.length()); _v.multiplyScalar(1 / L); const closing = -_v.dot(_v2.copy(best.v).sub(P.vel));
    const base = 175 + clamp(closing, -20, 30) * 1.6 + (angry ? 25 : 0); setG(WA.o1.frequency, base, 0.08); setG(WA.o2.frequency, base * 1.012, 0.08); setG(WA.sub.frequency, base / 2, 0.08);
    setG(WA.f.frequency, 900 + near * 1400 + (angry ? 600 : 0), 0.1);
    if (WA.p) { _v2.set(1, 0, 0).applyQuaternion(camera.quaternion); setG(WA.p.pan, clamp(_v.dot(_v2), -1, 1) * 0.9, 0.08); } }
}

// ---------- batch 1: nectar trails, the nest raid, luring wasps ----------
function hideWasp(i, w) { w.p.set(0, -500, 0); _v2.set(0.001, 0.001, 0.001); _wm2.compose(w.p, w.q, _v2); waspMesh.setMatrixAt(i, _wm2); waspWings.setMatrixAt(i * 2, _wm2); waspWings.setMatrixAt(i * 2 + 1, _wm2); }

export function setupRevenge() {
  G.revenge = 0; G.raids = 0; G.trails = 0;
}

export function eatWasp(w, by) {
  const near = P.pos.distanceTo(w.p) < 120;
  _v.copy(w.p); puff(_v, 22, [0.9, 0.85, 0.6], 3, 0.01, 1.0); puff(_v, 10, [1.0, 0.8, 0.2], 2, 0.012, 0.8);
  if (w.raider) { w.state = 'idle'; w.away = null; } else { w.state = 'gone'; w.gone = rnd(45, 60); }
  w.webbed = 0; w.decoy = null; G.revenge++;
  if (near) { gainHoney(2); noiseHit(by === 'web' ? 2200 : 900, 2, 0.18, 0.3); [7, 4, 2].forEach((n, k) => tone(SCALE[n] * 0.5, 0.06, 0.8, 'triangle', k * 0.08));
    toast(by === 'web' ? '<b>The spider got it!</b><br><span>one less wasp. +2 honey</span>' : by === 'ball' ? '<b>The wasp is done for</b><br><span>your sisters cooked it. +2 honey</span>' : '<b>Snatched!</b><br><span>a dragonfly ate the wasp. +2 honey</span>', 3); }
}
function waspWebCheck(w, prev) {
  if (w.state !== 'chase' || w.decoy) return;
  for (const wb of webs) {
    if (wb.torn > 0 || P.stuckWeb === wb && P.stuck > 0) continue;
    const d0 = _v.copy(prev).sub(wb.c).dot(wb.n), d1 = _v.copy(w.p).sub(wb.c).dot(wb.n);
    if (!(d0 * d1 <= 0 || Math.abs(d1) < 0.9)) continue;
    if (_v.addScaledVector(wb.n, -d1).length() > wb.r * 0.9) continue;
    w.state = 'webbed'; w.webT = 4.5; w.web = wb; w.webAt = w.p.clone().addScaledVector(wb.n, -d1); w.v.set(0, 0, 0);
    if (P.pos.distanceTo(w.p) < 90) { noiseHit(1800, 4, 0.16, 0.35); toast('<b>The wasp flew into a web!</b>', 2.5); if (!G.seenLure) { G.seenLure = true; hint('wasps chasing you can blunder into webs. Dragonflies hunt them too', 6); } }
    return;
  }
}

// --- the wasp nest: when its guards are out, slip under it and take the stolen honey back
export let NESTR;
let nestGlow;
export function setupNestRaid() {
  NESTR = { out: false, t: 40, cd: 0, hold: 0, quiet: false, E: NEST.clone().add(new V3(0, -4.8, 0)) };
  nestGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: richGlows[0].s.material.map, color: new THREE.Color(2.0, 1.3, 0.45), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  nestGlow.scale.set(5, 9, 1); nestGlow.center.set(0.5, 0.15); nestGlow.position.copy(NESTR.E); nestGlow.visible = false; scene.add(nestGlow);
}

function nestGuards() { let n = 0; for (const w of wasps) if (w.orchard && !(w.gone > 0) && w.state !== 'webbed' && w.p.distanceTo(NEST) < 18) n++; return n; }
export function nestCollide(p, v) {
  const a = 2.8 + PR, b = 3.8 + PR, dx = (p.x - NEST.x) / a, dy = (p.y - NEST.y) / b, dz = (p.z - NEST.z) / a, r = Math.hypot(dx, dy, dz);
  if (r >= 1 || r < 1e-4) return; p.set(NEST.x + dx / r * a, NEST.y + dy / r * b, NEST.z + dz / r * a);
  _v.set(dx, dy, dz).normalize(); const vn = v.dot(_v); if (vn < 0) v.addScaledVector(_v, -vn);
}
export function updateNest(dt) {
  if (!G.orchard) { nestGlow.visible = false; return; }
  NESTR.t -= dt; NESTR.cd -= dt;
  if (NESTR.t <= 0) { NESTR.out = !NESTR.out; NESTR.t = NESTR.out ? rnd(24, 32) : rnd(30, 45);
    if (NESTR.out) for (const w of wasps) if (w.orchard) { const a = rnd(TAU), r = rnd(35, HEDGE_R - 22), x = ORCH.x + Math.cos(a) * r, z = ORCH.z + Math.sin(a) * r; w.out = new V3(x, terrainH(x, z) + rnd(8, 16), z); } }
  const guards = nestGuards(), quiet = guards === 0 && NESTR.cd <= 0, dC = camera.position.distanceTo(NEST);
  nestGlow.visible = dC < 260; nestGlow.material.opacity += ((quiet ? 0.55 + 0.15 * Math.sin(time * 3) : 0) - nestGlow.material.opacity) * Math.min(1, dt * 2);
  if (quiet && dC < 160 && Math.random() < dt * 4) { _v.set(NEST.x + rnd(-0.8, 0.8), NEST.y - 3.6, NEST.z + rnd(-0.8, 0.8)); puff(_v, 1, [1.0, 0.65, 0.15], 0.2, 0.02, 1.6, 9); }
  if (quiet && !NESTR.quiet && P.mode === 'fly' && P.pos.distanceTo(NEST) < 75) {
    toast(G.raids ? '<b>The nest is unguarded again</b>' : '<b>The wasp nest is unguarded</b><br><span>it\'s full of honey they stole. Slip underneath and take it back</span>', G.raids ? 2.5 : 6); }
  NESTR.quiet = quiet;
  const dE = P.pos.distanceTo(NESTR.E);
  if (P.mode === 'fly' && !inHive && dE < 3.8 && NESTR.cd <= 0) {
    if (guards > 0) { NESTR.hold = 0; if (time > (NESTR.hintT || 0)) { NESTR.hintT = time + 5; toast('<b>Wasps are home</b><br><span>wait for them to fly out, or lead them away</span>', 3); } }
    else { NESTR.hold += dt; if (Math.random() < dt * 8) { tone(SCALE[Math.min(7, Math.floor(NESTR.hold * 3))], 0.05, 0.5); puff(NESTR.E, 2, [1.0, 0.7, 0.2], 1, 0.014, 0.9, -1); }
      if (NESTR.hold >= 2.2) raidNest(); }
  } else NESTR.hold = Math.max(0, NESTR.hold - dt * 2);
}
export function raidNest() {
  NESTR.hold = 0; NESTR.cd = 180; G.raids++;
  const give = Math.min(3, Math.max(0, G.cap - P.load.length)); for (let i = 0; i < give; i++) P.load.push(4); P.pollen = P.load.length;
  gainHoney(6 + (3 - give) * 4);
  puff(NESTR.E, 40, [1.0, 0.7, 0.2], 4, 0.016, 1.4, 3); [0, 2, 4, 7].forEach((n, k) => tone(SCALE[n], 0.1, 1.6, 'sine', k * 0.07));
  sweep(260, 620, 0.6, 0.07, 'sawtooth'); noiseHit(500, 1, 0.2, 0.5, 'lowpass', 160);
  for (const w of wasps) if (w.orchard && !(w.gone > 0)) { w.state = 'chase'; w.t = -8; w.decoy = null; }
  toast(`<b>You took the honey back!</b><br><span>${give ? `${give} heavy balls of stolen honey. ` : ''}The nest is furious. Fly!</span>`, 4);
}

// revenge pays off: after every 5 wasps you beat, the rest keep their distance for a while
export function setupCalm() {
  G.calmT = 0; G.calmAt = 5;
}

export function updateCalm(dt) { if (G.revenge >= G.calmAt) { G.calmAt += 5; G.calmT = 60; toast('<b>The wasps are rattled</b><br><span>they keep their distance for a while</span>', 4); [0, 4, 7].forEach((n, k) => tone(SCALE[n], 0.08, 1.6, 'sine', k * 0.1)); }
  if (G.calmT > 0) { G.calmT -= dt; for (const w of wasps) if (w.state === 'chase' && !w.calmed) { w.state = 'retreat'; w.t = 0; w.decoy = null; } } }
