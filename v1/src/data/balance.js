// balance.js — All numeric tuning values for Solar Blaster.
// Edit values here to rebalance the game without touching gameplay logic.
// The README explains where each value shows up in gameplay.

export const BALANCE = {

  // ── Shield / Health ────────────────────────────────────────────────────────
  BASE_SHIELD:              100,    // starting max shield HP (before per-ship upgrades)
  SHIELD_REGEN_RATE:          2,    // HP regenerated per second while alive
  SHIELD_REGEN_PAUSE:      3000,    // ms of no regen after taking a hit
  I_FRAME_DURATION:        1000,    // ms of invulnerability window after a hit
  SHIELD_BOOST_AMOUNT:       30,    // HP restored instantly by a shield pickup

  // ── Collision Damage ───────────────────────────────────────────────────────
  DAMAGE_SMALL_ASTEROID:     10,
  DAMAGE_MEDIUM_ASTEROID:    20,
  DAMAGE_LARGE_ASTEROID:     35,
  DAMAGE_BOSS_PROJECTILE:    15,

  // ── Scoring ────────────────────────────────────────────────────────────────
  SCORE_SMALL_ASTEROID:      10,
  SCORE_MEDIUM_ASTEROID:     25,
  SCORE_LARGE_ASTEROID:      50,
  SCORE_BOSS:               500,
  // At level win: bonus = Math.floor(remainingShieldFraction * this multiplier)
  SCORE_BOSS_SURVIVAL_BONUS: 200,

  // ── Level Timing ───────────────────────────────────────────────────────────
  LEVEL_DURATION:          82500,   // ms of asteroid phase before boss spawns (midpoint 75–90 s)
  ASTEROID_SPLIT_INTO:         2,   // how many medium pieces a large asteroid splits into

  // ── Pickups ────────────────────────────────────────────────────────────────
  COIN_DROP_CHANCE:         0.30,   // probability a destroyed asteroid drops a coin
  GEM_DROP_CHANCE:          0.05,   // probability a destroyed asteroid drops a gem (rare)
  POWERUP_DROP_CHANCE:      0.08,   // probability a destroyed asteroid drops a power-up
  COIN_VALUE:                  1,
  GEM_VALUE:                   5,
  WEAPON_TOKEN_DURATION:   10000,   // ms of rapid-fire power-up

  // ── Ship Movement ──────────────────────────────────────────────────────────
  BASE_SHIP_SPEED:           280,   // pixels per second (before per-ship upgrades)
  SHIP_MAX_X_FRACTION:      0.92,   // ship can fly across most of the screen (keep a small right margin)

  // ── Cross-planet Difficulty Baseline ──────────────────────────────────────
  // Neptune (planet 7) feels noticeably harder from the first second.
  CROSS_PLANET_ASTEROID_SPEED_BASE:   120,   // px/s on Mercury (planet 0)
  CROSS_PLANET_ASTEROID_SPEED_SCALE:   30,   // extra px/s per planet index
  CROSS_PLANET_SPAWN_RATE_BASE:      1800,   // ms between spawns at Mercury start
  CROSS_PLANET_SPAWN_RATE_SCALE:     -150,   // ms reduction per planet index

  // ── Within-level Ramp ─────────────────────────────────────────────────────
  // Applied linearly over LEVEL_DURATION ms.
  WITHIN_LEVEL_SPEED_RAMP:             80,   // max extra px/s by end of asteroid phase
  WITHIN_LEVEL_SPAWN_RAMP:            600,   // max ms reduction in spawn interval by end

  // ── Boss HP ────────────────────────────────────────────────────────────────
  BOSS_HP_MERCURY: 300,
  BOSS_HP_SCALE:   1.3,   // multiply per planet: Venus = 300*1.3, Earth = 300*1.3^2, …

  UPGRADE_SKIN_COST:    75,
};
