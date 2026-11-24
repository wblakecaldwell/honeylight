// Honeylight: the camera that moves on its own: look at yourself when you sit still, danger sense, hold B to look behind, and smooth moves in and out of the bee's eyes.
import * as THREE from '../three.module.min.js';
import { V3 } from './core.js';
import { camera } from './engine.js';
import { P, camReach, VIEW } from './player.js';
import { G, toast } from './progress.js';
import { keys, tipOnce } from './controls.js';
import { wasps } from './wasps.js';
import { SWARM } from './bees.js';
import { RUN } from './longrun.js';
import { camPos, inHive } from './loop.js';

// The rig sits on top of the game's own camera (follow view or the bee's eyes). It holds where the camera is round the bee
// (az, el, r), where it looks (ly, lp) and its roll. Each value follows its goal on a critically damped spring, so a new goal
// (sit, a wasp, B, take off, V) bends the move smoothly and never jumps. When the goal is the game's own view again and the rig
// has caught up, the rig lets go and the game's camera is used exactly as before (CAM-011).
export const LOOK = {
  on: true,            // ?look=0 switches the rig off
  mode: 'base',        // base, look, danger, behind
  vis: null,           // null: the game decides if the bee's body is drawn; true/false: the rig decides (CAM-012)
  r: 0,                // how far the camera is from the bee now
  off: 0,              // seconds the bee has not touched what it sits on
  idle: 0,             // seconds the bee has sat still with no key and no mouse
  rig: null,
  SIT: 3,              // seconds of sitting still before the camera swings round (CAM-007)
  NEAR: 30,            // a wasp this close stops the look; with danger sense the camera turns to it (CAM-008)
  FAR: 60,             // with danger sense, B finds a wasp this close (CAM-009)
  RATE: { look: 2.0, danger: 3.6, behind: 13, base: 8, quick: 23 }, // spring rates: the move is mostly done in about 2.4 s, 1.3 s, 0.35 s, 0.6 s and 0.2 s
};
const KEYS = ['az', 'el', 'r', 'ly', 'lp', 'roll'], ANG = { az: 1, ly: 1, roll: 1 };
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const _o = new V3(), _f = new V3(), _u = new V3(), _r = new V3(), _a = new V3(), _b = new V3(), _s = new V3(), _q = new THREE.Quaternion(), _qr = new THREE.Quaternion(), _m = new THREE.Matrix4();
const _pts = [new V3(), new V3()], _UP = new V3(0, 1, 0), _Z = new V3(0, 0, 1);
const sph = (out, az, el, r) => out.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(r);
let vKey = false, lastYaw = 0, lastPitch = 0, lastThird = null, quick = false, last = null, pull = 1;

export function setupLookCam() {
  try { if (/[?&]look=0/.test(location.search)) LOOK.on = false; } catch (e) { }
  G.escapes = G.escapes || 0; G.sense = G.escapes >= 3; window.__look = LOOK;
  addEventListener('keydown', e => { if (e.code === 'KeyV' && !e.repeat) vKey = true; }); // only V glides between the views; code that sets G.third (tests, the title) still cuts
}

// the game's own view this step, in the rig's terms
function basePose(out) {
  const B = P.pos; _o.copy(camera.position).sub(B); const r = _o.length(); _f.set(0, 0, -1).applyQuaternion(camera.quaternion); _u.set(0, 1, 0).applyQuaternion(camera.quaternion);
  out.ly = Math.atan2(_f.x, _f.z); out.lp = Math.asin(Math.max(-1, Math.min(1, _f.y))); out.r = r;
  // roll: the angle of the camera's up round its forward axis, from the up of a camera with no roll
  _r.crossVectors(_f, _UP); if (_r.lengthSq() < 1e-8) out.roll = 0; else { _r.normalize(); _a.crossVectors(_r, _f); out.roll = Math.atan2(_u.dot(_r), _u.dot(_a)); }
  // the bee's eyes: there is no 'round the bee' yet; leave from behind the head and well above it, so the camera rises out of it
  if (r < 0.15) { out.az = wrap(out.ly + Math.PI); out.el = 1.0; } else { out.az = Math.atan2(_o.x, _o.z); out.el = Math.asin(_o.y / r); }
  out.eyes = r < 0.15; return out;
}
// point the camera from the spot (az, el, r) toward the middle of the things to show
function aim(p, pts) { sph(_a, p.az, p.el, p.r).add(P.pos); _s.set(0, 0, 0); for (const t of pts) _s.add(_b.copy(t).sub(_a).normalize()); _s.normalize();
  p.ly = Math.atan2(_s.x, _s.z); p.lp = Math.asin(Math.max(-1, Math.min(1, _s.y))); p.roll = 0; return p; }
function heading() { return Math.atan2(-Math.sin(P.yaw), -Math.cos(P.yaw)); } // where the bee faces, as an angle round the up axis
// look at yourself: in front of the bee, 45 degrees across and 45 up (CAM-007)
function lookPose(p) { p.az = wrap(heading() + Math.PI / 4); p.el = Math.PI / 4; p.r = 1.9; return aim(p, [_pts[0].copy(P.pos).add(_b.set(0, 0.05, 0))]); }
// danger sense: behind your shoulder on the far side from the wasp, framing you and the wasp together (CAM-008)
function dangerPose(p, w) { _o.copy(w.p).sub(P.pos); const d = _o.length(), aw = Math.atan2(_o.x, _o.z);
  p.az = wrap(aw + Math.PI + 0.5); p.el = 0.5 + 0.2 * Math.max(0, 1 - d / 30); p.r = 2.4 + 2.0 * Math.max(0, 1 - d / 25);
  return aim(p, [_pts[0].copy(P.pos).add(_b.set(0, 0.05, 0)), _pts[1].copy(w.p)]); }
// look behind: in front of the bee and a little to the side, looking back down the way it came (CAM-009)
function behindPose(p) { const h = heading(); p.az = wrap(h + 0.35); p.el = 0.32; p.r = 2.8;
  return aim(p, [_pts[0].copy(P.pos).add(_b.set(0, 0.05, 0)), _pts[1].copy(P.pos).add(_b.set(-Math.sin(h) * 25, 0, -Math.cos(h) * 25))]); }

// a wasp that is a danger now (not idle, gone, caught in a web, dazed or held in a bee ball)
const danger = w => !(w.gone > 0) && w.p.y > -100 && w.state !== 'idle' && w.state !== 'webbed' && w.state !== 'dazed' && w.state !== 'balled' && w.state !== 'gone';
export function nearestWasp(R) { let best = null, bd = R; for (const w of wasps) { if (!danger(w)) continue; const d = w.p.distanceTo(P.pos); if (d < bd) { bd = d; best = w; } } return best; }
// other dangers and busy times stop the look at yourself (CAM-010)
function busy() { const N = window.NIGHT, bat = N && N.bat, S = window.STORM;
  if (bat && bat.on && (bat.state === 'hunt' || bat.state === 'strike' || bat.state === 'lock' || bat.state === 'stoop') && bat.p.distanceTo(P.pos) < 80) return true;
  if ((P.soak || 0) > 0.02 || (S && S.on && S.rainAt && S.rainAt(P.pos.x, P.pos.z) > 0.05)) return true;
  return P.stuck > 0 || RUN.state === 'run' || SWARM.active; }

// a wasp chase that ends with no sting while the bee still has pollen is an escape (wasps.js counts G.escapes); three escapes teach danger sense (CAM-013)
function learn() { if (!G.sense && (G.escapes || 0) >= 3) { G.sense = true; toast('<b>Danger sense</b><br><span>you have learned to feel the air from wings behind you. Sit still, or hold <kbd>B</kbd>, and you turn to see the nearest wasp</span>', 7); } }

const goal = {}, base = {};
export function updateLookCam(dt) {
  learn();
  if (!LOOK.on) { LOOK.vis = VIEW.vis = null; return; }
  const flying = P.mode === 'fly' && !inHive;
  // stillness: no key held and no turn of the mouse while the bee sits on something
  const turned = Math.abs(P.yaw - lastYaw) + Math.abs(P.pitch - lastPitch) > 1e-6; lastYaw = P.yaw; lastPitch = P.pitch;
  LOOK.off = flying && P.landed ? 0 : LOOK.off + dt; // a swaying flower can lift the bee off for a step or two: that is still sitting
  LOOK.idle = flying && LOOK.off < 0.3 && !turned && keys.size === 0 ? LOOK.idle + dt : 0;
  if (flying && wasps.some(w => w.state === 'chase' && !w.decoy && w.p.distanceTo(P.pos) < 40)) tipOnce('b', '<kbd>B</kbd> hold to look behind you', 5);
  basePose(base);
  let mode = 'base', w = null;
  if (flying && keys.has('KeyB')) { mode = 'behind'; if (G.sense) { w = nearestWasp(LOOK.FAR); if (w) mode = 'danger'; } }
  else if (flying && LOOK.idle >= LOOK.SIT && !busy()) { w = nearestWasp(LOOK.NEAR); mode = w ? (G.sense ? 'danger' : 'base') : 'look'; }
  if (mode === 'behind') quick = true; else if (mode !== 'base') quick = false;
  LOOK.mode = mode;
  const third = G.third; const switched = vKey && lastThird !== null && third !== lastThird; lastThird = third; vKey = false;
  if (P.mode !== 'fly' || inHive) { LOOK.rig = null; last = null; return done(null); } // the comb, the cell and the tunnel keep their own camera
  if (!LOOK.rig) {
    if (mode === 'base' && !(switched && last)) { last = Object.assign(last || {}, base); return done(null); }
    const from = switched && last ? last : base; LOOK.rig = { v: {} }; for (const k of KEYS) { LOOK.rig[k] = from[k]; LOOK.rig.v[k] = 0; } pull = 1; }
  if (mode === 'look') lookPose(goal); else if (mode === 'danger') dangerPose(goal, w); else if (mode === 'behind') behindPose(goal); else Object.assign(goal, base);
  const R = LOOK.rig, om = LOOK.RATE[mode === 'base' ? (quick ? 'quick' : 'base') : mode];
  for (const k of KEYS) { let e = goal[k] - R[k]; if (ANG[k]) e = wrap(e); R.v[k] += (om * om * e - 2 * om * R.v[k]) * dt; R[k] += R.v[k] * dt; if (ANG[k]) R[k] = wrap(R[k]); }
  if (mode === 'base') { let err = 0; for (const k of KEYS) err += Math.abs(ANG[k] ? wrap(goal[k] - R[k]) : goal[k] - R[k]) + Math.abs(R.v[k]) * 0.2;
    if (err < 0.03) { LOOK.rig = null; quick = false; last = Object.assign(last || {}, base); return done(null); } }
  // where the camera goes: round the bee; pulled in when something solid is in the way, as the follow view does
  if (base.eyes && R.r < 0.15) _o.copy(camera.position).sub(P.pos); else { sph(_o, R.az, R.el, R.r); if (R.r > 0.5) { const f = camReach(_o); pull += (f - pull) * Math.min(1, dt * (f < pull ? 15 : 4)); _o.multiplyScalar(pull); } }
  const pos = _a.copy(P.pos).add(_o);
  // near the bee's eyes, look where its eyes look, so the body stays below the picture on the way out and in
  let ly = R.ly, lp = R.lp, roll = R.roll;
  if (base.eyes) { const k0 = Math.max(0, Math.min(1, (1.6 - R.r) / 1.0)), k = k0 * k0 * (3 - 2 * k0); ly = R.ly + wrap(base.ly - R.ly) * k; lp = R.lp + (base.lp - R.lp) * k; roll = R.roll + wrap(base.roll - R.roll) * k; }
  _f.set(Math.sin(ly) * Math.cos(lp), Math.sin(lp), Math.cos(ly) * Math.cos(lp));
  _m.lookAt(pos, _b.copy(pos).add(_f), _UP); _q.setFromRotationMatrix(_m).multiply(_qr.setFromAxisAngle(_Z, roll)); // as Object3D.lookAt does for a camera, then the roll round its own forward axis
  camera.position.copy(pos); camera.quaternion.copy(_q); camera.updateMatrixWorld(); camPos.copy(pos);
  last = Object.assign(last || {}, R);
  return done(_o.length());
}
// the bee's body is drawn once the camera is clear of the head; the antennae and pollen baskets in front of your eyes go as it leaves them (CAM-012)
function done(r) { LOOK.r = r === null ? (G.third ? 3 : 0) : r; LOOK.vis = VIEW.vis = r === null ? null : r > 0.4; }
