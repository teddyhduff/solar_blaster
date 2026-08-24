// upgrades.js — Cosmetic skins and their per-ship upgrade tracks.
// Each skin has 2 thematic upgrade tracks (3 tiers each) with unique gameplay effects.
//
// effect values:
//   weaponTier      — sets Ship.weaponTier directly to the tier number (1/2/3)
//   shield          — adds effectValues[tier-1] HP to Ship.maxShield (cumulative sum)
//   speed           — adds effectValues[tier-1] px/s to Ship.baseSpeed (cumulative sum)
//   fireRateMult    — sets Ship.fireRateMult to effectValues[tier-1] (multiplies fire cooldown)
//   damageMult      — sets Ship.damageMult to effectValues[tier-1] (multiplies projectile damage)
//   damageReduction — sets Ship.damageReduction to effectValues[tier-1] (fraction blocked)
//   hazardResistance— sets Ship.hazardResistance to effectValues[tier-1] (fraction of force blocked)
//   extraShots      — sets Ship.extraShots to effectValues[tier-1]
//   iFrameBonus     — adds effectValues[tier-1] ms to i-frame invulnerability window

import { BALANCE } from './balance.js';

export const SKINS = [
  {
    id:    'cyan',
    label: 'Cyber Cyan',
    color: 0x00F5FF,
    shape: 'interceptor',
    cost:  0,
    // Balanced default — all values match BALANCE globals, listed for clarity.
    baseStats: { shield: 100, speed: 280, damageMult: 1.0, fireRateMult: 1.0 },
    upgrades: [
      {
        id:          'targeting',
        label:       'Targeting Matrix',
        description: 'Weapon damage and fire rate.',
        effect:      'weaponTier',
        costs:       [80, 200, 500],
        bonusLabels: ['Weapon Tier 1', 'Weapon Tier 2', 'Weapon Tier 3'],
      },
      {
        id:           'reactiveArmour',
        label:        'Reactive Armour',
        description:  'Maximum shield HP.',
        effect:       'shield',
        effectValues: [25, 40, 65],
        costs:        [60, 160, 400],
        bonusLabels:  ['+25 HP', '+40 HP', '+65 HP'],
      },
    ],
  },
  {
    id:    'magenta',
    label: 'Hot Magenta',
    color: 0xFF2EC4,
    shape: 'dart',
    cost:  BALANCE.UPGRADE_SKIN_COST,
    // Glass cannon: fast, fires quickly, but fragile.
    baseStats: { shield: 60, speed: 380, damageMult: 0.75, fireRateMult: 0.60 },
    upgrades: [
      {
        id:           'hyperdrive',
        label:        'Hyperdrive',
        description:  'Ship movement speed.',
        effect:       'speed',
        effectValues: [60, 90, 130],
        costs:        [90, 220, 550],
        bonusLabels:  ['+60 px/s', '+90 px/s', '+130 px/s'],
      },
      {
        id:           'microreactor',
        label:        'Microreactor',
        description:  'Fire cooldown multiplier (lower = faster).',
        effect:       'fireRateMult',
        effectValues: [0.85, 0.72, 0.60],
        costs:        [80, 200, 480],
        bonusLabels:  ['×0.85 cooldown', '×0.72 cooldown', '×0.60 cooldown'],
      },
    ],
  },
  {
    id:    'gold',
    label: 'Solar Gold',
    color: 0xFFD93D,
    shape: 'gunship',
    cost:  BALANCE.UPGRADE_SKIN_COST,
    // Slow tank: high shield, massive damage, sluggish movement and fire rate.
    baseStats: { shield: 180, speed: 180, damageMult: 2.5, fireRateMult: 1.5 },
    upgrades: [
      {
        id:           'heavyCannon',
        label:        'Heavy Cannon',
        description:  'Projectile damage multiplier.',
        effect:       'damageMult',
        effectValues: [1.3, 1.6, 2.0],
        costs:        [100, 260, 650],
        bonusLabels:  ['×1.3 damage', '×1.6 damage', '×2.0 damage'],
      },
      {
        id:           'blastPlating',
        label:        'Blast Plating',
        description:  'Shield HP + incoming damage reduction.',
        effect:       'blastPlating',   // compound effect handled in Ship._applyTrackEffect
        effectValues: [[40, 0.15], [60, 0.25], [90, 0.35]],
        costs:        [90, 240, 600],
        bonusLabels:  ['+40 HP / -15% dmg', '+60 HP / -25% dmg', '+90 HP / -35% dmg'],
      },
    ],
  },
  {
    id:    'green',
    label: 'Plasma Green',
    color: 0x00E5A0,
    shape: 'scout',
    cost:  BALANCE.UPGRADE_SKIN_COST,
    // Evasive scout: quick, light hits, slightly fragile.
    baseStats: { shield: 80, speed: 340, damageMult: 0.85, fireRateMult: 0.80 },
    upgrades: [
      {
        id:           'afterburner',
        label:        'Afterburner',
        description:  'Ship movement speed.',
        effect:       'speed',
        effectValues: [50, 80, 120],
        costs:        [70, 180, 450],
        bonusLabels:  ['+50 px/s', '+80 px/s', '+120 px/s'],
      },
      {
        id:           'evadeProtocol',
        label:        'Evade Protocol',
        description:  'Hazard force resistance.',
        effect:       'hazardResistance',
        effectValues: [0.20, 0.40, 0.60],
        costs:        [70, 180, 450],
        bonusLabels:  ['-20% hazard force', '-40% hazard force', '-60% hazard force'],
      },
    ],
  },
  {
    id:    'white',
    label: 'Arctic White',
    color: 0xF0F0FF,
    shape: 'cruiser',
    cost:  BALANCE.UPGRADE_SKIN_COST,
    // Versatile cruiser: slightly above-average health, a little slower, hits marginally harder.
    baseStats: { shield: 120, speed: 240, damageMult: 1.15, fireRateMult: 1.2 },
    upgrades: [
      {
        id:           'quadCannons',
        label:        'Quad Cannons',
        description:  'Extra projectiles per shot.',
        effect:       'extraShots',
        effectValues: [1, 1, 2],
        costs:        [120, 300, 750],
        bonusLabels:  ['+1 shot', '+1 shot (×2 total)', '+2 shots (×3 total)'],
      },
      {
        id:           'phaseShield',
        label:        'Phase Shield',
        description:  'Shield HP + longer invulnerability.',
        effect:       'phaseShield',   // compound effect handled in Ship._applyTrackEffect
        effectValues: [[20, 500], [35, 1000], [55, 1500]],
        costs:        [90, 230, 580],
        bonusLabels:  ['+20 HP / +0.5s i-frames', '+35 HP / +1s i-frames', '+55 HP / +1.5s i-frames'],
      },
    ],
  },
];

// Quick lookup maps.
export const SKIN_COLORS = Object.fromEntries(SKINS.map(s => [s.id, s.color]));
export const SKIN_MAP    = Object.fromEntries(SKINS.map(s => [s.id, s]));
