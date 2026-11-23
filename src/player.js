// Honeylight: you: state, the body, actions, collisions, third person view and coming home.
import * as THREE from '../three.module.min.js';
import { Q4, V3, rnd, clamp, lerp, smooth } from './core.js';
import { CT, HTOP, RIN, ROUT, TR, TY, WY, HEDGE_R, ORCH, HEDGE_TUN, inHedgeGap, terrainH, LOG, orchTrees, overWater } from './world.js';
import { scene, camera, untoneHex, U, MP, puff } from './engine.js';
import { COMBS, BIRTH, capPieces, resetCap } from './hive.js';
import { newBee, _v, YA, ZA, orient, hero } from './bees.js';
import { flowers, limbCollide, bloomH } from './plants.js';
import { fish, branchCollide, hollowCollide } from './places.js';
import { STONES, archCollide, windHint } from './air.js';
import { hint } from './controls.js';
import { nestCollide } from './wasps.js';
import { wriggle } from './hazards.js';
import { G } from './progress.js';
import { zoneWalls, forestCollide } from './zones.js';
import { solidsCollide } from './solids.js';
import { burrowHolds } from './burrow.js';
import { tone, noiseHit, sweep } from './audio.js';
import { camPos, inHive, time } from './loop.js';
import { GW } from './gaps.js';

// ---------- first-person body ----------
export const ants = [];

export function setupBody() {
  for (const s of [1, -1]) {
    const curve = new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(s * 0.03, 0.035, -0.06), new V3(s * 0.085, 0.03, -0.14), new V3(s * 0.13, -0.01, -0.21)]);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.0022, 6), new THREE.MeshBasicMaterial({ color: untoneHex(0x3a2412), transparent: true, depthTest: false }));
    m.position.set(s * 0.045, 0.07, -0.12); m.renderOrder = 999; camera.add(m); ants.push(m);
  }
  for (const s of [1, -1]) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshBasicMaterial({ color: untoneHex(0xe9b12a), transparent: true, depthTest: false })); m.position.set(s * 0.23, -0.2, -0.36); m.renderOrder = 999; m.scale.setScalar(0.001); camera.add(m); baskets.push(m); }
}

export const baskets = [];

// ---------- player + state ----------
export let P;
export function setupState() {
  P = { pos: new V3(BIRTH.x, BIRTH.y, BIRTH.z - 0.72), vel: new V3(), yaw: Math.PI, pitch: 0, roll: 0, mode: 'title', t: 0, chews: 0, pollen: 0, wet: 0, wingsReady: false, wingT: 0, flown: false, honey: 0, knowDance: false, watch: 0, deliver: 0, lives: 1, landed: null, yawRate: 0, gulpT: 0, shownExit: false };
  try { P.honey = clamp(parseFloat(localStorage.getItem('honeylight.honey')) || 0, 0, 1); } catch (e) { }
}

export function look(dx, dy) { if (P.mode === 'crawl') { P.ch = (P.ch || 0) - dx * 0.0023; P.cp = clamp((P.cp || 0) - dy * 0.0023, -0.35, 1.35); return; } P.yaw -= dx * 0.0023; P.pitch = clamp(P.pitch - dy * 0.0023, -1.56, 1.56); P.yawRate -= dx * 0.0023; }
export function action() {
  if (wriggle()) return;
  if (P.mode === 'cell') chew();
  else if (P.mode === 'crawl' && P.wingsReady) takeOff();
}
export function chew() {
  const per = P.lives > 1 ? 3 : 2; let left = capPieces.filter(m => m.userData.on); if (!left.length) return;
  left.sort((a, b) => a.userData.ring - b.userData.ring || Math.random() - 0.5);
  for (const m of left.slice(0, per)) { const u = m.userData; u.on = false; u.life = 1.6; u.vel.set(rnd(-0.6, 0.6), rnd(-0.2, 0.7), rnd(0.8, 1.8)); u.spin.set(rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)); }
  P.chews++; noiseHit(rnd(1800, 3200), 2, 0.22, 0.07); noiseHit(500, 1, 0.12, 0.05, 'lowpass');
  _v.set(BIRTH.x, BIRTH.y, BIRTH.z); puff(_v, 5, [0.9, 0.65, 0.25], 0.5, 0.012, 0.9, 1.5);
  if (left.length <= per) { P.mode = 'emerge'; P.t = 0; tone(392, 0.08, 2.2); tone(587.33, 0.07, 2.4, 'sine', 0.25); }
}
export function takeOff() { P.tkq = camera.quaternion.clone(); P.tk = time; if (P.mode === 'crawl') { const h = P.ch || 0; _v.set(-Math.sin(h) * 0.6, Math.cos(h) * 0.6, 1).normalize(); P.yaw = Math.atan2(-_v.x, -_v.z); P.pitch = clamp(Math.asin(_v.y), -0.5, 0.5); } if (!P.flownAt) P.flownAt = time; P.mode = 'fly'; P.vel.set(0, 1.2, 1.6); sweep(120, 210, 0.5, 0.05, 'sawtooth'); if (!P.flown) { P.flown = true; hint('<kbd>W</kbd> fly &nbsp; <kbd>space</kbd> rise &nbsp; <kbd>shift</kbd> sink', 8); } }
export function rebirth() { P.lives++; P.mode = 'cell'; P.t = 0; P.chews = 0; P.pollen = 0; P.load = []; P.stuck = 0; P.wet = 0; P.wingsReady = false; P.wingT = 0; P.vel.set(0, 0, 0); P.pos.set(BIRTH.x, BIRTH.y, BIRTH.z - 0.72); P.yaw = Math.PI; P.pitch = 0; resetCap(); hero.active = false; fish.userData.mouth.scale.setScalar(0.02); tone(261.6, 0.07, 3); tone(392, 0.05, 3, 'sine', 0.4); }

// ---------- collisions ----------
export const PR = 0.36;
function trunkR(y) { return ROUT + Math.max(0, -1 - y) * 0.42; }
export function collide(p, v) {
  if (MP) limbCollide(p, v);
  const rad = Math.hypot(p.x, p.z), dT = Math.hypot(p.y - TY, p.z);
  if (p.x > 0 && dT < TR && rad > RIN - 1.2 && rad < ROUT + 1.2) { // tunnel
    if (rad > RIN - PR && rad < ROUT + PR && dT > TR - PR) { const k = (TR - PR) / dT; p.y = TY + (p.y - TY) * k; p.z *= k; }
    return;
  }
  if (rad < (RIN + ROUT) / 2 && p.y > -1 && p.y < HTOP + 1) { // inside the hive
    if (rad > RIN - PR) { const k = (RIN - PR) / rad; p.x *= k; p.z *= k; }
    p.y = clamp(p.y, PR, HTOP - PR);
    for (const c of COMBS) {
      const dz = p.z - c.z, hz = CT / 2 + PR; if (Math.abs(dz) >= hz || Math.abs(p.x) > c.hw + PR || p.y < c.yb - PR) continue;
      if (c.holes.some(h => Math.hypot(p.x - h.x, p.y - h.y) < h.r - PR * 0.6)) continue;
      const pz = hz - Math.abs(dz), py = p.y - (c.yb - PR), px = c.hw + PR - Math.abs(p.x);
      if (pz <= py && pz <= px) { p.z = c.z + Math.sign(dz || 1) * hz; v.z *= 0.2; } else if (py <= px) { p.y = c.yb - PR; v.y = Math.min(v.y, 0); } else { p.x = Math.sign(p.x) * (c.hw + PR); }
    }
    return;
  }
  { const dx = p.x - ORCH.x, dz = p.z - ORCH.z, dO = Math.hypot(dx, dz);
    if (!G.orchard) { const lim = HEDGE_R + 6; if (dO < lim) { const k = lim / dO; p.x = ORCH.x + dx * k; p.z = ORCH.z + dz * k; const vr = (v.x * dx + v.z * dz) / dO; if (vr < 0) { v.x -= vr * dx / dO * 1.6; v.z -= vr * dz / dO * 1.6; } windHint(); } }
    else if (Math.abs(dO - HEDGE_R) < 8.5 + PR && p.y < terrainH(p.x, p.z) + 37 && !inHedgeGap(Math.atan2(dz, dx)) && !(Math.abs(Math.atan2(Math.sin(Math.atan2(dz, dx) - HEDGE_TUN), Math.cos(Math.atan2(dz, dx) - HEDGE_TUN))) < 0.06 && p.y < terrainH(p.x, p.z) + 5.5)) { const t = HEDGE_R + (dO > HEDGE_R ? 1 : -1) * (8.5 + PR), k = t / dO; p.x = ORCH.x + dx * k; p.z = ORCH.z + dz * k; } }
  zoneWalls(p, v); forestCollide(p, v); nestCollide(p, v); hollowCollide(p, v); branchCollide(p, v);
  for (const t of orchTrees) { const dx = p.x - t.x, dz = p.z - t.z, dh = Math.hypot(dx, dz); if (dh > t.cr * 1.6 + 3) continue;
    if (p.y < t.top - t.cr * 0.3 && dh < t.R + PR + 0.8) { const k = (t.R + PR + 0.8) / Math.max(dh, 0.01); p.x = t.x + dx * k; p.z = t.z + dz * k; }
    if (t.blobs) for (const b of t.blobs) { const bx = p.x - b[0], by = (p.y - b[1]) * b[3] / b[4], bz = p.z - b[2], dd = Math.hypot(bx, by, bz), rr = b[3] * 1.02 + PR; if (dd < rr) { const k = rr / Math.max(dd, 0.01); p.x = b[0] + bx * k; p.y = b[1] + by * k * b[4] / b[3]; p.z = b[2] + bz * k; v.multiplyScalar(0.7); } } }
  { const A = LOG.axis, dx = p.x - LOG.c.x, dy = p.y - LOG.c.y, dz = p.z - LOG.c.z, u = dx * A.x + dy * A.y + dz * A.z;
    if (Math.abs(u) < LOG.len / 2 + PR) { const px = dx - A.x * u, py = dy - A.y * u, pz = dz - A.z * u, r = Math.hypot(px, py, pz);
      const ro = LOG.ro * (1 + 0.25 * clamp((-u - LOG.len / 2 + LOG.foot) / LOG.foot, 0, 1) ** 2); // the trunk is wider at its root end
      if (r < ro + PR && r > LOG.ri - PR) { const t = r < (LOG.ri + ro) / 2 ? LOG.ri - PR : ro + PR, k = t / Math.max(r, 0.01); p.x = LOG.c.x + A.x * u + px * k; p.y = LOG.c.y + A.y * u + py * k; p.z = LOG.c.z + A.z * u + pz * k; } } }
  archCollide(p, v);
  for (const s of STONES) { const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz); if (d < 8 && p.y < s.y + 0.4 + PR) { if (d > 6.5) { const k = 8 / Math.max(d, 0.01); p.x = s.x + dx * k; p.z = s.z + dz * k; } else { p.y = s.y + 0.4 + PR; v.y = Math.max(v.y, 0); } } }
  const tr = trunkR(p.y) + PR; if (rad < tr && p.y < 92) { const k = tr / Math.max(rad, 0.01); p.x *= k; p.z *= k; }
  solidsCollide(p, v, PR); // solids.js: the long run's places (stones, canes, pots, roots)
  const gy = terrainH(p.x, p.z) + PR; if (p.y < gy && !burrowHolds(p, v)) { p.y = gy; v.y = Math.max(v.y, 0); } // burrow.js: inside the mole tunnel the bee may be under the hill
}

// ---------- third-person view (V) ----------
export let me;
let _yflip;
export function setupThirdPerson() {
  try { G.third = localStorage.getItem('honeylight.view') !== '1'; } catch (e) { G.third = true; } // a new game starts with the camera outside the bee; V changes it and the choice is kept
  me = newBee(1); me.s.set(0.001, 0.001, 0.001);
  _yflip = new Q4().setFromAxisAngle(YA, Math.PI);
  me.update = () => { const on = G.third && camDist > 0.7 && P.mode !== 'title' && P.mode !== 'cell' && P.mode !== 'emerge' && P.mode !== 'gulp'; me.p.copy(P.pos); me.q.setFromEuler(_meE.set(P.pitch * 0.6 + GW.pitch, P.yaw, P.roll * 1.3 + GW.roll)).multiply(_yflip); me.vel = P.vel; me.bank = clamp(-P.roll * 2.6, -1.2, 1.2); me.fly = P.mode === 'fly' && !GW.still; me.s.setScalar(on ? 1 : 0.001); ants.forEach(a => a.visible = !on); baskets.forEach(b => b.visible = !on); };
  P.cdir = new V3(0, 1, 0);
  // on the comb the bee waddles when it walks: the body swings from side to side, as the sisters do (P.wad and P.wadPh come from loop.js)
  { const mu = me.update; me.update = (dt, t) => { mu(dt, t); if (P.mode === 'crawl') { orient(me.q, P.cdir, ZA); me.p.z -= 0.04; me.bank = 0; me.vel = null;
      const k = P.wad || 0, ph = (P.wadPh || 0) * 1.8; if (k > 0.001) { me.q.multiply(_wq.setFromEuler(_meE.set(0, Math.sin(ph) * 0.085 * k, Math.sin(ph + 1.2) * 0.06 * k))); me.p.addScaledVector(_cz.set(P.cdir.y, -P.cdir.x, 0), Math.sin(ph) * 0.014 * k); } } const tg = P.pollen > 0 ? 0.5 + 0.75 * Math.min(1, P.pollen / G.cap) : 0; me.pol = lerp(me.pol || 0, tg, Math.min(1, (dt || 0) * 5)); }; }
  addEventListener('keydown', e => { if (e.code === 'KeyV' && !e.repeat) { G.third = !G.third; try { localStorage.setItem('honeylight.view', G.third ? '3' : '1'); } catch (er) { } hint(G.third ? 'view from behind &nbsp; <kbd>V</kbd> to switch back' : 'bee\'s-eye view', 2.5); } });
}

const _meE = new THREE.Euler(0, 0, 0, 'YXZ'), _wq = new Q4();
const _cp = new V3(), _cb = new V3(), _cd = new V3(), _cz = new V3();
export let camQuiet = false, camDist = 0;
function camBlocked(pt) { _cz.copy(pt); camQuiet = true; collide(_cz, _cd.set(0, 0, 0)); camQuiet = false; if (_cz.distanceToSquared(pt) > 0.0025) return true;
  for (const f of flowers) { const d = Math.hypot(pt.x - f.sx, pt.z - f.sz); if (d < f.r * 0.75 + f.len * 0.85 + 0.2 && pt.y < f.y + bloomH(f, d) + 0.25 && pt.y > f.y - 1.6) return true; } return false; }
export function thirdPerson(dt) {
  if (!G.third || P.mode === 'title' || P.mode === 'cell' || P.mode === 'emerge' || P.mode === 'gulp') { camDist = 0; return; }
  const want = inHive ? 1.7 : 3.2, up = inHive ? 0.3 : 0.38;
  _cb.set(0, up, want).applyQuaternion(camera.quaternion); // behind and a little above, in view space
  if (P.mode === 'crawl') { _cb.copy(P.cdir).multiplyScalar(-1.6); _cb.z += 1.0; }
  // pull in if something solid is between the bee and the camera
  let ok = 0; const N = 10; for (let i = 1; i <= N; i++) { _cp.copy(P.pos).addScaledVector(_cb, i / N); if (camBlocked(_cp)) break; ok = i / N; }
  const target = Math.max(0.0, ok - 0.08); camDist = target < camDist ? target : lerp(camDist, target, Math.min(1, dt * 4));
  camPos.copy(P.pos).addScaledVector(_cb, camDist); camera.position.copy(camPos);
  // on the comb, look down the wax at your own back, with the comb as the floor
  if (P.mode === 'crawl' && camDist > 0.3) { camera.up.set(0, 0, 1); camera.lookAt(_cz.copy(P.pos).addScaledVector(P.cdir, 0.7)); camera.up.set(0, 1, 0); }
}

// --- soft shadow under the bee: where you'd land
let aimShadow;
export function setupAimShadow() {
  aimShadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform float uA; varying vec2 vP; void main(){ float r=length(vP); gl_FragColor=vec4(0.03,0.02,0.0,uA*smoothstep(1.0,0.2,r)); }' }));
  aimShadow.rotation.x = -Math.PI / 2; aimShadow.renderOrder = 5; scene.add(aimShadow);
}

export function updateAimShadow() {
  if (P.mode !== 'fly' || inHive) { aimShadow.visible = false; return; }
  let y = terrainH(P.pos.x, P.pos.z); if (overWater(P.pos.x, P.pos.z)) y = Math.max(y, WY);
  for (const f of flowers) { const d = Math.hypot(P.pos.x - f.sx, P.pos.z - f.sz); if (d < f.r * 0.75 + f.len * 0.85 && f.y < P.pos.y) { const t = f.y + bloomH(f, d) + 0.05; if (t > y) y = t; } }
  const h = P.pos.y - y; aimShadow.visible = h < 30; aimShadow.position.set(P.pos.x, y + 0.06, P.pos.z); aimShadow.scale.setScalar(0.55 + h * 0.03); aimShadow.material.uniforms.uA.value = 0.55 * (1 - h / 30);
}

export function setupHomeHint() {
  G.seenHome = false;
}

export function updateHome(dt) {
  const dx = -P.pos.x, dz = -P.pos.z, L = Math.hypot(dx, dz) || 1; U.uHome.value.set(dx / L, 0, dz / L);
  const tg = P.mode === 'fly' && !inHive ? (P.pollen > 0 ? 1 : 0.4) * smooth(45, 100, L) : 0; U.uHomeK.value += (tg - U.uHomeK.value) * Math.min(1, dt * 0.8);
  if (!G.seenHome && P.pollen >= G.cap && L > 120) { G.seenHome = true; hint('bees read the light in the sky: a faint shimmer stands over home', 6); }
}

// coming home: the scent of the hive draws a bee in. Heading for the entrance gently lines you up with the tunnel
const _hm = new V3(ROUT + 0.8, TY, 0), _hi = new V3(RIN - 0.5, TY, 0), _hd = new V3();
export function updateHomePull(dt) {
  if (P.mode !== 'fly' || inHive) return; const d = P.pos.distanceTo(_hm); if (d > 18 || P.pos.x < ROUT - 1) return;
  const sp = P.vel.length(); if (sp < 1.5) return; _hd.copy(_hm).sub(P.pos).normalize(); if (d < 6 ? P.vel.x > -0.5 : P.vel.dot(_hd) < 0.45 * sp) return; // only when you are already heading in
  const k = 1 - d / 18; const tgt = d < 5 ? _hi : _hm; _hd.copy(tgt).sub(P.pos).normalize();
  P.vel.lerp(_v.copy(_hd).multiplyScalar(sp), Math.min(1, dt * (1.5 + 5 * k * k)));
  if (d < 5) { const c = Math.min(1, dt * 7); P.pos.y += (TY - P.pos.y) * c; P.pos.z += (0 - P.pos.z) * c; }
}

// on the comb: turn with the mouse and walk where you face, with the wax as your floor
const _cq = new Q4(), _cl = new V3(), _cv = new V3();
function crawlView() { const h = P.ch || 0, cp = P.cp || 0; _cl.set(-Math.sin(h) * Math.cos(cp), Math.cos(h) * Math.cos(cp), Math.sin(cp));
  camera.up.set(0, 0, 1); camera.lookAt(_cv.copy(camera.position).add(_cl)); camera.up.set(0, 1, 0);
  if (P.q0 && P.t < 0.7) { _cq.copy(camera.quaternion); camera.quaternion.slerpQuaternions(P.q0, _cq, smooth(0, 0.7, P.t)); } }
export function viewBlend() { if (P.mode === 'crawl') crawlView(); else if (P.tkq && time - P.tk < 0.5) { _cq.copy(camera.quaternion); camera.quaternion.slerpQuaternions(P.tkq, _cq, smooth(0, 0.5, time - P.tk)); } }
