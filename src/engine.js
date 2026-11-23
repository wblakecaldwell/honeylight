// Honeylight: the look: renderer, shaders, shapes, particles, sun shadows, the glow pass and auto resolution.
import * as THREE from '../three.module.min.js';
import { M4, Q4, V3, $, rnd, clamp, lerp } from './core.js';
import { HTOP, RIN, TR, TY, GY, WY, SUN } from './world.js';
import { sky, DAY } from './day.js';
import { grassMesh } from './plants.js';
import { inHive } from './loop.js';

export function setupColorSpace() {
  THREE.ColorManagement.enabled = false;
}

// ---------- renderer ----------
export let canvas, renderer, scene, camera;
let DPR;
export function setupRenderer() {
  canvas = $('c');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  DPR = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(DPR);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(74, 1, 0.04, 1600);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  addEventListener('resize', resize); resize();
}

let resScale = 1;
function resize() { renderer.setPixelRatio(DPR * resScale); renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); if (window.__post) __post.resize(); }

// ---------- shaders ----------
// inverse of the post pass tone curve, for materials authored as final display colours
export const UNTONE = `
vec3 untone(vec3 y){ y=clamp(y,0.0,0.97); vec3 x=pow(y,vec3(2.2))/1.0;
  vec3 a=2.43*x-2.51, b=0.59*x-0.03, c=0.14*x; return (-b-sqrt(max(b*b-4.0*a*c,0.0)))/(2.0*a); }
`;
export function untoneJS(y) { y = clamp(y, 0, 0.97); const x = Math.pow(y, 2.2), a = 2.43 * x - 2.51, b = 0.59 * x - 0.03, c = 0.14 * x; return (-b - Math.sqrt(Math.max(b * b - 4 * a * c, 0))) / (2 * a); }
export const untoneHex = h => new THREE.Color(untoneJS((h >> 16 & 255) / 255), untoneJS((h >> 8 & 255) / 255), untoneJS((h & 255) / 255));
const SHADOW_RES = 2048, SHADOW_HALF = 85;

export let U, MP, COMMON;
let shadowRT;
export function setupShaders() {
  shadowRT = new THREE.WebGLRenderTarget(SHADOW_RES, SHADOW_RES, { depthBuffer: true });
  shadowRT.depthTexture = new THREE.DepthTexture(SHADOW_RES, SHADOW_RES); shadowRT.depthTexture.type = THREE.UnsignedIntType;
  shadowRT.depthTexture.compareFunction = THREE.LessEqualCompare; shadowRT.depthTexture.minFilter = shadowRT.depthTexture.magFilter = THREE.LinearFilter;
  U = { uTime: { value: 0 }, uCam: { value: new V3() }, uSun: { value: SUN }, uGlow: { value: 0 }, uShadow: { value: shadowRT.depthTexture }, uShadowM: { value: new M4() }, uShadowOn: { value: 0 } };
  U.uWind = { value: new V3() }; U.uHome = { value: new V3(1, 0, 0) }; U.uHomeK = { value: 0 };
  MP = !/mp=0/.test(location.search); // model pass (trees, grass, hive door). ?mp=0 shows the old look
  U.uSunC = { value: new V3(2.9, 2.1, 1.3) }; U.uAmb = { value: 1 }; U.uHaze = { value: new V3(1, 1, 1) }; U.uClose = { value: 0 };
  // night hooks (night.js): uNight 0..1 turns the sun into the moon and brings out the stars; uLamp is one soft light that travels with the bee (xyz, strength)
  U.uNight = { value: 0 }; U.uLamp = { value: new THREE.Vector4(0, 0, 0, 0) }; U.uLampC = { value: new V3(1.0, 0.78, 0.36) };
  // long run hook (longrun.js): uAura is the coloured light round the bee while it is in the zone (xyz, strength); off (0) it adds nothing
  U.uAura = { value: new THREE.Vector4(0, 0, 0, 0) }; U.uAuraC = { value: new V3(1.0, 0.8, 0.3) };
  // storm hooks (storm.js): uStorm = (direction x, direction z, where the cloud edge is in the sky, strength 0..1); uStorm2 = (the cloud's far edge, rain mist, gloom under the cloud)
  U.uStorm = { value: new THREE.Vector4(1, 0, 0, 0) }; U.uStorm2 = { value: new V3(0, 0, 0) };
  COMMON = `
uniform float uTime; uniform vec3 uCam; uniform vec3 uSun; uniform float uGlow; uniform highp sampler2DShadow uShadow; uniform mat4 uShadowM; uniform float uShadowOn; uniform vec3 uSunC; uniform float uAmb; uniform vec3 uHaze; uniform float uNight; uniform vec4 uLamp; uniform vec3 uLampC; uniform vec4 uAura; uniform vec3 uAuraC; uniform vec4 uStorm; uniform vec3 uStorm2;
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
  if(uStorm2.z>0.001) hc=mix(hc, vec3(0.36,0.39,0.46), uStorm2.z*0.9);
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
  if(uAura.w>0.0){ vec3 La=uAura.xyz-p; float da=dot(La,La); lo+=alb*uAuraC*(uAura.w/(1.0+da*0.06))*(0.4+0.6*max(dot(n,La*inversesqrt(da+1e-4)),0.0)); }
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
  if(uStorm2.y>0.001) f=(1.0-exp(-dist*(0.0012+0.0024*hgt+0.007*uStorm2.y)))*(1.0-ih);
  return mix(c,hazeCol(dir),f);
}
#define NORMAL (gl_FrontFacing? normalize(vN) : -normalize(vN))
` + UNTONE;
}

export const cloverGLSL = () => `
    float cm=smoothstep(0.5,0.62,fbm(vW.xz*0.045+4.0))*step(${(WY + 1).toFixed(1)},vW.y);
    vec2 cg=vW.xz/0.9, ci=floor(cg); float ch=hash21(ci); vec2 q=fract(cg)-0.5-(vec2(hash21(ci+3.1),hash21(ci+7.7))-0.5)*0.3; float ra=ch*6.2832; q=mat2(cos(ra),-sin(ra),sin(ra),cos(ra))*q;
    float lf=0.0, chev=0.0; for(int k=0;k<3;k++){ float a=float(k)*2.0944; vec2 lq=q-vec2(cos(a),sin(a))*0.15; float r=length(lq); lf=max(lf,1.0-smoothstep(0.12,0.14,r)); chev=max(chev,(1.0-smoothstep(0.0,0.014,abs(r-0.07)))*(1.0-smoothstep(0.12,0.14,r))); }
    alb=mix(alb,vec3(0.05,0.15,0.025)*(0.8+0.35*ch)+chev*vec3(0.05,0.06,0.03),lf*cm*step(ch,0.75));
    float ms=smoothstep(0.55,0.7,fbm(vW.xz*0.06+11.0)); alb=mix(alb,vec3(0.13,0.27,0.04)*(0.55+0.8*vnoise(vW.xz*14.0)),ms*0.55*(1.0-cm));`;
export const SWAYGLSL = `uniform float uTime; uniform vec3 uWind; attribute float aSway;
vec2 sway(vec2 p){ float ph=p.x*0.07+p.y*0.05; float s=sin(uTime*1.3+ph)*0.6+sin(uTime*2.9+ph*1.7)*0.25; return uWind.xy*(uWind.z*0.55+s*(0.35+uWind.z*0.4)); }
`;
export const VERT = `
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
export function mat(frag, o = {}) {
  const { uniforms, vert, ...rest } = o;
  return new THREE.ShaderMaterial({ uniforms: { ...U, ...(uniforms || {}) }, vertexShader: vert || VERT, fragmentShader: COMMON + frag, ...rest });
}
export const simple = (albedo, spec = 0.05, sss = 0, extra = {}) => mat(`void main(){ vec3 n=NORMAL; gl_FragColor=vec4(finish(shade(vC*vec3(${albedo}),n,vW,${spec.toFixed(2)},${sss.toFixed(2)}),vW),1.0); }`, extra);

// ---------- geometry helpers ----------
export function geoParts(parts) {
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
export function ell(rx, ry, rz, x, y, z, seg = 14) { const g = new THREE.SphereGeometry(1, seg, Math.max(6, seg * 0.7 | 0)); g.scale(rx, ry, rz); g.translate(x, y, z); return g; }
export function stick(a, b, r) {
  const A = new V3(...a), B = new V3(...b), d = B.clone().sub(A), len = d.length();
  const g = new THREE.CylinderGeometry(r, r * 0.8, len, 8, 1);
  g.applyQuaternion(new Q4().setFromUnitVectors(new V3(0, 1, 0), d.normalize()));
  const m = A.add(B).multiplyScalar(0.5); g.translate(m.x, m.y, m.z); return g;
}

// ---------- particles ----------
export const PN = 420, pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 4), pSize = new Float32Array(PN), parts = [];

let pGeo, pPts;
export function setupParticles() {
  for (let i = 0; i < PN; i++) parts.push({ life: 0, max: 1, v: new V3(), g: 0, c: [1, 1, 1], s: 1 });
  pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('aC', new THREE.BufferAttribute(pCol, 4)); pGeo.setAttribute('aS', new THREE.BufferAttribute(pSize, 1));
  pPts = new THREE.Points(pGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    vertexShader: `attribute vec4 aC; attribute float aS; varying vec4 vCol; void main(){ vec4 mv=viewMatrix*vec4(position,1.0); vCol=aC; gl_PointSize=min(aS*500.0/max(-mv.z,0.1),90.0); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: UNTONE + `varying vec4 vCol; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.15,d); gl_FragColor=vec4(untone(vCol.rgb)*1.5,vCol.a*a); }` }));
  pPts.frustumCulled = false; scene.add(pPts);
}

export let pNext = 0;
export function puff(p, n, col, spd, size, life, g = 0, up = 0) { for (let i = 0; i < n; i++) { const q = parts[pNext]; pNext = (pNext + 1) % PN; q.life = q.max = life * rnd(0.6, 1.2); q.v.set(rnd(-1, 1), rnd(-1, 1) + up, rnd(-1, 1)).multiplyScalar(spd * rnd(0.3, 1)); q.g = g; q.c = col; q.s = size * rnd(0.6, 1.3); pPos[(pNext ? pNext - 1 : PN - 1) * 3] = p.x; const k = (pNext ? pNext - 1 : PN - 1) * 3; pPos[k] = p.x + rnd(-.1, .1); pPos[k + 1] = p.y + rnd(-.1, .1); pPos[k + 2] = p.z + rnd(-.1, .1); } }
export function updateParts(dt) { for (let i = 0; i < PN; i++) { const q = parts[i], k = i * 3; if (q.life > 0) { q.life -= dt; q.v.y -= q.g * dt; q.v.multiplyScalar(1 - dt * 1.2); pPos[k] += q.v.x * dt; pPos[k + 1] += q.v.y * dt; pPos[k + 2] += q.v.z * dt; const a = clamp(q.life / q.max, 0, 1); pCol[i * 4] = q.c[0]; pCol[i * 4 + 1] = q.c[1]; pCol[i * 4 + 2] = q.c[2]; pCol[i * 4 + 3] = a; pSize[i] = q.s; } else { pCol[i * 4 + 3] = 0; pSize[i] = 0; } }
  pGeo.attributes.position.needsUpdate = pGeo.attributes.aC.needsUpdate = pGeo.attributes.aS.needsUpdate = true; }

// ---------- sun shadows ----------
let shadowCam, depthMat, grassDepthMat, sunUp;
export function setupSunShadows() {
  shadowCam = new THREE.OrthographicCamera(-SHADOW_HALF, SHADOW_HALF, SHADOW_HALF, -SHADOW_HALF, 1, 1600);
  depthMat = new THREE.ShaderMaterial({ vertexShader: depthVert, fragmentShader: 'void main(){ gl_FragColor=vec4(1.0); }', side: THREE.DoubleSide });
  grassDepthMat = new THREE.ShaderMaterial({ uniforms: grassMesh.material.uniforms, vertexShader: grassMesh.material.vertexShader, fragmentShader: 'void main(){ gl_FragColor=vec4(1.0); }', side: THREE.DoubleSide });
  scene.traverse(o => {
    if (!o.isMesh && !o.isInstancedMesh) { if (o.isPoints || o.isSprite) hidden.push(o); return; }
    let p = o; while (p) { if (p === camera) { hidden.push(o); return; } p = p.parent; }
    if (o.userData.noShadow) { hidden.push(o); return; }
    if (o === sky || o.material.transparent || o.material.blending === THREE.AdditiveBlending) { hidden.push(o); return; }
    casters.push({ o, m: o.material, d: o === grassMesh ? grassDepthMat : depthMat });
  });
  sunUp = Math.abs(SUN.y) > 0.99 ? new V3(1, 0, 0) : new V3(0, 1, 0);
}

// things built after setupSunShadows (the tight spots) join the shadow casters here
export function addCasters(root) { root.traverse(o => { if (o.isMesh && !o.material.transparent) casters.push({ o, m: o.material, d: depthMat }); }); }

const depthVert = `void main(){ mat4 m=modelMatrix;
  #ifdef USE_INSTANCING
    m=modelMatrix*instanceMatrix;
  #endif
  gl_Position=projectionMatrix*viewMatrix*(m*vec4(position,1.0)); }`;
export const casters = [], hidden = [];
const _shc = new V3(), _sl = new V3(), _sInv = new M4();
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
let __post;
export function setupPost() {
  __post = window.__post = (() => {
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
}

let shadowFrame = 0;
export function renderFrame() {
  const rad = Math.hypot(camera.position.x, camera.position.z);
  // deep inside the hive the sun can't reach: skip the shadow pass there
  if (!(rad < RIN - 1.5 && camera.position.y > -1 && camera.position.y < HTOP) || !U.uShadowOn.value) renderShadows();
  // exposure: the hive is a cosy cave, outside is bright evening
  const ex = __post.finalM.uniforms.uExpo; ex.value = lerp(ex.value, inHive ? 1.0 : 0.92 * DAY.expo, 0.05);
  __post.render();
}

// keep the frame rate smooth on laptops: drop render resolution if frames run long, recover when there's headroom
const perf = { acc: 0, n: 0, good: 0 };
export function adaptRes(ms) {
  if (!(ms > 0) || ms > 250) return; perf.acc += ms; perf.n++;
  if (perf.n < 45) return; const avg = perf.acc / perf.n; perf.acc = 0; perf.n = 0;
  if (avg > 21 && resScale > 0.55) { resScale = Math.max(0.55, resScale - 0.12); resize(); perf.good = 0; }
  else if (avg < 17.5 && resScale < 1) { if (++perf.good >= 3) { resScale = Math.min(1, resScale + 0.08); resize(); perf.good = 0; } }
  else perf.good = 0;
}
