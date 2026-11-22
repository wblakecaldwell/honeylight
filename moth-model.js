// Honeylight: hawk moth models (the night visitors of the moonflowers). Only builds and poses models; moths.js gives them behavior.
// makeMoths(g, count) returns { group, set(i, s), update(time) }.
//   s = { x, y, z, yaw, pitch, flap, drink, vis }: yaw 0 = facing +z (Math.atan2(vx, vz)), pitch = nose up, flap 0..1 (1 = a fast blur of wingbeats,
//   0 = wings held half open, slow breathing), drink 0..1 (the proboscis unrolls forward and a little down), vis 0..1 (0 = hidden).
// Three draw calls for each moth: the furry body, the four wings (one mesh, bent in the vertex shader), the proboscis (rebuilt only when drink changes).
// Fading uses a stable dither (no transparency sorting); only the beating wings are see-through. No Math.random, no allocations in set() or update().
// Model frame: +z forward, +y up. Body about 1.6 long, wingspan about 3.5 (2.2 x the body).
export function makeMoths(g, count) {
  const { THREE } = g, group = new THREE.Group(), items = [], TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const DITHER = `float ditherHash(vec2 p){ p=floor(p); return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }`;

  // ---- body: thorax, head, eyes, abdomen with soft bands, legs, antennae (one vertex-colored mesh)
  const CREAM = [0.76, 0.70, 0.61], DOVE = [0.54, 0.51, 0.49], PINK = [0.84, 0.56, 0.58], DARK = [0.06, 0.05, 0.06], LEG = [0.55, 0.50, 0.46];
  const bodyParts = [
    { g: g.ell(0.31, 0.29, 0.38, 0, 0.0, 0.18, 14), c: (x, y, z) => y > 0.14 ? DOVE : CREAM },             // a thick, furry thorax with a darker saddle
    { g: g.ell(0.30, 0.27, 0.14, 0, 0.03, 0.42, 12), c: CREAM },                                          // the fur collar
    { g: g.ell(0.15, 0.14, 0.14, 0, -0.01, 0.56, 10), c: CREAM },                                         // a small head
    { g: g.ell(0.055, 0.06, 0.055, 0.10, 0.01, 0.62, 8), c: DARK },                                       // small dark bead eyes
    { g: g.ell(0.055, 0.06, 0.055, -0.10, 0.01, 0.62, 8), c: DARK },
    { g: g.ell(0.07, 0.06, 0.05, 0, -0.08, 0.66, 6), c: DOVE },                                           // the palps over the coiled tongue
  ];
  // a long abdomen that tapers to a point: overlapping rings, with pink and dark bands on the sides
  for (let k = 0; k < 7; k++) { const t = k / 6, z = -0.12 - t * 1.05, r = 0.25 * (1 - t * 0.78), band = k % 2;
    bodyParts.push({ g: g.ell(r, r * 0.9, 0.2 - t * 0.05, 0, -0.03 - t * 0.04, z, 12), c: (x, y) => { const side = Math.abs(x) > r * 0.45 && y < 0.04 + r * 0.25;
      if (side) return band ? [0.18, 0.15, 0.16] : PINK; return y > r * 0.55 ? DOVE : CREAM; } }); }
  bodyParts.push({ g: g.ell(0.04, 0.035, 0.12, 0, -0.1, -1.3, 6), c: DOVE });                              // the pointed tip
  // short, feathery antennae held forward
  for (const s of [1, -1]) { const a = [0.06 * s, 0.08, 0.64], b = [0.2 * s, 0.2, 0.92]; bodyParts.push({ g: g.stick(a, b, 0.016), c: CREAM });
    for (let k = 1; k <= 5; k++) { const t = k / 6, m = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      bodyParts.push({ g: g.stick(m, [m[0] + 0.05 * s, m[1] + 0.02, m[2] - 0.03], 0.008), c: CREAM }, { g: g.stick(m, [m[0] - 0.03 * s, m[1] + 0.04, m[2] - 0.03], 0.008), c: CREAM }); } }
  for (const s of [1, -1]) for (let k = 0; k < 3; k++) { const z = 0.34 - k * 0.14, a = [0.12 * s, -0.18, z], b = [0.30 * s, -0.36, z + 0.1 - k * 0.12], c = [0.36 * s, -0.52, z + 0.02 - k * 0.2];
    bodyParts.push({ g: g.stick(a, b, 0.025), c: LEG }, { g: g.stick(b, c, 0.02), c: LEG }); }
  const bodyGeo = g.geoParts(bodyParts);
  const bodyFrag = `uniform float uVis; ${DITHER}
    void main(){ if(ditherHash(gl_FragCoord.xy)>uVis) discard; vec3 n=NORMAL;
      float fuzz=0.88+0.12*fract(sin(dot(floor(vL*90.0),vec3(12.9,78.2,37.7)))*43758.5);   // fine fur grain
      vec3 c=shade(vC*fuzz,n,vW,0.04,0.7);
      vec3 V=normalize(uCam-vW); c+=vC*uSunC*0.2*pow(1.0-abs(dot(n,V)),3.0);           // soft fur rim in the moonlight
      gl_FragColor=vec4(finish(c,vW),1.0); }`;

  // ---- wings: forewings narrow and swept, hindwings small and round. aW = (side +1/-1, 0 fore / 1 hind).
  function wingGeo() {
    const pos = [], aw = [], idx = [];
    const add = (outline, side, hind) => { const base = pos.length / 3, c = outline.reduce((s, p) => [s[0] + p[0] / outline.length, s[1] + p[1] / outline.length], [0, 0]);
      pos.push(c[0] * side, 0, c[1]); aw.push(side, hind); outline.forEach(p => { pos.push(p[0] * side, 0, p[1]); aw.push(side, hind); });
      for (let i = 0; i < outline.length; i++) idx.push(base, base + 1 + i, base + 1 + (i + 1) % outline.length); };
    const fore = [], hind = [];
    // forewing: a long, broad, swept triangle. Leading edge to the pointed tip, the slanted outer edge, the inner edge back to the body.
    for (let i = 0; i <= 12; i++) { const t = i / 12; fore.push([0.18 + 1.70 * t, 0.40 - 0.58 * t * t + 0.05 * Math.sin(Math.PI * t)]); }
    for (let i = 1; i <= 7; i++) { const t = i / 7; fore.push([1.88 - 0.62 * t, -0.18 - 0.50 * t + 0.10 * Math.sin(Math.PI * t)]); }
    for (let i = 1; i <= 6; i++) { const t = i / 6; fore.push([1.26 - 1.08 * t, -0.68 + 0.56 * t - 0.06 * Math.sin(Math.PI * t)]); }
    // hindwing: half as long, rounded, tucked under the forewing
    for (let i = 0; i <= 10; i++) { const a = -0.15 - 1.75 * i / 10; hind.push([0.16 + 0.80 * Math.cos(a) * (0.78 + 0.22 * Math.sin(i / 10 * Math.PI)), -0.1 + 0.5 * Math.sin(a)]); }
    hind.push([0.16, -0.1]);
    for (const s of [1, -1]) { add(hind, s, 1); add(fore, s, 0); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((v, i) => i % 3 === 1 ? 1 : 0), 3)); geo.setAttribute('aW', new THREE.Float32BufferAttribute(aw, 2)); geo.setIndex(idx); return geo;
  }
  const WGEO = wingGeo();
  // the wing hinge is at |x| = 0.16; uFore / uHind = (lift angle, sweep angle). The rest of the vertex shader matches the game's VERT.
  const wingVert = `attribute vec2 aW; uniform vec2 uFore; uniform vec2 uHind;
    varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv; varying vec3 vL;
    void main(){ vec2 an=mix(uFore,uHind,aW.y); float s=aW.x; vec3 p=position; vec3 n=normal;
      float h=0.16*s; float cs=cos(an.y), sn=sin(an.y);                                          // sweep: turn in the wing plane around the shoulder
      vec2 q=vec2(p.x-h,p.z-0.18); q=vec2(q.x*cs - q.y*sn*s, q.x*sn*s + q.y*cs); p.x=h+q.x; p.z=0.18+q.y;
      float cl=cos(an.x), sl=sin(an.x);                                                            // lift: turn around the body axis
      float dx=p.x-h; p.x=h+dx*cl; p.y=p.y+abs(dx)*sl+aW.y*-0.03; n=vec3(-s*sl,cl,0.0);
      vec4 w=modelMatrix*vec4(p,1.0); vW=w.xyz; vL=position; vN=normalize(mat3(modelMatrix)*n); vUv=aW; vC=vec3(1.0);
      gl_Position=projectionMatrix*viewMatrix*w; }`;
  const wingFrag = `uniform float uVis; uniform float uBlur; ${DITHER}
    void main(){ if(ditherHash(gl_FragCoord.xy+vec2(7.0,3.0))>uVis) discard; vec3 n=NORMAL;
      float x=abs(vL.x), z=vL.z; vec3 alb;
      if(vUv.y<0.5){ // forewing: dove grey with a darker slanting band, a pale spot and a soft pale edge
        alb=vec3(0.62,0.59,0.56); float band=smoothstep(0.07,0.0,abs(z+0.5*(x-0.2)-0.10+0.02*sin(x*20.0)));
        float band2=smoothstep(0.05,0.0,abs(z+0.32*(x-0.2)-0.32)); alb=mix(alb,vec3(0.40,0.37,0.36),max(band,band2*0.7));
        alb=mix(alb,vec3(0.86,0.82,0.76),smoothstep(0.06,0.0,length(vec2(x-0.85,z+0.10))-0.03));
        alb*=0.92+0.08*sin(x*40.0+z*12.0);
      } else { // hindwing: dusty pink with a dark grey border
        float r=length(vec2(x-0.16,z+0.1)); alb=mix(vec3(0.88,0.58,0.60),vec3(0.30,0.27,0.28),smoothstep(0.42,0.56,r));
      }
      vec3 c=shade(alb,n,vW,0.06,0.9);
      gl_FragColor=vec4(finish(c,vW),1.0-0.55*uBlur); }`; // a beating wing is a soft, see-through blur

  // ---- proboscis: a thin tube, coiled under the head, unrolled forward when drinking (rebuilt only when drink changes)
  const PN = 20, PR = 5;
  function fillProb(geo, d) {
    const P = geo.attributes.position.array, N = geo.attributes.normal.array, len = 1.6;
    for (let i = 0; i <= PN; i++) { const t = i / PN;
      // coiled: a spiral under the head. Unrolled: a gentle arc forward and down.
      const a = t * (1 - d) * 5.5 * Math.PI, rC = 0.10 * (1 - t * 0.6);
      const cy = -0.12 - rC * (1 - Math.cos(a)), cz = 0.72 + rC * Math.sin(a);
      const uy = -0.10 - len * t * 0.28 - 0.25 * t * t * len * 0.3, uz = 0.74 + len * t * 0.95;
      const y = cy + (uy - cy) * d, z = cz + (uz - cz) * d;
      // tube direction from the next point
      const t2 = Math.min(1, t + 1 / PN), a2 = t2 * (1 - d) * 5.5 * Math.PI, r2 = 0.10 * (1 - t2 * 0.6);
      const y2 = (-0.12 - r2 * (1 - Math.cos(a2))) * (1 - d) + (-0.10 - len * t2 * 0.28 - 0.25 * t2 * t2 * len * 0.3) * d, z2 = (0.72 + r2 * Math.sin(a2)) * (1 - d) + (0.74 + len * t2 * 0.95) * d;
      let ty = y2 - y, tz = z2 - z; const L = Math.hypot(ty, tz) || 1; ty /= L; tz /= L; if (i === PN) { ty = -0.28; tz = 0.96; }
      const rad = 0.022 * (1 - t * 0.5);
      for (let k = 0; k < PR; k++) { const q = k / PR * TAU, cx = Math.cos(q), sx = Math.sin(q), v = (i * PR + k) * 3;
        // ring around the tube: x axis and the in-plane normal (-tz, ty)
        const nx = cx, ny = -tz * sx, nz = ty * sx; P[v] = nx * rad; P[v + 1] = y + ny * rad; P[v + 2] = z + nz * rad; N[v] = nx; N[v + 1] = ny; N[v + 2] = nz; } }
    geo.attributes.position.needsUpdate = geo.attributes.normal.needsUpdate = true; geo.computeBoundingSphere();
  }
  function probGeo() { const geo = new THREE.BufferGeometry(), n = (PN + 1) * PR, idx = [];
    for (let i = 0; i < PN; i++) for (let k = 0; k < PR; k++) { const a = i * PR + k, b = i * PR + (k + 1) % PR; idx.push(a, a + PR, b, b, a + PR, b + PR); }
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); geo.setIndex(idx); return geo; }
  const probFrag = `uniform float uVis; ${DITHER}
    void main(){ if(ditherHash(gl_FragCoord.xy)>uVis) discard; vec3 c=shade(vec3(0.35,0.28,0.24),NORMAL,vW,0.2,0.2); gl_FragColor=vec4(finish(c,vW),1.0); }`;

  for (let i = 0; i < count; i++) {
    const root = new THREE.Object3D(); root.rotation.order = 'YXZ';
    const vis = { value: 0 };
    const bm = g.mat(bodyFrag, { uniforms: { uVis: vis }, vertexColors: true });
    const wm = g.mat(wingFrag, { uniforms: { uVis: vis, uBlur: { value: 0 }, uFore: { value: new THREE.Vector2(0.3, -0.5) }, uHind: { value: new THREE.Vector2(0.25, -0.3) } }, vert: wingVert, side: THREE.DoubleSide, transparent: true });
    const pm = g.mat(probFrag, { uniforms: { uVis: vis } });
    const body = new THREE.Mesh(bodyGeo, bm), wings = new THREE.Mesh(WGEO, wm), pg = probGeo(), prob = new THREE.Mesh(pg, pm);
    wings.frustumCulled = false; fillProb(pg, 0);
    root.add(body, wings, prob); root.visible = false; group.add(root);
    items.push({ root, vis, wm, pg, flap: 0, drink: 0, ph: i * 1.7 + 0.4 });
  }
  g.scene.add(group);

  return { group,
    set(i, s) { const it = items[i]; if (!it) return; const v = clamp(s.vis === undefined ? 1 : s.vis, 0, 1);
      it.vis.value = v; it.root.visible = v > 0.01; if (!it.root.visible) return;
      it.root.position.set(s.x, s.y, s.z); it.root.rotation.set(-(s.pitch || 0), s.yaw || 0, 0);
      it.flap = clamp(s.flap || 0, 0, 1); const d = clamp(s.drink || 0, 0, 1);
      if (Math.abs(d - it.drink) > 0.01 || (d !== it.drink && (d === 0 || d === 1))) { fillProb(it.pg, d); it.drink = d; } },
    update(time) {
      for (const it of items) { if (!it.root.visible) continue; const f = it.flap, u = it.wm.uniforms;
        // hovering: a fast stroke (about 9 beats each second here, read as a blur); resting: wings half open, swept back, slow breathing
        const beat = Math.sin(time * TAU * 9 + it.ph), breathe = Math.sin(time * 1.4 + it.ph) * 0.05;
        const lift = (0.12 + breathe) * (1 - f) + (0.15 + 0.85 * beat) * f, sweep = -0.85 * (1 - f) + (-0.05 + 0.25 * beat) * f;
        u.uFore.value.set(lift, sweep); u.uHind.value.set(lift * 0.85 - 0.05, sweep * 0.7 - 0.15 * (1 - f)); u.uBlur.value = f; } } };
}
