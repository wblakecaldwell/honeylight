// Honeylight: moths. Every night, hawk moths come for the moonflowers.
// A moth hovers at an open moonflower and drinks it dry. Fly close and it flutters off; what it left is still yours.
// Moths cannot resist light: a bee with fireflies behind it draws them away from the flowers.
// Moths are guides: a moth that has drunk a flower dry flies to a hidden night bloom and lands on it. The bloom opens only for a moth. Follow the moth's wing dust to find it.
// Self-contained. It needs night.js. To switch it off add ?moths=0 to the address (or #moths-off).
// It never calls Math.random and shows nothing in the daytime or on the first night.
import { makeMoths } from './moth-model.js';
import { makeMoonflowers } from './moonflowers.js';
const g = window.__g, N = window.NIGHT;
if (g && N && N.parts && !N.off('moths')) {
  const { THREE, P, G, DAY, terrainH } = g, V3 = THREE.Vector3, TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  let _s = 20261123; const rnd = (a = 1, b) => { _s = (_s + 0x6D2B79F5) >>> 0; let t = _s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296; return b === undefined ? r * a : a + r * (b - a); };
  const _mathRandom = Math.random; Math.random = rnd; // three.js draws a random id for each new object: keep the game's stream untouched

  const MAXM = 4, DRINK = 30, REST = 8, SPEED = 4.6, SHOO = 3.4, LURE = 18, GUIDE = 8.5, DUST = 8, DN = 150;
  const view = makeMoths(g, MAXM); if (!view.group.parent) g.scene.add(view.group); view.group.visible = false;
  const MF = N.moonflowers, M = [], _v = new V3(), _t = new V3(), _pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, flap: 1, drink: 0, vis: 0 };
  for (let i = 0; i < MAXM; i++) M.push({ i, p: new V3(0, -900, 0), v: new V3(), state: 'away', f: null, T: 0, at: 0, ph: rnd(TAU), yaw: 0, vis: 0, drink: 0, flap: 1, side: new V3(), avoid: null, avoidT: 0, fed: false, hb: null, dustT: 0 });
  const lights = () => N.tail + (N.runFlies || 0); // fireflies behind the bee: the night's tail, and those that follow a bee in the zone on the long run (runnight.js)
  const MO = N.moths = { list: M, count: 0, drained: 0, shooed: 0, lured: 0, told: false, guided: 0, opened: 0, found: 0 };

  // ---- night blooms: four hidden flowers in places a bee does not go to by chance. A night bloom stays a shut bud until a fed moth lands on it.
  const HB = MO.blooms = [];
  const addHB = (x, z, y, stem, val) => HB.push({ x, z, y, sx: x, sz: z, dsx: 0, dsz: 0, ax: 0, az: 0, r: 1.25, len: 2.9, tilt: 0.32, sw: 1, val, grove: true, lily: true, rich: 0, cool: 0, open: 0, taken: false, nectar: 1, stem, ph: HB.length * 1.7, moth: null, woken: false }); // no draw from rnd here: the moths' own numbers stay as they were
  { const L = g.LOG, cap = g.shrooms.slice().sort((a, b) => b.R - a.R)[0], h0 = g.HILLS[0], h1 = g.HILLS[1];
    addHB(L.c.x + L.axis.x * 9, L.c.z + L.axis.z * 9, L.c.y + L.ro + 2.5, 2.8, 3);     // on the fallen tree
    addHB(cap.x, cap.z, cap.y + cap.R * 0.5 + 2.4, 2.6, 3);                            // on the widest mushroom
    for (const [h, val] of [[h0, 4], [h1, 3]]) { const k = 7 / Math.hypot(h.x, h.z), x = h.x + h.x * k, z = h.z + h.z * k; addHB(x, z, terrainH(x, z) + 7.5, 7.5, val); } } // just behind the top of the highest hill (in the wind), and of the hill by the walled garden
  let _id = 20261124; Math.random = () => { _id = (_id * 1664525 + 1013904223) >>> 0; return _id / 4294967296; }; // ids of the new three.js objects must not take numbers from the moths' stream
  const hbView = makeMoonflowers(g, HB); hbView.group.visible = false;
  // wing dust that a guide leaves in the air, and the soft light of an open night bloom: one cloud of points
  const dPos = new Float32Array((DN + HB.length) * 3), dCol = new Float32Array((DN + HB.length) * 4), dSize = new Float32Array(DN + HB.length), dBorn = new Float32Array(DN).fill(-99); let dNext = 0;
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3)); dGeo.setAttribute('aC', new THREE.BufferAttribute(dCol, 4)); dGeo.setAttribute('aS', new THREE.BufferAttribute(dSize, 1));
  const dPts = new THREE.Points(dGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 aC; attribute float aS; varying vec4 vC4; void main(){ vec4 mv=viewMatrix*vec4(position,1.0); vC4=aC; gl_PointSize=clamp(aS*520.0/max(-mv.z,0.1),2.0,mix(22.0,120.0,aC.a)); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec4 vC4; void main(){ float d=length(gl_PointCoord-0.5); float core=smoothstep(0.2,0.0,d), halo=smoothstep(0.5,0.0,d); float a=mix(core*1.5+halo*halo*0.55, halo*halo*0.5, vC4.a); gl_FragColor=vec4(vC4.rgb*a,1.0); }` }));
  dPts.frustumCulled = false; dPts.visible = false; dPts.renderOrder = 5; g.scene.add(dPts); g.noShadow(dPts);
  for (let i = 0; i < DN; i++) dPos[i * 3 + 1] = -900;
  Math.random = rnd;
  const dust = p => { const i = dNext; dNext = (dNext + 1) % DN; dPos[i * 3] = p.x + rnd(-0.35, 0.35); dPos[i * 3 + 1] = p.y + rnd(-0.3, 0.2); dPos[i * 3 + 2] = p.z + rnd(-0.35, 0.35); dBorn[i] = g.time; };
  const pickBloom = m => { let best = null, bd = 1e9; for (const f of HB) { if (f.woken || f.moth) continue; const d = Math.hypot(f.x - m.p.x, f.z - m.p.z); if (d < bd) { bd = d; best = f; } } return best; };
  function blooms(dt, flying) {
    const time = g.time, fade = N.fade === undefined ? 1 : N.fade;
    for (let i = 0; i < HB.length; i++) { const f = HB[i], j = DN + i;
      f.open += clamp((f.woken && N.t < 0.97 ? 1 : 0) - f.open, -dt * 0.5, dt * 0.4); hbView.setOpen(i, f.open, f.taken ? 0.25 : 1);
      const o = f.open * fade * (f.taken ? 0.3 : 1) * (0.85 + 0.15 * Math.sin(time * 1.4 + f.ph));
      dPos[j * 3] = f.sx; dPos[j * 3 + 1] = f.y + 0.9; dPos[j * 3 + 2] = f.sz; dCol[j * 4] = 0.62 * o; dCol[j * 4 + 1] = 0.48 * o; dCol[j * 4 + 2] = 1.0 * o; dCol[j * 4 + 3] = 1; dSize[j] = o > 0.02 ? 3.6 : 0;
      if (!flying) continue;
      const d = Math.hypot(P.pos.x - f.sx, P.pos.z - f.sz); if (d > 12) continue;
      if (f.open < 0.3) { const sr = 0.3 + g.PR; if (d < sr && P.pos.y < f.y + 1.6 && P.pos.y > f.y - f.stem - 1) { const k = sr / Math.max(d, 0.01); P.pos.x = f.sx + (P.pos.x - f.sx) * k; P.pos.z = f.sz + (P.pos.z - f.sz) * k; } continue; }
      const onTop = g.flowerHit(f, d, dt);
      if (onTop && f.open > 0.85 && !f.taken && P.pollen < G.cap) { const need = 1.4;
        if (time - (f.lastLand || -9) > 0.5) G.holdT = 0; f.lastLand = time; G.holdT += dt; G.holdF = f; G.holdNeed = need;
        if (G.holdT >= need) { G.holdT = 0; f.taken = true; f.cool = 1e9; P.load.push(f.val); P.pollen = P.load.length; MO.found++;
          g.toast(`<b>A night bloom</b> worth ${f.val} honey<br><span>it opens only where a moth lands</span>`, 4);
          g.tone(587.33, 0.1, 2.2); g.tone(880, 0.07, 2.0, 'sine', 0.12); g.tone(1174.66, 0.05, 1.8, 'sine', 0.24); _v.set(f.sx, f.y + 0.8, f.sz); g.puff(_v, 22, [0.85, 0.8, 1.0], 2.0, 0.012, 1.6, 0.5, 0.8);
          if (P.pollen >= G.cap) g.hint('baskets full: take it home to the hive', 4); } } }
    for (let i = 0; i < DN; i++) { const age = time - dBorn[i], k = age < DUST ? Math.pow(1 - age / DUST, 1.4) * fade * (0.55 + 0.45 * Math.sin(time * 7 + i * 2.4)) : 0;
      if (k > 0) dPos[i * 3 + 1] -= dt * 0.22; dCol[i * 4] = 1.9 * k; dCol[i * 4 + 1] = 1.75 * k; dCol[i * 4 + 2] = 1.35 * k; dCol[i * 4 + 3] = 0; dSize[i] = k > 0 ? 0.2 : 0; }
    dGeo.attributes.position.needsUpdate = true; dGeo.attributes.aC.needsUpdate = true; dGeo.attributes.aS.needsUpdate = true;
  }

  // how many come: none on the first night, two on the second, then one more each night up to four
  const howMany = () => { const n = N.nightNo(); return N.now('moths') ? clamp(n, 3, MAXM) : clamp(n, 2, MAXM); }; // two on the first two nights, then one more each night; #moths-now: three at once, on any night
  function pick(m) { // the nearest open moonflower that still has nectar and that no other moth has chosen
    let best = null, bd = 1e9;
    for (const f of MF) { if (f.grove || f.taken || f.open < 0.85 || f.nectar <= 0 || (f.moth && f.moth !== m) || (f === m.avoid && m.avoidT > 0)) continue;
      const d = Math.hypot(f.sx - m.p.x, f.sz - m.p.z); if (d < bd) { bd = d; best = f; } }
    return best;
  }
  function release(m) { if (m.f && m.f.moth === m) m.f.moth = null; m.f = null; if (m.hb && m.hb.moth === m) m.hb.moth = null; m.hb = null; }
  function flee(m, from) { // startled: up and away from the bee, in a puff of wing dust
    _v.copy(m.p).sub(from); _v.y = 0; if (_v.lengthSq() < 0.01) _v.set(1, 0, 0); _v.normalize();
    m.v.set(_v.x * 9, 5, _v.z * 9); m.avoid = m.f; m.avoidT = 26; release(m); m.state = 'flee'; m.T = 4.5;
    g.puff(m.p, 14, [0.95, 0.92, 0.85], 2.2, 0.01, 1.3, 0.25, 0.4); g.tone(620, 0.03, 0.22, 'triangle'); g.tone(830, 0.022, 0.18, 'triangle', 0.07);
  }

  function start() {
    MO.count = howMany(); MO.taken = 0; MO.drained = 0; MO.shooed = 0; MO.lured = 0; MO.told = false; MO.guided = 0; MO.opened = 0; MO.found = 0; MO.toldGuide = false;
    for (const f of MF) f.moth = null;
    for (const f of HB) { f.open = 0; f.taken = false; f.cool = 0; f.woken = false; f.moth = null; } dBorn.fill(-99);
    for (const m of M) { m.state = 'away'; m.f = null; m.hb = null; m.fed = false; m.vis = 0; m.avoid = null; m.avoidT = 0;
      m.at = 0.14 + 0.17 * m.i; // they come one after another as the moon climbs
      const a = rnd(TAU); m.p.set(Math.cos(a) * 250, 0, Math.sin(a) * 250); m.p.y = terrainH(m.p.x, m.p.z) + 28; m.v.set(0, 0, 0); }
    view.group.visible = hbView.group.visible = dPts.visible = MO.count > 0;
  }
  function finish() { for (const m of M) { release(m); m.state = 'away'; m.vis = 0; } for (const f of MF) f.moth = null; for (let i = 0; i < HB.length; i++) { HB[i].open = 0; HB[i].woken = false; hbView.setOpen(i, 0, 0); } view.group.visible = hbView.group.visible = dPts.visible = false; pose(); }

  function pose() { for (const m of M) { const s = _pose; s.x = m.p.x; s.y = m.p.y; s.z = m.p.z; s.yaw = m.yaw; s.pitch = m.state === 'drink' ? 0.25 : m.state === 'perch' ? 0.1 : clamp(m.v.y * 0.06, -0.4, 0.5); s.flap = m.flap; s.drink = m.drink; s.vis = m.vis; view.set(m.i, s); } view.update(g.time); }

  function update(dt, flying) {
    if (!MO.count) return;
    const time = g.time, bee = P.pos, late = N.t > 0.93;
    if (!MO.told && N.t > 0.05) { MO.told = true; g.toast('<b>Moths are out tonight</b><br><span>they drink at the moonflowers. A moth that has drunk its fill knows a secret place</span>', 7); }
    for (const m of M) {
      if (m.i >= MO.count) continue;
      if (m.avoidT > 0) m.avoidT -= dt;
      if (m.state === 'away') { if (N.t >= m.at && !late) { m.state = 'seek'; m.T = 0; } else continue; }
      m.vis = Math.min(1, m.vis + dt * 0.5);
      const db = m.p.distanceTo(bee);
      // light draws them: a bee with fireflies behind it pulls every moth near it off the flowers
      if (flying && lights() >= 3 && db < LURE && m.state !== 'lured' && m.state !== 'leave' && m.state !== 'flee' && m.state !== 'guide' && m.state !== 'perch') { release(m); m.state = 'lured'; MO.lured++; g.tipOnce && g.tipOnce('mothLight', 'moths cannot resist the fireflies that follow you', 6); }
      // fly close and it startles
      if (flying && db < SHOO && (m.state === 'drink' || m.state === 'seek')) { MO.shooed++; flee(m, bee); }
      if (late && m.state !== 'leave') { release(m); m.state = 'leave'; }

      let speed = SPEED, K = 2.6; m.flap = 1; let wantDrink = 0;
      if (m.state === 'seek') {
        m.T -= dt; if (!m.f || m.f.taken || m.f.nectar <= 0 || m.f.open < 0.85) { release(m); if (m.T <= 0) { m.T = 1.5; const f = pick(m); if (f) { m.f = f; f.moth = m; } } }
        if (m.f) { const f = m.f; _t.set(f.sx, f.y + 1.0, f.sz); _v.copy(m.p).sub(_t); _v.y = 0; const d = _v.length();
          if (d > 0.01) m.side.copy(_v).multiplyScalar(1 / d); _t.addScaledVector(m.side, 2.0); // hover in front of the bloom, on the side it came from
          if (m.p.distanceTo(_t) < 0.7) { m.state = 'drink'; m.T = 0; }
        } else { const a = time * 0.05 + m.ph; _t.set(Math.cos(a) * 130, 0, Math.sin(a) * 130); _t.y = terrainH(_t.x, _t.z) + 16; speed = 3; } // nothing to drink: a slow round of the meadow
      } else if (m.state === 'drink') {
        const f = m.f; if (!f || f.taken) { release(m); m.state = 'seek'; m.T = 0; }
        else { _t.set(f.sx, f.y + 1.0 + 0.12 * Math.sin(time * 2.1 + m.ph), f.sz).addScaledVector(m.side, 2.0); K = 6; wantDrink = 1;
          if (m.drink > 0.8) f.nectar = Math.max(0, f.nectar - dt / DRINK);
          if (f.nectar <= 0) { f.taken = true; f.drained = true; MO.drained++; release(m); m.fed = true; const hb = pickBloom(m);
            if (hb) { m.hb = hb; hb.moth = m; m.state = 'guide'; m.dustT = 0; MO.guided++; /* it has drunk its fill: now it goes to its night bloom */
              if (!MO.toldGuide && db < 90) { MO.toldGuide = true; g.toast('<b>The moth has drunk its fill</b><br><span>it flies off and leaves wing dust in the air. Where does it go?</span>', 6); } }
            else { m.state = 'rest'; m.T = REST; } } }
      } else if (m.state === 'rest') { m.T -= dt; _t.copy(m.p); _t.y = terrainH(m.p.x, m.p.z) + 12 + 2 * Math.sin(time * 0.7 + m.ph); _t.x += Math.cos(time * 0.4 + m.ph) * 4; _t.z += Math.sin(time * 0.4 + m.ph) * 4; speed = 2.5; if (m.T <= 0) { m.state = 'seek'; m.T = 0; } }
      else if (m.state === 'guide') { const f = m.hb; if (!f || f.woken) { release(m); m.state = 'rest'; m.T = REST; }
        else { _t.set(f.sx, f.y + 3.2, f.sz); speed = GUIDE; K = 2.2; m.dustT -= dt; if (m.dustT <= 0) { m.dustT = 0.16; dust(m.p); }
          if (Math.hypot(m.p.x - f.sx, m.p.z - f.sz) < 1.6 && m.p.y - f.y < 5) { m.state = 'perch'; f.woken = true; MO.opened++; g.tone(440, 0.05, 1.8); g.tone(659.25, 0.04, 1.6, 'sine', 0.1);
            if (db < 70) g.toast('<b>A night bloom opens under the moth</b><br><span>it opens for no one else</span>', 6); } } }
      else if (m.state === 'perch') { const f = m.hb; if (!f) { m.state = 'rest'; m.T = REST; } /* it sits on its bloom and fans its wings; a bee that comes to drink makes it lift off for a moment */
        else { const lift = flying && db < SHOO + 1.2 ? 3.4 : 0; _t.set(f.sx + (lift ? m.side.x * 1.5 : 0), f.y + 1.0 + lift + 0.05 * Math.sin(time * 1.7 + m.ph), f.sz + (lift ? m.side.z * 1.5 : 0)); K = 5; speed = 3.2; m.flap = lift || m.p.distanceTo(_t) > 0.5 ? 1 : 0.12; } }
      else if (m.state === 'flee') { m.T -= dt; K = 0.6; _t.copy(m.p).addScaledVector(m.v, 1); _t.y = terrainH(m.p.x, m.p.z) + 14; if (m.T <= 0) { m.state = 'seek'; m.T = 0; } }
      else if (m.state === 'lured') {
        if (lights() < 1 || db > LURE + 14 || !flying) { m.state = 'rest'; m.T = 6; } // the light is gone: it circles, confused, then goes back to the flowers
        else { const a = time * 1.5 + m.ph, sp = P.vel.length(), bx = sp > 1 ? P.vel.x / sp : 0, bz = sp > 1 ? P.vel.z / sp : 1;
          _t.set(bee.x - bx * 3.2 + Math.cos(a) * 2.4, bee.y + 0.9 + Math.sin(a * 1.3) * 0.9, bee.z - bz * 3.2 + Math.sin(a) * 2.4); K = 5; speed = Math.max(SPEED, sp + 5); }
      } else if (m.state === 'leave') { _t.copy(m.p).addScaledVector(m.side.lengthSq() ? m.side : _v.set(1, 0, 0), 30); _t.y = m.p.y + 12; m.vis = Math.max(0, m.vis - dt * 0.9); if (m.vis <= 0) { m.state = 'away'; m.at = 9; continue; } }
      m.drink += clamp(wantDrink - m.drink, -dt * 2.5, dt * 1.2);

      // moth flight: toward the target, never in a straight line
      _v.copy(_t).sub(m.p); const d = _v.length();
      if (d > 3 && m.state !== 'drink') { const w = Math.min(1, (d - 3) / 6); _v.x += Math.sin(time * 2.3 + m.ph) * 2.6 * w; _v.z += Math.cos(time * 1.9 + m.ph * 2) * 2.6 * w; _v.y += Math.sin(time * 3.1 + m.ph * 3) * 1.5 * w; }
      const L = _v.length(); if (L > 0.001) _v.multiplyScalar(Math.min(speed, d * 2.2) / L);
      m.v.x += (_v.x - m.v.x) * Math.min(1, K * dt); m.v.y += (_v.y - m.v.y) * Math.min(1, K * dt); m.v.z += (_v.z - m.v.z) * Math.min(1, K * dt);
      m.p.addScaledVector(m.v, dt);
      const gy = terrainH(m.p.x, m.p.z) + 2.2; if (m.p.y < gy) { m.p.y = gy; m.v.y = Math.max(0, m.v.y); }
      // it faces where it flies; at a flower it faces the bloom
      let yaw = m.yaw; if (m.state === 'drink' && m.f) yaw = Math.atan2(m.f.sx - m.p.x, m.f.sz - m.p.z); else if (m.v.x * m.v.x + m.v.z * m.v.z > 0.3) yaw = Math.atan2(m.v.x, m.v.z);
      let dy = yaw - m.yaw; while (dy > Math.PI) dy -= TAU; while (dy < -Math.PI) dy += TAU; m.yaw += dy * Math.min(1, dt * 6);
    }
    blooms(dt, flying); pose();
  }
  // the bat (bat.js) takes one: it is gone for the night
  MO.take = m => { release(m); g.puff(m.p, 16, [0.95, 0.92, 0.85], 3, 0.011, 1.4, 0.3, 0.2); m.state = 'away'; m.at = 9; m.vis = 0; MO.taken = (MO.taken || 0) + 1; };
  N.parts.push({ start, update, finish });
  // for tests and for looking around
  MO.debug = { blooms: hbView, dust: () => { let n = 0; for (let i = 0; i < DN; i++) if (g.time - dBorn[i] < DUST) n++; return n; },
    lead(i, bi) { const m = M[i], f = HB[bi]; MO.count = Math.max(MO.count, i + 1); view.group.visible = hbView.group.visible = dPts.visible = true; release(m); m.state = 'guide'; m.fed = true; m.vis = 1; m.hb = f; f.moth = m; m.p.set(f.x + 7, f.y + 5, f.z + 4); m.v.set(0, 0, 0); m.at = 0; },
    put(i, fi) { const m = M[i], f = MF[fi]; MO.count = Math.max(MO.count, i + 1); view.group.visible = true; release(m); m.state = 'seek'; m.vis = 1; m.T = 9; m.f = f; f.moth = m; m.side.set(1, 0, 0); m.p.set(f.sx + 2.2, f.y + 1.0, f.sz); m.v.set(0, 0, 0); m.at = 0; }, view };
  Math.random = _mathRandom;
}
