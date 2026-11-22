// Honeylight: earned moves: Dart, Leap and the red clover heat buzz.
import * as THREE from '../three.module.min.js';
import { V3, rnd, TAU } from './core.js';
import { WY, HEDGE_R, ORCH, HOLLOW, brookD, terrainH, overWater } from './world.js';
import { scene, camera, UNTONE, U, mat, simple, parts, pNext, puff } from './engine.js';
import { _v } from './bees.js';
import { dewPathD } from './plants.js';
import { WIND } from './air.js';
import { P } from './player.js';
import { hint } from './controls.js';
import { wasps } from './wasps.js';
import { G, UNLOCKS, applyUnlocks, toast } from './progress.js';
import { zoneBlocked } from './zones.js';
import { tone, SCALE, noiseHit, sweep } from './audio.js';
import { fwd, inHive, time } from './loop.js';

// ================= ROUND 5: abilities, rescues, aim shadow =================
// --- earned flying abilities: Dart (Q) and Leap (E)
export function setupDartAndLeap() {
  G.dart = false; G.leap = false; G.abilCD = 1; G.dartCD = 0; G.leapCD = 0; G.dartT = 0; G.want = null;
  UNLOCKS.push(
    { at: 30, name: 'Dart', desc: 'press Q for a sudden burst of wing strength', apply: () => G.dart = true },
    { at: 65, name: 'Leap', desc: 'press E to spring straight up', apply: () => G.leap = true },
    { at: 140, name: 'Quick recovery', desc: 'Dart and Leap come back twice as fast', apply: () => G.abilCD = 0.5 });
  UNLOCKS.sort((a, b) => a.at - b.at); applyUnlocks(false);
  addEventListener('keydown', e => { if (e.repeat) return; if (e.code === 'KeyQ') G.want = 'dart'; if (e.code === 'KeyE') G.want = 'leap'; });
}

export function abilities(dt) {
  G.dartCD -= dt; G.leapCD -= dt; G.dartT -= dt;
  if (G.want === 'dart' && G.dart && G.dartCD <= 0) { G.dartCD = 6 * G.abilCD; G.dartT = 0.7; P.vel.addScaledVector(fwd, 34); sweep(260, 820, 0.35, 0.06, 'sawtooth'); noiseHit(1400, 0.8, 0.12, 0.25); _v.copy(P.pos).addScaledVector(fwd, -1.2); puff(_v, 14, [0.95, 0.9, 0.7], 3, 0.008, 0.6); }
  if (G.want === 'leap' && G.leap && G.leapCD <= 0) { G.leapCD = 7 * G.abilCD; P.vel.y = Math.max(P.vel.y, 0) + 26; sweep(180, 700, 0.4, 0.06, 'sawtooth'); _v.copy(P.pos); _v.y -= 1; puff(_v, 16, [0.95, 0.9, 0.7], 2.5, 0.008, 0.6, 0, -1); }
  G.want = null;
}

// ---------- batch 2a: red clover heat buzz, and the bee ball ----------
// red clovers: rare, low in the grass. A sip warms your flight muscles; F releases the heat as a shimmering pulse
export const CLOVERS = [];

let heatM, heatBall;
export function setupHeatBuzz() {
  { const headM = mat(`void main(){ vec3 n=NORMAL; float fl=vnoise(vL.xz*14.0+vL.y*9.0); vec3 alb=mix(vec3(0.55,0.05,0.16),vec3(0.95,0.35,0.55),fl)*(0.7+0.4*smoothstep(-0.5,0.8,vL.y));
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.2,0.8),vW),1.0); }`), stemM = simple('0.18,0.36,0.08', 0.2, 0.6);
    const hg = new THREE.IcosahedronGeometry(0.85, 3); { const p = hg.attributes.position; for (let i = 0; i < p.count; i++) { const v = new V3(p.getX(i), p.getY(i), p.getZ(i)); const k = 1 + 0.18 * Math.abs(Math.sin(v.x * 23) * Math.sin(v.y * 19) * Math.sin(v.z * 21)); v.multiplyScalar(k); v.y *= 1.15; p.setXYZ(i, v.x, v.y, v.z); } hg.computeVertexNormals(); }
    let guard = 0; while (CLOVERS.length < 7 && guard++ < 4000) { const a = rnd(TAU), d = rnd(70, 230), x = Math.cos(a) * d, z = Math.sin(a) * d, gy = terrainH(x, z);
      if (overWater(x, z) || zoneBlocked(x, z) || gy < WY + 0.5 || dewPathD(x, z) < 6 || brookD(x, z) < 14 || Math.hypot(x - HOLLOW.x, z - HOLLOW.z) < HOLLOW.r + 12 || Math.hypot(x - ORCH.x, z - ORCH.z) < HEDGE_R + 12 || CLOVERS.some(c => Math.hypot(c.x - x, c.z - z) < 40)) continue;
      const h = rnd(2.4, 3.6), g = new THREE.Group(); g.position.set(x, gy, z);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, h, 6), stemM); st.position.y = h / 2; g.add(st);
      const hd = new THREE.Mesh(hg, headM); hd.position.y = h + 0.6; g.add(hd);
      for (const s of [-1, 1]) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), stemM); lf.scale.set(1, 0.12, 0.6); lf.position.set(s * 0.45, h * 0.45, 0); lf.rotation.y = s * 0.4; g.add(lf); }
      scene.add(g); CLOVERS.push({ x, z, y: gy + h + 0.6, g, hd, cool: 0, sip: 0 }); } }
  G.heat = 0; G.heatCD = 0; G.seenClover = false;
  heatM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uTime: U.uTime, uCam: U.uCam },
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: UNTONE + `uniform float uA; uniform float uTime; uniform vec3 uCam; varying vec3 vN; varying vec3 vW; void main(){ vec3 V=normalize(uCam-vW); float fr=pow(1.0-abs(dot(normalize(vN),V)),2.5);
    float rip=0.6+0.4*sin(vW.y*6.0+uTime*20.0+vW.x*3.0); gl_FragColor=vec4(untone(vec3(1.0,0.55,0.2))*fr*rip*uA*2.6,1.0); }` });
  heatBall = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), heatM); heatBall.visible = false; scene.add(heatBall);
}

export const HEAT = { t: -1 };
export function heatBuzz() {
  if (!(G.heat > 0) || P.mode !== 'fly' || inHive) { if (P.mode === 'fly' && time > (G.heatHintT || 0)) { G.heatHintT = time + 4; hint('your wings are cool. Sip a <b>red clover</b> to warm them', 3); } return; }
  G.heat = 0; HEAT.t = 0; heatBall.visible = true; heatBall.position.copy(P.pos);
  sweep(90, 340, 0.7, 0.09, 'sawtooth'); noiseHit(300, 0.8, 0.3, 0.6, 'lowpass', 900); puff(P.pos, 20, [1.0, 0.6, 0.25], 6, 0.012, 0.8);
  for (let k = 0; k < 60; k++) { const q = parts[pNext], a = k / 60 * TAU; puff(P.pos, 1, [1.0, 0.5, 0.18], 0, 0.016, 0.7); q.g = 0; q.v.set(Math.cos(a) * 24, rnd(-3, 3), Math.sin(a) * 24); }
  let n = 0; for (const w of wasps) { if (w.gone > 0 || w.p.y < -100 || w.state === 'idle' || w.state === 'dazed' || w.state === 'balled') continue; if (w.p.distanceTo(P.pos) < 15) { dazeWasp(w); n++; } }
  toast(n ? `<b>Heat buzz!</b><br><span>${n} wasp${n > 1 ? 's' : ''} knocked out of the air</span>` : '<b>Heat buzz!</b><br><span>no wasps close enough</span>', 2.5);
}
function dazeWasp(w) { w.state = 'dazed'; w.dazeT = rnd(5, 7); w.decoy = null; w.v.set(0, 0, 0); w.wasMob = !!w.mob; }
export function updateHeat(dt) {
  if (HEAT.t >= 0) { HEAT.t += dt; const k = HEAT.t / 0.6; heatBall.position.copy(P.pos); heatBall.scale.setScalar(1 + 14 * Math.min(1, k)); heatM.uniforms.uA.value = Math.max(0, 1 - k) * 0.9; if (k >= 1) { HEAT.t = -1; heatBall.visible = false; } }
  if (G.heat > 0 && Math.random() < dt * 6 && P.mode === 'fly') { _v.copy(P.pos).addScaledVector(fwd, -0.6); puff(_v, 1, [1.0, 0.5, 0.2], 0.6, 0.006, 0.5, -0.5); }
  for (const c of CLOVERS) {
    c.cool -= dt; c.hd.visible = c.cool <= 0; const vis = Math.hypot(camera.position.x - c.x, camera.position.z - c.z) < 300; c.g.visible = vis; if (c.cool > 0) continue;
    c.hd.rotation.y += dt * 0.2; c.g.rotation.z = Math.sin(time * 1.3 + c.x) * 0.05 * (0.4 + WIND.s);
    _v.set(c.x, c.y, c.z); const d = P.pos.distanceTo(_v);
    if (P.mode === 'fly' && d < 1.9) { c.sip += dt; if (Math.random() < dt * 10) tone(SCALE[Math.min(7, Math.floor(c.sip * 6))] * 0.5, 0.05, 0.5);
      if (c.sip > 1.0) { c.sip = 0; c.cool = 90; G.heat = 1; puff(_v, 20, [1.0, 0.3, 0.45], 2, 0.012, 1.2); sweep(120, 260, 0.5, 0.05, 'triangle');
        toast(G.seenClover ? '<b>Warm clover nectar</b><br><span><kbd>F</kbd> heat buzz</span>' : '<b>Warm red clover nectar!</b><br><span>your flight muscles burn hot. Press <kbd>F</kbd> near wasps to blast them with heat</span>', G.seenClover ? 2.5 : 6); G.seenClover = true; } }
    else c.sip = Math.max(0, c.sip - dt);
    if (P.pos.distanceTo(_v) > 60 && !G.seenClover && Math.random() < dt * 0.5) { } // left quiet: clovers are found, not announced
  }
}
