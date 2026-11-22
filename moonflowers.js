// Honeylight: moonflower models (Ipomoea alba). Used only by night.js.
// makeMoonflowers(g, MF) builds one model for each entry of MF and returns { group, setOpen(i, open, glow), update(time) }.
// MF[i] = { x, z, y, r, len, tilt, stem, grove, val }: y is the height of the bloom base (world), stem is the stem length down to the ground,
// r is the radius of the centre dome, len is the petal length, tilt is the petal angle above flat (radians).
// The collision shape in the game is a shallow cup: centre dome (radius r, height r/2), petals from 0.75 r out to 0.75 r + 0.85 len,
// rim about len * (sin(tilt + 0.08) + 0.24) high. Under the bloom, the game treats everything down to y - 1.4 as the bloom and below that a stem.
//
// Each flower is two draw calls:
//   bloom  : one sheet (the fused corolla). Its shape is rebuilt on the CPU only when the open value changes.
//            Closed it is a slim, twisted, pointed bud; opening untwists it, swells it into a cup, then spreads it into a wide flat trumpet
//            that follows the collision profile. A pale green five-point star of creases runs from the throat to the five points.
//   greens : the twining stem, the long corolla tube, the calyx and two heart-shaped leaves, merged into one mesh with vertex colors.
// Glow: cool blue-white light from the throat and the creases, strength open * glow. No halo here (night.js draws one).
// No Math.random: a small seeded generator per flower.
export function makeMoonflowers(g, MF) {
  const { THREE } = g, group = new THREE.Group(), items = [];
  const NU = 22, NA = 80, TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const seeded = (n) => { let s = (n * 2654435761 + 12345) >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  // ---- the corolla shader: albedo, star creases, throat, glow
  const bloomFrag = `uniform float uGlowK; uniform float uOpen; uniform float uGrove;
    void main(){ vec3 n=NORMAL; float u=vUv.x, a=vUv.y*6.2831853;
      float spread=smoothstep(0.15,1.0,uOpen);
      float cr=abs(cos(a*2.5));                                   // 1 on the five creases
      float crease=smoothstep(0.988-0.012*u,1.0,cr)*smoothstep(0.06,0.3,u)*(1.0-0.5*smoothstep(0.8,1.0,u));
      float throat=1.0-smoothstep(0.08,0.24,u), deep=1.0-smoothstep(0.0,0.12,u);
      vec3 white=vec3(0.93,0.95,0.97);
      vec3 alb=mix(white*(0.86+0.14*u), vec3(0.78,0.86,0.45), throat);            // green-yellow throat
      alb=mix(alb, vec3(0.74,0.88,0.62), crease*0.75);             // pale green star
      alb*=0.94+0.06*sin(a*30.0+u*3.0);                             // fine pleats
      alb=mix(alb, vec3(0.78,0.64,1.0), uGrove*smoothstep(0.55,1.0,u)*0.85); // lilac edge on the grove flowers
      float fold=smoothstep(0.6,1.0,abs(cos(a*2.5)));
      alb=mix(mix(vec3(0.58,0.74,0.44),vec3(0.86,0.90,0.78),fold), alb, smoothstep(0.0,0.8,spread)); // the bud: pale green with white folds // the bud is pale green-white
      vec3 c=shade(alb,n,vW,0.10,0.85);
      float gk=uGlowK*(deep*1.4+throat*0.5+crease*0.45+0.06+0.05*uGrove);
      c+=vec3(0.36,0.58,1.0)*gk*(0.6+0.4*spread);
      gl_FragColor=vec4(finish(c,vW),1.0); }`;
  const greenM = g.simple('1.0,1.0,1.0', 0.06, 0.45, { vertexColors: true, side: THREE.DoubleSide });

  // ---- corolla shape. u: 0 throat .. 1 rim, a: angle. Returns [x, y, z] in the flower's local frame (origin = bloom base).
  function shapeFn(f, k, rot) {
    const Rv = f.r * 0.75 + f.len * 0.85, domeR = f.r, domeH = f.r * 0.5 * 0.8, sT = Math.sin(f.tilt + 0.08);
    const pet = d => { const x = clamp((d - f.r * 0.75) / f.len, 0, 1); return d > f.r * 0.75 ? (x * sT + 0.24 * x * x) * f.len : 0; };
    const dome = d => d < domeR ? domeH * Math.sqrt(1 - (d / domeR) ** 2) : 0;
    const smax = (p, q, s) => { const h = clamp(0.5 + 0.5 * (p - q) / s, 0, 1); return q + (p - q) * h + s * h * (1 - h); };
    const twistK = 1 - smooth(0.0, 0.6, k), spread = smooth(0.15, 1.0, k), swell = Math.sin(Math.PI * clamp((k - 0.05) / 0.85, 0, 1));
    const Hb = f.len * 0.9 + 0.5;
    return (u, a) => {
      const cr = Math.abs(Math.cos(a * 2.5));
      // bud: a pointed spindle with five spiral folds
      const tw = twistK * (2.6 * u + 0.4) + rot;
      let rb = (0.24 + 0.36 * Math.sin(Math.min(1, u * 1.35) * Math.PI / 2)) * Math.pow(1 - u, 0.85);
      rb *= 1 + 0.32 * Math.pow(Math.abs(Math.cos(2.5 * a)), 3) * (1 - u * 0.4) - 0.12;
      const yb = u * Hb;
      // open: the collision profile, points at the creases, small scallops between them, raised crease ribs
      const d = u * Rv * (0.92 + 0.08 * cr * cr * cr);
      let yo = smax(dome(d), pet(d), 0.25) + 0.06 * f.len * Math.pow(cr, 6) * u - 0.07 * f.len * Math.pow(u, 4) * (1 - cr * cr);
      // the mix: polar blend, plus a cup-shaped swell half way
      const rad = rb + (d - rb) * spread + swell * 0.22 * Rv * Math.sin(Math.PI * u) * (1 - spread * 0.6);
      const y = yb + (yo - yb) * spread + swell * 0.25 * f.len * u * (1 - spread);
      const ang = a + tw * (1 - spread * 0.3) - rot * spread;
      return [Math.cos(ang) * rad, y, Math.sin(ang) * rad];
    };
  }
  function buildBloomGeo() {
    const geo = new THREE.BufferGeometry(), n = (NU + 1) * (NA + 1);
    const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = [];
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NA; j++) { const v = i * (NA + 1) + j; uv[v * 2] = i / NU; uv[v * 2 + 1] = j / NA; }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + NA + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx); return geo;
  }
  function fillBloom(it, k) {
    const f = it.f, geo = it.bloom.geometry, P = geo.attributes.position.array, S = shapeFn(f, k, it.rot);
    for (let i = 0; i <= NU; i++) { const u = i / NU; for (let j = 0; j <= NA; j++) { const p = S(u, j / NA * TAU), v = (i * (NA + 1) + j) * 3; P[v] = p[0]; P[v + 1] = p[1]; P[v + 2] = p[2]; } }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
    // weld the seam normals (first and last column are the same place)
    const N = geo.attributes.normal.array;
    for (let i = 0; i <= NU; i++) { const a = i * (NA + 1) * 3, b = (i * (NA + 1) + NA) * 3; for (let c = 0; c < 3; c++) { const m = (N[a + c] + N[b + c]) / 2; N[a + c] = N[b + c] = m; } }
    geo.computeBoundingSphere();
  }

  // ---- greens: simple geometry builders that write into shared arrays
  function Greens() { this.p = []; this.n = []; this.c = []; this.i = []; }
  Greens.prototype.tube = function (pts, radius, col, seg = 6) { // pts: [x,y,z][], radius(t), col(t) -> [r,g,b]
    const base = this.p.length / 3, up = new THREE.Vector3(), T = new THREE.Vector3(), Nn = new THREE.Vector3(), B = new THREE.Vector3();
    for (let k = 0; k < pts.length; k++) { const t = k / (pts.length - 1), a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      T.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize(); up.set(Math.abs(T.y) > 0.9 ? 1 : 0, Math.abs(T.y) > 0.9 ? 0 : 1, 0);
      Nn.crossVectors(T, up).normalize(); B.crossVectors(T, Nn); const r = radius(t), cl = col(t);
      for (let s = 0; s <= seg; s++) { const q = s / seg * TAU, cx = Math.cos(q), sx = Math.sin(q), nx = Nn.x * cx + B.x * sx, ny = Nn.y * cx + B.y * sx, nz = Nn.z * cx + B.z * sx;
        this.p.push(pts[k][0] + nx * r, pts[k][1] + ny * r, pts[k][2] + nz * r); this.n.push(nx, ny, nz); this.c.push(...cl); } }
    for (let k = 0; k < pts.length - 1; k++) for (let s = 0; s < seg; s++) { const a = base + k * (seg + 1) + s, b = a + seg + 1; this.i.push(a, b, a + 1, a + 1, b, b + 1); }
  };
  // a heart-shaped leaf: grid over (s along the midrib 0..1, w across -1..1), folded a little along the midrib and curled down at the tip
  Greens.prototype.leaf = function (o, dir, size, droop, col) {
    const base = this.p.length / 3, NS = 8, NW = 6, side = new THREE.Vector3(-dir.z, 0, dir.x).normalize(), fw = new THREE.Vector3(dir.x, 0, dir.z).normalize();
    const pts = [];
    for (let a = 0; a <= NS; a++) { const s = a / NS;
      // heart outline: half width along the midrib, with the two round lobes at the base and a pointed tip
      const hw = size * 0.62 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.05 + 0.12)), 0.8) * (1 - 0.15 * s);
      for (let b = 0; b <= NW; b++) { const w = b / NW * 2 - 1, aw = Math.abs(w);
        const along = s * size - 0.28 * size * (1 - s) * aw * aw; // the lobes reach back past the stalk
        const up = 0.12 * size * aw - droop * size * s * s;
        const x = o[0] + fw.x * along + side.x * w * hw, z = o[2] + fw.z * along + side.z * w * hw, y = o[1] + up;
        pts.push([x, y, z]); const vein = 1 - Math.min(1, aw * 6) * 0.12, shade = 0.85 + 0.15 * s;
        this.c.push(col[0] * vein * shade, col[1] * vein * shade, col[2] * vein * shade); } }
    for (const p of pts) { this.p.push(...p); this.n.push(0, 1, 0); }
    for (let a = 0; a < NS; a++) for (let b = 0; b < NW; b++) { const i0 = base + a * (NW + 1) + b, i1 = i0 + NW + 1; this.i.push(i0, i1, i0 + 1, i0 + 1, i1, i1 + 1); }
    // proper normals for the leaf grid
    for (let a = 0; a <= NS; a++) for (let b = 0; b <= NW; b++) { const P = (aa, bb) => pts[clamp(aa, 0, NS) * (NW + 1) + clamp(bb, 0, NW)];
      const du = P(a + 1, b).map((v, k) => v - P(a - 1, b)[k]), dv = P(a, b + 1).map((v, k) => v - P(a, b - 1)[k]);
      const nx = du[1] * dv[2] - du[2] * dv[1], ny = du[2] * dv[0] - du[0] * dv[2], nz = du[0] * dv[1] - du[1] * dv[0], L = Math.hypot(nx, ny, nz) || 1, s = ny < 0 ? -1 : 1;
      const v = (base + a * (NW + 1) + b) * 3; this.n[v] = s * nx / L; this.n[v + 1] = s * ny / L; this.n[v + 2] = s * nz / L; }
  };
  Greens.prototype.geo = function () { const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); geo.setIndex(this.i); geo.computeBoundingSphere(); return geo; };

  const STEM = [0.20, 0.34, 0.12], TUBE0 = [0.62, 0.74, 0.48], TUBE1 = [0.86, 0.90, 0.76], LEAF = [0.16, 0.38, 0.12], SEPAL = [0.22, 0.40, 0.14];
  MF.forEach((f, i) => {
    const R = seeded(i + 1), gr = new Greens(), gy = f.y - f.stem, bot = f.y - 1.4;
    // the stem: a slim vine from the ground to the calyx, a gentle lean that comes back under the bloom (the game's stem is straight)
    const lean = R() * TAU, lx = Math.cos(lean), lz = Math.sin(lean), H = bot - gy, sp = [];
    for (let k = 0; k <= 12; k++) { const t = k / 12, off = Math.sin(Math.PI * t) * 0.14 + Math.sin(t * 9 + i) * 0.03 * (1 - t); sp.push([lx * off, gy - f.y + H * t, lz * off]); }
    gr.tube(sp, t => 0.13 - 0.04 * t, () => STEM, 6);
    // a thin twining tendril around the stem
    const tw = []; const ph = R() * TAU; for (let k = 0; k <= 28; k++) { const t = k / 28, a = ph + t * 3.2 * TAU, rr = 0.2 + 0.03 * Math.sin(t * 7); tw.push([sp[0][0] + Math.cos(a) * rr + lx * Math.sin(Math.PI * t) * 0.14, sp[0][1] + H * (0.08 + t * 0.6), sp[0][2] + Math.sin(a) * rr + lz * Math.sin(Math.PI * t) * 0.14]); }
    gr.tube(tw, () => 0.035, () => [STEM[0] * 1.1, STEM[1] * 1.1, STEM[2]], 4);
    // the long corolla tube: from the calyx up to the bloom base, flaring at the top
    const tp = []; for (let k = 0; k <= 6; k++) { const t = k / 6; tp.push([0, -1.4 + 1.4 * t, 0]); }
    gr.tube(tp, t => 0.11 + 0.2 * Math.pow(t, 2.2), t => TUBE0.map((c, k) => c + (TUBE1[k] - c) * t), 8);
    // the calyx: five small pointed sepals hugging the bottom of the tube
    for (let s = 0; s < 5; s++) { const a = s / 5 * TAU + R(), pts = []; for (let k = 0; k <= 3; k++) { const t = k / 3; pts.push([Math.cos(a) * (0.12 + 0.08 * Math.sin(Math.PI * t)), -1.55 + 0.5 * t, Math.sin(a) * (0.12 + 0.08 * Math.sin(Math.PI * t))]); }
      gr.tube(pts, t => 0.06 * (1 - t) + 0.008, () => SEPAL, 3); }
    // two heart-shaped leaves on short stalks
    for (let l = 0; l < 2; l++) { const t = 0.5 + 0.25 * l + R() * 0.06, a = lean + Math.PI * (0.6 + l * 0.9) + R() * 0.5, k = Math.round(t * 12), o = sp[k];
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), stalk = 0.55 + R() * 0.3, sz = f.len * (0.55 + R() * 0.12) * (f.grove ? 0.85 : 1);
      const end = [o[0] + dir.x * stalk, o[1] + 0.25, o[2] + dir.z * stalk]; gr.tube([o, [o[0] + dir.x * stalk * 0.5, o[1] + 0.2, o[2] + dir.z * stalk * 0.5], end], () => 0.04, () => STEM, 4);
      gr.leaf(end, dir, sz, 0.28, LEAF); }
    const greens = new THREE.Mesh(gr.geo(), greenM); greens.position.set(f.x, f.y, f.z);
    const m = g.mat(bloomFrag, { uniforms: { uGlowK: { value: 0 }, uOpen: { value: 0 }, uGrove: { value: f.grove ? 1 : 0 } }, side: THREE.DoubleSide });
    const bloom = new THREE.Mesh(buildBloomGeo(), m); bloom.position.set(f.x, f.y, f.z); bloom.frustumCulled = true;
    const it = { f, bloom, m, k: -1, rot: R() * TAU }; fillBloom(it, 0); it.k = 0;
    group.add(bloom, greens); items.push(it);
  });
  g.scene.add(group);
  return { group,
    setOpen(i, k, glow = 1) { const it = items[i]; k = clamp(k, 0, 1);
      if (Math.abs(k - it.k) > 0.004 || (k !== it.k && (k === 0 || k === 1))) { fillBloom(it, k); it.k = k; }
      it.m.uniforms.uOpen.value = k; it.m.uniforms.uGlowK.value = k * glow; },
    update(time) { } };
}
