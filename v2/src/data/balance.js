// balance.js — All numeric tuning values for Solar Blaster V2.
// Edit values here to rebalance without touching gameplay logic.
// Every Section 13 default from the V2 spec is listed here.

export const BALANCE = {

  // ── Global Level Tempo ──────────────────────────────────────────────────────
  // Source of truth for level pace. Every planet uses BALANCE.GAME_SPEED.
  // It scales the "world": phase progression (time-to-boss, planet growth,
  // distance readout, hazard ramp, moon timing), asteroid travel speed, asteroid
  // spawn cadence, and moon drift. Ship control, damage, HP, and reload are
  // intentionally NOT scaled so the game stays fair and controllable.
  // 1 = original pace; 5 = five times faster.
  GAME_SPEED:                  1,

  // ── Shield / Health ────────────────────────────────────────────────────────
  BASE_SHIELD:              100,    // starting max shield HP
  SHIELD_PER_CAPACITY_TIER:  25,   // +25 HP per Shield Capacity upgrade tier, max 3 tiers
  SHIELD_REGEN_RATE:          2,   // HP/sec while alive
  SHIELD_REGEN_PAUSE:       3000,  // ms of no regen after taking a hit
  I_FRAME_DURATION:         1000,  // ms of invulnerability after a hit
  SHIELD_BOOST_AMOUNT:        30,  // HP restored by a Shield Boost pickup

  // ── Collision Damage ───────────────────────────────────────────────────────
  DAMAGE_SMALL_ASTEROID:     10,
  DAMAGE_MEDIUM_ASTEROID:    20,
  DAMAGE_LARGE_ASTEROID:     35,
  DAMAGE_MOON:               50,   // V2: moon collision is a big hit
  DAMAGE_BOSS_PROJECTILE:    25,

  // ── Scoring ────────────────────────────────────────────────────────────────
  SCORE_SMALL_ASTEROID:      10,
  SCORE_MEDIUM_ASTEROID:     25,
  SCORE_LARGE_ASTEROID:      50,
  SCORE_MOON:               250,   // rarely worth it — that's the joke
  SCORE_BOSS:               500,
  SCORE_BOSS_SURVIVAL_BONUS: 200,  // scaled to remaining shield fraction
  SCORE_NEAR_MISS:           15,
  COMBO_WINDOW_MS:         2600,
  COMBO_MAX:                  8,
  HITSTOP_MS:                48,
  HITSTOP_BOSS_MS:           72,
  NEAR_MISS_PAD:             18,
  HEX_COIN_COUNT:             7,
  PLASMA_SMEAR_MS:          420,
  PLASMA_SMEAR_R:            16,
  PLASMA_SMEAR_DAMAGE:        8,
  PLASMA_SMEAR_GAP:          30,   // drop a smear every N px of travel
  RAPID_FIRE_DROP_FRACTION: 0.45,  // share of POWERUP drops that are rapid-fire

  // ── Phase Durations ────────────────────────────────────────────────────────
  PHASE_APPROACH_MS:       45000,  // ~45 seconds
  PHASE_DESCENT_MS:        60000,  // ~60 seconds
  // Conquest has no timer — it ends when the boss dies

  // ── Asteroids ─────────────────────────────────────────────────────────────
  ASTEROID_SPLIT_INTO:         2,  // large asteroid splits into this many mediums

  // ── Pickups ────────────────────────────────────────────────────────────────
  COIN_DROP_CHANCE:         0.30,  // probability a destroyed asteroid drops a coin
  GEM_DROP_CHANCE:          0.05,  // probability of a gem (rare, worth 5 coins)
  POWERUP_DROP_CHANCE:      0.08,  // probability of a power-up (shield/rapid-fire)
  AMMO_CRATE_DROP_CHANCE:   0.10,  // probability of an ammo crate
  COIN_VALUE:                  1,
  GEM_VALUE:                   5,
  WEAPON_TOKEN_DURATION:   10000,  // ms of rapid-fire; still drains magazine

  // ── Weapons & Magazines ────────────────────────────────────────────────────
  MAG_LASER:                  30,
  MAG_PLASMA:                 12,
  MAG_MISSILES:                6,
  // Magazine Capacity upgrade: +50% at max tier (tier 3) — applied linearly
  MAG_CAPACITY_PER_TIER:    0.17,  // fraction added per tier (~17% × 3 ≈ 50% at tier 3)
  RELOAD_TIME_MS:           1000,  // base reload duration
  RELOAD_TIME_MIN_MS:        700,  // reload time at max Magazine Capacity tier

  // ── Ship Movement ──────────────────────────────────────────────────────────
  BASE_SHIP_SPEED:           280,  // px/s before upgrades
  SPEED_PER_TIER:             50,  // px/s per Speed & Handling tier (max 3)
  SHIP_MAX_X_FRACTION:      0.92,  // ship can use most of the screen width

  // ── Cross-destination Difficulty Baseline ──────────────────────────────────
  // Neptune (idx 0) is the easiest; Sun (idx 8) is the hardest.
  CROSS_PLANET_ASTEROID_SPEED_BASE:   120,   // px/s at Neptune
  CROSS_PLANET_ASTEROID_SPEED_SCALE:   30,   // extra px/s per destination index
  CROSS_PLANET_SPAWN_RATE_BASE:      1800,   // ms between spawns at Neptune start
  CROSS_PLANET_SPAWN_RATE_SCALE:     -150,   // ms reduction per destination index

  // ── Within-level Ramp ─────────────────────────────────────────────────────
  // Applied linearly across Approach + Descent phases.
  WITHIN_LEVEL_SPEED_RAMP:             80,   // max extra px/s by end of Descent
  WITHIN_LEVEL_SPAWN_RAMP:            600,   // max ms reduction in spawn interval by end

  // ── Boss HP ────────────────────────────────────────────────────────────────
  // Neptune ≈ 300, each destination ×1.25, Sun ≈ 1800.
  BOSS_HP_NEPTUNE:            300,
  BOSS_HP_SCALE:             1.25,  // multiplier per destination index

  // ── Upgrade Costs ──────────────────────────────────────────────────────────
  UPGRADE_COST_TIER_1:        50,
  UPGRADE_COST_TIER_2:       125,
  UPGRADE_COST_TIER_3:       300,
  UPGRADE_SKIN_COST:          75,   // per marking skin

  // ── Moon ──────────────────────────────────────────────────────────────────
  MOON_HP:                  1000,   // enormous HP — dodge-only in practice
  MOON_SCORE:                250,   // same as SCORE_MOON (alias for clarity)
  MOON_SPEED_PX_S:            30,   // slow drift speed

  // ── Enemy ships ────────────────────────────────────────────────────────────
  ENEMY_HP:                   28,
  ENEMY_DAMAGE:               18,   // ram
  ENEMY_SHOT_DAMAGE:          12,
  ENEMY_SCORE:                40,
  ENEMY_SPEED:               110,
  ENEMY_FIRE_MS:            1900,
  ENEMY_SPAWN_MS:          10400,
  ENEMY_SPAWN_FIRST_MS:    16000,
  ENEMY_MAX_ALIVE:             3,
  DAMAGE_ROCKET:              30,
};
