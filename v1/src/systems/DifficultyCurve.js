// DifficultyCurve.js — Calculates asteroid speed and spawn rate based on
// which planet you're on and how much time has passed in the current level.

import { BALANCE } from '../data/balance.js';

export const DifficultyCurve = {
  /**
   * Asteroid speed in px/s.
   * @param {number} planetIndex  0 = Mercury, 7 = Neptune
   * @param {number} elapsed      milliseconds since level start
   */
  getAsteroidSpeed(planetIndex, elapsed) {
    // Start at the cross-planet baseline, then ramp up linearly over the level.
    const base = BALANCE.CROSS_PLANET_ASTEROID_SPEED_BASE
                 + planetIndex * BALANCE.CROSS_PLANET_ASTEROID_SPEED_SCALE;
    const rampFraction = Math.min(1, elapsed / BALANCE.LEVEL_DURATION);
    const ramp = BALANCE.WITHIN_LEVEL_SPEED_RAMP * rampFraction;
    return base + ramp;
  },

  /**
   * Milliseconds between asteroid spawns (lower = faster spawning).
   * @param {number} planetIndex
   * @param {number} elapsed
   */
  getSpawnInterval(planetIndex, elapsed) {
    const base = BALANCE.CROSS_PLANET_SPAWN_RATE_BASE
                 + planetIndex * BALANCE.CROSS_PLANET_SPAWN_RATE_SCALE;
    const rampFraction = Math.min(1, elapsed / BALANCE.LEVEL_DURATION);
    const ramp = BALANCE.WITHIN_LEVEL_SPAWN_RAMP * rampFraction;
    // Never drop below 300 ms to avoid overwhelming the player completely.
    return Math.max(300, base - ramp);
  },
};
