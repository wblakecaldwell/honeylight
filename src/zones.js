// Honeylight: scent stones and the places they open.
import * as THREE from '../three.module.min.js';
import { clamp } from './core.js';
import { POND, HEDGE_R, ORCH, HEDGE_GAPS, terrainH, FOREST, forestTrees } from './world.js';
import { scene, camera, mat, puff } from './engine.js';
import { _v } from './bees.js';
import { P, PR } from './player.js';
import { G, save, toast } from './progress.js';
import { tone, SCALE } from './audio.js';
import { time } from './loop.js';

// scent stones: leave honey here and your sisters scout a new place
export let ZONES;
export function setupScentStones() {
  ZONES = {
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
}

// ================= ROUND 6: scouting new places, the day's light, nightfall =================
export const stores = () => G.honey - (G.spent || 0);
export const zoneLocked = f => (f.orch && !G.orchard) || (f.zone && !G.zones[f.zone]);
export function zoneBlocked(x, z) { for (const [id, Z] of Object.entries(ZONES)) if (!G.zones[id] && Math.hypot(x - Z.c.x, z - Z.c.z) < Z.ring + 10) return true; return false; }
export function zoneWalls(p, v) {
  for (const id of ['pond', 'forest']) { if (G.zones[id]) continue; const Z = ZONES[id], dx = p.x - Z.c.x, dz = p.z - Z.c.z, d = Math.hypot(dx, dz); if (d >= Z.ring) continue;
    const k = Z.ring / Math.max(d, 0.01); p.x = Z.c.x + dx * k; p.z = Z.c.z + dz * k; const vr = (v.x * dx + v.z * dz) / Math.max(d, 0.01); if (vr < 0) { v.x -= vr * dx / d * 1.6; v.z -= vr * dz / d * 1.6; }
    if (time > (G.zoneHintT || 0)) { G.zoneHintT = time + 8; toast(`<b>A stiff breeze turns you back</b><br><span>your sisters haven't scouted ${Z.lname} yet. Leave ${Z.cost} honey at the glowing stone</span>`, 5); } }
  // the scent stones themselves are solid: land on the wax
  for (const Z of Object.values(ZONES)) { const dx = p.x - Z.x, dz = p.z - Z.z, d = Math.hypot(dx, dz); if (d < 5.2 && p.y < Z.top + PR) { if (d > 4.2) { const k = 5.2 / Math.max(d, 0.01); p.x = Z.x + dx * k; p.z = Z.z + dz * k; } else { p.y = Z.top + PR; v.y = Math.max(v.y, 0); } } }
}
export function forestCollide(p, v) {
  if (Math.hypot(p.x - FOREST.x, p.z - FOREST.z) > FOREST.r + 40) return;
  for (const t of forestTrees) { const dx = p.x - t.x, dz = p.z - t.z, dh = Math.hypot(dx, dz); if (dh > t.cr * 1.6 + 3) continue;
    if (p.y < t.top - t.cr * 0.3 && dh < t.R + PR + 0.8) { const k = (t.R + PR + 0.8) / Math.max(dh, 0.01); p.x = t.x + dx * k; p.z = t.z + dz * k; }
    for (const b of t.blobs) { const bx = p.x - b[0], by = (p.y - b[1]) * b[3] / b[4], bz = p.z - b[2], dd = Math.hypot(bx, by, bz), rr = b[3] * 1.02 + PR; if (dd < rr) { const k = rr / Math.max(dd, 0.01); p.x = b[0] + bx * k; p.y = b[1] + by * k * b[4] / b[3]; p.z = b[2] + bz * k; v.multiplyScalar(0.7); } } }
}
export function openZone(id) {
  const Z = ZONES[id]; G.zones[id] = true; G.spent = (G.spent || 0) + Z.cost; if (id === 'garden') G.orchard = true;
  Z.draw(Z.name, 'scouted'); Z.wax.uniforms.uOn.value = 0; Z.glow.material.opacity = 0; Z.fadeT = 4;
  toast(`<b>Your sisters fly ahead to scout ${Z.lname}</b><br><span>${Z.cost} honey left at the stone. ${{ garden: 'The hedge winds settle.', pond: 'Lilies on the pads, but watch for dragonflies.', forest: 'Violets in the roots, foxgloves in the shade, webs between the trunks.' }[id]}</span>`, 7);
  [0, 2, 4, 7].forEach((n, i) => tone(SCALE[n], 0.1, 2.6, 'sine', i * 0.1)); tone(SCALE[2] * 2, 0.08, 2.6, 'sine', 0.4);
  _v.set(Z.x, Z.top + 2, Z.z); puff(_v, 40, [1.0, 0.8, 0.3], 4, 0.014, 2.2, -0.5, 1.2); save();
}
export function updateZones(dt) {
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

export function setupGardenFlag() {
  G.orchard = !!G.zones.garden;
}
