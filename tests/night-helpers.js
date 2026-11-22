// Test support for the night: an autopilot that flies a firefly route by steering at the next loop. Loaded into the page by 08-night.test.js and look.js.
window.autoFly = function (ri, maxSecs = 120, speedCap = 1) { const g = __g, N = NIGHT, R = N.routes[ri], P = g.P, log = [];
  T.fly(R.start.x, R.start.y, R.start.z - 9); T.quiet(); T.lookAt(R.start.x, R.start.y, R.start.z - 9, R.start.x, R.start.y, R.start.z);
  let lastK = -1, t = 0, minD = 1e9;
  for (let i = 0; i < maxSecs * 60; i++) { t += 1 / 60;
    let tg; if (R.state === 'asleep' && N.chain !== R && !N.groveLit) tg = R.start; else if (R.state === 'awake') { const L = R.loops[R.k]; const side = Math.sign(P.pos.clone().sub(L.c).dot(L.n)) || -1; const d = P.pos.distanceTo(L.c); tg = L.c.clone().addScaledVector(L.n, d > 6 ? 0 : -side * 4); }
    else if (R.state === 'pour') { const S = g.HOLROOT; let bi = 0, bd = 1e9; S.forEach((q, j) => { const e = q.distanceTo(P.pos); if (e < bd) { bd = e; bi = j; } }); tg = bi >= S.length - 2 ? new g.THREE.Vector3(g.HOLLOW.x, S[S.length - 1].y, g.HOLLOW.z) : S[Math.min(S.length - 1, bi + 3)]; }
    else break;
    const dx = tg.x - P.pos.x, dy = tg.y - P.pos.y, dz = tg.z - P.pos.z; P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    const near = Math.hypot(dx, dy, dz) < 10; if (speedCap < 1 && P.vel.length() > 30 * speedCap || (R.state === 'pour' && P.vel.length() > 9)) T.key('KeyW', false); else T.key('KeyW');
    T.sim(1 / 60);
    if (R.k !== lastK) { log.push([R.state, R.k, +t.toFixed(1), N.tail]); lastK = R.k; }
    if (N.groveLit) { log.push(['lit', +t.toFixed(1), N.tail, +N.lamp.toFixed(2)]); break; } }
  T.key('KeyW', false); return { log, state: R.state, k: R.k, lit: N.groveLit, pos: [P.pos.x, P.pos.y, P.pos.z].map(Math.round), toast: T.text('toast') }; };
