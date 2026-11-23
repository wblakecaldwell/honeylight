// Honeylight: what the summer storm looks like. Only draws; storm.js decides when and where it rains.
// makeStorm(g) returns { group, set(s), update(time, dt) }.
//   s = { k, rain, ax, az, front, back, wx, wz, flash, bolt: null | { x, z, seed }, bow: { x, z, yaw, r, k } } (see handoff/modules.md, Batch 6).
// Five draw calls: rain streaks around the camera, splashes on the ground, the rain curtains (front and back), the bolt, the rainbow.
// No depth write, no shadows. Nothing shows when k is 0. No Math.random (a seeded generator, also while three.js builds its objects).
export function makeStorm(g) {
  const { THREE } = g, group = new THREE.Group(), TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  let _s = 20261125; const rnd = () => { _s = (_s + 0x6D2B79F5) >>> 0; let t = _s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const _mathRandom = Math.random; Math.random = rnd; // three.js draws a random id for each new object: keep the game's stream untouched
  const noShadow = o => { if (g.noShadow) g.noShadow(o); else { o.castShadow = o.receiveShadow = false; } return o; };
  const VARY = 'varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv; varying vec3 vL;';
  const VZERO = 'vN=vec3(0.0,1.0,0.0); vC=vec3(1.0); vUv=vec2(0.0); vL=vec3(0.0);';
  // shared storm uniforms
  const S = { uK: { value: 0 }, uRain: { value: 0 }, uA: { value: new THREE.Vector2(1, 0) }, uBand: { value: new THREE.Vector2(0, 0) }, uWind: { value: new THREE.Vector2(0, 0) },
    uFlash: { value: 0 }, uT: { value: 0 } };
  const BAND = `uniform vec2 uA; uniform vec2 uBand; float inBand(vec3 p){ float d=p.x*uA.x+p.z*uA.y; return smoothstep(uBand.x,uBand.x+12.0,d)*smoothstep(uBand.y,uBand.y-12.0,d); }`;

  // ---- 1. rain streaks: a box of lines that travels with the camera; each streak wraps inside the box
  const NR = 1200, BOX = new THREE.Vector3(44, 34, 44), FALL = 30;
  {
    const pos = new Float32Array(NR * 2 * 3), seed = new Float32Array(NR * 2 * 4);
    for (let i = 0; i < NR; i++) { const a = rnd(), b = rnd(), c = rnd(), d = rnd(); for (let e = 0; e < 2; e++) { const k = (i * 2 + e) * 4; seed[k] = a; seed[k + 1] = b; seed[k + 2] = c; seed[k + 3] = e + d * 0.001; } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    const vert = `attribute vec4 aSeed; uniform vec3 uCam; uniform float uT; uniform vec2 uWind; uniform float uRain; ${VARY} varying float vA; ${BAND}
      void main(){ vec3 box=vec3(${BOX.x.toFixed(1)},${BOX.y.toFixed(1)},${BOX.z.toFixed(1)}); float sp=${FALL.toFixed(1)}*(0.85+0.3*aSeed.z);
        vec3 vel=vec3(uWind.x,-sp,uWind.y);
        vec3 p=aSeed.xyz*box+vel*uT; p=mod(p-uCam+box*0.5,box)-box*0.5+uCam;           // wrap around the camera
        float end=floor(aSeed.w+0.5); p-=vel*0.075*end;                                  // the streak: a short stretch along its own motion
        vW=p; ${VZERO} float near=1.0-smoothstep(14.0,22.0,length(p.xz-uCam.xz));
        vA=inBand(p)*near*step(fract(aSeed.z*7.13),uRain);                               // fewer streaks in light rain
        gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0); }`;
    const frag = `uniform float uFlash; uniform float uK; varying float vA; void main(){ if(vA<0.01) discard;
      vec3 c=vec3(0.78,0.83,0.92)*(0.8+2.5*uFlash); gl_FragColor=vec4(finish(c,vW),vA*0.75*uK); }`;
    const m = g.mat(frag, { uniforms: S, vert, transparent: true, depthWrite: false });
    const rain = new THREE.LineSegments(geo, m); rain.frustumCulled = false; group.add(noShadow(rain));
  }

  // ---- 2. splashes: little pale rings on the ground near the camera (positions refreshed on the CPU as each one ends, from the seeded generator)
  const NS = 140, sPos = new Float32Array(NS * 3), sPh = new Float32Array(NS), sLife = new Float32Array(NS);
  const splashGeo = new THREE.BufferGeometry(); splashGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); splashGeo.setAttribute('aPh', new THREE.BufferAttribute(sPh, 1));
  for (let i = 0; i < NS; i++) { sLife[i] = rnd() * 0.5; sPos[i * 3 + 1] = -1e4; }
  {
    const vert = `attribute float aPh; uniform vec3 uCam; ${VARY} varying float vP; ${BAND}
      void main(){ vW=position; ${VZERO} vP=aPh*inBand(position); vec4 mv=viewMatrix*vec4(position,1.0);
        gl_PointSize=clamp((0.5+1.6*aPh)*300.0/max(-mv.z,0.1),1.0,24.0); gl_Position=projectionMatrix*mv; }`;
    const frag = `uniform float uK; uniform float uRain; uniform float uFlash; varying float vP; void main(){ if(vP<=0.0) discard;
      vec2 q=gl_PointCoord-0.5; q.y*=2.4; float r=length(q)*2.0; float ring=smoothstep(0.12,0.0,abs(r-0.35-0.5*vP))*(1.0-vP);
      if(ring<0.01) discard; gl_FragColor=vec4(finish(vec3(0.70,0.75,0.82)*(0.6+2.0*uFlash),vW),ring*0.55*uK*uRain); }`;
    const m = g.mat(frag, { uniforms: S, vert, transparent: true, depthWrite: false });
    const sp = new THREE.Points(splashGeo, m); sp.frustumCulled = false; group.add(noShadow(sp));
  }

  // ---- 3. the rain curtains: tall soft grey sheets along x*ax + z*az = front (and a thinner one at back)
  const CW = 1500, CY0 = -30, CY1 = 150, CN = 60;
  const cOrigin = { value: new THREE.Vector2(0, 0) };
  {
    const pos = [], uv = [], idx = [];
    for (let w = 0; w < 2; w++) { const base = pos.length / 3;
      for (let i = 0; i <= CN; i++) for (let j = 0; j <= 1; j++) { pos.push(0, 0, 0); uv.push(i / CN, j + w * 2); }
      for (let i = 0; i < CN; i++) { const a = base + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const vert = `uniform vec2 uA; uniform vec2 uBand; uniform vec2 uOrigin; ${VARY} varying vec2 vQ; varying float vBack;
      void main(){ float back=step(1.5,uv.y), up=uv.y-back*2.0; vec2 along=vec2(-uA.y,uA.x); float u=(uv.x-0.5)*${CW.toFixed(1)};
        float d=mix(uBand.x,uBand.y,back); vec2 xz=uOrigin+along*u+uA*(d-dot(uOrigin,uA));
        vec3 p=vec3(xz.x, mix(${CY0.toFixed(1)},${CY1.toFixed(1)},up), xz.y); vW=p; ${VZERO} vQ=vec2(u, p.y); vBack=back;
        gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0); }`;
    const frag = `uniform float uK; uniform float uT; uniform float uFlash; uniform vec2 uA; varying vec2 vQ; varying float vBack;
      float h1(float n){ return ihash11(n); }
      float streaks(vec2 q){ float x=q.x*0.55; float i=floor(x), f=fract(x); float a=h1(i), b=h1(i+1.0); float col=mix(a,b,smoothstep(0.0,1.0,f));
        float fall=fract(q.y*0.012+uT*0.35+col*3.0); return 0.45+0.55*col*(0.55+0.45*sin(fall*6.2831)); }
      void main(){ float top=smoothstep(${CY1.toFixed(1)},${(CY1 - 55).toFixed(1)},vQ.y), ends=smoothstep(750.0,560.0,abs(vQ.x));
        float camD=length(vW.xz-uCam.xz), near=smoothstep(8.0,25.0,abs(dot(vW.xz-uCam.xz,uA)))*smoothstep(0.0,10.0,camD);
        float a=uK*top*ends*near*streaks(vQ)*mix(0.75,0.35,vBack)*(0.85+0.15*smoothstep(-10.0,40.0,vQ.y));
        vec3 c=mix(vec3(0.20,0.22,0.27),vec3(0.40,0.43,0.48),smoothstep(0.0,120.0,vQ.y))*(1.0+1.2*uFlash);
        c=finish(c,vW); gl_FragColor=vec4(c,a); }`;
    const m = g.mat(frag, { uniforms: { ...S, uOrigin: cOrigin }, vert, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const cur = new THREE.Mesh(geo, m); cur.frustumCulled = false; cur.renderOrder = 2; group.add(noShadow(cur));
  }

  // ---- 4. the bolt: a jagged, forked ribbon, widened toward the camera in the vertex shader; rebuilt only for a new seed
  const NB = 34, bA = new Float32Array(NB * 4 * 3), bB = new Float32Array(NB * 4 * 3), bS = new Float32Array(NB * 4 * 2), bIdx = [];
  for (let k = 0; k < NB; k++) { for (let c = 0; c < 4; c++) { bS[(k * 4 + c) * 2] = c & 1 ? 1 : -1; bS[(k * 4 + c) * 2 + 1] = c >> 1; } const o = k * 4; bIdx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
  const boltGeo = new THREE.BufferGeometry(); boltGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NB * 4 * 3), 3));
  boltGeo.setAttribute('aA', new THREE.BufferAttribute(bA, 3)); boltGeo.setAttribute('aB', new THREE.BufferAttribute(bB, 3)); boltGeo.setAttribute('aS', new THREE.BufferAttribute(bS, 2)); boltGeo.setIndex(bIdx);
  const bolt = { seed: -1, x: 0, z: 0 };
  function buildBolt(b) {
    let s = (b.seed * 2654435761 + 7) >>> 0; const r = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const gy = g.terrainH(b.x, b.z); let k = 0;
    const seg = (x0, y0, z0, x1, y1, z1, w) => { if (k >= NB) return; for (let c = 0; c < 4; c++) { const v = (k * 4 + c) * 3; bA[v] = x0; bA[v + 1] = y0; bA[v + 2] = z0; bB[v] = x1; bB[v + 1] = y1; bB[v + 2] = z1; }
      bS[(k * 4) * 2] = -w; bS[(k * 4 + 1) * 2] = w; bS[(k * 4 + 2) * 2] = -w; bS[(k * 4 + 3) * 2] = w; k++; };
    // the trunk: from 170 up down to the ground, in 22 jagged steps
    const N = 22; let px = b.x + (r() - 0.5) * 30, py = gy + 170, pz = b.z + (r() - 0.5) * 30; const pts = [];
    for (let i = 1; i <= N; i++) { const t = i / N, nx = b.x + (px - b.x) * (1 - t) * 0.6 + (r() - 0.5) * 9 * (1 - t * 0.7), ny = gy + 170 * (1 - t) + (r() - 0.5) * 3 * (1 - t), nz = b.z + (pz - b.z) * (1 - t) * 0.6 + (r() - 0.5) * 9 * (1 - t * 0.7);
      const fx = i === N ? b.x : nx, fy = i === N ? gy : ny, fz = i === N ? b.z : nz; seg(px, py, pz, fx, fy, fz, 1.0 - 0.4 * t); pts.push([px, py, pz]); px = fx; py = fy; pz = fz; }
    // two forks from the upper half, thinner, that die out in the air
    for (let f = 0; f < 2; f++) { const p0 = pts[3 + Math.floor(r() * 7)]; let x = p0[0], y = p0[1], z = p0[2]; const dx = (r() - 0.5) * 2, dz = (r() - 0.5) * 2;
      for (let i = 0; i < 6; i++) { const nx = x + dx * 7 + (r() - 0.5) * 5, ny = y - 7 - r() * 5, nz = z + dz * 7 + (r() - 0.5) * 5; seg(x, y, z, nx, ny, nz, 0.5 * (1 - i / 7)); x = nx; y = ny; z = nz; } }
    for (; k < NB;) seg(0, -1e4, 0, 0, -1e4, 0, 0);
    boltGeo.attributes.aA.needsUpdate = boltGeo.attributes.aB.needsUpdate = boltGeo.attributes.aS.needsUpdate = true;
  }
  const boltM = (() => {
    const vert = `attribute vec3 aA; attribute vec3 aB; attribute vec2 aS; uniform vec3 uCam; ${VARY} varying float vE;
      void main(){ vec3 p=mix(aA,aB,aS.y); vec3 dir=normalize(aB-aA+vec3(1e-4)); vec3 vv=normalize(uCam-p); vec3 side=normalize(cross(dir,vv)+vec3(1e-5));
        float w=0.55*abs(aS.x)*(0.6+0.004*length(uCam-p)); p+=side*w*sign(aS.x); vW=p; ${VZERO} vE=sign(aS.x);
        gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0); }`;
    const frag = `uniform float uFlash; varying float vE; void main(){ float core=1.0-abs(vE); float a=smoothstep(0.0,0.7,core+0.15);
      gl_FragColor=vec4(vec3(5.0,6.0,9.0)*uFlash*(0.5+core),a*clamp(uFlash*1.6,0.0,1.0)); }`;
    return g.mat(frag, { uniforms: S, vert, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  })();
  const boltMesh = new THREE.Mesh(boltGeo, boltM); boltMesh.frustumCulled = false; boltMesh.visible = false; group.add(noShadow(boltMesh));

  // ---- 5. the rainbow: seven soft additive bands on a half circle that stands on the ground
  const bowU = { uC: { value: new THREE.Vector3() }, uDir: { value: new THREE.Vector2(1, 0) }, uR: { value: 130 }, uBowK: { value: 0 } };
  {
    const NA = 72, pos = [], uv = [], idx = [];
    for (let i = 0; i <= NA; i++) for (let j = 0; j <= 1; j++) { pos.push(0, 0, 0); uv.push(i / NA, j); }
    for (let i = 0; i < NA; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const vert = `uniform vec3 uC; uniform vec2 uDir; uniform float uR; ${VARY} varying vec2 vB;
      void main(){ float th=uv.x*3.14159265, rr=uR+(uv.y-0.5)*9.0*uR/130.0; vec3 p=uC+vec3(uDir.x,0.0,uDir.y)*cos(th)*rr+vec3(0.0,1.0,0.0)*sin(th)*rr;
        vW=p; ${VZERO} vB=uv; gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0); }`;
    const frag = `uniform float uBowK; varying vec2 vB;
      vec3 bands(float t){ // t 0 inside (violet) .. 1 outside (red)
        vec3 c=vec3(0.0); c+=vec3(0.45,0.10,0.75)*smoothstep(0.16,0.0,abs(t-0.07)); c+=vec3(0.15,0.15,0.95)*smoothstep(0.16,0.0,abs(t-0.21));
        c+=vec3(0.05,0.45,0.95)*smoothstep(0.16,0.0,abs(t-0.36)); c+=vec3(0.10,0.85,0.25)*smoothstep(0.16,0.0,abs(t-0.50));
        c+=vec3(0.95,0.90,0.10)*smoothstep(0.16,0.0,abs(t-0.64)); c+=vec3(1.00,0.50,0.05)*smoothstep(0.16,0.0,abs(t-0.79)); c+=vec3(0.95,0.08,0.06)*smoothstep(0.16,0.0,abs(t-0.93)); return c; }
      void main(){ float feet=smoothstep(0.0,0.22,vB.x)*smoothstep(1.0,0.78,vB.x); float edge=smoothstep(0.0,0.12,vB.y)*smoothstep(1.0,0.88,vB.y);
        vec3 c=bands(vB.y)*uBowK*feet*edge*0.42; float fogk=1.0-clamp(length(vW-uCam)/1400.0,0.0,0.7);
        gl_FragColor=vec4(c*fogk,1.0); }`;
    const m = g.mat(frag, { uniforms: bowU, vert, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    var bowMesh = new THREE.Mesh(geo, m); bowMesh.frustumCulled = false; bowMesh.visible = false; group.add(noShadow(bowMesh));
  }

  Math.random = _mathRandom;
  const bowLast = { x: NaN, z: NaN };
  let cx = 0, cz = 0;
  return { group,
    set(s) { const k = clamp(s.k || 0, 0, 1); S.uK.value = k; group.visible = k > 0.001; if (!group.visible) return;
      S.uRain.value = clamp(s.rain || 0, 0, 1); S.uA.value.set(s.ax, s.az); S.uBand.value.set(s.front, s.back); S.uWind.value.set(s.wx || 0, s.wz || 0); S.uFlash.value = clamp(s.flash || 0, 0, 1);
      const cam = g.camera.position; cx = cam.x; cz = cam.z; cOrigin.value.set(cx, cz);
      const b = s.bolt; boltMesh.visible = !!b && S.uFlash.value > 0.001; if (b && (b.seed !== bolt.seed || b.x !== bolt.x || b.z !== bolt.z)) { bolt.seed = b.seed; bolt.x = b.x; bolt.z = b.z; buildBolt(b); }
      const w = s.bow; bowMesh.visible = !!w && w.k > 0.001;
      if (bowMesh.visible) { if (w.x !== bowLast.x || w.z !== bowLast.z) { bowLast.x = w.x; bowLast.z = w.z; bowU.uC.value.set(w.x, g.terrainH(w.x, w.z), w.z); }
        bowU.uDir.value.set(Math.cos(w.yaw), Math.sin(w.yaw)); bowU.uR.value = w.r; bowU.uBowK.value = clamp(w.k, 0, 1) * k; } },
    update(time, dt) { if (!group.visible) return; S.uT.value = time % 1000;
      // splashes: each lives a short moment, then comes back somewhere else near the camera
      for (let i = 0; i < NS; i++) { sLife[i] += dt * 2.6; if (sLife[i] >= 1) { sLife[i] -= 1; const a = rnd() * TAU, r = 1.5 + Math.sqrt(rnd()) * 16, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
          sPos[i * 3] = x; sPos[i * 3 + 1] = g.terrainH(x, z) + 0.05; sPos[i * 3 + 2] = z; }
        sPh[i] = S.uRain.value > 0.02 ? sLife[i] : 0; }
      splashGeo.attributes.position.needsUpdate = splashGeo.attributes.aPh.needsUpdate = true; } };
}
