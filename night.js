// Honeylight: the night. The moon, moonflowers, fireflies and the hollow that wakes.
// Self-contained. To switch it off add ?night=0 to the address (or #night-off, for pages that drop the ? part).
// More night life lives in files of their own and joins through NIGHT.parts: moths.js. To remove it, delete this file's <script> tag in index.html.
// It talks to the game only through window.__g and the small NIGHT hooks in main.js (search main.js for "NIGHT").
// It never calls Math.random and never shows anything in the daytime, so with the night switched on
// the day plays and looks exactly as before.
import { makeMoonflowers } from './moonflowers.js';
const g = window.__g;
// a part of the night is off when the address has ?name=0, or name-off after the # (for pages that drop the ? part)
const off = name => new RegExp('[?&]' + name + '=0').test(location.search) || location.hash.includes(name + '-off');
const now = name => new RegExp('[?&]' + name + '=1').test(location.search) || location.hash.includes(name + '-now'); // to try a part at once: #night-now, #moths-now, #bat-now
if (g && !off('night')) {
  const { THREE, P, G, DAY, U, scene, terrainH, flowers, HOLLOW, PR } = g, V3 = THREE.Vector3, TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  // own random numbers: the game's stream stays untouched
  let _s = 20261122; const rnd = (a = 1, b) => { _s = (_s + 0x6D2B79F5) >>> 0; let t = _s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296; return b === undefined ? r * a : a + r * (b - a); };

  // three.js draws a random id for every new object. While this file builds its objects, those draws come from our own
  // numbers, so the game's random stream is the same with or without the night.
  const _mathRandom = Math.random; Math.random = rnd;
  const N = window.NIGHT = { active: false, done: false, t: 0, k: 0, LEN: 240, n: 0, sleepT: 0, groveLit: false, chain: null, tail: 0, keepTail: false, chains: 0, warned: false,
    off, now, parts: [], tryNight: 0 }; // parts: more night life in files of their own (moths.js ...). Each is { start(), update(dt, flying), finish() }

  // =====================================================================================
  // 1. The sky: dusk hands over to the moon. The moon's climb and fall is the night's clock.
  // =====================================================================================
  const MOON_AZ0 = 2.5, MOON_AZ1 = 0.5; // rises in the south-west of the meadow, crosses over it, sets in the north-east
  const moonDir = new V3(), MOONC = new V3(0.21, 0.29, 0.50), HAZE_N = new V3(0.04, 0.065, 0.145);
  function light(dt) {
    N.k = Math.min(1, N.k + dt / 9);
    const fade = N.k * (1 - smooth(N.LEN - 7, N.LEN, N.t * N.LEN)); // in at dusk, out before dawn
    const el = (7 + 46 * Math.sin(Math.PI * clamp(N.t, 0, 1))) * Math.PI / 180, az = lerp(MOON_AZ0, MOON_AZ1, N.t);
    moonDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
    const sunC = U.uSunC.value, hz = U.uHaze.value;
    if (fade < 0.5) sunC.multiplyScalar(1 - 2 * fade);                                   // the last sunlight dies
    else { U.uSun.value.copy(moonDir); sunC.copy(MOONC).multiplyScalar(2 * fade - 1); }  // then the moon takes over
    U.uNight.value = smooth(0.35, 0.65, fade);
    U.uAmb.value = lerp(U.uAmb.value, 0.15, fade); hz.lerp(HAZE_N, fade); DAY.expo = lerp(DAY.expo, 0.95, fade);
    N.fade = fade;
  }
  N.label = () => N.t < 0.3 ? 'night: the moon is rising' : N.t < 0.62 ? 'night: the moon is high' : N.t < 0.85 ? 'night: the moon is sinking' : 'the moon is low: head home';

  // =====================================================================================
  // 2. Moonflowers. They open only at night. Plain ones stand in the open meadow.
  //    The best ones grow in the bramble hollow and stay shut until fireflies light them.
  // =====================================================================================
  const MF = N.moonflowers = [];
  const HGY = terrainH(HOLLOW.x, HOLLOW.z);
  function addMF(x, z, h, o = {}) { const y = terrainH(x, z) + h; MF.push({ x, z, y, sx: x, sz: z, dsx: 0, dsz: 0, ax: 0, az: 0, r: o.r || 1.3, len: o.len || 3.2, tilt: 0.32, sw: 1, val: o.val || 2, grove: !!o.grove, lily: true, rich: 0, cool: 0, open: 0, taken: false, nectar: 1, stem: h, ph: rnd(TAU) }); }
  {
    const Z = Object.values(g.ZONES), bad = (x, z) => { const d = Math.hypot(x, z);
      if (d < 55 || d > 300 || terrainH(x, z) < g.WY + 2) return true;
      if (Z.some(q => Math.hypot(x - q.c.x, z - q.c.z) < q.ring + 14 || Math.hypot(x - q.x, z - q.z) < 14)) return true;
      if (Math.hypot(x - HOLLOW.x, z - HOLLOW.z) < HOLLOW.r + 16) return true;
      if (flowers.some(f => Math.hypot(f.x - x, f.z - z) < 9)) return true;
      if (g.STONES.some(s => Math.hypot(s.x - x, s.z - z) < 15) || g.shrooms.some(s => Math.hypot(s.x - x, s.z - z) < s.R + 5) || g.ARCHES.some(a => Math.hypot(a.cx - x, a.cz - z) < 10)) return true;
      if (g.HILLS.some(h => Math.hypot(h.x - x, h.z - z) < 12)) return true;
      return MF.some(m => Math.hypot(m.x - x, m.z - z) < 48); };
    let guard = 0; while (MF.length < 12 && guard++ < 4000) { const a = rnd(TAU), d = 60 + Math.sqrt(rnd()) * 235, x = Math.cos(a) * d, z = Math.sin(a) * d; if (!bad(x, z)) addMF(x, z, rnd(9.5, 12.5)); /* the bloom must stand clear above the grass */ }
    // two richer ones on far hilltops, out in the wind
    for (const i of [3, 2]) { const h = g.HILLS[i]; addMF(h.x, h.z, 10, { val: 3, r: 1.5, len: 3.6 }); }
    // the grove: five in the bramble hollow, set between the moonbells
    const inside = flowers.filter(f => Math.hypot(f.x - HOLLOW.x, f.z - HOLLOW.z) < HOLLOW.r); let best = 0, bd = -1;
    for (let o = 0; o < 72; o += 4) { const off = o * Math.PI / 180; let m = 1e9; for (let i = 0; i < 5; i++) { const a = off + i * TAU / 5, x = HOLLOW.x + Math.cos(a) * 8.2, z = HOLLOW.z + Math.sin(a) * 8.2; for (const f of inside) m = Math.min(m, Math.hypot(f.x - x, f.z - z)); m = Math.min(m, Math.hypot(g.HOLROOT[g.HOLROOT.length - 1].x - x, g.HOLROOT[g.HOLROOT.length - 1].z - z)); } if (m > bd) { bd = m; best = off; } }
    for (let i = 0; i < 5; i++) { const a = best + i * TAU / 5; addMF(HOLLOW.x + Math.cos(a) * 8.2, HOLLOW.z + Math.sin(a) * 8.2, 4.6 + (i % 2) * 0.9, { val: 4, r: 1.2, len: 2.7, grove: true }); }
  }
  const mfView = makeMoonflowers(g, MF); // the models (moonflowers.js): { group, setOpen(i, k), update(time) }
  mfView.group.visible = false;

  function moonflowers(dt, flying) {
    const time = g.time;
    for (let i = 0; i < MF.length; i++) { const f = MF[i];
      const want = f.grove ? (N.groveLit ? 1 : 0) : smooth(0.45 + (i % 5) * 0.06, 0.8 + (i % 5) * 0.04, N.k) * (N.t < 0.97 ? 1 : 0);
      f.open += clamp(want - f.open, -dt * 0.5, dt * 0.45); mfView.setOpen(i, f.open, f.taken ? 0.25 : 0.35 + 0.65 * f.nectar); /* a flower that a moth drinks from grows dim */
      if (!flying) continue;
      const d = Math.hypot(P.pos.x - f.sx, P.pos.z - f.sz); if (d > 12) continue;
      if (f.open < 0.3) { // a shut bud is slim: only its stem is in the way
        const sr = 0.3 + PR; if (d < sr && P.pos.y < f.y + 1.6) { const k = sr / Math.max(d, 0.01); P.pos.x = f.sx + (P.pos.x - f.sx) * k; P.pos.z = f.sz + (P.pos.z - f.sz) * k; } continue; }
      // solid like every flower (the game's own flower contact), nectar only from the top of an open bloom
      const onTop = g.flowerHit(f, d, dt);
      if (onTop && f.open > 0.85 && !f.taken && P.pollen < G.cap) {
        const need = f.val >= 4 ? 1.6 : 1.1;
        if (time - (f.lastLand || -9) > 0.5) G.holdT = 0; f.lastLand = time; G.holdT += dt; G.holdF = f; G.holdNeed = need;
        if (rnd() < dt * 7) { _v.set(f.sx + rnd(-0.7, 0.7), f.y + 1, f.sz + rnd(-0.7, 0.7)); g.puff(_v, 1, [0.75, 0.9, 1.0], 0.6, 0.009, 0.8, 0.3, 0.6); }
        if (G.holdT >= need) { const half = f.nectar < 0.5, val = half ? Math.max(1, f.val - 1) : f.val; /* a moth drank most of it */
          G.holdT = 0; f.taken = true; f.cool = 1e9; P.load.push(val); P.pollen = P.load.length;
          g.toast(f.grove ? `<b>Moonflower nectar</b> worth ${val} honey` : half ? `<b>A moonflower</b>, half drunk by a moth: worth ${val} honey` : `<b>A moonflower</b> worth ${val} honey`, 3);
          chime(2 + Math.min(5, P.pollen), 0.11); _v.set(f.sx, f.y + 0.8, f.sz); g.puff(_v, 22, [0.8, 0.92, 1.0], 2.0, 0.012, 1.6, 0.5, 0.8);
          if (P.pollen >= G.cap) g.hint('baskets full: take it home to the hive', 4); }
      }
    }
    mfView.update(time);
  }

  // =====================================================================================
  // 3. Fireflies.
  //    Loose ones drift by the open moonflowers. A sleeping cluster wakes when the bee flies through it:
  //    the fireflies gather into a living loop, with stragglers strung toward the next one.
  //    Each clean pass makes them burst and some fall in behind the bee as a glowing tail.
  //    The last loop is at the hollow root. Inside, the fireflies wake the grove.
  // =====================================================================================
  const NOTE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26]; // a soft pentatonic climb
  function chime(i, vol = 0.1) { const f = 392 * Math.pow(2, NOTE[clamp(i, 0, NOTE.length - 1)] / 12); g.tone(f, vol, 2.2); g.tone(f * 2, vol * 0.45, 1.6, 'sine', 0.06); }

  const FN = 330, HN = MF.length, PTS = FN + HN;
  const fPos = new Float32Array(PTS * 3), fCol = new Float32Array(PTS * 4), fSize = new Float32Array(PTS);
  const fGeo = new THREE.BufferGeometry(); fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3)); fGeo.setAttribute('aC', new THREE.BufferAttribute(fCol, 4)); fGeo.setAttribute('aS', new THREE.BufferAttribute(fSize, 1));
  const fPts = new THREE.Points(fGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 aC; attribute float aS; varying vec4 vC4; void main(){ vec4 mv=viewMatrix*vec4(position,1.0); vC4=aC; gl_PointSize=clamp(aS*520.0/max(-mv.z,0.1),3.0,mix(30.0,120.0,aC.a)); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec4 vC4; void main(){ float d=length(gl_PointCoord-0.5); float core=smoothstep(0.2,0.0,d), halo=smoothstep(0.5,0.0,d); float a=mix(core*1.5+halo*halo*0.55, halo*halo*0.5, vC4.a); gl_FragColor=vec4(vC4.rgb*a,1.0); }` }));
  fPts.frustumCulled = false; fPts.visible = false; fPts.renderOrder = 5; scene.add(fPts); g.noShadow(fPts);
  const FLY_C = [3.4, 2.7, 0.75]; // warm firefly gold (linear light, the bloom pass makes it glow)

  // roles: 0 hidden, 1 wander near a home point, 2 on a loop, 3 straggler on the way, 4 tail, 5 burst
  const F = []; for (let i = 0; i < FN; i++) F.push({ p: new V3(0, -900, 0), v: new V3(), t: new V3(), home: new V3(), hr: 3, role: 0, b: 0, bt: 0, ph: rnd(TAU), fq: rnd(1.6, 3.2), a: 0, L: null, u: 0, T: 0, j: 0, size: rnd(0.26, 0.38) });
  let fi = 0;
  // loose fireflies by the meadow moonflowers (three each), and a slow cloud inside the hollow for later
  const loose = []; for (const f of MF) if (!f.grove) for (let k = 0; k < 3; k++) { const q = F[fi++]; q.home.set(f.x + rnd(-3, 3), f.y + rnd(0.5, 4), f.z + rnd(-3, 3)); q.hr = 2.6; q.p.copy(q.home); loose.push(q); }
  const groveFlies = []; for (let k = 0; k < 26; k++) { const q = F[fi++]; q.home.set(HOLLOW.x + rnd(-9, 9), HGY + rnd(2.5, 8), HOLLOW.z + rnd(-9, 9)); q.hr = 3.5; q.p.copy(q.home); groveFlies.push(q); }

  // ---- the ways to the hollow. Each is a line of loops from a sleeping cluster to the root.
  const ROOT = g.HOLROOT, MOUTH = ROOT[0].clone(), MOUTH_N = ROOT[2].clone().sub(ROOT[0]).normalize();
  const ROUTES = N.routes = [];
  function liftClear(c, r) { // raise a loop until it stands clear above the blooms and stems near it
    for (let it = 0; it < 30; it++) { let hit = false;
      for (const f of flowers) { if (f.giant) continue; const d = Math.hypot(f.x - c.x, f.z - c.z), reach = f.r * 0.75 + f.len + r + 1.2; if (d < reach && c.y - r < f.y + f.len * 0.7 + 1.2) { hit = true; break; } }
      if (c.y - r < terrainH(c.x, c.z) + 2.2) hit = true;
      if (!hit) return; c.y += 1; } }
  function mkRoute(name, st, defs, secs) {
    // st: [x, z, height above the ground] where the cluster sleeps. defs: one loop each, [x, z, height, radius, fixed].
    // Two more loops always end the line: the run-in, and the root mouth itself.
    const at = ([x, z, h]) => new V3(x, terrainH(x, z) + h, z), run = MOUTH.clone().addScaledVector(MOUTH_N, -21); run.y = terrainH(run.x, run.z) + 5.5;
    const cs = defs.map(d => { const c = at(d); if (!d[4]) liftClear(c, d[3]); return c; }), start = at(st); liftClear(start, 3);
    const P3 = [start, ...cs, run, MOUTH.clone().addScaledVector(MOUTH_N, -1.2)], curve = new THREE.CatmullRomCurve3(P3, false, 'centripetal'), loops = [];
    for (let i = 1; i < P3.length; i++) { const c = P3[i], last = i === P3.length - 1, nn = last ? MOUTH_N.clone() : curve.getTangent(i / (P3.length - 1)).normalize(), r = last ? 1.9 : i === P3.length - 2 ? 3.0 : defs[i - 1][3];
      const up = Math.abs(nn.y) > 0.92 ? new V3(1, 0, 0) : new V3(0, 1, 0), ux = new V3().crossVectors(nn, up).normalize(), uy = new V3().crossVectors(ux, nn).normalize();
      loops.push({ c, n: nn, r, ux, uy, i: i - 1, pulse: 0 }); }
    const R = { name, start, loops, curve, state: 'asleep', k: 0, timer: 0, secs, cool: 0, flies: [], id: ROUTES.length };
    for (let k = 0; k < 74; k++) { const q = F[fi++]; q.R = R; q.vis = k < 26; q.home.copy(start).add(new V3(rnd(-4, 4), rnd(-2, 2.5), rnd(-4, 4))); q.hr = 2.2; q.p.copy(q.home); R.flies.push(q); }
    ROUTES.push(R); return R;
  }
  // the field way: a wide, easy sweep over the flower field
  mkRoute('field', [96, 60, 16], [[112, 72, 18, 4.2], [130, 88, 20, 4.1], [148, 104, 22, 4.0], [164, 124, 21, 3.8], [168, 146, 19, 3.6], [154, 166, 14, 3.4]], 15);
  // the stone way: up on the warm air over the standing stone, then a long dive to the grass
  mkRoute('stone', [190, 78, 10], [[194, 93, 22, 3.9], [199, 111, 34, 3.7], [195, 131, 33, 3.5], [184, 147, 21, 3.4], [169, 161, 10, 3.2], [149, 173, 6, 3.1]], 14);
  // the arch way: north under the dew arches, low and fast, then over the field
  { const A = g.ARCHES.slice().sort((a, b) => a.cz - b.cz).slice(2), ar = A.map(a => [a.cx, a.cz, a.h * 0.5, Math.min(2.4, a.w / 2 - 0.6), true]);
    mkRoute('arches', [A[0].cx - 5, A[0].cz - 26, 13], [...ar, [112, 98, 20, 3.2], [103, 132, 21, 3.1], [109, 164, 12, 3.0]], 13); }

  const hist = [], _v = new V3(), _w = new V3(), _prev = new V3(), dirF = new V3(0, 0, -1), dirS = new V3(1, 0, 0), dirU = new V3(0, 1, 0); let hasPrev = false;
  function ringPoint(L, a, rr, out) { return out.copy(L.c).addScaledVector(L.ux, Math.cos(a) * rr).addScaledVector(L.uy, Math.sin(a) * rr); }

  // hand out the route's fireflies: the next loop, the one after, the stragglers between, the tail
  function assign(R) {
    const free = R.flies.filter(q => q.role !== 4 && q.role !== 5), L0 = R.loops[R.k], L1 = R.loops[R.k + 1];
    if (!L0) { for (const q of free) { q.role = 3; q.L = null; q.u = rnd(); q.bt = 0.9; } return; } // all loops done: they pour down the root
    free.sort((a, b) => (b.role === 2 && b.L === L0) - (a.role === 2 && a.L === L0)); let i = 0; // the ones already on the next loop stay on it
    for (let k = 0; k < 18 && i < free.length; k++, i++) { const q = free[i]; q.role = 2; q.L = L0; q.a = k / 18 * TAU; q.bt = 1.7; }
    if (L1) for (let k = 0; k < 12 && i < free.length; k++, i++) { const q = free[i]; q.role = 2; q.L = L1; q.a = k / 12 * TAU; q.bt = 0.75; }
    const rest = free.length - i; for (let k = 0; i < free.length; k++, i++) { const q = free[i]; q.role = 3; q.L = L0; q.u = (k + rnd(0.2, 0.8)) / Math.max(1, rest); q.seg = (L1 || R.state === 'pour') && k % 2 ? 1 : 0; q.bt = 0.7; }
  }
  function wake(R) { R.state = 'awake'; R.k = 0; R.timer = R.secs + 6; N.chain = R; N.tail = 0; N.keepTail = false; for (const q of ROUTES.flatMap(r => r.flies)) if (q.role === 4) { q.role = 1; q.bt = 0; }
    for (const q of R.flies) { q.role = 3; q.bt = 0.8; } assign(R); chime(0, 0.09);
    g.tipOnce && g.tipOnce('fireflies', 'the fireflies wake: follow their lights', 6); }
  function scatter(R, soft) { // the lights lose the bee: they drift back to where they sleep
    for (const q of R.flies) { if (q.role !== 1) q.v.add(_v.set(rnd(-1, 1), rnd(0, 1), rnd(-1, 1)).multiplyScalar(soft ? 3 : 9)); q.role = 1; q.bt = 0; q.T = rnd(2.5, 5); }
    R.state = 'asleep'; R.cool = 9; R.k = 0; if (N.chain === R) N.chain = null; N.tail = 0; N.keepTail = false;
    if (!soft) { g.tone(330, 0.06, 1.8); g.tone(247, 0.05, 2.2, 'sine', 0.18); } }
  function pass(R) {
    const L = R.loops[R.k], last = R.k === R.loops.length - 1; L.pulse = 1; R.k++; R.timer = R.secs + (R.k >= R.loops.length - 2 ? 9 : 0); /* the run-in is slow, careful flying: more time */ N.passes = (N.passes || 0) + 1;
    // the celebration: the loop bursts outward, three of them fall in behind the bee
    let join = 3; for (const q of R.flies) if (q.role === 2 && q.L === L) { _v.copy(q.p).sub(L.c).normalize().multiplyScalar(rnd(7, 13)).addScaledVector(P.vel, 0.35); q.v.add(_v); q.b = 4.5;
      if (join > 0) { join--; q.role = 4; q.j = N.tail++; q.bt = 1.5; } else { q.role = 5; q.T = 0.55; } }
    g.puff(L.c, 26, [1.0, 0.9, 0.45], 7, 0.012, 0.9, 0, 0.3); chime(R.k, 0.1);
    // past the run-in the chain is safe: the fireflies pour down the root and wait for the bee inside
    if (R.k >= R.loops.length - 1 && R.state === 'awake') { R.state = 'pour'; R.timer = 45; N.keepTail = true; }
    assign(R);
  }
  function lightGrove(R) {
    N.groveLit = true; N.chains++; R.state = 'done'; if (N.chain === R) N.chain = null;
    for (const q of R.flies) if (q.role !== 4) { q.role = 1; q.T = 0; q.home.set(HOLLOW.x + rnd(-10, 10), HGY + rnd(2.5, 8.5), HOLLOW.z + rnd(-10, 10)); q.hr = 3.2; q.bt = 1.1; }
    for (const q of groveFlies) q.bt = 1.1;
    g.toast('<b>The hollow wakes</b><br><span>the fireflies light the moonflowers</span>', 6); [0, 2, 4, 5, 7, 9].forEach((n, i) => g.tone(392 * Math.pow(2, NOTE[n] / 12), 0.08, 3, 'sine', i * 0.13));
    _v.set(HOLLOW.x, HGY + 5, HOLLOW.z); g.puff(_v, 40, [0.8, 0.9, 1.0], 6, 0.014, 2.4, -0.3, 0.6);
  }
  const inHollow = () => Math.hypot(P.pos.x - HOLLOW.x, P.pos.z - HOLLOW.z) < HOLLOW.r - 2.6 && P.pos.y < HGY + HOLLOW.wallH + 4;

  function chains(dt, flying) {
    for (const R of ROUTES) {
      if (R.cool > 0) R.cool -= dt;
      for (const L of R.loops) L.pulse = Math.max(0, L.pulse - dt * 1.8);
      if (R.state === 'asleep') { if (flying && !N.chain && R.cool <= 0 && N.k > 0.7 && P.pos.distanceTo(R.start) < 5.2) wake(R); continue; }
      const L = R.loops[R.k];
      if (L && flying && hasPrev && (R.state === 'awake' || R.state === 'pour')) { const d0 = _v.copy(_prev).sub(L.c).dot(L.n), d1 = _w.copy(P.pos).sub(L.c).dot(L.n);
        if (d0 !== d1 && d0 * d1 <= 0) { const t = d0 / (d0 - d1); _v.copy(_prev).lerp(P.pos, t); if (_v.distanceTo(L.c) <= L.r + 0.45) pass(R); } }
      if (R.state === 'awake') { if (flying) { R.timer -= dt; if (R.timer <= 0) scatter(R); } else if (P.mode !== 'fly') scatter(R, true); }
      else if (R.state === 'pour') { R.timer -= dt; if (inHollow()) lightGrove(R); else if (R.timer <= 0 || g.inHive || P.mode !== 'fly') scatter(R); }
    }
  }

  function flies(dt) {
    const time = g.time, R = N.chain, bee = P.pos;
    // the bee's wake, for the tail to follow
    if (!hist.length || hist[0].distanceTo(bee) > 0.45) { hist.unshift(bee.clone()); if (hist.length > 70) hist.pop(); }
    let litN = 0; const sp = P.vel.length();
    if (sp > 2) dirF.lerp(_v.copy(P.vel).multiplyScalar(1 / sp), Math.min(1, dt * 3)).normalize(); dirS.set(-dirF.z, 0, dirF.x); if (dirS.lengthSq() < 1e-4) dirS.set(1, 0, 0); dirS.normalize(); dirU.crossVectors(dirS, dirF).normalize();
    for (let i = 0; i < FN; i++) { const q = F[i]; let K = 2.2, C = 2.2, wob = 1.6;
      if (q.role === 0) { q.b = 0; fSize[i] = 0; continue; }
      if (q.role === 5) { q.T -= dt; K = 0; C = 1.4; if (q.T <= 0) { q.role = 3; q.L = q.R.loops[q.R.k] || null; q.u = rnd(); q.seg = 0; q.bt = 0.7; } }
      if (q.role === 1) { // wander: a slow figure round the home point
        if (q.T > 0) { q.T -= dt; if (q.T <= 0) { q.home.copy(q.R.start).add(_v.set(rnd(-4, 4), rnd(-2, 2.5), rnd(-4, 4))); q.hr = 2.2; q.bt = q.vis ? 1 : 0; } } // back to where the cluster sleeps
        const a = time * 0.31 * q.fq + q.ph; q.t.set(q.home.x + Math.sin(a) * q.hr, q.home.y + Math.sin(a * 1.7 + q.ph) * q.hr * 0.45, q.home.z + Math.cos(a * 0.83 + 1) * q.hr); K = 1.3; C = 1.6; }
      else if (q.role === 2) { const L = q.L, br = 1 + 0.07 * Math.sin(time * 1.3 + L.i) + 0.05 * Math.sin(time * 2.1 + q.ph); // the loop breathes and turns, never a perfect circle
        ringPoint(L, q.a + time * 0.35 + 0.22 * Math.sin(time * 0.9 + q.ph), L.r * br * (1 + 0.06 * Math.sin(q.ph * 7 + time)), q.t); q.t.addScaledVector(L.n, 0.35 * Math.sin(time * 1.1 + q.ph * 3)); K = 9; C = 4.5; wob = 0.9; }
      else if (q.role === 3) { // stragglers: strung from the bee to the next loop, and on to the one after
        const Rq = q.R, L0 = Rq.loops[Rq.k], L1 = Rq.loops[Rq.k + 1]; q.u += dt * 0.11 * q.fq; if (q.u > 1) q.u -= 1;
        if (!L0 || (Rq.state === 'pour' && q.seg)) { const s = clamp(q.u, 0, 0.999) * (ROOT.length - 1), a = Math.floor(s); q.t.copy(ROOT[a]).lerp(ROOT[Math.min(ROOT.length - 1, a + 1)], s - a); }
        else if (q.seg && L1) q.t.copy(L0.c).lerp(L1.c, q.u); else { _v.copy(Rq.k > 0 ? Rq.loops[Rq.k - 1].c : Rq.start); q.t.copy(_v).lerp(L0.c, q.u); }
        q.t.y += Math.sin(q.u * 9 + q.ph) * 0.8; K = 4; C = 3; wob = 1.2; }
      else if (q.role === 4) { // the tail: a loose spiral round the bee's line of flight, a few ahead, most behind
        const an = q.j * 2.4 + time * 0.7, rr = 1.3 + 0.11 * q.j, fw = 4.5 - (q.j % 7) * 1.7;
        q.t.copy(bee).addScaledVector(dirF, fw).addScaledVector(dirS, Math.cos(an) * rr).addScaledVector(dirU, Math.sin(an) * rr * 0.6 + 0.3); K = 14; C = 5; wob = 0.7; litN++;
        q.v.x += (P.vel.x - q.v.x) * Math.min(1, C * dt); q.v.y += (P.vel.y - q.v.y) * Math.min(1, C * dt); q.v.z += (P.vel.z - q.v.z) * Math.min(1, C * dt); C = 0; }
      _v.copy(q.t).sub(q.p).multiplyScalar(K); _v.x += Math.sin(time * q.fq * 1.3 + q.ph) * wob; _v.y += Math.sin(time * q.fq * 1.7 + q.ph * 2) * wob * 0.6; _v.z += Math.cos(time * q.fq * 1.1 + q.ph * 3) * wob;
      q.v.addScaledVector(_v, dt).multiplyScalar(Math.max(0, 1 - C * dt)); q.p.addScaledVector(q.v, dt);
      const gy = terrainH(q.p.x, q.p.z) + 0.4; if (q.p.y < gy) { q.p.y = gy; q.v.y = Math.abs(q.v.y) * 0.3; }
      // glow: loose ones blink slowly like real fireflies, working ones burn steadily
      q.b += (q.bt - q.b) * Math.min(1, dt * (q.b > q.bt ? 1.6 : 3));
      let bl = q.role === 1 ? 0.12 + 0.88 * Math.pow(Math.max(0, Math.sin(time * q.fq * 0.9 + q.ph)), 3) : 0.8 + 0.2 * Math.sin(time * 7 + q.ph);
      if (q.role === 2) { bl += q.L.pulse * 2; if (R && q.R === R && R.state === 'awake' && R.timer < 5 && q.L === R.loops[R.k]) bl *= 0.45 + 0.55 * Math.abs(Math.sin(time * 6)) * (R.timer / 5 + 0.2); }
      const b = q.b * bl * N.fade, k = i * 3; fPos[k] = q.p.x; fPos[k + 1] = q.p.y; fPos[k + 2] = q.p.z;
      fCol[i * 4] = FLY_C[0] * b; fCol[i * 4 + 1] = FLY_C[1] * b; fCol[i * 4 + 2] = FLY_C[2] * b; fCol[i * 4 + 3] = 0; fSize[i] = b > 0.02 ? q.size * (0.8 + 0.25 * Math.min(2, b)) : 0;
    }
    // a soft halo on every open moonflower: these are what you steer by in the dark
    for (let i = 0; i < HN; i++) { const f = MF[i], j = FN + i, o = f.open * N.fade * (f.taken ? 0.3 : 0.4 + 0.6 * f.nectar) * (0.85 + 0.15 * Math.sin(time * 1.4 + f.ph));
      fPos[j * 3] = f.sx; fPos[j * 3 + 1] = f.y + 0.9; fPos[j * 3 + 2] = f.sz; fCol[j * 4] = 0.42 * o; fCol[j * 4 + 1] = 0.60 * o; fCol[j * 4 + 2] = 1.0 * o; fCol[j * 4 + 3] = 1; fSize[j] = o > 0.02 ? (f.grove ? 2.6 : 4.2) : 0; }
    fGeo.attributes.position.needsUpdate = fGeo.attributes.aC.needsUpdate = fGeo.attributes.aS.needsUpdate = true;
    // the tail is a travelling light: it shows the ground and the way home
    const lamp = U.uLamp.value, want = litN > 0 ? (0.3 + 0.05 * litN) * N.fade : 0; lamp.w += (want - lamp.w) * Math.min(1, dt * 2.5); if (lamp.w < 0.003) lamp.w = 0;
    const h = hist[Math.min(hist.length - 1, 4)] || bee; lamp.x = h.x; lamp.y = h.y + 0.6; lamp.z = h.z; N.lamp = lamp.w;
  }

  // =====================================================================================
  // 4. The night as a whole: when it starts, how it ends, and what sleeps.
  // =====================================================================================
  function start() {
    N.active = true; N.t = 0; N.k = 0; N.n++; N.sleepT = 0; N.groveLit = false; N.chain = null; N.tail = 0; N.keepTail = false; N.warned = false; N.passes = 0; hist.length = 0; hasPrev = false;
    for (const f of MF) { f.open = 0; f.taken = false; f.cool = 0; f.nectar = 1; f.drained = false; }
    for (const R of ROUTES) { R.state = 'asleep'; R.k = 0; R.cool = 0; for (const q of R.flies) { q.role = 1; q.b = 0; q.bt = q.vis ? 1 : 0; q.hr = 2.2; q.T = 0; q.home.copy(R.start).add(_v.set(rnd(-4, 4), rnd(-2, 2.5), rnd(-4, 4))); q.p.copy(q.home); q.v.set(0, 0, 0); } }
    for (const q of loose) { q.role = 1; q.b = 0; q.bt = 1; q.p.copy(q.home); } for (const q of groveFlies) { q.role = 1; q.b = 0; q.bt = 0; q.p.copy(q.home); }
    fPts.visible = true; mfView.group.visible = true;
    g.toast(g.inHive ? '<b>Night falls</b><br><span>the moon is rising and moonflowers open in the dark. Rest here to sleep until morning</span>' : '<b>Night falls</b><br><span>the moon is rising and moonflowers open in the dark</span>', 7);
    g.tone(196, 0.06, 4); g.tone(293.66, 0.05, 4, 'sine', 0.5);
    for (const p of N.parts) if (p.start) p.start();
  }
  function finish() {
    for (const p of N.parts) if (p.finish) p.finish(); N.tryNight = 0;
    for (const R of ROUTES) R.state = 'asleep'; N.chain = null; N.tail = 0;
    N.active = false; N.done = true; U.uNight.value = 0; U.uLamp.value.w = 0; N.lamp = 0; fPts.visible = false; mfView.group.visible = false; g.applyDayLight();
    for (const q of F) if (q.role) { q.role = 1; q.b = 0; q.T = 0; }
  }
  // main.js asks this when the day is over. true = wait, the night is not over yet.
  N.hold = () => { if (N.done) return false; if (!N.active) start(); DAY.t = 1; return true; };

  let cricket = 2;
  N.update = dt => {
    if (!N.active) { if (N.moonset) cardText(); if (N.done && DAY.t < 0.5) N.done = false; return; }
    const flying = P.mode === 'fly' && !g.inHive, awake = P.mode === 'fly' || P.mode === 'crawl';
    if (awake) N.t += dt / N.LEN;
    light(dt);
    // what sleeps at night: wasps stay in, nothing calls for help, no day flower overflows, the nest stays shut
    if (!g.MOB.active && !g.SWARM.active) for (const w of g.wasps) w.gone = Math.max(w.gone || 0, 0.6);
    g.MOB.next = Math.max(g.MOB.next, 20); G.richT = Math.max(G.richT, 6); g.NESTR.cd = Math.max(g.NESTR.cd, 3);
    moonflowers(dt, flying); chains(dt, flying); flies(dt);
    for (const p of N.parts) if (p.update) p.update(dt, flying);
    _prev.copy(P.pos); hasPrev = flying;
    // the tail leaves at the hive door
    if (g.inHive && N.tail > 0) { for (const R of ROUTES) for (const q of R.flies) if (q.role === 4) { q.role = 1; q.home.copy(q.p); q.bt = 0; } N.tail = 0; N.keepTail = false; }
    // crickets in the grass
    if (flying) { cricket -= dt; if (cricket <= 0) { cricket = rnd(1.2, 3.4); const f = rnd(3900, 4700), v = 0.012; for (let i = 0; i < 3; i++) g.tone(f, v, 0.07, 'sine', i * 0.09); } }
    if (!N.warned && N.t > 0.85) { N.warned = true; g.toast('<b>The moon is sinking</b><br><span>head home before it sets</span>', 5); g.tone(293.66, 0.06, 2.5); }
    // rest in the hive with empty baskets to sleep until morning
    if (g.inHive && awake && P.pollen === 0 && !(P.deliver > 0)) { const was = N.sleepT; N.sleepT += dt; if (was < 5 && N.sleepT >= 5) g.hint('settling down... stay in the hive to sleep until morning', 6); if (N.sleepT >= 15) N.t = 1; } else N.sleepT = 0;
    if (N.t >= 1) { const played = N.sleepT < 15; finish(); if (played) N.moonset = true; }
  };
  // the day card: when the bee stayed up until the moon set, say so
  const card = document.getElementById('dayfade');
  function cardText() { const d = card && card.firstChild; if (d && d.innerHTML.includes('Night falls on day')) { N.moonset = false; d.innerHTML = d.innerHTML.replace('Night falls on day', 'The moon sets on day'); } else if (DAY.t < 0.5) N.moonset = false; }

  // for tests and for looking around: jump into the night
  // which night this is for the moths and the bat: the day's number, or the night picked in the try-out menu (stage-menu.js)
  N.nightNo = () => N.tryNight || DAY.n;
  N.debug = { end() { if (N.active) finish(); N.moonset = false; }, begin(t = 0.3, settle = 12) { DAY.t = 1; g.sim(0.1); N.t = t; N.k = 1; for (const f of MF) if (!f.grove) f.open = 1; g.sim(settle); }, F, MF, ROUTES, hist };
  if (now('night')) DAY.t = Math.max(DAY.t, 0.96); // #night-now: the day starts at dusk, so the night comes after about 20 seconds of flying
  Math.random = _mathRandom;
}
