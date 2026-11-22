// Honeylight: the sky, the day from afternoon to dusk, and the day card.
import * as THREE from '../three.module.min.js';
import { V3, clamp, smooth } from './core.js';
import { SUN_AZ, SUN } from './world.js';
import { scene, U, mat } from './engine.js';
import { flowers } from './plants.js';
import { P } from './player.js';
import { G, save, toast, gainHoney } from './progress.js';
import { tone, SCALE } from './audio.js';
import { inHive } from './loop.js';

// ---------- sky ----------
export let sky;
export function setupSky() {
  sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 20), mat(`uniform vec3 uHome; uniform float uHomeK;
void main(){ vec3 dir=normalize(vL); float e=dir.y;
  vec3 hz=hazeCol(dir), zen=vec3(0.07,0.17,0.46)*uHaze;
  vec3 c=mix(hz,zen,pow(clamp(e,0.,1.),0.5));
  float sd=max(dot(dir,uSun),0.);
  vec3 glowC=vec3(1.5,0.85,0.35), discC=vec3(30.,22.,12.);
  float sk=0.0; if(uStorm.w>0.001){ float sd2=dot(dir.xz/(abs(dir.y)+0.14)*1.3,uStorm.xy); sk=uStorm.w*smoothstep(uStorm.z-1.3,uStorm.z+1.3,sd2)*(1.0-smoothstep(uStorm2.x-1.3,uStorm2.x+1.3,sd2)); glowC*=1.0-sk; discC*=1.0-sk; }
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
  if(sk>0.0){ float deck=smoothstep(0.18,0.52,fbm(cu*0.55+uTime*0.012))*smoothstep(-0.02,0.10,e); cl=mix(cl,max(cl,deck),sk); cloudC=mix(cloudC,vec3(0.105,0.112,0.13)*(0.5+0.9*thick),sk); }
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
}

// --- the day: the sun sinks from afternoon to dusk. Stock the hive before dark
export let DAY;
let dayFade, dayCard;
export function setupDay() {
  DAY = { t: 0, n: 1, honey: 0, best: 0, streak: 0, ending: 0, LEN: 480, warned: 0, expo: 1,
    save() { return { t: +this.t.toFixed(4), n: this.n, honey: this.honey, best: this.best, streak: this.streak }; } };
  if (G.daySave) { const d = G.daySave; DAY.t = clamp(+d.t || 0, 0, 0.95); DAY.n = (d.n | 0) || 1; DAY.honey = d.honey | 0; DAY.best = d.best | 0; DAY.streak = d.streak | 0; DAY.warned = DAY.t > 0.9 ? 2 : DAY.t > 0.78 ? 1 : 0; }
  dayFade = document.createElement('div'); dayFade.style.cssText = 'position:fixed;inset:0;background:#05040a;opacity:0;pointer-events:none;transition:opacity 1.6s ease;z-index:40;display:flex;align-items:center;justify-content:center;';
  dayCard = document.createElement('div'); dayCard.style.cssText = 'font:16px Georgia,serif;color:#f4e6c8;text-align:center;line-height:1.7;opacity:0;transition:opacity 1.2s ease;max-width:440px;padding:20px;';
  dayFade.id = 'dayfade'; dayFade.appendChild(dayCard); document.body.appendChild(dayFade);
}

const _sunHi = new V3(3.05, 2.5, 1.8), _sun17 = new V3(2.9, 2.1, 1.3), _sunLo = new V3(2.3, 0.9, 0.3);
const sunEl = () => 30 - 33 * Math.pow(DAY.t, 1.25);
export function applyDayLight() {
  const e = sunEl(), el = e * Math.PI / 180;
  SUN.set(Math.cos(SUN_AZ) * Math.cos(el), Math.sin(el), Math.sin(SUN_AZ) * Math.cos(el));
  const c = U.uSunC.value; if (e > 17) c.lerpVectors(_sun17, _sunHi, Math.min(1, (e - 17) / 13)); else c.lerpVectors(_sunLo, _sun17, clamp((e - 2) / 15, 0, 1));
  c.multiplyScalar(smooth(-3, 3, e));
  const dusk = smooth(9, -3, e); U.uAmb.value = 1 - 0.45 * dusk; U.uHaze.value.set(1 - 0.4 * dusk, 1 - 0.55 * dusk, 1 - 0.25 * dusk);
  U.uClose.value = smooth(0.86, 0.97, DAY.t); DAY.expo = 1 + 0.5 * dusk;
}
export const flowersClosed = () => DAY.t > 0.93 || !!(window.STORM && STORM.closed); // storm.js shuts the flowers before the rain
export function dayCount(v) { DAY.honey += v; return v; }
export function timeOfDay() { if (window.NIGHT && NIGHT.active) return NIGHT.label(); if (window.STORM && STORM.on && STORM.label()) return STORM.label(); const t = DAY.t; return t < 0.35 ? 'afternoon' : t < 0.62 ? 'late afternoon' : t < 0.78 ? 'evening' : t < 0.9 ? 'the sun is low: stock the hive' : 'dusk: flowers closing, head home'; }
export function updateDay(dt) {
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

export function setupFirstLight() {
  applyDayLight();
}
