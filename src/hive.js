// Honeylight: the hive: the tree shell, the combs, the birth cell and the door.
import * as THREE from '../three.module.min.js';
import { V3, rnd, lerp, smooth, TAU } from './core.js';
import { CELL, CT, HTOP, RIN, ROUT, TR, TY, GY } from './world.js';
import { scene, UNTONE, untoneJS, untoneHex, U, MP, mat } from './engine.js';

export let COMBS, BIRTH;
export function setupCombLayout() {
  COMBS = [-6.8, -3.4, 0, 3.4, 6.8].map((z, i) => ({ z, hw: Math.sqrt(RIN * RIN - z * z) - 1.4, yb: [9, 7.5, 8.5, 7, 9.5][i], holes: [] }));
  COMBS[2].holes.push({ x: 5.6, y: 14, r: 1.0 }); COMBS[3].holes.push({ x: -2, y: 16, r: 1.0 }); COMBS[1].holes.push({ x: 1, y: 11.5, r: 0.9 });
  BIRTH = { x: BIRTH_ID.x * CELL, y: BIRTH_ID.y * 1.7320508 * CELL, z: CT / 2, ci: 2 };
}

const BIRTH_ID = { x: -1.5, y: 9.5 };

// ---------- hive shell ----------
const woodFrag = (base, hole) => `
void main(){ ${hole ? 'if(inHole(vW)) discard;' : ''} vec3 n=NORMAL;
  float a=atan(vW.z,vW.x); float g=fbm(vec2(a*9.0,vW.y*0.35)); float g2=fbm(vec2(a*40.0,vW.y*1.2));
  vec3 alb=mix(vec3(${base})*0.45, vec3(${base})*1.25, g)*(0.75+0.5*g2);
  alb=mix(alb, vec3(0.34,0.14,0.03), smoothstep(0.62,0.8,fbm(vW.xy*0.6+vW.z))*0.6);
  gl_FragColor=vec4(finish(shade(alb,n,vW,0.12,0.0),vW),1.0); }`;

let innerWall, tunnelG, tunnel, shaftG, shaft;
export function setupShell() {
  innerWall = new THREE.Mesh(new THREE.CylinderGeometry(RIN, RIN, HTOP + 0.6, 56, 1, true), mat(woodFrag('0.36,0.20,0.09', true), { side: THREE.BackSide }));
  innerWall.position.y = HTOP / 2; scene.add(innerWall);
  for (const y of [0, HTOP]) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(RIN + 0.2, 40), mat(`void main(){ vec3 n=NORMAL; float g=fbm(vW.xz*0.9);
    vec3 alb=mix(vec3(0.16,0.09,0.04),vec3(0.42,0.26,0.11),g); gl_FragColor=vec4(finish(shade(alb,n,vW,0.05,0.0),vW),1.0); }`, { side: THREE.DoubleSide }));
    d.rotation.x = y ? Math.PI / 2 : -Math.PI / 2; d.position.y = y; scene.add(d);
  }
  tunnelG = new THREE.CylinderGeometry(TR, TR, 3.9, 24, 1, true); tunnelG.rotateZ(Math.PI / 2);
  tunnel = new THREE.Mesh(tunnelG, mat(`void main(){ vec3 n=NORMAL; float g=fbm(vec2(vW.x*2.5, atan(vW.z,vW.y-${TY.toFixed(1)})*3.0));
  vec3 alb=mix(vec3(0.20,0.11,0.05),vec3(0.52,0.33,0.16),g); gl_FragColor=vec4(finish(shade(alb,n,vW,0.1,0.0),vW),1.0); }`, { side: THREE.BackSide }));
  tunnel.position.set(11.35, TY, 0); scene.add(tunnel);
  // light shaft from the entrance
  shaftG = new THREE.CylinderGeometry(TR * 0.85, 5.2, 13, 28, 1, true); shaftG.rotateZ(-Math.PI / 2);
  shaft = new THREE.Mesh(shaftG, mat(`void main(){ vec3 V=normalize(uCam-vW); float e=pow(abs(dot(normalize(vN),V)),2.0);
  float along=smoothstep(-6.5,6.5,vL.x); float a=e*along*along*0.22*(0.8+0.2*fbm(vW.yz*1.3+uTime*0.1));
  gl_FragColor=vec4(vec3(1.25,0.95,0.6)*a*1.3,1.0); }`, { side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  shaft.position.set(3.4, TY - 0.6, 0); shaft.rotation.z = 0.09; scene.add(shaft);
}

// ---------- comb ----------
export let combUniforms;
let combFrag;
export function setupComb() {
  combUniforms = { uLarva: { value: 3 }, uHoney: { value: 0 }, uPulse: { value: 0 }, uBirth: { value: new THREE.Vector4(BIRTH_ID.x, BIRTH_ID.y, 0, 1) } };
  combFrag = `
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
}

// ---------- birth cell ----------
let cellGroup;
export function setupBirthCell() {
  cellGroup = new THREE.Group(); cellGroup.position.set(BIRTH.x, BIRTH.y, BIRTH.z); scene.add(cellGroup);
  {
    const RC = 0.5774 * CELL;
    const tg = new THREE.CylinderGeometry(RC, RC * 0.9, 1.05, 6, 4, true); tg.rotateX(Math.PI / 2); tg.translate(0, 0, -0.525);
    const cols = []; const p = tg.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = smooth(-1.05, 0, p.getZ(i)); const k = t * t * t; cols.push(untoneJS(lerp(0.025, 0.42, k)), untoneJS(lerp(0.012, 0.21, k)), untoneJS(lerp(0.004, 0.05, k))); }
    tg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    cellGroup.add(new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const back = new THREE.Mesh(new THREE.CircleGeometry(RC, 6), new THREE.MeshBasicMaterial({ color: untoneHex(0x120903) })); back.position.z = -1.05; cellGroup.add(back);
  }
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
}

export const capPieces = [];
export function resetCap() { for (const m of capPieces) { m.userData.on = true; m.userData.life = 0; m.visible = true; m.position.copy(m.userData.home); m.rotation.set(0, 0, 0); } }

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

export let barkMat;
export function setupHiveTree() {
  barkMat = mat(`void main(){ if(inHole(vW) && length(vW.xz)<14.0) discard; vec3 n=NORMAL; float a=atan(vL.z,vL.x); float R=max(length(vL.xz),0.5);
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
}

export function trunkGeo(R, base, top) { return new THREE.LatheGeometry([[R + 9, base - 5], [R + 4, base + 3], [R + 1.2, base + 9], [R, base + 13], [R, top * 0.6], [R * 0.85, top]].map(a => new THREE.Vector2(a[0], a[1])), 48); }

// soft beacon at the hive door
export let beacon;
export function setupBeacon() {
  beacon = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,200,90,1)'); g.addColorStop(0.3, 'rgba(255,170,50,.35)'); g.addColorStop(1, 'rgba(255,150,30,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); s.position.set(ROUT + 0.8, TY, 0); s.scale.setScalar(16); scene.add(s); return s; })();
}

export function setupBirthCap() {
  resetCap();
}
