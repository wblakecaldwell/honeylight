// Honeylight: the frame loop and the big update that flies the bee.
import { V3, $, rnd, clamp, lerp, smooth } from './core.js';
import { CT, HTOP, RIN, ROUT, TY, POND, WY, HEDGE_GAP_W, HEDGE_R, ORCH, HEDGE_GAPS, terrainH, overWater } from './world.js';
import { camera, U, parts, pNext, puff, updateParts, renderFrame, adaptRes } from './engine.js';
import { sky, flowersClosed, dayCount, updateDay } from './day.js';
import { COMBS, BIRTH, combUniforms, capPieces, beacon } from './hive.js';
import { _q, _v, YA, orient, DANCE, greeters, hero, updateBees, streakU, trailU, beeCollide, updateSwarm } from './bees.js';
import { flowers, shrooms, flowerHit, shroomSolid } from './plants.js';
import { pads, fish, updateBranches, updateBrook } from './places.js';
import { WIND, updateWind, airForces, updateAirLife, updateGusts } from './air.js';
import { ants, baskets, P, look, takeOff, rebirth, PR, collide, thirdPerson, updateAimShadow, updateHome,
  updateHomePull, viewBlend } from './player.js';
import { keys, touchFwd, hintEl, hint, tipsTick } from './controls.js';
import { abilities, updateHeat } from './abilities.js';
import { updateWasps, updateMob, waspAudio, updateNest, updateCalm } from './wasps.js';
import { updateWebs, updateDragonflies } from './hazards.js';
import { updateRich, richSip, summitForces, giantSip, dwellSip } from './nectar.js';
import { G, gainHoney, addPollen, updateHud } from './progress.js';
import { zoneLocked, updateZones } from './zones.js';
import { updateTrails } from './trails.js';
import { A, tone, SCALE, noiseHit, sweep, setG, sndRnd } from './audio.js';
import { GW, gapsInput, gapsStep, gapsFrame } from './gaps.js';
import { runFrame } from './longrun.js';
import { waterwayFrame } from './waterway.js';
import { updateRunWorld } from './runworld.js';
import { wardrobeWalk, updateWardrobe } from './wardrobe.js';
import { updateLookCam } from './lookcam.js';

// ---------- main loop ----------
export const fwd = new V3(), right = new V3(), acc = new V3(), tmp = new V3(), camPos = new V3();

export let time, inHive, outF;
let last, birdT, bob, fov, pulse, heroT, shownDanceHint, ui;
export function setupLoopState() {
  last = performance.now(), time = 0, birdT = 5, inHive = true, outF = 0, bob = 0, fov = 74, pulse = 0, heroT = 0, shownDanceHint = false;
  ui = { water: $('water'), drops: $('drops'), black: $('black') };
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); renderFrame(); adaptRes(now - (frame.prev || now)); frame.prev = now;
}
export function update(dt) {
  time += dt; P.t += dt;
  U.uTime.value = time;
  camera.rotation.set(P.pitch, P.yaw, 0); viewBlend(); camera.getWorldDirection(fwd); right.set(1, 0, 0).applyQuaternion(camera.quaternion);
  let kf = (keys.has('KeyW') || keys.has('ArrowUp') || touchFwd ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0), ks = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0), ku = (keys.has('Space') ? 1 : 0) - (keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyC') ? 1 : 0);
  if (P.mode === 'fly') [kf, ks, ku] = gapsInput(kf, ks, ku); // gaps.js: no wings while tumbling or down in the grass
  if (keys.has('ArrowLeft')) look(-dt * 700, 0); if (keys.has('ArrowRight')) look(dt * 700, 0);
  let black = 0, thrust = 0;
  const rad = Math.hypot(P.pos.x, P.pos.z);
  inHive = rad < ROUT && P.pos.y > -1 && P.pos.y < HTOP + 1;
  outF = lerp(outF, inHive ? 0 : smooth(ROUT, ROUT + 14, rad), Math.min(1, dt * 2));

  if (P.mode === 'title' || P.mode === 'cell') {
    P.yaw = clamp(P.yaw, Math.PI - 0.8, Math.PI + 0.8); P.pitch = clamp(P.pitch, -0.7, 0.7);
    P.pos.set(BIRTH.x, BIRTH.y + Math.sin(time * 1.1) * 0.006, BIRTH.z - 0.72 + Math.min(P.chews, 8) * 0.012);
    if (P.mode === 'cell') { if (P.t > 3 && P.chews === 0 && hintEl.style.opacity != 1) hint('<kbd>click</kbd>', 5);
      black = P.lives > 1 ? clamp(1 - P.t / 1.5, 0, 1) : 0;
      if (P.chews >= 3 && !hero.active && P.lives === 1) { hero.active = true; hero.look = new V3(BIRTH.x, BIRTH.y, BIRTH.z - 0.5); if (hero.p.distanceTo(P.pos) > 6) hero.p.set(BIRTH.x + 2, BIRTH.y + 1.5, BIRTH.z + 1.4); }
      if (hero.active) hero.tp.set(BIRTH.x + Math.sin(time * 0.9) * 0.08, BIRTH.y + 0.02 + Math.sin(time * 1.4) * 0.05, BIRTH.z + 0.62); }
  } else if (P.mode === 'emerge') {
    const f = smooth(0, 1.8, P.t); P.pos.set(BIRTH.x, BIRTH.y, lerp(BIRTH.z - 0.62, BIRTH.z + 0.24, f)); P.pos.y += Math.sin(P.t * 9) * 0.012;
    if (P.lives === 1) { hero.active = true; if (!hero.look) hero.look = new V3(); hero.tp.set(BIRTH.x + 0.9, BIRTH.y + 0.35, BIRTH.z + 1.15); hero.look.copy(P.pos); }
    if (P.t > 1.8) { P.q0 = camera.quaternion.clone(); P.mode = 'crawl'; P.t = 0; heroT = 0; P.ch = 0; P.cp = 0.2; if (P.lives === 1) hint('<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk &nbsp;·&nbsp; mouse turn &nbsp;·&nbsp; hold <kbd>Tab</kbd> for keys', 8); }
  } else if (P.mode === 'crawl') {
    const c = COMBS[BIRTH.ci];
    tmp.set(-Math.sin(P.ch || 0), Math.cos(P.ch || 0), 0); _v.set(tmp.y, -tmp.x, 0);
    const sp = 1.7; P.pos.x += (tmp.x * kf + _v.x * ks) * sp * dt; P.pos.y += (tmp.y * kf + _v.y * ks) * sp * dt;
    P.pos.x = clamp(P.pos.x, -c.hw + 0.3, c.hw - 0.3); P.pos.y = clamp(P.pos.y, c.yb + 0.4, HTOP - 0.5); P.pos.z = c.z + CT / 2 + 0.24; wardrobeWalk(P.pos); /* wardrobe.js: the bee walks round the wardrobe cell */ P.cdir.copy(tmp);
    if (kf || ks) bob += dt * 11;
    P.wad = lerp(P.wad || 0, kf || ks ? 1 : 0, Math.min(1, dt * 7)); P.wadPh = bob; // player.js: the waddle, seen from outside
    // the sister's greeting
    heroT += dt; if (hero.active) { if (heroT < 3) { if (heroT < dt * 1.5) hero.tp.copy(P.pos).addScaledVector(fwd, 0.95); hero.tp.z = clamp(hero.tp.z, c.z + 1.0, c.z + 2.0); hero.look.copy(P.pos); if (heroT > 1.2 && !hero.fed) { hero.fed = true; tone(659.25, 0.1, 2); tone(880, 0.08, 2.2, 'sine', 0.18); puff(hero.p, 8, [1, 0.8, 0.3], 0.4, 0.01, 1.2); } } else { hero.active = false; hero.fed = false; } }
    P.wingT += dt; if (!P.wingsReady && P.wingT > (P.lives > 1 ? 3 : 7)) { P.wingsReady = true; sweep(90, 200, 0.7, 0.06, 'sawtooth'); hint('<kbd>space</kbd>', 30); }
    if (P.wingsReady && touchFwd && P.wingT > 9) takeOff();
  } else if (P.mode === 'fly') {
    const soak = P.soak || 0; // storm.js: wings soaked by rain (0..1) take the lift and most of the speed away
    const maxS = lerp(5.5, 30 * G.speed * (1 + 0.4 * Math.min(1, G.boost)), outF) * (1 - 0.075 * G.weight * P.pollen) * (1 - 0.72 * soak), damp = lerp(2.4, kf > 0 ? 1.6 : 3.6, outF);
    acc.set(0, 0, 0).addScaledVector(fwd, kf).addScaledVector(right, ks * 0.8); acc.y += ku * 0.8; thrust = Math.min(1, acc.length());
    acc.multiplyScalar(maxS * damp); if (ku > 0) acc.y *= (1 - P.wet * 0.6) * (1 - soak);
    acc.y -= P.wet * 9 + soak * 14 + P.pollen * 0.6 * G.weight * outF;
    if (soak > 0 && ku > 0) acc.y += soak * 60 * clamp(1 - (P.pos.y - terrainH(P.pos.x, P.pos.z)) / 12, 0, 1); // storm.js: soaked wings can still flutter up to the grass tops (about 8 high), to look for a roof
    G.kf = kf; G.ku = ku; abilities(dt); airForces(acc, dt); summitForces(acc, dt);
    if (P.pollen > 0) { acc.x += Math.sin(time * 2.3) * P.pollen * 0.5; acc.y += Math.sin(time * 3.1) * P.pollen * 0.45; }
    if (!inHive) { const r = Math.hypot(P.pos.x, P.pos.z); if (r > 330) { acc.x -= P.pos.x / r * (r - 330) * 0.6; acc.z -= P.pos.z / r * (r - 330) * 0.6; } if (P.pos.y > 62) acc.y -= (P.pos.y - 62) * 1.5; }
    P.vel.addScaledVector(acc, dt); P.vel.multiplyScalar(Math.max(0, 1 - damp * dt));
    if (!inHive) { const hv = Math.hypot(P.vel.x, P.vel.z), fl = Math.hypot(fwd.x, fwd.z); if (hv > 4 && kf > 0 && fl > 0.2) { const k = Math.min(1, dt * 1.6 * outF); P.vel.x += (fwd.x / fl * hv - P.vel.x) * k; P.vel.z += (fwd.z / fl * hv - P.vel.z) * k; }
      if (!ku) P.vel.y *= 1 - Math.min(1, dt * 1.2 * outF * (kf > 0 ? 1 - Math.min(1, Math.abs(fwd.y) * 1.6) : 1)); }
    P.pos.addScaledVector(P.vel, dt);
    collide(P.pos, P.vel); beeCollide();
    if (!inHive) gapsStep(dt); // gaps.js: tight spots, clipping and the tumble
    P.landed = null;
    if (!inHive) {
      for (const f of flowers) { const d = Math.hypot(P.pos.x - f.sx, P.pos.z - f.sz); if (flowerHit(f, d, dt) && !flowersClosed()) {
        if (f.rich > 0 && !zoneLocked(f)) richSip(f, dt); else if (f.giant) { if (f.cool <= 0 && P.pollen < G.cap) giantSip(f, dt); } else if (f.val >= 2) { if (f.cool <= 0 && P.pollen < G.cap && !zoneLocked(f)) dwellSip(f, dt); } else
        if (f.cool <= 0 && P.pollen < G.cap && !zoneLocked(f)) { f.cool = f.val >= 3 ? 70 : 25; addPollen(f); tone(SCALE[Math.min(7, P.pollen - 1)], 0.13, 2.2); _v.set(f.x, f.y + 0.6, f.z); puff(_v, 26, [1.0, 0.82, 0.25], 2.2, 0.012, 1.8, 0.6, 0.8); } } if (f.cool > 0) f.cool -= dt; }
      for (const s of shrooms) { shroomSolid(s); tmp.set(P.pos.x - s.x, (P.pos.y - s.y) / 0.7, P.pos.z - s.z); const d = tmp.length(); if (d < s.R + 0.45 && tmp.y > -0.2) { tmp.normalize(); P.pos.set(s.x + tmp.x * (s.R + 0.45), s.y + tmp.y * (s.R + 0.45) * 0.7, s.z + tmp.z * (s.R + 0.45)); P.vel.addScaledVector(tmp, 17); P.vel.y += 6; s.sq = 1; sweep(170, 420, 0.25, 0.12); sweep(420, 260, 0.5, 0.06); } s.sq = Math.max(0, s.sq - dt * 2.5); const k = 1 - Math.sin(s.sq * Math.PI) * 0.25 * s.sq; s.mesh.scale.set(s.R * (2 - k), s.R * 0.7 * k, s.R * (2 - k)); }
      // water
      const ow = overWater(P.pos.x, P.pos.z), alt = P.pos.y - WY;
      if (ow && alt < 4.5) { P.wet = Math.min(1, P.wet + dt * (1 - alt / 4.5) * 0.55); if (Math.random() < dt * 14 * (1 - alt / 4.5)) { _v.set(P.pos.x + rnd(-1, 1), WY + 0.1, P.pos.z + rnd(-1, 1)); puff(_v, 2, [0.85, 0.93, 1], 1.2, 0.012, 0.7, 6, 1.2); if (Math.random() < 0.3) tone(rnd(1400, 2600), 0.02, 0.15); } }
      else P.wet = Math.max(0, P.wet - dt * 0.14);
      if (ow && alt < PR + 0.12) {
        const pad = pads.find(p => Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < p.r * 0.95);
        if (pad) { P.pos.y = WY + PR + 0.12; if (P.vel.y < -0.5 || pad.dip < 0.05) { noiseHit(300, 1, 0.12, 0.25, 'lowpass', 90); pad.dip = 1; _v.set(P.pos.x, WY + 0.1, P.pos.z); puff(_v, 8, [0.85, 0.93, 1], 1.5, 0.01, 0.6, 5, 1); } P.vel.y = Math.max(P.vel.y, 0); P.vel.x *= 1 - Math.min(1, dt * 4); P.vel.z *= 1 - Math.min(1, dt * 4); pad.dip = Math.max(pad.dip, 0.3); }
        else { P.mode = 'gulp'; P.gulpT = 0; noiseHit(900, 0.7, 0.3, 0.5, 'lowpass', 150); _v.set(P.pos.x, WY + 0.1, P.pos.z); puff(_v, 30, [0.85, 0.93, 1], 3.5, 0.016, 0.9, 7, 1.5);
          tmp.set(fwd.x, 0, fwd.z).normalize(); fish.userData.dir = tmp.clone(); fish.userData.from = P.pos.clone().addScaledVector(tmp, 30).add(new V3(-tmp.z, 0, tmp.x).multiplyScalar(16)); fish.userData.from.y = WY - 4.5; }
      }
      for (const p of pads) { p.dip = Math.max(0, p.dip - dt * 1.5); p.mesh.position.y = WY + 0.06 - Math.sin(p.dip * Math.PI) * 0.12; }
      // fish shadow drifts under you when you're low
      if (ow && alt < 14) { tmp.set(P.pos.x - fwd.x * 6, WY - 2.2 - alt * 0.25, P.pos.z - fwd.z * 6); fish.position.lerp(tmp, Math.min(1, dt * 0.5)); } else { tmp.set(POND.x + Math.cos(time * 0.1) * 20, WY - 5, POND.z + Math.sin(time * 0.1) * 20); fish.position.lerp(tmp, Math.min(1, dt * 0.3)); }
      _v.set(Math.cos(time * 0.1 + 1.6), 0, Math.sin(time * 0.1 + 1.6)); if (ow && alt < 14) _v.set(P.pos.x - fish.position.x, 0, P.pos.z - fish.position.z).normalize(); orient(_q, _v, YA); fish.quaternion.slerp(_q, Math.min(1, dt * 1.5));
    } else {
      // watching the dance
      const dd = Math.hypot(P.pos.x - (DANCE.x + DANCE.dx), P.pos.y - (DANCE.y + DANCE.dy), P.pos.z - 1.6);
      if (dd < 3.4 && !P.knowDance) { P.watch += dt / 3.5; if (P.watch >= 1) { P.knowDance = true; [0, 2, 4, 5].forEach((n, i) => tone(SCALE[n], 0.1, 2.4, 'sine', i * 0.16)); } }
      // homecoming
      if (P.pollen > 0 && P.deliver <= 0 && rad < RIN - 1) { P.deliver = 0.01; greeters.forEach(g => { g.active = true; g.look = P.pos; }); }
    }
    if (P.deliver > 0) {
      P.deliver += dt; greeters.forEach((g, i) => { g.tp.copy(P.pos).addScaledVector(fwd, 1.25).addScaledVector(right, (i - 1) * 0.75); g.tp.y += (i === 1 ? 0.28 : -0.12) + Math.sin(time * 2 + i) * 0.05; });
      if (P.deliver > 1.2 && P.pollen > 0 && P.deliver > 1.2 + (P.given || 0) * 0.45) { P.given = (P.given || 0) + 1; gainHoney(dayCount(P.load.pop() || 1)); P.pollen = P.load.length; pulse = 1; tone(SCALE[Math.min(7, P.given + 1)], 0.12, 2.5); tone(SCALE[Math.min(7, P.given + 1)] / 2, 0.06, 2.5); try { localStorage.setItem('honeylight.honey', P.honey.toFixed(3)); } catch (e) { } }
      if (P.pollen === 0 && P.deliver > 2.2 + (P.given || 0) * 0.45) { P.deliver = 0; P.given = 0; greeters.forEach(g => g.active = false); tone(523.25, 0.08, 3.5); tone(659.25, 0.08, 3.5, 'sine', 0.1); tone(783.99, 0.08, 3.5, 'sine', 0.2); }
    }
    bob += dt * 2.2;
  } else if (P.mode === 'gulp') {
    P.gulpT += dt; const g = P.gulpT, fd = fish.userData;
    P.pos.y = lerp(P.pos.y, WY - 2.6, Math.min(1, dt * 2.2)); P.pitch = lerp(P.pitch, -0.05, Math.min(1, dt * 3)); P.vel.set(0, 0, 0);
    const f = smooth(0.3, 2.5, g); tmp.copy(P.pos).addScaledVector(fd.dir, 5.9); tmp.y = P.pos.y - 0.3; fish.position.lerpVectors(fd.from, tmp, f);
    _v.copy(P.pos).sub(fish.position); _v.y *= 0.3; _v.normalize(); orient(_q, _v, YA); fish.quaternion.slerp(_q, Math.min(1, dt * 6));
    { const mo = smooth(1.5, 2.5, g); fd.mouth.scale.set(0.02 + mo * 0.62, 0.02 + mo * 0.8, 0.02 + mo * 0.6); }
    if (Math.random() < dt * 25) { _v.copy(P.pos).addScaledVector(fd.dir, rnd(0.5, 3)); _v.x += rnd(-1, 1); _v.y += rnd(-1, 0.5); puff(_v, 1, [0.8, 0.95, 1], 0.3, 0.02, 1.2, -3); }
    if (g > 2.35 && !fd.gulped) { fd.gulped = true; sweep(320, 55, 0.3, 0.3); noiseHit(200, 1, 0.2, 0.4, 'lowpass', 60); }
    black = smooth(2.3, 2.6, g);
    if (g > 3.7) { fd.gulped = false; fish.position.set(POND.x, WY - 5, POND.z); rebirth(); black = 1; }
  }

  // camera
  camPos.copy(P.pos);
  if (P.mode === 'crawl') camPos.y += Math.sin(bob) * 0.012; else if (P.mode === 'fly') camPos.y += Math.sin(bob) * 0.035;
  P.yawRate *= Math.max(0, 1 - dt * 6);
  const sv = P.vel.dot(right);
  const targetRoll = P.mode === 'fly' ? clamp(P.yawRate * 2.8 - sv * 0.03, -0.6, 0.6) + Math.sin(time * 2.6) * 0.02 * P.pollen : 0;
  P.roll = lerp(P.roll, targetRoll, Math.min(1, dt * 5));
  camera.position.copy(camPos); camera.rotation.set(P.pitch + (G.third ? 0 : GW.pitch), P.yaw, P.roll + (G.third ? 0 : GW.roll)); viewBlend(); camera.updateMatrixWorld(); thirdPerson(dt); updateLookCam(dt); // lookcam.js: look at yourself, danger sense, B; gaps.js: in the bee's eyes the tumble turns the view; in follow view only the bee turns
  const spd = P.vel.length(); fov = lerp(fov, 74 + Math.min(9, spd * 0.3), Math.min(1, dt * 3)); if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
  U.uCam.value.copy(camPos); sky.position.copy(camPos);
  ants.forEach((a, i) => { const s = i ? -1 : 1; a.rotation.x = Math.sin(time * 1.7 + i) * 0.05 + clamp(spd * 0.012, 0, 0.3) + (P.mode === 'cell' ? Math.sin(time * 6 + i * 2) * 0.05 : 0); a.rotation.y = s * (Math.sin(time * 1.3 + i * 2) * 0.06) + P.yawRate * 3; });
  const bs = P.pollen ? 0.5 + P.pollen * 0.22 : 0.001; baskets.forEach(b => b.scale.setScalar(lerp(b.scale.x, bs, Math.min(1, dt * 4))));

  // cap pieces
  for (const m of capPieces) { const u = m.userData; if (!u.on && u.life > 0) { u.life -= dt; u.vel.y -= 2.5 * dt; m.position.addScaledVector(u.vel, dt); m.rotation.x += u.spin.x * dt; m.rotation.y += u.spin.y * dt; if (u.life <= 0) m.visible = false; } }

  // world uniforms
  pulse = Math.max(0, pulse - dt * 0.5); combUniforms.uPulse.value = pulse;
  combUniforms.uHoney.value = lerp(combUniforms.uHoney.value, P.honey, Math.min(1, dt)); U.uGlow.value = combUniforms.uHoney.value * 0.8 + pulse * 0.3;
  streakU.uShow.value = lerp(streakU.uShow.value, P.knowDance ? 1 : 0.2 + P.watch * 0.6, Math.min(1, dt * 2));
  trailU.uShow.value = lerp(trailU.uShow.value, P.knowDance ? 1 : 0, Math.min(1, dt));
  beacon.material.opacity = lerp(beacon.material.opacity, inHive ? 0 : 0.12 + P.pollen * 0.1, Math.min(1, dt));
  fish.userData.tail.rotation.y = Math.sin(time * (P.mode === 'gulp' ? 9 : 3)) * 0.45;

  gapsFrame(dt, time);
  runFrame(dt); // longrun.js: the long run round the map
  updateRunWorld(dt); // runworld.js: the grass, flowers, petals and dew answer a bee in the zone
  waterwayFrame(dt); // waterway.js: the little waterfall wets a bee that flies through it
  updateWardrobe(dt); // wardrobe.js: the card at the wardrobe cell
  updateWind(dt); updateAirLife(dt); updateRescueShadowAndWaspSound(dt); updateBees(dt, time); updateWasps(dt); updateWebs(dt); updateRich(dt); updateForagingAndHedgeWind(dt); updateParts(dt); updateHud(dt);

  // overlays
  ui.water.style.opacity = camPos.y < WY && !inHive ? 0.62 : 0; ui.drops.style.opacity = P.wet * 0.9; ui.black.style.opacity = black;

  // audio
  if (A.ctx) {
    const cell = P.mode === 'cell' || P.mode === 'title';
    setG(A.humLP.frequency, cell ? 150 + P.chews * 55 : P.mode === 'gulp' ? 120 : 950, 0.3);
    tmp.set(ROUT - P.pos.x, TY - P.pos.y, -P.pos.z); const dH = tmp.length(); tmp.normalize(); const facing = tmp.dot(fwd), side = tmp.dot(right);
    const hg = inHive ? 0.2 : (0.03 + 0.012 * P.pollen) * (0.55 + 0.45 * facing) + 0.16 * 25 / (25 + dH * dH * 0.06) * 0.3;
    setG(A.humG.gain, P.mode === 'gulp' ? 0.02 : hg, 0.25); if (A.pan.pan) setG(A.pan.pan, inHive ? 0 : clamp(side, -0.9, 0.9), 0.2);
    A.rich.forEach((r, i) => setG(r.g.gain, r.v * clamp(combUniforms.uHoney.value * 6 - i * 0.6 + pulse, 0, 1), 0.6));
    const flying = P.mode === 'fly' && !GW.still, rev = GW.rev * GW.rev; setG(A.buzzG.gain, flying ? (0.012 + thrust * 0.03 + Math.min(0.02, spd * 0.001)) * (1 + rev * 1.6) : 0, rev > 0 ? 0.03 : 0.12); setG(A.buzz.frequency, 185 + spd * 2.5 + thrust * 18 - P.pollen * 4 - P.wet * 25 + rev * 90, rev > 0 ? 0.03 : 0.1); setG(A.buzz2.frequency, 2 * (185 + spd * 2.5 + thrust * 18 - P.pollen * 4 + rev * 90), rev > 0 ? 0.03 : 0.1);
    setG(A.windG.gain, outF * (0.035 + Math.min(0.06, spd * 0.003) + 0.05 * WIND.s) * (P.mode === 'gulp' ? 0.2 : 1), 0.4);
    birdT -= dt; if (birdT < 0 && outF > 0.5 && P.mode === 'fly' && !(window.NIGHT && NIGHT.active)) { birdT = sndRnd(3, 9); const b = sndRnd(2200, 3600), n = 2 + (sndRnd() * 4 | 0); for (let i = 0; i < n; i++) setTimeout(() => sweep(b * sndRnd(0.9, 1.1), b * sndRnd(1.15, 1.5), 0.09, 0.018), i * sndRnd(110, 160)); }
  }
}

// --- hedge wind & passive income
function updateForagingAndHedgeWind(dt) {
  if (P.mode === 'fly' || P.mode === 'crawl') { G.passive += dt * G.workers / 120; if (G.passive >= 1) { G.passive -= 1; gainHoney(1); } }
  if (P.mode !== 'fly' || G.orchard) return;
  const dO = Math.hypot(P.pos.x - ORCH.x, P.pos.z - ORCH.z);
  if (dO < HEDGE_R + 40) {
    // the gates howl with wind until the orchard is unlocked
    for (const ga of HEDGE_GAPS) if (Math.random() < dt * 30) { const a = ga + rnd(-HEDGE_GAP_W, HEDGE_GAP_W), r = HEDGE_R + rnd(-4, 4); _v.set(ORCH.x + Math.cos(a) * r, terrainH(ORCH.x + Math.cos(a) * r, ORCH.z + Math.sin(a) * r) + rnd(2, 36), ORCH.z + Math.sin(a) * r); const q = parts[pNext]; puff(_v, 1, [0.95, 0.97, 1.0], 0, 0.02, 1.2); q.v.set(Math.cos(a) * 30, rnd(-2, 2), Math.sin(a) * 30); }
  }
}
function updateDayPlacesAndAbilities(dt) { tipsTick(); updateHomePull(dt); updateBranchesGustsBrookAndCalm(dt); updateHeat(dt); updateSwarm(dt); updateHome(dt); updateDay(dt); updateZones(dt); updateDragonflies(dt); updateNest(dt); updateTrails(dt); if (window.NIGHT) NIGHT.update(dt); if (window.STORM) STORM.update(dt); }
function updateRescueShadowAndWaspSound(dt) { updateMob(dt); updateAimShadow(); waspAudio(); updateDayPlacesAndAbilities(dt); }

export function setupFirstFrame() {
  requestAnimationFrame(frame);
}

function updateBranchesGustsBrookAndCalm(dt) { updateBranches(dt); updateGusts(dt); updateBrook(dt); updateCalm(dt); }
