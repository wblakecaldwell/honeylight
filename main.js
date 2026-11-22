import * as THREE from './three.module.min.js';
THREE.ColorManagement.enabled = false;
const V3 = THREE.Vector3, Q4 = THREE.Quaternion, M4 = THREE.Matrix4;
const $ = id => document.getElementById(id);
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;

// ---------- world constants ----------
const RIN = 10, ROUT = 12.5, HTOP = 22, TY = 3, TR = 1.7, CELL = 0.9, CT = 1.2; // comb thickness
const GY = -14, WY = GY - 3.2, POND = { x: -125, z: 70, r: 58 };
const SUN_AZ = -40 * Math.PI / 180, SUN_EL = 17 * Math.PI / 180, FLOWER_AZ = 35 * Math.PI / 180;
const SUN = new V3(Math.cos(SUN_AZ) * Math.cos(SUN_EL), Math.sin(SUN_EL), Math.sin(SUN_AZ) * Math.cos(SUN_EL));
const FDIR = { x: Math.cos(FLOWER_AZ), z: Math.sin(FLOWER_AZ) }, FIELD_D = 165;
const DANCE_A = FLOWER_AZ - SUN_AZ; // angle from "up" on the comb
// ---------- zones & landmarks (round 2) ----------
let _seed = 90210; const srnd = (a = 1, b) => { _seed = (_seed * 16807) % 2147483647; const r = (_seed - 1) / 2147483646; return b === undefined ? r * a : a + r * (b - a); };
const ORCH = { x: 40, z: -215, r: 80 }, HEDGE_R = 96, HEDGE_GAP_W = 0.095;
const HEDGE_GAPS = [Math.atan2(-ORCH.z, -ORCH.x), Math.atan2(-ORCH.z, -ORCH.x) + 2.25];
const HEDGE_TUN = Math.atan2(-ORCH.z, -ORCH.x) - 1.5;
const inHedgeGap = a => HEDGE_GAPS.some(g => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < HEDGE_GAP_W);
const HILLS = [{ x: 205, z: -55, r: 75, h: 46 }, { x: -110, z: -175, r: 60, h: 28 }, { x: -235, z: -45, r: 65, h: 34 }, { x: 250, z: 150, r: 70, h: 24 }];
// ---------- batch 2: a misty brook, and a bramble hollow reached through a root ----------
const BROOK = { pts: [[-200, 112], [-222, 128], [-245, 132], [-262, 152], [-275, 178]], hw: 4.2, depth: 4.0, box: [-290, -185, 95, 195] };
const HOLLOW = { x: 120, z: 230, r: 16, wallH: 9 };
function brookSeg(x, z) { const b = BROOK.box; if (x < b[0] - 8 || x > b[1] + 8 || z < b[2] - 8 || z > b[3] + 8) return null; let best = 1e9, bs = 0;
  const P2 = BROOK.pts; for (let i = 0; i < P2.length - 1; i++) { const ax = P2[i][0], az = P2[i][1], dx = P2[i + 1][0] - ax, dz = P2[i + 1][1] - az, L2 = dx * dx + dz * dz; let t = ((x - ax) * dx + (z - az) * dz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = ax + dx * t - x, ez = az + dz * t - z, d = ex * ex + ez * ez; if (d < best) { best = d; bs = i + t; } } return { d: Math.sqrt(best), s: bs }; }
const brookD = (x, z) => { const r = brookSeg(x, z); return r ? r.d : 1e9; };
HOLLOW.a0 = Math.atan2(-HOLLOW.z, -HOLLOW.x) + 0.6;
function hollowRootD(x, z) { const ux = Math.cos(HOLLOW.a0), uz = Math.sin(HOLLOW.a0), px = x - HOLLOW.x, pz = z - HOLLOW.z, t = clamp(px * ux + pz * uz, 9, 28); return Math.hypot(px - ux * t, pz - uz * t); }
function terrainH(x, z) { const h0 = terrainBase(x, z); const bs = brookSeg(x, z); return bs ? h0 - BROOK.depth * smooth(BROOK.hw + 3.5, BROOK.hw - 1.0, bs.d) : h0; }
function terrainBase(x, z) {
  let h = GY + 2.2 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017) + 1.2 * Math.sin(x * 0.05 + z * 0.043);
  h -= 7.5 * smooth(POND.r + 18, POND.r - 22, Math.hypot(x - POND.x, z - POND.z));
  h += 2.5 * smooth(40, 12, Math.hypot(x, z));
  for (const H of HILLS) h += H.h * smooth(H.r, 0, Math.hypot(x - H.x, z - H.z));
  h += (5 + 3 * Math.sin(x * 0.05) * Math.cos(z * 0.04)) * smooth(ORCH.r + 40, ORCH.r, Math.hypot(x - ORCH.x, z - ORCH.z));
  return h;
}
const LOG = (() => { const axis = new V3(ORCH.x, 0, ORCH.z).normalize(), mid = new V3(22, 0, -88), len = 46, ro = 5.6, ri = 4.5; let mg = -1e9;
  for (let u = -len / 2; u <= len / 2; u += 2) mg = Math.max(mg, terrainH(mid.x + axis.x * u, mid.z + axis.z * u));
  return { c: new V3(mid.x, mg + ri + 0.4, mid.z), axis, len, ro, ri }; })();
const orchTrees = [];
{
  orchTrees.push({ x: ORCH.x, z: ORCH.z, R: 4.2, top: 0, cr: 16, nest: true });
  let guard = 0;
  while (orchTrees.length < 14 && guard++ < 2000) {
    const a = srnd(TAU), d = Math.sqrt(srnd()) * (ORCH.r - 8), x = ORCH.x + Math.cos(a) * d, z = ORCH.z + Math.sin(a) * d;
    if (orchTrees.some(t => Math.hypot(t.x - x, t.z - z) < 26)) continue;
    orchTrees.push({ x, z, R: srnd(2.2, 3.2), top: 0, cr: srnd(10.5, 13.5) });
  }
  for (const t of orchTrees) { t.gy = terrainH(t.x, t.z); t.top = t.gy + (t.nest ? 40 : srnd(24, 32)); }
}

// ---------- round 6: the forest edge (its own seed, so older landmarks stay put) ----------
const FOREST = { x: -95, z: 262, r: 58 };
const forestTrees = [], PADS0 = [];
{ let s = 4242; const fr = (a, b) => { s = (s * 16807) % 2147483647; const r = (s - 1) / 2147483646; return a + r * (b - a); };
  let guard = 0;
  while (forestTrees.length < 17 && guard++ < 3000) { const a = fr(0, TAU), d = Math.sqrt(fr(0, 1)) * (FOREST.r + 14), x = FOREST.x + Math.cos(a) * d, z = FOREST.z + Math.sin(a) * d;
    if (forestTrees.some(t => Math.hypot(t.x - x, t.z - z) < 18)) continue;
    forestTrees.push({ x, z, R: fr(1.8, 3.0), cr: fr(9, 12.5), h: fr(34, 48) }); }
  for (const t of forestTrees) { t.gy = terrainH(t.x, t.z); t.top = t.gy + t.h; t.blobs = [];
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + fr(0, 0.6), d = fr(0.2, 0.75) * t.cr; t.blobs.push([t.x + Math.cos(a) * d, t.top + fr(-0.35, 0.2) * t.cr, t.z + Math.sin(a) * d, t.cr * fr(0.5, 0.7), t.cr * fr(0.35, 0.5)]); }
    t.blobs.push([t.x, t.top + t.cr * 0.15, t.z, t.cr * 0.7, t.cr * 0.45]); }
  FOREST.rnd = fr;
}

const overWater = (x, z) => Math.hypot(x - POND.x, z - POND.z) < POND.r + 25 && terrainH(x, z) < WY - 0.05;
const COMBS = [-6.8, -3.4, 0, 3.4, 6.8].map((z, i) => ({ z, hw: Math.sqrt(RIN * RIN - z * z) - 1.4, yb: [9, 7.5, 8.5, 7, 9.5][i], holes: [] }));
COMBS[2].holes.push({ x: 5.6, y: 14, r: 1.0 }); COMBS[3].holes.push({ x: -2, y: 16, r: 1.0 }); COMBS[1].holes.push({ x: 1, y: 11.5, r: 0.9 });
const BIRTH_ID = { x: -1.5, y: 9.5 };
const BIRTH = { x: BIRTH_ID.x * CELL, y: BIRTH_ID.y * 1.7320508 * CELL, z: CT / 2, ci: 2 };

// ---------- renderer ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const DPR = Math.min(devicePixelRatio || 1, 1.5); let resScale = 1;
renderer.setPixelRatio(DPR);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, 1, 0.04, 1600);
camera.rotation.order = 'YXZ';
scene.add(camera);
function resize() { renderer.setPixelRatio(DPR * resScale); renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); if (window.__post) __post.resize(); }
addEventListener('resize', resize); resize();

// ---------- shaders ----------
// inverse of the post pass tone curve, for materials authored as final display colours
const UNTONE = `
vec3 untone(vec3 y){ y=clamp(y,0.0,0.97); vec3 x=pow(y,vec3(2.2))/1.0;
  vec3 a=2.43*x-2.51, b=0.59*x-0.03, c=0.14*x; return (-b-sqrt(max(b*b-4.0*a*c,0.0)))/(2.0*a); }
`;
function untoneJS(y) { y = clamp(y, 0, 0.97); const x = Math.pow(y, 2.2), a = 2.43 * x - 2.51, b = 0.59 * x - 0.03, c = 0.14 * x; return (-b - Math.sqrt(Math.max(b * b - 4 * a * c, 0))) / (2 * a); }
const untoneHex = h => new THREE.Color(untoneJS((h >> 16 & 255) / 255), untoneJS((h >> 8 & 255) / 255), untoneJS((h & 255) / 255));
const SHADOW_RES = 2048, SHADOW_HALF = 85;
const shadowRT = new THREE.WebGLRenderTarget(SHADOW_RES, SHADOW_RES, { depthBuffer: true });
shadowRT.depthTexture = new THREE.DepthTexture(SHADOW_RES, SHADOW_RES); shadowRT.depthTexture.type = THREE.UnsignedIntType;
shadowRT.depthTexture.compareFunction = THREE.LessEqualCompare; shadowRT.depthTexture.minFilter = shadowRT.depthTexture.magFilter = THREE.LinearFilter;
const U = { uTime: { value: 0 }, uCam: { value: new V3() }, uSun: { value: SUN }, uGlow: { value: 0 }, uShadow: { value: shadowRT.depthTexture }, uShadowM: { value: new M4() }, uShadowOn: { value: 0 } };
U.uWind = { value: new V3() }; U.uHome = { value: new V3(1, 0, 0) }; U.uHomeK = { value: 0 };
const MP = !/mp=0/.test(location.search); // model pass (trees, grass, hive door). ?mp=0 shows the old look
const cloverGLSL = () => `
    float cm=smoothstep(0.5,0.62,fbm(vW.xz*0.045+4.0))*step(${(WY + 1).toFixed(1)},vW.y);
    vec2 cg=vW.xz/0.9, ci=floor(cg); float ch=hash21(ci); vec2 q=fract(cg)-0.5-(vec2(hash21(ci+3.1),hash21(ci+7.7))-0.5)*0.3; float ra=ch*6.2832; q=mat2(cos(ra),-sin(ra),sin(ra),cos(ra))*q;
    float lf=0.0, chev=0.0; for(int k=0;k<3;k++){ float a=float(k)*2.0944; vec2 lq=q-vec2(cos(a),sin(a))*0.15; float r=length(lq); lf=max(lf,1.0-smoothstep(0.12,0.14,r)); chev=max(chev,(1.0-smoothstep(0.0,0.014,abs(r-0.07)))*(1.0-smoothstep(0.12,0.14,r))); }
    alb=mix(alb,vec3(0.05,0.15,0.025)*(0.8+0.35*ch)+chev*vec3(0.05,0.06,0.03),lf*cm*step(ch,0.75));
    float ms=smoothstep(0.55,0.7,fbm(vW.xz*0.06+11.0)); alb=mix(alb,vec3(0.13,0.27,0.04)*(0.55+0.8*vnoise(vW.xz*14.0)),ms*0.55*(1.0-cm));`;
U.uSunC = { value: new V3(2.9, 2.1, 1.3) }; U.uAmb = { value: 1 }; U.uHaze = { value: new V3(1, 1, 1) }; U.uClose = { value: 0 };
// night hooks (night.js): uNight 0..1 turns the sun into the moon and brings out the stars; uLamp is one soft light that travels with the bee (xyz, strength)
U.uNight = { value: 0 }; U.uLamp = { value: new THREE.Vector4(0, 0, 0, 0) }; U.uLampC = { value: new V3(1.0, 0.78, 0.36) };
const SWAYGLSL = `uniform float uTime; uniform vec3 uWind; attribute float aSway;
vec2 sway(vec2 p){ float ph=p.x*0.07+p.y*0.05; float s=sin(uTime*1.3+ph)*0.6+sin(uTime*2.9+ph*1.7)*0.25; return uWind.xy*(uWind.z*0.55+s*(0.35+uWind.z*0.4)); }
`;
const VERT = `
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv; varying vec3 vL;
void main(){
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
    m = modelMatrix*instanceMatrix;
  #endif
  vec4 w = m*vec4(position,1.0); vW=w.xyz; vL=position; vN=normalize(mat3(m)*normal); vUv=uv;
  vC=vec3(1.0);
  #ifdef USE_COLOR
    vC=color;
  #endif
  #ifdef USE_INSTANCING_COLOR
    vC*=instanceColor;
  #endif
  gl_Position=projectionMatrix*viewMatrix*w;
}`;
const COMMON = `
uniform float uTime; uniform vec3 uCam; uniform vec3 uSun; uniform float uGlow; uniform highp sampler2DShadow uShadow; uniform mat4 uShadowM; uniform float uShadowOn; uniform vec3 uSunC; uniform float uAmb; uniform vec3 uHaze; uniform float uNight; uniform vec4 uLamp; uniform vec3 uLampC;
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv; varying vec3 vL;
float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+7.1; a*=.5; } return s; }
float inHive(vec3 p){ return (1.0-smoothstep(11.6,12.4,length(p.xz)))*step(-0.5,p.y)*step(p.y,22.6); }
float sunShadow(vec3 p, vec3 n){
  if(uShadowOn<0.5) return 1.0;
  vec4 s=uShadowM*vec4(p+n*0.10+uSun*0.08,1.0); vec3 c=s.xyz*0.5+0.5;
  vec2 e=abs(c.xy-0.5)*2.0; float edge=max(e.x,e.y);
  if(edge>1.0||c.z>1.0) return 1.0;
  float t=1.15/${SHADOW_RES}.0, z=c.z-0.0006, sh=0.0;
  sh+=texture(uShadow,vec3(c.xy,z));
  sh+=texture(uShadow,vec3(c.xy+vec2(-1.5,-0.5)*t,z)); sh+=texture(uShadow,vec3(c.xy+vec2(1.5,0.5)*t,z));
  sh+=texture(uShadow,vec3(c.xy+vec2(-0.5,1.5)*t,z)); sh+=texture(uShadow,vec3(c.xy+vec2(0.5,-1.5)*t,z));
  sh+=texture(uShadow,vec3(c.xy+vec2(-1.8,1.4)*t,z)); sh+=texture(uShadow,vec3(c.xy+vec2(1.8,-1.4)*t,z));
  sh+=texture(uShadow,vec3(c.xy+vec2(1.3,1.9)*t,z)); sh+=texture(uShadow,vec3(c.xy+vec2(-1.3,-1.9)*t,z));
  return mix(sh/9.0,1.0,smoothstep(0.8,1.0,edge));
}
vec3 hazeCol(vec3 dir){
  float sd=max(dot(dir,uSun),0.0);
  vec3 c=mix(vec3(0.46,0.52,0.70), vec3(1.30,0.84,0.46), 0.12+0.88*pow(sd,2.0));
  vec3 hc=c+vec3(1.4,0.75,0.3)*pow(sd,20.0)*0.9;
  if(uNight>0.001) hc=mix(hc, vec3(0.50,0.56,0.70)+vec3(0.55,0.60,0.75)*pow(sd,6.0), uNight);
  return hc*uHaze;
}
bool inHole(vec3 p){ return p.x>0.0 && length(vec2(p.y-${TY.toFixed(1)},p.z))<${TR.toFixed(2)}; }
vec3 shade(vec3 alb, vec3 n, vec3 p, float spec, float sss){
  float ih=inHive(p);
  vec3 V=normalize(uCam-p);
  float nd=dot(n,uSun);
  float shd=ih>0.99? 1.0 : sunShadow(p,n);
  vec3 sunC=uSunC;
  float back=pow(max(dot(-V,uSun),0.0),2.0);
  vec3 lo=alb*( sunC*shd*max(nd,0.0) + sunC*shd*sss*(0.45*max(-nd,0.0)+0.9*back)
     + uAmb*(vec3(0.22,0.30,0.50)*(0.55+0.45*n.y)*(0.75+0.25*shd) + vec3(0.26,0.19,0.08)*(0.5-0.5*n.y)) );
  vec3 H=normalize(uSun+V); lo+=sunC*shd*spec*pow(max(dot(n,H),0.0),48.0)*step(0.0,nd);
  if(uLamp.w>0.0){ vec3 Lq=uLamp.xyz-p; float dq=dot(Lq,Lq); lo+=alb*uLampC*(uLamp.w/(1.0+dq*0.045))*(0.35+0.65*max(dot(n,Lq*inversesqrt(dq+1e-4)),0.0)); }
  lo+=uAmb*vec3(1.1,0.75,0.42)*spec*0.6*pow(1.0-max(dot(n,V),0.0),4.0)*(0.3+0.7*shd);
  vec3 L=vec3(10.6,${TY.toFixed(1)},0.0)-p; float d=length(L); L/=d;
  float att=24.0/(8.0+d*d);
  float wrap=max(dot(n,L)*0.6+0.4,0.0);
  vec3 dayC=vec3(2.9,2.25,1.45);
  vec3 amb=vec3(0.30,0.135,0.036)*(1.0+0.8*uGlow)*(0.75+0.25*n.y);
  vec3 li=alb*(amb + dayC*att*(wrap+sss*0.5));
  vec3 H2=normalize(L+V); li+=dayC*att*spec*pow(max(dot(n,H2),0.0),32.0);
  li+=vec3(0.55,0.28,0.07)*spec*pow(1.0-max(dot(n,V),0.0),3.0)*(0.6+uGlow);
  return mix(lo,li,ih);
}
vec3 tone(vec3 c){ return c; } // scene renders linear HDR; tone mapping + grading happen in the post pass
vec3 finish(vec3 c, vec3 p){
  float ih=inHive(p); float dist=length(p-uCam);
  vec3 dir=(p-uCam)/max(dist,1e-4);
  float hgt=exp(-max(p.y-(${GY}.0),0.0)*0.035);
  float f=(1.0-exp(-dist*(0.0012+0.0024*hgt)))*(1.0-ih);
  return mix(c,hazeCol(dir),f);
}
#define NORMAL (gl_FrontFacing? normalize(vN) : -normalize(vN))
` + UNTONE;
function mat(frag, o = {}) {
  const { uniforms, vert, ...rest } = o;
  return new THREE.ShaderMaterial({ uniforms: { ...U, ...(uniforms || {}) }, vertexShader: vert || VERT, fragmentShader: COMMON + frag, ...rest });
}
const simple = (albedo, spec = 0.05, sss = 0, extra = {}) => mat(`void main(){ vec3 n=NORMAL; gl_FragColor=vec4(finish(shade(vC*vec3(${albedo}),n,vW,${spec.toFixed(2)},${sss.toFixed(2)}),vW),1.0); }`, extra);

// ---------- geometry helpers ----------
function geoParts(parts) {
  const pos = [], nor = [], col = [];
  for (const { g, c } of parts) {
    const gg = g.index ? g.toNonIndexed() : g; const p = gg.attributes.position, n = gg.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i); pos.push(x, y, z); nor.push(n.getX(i), n.getY(i), n.getZ(i));
      const cc = typeof c === 'function' ? c(x, y, z) : c; col.push(cc[0], cc[1], cc[2]);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}
function ell(rx, ry, rz, x, y, z, seg = 14) { const g = new THREE.SphereGeometry(1, seg, Math.max(6, seg * 0.7 | 0)); g.scale(rx, ry, rz); g.translate(x, y, z); return g; }
function stick(a, b, r) {
  const A = new V3(...a), B = new V3(...b), d = B.clone().sub(A), len = d.length();
  const g = new THREE.CylinderGeometry(r, r * 0.8, len, 8, 1);
  g.applyQuaternion(new Q4().setFromUnitVectors(new V3(0, 1, 0), d.normalize()));
  const m = A.add(B).multiplyScalar(0.5); g.translate(m.x, m.y, m.z); return g;
}

// ---------- sky ----------
const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 20), mat(`uniform vec3 uHome; uniform float uHomeK;
void main(){ vec3 dir=normalize(vL); float e=dir.y;
  vec3 hz=hazeCol(dir), zen=vec3(0.07,0.17,0.46)*uHaze;
  vec3 c=mix(hz,zen,pow(clamp(e,0.,1.),0.5));
  float sd=max(dot(dir,uSun),0.);
  vec3 glowC=vec3(1.5,0.85,0.35), discC=vec3(30.,22.,12.);
  if(uNight>0.001){ glowC=mix(glowC,vec3(0.10,0.13,0.22),uNight); vec2 mq=dir.xz*40.0+dir.y*17.0; discC=mix(discC,vec3(5.2,5.6,6.4)*(0.72+0.5*fbm(mq)),uNight);
    vec3 sp=dir*210.0; vec3 si=floor(sp); float sh=hash21(si.xy+si.z*17.13); float sr=length(fract(sp)-0.5-(vec3(hash21(si.yz+1.7),hash21(si.zx+5.1),hash21(si.xy+9.3))-0.5)*0.6);
    float star=step(0.972,sh)*smoothstep(0.13,0.02,sr)*(0.55+0.45*sin(uTime*(1.0+sh*3.0)+sh*90.0));
    c+=vec3(0.75,0.82,1.0)*star*(0.5+3.0*fract(sh*37.0))*uNight*smoothstep(0.03,0.25,e)*(1.0-smoothstep(0.985,0.9992,sd)); }
  c+=glowC*(pow(sd,5.)*0.35+pow(sd,60.)*1.4)+discC*smoothstep(0.9992,0.9996,sd);
  vec2 cu=dir.xz/(abs(dir.y)+0.14)*1.3; float cl=fbm(cu+uTime*0.004);
  cl=smoothstep(0.50,0.80,cl)*smoothstep(0.02,0.2,e);
  float thick=fbm(cu*3.0);
  vec3 cloudC=mix(vec3(0.78,0.66,0.72), vec3(1.9,1.25,0.7), pow(sd,3.0))*(0.7+0.35*thick);
  cloudC+=vec3(2.2,1.2,0.5)*pow(sd,12.0)*(1.0-thick)*1.2;
  if(uNight>0.001) cloudC=mix(cloudC,(vec3(1.5,1.6,1.9)+vec3(3.5,3.7,4.2)*pow(sd,6.0)*(1.0-thick))*(0.6+0.4*thick),uNight);
  c=mix(c, cloudC*uHaze, cl*0.85);
  // the sky's light pattern: a faint pearly shimmer standing over home, the way bees read polarized light
  float hd=max(dot(normalize(dir.xz+vec2(1e-5)),uHome.xz),0.0); float band=pow(hd,30.0)*smoothstep(0.0,0.05,e)*smoothstep(0.9,0.12,e);
  float shim=0.55+0.45*sin(e*70.0-uTime*1.2+dir.x*9.0+dir.z*9.0);
  vec3 shz=uHaze; if(uNight>0.001) shz=mix(uHaze,vec3(0.26,0.32,0.50),uNight); // at night the shimmer over home must still show
  c+=mix(vec3(0.75,0.7,1.1),vec3(0.95,0.85,0.6),smoothstep(0.0,0.4,e))*band*shim*uHomeK*0.5*shz;
  float az=atan(dir.z,dir.x); vec2 ac=vec2(cos(az),sin(az));
  float hh=0.03+0.035*vnoise(ac*3.0+2.0)+0.012*vnoise(ac*11.0);
  vec3 hillC=vec3(0.20,0.24,0.20); if(uNight>0.001) hillC*=1.0-0.9*uNight;
  c=mix(c, mix(hillC,hz,0.62), smoothstep(hh,hh-0.004,e));
  c=mix(c, hz, smoothstep(0.0,-0.05,e));
  gl_FragColor=vec4(tone(c),1.0); }`, { side: THREE.BackSide, depthWrite: false }));
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

// ---------- hive shell ----------
const woodFrag = (base, hole) => `
void main(){ ${hole ? 'if(inHole(vW)) discard;' : ''} vec3 n=NORMAL;
  float a=atan(vW.z,vW.x); float g=fbm(vec2(a*9.0,vW.y*0.35)); float g2=fbm(vec2(a*40.0,vW.y*1.2));
  vec3 alb=mix(vec3(${base})*0.45, vec3(${base})*1.25, g)*(0.75+0.5*g2);
  alb=mix(alb, vec3(0.34,0.14,0.03), smoothstep(0.62,0.8,fbm(vW.xy*0.6+vW.z))*0.6);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.12,0.0),vW),1.0); }`;
const innerWall = new THREE.Mesh(new THREE.CylinderGeometry(RIN, RIN, HTOP + 0.6, 56, 1, true), mat(woodFrag('0.36,0.20,0.09', true), { side: THREE.BackSide }));
innerWall.position.y = HTOP / 2; scene.add(innerWall);
for (const y of [0, HTOP]) {
  const d = new THREE.Mesh(new THREE.CircleGeometry(RIN + 0.2, 40), mat(`void main(){ vec3 n=NORMAL; float g=fbm(vW.xz*0.9);
    vec3 alb=mix(vec3(0.16,0.09,0.04),vec3(0.42,0.26,0.11),g); gl_FragColor=vec4(finish(shade(alb,n,vW,0.05,0.0),vW),1.0); }`, { side: THREE.DoubleSide }));
  d.rotation.x = y ? Math.PI / 2 : -Math.PI / 2; d.position.y = y; scene.add(d);
}
const tunnelG = new THREE.CylinderGeometry(TR, TR, 3.9, 24, 1, true); tunnelG.rotateZ(Math.PI / 2);
const tunnel = new THREE.Mesh(tunnelG, mat(`void main(){ vec3 n=NORMAL; float g=fbm(vec2(vW.x*2.5, atan(vW.z,vW.y-${TY.toFixed(1)})*3.0));
  vec3 alb=mix(vec3(0.20,0.11,0.05),vec3(0.52,0.33,0.16),g); gl_FragColor=vec4(finish(shade(alb,n,vW,0.1,0.0),vW),1.0); }`, { side: THREE.BackSide }));
tunnel.position.set(11.35, TY, 0); scene.add(tunnel);
// light shaft from the entrance
const shaftG = new THREE.CylinderGeometry(TR * 0.85, 5.2, 13, 28, 1, true); shaftG.rotateZ(-Math.PI / 2);
const shaft = new THREE.Mesh(shaftG, mat(`void main(){ vec3 V=normalize(uCam-vW); float e=pow(abs(dot(normalize(vN),V)),2.0);
  float along=smoothstep(-6.5,6.5,vL.x); float a=e*along*along*0.22*(0.8+0.2*fbm(vW.yz*1.3+uTime*0.1));
  gl_FragColor=vec4(vec3(1.25,0.95,0.6)*a*1.3,1.0); }`, { side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
shaft.position.set(3.4, TY - 0.6, 0); shaft.rotation.z = 0.09; scene.add(shaft);

// ---------- comb ----------
const combUniforms = { uLarva: { value: 3 }, uHoney: { value: 0 }, uPulse: { value: 0 }, uBirth: { value: new THREE.Vector4(BIRTH_ID.x, BIRTH_ID.y, 0, 1) } };
const combFrag = `
uniform float uHoney; uniform float uPulse; uniform vec4 uBirth; uniform float uCombZ; uniform float uLarva;
const vec2 HS=vec2(1.0,1.7320508);
vec4 hexC(vec2 uv){ vec4 hC=floor(vec4(uv,uv-vec2(0.5,1.0))/HS.xyxy)+0.5;
  vec4 h=vec4(uv-hC.xy*HS, uv-(hC.zw+0.5)*HS);
  return dot(h.xy,h.xy)<dot(h.zw,h.zw)? vec4(h.xy,hC.xy) : vec4(h.zw,hC.zw+0.5); }
float hexD(vec2 p){ p=abs(p); return max(dot(p,HS*0.5),p.x); }
void main(){
  vec3 n=NORMAL; vec3 V=normalize(uCam-vW);
  vec3 wax=vec3(0.72,0.40,0.09);
  if(abs(n.z)<0.5){ gl_FragColor=vec4(finish(shade(wax*(0.7+0.4*fbm(vW.xy*3.0)),n,vW,0.25,0.5),vW),1.0); return; }
  float sgn=sign(n.z);
  vec2 uv=vW.xy/${CELL.toFixed(2)};
  vec4 h=hexC(uv);
  if(uBirth.w>0.5 && sgn>0.0 && abs(uCombZ-uBirth.z)<0.1 && distance(h.zw,uBirth.xy)<0.1 && hexD(h.xy)<0.47) discard;
  float e=hexD(h.xy);
  float r1=hash21(h.zw*1.31+uCombZ*7.3+sgn*3.1), r2=hash21(h.zw*2.17+uCombZ*1.9-sgn*5.0);
  vec2 zc=(vW.xy-vec2(0.0,15.0))/vec2(6.5,5.5);
  float zr=length(zc)+(vnoise(h.zw*0.33+uCombZ)-0.5)*0.55 + abs(uCombZ)*0.05;
  float age=smoothstep(1.3,0.2,zr); // brood comb is older, darker
  wax=mix(wax, vec3(0.42,0.22,0.07), age*0.75)*(0.85+0.3*vnoise(vW.xy*4.0));
  float D=0.85; int kind=0; // 0 empty 1 larva 2 brood cap 3 pollen 4 honey 5 honey cap
  if(zr<0.62){ if(r1<0.48){kind=2;D=0.0;} else if(r1<0.82){kind=1;D=0.75;} }
  else if(zr<0.84){ if(r1<0.62){kind=3;D=0.42;} }
  else { float th=0.22+0.74*uHoney; if(r1<th*0.45){kind=5;D=0.0;} else if(r1<th){kind=4;D=0.26;} }
  vec2 pf=h.xy - V.xy/max(abs(V.z),0.3)*D*0.55;
  float ef=hexD(pf);
  vec3 col; vec3 emis=vec3(0.0); float spec=0.25, sss=0.5;
  float rim=smoothstep(0.415,0.45,e);
  if(kind==2){ col=mix(vec3(0.50,0.31,0.12),vec3(0.62,0.42,0.18),r2)*(0.75+0.35*vnoise(vW.xy*9.0))*(1.0-0.5*smoothstep(0.3,0.44,e)); spec=0.08; }
  else if(kind==5){ col=mix(vec3(0.95,0.80,0.46),vec3(0.82,0.60,0.22),vnoise(vW.xy*6.0+r2*9.0))*(1.0-0.35*smoothstep(0.3,0.44,e)); spec=0.5; emis=vec3(0.30,0.14,0.02)*(0.25+uPulse); }
  else if(ef<0.43){
    float ao=mix(1.0,0.22,D);
    if(kind==0){ col=wax*ao*0.8; }
    else if(kind==1 && uLarva>0.5){
      // detailed brood: a plump, segmented grub lying curled in a milky pool of royal jelly
      float wig = uLarva>2.5 ? sin(uTime*1.3+r2*40.0)*0.4+sin(uTime*3.1+r2*11.0)*0.08 : 0.0, br = uLarva>2.5 ? 1.0+0.06*sin(uTime*2.3+r2*17.0) : 1.0;
      float ang0=r2*6.2832+wig; vec2 q=mat2(cos(ang0),-sin(ang0),sin(ang0),cos(ang0))*pf;
      float stage = uLarva>1.5 ? r2*1.37 - floor(r2*1.37) : 0.8; // 0..0.18 egg, ..0.45 young, else big
      float ra = stage<0.45 ? 0.11 : 0.19, rb = (stage<0.45 ? 0.05 : 0.095)*br;
      vec2 sc=vec2(sin(2.75),cos(2.75)); vec2 qa=vec2(abs(q.x),q.y);
      float cl = (sc.y*qa.x>sc.x*qa.y) ? length(qa-sc*ra) : abs(length(q)-ra);
      float tk = rb*(0.82+0.3*smoothstep(-0.6,0.9,q.y/ra)); // thicker tail, slimmer head end
      float jelly = smoothstep(0.37,0.33,length(pf+vec2(0.0,0.03)));
      vec3 jc = mix(vec3(0.86,0.82,0.66),vec3(1.0,0.97,0.86),vnoise(pf*9.0+r2*30.0+uTime*(uLarva>2.5?0.2:0.0))); jc += vec3(0.5)*smoothstep(0.82,0.9,vnoise(pf*30.0+r2*50.0)); // little bubbles
      col = mix(wax*ao*0.6, jc*0.42, jelly*0.85*(stage<0.18?0.0:1.0)); spec=mix(0.1,1.3,jelly); sss=0.6;
      col *= 1.0-0.55*smoothstep(tk+0.05,tk,cl)*step(0.18,stage); // the grub's soft shadow in the jelly
      vec3 nn=n;
      if(stage<0.18){ // a single egg, standing like a tiny grain of rice
        float ed=length(q*vec2(1.0,0.55)); if(ed<0.07){ float hz=sqrt(max(0.0,1.0-ed*ed/0.0049)); nn=normalize(vec3(q*vec2(1.0,0.3)/0.07*(1.0-hz),hz*sgn)); col=vec3(0.97,0.95,0.9); spec=1.0; sss=1.2; } }
      else if(cl<tk){ float u=cl/tk, hz=sqrt(max(0.0,1.0-u*u)); vec2 g=normalize(length(q)>ra ? q : -q)*(length(q)-ra>0.0?1.0:-1.0); if(sc.y*qa.x>sc.x*qa.y) g=normalize(qa-sc*ra)*vec2(sign(q.x),1.0);
        nn=normalize(vec3(g*u*0.9,hz*sgn+0.0001)); float a=atan(q.y,q.x);
        float seg=0.7+0.3*smoothstep(-0.2,0.6,sin(a*(stage<0.45?8.0:11.0)-(uLarva>2.5?uTime*3.0+r2*9.0:0.0))); // a slow squirm rolls down the body float spir=smoothstep(0.018,0.008,length(vec2(fract(a*15.0/6.2832)-0.5,(u-0.55)*0.6)*vec2(0.06,1.0))*8.0);
        col=mix(vec3(1.0,0.96,0.86),vec3(0.93,0.9,0.72),smoothstep(0.3,0.9,u))*seg*(0.75+0.3*hz); col=mix(col,vec3(0.78,0.74,0.58),smoothstep(0.55,0.75,vnoise(q*40.0+r2*9.0))*0.25); // waxy, slightly see-through skin col=mix(col,vec3(0.55,0.42,0.30),spir*0.6*step(0.45,stage)); spec=1.5; sss=1.5; // wet
        // the head end: a slightly golden, glossier cap
        float head=smoothstep(0.06,0.0,length(q-vec2(-sc.x,sc.y)*ra)); col=mix(col,vec3(0.98,0.88,0.62),head*0.6); }
      n=nn;
    }
    else if(kind==1){ float rr=length(pf); float ang=atan(pf.y,pf.x)+r2*6.28;
      float body=smoothstep(0.09,0.14,rr)*smoothstep(0.34,0.29,rr)*smoothstep(-0.9,-0.6,cos(ang));
      float seg=0.85+0.15*sin(ang*9.0);
      col=mix(wax*ao*0.7, vec3(0.92,0.88,0.78)*seg, body); spec=mix(0.1,0.7,body); sss=mix(0.3,1.0,body); }
    else if(kind==3){ vec3 pc=r2<0.4? vec3(0.95,0.55,0.05) : r2<0.65? vec3(0.9,0.78,0.15) : r2<0.82? vec3(0.75,0.22,0.08) : vec3(0.45,0.25,0.6);
      col=pc*(0.6+0.4*fbm(pf*14.0+r2*20.0))*0.75; spec=0.03; }
    else { float sh=vnoise(pf*5.0+uTime*0.15+r2*30.0);
      col=vec3(0.85,0.36,0.03)*(0.55+0.3*sh); spec=1.2; sss=1.2;
      emis=vec3(0.55,0.22,0.02)*(0.35+0.25*uGlow+1.2*uPulse*(0.5+0.5*sin(uTime*5.0+r2*40.0))); }
  } else { float t=clamp((0.43-e)/max(ef-e,1e-3),0.0,1.0); col=wax*mix(0.95,0.22,t); if(kind==4) emis=vec3(0.3,0.12,0.01)*t*(0.4+uPulse); }
  if(kind==2 && uLarva>1.5 && r2<0.3){ // some cells still open: a pale pupa, eyes darkening with age
    float D2=0.6; vec2 pp=h.xy - V.xy/max(abs(V.z),0.3)*D2*0.55; float ep=hexD(pp);
    if(ep<0.43){ float ao2=0.45; vec2 q=pp; float a0=r2*20.0; q=mat2(cos(a0),-sin(a0),sin(a0),cos(a0))*q;
      col=wax*ao2*0.55; spec=0.1; vec3 nn=n; float b=0.0; vec2 g=vec2(0.0); float u=1.0;
      float dh=length((q-vec2(0.0,0.2))/vec2(0.12,0.10)), dt=length((q-vec2(0.0,0.04))/vec2(0.12,0.11)), da=length((q-vec2(0.0,-0.17))/vec2(0.13,0.17));
      float dm=min(dh,min(dt,da)); if(dm<1.0){ u=dm; float hz=sqrt(max(0.0,1.0-u*u)); vec2 c=dm==dh?vec2(0.0,0.2):dm==dt?vec2(0.0,0.04):vec2(0.0,-0.17); g=normalize(q-c+1e-4);
        nn=normalize(vec3(g*u*0.9,hz*sgn+0.0001)); float age2=fract(r2*7.3);
        col=vec3(0.95,0.91,0.82)*(0.8+0.2*hz); if(dm==da) col*=0.85+0.15*smoothstep(-0.3,0.5,sin((q.y+0.17)*70.0));
        float eye=smoothstep(0.05,0.035,min(length(q-vec2(-0.075,0.22)),length(q-vec2(0.075,0.22))));
        col=mix(col,mix(vec3(0.75,0.35,0.55),vec3(0.12,0.06,0.08),age2),eye); spec=0.6; sss=1.1; }
      n=nn; }
    else { float t2=clamp((0.43-e)/max(ep-e,1e-3),0.0,1.0); col=wax*mix(0.95,0.25,t2); }
  }
  col=mix(col, wax*1.1, rim); spec=mix(spec,0.3,rim); emis*=1.0-rim;
  gl_FragColor=vec4(finish(shade(col,n,vW,spec,sss)+emis,vW),1.0);
}`;
COMBS.forEach((c, i) => {
  const s = new THREE.Shape(), R = 2.6, w = c.hw;
  s.moveTo(-w, HTOP); s.lineTo(-w, c.yb + R); s.absarc(-w + R, c.yb + R, R, Math.PI, Math.PI * 1.5, false);
  s.lineTo(w - R, c.yb); s.absarc(w - R, c.yb + R, R, Math.PI * 1.5, TAU, false); s.lineTo(w, HTOP); s.lineTo(-w, HTOP);
  for (const h of c.holes) { const p = new THREE.Path(); p.absarc(h.x, h.y, h.r, 0, TAU, true); s.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(s, { depth: CT, bevelEnabled: false, curveSegments: 14 }); g.translate(0, 0, c.z - CT / 2);
  scene.add(new THREE.Mesh(g, mat(combFrag, { uniforms: { ...combUniforms, uCombZ: { value: c.z } } })));
});

// ---------- birth cell ----------
const cellGroup = new THREE.Group(); cellGroup.position.set(BIRTH.x, BIRTH.y, BIRTH.z); scene.add(cellGroup);
{
  const RC = 0.5774 * CELL;
  const tg = new THREE.CylinderGeometry(RC, RC * 0.9, 1.05, 6, 4, true); tg.rotateX(Math.PI / 2); tg.translate(0, 0, -0.525);
  const cols = []; const p = tg.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = smooth(-1.05, 0, p.getZ(i)); const k = t * t * t; cols.push(untoneJS(lerp(0.025, 0.42, k)), untoneJS(lerp(0.012, 0.21, k)), untoneJS(lerp(0.004, 0.05, k))); }
  tg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  cellGroup.add(new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const back = new THREE.Mesh(new THREE.CircleGeometry(RC, 6), new THREE.MeshBasicMaterial({ color: untoneHex(0x120903) })); back.position.z = -1.05; cellGroup.add(back);
}
const capPieces = [];
{
  const RC = 0.5774 * CELL * 1.05, hv = [], iv = [];
  for (let k = 0; k < 6; k++) { const a = Math.PI / 2 + k * Math.PI / 3; hv.push([Math.cos(a) * RC, Math.sin(a) * RC]); iv.push([Math.cos(a) * RC * 0.46, Math.sin(a) * RC * 0.46]); }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const polys = [];
  for (let k = 0; k < 6; k++) {
    const k2 = (k + 1) % 6, m = mid(hv[k], hv[k2]), am = mid(iv[k], iv[k2]);
    polys.push({ pts: [[0, 0], iv[k], iv[k2]], ring: 0 }, { pts: [iv[k], hv[k], m, am], ring: 1 }, { pts: [am, m, hv[k2], iv[k2]], ring: 1 });
  }
  for (const { pts, ring } of polys) {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const v = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; v.push(0, 0, 0, (a[0] - cx) * 0.95, (a[1] - cy) * 0.95, 0, (b[0] - cx) * 0.95, (b[1] - cy) * 0.95, 0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    const sh = rnd(0.8, 1.05);
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uS: { value: sh }, uO: { value: new THREE.Vector2(cx, cy) } }, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vP; uniform vec2 uO; void main(){ vP=position.xy+uO; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: UNTONE + `varying vec2 vP; uniform float uS; float h(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){ float t=n(vP*9.0)*0.6+n(vP*26.0)*0.4; float glow=1.0-smoothstep(0.0,0.6,length(vP));
          vec3 c=mix(vec3(0.34,0.17,0.04),vec3(0.98,0.70,0.26),t*0.55+glow*0.5)*uS; if(!gl_FrontFacing) c*=vec3(0.9,0.75,0.5); gl_FragColor=vec4(untone(c)*(1.0+0.6*glow),1.0); }` }));
    m.userData = { home: new V3(cx, cy, 0.012), ring, vel: new V3(), spin: new V3(), life: 0, on: true };
    m.position.copy(m.userData.home); cellGroup.add(m); capPieces.push(m);
  }
}
function resetCap() { for (const m of capPieces) { m.userData.on = true; m.userData.life = 0; m.visible = true; m.position.copy(m.userData.home); m.rotation.set(0, 0, 0); } }

// ---------- bees ----------
const BEE_VERT = VERT.replace('void main(){', 'uniform float uTime; attribute vec4 aMove; attribute float aPol; varying float vPol;\nvoid main(){').replace('vec4 w = m*vec4(position,1.0);', `vec3 pp=position; float isLeg=0.0; vPol=0.0;
  #ifdef USE_COLOR
  isLeg=step(abs(color.r-0.05),0.004)*step(abs(color.g-0.03),0.004)*step(abs(color.b-0.02),0.003);
  float isPol=step(abs(color.r-0.93),0.004)*step(abs(color.g-0.64),0.004)*step(abs(color.b-0.09),0.004);
  vec3 polC=vec3(sign(pp.x)*0.335,-0.08,-0.175); pp=mix(pp,polC+(pp-polC)*aPol,isPol); isLeg=max(isLeg,isPol); vPol=isPol;
  #endif
  float reach=clamp((abs(pp.x)-0.06)/0.3,0.0,1.0); float ph=aMove.z, fl=aMove.w;
  float wig=0.0;
  pp.z-=isLeg*reach*(aMove.x*0.24+wig*0.04*(0.5+fl));
  pp.x+=isLeg*(reach+clamp(-pp.y*2.0,0.0,1.0))*aMove.y*0.2;
  pp.y-=isLeg*reach*fl*0.11;
  float abd=smoothstep(-0.1,-0.45,pp.z)*(1.0-isLeg);
  pp.y+=abd*(sin(uTime*2.2+ph)*0.03*(0.3+fl)-aMove.x*0.06)*(-pp.z);
  pp.x+=abd*aMove.y*0.10*(-pp.z);
  float head=smoothstep(0.24,0.34,pp.z)*(1.0-isLeg);
  pp.x+=head*aMove.y*0.05; pp.y+=head*(sin(uTime*1.7+ph)*0.012-aMove.x*0.02);
  vec4 w = m*vec4(pp,1.0);`);
const BEE_SEGS = [0, 1, 2, 3, 4, 5].map(i => { const t = i / 5; return [0.205 * Math.pow(Math.sin(Math.PI * (0.18 + t * 0.74)), 0.6) + 0.02, -0.13 - i * 0.092, i % 2 === 1 || i === 5]; });
const beeGeo = (() => {
  const amber = [0.70, 0.42, 0.08], dark = [0.06, 0.035, 0.02], fuzz = [0.25, 0.15, 0.05], leg = [0.05, 0.03, 0.02], ant = [0.04, 0.03, 0.025], eye = [0.012, 0.01, 0.01], head = [0.09, 0.06, 0.04];
  const parts = [
    { g: ell(0.18, 0.17, 0.19, 0, 0.03, 0.13, 20), c: fuzz },
    { g: ell(0.06, 0.06, 0.07, 0, 0.0, -0.06, 10), c: dark },
    { g: ell(0.15, 0.16, 0.11, 0, 0.01, 0.38, 18), c: head },
    { g: ell(0.09, 0.09, 0.07, 0, -0.07, 0.44, 12), c: head },
    { g: ell(0.065, 0.115, 0.085, 0.112, 0.025, 0.392, 14), c: eye }, { g: ell(0.065, 0.115, 0.085, -0.112, 0.025, 0.392, 14), c: eye },
  ];
  for (const sd of [1, -1]) parts.push({ g: stick([sd * 0.04, 0.07, 0.46], [sd * 0.07, 0.17, 0.54], 0.011), c: ant }, { g: stick([sd * 0.07, 0.17, 0.54], [sd * 0.15, 0.2, 0.74], 0.009), c: ant });
  // abdomen: six overlapping rings, amber and dark, tapering to the tip
  BEE_SEGS.forEach(([r, zc, dk]) => parts.push({ g: ell(r, r * 0.92, 0.1, 0, -0.012, zc, 20), c: dk ? dark : amber }));
  // jointed legs: femur, tibia, tarsus; the hind tibia is broad (the pollen basket)
  for (const s of [1, -1]) for (const [k, z0, z1] of [[0, 0.22, 0.38], [1, 0.12, 0.14], [2, 0.02, -0.24]]) {
    const hip = [s * 0.1, -0.08, z0], knee = [s * 0.28, 0.02, (z0 + z1) / 2], ankle = [s * 0.34, -0.17, z1], toe = [s * 0.37, -0.25, z1 + (k === 2 ? -0.05 : 0.04)];
    parts.push({ g: stick(hip, knee, 0.016), c: leg }, { g: stick(knee, ankle, k === 2 ? 0.024 : 0.012), c: leg }, { g: stick(ankle, toe, 0.007), c: leg });
  }
  // pollen packed into the hind-leg baskets (scaled per bee in the shader by aPol)
  for (const s of [1, -1]) parts.push({ g: ell(0.064, 0.06, 0.088, s * 0.335, -0.08, -0.175, 14), c: [0.93, 0.64, 0.09] });
  return geoParts(parts);
})();

const MAXB = 300; const beeMove = new Float32Array(MAXB * 4); beeGeo.setAttribute('aMove', new THREE.InstancedBufferAttribute(beeMove, 4));
const beePol = new Float32Array(MAXB); beeGeo.setAttribute('aPol', new THREE.InstancedBufferAttribute(beePol, 1));
const beeMat = mat(`varying float vPol; void main(){ vec3 n=normalize(vN); vec3 V=normalize(uCam-vW);
  float fz=hash21(floor(vL.xy*90.0)+floor(vL.z*90.0)); float isF=smoothstep(0.2,0.5,vC.g/(vC.r+0.001)-0.3)*step(0.2,vC.r);
  vec3 alb=vC*(0.8+0.45*fz);
  float isEye=step(vC.r,0.02); if(isEye>0.5){ vec2 hp=vL.yz*150.0; vec2 fc=fract(hp+vec2(0.0,0.5*mod(floor(hp.x),2.0)))-0.5; n=normalize(n+vec3(0.0,fc)*0.07); alb=vec3(0.015,0.013,0.012); }
  if(vPol>0.5){ vec3 gq=floor(vL*150.0); vec3 gr=vec3(hash21(gq.xy),hash21(gq.yz+3.1),hash21(gq.xz+7.7))-0.5; n=normalize(n+gr*0.6); alb=vec3(0.95,0.55,0.07)*(0.7+0.55*hash21(gq.xy+gq.z*1.7)); }
  float rimv=pow(1.0-max(dot(n,V),0.0),2.0);
  float lum=dot(alb,vec3(0.33)); float hard=1.0-smoothstep(0.02,0.12,lum);
  alb*=mix(1.0,0.32,hard); vec3 c=shade(alb,n,vW,0.25+0.5*hard+0.5*isEye,0.25);
  c+=shade(vec3(0.75,0.55,0.25),n,vW,0.0,1.0)*rimv*0.28*(1.0-hard);
  gl_FragColor=vec4(finish(c,vW),1.0); }`, { vertexColors: true, vert: BEE_VERT });
const beeMesh = new THREE.InstancedMesh(beeGeo, beeMat, MAXB); beeMesh.frustumCulled = false; scene.add(beeMesh);
// ---------- round 7: crisp fur tufts around each bee body (thorax longest) ----------
const furGeo = geoParts([
  { g: ell(0.18, 0.17, 0.19, 0, 0.03, 0.13, 18), c: [0.25, 0.15, 0.05] },
  ...BEE_SEGS.map(([r, zc, dk]) => ({ g: ell(r, r * 0.92, 0.1, 0, -0.012, zc, 16), c: dk ? [0.06, 0.035, 0.02] : [0.70, 0.42, 0.08] }))]);
furGeo.setAttribute('aMove', beeGeo.getAttribute('aMove'));
const FUR_VERT = BEE_VERT.replace('void main(){', 'uniform float uShell;\nvoid main(){').replace('vec3 pp=position;', `vec3 pp=position;
  #ifdef USE_COLOR
  float furL=color.r>0.5?0.55:(color.g>0.1?1.3:0.5); pp+=normal*uShell*furL;
  #endif
  `);
const furMeshes = [0.2, 0.4, 0.6, 0.8, 1.0].map(k => {
  const m = mat(`uniform float uK; void main(){ vec3 n=normalize(vN); vec3 V=normalize(uCam-vW);
    vec3 q=vL*190.0; vec3 id=floor(q); vec3 j=vec3(hash21(id.xy+id.z*3.1),hash21(id.yz+id.x*7.7),hash21(id.zx+id.y*5.3));
    float d=length(fract(q)-0.25-j*0.5); if(d>0.62*(1.0-uK*0.75)) discard;
    vec3 alb= vC.r>0.5 ? vec3(0.86,0.56,0.16) : (vC.g>0.1 ? mix(vec3(0.62,0.42,0.16),vec3(0.9,0.68,0.32),j.x) : vec3(0.08,0.06,0.045));
    alb*=0.5+0.75*uK;
    float rim=pow(1.0-max(dot(n,V),0.0),1.5);
    vec3 c=shade(alb,n,vW,0.05,1.0)+shade(alb*1.5+0.04,n,vW,0.0,1.0)*rim*0.3*uK;
    gl_FragColor=vec4(finish(c,vW),1.0); }`, { vertexColors: true, vert: FUR_VERT, uniforms: { uShell: { value: 0.042 * k }, uK: { value: k } } });
  const fm = new THREE.InstancedMesh(furGeo, m, MAXB); fm.instanceMatrix = beeMesh.instanceMatrix; fm.frustumCulled = false; fm.count = 0; scene.add(fm); return fm; });

const wingGeo = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(0.12, 0.12, 0.48, 0.14, 0.56, 0.02); s.bezierCurveTo(0.5, -0.1, 0.15, -0.08, 0, 0); const g = new THREE.ShapeGeometry(s, 8); g.rotateX(-Math.PI / 2); return g; })();
const wingMat = mat(`void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW); float cv=abs(dot(n,V)); float f=pow(1.0-cv,2.0);
  vec2 p=vec2(vL.x,vL.z); vec2 g=p*vec2(13.0,19.0); vec2 i0=floor(g), f0=fract(g); float d1=9.0, d2=9.0;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 o=vec2(float(x),float(y)); vec2 hh=vec2(hash21(i0+o),hash21(i0+o+17.3)); vec2 d=o+0.15+hh*0.7-f0; float dd=dot(d,d); if(dd<d1){ d2=d1; d1=dd; } else if(dd<d2) d2=dd; }
  float vein=1.0-smoothstep(0.0,0.07,sqrt(d2)-sqrt(d1));
  float lead=1.0-smoothstep(0.0,0.018,abs(-p.y-0.075*sin(clamp(p.x/0.56,0.0,1.0)*3.1416)-0.01)); vein=max(vein,lead*step(p.x,0.5));
  vec3 film=0.5+0.5*cos(6.2832*(vec3(0.0,0.33,0.67)+(1.0-cv)*1.7+vnoise(p*18.0)*0.7));
  film=mix(vec3(dot(film,vec3(0.333))),film,0.35)*vec3(1.0,0.94,0.82); // soft, warm sheen, not neon
  vec3 lit=shade(vec3(1.0),n,vW,0.0,1.0); float lum=min(dot(lit,vec3(0.3,0.5,0.2)),1.5);
  vec3 mem=shade(vec3(0.82,0.82,0.78),n,vW,1.6,1.0)*0.25+film*(0.12+0.5*f)*0.3*lum;
  vec3 c=mix(mem,shade(vec3(0.10,0.07,0.04),n,vW,0.4,0.2),vein*0.85);
  gl_FragColor=vec4(finish(c,vW),clamp(0.05+0.25*f+vein*0.6,0.0,0.95)); }`, { transparent: true, depthWrite: false, side: THREE.DoubleSide });
const wingMesh = new THREE.InstancedMesh(wingGeo, wingMat, MAXB * 2); wingMesh.frustumCulled = false; scene.add(wingMesh);
const bees = [];
function newBee(scale = 1) { const b = { p: new V3(), q: new Q4(), s: new V3(scale, scale, scale), fly: false, ph: rnd(TAU), update: null }; bees.push(b); return b; }
const _x = new V3(), _y = new V3(), _z = new V3(), _m = new M4(), _m2 = new M4(), _q = new Q4(), _v = new V3(), _v2 = new V3();
const XA = new V3(1, 0, 0), YA = new V3(0, 1, 0), ZA = new V3(0, 0, 1);
function orient(q, fwd, up) { _z.copy(fwd).normalize(); _x.crossVectors(up, _z); if (_x.lengthSq() < 1e-6) _x.set(1, 0, 0); _x.normalize(); _y.crossVectors(_z, _x); _m.makeBasis(_x, _y, _z); q.setFromRotationMatrix(_m); }
function setOnFace(b, ci, side, x, y, th, dip = 0) {
  b.p.set(x, y, COMBS[ci].z + side * (CT / 2 + 0.19 * b.s.y - dip * 0.05));
  _v.set(Math.cos(th), Math.sin(th), 0); _v2.set(0, 0, side); orient(b.q, _v, _v2);
  if (dip) b.q.multiply(_q.setFromAxisAngle(XA, dip * 0.5));
}
function makeWalker(ci, side, o = {}) {
  const c = COMBS[ci], b = newBee(o.scale || rnd(0.9, 1.05));
  b.x = o.x ?? rnd(-c.hw + 0.6, c.hw - 0.6); b.y = o.y ?? rnd(c.yb + 0.8, HTOP - 0.6); b.th = rnd(TAU); b.pause = rnd(2); b.dip = 0; b.sp = o.sp || rnd(0.35, 0.8);
  b.turn = 0;
  b.update = dt => {
    if (b.pause > 0) { b.pause -= dt; b.dip = Math.min(1, b.dip + dt * 2.5); }
    else {
      b.dip = Math.max(0, b.dip - dt * 3); b.turn += (rnd(-1, 1) * 6 - b.turn * 1.5) * dt; b.th += b.turn * dt;
      b.x += Math.cos(b.th) * b.sp * dt; b.y += Math.sin(b.th) * b.sp * dt;
      if (Math.random() < dt * 0.3) b.pause = rnd(0.8, 3.5);
      if (Math.abs(b.x) > c.hw - 0.5 || b.y < c.yb + 0.6 || b.y > HTOP - 0.5) { const t = Math.atan2((c.yb + HTOP) / 2 - b.y, -b.x); let d = t - b.th; d = Math.atan2(Math.sin(d), Math.cos(d)); b.th += d * Math.min(1, dt * 4); }
    }
    setOnFace(b, ci, side, b.x, b.y, b.th + Math.sin(performance.now() * 0.02 + b.ph) * 0.05, b.dip);
  };
  return b;
}
COMBS.forEach((c, ci) => { for (const side of [1, -1]) for (let i = 0; i < 13; i++) makeWalker(ci, side); });
// queen and her retinue
const queen = makeWalker(1, 1, { x: -1, y: 15, sp: 0.18 }); queen.s.set(1.15, 1.1, 1.75);
for (let i = 0; i < 8; i++) { const b = newBee(0.95), a = i / 8 * TAU; b.update = (dt, t) => { const rr = 1.25 + 0.1 * Math.sin(t * 2 + i); const x = queen.x + Math.cos(a) * rr, y = queen.y + Math.sin(a) * rr; setOnFace(b, 1, 1, x, y, a + Math.PI + Math.sin(t * 3 + i * 2) * 0.15, 0.3 + 0.3 * Math.sin(t * 1.3 + i)); }; }
// waggle dancer
const DANCE = { ci: 2, side: 1, x: 1.2, y: 10.9, dx: Math.sin(DANCE_A), dy: Math.cos(DANCE_A), L: 1.7, Tw: 1.6, Tr: 1.3 };
const dancer = newBee(1.0); dancer.dp = { x: DANCE.x, y: DANCE.y };
dancer.update = (dt, t) => {
  const D = DANCE, cyc = D.Tw + D.Tr, k = Math.floor(t / cyc), u = t - k * cyc, sd = k % 2 ? 1 : -1, px = -D.dy, py = D.dx; let x, y, th;
  if (u < D.Tw) { const f = u / D.Tw, wg = Math.sin(t * 82); x = D.x + D.dx * D.L * f + px * wg * 0.07; y = D.y + D.dy * D.L * f + py * wg * 0.07; th = Math.atan2(D.dy, D.dx) + wg * 0.38; }
  else { const f = (u - D.Tw) / D.Tr, a = Math.PI * f, c = Math.cos(a), s = Math.sin(a) * sd; x = D.x + D.dx * D.L / 2 + (D.dx * c + px * s) * D.L / 2; y = D.y + D.dy * D.L / 2 + (D.dy * c + py * s) * D.L / 2; th = Math.atan2(-D.dy * Math.sin(a) + py * sd * Math.cos(a), -D.dx * Math.sin(a) + px * sd * Math.cos(a)); }
  dancer.dp.x = x; dancer.dp.y = y; setOnFace(dancer, D.ci, D.side, x, y, th);
};
for (let i = 0; i < 6; i++) { const b = newBee(0.95); b.fx = DANCE.x; b.fy = DANCE.y; const a = i / 6 * TAU + 0.4; b.update = (dt, t) => { const tx = dancer.dp.x + Math.cos(a) * 1.0, ty = dancer.dp.y + Math.sin(a) * 1.0; b.fx += (tx - b.fx) * dt * 2.2; b.fy += (ty - b.fy) * dt * 2.2; setOnFace(b, DANCE.ci, DANCE.side, b.fx, b.fy, Math.atan2(dancer.dp.y - b.fy, dancer.dp.x - b.fx)); }; }
// festooning builders hanging in chains under the comb edges
for (const [ci, x0] of [[1, -3], [1, 2.5], [3, -1], [3, 4], [4, 0]]) for (let i = 0; i < 5; i++) { const b = newBee(0.95); b.update = (dt, t) => { const sw = Math.sin(t * 0.8 + x0) * 0.06 * (i + 1); b.p.set(x0 + sw, COMBS[ci].yb - 0.35 - i * 0.72, COMBS[ci].z + Math.sin(t * 0.6 + i) * 0.03); _v.set(sw * 0.3, 1, 0); _v2.set(0, 0, i % 2 ? 1 : -1); orient(b.q, _v, _v2); }; }
// fanners at the entrance
for (let i = 0; i < 6; i++) { const b = newBee(1); b.fly = true; const x = 9.9 + i * 0.5, z = (i % 2 ? 0.55 : -0.55) + rnd(-0.2, 0.2); b.update = () => { const a = Math.asin(clamp(z / TR, -1, 1)); b.p.set(x, TY - Math.cos(a) * (TR - 0.2), z); _v.set(-1, 0.25, 0); _v2.set(0, Math.cos(a), -Math.sin(a)); orient(b.q, _v, _v2); }; }
// free fliers
function makeFlier(scale = 1) { const b = newBee(scale); b.fly = true; b.prev = new V3(); b.fwd = new V3(1, 0, 0); b.first = true;
  b.face = (dt) => { _v.copy(b.p).sub(b.prev); if (!b.first && _v.lengthSq() > 1e-6) { b.fwd.lerp(_v.normalize(), Math.min(1, dt * 8)); } b.first = false; b.prev.copy(b.p); orient(b.q, b.fwd, YA); }; return b; }
for (let i = 0; i < 9; i++) { const b = makeFlier(rnd(0.9, 1.05)); const a = rnd(TAU), f1 = rnd(0.15, 0.4), f2 = rnd(0.2, 0.5), r = rnd(2, 6.5), yy = rnd(1.5, 5.5);
  b.update = (dt, t) => { b.p.set(Math.cos(t * f1 + a) * r, yy + Math.sin(t * f2 + a) * 1.2, Math.sin(t * f1 * 1.3 + a) * r); b.face(dt); }; }
const flowers = []; // filled later; foragers reference it lazily
const foragers = [];
function makeForager() {
  const b = makeFlier(rnd(0.9, 1.05)); b.t0 = rnd(60); b.A = new V3(rnd(-5, 5), rnd(1.5, 5.5), rnd(-5, 5)); b.off = new V3(rnd(-0.6, 0.6), rnd(-0.6, 0.6), rnd(-0.6, 0.6)); b.D = null; foragers.push(b);
  const B = new V3(9.2, TY, 0), C = new V3(14.5, TY, 0), seg = [2.2, 1.0, 13, 4, 13, 1.0, 2.2, 2.5], total = seg.reduce((a, c) => a + c, 0);
  b.update = (dt, t) => {
    if (!b.D) { const f = flowers[(Math.random() * Math.min(flowers.length, 110)) | 0]; b.D = f ? new V3(f.x, f.y + 1.2, f.z) : new V3(100, 0, 60); }
    let u = (t + b.t0) % total, k = 0; while (u > seg[k]) { u -= seg[k]; k++; } const f = smooth(0, 1, u / seg[k]);
    const pts = [b.A, B, C, b.D, b.D, C, B, b.A, b.A], P0 = pts[k], P1 = pts[k + 1];
    b.pol = k === 3 ? f * 0.8 : (k >= 4 && k <= 6) ? 0.8 : k === 7 ? 0.8 * (1 - f) : 0;
    b.p.lerpVectors(P0, P1, f); if (k === 2 || k === 4) b.p.y += Math.sin(f * Math.PI) * 9;
    const w = (k === 1 || k === 5) ? 0.35 : 1; b.p.x += Math.sin(t * 1.7 + b.ph) * 0.5 * w + b.off.x * w; b.p.y += Math.sin(t * 2.3 + b.ph * 2) * 0.35 * w + b.off.y * w; b.p.z += Math.cos(t * 1.9 + b.ph) * 0.5 * w + b.off.z * w;
    if (k === 7 && u > seg[7] - 0.1) b.D = null;
    b.face(dt);
  };
  return b;
}
for (let i = 0; i < 28; i++) makeForager();
// scripted sisters: the one who greets you at birth, and three who welcome you home
function makeScripted() { const b = makeFlier(1.02); b.tp = new V3(rnd(-4, 4), rnd(2, 5), rnd(-4, 4)); b.look = null; b.active = false; b.p.copy(b.tp); const a = rnd(TAU), r = rnd(2, 6), yy = rnd(2, 5), f = rnd(0.2, 0.4);
  b.update = (dt, t) => { if (!b.active) { b.tp.set(Math.cos(t * f + a) * r, yy + Math.sin(t * 0.5 + a), Math.sin(t * f * 1.2 + a) * r); _v.set(b.tp.x - BIRTH.x, b.tp.y - BIRTH.y, b.tp.z - BIRTH.z); const dB = _v.length(); if (dB < 3.5) b.tp.addScaledVector(_v.normalize(), 3.5 - dB); }
    b.p.lerp(b.tp, Math.min(1, dt * (b.active ? 3.2 : 1.2))); b.p.y += Math.sin(t * 5 + b.ph) * 0.004;
    if (b.active && b.look) { _v.copy(b.look).sub(b.p); b.fwd.lerp(_v.normalize(), Math.min(1, dt * 6)); orient(b.q, b.fwd, YA); b.q.multiply(_q.setFromAxisAngle(ZA, Math.sin(t * 9 + b.ph) * 0.07)); b.prev.copy(b.p); } else b.face(dt); }; return b; }
const hero = makeScripted(), greeters = [makeScripted(), makeScripted(), makeScripted()];
const _wm = new M4(), _bm = new M4(), _t = new M4(), _r = new M4(), _sc = new M4();
function updateBees(dt, t) {
  const n = bees.length; beeMesh.count = n; wingMesh.count = n * 2; for (const fm of furMeshes) fm.count = n;
  for (let i = 0; i < n; i++) {
    const b = bees[i]; b.update(dt, t);
    if (!b.lp) { b.lp = b.p.clone(); b.mx = 0; b.my = 0; }
    if (dt > 0) { if (b.vel) _v.copy(b.vel); else _v.copy(b.p).sub(b.lp).multiplyScalar(1 / dt); b.lp.copy(b.p); _q.copy(b.q).invert(); _v.applyQuaternion(_q);
      b.ax = b.ax === undefined ? 0 : b.ax; const fz = clamp(_v.z * 0.05, -0.8, 1.4); b.mx = lerp(b.mx, fz + (fz - (b.pz || 0)) * 0.0, Math.min(1, dt * 4)); b.pz = fz;
      b.my = lerp(b.my, b.bank !== undefined ? b.bank : clamp(-_v.x * 0.08, -1, 1), Math.min(1, dt * 3)); }
    beeMove[i * 4] = b.mx; beeMove[i * 4 + 1] = b.my; beeMove[i * 4 + 2] = b.ph * 7; beeMove[i * 4 + 3] = b.fly ? 1 : 0; beePol[i] = b.pol || 0;
    _bm.compose(b.p, b.q, b.s); beeMesh.setMatrixAt(i, _bm);
    for (let s = 0; s < 2; s++) {
      const sg = s ? -1 : 1;
      const flap = b.fly ? Math.sin(t * 190 + b.ph + i) * 0.85 + 0.15 : 0.03, sweep = b.fly ? 0.25 : 1.25;
      _t.makeTranslation(sg * 0.09, 0.19, 0.16); _r.makeRotationZ(sg * flap); _t.multiply(_r); _r.makeRotationY(sg * sweep); _t.multiply(_r); _sc.makeScale(sg * 1.15, 1, 1.15); _t.multiply(_sc);
      _wm.multiplyMatrices(_bm, _t); wingMesh.setMatrixAt(i * 2 + s, _wm);
    }
  }
  beeMesh.instanceMatrix.needsUpdate = true; wingMesh.instanceMatrix.needsUpdate = true; beeGeo.attributes.aMove.needsUpdate = true; beeGeo.attributes.aPol.needsUpdate = true;
}

// ---------- dance streak + shimmer trail ----------
const streakU = { uShow: { value: 0.22 } };
const streak = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.1), mat(`uniform float uShow;
void main(){ float a=smoothstep(0.0,0.15,vUv.x)*smoothstep(1.0,0.5,vUv.x)*pow(1.0-abs(vUv.y-0.5)*2.0,2.0);
  float p=0.55+0.45*sin(vUv.x*26.0-uTime*5.0); float sp=step(0.93,hash21(floor(vUv*vec2(60.0,9.0))+floor(uTime*6.0)));
  gl_FragColor=vec4(vec3(1.0,0.72,0.22)*a*(p*0.8+sp*1.5)*uShow,1.0); }`, { uniforms: streakU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
streak.position.set(DANCE.x + DANCE.dx * 3.0, DANCE.y + DANCE.dy * 3.0, CT / 2 + 0.03); streak.rotation.z = Math.atan2(DANCE.dy, DANCE.dx); scene.add(streak);
const trailU = { uShow: { value: 0 } };
{
  const N = 90, pos = [], idx = [];
  for (let i = 0; i < N; i++) { const f = i / (N - 1), d = 16 + f * (FIELD_D - 30); const px = -FDIR.z, pz = FDIR.x, w = Math.sin(f * 9) * 3;
    const x = (i < 6 ? lerp(14, FDIR.x * d, i / 6) : FDIR.x * d) + px * w, z = (i < 6 ? lerp(0, FDIR.z * d, i / 6) : FDIR.z * d) + pz * w;
    pos.push(x, lerp(TY, terrainH(x, z) + 24, smooth(0, 0.5, f)) + Math.sin(f * 14) * 1.5, z); idx.push(i); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aI', new THREE.Float32BufferAttribute(idx, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { ...U, ...trailU }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aI; uniform float uTime; uniform float uShow; varying float vA; void main(){ vec3 p=position; p.y+=sin(uTime*1.3+aI)*0.6; vec4 mv=viewMatrix*vec4(p,1.0);
      float tw=0.5+0.5*sin(uTime*3.0-aI*0.9); vA=uShow*tw*smoothstep(130.0,40.0,-mv.z)*smoothstep(1.0,5.0,-mv.z); gl_PointSize=(2.0+tw*3.0)*120.0/max(-mv.z,1.0)+2.0; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: UNTONE + `varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d); gl_FragColor=vec4(untone(vec3(1.0,0.78,0.3)*a*a*vA)*1.6,1.0); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts);
}

// ---------- dust / motes ----------
function makeMotes(N, box, center, wrap, size, colr) {
  const pos = [], ph = [];
  for (let i = 0; i < N; i++) { pos.push(rnd(-box.x, box.x), rnd(-box.y, box.y), rnd(-box.z, box.z)); ph.push(rnd(100)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aP', new THREE.Float32BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { ...U, uBox: { value: box }, uCen: { value: center }, uAmt: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aP; uniform float uTime; uniform vec3 uBox; uniform vec3 uCen; uniform vec3 uCam; varying float vA;
      void main(){ vec3 p=position+vec3(sin(uTime*0.21+aP),uTime*0.12+sin(uTime*0.3+aP*2.0)*0.5,cos(uTime*0.17+aP*1.3))*${wrap ? '2.5' : '0.8'};
      ${wrap ? 'p=mod(p-uCam+uBox,uBox*2.0)-uBox+uCam;' : 'p=mod(p+uBox,uBox*2.0)-uBox+uCen;'}
      vec4 mv=viewMatrix*vec4(p,1.0); float dz=-mv.z; vA=smoothstep(0.15,0.8,dz)*max(0.0,0.4+0.6*sin(uTime*0.9+aP*7.0));
      ${wrap ? 'float ih=(1.0-smoothstep(11.6,12.4,length(p.xz)))*step(-0.5,p.y)*step(p.y,22.6); vA*=1.0-ih;' : 'vA*=step(length(p.xz),9.6)*(0.35+60.0/(10.0+dot(p-vec3(10.6,3.0,0.0),p-vec3(10.6,3.0,0.0))));'}
      gl_PointSize=min(${size.toFixed(1)}*(0.6+fract(aP)*0.9)/max(dz,0.2), 60.0); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: UNTONE + `uniform float uAmt; varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.25,d)*(0.55+0.45*smoothstep(0.3,0.45,d)); gl_FragColor=vec4(untone(max(vec3(${colr})*a*vA*uAmt,0.0))*1.4,1.0); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return m;
}

// ---------- particles ----------
const PN = 420, pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 4), pSize = new Float32Array(PN), parts = [];
for (let i = 0; i < PN; i++) parts.push({ life: 0, max: 1, v: new V3(), g: 0, c: [1, 1, 1], s: 1 });
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('aC', new THREE.BufferAttribute(pCol, 4)); pGeo.setAttribute('aS', new THREE.BufferAttribute(pSize, 1));
const pPts = new THREE.Points(pGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
  vertexShader: `attribute vec4 aC; attribute float aS; varying vec4 vCol; void main(){ vec4 mv=viewMatrix*vec4(position,1.0); vCol=aC; gl_PointSize=min(aS*500.0/max(-mv.z,0.1),90.0); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: UNTONE + `varying vec4 vCol; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.15,d); gl_FragColor=vec4(untone(vCol.rgb)*1.5,vCol.a*a); }` }));
pPts.frustumCulled = false; scene.add(pPts);
let pNext = 0;
function puff(p, n, col, spd, size, life, g = 0, up = 0) { for (let i = 0; i < n; i++) { const q = parts[pNext]; pNext = (pNext + 1) % PN; q.life = q.max = life * rnd(0.6, 1.2); q.v.set(rnd(-1, 1), rnd(-1, 1) + up, rnd(-1, 1)).multiplyScalar(spd * rnd(0.3, 1)); q.g = g; q.c = col; q.s = size * rnd(0.6, 1.3); pPos[(pNext ? pNext - 1 : PN - 1) * 3] = p.x; const k = (pNext ? pNext - 1 : PN - 1) * 3; pPos[k] = p.x + rnd(-.1, .1); pPos[k + 1] = p.y + rnd(-.1, .1); pPos[k + 2] = p.z + rnd(-.1, .1); } }
function updateParts(dt) { for (let i = 0; i < PN; i++) { const q = parts[i], k = i * 3; if (q.life > 0) { q.life -= dt; q.v.y -= q.g * dt; q.v.multiplyScalar(1 - dt * 1.2); pPos[k] += q.v.x * dt; pPos[k + 1] += q.v.y * dt; pPos[k + 2] += q.v.z * dt; const a = clamp(q.life / q.max, 0, 1); pCol[i * 4] = q.c[0]; pCol[i * 4 + 1] = q.c[1]; pCol[i * 4 + 2] = q.c[2]; pCol[i * 4 + 3] = a; pSize[i] = q.s; } else { pCol[i * 4 + 3] = 0; pSize[i] = 0; } }
  pGeo.attributes.position.needsUpdate = pGeo.attributes.aC.needsUpdate = pGeo.attributes.aS.needsUpdate = true; }

// ---------- outside: ground, tree, grass, flowers, pond ----------
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
const barkMat = mat(`void main(){ if(inHole(vW) && length(vW.xz)<14.0) discard; vec3 n=NORMAL; float a=atan(vL.z,vL.x); float R=max(length(vL.xz),0.5);
  vec2 bp=vec2(a*R*0.9, vW.y*0.22);
  float rid=fbm(vec2(bp.x*1.6,bp.y*0.35)); float fine=fbm(bp*vec2(4.0,6.0));
  float crack=1.0-smoothstep(0.0,0.09,abs(fract(bp.x*0.55+fbm(bp*0.4)*1.4)-0.5));
  ${MP ? `vec3 alb=mix(vec3(0.075,0.055,0.04),vec3(0.36,0.29,0.22),smoothstep(0.3,0.75,rid))*(0.7+0.6*fine);
  float bcol=floor(bp.x*0.55+fbm(bp*0.4)*1.4); float hcr=1.0-smoothstep(0.0,0.05,abs(fract(vW.y*0.09+hash21(vec2(bcol,3.0)))-0.5)-0.44);
  alb*=1.0-0.75*crack; alb*=1.0-0.45*hcr*(1.0-crack);` : `vec3 alb=mix(vec3(0.10,0.075,0.05),vec3(0.42,0.33,0.24),smoothstep(0.3,0.7,rid))*(0.7+0.6*fine); alb*=1.0-0.7*crack;`}
  float moss=smoothstep(0.5,0.7,fbm(${MP ? 'vec2(bp.x,vW.y*0.8)' : 'bp'}*0.25+3.0))*smoothstep(25.0,-12.0,vW.y); alb=mix(alb,vec3(0.16,0.30,0.06)*(0.7+0.5*fine),moss*0.8);
  float lich=${MP ? 'smoothstep(0.8,0.88,vnoise(vec2(bp.x,vW.y*0.8)*0.9+7.0))' : 'smoothstep(0.74,0.8,vnoise(bp*2.3+7.0))'}; alb=mix(alb,vec3(0.55,0.60,0.45),lich*${MP ? '0.16' : '0.55'}*(1.0-moss));
  vec3 tg=vec3(-sin(a),0.0,cos(a)); n=normalize(n+tg*(fine-0.5)*0.7+vec3(0.0,(rid-0.5)*0.35,0.0)-n*crack*0.3);
  float hs=${MP ? `step(0.0,vW.x)*step(length(vW.xz),${(ROUT + 6).toFixed(1)})*smoothstep(${(TR + 3.2).toFixed(2)},${(TR + 0.4).toFixed(2)},length(vec2(vW.z,(vW.y-${TY.toFixed(1)})*(vW.y<${TY.toFixed(1)}?0.4:1.1))))` : '0.0'};
  alb=mix(alb,vec3(0.20,0.10,0.03)*(0.7+0.5*fine),hs*0.85);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.03+0.1*moss+0.5*hs,0.0),vW),1.0); }`);
function trunkGeo(R, base, top) { return new THREE.LatheGeometry([[R + 9, base - 5], [R + 4, base + 3], [R + 1.2, base + 9], [R, base + 13], [R, top * 0.6], [R * 0.85, top]].map(a => new THREE.Vector2(a[0], a[1])), 48); }
scene.add(new THREE.Mesh(trunkGeo(ROUT, GY, 90), barkMat));
if (!MP) { const g = new THREE.TorusGeometry(TR + 0.35, 0.5, 10, 28); g.rotateY(Math.PI / 2); const m = new THREE.Mesh(g, barkMat); m.position.set(ROUT - 0.1, TY, 0); m.scale.set(0.6, 1, 1); scene.add(m); }
else { const RC = TR + 0.6, g = new THREE.TorusGeometry(RC, 0.62, 18, 64), p = g.attributes.position, c = new V3(), ctr = new V3();
  for (let i = 0; i < p.count; i++) { c.set(p.getX(i), p.getY(i), p.getZ(i)); const a = Math.atan2(c.y, c.x); ctr.set(Math.cos(a) * RC, Math.sin(a) * RC, 0);
    const k = 1 + 0.18 * (0.5 + 0.5 * Math.sin(a * 5 + 1.3) * Math.sin(a * 3.1)) + 0.1 * (0.5 + 0.5 * Math.sin(a * 13 + 2)) + (a < -1.0 && a > -2.2 ? 0.15 : 0);
    const off = c.clone().sub(ctr); const outward = off.dot(ctr.clone().normalize()) > -0.25 ? k : 1; c.copy(ctr).addScaledVector(off, outward); p.setXYZ(i, c.x, c.y, c.z); }
  g.computeVertexNormals(); g.rotateY(Math.PI / 2);
  const pm = mat(`void main(){ vec3 n=NORMAL; vec2 q=vW.zy*1.0+vW.x*0.7; float a=fbm(q*2.5); float f=vnoise(q*16.0);
    n=normalize(n+(vec3(fbm(q*7.0),fbm(q*7.0+3.0),fbm(q*7.0+6.0))-0.5)*0.7);
    vec3 alb=mix(vec3(0.05,0.022,0.008),vec3(0.20,0.10,0.03),a)*(0.8+0.3*f); alb=mix(alb,vec3(0.30,0.22,0.10),smoothstep(0.74,0.82,vnoise(q*3.0+3.0))*0.3);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.22,0.2),vW),1.0); }`);
  const m = new THREE.Mesh(g, pm); m.position.set(ROUT - 0.05, TY, 0); m.scale.set(0.6, 1, 1); scene.add(m);
  for (let i = 0; i < 6; i++) { const z = rnd(-1.8, 1.8), y = TY - TR - rnd(0.3, 1.6), d = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), pm); d.position.set(Math.sqrt(ROUT * ROUT - z * z) - 0.02, y - 0.2, z); d.scale.set(0.08, rnd(0.3, 0.7), rnd(0.1, 0.18)); scene.add(d); } }
// ---------- model pass: crowns built from leaf sprays, with real limbs ----------
const CARD_VERT = `attribute vec3 aN; attribute float aTint; uniform float uTime; uniform vec3 uWind;
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv; varying vec3 vL; varying vec3 vBN; varying float vTint;
void main(){ mat4 m=modelMatrix*instanceMatrix; vec4 w=m*vec4(position,1.0); float sc=length(m[0].xyz);
  float ph=dot(w.xz,vec2(0.071,0.053))+aTint*31.0; float s=sin(uTime*1.6+ph)+0.5*sin(uTime*2.7+ph*1.7);
  w.xyz+=(vec3(uWind.x,0.0,uWind.y)*(0.3+uWind.z)*0.05+aN*0.03*s+vec3(0.0,0.02*s,0.0))*sc*(0.4+uv.y);
  vW=w.xyz; vL=position; vN=normalize(mat3(m)*normal); vUv=uv; vC=vec3(1.0); vBN=aN; vTint=aTint;
  gl_Position=projectionMatrix*viewMatrix*w; }`;
const cardMat = (ta, tb, blos) => mat(`varying vec3 vBN; varying float vTint;
void main(){ vec2 p=vUv*2.0-1.0; float fat=1.0+0.7*smoothstep(50.0,220.0,length(uCam-vW)); float best=0.0, vein=0.0, hl=0.0, kk=1.0, uu=0.0, isB=0.0; vec2 ax=vec2(1.0,0.0);
  for(int i=0;i<5;i++){ float fi=float(i); float h=hash21(vec2(fi*7.13+1.0,vTint*91.7));
    float a=fi*1.2566+h*0.8+vTint*6.2832; vec2 dir=vec2(cos(a),sin(a));
    float bl=step(h,${blos.toFixed(2)}); float L=mix(0.50+0.18*h,0.32+0.08*h,bl); vec2 c=dir*(0.12+L*0.95);
    vec2 d=p-c; float u=dot(d,dir)/L; float v=dot(d,vec2(-dir.y,dir.x));
    float w=mix(0.40*L*(1.0-u*u)*(1.0-0.3*u), 0.9*L*sqrt(max(1.0-u*u,0.0))*(0.75+0.25*cos(atan(v,u*L)*5.0)), bl);
    float k=abs(v)/max(w*fat,1e-3);
    if(abs(u)<fat && k<1.0){ float z=(1.0-k*k)*(0.6+h); if(z>best){ best=z; hl=h; kk=k; uu=u; ax=dir; isB=bl;
      vein=(1.0-smoothstep(0.0,0.045,abs(v)))*(1.0-smoothstep(0.6,1.0,u))*(1.0-bl);
      vein=max(vein,(1.0-smoothstep(0.0,0.06,abs(fract(u*3.5-abs(v)*5.0)-0.5)-0.38))*0.5*(1.0-bl)*step(0.15,k)); } } }
  if(best<=0.0) discard;
  vec3 fn=NORMAL; vec3 n0=normalize(vBN*0.75+fn*0.45); vec3 tg=normalize(cross(n0,vec3(0.13,1.0,0.07)));
  vec3 n=normalize(n0+tg*(hl-0.5)*0.9+cross(n0,tg)*(uu*0.35));
  vec3 alb=mix(vec3(${ta}),vec3(${tb}),clamp(hl*0.65+vTint*0.5-0.1,0.0,1.0));
  alb*=0.62+0.38*smoothstep(-0.8,0.7,vBN.y); alb*=1.0-0.28*kk*kk*kk*kk;
  alb=mix(alb,alb*1.45+vec3(0.03,0.04,0.0),vein*0.55);
  vec3 bc=mix(vec3(0.95,0.42,0.62),vec3(1.0,0.86,0.9),hash21(vec2(hl*13.0,vTint)))*(1.0-0.35*kk*kk); bc=mix(bc,vec3(0.95,0.7,0.2),(1.0-smoothstep(0.0,0.25,length(p-ax*0.12)))*0.0);
  alb=mix(alb,bc,isB);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.28*(1.0-isB),0.85),vW),1.0); }`, { vert: CARD_VERT, side: THREE.DoubleSide });
function leafShell(blobs, o) {
  const size = o.size, dens = (o.dens || 1.7) * 1.5, M = [], N = [], T = [], m4 = new M4(), q = new Q4(), q2 = new Q4(), Z = new V3(0, 0, 1), d = new V3(), nrm = new V3(), pos = new V3(), sc = new V3(), fn = new V3();
  for (const b of blobs) { const rx = b[3], ry = b[4], rz = b[5] || b[3]; const area = 4 * Math.PI * (rx * ry + rx * rz + ry * rz) / 3; const n = Math.min(o.max || 900, Math.round(area * dens / (size * size)));
    for (let i = 0; i < n; i++) { const u = rnd(-1, 1), a = rnd(TAU), s = Math.sqrt(1 - u * u); d.set(s * Math.cos(a), u, s * Math.sin(a));
      const r = rnd(0.95, 1.12); pos.set(b[0] + d.x * rx * r, b[1] + d.y * ry * r, b[2] + d.z * rz * r);
      let buried = false; for (const c of blobs) { if (c === b) continue; const ex = (pos.x - c[0]) / c[3], ey = (pos.y - c[1]) / c[4], ez = (pos.z - c[2]) / (c[5] || c[3]); if (ex * ex + ey * ey + ez * ez < 0.7) { buried = true; break; } }
      if (buried) continue;
      nrm.set(d.x / rx, d.y / ry, d.z / rz).normalize(); fn.set(rnd(-0.7, 0.7), rnd(-0.4, 0.8), rnd(-0.7, 0.7)).add(nrm).normalize();
      q.setFromUnitVectors(Z, fn); q2.setFromAxisAngle(fn, rnd(TAU)); q.premultiply(q2);
      const k = size * rnd(0.75, 1.3); sc.set(k, k, k); m4.compose(pos, q, sc); M.push(m4.clone()); N.push(nrm.x, nrm.y, nrm.z); T.push(rnd()); } }
  const g = new THREE.PlaneGeometry(1, 1); g.setAttribute('aN', new THREE.InstancedBufferAttribute(new Float32Array(N), 3)); g.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array(T), 1));
  const im = new THREE.InstancedMesh(g, cardMat(o.ta, o.tb, o.blos || 0), M.length); M.forEach((m, i) => im.setMatrixAt(i, m)); im.frustumCulled = false; im.userData.noShadow = true; scene.add(im);
  MPSTAT.cards += M.length; return im; }
const MPSTAT = { cards: 0, limbs: 0 };
// limbs: tapered, slightly kinked boughs from the trunk up into the crown. Solid.
const LIMBS = [];
function limb(a, b, r0, r1, solid = true) {
  const mid = a.clone().lerp(b, 0.5); mid.x += rnd(-1, 1) * a.distanceTo(b) * 0.08; mid.y += a.distanceTo(b) * rnd(0.04, 0.12); mid.z += rnd(-1, 1) * a.distanceTo(b) * 0.08;
  const rm = (r0 + r1) / 2;
  for (const [p, q, ra, rb] of [[a, mid, r0, rm], [mid, b, rm, r1]]) { const dir = q.clone().sub(p), L = dir.length(); const g = new THREE.CylinderGeometry(rb, ra, L * 1.04, 10, 3);
    const m = new THREE.Mesh(g, barkMat); m.position.copy(p).addScaledVector(dir, 0.5); m.quaternion.setFromUnitVectors(YA, dir.normalize()); scene.add(m);
    if (solid) LIMBS.push({ a: p.clone(), b: q.clone(), r: Math.max(ra, rb) }); MPSTAT.limbs++; } }
const _lp = new V3(), _ld = new V3();
function limbCollide(p, v) { for (const L of LIMBS) { if (Math.abs(p.x - L.a.x) > 70 || Math.abs(p.z - L.a.z) > 70) continue;
  _ld.subVectors(L.b, L.a); const t = clamp(_ld.dot(_lp.subVectors(p, L.a)) / _ld.lengthSq(), 0, 1); _lp.copy(L.a).addScaledVector(_ld, t);
  const dx = p.x - _lp.x, dy = p.y - _lp.y, dz = p.z - _lp.z, dd = Math.hypot(dx, dy, dz), rr = L.r + PR;
  if (dd < rr && dd > 1e-4) { const nx = dx / dd, ny = dy / dd, nz = dz / dd; p.set(_lp.x + nx * rr, _lp.y + ny * rr, _lp.z + nz * rr); const vn = v.x * nx + v.y * ny + v.z * nz; if (vn < 0) { v.x -= nx * vn * 1.2; v.y -= ny * vn * 1.2; v.z -= nz * vn * 1.2; } } } }
function crownLimbs(x, base, z, R, blobs, top) { for (const b of blobs) { if (rnd() < 0.15) continue; const a = Math.atan2(b[2] - z, b[0] - x);
  const s = new V3(x + Math.cos(a) * R * 0.45, base + rnd(-0.06, 0.06) * (top - base), z + Math.sin(a) * R * 0.45), e = new V3(b[0] - (b[0] - x) * 0.15, b[1] - b[4] * 0.25, b[2] - (b[2] - z) * 0.15);
  limb(s, e, R * 0.32, Math.max(0.5, R * 0.08)); } }
const leafMat = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vL.xy*6.0+vL.z*4.0); n=normalize(n+(vec3(fbm(vL.yz*9.0),fbm(vL.xz*9.0),fbm(vL.xy*9.0))-0.5)*1.2);
  vec3 alb=mix(vec3(0.03,0.11,0.02),vec3(0.22,0.40,0.06),a)*${MP ? '0.45' : '1.0'}; gl_FragColor=vec4(finish(shade(alb,n,vW,0.1,0.7),vW),1.0); }`);
const blobG = new THREE.IcosahedronGeometry(1, 3);
function canopy(x, y, z, r, n, opt) { const bl = []; for (let i = 0; i < n; i++) { const a = rnd(TAU), d = rnd(0.2, 1) * r; const b = [x + Math.cos(a) * d, y + rnd(-0.25, 0.4) * r, z + Math.sin(a) * d, r * rnd(0.5, 0.8), r * rnd(0.35, 0.55), r * rnd(0.5, 0.8)]; bl.push(b);
  const m = new THREE.Mesh(blobG, leafMat); m.position.set(b[0], b[1], b[2]); m.scale.set(b[3], b[4], b[5]).multiplyScalar(MP ? 0.93 : 1); scene.add(m); }
  if (MP && opt) { leafShell(bl, { size: opt.size, dens: opt.dens, ta: '0.05,0.15,0.03', tb: '0.30,0.48,0.08' }); crownLimbs(x, opt.base, z, opt.R, bl, y); }
  return bl; }
canopy(0, 95, 0, 55, 9, { size: 16, R: ROUT * 0.85, base: 70 });
for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + rnd(0.4), d = rnd(260, 420), x = Math.cos(a) * d, z = Math.sin(a) * d, R = rnd(6, 11), b = terrainH(x, z); const t = new THREE.Mesh(trunkGeo(R, b, 70), barkMat); t.position.set(x, 0, z); scene.add(t); canopy(x, b + 80, z, rnd(35, 50), 6, { size: 20, dens: 1.3, R: R * 0.85, base: b + 58 }); }
// the dew run: a worn little track through thick grass, threading under the dew arches
const DEWPATH = (() => { const H = HILLS[0], A = new V3(FDIR.x * 135, 0, FDIR.z * 135), B = new V3(H.x + Math.cos(Math.atan2(-H.z, -H.x) + 0.5) * (H.r + 12), 0, H.z + Math.sin(Math.atan2(-H.z, -H.x) + 0.5) * (H.r + 12));
  const N = 7, pts = [], dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz), sx = -dz / L, sz = dx / L;
  for (let i = 0; i < N; i++) { const t = (i + 0.5) / N, wob = Math.sin(t * 7.0) * 14; pts.push(new V3(lerp(A.x, B.x, t) + sx * wob, 0, lerp(A.z, B.z, t) + sz * wob)); }
  const pre = pts[0].clone().addScaledVector(pts[0].clone().sub(pts[1]).normalize(), 18), post = pts[N - 1].clone().addScaledVector(pts[N - 1].clone().sub(pts[N - 2]).normalize(), 14);
  const c = new THREE.CatmullRomCurve3([pre, ...pts, post], false, 'centripetal'), S = c.getSpacedPoints(Math.ceil(c.getLength() / 1.2));
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of S) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  return { S, box: [x0 - 10, x1 + 10, z0 - 10, z1 + 10] }; })();
function dewPathD(x, z) { const b = DEWPATH.box; if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) return 1e9; let m = 1e18; for (const p of DEWPATH.S) { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < m) m = d; } return Math.sqrt(m); }
{ const S = DEWPATH.S, pos = [], uv = [], idx = [], W = 2.6;
  S.forEach((p, i) => { const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)]; let tx = b.x - a.x, tz = b.z - a.z; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
    const w = W * (0.85 + 0.3 * Math.sin(i * 0.37) * Math.sin(i * 0.13));
    for (const s of [-1, 1]) { const x = p.x - tz * s * w, z = p.z + tx * s * w; pos.push(x, terrainH(x, z) + 0.06, z); uv.push(s < 0 ? 0 : 1, i * 0.4); }
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = mat(`void main(){ vec3 n=vec3(0.0,1.0,0.0); float a=fbm(vW.xz*0.9), f=vnoise(vW.xz*6.0);
    vec3 alb=mix(vec3(0.16,0.11,0.06),vec3(0.36,0.27,0.16),a)*(0.8+0.35*f);
    float ed=min(vUv.x,1.0-vUv.x); float al=smoothstep(0.02,0.32+0.12*vnoise(vW.xz*0.7),ed);
    alb=mix(vec3(0.20,0.24,0.08),alb,smoothstep(0.1,0.4,ed));
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.03,0.0),vW),al); }`, { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 1; scene.add(mesh); }
// model pass grass: tufts of three slim, twisting blades with a midrib, dry tips and the odd seed spike
function GRASS_MP() { return mat(`varying float vH; varying float vT; varying float vSeed; varying float vR;
void main(){ vec3 n=NORMAL; float patchy=fbm(vW.xz*0.015);
  vec3 tipc=mix(vec3(0.30,0.50,0.09),vec3(0.46,0.50,0.16),smoothstep(0.45,0.7,patchy));
  vec3 alb=mix(vec3(0.025,0.08,0.015),tipc,smoothstep(0.0,0.75,vH))*vT*(0.85+0.3*vR);
  alb*=0.8+0.32*(1.0-smoothstep(0.0,0.14,abs(vL.x)));
  float dry=smoothstep(0.8,1.0,vH)*step(0.5,vR); alb=mix(alb,vec3(0.52,0.44,0.20),dry*0.7);
  alb=mix(alb,vec3(0.50,0.42,0.22)*(0.75+0.5*vnoise(vec2(vL.x*9.0,vH*60.0))),vSeed*smoothstep(0.5,0.6,vH));
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.3*vH,0.9),vW),1.0); }`, { side: THREE.DoubleSide, vert: `
attribute vec3 aOff; attribute vec4 aPar; uniform float uTime; varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv; varying vec3 vL; varying float vH; varying float vT; varying float vSeed; varying float vR;
void main(){ float bi=position.z, y=position.y, sd=position.x;
  float r1=fract(sin(aPar.z*12.9898+bi*78.233)*43758.5453), r2=fract(r1*91.7+bi*0.37);
  float seed=step(bi,0.5)*step(fract(aPar.z*3.71),0.07);
  float h=aPar.x*(0.65+0.45*r1)*(1.0+0.35*seed);
  float ang=aPar.y+bi*2.2+r2*0.8, c=cos(ang), s=sin(ang);
  vec2 bo=vec2(cos(bi*2.4+aPar.z),sin(bi*2.4+aPar.z))*0.32*step(0.5,bi);
  float wid=mix(0.3*(0.8+0.4*r2)*(1.0-pow(y,1.5)*0.9), mix(0.06,0.3,smoothstep(0.6,0.75,y)), seed);
  float bend=y*y*(0.8+sin(uTime*1.2+aPar.z+bi+aOff.x*0.04+aOff.z*0.03)*0.7)*h*0.2*(1.0+0.6*r1)*(1.0-0.6*seed);
  float tw=y*(r2-0.5)*1.8;
  vec3 l=vec3(sd*wid*cos(tw), y*h-0.3*bend*bend/max(h,1.0), bend+sd*wid*sin(tw));
  vec3 w=aOff+vec3(bo.x,0.0,bo.y)+vec3(l.x*c-l.z*s, l.y, l.x*s+l.z*c);
  vW=w; vL=vec3(sd,y,bi); vC=vec3(1.0); vUv=vec2(0.0); vN=normalize(vec3(-s,0.0,c)*0.7+vec3(c,0.0,s)*sd*0.7+vec3(0.0,0.5+y*0.4,0.0)); vH=y; vT=aPar.w; vSeed=seed; vR=r2;
  gl_Position=projectionMatrix*viewMatrix*vec4(w,1.0); }` }); }
function grassTuftGeo(g) { const P = [], I = []; for (let b = 0; b < 3; b++) { const o = b * 9; for (const y of [0, 0.3, 0.55, 0.78]) P.push(-0.5, y, b, 0.5, y, b); P.push(0, 1, b);
  for (let s = 0; s < 3; s++) { const k = o + s * 2; I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } I.push(o + 6, o + 7, o + 8); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); }
// grass
let grassMesh;
{
  const N = 84000, NB = 9000, off = new Float32Array((N + NB) * 3), par = new Float32Array((N + NB) * 4); let n = 0, guard = 0;
  // thick walls of taller grass hugging the dew run, so the track reads as a tight little path
  for (let k = 0; k < NB * 3 && n < NB; k++) { const p = DEWPATH.S[(Math.random() * DEWPATH.S.length) | 0], a = rnd(TAU), r = rnd(2.5, 8), x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, h = terrainH(x, z);
    if (h < WY + 0.6 || dewPathD(x, z) < 2.5) continue; off[n * 3] = x; off[n * 3 + 1] = h - 0.2; off[n * 3 + 2] = z; par[n * 4] = rnd(8, 14); par[n * 4 + 1] = rnd(TAU); par[n * 4 + 2] = rnd(TAU); par[n * 4 + 3] = rnd(0.7, 1.15); n++; }
  while (n < N + NB && guard++ < N * 4) { const a = rnd(TAU), d = Math.sqrt(Math.random()) * 330 + 14, x = Math.cos(a) * d, z = Math.sin(a) * d, h = terrainH(x, z); if (h < WY + 0.6 || dewPathD(x, z) < 2.4 || brookD(x, z) < BROOK.hw + 0.6 || Math.abs(Math.hypot(x - HOLLOW.x, z - HOLLOW.z) - HOLLOW.r) < 1.6 || hollowRootD(x, z) < 3.4) continue;
    off[n * 3] = x; off[n * 3 + 1] = h - 0.2; off[n * 3 + 2] = z; par[n * 4] = rnd(4, 11) * (h < WY + 3 ? 1.5 : 1); par[n * 4 + 1] = rnd(TAU); par[n * 4 + 2] = rnd(TAU); par[n * 4 + 3] = rnd(0.7, 1.25); n++; }
  const g = new THREE.InstancedBufferGeometry(); g.instanceCount = n;
  if (MP) grassTuftGeo(g); else { g.setAttribute('position', new THREE.Float32BufferAttribute([-.5, 0, 0, .5, 0, 0, -.5, .5, 0, .5, .5, 0, 0, 1, 0], 3)); g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]); }
  g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3)); g.setAttribute('aPar', new THREE.InstancedBufferAttribute(par, 4));
  const m = MP ? GRASS_MP() : mat(`varying float vH; varying float vT; void main(){ vec3 n=NORMAL; float patchy=fbm(vW.xz*0.015); vec3 alb=mix(vec3(0.03,0.10,0.02),mix(vec3(0.30,0.50,0.09),vec3(0.46,0.50,0.16),smoothstep(0.45,0.7,patchy)),vH)*vT; alb*=0.85+0.25*(1.0-smoothstep(0.0,0.1,abs(vL.x)));
    alb=mix(alb,vec3(0.5,0.45,0.18),smoothstep(0.85,1.0,vH)*step(1.1,vT));
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.25*vH,0.9),vW),1.0); }`, { side: THREE.DoubleSide, vert: `
    attribute vec3 aOff; attribute vec4 aPar; uniform float uTime; varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vUv; varying vec3 vL; varying float vH; varying float vT;
    void main(){ float h=aPar.x, c=cos(aPar.y), s=sin(aPar.y), y=position.y;
      float bend=y*y*(0.8+sin(uTime*1.2+aPar.z+aOff.x*0.04+aOff.z*0.03)*0.7)*h*0.2;
      vec3 l=vec3(position.x*1.1*(1.0-y*0.8), y*h, bend);
      vec3 w=aOff+vec3(l.x*c-l.z*s, l.y, l.x*s+l.z*c);
      vW=w; vL=position; vC=vec3(1.0); vUv=vec2(0.0); vN=normalize(vec3(-s*0.7,0.5+y*0.4,c*0.7)); vH=y; vT=aPar.w;
      gl_Position=projectionMatrix*viewMatrix*vec4(w,1.0); }` });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; scene.add(mesh); grassMesh = mesh;
}
// flowers
const PAL = [
  { p: [0.95, 0.94, 0.90], c: [0.95, 0.62, 0.05], np: [18, 24], len: [2.6, 3.4], kind: 'daisy' },
  { p: [0.92, 0.32, 0.55], c: [0.85, 0.60, 0.06], np: [8, 8], len: [3.0, 4.0], kind: 'cosmos' },
  { p: [0.62, 0.30, 0.85], c: [0.88, 0.66, 0.08], np: [8, 8], len: [2.6, 3.4], kind: 'cosmos' },
  { p: [1.0, 0.72, 0.06], c: [0.22, 0.11, 0.03], np: [16, 22], len: [3.0, 4.2], kind: 'daisy' },
  { p: [0.95, 0.10, 0.03], c: [0.04, 0.03, 0.04], np: [4, 4], len: [3.4, 4.2], kind: 'poppy' },
  { p: [1.0, 0.55, 0.08], c: [0.10, 0.06, 0.03], np: [4, 5], len: [3.0, 3.8], kind: 'poppy' }];
{
  const place = (x, z) => { if (terrainH(x, z) < WY + 1.5 || Math.hypot(x, z) < 22) return; if (Math.hypot(x - FOREST.x, z - FOREST.z) < FOREST.r + 14 || Math.hypot(x - LOG.c.x, z - LOG.c.z) < 30 || Math.abs(Math.hypot(x - ORCH.x, z - ORCH.z) - HEDGE_R) < 10) return; const ty = (Math.random() * PAL.length) | 0, T = PAL[ty];
    for (const f of flowers) if (Math.hypot(f.x - x, f.z - z) < 7) return;
    flowers.push({ x, z, y: terrainH(x, z) + rnd(9, 22), r: rnd(1.0, 1.7), T, np: Math.round(rnd(T.np[0], T.np[1])), len: rnd(T.len[0], T.len[1]), cool: 0, tilt: rnd(0.05, 0.45), ax: rnd(-0.12, 0.12), az: rnd(-0.12, 0.12), val: 1, orch: Math.hypot(x - ORCH.x, z - ORCH.z) < HEDGE_R }); };
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
  let guard = 0; while (flowers.length < 120 && guard++ < 3000) place(FDIR.x * FIELD_D + gauss() * 62, FDIR.z * FIELD_D + gauss() * 62);
  for (let i = 0; i < 7; i++) { const a = rnd(-1.2, 1.9), d = rnd(28, 70); place(Math.cos(a) * d, Math.sin(a) * d); }
  guard = 0; while (flowers.length < 185 && guard++ < 3000) { const a = rnd(TAU), d = rnd(40, 310); place(Math.cos(a) * d, Math.sin(a) * d); }
  // sunblooms crown the orchard canopies (rare, worth 3)
  const SUNPAL = { p: [1.3, 0.85, 0.12], c: [0.95, 0.38, 0.02] };
  const BLOSSOM = { p: [1.15, 0.72, 0.78], c: [0.95, 0.85, 0.3] };
  for (const t of orchTrees) flowers.push({ x: t.x + srnd(-2, 2), z: t.z + srnd(-2, 2), y: t.top + t.cr * 0.68 + 0.4, r: 1.5, T: BLOSSOM, np: 14, len: 3.2, cool: 0, tilt: 0.2, ax: 0, az: 0, val: 1, orch: true, canopy: true });
  for (let i = 0; i < 30; i++) { const a = srnd(TAU), d = Math.sqrt(srnd()) * (ORCH.r - 5), x = ORCH.x + Math.cos(a) * d, z = ORCH.z + Math.sin(a) * d;
    if (orchTrees.some(t => Math.hypot(t.x - x, t.z - z) < t.cr + 2) || flowers.some(f => Math.hypot(f.x - x, f.z - z) < 7)) continue; const T = PAL[(srnd() * PAL.length) | 0];
    flowers.push({ x, z, y: terrainH(x, z) + srnd(8, 15), r: srnd(1, 1.6), T, np: Math.round(srnd(T.np[0], T.np[1])), len: srnd(T.len[0], T.len[1]), cool: 0, tilt: srnd(0.05, 0.45), ax: 0, az: 0, val: 2, orch: true }); }
  { // the ground flowers tucked closest under the canopies become sunblooms (worth 3)
    const g = flowers.filter(f => f.orch && !f.canopy).map(f => [f, Math.min(...orchTrees.map(t => Math.hypot(t.x - f.x, t.z - f.z) - t.cr))]).sort((a, b) => a[1] - b[1]);
    for (const [f] of g.slice(0, 5)) { f.val = 3; f.T = SUNPAL; f.np = 14; f.r = 1.4; f.y = Math.min(f.y, terrainH(f.x, f.z) + 9); } }
  { const H = HILLS[0]; flowers.push({ x: H.x, z: H.z, y: terrainH(H.x, H.z) + 30, r: 5.5, T: { p: [1.2, 0.72, 0.04], c: [0.22, 0.11, 0.03] }, np: 28, len: 12, cool: 0, tilt: 0.25, ax: 0.1, az: -0.05, val: 5, giant: true, sw: 3.5 }); }
  for (const sg of [-1, 1]) { const c = LOG.c.clone().addScaledVector(LOG.axis, sg * 9); flowers.push({ x: c.x, z: c.z, y: c.y - LOG.ri + 1.1, r: 0.8, T: { p: [0.6, 1.15, 0.8], c: [0.9, 1.0, 0.6] }, np: 7, len: 1.6, cool: 0, tilt: 0.2, ax: 0, az: 0, val: 2, inLog: true }); }
  // round 6: pond lilies sitting on the pads (the pads are placed here so the lilies can sit on them)
  { let guard = 0; while (PADS0.length < 11 && guard++ < 500) { const a = rnd(TAU), d = rnd(8, POND.r - 6), x = POND.x + Math.cos(a) * d, z = POND.z + Math.sin(a) * d; if (!overWater(x, z) || terrainH(x, z) > WY - 1.2) continue; if (PADS0.some(p => Math.hypot(p.x - x, p.z - z) < p.r + 9)) continue; PADS0.push({ x, z, r: rnd(4, 7.5) }); }
    const LILY = { p: [1.25, 1.12, 1.15], c: [1.1, 0.75, 0.1] }, LOTUS = { p: [1.3, 0.5, 0.72], c: [1.2, 0.85, 0.15] };
    const big = PADS0.reduce((a, b) => (b.r > a.r ? b : a), PADS0[0]);
    PADS0.forEach((p, i) => { if (i % 2 && p !== big) return; const lotus = p === big, a = rnd(TAU), o = p.r * 0.4;
      flowers.push({ x: p.x + Math.cos(a) * o, z: p.z + Math.sin(a) * o, y: WY + (lotus ? 1.5 : 1.0), r: lotus ? 1.5 : 1.1, T: lotus ? LOTUS : LILY, np: lotus ? 16 : 11, len: lotus ? 2.4 : 1.7, cool: 0, tilt: 0.55, ax: 0, az: 0, val: lotus ? 3 : 2, zone: 'pond', lily: true }); });
  }
  // round 6: woodland flowers: violets low among the roots, foxgloves standing in the shade under the trees
  { const VIOLET = { p: [0.55, 0.3, 1.05], c: [1.1, 0.85, 0.15] }, FOX = { p: [0.95, 0.35, 0.85], c: [1.0, 0.95, 0.85] }, fr = FOREST.rnd; let guard = 0, nv = 0, nf = 0;
    while ((nv < 14 || nf < 5) && guard++ < 4000) { const a = fr(0, TAU), d = Math.sqrt(fr(0, 1)) * FOREST.r, x = FOREST.x + Math.cos(a) * d, z = FOREST.z + Math.sin(a) * d;
      if (forestTrees.some(t => Math.hypot(t.x - x, t.z - z) < t.R + 4) || flowers.some(f => Math.hypot(f.x - x, f.z - z) < 6)) continue;
      const fox = nf < 5 && forestTrees.some(t => Math.hypot(t.x - x, t.z - z) < t.cr * 0.8); if (!fox && nv >= 14) continue;
      const gy = terrainH(x, z); if (fox) nf++; else nv++;
      flowers.push({ x, z, y: gy + (fox ? fr(14, 19) : fr(2.5, 4.5)), r: fox ? 1.2 : 0.9, T: fox ? FOX : VIOLET, np: fox ? 9 : 5, len: fox ? 2.0 : 1.5, cool: 0, tilt: fox ? 0.5 : 0.25, ax: fr(-0.1, 0.1), az: fr(-0.1, 0.1), val: fox ? 3 : 2, zone: 'forest', fox }); }
  }
  // batch 2: clear flowers out of the brook and the bramble wall; moonbells (worth 3) grow hidden in the hollow
  for (let i = flowers.length - 1; i >= 0; i--) { const f = flowers[i]; if (f.lily) continue; if (brookD(f.x, f.z) < BROOK.hw + 2.5 || Math.hypot(f.x - HOLLOW.x, f.z - HOLLOW.z) < HOLLOW.r + 3) flowers.splice(i, 1); }
  { const MOON = { p: [0.62, 0.78, 1.15], c: [1.15, 0.95, 0.45] };
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + 0.4, d = k === 0 ? 0 : 7.5, x = HOLLOW.x + Math.cos(a) * d, z = HOLLOW.z + Math.sin(a) * d;
      flowers.push({ x, z, y: terrainH(x, z) + (k === 0 ? 5.5 : 3.6), r: 1.0, T: MOON, np: 10, len: 1.8, cool: 0, tilt: 0.3, ax: 0, az: 0, val: 3, glade: true }); } }
  const pg = new THREE.PlaneGeometry(1, 1, 10, 6); pg.rotateX(-Math.PI / 2); pg.translate(0.5, 0, 0);
  { const p = pg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const prof = Math.sin(Math.PI * Math.pow(x, 0.62)) * 0.9 + 0.12; p.setZ(i, z * prof); p.setY(i, 0.22 * x * x - 0.5 * z * z * prof + Math.sin(x * 9) * 0.01 + 0.16 * Math.pow(x, 6) - 0.05 * Math.abs(z) * x); } pg.computeVertexNormals(); }
  const totalP = flowers.reduce((s, f) => s + f.np, 0);
  const petalMat = mat(`void main(){ vec3 n=NORMAL; float v=vUv.x; float across=abs(vUv.y-0.5)*2.0;
    vec3 base=vC*(0.72+0.38*v)*(0.9+0.2*vnoise(vUv*vec2(6.0,40.0)));
    base=mix(base, base*0.7, pow(abs(sin(vUv.y*22.0)),8.0)*0.4); float rib=1.0-smoothstep(0.0,0.05,abs(vUv.y-0.5)); base*=1.0-0.2*rib*smoothstep(0.05,0.4,v); base=mix(base,base*0.72,smoothstep(0.8,1.0,across)*0.6);
    float reveal=smoothstep(60.0,16.0,length(vW-uCam));
    float guide=smoothstep(0.62,0.12,v); float veins=pow(abs(sin(vUv.y*15.7)),10.0)*smoothstep(0.95,0.3,v);
    vec3 uvc=mix(vec3(0.30,0.06,0.95),vec3(0.10,0.95,0.90),0.5+0.5*sin(uTime*1.6+v*10.0));
    float k=reveal*clamp(guide*0.75+veins*0.6,0.0,1.0);
    vec3 c=shade(mix(base,base*0.55,k*0.5),n,vW,0.12,1.0)+uvc*k*0.3*(1.0-0.85*uNight);
    gl_FragColor=vec4(finish(c,vW),1.0); }`, { side: THREE.DoubleSide });
  const swayV = (stem, centre) => SWAYGLSL + VERT.replace('vec4 w = m*vec4(position,1.0);', `vec4 w = m*vec4(position,1.0); vec2 o=vec2(m[3][0],m[3][2])${centre ? '' : ''}; w.xz += sway(o)*aSway${stem ? '*position.y*position.y' : ''};`);
  petalMat.vertexShader = swayV(false);
  petalMat.vertexShader = 'uniform float uClose;\n' + petalMat.vertexShader.replace('vec4 w = m*vec4(position,1.0);', 'vec3 pc=position; float ca=uClose*1.2; pc=vec3(pc.x*cos(ca)-pc.y*sin(ca), pc.x*sin(ca)+pc.y*cos(ca), pc.z*(1.0-0.5*uClose)); vec4 w = m*vec4(pc,1.0);');
  const KINDS = ['classic', 'daisy', 'poppy', 'cosmos'], kindOf = f => (f.T && f.T.kind) || 'classic';
  const petalGeo = kind => { if (kind === 'classic') return pg; const g = new THREE.PlaneGeometry(1, 1, 14, 8); g.rotateX(-Math.PI / 2); g.translate(0.5, 0, 0); const P2 = g.attributes.position;
    for (let i = 0; i < P2.count; i++) { let x = P2.getX(i), z = P2.getZ(i), y = 0, prof;
      if (kind === 'daisy') { prof = Math.sin(Math.PI * Math.pow(x, 0.5)) * 0.32 + 0.05; y = 0.12 * x * x - 0.3 * z * z * prof + 0.06 * Math.pow(x, 5); }
      else if (kind === 'poppy') { prof = Math.sin(Math.PI * Math.pow(x, 0.85)) * 1.25 + 0.14; y = 0.28 * x * x - 0.18 * z * z * prof + 0.035 * Math.sin(z * 22 + x * 9) * x + 0.025 * Math.sin(x * 31) * x; }
      else { prof = Math.sin(Math.PI * Math.pow(x, 0.62)) * 0.85 + 0.1; const notch = 0.09 * Math.abs(Math.sin(z * Math.PI * 3 / Math.max(prof, 0.2))) * smooth(0.75, 1, x); x -= notch; y = 0.2 * x * x - 0.35 * z * z * prof + 0.02 * Math.sin(z * 18) * x; }
      P2.setXYZ(i, x, y, z * prof); }
    g.computeVertexNormals(); return g; };
  const kindCount = {}; for (const k of KINDS) kindCount[k] = 0; for (const f of flowers) kindCount[kindOf(f)] += f.np;
  const PM = {}; for (const k of KINDS) { const g = petalGeo(k); const im = new THREE.InstancedMesh(g, petalMat, Math.max(1, kindCount[k])); im.frustumCulled = false; PM[k] = { im, g, sw: new Float32Array(Math.max(1, kindCount[k])), n: 0 }; }
  const petals = PM.classic.im;
  const cen = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 22, 12), mat(`void main(){ vec3 n=NORMAL; vec2 q=vL.xz; float r=length(q); float a=atan(q.y,q.x);
    float s1=sin(a*13.0+r*30.0), s2=sin(a*21.0-r*30.0); float fl=0.5+0.5*s1*s2; fl=mix(fl,vnoise(q*24.0),0.35);
    vec3 alb=vC*(0.6+0.55*fl)*(0.75+0.35*smoothstep(0.1,0.9,r)); alb=mix(alb,vec3(1.0,0.78,0.22),smoothstep(0.55,0.95,r)*0.45*fl);
    float pol=smoothstep(0.72,0.85,vnoise(q*40.0))*smoothstep(0.25,0.8,r); alb=mix(alb,vec3(1.15,0.88,0.28),pol);
    n=normalize(n+vec3(cos(a),0.0,sin(a))*(fl-0.5)*0.45);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.1+0.5*pol,0.45),vW),1.0); }`, { vert: swayV(false) }), flowers.length); cen.frustumCulled = false;
  const stemG = new THREE.CylinderGeometry(0.14, 0.22, 1, 6); stemG.translate(0, 0.5, 0);
  const stems = new THREE.InstancedMesh(stemG, simple('0.12,0.30,0.05', 0.2, 0.4, { vert: swayV(true) }), flowers.length); stems.frustumCulled = false;
  const m = new M4(), q = new Q4(), e = new THREE.Euler(), col = new THREE.Color(); let pi = 0;
  const swP = new Float32Array(totalP), swF = new Float32Array(flowers.length);
  flowers.forEach((f, i) => {
    f.sway = f.giant ? 0.25 : (f.val >= 3 || f.inLog || f.canopy) ? 0 : f.lily ? 0.3 : 1; swF[i] = f.sway;
    const gy = terrainH(f.x, f.z);
    m.compose(new V3(f.x, gy - 0.5, f.z), q.identity(), new V3(f.sw || 1, f.y - gy + 0.3, f.sw || 1)); stems.setMatrixAt(i, m);
    const hq = new Q4().setFromEuler(new THREE.Euler(f.ax, 0, f.az));
    m.compose(new V3(f.x, f.y, f.z), hq, new V3(f.r, f.r * 0.5, f.r)); cen.setMatrixAt(i, m); cen.setColorAt(i, col.setRGB(...f.T.c));
    for (let k = 0; k < f.np; k++) { const a = k / f.np * TAU + i; e.set(0, a, f.tilt + rnd(-0.06, 0.06), 'YXZ'); q.setFromEuler(e).premultiply(hq);
      const off = new V3(f.r * 0.75, -0.1, 0).applyQuaternion(q); const sh = rnd(0.85, 1.1);
      const K = PM[kindOf(f)], kd = kindOf(f), wf = kd === 'daisy' ? 1 : kd === 'poppy' ? 1 : kd === 'cosmos' ? 1 : Math.min(1.1, 7.5 / f.np); if (kd === 'poppy') { e.set(0, a, f.tilt * 0.5 + 0.05 + rnd(-0.06, 0.06), 'YXZ'); q.setFromEuler(e).premultiply(hq); }
      m.compose(new V3(f.x + off.x, f.y + off.y, f.z + off.z), q, new V3(f.len, f.len, f.len * wf)); K.im.setMatrixAt(K.n, m); K.im.setColorAt(K.n, col.setRGB(f.T.p[0] * sh, f.T.p[1] * sh, f.T.p[2] * sh)); K.sw[K.n] = f.sway; K.n++; pi++; }
  });
  for (const k of KINDS) PM[k].g.setAttribute('aSway', new THREE.InstancedBufferAttribute(PM[k].sw, 1)); cen.geometry.setAttribute('aSway', new THREE.InstancedBufferAttribute(swF, 1)); stemG.setAttribute('aSway', new THREE.InstancedBufferAttribute(swF, 1));
  for (const k of KINDS) scene.add(PM[k].im); scene.add(cen, stems);
}
// mushrooms
const shrooms = [];
{
  const capM = mat(`void main(){ vec3 n=NORMAL; float sp=smoothstep(0.62,0.7,vnoise(vL.xz*6.5+vW.xz*0.1)); float under=step(vL.y,0.02);
    vec3 alb=mix(vec3(0.50,0.05,0.02),vec3(0.85,0.80,0.68),sp); alb=mix(alb,vec3(0.75,0.68,0.55)*(0.6+0.4*abs(sin(atan(vL.z,vL.x)*40.0))),under);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.5*(1.0-sp),0.3),vW),1.0); }`, { side: THREE.DoubleSide });
  const capG = new THREE.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2), stG = new THREE.CylinderGeometry(0.22, 0.32, 1, 10); stG.translate(0, 0.5, 0); const stM = simple('0.80,0.74,0.62', 0.1, 0.5);
  for (const [a, d, R] of [[0.6, 26, 4.2], [0.9, 32, 2.8], [-0.7, 30, 3.6], [2.6, 40, 5], [4.0, 55, 3.4], [1.5, 80, 4.4], [-1.6, 95, 3.2]]) {
    const x = Math.cos(a) * d, z = Math.sin(a) * d, gy = terrainH(x, z), h = R * 1.4; const c = new THREE.Mesh(capG, capM); c.position.set(x, gy + h, z); c.scale.set(R, R * 0.7, R); const s = new THREE.Mesh(stG, stM); s.position.set(x, gy - 0.5, z); s.scale.set(R, h + 0.6, R); scene.add(c, s);
    shrooms.push({ x, y: gy + h, z, R, gy, mesh: c, sq: 0 });
  }
}
// pond
const pads = [];
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
const fish = new THREE.Group();
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
// soft beacon at the hive door
const beacon = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,200,90,1)'); g.addColorStop(0.3, 'rgba(255,170,50,.35)'); g.addColorStop(1, 'rgba(255,150,30,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); s.position.set(ROUT + 0.8, TY, 0); s.scale.setScalar(16); scene.add(s); return s; })();

// ---------- round 7: leafy fringe shells around tree crowns, so the outline breaks into leaves ----------
const fringeMat = (blossom) => mat(`void main(){ vec3 n=NORMAL;
  float lf=vnoise(vW.xz*1.7+vW.y*1.4)*0.55+vnoise(vW.xz*4.3-vW.y*3.9)*0.45; if(lf<0.53) discard;
  float a=fbm(vW.xz*0.35+vW.y*0.3); vec3 leaf=mix(vec3(0.04,0.12,0.03),vec3(0.27,0.43,0.08),a);
  vec3 bl=mix(vec3(0.92,0.38,0.58),vec3(1.0,0.80,0.84),vnoise(vW.xz*7.0+vW.y*5.0));
  float isB=${blossom ? 'smoothstep(0.42,0.56,fbm(vW.xz*1.4+vW.y*1.1))' : '0.0'};
  vec3 alb=mix(leaf,bl,isB)*(0.7+1.2*(lf-0.53));
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.05,0.9),vW),1.0); }`);
function addFringe(im, blossom) { const f = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.13, 3), fringeMat(blossom), im.count); f.instanceMatrix = im.instanceMatrix; f.frustumCulled = false; scene.add(f); return f; }
// ================= ORCHARD ZONE, HEDGE, LOG, WEBS, WASPS =================
// layout is generated from a fixed seed so landmarks stay put between visits
const blossomMat = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vW.xz*0.45+vW.y*0.3); float b=fbm(vW.xz*${MP ? '0.3' : '1.4'}+vW.y*${MP ? '0.25' : '1.1'}); float sp=${MP ? '0.55' : 'vnoise(vW.xz*7.0+vW.y*5.0)'};
  n=normalize(n+(vec3(fbm(vW.yz*1.3),fbm(vW.xz*1.3),fbm(vW.xy*1.3))-0.5)*1.2);
  vec3 leaf=mix(vec3(0.05,0.14,0.03),vec3(0.24,0.40,0.07),a);
  vec3 bl=mix(vec3(0.92,0.38,0.58),vec3(1.0,0.80,0.84),sp*sp)*(0.8+0.3*sp);
  vec3 alb=mix(leaf,bl,smoothstep(0.38,0.55,b+0.15*sp)*0.92);
  alb*=${MP ? '0.55' : '1.0'};
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.02,0.8),vW),1.0); }`);
const hedgeMat = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vW.xz*0.25+vW.y*0.2); float b=vnoise(vW.xy*1.1+vW.z*0.9);
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
// wasp nest hanging under the big middle tree
const NEST = new V3(ORCH.x + 3, orchTrees[0].top - orchTrees[0].cr * 0.55 - 4, ORCH.z + 2);
{
  const g = new THREE.SphereGeometry(1, 20, 16); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 1 - Math.max(0, -y) * 0.35; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat(`void main(){ vec3 n=NORMAL; float bands=0.5+0.5*sin(vL.y*38.0+vnoise(vL.xz*6.0)*5.0);
    vec3 alb=mix(vec3(0.42,0.38,0.32),vec3(0.70,0.64,0.55),bands)*(0.8+0.3*vnoise(vL.xz*20.0+vL.y*9.0));
    if(vL.y<-0.8) alb*=0.2;
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.05,0.2),vW),1.0); }`));
  m.scale.set(2.8, 3.8, 2.8); m.position.copy(NEST); scene.add(m);
}
// hollow fallen log: a tunnel you can fly through, with honeydew blossoms inside
const logMesh = new THREE.Group();
{
  const outerM = mat(`void main(){ vec3 n=NORMAL; float a=atan(vL.z,vL.x); float rid=fbm(vec2(a*7.0,vL.y*0.25)); float fine=fbm(vec2(a*30.0,vL.y*1.3));
    vec3 alb=mix(vec3(0.07,0.05,0.035),vec3(0.38,0.28,0.18),smoothstep(0.3,0.7,rid))*(0.7+0.6*fine);
    alb=mix(alb,vec3(0.14,0.30,0.05),smoothstep(0.45,0.7,fbm(vec2(a*3.0,vL.y*0.1)+2.0))*smoothstep(-0.2,0.6,n.y));
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.03,0.0),vW),1.0); }`);
  const innerM = mat(`void main(){ vec3 n=NORMAL; float a=atan(vL.z,vL.x); float g=fbm(vec2(a*5.0,vL.y*0.5));
    vec3 alb=mix(vec3(0.20,0.11,0.05),vec3(0.55,0.36,0.18),g);
    float glow=smoothstep(0.86,0.95,vnoise(vec2(a*4.0,vL.y*0.6)))*0.9;
    vec3 c=shade(alb,n,vW,0.05,0.0)*0.55+vec3(0.35,0.75,0.45)*glow*0.6;
    gl_FragColor=vec4(finish(c,vW),1.0); }`, { side: THREE.BackSide });
  const o = new THREE.Mesh(new THREE.CylinderGeometry(LOG.ro, LOG.ro * 1.05, LOG.len, 30, 6, true), outerM);
  const i = new THREE.Mesh(new THREE.CylinderGeometry(LOG.ri, LOG.ri, LOG.len, 30, 6, true), innerM);
  const rimM = simple('0.55,0.40,0.24', 0.05, 0.0, { side: THREE.DoubleSide });
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.RingGeometry(LOG.ri, LOG.ro, 30), rimM); r.rotation.x = Math.PI / 2; r.position.y = s * LOG.len / 2; logMesh.add(r); }
  logMesh.add(o, i);
  logMesh.position.copy(LOG.c); logMesh.quaternion.setFromUnitVectors(YA, LOG.axis); scene.add(logMesh);
}
// spider webs strung between orchard trees (and one across a meadow gap)
const webs = [];
{
  const spots = [];
  for (let i = 1; i < orchTrees.length && spots.length < 8; i++) {
    const t = orchTrees[i]; let best = null, bd = 1e9;
    for (let j = 0; j < orchTrees.length; j++) if (j !== i) { const u = orchTrees[j], d = Math.hypot(t.x - u.x, t.z - u.z); if (d < bd) { bd = d; best = u; } }
    if (!best || bd > 46 || spots.some(s => Math.hypot(s.x - (t.x + best.x) / 2, s.z - (t.z + best.z) / 2) < 8)) continue;
    spots.push({ x: (t.x + best.x) / 2, z: (t.z + best.z) / 2, dx: best.x - t.x, dz: best.z - t.z, r: Math.min(10, bd / 2 - 1.5) });
  }
  for (const s of spots) {
    const r = s.r, gy = terrainH(s.x, s.z), c = new V3(s.x, gy + r + srnd(3, 9), s.z);
    const n = new V3(-s.dz, 0, s.dx).normalize();
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 40), mat(`uniform float uR;
      void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW);
        float r=length(vL.xy), a=atan(vL.y,vL.x), rr=r*uR;
        float dsp=abs(sin(a*8.0))*rr; float spoke=1.0-smoothstep(0.015,0.06,dsp);
        float dr=abs(fract(rr/0.85+a/6.2832)-0.5)*0.85; float ring=(1.0-smoothstep(0.012,0.05,dr))*step(0.12,r);
        float line=max(spoke,ring)*smoothstep(1.0,0.9,r);
        float dew=step(0.985,hash21(floor(vL.xy*uR*4.0)))*line;
        float sp=pow(max(dot(reflect(-V,n),uSun),0.0),6.0)+pow(max(dot(-V,uSun),0.0),8.0);
        vec3 c=vec3(0.85,0.85,0.8)*(0.35+3.5*sp)+vec3(2.5,2.0,1.4)*dew*(0.4+3.0*sp);
        float al=line*(0.30+0.6*sp)+dew; if(al<0.01) discard;
        gl_FragColor=vec4(finish(c,vW),clamp(al,0.0,1.0)); }`, { uniforms: { uR: { value: r } }, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    m.scale.setScalar(r); m.position.copy(c); m.lookAt(c.clone().add(n)); scene.add(m);
    webs.push({ c, n, r, mesh: m, torn: 0 });
  }
}
const WEB_FRAG = `uniform float uR;
      void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW);
        float r=length(vL.xy), a=atan(vL.y,vL.x), rr=r*uR;
        float dsp=abs(sin(a*8.0))*rr; float spoke=1.0-smoothstep(0.015,0.06,dsp);
        float dr=abs(fract(rr/0.85+a/6.2832)-0.5)*0.85; float ring=(1.0-smoothstep(0.012,0.05,dr))*step(0.12,r);
        float line=max(spoke,ring)*smoothstep(1.0,0.9,r);
        float dew=step(0.985,hash21(floor(vL.xy*uR*4.0)))*line;
        float sp=pow(max(dot(reflect(-V,n),uSun),0.0),6.0)+pow(max(dot(-V,uSun),0.0),8.0);
        vec3 c=vec3(0.85,0.85,0.8)*(0.35+3.5*sp)+vec3(2.5,2.0,1.4)*dew*(0.4+3.0*sp);
        float al=line*(0.30+0.6*sp)+dew; if(al<0.01) discard;
        gl_FragColor=vec4(finish(c,vW),clamp(al,0.0,1.0)); }`;
// ================= ROUND 6: the forest edge, life on the pond, scent stones =================
const forestLeafMat = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vW.xz*0.35+vW.y*0.3); float b=vnoise(vW.xz*2.1+vW.y*1.7);
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
// scent stones: leave honey here and your sisters scout a new place
const ZONES = {
  garden: { name: 'The walled garden', lname: 'the walled garden', cost: 20, c: ORCH, ring: HEDGE_R + 6, at: (() => { const a = HEDGE_GAPS[0]; return [ORCH.x + Math.cos(a) * (HEDGE_R + 20), ORCH.z + Math.sin(a) * (HEDGE_R + 20)]; })() },
  pond: { name: 'The lily pond', lname: 'the lily pond', cost: 60, c: POND, ring: POND.r + 26, at: (() => { const d = Math.hypot(POND.x, POND.z); return [POND.x - POND.x / d * (POND.r + 36), POND.z - POND.z / d * (POND.r + 36)]; })() },
  forest: { name: 'The forest edge', lname: 'the forest edge', cost: 120, c: FOREST, ring: FOREST.r + 12, at: (() => { const d = Math.hypot(FOREST.x, FOREST.z); return [FOREST.x - FOREST.x / d * (FOREST.r + 24), FOREST.z - FOREST.z / d * (FOREST.r + 24)]; })() },
};
{
  const stoneM = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vW.xz*0.8+vW.y*0.6); vec3 alb=mix(vec3(0.42,0.39,0.34),vec3(0.74,0.70,0.62),a);
    alb=mix(alb,vec3(0.18,0.30,0.08),smoothstep(0.55,0.75,fbm(vW.xy*0.5+3.0))*smoothstep(0.0,0.6,n.y+0.3)*0.6);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.1,0.0),vW),1.0); }`);
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,200,90,1)'); g.addColorStop(0.3, 'rgba(255,170,50,.35)'); g.addColorStop(1, 'rgba(255,150,30,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  for (const [id, z] of Object.entries(ZONES)) {
    const [x, zz] = z.at, gy = terrainH(x, zz), top = gy + 6.2;
    const g = new THREE.IcosahedronGeometry(1, 2); const m = new THREE.Mesh(g, stoneM); m.position.set(x, gy + 1.2, zz); m.scale.set(5, 5, 4.4); m.rotation.y = x; scene.add(m);
    const wm = mat(`uniform float uOn; void main(){ vec3 n=NORMAL; vec2 h=vL.xz*3.0; float cell=abs(sin(h.x*3.0)*sin(h.y*3.0+h.x*1.5)); vec3 alb=vec3(0.9,0.55,0.12)*(0.7+0.3*cell);
      vec3 c=shade(alb,n,vW,0.8,1.0)+vec3(2.4,1.3,0.35)*uOn*(0.7+0.3*sin(uTime*2.5)); gl_FragColor=vec4(finish(c,vW),1.0); }`, { uniforms: { uOn: { value: 1 } } });
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.5, 6), wm); wax.position.set(x, top - 0.1, zz); scene.add(wax);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 })); glow.position.set(x, top + 1.5, zz); glow.scale.setScalar(14); scene.add(glow);
    const c = document.createElement('canvas'); c.width = 512; c.height = 160; const ctx = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, color: 0xffffff })); label.renderOrder = 20; label.position.set(x, top + 9, zz); label.scale.set(24, 7.5, 1); scene.add(label);
    z.draw = (a, b) => { ctx.clearRect(0, 0, 512, 160); ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 12;
      ctx.font = 'italic 56px Georgia, serif'; ctx.fillStyle = '#fff1d6'; ctx.fillText(a, 256, 66); ctx.font = '44px Georgia, serif'; ctx.fillStyle = '#ffc860'; ctx.fillText(b, 256, 132); tex.needsUpdate = true; };
    z.draw(z.name, `${z.cost} honey`);
    Object.assign(z, { x, z: zz, top, wax: wm, glow, label, pay: 0 });
  }
}
// dragonflies: fast hunters that patrol the pond
const dragonflies = [];
{
  const body = geoParts([
    { g: ell(0.15, 0.15, 1.9, 0, 0, -1.95, 10), c: (x, y, z) => Math.sin(z * 7) > 0.55 ? [0.04, 0.08, 0.1] : [0.08, 0.5, 0.58] },
    { g: ell(0.32, 0.3, 0.5, 0, 0, 0.1, 12), c: [0.1, 0.42, 0.32] },
    { g: ell(0.26, 0.24, 0.22, 0.2, 0.05, 0.62, 10), c: [0.3, 0.08, 0.04] }, { g: ell(0.26, 0.24, 0.22, -0.2, 0.05, 0.62, 10), c: [0.3, 0.08, 0.04] }]);
  const bm = mat(`void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW); float ir=pow(1.0-max(dot(n,V),0.0),2.0); vec3 alb=vC+vec3(0.1,0.3,0.45)*ir; gl_FragColor=vec4(finish(shade(alb,n,vW,0.9,0.1),vW),1.0); }`, { vertexColors: true });
  const wg = new THREE.CircleGeometry(1, 16); wg.scale(1.7, 0.27, 1); wg.translate(1.75, 0, 0); wg.rotateX(-Math.PI / 2);
  const wm = mat(`void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW); float v=pow(abs(sin(vL.x*14.0)*sin(vL.z*30.0)),12.0); float fr=pow(1.0-abs(dot(n,V)),2.0);
    vec3 c=vec3(0.8,0.9,1.0)*(0.3+0.7*fr+0.5*v); gl_FragColor=vec4(finish(c,vW),0.16+0.35*fr+0.3*v); }`, { transparent: true, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 2; i++) { const g = new THREE.Group(); g.add(new THREE.Mesh(body, bm)); const wings = [];
    for (const [sx, zo] of [[1, 0.28], [-1, 0.28], [1, -0.12], [-1, -0.12]]) { const w = new THREE.Mesh(wg, wm); w.position.set(0, 0.24, zo); w.scale.x = sx; g.add(w); wings.push(w); }
    g.scale.setScalar(1.3); g.visible = false; scene.add(g);
    dragonflies.push({ g, wings, p: new V3(POND.x + (i ? 20 : -20), WY + 6, POND.z), v: new V3(), state: 'patrol', t: 0, next: 0, cd: 2, tgt: new V3(POND.x, WY + 6, POND.z), face: new V3(0, 0, 1) }); }
}
// wasps: slimmer, brighter, meaner-looking cousins of the bees
const waspMat = new THREE.ShaderMaterial({ uniforms: beeMat.uniforms, vertexShader: beeMat.vertexShader, vertexColors: true,
  fragmentShader: beeMat.fragmentShader.replace('vec3(0.60,0.30,0.05)*(0.8+0.4*fz)', 'vec3(1.05,0.78,0.02)*(0.85+0.3*fz)').replace('sin(t*17.0+0.6)', 'sin(t*23.0+0.6)').replace('vec3 alb=vC*(0.8+0.45*fz);', 'vec3 alb=vC*(0.8+0.45*fz)*vec3(0.5,0.45,0.3);') });
// wasps: slim, glossy, bright yellow and deep black, narrow waist, long legs
const waspGeo = (() => {
  const blk = [0.02, 0.018, 0.015], face = [0.85, 0.68, 0.0], abd = [1.0, 0.8, 0.0], leg = [0.8, 0.6, 0.04];
  const parts = [
    { g: ell(0.13, 0.13, 0.11, 0, 0.02, 0.43, 14), c: face },
    { g: ell(0.06, 0.095, 0.07, 0.095, 0.045, 0.43, 10), c: blk }, { g: ell(0.06, 0.095, 0.07, -0.095, 0.045, 0.43, 10), c: blk },
    { g: ell(0.14, 0.14, 0.2, 0, 0.03, 0.18, 16), c: blk },
    { g: ell(0.035, 0.035, 0.09, 0, 0.0, -0.06, 8), c: blk },
    { g: ell(0.16, 0.15, 0.4, 0, -0.03, -0.5, 18), c: abd },
  ];
  for (const s of [1, -1]) {
    parts.push({ g: stick([s * 0.04, 0.1, 0.5], [s * 0.12, 0.26, 0.62], 0.01), c: blk }, { g: stick([s * 0.12, 0.26, 0.62], [s * 0.2, 0.22, 0.82], 0.008), c: blk });
    for (const [z0, z1] of [[0.26, 0.5], [0.16, 0.14], [0.06, -0.35]]) {
      parts.push({ g: stick([s * 0.09, -0.08, z0], [s * 0.32, -0.05, (z0 + z1) / 2], 0.011), c: leg }, { g: stick([s * 0.32, -0.05, (z0 + z1) / 2], [s * 0.4, -0.42, z1], 0.008), c: leg });
    }
  }
  return geoParts(parts);
})();
const waspMat2 = mat(`void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW);
  vec3 alb=vC;
  if(vC.r>0.95 && vC.b<0.02){ float t=vL.z; float band=smoothstep(0.42,0.5,fract(t*5.2+0.15))*(1.0-smoothstep(0.92,1.0,fract(t*5.2+0.15))); alb=mix(vec3(1.15,0.86,0.0),vec3(0.008,0.006,0.004),band); alb=mix(alb,vec3(0.01),smoothstep(-0.12,-0.05,vL.z)); }
  float rimv=pow(1.0-max(dot(n,V),0.0),3.0);
  vec3 c=shade(alb,n,vW,1.1,0.1)+vec3(0.9,0.8,0.5)*rimv*0.15;
  gl_FragColor=vec4(finish(c,vW),1.0); }`, { vertexColors: true });
const WASPN = 8;
const waspMesh = new THREE.InstancedMesh(waspGeo, waspMat2, WASPN); waspMesh.frustumCulled = false; scene.add(waspMesh);
const waspWings = new THREE.InstancedMesh(wingGeo, wingMat, WASPN * 2); waspWings.frustumCulled = false; scene.add(waspWings);
const wasps = [];
{
  const mh = new V3(FDIR.x * (FIELD_D + 40) - FDIR.z * 35, 0, FDIR.z * (FIELD_D + 40) + FDIR.x * 35); mh.y = terrainH(mh.x, mh.z) + 14;
  wasps.push({ home: mh, R: 38, orchard: false });
  wasps.push({ home: NEST.clone(), R: 8, orchard: true }, { home: NEST.clone(), R: 11, orchard: true }, { home: new V3(0, -500, 0), R: 0, raider: true }, { home: new V3(0, -500, 0), R: 0, raider: true });
  wasps.push({ home: new V3(0, -500, 0), R: 0, mob: true }, { home: new V3(0, -500, 0), R: 0, mob: true });
  { const H = HILLS[0]; wasps.push({ home: new V3(H.x, terrainH(H.x, H.z) + 26, H.z), R: 16, orchard: false, guard: true }); }
  for (const w of wasps) { w.p = w.home.clone(); w.v = new V3(); w.state = 'patrol'; w.t = 0; w.ph = srnd(TAU); w.q = new Q4(); w.fwd = new V3(1, 0, 0); w.buzzT = 0; }
}
// golden glow columns over flowers that are overflowing with nectar
const richGlows = [];
{
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d');
  let g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, 'rgba(255,200,90,0)'); g.addColorStop(0.5, 'rgba(255,215,120,1)'); g.addColorStop(1, 'rgba(255,200,90,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 256);
  x.globalCompositeOperation = 'destination-in'; g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.75, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,1)'); x.fillStyle = g; x.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(c);
  for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(2.2, 1.6, 0.7), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); s.scale.set(5, 46, 1); s.center.set(0.5, 0); s.visible = false; scene.add(s); richGlows.push({ s, f: null }); }
}

// ================= ROUND 3: air to ride, natural lines =================
// sun-warmed stones: rising air you can ride
const STONES = [];
{
  const H = HILLS[0], toHive = Math.atan2(-H.z, -H.x);
  const spots = [[H.x + Math.cos(toHive) * (H.r + 6), H.z + Math.sin(toHive) * (H.r + 6)],
    [ORCH.x + Math.cos(HEDGE_GAPS[0]) * (HEDGE_R + 30), ORCH.z + Math.sin(HEDGE_GAPS[0]) * (HEDGE_R + 30)],
    [FDIR.x * 120 - FDIR.z * 50, FDIR.z * 120 + FDIR.x * 50], [FDIR.x * 200 + FDIR.z * 45, FDIR.z * 200 - FDIR.x * 45], [-70, -60]];
  const warmM = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vW.xz*0.5+vW.y*0.4); vec3 alb=mix(vec3(0.42,0.34,0.27),vec3(0.78,0.66,0.52),a);
    alb=mix(alb,vec3(0.55,0.48,0.20),smoothstep(0.6,0.8,fbm(vW.xz*1.7))*0.5);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.15,0.0)+vec3(0.10,0.04,0.0)*smoothstep(0.3,1.0,n.y),vW),1.0); }`);
  for (const [x, z] of spots) {
    const gy = terrainH(x, z), g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 0.85 + 0.3 * Math.sin(p.getX(i) * 3 + p.getZ(i) * 2); p.setXYZ(i, p.getX(i) * k, Math.max(p.getY(i), -0.3) * k, p.getZ(i) * k); } g.computeVertexNormals();
    const m = new THREE.Mesh(g, warmM); m.scale.set(8, 3.2, 7); m.rotation.y = srnd(TAU); m.position.set(x, gy + 0.6, z); scene.add(m);
    STONES.push({ x, z, y: gy + 3.5, r: 9 });
  }
}
// arching stems with hanging dewdrops: a natural line from the meadow toward the tall hill
const ARCHES = [];
const dewMat = mat(`void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW); float fr=pow(1.0-max(dot(n,V),0.0),2.5);
  vec3 R=reflect(-V,n); vec3 c=hazeCol(R)*0.7*fr+vec3(0.15,0.25,0.22)*(1.0-fr)+vec3(6.0,4.6,3.0)*pow(max(dot(R,uSun),0.0),60.0);
  c+=vec3(0.5,0.9,0.7)*pow(max(dot(-V,uSun),0.0),4.0)*0.6;
  gl_FragColor=vec4(finish(c,vW),1.0); }`);
{
  const H = HILLS[0], A = new V3(FDIR.x * 135, 0, FDIR.z * 135), B = new V3(H.x + Math.cos(Math.atan2(-H.z, -H.x) + 0.5) * (H.r + 12), 0, H.z + Math.sin(Math.atan2(-H.z, -H.x) + 0.5) * (H.r + 12));
  const N = 7, stemM = simple('0.16,0.34,0.07', 0.25, 0.7), bellM = simple('0.42,0.30,0.85', 0.2, 1.0, { side: THREE.DoubleSide });
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N, px = lerp(A.x, B.x, t), pz = lerp(A.z, B.z, t), dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz);
    const sideX = -dz / L, sideZ = dx / L, wob = Math.sin(t * 7.0) * 14; const cx = px + sideX * wob, cz = pz + sideZ * wob;
    const w = srnd(4.5, 6), h = srnd(10, 14), gy = terrainH(cx, cz), pts = [];
    for (let k = 0; k <= 12; k++) { const a = Math.PI * k / 12; pts.push(new V3(cx + sideX * Math.cos(a) * w, gy - 0.5 + Math.sin(a) * h + Math.sin(a * 2) * 0.6, cz + sideZ * Math.cos(a) * w)); }
    const curve = new THREE.CatmullRomCurve3(pts); scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.32, 6), stemM));
    const top = new V3(cx, gy - 0.5 + h, cz);
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 10, 1, true), bellM); bell.position.set(cx, top.y - 1.1, cz); scene.add(bell);
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), dewMat); drop.scale.set(1, 1.25, 1); drop.position.set(cx, top.y - 2.5, cz); scene.add(drop);
    const samples = []; for (let k = 0; k <= 24; k++) samples.push(curve.getPoint(k / 24));
    ARCHES.push({ samples, drop, home: drop.position.clone(), cool: 0, cx, cz, gy, w, h });
  }
}

// ---------- first-person body ----------
const ants = [];
for (const s of [1, -1]) {
  const curve = new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(s * 0.03, 0.035, -0.06), new V3(s * 0.085, 0.03, -0.14), new V3(s * 0.13, -0.01, -0.21)]);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.0022, 6), new THREE.MeshBasicMaterial({ color: untoneHex(0x3a2412), transparent: true, depthTest: false }));
  m.position.set(s * 0.045, 0.07, -0.12); m.renderOrder = 999; camera.add(m); ants.push(m);
}
const baskets = [];
for (const s of [1, -1]) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshBasicMaterial({ color: untoneHex(0xe9b12a), transparent: true, depthTest: false })); m.position.set(s * 0.23, -0.2, -0.36); m.renderOrder = 999; m.scale.setScalar(0.001); camera.add(m); baskets.push(m); }

// ---------- audio ----------
const A = { ctx: null };
function initAudio() {
  if (A.ctx) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  try {
    const c = A.ctx = new C(); A.master = c.createGain(); A.master.gain.value = 0.9; A.master.connect(c.destination);
    const dl = c.createDelay(1); dl.delayTime.value = 0.31; const fb = c.createGain(); fb.gain.value = 0.34; const wet = c.createGain(); wet.gain.value = 0.35; dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(A.master); A.echo = dl;
    // hive hum
    A.humLP = c.createBiquadFilter(); A.humLP.type = 'lowpass'; A.humLP.frequency.value = 150; A.humG = c.createGain(); A.humG.gain.value = 0; A.pan = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
    A.humLP.connect(A.humG); A.humG.connect(A.pan); A.pan.connect(A.master);
    const trem = c.createGain(); trem.gain.value = 1; trem.connect(A.humLP); const lfo = c.createOscillator(); lfo.frequency.value = 23; const lg = c.createGain(); lg.gain.value = 0.18; lfo.connect(lg); lg.connect(trem.gain); lfo.start();
    const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.13; const lg2 = c.createGain(); lg2.gain.value = 0.2; lfo2.connect(lg2); lg2.connect(trem.gain); lfo2.start();
    A.rich = [];
    [[55, 'sawtooth', 0.5, 0], [110.4, 'sawtooth', 0.3, 0], [164.6, 'triangle', 0.3, 0], [221, 'sawtooth', 0.12, 0], [277.2, 'sine', 0.22, 1], [330.3, 'triangle', 0.16, 1], [440, 'sine', 0.1, 1], [554.4, 'sine', 0.06, 1]].forEach(([f, type, g, rich]) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f; const gg = c.createGain(); gg.gain.value = rich ? 0 : g; o.connect(gg); gg.connect(trem); o.start(); if (rich) A.rich.push({ g: gg, v: g });
    });
    // own wings
    A.buzz = c.createOscillator(); A.buzz.type = 'sawtooth'; A.buzz.frequency.value = 190; const b2 = c.createOscillator(); b2.type = 'square'; b2.frequency.value = 381; A.buzz2 = b2;
    const blp = c.createBiquadFilter(); blp.type = 'lowpass'; blp.frequency.value = 900; A.buzzG = c.createGain(); A.buzzG.gain.value = 0; const b2g = c.createGain(); b2g.gain.value = 0.3;
    A.buzz.connect(blp); b2.connect(b2g); b2g.connect(blp); blp.connect(A.buzzG); A.buzzG.connect(A.master); A.buzz.start(); b2.start();
    // noise
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; A.noise = nb;
    const ws = c.createBufferSource(); ws.buffer = nb; ws.loop = true; const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 420; wf.Q.value = 0.5; A.windG = c.createGain(); A.windG.gain.value = 0; ws.connect(wf); wf.connect(A.windG); A.windG.connect(A.master); ws.start();
  } catch (e) { A.ctx = null; }
}
function tone(f, vol = 0.12, dur = 1.6, type = 'sine', when = 0) {
  if (!A.ctx || !isFinite(f)) return; const c = A.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(A.master); g.connect(A.echo); o.start(t); o.stop(t + dur + 0.05);
  const o2 = c.createOscillator(), g2 = c.createGain(); o2.frequency.value = f * 2.76; g2.gain.setValueAtTime(vol * 0.25, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.35); o2.connect(g2); g2.connect(A.master); o2.start(t); o2.stop(t + dur);
}
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
function noiseHit(freq, q, vol, dur, type = 'bandpass', sweepTo) {
  if (!A.ctx) return; const c = A.ctx, t = c.currentTime, s = c.createBufferSource(); s.buffer = A.noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur); f.Q.value = q;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(A.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
function sweep(f0, f1, dur, vol, type = 'sine') { if (!A.ctx) return; const c = A.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + 0.05); }
const setG = (p, v, tc = 0.15) => { if (A.ctx) p.setTargetAtTime(v, A.ctx.currentTime, tc); };

// ---------- player + state ----------
const P = { pos: new V3(BIRTH.x, BIRTH.y, BIRTH.z - 0.72), vel: new V3(), yaw: Math.PI, pitch: 0, roll: 0, mode: 'title', t: 0, chews: 0, pollen: 0, wet: 0, wingsReady: false, wingT: 0, flown: false, honey: 0, knowDance: false, watch: 0, deliver: 0, lives: 1, landed: null, yawRate: 0, gulpT: 0, shownExit: false };
try { P.honey = clamp(parseFloat(localStorage.getItem('honeylight.honey')) || 0, 0, 1); } catch (e) { }
const keys = new Set(); let touchFwd = false, locked = false, dragging = false;
const hintEl = $('hint'); let hintTimer = 0;
function hint(html, secs = 6) { hintEl.innerHTML = html; hintEl.style.opacity = 1; clearTimeout(hintTimer); hintTimer = setTimeout(() => hintEl.style.opacity = 0, secs * 1000); }
function look(dx, dy) { if (P.mode === 'crawl') { P.ch = (P.ch || 0) - dx * 0.0023; P.cp = clamp((P.cp || 0) - dy * 0.0023, -0.35, 1.35); return; } P.yaw -= dx * 0.0023; P.pitch = clamp(P.pitch - dy * 0.0023, -1.56, 1.56); P.yawRate -= dx * 0.0023; }
function action() {
  if (wriggle()) return;
  if (P.mode === 'cell') chew();
  else if (P.mode === 'crawl' && P.wingsReady) takeOff();
}
function chew() {
  const per = P.lives > 1 ? 3 : 2; let left = capPieces.filter(m => m.userData.on); if (!left.length) return;
  left.sort((a, b) => a.userData.ring - b.userData.ring || Math.random() - 0.5);
  for (const m of left.slice(0, per)) { const u = m.userData; u.on = false; u.life = 1.6; u.vel.set(rnd(-0.6, 0.6), rnd(-0.2, 0.7), rnd(0.8, 1.8)); u.spin.set(rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)); }
  P.chews++; noiseHit(rnd(1800, 3200), 2, 0.22, 0.07); noiseHit(500, 1, 0.12, 0.05, 'lowpass');
  _v.set(BIRTH.x, BIRTH.y, BIRTH.z); puff(_v, 5, [0.9, 0.65, 0.25], 0.5, 0.012, 0.9, 1.5);
  if (left.length <= per) { P.mode = 'emerge'; P.t = 0; tone(392, 0.08, 2.2); tone(587.33, 0.07, 2.4, 'sine', 0.25); }
}
function takeOff() { P.tkq = camera.quaternion.clone(); P.tk = time; if (P.mode === 'crawl') { const h = P.ch || 0; _v.set(-Math.sin(h) * 0.6, Math.cos(h) * 0.6, 1).normalize(); P.yaw = Math.atan2(-_v.x, -_v.z); P.pitch = clamp(Math.asin(_v.y), -0.5, 0.5); } if (!P.flownAt) P.flownAt = time; P.mode = 'fly'; P.vel.set(0, 1.2, 1.6); sweep(120, 210, 0.5, 0.05, 'sawtooth'); if (!P.flown) { P.flown = true; hint('<kbd>W</kbd> fly &nbsp; <kbd>space</kbd> rise &nbsp; <kbd>shift</kbd> sink', 8); } }
function rebirth() { P.lives++; P.mode = 'cell'; P.t = 0; P.chews = 0; P.pollen = 0; P.load = []; P.stuck = 0; P.wet = 0; P.wingsReady = false; P.wingT = 0; P.vel.set(0, 0, 0); P.pos.set(BIRTH.x, BIRTH.y, BIRTH.z - 0.72); P.yaw = Math.PI; P.pitch = 0; resetCap(); hero.active = false; fish.userData.mouth.scale.setScalar(0.02); tone(261.6, 0.07, 3); tone(392, 0.05, 3, 'sine', 0.4); }
$('title').addEventListener('click', () => {
  initAudio(); if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
  $('title').style.opacity = 0; setTimeout(() => $('title').style.display = 'none', 1700);
  P.mode = 'cell'; P.t = 0; lockPointer();
});
function lockPointer() { try { const r = canvas.requestPointerLock && canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (e) { } }
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; });
canvas.addEventListener('mousedown', e => { if (!locked) { lockPointer(); dragging = true; if (resting) { resting = false; showKeys(); return; } } action(); });
addEventListener('mouseup', () => dragging = false);
addEventListener('mousemove', e => { if (locked || dragging) look(e.movementX || 0, e.movementY || 0); });
addEventListener('keydown', e => { if (e.repeat) return; keys.add(e.code); if (e.code === 'Space') { e.preventDefault(); action(); } });
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
{ let lx = 0, ly = 0, t0 = 0, moved = 0; canvas.addEventListener('touchstart', e => { const t = e.touches[0]; lx = t.clientX; ly = t.clientY; t0 = performance.now(); moved = 0; touchFwd = true; e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchmove', e => { const t = e.touches[0]; look((t.clientX - lx) * 1.6, (t.clientY - ly) * 1.6); moved += Math.abs(t.clientX - lx) + Math.abs(t.clientY - ly); lx = t.clientX; ly = t.clientY; e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchend', e => { if (!e.touches.length) touchFwd = false; if (performance.now() - t0 < 300 && moved < 12) action(); }); }

// ---------- collisions ----------
const PR = 0.36;
function trunkR(y) { return ROUT + Math.max(0, -1 - y) * 0.42; }
function collide(p, v) {
  if (MP) limbCollide(p, v);
  const rad = Math.hypot(p.x, p.z), dT = Math.hypot(p.y - TY, p.z);
  if (p.x > 0 && dT < TR && rad > RIN - 1.2 && rad < ROUT + 1.2) { // tunnel
    if (rad > RIN - PR && rad < ROUT + PR && dT > TR - PR) { const k = (TR - PR) / dT; p.y = TY + (p.y - TY) * k; p.z *= k; }
    return;
  }
  if (rad < (RIN + ROUT) / 2 && p.y > -1 && p.y < HTOP + 1) { // inside the hive
    if (rad > RIN - PR) { const k = (RIN - PR) / rad; p.x *= k; p.z *= k; }
    p.y = clamp(p.y, PR, HTOP - PR);
    for (const c of COMBS) {
      const dz = p.z - c.z, hz = CT / 2 + PR; if (Math.abs(dz) >= hz || Math.abs(p.x) > c.hw + PR || p.y < c.yb - PR) continue;
      if (c.holes.some(h => Math.hypot(p.x - h.x, p.y - h.y) < h.r - PR * 0.6)) continue;
      const pz = hz - Math.abs(dz), py = p.y - (c.yb - PR), px = c.hw + PR - Math.abs(p.x);
      if (pz <= py && pz <= px) { p.z = c.z + Math.sign(dz || 1) * hz; v.z *= 0.2; } else if (py <= px) { p.y = c.yb - PR; v.y = Math.min(v.y, 0); } else { p.x = Math.sign(p.x) * (c.hw + PR); }
    }
    return;
  }
  { const dx = p.x - ORCH.x, dz = p.z - ORCH.z, dO = Math.hypot(dx, dz);
    if (!G.orchard) { const lim = HEDGE_R + 6; if (dO < lim) { const k = lim / dO; p.x = ORCH.x + dx * k; p.z = ORCH.z + dz * k; const vr = (v.x * dx + v.z * dz) / dO; if (vr < 0) { v.x -= vr * dx / dO * 1.6; v.z -= vr * dz / dO * 1.6; } windHint(); } }
    else if (Math.abs(dO - HEDGE_R) < 8.5 + PR && p.y < terrainH(p.x, p.z) + 37 && !inHedgeGap(Math.atan2(dz, dx)) && !(Math.abs(Math.atan2(Math.sin(Math.atan2(dz, dx) - HEDGE_TUN), Math.cos(Math.atan2(dz, dx) - HEDGE_TUN))) < 0.06 && p.y < terrainH(p.x, p.z) + 5.5)) { const t = HEDGE_R + (dO > HEDGE_R ? 1 : -1) * (8.5 + PR), k = t / dO; p.x = ORCH.x + dx * k; p.z = ORCH.z + dz * k; } }
  zoneWalls(p, v); forestCollide(p, v); nestCollide(p, v); hollowCollide(p, v); branchCollide(p, v);
  for (const t of orchTrees) { const dx = p.x - t.x, dz = p.z - t.z, dh = Math.hypot(dx, dz); if (dh > t.cr * 1.6 + 3) continue;
    if (p.y < t.top - t.cr * 0.3 && dh < t.R + PR + 0.8) { const k = (t.R + PR + 0.8) / Math.max(dh, 0.01); p.x = t.x + dx * k; p.z = t.z + dz * k; }
    if (t.blobs) for (const b of t.blobs) { const bx = p.x - b[0], by = (p.y - b[1]) * b[3] / b[4], bz = p.z - b[2], dd = Math.hypot(bx, by, bz), rr = b[3] * 1.02 + PR; if (dd < rr) { const k = rr / Math.max(dd, 0.01); p.x = b[0] + bx * k; p.y = b[1] + by * k * b[4] / b[3]; p.z = b[2] + bz * k; v.multiplyScalar(0.7); } } }
  { const A = LOG.axis, dx = p.x - LOG.c.x, dy = p.y - LOG.c.y, dz = p.z - LOG.c.z, u = dx * A.x + dy * A.y + dz * A.z;
    if (Math.abs(u) < LOG.len / 2 + PR) { const px = dx - A.x * u, py = dy - A.y * u, pz = dz - A.z * u, r = Math.hypot(px, py, pz);
      if (r < LOG.ro + PR && r > LOG.ri - PR) { const t = r < (LOG.ri + LOG.ro) / 2 ? LOG.ri - PR : LOG.ro + PR, k = t / Math.max(r, 0.01); p.x = LOG.c.x + A.x * u + px * k; p.y = LOG.c.y + A.y * u + py * k; p.z = LOG.c.z + A.z * u + pz * k; } } }
  archCollide(p, v);
  for (const s of STONES) { const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz); if (d < 8 && p.y < s.y + 0.4 + PR) { if (d > 6.5) { const k = 8 / Math.max(d, 0.01); p.x = s.x + dx * k; p.z = s.z + dz * k; } else { p.y = s.y + 0.4 + PR; v.y = Math.max(v.y, 0); } } }
  const tr = trunkR(p.y) + PR; if (rad < tr && p.y < 92) { const k = tr / Math.max(rad, 0.01); p.x *= k; p.z *= k; }
  const gy = terrainH(p.x, p.z) + PR; if (p.y < gy) { p.y = gy; v.y = Math.max(v.y, 0); }
}

// ---------- main loop ----------
const fwd = new V3(), right = new V3(), acc = new V3(), tmp = new V3(), camPos = new V3();
let last = performance.now(), time = 0, birdT = 5, inHive = true, outF = 0, bob = 0, fov = 74, pulse = 0, heroT = 0, shownDanceHint = false;
const ui = { water: $('water'), drops: $('drops'), black: $('black') };
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); renderFrame(); adaptRes(now - (frame.prev || now)); frame.prev = now;
}
function update(dt) {
  time += dt; P.t += dt;
  U.uTime.value = time;
  camera.rotation.set(P.pitch, P.yaw, 0); viewBlend(); camera.getWorldDirection(fwd); right.set(1, 0, 0).applyQuaternion(camera.quaternion);
  let kf = (keys.has('KeyW') || keys.has('ArrowUp') || touchFwd ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0), ks = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0), ku = (keys.has('Space') ? 1 : 0) - (keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyC') ? 1 : 0);
  if (keys.has('ArrowLeft')) look(-dt * 700, 0); if (keys.has('ArrowRight')) look(dt * 700, 0);
  let black = 0, thrust = 0;
  const rad = Math.hypot(P.pos.x, P.pos.z);
  inHive = rad < ROUT && P.pos.y > -1 && P.pos.y < HTOP + 1;
  outF = lerp(outF, inHive ? 0 : smooth(ROUT, ROUT + 14, rad), Math.min(1, dt * 2));

  if (P.mode === 'title' || P.mode === 'cell') {
    P.yaw = clamp(P.yaw, Math.PI - 0.8, Math.PI + 0.8); P.pitch = clamp(P.pitch, -0.7, 0.7);
    P.pos.set(BIRTH.x, BIRTH.y + Math.sin(time * 1.1) * 0.006, BIRTH.z - 0.72 + Math.min(P.chews, 8) * 0.012);
    if (P.mode === 'cell') { if (P.t > 3 && P.chews === 0 && hintEl.style.opacity != 1) hint('<kbd>click</kbd>', 5);
      black = P.lives > 1 ? clamp(1 - P.t / 1.5, 0, 1) : 0;
      if (P.chews >= 3 && !hero.active && P.lives === 1) { hero.active = true; hero.look = new V3(BIRTH.x, BIRTH.y, BIRTH.z - 0.5); if (hero.p.distanceTo(P.pos) > 6) hero.p.set(BIRTH.x + 2, BIRTH.y + 1.5, BIRTH.z + 1.4); }
      if (hero.active) hero.tp.set(BIRTH.x + Math.sin(time * 0.9) * 0.08, BIRTH.y + 0.02 + Math.sin(time * 1.4) * 0.05, BIRTH.z + 0.62); }
  } else if (P.mode === 'emerge') {
    const f = smooth(0, 1.8, P.t); P.pos.set(BIRTH.x, BIRTH.y, lerp(BIRTH.z - 0.62, BIRTH.z + 0.24, f)); P.pos.y += Math.sin(P.t * 9) * 0.012;
    if (P.lives === 1) { hero.active = true; if (!hero.look) hero.look = new V3(); hero.tp.set(BIRTH.x + 0.9, BIRTH.y + 0.35, BIRTH.z + 1.15); hero.look.copy(P.pos); }
    if (P.t > 1.8) { P.q0 = camera.quaternion.clone(); P.mode = 'crawl'; P.t = 0; heroT = 0; P.ch = 0; P.cp = 0.2; if (P.lives === 1) hint('<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk &nbsp;·&nbsp; mouse turn &nbsp;·&nbsp; hold <kbd>Tab</kbd> for keys', 8); }
  } else if (P.mode === 'crawl') {
    const c = COMBS[BIRTH.ci];
    tmp.set(-Math.sin(P.ch || 0), Math.cos(P.ch || 0), 0); _v.set(tmp.y, -tmp.x, 0);
    const sp = 1.7; P.pos.x += (tmp.x * kf + _v.x * ks) * sp * dt; P.pos.y += (tmp.y * kf + _v.y * ks) * sp * dt;
    P.pos.x = clamp(P.pos.x, -c.hw + 0.3, c.hw - 0.3); P.pos.y = clamp(P.pos.y, c.yb + 0.4, HTOP - 0.5); P.pos.z = c.z + CT / 2 + 0.24; P.cdir.copy(tmp);
    if (kf || ks) bob += dt * 11;
    // the sister's greeting
    heroT += dt; if (hero.active) { if (heroT < 3) { if (heroT < dt * 1.5) hero.tp.copy(P.pos).addScaledVector(fwd, 0.95); hero.tp.z = clamp(hero.tp.z, c.z + 1.0, c.z + 2.0); hero.look.copy(P.pos); if (heroT > 1.2 && !hero.fed) { hero.fed = true; tone(659.25, 0.1, 2); tone(880, 0.08, 2.2, 'sine', 0.18); puff(hero.p, 8, [1, 0.8, 0.3], 0.4, 0.01, 1.2); } } else { hero.active = false; hero.fed = false; } }
    P.wingT += dt; if (!P.wingsReady && P.wingT > (P.lives > 1 ? 3 : 7)) { P.wingsReady = true; sweep(90, 200, 0.7, 0.06, 'sawtooth'); hint('<kbd>space</kbd>', 30); }
    if (P.wingsReady && touchFwd && P.wingT > 9) takeOff();
  } else if (P.mode === 'fly') {
    const maxS = lerp(5.5, 30 * G.speed * (1 + 0.4 * Math.min(1, G.boost)), outF) * (1 - 0.075 * G.weight * P.pollen), damp = lerp(2.4, kf > 0 ? 1.6 : 3.6, outF);
    acc.set(0, 0, 0).addScaledVector(fwd, kf).addScaledVector(right, ks * 0.8); acc.y += ku * 0.8; thrust = Math.min(1, acc.length());
    acc.multiplyScalar(maxS * damp); if (ku > 0) acc.y *= 1 - P.wet * 0.6;
    acc.y -= P.wet * 9 + P.pollen * 0.6 * G.weight * outF;
    G.kf = kf; G.ku = ku; abilities(dt); airForces(acc, dt); summitForces(acc, dt);
    if (P.pollen > 0) { acc.x += Math.sin(time * 2.3) * P.pollen * 0.5; acc.y += Math.sin(time * 3.1) * P.pollen * 0.45; }
    if (!inHive) { const r = Math.hypot(P.pos.x, P.pos.z); if (r > 330) { acc.x -= P.pos.x / r * (r - 330) * 0.6; acc.z -= P.pos.z / r * (r - 330) * 0.6; } if (P.pos.y > 62) acc.y -= (P.pos.y - 62) * 1.5; }
    P.vel.addScaledVector(acc, dt); P.vel.multiplyScalar(Math.max(0, 1 - damp * dt));
    if (!inHive) { const hv = Math.hypot(P.vel.x, P.vel.z), fl = Math.hypot(fwd.x, fwd.z); if (hv > 4 && kf > 0 && fl > 0.2) { const k = Math.min(1, dt * 1.6 * outF); P.vel.x += (fwd.x / fl * hv - P.vel.x) * k; P.vel.z += (fwd.z / fl * hv - P.vel.z) * k; }
      if (!ku) P.vel.y *= 1 - Math.min(1, dt * 1.2 * outF * (kf > 0 ? 1 - Math.min(1, Math.abs(fwd.y) * 1.6) : 1)); }
    P.pos.addScaledVector(P.vel, dt);
    collide(P.pos, P.vel); beeCollide();
    P.landed = null;
    if (!inHive) {
      for (const f of flowers) { const d = Math.hypot(P.pos.x - f.sx, P.pos.z - f.sz); if (flowerHit(f, d, dt) && !flowersClosed()) {
        if (f.rich > 0 && !zoneLocked(f)) richSip(f, dt); else if (f.giant) { if (f.cool <= 0 && P.pollen < G.cap) giantSip(f, dt); } else if (f.val >= 2) { if (f.cool <= 0 && P.pollen < G.cap && !zoneLocked(f)) dwellSip(f, dt); } else
        if (f.cool <= 0 && P.pollen < G.cap && !zoneLocked(f)) { f.cool = f.val >= 3 ? 70 : 25; addPollen(f); tone(SCALE[Math.min(7, P.pollen - 1)], 0.13, 2.2); _v.set(f.x, f.y + 0.6, f.z); puff(_v, 26, [1.0, 0.82, 0.25], 2.2, 0.012, 1.8, 0.6, 0.8); } } if (f.cool > 0) f.cool -= dt; }
      for (const s of shrooms) { shroomSolid(s); tmp.set(P.pos.x - s.x, (P.pos.y - s.y) / 0.7, P.pos.z - s.z); const d = tmp.length(); if (d < s.R + 0.45 && tmp.y > -0.2) { tmp.normalize(); P.pos.set(s.x + tmp.x * (s.R + 0.45), s.y + tmp.y * (s.R + 0.45) * 0.7, s.z + tmp.z * (s.R + 0.45)); P.vel.addScaledVector(tmp, 17); P.vel.y += 6; s.sq = 1; sweep(170, 420, 0.25, 0.12); sweep(420, 260, 0.5, 0.06); } s.sq = Math.max(0, s.sq - dt * 2.5); const k = 1 - Math.sin(s.sq * Math.PI) * 0.25 * s.sq; s.mesh.scale.set(s.R * (2 - k), s.R * 0.7 * k, s.R * (2 - k)); }
      // water
      const ow = overWater(P.pos.x, P.pos.z), alt = P.pos.y - WY;
      if (ow && alt < 4.5) { P.wet = Math.min(1, P.wet + dt * (1 - alt / 4.5) * 0.55); if (Math.random() < dt * 14 * (1 - alt / 4.5)) { _v.set(P.pos.x + rnd(-1, 1), WY + 0.1, P.pos.z + rnd(-1, 1)); puff(_v, 2, [0.85, 0.93, 1], 1.2, 0.012, 0.7, 6, 1.2); if (Math.random() < 0.3) tone(rnd(1400, 2600), 0.02, 0.15); } }
      else P.wet = Math.max(0, P.wet - dt * 0.14);
      if (ow && alt < PR + 0.12) {
        const pad = pads.find(p => Math.hypot(P.pos.x - p.x, P.pos.z - p.z) < p.r * 0.95);
        if (pad) { P.pos.y = WY + PR + 0.12; if (P.vel.y < -0.5 || pad.dip < 0.05) { noiseHit(300, 1, 0.12, 0.25, 'lowpass', 90); pad.dip = 1; _v.set(P.pos.x, WY + 0.1, P.pos.z); puff(_v, 8, [0.85, 0.93, 1], 1.5, 0.01, 0.6, 5, 1); } P.vel.y = Math.max(P.vel.y, 0); P.vel.x *= 1 - Math.min(1, dt * 4); P.vel.z *= 1 - Math.min(1, dt * 4); pad.dip = Math.max(pad.dip, 0.3); }
        else { P.mode = 'gulp'; P.gulpT = 0; noiseHit(900, 0.7, 0.3, 0.5, 'lowpass', 150); _v.set(P.pos.x, WY + 0.1, P.pos.z); puff(_v, 30, [0.85, 0.93, 1], 3.5, 0.016, 0.9, 7, 1.5);
          tmp.set(fwd.x, 0, fwd.z).normalize(); fish.userData.dir = tmp.clone(); fish.userData.from = P.pos.clone().addScaledVector(tmp, 30).add(new V3(-tmp.z, 0, tmp.x).multiplyScalar(16)); fish.userData.from.y = WY - 4.5; }
      }
      for (const p of pads) { p.dip = Math.max(0, p.dip - dt * 1.5); p.mesh.position.y = WY + 0.06 - Math.sin(p.dip * Math.PI) * 0.12; }
      // fish shadow drifts under you when you're low
      if (ow && alt < 14) { tmp.set(P.pos.x - fwd.x * 6, WY - 2.2 - alt * 0.25, P.pos.z - fwd.z * 6); fish.position.lerp(tmp, Math.min(1, dt * 0.5)); } else { tmp.set(POND.x + Math.cos(time * 0.1) * 20, WY - 5, POND.z + Math.sin(time * 0.1) * 20); fish.position.lerp(tmp, Math.min(1, dt * 0.3)); }
      _v.set(Math.cos(time * 0.1 + 1.6), 0, Math.sin(time * 0.1 + 1.6)); if (ow && alt < 14) _v.set(P.pos.x - fish.position.x, 0, P.pos.z - fish.position.z).normalize(); orient(_q, _v, YA); fish.quaternion.slerp(_q, Math.min(1, dt * 1.5));
    } else {
      // watching the dance
      const dd = Math.hypot(P.pos.x - (DANCE.x + DANCE.dx), P.pos.y - (DANCE.y + DANCE.dy), P.pos.z - 1.6);
      if (dd < 3.4 && !P.knowDance) { P.watch += dt / 3.5; if (P.watch >= 1) { P.knowDance = true; [0, 2, 4, 5].forEach((n, i) => tone(SCALE[n], 0.1, 2.4, 'sine', i * 0.16)); } }
      // homecoming
      if (P.pollen > 0 && P.deliver <= 0 && rad < RIN - 1) { P.deliver = 0.01; greeters.forEach(g => { g.active = true; g.look = P.pos; }); }
    }
    if (P.deliver > 0) {
      P.deliver += dt; greeters.forEach((g, i) => { g.tp.copy(P.pos).addScaledVector(fwd, 1.25).addScaledVector(right, (i - 1) * 0.75); g.tp.y += (i === 1 ? 0.28 : -0.12) + Math.sin(time * 2 + i) * 0.05; });
      if (P.deliver > 1.2 && P.pollen > 0 && P.deliver > 1.2 + (P.given || 0) * 0.45) { P.given = (P.given || 0) + 1; gainHoney(dayCount(P.load.pop() || 1)); P.pollen = P.load.length; pulse = 1; tone(SCALE[Math.min(7, P.given + 1)], 0.12, 2.5); tone(SCALE[Math.min(7, P.given + 1)] / 2, 0.06, 2.5); try { localStorage.setItem('honeylight.honey', P.honey.toFixed(3)); } catch (e) { } }
      if (P.pollen === 0 && P.deliver > 2.2 + (P.given || 0) * 0.45) { P.deliver = 0; P.given = 0; greeters.forEach(g => g.active = false); tone(523.25, 0.08, 3.5); tone(659.25, 0.08, 3.5, 'sine', 0.1); tone(783.99, 0.08, 3.5, 'sine', 0.2); }
    }
    bob += dt * 2.2;
  } else if (P.mode === 'gulp') {
    P.gulpT += dt; const g = P.gulpT, fd = fish.userData;
    P.pos.y = lerp(P.pos.y, WY - 2.6, Math.min(1, dt * 2.2)); P.pitch = lerp(P.pitch, -0.05, Math.min(1, dt * 3)); P.vel.set(0, 0, 0);
    const f = smooth(0.3, 2.5, g); tmp.copy(P.pos).addScaledVector(fd.dir, 5.9); tmp.y = P.pos.y - 0.3; fish.position.lerpVectors(fd.from, tmp, f);
    _v.copy(P.pos).sub(fish.position); _v.y *= 0.3; _v.normalize(); orient(_q, _v, YA); fish.quaternion.slerp(_q, Math.min(1, dt * 6));
    { const mo = smooth(1.5, 2.5, g); fd.mouth.scale.set(0.02 + mo * 0.62, 0.02 + mo * 0.8, 0.02 + mo * 0.6); }
    if (Math.random() < dt * 25) { _v.copy(P.pos).addScaledVector(fd.dir, rnd(0.5, 3)); _v.x += rnd(-1, 1); _v.y += rnd(-1, 0.5); puff(_v, 1, [0.8, 0.95, 1], 0.3, 0.02, 1.2, -3); }
    if (g > 2.35 && !fd.gulped) { fd.gulped = true; sweep(320, 55, 0.3, 0.3); noiseHit(200, 1, 0.2, 0.4, 'lowpass', 60); }
    black = smooth(2.3, 2.6, g);
    if (g > 3.7) { fd.gulped = false; fish.position.set(POND.x, WY - 5, POND.z); rebirth(); black = 1; }
  }

  // camera
  camPos.copy(P.pos);
  if (P.mode === 'crawl') camPos.y += Math.sin(bob) * 0.012; else if (P.mode === 'fly') camPos.y += Math.sin(bob) * 0.035;
  P.yawRate *= Math.max(0, 1 - dt * 6);
  const sv = P.vel.dot(right);
  const targetRoll = P.mode === 'fly' ? clamp(P.yawRate * 2.8 - sv * 0.03, -0.6, 0.6) + Math.sin(time * 2.6) * 0.02 * P.pollen : 0;
  P.roll = lerp(P.roll, targetRoll, Math.min(1, dt * 5));
  camera.position.copy(camPos); camera.rotation.set(P.pitch, P.yaw, P.roll); viewBlend(); camera.updateMatrixWorld(); thirdPerson(dt);
  const spd = P.vel.length(); fov = lerp(fov, 74 + Math.min(9, spd * 0.3), Math.min(1, dt * 3)); if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
  U.uCam.value.copy(camPos); sky.position.copy(camPos);
  ants.forEach((a, i) => { const s = i ? -1 : 1; a.rotation.x = Math.sin(time * 1.7 + i) * 0.05 + clamp(spd * 0.012, 0, 0.3) + (P.mode === 'cell' ? Math.sin(time * 6 + i * 2) * 0.05 : 0); a.rotation.y = s * (Math.sin(time * 1.3 + i * 2) * 0.06) + P.yawRate * 3; });
  const bs = P.pollen ? 0.5 + P.pollen * 0.22 : 0.001; baskets.forEach(b => b.scale.setScalar(lerp(b.scale.x, bs, Math.min(1, dt * 4))));

  // cap pieces
  for (const m of capPieces) { const u = m.userData; if (!u.on && u.life > 0) { u.life -= dt; u.vel.y -= 2.5 * dt; m.position.addScaledVector(u.vel, dt); m.rotation.x += u.spin.x * dt; m.rotation.y += u.spin.y * dt; if (u.life <= 0) m.visible = false; } }

  // world uniforms
  pulse = Math.max(0, pulse - dt * 0.5); combUniforms.uPulse.value = pulse;
  combUniforms.uHoney.value = lerp(combUniforms.uHoney.value, P.honey, Math.min(1, dt)); U.uGlow.value = combUniforms.uHoney.value * 0.8 + pulse * 0.3;
  streakU.uShow.value = lerp(streakU.uShow.value, P.knowDance ? 1 : 0.2 + P.watch * 0.6, Math.min(1, dt * 2));
  trailU.uShow.value = lerp(trailU.uShow.value, P.knowDance ? 1 : 0, Math.min(1, dt));
  beacon.material.opacity = lerp(beacon.material.opacity, inHive ? 0 : 0.12 + P.pollen * 0.1, Math.min(1, dt));
  fish.userData.tail.rotation.y = Math.sin(time * (P.mode === 'gulp' ? 9 : 3)) * 0.45;

  updateWind(dt); updateAirLife(dt); updateRound5(dt); updateBees(dt, time); updateWasps(dt); updateWebs(dt); updateRich(dt); updateWorld(dt); updateParts(dt); updateHud(dt);

  // overlays
  ui.water.style.opacity = camPos.y < WY && !inHive ? 0.62 : 0; ui.drops.style.opacity = P.wet * 0.9; ui.black.style.opacity = black;

  // audio
  if (A.ctx) {
    const cell = P.mode === 'cell' || P.mode === 'title';
    setG(A.humLP.frequency, cell ? 150 + P.chews * 55 : P.mode === 'gulp' ? 120 : 950, 0.3);
    tmp.set(ROUT - P.pos.x, TY - P.pos.y, -P.pos.z); const dH = tmp.length(); tmp.normalize(); const facing = tmp.dot(fwd), side = tmp.dot(right);
    const hg = inHive ? 0.2 : (0.03 + 0.012 * P.pollen) * (0.55 + 0.45 * facing) + 0.16 * 25 / (25 + dH * dH * 0.06) * 0.3;
    setG(A.humG.gain, P.mode === 'gulp' ? 0.02 : hg, 0.25); if (A.pan.pan) setG(A.pan.pan, inHive ? 0 : clamp(side, -0.9, 0.9), 0.2);
    A.rich.forEach((r, i) => setG(r.g.gain, r.v * clamp(combUniforms.uHoney.value * 6 - i * 0.6 + pulse, 0, 1), 0.6));
    const flying = P.mode === 'fly'; setG(A.buzzG.gain, flying ? 0.012 + thrust * 0.03 + Math.min(0.02, spd * 0.001) : 0, 0.12); setG(A.buzz.frequency, 185 + spd * 2.5 + thrust * 18 - P.pollen * 4 - P.wet * 25, 0.1); setG(A.buzz2.frequency, 2 * (185 + spd * 2.5 + thrust * 18 - P.pollen * 4), 0.1);
    setG(A.windG.gain, outF * (0.035 + Math.min(0.06, spd * 0.003) + 0.05 * WIND.s) * (P.mode === 'gulp' ? 0.2 : 1), 0.4);
    birdT -= dt; if (birdT < 0 && outF > 0.5 && P.mode === 'fly' && !(window.NIGHT && NIGHT.active)) { birdT = rnd(3, 9); const b = rnd(2200, 3600), n = 2 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) setTimeout(() => sweep(b * rnd(0.9, 1.1), b * rnd(1.15, 1.5), 0.09, 0.018), i * rnd(110, 160)); }
  }
}
resetCap();
// ================= GAME: progression, threats, choices =================
const G = { spent: 0, zones: {}, honey: 0, workers: 0, cap: 4, speed: 1, weight: 1, orchard: false, passive: 0, toastT: 0, richT: 12, seenRich: false, seenWasp: false, seenWeb: false, windHintT: 0 };
const UNLOCKS = [
  { at: 8, name: 'Bigger pollen baskets', desc: 'carry 6 pollen', apply: () => G.cap = 6 },
  { at: 20, name: 'The scent stones wake', desc: 'leave honey at a glowing stone and your sisters scout a new place', apply: () => { } },
  { at: 35, name: 'Strong wings', desc: 'faster flight, pollen feels lighter', apply: () => { G.speed = 1.15; G.weight = 0.55; } },
  { at: 55, name: 'Great pollen baskets', desc: 'carry 8 pollen', apply: () => G.cap = 8 },
  { at: 80, name: 'A sister flies with you', desc: 'when a wasp comes for you, she draws it away', apply: () => G.escorts = Math.max(G.escorts, 1) },
  { at: 120, name: 'Swift wings', desc: 'faster still', apply: () => G.speed = 1.27 },
  { at: 160, name: 'A second sister joins you', desc: 'two decoys against the wasps', apply: () => G.escorts = 2 },
  { at: 210, name: 'Bountiful baskets', desc: 'carry 10 pollen', apply: () => G.cap = 10 },
  { at: 250, name: 'The hive glows gold', desc: 'every comb brimming with honey', apply: () => { } },
];
P.load = [];
try { const s = JSON.parse(localStorage.getItem('honeylight.save2') || 'null'); if (s) { G.honey = s.honey | 0; G.workers = s.workers | 0; G.spent = s.spent | 0; G.zones = s.zones || (G.honey >= 20 ? { garden: true } : {}); G.daySave = s.day || null; } else { G.honey = Math.round((P.honey || 0) * 20); G.zones = G.honey >= 20 ? { garden: true } : {}; } } catch (e) { }
function save() { try { localStorage.setItem('honeylight.save2', JSON.stringify({ honey: G.honey, workers: G.workers, spent: G.spent, zones: G.zones, day: typeof DAY === 'object' && DAY ? DAY.save() : undefined })); } catch (e) { } }
addEventListener('pagehide', save); setInterval(() => { if (P.mode === 'fly' || P.mode === 'crawl') save(); }, 15000);
function applyUnlocks(announce) { for (const u of UNLOCKS) if (G.honey >= u.at && !u.done) { u.done = true; u.apply(); if (announce) { toast(`<b>${u.name}</b><br><span>${u.desc}</span>`, 6); [0, 2, 4, 7].forEach((n, i) => tone(SCALE[n], 0.1, 2.6, 'sine', i * 0.12)); } } }
for (let i = 0; i < G.workers; i++) makeForager();
applyUnlocks(false);
P.honey = Math.min(1, G.honey / 250);
const hud = $('hud'), toastEl = $('toast');
function toast(html, secs = 5) { toastEl.innerHTML = html; toastEl.style.opacity = 1; G.toastT = secs; }
function gainHoney(v) {
  G.honey += v; P.honey = Math.min(1, G.honey / 250);
  const want = Math.min(30, Math.floor(G.honey / 10));
  while (G.workers < want) { G.workers++; makeForager(); toast(`<b>A new sister hatched</b><br><span>${G.workers} worker${G.workers > 1 ? 's' : ''} now gather for the hive</span>`, 5); }
  applyUnlocks(true); save();
}
function addPollen(f) {
  const v = f.rich > 0 ? f.val * 2 : f.val; P.load.push(v); P.pollen = P.load.length;
  if (f.rich > 0) { f.rich = 0; toast('<b>Overflowing nectar!</b> worth double', 3); }
  else if (f.val >= 3) toast(`<b>${f.giant ? 'The great sunflower' : 'A sunbloom'}</b> worth ${v} honey`, 3);
  if (P.pollen >= G.cap) hint('baskets full: take it home to the hive', 4);
}
function losePollen(n) { let lost = 0; while (n-- > 0 && P.load.length) { P.load.splice((Math.random() * P.load.length) | 0, 1); lost++; } P.pollen = P.load.length; return lost; }
function nextUnlock() { return UNLOCKS.find(u => G.honey < u.at); }
let hudCache = '';
function updateHud(dt) {
  const show = P.mode !== 'title' && P.mode !== 'cell' && P.mode !== 'emerge';
  hud.style.opacity = show ? 1 : 0;
  let pips = ''; for (let i = 0; i < G.cap; i++) pips += i < P.load.length ? `<i class="on${P.load[i] > 1 ? ' gold' : ''}"></i>` : '<i></i>';
  const nu = nextUnlock(), chasing = wasps.some(w => w.state === 'chase'), coming = !chasing && wasps.some(w => w.state === 'approach' && w.t > 0 && w.p.distanceTo(P.pos) < 70);
  const html = `<div class="row"><span class="jar"></span><b>${G.honey}</b> honey <span class="dim">(${stores()} stored) · ${G.workers} sister${G.workers === 1 ? '' : 's'} foraging${G.escorts ? ` · ${G.escorts} flying with you` : ''}</span></div><div class="row pips">${pips}</div>` +
    (nu ? `<div class="row dim">next at ${nu.at}: ${nu.name.toLowerCase()}</div>` : '') + (chasing ? '<div class="row warn">a wasp is after your pollen!</div>' : coming ? '<div class="row warn">wasps are coming...</div>' : '') + (P.stuck > 0 ? '<div class="row warn">stuck in a web: tap space!</div>' : '') + (G.holdT > 0.2 && time - (G.holdF ? G.holdF.lastLand : 0) < 0.3 ? `<div class="row warn">hold on... ${'●'.repeat(Math.ceil(G.holdT / (G.holdNeed || 2.8) * 4))}${'○'.repeat(Math.max(0, 4 - Math.ceil(G.holdT / (G.holdNeed || 2.8) * 4)))}</div>` : '') + (G.dart || G.leap ? `<div class="row dim">${G.dart ? `<kbd>Q</kbd> dart ${G.dartCD <= 0 ? '●' : '○'}` : ''}${G.leap ? ` &nbsp; <kbd>E</kbd> leap ${G.leapCD <= 0 ? '●' : '○'}` : ''}</div>` : '') + (MOB.active && P.pos.distanceTo(MOB.anchor) > 12 ? '<div class="row warn">a sister needs help: follow the red glow</div>' : '') + (GIANT && GIANT.cool > 0 && Math.hypot(P.pos.x - GIANT.x, P.pos.z - GIANT.z) < 30 ? '<div class="row dim">the great sunflower is refilling</div>' : '') + (P.mode !== 'rest' ? `<div class="row ${DAY.t > 0.78 && !(window.NIGHT && NIGHT.active && NIGHT.t < 0.85) ? 'warn' : 'dim'}">day ${DAY.n} · ${timeOfDay()}</div>` : '') + (G.payZ && time - G.payLast < 0.3 ? `<div class="row warn">leaving honey for the scouts... ${'●'.repeat(Math.ceil(G.payZ.pay / 1.6 * 4))}${'○'.repeat(Math.max(0, 4 - Math.ceil(G.payZ.pay / 1.6 * 4)))}</div>` : '');
  if (html !== hudCache) { hud.innerHTML = html; hudCache = html; }
  if (G.toastT > 0) { G.toastT -= dt; if (G.toastT <= 0) toastEl.style.opacity = 0; }
}
// --- choices: nectar-rich blooms that appear, glow, and wilt
function updateRich(dt) {
  G.richT -= dt;
  for (const g of richGlows) {
    if (g.f && !(g.f.rich > 0)) { g.f.raid = false; g.f.cool = 20; g.f = null; }
    if (!g.f) { g.s.material.opacity = Math.max(0, g.s.material.opacity - dt); if (g.s.material.opacity <= 0) g.s.visible = false; continue; }
    const f = g.f; f.rich -= dt; const fr = clamp(f.rich / (f.rich0 || 30), 0, 1);
    const flick = fr < 0.3 ? (Math.random() < 0.3 + (0.3 - fr) ? 0.25 : 1) : 1;
    g.s.visible = true; g.s.material.opacity = (0.6 + 0.2 * Math.sin(time * 3)) * flick * (0.35 + 0.65 * fr); g.s.scale.set(5 * (0.45 + 0.55 * fr), 46 * (0.3 + 0.7 * fr), 1); g.s.position.set(f.sx, f.y - 0.5, f.sz);
    // golden pollen streams off downwind, faster as it runs out
    if (Math.random() < dt * (5 + 30 * (1 - fr))) { const q = parts[pNext]; _v.set(f.sx + rnd(-1.5, 1.5), f.y + rnd(0.3, 1.2), f.sz + rnd(-1.5, 1.5)); puff(_v, 1, [1.0, 0.85, 0.3], 0, 0.012, 2.2); q.g = -0.4; q.v.set(WIND.dx * (4 + 8 * WIND.s) + rnd(-1, 1), rnd(0.5, 2), WIND.dz * (4 + 8 * WIND.s) + rnd(-1, 1)); }
    if (f.rich <= 0) { _v.set(f.sx, f.y + 1, f.sz); puff(_v, 40, [1.0, 0.85, 0.3], 4, 0.014, 1.8, -0.5, 0.5); if (P.pos.distanceTo(_v) < 60) toast('<b>The golden pollen blew away</b>', 2.5); }
  }
  if (G.richT <= 0) {
    G.richT = rnd(18, 30); const slot = richGlows.find(g => !g.f);
    if (slot) { for (let k = 0; k < 30; k++) { const f = flowers[(Math.random() * flowers.length) | 0]; if (f.val > 1 || f.rich > 0 || f.cool > 0 || f.inLog) continue; if (zoneLocked(f) || f.zone || flowersClosed()) continue; const d = Math.hypot(f.x - P.pos.x, f.z - P.pos.z); if (d < 50 || d > 280) continue;
      f.rich = f.rich0 = rnd(26, 34); slot.f = f; if (!G.seenRich && P.mode === 'fly' && !inHive) { G.seenRich = true; toast('<b>A flower is overflowing with nectar</b><br><span>look for the golden glow, but it won\'t last</span>', 6); } break; } }
  }
}
// --- threats: wasps
const _wm2 = new M4(), _wt = new M4(), _wr = new M4(), _wsc = new M4(), _wv = new V3(), _wp = new V3();
function updateWasps(dt) {
  const flying = P.mode === 'fly' && !inHive;
  wasps.forEach((w, i) => {
    w.t += dt; w.buzzT -= dt;
    const d = w.p.distanceTo(P.pos), active = !w.orchard || G.orchard;
    let target, spd;
    if (w.gone > 0) { w.gone -= dt; if (w.gone > 0) { hideWasp(i, w); return; } w.p.copy(w.home); w.p.y += 12; w.v.set(0, 0, 0); w.state = 'patrol'; w.t = 0; }
    if (w.state === 'webbed') { w.webT -= dt; w.p.copy(w.webAt).addScaledVector(w.web.n, Math.sin(time * 40) * 0.08); w.p.x += Math.sin(time * 31) * 0.05;
      if (w.webT <= 0) { eatWasp(w, 'web'); hideWasp(i, w); return; } target = w.p; spd = 0; }
    if (w.state === 'dazed') { w.dazeT -= dt; const gy = terrainH(w.p.x, w.p.z) + 0.5; w.p.y = Math.max(gy, w.p.y - dt * 14); if (w.p.y <= gy + 0.01) { w.p.x += Math.sin(time * 37 + i) * 0.01; }
      if (w.dazeT <= 0) { if (w.mob) { w.state = 'flee'; w.t = 0; w.away = w.p.clone().add(new V3(rnd(-80, 80), 30, rnd(-80, 80))); } else { w.state = 'retreat'; w.t = 0; } } else { target = w.p; spd = 0; } }
    if (w.state === 'balled') { target = w.p; spd = 0; }
    if (w.raider || w.mob) { const rr = w.mob ? mobUpdate(w, d, flying, dt) : raiderUpdate(w, d, flying, dt);
      if (rr === null) { w.p.set(0, -500, 0); _v2.set(0.001, 0.001, 0.001); _wm2.compose(w.p, w.q, _v2); waspMesh.setMatrixAt(i, _wm2); waspWings.setMatrixAt(i * 2, _wm2); waspWings.setMatrixAt(i * 2 + 1, _wm2); return; }
      if (rr) { target = rr[0]; spd = rr[1]; } }
    if (target) { }
    else if (w.state === 'patrol') {
      const a = time * 0.35 + w.ph; target = _wv.set(w.home.x + Math.cos(a) * w.R, w.home.y + Math.sin(time * 0.9 + w.ph) * 4, w.home.z + Math.sin(a * 1.3) * w.R); spd = 9;
      if (w.orchard && NESTR.out && w.out) { target = _wv.set(w.out.x + Math.cos(time * 0.6 + w.ph) * 9, w.out.y + Math.sin(time * 0.9 + w.ph) * 3, w.out.z + Math.sin(time * 0.7 + w.ph) * 9); spd = 10; }
      if (active && flying && P.load.length > 0 && d < 34) { w.state = 'chase'; w.t = 0; sweep(300, 520, 0.35, 0.05, 'sawtooth'); if (!G.seenWasp) { G.seenWasp = true; toast('<b>A wasp wants your pollen!</b><br><span>heavy bees are slow: outrun it, dive into the hive, or lead it into a spider web</span>', 6); } }
    } else if (w.state === 'chase') {
      if (!w.decoy && d < 15 && tryDecoy(w)) { }
      if (w.decoy) { target = _wv.copy(w.decoy.p); spd = 21; if (w.t > 6) { w.state = 'retreat'; w.t = 0; w.decoy = null; } } else target = _wv.copy(P.pos); if (!w.decoy) spd = 23;
      if (!w.decoy && d < 1.9) {
        const n = losePollen(Math.ceil(P.load.length / 2));
        tmp.copy(P.pos).sub(w.p).normalize(); P.vel.addScaledVector(tmp, 22); P.vel.y += 7; puff(P.pos, 30, [1.0, 0.8, 0.25], 4, 0.014, 1.4, 2);
        noiseHit(700, 1.5, 0.25, 0.25); sweep(500, 180, 0.4, 0.06, 'sawtooth'); toast(n ? `<b>Stung!</b> the wasp stole ${n} pollen` : '<b>Stung!</b>', 3);
        w.state = 'retreat'; w.t = 0;
      } else if (!w.decoy && (w.t > 11 || d > 75 || !flying || P.load.length === 0)) { w.state = 'retreat'; w.t = 0; }
      if (w.raider) spd = 21;

    } else if (w.state === 'retreat') { target = w.home; spd = 14; if (w.t > 7) { w.state = 'patrol'; w.t = 0; } }
    if (!target) { target = w.p; spd = 0; }
    tmp.copy(target).sub(w.p); const L = tmp.length(); if (L > 0.01) tmp.multiplyScalar(Math.min(spd, L * 2) / L);
    w.v.lerp(tmp, Math.min(1, dt * (w.state === 'chase' ? 2.6 : 1.5)));
    _wp.copy(w.p); w.p.addScaledVector(w.v, dt); waspWebCheck(w, _wp); w.p.y += Math.sin(time * 7 + w.ph) * 0.02;
    const gy = terrainH(w.p.x, w.p.z) + 2; if (w.p.y < gy) w.p.y = gy; if (spd === 0) w.v.set(0, 0, 0);
    if (w.v.lengthSq() > 0.5) w.fwd.lerp(_v.copy(w.v).normalize(), Math.min(1, dt * 6));
    orient(w.q, w.fwd, YA); _v2.set(1.75, 1.75, 1.75);
    _wm2.compose(w.p, w.q, _v2); waspMesh.setMatrixAt(i, _wm2);
    for (let s = 0; s < 2; s++) { const sg = s ? -1 : 1, flap = Math.sin(time * 230 + i * 3) * 0.85 + 0.15;
      _wt.makeTranslation(sg * 0.09, 0.19, 0.16); _wr.makeRotationZ(sg * flap); _wt.multiply(_wr); _wr.makeRotationY(sg * 0.3); _wt.multiply(_wr); _wsc.makeScale(sg * 1.0, 1, 1.0); _wt.multiply(_wsc);
      waspWings.setMatrixAt(i * 2 + s, _wm.multiplyMatrices(_wm2, _wt)); }
  });
  waspMesh.instanceMatrix.needsUpdate = true; waspWings.instanceMatrix.needsUpdate = true;
}
// --- threats: webs (stick you in place, shake a pollen loose)
P.stuck = 0;
function updateWebs(dt) {
  for (const w of webs) { if (w.torn > 0) { w.torn -= dt; if (w.torn <= 0) w.mesh.visible = true; } }
  if (P.mode !== 'fly' || inHive) return;
  if (P.stuck > 0) {
    P.stuck -= dt * 0.6; P.vel.set(0, 0, 0); P.pos.copy(P.stuckAt).addScaledVector(P.stuckWeb.n, Math.sin(time * 30) * 0.03 * Math.min(1, P.stuck));
    P.stuckWeb.mesh.scale.setScalar(P.stuckWeb.r * (1 + Math.sin(time * 25) * 0.01));
    if (P.stuck <= 0) { const w = P.stuckWeb; w.torn = 40; w.mesh.visible = false; w.mesh.scale.setScalar(w.r); P.vel.copy(w.n).multiplyScalar(P.stuckSide * 9); P.vel.y += 3; noiseHit(2400, 3, 0.12, 0.15); puff(P.pos, 14, [0.9, 0.9, 0.85], 2, 0.008, 1); }
    return;
  }
  for (const w of webs) {
    if (w.torn > 0) continue; tmp.copy(P.pos).sub(w.c); const dn = tmp.dot(w.n);
    if (Math.abs(dn) < 0.55 && tmp.addScaledVector(w.n, -dn).length() < w.r * 0.95) {
      P.stuck = 2.6; P.stuckWeb = w; P.stuckAt = P.pos.clone(); P.stuckSide = Math.sign(dn) || 1;
      const n = losePollen(1); noiseHit(1800, 4, 0.14, 0.3); toast(n ? '<b>Caught in a web!</b> a pollen ball fell' : '<b>Caught in a web!</b>', 3);
      if (!G.seenWeb) { G.seenWeb = true; hint('tap <kbd>space</kbd> or click to wriggle free', 5); }
      break;
    }
  }
}
function wriggle() { if (P.stuck > 0) { P.stuck = Math.max(0.001, P.stuck - 0.45); /* never below zero: the next update must run the release */ noiseHit(rnd(1500, 2600), 3, 0.06, 0.06); return true; } return false; }
// --- hedge wind & passive income
function updateWorld(dt) {
  if (P.mode === 'fly' || P.mode === 'crawl') { G.passive += dt * G.workers / 120; if (G.passive >= 1) { G.passive -= 1; gainHoney(1); } }
  if (P.mode !== 'fly' || G.orchard) return;
  const dO = Math.hypot(P.pos.x - ORCH.x, P.pos.z - ORCH.z);
  if (dO < HEDGE_R + 40) {
    // the gates howl with wind until the orchard is unlocked
    for (const ga of HEDGE_GAPS) if (Math.random() < dt * 30) { const a = ga + rnd(-HEDGE_GAP_W, HEDGE_GAP_W), r = HEDGE_R + rnd(-4, 4); _v.set(ORCH.x + Math.cos(a) * r, terrainH(ORCH.x + Math.cos(a) * r, ORCH.z + Math.sin(a) * r) + rnd(2, 36), ORCH.z + Math.sin(a) * r); const q = parts[pNext]; puff(_v, 1, [0.95, 0.97, 1.0], 0, 0.02, 1.2); q.v.set(Math.cos(a) * 30, rnd(-2, 2), Math.sin(a) * 30); }
  }
}
// --- solid flowers: stems block you; the bloom is a curved cup (centre dome + upturned petals) you land on, bump under, or slide around
function bloomH(f, d) {
  const dome = d < f.r ? f.r * 0.5 * Math.sqrt(1 - (d / f.r) ** 2) : 0;
  const x = clamp((d - f.r * 0.75) / f.len, 0, 1), pet = d > f.r * 0.75 ? (x * Math.sin(f.tilt + 0.08) + 0.24 * x * x) * f.len : 0;
  return Math.max(dome, pet) + Math.abs(f.ax || 0) * d + Math.abs(f.az || 0) * d;
}
function flowerHit(f, d, dt) {
  const p = P.pos, v = P.vel, big = f.giant ? 1.5 : 0, cl = f.lily ? 0 : U.uClose.value, tE = Math.min(1.45, f.tilt + cl * 1.2), Rh = lerp(f.r * 0.75 + f.len * 0.85, f.r * 0.75 + f.len * Math.cos(tE) * 0.95 + 0.25, cl), bot = f.y - 1.4 - big, sr = 0.25 * (f.sw || 1) + PR;
  const fx = f.sx, fz = f.sz;
  if (p.y < bot) { if (d < sr) { const k = sr / Math.max(d, 0.01); p.x = fx + (p.x - fx) * k; p.z = fz + (p.z - fz) * k; } return false; }
  if (d > Rh + PR) return false;
  const top = f.y + (cl > 0.01 ? lerp(bloomH(f, Math.min(d, Rh)), f.len * (Math.sin(tE) + 0.24) + Math.abs(f.ax || 0) * d, cl) : bloomH(f, Math.min(d, Rh))) + PR + 0.15;
  const dwell = (f.val >= 2 || f.giant) && !(f.rich > 0), held = dwell && time - (f.lastLand || -9) < 0.3 && !(G.ku > 0) && !(G.kf < 0); // a bee on a rich bloom holds on: forward thrust does not pull her off
  if (p.y > top + (held ? 0.7 : 0.001)) return false;
  const pt = top - p.y, pb = p.y - bot, ps = Rh + PR - d;
  if (pt <= pb && pt <= 1.6 + big + ps) { p.y = top; v.y = Math.max(v.y, 0); v.x *= 1 - Math.min(1, dt * 5); v.z *= 1 - Math.min(1, dt * 5); P.landed = f; p.x += f.dsx; p.z += f.dsz; if (dwell && f.cool <= 0 && P.pollen < G.cap && !zoneLocked(f) && !(G.ku > 0) && !(G.kf < 0) && (held || d < Rh * 0.85)) { const k = Math.min(1, dt * 4); p.x += (fx - p.x) * k; p.z += (fz - p.z) * k; v.set(0, 0, 0); d = Math.hypot(p.x - fx, p.z - fz); } return d < Rh * 0.85; } // only the top of the bloom gives pollen
  else if (pb <= ps) { p.y = bot; v.y = Math.min(v.y, 0); }
  else { const k = (Rh + PR) / Math.max(d, 0.01); p.x = fx + (p.x - fx) * k; p.z = fz + (p.z - fz) * k; const nx = (p.x - fx) / (Rh + PR), nz = (p.z - fz) / (Rh + PR), vn = v.x * nx + v.z * nz; if (vn < 0) { v.x -= vn * nx * 1.3; v.z -= vn * nz * 1.3; } }
  return false;
}
// ---------- wind, updrafts, swaying flowers, dewdrops ----------
const WIND = { dx: 1, dz: 0, s: 0.3 }, SWAY_AMP = 2.0;
flowers.forEach(f => { f.sx = f.x; f.sz = f.z; f.dsx = 0; f.dsz = 0; });
G.boost = 0; G.chain = 0; G.chainT = 0; G.seenLift = false; G.seenDew = false;
function updateWind(dt) {
  const a = 0.6 + Math.sin(time * 0.021) * 0.9; WIND.dx = Math.cos(a); WIND.dz = Math.sin(a);
  WIND.s = 0.15 + 0.85 * smooth(0.35, 1, 0.5 + 0.5 * Math.sin(time * 0.16 + Math.sin(time * 0.047) * 3));
  U.uWind.value.set(WIND.dx * SWAY_AMP, WIND.dz * SWAY_AMP, WIND.s);
  for (const f of flowers) { if (!f.sway) continue; const ph = f.x * 0.07 + f.z * 0.05, s = Math.sin(time * 1.3 + ph) * 0.6 + Math.sin(time * 2.9 + ph * 1.7) * 0.25, k = (WIND.s * 0.55 + s * (0.35 + WIND.s * 0.4)) * f.sway;
    const nx = f.x + WIND.dx * SWAY_AMP * k, nz = f.z + WIND.dz * SWAY_AMP * k; f.dsx = nx - f.sx; f.dsz = nz - f.sz; f.sx = nx; f.sz = nz; }
}
// called from the flight code: returns extra acceleration from wind, rising air and dew rush
function airForces(acc, dt) {
  if (inHive) return;
  const gy = terrainH(P.pos.x, P.pos.z), alt = P.pos.y - gy, dO = Math.hypot(P.pos.x - ORCH.x, P.pos.z - ORCH.z);
  const shelter = P.landed ? 0 : smooth(2, 12, alt) * (dO < HEDGE_R ? 0.35 : 1);
  acc.x += WIND.dx * WIND.s * 10 * shelter; acc.z += WIND.dz * WIND.s * 10 * shelter;
  if (G.kf <= 0 && !P.landed) { let best = null, bd = 1e9; for (const f of flowers) { const d = Math.hypot(P.pos.x - f.sx, P.pos.z - f.sz), Rh = f.r * 0.75 + f.len * 0.85, h = P.pos.y - f.y; if (d < Rh && h > 0 && h < 8 && d < bd) { bd = d; best = f; } }
    if (best) { acc.x -= P.vel.x * 2.5 - best.dsx * 60; acc.z -= P.vel.z * 2.5 - best.dsz * 60; if (G.ku <= 0) acc.y -= 7; } }
  for (const s of STONES) { const d = Math.hypot(P.pos.x - s.x, P.pos.z - s.z), h = P.pos.y - s.y; if (d < s.r + 4 && h > -4 && h < 80) { acc.y += 30 * (1 - h / 80) * smooth(s.r + 4, s.r * 0.4, d); if (!G.seenLift && h > 2) { G.seenLift = true; toast('<b>Warm air rises off the sun-baked stone</b><br><span>let it carry you up</span>', 5); } } }
  // gust flecks drifting past
  if (WIND.s > 0.45 && Math.random() < dt * 40 * WIND.s * shelter) { const q = parts[pNext]; _v.set(P.pos.x + rnd(-14, 14), P.pos.y + rnd(-5, 6), P.pos.z + rnd(-14, 14)); puff(_v, 1, [0.9, 0.88, 0.78], 0, 0.006, 1.4); q.v.set(WIND.dx * 26 * WIND.s, rnd(-1, 1), WIND.dz * 26 * WIND.s); }
}
function updateAirLife(dt) {
  G.boost = Math.max(0, G.boost - dt); G.chainT -= dt; if (G.chainT <= 0) G.chain = 0;
  const near = P.mode === 'fly' && !inHive;
  for (const s of STONES) { const d = Math.hypot(camera.position.x - s.x, camera.position.z - s.z); if (d < 160 && Math.random() < dt * 12) { const q = parts[pNext]; _v.set(s.x + rnd(-6, 6), s.y + rnd(0, 3), s.z + rnd(-6, 6)); puff(_v, 1, [1.0, 0.85, 0.55], 0, 0.009, 3.5); q.v.set(rnd(-0.5, 0.5), rnd(5, 9), rnd(-0.5, 0.5)); } }
  for (const a of ARCHES) {
    if (a.cool > 0) { a.cool -= dt; a.drop.scale.setScalar(Math.min(1, Math.max(0.01, 1 - a.cool / 1.5 + 1 - 1)) ); if (a.cool <= 0) { a.drop.visible = true; a.drop.scale.set(1, 1.25, 1); } continue; }
    a.drop.position.set(a.home.x + Math.sin(time * 1.7 + a.cx) * 0.12, a.home.y + Math.sin(time * 2.3 + a.cz) * 0.06, a.home.z);
    if (near && P.pos.distanceTo(a.drop.position) < 1.9) {
      a.cool = 14; a.drop.visible = false; G.boost = 2.6; G.chain = G.chainT > 0 ? G.chain + 1 : 1; G.chainT = 4;
      tone(SCALE[Math.min(7, 2 + G.chain)], 0.11, 1.6); tone(SCALE[Math.min(7, 2 + G.chain)] * 2, 0.04, 1.2, 'sine', 0.05); puff(a.drop.position, 18, [0.75, 1.0, 0.9], 2.5, 0.01, 1.0);
      if (!G.seenDew) { G.seenDew = true; toast('<b>A sip of morning dew</b><br><span>a rush of energy. There are more under the arching stems</span>', 5); }
    }
  }
  // blossoms drifting down from the orchard canopies
  if (G.orchard && Math.hypot(camera.position.x - ORCH.x, camera.position.z - ORCH.z) < ORCH.r + 80 && Math.random() < dt * 30) {
    const t = orchTrees[(Math.random() * orchTrees.length) | 0], q = parts[pNext]; _v.set(t.x + rnd(-t.cr, t.cr), t.top + rnd(-2, 4), t.z + rnd(-t.cr, t.cr));
    puff(_v, 1, Math.random() < 0.6 ? [1.0, 0.62, 0.75] : [1.0, 0.92, 0.9], 0, 0.011, 6); q.g = 0; q.v.set(WIND.dx * 6 * WIND.s + rnd(-1, 1), -rnd(1.5, 3), WIND.dz * 6 * WIND.s + rnd(-1, 1));
  }
}
// the arches are solid stems: a swept capsule test so a fast bee can't slip through between frames
const _aPrev = new V3(), _aD1 = new V3(), _aD2 = new V3(), _aR = new V3(), _aC1 = new V3(), _aC2 = new V3(), _aN = new V3(); let _aHas = false;
function segSeg(p1, q1, p2, q2) { _aD1.subVectors(q1, p1); _aD2.subVectors(q2, p2); _aR.subVectors(p1, p2);
  const a = _aD1.dot(_aD1), e = _aD2.dot(_aD2), f = _aD2.dot(_aR); let s, t;
  if (a < 1e-8) { s = 0; t = clamp(f / e, 0, 1); } else { const c = _aD1.dot(_aR); const b = _aD1.dot(_aD2), den = a * e - b * b;
    s = den > 1e-8 ? clamp((b * f - c * e) / den, 0, 1) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); } }
  _aC1.copy(p1).addScaledVector(_aD1, s); _aC2.copy(p2).addScaledVector(_aD2, t); return _aC1.distanceTo(_aC2); }
function archCollide(p, v) {
  if (!_aHas || _aPrev.distanceTo(p) > 6) _aPrev.copy(p); _aHas = true; const r = 0.34 + PR;
  for (const a of ARCHES) { if (Math.abs(p.x - a.cx) > a.w + 4 || Math.abs(p.z - a.cz) > a.w + 4) continue;
    const S = a.samples; for (let i = 0; i < S.length - 1; i++) {
      if (segSeg(_aPrev, p, S[i], S[i + 1]) >= r) continue;
      _aN.subVectors(_aC1, _aC2); let L = _aN.length(); if (L < 1e-4) { _aN.subVectors(_aPrev, _aC2); L = _aN.length() || 1; } _aN.multiplyScalar(1 / L);
      p.copy(_aC2).addScaledVector(_aN, r + 0.01); if (v) { const vn = v.dot(_aN); if (vn < 0) v.addScaledVector(_aN, -vn * 1.3); }
    } }
  _aPrev.copy(p);
}
// ---------- third-person view (V) ----------
try { G.third = localStorage.getItem('honeylight.view') === '3'; } catch (e) { G.third = false; }
const me = newBee(1); me.s.set(0.001, 0.001, 0.001);
const _yflip = new Q4().setFromAxisAngle(YA, Math.PI);
const _meE = new THREE.Euler(0, 0, 0, 'YXZ');
me.update = () => { const on = G.third && camDist > 0.7 && P.mode !== 'title' && P.mode !== 'cell' && P.mode !== 'emerge' && P.mode !== 'gulp'; me.p.copy(P.pos); me.q.setFromEuler(_meE.set(P.pitch * 0.6, P.yaw, P.roll * 1.3)).multiply(_yflip); me.vel = P.vel; me.bank = clamp(-P.roll * 2.6, -1.2, 1.2); me.fly = P.mode === 'fly'; me.s.setScalar(on ? 1 : 0.001); ants.forEach(a => a.visible = !on); baskets.forEach(b => b.visible = !on); };
P.cdir = new V3(0, 1, 0);
{ const mu = me.update; me.update = (dt, t) => { mu(dt, t); if (P.mode === 'crawl') { orient(me.q, P.cdir, ZA); me.p.z -= 0.04; me.bank = 0; } const tg = P.pollen > 0 ? 0.5 + 0.75 * Math.min(1, P.pollen / G.cap) : 0; me.pol = lerp(me.pol || 0, tg, Math.min(1, (dt || 0) * 5)); }; }
addEventListener('keydown', e => { if (e.code === 'KeyV' && !e.repeat) { G.third = !G.third; try { localStorage.setItem('honeylight.view', G.third ? '3' : '1'); } catch (er) { } hint(G.third ? 'view from behind &nbsp; <kbd>V</kbd> to switch back' : 'bee\'s-eye view', 2.5); } });
const _cp = new V3(), _cb = new V3(), _cd = new V3(), _cz = new V3();
let camQuiet = false, camDist = 0;
function camBlocked(pt) { _cz.copy(pt); camQuiet = true; collide(_cz, _cd.set(0, 0, 0)); camQuiet = false; if (_cz.distanceToSquared(pt) > 0.0025) return true;
  for (const f of flowers) { const d = Math.hypot(pt.x - f.sx, pt.z - f.sz); if (d < f.r * 0.75 + f.len * 0.85 + 0.2 && pt.y < f.y + bloomH(f, d) + 0.25 && pt.y > f.y - 1.6) return true; } return false; }
function thirdPerson(dt) {
  if (!G.third || P.mode === 'title' || P.mode === 'cell' || P.mode === 'emerge' || P.mode === 'gulp') { camDist = 0; return; }
  const want = inHive ? 1.7 : 3.2, up = inHive ? 0.3 : 0.38;
  _cb.set(0, up, want).applyQuaternion(camera.quaternion); // behind and a little above, in view space
  if (P.mode === 'crawl') { _cb.copy(P.cdir).multiplyScalar(-1.6); _cb.z += 1.0; }
  // pull in if something solid is between the bee and the camera
  let ok = 0; const N = 10; for (let i = 1; i <= N; i++) { _cp.copy(P.pos).addScaledVector(_cb, i / N); if (camBlocked(_cp)) break; ok = i / N; }
  const target = Math.max(0.0, ok - 0.08); camDist = target < camDist ? target : lerp(camDist, target, Math.min(1, dt * 4));
  camPos.copy(P.pos).addScaledVector(_cb, camDist); camera.position.copy(camPos);
  // on the comb, look down the wax at your own back, with the comb as the floor
  if (P.mode === 'crawl' && camDist > 0.3) { camera.up.set(0, 0, 1); camera.lookAt(_cz.copy(P.pos).addScaledVector(P.cdir, 0.7)); camera.up.set(0, 1, 0); }
}
// ---------- golden-nectar raids: stay to fill up, but the wasps smell it ----------
for (const w of wasps) if (w.raider || w.mob) { w.state = 'idle'; }
function summonRaid(f, lim = 2) {
  let n = 0;
  for (const w of wasps) { if (!w.raider || w.state !== 'idle') continue; const a = rnd(TAU), r = rnd(65, 85);
    w.p.set(f.sx + Math.cos(a) * r, f.y + rnd(8, 16), f.sz + Math.sin(a) * r); w.v.set(0, 0, 0); w.state = 'approach'; w.t = -n * 2.5; w.target = f; n++; if (n >= lim) break; }
}
function richSip(f, dt) {
  if (!f.raid) { f.raid = true; f.sip = 0.5; summonRaid(f); toast('<b>The golden nectar is flowing</b><br><span>stay to fill your baskets, but wasps can smell it</span>', 4); sweep(200, 240, 1.2, 0.02, 'sawtooth'); }
  f.sip -= dt;
  if (f.sip <= 0 && P.pollen < G.cap) { f.sip = 1.05; f.rich -= 2.2; P.load.push(f.val * 2); P.pollen = P.load.length; tone(SCALE[Math.min(7, P.pollen)], 0.12, 1.8); _v.set(f.sx, f.y + 0.6, f.sz); puff(_v, 14, [1.0, 0.9, 0.4], 1.6, 0.012, 1.4, 0.6, 0.8); if (P.pollen >= G.cap) hint('baskets full: get out of there!', 3); }
}
function raiderUpdate(w, d, flying, dt) {
  // returns [target, speed] or null when parked
  if (w.state === 'idle') return null;
  if (w.state === 'approach') {
    const f = w.target; if (w.t < 0) return [w.p, 0];
    _wv.set(f.sx + Math.cos(time * 1.4 + w.ph) * 5, f.y + 2.5 + Math.sin(time * 2 + w.ph), f.sz + Math.sin(time * 1.4 + w.ph) * 5);

    if (flying && P.load.length > 0 && d < 16) { w.state = 'chase'; w.t = 0; sweep(300, 520, 0.35, 0.05, 'sawtooth'); }
    else if (w.t > 16 || !(f.rich > 0)) { w.state = 'retreat'; w.t = 0; }
    return [_wv, 15];
  }
  if (w.state === 'retreat') {
    if (!w.away) { w.away = w.p.clone().add(_v.copy(w.p).sub(P.pos).setY(0).normalize().multiplyScalar(90)); w.away.y += 35; }
    const tgt = w.away; if (w.t > 6) { w.state = 'idle'; w.away = null; }
    return [tgt, 16];
  }
  return undefined; // chase handled by the normal code
}
// ---------- round 4: the sunflower must be earned ----------
const GIANT = flowers.find(f => f.giant);
G.holdT = 0;
function summitForces(acc, dt) {
  if (!GIANT) return; const d = Math.hypot(P.pos.x - GIANT.x, P.pos.z - GIANT.z), h = P.pos.y - (GIANT.y - 22);
  if (d > 50 || h < 0) return;
  const k = smooth(50, 15, d) * smooth(0, 14, h), gust = Math.max(0, Math.sin(time * 1.15) + 0.6 * Math.sin(time * 2.9 + 1.3) + 0.2);
  const a = time * 0.55 + Math.sin(time * 0.31) * 2.0;
  acc.x += Math.cos(a) * 26 * gust * k * (P.landed ? 0.7 : 1); acc.z += Math.sin(a) * 26 * gust * k * (P.landed ? 0.7 : 1); acc.y += Math.sin(time * 3.7) * 7 * gust * k;
  if (gust * k > 0.6 && Math.random() < dt * 30) { const q = parts[pNext]; _v.set(P.pos.x + rnd(-10, 10), P.pos.y + rnd(-4, 5), P.pos.z + rnd(-10, 10)); puff(_v, 1, [0.95, 0.9, 0.75], 0, 0.006, 1.0); q.v.set(Math.cos(a) * 30, rnd(-3, 3), Math.sin(a) * 30); }
}
function giantSip(f, dt) {
  // the great sunflower makes you hold on for a few seconds while the summit winds try to blow you off
  if (time - (f.lastLand || -9) > 0.5) G.holdT = 0; f.lastLand = time; G.holdT += dt; G.holdF = f;
  if (Math.random() < dt * 6) { _v.set(f.sx + rnd(-1, 1), f.y + 1.2, f.sz + rnd(-1, 1)); puff(_v, 2, [1.0, 0.85, 0.3], 0.8, 0.01, 0.8, 0.3, 0.6); }
  G.holdNeed = 2.8; if (G.holdT >= 2.8) { G.holdT = 0; f.cool = 150; addPollen(f); }
}
// ---------- sisters who fly with you and draw wasps away ----------
G.escorts = G.escorts || 0;
const escorts = [];
function makeEscort(i) {
  const b = makeFlier(0.98); b.side = i ? -1 : 1; b.state = 'follow'; b.cool = 0; b.t = 0; b.away = new V3(); b.p.set(0, 5, 0);
  b.update = (dt) => {
    b.cool -= dt; b.t += dt;
    const out = (P.mode === 'fly' || P.mode === 'crawl') && !(i >= G.escorts);
    if (!out) { b.p.set(0, -400, 0); b.s.setScalar(0.001); b.first = true; return; }
    b.s.setScalar(0.98);
    if (b.state === 'decoy') { b.p.lerp(b.away, Math.min(1, dt * 0.9)); if (b.t > 6.5) { b.state = 'follow'; b.cool = 30; } }
    else { _v.set(b.side * 1.9, 0.7 + Math.sin(time * 2 + i) * 0.25, 1.6).applyEuler(new THREE.Euler(0, P.yaw, 0)); _v.add(P.pos); if (b.first) b.p.copy(_v); b.p.lerp(_v, Math.min(1, dt * 3.5)); }
    b.face(dt);
  };
  escorts.push(b); return b;
}
makeEscort(0); makeEscort(1);
function tryDecoy(w) {
  const e = escorts.find((b, i) => i < G.escorts && b.state === 'follow' && b.cool <= 0); if (!e) return false;
  e.state = 'decoy'; e.t = 0; _v.copy(w.p).sub(P.pos).setY(0); if (_v.lengthSq() < 0.01) _v.set(1, 0, 0); _v.normalize();
  e.away.copy(P.pos).addScaledVector(_v, -0).add(new V3(-_v.z, 0.4, _v.x).multiplyScalar(60 * (Math.random() < 0.5 ? 1 : -1))); e.away.y = Math.max(e.away.y, terrainH(e.away.x, e.away.z) + 10);
  w.decoy = e; w.t = 0; toast('<b>Your sister draws the wasp away!</b>', 3); tone(880, 0.08, 1.2); tone(1174.66, 0.06, 1.2, 'sine', 0.1); return true;
}
// ================= ROUND 5: abilities, rescues, aim shadow =================
// --- earned flying abilities: Dart (Q) and Leap (E)
G.dart = false; G.leap = false; G.abilCD = 1; G.dartCD = 0; G.leapCD = 0; G.dartT = 0; G.want = null;
UNLOCKS.push(
  { at: 30, name: 'Dart', desc: 'press Q for a sudden burst of wing strength', apply: () => G.dart = true },
  { at: 65, name: 'Leap', desc: 'press E to spring straight up', apply: () => G.leap = true },
  { at: 140, name: 'Quick recovery', desc: 'Dart and Leap come back twice as fast', apply: () => G.abilCD = 0.5 });
UNLOCKS.sort((a, b) => a.at - b.at); applyUnlocks(false);
addEventListener('keydown', e => { if (e.repeat) return; if (e.code === 'KeyQ') G.want = 'dart'; if (e.code === 'KeyE') G.want = 'leap'; });
function abilities(dt) {
  G.dartCD -= dt; G.leapCD -= dt; G.dartT -= dt;
  if (G.want === 'dart' && G.dart && G.dartCD <= 0) { G.dartCD = 6 * G.abilCD; G.dartT = 0.7; P.vel.addScaledVector(fwd, 34); sweep(260, 820, 0.35, 0.06, 'sawtooth'); noiseHit(1400, 0.8, 0.12, 0.25); _v.copy(P.pos).addScaledVector(fwd, -1.2); puff(_v, 14, [0.95, 0.9, 0.7], 3, 0.008, 0.6); }
  if (G.want === 'leap' && G.leap && G.leapCD <= 0) { G.leapCD = 7 * G.abilCD; P.vel.y = Math.max(P.vel.y, 0) + 26; sweep(180, 700, 0.4, 0.06, 'sawtooth'); _v.copy(P.pos); _v.y -= 1; puff(_v, 16, [0.95, 0.9, 0.7], 2.5, 0.008, 0.6, 0, -1); }
  G.want = null;
}
// --- rescue events: a sister mobbed by wasps
const MOB = { active: false, t: 0, next: 45, sis: makeFlier(1.0), home: false, anchor: new V3(), beat: 0 };
MOB.sis.update = (dt) => {
  const s = MOB.sis;
  if (!MOB.active && !MOB.home) { s.p.set(0, -400, 0); s.s.setScalar(0.001); s.first = true; return; }
  s.s.setScalar(1.0);
  if (MOB.home) { _v.set(0, TY, 14); s.p.lerp(_v, Math.min(1, dt * 0.35)); if (s.p.distanceTo(_v) < 3) MOB.home = false; }
  else { s.p.set(MOB.anchor.x + Math.sin(time * 11) * 0.25, MOB.anchor.y + Math.sin(time * 7.3) * 0.3, MOB.anchor.z + Math.cos(time * 9.1) * 0.25); }
  s.face(dt);
};
const mobGlow = new THREE.Sprite(richGlows[0].s.material.clone()); mobGlow.material.color = new THREE.Color(2.4, 0.9, 0.35); mobGlow.center.set(0.5, 0); mobGlow.scale.set(3, 30, 1); mobGlow.visible = false; scene.add(mobGlow);
function mobUpdate(w, d, flying, dt) {
  w.hitCool = (w.hitCool || 0) - dt;
  if (w.state === 'idle') return null;
  if (w.state === 'mob') {
    const s = MOB.sis.p; _wv.set(s.x + Math.cos(time * 3.3 + w.ph) * 2.3, s.y + Math.sin(time * 4.1 + w.ph) * 0.9, s.z + Math.sin(time * 3.3 + w.ph) * 2.3);
    if (flying && d < 2.4) {
      const sp = P.vel.length();
      if (sp > 11 || G.dartT > 0) { w.state = 'flee'; w.t = 0; _v.copy(w.p).sub(P.pos).normalize(); w.away = w.p.clone().addScaledVector(_v, 90); w.away.y += 25; w.v.copy(_v).multiplyScalar(32);
        noiseHit(500, 1.2, 0.25, 0.2, 'lowpass', 120); sweep(520, 200, 0.4, 0.05, 'sawtooth'); puff(w.p, 18, [1.0, 0.9, 0.4], 3, 0.012, 0.8); toast('<b>Bonk!</b> the wasp tumbles away', 1.5); }
      else if (w.hitCool <= 0) { w.hitCool = 2; const n = losePollen(Math.ceil(P.load.length / 2)); tmp.copy(P.pos).sub(w.p).normalize(); P.vel.addScaledVector(tmp, 18); noiseHit(700, 1.5, 0.22, 0.25); toast(`<b>Stung!</b>${n ? ` you dropped ${n} pollen.` : ''} Hit them fast`, 2.5); }
    }
    return [_wv, 18];
  }
  if (w.state === 'flee') { if (w.t > 5) { w.state = 'idle'; } return [w.away, 26]; }
  return [w.p, 0];
}
function startMob() {
  _v.set(fwd.x, 0, fwd.z); if (_v.lengthSq() < 0.01) _v.set(1, 0, 0); _v.normalize().applyAxisAngle(YA, rnd(-0.9, 0.9)).multiplyScalar(rnd(45, 70)).add(P.pos);
  if (Math.hypot(_v.x, _v.z) > 300 || overWater(_v.x, _v.z) || zoneBlocked(_v.x, _v.z)) return false;
  MOB.anchor.set(_v.x, terrainH(_v.x, _v.z) + rnd(7, 12), _v.z); MOB.active = true; MOB.t = 0; MOB.home = false; MOB.sis.p.copy(MOB.anchor);
  for (const w of wasps) if (w.mob) { w.state = 'mob'; w.t = 0; w.p.copy(MOB.anchor).add(new V3(rnd(-3, 3), rnd(-1, 2), rnd(-3, 3))); w.v.set(0, 0, 0); }
  toast('<b>A sister is in trouble!</b><br><span>wasps are mobbing her. Hit them hard and fast to drive them off</span>', 5); return true;
}
function endMob(saved) {
  MOB.active = false; MOB.home = true; MOB.next = rnd(55, 95); mobGlow.visible = false;
  if (saved) { const room = Math.max(0, G.cap - P.load.length), give = Math.min(room, 3); for (let i = 0; i < give; i++) P.load.push(2); P.pollen = P.load.length; if (give < 3) gainHoney((3 - give) * 2);
    [0, 2, 4, 7].forEach((n, i) => tone(SCALE[n], 0.1, 2.2, 'sine', i * 0.1)); puff(MOB.sis.p, 24, [1.0, 0.85, 0.3], 2, 0.012, 1.4); toast('<b>Your sister is safe!</b><br><span>she shares her pollen with you</span>', 4); }
  else { for (const w of wasps) if (w.mob && w.state === 'mob') { w.state = 'flee'; w.t = 0; w.away = w.p.clone().add(new V3(rnd(-80, 80), 30, rnd(-80, 80))); } if (P.pos.distanceTo(MOB.anchor) < 150) toast('<b>The wasps made off with her pollen</b>', 3); }
}
function updateMob(dt) {
  if (!MOB.active) { if (P.mode === 'fly' && !inHive && outF > 0.8) { MOB.next -= dt; if (MOB.next <= 0) { if (!startMob()) MOB.next = 5; } } return; }
  MOB.t += dt; const d = P.pos.distanceTo(MOB.anchor);
  mobGlow.visible = true; mobGlow.position.set(MOB.anchor.x, MOB.anchor.y + 1.5, MOB.anchor.z); mobGlow.material.opacity = 0.35 + 0.25 * Math.sin(time * 6);
  MOB.beat -= dt; if (MOB.beat <= 0 && d < 160) { MOB.beat = 0.6; sweep(rnd(900, 1100), rnd(1300, 1500), 0.15, 0.02 + 0.03 * (1 - d / 160)); }
  if (wasps.every(w => !w.mob || w.state !== 'mob')) endMob(true); else if (MOB.t > 32) endMob(false);
}
// --- soft shadow under the bee: where you'd land
const aimShadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float uA; varying vec2 vP; void main(){ float r=length(vP); gl_FragColor=vec4(0.03,0.02,0.0,uA*smoothstep(1.0,0.2,r)); }' }));
aimShadow.rotation.x = -Math.PI / 2; aimShadow.renderOrder = 5; scene.add(aimShadow);
function updateAimShadow() {
  if (P.mode !== 'fly' || inHive) { aimShadow.visible = false; return; }
  let y = terrainH(P.pos.x, P.pos.z); if (overWater(P.pos.x, P.pos.z)) y = Math.max(y, WY);
  for (const f of flowers) { const d = Math.hypot(P.pos.x - f.sx, P.pos.z - f.sz); if (d < f.r * 0.75 + f.len * 0.85 && f.y < P.pos.y) { const t = f.y + bloomH(f, d) + 0.05; if (t > y) y = t; } }
  const h = P.pos.y - y; aimShadow.visible = h < 30; aimShadow.position.set(P.pos.x, y + 0.06, P.pos.z); aimShadow.scale.setScalar(0.55 + h * 0.03); aimShadow.material.uniforms.uA.value = 0.55 * (1 - h / 30);
}
function shroomSolid(s) {
  const dx = P.pos.x - s.x, dz = P.pos.z - s.z, d = Math.hypot(dx, dz), y = P.pos.y, br = 0.45;
  const stemR = s.R * 0.28 + br;
  if (y > s.gy - 1 && y < s.y && d < stemR) { const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0; P.pos.x = s.x + nx * stemR; P.pos.z = s.z + nz * stemR; const vn = P.vel.x * nx + P.vel.z * nz; if (vn < 0) { P.vel.x -= vn * nx; P.vel.z -= vn * nz; } }
  if (d < s.R + br * 0.5 && y < s.y + 0.05 && y > s.y - 0.5 - br) { P.pos.y = s.y - 0.5 - br; if (P.vel.y > 0) P.vel.y = -P.vel.y * 0.2; }
}
// ================= ROUND 6: scouting new places, the day's light, nightfall =================
const stores = () => G.honey - (G.spent || 0);
const zoneLocked = f => (f.orch && !G.orchard) || (f.zone && !G.zones[f.zone]);
function zoneBlocked(x, z) { for (const [id, Z] of Object.entries(ZONES)) if (!G.zones[id] && Math.hypot(x - Z.c.x, z - Z.c.z) < Z.ring + 10) return true; return false; }
function zoneWalls(p, v) {
  for (const id of ['pond', 'forest']) { if (G.zones[id]) continue; const Z = ZONES[id], dx = p.x - Z.c.x, dz = p.z - Z.c.z, d = Math.hypot(dx, dz); if (d >= Z.ring) continue;
    const k = Z.ring / Math.max(d, 0.01); p.x = Z.c.x + dx * k; p.z = Z.c.z + dz * k; const vr = (v.x * dx + v.z * dz) / Math.max(d, 0.01); if (vr < 0) { v.x -= vr * dx / d * 1.6; v.z -= vr * dz / d * 1.6; }
    if (time > (G.zoneHintT || 0)) { G.zoneHintT = time + 8; toast(`<b>A stiff breeze turns you back</b><br><span>your sisters haven't scouted ${Z.lname} yet. Leave ${Z.cost} honey at the glowing stone</span>`, 5); } }
  // the scent stones themselves are solid: land on the wax
  for (const Z of Object.values(ZONES)) { const dx = p.x - Z.x, dz = p.z - Z.z, d = Math.hypot(dx, dz); if (d < 5.2 && p.y < Z.top + PR) { if (d > 4.2) { const k = 5.2 / Math.max(d, 0.01); p.x = Z.x + dx * k; p.z = Z.z + dz * k; } else { p.y = Z.top + PR; v.y = Math.max(v.y, 0); } } }
}
function forestCollide(p, v) {
  if (Math.hypot(p.x - FOREST.x, p.z - FOREST.z) > FOREST.r + 40) return;
  for (const t of forestTrees) { const dx = p.x - t.x, dz = p.z - t.z, dh = Math.hypot(dx, dz); if (dh > t.cr * 1.6 + 3) continue;
    if (p.y < t.top - t.cr * 0.3 && dh < t.R + PR + 0.8) { const k = (t.R + PR + 0.8) / Math.max(dh, 0.01); p.x = t.x + dx * k; p.z = t.z + dz * k; }
    for (const b of t.blobs) { const bx = p.x - b[0], by = (p.y - b[1]) * b[3] / b[4], bz = p.z - b[2], dd = Math.hypot(bx, by, bz), rr = b[3] * 1.02 + PR; if (dd < rr) { const k = rr / Math.max(dd, 0.01); p.x = b[0] + bx * k; p.y = b[1] + by * k * b[4] / b[3]; p.z = b[2] + bz * k; v.multiplyScalar(0.7); } } }
}
function openZone(id) {
  const Z = ZONES[id]; G.zones[id] = true; G.spent = (G.spent || 0) + Z.cost; if (id === 'garden') G.orchard = true;
  Z.draw(Z.name, 'scouted'); Z.wax.uniforms.uOn.value = 0; Z.glow.material.opacity = 0; Z.fadeT = 4;
  toast(`<b>Your sisters fly ahead to scout ${Z.lname}</b><br><span>${Z.cost} honey left at the stone. ${{ garden: 'The hedge winds settle.', pond: 'Lilies on the pads, but watch for dragonflies.', forest: 'Violets in the roots, foxgloves in the shade, webs between the trunks.' }[id]}</span>`, 7);
  [0, 2, 4, 7].forEach((n, i) => tone(SCALE[n], 0.1, 2.6, 'sine', i * 0.1)); tone(SCALE[2] * 2, 0.08, 2.6, 'sine', 0.4);
  _v.set(Z.x, Z.top + 2, Z.z); puff(_v, 40, [1.0, 0.8, 0.3], 4, 0.014, 2.2, -0.5, 1.2); save();
}
function updateZones(dt) {
  for (const [id, Z] of Object.entries(ZONES)) {
    const dc = camera.position.distanceTo(Z.label.position);
    if (Z.fadeT > 0) { Z.fadeT -= dt; Z.label.material.opacity = clamp(Z.fadeT / 2, 0, 1); Z.label.visible = Z.fadeT > 0; continue; }
    if (G.zones[id]) { Z.label.visible = false; Z.glow.visible = false; Z.wax.uniforms.uOn.value = 0; continue; }
    const can = stores() >= Z.cost; Z.label.material.opacity = clamp(1.6 - dc / 160, 0, 1); Z.glow.material.opacity = can ? 0.9 : 0.35; Z.wax.uniforms.uOn.value = can ? 1 : 0.25;
    if (P.mode !== 'fly') continue;
    const d = Math.hypot(P.pos.x - Z.x, P.pos.z - Z.z), h = P.pos.y - Z.top;
    if (d < 4.4 && h > -0.2 && h < 3) {
      if (can) { Z.pay += dt; G.payZ = Z; G.payLast = time; if (Math.random() < dt * 10) tone(SCALE[Math.min(7, Math.floor(Z.pay * 3))], 0.04, 0.4); if (Z.pay >= 1.6) { Z.pay = 0; openZone(id); } }
      else if (time > (Z.hintT || 0)) { Z.hintT = time + 6; toast(`<b>${Z.name}</b><br><span>needs ${Z.cost} honey in stores. You have ${stores()}</span>`, 4); }
    } else Z.pay = Math.max(0, Z.pay - dt * 2);
  }
}
// --- dragonflies over the pond: they hover, eye you, then strike. Dart away or keep moving
function updateDragonflies(dt) {
  const open = !!G.zones.pond, pb = P.pos;
  for (const d of dragonflies) {
    d.g.visible = open && Math.hypot(camera.position.x - POND.x, camera.position.z - POND.z) < 260; if (!open) continue;
    d.t += dt; d.cd -= dt; const dist = d.p.distanceTo(pb);
    const near = P.mode === 'fly' && P.stuck <= 0 && Math.hypot(pb.x - POND.x, pb.z - POND.z) < POND.r + 16 && pb.y < WY + 24;
    let spd = 18, tgt = d.tgt;
    if (d.state === 'patrol' && d.cd <= 0) { const prey = wasps.find(w => (w.state === 'chase' || w.state === 'webbed') && !(w.gone > 0) && w.p.y > -100 && Math.hypot(w.p.x - POND.x, w.p.z - POND.z) < POND.r + 30 && w.p.distanceTo(d.p) < 55 && !dragonflies.some(o => o.prey === w));
      if (prey) { d.state = 'hunt'; d.prey = prey; d.t = 0; noiseHit(3000, 6, 0.05, 0.2); } }
    if (d.state === 'hunt') { const w = d.prey; spd = 38; d.tgt.copy(w.p);
      if (w.gone > 0 || w.p.y < -100 || w.state === 'idle' || d.t > 6) { d.state = 'patrol'; d.prey = null; d.next = 0; }
      else if (d.p.distanceTo(w.p) < 2.6) { eatWasp(w, 'dragonfly'); d.prey = null; d.state = 'away'; d.t = 0; d.cd = 8; const a = rnd(TAU); d.tgt.set(POND.x + Math.cos(a) * POND.r * 0.5, WY + 7, POND.z + Math.sin(a) * POND.r * 0.5); } }
    else if (d.state === 'patrol') {
      if (d.t > d.next) { d.next = d.t + rnd(0.9, 2.4); const a = rnd(TAU), r = rnd(4, POND.r - 8); d.tgt.set(POND.x + Math.cos(a) * r, WY + rnd(2.5, 9), POND.z + Math.sin(a) * r); }
      if (near && dist < 28 && d.cd <= 0 && !dragonflies.some(o => o !== d && o.state !== 'patrol' && o.state !== 'away')) { d.state = 'eye'; d.t = 0; noiseHit(3000, 6, 0.05, 0.25); }
    } else if (d.state === 'eye') {
      spd = 0; d.face.copy(pb).sub(d.p);
      if (d.t > 0.75) { d.state = 'strike'; d.t = 0; d.tgt.copy(pb); noiseHit(1600, 1.5, 0.12, 0.35, 'bandpass', 4200); }
      else if (!near || dist > 36) { d.state = 'patrol'; d.t = 0; d.next = 0; }
    } else if (d.state === 'strike') {
      d.tgt.lerp(pb, Math.min(1, dt * 2.2)); spd = 36;
      if (dist < 1.9) {
        if (G.dartT > 0) { d.state = 'away'; d.t = 0; d.cd = 3; toast('<b>Dodged!</b>', 1.5); }
        else { tmp.copy(pb).sub(d.p).normalize(); P.vel.addScaledVector(tmp, 15); P.vel.y += 3; const n = losePollen(1); noiseHit(900, 1, 0.3, 0.2, 'lowpass', 200);
          toast(n ? '<b>A dragonfly struck!</b> it knocked a pollen ball loose' : '<b>A dragonfly struck!</b>', 3); d.state = 'away'; d.t = 0; d.cd = 6;
          if (!G.seenDragon) { G.seenDragon = true; hint('when a dragonfly hovers and stares, <kbd>Q</kbd> dart or swerve', 6); } }
        const a = rnd(TAU); d.tgt.set(POND.x + Math.cos(a) * POND.r * 0.6, WY + 8, POND.z + Math.sin(a) * POND.r * 0.6);
      } else if (d.t > 1.5) { d.state = 'patrol'; d.t = 0; d.next = 0; d.cd = 3; }
    } else if (d.state === 'away') { spd = 20; if (d.t > 2.5) { d.state = 'patrol'; d.t = 0; d.next = 0; } }
    tmp.copy(tgt).sub(d.p); const L = tmp.length();
    if (spd > 0 && L > 0.05) tmp.multiplyScalar(spd * Math.min(1, L / 3) / L); else tmp.set(0, 0, 0);
    d.v.lerp(tmp, Math.min(1, dt * (spd > 30 ? 4 : 7))); d.p.addScaledVector(d.v, dt); d.p.y = Math.max(d.p.y, WY + 1.2);
    if (d.state !== 'eye' && d.v.lengthSq() > 1) d.face.lerp(d.v, Math.min(1, dt * 8));
    d.g.position.copy(d.p); d.g.position.y += Math.sin(time * 3 + d.p.x) * 0.15; orient(_q, d.face, YA); d.g.quaternion.slerp(_q, Math.min(1, dt * 10));
    d.wings.forEach((w, i) => { w.rotation.z = (i % 2 ? -1 : 1) * Math.sin(time * 70 + (i < 2 ? 0 : 1.6)) * 0.45; });
    if (dist < 26 && Math.random() < dt * 7) noiseHit(rnd(2600, 3600), 5, 0.025 * (1 - dist / 26), 0.05);
  }
}
// --- the day: the sun sinks from afternoon to dusk. Stock the hive before dark
var DAY = { t: 0, n: 1, honey: 0, best: 0, streak: 0, ending: 0, LEN: 480, warned: 0, expo: 1,
  save() { return { t: +this.t.toFixed(4), n: this.n, honey: this.honey, best: this.best, streak: this.streak }; } };
if (G.daySave) { const d = G.daySave; DAY.t = clamp(+d.t || 0, 0, 0.95); DAY.n = (d.n | 0) || 1; DAY.honey = d.honey | 0; DAY.best = d.best | 0; DAY.streak = d.streak | 0; DAY.warned = DAY.t > 0.9 ? 2 : DAY.t > 0.78 ? 1 : 0; }
const _sunHi = new V3(3.05, 2.5, 1.8), _sun17 = new V3(2.9, 2.1, 1.3), _sunLo = new V3(2.3, 0.9, 0.3);
const sunEl = () => 30 - 33 * Math.pow(DAY.t, 1.25);
function applyDayLight() {
  const e = sunEl(), el = e * Math.PI / 180;
  SUN.set(Math.cos(SUN_AZ) * Math.cos(el), Math.sin(el), Math.sin(SUN_AZ) * Math.cos(el));
  const c = U.uSunC.value; if (e > 17) c.lerpVectors(_sun17, _sunHi, Math.min(1, (e - 17) / 13)); else c.lerpVectors(_sunLo, _sun17, clamp((e - 2) / 15, 0, 1));
  c.multiplyScalar(smooth(-3, 3, e));
  const dusk = smooth(9, -3, e); U.uAmb.value = 1 - 0.45 * dusk; U.uHaze.value.set(1 - 0.4 * dusk, 1 - 0.55 * dusk, 1 - 0.25 * dusk);
  U.uClose.value = smooth(0.86, 0.97, DAY.t); DAY.expo = 1 + 0.5 * dusk;
}
const flowersClosed = () => DAY.t > 0.93;
const dayFade = document.createElement('div'); dayFade.style.cssText = 'position:fixed;inset:0;background:#05040a;opacity:0;pointer-events:none;transition:opacity 1.6s ease;z-index:40;display:flex;align-items:center;justify-content:center;';
const dayCard = document.createElement('div'); dayCard.style.cssText = 'font:16px Georgia,serif;color:#f4e6c8;text-align:center;line-height:1.7;opacity:0;transition:opacity 1.2s ease;max-width:440px;padding:20px;';
dayFade.id = 'dayfade'; dayFade.appendChild(dayCard); document.body.appendChild(dayFade);
function dayCount(v) { DAY.honey += v; return v; }
function timeOfDay() { if (window.NIGHT && NIGHT.active) return NIGHT.label(); const t = DAY.t; return t < 0.35 ? 'afternoon' : t < 0.62 ? 'late afternoon' : t < 0.78 ? 'evening' : t < 0.9 ? 'the sun is low: stock the hive' : 'dusk: flowers closing, head home'; }
function updateDay(dt) {
  if (DAY.ending > 0) { dayEnd(dt); return; }
  if (P.mode === 'fly' || P.mode === 'crawl') DAY.t += dt / DAY.LEN;
  if (DAY.t > 0.78 && DAY.warned < 1) { DAY.warned = 1; toast('<b>The sun is getting low</b><br><span>stock the hive before dark</span>', 5); tone(SCALE[4], 0.06, 2.5); }
  if (DAY.t > 0.9 && DAY.warned < 2) { DAY.warned = 2; toast('<b>The flowers are closing</b><br><span>head home: night is coming</span>', 5); tone(SCALE[2], 0.06, 2.5); tone(SCALE[0], 0.05, 2.5, 'sine', 0.3); }
  if (DAY.t >= 1 && !(window.NIGHT && NIGHT.hold(dt))) DAY.ending = 1e-4; // night.js can hold the end of the day until the moon sets
  applyDayLight();
}
function dayEnd(dt) {
  const was = DAY.ending; DAY.ending += dt;
  if (was <= 1e-4) {
    dayFade.style.opacity = 1; const home = inHive; DAY.lost = home ? 0 : P.load.length;
    const h = DAY.honey; let title, bonus;
    if (h >= 40) { title = 'A golden day'; bonus = 15; DAY.streak++; } else if (h >= 22) { title = 'A great day'; bonus = 8; DAY.streak++; } else if (h >= 10) { title = 'A good day'; bonus = 3; DAY.streak = 0; } else { title = 'A quiet day'; bonus = 0; DAY.streak = 0; }
    if (DAY.streak >= 2) bonus += (DAY.streak - 1) * 2;
    const best = h > DAY.best; DAY.best = Math.max(DAY.best, h); DAY.bonus = bonus;
    dayCard.innerHTML = `<div style="font-size:14px;letter-spacing:.2em;text-transform:uppercase;opacity:.6">Night falls on day ${DAY.n}</div><div style="font-size:30px;font-style:italic;margin:6px 0 10px;color:#ffd27a">${title}</div>` +
      `<div>${h} honey stocked today${best && h > 0 ? ' · your best day yet' : ` · best ${DAY.best}`}</div>` + (bonus ? `<div>The colony is grateful: <b style="color:#ffd27a">+${bonus} honey</b></div>` : '<div style="opacity:.7">Bring home 10 or more for a good day</div>') +
      (DAY.streak >= 2 ? `<div>${DAY.streak} great days in a row</div>` : '') + (DAY.lost ? `<div style="opacity:.7">${DAY.lost} pollen left outside after dark was lost</div>` : '') + `<div style="opacity:.55;margin-top:12px;font-size:14px">sleeping in the warm hive...</div>`;
    setTimeout(() => dayCard.style.opacity = 1, 900);
    P.mode = 'rest';
  }
  if (was < 1.7 && DAY.ending >= 1.7) {
    P.pos.set(0, 12, -5.1); P.vel.set(0, 0, 0); P.load = []; P.pollen = 0; P.stuck = 0; P.yaw = -Math.PI / 2; P.pitch = 0;
    for (const f of flowers) { f.cool = 0; if (f.rich) f.rich = 0; }
    if (DAY.bonus) gainHoney(DAY.bonus);
    DAY.t = 0; DAY.n++; DAY.honey = 0; DAY.warned = 0; applyDayLight(); save();
  }
  if (DAY.ending > 1.7) { P.vel.set(0, 0, 0); }
  if (was < 7.5 && DAY.ending >= 7.5) { dayCard.style.opacity = 0; dayFade.style.opacity = 0; }
  if (DAY.ending >= 8.5) { DAY.ending = 0; P.mode = 'fly'; toast(`<b>Morning, day ${DAY.n}</b><br><span>the flowers are open and full again</span>`, 5); [0, 4, 7].forEach((n, i) => tone(SCALE[n], 0.08, 2.4, 'sine', i * 0.15)); }
}
G.seenHome = false;
function updateHome(dt) {
  const dx = -P.pos.x, dz = -P.pos.z, L = Math.hypot(dx, dz) || 1; U.uHome.value.set(dx / L, 0, dz / L);
  const tg = P.mode === 'fly' && !inHive ? (P.pollen > 0 ? 1 : 0.4) * smooth(45, 100, L) : 0; U.uHomeK.value += (tg - U.uHomeK.value) * Math.min(1, dt * 0.8);
  if (!G.seenHome && P.pollen >= G.cap && L > 120) { G.seenHome = true; hint('bees read the light in the sky: a faint shimmer stands over home', 6); }
}
function updateRound6(dt) { tipsTick(); updateHomePull(dt); updateBatch2(dt); updateHeat(dt); updateSwarm(dt); updateHome(dt); updateDay(dt); updateZones(dt); updateDragonflies(dt); updateNest(dt); updateTrails(dt); if (window.NIGHT) NIGHT.update(dt); }
applyDayLight();
G.orchard = !!G.zones.garden;
function beeCollide() {
  if (P.pos.x > RIN - 2 && Math.hypot(P.pos.y - TY, P.pos.z) < TR + 2.5 && P.pos.x < ROUT + 7) return; // sisters make way at the entrance
  for (const b of bees) { if (b === me || b.s.y < 0.05) continue; const rr = 0.4 * b.s.y + PR; const dx = P.pos.x - b.p.x, dy = P.pos.y - b.p.y, dz = P.pos.z - b.p.z;
    if (Math.abs(dx) > rr || Math.abs(dy) > rr || Math.abs(dz) > rr) continue; const d = Math.hypot(dx, dy, dz); if (d >= rr) continue;
    const nx = d > 1e-4 ? dx / d : 0, ny = d > 1e-4 ? dy / d : 1, nz = d > 1e-4 ? dz / d : 0; P.pos.set(b.p.x + nx * rr, b.p.y + ny * rr, b.p.z + nz * rr);
    const vn = P.vel.x * nx + P.vel.y * ny + P.vel.z * nz; if (vn < 0) { P.vel.x -= vn * nx * 1.3; P.vel.y -= vn * ny * 1.3; P.vel.z -= vn * nz * 1.3; } }
}
function updateRound5(dt) { updateMob(dt); updateAimShadow(); waspAudio(); updateRound6(dt); }
// --- valuable flowers make you stay: dwell time grows with value, and the wasps notice
function dwellSip(f, dt) {
  const need = f.val >= 3 ? 2.0 : 1.0;
  if (time - (f.lastLand || -9) > 0.5) { G.holdT = 0; if (f.val >= 3) summonRaid(f, 1); } f.lastLand = time; G.holdT += dt; G.holdF = f; G.holdNeed = need;
  if (Math.random() < dt * 6) { _v.set(f.sx + rnd(-0.6, 0.6), f.y + 1, f.sz + rnd(-0.6, 0.6)); puff(_v, 1, [1.0, 0.85, 0.3], 0.6, 0.009, 0.7, 0.3, 0.6); }
  if (G.holdT >= need) { G.holdT = 0; f.cool = f.val >= 3 ? 70 : 30; addPollen(f); }
}
// --- wasps sound different: a harsh, higher whine that pans and rises as they close in
const WA = { on: false };
function waspAudio() {
  if (!A.ctx || !A.master) return; const c = A.ctx;
  if (!WA.on) { // "hornet drone": two detuned saws and a sub-octave, distorted, with a rough wingbeat flutter
    WA.o1 = c.createOscillator(); WA.o1.type = 'sawtooth'; WA.o2 = c.createOscillator(); WA.o2.type = 'sawtooth'; WA.sub = c.createOscillator(); WA.sub.type = 'triangle';
    WA.mix = c.createGain(); WA.mix.gain.value = 0.5; WA.sh = c.createWaveShaper(); { const n = 1024, cv = new Float32Array(n); for (let i = 0; i < n; i++) cv[i] = Math.tanh((i / n * 2 - 1) * 3.5); WA.sh.curve = cv; }
    WA.f = c.createBiquadFilter(); WA.f.type = 'lowpass'; WA.f.frequency.value = 1400; WA.f.Q.value = 2.5;
    WA.trem = c.createGain(); WA.trem.gain.value = 0.75; WA.am = c.createOscillator(); WA.am.frequency.value = 118; WA.amg = c.createGain(); WA.amg.gain.value = 0.25; WA.am.connect(WA.amg); WA.amg.connect(WA.trem.gain);
    WA.g = c.createGain(); WA.g.gain.value = 0; [WA.o1, WA.o2, WA.sub].forEach(o => o.connect(WA.mix)); WA.mix.connect(WA.sh); WA.sh.connect(WA.f); WA.f.connect(WA.trem); WA.trem.connect(WA.g);
    WA.p = c.createStereoPanner ? c.createStereoPanner() : null; if (WA.p) { WA.g.connect(WA.p); WA.p.connect(A.master); } else WA.g.connect(A.master);
    [WA.o1, WA.o2, WA.sub, WA.am].forEach(o => o.start()); WA.on = true;
  }
  let best = null, bd = 1e9; for (const w of wasps) { if (w.state === 'idle' || w.gone > 0) continue; const d = w.p.distanceTo(camera.position); if (d < bd) { bd = d; best = w; } }
  const angry = best && (best.state === 'chase' || best.state === 'mob' || best.state === 'approach' || best.state === 'webbed'), near = best ? Math.max(0, 1 - bd / 90) : 0;
  setG(WA.g.gain, best ? near * near * (angry ? 0.14 : 0.06) : 0, 0.12);
  if (best) { _v.copy(best.p).sub(camera.position); const L = Math.max(0.01, _v.length()); _v.multiplyScalar(1 / L); const closing = -_v.dot(_v2.copy(best.v).sub(P.vel));
    const base = 175 + clamp(closing, -20, 30) * 1.6 + (angry ? 25 : 0); setG(WA.o1.frequency, base, 0.08); setG(WA.o2.frequency, base * 1.012, 0.08); setG(WA.sub.frequency, base / 2, 0.08);
    setG(WA.f.frequency, 900 + near * 1400 + (angry ? 600 : 0), 0.1);
    if (WA.p) { _v2.set(1, 0, 0).applyQuaternion(camera.quaternion); setG(WA.p.pan, clamp(_v.dot(_v2), -1, 1) * 0.9, 0.08); } }
}
function windHint() { if (camQuiet) return; if (time > G.windHintT) { G.windHintT = time + 7; toast(`<b>The hedge winds are too strong</b><br><span>leave 20 honey at the glowing stone by the gate (you have ${stores()} stored)</span>`, 4); } }
// ---------- sun shadows ----------
const shadowCam = new THREE.OrthographicCamera(-SHADOW_HALF, SHADOW_HALF, SHADOW_HALF, -SHADOW_HALF, 1, 1600);
const depthVert = `void main(){ mat4 m=modelMatrix;
  #ifdef USE_INSTANCING
    m=modelMatrix*instanceMatrix;
  #endif
  gl_Position=projectionMatrix*viewMatrix*(m*vec4(position,1.0)); }`;
const depthMat = new THREE.ShaderMaterial({ vertexShader: depthVert, fragmentShader: 'void main(){ gl_FragColor=vec4(1.0); }', side: THREE.DoubleSide });
const grassDepthMat = new THREE.ShaderMaterial({ uniforms: grassMesh.material.uniforms, vertexShader: grassMesh.material.vertexShader, fragmentShader: 'void main(){ gl_FragColor=vec4(1.0); }', side: THREE.DoubleSide });
const casters = [], hidden = [];
scene.traverse(o => {
  if (!o.isMesh && !o.isInstancedMesh) { if (o.isPoints || o.isSprite) hidden.push(o); return; }
  let p = o; while (p) { if (p === camera) { hidden.push(o); return; } p = p.parent; }
  if (o.userData.noShadow) { hidden.push(o); return; }
  if (o === sky || o.material.transparent || o.material.blending === THREE.AdditiveBlending) { hidden.push(o); return; }
  casters.push({ o, m: o.material, d: o === grassMesh ? grassDepthMat : depthMat });
});
const _shc = new V3(), _sl = new V3(), _sInv = new M4();
const sunUp = Math.abs(SUN.y) > 0.99 ? new V3(1, 0, 0) : new V3(0, 1, 0);
function renderShadows() {
  // centre the shadow box a little ahead of the camera, snapped to whole texels so edges don't shimmer
  camera.getWorldDirection(_shc); _shc.y = 0; if (_shc.lengthSq() < 1e-4) _shc.set(0, 0, -1); _shc.normalize().multiplyScalar(SHADOW_HALF * 0.55).add(camera.position);
  shadowCam.position.set(0, 0, 0); shadowCam.up.copy(sunUp); shadowCam.lookAt(-SUN.x, -SUN.y, -SUN.z); shadowCam.updateMatrixWorld();
  _sInv.copy(shadowCam.matrixWorld).invert(); _sl.copy(_shc).applyMatrix4(_sInv);
  const tex = SHADOW_HALF * 2 / SHADOW_RES; _sl.x = Math.round(_sl.x / tex) * tex; _sl.y = Math.round(_sl.y / tex) * tex; _sl.z += 700;
  _sl.applyMatrix4(shadowCam.matrixWorld); shadowCam.position.copy(_sl); shadowCam.updateMatrixWorld(); shadowCam.matrixWorldInverse.copy(shadowCam.matrixWorld).invert();
  U.uShadowM.value.multiplyMatrices(shadowCam.projectionMatrix, shadowCam.matrixWorldInverse);
  for (const h of hidden) { h.userData._v = h.visible; h.visible = false; }
  for (const c of casters) c.o.material = c.d;
  const bg = scene.background; scene.background = null;
  renderer.setRenderTarget(shadowRT); renderer.clear(); renderer.render(scene, shadowCam); renderer.setRenderTarget(null);
  scene.background = bg;
  for (const c of casters) c.o.material = c.m;
  for (const h of hidden) h.visible = h.userData._v;
  U.uShadowOn.value = 1;
}

// ---------- post: bloom, tone mapping, grade ----------
const __post = window.__post = (() => {
  const isGL2 = renderer.capabilities.isWebGL2;
  const mk = (w, h, ms) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: !!ms, samples: ms && isGL2 ? 4 : 0, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const sceneRT = mk(4, 4, true);
  const LV = 5, down = [], up = [];
  for (let i = 0; i < LV; i++) { down.push(mk(4, 4)); up.push(mk(4, 4)); }
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const quad = new THREE.Mesh(tri); quad.frustumCulled = false; const qs = new THREE.Scene(); qs.add(quad);
  const qv = 'varying vec2 vUv; void main(){ vUv=position.xy*0.5+0.5; gl_Position=vec4(position.xy,0.0,1.0); }';
  const pm = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: qv, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
  // 13-tap downsample (prefilter with soft threshold on the first level)
  const downM = pm(`uniform sampler2D tSrc; uniform vec2 uTex; uniform float uPre; varying vec2 vUv;
    vec3 S(vec2 o){ return texture2D(tSrc, vUv+o*uTex).rgb; }
    void main(){ vec3 a=S(vec2(-1,-1)),b=S(vec2(1,-1)),c=S(vec2(-1,1)),d=S(vec2(1,1)),e=S(vec2(0,0));
      vec3 f=S(vec2(-2,0)),g=S(vec2(2,0)),h=S(vec2(0,-2)),i=S(vec2(0,2)),j=S(vec2(-2,-2)),k=S(vec2(2,-2)),l=S(vec2(-2,2)),m=S(vec2(2,2));
      vec3 col=(a+b+c+d)*0.125+e*0.125+(f+g+h+i)*0.0625+(j+k+l+m)*0.03125;
      if(!(col.r==col.r && col.g==col.g && col.b==col.b) || max(col.r,max(col.g,col.b))>6e4) col=vec3(0.0); col=max(col,vec3(0.0));
      if(uPre>0.5){ col=min(col,vec3(40.0)); float br=max(col.r,max(col.g,col.b)); float th=1.5, kn=0.6;
        float s=clamp(br-th+kn,0.0,2.0*kn); s=s*s/(4.0*kn+1e-4); col*=max(s,br-th)/max(br,1e-4); }
      gl_FragColor=vec4(col,1.0); }`, { tSrc: { value: null }, uTex: { value: new THREE.Vector2() }, uPre: { value: 0 } });
  const upM = pm(`uniform sampler2D tSrc; uniform sampler2D tAdd; uniform vec2 uTex; uniform float uR; varying vec2 vUv;
    void main(){ vec2 t=uTex*uR; vec3 s=texture2D(tSrc,vUv+vec2(-t.x,-t.y)).rgb+texture2D(tSrc,vUv+vec2(t.x,-t.y)).rgb+texture2D(tSrc,vUv+vec2(-t.x,t.y)).rgb+texture2D(tSrc,vUv+vec2(t.x,t.y)).rgb;
      s=s*0.25*0.5+texture2D(tSrc,vUv).rgb*0.5;
      gl_FragColor=vec4(s+texture2D(tAdd,vUv).rgb,1.0); }`, { tSrc: { value: null }, tAdd: { value: null }, uTex: { value: new THREE.Vector2() }, uR: { value: 1 } });
  const finalM = pm(`uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uBloom; uniform float uExpo; uniform float uTime; uniform float uWarm; varying vec2 vUv;
    vec3 aces(vec3 c){ return (c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14); }
    void main(){
      vec3 c=texture2D(tScene,vUv).rgb; vec3 b=texture2D(tBloom,vUv).rgb;
      if(!(c.r==c.r && c.g==c.g && c.b==c.b) || max(c.r,max(c.g,c.b))>6e4) c=vec3(0.0); if(!(b.r==b.r && b.g==b.g && b.b==b.b) || max(b.r,max(b.g,b.b))>6e4) b=vec3(0.0);
      c=max(c,vec3(0.0)); b=max(b,vec3(0.0));
      c=c+b*uBloom;
      c*=uExpo;
      // golden-hour grade: warm highlights, slightly cool shadows, a touch more saturation
      float l=dot(c,vec3(0.2126,0.7152,0.0722));
      c=mix(vec3(l),c,1.08);
      vec3 warm=vec3(1.06,1.0,0.90), cool=vec3(0.94,0.99,1.06);
      c*=mix(cool, warm, smoothstep(0.02,0.6,l)*uWarm + (1.0-uWarm)*0.5);
      c=clamp(aces(max(c,0.0)),0.0,1.0);
      c=pow(c,vec3(0.4545));
      c=c*0.985+0.01*vec3(1.0,0.88,0.7)*(1.0-c); // lifted, creamy blacks
      float n=fract(sin(dot(vUv*vec2(913.1,577.7)+fract(uTime)*17.0,vec2(12.9898,78.233)))*43758.5453);
      c+=(n-0.5)/255.0*1.5;
      gl_FragColor=vec4(c,1.0); }`, { tScene: { value: null }, tBloom: { value: null }, uBloom: { value: 0.22 }, uExpo: { value: 1.0 }, uTime: U.uTime, uWarm: { value: 1 } });
  function pass(m, target) { quad.material = m; renderer.setRenderTarget(target); renderer.render(qs, quadCam); }
  function resize() {
    const pr = renderer.getPixelRatio(), w = Math.max(4, Math.floor(innerWidth * pr)), h = Math.max(4, Math.floor(innerHeight * pr));
    sceneRT.setSize(w, h);
    let bw = w >> 1, bh = h >> 1;
    for (let i = 0; i < LV; i++) { down[i].setSize(Math.max(2, bw), Math.max(2, bh)); up[i].setSize(Math.max(2, bw), Math.max(2, bh)); bw >>= 1; bh >>= 1; }
  }
  resize();
  function render() {
    renderer.setRenderTarget(sceneRT); renderer.render(scene, camera);
    let src = sceneRT.texture, sw = sceneRT.width, sh = sceneRT.height;
    for (let i = 0; i < LV; i++) {
      downM.uniforms.tSrc.value = src; downM.uniforms.uTex.value.set(1 / sw, 1 / sh); downM.uniforms.uPre.value = i === 0 ? 1 : 0;
      pass(downM, down[i]); src = down[i].texture; sw = down[i].width; sh = down[i].height;
    }
    let acc = down[LV - 1].texture;
    for (let i = LV - 2; i >= 0; i--) {
      upM.uniforms.tSrc.value = acc; upM.uniforms.tAdd.value = down[i].texture; upM.uniforms.uTex.value.set(1 / down[i + 1].width, 1 / down[i + 1].height); upM.uniforms.uR.value = 1.0;
      pass(upM, up[i]); acc = up[i].texture;
    }
    finalM.uniforms.tScene.value = sceneRT.texture; finalM.uniforms.tBloom.value = acc;
    pass(finalM, null);
  }
  return { render, resize, finalM };
})();
let shadowFrame = 0;
function renderFrame() {
  const rad = Math.hypot(camera.position.x, camera.position.z);
  // deep inside the hive the sun can't reach: skip the shadow pass there
  if (!(rad < RIN - 1.5 && camera.position.y > -1 && camera.position.y < HTOP) || !U.uShadowOn.value) renderShadows();
  // exposure: the hive is a cosy cave, outside is bright evening
  const ex = __post.finalM.uniforms.uExpo; ex.value = lerp(ex.value, inHive ? 1.0 : 0.92 * DAY.expo, 0.05);
  __post.render();
}
// keep the frame rate smooth on laptops: drop render resolution if frames run long, recover when there's headroom
const perf = { acc: 0, n: 0, good: 0 };
function adaptRes(ms) {
  if (!(ms > 0) || ms > 250) return; perf.acc += ms; perf.n++;
  if (perf.n < 45) return; const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0;
  if (avg > 21 && resScale > 0.55) { resScale = Math.max(0.55, resScale - 0.12); resize(); perf.good = 0; }
  else if (avg < 17.5 && resScale < 1) { if (++perf.good >= 3) { resScale = Math.min(1, resScale + 0.08); resize(); perf.good = 0; } }
  else perf.good = 0;
}

requestAnimationFrame(frame);
// ---------- batch 1: nectar trails, the nest raid, luring wasps ----------
function hideWasp(i, w) { w.p.set(0, -500, 0); _v2.set(0.001, 0.001, 0.001); _wm2.compose(w.p, w.q, _v2); waspMesh.setMatrixAt(i, _wm2); waspWings.setMatrixAt(i * 2, _wm2); waspWings.setMatrixAt(i * 2 + 1, _wm2); }
G.revenge = 0; G.raids = 0; G.trails = 0;
function eatWasp(w, by) {
  const near = P.pos.distanceTo(w.p) < 120;
  _v.copy(w.p); puff(_v, 22, [0.9, 0.85, 0.6], 3, 0.01, 1.0); puff(_v, 10, [1.0, 0.8, 0.2], 2, 0.012, 0.8);
  if (w.raider) { w.state = 'idle'; w.away = null; } else { w.state = 'gone'; w.gone = rnd(45, 60); }
  w.webbed = 0; w.decoy = null; G.revenge++;
  if (near) { gainHoney(2); noiseHit(by === 'web' ? 2200 : 900, 2, 0.18, 0.3); [7, 4, 2].forEach((n, k) => tone(SCALE[n] * 0.5, 0.06, 0.8, 'triangle', k * 0.08));
    toast(by === 'web' ? '<b>The spider got it!</b><br><span>one less wasp. +2 honey</span>' : by === 'ball' ? '<b>The wasp is done for</b><br><span>your sisters cooked it. +2 honey</span>' : '<b>Snatched!</b><br><span>a dragonfly ate the wasp. +2 honey</span>', 3); }
}
function waspWebCheck(w, prev) {
  if (w.state !== 'chase' || w.decoy) return;
  for (const wb of webs) {
    if (wb.torn > 0 || P.stuckWeb === wb && P.stuck > 0) continue;
    const d0 = _v.copy(prev).sub(wb.c).dot(wb.n), d1 = _v.copy(w.p).sub(wb.c).dot(wb.n);
    if (!(d0 * d1 <= 0 || Math.abs(d1) < 0.9)) continue;
    if (_v.addScaledVector(wb.n, -d1).length() > wb.r * 0.9) continue;
    w.state = 'webbed'; w.webT = 4.5; w.web = wb; w.webAt = w.p.clone().addScaledVector(wb.n, -d1); w.v.set(0, 0, 0);
    if (P.pos.distanceTo(w.p) < 90) { noiseHit(1800, 4, 0.16, 0.35); toast('<b>The wasp flew into a web!</b>', 2.5); if (!G.seenLure) { G.seenLure = true; hint('wasps chasing you can blunder into webs. Dragonflies hunt them too', 6); } }
    return;
  }
}
// --- the wasp nest: when its guards are out, slip under it and take the stolen honey back
const NESTR = { out: false, t: 40, cd: 0, hold: 0, quiet: false, E: NEST.clone().add(new V3(0, -4.8, 0)) };
const nestGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: richGlows[0].s.material.map, color: new THREE.Color(2.0, 1.3, 0.45), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
nestGlow.scale.set(5, 9, 1); nestGlow.center.set(0.5, 0.15); nestGlow.position.copy(NESTR.E); nestGlow.visible = false; scene.add(nestGlow);
function nestGuards() { let n = 0; for (const w of wasps) if (w.orchard && !(w.gone > 0) && w.state !== 'webbed' && w.p.distanceTo(NEST) < 18) n++; return n; }
function nestCollide(p, v) {
  const a = 2.8 + PR, b = 3.8 + PR, dx = (p.x - NEST.x) / a, dy = (p.y - NEST.y) / b, dz = (p.z - NEST.z) / a, r = Math.hypot(dx, dy, dz);
  if (r >= 1 || r < 1e-4) return; p.set(NEST.x + dx / r * a, NEST.y + dy / r * b, NEST.z + dz / r * a);
  _v.set(dx, dy, dz).normalize(); const vn = v.dot(_v); if (vn < 0) v.addScaledVector(_v, -vn);
}
function updateNest(dt) {
  if (!G.orchard) { nestGlow.visible = false; return; }
  NESTR.t -= dt; NESTR.cd -= dt;
  if (NESTR.t <= 0) { NESTR.out = !NESTR.out; NESTR.t = NESTR.out ? rnd(24, 32) : rnd(30, 45);
    if (NESTR.out) for (const w of wasps) if (w.orchard) { const a = rnd(TAU), r = rnd(35, HEDGE_R - 22), x = ORCH.x + Math.cos(a) * r, z = ORCH.z + Math.sin(a) * r; w.out = new V3(x, terrainH(x, z) + rnd(8, 16), z); } }
  const guards = nestGuards(), quiet = guards === 0 && NESTR.cd <= 0, dC = camera.position.distanceTo(NEST);
  nestGlow.visible = dC < 260; nestGlow.material.opacity += ((quiet ? 0.55 + 0.15 * Math.sin(time * 3) : 0) - nestGlow.material.opacity) * Math.min(1, dt * 2);
  if (quiet && dC < 160 && Math.random() < dt * 4) { _v.set(NEST.x + rnd(-0.8, 0.8), NEST.y - 3.6, NEST.z + rnd(-0.8, 0.8)); puff(_v, 1, [1.0, 0.65, 0.15], 0.2, 0.02, 1.6, 9); }
  if (quiet && !NESTR.quiet && P.mode === 'fly' && P.pos.distanceTo(NEST) < 75) {
    toast(G.raids ? '<b>The nest is unguarded again</b>' : '<b>The wasp nest is unguarded</b><br><span>it\'s full of honey they stole. Slip underneath and take it back</span>', G.raids ? 2.5 : 6); }
  NESTR.quiet = quiet;
  const dE = P.pos.distanceTo(NESTR.E);
  if (P.mode === 'fly' && !inHive && dE < 3.8 && NESTR.cd <= 0) {
    if (guards > 0) { NESTR.hold = 0; if (time > (NESTR.hintT || 0)) { NESTR.hintT = time + 5; toast('<b>Wasps are home</b><br><span>wait for them to fly out, or lead them away</span>', 3); } }
    else { NESTR.hold += dt; if (Math.random() < dt * 8) { tone(SCALE[Math.min(7, Math.floor(NESTR.hold * 3))], 0.05, 0.5); puff(NESTR.E, 2, [1.0, 0.7, 0.2], 1, 0.014, 0.9, -1); }
      if (NESTR.hold >= 2.2) raidNest(); }
  } else NESTR.hold = Math.max(0, NESTR.hold - dt * 2);
}
function raidNest() {
  NESTR.hold = 0; NESTR.cd = 180; G.raids++;
  const give = Math.min(3, Math.max(0, G.cap - P.load.length)); for (let i = 0; i < give; i++) P.load.push(4); P.pollen = P.load.length;
  gainHoney(6 + (3 - give) * 4);
  puff(NESTR.E, 40, [1.0, 0.7, 0.2], 4, 0.016, 1.4, 3); [0, 2, 4, 7].forEach((n, k) => tone(SCALE[n], 0.1, 1.6, 'sine', k * 0.07));
  sweep(260, 620, 0.6, 0.07, 'sawtooth'); noiseHit(500, 1, 0.2, 0.5, 'lowpass', 160);
  for (const w of wasps) if (w.orchard && !(w.gone > 0)) { w.state = 'chase'; w.t = -8; w.decoy = null; }
  toast(`<b>You took the honey back!</b><br><span>${give ? `${give} heavy balls of stolen honey. ` : ''}The nest is furious. Fly!</span>`, 4);
}
// --- nectar trails: a sweet scent drifts through a gap in the world. Follow it fast, before it fades behind you
const TRAILN = 200, trPos = new Float32Array(TRAILN * 3), trA = new Float32Array(TRAILN), trS = new Float32Array(TRAILN);
const trGeo = new THREE.BufferGeometry(); trGeo.setAttribute('position', new THREE.BufferAttribute(trPos, 3)); trGeo.setAttribute('aA', new THREE.BufferAttribute(trA, 1)); trGeo.setAttribute('aS', new THREE.BufferAttribute(trS, 1));
const trPts = new THREE.Points(trGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `attribute float aA; attribute float aS; varying float vA; void main(){ vec4 mv=viewMatrix*vec4(position,1.0); vA=aA; gl_PointSize=clamp(aS*500.0/max(-mv.z,0.1),7.0,80.0); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: UNTONE + `varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float core=smoothstep(0.22,0.0,d), halo=smoothstep(0.5,0.0,d); float a=core*1.4+halo*halo*0.6; gl_FragColor=vec4(untone(vec3(1.0,0.78,0.3))*2.4*a*vA,1.0); }` }));
trPts.frustumCulled = false; trPts.visible = false; scene.add(trPts);
const TRAIL = { state: 'off', pts: [], got: [], n: 0, f: null, front: 0, prog: -1, t: 0, next: rnd(25, 40), kind: '', fade: 1 };
const SP = 2.2;
function trailFlower(p, filt, maxD = 60) { let best = null, bd = maxD; for (const f of flowers) { if (f.inLog || f.rich > 0 || zoneLocked(f) || (filt && !filt(f))) continue; const d = Math.hypot(f.x - p.x, f.z - p.z); if (d < bd) { bd = d; best = f; } } return best; }
const gp = (x, z, h) => new V3(x, terrainH(x, z) + h, z);
function weave(trees, filt, maxGap) {
  const near = trees.slice().sort((a, b) => Math.hypot(a.x - P.pos.x, a.z - P.pos.z) - Math.hypot(b.x - P.pos.x, b.z - P.pos.z)).slice(0, 5);
  let chain = [];
  for (const cur of near) { const ch = [cur];
    while (ch.length < 5) { let nb = null, nd = maxGap; const c = ch[ch.length - 1]; for (const t of trees) { if (ch.includes(t)) continue; const d = Math.hypot(t.x - c.x, t.z - c.z); if (d < nd && d > (t.R || 3) + (c.R || 3) + 4) { nd = d; nb = t; } } if (!nb) break; ch.push(nb); }
    if (ch.length > chain.length) chain = ch; if (chain.length >= 5) break; }
  if (chain.length < 4) return null; const way = [];
  chain.forEach((t, i) => { const o = chain[Math.min(i + 1, chain.length - 1)], q = chain[Math.max(i - 1, 0)]; let dx = o.x - q.x, dz = o.z - q.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L; const s = i % 2 ? 1 : -1, off = (t.R || 3) + 3.4;
    if (i === 0) way.push(gp(t.x - dx * 14, t.z - dz * 14, 5));
    way.push(gp(t.x - dz * s * off, t.z + dx * s * off, 4.5 + (i % 2) * 1.5)); });
  const last = way[way.length - 1], f = trailFlower(last, filt, 70); return f ? { way, f } : null;
}
function trailRoutes() {
  const R = [];
  { const A = LOG.axis, c = LOG.c, L = LOG.len, s = Math.sign((P.pos.x - c.x) * A.x + (P.pos.z - c.z) * A.z) || 1, way = [];
    for (const u of [L / 2 + 16, L / 2 + 4, 0, -L / 2 - 4, -L / 2 - 14]) way.push(new V3(c.x + A.x * u * s, c.y - 0.6, c.z + A.z * u * s));
    const e = way[4].clone().addScaledVector(A, -s * 12), f = trailFlower(e, f => !f.canopy); if (f) R.push({ kind: 'log', way, f }); }
  { const ps = ARCHES.map(a => new V3(a.cx, a.gy - 0.5 + a.h * 0.42, a.cz)); if (Math.hypot(P.pos.x - ps[ps.length - 1].x, P.pos.z - ps[ps.length - 1].z) < Math.hypot(P.pos.x - ps[0].x, P.pos.z - ps[0].z)) ps.reverse();
    const pre = ps[0].clone().addScaledVector(ps[0].clone().sub(ps[1]).setY(0).normalize(), 14), post = ps[ps.length - 1].clone().addScaledVector(ps[ps.length - 1].clone().sub(ps[ps.length - 2]).setY(0).normalize(), 10);
    const f = trailFlower(post, f => !f.canopy); if (f) R.push({ kind: 'arches', way: [pre, ...ps, post], f }); }
  if (G.orchard) {
    let ga = HEDGE_GAPS[0], bd = 1e9; for (const g of HEDGE_GAPS) { const d = Math.hypot(P.pos.x - ORCH.x - Math.cos(g) * HEDGE_R, P.pos.z - ORCH.z - Math.sin(g) * HEDGE_R); if (d < bd) { bd = d; ga = g; } }
    const way = [HEDGE_R + 30, HEDGE_R + 11, HEDGE_R, HEDGE_R - 11, HEDGE_R - 26].map(r => gp(ORCH.x + Math.cos(ga) * r, ORCH.z + Math.sin(ga) * r, 6));
    const f = trailFlower(way[4], f => f.orch && !f.canopy && f.val >= 2, 80); if (f) R.push({ kind: 'hedge', way, f });
    const w = weave(orchTrees.filter(t => !t.nest), f => f.orch && !f.canopy && f.val >= 2, 45); if (w) R.push({ kind: 'orchard', ...w });
  }
  if (G.zones.forest) { const w = weave(forestTrees, f => f.zone === 'forest', 40); if (w) R.push({ kind: 'forest', ...w }); }
  if (G.zones.pond) { const lot = flowers.find(f => f.lily && f.val >= 3 && !(f.rich > 0));
    if (lot) { let dx = P.pos.x - POND.x, dz = P.pos.z - POND.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      const e = new V3(POND.x + dx * (POND.r + 10), 0, POND.z + dz * (POND.r + 10)); e.y = Math.max(terrainH(e.x, e.z), WY) + 3;
      const lx = lot.x - e.x, lz = lot.z - e.z, LL = Math.hypot(lx, lz) || 1;
      const pads = PADS0.map(p => ({ p, u: ((p.x - e.x) * lx + (p.z - e.z) * lz) / LL, side: Math.abs(((p.x - e.x) * lz - (p.z - e.z) * lx) / LL) })).filter(o => o.u > 6 && o.u < LL - 6 && o.side < 20).sort((a, b) => a.u - b.u).slice(0, 4);
      R.push({ kind: 'pond', way: [e, ...pads.map(o => new V3(o.p.x, WY + 2.2, o.p.z))], f: lot }); } }
  return R;
}
function startTrail(kind) {
  let rs = trailRoutes(); if (kind) rs = rs.filter(r => r.kind === kind);
  else rs = rs.filter(r => { const d = Math.hypot(r.way[0].x - P.pos.x, r.way[0].z - P.pos.z); return d > 18 && d < 120; });
  if (!rs.length) return false;
  rs.sort((a, b) => Math.hypot(a.way[0].x - P.pos.x, a.way[0].z - P.pos.z) - Math.hypot(b.way[0].x - P.pos.x, b.way[0].z - P.pos.z));
  const r = kind ? rs[0] : rs[Math.min(rs.length - 1, Math.random() < 0.35 ? 1 : 0)], f = r.f;
  const way = r.way.concat([new V3(f.x, f.y + 1.6, f.z)]);
  for (const p of way) if (r.kind !== 'log') p.y = Math.max(p.y, Math.max(terrainH(p.x, p.z), overWater(p.x, p.z) ? WY : -1e9) + 1.6);
  const curve = new THREE.CatmullRomCurve3(way, false, 'centripetal'), n = Math.min(TRAILN, Math.max(8, Math.floor(curve.getLength() / SP)));
  TRAIL.pts = curve.getSpacedPoints(n - 1); TRAIL.n = TRAIL.pts.length; TRAIL.got = new Array(TRAIL.n).fill(false);
  TRAIL.f = f; TRAIL.kind = r.kind; TRAIL.state = 'wait'; TRAIL.t = 0; TRAIL.front = -1e9; TRAIL.prog = -1; TRAIL.fade = 1; trPts.visible = true;
  TRAIL.pts.forEach((p, i) => { trPos[i * 3] = p.x; trPos[i * 3 + 1] = p.y; trPos[i * 3 + 2] = p.z; trS[i] = i === 0 ? 1.4 : i === TRAIL.n - 1 ? 1.2 : 0.85; });
  for (let i = TRAIL.n; i < TRAILN; i++) trA[i] = 0;
  trGeo.attributes.position.needsUpdate = trGeo.attributes.aS.needsUpdate = true; trGeo.setDrawRange(0, TRAIL.n);
  tone(SCALE[4], 0.05, 2.0); tone(SCALE[7], 0.035, 2.4, 'sine', 0.15);
  toast(G.seenTrail ? '<b>A sweet scent on the breeze</b>' : '<b>A sweet scent drifts on the breeze</b><br><span>follow the golden motes fast, before the scent fades behind you</span>', G.seenTrail ? 2.5 : 6); G.seenTrail = true;
  return true;
}
function endTrail(ok) {
  TRAIL.state = 'fade'; TRAIL.next = rnd(40, 70);
  if (ok) { const f = TRAIL.f; f.rich = f.rich0 = 30; f.cool = 0; let slot = richGlows.find(g => g.f === f) || richGlows.find(g => !g.f);
    if (!slot) { slot = richGlows[0]; slot.f.rich = 0; slot.f.raid = false; } slot.f = f; G.trails++; gainHoney(2);
    [0, 2, 4, 5, 7].forEach((n, k) => tone(SCALE[n], 0.09, 1.8, 'sine', k * 0.08)); _v.set(f.sx, f.y + 1.2, f.sz); puff(_v, 30, [1.0, 0.85, 0.35], 3, 0.014, 1.6, -0.3, 0.6);
    toast('<b>You followed the scent to a brimming flower!</b><br><span>+2 honey, and it\'s overflowing with nectar</span>', 3.5); }
  else if (P.pos.distanceTo(TRAIL.pts[Math.max(0, TRAIL.prog)]) < 80) toast('<b>The scent faded</b>', 2);
}
function updateTrails(dt) {
  const flying = P.mode === 'fly' && !inHive;
  if (TRAIL.state === 'off') { trPts.visible = false; if (flying && outF > 0.8 && DAY.t < 0.86 && !flowersClosed()) { TRAIL.next -= dt; if (TRAIL.next <= 0) { if (!startTrail()) TRAIL.next = 6; } } return; }
  TRAIL.t += dt; const pts = TRAIL.pts, n = TRAIL.n;
  if (TRAIL.state === 'wait') {
    if (TRAIL.t > 35) endTrail(false);
    else if (flying) for (let i = 0; i < Math.min(10, n); i++) if (P.pos.distanceTo(pts[i]) < 3.4) { TRAIL.state = 'run'; TRAIL.prog = i; TRAIL.front = i - 1.4 * 16 / SP; break; }
  }
  if (TRAIL.state === 'run') {
    TRAIL.front += dt * 16 / SP;
    if (flying) for (let i = Math.max(0, TRAIL.prog - 3); i < Math.min(n, TRAIL.prog + 8); i++) {
      if (TRAIL.got[i] || P.pos.distanceTo(pts[i]) > 3.4) continue;
      TRAIL.got[i] = true; if (i > TRAIL.prog) TRAIL.prog = i; G.boost = Math.max(G.boost, 0.9);
      if (i % 2 === 0) tone(SCALE[Math.min(7, Math.floor(8 * i / n))] * (i > n * 0.5 ? 1 : 0.5), 0.035, 0.5, 'sine');
      puff(pts[i], 3, [1.0, 0.85, 0.4], 1.2, 0.008, 0.6);
    }
    const f = TRAIL.f; _v.set(f.sx, f.y + 1.2, f.sz);
    if (TRAIL.prog >= n - 2 || (flying && P.pos.distanceTo(_v) < 3.6 && TRAIL.prog > n * 0.6)) endTrail(true);
    else if (TRAIL.front > TRAIL.prog + 0.5 || !flying) endTrail(false);
  }
  if (TRAIL.state === 'fade') { TRAIL.fade -= dt * 1.2; if (TRAIL.fade <= 0) { TRAIL.state = 'off'; trPts.visible = false; return; } }
  for (let i = 0; i < n; i++) {
    let a = TRAIL.got[i] ? 0 : (0.6 + 0.4 * Math.sin(time * 5 + i * 0.9)) * clamp((i - TRAIL.front) / 3, 0, 1) * TRAIL.fade;
    if (TRAIL.state === 'wait') a *= Math.min(1, TRAIL.t * 1.5);
    trA[i] = a; const p = pts[i]; trPos[i * 3] = p.x + Math.sin(time * 1.3 + i) * 0.12; trPos[i * 3 + 1] = p.y + Math.sin(time * 1.7 + i * 1.3) * 0.15; trPos[i * 3 + 2] = p.z + Math.cos(time * 1.1 + i) * 0.12;
  }
  trGeo.attributes.aA.needsUpdate = trGeo.attributes.position.needsUpdate = true;
}

// ---------- batch 2a: red clover heat buzz, and the bee ball ----------
// red clovers: rare, low in the grass. A sip warms your flight muscles; F releases the heat as a shimmering pulse
const CLOVERS = [];
{ const headM = mat(`void main(){ vec3 n=NORMAL; float fl=vnoise(vL.xz*14.0+vL.y*9.0); vec3 alb=mix(vec3(0.55,0.05,0.16),vec3(0.95,0.35,0.55),fl)*(0.7+0.4*smoothstep(-0.5,0.8,vL.y));
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.2,0.8),vW),1.0); }`), stemM = simple('0.18,0.36,0.08', 0.2, 0.6);
  const hg = new THREE.IcosahedronGeometry(0.85, 3); { const p = hg.attributes.position; for (let i = 0; i < p.count; i++) { const v = new V3(p.getX(i), p.getY(i), p.getZ(i)); const k = 1 + 0.18 * Math.abs(Math.sin(v.x * 23) * Math.sin(v.y * 19) * Math.sin(v.z * 21)); v.multiplyScalar(k); v.y *= 1.15; p.setXYZ(i, v.x, v.y, v.z); } hg.computeVertexNormals(); }
  let guard = 0; while (CLOVERS.length < 7 && guard++ < 4000) { const a = rnd(TAU), d = rnd(70, 230), x = Math.cos(a) * d, z = Math.sin(a) * d, gy = terrainH(x, z);
    if (overWater(x, z) || zoneBlocked(x, z) || gy < WY + 0.5 || dewPathD(x, z) < 6 || brookD(x, z) < 14 || Math.hypot(x - HOLLOW.x, z - HOLLOW.z) < HOLLOW.r + 12 || Math.hypot(x - ORCH.x, z - ORCH.z) < HEDGE_R + 12 || CLOVERS.some(c => Math.hypot(c.x - x, c.z - z) < 40)) continue;
    const h = rnd(2.4, 3.6), g = new THREE.Group(); g.position.set(x, gy, z);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, h, 6), stemM); st.position.y = h / 2; g.add(st);
    const hd = new THREE.Mesh(hg, headM); hd.position.y = h + 0.6; g.add(hd);
    for (const s of [-1, 1]) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), stemM); lf.scale.set(1, 0.12, 0.6); lf.position.set(s * 0.45, h * 0.45, 0); lf.rotation.y = s * 0.4; g.add(lf); }
    scene.add(g); CLOVERS.push({ x, z, y: gy + h + 0.6, g, hd, cool: 0, sip: 0 }); } }
G.heat = 0; G.heatCD = 0; G.seenClover = false;
const heatM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uTime: U.uTime, uCam: U.uCam },
  vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: UNTONE + `uniform float uA; uniform float uTime; uniform vec3 uCam; varying vec3 vN; varying vec3 vW; void main(){ vec3 V=normalize(uCam-vW); float fr=pow(1.0-abs(dot(normalize(vN),V)),2.5);
    float rip=0.6+0.4*sin(vW.y*6.0+uTime*20.0+vW.x*3.0); gl_FragColor=vec4(untone(vec3(1.0,0.55,0.2))*fr*rip*uA*2.6,1.0); }` });
const heatBall = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), heatM); heatBall.visible = false; scene.add(heatBall);
const HEAT = { t: -1 };
function heatBuzz() {
  if (!(G.heat > 0) || P.mode !== 'fly' || inHive) { if (P.mode === 'fly' && time > (G.heatHintT || 0)) { G.heatHintT = time + 4; hint('your wings are cool. Sip a <b>red clover</b> to warm them', 3); } return; }
  G.heat = 0; HEAT.t = 0; heatBall.visible = true; heatBall.position.copy(P.pos);
  sweep(90, 340, 0.7, 0.09, 'sawtooth'); noiseHit(300, 0.8, 0.3, 0.6, 'lowpass', 900); puff(P.pos, 20, [1.0, 0.6, 0.25], 6, 0.012, 0.8);
  for (let k = 0; k < 60; k++) { const q = parts[pNext], a = k / 60 * TAU; puff(P.pos, 1, [1.0, 0.5, 0.18], 0, 0.016, 0.7); q.g = 0; q.v.set(Math.cos(a) * 24, rnd(-3, 3), Math.sin(a) * 24); }
  let n = 0; for (const w of wasps) { if (w.gone > 0 || w.p.y < -100 || w.state === 'idle' || w.state === 'dazed' || w.state === 'balled') continue; if (w.p.distanceTo(P.pos) < 15) { dazeWasp(w); n++; } }
  toast(n ? `<b>Heat buzz!</b><br><span>${n} wasp${n > 1 ? 's' : ''} knocked out of the air</span>` : '<b>Heat buzz!</b><br><span>no wasps close enough</span>', 2.5);
}
function dazeWasp(w) { w.state = 'dazed'; w.dazeT = rnd(5, 7); w.decoy = null; w.v.set(0, 0, 0); w.wasMob = !!w.mob; }
function updateHeat(dt) {
  if (HEAT.t >= 0) { HEAT.t += dt; const k = HEAT.t / 0.6; heatBall.position.copy(P.pos); heatBall.scale.setScalar(1 + 14 * Math.min(1, k)); heatM.uniforms.uA.value = Math.max(0, 1 - k) * 0.9; if (k >= 1) { HEAT.t = -1; heatBall.visible = false; } }
  if (G.heat > 0 && Math.random() < dt * 6 && P.mode === 'fly') { _v.copy(P.pos).addScaledVector(fwd, -0.6); puff(_v, 1, [1.0, 0.5, 0.2], 0.6, 0.006, 0.5, -0.5); }
  for (const c of CLOVERS) {
    c.cool -= dt; c.hd.visible = c.cool <= 0; const vis = Math.hypot(camera.position.x - c.x, camera.position.z - c.z) < 300; c.g.visible = vis; if (c.cool > 0) continue;
    c.hd.rotation.y += dt * 0.2; c.g.rotation.z = Math.sin(time * 1.3 + c.x) * 0.05 * (0.4 + WIND.s);
    _v.set(c.x, c.y, c.z); const d = P.pos.distanceTo(_v);
    if (P.mode === 'fly' && d < 1.9) { c.sip += dt; if (Math.random() < dt * 10) tone(SCALE[Math.min(7, Math.floor(c.sip * 6))] * 0.5, 0.05, 0.5);
      if (c.sip > 1.0) { c.sip = 0; c.cool = 90; G.heat = 1; puff(_v, 20, [1.0, 0.3, 0.45], 2, 0.012, 1.2); sweep(120, 260, 0.5, 0.05, 'triangle');
        toast(G.seenClover ? '<b>Warm clover nectar</b><br><span><kbd>F</kbd> heat buzz</span>' : '<b>Warm red clover nectar!</b><br><span>your flight muscles burn hot. Press <kbd>F</kbd> near wasps to blast them with heat</span>', G.seenClover ? 2.5 : 6); G.seenClover = true; } }
    else c.sip = Math.max(0, c.sip - dt);
    if (P.pos.distanceTo(_v) > 60 && !G.seenClover && Math.random() < dt * 0.5) { } // left quiet: clovers are found, not announced
  }
}
// the bee ball: call your sisters (R). They swarm the nearest wasp into a glowing, buzzing knot and it drops
const SWARM = { active: false, t: 0, cd: 0, w: null, c: new V3(), bees: [], phase: '' };
for (let i = 0; i < 12; i++) { const b = makeFlier(rnd(0.9, 1.05)); b.s.set(0.001, 0.001, 0.001); b.home = new V3(); b.o = new V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(); b.update = (dt) => { if (!SWARM.active) { b.s.set(0.001, 0.001, 0.001); b.fly = false; b.pol = 0; return; } b.fly = true; b.s.setScalar(b.sc || 1); swarmBee(b, dt); b.face(dt); }; b.sc = rnd(0.9, 1.05); SWARM.bees.push(b); }
const radTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
const ballGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radTex, color: new THREE.Color(2.2, 1.1, 0.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
ballGlow.center.set(0.5, 0.5); ballGlow.scale.set(4, 4, 1); ballGlow.visible = false; scene.add(ballGlow);
function callSisters() {
  if (P.mode !== 'fly' || inHive) return;
  if (SWARM.active) return; if (SWARM.cd > 0) { hint(`your sisters are still catching their breath (${Math.ceil(SWARM.cd)}s)`, 2); return; }
  if (G.workers < 3) { hint('you need at least 3 sisters to call for help', 3); return; }
  let best = null, bd = 40; for (const w of wasps) { if (w.gone > 0 || w.p.y < -100 || w.state === 'idle' || w.state === 'balled') continue; const d = w.p.distanceTo(P.pos); if (d < bd) { bd = d; best = w; } }
  [0, 4, 7, 4].forEach((n, k) => tone(SCALE[n] * 0.5, 0.06, 0.5, 'sawtooth', k * 0.12)); sweep(220, 320, 0.6, 0.04, 'sawtooth');
  if (!best) { toast('<b>You buzz for help</b><br><span>but there\'s no wasp close enough</span>', 2.5); SWARM.cd = 4; return; }
  SWARM.active = true; SWARM.t = 0; SWARM.w = best; SWARM.phase = 'go'; SWARM.cd = 35;
  SWARM.bees.forEach((b, i) => { b.p.copy(P.pos).add(new V3(rnd(-8, 8), rnd(-3, 5), rnd(-8, 8))).addScaledVector(fwd, -10); b.first = true; b.prev.copy(b.p); b.spd = rnd(24, 32); });
  toast('<b>Sisters, to me!</b><br><span>your sisters swarm in on the wasp</span>', 2.5);
}
function swarmBee(b, dt) {
  const w = SWARM.w; let tgt;
  if (SWARM.phase === 'go') tgt = w.p; else if (SWARM.phase === 'ball') tgt = _v.copy(SWARM.c).addScaledVector(b.o, 0.75 + 0.15 * Math.sin(time * 20 + b.ph)); else tgt = b.home;
  const sp = SWARM.phase === 'ball' ? 40 : b.spd; _v2.copy(tgt).sub(b.p); const L = _v2.length();
  if (SWARM.phase === 'ball') b.p.lerp(tgt, Math.min(1, dt * 12)); else if (L > 0.01) b.p.addScaledVector(_v2, Math.min(1, sp * dt / L));
  b.p.x += Math.sin(time * 9 + b.ph) * 0.04; b.p.y += Math.cos(time * 11 + b.ph) * 0.04;
}
function updateSwarm(dt) {
  SWARM.cd -= dt; if (!G.seenRally && G.workers >= 3 && P.mode === 'fly' && wasps.some(w => w.state === 'chase')) { G.seenRally = true; hint('<kbd>R</kbd> buzz for your sisters: they ball up on wasps', 6); }
  if (!SWARM.active) { ballGlow.visible = false; return; }
  SWARM.t += dt; const w = SWARM.w;
  if (SWARM.phase === 'go') {
    const arrived = SWARM.bees.filter(b => b.p.distanceTo(w.p) < 2.5).length;
    if (w.gone > 0 || w.p.y < -100 || SWARM.t > 6) { SWARM.phase = 'home'; SWARM.t = 0; }
    else if (arrived >= 6) { SWARM.phase = 'ball'; SWARM.t = 0; w.state = 'balled'; w.v.set(0, 0, 0); SWARM.c.copy(w.p); noiseHit(400, 0.7, 0.25, 0.5, 'lowpass', 160); sweep(180, 120, 1.5, 0.06, 'sawtooth');
      toast('<b>Bee ball!</b><br><span>your sisters cook the wasp with their heat</span>', 3); }
  } else if (SWARM.phase === 'ball') {
    const gy = terrainH(SWARM.c.x, SWARM.c.z) + 0.9; SWARM.c.y = Math.max(gy, SWARM.c.y - dt * (SWARM.t > 1.2 ? 6 : 0.5)); w.p.copy(SWARM.c);
    ballGlow.visible = true; ballGlow.position.copy(SWARM.c); ballGlow.material.opacity = Math.min(1, SWARM.t) * (0.55 + 0.25 * Math.sin(time * 14)); ballGlow.scale.setScalar(3.5 + 0.3 * Math.sin(time * 9));
    if (Math.random() < dt * 20 && P.pos.distanceTo(SWARM.c) < 60) noiseHit(rnd(180, 320), 2, 0.05, 0.08, 'lowpass', 400);
    if (SWARM.t > 4.0) { eatWasp(w, 'ball'); SWARM.phase = 'home'; SWARM.t = 0; SWARM.bees.forEach(b => { const a = rnd(TAU); b.home.copy(SWARM.c).add(new V3(Math.cos(a) * 60, 30, Math.sin(a) * 60)); }); }
  } else { ballGlow.visible = false; if (SWARM.t < dt * 1.5) SWARM.bees.forEach(b => { const a = rnd(TAU); b.home.copy(b.p).add(new V3(Math.cos(a) * 60, 30, Math.sin(a) * 60)); }); if (SWARM.t > 3) { SWARM.active = false; } }
}
addEventListener('keydown', e => { if (e.repeat) return; if (e.code === 'KeyF') heatBuzz(); if (e.code === 'KeyR') callSisters(); });

// ---------- batch 2b: the misty brook, swaying branches, the bramble hollow, petal gusts, and a calm after revenge ----------
// the brook: cool air over running water lifts a bee skimming low; branches lean low over it and sway in the wind
const brookCurve = new THREE.CatmullRomCurve3(BROOK.pts.map(p => new V3(p[0], 0, p[1])), false, 'centripetal');
const BROOKS = brookCurve.getSpacedPoints(90).map(p => { p.y = terrainBase(p.x, p.z) - BROOK.depth + 1.4; return p; });
for (let i = 1; i < BROOKS.length; i++) BROOKS[i].y = Math.min(BROOKS[i].y, BROOKS[i - 1].y + 0.05); // water runs downhill (or level)
function brookWY(s) { const k = clamp(s / (BROOK.pts.length - 1), 0, 1) * (BROOKS.length - 1), i = Math.floor(k), f = k - i; return lerp(BROOKS[i].y, BROOKS[Math.min(BROOKS.length - 1, i + 1)].y, f); }
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
const BRANCHES = [];
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
const _bq = new Q4(), _bax = new V3();
function updateBranches(dt) { for (const B of BRANCHES) { const sw = Math.sin(time * 1.1 + B.ph) * (0.05 + 0.13 * WIND.s) + Math.sin(time * 2.7 + B.ph * 2) * 0.03;
    _bax.set(-B.dir.z, 0, B.dir.x).normalize(); _bq.setFromAxisAngle(_bax, sw); B.g.quaternion.copy(B.q0).premultiply(_bq);
    B.a.copy(B.base); B.b.set(0, B.len, 0).applyQuaternion(B.g.quaternion).add(B.base); } }
const _brPrev = new V3(); let _brHas = false;
function branchCollide(p, v) { if (!_brHas || _brPrev.distanceTo(p) > 6) _brPrev.copy(p); _brHas = true;
  for (const B of BRANCHES) { if (Math.abs(p.x - B.base.x) > B.len + 4 || Math.abs(p.z - B.base.z) > B.len + 4) continue; const r = 0.42 + PR;
    if (segSeg(_brPrev, p, B.a, B.b) < r) { _aN.subVectors(_aC1, _aC2); const L = _aN.length() || 1; _aN.multiplyScalar(1 / L); p.copy(_aC2).addScaledVector(_aN, r + 0.01); const vn = v.dot(_aN); if (vn < 0) v.addScaledVector(_aN, -vn * 1.2); } }
  _brPrev.copy(p); }
// the bramble hollow: a thorny ring roofed with leaves. The only way in is through a hollow root
const HOL = (() => { const gy = terrainH(HOLLOW.x, HOLLOW.z), sc = new V3(HOLLOW.x, gy - 8, HOLLOW.z), Rs = Math.hypot(HOLLOW.r, HOLLOW.wallH + 8);
  const a0 = HOLLOW.a0; // the root comes in from the side facing home, a little round
  const pts = [26, 21, 17.5, 15, 11].map((r, i) => { const a = a0 + (i - 2) * 0.05, x = HOLLOW.x + Math.cos(a) * r, z = HOLLOW.z + Math.sin(a) * r; return new V3(x, Math.max(gy, terrainH(x, z)) + 2.3 + (i === 0 ? 0.4 : 0), z); });
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'); return { gy, sc, Rs, curve, S: curve.getSpacedPoints(40), tr: 2.1, hole: curve.getPointAt(0.42) }; })();
{ const brM = mat(`uniform vec3 uHole; void main(){ if(distance(vW,uHole)<2.45) discard; vec3 n=NORMAL; float a=fbm(vW.xz*0.9+vW.y*0.7), b=vnoise(vW.xz*5.0+vW.y*4.0); float cane=1.0-abs(2.0*vnoise(vec2(vW.x*1.7+vW.z*1.3, vW.y*0.8+vW.x*0.5-vW.z*0.6)*2.2)-1.0); cane=pow(cane,3.0)*0.6+0.25*vnoise(vW.xz*3.0+vW.y*2.0);
      vec3 alb=mix(vec3(0.03,0.05,0.02),mix(vec3(0.16,0.24,0.05),vec3(0.30,0.20,0.10),b),cane)*(0.55+0.7*a); alb=mix(alb,vec3(0.30,0.12,0.12),smoothstep(0.7,0.9,b)*0.5); // thorny canes, a few red berries
      alb=mix(alb,vec3(0.45,0.05,0.12),smoothstep(0.93,0.97,vnoise(vW.xz*9.0+vW.y*7.0)));
      gl_FragColor=vec4(finish(shade(alb,n,vW,0.08,0.7),vW),1.0); }`, { uniforms: { uHole: { value: HOL.hole } }, side: THREE.DoubleSide });
  const bulge = (g, amt) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + amt * (Math.sin(x * 1.3 + y * 0.7) * Math.cos(z * 1.1 - y) * 0.6 + Math.sin(x * 3.1 + z * 2.3) * 0.4); p.setXYZ(i, x * k, y, z * k); } g.computeVertexNormals(); return g; };
  for (const r of [HOLLOW.r - 1.2, HOLLOW.r + 1.2]) { const g = bulge(new THREE.CylinderGeometry(r, r, HOLLOW.wallH + 3, 64, 6, true), 0.06); g.translate(HOLLOW.x, HOL.gy + (HOLLOW.wallH + 3) / 2 - 3, HOLLOW.z); scene.add(new THREE.Mesh(g, brM)); }
  const dome = new THREE.SphereGeometry(HOL.Rs, 48, 16, 0, TAU, 0, Math.asin(HOLLOW.r / HOL.Rs) + 0.04); bulge(dome, 0.05); dome.translate(HOL.sc.x, HOL.sc.y, HOL.sc.z); scene.add(new THREE.Mesh(dome, brM));
  const rootM = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vec2(atan(vL.z,vL.x)*4.0,vL.y*0.4)); vec3 alb=mix(vec3(0.09,0.06,0.035),vec3(0.36,0.26,0.16),smoothstep(0.3,0.7,a));
      alb=mix(alb,vec3(0.14,0.30,0.05),smoothstep(0.5,0.7,fbm(vL.xy*0.3+2.0))*smoothstep(0.0,0.7,n.y)*0.7); gl_FragColor=vec4(finish(shade(alb,n,vW,0.06,0.2),vW),1.0); }`, { side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(HOL.curve, 60, HOL.tr + 0.35, 14), rootM));
}
let _hPrev = new V3(), _hHas = false;
function hollowCollide(p, v) {
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
// petal gusts: now and then a ribbon of petals rides the wind. Fly inside it and it carries you
const GN = 70, GUSTS = [];
{ const gm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: U.uTime },
    vertexShader: `attribute float aA; attribute vec3 aC; varying float vA; varying vec3 vCc; void main(){ vec4 mv=viewMatrix*vec4(position,1.0); vA=aA; vCc=aC; gl_PointSize=clamp(0.5*500.0/max(-mv.z,0.1),2.0,40.0); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: UNTONE + `varying float vA; varying vec3 vCc; void main(){ vec2 q=gl_PointCoord-0.5; float a=smoothstep(0.5,0.3,length(q*vec2(1.0,1.9))); gl_FragColor=vec4(untone(vCc)*1.2,a*vA); }` });
  for (let k = 0; k < 2; k++) { const pos = new Float32Array(GN * 3), al = new Float32Array(GN), col = new Float32Array(GN * 3); for (let i = 0; i < GN; i++) { const c = [[1.0, 0.75, 0.85], [1.0, 0.95, 0.95], [0.95, 0.55, 0.7]][i % 3]; col.set(c, i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aA', new THREE.BufferAttribute(al, 1)); g.setAttribute('aC', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, gm); pts.frustumCulled = false; pts.visible = false; scene.add(pts);
    GUSTS.push({ pts, g, pos, al, on: false, t: 0, next: rnd(15, 35) + k * 20, c: new V3(), dir: new V3(), off: Array.from({ length: GN }, () => [rnd(0, 1), rnd(TAU), rnd(0.3, 1)]) }); } }
G.seenGust = false;
function updateGusts(dt) {
  for (const G2 of GUSTS) {
    if (!G2.on) { G2.next -= dt; if (G2.next <= 0 && P.mode === 'fly' && !inHive && outF > 0.8) { G2.on = true; G2.t = 0; G2.dir.set(WIND.dx, 0, WIND.dz).normalize();
        G2.c.copy(P.pos).addScaledVector(G2.dir, -rnd(25, 40)).add(new V3(rnd(-12, 12), 0, rnd(-12, 12))); G2.c.y = Math.max(terrainH(G2.c.x, G2.c.z) + rnd(6, 14), P.pos.y + rnd(-3, 3)); G2.pts.visible = true; } continue; }
    G2.t += dt; const life = 14, fade = Math.min(1, G2.t / 1.5) * Math.min(1, (life - G2.t) / 2); G2.c.addScaledVector(G2.dir, dt * 15); G2.c.y += Math.sin(G2.t * 0.8) * dt * 1.5;
    const gy = terrainH(G2.c.x, G2.c.z) + 3; if (G2.c.y < gy) G2.c.y = gy;
    for (let i = 0; i < GN; i++) { const [u, ph, rr] = G2.off[i], s = (u * 22 - 11), sw = Math.sin(G2.t * 2 + u * 9) * 1.5;
      G2.pos[i * 3] = G2.c.x + G2.dir.x * s - G2.dir.z * (Math.cos(ph + G2.t * 3) * 1.6 * rr + sw); G2.pos[i * 3 + 1] = G2.c.y + Math.sin(ph + G2.t * 3) * 1.6 * rr + Math.sin(u * 7 + G2.t) * 0.6; G2.pos[i * 3 + 2] = G2.c.z + G2.dir.z * s + G2.dir.x * (Math.cos(ph + G2.t * 3) * 1.6 * rr + sw);
      G2.al[i] = fade * (0.6 + 0.4 * Math.sin(G2.t * 6 + i)); }
    G2.g.attributes.position.needsUpdate = G2.g.attributes.aA.needsUpdate = true;
    if (P.mode === 'fly') { _v.copy(P.pos).sub(G2.c); const along = _v.dot(G2.dir); _v.addScaledVector(G2.dir, -along);
      if (Math.abs(along) < 12 && _v.length() < 3.2) { G.boost = Math.max(G.boost, 1.2); P.vel.addScaledVector(G2.dir, dt * 10); if (Math.random() < dt * 4) tone(SCALE[(Math.random() * 3 | 0) + 4], 0.03, 0.6);
        if (!G.seenGust) { G.seenGust = true; toast('<b>Caught in a petal gust!</b><br><span>ride the wind with it</span>', 3); } } }
    if (G2.t > life) { G2.on = false; G2.pts.visible = false; G2.next = rnd(25, 50); }
  }
}
// the brook: skimming low and fast over the water carries you; mist drifts on the surface
G.seenBrook = false;
function updateBrook(dt) {
  const cd = brookD(camera.position.x, camera.position.z);
  if (cd < 120 && Math.random() < dt * 14) { const i = (Math.random() * BROOKS.length) | 0, p = BROOKS[i]; if (p.distanceTo(camera.position) < 90) { _v.set(p.x + rnd(-3, 3), p.y + 0.4, p.z + rnd(-3, 3)); const q = parts[pNext]; puff(_v, 1, [0.92, 0.95, 1.0], 0, 0.06, 3.5); q.g = -0.15; q.v.set(WIND.dx * 1.5, 0.2, WIND.dz * 1.5); } }
  if (P.mode !== 'fly' || inHive) return; const bs = brookSeg(P.pos.x, P.pos.z); if (!bs || bs.d > BROOK.hw + 1) return;
  const wy = brookWY(bs.s), alt = P.pos.y - wy;
  if (alt < PR + 0.15) { P.pos.y = wy + PR + 0.15; if (P.vel.y < 0) P.vel.y = -P.vel.y * 0.4 + 1.5; P.vel.x *= 0.9; P.vel.z *= 0.9; P.wet = Math.min(1, P.wet + 0.25); _v.set(P.pos.x, wy + 0.1, P.pos.z); puff(_v, 8, [0.85, 0.93, 1], 1.5, 0.01, 0.6, 5, 1); noiseHit(800, 1, 0.08, 0.2, 'lowpass', 200); }
  else if (alt < 3.0 && Math.hypot(P.vel.x, P.vel.z) > 9) { G.boost = Math.max(G.boost, 1.0); if (Math.random() < dt * 16) { _v.set(P.pos.x + rnd(-0.5, 0.5), wy + 0.05, P.pos.z + rnd(-0.5, 0.5)); puff(_v, 1, [0.85, 0.93, 1], 0.8, 0.01, 0.5, 4, 0.8); }
    if (!G.seenBrook) { G.seenBrook = true; toast('<b>Cool air over the brook</b><br><span>skim low and fast and it carries you. Mind the branches</span>', 4); } }
}
// revenge pays off: after every 5 wasps you beat, the rest keep their distance for a while
G.calmT = 0; G.calmAt = 5;
function updateCalm(dt) { if (G.revenge >= G.calmAt) { G.calmAt += 5; G.calmT = 60; toast('<b>The wasps are rattled</b><br><span>they keep their distance for a while</span>', 4); [0, 4, 7].forEach((n, k) => tone(SCALE[n], 0.08, 1.6, 'sine', k * 0.1)); }
  if (G.calmT > 0) { G.calmT -= dt; for (const w of wasps) if (w.state === 'chase' && !w.calmed) { w.state = 'retreat'; w.t = 0; w.decoy = null; } } }
function updateBatch2(dt) { updateBranches(dt); updateGusts(dt); updateBrook(dt); updateCalm(dt); }

// coming home: the scent of the hive draws a bee in. Heading for the entrance gently lines you up with the tunnel
const _hm = new V3(ROUT + 0.8, TY, 0), _hi = new V3(RIN - 0.5, TY, 0), _hd = new V3();
function updateHomePull(dt) {
  if (P.mode !== 'fly' || inHive) return; const d = P.pos.distanceTo(_hm); if (d > 18 || P.pos.x < ROUT - 1) return;
  const sp = P.vel.length(); if (sp < 1.5) return; _hd.copy(_hm).sub(P.pos).normalize(); if (d < 6 ? P.vel.x > -0.5 : P.vel.dot(_hd) < 0.45 * sp) return; // only when you are already heading in
  const k = 1 - d / 18; const tgt = d < 5 ? _hi : _hm; _hd.copy(tgt).sub(P.pos).normalize();
  P.vel.lerp(_v.copy(_hd).multiplyScalar(sp), Math.min(1, dt * (1.5 + 5 * k * k)));
  if (d < 5) { const c = Math.min(1, dt * 7); P.pos.y += (TY - P.pos.y) * c; P.pos.z += (0 - P.pos.z) * c; }
}

// ---------- field notes: the controls card (hold Tab / tap H, and the rest screen when the mouse is freed) ----------
const keysEl = $('keys'), keytipEl = $('keytip');
let keysHeld = false, keysToggled = false, resting = false, wasLocked = false;
const TIPS = (() => { try { return JSON.parse(localStorage.getItem('honeylight.tips') || '{}'); } catch (e) { return {}; } })();
function tipOnce(id, html, secs = 5) { if (TIPS[id]) return false; TIPS[id] = 1; try { localStorage.setItem('honeylight.tips', JSON.stringify(TIPS)); } catch (e) { } hint(html, secs); return true; }
function keysHTML() {
  const K = (k) => k.split(' ').map(x => `<kbd>${x}</kbd>`).join(''), row = (k, t, dim) => `<div class="kk${dim ? ' dim' : ''}">${K(k)}</div><div class="${dim ? 'dim' : ''}">${t}</div>`;
  let h = `<h2>${resting ? 'Resting' : 'Field notes'}</h2><div class="k">`;
  if (P.mode === 'crawl' || P.mode === 'cell' || P.mode === 'emerge') h += row('W A S D', 'walk the comb') + row('Space', P.wingsReady ? 'take off' : 'take off, once your wings are dry');
  h += row('Mouse', 'look and steer') + row('W', 'fly forward') + row('S', 'slow down, back up') + row('A D', 'drift sideways') + row('Space', 'rise') + row('Shift', 'sink')
    + row('V', G.third ? 'back to bee\'s-eye view' : 'see yourself from behind')
    + row(G.dart ? 'Q' : 'Q', G.dart ? 'dart: a burst of wing strength' : 'dart, when you grow (30 honey)', !G.dart)
    + row('E', G.leap ? 'leap: spring straight up' : 'leap, when you grow (65 honey)', !G.leap)
    + row('F', G.heat > 0 ? 'heat buzz: knock wasps out of the air' : 'heat buzz, after a sip of red clover', !(G.heat > 0))
    + row('R', G.workers >= 3 ? 'call your sisters to ball a wasp' : `call your sisters (needs 3, you have ${G.workers})`, G.workers < 3)
    + row('Space', 'wriggle free of a web') + row('Tab', 'hold for these notes') + row('Esc', 'rest and free the mouse');
  return h + `</div>${resting ? '<div class="foot">click to fly on</div>' : ''}`;
}
function showKeys() { const on = keysHeld || keysToggled || resting; if (on) keysEl.innerHTML = keysHTML(); keysEl.classList.toggle('on', on); if (on) TIPS.card = 1; }
addEventListener('keydown', e => { if (e.code === 'Tab') { e.preventDefault(); if (!e.repeat) { keysHeld = true; showKeys(); } } else if (e.code === 'KeyH' && !e.repeat) { keysToggled = !keysToggled; showKeys(); } });
addEventListener('keyup', e => { if (e.code === 'Tab') { keysHeld = false; showKeys(); } });
addEventListener('blur', () => { keysHeld = false; showKeys(); });
document.addEventListener('pointerlockchange', () => { const l = document.pointerLockElement === canvas; if (wasLocked && !l && P.mode !== 'title') resting = true; if (l) resting = false; wasLocked = l; keysToggled = false; showKeys(); });
// gentle first-time nudges, each shown once
function tipsTick() {
  if (P.mode === 'title') { keytipEl.style.opacity = 0; return; }
  keytipEl.style.opacity = keysEl.classList.contains('on') ? 0 : 0.5;
  if (P.mode !== 'fly') return;
  if (P.flownAt && time - P.flownAt > 10 && !G.third) tipOnce('v', '<kbd>V</kbd> see yourself from behind', 5);
  if (P.pollen > 0 && !G.third && TIPS.v && P.flownAt && time - P.flownAt > 20) tipOnce('v2', '<kbd>V</kbd> look back at the pollen on your legs', 5);
  if (G.workers >= 3 && !inHive && wasps.some(w => w.state === 'chase')) tipOnce('r', '<kbd>R</kbd> call your sisters to help', 5);
  if (G.heat > 0 && wasps.some(w => w.state !== 'idle' && w.p.distanceTo(P.pos) < 14)) tipOnce('f', '<kbd>F</kbd> blast the wasp with heat', 4);
  if (P.flownAt && time - P.flownAt > 45) tipOnce('tab', 'hold <kbd>Tab</kbd> any time to see your keys', 5);
}
// on the comb: turn with the mouse and walk where you face, with the wax as your floor
const _cq = new Q4(), _cl = new V3(), _cv = new V3();
function crawlView() { const h = P.ch || 0, cp = P.cp || 0; _cl.set(-Math.sin(h) * Math.cos(cp), Math.cos(h) * Math.cos(cp), Math.sin(cp));
  camera.up.set(0, 0, 1); camera.lookAt(_cv.copy(camera.position).add(_cl)); camera.up.set(0, 1, 0);
  if (P.q0 && P.t < 0.7) { _cq.copy(camera.quaternion); camera.quaternion.slerpQuaternions(P.q0, _cq, smooth(0, 0.7, P.t)); } }
function viewBlend() { if (P.mode === 'crawl') crawlView(); else if (P.tkq && time - P.tk < 0.5) { _cq.copy(camera.quaternion); camera.quaternion.slerpQuaternions(P.tkq, _cq, smooth(0, 0.5, time - P.tk)); } }

window.__g = { get time() { return time; }, get inHive() { return inHive; }, get outF() { return outF; }, scene, renderer, mat, simple, geoParts, ell, stick, untoneHex, COMMON, VERT, SWAYGLSL, puff, toast, hint, tone, noiseHit, sweep, addPollen, losePollen, flowerHit, collide, zoneBlocked, zoneLocked, overWater, endMob, save, PR, HEDGE_R, HEDGE_GAPS, noShadow: o => hidden.push(o), tipOnce, look, takeOff, showKeys, keysHTML, TIPS, MP, MPSTAT, LIMBS, HOLROOT: HOL.S, BROOK, HOLLOW, GUSTS, BRANCHES, brookSeg, CLOVERS, heatBuzz, callSisters, SWARM, HEAT, archCollide, segSeg, DEWPATH, U, weave, trailFlower, TRAIL, startTrail, trailRoutes, NESTR, NEST, raidNest, eatWasp, rebirth, chew, hero, ZONES, DAY, dragonflies, openZone, forestTrees, FOREST, stores, applyDayLight, MOB, startMob, STONES, ARCHES, WIND, G, gainHoney, wasps, webs, orchTrees, LOG, HILLS, ORCH, keys, sim: (secs) => { for (let i = 0; i < secs * 60; i++) update(1 / 60); }, fish, snap: () => { renderFrame(); return canvas.toDataURL("image/jpeg", 0.85); }, P, THREE, camera, flowers, pads, shrooms, COMBS, chew, takeOff, WY, POND, terrainH, FDIR, FIELD_D, bees };
