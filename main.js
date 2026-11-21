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
function terrainH(x, z) {
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
U.uWind = { value: new V3() };
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
uniform float uTime; uniform vec3 uCam; uniform vec3 uSun; uniform float uGlow; uniform highp sampler2DShadow uShadow; uniform mat4 uShadowM; uniform float uShadowOn;
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
  return c+vec3(1.4,0.75,0.3)*pow(sd,20.0)*0.9;
}
bool inHole(vec3 p){ return p.x>0.0 && length(vec2(p.y-${TY.toFixed(1)},p.z))<${TR.toFixed(2)}; }
vec3 shade(vec3 alb, vec3 n, vec3 p, float spec, float sss){
  float ih=inHive(p);
  vec3 V=normalize(uCam-p);
  float nd=dot(n,uSun);
  float shd=ih>0.99? 1.0 : sunShadow(p,n);
  vec3 sunC=vec3(2.9,2.1,1.3);
  float back=pow(max(dot(-V,uSun),0.0),2.0);
  vec3 lo=alb*( sunC*shd*max(nd,0.0) + sunC*shd*sss*(0.45*max(-nd,0.0)+0.9*back)
     + vec3(0.22,0.30,0.50)*(0.55+0.45*n.y)*(0.75+0.25*shd) + vec3(0.26,0.19,0.08)*(0.5-0.5*n.y) );
  vec3 H=normalize(uSun+V); lo+=sunC*shd*spec*pow(max(dot(n,H),0.0),48.0)*step(0.0,nd);
  lo+=vec3(1.1,0.75,0.42)*spec*0.6*pow(1.0-max(dot(n,V),0.0),4.0)*(0.3+0.7*shd);
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
  const g = new THREE.CylinderGeometry(r, r, len, 5, 1);
  g.applyQuaternion(new Q4().setFromUnitVectors(new V3(0, 1, 0), d.normalize()));
  const m = A.add(B).multiplyScalar(0.5); g.translate(m.x, m.y, m.z); return g;
}

// ---------- sky ----------
const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 20), mat(`
void main(){ vec3 dir=normalize(vL); float e=dir.y;
  vec3 hz=hazeCol(dir), zen=vec3(0.07,0.17,0.46);
  vec3 c=mix(hz,zen,pow(clamp(e,0.,1.),0.5));
  float sd=max(dot(dir,uSun),0.);
  c+=vec3(1.5,0.85,0.35)*(pow(sd,5.)*0.35+pow(sd,60.)*1.4)+vec3(30.,22.,12.)*smoothstep(0.9992,0.9996,sd);
  vec2 cu=dir.xz/(abs(dir.y)+0.14)*1.3; float cl=fbm(cu+uTime*0.004);
  cl=smoothstep(0.50,0.80,cl)*smoothstep(0.02,0.2,e);
  float thick=fbm(cu*3.0);
  vec3 cloudC=mix(vec3(0.78,0.66,0.72), vec3(1.9,1.25,0.7), pow(sd,3.0))*(0.7+0.35*thick);
  cloudC+=vec3(2.2,1.2,0.5)*pow(sd,12.0)*(1.0-thick)*1.2;
  c=mix(c, cloudC, cl*0.85);
  float az=atan(dir.z,dir.x); vec2 ac=vec2(cos(az),sin(az));
  float hh=0.03+0.035*vnoise(ac*3.0+2.0)+0.012*vnoise(ac*11.0);
  c=mix(c, mix(vec3(0.20,0.24,0.20),hz,0.62), smoothstep(hh,hh-0.004,e));
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
const combUniforms = { uHoney: { value: 0 }, uPulse: { value: 0 }, uBirth: { value: new THREE.Vector4(BIRTH_ID.x, BIRTH_ID.y, 0, 1) } };
const combFrag = `
uniform float uHoney; uniform float uPulse; uniform vec4 uBirth; uniform float uCombZ;
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
const BEE_VERT = VERT.replace('void main(){', 'uniform float uTime; attribute vec4 aMove;\nvoid main(){').replace('vec4 w = m*vec4(position,1.0);', `vec3 pp=position; float isLeg=0.0;
  #ifdef USE_COLOR
  isLeg=step(abs(color.r-0.05),0.004)*step(abs(color.g-0.03),0.004)*step(abs(color.b-0.02),0.003);
  #endif
  float reach=clamp((abs(pp.x)-0.06)/0.3,0.0,1.0); float ph=aMove.z, fl=aMove.w;
  float wig=sin(uTime*(5.0+fl*5.0)+ph+pp.z*7.0+sign(pp.x)*1.9);
  pp.z-=isLeg*reach*(aMove.x*0.24+wig*0.04*(0.5+fl));
  pp.x+=isLeg*reach*aMove.y*0.17*(1.0+0.3*sign(pp.x));
  pp.y-=isLeg*reach*fl*(0.08+0.035*wig);
  float abd=smoothstep(-0.1,-0.45,pp.z)*(1.0-isLeg);
  pp.y+=abd*(sin(uTime*3.1+ph)*0.07*(0.3+fl)-aMove.x*0.08)*(-pp.z);
  pp.x+=abd*aMove.y*0.10*(-pp.z);
  float head=smoothstep(0.24,0.34,pp.z)*(1.0-isLeg);
  pp.x+=head*aMove.y*0.05; pp.y+=head*(sin(uTime*1.7+ph)*0.012-aMove.x*0.02);
  vec4 w = m*vec4(pp,1.0);`);
const beeGeo = (() => {
  const amber = [0.62, 0.33, 0.06], dark = [0.05, 0.03, 0.018], fuzz = [0.25, 0.15, 0.05], leg = [0.05, 0.03, 0.02];
  const parts = [
    { g: ell(0.2, 0.19, 0.34, 0, 0, -0.27, 18), c: amber },
    { g: ell(0.175, 0.17, 0.185, 0, 0.03, 0.13, 16), c: fuzz },
    { g: ell(0.155, 0.15, 0.115, 0, 0.0, 0.37, 14), c: [0.10, 0.065, 0.04] },
    { g: ell(0.075, 0.1, 0.07, 0.115, 0.02, 0.385, 10), c: [0.012, 0.01, 0.01] }, { g: ell(0.075, 0.1, 0.07, -0.115, 0.02, 0.385, 10), c: [0.012, 0.01, 0.01] },
  ];
  for (const s of [1, -1]) {
    parts.push({ g: stick([s * 0.05, 0.09, 0.44], [s * 0.09, 0.2, 0.52], 0.012), c: leg }, { g: stick([s * 0.09, 0.2, 0.52], [s * 0.15, 0.15, 0.72], 0.01), c: leg });
    for (const [z0, z1] of [[0.24, 0.42], [0.12, 0.12], [0.0, -0.25]]) {
      parts.push({ g: stick([s * 0.1, -0.08, z0], [s * 0.3, 0.0, (z0 + z1) / 2], 0.011), c: leg }, { g: stick([s * 0.3, 0.0, (z0 + z1) / 2], [s * 0.36, -0.2, z1], 0.008), c: leg });
    }
  }
  return geoParts(parts);
})();
const MAXB = 260; const beeMove = new Float32Array(MAXB * 4); beeGeo.setAttribute('aMove', new THREE.InstancedBufferAttribute(beeMove, 4));
const beeMat = mat(`void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW);
  float fz=hash21(floor(vL.xy*90.0)+floor(vL.z*90.0)); float isF=smoothstep(0.2,0.5,vC.g/(vC.r+0.001)-0.3)*step(0.2,vC.r);
  vec3 alb=vC*(0.8+0.45*fz);
  if(vC.r>0.5){ float t=(vL.z+0.61)/0.68; float band=smoothstep(-0.25,0.3,sin(t*17.0+0.6))*smoothstep(0.1,0.2,t); alb=mix(vec3(0.035,0.02,0.012),vec3(0.60,0.30,0.05)*(0.8+0.4*fz),band); alb*=mix(0.7,1.0,smoothstep(-0.1,0.05,vL.y)); }
  float rimv=pow(1.0-max(dot(n,V),0.0),2.0);
  float lum=dot(alb,vec3(0.33)); float hard=1.0-smoothstep(0.02,0.12,lum);
  vec3 c=shade(alb,n,vW,0.15+0.9*hard,0.25);
  c+=shade(vec3(0.75,0.55,0.25),n,vW,0.0,1.0)*rimv*0.28*(1.0-hard);
  gl_FragColor=vec4(finish(c,vW),1.0); }`, { vertexColors: true, vert: BEE_VERT });
const beeMesh = new THREE.InstancedMesh(beeGeo, beeMat, MAXB); beeMesh.frustumCulled = false; scene.add(beeMesh);
const wingGeo = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(0.12, 0.12, 0.48, 0.14, 0.56, 0.02); s.bezierCurveTo(0.5, -0.1, 0.15, -0.08, 0, 0); const g = new THREE.ShapeGeometry(s, 8); g.rotateX(-Math.PI / 2); return g; })();
const wingMat = mat(`void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW); float f=pow(1.0-abs(dot(n,V)),2.0);
  vec3 irid=0.5+0.5*cos(6.28*(f*1.5+vec3(0.0,0.33,0.67)));
  float vein=smoothstep(0.75,1.0,abs(sin(vL.x*30.0+vL.z*40.0)))*0.25;
  vec3 c=shade(mix(vec3(0.75,0.72,0.65),irid,0.35*f)+vein*0.1,n,vW,1.2,1.0);
  gl_FragColor=vec4(finish(c,vW),0.16+0.4*f+vein*0.3); }`, { transparent: true, depthWrite: false, side: THREE.DoubleSide });
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
  b.update = (dt, t) => { if (!b.active) b.tp.set(Math.cos(t * f + a) * r, yy + Math.sin(t * 0.5 + a), Math.sin(t * f * 1.2 + a) * r);
    b.p.lerp(b.tp, Math.min(1, dt * (b.active ? 3.2 : 1.2))); b.p.y += Math.sin(t * 5 + b.ph) * 0.004;
    if (b.active && b.look) { _v.copy(b.look).sub(b.p); b.fwd.lerp(_v.normalize(), Math.min(1, dt * 6)); orient(b.q, b.fwd, YA); b.q.multiply(_q.setFromAxisAngle(ZA, Math.sin(t * 9 + b.ph) * 0.07)); b.prev.copy(b.p); } else b.face(dt); }; return b; }
const hero = makeScripted(), greeters = [makeScripted(), makeScripted(), makeScripted()];
const _wm = new M4(), _bm = new M4(), _t = new M4(), _r = new M4(), _sc = new M4();
function updateBees(dt, t) {
  const n = bees.length; beeMesh.count = n; wingMesh.count = n * 2;
  for (let i = 0; i < n; i++) {
    const b = bees[i]; b.update(dt, t);
    if (!b.lp) { b.lp = b.p.clone(); b.mx = 0; b.my = 0; }
    if (dt > 0) { if (b.vel) _v.copy(b.vel); else _v.copy(b.p).sub(b.lp).multiplyScalar(1 / dt); b.lp.copy(b.p); _q.copy(b.q).invert(); _v.applyQuaternion(_q);
      b.ax = b.ax === undefined ? 0 : b.ax; const fz = clamp(_v.z * 0.05, -0.8, 1.4); b.mx = lerp(b.mx, fz + (fz - (b.pz || 0)) * 0.0, Math.min(1, dt * 4)); b.pz = fz;
      b.my = lerp(b.my, b.bank !== undefined ? b.bank : clamp(-_v.x * 0.08, -1, 1), Math.min(1, dt * 5)); }
    beeMove[i * 4] = b.mx; beeMove[i * 4 + 1] = b.my; beeMove[i * 4 + 2] = b.ph * 7; beeMove[i * 4 + 3] = b.fly ? 1 : 0;
    _bm.compose(b.p, b.q, b.s); beeMesh.setMatrixAt(i, _bm);
    for (let s = 0; s < 2; s++) {
      const sg = s ? -1 : 1;
      const flap = b.fly ? Math.sin(t * 190 + b.ph + i) * 0.85 + 0.15 : 0.03, sweep = b.fly ? 0.25 : 1.25;
      _t.makeTranslation(sg * 0.09, 0.19, 0.16); _r.makeRotationZ(sg * flap); _t.multiply(_r); _r.makeRotationY(sg * sweep); _t.multiply(_r); _sc.makeScale(sg * 1.15, 1, 1.15); _t.multiply(_sc);
      _wm.multiplyMatrices(_bm, _t); wingMesh.setMatrixAt(i * 2 + s, _wm);
    }
  }
  beeMesh.instanceMatrix.needsUpdate = true; wingMesh.instanceMatrix.needsUpdate = true; beeGeo.attributes.aMove.needsUpdate = true;
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
      vec4 mv=viewMatrix*vec4(p,1.0); float dz=-mv.z; vA=smoothstep(0.15,0.8,dz)*(0.4+0.6*sin(uTime*0.9+aP*7.0));
      ${wrap ? 'float ih=(1.0-smoothstep(11.6,12.4,length(p.xz)))*step(-0.5,p.y)*step(p.y,22.6); vA*=1.0-ih;' : 'vA*=step(length(p.xz),9.6)*(0.35+60.0/(10.0+dot(p-vec3(10.6,3.0,0.0),p-vec3(10.6,3.0,0.0))));'}
      gl_PointSize=min(${size.toFixed(1)}*(0.6+fract(aP)*0.9)/max(dz,0.2), 60.0); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: UNTONE + `uniform float uAmt; varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.25,d)*(0.55+0.45*smoothstep(0.3,0.45,d)); gl_FragColor=vec4(untone(vec3(${colr})*a*vA*uAmt)*1.4,1.0); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return m;
}
makeMotes(320, new V3(10, 11, 10), new V3(0, 11, 0), false, 22, '0.40,0.27,0.10');
makeMotes(260, new V3(22, 14, 22), new V3(), true, 60, '0.42,0.33,0.16');

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
    alb*=mix(1.0,0.35,smoothstep(${WY.toFixed(1)},${(WY - 5).toFixed(1)},vW.y));
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.0,0.0),vW),1.0); }`)));
}
const barkMat = mat(`void main(){ if(inHole(vW) && length(vW.xz)<14.0) discard; vec3 n=NORMAL; float a=atan(vW.z,vW.x);
  float rid=fbm(vec2(a*16.0,vW.y*0.16)); float fine=fbm(vec2(a*60.0,vW.y*0.9));
  vec3 alb=mix(vec3(0.07,0.05,0.035),vec3(0.36,0.27,0.19),smoothstep(0.3,0.7,rid))*(0.7+0.6*fine);
  alb=mix(alb,vec3(0.16,0.30,0.06),smoothstep(0.5,0.7,fbm(vec2(a*5.0,vW.y*0.08)+3.0))*smoothstep(25.0,-12.0,vW.y)*0.8);
  n=normalize(n+vec3(0.0,(rid-0.5)*0.8,0.0));
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.02,0.0),vW),1.0); }`);
function trunkGeo(R, base, top) { return new THREE.LatheGeometry([[R + 9, base - 5], [R + 4, base + 3], [R + 1.2, base + 9], [R, base + 13], [R, top * 0.6], [R * 0.85, top]].map(a => new THREE.Vector2(a[0], a[1])), 48); }
scene.add(new THREE.Mesh(trunkGeo(ROUT, GY, 90), barkMat));
{ const g = new THREE.TorusGeometry(TR + 0.35, 0.5, 10, 28); g.rotateY(Math.PI / 2); const m = new THREE.Mesh(g, barkMat); m.position.set(ROUT - 0.1, TY, 0); m.scale.set(0.6, 1, 1); scene.add(m); }
const leafMat = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vL.xy*6.0+vL.z*4.0); n=normalize(n+(vec3(fbm(vL.yz*9.0),fbm(vL.xz*9.0),fbm(vL.xy*9.0))-0.5)*1.2);
  vec3 alb=mix(vec3(0.03,0.11,0.02),vec3(0.22,0.40,0.06),a); gl_FragColor=vec4(finish(shade(alb,n,vW,0.1,0.7),vW),1.0); }`);
const blobG = new THREE.IcosahedronGeometry(1, 3);
function canopy(x, y, z, r, n) { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(blobG, leafMat); const a = rnd(TAU), d = rnd(0.2, 1) * r; m.position.set(x + Math.cos(a) * d, y + rnd(-0.25, 0.4) * r, z + Math.sin(a) * d); m.scale.set(r * rnd(0.5, 0.8), r * rnd(0.35, 0.55), r * rnd(0.5, 0.8)); scene.add(m); } }
canopy(0, 95, 0, 55, 9);
for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + rnd(0.4), d = rnd(260, 420), x = Math.cos(a) * d, z = Math.sin(a) * d, R = rnd(6, 11), b = terrainH(x, z); const t = new THREE.Mesh(trunkGeo(R, b, 70), barkMat); t.position.set(x, 0, z); scene.add(t); canopy(x, b + 80, z, rnd(35, 50), 6); }
// grass
let grassMesh;
{
  const N = 34000, off = new Float32Array(N * 3), par = new Float32Array(N * 4); let n = 0, guard = 0;
  while (n < N && guard++ < N * 4) { const a = rnd(TAU), d = Math.sqrt(Math.random()) * 330 + 14, x = Math.cos(a) * d, z = Math.sin(a) * d, h = terrainH(x, z); if (h < WY + 0.6) continue;
    off[n * 3] = x; off[n * 3 + 1] = h - 0.2; off[n * 3 + 2] = z; par[n * 4] = rnd(4, 11) * (h < WY + 3 ? 1.5 : 1); par[n * 4 + 1] = rnd(TAU); par[n * 4 + 2] = rnd(TAU); par[n * 4 + 3] = rnd(0.7, 1.25); n++; }
  const g = new THREE.InstancedBufferGeometry(); g.instanceCount = n;
  g.setAttribute('position', new THREE.Float32BufferAttribute([-.5, 0, 0, .5, 0, 0, -.5, .5, 0, .5, .5, 0, 0, 1, 0], 3)); g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3)); g.setAttribute('aPar', new THREE.InstancedBufferAttribute(par, 4));
  const m = mat(`varying float vH; varying float vT; void main(){ vec3 n=NORMAL; vec3 alb=mix(vec3(0.03,0.10,0.02),vec3(0.34,0.50,0.10),vH)*vT;
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
  { p: [0.92, 0.90, 0.84], c: [0.85, 0.50, 0.04], np: [12, 16], len: [2.6, 3.6] },
  { p: [0.86, 0.22, 0.42], c: [0.80, 0.55, 0.05], np: [7, 9], len: [3.0, 4.2] },
  { p: [0.38, 0.20, 0.78], c: [0.85, 0.62, 0.08], np: [9, 12], len: [2.4, 3.4] },
  { p: [0.95, 0.66, 0.05], c: [0.20, 0.10, 0.03], np: [13, 18], len: [3.0, 4.4] },
  { p: [0.80, 0.07, 0.03], c: [0.05, 0.03, 0.04], np: [5, 6], len: [3.4, 4.4] },
  { p: [0.16, 0.30, 0.85], c: [0.92, 0.85, 0.5], np: [5, 7], len: [2.2, 3.0] }];
{
  const place = (x, z) => { if (terrainH(x, z) < WY + 1.5 || Math.hypot(x, z) < 22) return; if (Math.hypot(x - LOG.c.x, z - LOG.c.z) < 30 || Math.abs(Math.hypot(x - ORCH.x, z - ORCH.z) - HEDGE_R) < 10) return; const ty = (Math.random() * PAL.length) | 0, T = PAL[ty];
    for (const f of flowers) if (Math.hypot(f.x - x, f.z - z) < 7) return;
    flowers.push({ x, z, y: terrainH(x, z) + rnd(9, 22), r: rnd(1.0, 1.7), T, np: Math.round(rnd(T.np[0], T.np[1])), len: rnd(T.len[0], T.len[1]), cool: 0, tilt: rnd(0.05, 0.45), ax: rnd(-0.12, 0.12), az: rnd(-0.12, 0.12), val: 1, orch: Math.hypot(x - ORCH.x, z - ORCH.z) < HEDGE_R }); };
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
  let guard = 0; while (flowers.length < 120 && guard++ < 3000) place(FDIR.x * FIELD_D + gauss() * 62, FDIR.z * FIELD_D + gauss() * 62);
  for (let i = 0; i < 7; i++) { const a = rnd(-1.2, 1.9), d = rnd(28, 70); place(Math.cos(a) * d, Math.sin(a) * d); }
  guard = 0; while (flowers.length < 185 && guard++ < 3000) { const a = rnd(TAU), d = rnd(40, 310); place(Math.cos(a) * d, Math.sin(a) * d); }
  // sunblooms crown the orchard canopies (rare, worth 3)
  const SUNPAL = { p: [1.3, 0.85, 0.12], c: [0.95, 0.38, 0.02] };
  for (const t of orchTrees) flowers.push({ x: t.x + srnd(-2, 2), z: t.z + srnd(-2, 2), y: t.top + t.cr * 0.68 + 0.4, r: 1.5, T: SUNPAL, np: 14, len: 3.2, cool: 0, tilt: 0.2, ax: 0, az: 0, val: 3, orch: true });
  for (let i = 0; i < 30; i++) { const a = srnd(TAU), d = Math.sqrt(srnd()) * (ORCH.r - 5), x = ORCH.x + Math.cos(a) * d, z = ORCH.z + Math.sin(a) * d;
    if (orchTrees.some(t => Math.hypot(t.x - x, t.z - z) < t.cr + 2) || flowers.some(f => Math.hypot(f.x - x, f.z - z) < 7)) continue; const T = PAL[(srnd() * PAL.length) | 0];
    flowers.push({ x, z, y: terrainH(x, z) + srnd(8, 15), r: srnd(1, 1.6), T, np: Math.round(srnd(T.np[0], T.np[1])), len: srnd(T.len[0], T.len[1]), cool: 0, tilt: srnd(0.05, 0.45), ax: 0, az: 0, val: 1, orch: true }); }
  { const H = HILLS[0]; flowers.push({ x: H.x, z: H.z, y: terrainH(H.x, H.z) + 30, r: 5.5, T: { p: [1.2, 0.72, 0.04], c: [0.22, 0.11, 0.03] }, np: 28, len: 12, cool: 0, tilt: 0.25, ax: 0.1, az: -0.05, val: 5, giant: true, sw: 3.5 }); }
  for (const sg of [-1, 1]) { const c = LOG.c.clone().addScaledVector(LOG.axis, sg * 9); flowers.push({ x: c.x, z: c.z, y: c.y - LOG.ri + 1.1, r: 0.8, T: { p: [0.6, 1.15, 0.8], c: [0.9, 1.0, 0.6] }, np: 7, len: 1.6, cool: 0, tilt: 0.2, ax: 0, az: 0, val: 2, inLog: true }); }
  const pg = new THREE.PlaneGeometry(1, 1, 6, 4); pg.rotateX(-Math.PI / 2); pg.translate(0.5, 0, 0);
  { const p = pg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const prof = Math.sin(Math.PI * Math.pow(x, 0.62)) * 0.9 + 0.12; p.setZ(i, z * prof); p.setY(i, 0.22 * x * x - 0.5 * z * z * prof + Math.sin(x * 9) * 0.01); } pg.computeVertexNormals(); }
  const totalP = flowers.reduce((s, f) => s + f.np, 0);
  const petalMat = mat(`void main(){ vec3 n=NORMAL; float v=vUv.x; float across=abs(vUv.y-0.5)*2.0;
    vec3 base=vC*(0.72+0.38*v)*(0.9+0.2*vnoise(vUv*vec2(6.0,40.0)));
    base=mix(base, base*0.7, pow(abs(sin(vUv.y*22.0)),8.0)*0.4);
    float reveal=smoothstep(60.0,16.0,length(vW-uCam));
    float guide=smoothstep(0.62,0.12,v); float veins=pow(abs(sin(vUv.y*15.7)),10.0)*smoothstep(0.95,0.3,v);
    vec3 uvc=mix(vec3(0.30,0.06,0.95),vec3(0.10,0.95,0.90),0.5+0.5*sin(uTime*1.6+v*10.0));
    float k=reveal*clamp(guide*0.75+veins*0.6,0.0,1.0);
    vec3 c=shade(mix(base,base*0.35,k*0.8),n,vW,0.12,1.0)+uvc*k*0.9;
    gl_FragColor=vec4(finish(c,vW),1.0); }`, { side: THREE.DoubleSide });
  const swayV = (stem, centre) => SWAYGLSL + VERT.replace('vec4 w = m*vec4(position,1.0);', `vec4 w = m*vec4(position,1.0); vec2 o=vec2(m[3][0],m[3][2])${centre ? '' : ''}; w.xz += sway(o)*aSway${stem ? '*position.y*position.y' : ''};`);
  petalMat.vertexShader = swayV(false);
  const petals = new THREE.InstancedMesh(pg, petalMat, totalP); petals.frustumCulled = false;
  const cen = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 8), mat(`void main(){ vec3 n=NORMAL; float dots=vnoise(vL.xz*22.0); vec3 alb=vC*(0.55+0.8*dots); n=normalize(n+(dots-0.5)*0.6);
    gl_FragColor=vec4(finish(shade(alb,n,vW,0.1,0.3),vW),1.0); }`, { vert: swayV(false) }), flowers.length); cen.frustumCulled = false;
  const stemG = new THREE.CylinderGeometry(0.14, 0.22, 1, 6); stemG.translate(0, 0.5, 0);
  const stems = new THREE.InstancedMesh(stemG, simple('0.12,0.30,0.05', 0.2, 0.4, { vert: swayV(true) }), flowers.length); stems.frustumCulled = false;
  const m = new M4(), q = new Q4(), e = new THREE.Euler(), col = new THREE.Color(); let pi = 0;
  const swP = new Float32Array(totalP), swF = new Float32Array(flowers.length);
  flowers.forEach((f, i) => {
    f.sway = f.giant ? 0.25 : (f.val >= 3 || f.inLog) ? 0 : 1; swF[i] = f.sway;
    const gy = terrainH(f.x, f.z);
    m.compose(new V3(f.x, gy - 0.5, f.z), q.identity(), new V3(f.sw || 1, f.y - gy + 0.3, f.sw || 1)); stems.setMatrixAt(i, m);
    const hq = new Q4().setFromEuler(new THREE.Euler(f.ax, 0, f.az));
    m.compose(new V3(f.x, f.y, f.z), hq, new V3(f.r, f.r * 0.5, f.r)); cen.setMatrixAt(i, m); cen.setColorAt(i, col.setRGB(...f.T.c));
    for (let k = 0; k < f.np; k++) { const a = k / f.np * TAU + i; e.set(0, a, f.tilt + rnd(-0.06, 0.06), 'YXZ'); q.setFromEuler(e).premultiply(hq);
      const off = new V3(f.r * 0.75, -0.1, 0).applyQuaternion(q); const sh = rnd(0.85, 1.1);
      m.compose(new V3(f.x + off.x, f.y + off.y, f.z + off.z), q, new V3(f.len, f.len, f.len * Math.min(1.1, 7.5 / f.np))); petals.setMatrixAt(pi, m); petals.setColorAt(pi, col.setRGB(f.T.p[0] * sh, f.T.p[1] * sh, f.T.p[2] * sh)); swP[pi] = f.sway; pi++; }
  });
  pg.setAttribute('aSway', new THREE.InstancedBufferAttribute(swP, 1)); cen.geometry.setAttribute('aSway', new THREE.InstancedBufferAttribute(swF, 1)); stemG.setAttribute('aSway', new THREE.InstancedBufferAttribute(swF, 1));
  scene.add(petals, cen, stems);
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
    shrooms.push({ x, y: gy + h, z, R, mesh: c, sq: 0 });
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
  let guard = 0; while (pads.length < 11 && guard++ < 500) { const a = rnd(TAU), d = rnd(8, POND.r - 6), x = POND.x + Math.cos(a) * d, z = POND.z + Math.sin(a) * d; if (!overWater(x, z) || terrainH(x, z) > WY - 1.2) continue; if (pads.some(p => Math.hypot(p.x - x, p.z - z) < p.r + 9)) continue;
    const r = rnd(4, 7.5), m = new THREE.Mesh(padG, padM); m.position.set(x, WY + 0.06, z); m.scale.set(r, 1, r); m.rotation.y = rnd(TAU); m.renderOrder = 3; scene.add(m); pads.push({ x, z, r, mesh: m, dip: 0 }); }
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

// ================= ORCHARD ZONE, HEDGE, LOG, WEBS, WASPS =================
// layout is generated from a fixed seed so landmarks stay put between visits
const blossomMat = mat(`void main(){ vec3 n=NORMAL; float a=fbm(vW.xz*0.45+vW.y*0.3); float b=fbm(vW.xz*1.4+vW.y*1.1); float sp=vnoise(vW.xz*7.0+vW.y*5.0);
  n=normalize(n+(vec3(fbm(vW.yz*1.3),fbm(vW.xz*1.3),fbm(vW.xy*1.3))-0.5)*1.2);
  vec3 leaf=mix(vec3(0.05,0.14,0.03),vec3(0.24,0.40,0.07),a);
  vec3 bl=mix(vec3(0.92,0.38,0.58),vec3(1.0,0.80,0.84),sp*sp)*(0.8+0.3*sp);
  vec3 alb=mix(leaf,bl,smoothstep(0.38,0.55,b+0.15*sp)*0.92);
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
  blobs.forEach((b, i) => { q.setFromEuler(new THREE.Euler(srnd(-0.3, 0.3), srnd(TAU), srnd(-0.3, 0.3))); m4.compose(new V3(b[0], b[1], b[2]), q, new V3(b[3], b[4], b[3])); im.setMatrixAt(i, m4); });
  im.frustumCulled = false; scene.add(im);
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
// wasps: slimmer, brighter, meaner-looking cousins of the bees
const waspMat = new THREE.ShaderMaterial({ uniforms: beeMat.uniforms, vertexShader: beeMat.vertexShader, vertexColors: true,
  fragmentShader: beeMat.fragmentShader.replace('vec3(0.60,0.30,0.05)*(0.8+0.4*fz)', 'vec3(1.05,0.78,0.02)*(0.85+0.3*fz)').replace('sin(t*17.0+0.6)', 'sin(t*23.0+0.6)').replace('vec3 alb=vC*(0.8+0.45*fz);', 'vec3 alb=vC*(0.8+0.45*fz)*vec3(0.5,0.45,0.3);') });
const WASPN = 6;
const waspMesh = new THREE.InstancedMesh(beeGeo, waspMat, WASPN); waspMesh.frustumCulled = false; scene.add(waspMesh);
const waspWings = new THREE.InstancedMesh(wingGeo, wingMat, WASPN * 2); waspWings.frustumCulled = false; scene.add(waspWings);
const wasps = [];
{
  const mh = new V3(FDIR.x * (FIELD_D + 40) - FDIR.z * 35, 0, FDIR.z * (FIELD_D + 40) + FDIR.x * 35); mh.y = terrainH(mh.x, mh.z) + 14;
  wasps.push({ home: mh, R: 38, orchard: false });
  wasps.push({ home: NEST.clone(), R: 30, orchard: true }, { home: NEST.clone(), R: 45, orchard: true }, { home: new V3(0, -500, 0), R: 0, raider: true }, { home: new V3(0, -500, 0), R: 0, raider: true });
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
  if (!A.ctx) return; const c = A.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
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
function look(dx, dy) { P.yaw -= dx * 0.0023; P.pitch = clamp(P.pitch - dy * 0.0023, -1.5, 1.5); P.yawRate -= dx * 0.0023; }
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
function takeOff() { P.mode = 'fly'; P.vel.set(0, 1.2, 1.6); sweep(120, 210, 0.5, 0.05, 'sawtooth'); if (!P.flown) { P.flown = true; hint('<kbd>W</kbd> fly &nbsp; <kbd>space</kbd> rise &nbsp; <kbd>shift</kbd> sink', 8); } }
function rebirth() { P.lives++; P.mode = 'cell'; P.t = 0; P.chews = 0; P.pollen = 0; P.load = []; P.stuck = 0; P.wet = 0; P.wingsReady = false; P.wingT = 0; P.vel.set(0, 0, 0); P.pos.set(BIRTH.x, BIRTH.y, BIRTH.z - 0.72); P.yaw = Math.PI; P.pitch = 0; resetCap(); hero.active = false; fish.userData.mouth.scale.setScalar(0.02); tone(261.6, 0.07, 3); tone(392, 0.05, 3, 'sine', 0.4); }
$('title').addEventListener('click', () => {
  initAudio(); if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
  $('title').style.opacity = 0; setTimeout(() => $('title').style.display = 'none', 1700);
  P.mode = 'cell'; P.t = 0; lockPointer();
});
function lockPointer() { try { const r = canvas.requestPointerLock && canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (e) { } }
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; });
canvas.addEventListener('mousedown', e => { if (!locked) { lockPointer(); dragging = true; } action(); });
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
  for (const t of orchTrees) { const dx = p.x - t.x, dz = p.z - t.z, dh = Math.hypot(dx, dz); if (dh > t.cr * 1.6 + 3) continue;
    if (p.y < t.top - t.cr * 0.3 && dh < t.R + PR + 0.8) { const k = (t.R + PR + 0.8) / Math.max(dh, 0.01); p.x = t.x + dx * k; p.z = t.z + dz * k; }
    if (t.blobs) for (const b of t.blobs) { const bx = p.x - b[0], by = (p.y - b[1]) * b[3] / b[4], bz = p.z - b[2], dd = Math.hypot(bx, by, bz), rr = b[3] * 1.02 + PR; if (dd < rr) { const k = rr / Math.max(dd, 0.01); p.x = b[0] + bx * k; p.y = b[1] + by * k * b[4] / b[3]; p.z = b[2] + bz * k; v.multiplyScalar(0.7); } } }
  { const A = LOG.axis, dx = p.x - LOG.c.x, dy = p.y - LOG.c.y, dz = p.z - LOG.c.z, u = dx * A.x + dy * A.y + dz * A.z;
    if (Math.abs(u) < LOG.len / 2 + PR) { const px = dx - A.x * u, py = dy - A.y * u, pz = dz - A.z * u, r = Math.hypot(px, py, pz);
      if (r < LOG.ro + PR && r > LOG.ri - PR) { const t = r < (LOG.ri + LOG.ro) / 2 ? LOG.ri - PR : LOG.ro + PR, k = t / Math.max(r, 0.01); p.x = LOG.c.x + A.x * u + px * k; p.y = LOG.c.y + A.y * u + py * k; p.z = LOG.c.z + A.z * u + pz * k; } } }
  archCollide(p);
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
  camera.rotation.set(P.pitch, P.yaw, 0); camera.getWorldDirection(fwd); right.set(1, 0, 0).applyQuaternion(camera.quaternion);
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
      if (P.chews >= 3 && !hero.active) { hero.active = true; hero.look = new V3(BIRTH.x, BIRTH.y, BIRTH.z - 0.5); if (hero.p.distanceTo(P.pos) > 6) hero.p.set(BIRTH.x + 2, BIRTH.y + 1.5, BIRTH.z + 1.4); }
      if (hero.active) hero.tp.set(BIRTH.x + Math.sin(time * 0.9) * 0.08, BIRTH.y + 0.02 + Math.sin(time * 1.4) * 0.05, BIRTH.z + 0.62); }
  } else if (P.mode === 'emerge') {
    const f = smooth(0, 1.8, P.t); P.pos.set(BIRTH.x, BIRTH.y, lerp(BIRTH.z - 0.62, BIRTH.z + 0.42, f)); P.pos.y += Math.sin(P.t * 9) * 0.012;
    hero.active = true; if (!hero.look) hero.look = new V3(); hero.tp.set(BIRTH.x + 0.9, BIRTH.y + 0.35, BIRTH.z + 1.15); hero.look.copy(P.pos);
    if (P.t > 1.8) { P.mode = 'crawl'; P.t = 0; heroT = 0; if (P.lives === 1) hint('<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk &nbsp;·&nbsp; mouse look', 7); }
  } else if (P.mode === 'crawl') {
    const c = COMBS[BIRTH.ci];
    tmp.set(fwd.x, fwd.y, 0); if (tmp.length() < 0.35) { tmp.set(0, 1, 0).applyQuaternion(camera.quaternion); tmp.z = 0; if (fwd.z > 0) tmp.multiplyScalar(-1); } tmp.normalize();
    _v.set(right.x, right.y, 0); if (_v.lengthSq() > 1e-4) _v.normalize();
    const sp = 1.7; P.pos.x += (tmp.x * kf + _v.x * ks) * sp * dt; P.pos.y += (tmp.y * kf + _v.y * ks) * sp * dt;
    P.pos.x = clamp(P.pos.x, -c.hw + 0.3, c.hw - 0.3); P.pos.y = clamp(P.pos.y, c.yb + 0.4, HTOP - 0.5); P.pos.z = c.z + CT / 2 + 0.42;
    if (kf || ks) bob += dt * 11;
    // the sister's greeting
    heroT += dt; if (hero.active) { if (heroT < 5) { hero.tp.copy(P.pos).addScaledVector(fwd, 0.85); hero.tp.z = clamp(hero.tp.z, c.z + 1.0, c.z + 2.0); hero.look.copy(P.pos); if (heroT > 1.2 && !hero.fed) { hero.fed = true; tone(659.25, 0.1, 2); tone(880, 0.08, 2.2, 'sine', 0.18); puff(hero.p, 8, [1, 0.8, 0.3], 0.4, 0.01, 1.2); } } else { hero.active = false; hero.fed = false; } }
    P.wingT += dt; if (!P.wingsReady && P.wingT > (P.lives > 1 ? 3 : 7)) { P.wingsReady = true; sweep(90, 200, 0.7, 0.06, 'sawtooth'); hint('<kbd>space</kbd>', 30); }
    if (P.wingsReady && touchFwd && P.wingT > 9) takeOff();
  } else if (P.mode === 'fly') {
    const maxS = lerp(5.5, 30 * G.speed * (1 + 0.4 * Math.min(1, G.boost)), outF) * (1 - 0.075 * G.weight * P.pollen), damp = lerp(2.4, kf > 0 ? 1.6 : 3.6, outF);
    acc.set(0, 0, 0).addScaledVector(fwd, kf).addScaledVector(right, ks * 0.8); acc.y += ku * 0.8; thrust = Math.min(1, acc.length());
    acc.multiplyScalar(maxS * damp); if (ku > 0) acc.y *= 1 - P.wet * 0.6;
    acc.y -= P.wet * 9 + P.pollen * 0.6 * G.weight * outF;
    G.kf = kf; G.ku = ku; airForces(acc, dt); summitForces(acc, dt);
    if (P.pollen > 0) { acc.x += Math.sin(time * 2.3) * P.pollen * 0.5; acc.y += Math.sin(time * 3.1) * P.pollen * 0.45; }
    if (!inHive) { const r = Math.hypot(P.pos.x, P.pos.z); if (r > 330) { acc.x -= P.pos.x / r * (r - 330) * 0.6; acc.z -= P.pos.z / r * (r - 330) * 0.6; } if (P.pos.y > 62) acc.y -= (P.pos.y - 62) * 1.5; }
    P.vel.addScaledVector(acc, dt); P.vel.multiplyScalar(Math.max(0, 1 - damp * dt));
    if (!inHive) { const hv = Math.hypot(P.vel.x, P.vel.z), fl = Math.hypot(fwd.x, fwd.z); if (hv > 4 && kf > 0 && fl > 0.2) { const k = Math.min(1, dt * 1.6 * outF); P.vel.x += (fwd.x / fl * hv - P.vel.x) * k; P.vel.z += (fwd.z / fl * hv - P.vel.z) * k; }
      if (!ku) P.vel.y *= 1 - Math.min(1, dt * 1.2 * outF); }
    P.pos.addScaledVector(P.vel, dt);
    collide(P.pos, P.vel);
    P.landed = null;
    if (!inHive) {
      for (const f of flowers) { const d = Math.hypot(P.pos.x - f.sx, P.pos.z - f.sz); if (flowerHit(f, d, dt)) {
        if (f.rich > 0 && !(f.orch && !G.orchard)) richSip(f, dt); else if (f.giant) { if (f.cool <= 0 && P.pollen < G.cap) giantSip(f, dt); } else
        if (f.cool <= 0 && P.pollen < G.cap && !(f.orch && !G.orchard)) { f.cool = f.val >= 3 ? 70 : 25; addPollen(f); tone(SCALE[Math.min(7, P.pollen - 1)], 0.13, 2.2); _v.set(f.x, f.y + 0.6, f.z); puff(_v, 26, [1.0, 0.82, 0.25], 2.2, 0.012, 1.8, 0.6, 0.8); } } if (f.cool > 0) f.cool -= dt; }
      for (const s of shrooms) { tmp.set(P.pos.x - s.x, (P.pos.y - s.y) / 0.7, P.pos.z - s.z); const d = tmp.length(); if (d < s.R + 0.45 && tmp.y > -0.2) { tmp.normalize(); P.pos.set(s.x + tmp.x * (s.R + 0.45), s.y + tmp.y * (s.R + 0.45) * 0.7, s.z + tmp.z * (s.R + 0.45)); P.vel.addScaledVector(tmp, 17); P.vel.y += 6; s.sq = 1; sweep(170, 420, 0.25, 0.12); sweep(420, 260, 0.5, 0.06); } s.sq = Math.max(0, s.sq - dt * 2.5); const k = 1 - Math.sin(s.sq * Math.PI) * 0.25 * s.sq; s.mesh.scale.set(s.R * (2 - k), s.R * 0.7 * k, s.R * (2 - k)); }
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
      if (P.deliver > 1.2 && P.pollen > 0 && P.deliver > 1.2 + (P.given || 0) * 0.45) { P.given = (P.given || 0) + 1; gainHoney(P.load.pop() || 1); P.pollen = P.load.length; pulse = 1; tone(SCALE[Math.min(7, P.given + 1)], 0.12, 2.5); tone(SCALE[Math.min(7, P.given + 1)] / 2, 0.06, 2.5); try { localStorage.setItem('honeylight.honey', P.honey.toFixed(3)); } catch (e) { } }
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
  camera.position.copy(camPos); camera.rotation.set(P.pitch, P.yaw, P.roll); camera.updateMatrixWorld(); thirdPerson(dt);
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

  updateWind(dt); updateAirLife(dt); updateBees(dt, time); updateWasps(dt); updateWebs(dt); updateRich(dt); updateWorld(dt); updateParts(dt); updateHud(dt);

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
    birdT -= dt; if (birdT < 0 && outF > 0.5 && P.mode === 'fly') { birdT = rnd(3, 9); const b = rnd(2200, 3600), n = 2 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) setTimeout(() => sweep(b * rnd(0.9, 1.1), b * rnd(1.15, 1.5), 0.09, 0.018), i * rnd(110, 160)); }
  }
}
resetCap();
// ================= GAME: progression, threats, choices =================
const G = { honey: 0, workers: 0, cap: 4, speed: 1, weight: 1, orchard: false, passive: 0, toastT: 0, richT: 12, seenRich: false, seenWasp: false, seenWeb: false, windHintT: 0 };
const UNLOCKS = [
  { at: 8, name: 'Bigger pollen baskets', desc: 'carry 6 pollen', apply: () => G.cap = 6 },
  { at: 20, name: 'The orchard gate opens', desc: 'the hedge winds have calmed. Follow the stone posts', apply: () => G.orchard = true },
  { at: 35, name: 'Strong wings', desc: 'faster flight, pollen feels lighter', apply: () => { G.speed = 1.15; G.weight = 0.55; } },
  { at: 55, name: 'Great pollen baskets', desc: 'carry 8 pollen', apply: () => G.cap = 8 },
  { at: 80, name: 'A sister flies with you', desc: 'when a wasp comes for you, she draws it away', apply: () => G.escorts = Math.max(G.escorts, 1) },
  { at: 120, name: 'Swift wings', desc: 'faster still', apply: () => G.speed = 1.27 },
  { at: 160, name: 'A second sister joins you', desc: 'two decoys against the wasps', apply: () => G.escorts = 2 },
  { at: 210, name: 'Bountiful baskets', desc: 'carry 10 pollen', apply: () => G.cap = 10 },
  { at: 250, name: 'The hive glows gold', desc: 'every comb brimming with honey', apply: () => { } },
];
P.load = [];
try { const s = JSON.parse(localStorage.getItem('honeylight.save2') || 'null'); if (s) { G.honey = s.honey | 0; G.workers = s.workers | 0; } else G.honey = Math.round((P.honey || 0) * 20); } catch (e) { }
function save() { try { localStorage.setItem('honeylight.save2', JSON.stringify({ honey: G.honey, workers: G.workers })); } catch (e) { } }
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
  const html = `<div class="row"><span class="jar"></span><b>${G.honey}</b> honey <span class="dim">· ${G.workers} sister${G.workers === 1 ? '' : 's'} foraging${G.escorts ? ` · ${G.escorts} flying with you` : ''}</span></div><div class="row pips">${pips}</div>` +
    (nu ? `<div class="row dim">next at ${nu.at}: ${nu.name.toLowerCase()}</div>` : '') + (chasing ? '<div class="row warn">a wasp is after your pollen!</div>' : coming ? '<div class="row warn">wasps are coming...</div>' : '') + (P.stuck > 0 ? '<div class="row warn">stuck in a web: tap space!</div>' : '') + (G.holdT > 0.2 && time - (G.holdF ? G.holdF.lastLand : 0) < 0.3 ? `<div class="row warn">hold on... ${'●'.repeat(Math.ceil(G.holdT / 0.7))}</div>` : '') + (GIANT && GIANT.cool > 0 && Math.hypot(P.pos.x - GIANT.x, P.pos.z - GIANT.z) < 30 ? '<div class="row dim">the great sunflower is refilling</div>' : '');
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
    if (slot) { for (let k = 0; k < 30; k++) { const f = flowers[(Math.random() * flowers.length) | 0]; if (f.val > 1 || f.rich > 0 || f.cool > 0 || f.inLog) continue; if (f.orch && !G.orchard) continue; const d = Math.hypot(f.x - P.pos.x, f.z - P.pos.z); if (d < 50 || d > 280) continue;
      f.rich = f.rich0 = rnd(26, 34); slot.f = f; if (!G.seenRich && P.mode === 'fly' && !inHive) { G.seenRich = true; toast('<b>A flower is overflowing with nectar</b><br><span>look for the golden glow, but it won\'t last</span>', 6); } break; } }
  }
}
// --- threats: wasps
const _wm2 = new M4(), _wt = new M4(), _wr = new M4(), _wsc = new M4(), _wv = new V3();
function updateWasps(dt) {
  const flying = P.mode === 'fly' && !inHive;
  wasps.forEach((w, i) => {
    w.t += dt; w.buzzT -= dt;
    const d = w.p.distanceTo(P.pos), active = !w.orchard || G.orchard;
    let target, spd;
    if (w.raider) { const rr = raiderUpdate(w, d, flying, dt);
      if (rr === null) { w.p.set(0, -500, 0); _v2.set(0.001, 0.001, 0.001); _wm2.compose(w.p, w.q, _v2); waspMesh.setMatrixAt(i, _wm2); waspWings.setMatrixAt(i * 2, _wm2); waspWings.setMatrixAt(i * 2 + 1, _wm2); return; }
      if (rr) { target = rr[0]; spd = rr[1]; } }
    if (target) { }
    else if (w.state === 'patrol') {
      const a = time * 0.35 + w.ph; target = _wv.set(w.home.x + Math.cos(a) * w.R, w.home.y + Math.sin(time * 0.9 + w.ph) * 4, w.home.z + Math.sin(a * 1.3) * w.R); spd = 9;
      if (active && flying && P.load.length > 0 && d < 34) { w.state = 'chase'; w.t = 0; sweep(300, 520, 0.35, 0.05, 'sawtooth'); if (!G.seenWasp) { G.seenWasp = true; toast('<b>A wasp wants your pollen!</b><br><span>heavy bees are slow: outrun it, or dive into the hive</span>', 6); } }
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
      if (w.buzzT <= 0 && d < 30) { w.buzzT = 0.28; sweep(rnd(230, 260), rnd(280, 320), 0.22, 0.035 * (1 - d / 30) + 0.01, 'sawtooth'); }
    } else if (w.state === 'retreat') { target = w.home; spd = 14; if (w.t > 7) { w.state = 'patrol'; w.t = 0; } }
    tmp.copy(target).sub(w.p); const L = tmp.length(); if (L > 0.01) tmp.multiplyScalar(Math.min(spd, L * 2) / L);
    w.v.lerp(tmp, Math.min(1, dt * (w.state === 'chase' ? 2.6 : 1.5)));
    w.p.addScaledVector(w.v, dt); w.p.y += Math.sin(time * 7 + w.ph) * 0.02;
    const gy = terrainH(w.p.x, w.p.z) + 2; if (w.p.y < gy) w.p.y = gy; if (spd === 0) w.v.set(0, 0, 0);
    if (w.v.lengthSq() > 0.5) w.fwd.lerp(_v.copy(w.v).normalize(), Math.min(1, dt * 6));
    orient(w.q, w.fwd, YA); _v2.set(1.8, 1.6, 2.4);
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
function wriggle() { if (P.stuck > 0) { P.stuck -= 0.45; noiseHit(rnd(1500, 2600), 3, 0.06, 0.06); return true; } return false; }
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
  const p = P.pos, v = P.vel, big = f.giant ? 1.5 : 0, Rh = f.r * 0.75 + f.len * 0.85, bot = f.y - 1.4 - big, sr = 0.25 * (f.sw || 1) + PR;
  const fx = f.sx, fz = f.sz;
  if (p.y < bot) { if (d < sr) { const k = sr / Math.max(d, 0.01); p.x = fx + (p.x - fx) * k; p.z = fz + (p.z - fz) * k; } return false; }
  if (d > Rh + PR) return false;
  const top = f.y + bloomH(f, Math.min(d, Rh)) + PR + 0.15;
  if (p.y > top + 0.001) return false;
  const pt = top - p.y, pb = p.y - bot, ps = Rh + PR - d;
  if (pt <= pb && pt <= 1.6 + big + ps) { p.y = top; v.y = Math.max(v.y, 0); v.x *= 1 - Math.min(1, dt * 5); v.z *= 1 - Math.min(1, dt * 5); P.landed = f; p.x += f.dsx; p.z += f.dsz; return d < Rh * 0.85; } // only the top of the bloom gives pollen
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
function archCollide(p) {
  for (const a of ARCHES) { if (Math.abs(p.x - a.cx) > a.w + 3 || Math.abs(p.z - a.cz) > a.w + 3) continue;
    for (const s of a.samples) { const dx = p.x - s.x, dy = p.y - s.y, dz = p.z - s.z, d = Math.hypot(dx, dy, dz), r = 0.32 + PR; if (d < r) { const k = r / Math.max(d, 0.01); p.x = s.x + dx * k; p.y = s.y + dy * k; p.z = s.z + dz * k; } } }
}
// ---------- third-person view (V) ----------
try { G.third = localStorage.getItem('honeylight.view') === '3'; } catch (e) { G.third = false; }
const me = newBee(1); me.s.set(0.001, 0.001, 0.001);
const _yflip = new Q4().setFromAxisAngle(YA, Math.PI);
const _meE = new THREE.Euler(0, 0, 0, 'YXZ');
me.update = () => { const on = G.third && P.mode !== 'title' && P.mode !== 'cell' && P.mode !== 'emerge' && P.mode !== 'gulp'; me.p.copy(P.pos); me.q.setFromEuler(_meE.set(P.pitch * 0.6, P.yaw, P.roll * 1.3)).multiply(_yflip); me.vel = P.vel; me.bank = clamp(-P.roll * 2.2 + P.yawRate * 3, -1.2, 1.2); me.fly = P.mode === 'fly'; me.s.setScalar(on ? 1 : 0.001); ants.forEach(a => a.visible = !on); baskets.forEach(b => b.visible = !on); };
addEventListener('keydown', e => { if (e.code === 'KeyV' && !e.repeat) { G.third = !G.third; try { localStorage.setItem('honeylight.view', G.third ? '3' : '1'); } catch (er) { } hint(G.third ? 'view from behind &nbsp; <kbd>V</kbd> to switch back' : 'bee\'s-eye view', 2.5); } });
const _cp = new V3(), _cb = new V3(), _cd = new V3(), _cz = new V3();
let camQuiet = false, camDist = 0;
function camBlocked(pt) { _cz.copy(pt); camQuiet = true; collide(_cz, _cd.set(0, 0, 0)); camQuiet = false; if (_cz.distanceToSquared(pt) > 0.0025) return true;
  for (const f of flowers) { const d = Math.hypot(pt.x - f.sx, pt.z - f.sz); if (d < f.r * 0.75 + f.len * 0.85 + 0.2 && pt.y < f.y + bloomH(f, d) + 0.25 && pt.y > f.y - 1.6) return true; } return false; }
function thirdPerson(dt) {
  if (!G.third || P.mode === 'title' || P.mode === 'cell' || P.mode === 'emerge' || P.mode === 'gulp') { camDist = 0; return; }
  const want = inHive ? 1.7 : 3.4, up = inHive ? 0.45 : 0.9;
  _cb.set(0, up, want).applyQuaternion(camera.quaternion); // behind and a little above, in view space
  // pull in if something solid is between the bee and the camera
  let ok = 0; const N = 10; for (let i = 1; i <= N; i++) { _cp.copy(P.pos).addScaledVector(_cb, i / N); if (camBlocked(_cp)) break; ok = i / N; }
  const target = Math.max(0.0, ok - 0.08); camDist = target < camDist ? target : lerp(camDist, target, Math.min(1, dt * 4));
  camPos.copy(P.pos).addScaledVector(_cb, camDist); camera.position.copy(camPos);
  if (camDist > 0.3) { _cd.set(0, 0, -9).applyQuaternion(camera.quaternion).add(P.pos); camera.up.set(0, 1, 0); camera.lookAt(_cd); camera.rotateZ(P.roll * 0.7); }
}
// ---------- golden-nectar raids: stay to fill up, but the wasps smell it ----------
for (const w of wasps) if (w.raider) { w.state = 'idle'; }
function summonRaid(f) {
  let n = 0;
  for (const w of wasps) { if (!w.raider || w.state !== 'idle') continue; const a = rnd(TAU), r = rnd(65, 85);
    w.p.set(f.sx + Math.cos(a) * r, f.y + rnd(8, 16), f.sz + Math.sin(a) * r); w.v.set(0, 0, 0); w.state = 'approach'; w.t = -n * 2.5; w.target = f; n++; if (n >= 2) break; }
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
    if (w.buzzT <= 0 && d < 70) { w.buzzT = 0.35; sweep(rnd(220, 250), rnd(270, 300), 0.3, 0.012 + 0.04 * (1 - d / 70), 'sawtooth'); }
    if (flying && P.load.length > 0 && d < 16) { w.state = 'chase'; w.t = 0; sweep(300, 520, 0.35, 0.05, 'sawtooth'); }
    else if (w.t > 16 || !(f.rich > 0)) { w.state = 'retreat'; w.t = 0; }
    return [_wv, 15];
  }
  if (w.state === 'retreat') {
    if (!w.away) { w.away = w.p.clone().add(_v.copy(w.p).sub(P.pos).setY(0).normalize().multiplyScalar(90)); w.away.y += 35; }
    if (w.t > 6) { w.state = 'idle'; w.away = null; }
    return [w.away, 16];
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
  if (time - (f.lastLand || -9) > 0.25) G.holdT = 0; f.lastLand = time; G.holdT += dt; G.holdF = f;
  if (Math.random() < dt * 6) { _v.set(f.sx + rnd(-1, 1), f.y + 1.2, f.sz + rnd(-1, 1)); puff(_v, 2, [1.0, 0.85, 0.3], 0.8, 0.01, 0.8, 0.3, 0.6); }
  if (G.holdT >= 2.8) { G.holdT = 0; f.cool = 150; addPollen(f); }
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
function windHint() { if (camQuiet) return; if (time > G.windHintT) { G.windHintT = time + 7; toast(`<b>The hedge winds are too strong</b><br><span>the orchard opens at 20 honey (you have ${G.honey})</span>`, 4); } }
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
  const ex = __post.finalM.uniforms.uExpo; ex.value = lerp(ex.value, inHive ? 1.0 : 0.92, 0.05);
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
window.__g = { STONES, ARCHES, WIND, G, gainHoney, wasps, webs, orchTrees, LOG, HILLS, ORCH, keys, sim: (secs) => { for (let i = 0; i < secs * 60; i++) update(1 / 60); }, fish, snap: () => { renderFrame(); return canvas.toDataURL("image/jpeg", 0.85); }, P, THREE, camera, flowers, pads, shrooms, COMBS, chew, takeOff, WY, POND, terrainH, FDIR, FIELD_D, bees };
