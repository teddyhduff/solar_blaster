// upgrades.js — V2 upgrade system: 4 global tracks + cosmetic skin markings.
// Tracks apply to every level regardless of skin. Skins are marking/pattern
// variants only — no hull colour changes (bone hull is always constant).

import { BALANCE } from './balance.js';

// ── 4 Global Upgrade Tracks ──────────────────────────────────────────────────
// Each track has 3 tiers. Costs from balance.js Section 13.
export const UPGRADE_TRACKS = [
  {
    id:          'weaponPower',
    label:       'WEAPON POWER',
    description: 'Increases damage and fire rate for all weapons.',
    maxTier:     3,
    costs:       [BALANCE.UPGRADE_COST_TIER_1, BALANCE.UPGRADE_COST_TIER_2, BALANCE.UPGRADE_COST_TIER_3],
    tierLabels:  ['Tier 1 — +35% damage', 'Tier 2 — +75% damage', 'Tier 3 — ×2.2 damage'],
  },
  {
    id:          'shieldCapacity',
    label:       'SHIELD CAPACITY',
    description: 'Increases maximum shield HP.',
    maxTier:     3,
    costs:       [BALANCE.UPGRADE_COST_TIER_1, BALANCE.UPGRADE_COST_TIER_2, BALANCE.UPGRADE_COST_TIER_3],
    tierLabels:  ['+25 HP → 125 max', '+25 HP → 150 max', '+25 HP → 175 max'],
  },
  {
    id:          'speed',
    label:       'SPEED & HANDLING',
    description: 'Faster, tighter ship movement.',
    maxTier:     3,
    costs:       [BALANCE.UPGRADE_COST_TIER_1, BALANCE.UPGRADE_COST_TIER_2, BALANCE.UPGRADE_COST_TIER_3],
    tierLabels:  ['+50 px/s', '+50 px/s → 380', '+50 px/s → 430'],
  },
  {
    id:          'magazineCapacity',
    label:       'MAGAZINE CAPACITY',
    description: 'Larger magazines and faster reloads across all weapons.',
    maxTier:     3,
    costs:       [BALANCE.UPGRADE_COST_TIER_1, BALANCE.UPGRADE_COST_TIER_2, BALANCE.UPGRADE_COST_TIER_3],
    tierLabels:  ['+17% magazine size', '+17% → total +34%', '+17% → total +50%; reload 0.7s'],
  },
];

// ── Cosmetic Skin Markings ────────────────────────────────────────────────────
// Bone hull always constant. Skins vary stripe/stencil-cut/canopy-mark geometry.
export const SKINS = [
  {
    id:       'standard',
    label:    'STANDARD',
    cost:     0,               // default, always owned
    marking:  'none',          // no extra marking geometry
  },
  {
    id:       'stripe',
    label:    'WING STRIPE',
    cost:     BALANCE.UPGRADE_SKIN_COST,
    marking:  'stripe',        // blaze diagonal stripe across delta wings
  },
  {
    id:       'stencil',
    label:    'STENCIL CUT',
    cost:     BALANCE.UPGRADE_SKIN_COST,
    marking:  'stencilCut',    // ink cut-out silhouette panel on hull
  },
  {
    id:       'canopyMark',
    label:    'CANOPY MARK',
    cost:     BALANCE.UPGRADE_SKIN_COST,
    marking:  'canopyMark',    // teal geometric mark over canopy
  },
  {
    id:       'hazard',
    label:    'HAZARD',
    cost:     BALANCE.UPGRADE_SKIN_COST,
    marking:  'hazardStripes', // blaze/bone alternating hazard chevrons on wings
  },
];

/** Find a skin definition by id. */
export function getSkin(id) {
  return SKINS.find(s => s.id === id) || SKINS[0];
}
