// Honeylight: the ground, pond, orchard, hedge, log, forest edge, brook, branches and the bramble hollow.
import * as THREE from '../three.module.min.js';
import { M4, Q4, V3, rnd, clamp, lerp, TAU } from './core.js';
import { POND, WY, srnd, HEDGE_GAP_W, HEDGE_R, ORCH, HEDGE_GAPS, HEDGE_TUN, inHedgeGap, BROOK, HOLLOW, brookSeg,
  brookD, terrainH, terrainBase, hollowRootD, LOG, orchTrees, FOREST, forestTrees, PADS0 } from './world.js';
import { scene, camera, untoneHex, MP, cloverGLSL, mat, simple, geoParts, ell, parts, pNext, puff } from './engine.js';
import { barkMat } from './hive.js';
import { _v, YA } from './bees.js';
import { flowers, leafShell, crownLimbs, addFringe } from './plants.js';
import { WIND, _aC1, _aC2, _aN, segSeg } from './air.js';
import { P, PR } from './player.js';
import { webs, WEB_FRAG } from './hazards.js';
import { G, toast } from './progress.js';
import { noiseHit } from './audio.js';
import { inHive, time } from './loop.js';

// ---------- outside: ground, tree, grass, flowers, pond ----------
export function setupGround() {
  {
    const g = new THREE.PlaneGeometry(1300, 1300, 150, 150); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, terrainH(p.getX(i), p.getZ(i))); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, mat(`void main(){ vec3 n=NORMAL; float a=fbm(vW.xz*0.035), b=fbm(vW.xz*0.4);
    vec3 alb=mix(vec3(0.06,0.17,0.03),vec3(0.26,0.40,0.07),a)*(0.7+0.6*b);
    alb=mix(alb,vec3(0.30,0.22,0.11),smoothstep(0.55,0.75,fbm(vW.xz*0.09+9.0))*0.5);
    alb=mix(alb,vec3(0.24,0.20,0.12)*(0.6+0.6*b),smoothstep(${(WY + 2.6).toFixed(1)},${(WY + 0.2).toFixed(1)},vW.y));
    alb*=mix(1.0,0.35,smoothstep(${WY.toFixed(1)},${(WY - 5).toFixed(1)},vW.y));${MP ? cloverGLSL() : ''}
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.0,0.0),vW),1.0); }`)));
  }
}

// pond
export const pads = [];

export let fish;
export function setupPond() {
  {
    const w = new THREE.Mesh(new THREE.CircleGeometry(POND.r + 30, 64), mat(`void main(){ vec3 V=normalize(uCam-vW); vec2 q=vW.xz*0.16;
    float w1=fbm(q+uTime*0.09), w2=fbm(q*1.9-uTime*0.07+4.0);
    vec3 n=normalize(vec3((w1-0.5)*0.55,1.0,(w2-0.5)*0.55)); if(V.y<0.0) n.y=-n.y;
    float fr=pow(1.0-max(dot(n,V),0.0),3.0);
    vec3 R=reflect(-V,n); vec3 sk=mix(hazeCol(R),vec3(0.07,0.17,0.46),pow(clamp(R.y,0.0,1.0),0.5));
    vec3 c=mix(vec3(0.015,0.07,0.06),sk,0.08+0.92*fr);
    c+=vec3(4.0,2.6,1.3)*pow(max(dot(R,uSun),0.0),180.0)*4.0+vec3(1.2,0.7,0.3)*pow(max(dot(R,uSun),0.0),12.0)*0.4*fr;
    c+=vec3(1.2,1.1,0.9)*step(0.992,vnoise(vW.xz*2.2+uTime*0.6))*0.6;
    gl_FragColor=vec4(finish(c,vW),0.72+0.28*fr); }`, { transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    w.rotation.x = -Math.PI / 2; w.position.set(POND.x, WY, POND.z); w.renderOrder = 2; scene.add(w);
    const padM = mat(`void main(){ vec3 n=NORMAL; float a=atan(vL.z,vL.x); float r=length(vL.xz); if(abs(a)<0.16 && r>0.12) discard;
    float veins=pow(abs(sin(a*9.0)),14.0)*smoothstep(0.1,0.9,r);
    vec3 alb=mix(vec3(0.07,0.26,0.05),vec3(0.20,0.42,0.08),veins+0.3*vnoise(vL.xz*5.0)); alb=mix(alb,vec3(0.30,0.20,0.06),smoothstep(0.9,1.0,r)*0.6);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.9,0.4),vW),1.0); }`, { side: THREE.DoubleSide });
    const padG = new THREE.CylinderGeometry(1, 1, 0.08, 36);
    let guard = 0; for (const p0 of PADS0) { const x = p0.x, z = p0.z;
      const r = p0.r, m = new THREE.Mesh(padG, padM); m.position.set(x, WY + 0.06, z); m.scale.set(r, 1, r); m.rotation.y = rnd(TAU); m.renderOrder = 3; scene.add(m); pads.push({ x, z, r, mesh: m, dip: 0 }); }
    // reeds
    const N = 260, rg = new THREE.CylinderGeometry(0.1, 0.16, 1, 5); rg.translate(0, 0.5, 0); const reeds = new THREE.InstancedMesh(rg, simple('0.16,0.30,0.06', 0.2, 0.6), N), heads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), simple('0.22,0.11,0.04', 0.05, 0.2), N);
    const m = new M4(), q = new Q4(); let n = 0; guard = 0;
    while (n < N && guard++ < 6000) { const a = rnd(TAU), d = POND.r + rnd(-22, 22), x = POND.x + Math.cos(a) * d, z = POND.z + Math.sin(a) * d, h = terrainH(x, z); if (h > WY + 1.2 || h < WY - 1.5) continue; if (Math.sin(a * 5) < -0.2) continue;
      const H = rnd(12, 24); q.setFromEuler(new THREE.Euler(rnd(-0.08, 0.08), 0, rnd(-0.08, 0.08))); m.compose(new V3(x, h - 0.3, z), q, new V3(1.3, H, 1.3)); reeds.setMatrixAt(n, m);
      m.compose(new V3(x, h - 0.3 + H * 0.93, z), q, new V3(0.5, 2.2, 0.5)); heads.setMatrixAt(n, m); n++; }
    reeds.count = heads.count = n; reeds.frustumCulled = heads.frustumCulled = false; scene.add(reeds, heads);
  }
  // the fish: a big old trout, more curious than fierce
  fish = new THREE.Group();
  {
    const body = geoParts([
      { g: ell(0.62, 1.05, 3.4, 0, 0, 0, 26), c: (x, y, z) => { const t = clamp(y / 1.05 * 0.5 + 0.5, 0, 1); return [lerp(0.75, 0.16, t), lerp(0.62, 0.22, t), lerp(0.40, 0.10, t)]; } },
      { g: ell(0.07, 0.13, 0.13, 0.4, 0.3, 2.4, 10), c: [0.015, 0.012, 0.01] }, { g: ell(0.07, 0.13, 0.13, -0.4, 0.3, 2.4, 10), c: [0.015, 0.012, 0.01] }]);
    const fm = mat(`void main(){ vec3 n=NORMAL; float sp=smoothstep(0.66,0.72,vnoise(vL.zy*5.0+vL.x))*step(0.0,vL.y+0.3)*step(0.3,vC.g+vC.r);
    float band=smoothstep(0.35,0.0,abs(vL.y+0.05))*step(0.3,vC.r);
    vec3 alb=mix(vC,vec3(0.75,0.25,0.22),band*0.5); alb=mix(alb,vec3(0.03,0.03,0.02),sp);
    alb*=0.85+0.3*abs(sin(vL.z*26.0)*sin(vL.y*26.0));
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.6,0.2)*vec3(0.22,0.25,0.17),vW),1.0); }`, { vertexColors: true });
    fish.add(new THREE.Mesh(body, fm));
    const tail = new THREE.Shape(); tail.moveTo(0, 0); tail.quadraticCurveTo(-1.2, 1.0, -2.2, 1.7); tail.quadraticCurveTo(-1.6, 0, -2.2, -1.7); tail.quadraticCurveTo(-1.2, -1.0, 0, 0);
    const tg = new THREE.ShapeGeometry(tail, 8); tg.rotateY(Math.PI / 2); const tm = simple('0.30,0.26,0.14', 0.3, 0.8, { side: THREE.DoubleSide });
    const tl = new THREE.Mesh(tg, tm); tl.position.z = -3.1; fish.add(tl); fish.userData.tail = tl;
    const fin = new THREE.Mesh(tg, tm); fin.scale.set(1, 0.45, 0.4); fin.position.set(0, 1.5, 0.2); fin.rotation.x = -0.5; fish.add(fin);
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: untoneHex(0x1a0606), side: THREE.DoubleSide })); mouth.position.z = 3.1; mouth.scale.setScalar(0.01); fish.add(mouth); fish.userData.mouth = mouth;
    fish.scale.setScalar(1.6); fish.position.set(POND.x, WY - 5, POND.z); scene.add(fish);
  }
}

// ================= ORCHARD ZONE, HEDGE, LOG, WEBS, WASPS =================
// layout is generated from a fixed seed so landmarks stay put between visits
let blossomMat, hedgeMat;
export function setupOrchard() {
  blossomMat = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vW.xz*0.45+vW.y*0.3); float b=fbm(vW.xz*${MP ? '0.3' : '1.4'}+vW.y*${MP ? '0.25' : '1.1'}); float sp=${MP ? '0.55' : 'vnoise(vW.xz*7.0+vW.y*5.0)'};
  n=normalize(n+(vec3(fbm(vW.yz*1.3),fbm(vW.xz*1.3),fbm(vW.xy*1.3))-0.5)*1.2);
  vec3 leaf=mix(vec3(0.05,0.14,0.03),vec3(0.24,0.40,0.07),a);
  vec3 bl=mix(vec3(0.92,0.38,0.58),vec3(1.0,0.80,0.84),sp*sp)*(0.8+0.3*sp);
  vec3 alb=mix(leaf,bl,smoothstep(0.38,0.55,b+0.15*sp)*0.92);
  alb*=${MP ? '0.55' : '1.0'};
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.02,0.8),vW),1.0); }`);
  hedgeMat = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vW.xz*0.25+vW.y*0.2); float b=vnoise(vW.xy*1.1+vW.z*0.9);
  n=normalize(n+(vec3(fbm(vW.yz*1.7),fbm(vW.xz*1.7),fbm(vW.xy*1.7))-0.5)*1.4);
  vec3 alb=mix(vec3(0.02,0.07,0.02),vec3(0.13,0.26,0.05),a)*(0.7+0.5*b);
  
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.05,0.5),vW),1.0); }`);
  {
    // orchard trees: trunk + clustered blossom canopy
    const blobs = [];
    for (const t of orchTrees) {
      const g = new THREE.CylinderGeometry(t.R * 0.7, t.R * 1.25, t.top - t.gy + 2, 14, 4); g.translate(0, (t.top - t.gy + 2) / 2 - 2, 0);
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * 0.15 + t.x) * 1.2); p.setZ(i, p.getZ(i) + Math.cos(y * 0.12 + t.z) * 1.0); } g.computeVertexNormals();
      const m = new THREE.Mesh(g, barkMat); m.position.set(t.x, t.gy, t.z); scene.add(m);
      const nb = t.nest ? 11 : 8;
      const b0 = blobs.length;
      for (let i = 0; i < nb; i++) { const a = i / nb * TAU + srnd(0.5), d = srnd(0.25, 0.75) * t.cr; blobs.push([t.x + Math.cos(a) * d, t.top + srnd(-0.3, 0.25) * t.cr, t.z + Math.sin(a) * d, t.cr * srnd(0.5, 0.72), t.cr * srnd(0.4, 0.55)]); }
      blobs.push([t.x, t.top + t.cr * 0.2, t.z, t.cr * 0.7, t.cr * 0.5]);
      t.blobs = blobs.slice(b0);
    }
    const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), blossomMat, blobs.length), m4 = new M4(), q = new Q4();
    blobs.forEach((b, i) => { q.setFromEuler(new THREE.Euler(srnd(-0.3, 0.3), srnd(TAU), srnd(-0.3, 0.3))); m4.compose(new V3(b[0], b[1], b[2]), q, new V3(b[3], b[4], b[3]).multiplyScalar(MP ? 0.93 : 1)); im.setMatrixAt(i, m4); });
    im.frustumCulled = false; scene.add(im); if (MP) { leafShell(blobs, { size: 6, ta: '0.06,0.16,0.03', tb: '0.30,0.46,0.09', blos: 0.55 }); for (const t of orchTrees) crownLimbs(t.x, t.top - t.cr * 0.45, t.z, t.R, t.blobs, t.top); } else addFringe(im, true);
    // hedge ring with two gaps
    const hb = [];
    for (let a = 0; a < TAU; a += 3.4 / HEDGE_R) {
      if (inHedgeGap(a)) continue; const tun = Math.abs(Math.atan2(Math.sin(a - HEDGE_TUN), Math.cos(a - HEDGE_TUN))) < 0.07;
      const x = ORCH.x + Math.cos(a) * HEDGE_R, z = ORCH.z + Math.sin(a) * HEDGE_R, gy = terrainH(x, z);
      for (let k = 0; k < 4; k++) { const s = srnd(5.5, 7.5) * (1 - k * 0.1); if (tun && k === 0) continue; hb.push([x + srnd(-2, 2), gy + 3 + k * 8.5 + srnd(-1, 1), z + srnd(-2, 2), s]); }
    }
    const hm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), hedgeMat, hb.length);
    hb.forEach((b, i) => { q.setFromEuler(new THREE.Euler(srnd(TAU), srnd(TAU), 0)); m4.compose(new V3(b[0], b[1], b[2]), q, new V3(b[3], b[3] * 0.9, b[3])); hm.setMatrixAt(i, m4); });
    hm.frustumCulled = false; scene.add(hm);
    // stone posts marking the two gates (landmarks you can spot from the meadow)
    const stoneM = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vW.xz*0.8+vW.y*0.6); vec3 alb=mix(vec3(0.30,0.28,0.25),vec3(0.62,0.58,0.52),a);
    alb=mix(alb,vec3(0.18,0.30,0.08),smoothstep(0.55,0.75,fbm(vW.xy*0.5+3.0))*smoothstep(0.0,0.6,n.y+0.3));
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.1,0.0),vW),1.0); }`);
    for (const ga of HEDGE_GAPS) for (const s of [-1, 1]) {
      const a = ga + s * (HEDGE_GAP_W + 0.02), x = ORCH.x + Math.cos(a) * HEDGE_R, z = ORCH.z + Math.sin(a) * HEDGE_R, gy = terrainH(x, z);
      const g = new THREE.CylinderGeometry(2.2, 3.2, 42, 7); g.translate(0, 21, 0); const m = new THREE.Mesh(g, stoneM); m.position.set(x, gy - 2, z); m.rotation.y = srnd(TAU); scene.add(m);
      const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(3.4, 0), stoneM); cap.position.set(x, gy + 41, z); scene.add(cap);
    }
  }
}

// hollow fallen tree: a tunnel you can fly through, with honeydew blossoms inside.
// It must read as a tree that fell: bark like the standing trees, a splintered break at the crown end, roots at the other end, broken branch stubs.
// The bee collides with the plain tube of world.js LOG; all else here is for the eye. No Math.random: the seeded world must not shift.
let logMesh;
export function setupLog() {
  // three.js draws 4 random numbers for the id of each new object. The first log was 12 objects (48 numbers): take exactly those from the game's stream
  // and build the tree with a stream of its own, so that all that comes after it in the world is as it was.
  for (let i = 0; i < 48; i++) Math.random(); const gameRandom = Math.random; let rs = 20261122; Math.random = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
  logMesh = new THREE.Group();
  const h1 = n => { const x = Math.sin(n * 127.1 + 3.7) * 43758.5453; return x - Math.floor(x); };
  const wave = (a, k) => 0.5 + 0.25 * Math.sin(a * 3 + k) + 0.15 * Math.sin(a * 7 + k * 2.3) + 0.1 * Math.sin(a * 13 + k * 4.1); // 0..1, smooth around the trunk
  const L = LOG.len, NA = 64, NL = 36, ROOT = -1;                                   // roots at the -axis end, the break at the +axis end
  const up = YA.clone().applyQuaternion(new Q4().setFromUnitVectors(YA, LOG.axis).invert()), upA = Math.atan2(up.z, up.x); // the world's up, in the log's frame
  const LOBES = [0, 1, 2, 3, 4].map(k => upA + (k + 0.5) / 5 * TAU + (h1(k) - 0.5) * 0.45);                       // where the big roots left the trunk
  const lobe = a => { let m = 0; for (const b of LOBES) { const d = Math.atan2(Math.sin(a - b), Math.cos(a - b)); m = Math.max(m, Math.exp(-d * d / 0.2)); } return m; };
  const jag = (a, s) => s === ROOT ? 0.2 + 0.7 * wave(a, 1.3) + 0.9 * lobe(a) : 0.6 + 4.2 * Math.pow(wave(a, 5.1), 1.6) + 1.1 * h1(Math.round(a * NA / TAU)); // how far the wood runs past the tube
  const uAt = (t, a) => lerp(-L / 2 - jag(a, -1), L / 2 + jag(a, 1), t);
  const foot = u => Math.pow(clamp((-u - L / 2 + LOG.foot) / LOG.foot, 0, 1.2), 2);                                       // 0 along the trunk, 1 at the root end
  const rOut = (t, a) => { const u = uAt(t, a); return LOG.ro * (1 + foot(u) * (0.14 + 0.3 * lobe(a)) - 0.05 * clamp((u + L / 2) / L, 0, 1)) + 0.22 * Math.sin(a * 9 + u * 0.13) * wave(a, u * 0.05) + 0.12 * Math.sin(a * 23 + u * 0.4); };
  const shell = (rad, flip) => { const pos = [], idx = [];
    for (let i = 0; i <= NL; i++) for (let j = 0; j <= NA; j++) { const a = j / NA * TAU, t = i / NL, r = rad(t, a); pos.push(Math.cos(a) * r, uAt(t, a), Math.sin(a) * r); }
    for (let i = 0; i < NL; i++) for (let j = 0; j < NA; j++) { const p = i * (NA + 1) + j, q = p + NA + 1; if (flip) idx.push(p, p + 1, q, p + 1, q + 1, q); else idx.push(p, q, p + 1, p + 1, q, q + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  const BARK = `vec3 n=NORMAL; float a=atan(vL.z,vL.x); vec2 bp=vec2(a*5.0, vL.y*0.22);
    float rid=fbm(vec2(bp.x*1.6,bp.y*0.35)); float fine=fbm(bp*vec2(4.0,6.0));
    float crack=1.0-smoothstep(0.0,0.09,abs(fract(bp.x*0.55+fbm(bp*0.4)*1.4)-0.5));
    vec3 alb=mix(vec3(0.115,0.088,0.062),vec3(0.43,0.35,0.26),smoothstep(0.3,0.75,rid))*(0.7+0.6*fine); alb*=1.0-0.6*crack;
    float moss=smoothstep(0.46,0.7,fbm(bp*vec2(0.55,1.3)+3.0))*smoothstep(0.15,0.85,n.y); alb=mix(alb,vec3(0.17,0.25,0.08)*(0.7+0.5*fine),moss*0.7);
    float lich=smoothstep(0.8,0.88,vnoise(bp*0.9+7.0)); alb=mix(alb,vec3(0.55,0.60,0.45),lich*0.2*(1.0-moss));
    n=normalize(n+(vec3(fine,rid,fbm(bp*3.0+9.0))-0.5)*0.55-n*crack*0.3);`;
  const barkM = mat(`void main(){ ${BARK} gl_FragColor=vec4(finish(shade(alb,n,vW,0.03+0.08*moss,0.0),vW),1.0); }`);
  const innerM = mat(`void main(){ vec3 n=NORMAL; float a=atan(vL.z,vL.x); float g=fbm(vec2(a*5.0,vL.y*0.5));
    vec3 alb=mix(vec3(0.20,0.11,0.05),vec3(0.55,0.36,0.18),g);
    float glow=smoothstep(0.86,0.95,vnoise(vec2(a*4.0,vL.y*0.6)))*0.9;
    vec3 c=shade(alb,n,vW,0.05,0.0)*0.55+vec3(0.35,0.75,0.45)*glow*0.6;
    gl_FragColor=vec4(finish(c,vW),1.0); }`, { side: THREE.BackSide });
  // broken wood: pale, with year rings and splinters. vC.x is 1 on a face that shows the rings (a stub end), 0 on the splintered wall
  const woodM = mat(`void main(){ vec3 n=NORMAL; float r=length(vL.xz); float a=atan(vL.z,vL.x);
    float ring=0.5+0.5*sin(r*9.0+fbm(vec2(a*2.0,r))*5.0); float fib=fbm(vec2(a*26.0,vL.y*0.5));
    vec3 alb=mix(vec3(0.42,0.29,0.16),vec3(0.70,0.55,0.34),mix(fib,ring*0.6+fib*0.4,0.5)); alb*=0.72+0.28*smoothstep(${LOG.ri.toFixed(2)},${LOG.ro.toFixed(2)},r);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.04,0.0),vW),1.0); }`, { side: THREE.DoubleSide });
  const footM = mat(`void main(){ vec3 n=NORMAL; float r=length(vL.xz); float a=atan(vL.z,vL.x); float f=fbm(vec2(a*9.0,r*1.3)); float f2=fbm(vec2(a*2.0+3.0,r*0.4));
    vec3 alb=mix(vec3(0.16,0.11,0.07),vec3(0.42,0.30,0.18),f)*(0.7+0.6*f2); n=normalize(n+(vec3(f,f2,fbm(vec2(a*5.0,r)+4.0))-0.5)*0.9);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.02,0.0),vW),1.0); }`, { side: THREE.DoubleSide });
  logMesh.add(new THREE.Mesh(shell(rOut, false), barkM), new THREE.Mesh(shell(() => LOG.ri, false), innerM));
  for (const s of [-1, 1]) { const pos = [], idx = [], t = s < 0 ? 0 : 1;             // the wall at each end, between bark and hollow: torn and earthy at the roots, pale splinters at the break
    for (let j = 0; j <= NA; j++) { const a = j / NA * TAU, u = uAt(t, a), ro = rOut(t, a); pos.push(Math.cos(a) * ro, u, Math.sin(a) * ro, Math.cos(a) * LOG.ri, u + s * 0.5, Math.sin(a) * LOG.ri); }
    for (let j = 0; j < NA; j++) { const p = j * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); logMesh.add(new THREE.Mesh(g, s === ROOT ? footM : woodM)); }
  // a limb: bent, thinner to its tip. pts are in the log's own frame (y along the trunk)
  const limb = (pts, r0, r1, m) => { for (let i = 0; i + 1 < pts.length; i++) { const A = pts[i], B = pts[i + 1], d = B.clone().sub(A), len = d.length(), ka = i / (pts.length - 1), kb = (i + 1) / (pts.length - 1);
    const g = new THREE.CylinderGeometry(lerp(r0, r1, kb), lerp(r0, r1, ka), len * 1.08, 9, 1, i + 2 < pts.length); const c = new THREE.Mesh(g, m);
    c.position.copy(A).add(B).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(YA, d.normalize()); logMesh.add(c); } };
  // broken branch stubs on the upper side, each with a pale broken face
  for (const [u, da, len, r] of [[-6, 0.5, 3.4, 0.95], [5, -0.75, 2.4, 0.8], [13, 0.25, 4.4, 1.05], [19, -0.35, 1.8, 0.7]]) { const a = upA + da, c = Math.cos(a), s = Math.sin(a);
    const A = new V3(c * (LOG.ro - 0.6), u, s * (LOG.ro - 0.6)), d = new V3(c, 0.8, s).normalize(), B = A.clone().addScaledVector(d, len + 0.6);
    limb([A, A.clone().lerp(B, 0.5), B], r, r * 0.72, barkM);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.72, r * 0.5, 9, 1, true), woodM); cap.position.copy(B).addScaledVector(d, r * 0.2); cap.quaternion.setFromUnitVectors(YA, d); logMesh.add(cap); }
  logMesh.position.copy(LOG.c); logMesh.quaternion.setFromUnitVectors(YA, LOG.axis); scene.add(logMesh);
  Math.random = gameRandom;
}

// ================= ROUND 6: the forest edge, life on the pond, scent stones =================
let forestLeafMat;
export function setupForest() {
  forestLeafMat = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vW.xz*0.35+vW.y*0.3); float b=vnoise(vW.xz*2.1+vW.y*1.7);
  n=normalize(n+(vec3(fbm(vW.yz*1.5),fbm(vW.xz*1.5),fbm(vW.xy*1.5))-0.5)*1.3);
  vec3 alb=mix(vec3(0.03,0.09,0.02),vec3(0.20,0.34,0.05),a)*(0.75+0.45*b); alb=mix(alb,vec3(0.45,0.38,0.06),smoothstep(0.8,0.95,b)*0.5); alb*=${MP ? '0.5' : '1.0'};
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.03,0.9),vW),1.0); }`);
  {
    const blobs = [], fr = FOREST.rnd;
    for (const t of forestTrees) {
      const H = t.top - t.gy + 3, g = new THREE.CylinderGeometry(t.R * 0.6, t.R * 1.35, H, 12, 6); g.translate(0, H / 2 - 3, 0);
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * 0.11 + t.x) * 0.7); p.setZ(i, p.getZ(i) + Math.cos(y * 0.09 + t.z) * 0.6); } g.computeVertexNormals();
      const m = new THREE.Mesh(g, barkMat); m.position.set(t.x, t.gy, t.z); scene.add(m);
      blobs.push(...t.blobs);
    }
    const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), forestLeafMat, blobs.length), m4 = new M4(), q = new Q4();
    blobs.forEach((b, i) => { q.setFromEuler(new THREE.Euler(fr(-0.3, 0.3), fr(0, TAU), fr(-0.3, 0.3))); m4.compose(new V3(b[0], b[1], b[2]), q, new V3(b[3], b[4], b[3]).multiplyScalar(MP ? 0.93 : 1)); im.setMatrixAt(i, m4); });
    im.frustumCulled = false; scene.add(im); if (MP) { leafShell(blobs, { size: 5.5, ta: '0.04,0.12,0.03', tb: '0.24,0.38,0.07' }); for (const t of forestTrees) crownLimbs(t.x, t.top - t.cr * 0.4, t.z, t.R, t.blobs, t.top); } else addFringe(im, false);
    // webs strung between close trunks
    let n = 0;
    for (let i = 0; i < forestTrees.length && n < 6; i++) { const t = forestTrees[i]; let best = null, bd = 1e9;
      for (let j = i + 1; j < forestTrees.length; j++) { const u = forestTrees[j], d = Math.hypot(t.x - u.x, t.z - u.z); if (d < bd) { bd = d; best = u; } }
      if (!best || bd > 30) continue; const r = Math.min(8, bd / 2 - Math.max(t.R, best.R) - 0.8); if (r < 3) continue;
      const sx = (t.x + best.x) / 2, sz = (t.z + best.z) / 2, c = new V3(sx, terrainH(sx, sz) + r + fr(2, 10), sz), nrm = new V3(-(best.z - t.z), 0, best.x - t.x).normalize();
      const m = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat(WEB_FRAG, { uniforms: { uR: { value: r } }, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      m.scale.setScalar(r); m.position.copy(c); m.lookAt(c.clone().add(nrm)); scene.add(m); webs.push({ c, n: nrm, r, mesh: m, torn: 0, zone: 'forest' }); n++; }
    // foxglove bells hanging down the spikes
    const foxes = flowers.filter(f => f.fox), bellG = new THREE.CylinderGeometry(0.26, 0.78, 1.6, 12, 2, true); bellG.translate(0, -0.8, 0);
    const bellM = mat(`void main(){ vec3 n=NORMAL; float inner=gl_FrontFacing?0.0:1.0; float sp=step(0.68,vnoise(vL.xz*9.0+vL.y*7.0))*inner;
    vec3 alb=mix(vec3(0.62,0.16,0.48),vec3(0.95,0.82,0.9),inner*0.6); alb=mix(alb,vec3(0.28,0.03,0.12),sp);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.15,0.9),vW),1.0); }`, { side: THREE.DoubleSide });
    const bells = new THREE.InstancedMesh(bellG, bellM, Math.max(1, foxes.length * 9)); let k = 0;
    for (const f of foxes) for (let i = 0; i < 9; i++) { const a = i * 2.4 + f.x, o = 0.7, s = 1 - i * 0.025;
      q.setFromAxisAngle(new V3(Math.sin(a), 0, -Math.cos(a)), 0.55); m4.compose(new V3(f.x + Math.cos(a) * o, f.y - 1.6 - i * 0.95, f.z + Math.sin(a) * o), q, new V3(s, s, s)); bells.setMatrixAt(k++, m4); }
    bells.count = k; bells.frustumCulled = false; scene.add(bells);
  }
}

// ---------- batch 2b: the misty brook, swaying branches, the bramble hollow, petal gusts, and a calm after revenge ----------
// the brook: cool air over running water lifts a bee skimming low; branches lean low over it and sway in the wind
let brookCurve, BROOKS;
export function setupBrook() {
  brookCurve = new THREE.CatmullRomCurve3(BROOK.pts.map(p => new V3(p[0], 0, p[1])), false, 'centripetal');
  BROOKS = brookCurve.getSpacedPoints(90).map(p => { p.y = terrainBase(p.x, p.z) - BROOK.depth + 1.4; return p; });
  for (let i = 1; i < BROOKS.length; i++) BROOKS[i].y = Math.min(BROOKS[i].y, BROOKS[i - 1].y + 0.05); // water runs downhill (or level)
  { const pos = [], uv = [], idx = [], S = BROOKS;
    S.forEach((p, i) => { const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)]; let tx = b.x - a.x, tz = b.z - a.z; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
      const w = BROOK.hw + 1.2; for (const s of [-1, 1]) { pos.push(p.x - tz * s * w, p.y, p.z + tx * s * w); uv.push(s < 0 ? 0 : 1, i * 0.6); } if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = mat(`void main(){ vec3 V=normalize(uCam-vW); vec2 fl=vec2(vUv.x*3.0, vUv.y*2.0-uTime*1.6);
    float rip=fbm(fl*2.0)*0.6+fbm(fl*5.0+3.0)*0.4; vec3 n=normalize(vec3((rip-0.5)*0.5,1.0,(fbm(fl*3.0+7.0)-0.5)*0.5));
    float fr=pow(1.0-max(dot(n,V),0.0),3.0)*0.85+0.08; vec3 R=reflect(-V,n);
    vec3 c=mix(vec3(0.025,0.07,0.06), hazeCol(R)*0.7, fr*0.8)+vec3(5.0,3.6,2.2)*pow(max(dot(R,uSun),0.0),120.0);
    c+=vec3(0.8)*smoothstep(0.62,0.8,rip)*0.12; float edge=min(vUv.x,1.0-vUv.x); c=mix(vec3(0.16,0.13,0.08),c,smoothstep(0.0,0.12,edge));
    gl_FragColor=vec4(finish(c,vW),1.0); }`);
    scene.add(new THREE.Mesh(g, m)); }
}

function brookWY(s) { const k = clamp(s / (BROOK.pts.length - 1), 0, 1) * (BROOKS.length - 1), i = Math.floor(k), f = k - i; return lerp(BROOKS[i].y, BROOKS[Math.min(BROOKS.length - 1, i + 1)].y, f); }
export const BRANCHES = [];

export function setupBranches() {
  { const barkM = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vec2(atan(vL.z,vL.x)*3.0,vL.y*1.5)); vec3 alb=mix(vec3(0.10,0.07,0.04),vec3(0.32,0.24,0.15),a); alb=mix(alb,vec3(0.15,0.28,0.06),smoothstep(0.55,0.7,fbm(vL.xy*2.0+4.0))*0.6);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.05,0.0),vW),1.0); }`), leafM = mat(`void main(){ vec3 n=NORMAL; float a=vnoise(vW.xz*3.0+vW.y*2.0); vec3 alb=mix(vec3(0.05,0.16,0.03),vec3(0.28,0.46,0.10),a)*(0.75+0.4*vnoise(vW.xz*11.0+vW.y*9.0));
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.1,0.9),vW),1.0); }`);
    for (const k of [10, 24, 38, 50, 63, 76]) { const p = BROOKS[k], q = BROOKS[k + 1]; let tx = q.x - p.x, tz = q.z - p.z; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
      const side = k % 2 ? 1 : -1, base = new V3(p.x - tz * side * (BROOK.hw + 5), 0, p.z + tx * side * (BROOK.hw + 5)); base.y = terrainH(base.x, base.z) + 2.5;
      const tip = new V3(p.x + tz * side * (BROOK.hw + 2), p.y + 3.4 + (k % 3) * 0.6, p.z - tx * side * (BROOK.hw + 2));
      const len = base.distanceTo(tip), g = new THREE.Group(); g.position.copy(base);
      const cyl = new THREE.CylinderGeometry(0.22, 0.45, len, 7); cyl.translate(0, len / 2, 0); const br = new THREE.Mesh(cyl, barkM); g.add(br);
      for (let j = 0; j < 7; j++) { const lg = new THREE.IcosahedronGeometry(1, 3); { const pp = lg.attributes.position; for (let i2 = 0; i2 < pp.count; i2++) { const vx = pp.getX(i2), vy = pp.getY(i2), vz = pp.getZ(i2), kk = 1 + 0.35 * Math.sin(vx * 5 + j) * Math.sin(vz * 4.3 + vy * 3); pp.setXYZ(i2, vx * kk, vy * kk, vz * kk); } lg.computeVertexNormals(); }
        const lf = new THREE.Mesh(lg, leafM); const t = 0.5 + j * 0.075; lf.position.set(rnd(-1.4, 1.4), len * t, rnd(-1.4, 1.4)); lf.scale.set(rnd(1.0, 1.7), rnd(0.4, 0.6), rnd(1.0, 1.7)); lf.rotation.set(rnd(-0.4, 0.4), rnd(TAU), rnd(-0.4, 0.4)); br.add(lf); }
      const dir = tip.clone().sub(base).normalize(); g.quaternion.setFromUnitVectors(YA, dir); scene.add(g);
      BRANCHES.push({ g, base, dir, len, q0: g.quaternion.clone(), ph: rnd(TAU), a: new V3(), b: new V3() }); } }
}

const _bq = new Q4(), _bax = new V3();
export function updateBranches(dt) { for (const B of BRANCHES) { const sw = Math.sin(time * 1.1 + B.ph) * (0.05 + 0.13 * WIND.s) + Math.sin(time * 2.7 + B.ph * 2) * 0.03;
    _bax.set(-B.dir.z, 0, B.dir.x).normalize(); _bq.setFromAxisAngle(_bax, sw); B.g.quaternion.copy(B.q0).premultiply(_bq);
    B.a.copy(B.base); B.b.set(0, B.len, 0).applyQuaternion(B.g.quaternion).add(B.base); } }
const _brPrev = new V3(); let _brHas = false;
export function branchCollide(p, v) { if (!_brHas || _brPrev.distanceTo(p) > 6) _brPrev.copy(p); _brHas = true;
  for (const B of BRANCHES) { if (Math.abs(p.x - B.base.x) > B.len + 4 || Math.abs(p.z - B.base.z) > B.len + 4) continue; const r = 0.42 + PR;
    if (segSeg(_brPrev, p, B.a, B.b) < r) { _aN.subVectors(_aC1, _aC2); const L = _aN.length() || 1; _aN.multiplyScalar(1 / L); p.copy(_aC2).addScaledVector(_aN, r + 0.01); const vn = v.dot(_aN); if (vn < 0) v.addScaledVector(_aN, -vn * 1.2); } }
  _brPrev.copy(p); }

// the bramble hollow: a thorny ring roofed with leaves. The only way in is through a hollow root
export let HOL;
export function setupHollow() {
  HOL = (() => { const gy = terrainH(HOLLOW.x, HOLLOW.z), sc = new V3(HOLLOW.x, gy - 8, HOLLOW.z), Rs = Math.hypot(HOLLOW.r, HOLLOW.wallH + 8);
    const a0 = HOLLOW.a0; // the root comes in from the side facing home, a little round
    const pts = [26, 21, 17.5, 15, 11].map((r, i) => { const a = a0 + (i - 2) * 0.05, x = HOLLOW.x + Math.cos(a) * r, z = HOLLOW.z + Math.sin(a) * r; return new V3(x, Math.max(gy, terrainH(x, z)) + 2.3 + (i === 0 ? 0.4 : 0), z); });
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'); return { gy, sc, Rs, curve, S: curve.getSpacedPoints(40), tr: 2.1, hole: curve.getPointAt(0.42) }; })();
  { // A wild bramble thicket: a dark tangle inside, leaves all over it, arching thorny canes, blackberries.
    // The old build made 10 objects here. Take their 40 numbers from the game's random stream, then use an own stream,
    // so that everything built or drawn by chance after this place stays as it was.
    const gameRandom = Math.random; for (let n = 0; n < 40; n++) gameRandom();
    let rs = 20261126; const rr = (a = 1, b) => { rs = (rs * 1664525 + 1013904223) >>> 0; const u = rs / 4294967296; return b === undefined ? u * a : a + u * (b - a); }; Math.random = () => rr();
    const R = HOLLOW.r, cx = HOLLOW.x, cz = HOLLOW.z, gy = HOL.gy, a0 = HOLLOW.a0;
    const domeY = d => -8 + Math.sqrt(Math.max(0, HOL.Rs * HOL.Rs - d * d)); // height of the roof above the ground at distance d from the middle
    const at = (a, d, y) => new V3(cx + Math.cos(a) * d, gy + y, cz + Math.sin(a) * d);
    const offRoot = a => Math.abs(Math.atan2(Math.sin(a - a0), Math.cos(a - a0)));
    const inside = (x, y, z) => { const d = Math.hypot(x - cx, z - cz); return (d < R + 0.5 && y < gy + domeY(d) - 0.2) || (hollowRootD(x, z) < HOL.tr + 1.2 && y < gy + 5.6 && d < 29); };
    // the core: a dark tangle of old canes. It keeps the light out; the leaves hide most of it from outside.
    const brM = mat(`uniform vec3 uHole; void main(){ if(distance(vW,uHole)<2.45) discard; vec3 n=NORMAL; float a=fbm(vW.xz*0.9+vW.y*0.7), b=vnoise(vW.xz*5.0+vW.y*4.0); float cane=1.0-abs(2.0*vnoise(vec2(vW.x*1.7+vW.z*1.3, vW.y*0.8+vW.x*0.5-vW.z*0.6)*2.2)-1.0); cane=pow(cane,3.0)*0.6+0.2*vnoise(vW.xz*3.0+vW.y*2.0);
      vec3 alb=mix(vec3(0.012,0.024,0.010),mix(vec3(0.07,0.12,0.03),vec3(0.15,0.09,0.06),b),cane)*(0.55+0.7*a);
      gl_FragColor=vec4(finish(shade(alb,n,vW,0.04,0.4),vW),1.0); }`, { uniforms: { uHole: { value: HOL.hole } }, side: THREE.DoubleSide });
    const bulge = (g, amt) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + amt * (Math.sin(x * 1.3 + y * 0.7) * Math.cos(z * 1.1 - y) * 0.6 + Math.sin(x * 3.1 + z * 2.3) * 0.4); p.setXYZ(i, x * k, y, z * k); } g.computeVertexNormals(); return g; };
    for (const r of [R - 1.2, R + 1.2]) { const g = bulge(new THREE.CylinderGeometry(r, r, HOLLOW.wallH + 3, 64, 6, true), 0.06); g.translate(cx, gy + (HOLLOW.wallH + 3) / 2 - 3, cz); scene.add(new THREE.Mesh(g, brM)); }
    const dome = new THREE.SphereGeometry(HOL.Rs, 48, 16, 0, TAU, 0, Math.asin(R / HOL.Rs) + 0.04); bulge(dome, 0.05); dome.translate(HOL.sc.x, HOL.sc.y, HOL.sc.z); scene.add(new THREE.Mesh(dome, brM));
    // the leaves: many small clumps of different height, so that the outline is ragged and not a smooth dome
    const blobs = [], blob = (a, d, y, rx, ry) => blobs.push([cx + Math.cos(a) * d, gy + y, cz + Math.sin(a) * d, rx, ry, rx]);
    for (let n = 0; n < 20; n++) blob(n / 20 * TAU + rr(-0.1, 0.1), R + rr(0.2, 1.6), rr(1.6, 3.4), rr(3.2, 4.3), rr(2.8, 3.8));
    for (let n = 0; n < 18; n++) blob(n / 18 * TAU + rr(-0.12, 0.12), R + rr(-0.6, 0.8), rr(6.2, 8.2), rr(3.2, 4.4), rr(2.8, 3.8));
    for (let n = 0; n < 14; n++) { const d = rr(11, 13.5); blob(n / 14 * TAU + rr(-0.15, 0.15), d, domeY(d) + rr(-0.6, 0.9), rr(3.6, 4.8), rr(2.2, 3.2)); }
    for (let n = 0; n < 9; n++) { const d = rr(6, 8.5); blob(n / 9 * TAU + rr(-0.25, 0.25), d, domeY(d) + rr(-0.6, 0.8), rr(3.6, 4.8), rr(2.2, 3.1)); }
    for (let n = 0; n < 4; n++) { const d = rr(0.5, 3.5); blob(n / 4 * TAU + rr(1.2), d, domeY(d) + rr(-0.5, 0.6), rr(3.6, 4.6), rr(2.2, 3)); }
    for (let n = 0; n < 5; n++) { const d = rr(3, 14); blob(0.7 + n * 1.31 + rr(-0.3, 0.3), d, domeY(d) + rr(1.2, 2.4), rr(3.2, 4.2), rr(3.4, 4.4)); } // taller tufts
    for (let n = 0; n < 5; n++) blob(a0 + 0.95 + n * 1.06 + rr(-0.2, 0.2), R + rr(5, 7.5), rr(0.4, 1.3), rr(2.6, 3.6), rr(1.9, 2.7)); // young growth round the foot
    const leaves = leafShell(blobs, { size: 2.6, ta: '0.03,0.10,0.03', tb: '0.21,0.37,0.07', blos: 0.05 });
    { const m4 = new M4(), zero = new M4().makeScale(0, 0, 0), e = m4.elements; // no leaves in the grove or in the root tunnel
      for (let n = 0; n < leaves.count; n++) { leaves.getMatrixAt(n, m4); if (inside(e[12], e[13], e[14])) leaves.setMatrixAt(n, zero); } leaves.instanceMatrix.needsUpdate = true; }
    // the canes: hoops that root again at the tip, long canes over the top, and young whips that arch into the air
    const pos = [], nor = [], col = [], idx = [], thorns = [], _p = new V3(), _t = new V3(), _n = new V3(), _b = new V3(), SEG = 6;
    const cane = (pts, r0, r1, young) => { const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), n = Math.max(8, Math.round(c.getLength() / 1.1)), base = pos.length / 3, tone = rr(0.75, 1.2);
      for (let i = 0; i <= n; i++) { const u = i / n; c.getPointAt(u, _p); c.getTangentAt(u, _t); _n.crossVectors(_t, YA); if (_n.lengthSq() < 1e-4) _n.set(1, 0, 0); _n.normalize(); _b.crossVectors(_t, _n);
        const r = lerp(r0, r1, u);
        for (let j = 0; j < SEG; j++) { const a = j / SEG * TAU, ca = Math.cos(a), sa = Math.sin(a), nx = _n.x * ca + _b.x * sa, ny = _n.y * ca + _b.y * sa, nz = _n.z * ca + _b.z * sa; pos.push(_p.x + nx * r, _p.y + ny * r, _p.z + nz * r); nor.push(nx, ny, nz); col.push(young ? 1 - u * 0.3 : 0, tone, 1); }
        if (i > 0 && i < n && r > 0.09 && rr() < 0.8 && !inside(_p.x, _p.y, _p.z)) { const a = rr(TAU), ca = Math.cos(a), sa = Math.sin(a); thorns.push([_p.x, _p.y, _p.z, _n.x * ca + _b.x * sa - _t.x * 0.35, _n.y * ca + _b.y * sa - _t.y * 0.35, _n.z * ca + _b.z * sa - _t.z * 0.35, r]); } }
      for (let i = 0; i < n; i++) for (let j = 0; j < SEG; j++) { const p = base + i * SEG + j, q = base + i * SEG + (j + 1) % SEG; idx.push(p, q, p + SEG, q, q + SEG, p + SEG); } };
    for (let n = 0; n < 24; n++) { let a = n / 24 * TAU + rr(-0.1, 0.1); const sw = (rr() < 0.5 ? -1 : 1) * rr(0.5, 1.3); if (offRoot(a) < 0.3 || offRoot(a + sw) < 0.3) a += 0.6;
      const df = R + rr(2.6, 5.4), dl = R + rr(2.6, 6), dm = R - rr(0, 4.5), hm = domeY(dm) + rr(3.4, 6.2);
      cane([at(a, df, -0.6), at(a + sw * 0.1, df - 0.9, 6 + rr(2)), at(a + sw * 0.5, dm, hm), at(a + sw * 0.9, dl - 0.9, 6 + rr(2)), at(a + sw, dl, -0.6)], rr(0.2, 0.28), rr(0.14, 0.18), false); }
    for (let n = 0; n < 7; n++) { let a = n / 7 * TAU + rr(-0.3, 0.3); const b = a + Math.PI + rr(-0.7, 0.7); if (offRoot(a) < 0.3) a += 0.5; const bb = offRoot(b) < 0.3 ? b + 0.5 : b, dt = rr(1, 5), am = a + rr(0.5, 1.4);
      cane([at(a, R + 3.4, -0.6), at(a, R + 1.9, 7), at(a + 0.08, 11.5, domeY(11.5) + rr(2.8, 3.8)), at(am, dt, domeY(dt) + rr(3, 4.6)), at(bb - 0.08, 11.5, domeY(11.5) + rr(2.8, 3.8)), at(bb, R + 1.9, 7), at(bb, R + 3.6, -0.6)], rr(0.24, 0.3), 0.17, false); }
    for (let n = 0; n < 10; n++) { const a = 0.4 + n / 10 * TAU + rr(-0.25, 0.25), d0 = rr(5, 14.5), y0 = domeY(d0), up = rr(5.5, 9), tw = (rr() < 0.5 ? -1 : 1) * rr(0.1, 0.3), far = rr(0.75, 1.15);
      cane([at(a, d0, y0 + 0.5), at(a + tw * 0.3, d0 + 1.6 * far, y0 + up * 0.7), at(a + tw * 0.7, d0 + 5.5 * far, y0 + up), at(a + tw, d0 + 9.8 * far, y0 + up - 2.6), at(a + tw * 1.2, d0 + 12.6 * far, y0 + up - 6.2)], rr(0.22, 0.28), 0.05, true); }
    { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
      const caneM = mat(`void main(){ vec3 n=normalize(vN); float f=fbm(vW.xz*1.6+vW.y*1.3), s=vnoise(vW.xz*7.0+vW.y*9.0);
        vec3 old=mix(vec3(0.115,0.04,0.05),vec3(0.26,0.115,0.085),f), young=mix(vec3(0.20,0.30,0.07),vec3(0.42,0.46,0.13),f); young=mix(young,vec3(0.50,0.16,0.14),smoothstep(0.45,0.75,f)*0.5);
        vec3 alb=mix(old,young,vC.x)*vC.y*(0.8+0.4*s); gl_FragColor=vec4(finish(shade(alb,n,vW,0.22,0.15),vW),1.0); }`, { vertexColors: true, side: THREE.DoubleSide });
      const m = new THREE.Mesh(g, caneM); m.frustumCulled = false; scene.add(m);
      const tg = new THREE.ConeGeometry(0.12, 0.62, 5); tg.translate(0, 0.31, 0); const tm = new THREE.InstancedMesh(tg, simple('0.62,0.30,0.20', 0.15, 0.3), thorns.length), m4 = new M4(), q = new Q4(), sc = new V3();
      thorns.forEach((t, n) => { _t.set(t[3], t[4], t[5]).normalize(); q.setFromUnitVectors(YA, _t); const k = rr(0.7, 1.15) * clamp(t[6] / 0.24, 0.45, 1.2); sc.set(k, k, k); _p.set(t[0], t[1], t[2]).addScaledVector(_t, t[6] * 0.7); tm.setMatrixAt(n, m4.compose(_p, q, sc)); });
      tm.frustumCulled = false; tm.userData.noShadow = true; scene.add(tm); }
    // blackberries: black ripe ones and red ones not yet ripe, in small bunches at the outside of the leaves
    { const B = [], out = blobs.filter(b => b[1] - gy < 9.5 || rr() < 0.5), _d = new V3();
      for (let n = 0; n < 600 && B.length < 210; n++) { const b = out[Math.floor(rr(out.length))], u = rr(-0.5, 0.85), a = rr(TAU), sq = Math.sqrt(1 - u * u); _d.set(sq * Math.cos(a), u, sq * Math.sin(a));
        const x = b[0] + _d.x * b[3] * 1.06, y = b[1] + _d.y * b[4] * 1.06, z = b[2] + _d.z * b[5] * 1.06; if (y < gy + 0.8 || inside(x, y, z) || _d.x * (x - cx) + _d.z * (z - cz) < 0 && y < gy + 9) continue;
        let buried = false; for (const c of blobs) { if (c === b) continue; const ex = (x - c[0]) / c[3], ey = (y - c[1]) / c[4], ez = (z - c[2]) / c[5]; if (ex * ex + ey * ey + ez * ez < 1.0) { buried = true; break; } } if (buried) continue;
        const bunch = 2 + Math.floor(rr(3)), ripe0 = rr(); for (let m = 0; m < bunch; m++) B.push([x + rr(-0.7, 0.7), y + rr(-0.6, 0.6), z + rr(-0.7, 0.7), rr(0.42, 0.62), ripe0 + rr(-0.35, 0.35)]); }
      const berryM = mat(`void main(){ vec3 n=NORMAL; vec3 d=normalize(vL); vec2 q=vec2(atan(d.z,d.x)*2.4, d.y*3.4); q.x+=0.5*floor(q.y); vec2 c=fract(q)-0.5; float bump=1.0-smoothstep(0.0,0.5,length(c));
        n=normalize(n+vec3(-d.z*c.x, c.y*0.8, d.x*c.x)*-1.3); vec3 alb=vC*(0.45+0.9*bump);
        gl_FragColor=vec4(finish(shade(alb,n,vW,0.55,0.1),vW),1.0); }`);
      const bm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), berryM, B.length), m4 = new M4(), q = new Q4(), sc = new V3(), cc = new THREE.Color(), e = new THREE.Euler();
      B.forEach((b, n) => { q.setFromEuler(e.set(rr(-0.5, 0.5), rr(TAU), rr(-0.5, 0.5))); sc.set(b[3], b[3] * 1.18, b[3]); bm.setMatrixAt(n, m4.compose(_p.set(b[0], b[1], b[2]), q, sc));
        if (b[4] > 0.42) cc.setRGB(0.035, 0.018, 0.06); else if (b[4] > 0.12) cc.setRGB(0.50, 0.035, 0.07); else cc.setRGB(0.55, 0.50, 0.22); bm.setColorAt(n, cc); });
      bm.frustumCulled = false; bm.userData.noShadow = true; scene.add(bm); HOL.berries = B.length; HOL.canes = 41; HOL.leaves = leaves.count; }
    const rootM = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vec2(atan(vL.z,vL.x)*4.0,vL.y*0.4)); vec3 alb=mix(vec3(0.09,0.06,0.035),vec3(0.36,0.26,0.16),smoothstep(0.3,0.7,a));
      alb=mix(alb,vec3(0.14,0.30,0.05),smoothstep(0.5,0.7,fbm(vL.xy*0.3+2.0))*smoothstep(0.0,0.7,n.y)*0.7); gl_FragColor=vec4(finish(shade(alb,n,vW,0.06,0.2),vW),1.0); }`, { side: THREE.DoubleSide });
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(HOL.curve, 60, HOL.tr + 0.35, 14), rootM));
    Math.random = gameRandom;
  }
}

let _hPrev = new V3(), _hHas = false;
export function hollowCollide(p, v) {
  const dx = p.x - HOLLOW.x, dz = p.z - HOLLOW.z, d = Math.hypot(dx, dz); if (d > HOLLOW.r + 14) { _hHas = false; return; }
  if (!_hHas) _hPrev.copy(p); _hHas = true;
  // inside the root?
  let best = 1e9, bi = 0; for (let i = 0; i < HOL.S.length; i++) { const q = HOL.S[i], e = (q.x - p.x) ** 2 + (q.y - p.y) ** 2 + (q.z - p.z) ** 2; if (e < best) { best = e; bi = i; } }
  const ra = Math.sqrt(best), q = HOL.S[bi], inRoot = ra < HOL.tr + 0.2 && bi > 0 && bi < HOL.S.length - 1;
  if (inRoot) { if (ra > HOL.tr - PR) { const k = (HOL.tr - PR) / Math.max(ra, 0.01); p.set(q.x + (p.x - q.x) * k, q.y + (p.y - q.y) * k, q.z + (p.z - q.z) * k); } }
  else if (ra < HOL.tr + 0.35 + PR && bi > 0 && bi < HOL.S.length - 1) { const k = (HOL.tr + 0.35 + PR) / Math.max(ra, 0.01); p.set(q.x + (p.x - q.x) * k, q.y + (p.y - q.y) * k, q.z + (p.z - q.z) * k); }
  const d2 = Math.hypot(p.x - HOLLOW.x, p.z - HOLLOW.z);
  // the bramble wall
  if (!inRoot && Math.abs(d2 - HOLLOW.r) < 1.2 + PR + 0.3 && p.y < HOL.gy + HOLLOW.wallH + 1) { const pd = Math.hypot(_hPrev.x - HOLLOW.x, _hPrev.z - HOLLOW.z), t = pd < HOLLOW.r ? HOLLOW.r - 1.5 - PR : HOLLOW.r + 1.5 + PR, k = t / Math.max(d2, 0.01);
    p.x = HOLLOW.x + (p.x - HOLLOW.x) * k; p.z = HOLLOW.z + (p.z - HOLLOW.z) * k; const nx = (p.x - HOLLOW.x) / t, nz = (p.z - HOLLOW.z) / t, vn = (v.x * nx + v.z * nz) * (pd < HOLLOW.r ? -1 : 1); if (vn < 0) { v.x *= 0.3; v.z *= 0.3; } }
  // the leafy roof
  const ds = p.distanceTo(HOL.sc), dp = _hPrev.distanceTo(HOL.sc);
  if (d2 < HOLLOW.r + 1 && Math.abs(ds - HOL.Rs) < PR + 0.6) { const t = dp < HOL.Rs ? HOL.Rs - PR - 0.65 : HOL.Rs + PR + 0.65; _v.copy(p).sub(HOL.sc).setLength(t); p.copy(HOL.sc).add(_v); _v.normalize(); const vn = v.dot(_v) * (dp < HOL.Rs ? -1 : 1); if (vn < 0) v.addScaledVector(_v, dp < HOL.Rs ? vn : -vn); }
  _hPrev.copy(p);
}

// the brook: skimming low and fast over the water carries you; mist drifts on the surface
export function setupBrookLift() {
  G.seenBrook = false;
}

export function updateBrook(dt) {
  const cd = brookD(camera.position.x, camera.position.z);
  if (cd < 120 && Math.random() < dt * 14) { const i = (Math.random() * BROOKS.length) | 0, p = BROOKS[i]; if (p.distanceTo(camera.position) < 90) { _v.set(p.x + rnd(-3, 3), p.y + 0.4, p.z + rnd(-3, 3)); const q = parts[pNext]; puff(_v, 1, [0.92, 0.95, 1.0], 0, 0.06, 3.5); q.g = -0.15; q.v.set(WIND.dx * 1.5, 0.2, WIND.dz * 1.5); } }
  if (P.mode !== 'fly' || inHive) return; const bs = brookSeg(P.pos.x, P.pos.z); if (!bs || bs.d > BROOK.hw + 1) return;
  const wy = brookWY(bs.s), alt = P.pos.y - wy;
  if (alt < PR + 0.15) { P.pos.y = wy + PR + 0.15; if (P.vel.y < 0) P.vel.y = -P.vel.y * 0.4 + 1.5; P.vel.x *= 0.9; P.vel.z *= 0.9; P.wet = Math.min(1, P.wet + 0.25); _v.set(P.pos.x, wy + 0.1, P.pos.z); puff(_v, 8, [0.85, 0.93, 1], 1.5, 0.01, 0.6, 5, 1); noiseHit(800, 1, 0.08, 0.2, 'lowpass', 200); }
  else if (alt < 3.0 && Math.hypot(P.vel.x, P.vel.z) > 9) { G.boost = Math.max(G.boost, 1.0); if (Math.random() < dt * 16) { _v.set(P.pos.x + rnd(-0.5, 0.5), wy + 0.05, P.pos.z + rnd(-0.5, 0.5)); puff(_v, 1, [0.85, 0.93, 1], 0.8, 0.01, 0.5, 4, 0.8); }
    if (!G.seenBrook) { G.seenBrook = true; toast('<b>Cool air over the brook</b><br><span>skim low and fast and it carries you. Mind the branches</span>', 4); } }
}
