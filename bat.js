// Honeylight: the bat. From the third night the air above the treetops belongs to the bats.
// One bat flies a fixed round over the eastern meadow. Late in the night it takes one moth (moths.js), which saves that moth's moonflowers.
// A bee that flies low is safe all night. A bee that goes too high (more than CEIL above the ground, away from the hive tree)
// is heard: first a squeak, then echolocation calls that come faster and louder while a bat closes in.
// Drop below the treetops and the calls fade; the bat turns away. Stay high until the calls run together, and the bat takes the bee:
// the bee wakes up in its cell at home, and the pollen it carried is gone. Nothing else is lost.
// Self-contained. It needs night.js. To switch it off add ?bat=0 to the address (or #bat-off).
// It never calls Math.random and shows nothing in the daytime or before the third night.
import { makeBat } from './bat-model.js';
const g = window.__g, N = window.NIGHT;
if (g && N && N.parts && !N.off('bat')) {
  const { THREE, P, DAY, terrainH, HOLLOW } = g, V3 = THREE.Vector3;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
  let _s = 20261124; const rnd = (a = 1, b) => { _s = (_s + 0x6D2B79F5) >>> 0; let t = _s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296; return b === undefined ? r * a : a + r * (b - a); };
  const _mathRandom = Math.random; Math.random = rnd; // three.js draws a random id for each new object: keep the game's stream untouched

  const CRUISE = 16, DIVE = 40, HIGH = 45, WIND = 0.9, HIT = 1.5, FIRST_NIGHT = 3;
  const CEIL = 40;    // the bats' air starts this high above the ground: above most treetops, and well above the hive door (about 25)
  const RAMP = 6;     // seconds from the first squeak to the strike for a bee just above CEIL; at CEIL + 40 and higher it is half of that
  const FADE = 2.5;   // seconds below the treetops until a bat that was about to strike has lost the bee
  const STRIKE = 55;  // speed of the last dive
  // the round: over the eastern meadow, between the hive and the far flowers. [x, z]
  const WAY = [[88, -98], [70, -20], [70, 70], [88, 150], [150, 188], [215, 160], [240, 60], [235, -40], [195, -112], [132, -128]];
  const curve = new THREE.CatmullRomCurve3(WAY.map(([x, z]) => new V3(x, 0, z)), true, 'centripetal'), LEN = curve.getLength();
  const view = makeBat(g); if (!view.group.parent) g.scene.add(view.group); view.group.visible = false;
  const B = N.bat = { on: false, state: 'roost', u: 0, p: new V3(0, -900, 0), v: new V3(), aim: new V3(), dir: new V3(), T: 0, cool: 0, heat: 0, hunts: 0, calls: 0, vol: 0, gap: 0, sq: 0, vis: 0, yaw: 0, pitch: 0, roll: 0, click: 0, target: null, caught: 0, missed: 0, lost: 0, moths: 0, told: false, LEN, period: LEN / CRUISE };
  const _v = new V3(), _t = new V3(), _pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, flap: 1, fold: 0, vis: 0 };

  // Is the bee in the bats' air? High above the ground, in the open. The hive tree is shelter at any height.
  const sheltered = () => Math.hypot(P.pos.x, P.pos.z) < 60;
  const height = () => P.pos.y - terrainH(P.pos.x, P.pos.z);
  const beeHigh = () => P.mode === 'fly' && !g.inHive && height() > CEIL && !sheltered();
  function roundPoint(u, out) { curve.getPointAt(((u % 1) + 1) % 1, out); out.y = terrainH(out.x, out.z) + HIGH + 4 * Math.sin(u * Math.PI * 6); return out; }
  function calls(dt, flying) { // echolocation, as a bee hears it: short falling chirps. While a bat hunts the bee they come faster and louder with the heat.
    if (!flying) return;
    if (B.heat > 0 && (B.state === 'hunt' || B.state === 'strike')) { const k = B.heat, buzz = B.state === 'strike' || k > 0.93;
      B.click -= dt; if (B.click <= 0) { B.gap = buzz ? 0.04 : lerp(0.5, 0.07, Math.pow(k, 0.8)); B.vol = buzz ? 0.13 : lerp(0.014, 0.11, k); B.click = B.gap; B.calls++;
        g.sweep && g.sweep(5200 + 1500 * k, 2600 + 700 * k, 0.035, B.vol, 'sine'); }
      return; }
    if (B.target && (B.state === 'lock' || B.state === 'stoop')) { const d = B.p.distanceTo(P.pos); if (d > 110) return; // far off, the bat that takes a moth: a thin buzz
      B.click -= dt; if (B.click <= 0) { B.click = 0.05; g.tone(4700, 0.006 + 0.012 * (1 - clamp((d - 10) / 100, 0, 1)), 0.035); } }
  }
  // the bee went too high: a bat has heard it
  function heard() { B.hunts++; B.sq = 0.17; B.click = 0.45; g.sweep && g.sweep(7200, 4300, 0.13, 0.09, 'sine');
    if (!B.told) { B.told = true; g.toast('<b>A squeak in the dark</b><br><span>a bat has heard your wings. Its calls come faster and louder as it closes in. Get down below the treetops</span>', 7); }
    else g.hint('a bat has heard you: get down below the treetops', 4);
    if (B.target) B.target = null;
    if (B.state === 'roost' || B.vis < 0.5 || B.p.distanceTo(P.pos) > 95) { const a = B.hunts * 2.4; B.p.set(P.pos.x + Math.cos(a) * 80, P.pos.y + 26, P.pos.z + Math.sin(a) * 80); B.v.set(-Math.cos(a), 0, -Math.sin(a)).multiplyScalar(CRUISE); B.yaw = Math.atan2(B.v.x, B.v.z); B.vis = 0; } // it comes out of the dark
    B.state = 'hunt'; }
  function eat() { const n = P.load.length; B.caught++; B.heat = 0; B.state = 'leave'; B.T = 2.2;
    g.noiseHit(300, 1.2, 0.3, 0.3, 'lowpass', 90); g.rebirth();
    g.toast(`<b>The bat caught you</b><br><span>above the treetops the night belongs to the bats.${n ? ` The pollen you carried is gone.` : ''} You wake up at home</span>`, 7); }
  const backToRound = late => { B.target = null; if (N.t > 0.1 && !late && roundPoint(B.u, _t).distanceTo(B.p) < 130) B.state = 'climb'; else { B.state = 'leave'; B.T = 2.2; } };
  function start() { B.on = N.nightNo() >= FIRST_NIGHT || N.now('bat'); B.state = 'roost'; B.vis = 0; B.cool = 6; B.caught = 0; B.missed = 0; B.lost = 0; B.moths = 0; B.target = null; B.heat = 0; B.hunts = 0; B.calls = 0; B.sq = 0; B.told = false; B.u = 0.62; view.group.visible = B.on; roundPoint(B.u, B.p); B.p.y += 40; }
  function finish() { B.on = false; B.state = 'roost'; B.vis = 0; B.heat = 0; view.group.visible = false; pose(0); }
  function pose(dt) { const s = _pose; s.x = B.p.x; s.y = B.p.y; s.z = B.p.z; s.yaw = B.yaw; s.pitch = B.pitch; s.roll = B.roll; s.vis = B.vis;
    const dive = B.state === 'stoop' || B.state === 'strike'; s.flap = dive ? 0.15 : B.state === 'lock' || B.state === 'hunt' ? 1 : 0.8; s.fold = dive ? 1 : 0; view.set(s); view.update(g.time); }
  function face(dt, quick) { const sp = B.v.length(); if (sp < 0.5) return; const yaw = Math.atan2(B.v.x, B.v.z); let dy = yaw - B.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    B.yaw += dy * Math.min(1, dt * (quick ? 10 : 4)); B.roll += (clamp(-dy * 2.2, -0.9, 0.9) - B.roll) * Math.min(1, dt * 3); B.pitch += (Math.asin(clamp(B.v.y / sp, -1, 1)) - B.pitch) * Math.min(1, dt * 5); }
  function fly(to, speed, K, dt) { _v.copy(to).sub(B.p); const d = _v.length(); if (d > 0.001) _v.multiplyScalar(speed / d); B.v.x += (_v.x - B.v.x) * Math.min(1, K * dt); B.v.y += (_v.y - B.v.y) * Math.min(1, K * dt); B.v.z += (_v.z - B.v.z) * Math.min(1, K * dt); B.p.addScaledVector(B.v, dt); return d; }

  function update(dt, flying) {
    if (!B.on) return;
    const bee = P.pos, late = N.t > 0.94;
    // the heat: how near the strike is. It rises while the bee is in the bats' air (faster the higher it is) and falls when the bee is below the treetops.
    if (flying && beeHigh()) { if (B.heat <= 0) heard(); B.heat = Math.min(1, B.heat + dt * (1 + clamp((height() - CEIL) / 40, 0, 1)) / RAMP); }
    else if (B.heat > 0) B.heat = Math.max(0, B.heat - dt / FADE);
    if (B.sq > 0) { B.sq -= dt; if (B.sq <= 0) g.sweep && g.sweep(7800, 4600, 0.11, 0.08, 'sine'); } /* the squeak has two notes */
    const hunting = B.state === 'hunt' || B.state === 'strike';
    if (B.state === 'roost') { if (N.t > 0.1 && !late) B.state = 'climb'; else return; }
    B.vis = (late && !hunting) || B.state === 'leave' ? Math.max(0, B.vis - dt * 0.5) : Math.min(1, B.vis + dt * (hunting ? 1.5 : 0.6));
    if (late && !hunting && B.state !== 'leave' && B.vis <= 0) { B.state = 'roost'; pose(dt); return; }
    if (B.cool > 0) B.cool -= dt;

    if (B.state === 'cruise') {
      B.u += CRUISE * dt / LEN; roundPoint(B.u + 6 / LEN, _t); fly(_t, CRUISE * clamp(_t.distanceTo(B.p) / 6, 0.7, 1.5), 2.2, dt); face(dt); /* it keeps its place on the round: same time, every time */
      if (B.cool <= 0 && !late) { const MO = N.moths; if (MO && B.moths < 1 && N.t > 0.45) for (const m of MO.list) if (m.i < MO.count && (m.state === 'seek' || m.state === 'rest') && m.vis > 0.9 && Math.hypot(m.p.x - B.p.x, m.p.z - B.p.z) < 24 && m.p.distanceTo(bee) > 14) { B.state = 'lock'; B.T = WIND; B.target = m; break; } }
    } else if (B.state === 'lock') { // it has found a moth: it swings round to it
      if (!B.target) backToRound(late);
      else { B.T -= dt; _t.copy(B.target.p); _t.y += 22; fly(_t, CRUISE * 0.8, 3, dt); face(dt, true); if (B.T <= 0) { B.state = 'stoop'; B.T = 2.6; } }
    } else if (B.state === 'stoop') { // the dive at a moth. A moth cannot dodge.
      if (!B.target) backToRound(late);
      else { B.dir.copy(B.target.p).sub(B.p).normalize(); B.v.copy(B.dir).multiplyScalar(DIVE); B.p.addScaledVector(B.v, dt); B.T -= dt; face(dt, true);
        if (B.p.distanceTo(B.target.p) < HIT + 0.6) { B.moths++; N.moths.take(B.target); B.state = 'climb'; B.cool = 12; B.target = null; }
        else if (B.T <= 0 || B.p.y < terrainH(B.p.x, B.p.z) + 4) { B.state = 'climb'; B.cool = 9; B.target = null; } }
    } else if (B.state === 'hunt') { // it circles in on the bee: far and high at first, close behind when the heat is full
      B.u += CRUISE * dt / LEN;
      if (B.heat <= 0) { B.lost++; backToRound(late); }
      else if (B.heat >= 1) { B.state = 'strike'; g.sweep && g.sweep(900, 260, 0.5, 0.05, 'sawtooth'); }
      else { const a = Math.atan2(B.p.z - bee.z, B.p.x - bee.x) + dt * 0.55, D = lerp(80, 13, B.heat); _t.set(bee.x + Math.cos(a) * D, bee.y + lerp(26, 7, B.heat), bee.z + Math.sin(a) * D);
        fly(_t, clamp(_t.distanceTo(B.p) * 1.6, CRUISE, 60), 3, dt); face(dt, true); }
    } else if (B.state === 'strike') { // the last dive. Only a bee that gets out of the bats' air in this moment is lost to it.
      B.u += CRUISE * dt / LEN;
      if (!(flying && beeHigh())) { B.lost++; B.heat = Math.min(B.heat, 0.6); B.state = 'hunt'; }
      else { const sp = Math.max(STRIKE, P.vel.length() + 25); B.dir.copy(bee).sub(B.p).normalize(); B.v.copy(B.dir).multiplyScalar(sp); const d = B.p.distanceTo(bee); B.p.addScaledVector(B.v, Math.min(dt, d / sp)); face(dt, true);
        if (d < HIT + sp * dt) eat(); }
    } else if (B.state === 'leave') { // away into the dark, then back to its place on the round
      B.u += CRUISE * dt / LEN; B.T -= dt; _t.copy(B.p).addScaledVector(B.v, 1.5); _t.y += 12; fly(_t, CRUISE * 1.3, 2, dt); face(dt);
      if (B.T <= 0 || B.vis <= 0) { roundPoint(B.u, B.p); B.p.y += 30; B.vis = 0; B.state = N.t > 0.1 && !late ? 'climb' : 'roost'; }
    } else if (B.state === 'climb') { // back up to its round
      const dd = fly(roundPoint(B.u + 14 / LEN, _t), CRUISE * 1.15, 1.6, dt); face(dt); if (dd < 9) B.state = 'cruise';
    }
    const gy = terrainH(B.p.x, B.p.z) + 3; if (B.p.y < gy) { B.p.y = gy; B.v.y = Math.abs(B.v.y) * 0.5; }
    calls(dt, flying); pose(dt);
  }
  N.parts.push({ start, update, finish });
  // for tests and for looking around
  B.debug = { put(u) { B.on = true; view.group.visible = true; B.u = u; B.state = 'cruise'; B.vis = 1; B.cool = 0; roundPoint(u, B.p); roundPoint(u + 4 / LEN, _t); B.v.copy(_t).sub(B.p).setLength(CRUISE); B.yaw = Math.atan2(B.v.x, B.v.z); }, roundPoint, WAY, view, sheltered, beeHigh, K: { CRUISE, DIVE, HIGH, WIND, HIT, FIRST_NIGHT, CEIL, RAMP, FADE, STRIKE } };
  Math.random = _mathRandom;
}
