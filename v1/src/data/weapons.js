// weapons.js — Stats for all 3 weapon types, at each upgrade tier.
// Index 0 = no upgrades, index 1/2/3 = Hangar tiers.
// All weapons are available from the start; the shop upgrades their power.

export const WEAPONS = {
  laser: {
    id:       'laser',
    name:     'Laser',
    hotkey:   '1',
    // Damage per shot at each tier.
    damage:   [10, 15, 22, 32],
    // Milliseconds between shots.
    fireRate: [120, 100, 85, 70],
    speed:    900,    // projectile speed in px/s
    count:    1,      // projectiles per shot
    spread:   0,      // spread angle in degrees (0 = straight)
    homing:   false,
    color:    0x00F5FF,   // electric cyan
  },
  spread: {
    id:       'spread',
    name:     'Plasma Spread',
    hotkey:   '2',
    damage:   [8, 12, 17, 24],
    fireRate: [300, 260, 220, 180],
    speed:    700,
    count:    3,      // 3 pellets per shot
    spread:   18,     // ±18° fan
    homing:   false,
    color:    0xFF2EC4,   // hot magenta
  },
  missile: {
    id:       'missile',
    name:     'Missiles',
    hotkey:   '3',
    damage:   [40, 58, 82, 115],
    fireRate: [800, 700, 580, 460],
    speed:    380,
    count:    1,
    spread:   0,
    homing:   true,
    homingStrength: 160,   // degrees/second turn rate toward target
    color:    0xFFD93D,    // bright gold
  },
};

// Ordered list (matches keyboard shortcuts 1, 2, 3).
export const WEAPON_IDS   = ['laser', 'spread', 'missile'];
export const WEAPON_LIST  = WEAPON_IDS.map(id => WEAPONS[id]);
