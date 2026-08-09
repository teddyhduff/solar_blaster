// weapons.js — Weapon definitions for Solar Blaster V2.
// All three weapons available from the start.
// Shop upgrades damage/fire-rate via the 'weaponPower' upgrade track (not per-weapon).

import { BALANCE } from './balance.js';

// Stencil Riso colours (Phaser int format).
const BLAZE = 0xff4d17;
const BONE  = 0xefe9dd;

export const WEAPONS = [
  {
    id:          'laser',
    label:       'LASER',
    key:         1,            // number key shortcut
    magazine:    BALANCE.MAG_LASER,
    fireRateMs:  120,          // cooldown between shots (tier-0)
    projectileSpeed: 900,
    baseDamage:  12,
    // Weapon power upgrade tiers — multiplied onto baseDamage.
    damageMults: [1.0, 1.35, 1.75, 2.2],   // index = tier (0–3)
    fireRateMults: [1.0, 0.85, 0.72, 0.60],
    spread:      0,            // degrees of spread per shot
    shotCount:   1,
    color:       BLAZE,        // blaze bolt
    width:       14,           // projectile width in pixels
    height:      4,
    description: 'Fast, straight, workhorse.',
  },
  {
    id:          'plasma',
    label:       'PLASMA',
    key:         2,
    magazine:    BALANCE.MAG_PLASMA,
    fireRateMs:  280,
    projectileSpeed: 650,
    baseDamage:  20,
    damageMults: [1.0, 1.35, 1.75, 2.2],
    fireRateMults: [1.0, 0.88, 0.75, 0.65],
    spread:      18,           // ±18° outer shots
    shotCount:   3,
    color:       BLAZE,
    width:       10,
    height:      5,
    description: '3-way spread, crowd clearing.',
  },
  {
    id:          'missiles',
    label:       'MISSILES',
    key:         3,
    magazine:    BALANCE.MAG_MISSILES,
    fireRateMs:  600,
    projectileSpeed: 340,
    baseDamage:  55,
    damageMults: [1.0, 1.35, 1.75, 2.2],
    fireRateMults: [1.0, 0.90, 0.80, 0.70],
    spread:      0,
    shotCount:   1,
    homingStrength: 0.04,      // radians/frame toward nearest target
    color:       BONE,         // bone missile body; blaze exhaust
    width:       16,
    height:      6,
    description: 'Slow, homing, hard-hitting.',
  },
];

/** Return a weapon definition by id string. */
export function getWeapon(id) {
  return WEAPONS.find(w => w.id === id) || WEAPONS[0];
}
