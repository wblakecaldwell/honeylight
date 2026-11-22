// Honeylight: the bat model (one small bat, big against a bee). Only builds and poses the model; bat.js gives it behavior.
// makeBat(g) returns { group, set(s), update(time) }.
//   s = { x, y, z, yaw, pitch, roll, flap, fold, vis }: yaw 0 = facing +z (Math.atan2(vx, vz)), pitch = nose up, roll = bank (right wing down is +),
//   flap 0..1 = how hard it beats (0 = gliding), fold 0..1 pulls the wings half in (for the dive), vis 0..1 (0 = hidden).
// Draw calls: the furry body, the two wing membranes (one mesh, rebuilt on the CPU every frame into fixed arrays), the finger bones (one mesh, same).
// Fading uses a stable dither. No Math.random, no allocations in set() or update().
// Model frame: +z forward, +y up, +x the bat's left. Wingspan about 9, body about 2.
export function makeBat(g) {
  const { THREE } = g, group = new THREE.Group(), TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const DITHER = `float ditherHash(vec2 p){ p=floor(p); return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }`;
  const vis = { value: 0 };

  // ---- body: furry body, head, big ears, snout, little eyes, legs (one vertex-colored mesh)
  const FUR = [0.30, 0.19, 0.12], BELLY = [0.40, 0.28, 0.18], SKIN = [0.20, 0.12, 0.09], EYE = [0.02, 0.02, 0.02];
  const parts = [
    { g: g.ell(0.42, 0.40, 0.75, 0, 0, 0, 14), c: (x, y) => y < -0.1 ? BELLY : FUR },
    { g: g.ell(0.34, 0.32, 0.32, 0, 0.08, 0.82, 12), c: FUR },
    { g: g.ell(0.16, 0.14, 0.2, 0, 0.0, 1.12, 10), c: SKIN },                              // snout
    { g: g.ell(0.05, 0.05, 0.05, 0.15, 0.17, 1.06, 6), c: EYE }, { g: g.ell(0.05, 0.05, 0.05, -0.15, 0.17, 1.06, 6), c: EYE },
    { g: g.ell(0.06, 0.06, 0.08, 0, -0.18, -0.85, 6), c: SKIN },                           // stub of a tail
  ];
  // big ears: a thin, cupped cone each side, leaning out and a little back
  for (const s of [1, -1]) { const e = new THREE.ConeGeometry(0.2, 0.62, 10, 1, true); e.scale(1, 1, 0.45); e.rotateZ(-0.38 * s); e.rotateX(-0.25); e.translate(0.2 * s, 0.58, 0.72); parts.push({ g: e, c: SKIN }); }
  // legs: they trail back to the membrane at the tail
  for (const s of [1, -1]) parts.push({ g: g.stick([0.25 * s, -0.12, -0.55], [0.55 * s, -0.2, -1.15], 0.05), c: SKIN }, { g: g.ell(0.07, 0.04, 0.1, 0.57 * s, -0.21, -1.2, 6), c: SKIN });
  const bodyGeo = g.geoParts(parts);
  const bodyFrag = `uniform float uVis; ${DITHER}
    void main(){ if(ditherHash(gl_FragCoord.xy)>uVis) discard; vec3 n=NORMAL;
      float fuzz=0.85+0.15*fract(sin(dot(floor(vL*70.0),vec3(12.9,78.2,37.7)))*43758.5);
      vec3 c=shade(vC*fuzz,n,vW,0.05,0.4); vec3 V=normalize(uCam-vW); c+=vC*uSunC*0.25*pow(1.0-abs(dot(n,V)),3.0);
      gl_FragColor=vec4(finish(c,vW),1.0); }`;

  // ---- the wing skeleton, laid out flat for the right (+x) wing in the (x out, z forward) plane, fully open
  const L = { S: [0.38, 0.30], E: [1.45, -0.05], W: [2.35, 0.40], T2: [4.50, 0.15], T3: [3.95, -1.05], T4: [2.95, -1.55], T5: [1.75, -1.30], H: [0.45, -1.15] };
  // membrane panels: two edges that both start at an inner point (u = 0) and go out (u = 1); the outer rim between their ends sags in (scallop)
  const PANELS = [
    { a: ['W', 'T2'], b: ['W', 'T3'], sag: 0.16 },
    { a: ['W', 'T3'], b: ['W', 'T4'], sag: 0.16 },
    { a: ['W', 'T4'], b: ['W', 'T5'], sag: 0.14 },
    { a: ['S', 'E', 'W'], b: ['H', 'T5'], sag: 0.0 },     // the arm panel: from the arm back to the leg-to-finger edge
  ];
  const NU = 7, NV = 6, PV = (NU + 1) * (NV + 1), NP = PANELS.length;
  const mPos = new Float32Array(PV * NP * 2 * 3), mUv = new Float32Array(PV * NP * 2 * 2), mIdx = [];
  for (let side = 0; side < 2; side++) for (let p = 0; p < NP; p++) { const base = (side * NP + p) * PV;
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) { const v = base + i * (NV + 1) + j; mUv[v * 2] = i / NU; mUv[v * 2 + 1] = j / NV + p; }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = base + i * (NV + 1) + j, b = a + NV + 1; side ? mIdx.push(a, a + 1, b, a + 1, b + 1, b) : mIdx.push(a, b, a + 1, a + 1, b, b + 1); } }
  const mGeo = new THREE.BufferGeometry(); mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3)); mGeo.setAttribute('uv', new THREE.BufferAttribute(mUv, 2));
  mGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(mPos.length), 3)); mGeo.setIndex(mIdx);
  // bones: thin boxes (4 sides) along each bone, rebuilt every frame
  const BONES = [['S', 'E', 0.075], ['E', 'W', 0.06], ['W', 'T2', 0.035], ['W', 'T3', 0.03], ['W', 'T4', 0.03], ['W', 'T5', 0.03], ['H', 'T5', 0.0]].filter(b => b[2] > 0);
  const NB = BONES.length * 2, bPos = new Float32Array(NB * 8 * 3), bIdx = [];
  for (let k = 0; k < NB; k++) { const o = k * 8; for (let f = 0; f < 4; f++) { const a = o + f, b = o + (f + 1) % 4; bIdx.push(a, a + 4, b, b, a + 4, b + 4); } }
  const bGeo = new THREE.BufferGeometry(); bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3)); bGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(bPos.length), 3)); bGeo.setIndex(bIdx);

  const memFrag = `uniform float uVis; ${DITHER}
    void main(){ if(ditherHash(gl_FragCoord.xy+vec2(5.0,9.0))>uVis) discard; vec3 n=NORMAL;
      float u=vUv.x, v=fract(vUv.y), panel=floor(vUv.y+0.001);
      float edge=smoothstep(0.75,1.0,u)*(panel<2.5?1.0:0.4);                       // thin outer membrane
      float rib=smoothstep(0.08,0.0,min(v,1.0-v))*step(panel,2.5);                 // near the finger bones the skin is thicker
      vec3 alb=mix(vec3(0.16,0.10,0.07),vec3(0.28,0.17,0.11),edge)*(0.9+0.1*sin(u*40.0+v*7.0));
      alb=mix(alb,vec3(0.12,0.07,0.05),rib*0.5);
      vec3 c=shade(alb,n,vW,0.08,0.6+0.8*edge);
      vec3 V=normalize(uCam-vW); float back=pow(max(dot(-V,uSun),0.0),2.0);        // moonlight through the thin edge
      c+=vec3(0.55,0.32,0.20)*uSunC*back*(0.25+1.2*edge)*(1.0-rib*0.7);
      gl_FragColor=vec4(finish(c,vW),1.0); }`;
  const boneFrag = `uniform float uVis; ${DITHER}
    void main(){ if(ditherHash(gl_FragCoord.xy)>uVis) discard; vec3 c=shade(vec3(0.13,0.08,0.06),NORMAL,vW,0.1,0.2); gl_FragColor=vec4(finish(c,vW),1.0); }`;

  const root = new THREE.Object3D(); root.rotation.order = 'YXZ';
  const body = new THREE.Mesh(bodyGeo, g.mat(bodyFrag, { uniforms: { uVis: vis }, vertexColors: true }));
  const mem = new THREE.Mesh(mGeo, g.mat(memFrag, { uniforms: { uVis: vis }, side: THREE.DoubleSide }));
  const bones = new THREE.Mesh(bGeo, g.mat(boneFrag, { uniforms: { uVis: vis } }));
  mem.frustumCulled = bones.frustumCulled = false;
  root.add(body, mem, bones); root.visible = false; group.add(root); g.scene.add(group);

  // ---- posing: fold pulls the hand in, then each point turns around the body axis. The hand lags the arm a little (a wave along the wing).
  const st = { flap: 0, fold: 0 }, J = {}, P3 = {};
  for (const k in L) { J[k] = [0, 0]; P3[k] = [0, 0, 0]; }
  let arm = 0, hand = 0;
  function layout(fold) { // 2D joint positions with the fold applied
    for (const k in L) { const p = L[k]; let x = p[0], z = p[1];
      if (k !== 'S' && k !== 'H') { const out = clamp((x - 0.4) / 4.1, 0, 1); x = 0.4 + (x - 0.4) * (1 - 0.5 * fold * (0.4 + 0.6 * out)); z = z - fold * 0.6 * out * (k === 'E' ? 0.3 : 1); }
      J[k][0] = x; J[k][1] = z; } }
  function to3(x, z, side, out) { out[0] = 0; // turn around the z axis at the shoulder: the inner part by arm, the hand by hand
    const ang = arm + (hand - arm) * clamp((x - 1.5) / 1.5, 0, 1), dx = x - 0.3, c = Math.cos(ang), s = Math.sin(ang);
    out[0] = (0.3 + dx * c) * side; out[1] = 0.12 + dx * s - 0.04 * x; out[2] = z; return out; }
  const tA = [0, 0, 0], tB = [0, 0, 0], pa = [0, 0], pb = [0, 0];
  const along = (names, u, o) => { const n = names.length - 1, f = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)), t = f - i, A = J[names[i]], B = J[names[i + 1]]; o[0] = A[0] + (B[0] - A[0]) * t; o[1] = A[1] + (B[1] - A[1]) * t; return o; };
  function build() {
    layout(st.fold);
    let v = 0;
    for (let side = 0; side < 2; side++) { const sg = side ? -1 : 1;
      for (let p = 0; p < NP; p++) { const P = PANELS[p];
        for (let i = 0; i <= NU; i++) { const u = i / NU; along(P.a, u, pa); along(P.b, u, pb);
          for (let j = 0; j <= NV; j++) { const w = j / NV; let x = pa[0] + (pb[0] - pa[0]) * w, z = pa[1] + (pb[1] - pa[1]) * w;
            // scallop: the rim between two fingers sags toward the wrist
            const sag = P.sag * Math.sin(Math.PI * w) * u * u * u; x += (J.W[0] - x) * sag; z += (J.W[1] - z) * sag;
            if (p === 3) { const s2 = 0.12 * Math.sin(Math.PI * u) * w; x += (0.9 - x) * s2; z += (-0.4 - z) * s2; } // the arm panel bellies in a little
            to3(x, z, sg, tA); mPos[v * 3] = tA[0]; mPos[v * 3 + 1] = tA[1] - 0.05 * Math.sin(Math.PI * w) * u * st.flap; mPos[v * 3 + 2] = tA[2]; v++; } } } }
    mGeo.attributes.position.needsUpdate = true; mGeo.computeVertexNormals();
    let o = 0;
    for (let side = 0; side < 2; side++) { const sg = side ? -1 : 1;
      for (const [a, b, r] of BONES) { to3(J[a][0], J[a][1], sg, tA); to3(J[b][0], J[b][1], sg, tB);
        const dx = tB[0] - tA[0], dy = tB[1] - tA[1], dz = tB[2] - tA[2], ln = Math.hypot(dx, dy, dz) || 1;
        // two directions across the bone: up-ish and sideways
        let ux = -dy * dz, uy = dx * dz, uz = 0; let ul = Math.hypot(ux, uy, uz); if (ul < 1e-5) { ux = 0; uy = 1; uz = 0; ul = 1; } ux /= ul; uy /= ul; uz /= ul;
        const sx = (dy * uz - dz * uy) / ln, sy = (dz * ux - dx * uz) / ln, sz = (dx * uy - dy * ux) / ln;
        for (let e = 0; e < 2; e++) { const q = e ? tB : tA, rr = r * (e ? 0.6 : 1);
          for (let f = 0; f < 4; f++) { const ca = f === 0 ? 1 : f === 2 ? -1 : 0, sa = f === 1 ? 1 : f === 3 ? -1 : 0, k = (o + e * 4 + f) * 3;
            bPos[k] = q[0] + (ux * ca + sx * sa) * rr; bPos[k + 1] = q[1] + (uy * ca + sy * sa) * rr; bPos[k + 2] = q[2] + (uz * ca + sz * sa) * rr; } }
        o += 8; } }
    bGeo.attributes.position.needsUpdate = true; bGeo.computeVertexNormals();
  }
  build();

  return { group,
    set(s) { const v = clamp(s.vis === undefined ? 1 : s.vis, 0, 1); vis.value = v; root.visible = v > 0.01; if (!root.visible) return;
      root.position.set(s.x, s.y, s.z); root.rotation.set(-(s.pitch || 0), s.yaw || 0, -(s.roll || 0));
      st.flap = clamp(s.flap || 0, 0, 1); st.fold = clamp(s.fold || 0, 0, 1); },
    update(time) { if (!root.visible) return;
      // about 5 beats each second at flap 1. Gliding: wings held out with a slight lift (dihedral) and a slow ripple.
      const ph = time * TAU * 5, beat = Math.sin(ph), f = st.flap;
      arm = 0.12 + 0.02 * Math.sin(time * 2.1) + f * 0.75 * beat - st.fold * 0.25;
      hand = arm + f * 0.35 * Math.sin(ph - 0.9) + 0.06 * (1 - f) + st.fold * 0.45;
      build(); } };
}
