// Honeylight: window.__g: the handles that tests and tools use.
import * as THREE from '../three.module.min.js';
import { POND, WY, FDIR, FIELD_D, HEDGE_R, ORCH, HEDGE_GAPS, HILLS, BROOK, HOLLOW, brookSeg, terrainH, LOG, orchTrees,
  FOREST, forestTrees, overWater } from './world.js';
import { canvas, renderer, scene, camera, untoneHex, U, MP, SWAYGLSL, VERT, COMMON, mat, simple, geoParts, ell, stick,
  puff, hidden, renderFrame } from './engine.js';
import { DAY, applyDayLight } from './day.js';
import { COMBS } from './hive.js';
import { bees, hero, SWARM, callSisters } from './bees.js';
import { flowers, MPSTAT, LIMBS, DEWPATH, shrooms, flowerHit } from './plants.js';
import { pads, fish, BRANCHES, HOL } from './places.js';
import { STONES, ARCHES, WIND, segSeg, archCollide, GUSTS } from './air.js';
import { P, look, chew, takeOff, rebirth, PR, collide } from './player.js';
import { keys, hint, TIPS, tipOnce, keysHTML, showKeys } from './controls.js';
import { CLOVERS, HEAT, heatBuzz } from './abilities.js';
import { NEST, wasps, MOB, startMob, endMob, eatWasp, NESTR, raidNest } from './wasps.js';
import { webs, dragonflies } from './hazards.js';
import { G, save, toast, gainHoney, addPollen, losePollen } from './progress.js';
import { ZONES, stores, zoneLocked, zoneBlocked, openZone } from './zones.js';
import { TRAIL, trailFlower, weave, trailRoutes, startTrail } from './trails.js';
import { tone, noiseHit, sweep } from './audio.js';
import { inHive, outF, time, update } from './loop.js';

export function setupDebug() {
  window.__g = { get time() { return time; }, get inHive() { return inHive; }, get outF() { return outF; }, scene, renderer, mat, simple, geoParts, ell, stick, untoneHex, COMMON, VERT, SWAYGLSL, puff, toast, hint, tone, noiseHit, sweep, addPollen, losePollen, flowerHit, collide, zoneBlocked, zoneLocked, overWater, endMob, save, PR, HEDGE_R, HEDGE_GAPS, noShadow: o => hidden.push(o), tipOnce, look, takeOff, showKeys, keysHTML, TIPS, MP, MPSTAT, LIMBS, HOLROOT: HOL.S, BROOK, HOLLOW, GUSTS, BRANCHES, brookSeg, CLOVERS, heatBuzz, callSisters, SWARM, HEAT, archCollide, segSeg, DEWPATH, U, weave, trailFlower, TRAIL, startTrail, trailRoutes, NESTR, NEST, raidNest, eatWasp, rebirth, chew, hero, ZONES, DAY, dragonflies, openZone, forestTrees, FOREST, stores, applyDayLight, MOB, startMob, STONES, ARCHES, WIND, G, gainHoney, wasps, webs, orchTrees, LOG, HILLS, ORCH, keys, sim: (secs) => { for (let i = 0; i < secs * 60; i++) update(1 / 60); }, fish, snap: () => { renderFrame(); return canvas.toDataURL("image/jpeg", 0.85); }, P, THREE, camera, flowers, pads, shrooms, COMBS, chew, takeOff, WY, POND, terrainH, FDIR, FIELD_D, bees };
}
