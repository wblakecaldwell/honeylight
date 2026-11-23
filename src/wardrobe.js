// Honeylight: the wardrobe: a wide wax cell on the comb near the hive door where the bee keeps what it has earned, and the card for choosing what to wear.
// One piece is earned with each challenge of the long run (longrun.js), in the order of PIECES (wear.js): the first challenge gives the first piece.
// What is earned (the number of challenges won) and what is worn is saved with the run, under honeylight.run. An older save has no worn list: its pieces are earned, none is on.
// Earned pieces hang on their pegs or lie in their pots; a piece that is not earned yet is a dim outline. A bee that lands in front of the cell, or walks up to it, gets the card.
// Built with its own random numbers; nothing here takes a number from the game's random stream.
import * as THREE from '../three.module.min.js';
import { V3, clamp } from './core.js';
import { CT } from './world.js';
import { scene, U, mat, geoParts, ell, stick, hidden } from './engine.js';
import { COMBS, BIRTH } from './hive.js';
import { KEEPOFF } from './bees.js';
import { P, PR } from './player.js';
import { G } from './progress.js';
import { tone, SCALE } from './audio.js';
import { RUN, saveMem } from './longrun.js';
import { quietBuild, seeded } from './runkit.js';
import { PIECES, WORN, setWorn, wornList, capModel, scarfModel, capeModel, tipsModel, leafStrip, glow } from './wear.js';

// where the cell is: on the face of the comb that the bee walks on, low and toward the door, clear of the dance floor and of the hole in the comb.
// x, y: its middle on the comb face. z: the face. r: its rim. depth: how far it stands out of the comb. open: the card is showing. at: the bee is at the cell.
// all: every piece counts as earned (a switch for play tests: ?wardrobe=all or #wardrobe-all)
export const WARD = { ci: 2, side: 1, x: 5.6, y: 10.0, z: 0, r: 1.39, depth: 0.5, open: false, at: false, all: false, t: 0, newK: 0 };
export const earned = () => WARD.all ? PIECES.length : clamp(RUN.mem.ch | 0, 0, PIECES.length); // how many pieces the bee has, counted from the first
const won = () => clamp(RUN.mem.ch | 0, 0, PIECES.length);

// ---------- the cell ----------
let cell, card, newGlow, rnd = null, shownKey = -1, shownThird = null; const SHOW = {};
const stateKey = () => earned() * 128 + PIECES.reduce((m, p, i) => m | (WORN[p.id] ? 1 << i : 0), 0); // what is earned and what is worn, as one number
const DS = { side: THREE.DoubleSide };
const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.frustumCulled = false; return o; };
const hexShape = R => { const s = new THREE.Shape(); for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + i * Math.PI / 3, x = Math.cos(a) * R, y = Math.sin(a) * R; i ? s.lineTo(x, y) : s.moveTo(x, y); } s.closePath(); return s; };
const waxM = (k = '1.0') => mat(`void main(){ vec3 n=NORMAL; vec3 wax=vec3(0.72,0.40,0.09)*(0.75+0.4*fbm(vW.xy*3.0))*${k}; gl_FragColor=vec4(finish(shade(wax,n,vW,0.25,0.5),vW),1.0); }`, DS);
// a piece that is not earned yet: a dim outline, lit only at its edges
const ghostM = () => mat(`void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW); float rim=pow(1.0-abs(dot(n,V)),1.4); gl_FragColor=vec4(finish(vec3(1.0,0.76,0.38)*(0.30+0.75*rim),vW),0.07+0.5*rim); }`, { transparent: true, depthWrite: false, ...DS });
const ghostLeafM = () => mat(`void main(){ float e=smoothstep(0.70,0.97,abs(vUv.x)); float mid=1.0-smoothstep(0.0,0.07,abs(vUv.x)); float sv=1.0-smoothstep(0.0,0.08,abs(fract(vUv.y*8.0-abs(vUv.x)*1.7)-0.5)); float a=0.035+0.5*max(e,max(mid*0.6,sv*0.14)); gl_FragColor=vec4(finish(vec3(1.0,0.76,0.38)*(0.30+0.6*a),vW),a); }`, { transparent: true, depthWrite: false, ...DS });
const ghosted = (o, leaf) => { const kill = []; o.traverse(m => { if (!m.isMesh) return; if (m.material.blending === THREE.AdditiveBlending) kill.push(m); else { m.material = leaf ? ghostLeafM() : ghostM(); m.renderOrder = 4; } }); kill.forEach(m => m.parent.remove(m)); return o; };
// hold a piece that was made in bee space: pivot is the point of it that goes to pos; bx, by, bz are where the bee's x, y, z point in the cell
const hold = (obj, pivot, pos, bx = [1, 0, 0], by = [0, 1, 0], bz = [0, 0, 1]) => { const h = new THREE.Group(); obj.position.set(-pivot[0], -pivot[1], -pivot[2]); h.add(obj); h.matrixAutoUpdate = false; h.matrix.makeBasis(new V3(...bx), new V3(...by), new V3(...bz)).setPosition(...pos); return h; };
// a little wax pot with a heap of dust in it
const pot = (heapM, locked) => { const grp = new THREE.Group(), pts = [[0.0, 0], [0.085, 0], [0.125, 0.05], [0.13, 0.13], [0.112, 0.15], [0.105, 0.13], [0.0, 0.11]].map(p => new THREE.Vector2(p[0], p[1]));
  grp.add(mesh(new THREE.LatheGeometry(pts, 20), locked ? ghostM() : waxM('1.15'))); const heap = new THREE.SphereGeometry(0.105, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); heap.scale(1, 0.62, 1); heap.translate(0, 0.118, 0);
  const hm = mesh(heap, locked ? ghostM() : heapM); if (locked) { hm.renderOrder = 4; grp.children[0].renderOrder = 4; } grp.add(hm); return grp; };

function buildCell() { const R = 1.3; cell = new THREE.Group(); cell.position.set(WARD.x, WARD.y, WARD.z);
  // the wide cell: a wax rim that stands out of the comb, a smooth back, a ledge
  const ring = hexShape(R + 0.09); ring.holes.push(hexShape(R)); cell.add(mesh(new THREE.ExtrudeGeometry(ring, { depth: 0.46, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 2, curveSegments: 1 }), waxM()));
  const back = mesh(new THREE.ShapeGeometry(hexShape(R + 0.02)), mat(`void main(){ vec3 n=NORMAL; float cup=length(vL.xy)/1.3; vec3 wax=vec3(0.62,0.33,0.07)*(0.8+0.35*fbm(vW.xy*2.2))*(1.0-0.35*cup*cup); gl_FragColor=vec4(finish(shade(wax,n,vW,0.35,0.5),vW),1.0); }`, DS)); back.position.z = 0.02; cell.add(back);
  const ledge = new THREE.BoxGeometry(1.5, 0.06, 0.40, 8, 1, 2), lp = ledge.attributes.position; for (let i = 0; i < lp.count; i++) lp.setY(i, lp.getY(i) + 0.012 * Math.sin(lp.getX(i) * 9)); ledge.computeVertexNormals(); ledge.translate(-0.33, -0.45, 0.2); cell.add(mesh(ledge, waxM('1.1')));
  // three pegs of propolis
  const pegs = [[-0.62, 0.60], [0.04, 0.74], [0.72, 0.56]], parts = []; for (const [u, v] of pegs) { parts.push({ g: stick([u, v - 0.02, 0], [u, v + 0.02, 0.27], 0.026), c: [0.24, 0.11, 0.035] }, { g: ell(0.04, 0.04, 0.04, u, v + 0.022, 0.28, 10), c: [0.30, 0.14, 0.04] }); }
  cell.add(mesh(geoParts(parts), mat(`void main(){ gl_FragColor=vec4(finish(shade(vC,NORMAL,vW,0.5,0.2),vW),1.0); }`, { vertexColors: true })));
  // every piece is there twice: as itself and as its dim outline. hang: it leaves its place while the bee wears it
  const both = (id, make, hang, leaf) => { const real = make(false), ghost = ghosted(make(true), leaf); cell.add(real); cell.add(ghost); SHOW[id] = { real, ghost, hang, extra: [] }; };
  // 1. the acorn cap sits on its peg like a hat on a hook, its leaf hanging from the stalk
  both('cap', () => { const h = capModel(), cap = h.cap; cap.position.set(0, 0, 0); cap.rotation.set(0, 0, 0);
    const by = [0, 0.55, 0.835], bz = [0, -0.835, 0.55], N = 6, s = leafStrip(N), Pp = [], B = [], Nn = [], down = new V3(0, -by[1], -bz[1]), out = new V3(0, by[2], bz[2]), d0 = new V3(0.03, 0.2, -0.5).normalize();
    for (let j = 0; j < N; j++) { const d = d0.clone().lerp(down, Math.min(1, j / 3)).normalize(); Pp.push(j ? Pp[j - 1].clone().addScaledVector(d, 0.05) : h.tip0.clone()); }
    for (let j = 0; j < N - 1; j++) { const T = Pp[j + 1].clone().sub(Pp[j]).normalize(), n = out.clone().addScaledVector(T, -out.dot(T)).normalize(); Nn.push(n); B.push(new V3().crossVectors(T, n)); }
    s.lay(Pp, B, Nn); cap.add(s.mesh); return hold(h, [0, 0.15, 0], [pegs[0][0], pegs[0][1] + 0.03, 0.285], [1, 0, 0], by, bz); }, true);
  // 2. the scarf is looped over its peg, its end hanging down
  both('scarf', () => hold(scarfModel(false, true), [0.10, 0.02, 0.275], [pegs[1][0], pegs[1][1] + 0.03, 0.24], [1, 0, 0], [0, 0.26, -0.966], [0, 0.966, 0.26]), true);
  // 3. the leaf cape hangs by its stalk
  both('cape', () => hold(capeModel(false, false), [0, 0.238, 0.25], [pegs[2][0], pegs[2][1] - 0.02, 0.30], [-1, 0, 0], [0, 0, 1], [0, 1, 0]), true, true);
  // 4. the glowworm tips lie in the bottom corner and light the cell from below
  both('tips', () => hold(tipsModel(1.5), [0, 0.2, 0.72], [0, -1.165, 0.24]), true);
  // 5 to 7. the dusts rest in wax pots on the ledge: moth dust, the orchid bee's sheen, sun gold. A pot stays when its dust is worn
  const mothM = () => mat(`void main(){ vec3 n=NORMAL; vec3 q=floor(vL*230.0); float h=hash21(q.xz+q.y*3.7); vec3 alb=mix(vec3(0.74,0.66,0.52),vec3(0.96,0.93,1.0),h); vec3 c=shade(alb,n,vW,0.2,0.8); c+=vec3(2.2,1.9,1.5)*step(0.965,hash21(q.xz+q.y*9.1))*(0.5+0.5*sin(uTime*7.0+h*40.0)); gl_FragColor=vec4(finish(c,vW),1.0); }`);
  const orchidM = () => mat(`void main(){ vec3 n=NORMAL; vec3 V=normalize(uCam-vW); vec3 q=floor(vL*200.0); float h=hash21(q.xz+q.y*3.7); n=normalize(n+(vec3(hash21(q.xy),hash21(q.yz),hash21(q.zx))-0.5)*0.9); float fr=1.0-max(dot(n,V),0.0);
    vec3 a=mix(vec3(0.08,0.55,0.10),vec3(0.02,0.26,0.62),smoothstep(0.25,0.8,fr)); a=mix(a,vec3(0.32,0.08,0.52),smoothstep(0.8,1.0,fr)*0.6); vec3 c=shade(a*0.6,n,vW,1.6,0.0)+a*vec3(0.9,0.6,0.25)*0.5+a*1.6*step(0.95,h); gl_FragColor=vec4(finish(c,vW),1.0); }`);
  const goldM = () => mat(`void main(){ vec3 n=NORMAL; vec3 q=floor(vL*210.0); float h=hash21(q.xz+q.y*3.7); n=normalize(n+(vec3(hash21(q.xy),hash21(q.yz),hash21(q.zx))-0.5)*0.7); vec3 a=mix(vec3(0.85,0.42,0.04),vec3(1.0,0.70,0.16),h); vec3 c=shade(a,n,vW,1.0,0.3)+vec3(1.0,0.55,0.10)*(0.55+1.6*step(0.94,h)); gl_FragColor=vec4(finish(c,vW),1.0); }`);
  for (const [id, m, u] of [['dust', mothM, -0.84], ['orchid', orchidM, -0.36], ['gold', goldM, 0.12]]) { both(id, locked => { const p = pot(locked ? null : m(), locked); p.position.set(u, -0.418, 0.21); return p; }, false);
    const add = g => { cell.add(g); SHOW[id].extra.push(g); }; // the lights of an earned dust
    if (id === 'gold') add(glow(u, -0.26, 0.24, 0.75, [1.0, 0.60, 0.14], 0.30));
    if (id === 'dust') for (let i = 0; i < 9; i++) add(glow(u + rnd(-0.13, 0.13), -0.28 + rnd(0.22), 0.21 + rnd(-0.08, 0.1), rnd(0.03, 0.06), [1.0, 0.92, 0.75], 0.5 + rnd(0.6))); }
  // a soft light at the cell while something new is waiting in it
  newGlow = glow(0, 0, 0.55, 3.4, [1.0, 0.72, 0.30], 0); newGlow.visible = false; cell.add(newGlow);
  cell.traverse(o => { o.frustumCulled = false; }); scene.add(cell); hidden.push(cell); // inside the hive: it takes no part in the sun's shadows
}

// show each piece as itself, as its outline, or not at all (it is on the bee)
function refresh() { const n = earned();
  PIECES.forEach((p, i) => { const s = SHOW[p.id], got = i < n; s.ghost.visible = !got; s.real.visible = got && !(s.hang && WORN[p.id]); for (const e of s.extra) e.visible = got; });
  shownKey = stateKey(); cardHTML(); }

// ---------- the card ----------
const CSS = `#wardrobe{position:fixed;right:3%;top:50%;transform:translateY(-50%) scale(.97);min-width:190px;padding:16px 22px 14px;border-radius:18px;background:radial-gradient(ellipse at 30% 15%,rgba(74,40,10,.9),rgba(24,12,3,.92));border:1px solid rgba(255,220,150,.32);box-shadow:0 10px 50px rgba(0,0,0,.55),inset 0 0 30px rgba(255,170,50,.08);opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;color:#fff3d6;font-size:15px;line-height:1.35;z-index:6}
#wardrobe.on{opacity:1;transform:translateY(-50%) scale(1);pointer-events:auto}
#wardrobe h2{margin:0 0 .5em;font-weight:normal;font-size:21px;color:#ffd98a;letter-spacing:.06em;text-align:center}
#wardrobe .k{display:grid;grid-template-columns:auto 1fr;gap:5px 12px;align-items:center}
#wardrobe kbd{display:inline-block;min-width:1.3em;padding:.12em .45em;border:1px solid rgba(255,235,190,.55);border-radius:6px;background:rgba(30,16,4,.5);font-family:inherit;font-size:13px;text-align:center}
#wardrobe .wr{cursor:pointer}
#wardrobe .wr.on{color:#ffd98a}
#wardrobe .wr i{font-size:12px;opacity:.75;margin-left:.3em}
#wardrobe .dim{opacity:.45;font-style:italic}
#wardrobe .foot{margin-top:.8em;text-align:center;font-size:12px;opacity:.65}`;
function buildCard() { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  card = document.createElement('div'); card.id = 'wardrobe'; document.body.appendChild(card);
  card.addEventListener('click', e => { const r = e.target.closest && e.target.closest('.wr'); if (r) toggle(+r.dataset.i); });
  addEventListener('keydown', e => { if (e.repeat || !WARD.open) return; const m = /^(?:Digit|Numpad)([1-7])$/.exec(e.code); if (m) toggle(+m[1] - 1); }); }
// an earned piece has its number and its name. A piece that is not earned yet says only "Not yet"
function cardHTML() { if (!card) return; const n = earned(); let h = '<h2>Wardrobe</h2><div class="k">'; shownThird = !!G.third;
  PIECES.forEach((p, i) => { h += i < n ? `<div><kbd>${i + 1}</kbd></div><div class="wr${WORN[p.id] ? ' on' : ''}" data-i="${i}">${p.name}${WORN[p.id] ? ' <i>on</i>' : ''}</div>` : '<div></div><div class="dim">Not yet</div>'; });
  card.innerHTML = h + `</div><div class="foot">${n ? 'press a number to put it on or take it off' : 'each challenge on the trail leaves something here'}${n && !G.third ? '<br><kbd>V</kbd> to see yourself' : ''}</div>`; }

// put piece i on, or take it off. Only an earned piece; of the two coats one at a time (wear.js: one piece for each slot)
export function toggle(i) { if (!(i >= 0 && i < earned())) return false; const id = PIECES[i].id, list = wornList(), k = list.indexOf(id);
  if (k >= 0) list.splice(k, 1); else list.push(id);
  RUN.mem.worn = setWorn(list); saveMem(); refresh();
  if (k >= 0) tone(SCALE[1], 0.05, 0.9); else { tone(SCALE[3], 0.06, 1.2); tone(SCALE[5], 0.05, 1.4, 'sine', 0.09); }
  return true; }

// ---------- the cell is solid ----------
// for a flying bee it is a round block that stands out of the comb (called from collide in player.js, so the camera stays out of it too)
export function wardrobeCollide(p, v) { const dz = p.z - WARD.z, front = WARD.depth + PR; if (dz <= 0 || dz >= front) return; const dx = p.x - WARD.x, dy = p.y - WARD.y, r = Math.hypot(dx, dy), R = WARD.r + PR; if (r >= R) return;
  if (front - dz <= R - r) { p.z = WARD.z + front; if (v.z < 0) v.z *= 0.2; } else { const k = R / Math.max(r, 0.01); p.x = WARD.x + dx * k; p.y = WARD.y + dy * k; } }
// a walking bee stops at the rim. It cannot walk under the cell either: the comb ends there (called from the comb walk in loop.js)
export function wardrobeWalk(p) { const dx = p.x - WARD.x, dy = p.y - WARD.y, R = WARD.r + 0.3; if (Math.abs(dx) >= R || dy >= R) return;
  if (dy >= 0) { const r = Math.hypot(dx, dy); if (r < R) { const k = R / Math.max(r, 0.01); p.x = WARD.x + dx * k; p.y = WARD.y + dy * k; } } else p.x = WARD.x + (dx < 0 ? -R : R); }

// ---------- every frame ----------
export function updateWardrobe(dt) {
  if (stateKey() !== shownKey) refresh(); // a challenge was just won, or the worn pieces changed
  if (WARD.open && shownThird !== !!G.third) cardHTML(); // the line about V is only for the bee's-eye view
  // is the bee at the cell? In flight: in front of it, and slow for a moment. On foot: at its rim
  const dx = P.pos.x - WARD.x, dy = P.pos.y - WARD.y, dz = P.pos.z - WARD.z, k = WARD.open ? 1.25 : 1; let at = false, slow = false;
  if (P.mode === 'fly') { at = Math.abs(dx) < 1.5 * k && Math.abs(dy) < 1.5 * k && dz > 0 && dz < 2.2; slow = P.vel.length() < 2.5; }
  else if (P.mode === 'crawl') { at = Math.hypot(dx, Math.max(dy, 0)) < WARD.r + 0.3 + 0.5 * k && dy > -1.6; slow = true; }
  WARD.at = at; WARD.t = at && (slow || WARD.open) ? WARD.t + dt : 0;
  const open = at && (WARD.open || WARD.t > 0.3);
  if (open !== WARD.open) { WARD.open = open; card.classList.toggle('on', open); if (open) { cardHTML(); if (RUN.mem.seen !== won()) { RUN.mem.seen = won(); saveMem(); } } }
  const fresh = (RUN.mem.seen | 0) < won() && !WARD.open ? 1 : 0; WARD.newK += (fresh - WARD.newK) * Math.min(1, dt * 2);
  newGlow.visible = WARD.newK > 0.01; if (newGlow.visible) newGlow.material.uniforms.uK.value = 0.2 * WARD.newK * (0.75 + 0.25 * Math.sin(U.uTime.value * 2.2));
}

export function setupWardrobe() {
  WARD.ci = BIRTH.ci; WARD.z = COMBS[WARD.ci].z + CT / 2;
  WARD.all = /[?&]wardrobe=all(&|$)/.test(location.search) || location.hash.includes('wardrobe-all');
  quietBuild(40423, () => { rnd = seeded(23); buildCell(); });
  buildCard();
  // the sisters walk round the cell (bees.js): its disc, the strip under it down to the comb's edge, and a little room
  KEEPOFF.push({ ci: WARD.ci, side: WARD.side, x: WARD.x, y: WARD.y, r: WARD.r + 0.2, pole: 1.6, soft: 1.0 });
  // what was worn when the game was saved: only earned pieces, one for each slot
  const n = earned(); RUN.mem.worn = setWorn((RUN.mem.worn || []).filter(id => { const i = PIECES.findIndex(p => p.id === id); return i >= 0 && i < n; }));
  refresh();
  window.__ward = { WARD, PIECES, SHOW, earned, toggle, wardrobeCollide, wardrobeWalk, get card() { return card; }, get cell() { return cell; } }; // for the tests
}
