// DifficultyCurve.js — Asteroid speed and spawn-rate tuning for V2.
// Planet index 0 (Neptune) = easiest; index 8 (Sun) = hardest.
// GameScene multiplies the spawn interval further by PhaseManager.spawnIntervalMult.

import { BALANCE } from '../data/balance.js';

export class DifficultyCurve {
  /**
   * @param {number} planetIndex  0 = Neptune … 8 = Sun
   * @param {number} [gameSpeed]  per-planet level-tempo multiplier (falls back to BALANCE.GAME_SPEED)
   */
  constructor(planetIndex, gameSpeed) {
    this._pi = planetIndex ?? 0;
    this._gs = gameSpeed ?? BALANCE.GAME_SPEED;
  }

  /**
   * Asteroid speed in px/s.
   * elapsedMs: time elapsed across Approach + Descent so far.
   */
  asteroidSpeed(elapsedMs) {
    const base       = BALANCE.CROSS_PLANET_ASTEROID_SPEED_BASE
                     + this._pi * BALANCE.CROSS_PLANET_ASTEROID_SPEED_SCALE;
    const totalMs    = BALANCE.PHASE_APPROACH_MS + BALANCE.PHASE_DESCENT_MS;
    const rampFrac   = Math.min(1, elapsedMs / totalMs);
    // Asteroids travel gameSpeed× faster (per-planet, see planets.js).
    return (base + BALANCE.WITHIN_LEVEL_SPEED_RAMP * rampFrac) * this._gs;
  }

  /**
   * Spawn interval in ms (lower = more asteroids).
   */
  spawnInterval(elapsedMs) {
    const base     = BALANCE.CROSS_PLANET_SPAWN_RATE_BASE
                   + this._pi * BALANCE.CROSS_PLANET_SPAWN_RATE_SCALE;
    const totalMs  = BALANCE.PHASE_APPROACH_MS + BALANCE.PHASE_DESCENT_MS;
    const rampFrac = Math.min(1, elapsedMs / totalMs);
    // Spawn gameSpeed× more often so the field stays populated at higher speed.
    return Math.max(300, base - BALANCE.WITHIN_LEVEL_SPAWN_RAMP * rampFrac) / this._gs;
  }
}
