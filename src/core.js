// Honeylight: small helpers used everywhere: vector names, random, clamp, lerp.
import * as THREE from '../three.module.min.js';

export const V3 = THREE.Vector3, Q4 = THREE.Quaternion, M4 = THREE.Matrix4;
export const $ = id => document.getElementById(id);
export const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const TAU = Math.PI * 2;
