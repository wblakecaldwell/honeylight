// Honeylight: the long run at night. While a bee is in the zone at night, fireflies rise out of the grass beside the track and fall in behind it: three for each tier.
// A bail sends the last three off into the dark; when the run ends they all drift away. Moths cannot resist them (moths.js counts them as a light, NIGHT.runFlies).
// Self-contained. It needs night.js and the long run (window.__run). To switch it off add ?runnight=0 to the address (or #runnight-off).
// It never calls Math.random and shows nothing in the daytime or when no run is on. One draw call.
const g = window.__g, N = window.NIGHT;
if (g && N && N.parts && window.__run && !N.off('runnight')) {
  const { THREE, P, terrainH } = g, V3 = THREE.Vector3, TAU = Math.PI * 2, RUN = window.__run.RUN;
  let _s = 20261125; const rnd = (a = 1, b) => { _s = (_s + 0x6D2B79F5) >>> 0; let t = _s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296; return b === undefined ? r * a : a + r * (b - a); };
  const _mathRandom = Math.random; Math.random = rnd; // three.js draws a random id for each new object: keep the game's stream untouched

  const RNK = N.runK = { per: 3, max: 15, rise: 1.6, gone: 3 }; // per tier; the most at once; seconds to rise and join; seconds to drift off
  const C = [3.4, 2.7, 0.75]; // the same warm gold as the night's fireflies
  const F = []; for (let i = 0; i < RNK.max; i++) F.push({ p: new V3(0, -900, 0), v: new V3(), t: new V3(), role: 0, T: 0, b: 0, ph: rnd(TAU), fq: rnd(1.6, 3.0), size: rnd(0.26, 0.36) }); // role: 0 asleep, 1 rising to the bee, 2 following, 3 drifting off
  const pos = new Float32Array(RNK.max * 3), col = new Float32Array(RNK.max * 4), size = new Float32Array(RNK.max);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aC', new THREE.BufferAttribute(col, 4)); geo.setAttribute('aS', new THREE.BufferAttribute(size, 1));
  const pts = new THREE.Points(geo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 aC; attribute float aS; varying vec4 vC4; void main(){ vec4 mv=viewMatrix*vec4(position,1.0); vC4=aC; gl_PointSize=clamp(aS*520.0/max(-mv.z,0.1),3.0,30.0); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec4 vC4; void main(){ float d=length(gl_PointCoord-0.5); float core=smoothstep(0.2,0.0,d), halo=smoothstep(0.5,0.0,d); gl_FragColor=vec4(vC4.rgb*(core*1.5+halo*halo*0.55),1.0); }` }));
  pts.frustumCulled = false; pts.visible = false; pts.renderOrder = 5; g.scene.add(pts); g.noShadow(pts);
  Math.random = _mathRandom;
  N.runFlies = 0;

  const dirF = new V3(0, 0, -1), dirS = new V3(1, 0, 0), _v = new V3();
  const count = role => F.reduce((n, q) => n + (q.role === role ? 1 : 0), 0);
  function wake(q) { // it lifts out of the grass beside the track a little ahead of the bee
    const side = rnd() < 0.5 ? -1 : 1; q.p.copy(P.pos).addScaledVector(dirF, rnd(4, 10)).addScaledVector(dirS, side * rnd(3, 6)); q.p.y = terrainH(q.p.x, q.p.z) + rnd(0.3, 1.0);
    q.v.set(0, rnd(1, 2), 0); q.role = 1; q.T = 0; q.b = 0; }
  function update(dt, flying) {
    const on = flying && RUN.state === 'run', want = on ? Math.min(RNK.max, RNK.per * RUN.tier) : 0, time = g.time;
    const sp = P.vel.length(); if (sp > 2) dirF.lerp(_v.copy(P.vel).multiplyScalar(1 / sp), Math.min(1, dt * 3)).normalize(); dirS.set(-dirF.z, 0, dirF.x); if (dirS.lengthSq() < 1e-4) dirS.set(1, 0, 0); dirS.normalize();
    // more wanted: wake one at a time from the grass. Fewer wanted (a bail, or the run is over): the newest ones drift off first
    let have = count(1) + count(2);
    if (have < want) { const q = F.find(q => q.role === 0); if (q) wake(q); }
    for (let i = F.length - 1; i >= 0 && have > want; i--) { const q = F[i]; if (q.role === 1 || q.role === 2) { q.role = 3; q.T = 0; q.v.add(_v.set(rnd(-1, 1), rnd(0.5, 1.5), rnd(-1, 1)).multiplyScalar(3)); have--; } }
    let following = 0, any = false;
    for (let i = 0; i < F.length; i++) { const q = F[i]; let K = 0, Cd = 1, ref = 0; // ref: how much of the bee's own speed it is carried along with
      if (q.role === 0) { size[i] = 0; continue; } any = true; q.T += dt;
      if (q.role === 1 || q.role === 2) { // its place in the tail: a loose spiral round the bee's line
        const an = i * 2.4 + time * 0.7, rr = 1.4 + 0.12 * i, fw = 3.6 - (i % 6) * 1.5 - Math.floor(i / 6) * 0.8; // a few beside and just ahead (seen from the bee's eyes), most behind
        q.t.copy(P.pos).addScaledVector(dirF, fw).addScaledVector(dirS, Math.cos(an) * rr); q.t.y += Math.sin(an) * rr * 0.6 + 0.4;
        if (q.role === 1) { const k = Math.min(1, q.T / RNK.rise); K = 3 + 11 * k; Cd = 2 + 3 * k; ref = k; if (k >= 1 && q.p.distanceTo(q.t) < 2) q.role = 2; } // it catches up with the bee
        else { K = 14; Cd = 5; ref = 1; following++; } }
      else if (q.role === 3) { if (q.T > RNK.gone) { q.role = 0; size[i] = 0; continue; } q.t.copy(q.p); Cd = 0.8; }
      _v.copy(q.t).sub(q.p).multiplyScalar(K); _v.x += Math.sin(time * q.fq * 1.3 + q.ph) * 0.8; _v.y += Math.sin(time * q.fq * 1.7 + q.ph * 2) * 0.5; _v.z += Math.cos(time * q.fq * 1.1 + q.ph * 3) * 0.8;
      q.v.addScaledVector(P.vel, -ref).addScaledVector(_v, dt).multiplyScalar(Math.max(0, 1 - Cd * dt)).addScaledVector(P.vel, ref); q.p.addScaledVector(q.v, dt);
      const gy = terrainH(q.p.x, q.p.z) + 0.3; if (q.p.y < gy) { q.p.y = gy; q.v.y = Math.abs(q.v.y) * 0.3; }
      // glow: they wink on as they rise, burn steadily in the tail, and blink out as they drift off
      const bt = q.role === 3 ? Math.max(0, 1 - q.T / RNK.gone) * (0.3 + 0.7 * Math.pow(Math.max(0, Math.sin(time * q.fq + q.ph)), 2)) : q.role === 1 ? Math.min(1, q.T * 1.5) : 0.85 + 0.15 * Math.sin(time * 6 + q.ph);
      q.b += (bt - q.b) * Math.min(1, dt * 4); const b = q.b * (N.fade === undefined ? 1 : N.fade), k = i * 3;
      pos[k] = q.p.x; pos[k + 1] = q.p.y; pos[k + 2] = q.p.z; col[i * 4] = C[0] * b; col[i * 4 + 1] = C[1] * b; col[i * 4 + 2] = C[2] * b; col[i * 4 + 3] = 0; size[i] = b > 0.02 ? q.size : 0; }
    N.runFlies = following; pts.visible = any;
    if (any) geo.attributes.position.needsUpdate = geo.attributes.aC.needsUpdate = geo.attributes.aS.needsUpdate = true;
  }
  function finish() { for (const q of F) { q.role = 0; q.b = 0; } N.runFlies = 0; pts.visible = false; }
  N.parts.push({ start: finish, update, finish });
  N.runNight = { F, RNK, count };
}
