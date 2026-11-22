// Honeylight: the storm. On some afternoons the air goes still, a dark cloud comes over from beyond the flower field,
// and a band of rain crosses the land toward the hive. Flowers shut before it. Rain makes wings heavy and washes pollen
// from the baskets, so the bee flies home ahead of it or waits under leaves, a mushroom, the old log or the bramble hollow.
// When the rain has passed the flowers are full again and a rainbow stands on the meadow.
// Self-contained: it talks to the game through window.__g and a few hooks tagged "storm.js" in src/.
// To switch it off add ?storm=0 to the address (or #storm-off). To see one at once add #storm-now (or ?storm=1).
// It never calls Math.random while there is no storm, and it shows nothing then.
import { makeStorm } from './storm-view.js';
const g = window.__g;
const flag = (name, v, word) => new RegExp('[?&]' + name + '=' + v).test(location.search) || location.hash.includes(name + '-' + word);
if (g && !flag('storm', 0, 'off')) {
  const { THREE, P, G, DAY, U, terrainH, flowers, HOLLOW, LOG, FDIR, FIELD_D } = g, V3 = THREE.Vector3, TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  let _s = 20261124; const rnd = (a = 1, b) => { _s = (_s + 0x6D2B79F5) >>> 0; let t = _s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296; return b === undefined ? r * a : a + r * (b - a); };
  const _mathRandom = Math.random; Math.random = rnd; // three.js draws a random id for each new object: keep the game's stream untouched

  // the numbers
  const FIRST_DAY = 4, EVERY = 3;   // storm days: 4, 7, 10 ...
  const AT = 0.40;                  // the part of the day at which it starts to brew
  const BREW = 35;                  // seconds from the first sign to the first rain at the far edge of the land
  const SPEED = 16;                 // how fast the rain band moves (a bee with empty baskets is faster)
  const WIDTH = 560;                // the band is this deep: it rains 35 s at each place
  const F0 = 400;                   // where the front waits while it brews (distance from the hive tree, toward the storm)
  const LEAD = 180, SKY_H = 190;    // the cloud's edge runs this far ahead of the rain; its height for the sky picture
  const WET_MAX = 0.75;             // rain makes wings this wet at most (pond water can do more)
  const SOAK = 4;                   // seconds of open rain until the wings are too wet to fly (P.soak 0..1; src/loop.js takes lift and speed away with it)
  const DRY = 2.5;                  // seconds under a roof until soaked wings are dry again
  const BOW_SECS = 75, BOW_R = 130; // the rainbow: how long it stands, how big it is
  const FOOT_R = 26, FOOT_MAX = 5;  // near its foot the next harvests are worth 1 more

  const view = makeStorm(g); if (!view.group.parent) g.scene.add(view.group); view.group.visible = false;
  const HGY = terrainH(HOLLOW.x, HOLLOW.z), _v = new V3(), _pose = { k: 0, rain: 0, ax: 1, az: 0, front: 0, back: 0, wx: 0, wz: 0, flash: 0, bolt: null, bow: null };
  const S = window.STORM = { on: false, T: 0, n: 0, day: 0, ax: 1, az: 0, front: F0, back: F0 + WIDTH, rain: 0, roof: false, cover: 0, exposed: false, close: 0, closed: false, dark: 0, past: -1e9,
    flash: 0, bolt: null, bolts: 0, washed: 0, downs: 0, windK: 0, windDir: 0, windS: 0, fresh: false, homeDry: false,
    bow: { x: 0, z: 0, yaw: 0, r: BOW_R, k: 0, T: 0, foot: { x: 0, z: 0 }, given: 0 },
    BREW, SPEED, WIDTH, SOAK, DRY, FIRST_DAY, EVERY, AT };
  const forced = flag('storm', 1, 'now'); let forcedT = 0, forcedDone = false, prevT = DAY.t, next = 5, re = 0, boom = -1, boomV = 0, loadN = 0, mist = 0, told = {};

  S.isDay = n => n >= FIRST_DAY && (n - FIRST_DAY) % EVERY === 0;
  S.rainAt = (x, z) => { if (!S.on) return 0; const pa = x * S.ax + z * S.az; return clamp((pa - S.front) / 25, 0, 1) * clamp((S.back - pa) / 25, 0, 1); };
  // is there a roof over this place? the hive, the crown of the hive tree, any tree crown, a mushroom cap, the old log, the bramble hollow
  S.roofed = p => {
    if (g.inHive) return true;
    const x = p.x, y = p.y, z = p.z;
    if (Math.hypot(x, z) < 46 && y < 74) return true;
    for (const t of g.orchTrees) if (y < t.top - t.cr * 0.3 && Math.hypot(x - t.x, z - t.z) < t.cr * 0.85) return true;
    for (const t of g.forestTrees) if (y < t.top - t.cr * 0.3 && Math.hypot(x - t.x, z - t.z) < t.cr * 0.85) return true;
    for (const s of g.shrooms) if (y < s.y && y > s.gy - 0.5 && Math.hypot(x - s.x, z - s.z) < s.R * 0.9) return true;
    if (Math.hypot(x - HOLLOW.x, z - HOLLOW.z) < HOLLOW.r && y < HGY + HOLLOW.wallH) return true;
    _v.set(x - LOG.c.x, y - LOG.c.y, z - LOG.c.z); const u = _v.dot(LOG.axis); if (Math.abs(u) < LOG.len / 2 && _v.addScaledVector(LOG.axis, -u).length() < LOG.ri + 0.3) return true;
    return false;
  };
  S.label = () => S.T < BREW ? 'a storm is coming' : S.past < 0 ? (S.rain > 0.3 ? 'rain' : 'the rain is coming') : S.past < 20 ? 'the rain has passed' : '';

  // the storm takes over the wind: first the air goes still, then it blows hard ahead of the rain (toward the hive side)
  S.wind = W => {
    if (!S.on || S.windK <= 0) return;
    const dx = lerp(W.dx, -S.ax, S.windDir), dz = lerp(W.dz, -S.az, S.windDir), L = Math.hypot(dx, dz);
    if (L > 0.05) { W.dx = dx / L; W.dz = dz / L; }
    W.s = lerp(W.s, S.windS, S.windK);
  };

  function begin() {
    S.on = true; S.T = 0; S.day = DAY.n; S.n++; S.washed = 0; S.downs = 0; S.close = 0; S.closed = false; S.flash = 0; S.bolt = null; S.fresh = false; S.homeDry = false; S.past = -1e9; S.cover = 0;
    next = rnd(9, 13); re = 0; boom = -1; mist = 0; told = {}; loadN = P.load.length;
    const a = Math.atan2(FDIR.z, FDIR.x) + rnd(-0.5, 0.5); S.ax = Math.cos(a); S.az = Math.sin(a); // it comes from beyond the flower field
    // the rainbow will put one foot on a plain flower of the field
    const cx = FDIR.x * FIELD_D, cz = FDIR.z * FIELD_D, plain = flowers.filter(f => f.val === 1 && !f.orch && !f.inLog && !f.zone && !f.lily && !g.zoneLocked(f) && Math.hypot(f.x - cx, f.z - cz) < 70);
    const f = plain.length ? plain[(rnd() * plain.length) | 0] : { x: cx, z: cz }; const B = S.bow; B.foot.x = f.x; B.foot.z = f.z; B.k = 0; B.T = 0; B.given = 0;
    view.group.visible = true;
    g.toast('<b>The air goes still</b><br><span>a storm is coming over the meadow. Fly home, or find a roof of leaves</span>', 7);
    g.tone(146.83, 0.07, 4); g.tone(110, 0.06, 5, 'sine', 0.6);
  }
  function end() {
    S.on = false; S.rain = 0; S.exposed = false; S.close = 0; S.closed = false; S.dark = 0; S.windK = 0; S.flash = 0; S.bolt = null; S.bow.k = 0;
    U.uStorm.value.w = 0; U.uStorm2.value.set(0, 0, 0); _pose.k = 0; _pose.rain = 0; _pose.flash = 0; _pose.bolt = null; _pose.bow = S.bow; view.set(_pose); view.group.visible = false; hiss(0, 1800);
  }
  // the rain's sound: one soft hiss, lower under a roof
  let snd = null, sndF = null;
  function hiss(vol, freq) {
    const A = g.A; if (!A || !A.ctx || !A.noise) return;
    if (!snd) { if (vol <= 0) return; const c = A.ctx, s = c.createBufferSource(); s.buffer = A.noise; s.loop = true; sndF = c.createBiquadFilter(); sndF.type = 'highpass'; sndF.frequency.value = freq; snd = c.createGain(); snd.gain.value = 0; s.connect(sndF); sndF.connect(snd); snd.connect(A.master); s.start(); }
    snd.gain.setTargetAtTime(vol, A.ctx.currentTime, 0.4); sndF.frequency.setTargetAtTime(freq, A.ctx.currentTime, 0.4);
  }
  function strike(pa, lat) { // lightning somewhere in the rain, never on the bee
    const lo = S.front + 30, hi = Math.min(S.back - 30, S.front + 420); let u = clamp(pa + rnd(-80, 260), lo, Math.max(lo, hi)), w = lat + rnd(-240, 240);
    if (Math.hypot(u - pa, w - lat) < 60) w += 90;
    const x = u * S.ax - w * S.az, z = u * S.az + w * S.ax, d = Math.hypot(x - P.pos.x, z - P.pos.z);
    S.bolt = { x, z, seed: ++S.bolts }; S.flash = clamp(1.15 - d / 420, 0.3, 1); re = rnd() < 0.6 ? 0.13 : 0;
    boom = Math.min(3.5, d / 170); boomV = clamp(0.4 - d / 1000, 0.06, 0.4);
  }

  S.update = dt => {
    const awake = P.mode === 'fly' || P.mode === 'crawl', flying = P.mode === 'fly' && !g.inHive, N = window.NIGHT;
    if (!S.on) {
      // a storm day: it starts when the afternoon reaches AT. With #storm-now: 15 s after the bee first flies out.
      if (awake && S.day !== DAY.n && !(N && N.active) && !DAY.ending) {
        if (S.isDay(DAY.n) && prevT < AT && DAY.t >= AT) begin();
        else if (forced && !forcedDone && flying) { forcedT += dt; if (forcedT > 15 && DAY.t < 0.7) { forcedDone = true; begin(); } }
      }
      prevT = DAY.t; if (!S.on) { if (P.soak > 0) P.soak = Math.max(0, P.soak - dt / DRY); return; }
    }
    if ((N && N.active) || DAY.ending) { end(); return; }
    if (awake) S.T += dt;
    const T = S.T, run = Math.max(0, T - BREW), bee = P.pos, pa = bee.x * S.ax + bee.z * S.az, lat = -bee.x * S.az + bee.z * S.ax;
    S.front = F0 - SPEED * run; S.back = S.front + WIDTH;
    const rainHere = clamp((pa - S.front) / 25, 0, 1) * clamp((S.back - pa) / 25, 0, 1), past = S.past = (pa - S.back) / SPEED; // past: seconds since the rain left the bee
    S.rain = rainHere; S.roof = S.roofed(bee); S.cover += ((S.roof ? 1 : 0) - S.cover) * Math.min(1, dt * 3);
    S.exposed = rainHere > 0.3 && !S.roof && P.mode === 'fly';
    mist += (rainHere - mist) * Math.min(1, dt * 1.5);
    const B = S.bow;

    // the sky: a dark cloud whose edge comes over ahead of the rain, and goes with it
    const deck = T < BREW ? F0 - LEAD + (BREW - T) * 25 : S.front - LEAD, edge = (deck - pa) / SKY_H, tail = (S.back + 40 - pa) / SKY_H;
    const w = smooth(0, 6, T) * (1 - smooth(-3, -7, tail)) * (1 - smooth(BOW_SECS - 25, BOW_SECS + 10, B.T));
    const gone = smooth(60, -60, S.back + 20 - pa), over = smooth(80, -80, deck - pa) * (1 - gone); // the cloud over the bee
    const dark = S.dark = w * (0.8 * over + 0.2 * smooth(5, 1.3, edge) * (1 - gone));
    U.uStorm.value.set(S.ax, S.az, edge, w); U.uStorm2.value.set(tail, mist * (1 - 0.4 * S.cover), dark);
    // the light under it (the day's light was set just before, in updateDay)
    S.flash = Math.max(0, S.flash - dt * 3.4); const fl = S.flash;
    U.uSunC.value.multiplyScalar(1 - 0.85 * dark); U.uAmb.value *= (1 - 0.42 * dark) * (1 + 3 * fl);
    const hz = U.uHaze.value, hk = 1 + 2.5 * fl; hz.x *= (1 - 0.5 * dark) * hk; hz.y *= (1 - 0.45 * dark) * hk; hz.z *= (1 - 0.35 * dark) * hk; DAY.expo *= 1 + 0.1 * dark;

    // the wind: still at first, then hard from the storm, easing when the rain has passed
    const still = smooth(3, 9, T) * (1 - smooth(16, 24, T)), blow = smooth(16, BREW + 6, T) * (1 - smooth(4, 22, past));
    S.windK = Math.max(still, blow); S.windDir = blow; S.windS = lerp(0.04, 1.25 + 0.3 * Math.sin(T * 0.9) * Math.sin(T * 0.37), blow);

    // the flowers shut before the rain and open when it has passed, full again
    S.close = smooth(BREW - 14, BREW - 4, T) * (1 - smooth(3, 10, past)); S.closed = S.close > 0.5;
    U.uClose.value = Math.max(U.uClose.value, S.close);
    if (past > 10 && !S.fresh) { S.fresh = true; for (const f of flowers) f.cool = 0;
      g.toast('<b>The rain has passed</b><br><span>the flowers are open and full again. Look for the rainbow</span>', 6); [0, 2, 4, 7].forEach((n, i) => g.tone([523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5][n], 0.07, 2.6, 'sine', i * 0.16)); }
    // what hides from the weather: wasps stay in, nothing calls for help, no flower overflows, the nest stays shut
    if (past < 10) { g.MOB.next = Math.max(g.MOB.next, 20); G.richT = Math.max(G.richT, 6); g.NESTR.cd = Math.max(g.NESTR.cd, 3);
      if (T > BREW - 12 && !g.MOB.active && !g.SWARM.active) for (const q of g.wasps) q.gone = Math.max(q.gone || 0, 0.6); }

    // rain on the bee: bees cannot fly in rain. In open rain the wings soak in about 4 seconds and the bee comes down; it can still walk, and flutter as high as the grass tops, to a roof.
    // Under a roof the wings dry in about 2.5 seconds. Nothing is lost: the pollen stays in the baskets.
    const soak0 = P.soak || 0;
    if (S.exposed) {
      if (P.wet < WET_MAX) P.wet = Math.min(WET_MAX, P.wet + dt * 0.36 * rainHere);
      P.soak = Math.min(g.overWater(bee.x, bee.z) ? 0.45 : 1, soak0 + dt * rainHere / SOAK); /* over the pond the wings never get too heavy to reach the shore */
      if (!told.rain) { told.rain = true; g.toast('<b>Rain!</b><br><span>a bee cannot fly in rain: your wings grow heavy. Get under a mushroom, a tree, or home</span>', 6); }
      if (P.soak > 0.92 && soak0 <= 0.92) { S.downs++; g.tone(196, 0.07, 0.9, 'triangle'); g.tone(164.81, 0.06, 1.1, 'triangle', 0.14);
        if (!told.down) { told.down = true; g.toast('<b>Your wings are too wet to fly</b><br><span>you can only flutter low over the grass. Get under a mushroom or a tree: they dry there in a moment</span>', 7); } }
    } else {
      if (P.soak > 0) { P.soak = Math.max(0, soak0 - dt / (S.roof || rainHere < 0.3 ? DRY : DRY * 4));
        if (P.soak < 0.12 && soak0 >= 0.12 && rainHere > 0.3) { g.tone(659.25, 0.05, 1.2); g.tone(880, 0.04, 1.2, 'sine', 0.1); if (!told.dry) { told.dry = true; g.hint('your wings are dry. The rain is still out there', 5); } } }
      if (rainHere > 0.5 && S.roof && !g.inHive && !told.roof) { told.roof = true; g.toast('<b>Dry under here</b><br><span>watch the rain. It will pass</span>', 5); } }
    if (!S.homeDry && S.front < 0) { S.homeDry = true; if (g.inHive) { g.toast('<b>Home and dry</b><br><span>listen to the rain on the old tree</span>', 5); g.tone(523.25, 0.06, 2.5); g.tone(659.25, 0.05, 2.5, 'sine', 0.15); } }
    hiss(rainHere * (g.inHive ? 0.018 : 0.03 + 0.03 * (1 - S.cover)), lerp(1900, 800, S.cover));

    // lightning in the rain, thunder after it
    if (awake && T > 10 && S.back > -340 && past < 0) { next -= dt; if (next <= 0) { next = run > 0 ? rnd(3.5, 8) : rnd(6, 10); strike(pa, lat); } }
    if (re > 0) { re -= dt; if (re <= 0) S.flash = Math.max(S.flash, 0.7); }
    if (boom >= 0) { boom -= dt; if (boom < 0) { g.noiseHit(140, 0.6, boomV, 2.8, 'lowpass', 38); g.noiseHit(70, 0.8, boomV * 0.7, 3.6, 'lowpass', 30); } }

    // the rainbow, when the sun is back. One foot stands on a flower of the field.
    if (past > 6) { if (B.T === 0) { const sx = U.uSun.value.x, sz = U.uSun.value.z, L = Math.hypot(sx, sz) || 1, px = -sz / L, pz = sx / L; // across the sunlight
        const sg = Math.hypot(B.foot.x + px * 2 * BOW_R, B.foot.z + pz * 2 * BOW_R) < Math.hypot(B.foot.x - px * 2 * BOW_R, B.foot.z - pz * 2 * BOW_R) ? 1 : -1;
        B.x = B.foot.x + sg * px * BOW_R; B.z = B.foot.z + sg * pz * BOW_R; B.yaw = Math.atan2(pz, px); }
      if (awake) B.T += dt; B.k = smooth(0, 8, B.T) * (1 - smooth(BOW_SECS, BOW_SECS + 12, B.T));
      const dF = Math.hypot(bee.x - B.foot.x, bee.z - B.foot.z);
      if (B.k > 0.3 && dF < 160 && Math.random() < dt * 10) { const a = rnd(TAU), r = rnd(9), c = [[1, 0.35, 0.3], [1, 0.75, 0.3], [0.5, 1, 0.45], [0.4, 0.7, 1], [0.8, 0.5, 1]][(rnd() * 5) | 0];
        _v.set(B.foot.x + Math.cos(a) * r, terrainH(B.foot.x, B.foot.z) + rnd(0.5, 7), B.foot.z + Math.sin(a) * r); g.puff(_v, 1, c, 0.4, 0.016, 2.4, -0.25, 0.4); }
      // rain-washed nectar under the rainbow's foot: the next few harvests there are worth 1 more
      if (B.k > 0.5 && flying && P.load.length > loadN && B.given < FOOT_MAX && dF < FOOT_R) { P.load[P.load.length - 1] += 1; B.given++; g.tone(1318.5, 0.05, 1.6, 'sine', 0.1);
        if (!told.foot) { told.foot = true; g.toast('<b>Under the rainbow\'s foot</b><br><span>rain-washed nectar: worth 1 more</span>', 5); } }
    }
    loadN = P.load.length;

    const W = g.WIND, o = _pose; o.k = w; o.rain = g.inHive ? 0 : mist * (1 - 0.75 * S.cover); o.ax = S.ax; o.az = S.az; o.front = S.front; o.back = S.back; o.wx = W.dx * W.s * 9; o.wz = W.dz * W.s * 9; o.flash = fl; o.bolt = fl > 0 ? S.bolt : null; o.bow = B;
    view.set(o); view.update(g.time, dt);
    if (B.T > BOW_SECS + 12) end();
  };

  // for tests and for looking around: jump into a storm at second T (0 = it starts to brew, BREW = first rain at the far edge)
  S.debug = { begin(T = 0, settle = 0) { if (S.on) end(); begin(); S.T = T; if (settle) g.sim(settle); }, end, view, forced };
  Math.random = _mathRandom;
}
