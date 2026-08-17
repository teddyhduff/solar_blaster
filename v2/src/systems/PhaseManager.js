// PhaseManager.js — Manages the three V2 level phases: Approach → Descent → Conquest.
//
// Phase durations (from balance.js):
//   Approach  ~45s — planet small on horizon, asteroids sparse, hazard gentle
//   Descent   ~60s — planet grows; moons drift through; asteroids denser; hazard intensifies
//   Conquest  until boss dies — planet fills frame; asteroids stop; boss arrives
//
// The planet's visual radius is the primary progress indicator (no mini-map).
// A "DISTANCE TO PLANET" numeric readout supplements it in the HUD.

import { BALANCE } from '../data/balance.js';

export const PHASE = {
  APPROACH:  'approach',
  DESCENT:   'descent',
  CONQUEST:  'conquest',
};

// Planet radius at each phase boundary (in game pixels, 1280×720 canvas).
export const PLANET_R_START    = 28;    // tiny disc on the horizon (Approach start)
export const PLANET_R_DESCENT  = 80;    // planet has grown by Descent start
export const PLANET_R_CONQUEST = 420;   // fills most of the right side by Conquest
const PLANET_CX         = 1200;  // planet centre X (off-right, partially visible at start)
const PLANET_CY         = 360;   // planet centre Y (vertically centred)

export class PhaseManager {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} planetData — from planets.js
   */
  constructor(scene, planetData) {
    this.scene      = scene;
    this.planet     = planetData;
    this._phase     = PHASE.APPROACH;
    this._elapsed   = 0;     // ms elapsed in current phase
    this._bossSpawned = false;
    this._moonsSpawned = false;

    // Planet visual state
    this.planetR    = PLANET_R_START;
    this.planetCX   = PLANET_CX;
    this.planetCY   = PLANET_CY;
    this.planetRotation = 0;

    // Spawn times for moons during Descent (spread across the phase)
    this._moonSpawnTimes = this._planMoonSpawns();
  }

  // ── Phase accessors ──────────────────────────────────────────────────────────

  get phase()  { return this._phase; }
  get isApproach()  { return this._phase === PHASE.APPROACH; }
  get isDescent()   { return this._phase === PHASE.DESCENT; }
  get isConquest()  { return this._phase === PHASE.CONQUEST; }

  /**
   * Normalised 0–1 progress within the current phase.
   * Approach + Descent have fixed durations; Conquest runs until boss dies.
   */
  get phaseProgress() {
    if (this.isApproach)  return Math.min(1, this._elapsed / BALANCE.PHASE_APPROACH_MS);
    if (this.isDescent)   return Math.min(1, this._elapsed / BALANCE.PHASE_DESCENT_MS);
    return 0;   // Conquest has no time limit
  }

  /**
   * 0–1 "distance to planet" normalised across Approach + Descent combined.
   * 0 = far away (start), 1 = conquest begins.
   */
  get journeyProgress() {
    const total = BALANCE.PHASE_APPROACH_MS + BALANCE.PHASE_DESCENT_MS;
    if (this.isApproach)  return this._elapsed / total;
    if (this.isDescent)   return (BALANCE.PHASE_APPROACH_MS + this._elapsed) / total;
    return 1;
  }

  /** km distance readout — purely cosmetic (counts down from 1000 to 0). */
  get distanceKm() {
    return Math.round((1 - this.journeyProgress) * 1000);
  }

  // ── Planet radius ────────────────────────────────────────────────────────────

  _updatePlanetRadius() {
    if (this.isApproach) {
      const t = this.phaseProgress;
      this.planetR = PLANET_R_START + (PLANET_R_DESCENT - PLANET_R_START) * t;
    } else if (this.isDescent) {
      const t = this.phaseProgress;
      this.planetR = PLANET_R_DESCENT + (PLANET_R_CONQUEST - PLANET_R_DESCENT) * t;
    } else {
      this.planetR = PLANET_R_CONQUEST;
    }
  }

  // ── Moon spawn scheduling ────────────────────────────────────────────────────

  _planMoonSpawns() {
    const moons = this.planet.moons || [];
    if (!moons.length) return [];
    const step = BALANCE.PHASE_DESCENT_MS / (moons.length + 1);
    return moons.map((m, i) => ({ moon: m, triggerAt: step * (i + 1), spawned: false }));
  }

  // ── Difficulty multiplier (fed to HazardSystem / asteroid spawn) ─────────────

  get hazardIntensity() {
    if (this.isApproach) return 0.3 + this.phaseProgress * 0.4;   // 0.3 → 0.7
    if (this.isDescent)  return 0.7 + this.phaseProgress * 0.3;   // 0.7 → 1.0
    return 1.0;
  }

  /** Asteroid spawn interval multiplier. 1.0 = baseline, smaller = more asteroids. */
  get spawnIntervalMult() {
    if (this.isApproach) return 1.0 - this.phaseProgress * 0.25;
    if (this.isDescent)  return 0.75 - this.phaseProgress * 0.25;
    return 0;   // no spawning in Conquest
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  /**
   * Call every frame from GameScene.update().
   * dt: delta time in ms
   * Returns an array of events that happened this tick:
   *   { type: 'phaseChange', from, to }
   *   { type: 'spawnMoon', moon }
   *   { type: 'spawnBoss' }
   */
  update(dt) {
    const events = [];

    dt *= (this.planet.gameSpeed ?? BALANCE.GAME_SPEED);   // per-planet level-tempo multiplier

    this._elapsed += dt;
    this.planetRotation += 0.0004 * dt;   // slow spin
    this._updatePlanetRadius();

    if (this.isApproach && this._elapsed >= BALANCE.PHASE_APPROACH_MS) {
      this._elapsed = 0;
      this._phase = PHASE.DESCENT;
      events.push({ type: 'phaseChange', from: PHASE.APPROACH, to: PHASE.DESCENT });
    } else if (this.isDescent) {
      // Check moon spawns
      for (const slot of this._moonSpawnTimes) {
        if (!slot.spawned && this._elapsed >= slot.triggerAt) {
          slot.spawned = true;
          events.push({ type: 'spawnMoon', moon: slot.moon });
        }
      }
      if (this._elapsed >= BALANCE.PHASE_DESCENT_MS) {
        this._elapsed = 0;
        this._phase = PHASE.CONQUEST;
        events.push({ type: 'phaseChange', from: PHASE.DESCENT, to: PHASE.CONQUEST });
        if (!this._bossSpawned) {
          this._bossSpawned = true;
          events.push({ type: 'spawnBoss' });
        }
      }
    }

    return events;
  }

  // ── Called when boss dies to signal conquest complete ────────────────────────

  onBossDefeated() {
    this.scene.events.emit('conquestComplete');
  }
}
