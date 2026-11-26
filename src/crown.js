// Honeylight: the queen's crown: a little gold crown with a soft lavender velvet cushion, violet drops on its points and a blue jewel in front.
// It sits a little crooked on her head and follows her body. Built once with its own random numbers, so nothing here takes a number from the game's stream.
// ?crown=0 leaves it off. The colours are set bluer than they look, because the hive light is warm orange and pulls purple toward pink.
import * as THREE from '../three.module.min.js';
import { V3 } from './core.js';
import { scene, simple, geoParts, ell, stick } from './engine.js';
import { queen } from './bees.js';
import { quietBuild } from './runkit.js';

const GOLD = [1.0, 0.70, 0.22], GOLD2 = [0.85, 0.55, 0.15], VELVET = [0.4, 0.33, 1.0], DROP = [0.42, 0.12, 1.0], JEWEL = [0.06, 0.25, 1.0];
const HEAD = new V3(0, 0.12, 0.36); // the top of the queen's head, in bee space before her stretch
const SIZE = 1.45, TILT = -0.3, ROLL = 0.22; // the crown is not stretched with her body; it leans back and to one side

const part = (parts, spec, sss) => { const o = new THREE.Mesh(geoParts(parts), simple('1.0,1.0,1.0', spec, sss, { vertexColors: true, side: THREE.DoubleSide })); o.frustumCulled = false; return o; };
function ring(r, h) { const g = new THREE.CylinderGeometry(r, r * 0.96, h, 32, 1, true); g.translate(0, h / 2, 0); return g; }
function torus(r, t, y) { const g = new THREE.TorusGeometry(r, t, 8, 32); g.rotateX(Math.PI / 2); g.translate(0, y, 0); return g; }
function cone(r, h, x, y, z) { const g = new THREE.ConeGeometry(r, h, 3); g.translate(x, y + h / 2, z); return g; }
function dome(r, h) { const g = new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(r, h, r); return g; }

// the model in head space: origin on top of the head, y up, z forward (the bee is about 1.1 long)
export function crownModel() { const g = new THREE.Group(), R = 0.105, gold = [{ g: ring(R, 0.04), c: GOLD }, { g: torus(R, 0.008, 0.002), c: GOLD2 }, { g: torus(R, 0.007, 0.04), c: GOLD2 }], gems = [];
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + Math.PI / 2, x = Math.cos(a) * R, z = Math.sin(a) * R; gold.push({ g: cone(0.032, 0.065, x, 0.035, z), c: GOLD }); gems.push({ g: ell(0.017, 0.019, 0.017, x, 0.105, z, 12), c: DROP }); }
  gems.push({ g: ell(0.02, 0.024, 0.012, 0, 0.022, R + 0.006, 12), c: JEWEL }); // the jewel in front
  gold.push({ g: ell(0.014, 0.014, 0.014, 0, 0.095, 0, 10), c: GOLD }, { g: stick([0, 0.08, 0], [0, 0.11, 0], 0.004), c: GOLD }, { g: stick([-0.012, 0.1, 0], [0.012, 0.1, 0], 0.004), c: GOLD }); // the little gold cross on the cushion
  g.add(part(gold, 0.9, 0)); g.add(part(gems, 1.6, 0.8)); g.add(part([{ g: dome(0.098, 0.085), c: VELVET }], 0.2, 0.5)); return g; }

export const CROWN = { on: false, group: null };
const _p = new V3(), _s = new V3(), _q = new THREE.Quaternion(), _tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(TILT, 0, ROLL));
export function setupCrown() {
  if (/[?&]crown=0/.test(location.search)) return;
  const g = quietBuild(51133, () => { const w = new THREE.Group(); w.add(crownModel()); return w; });
  g.matrixAutoUpdate = false; scene.add(g); CROWN.group = g; CROWN.on = true;
  queen.worn = bm => { _p.copy(HEAD).applyMatrix4(bm); bm.decompose(_s, _q, _s); _q.multiply(_tq); g.matrix.compose(_p, _q, _s.setScalar(SIZE)); g.matrixWorldNeedsUpdate = true; }; // bees.js calls this with her matrix each frame
  window.__crown = { CROWN, queen, HEAD }; // for the tests
}
