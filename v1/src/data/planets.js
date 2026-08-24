// planets.js — Data for all 8 planets in solar-system order.
// Each planet has a unique hazard, boss theme, and visual accent color.

import { BALANCE } from './balance.js';

// Helper: compute boss HP scaling up from Mercury (~×1.3 per planet).
function bossHp(index) {
  return Math.round(BALANCE.BOSS_HP_MERCURY * Math.pow(BALANCE.BOSS_HP_SCALE, index));
}

export const PLANETS = [
  {
    id:          'mercury',
    name:        'Mercury',
    index:       0,
    accentColor: 0xFF6B35,   // orange-red flare tones
    bgTint:      0x3A1800,   // subtle warm tint on background
    hazardId:    'solarFlare',
    hazardDesc:  'Solar flares sweep the screen!',
    bossTheme:   'Rogue Mining Robot',
    bossHp:      bossHp(0),  // 300
    theme: {
      skyTop:          0x060200,
      skyBottom:       0x3A1500,
      planetBody:      0x7A6040,
      planetShade:     0x3C2C18,
      planetHighlight: 0xB09070,
      atmosphere:      0xFF6B35,
      starColor:       0xFFBB66,
      detail:          'craters',
    },
  },
  {
    id:          'venus',
    name:        'Venus',
    index:       1,
    accentColor: 0xB5E853,   // sickly yellow-green haze
    bgTint:      0x1A2200,
    hazardId:    'toxicCloud',
    hazardDesc:  'Toxic clouds reduce visibility.',
    bossTheme:   'Alien Bio-Creature',
    bossHp:      bossHp(1),  // 390
    theme: {
      skyTop:          0x050802,
      skyBottom:       0x273800,
      planetBody:      0xC8C060,
      planetShade:     0x707020,
      planetHighlight: 0xEEE880,
      atmosphere:      0xB5E853,
      starColor:       0xCCDD88,
      detail:          'clouds',
    },
  },
  {
    id:          'earth',
    name:        'Earth',
    index:       2,
    accentColor: 0x4FC3F7,   // blue-green with white satellite glints
    bgTint:      0x001A2B,
    hazardId:    'debrisField',
    hazardDesc:  'Dense satellite debris clusters!',
    bossTheme:   'Alien Mothership',
    bossHp:      bossHp(2),  // ~507
    theme: {
      skyTop:          0x000814,
      skyBottom:       0x001A30,
      planetBody:      0x1A4A80,
      planetShade:     0x0A1830,
      planetHighlight: 0x4FC3F7,
      atmosphere:      0x4488FF,
      starColor:       0xCCEEFF,
      detail:          'continents',
    },
  },
  {
    id:          'mars',
    name:        'Mars',
    index:       3,
    accentColor: 0xE57373,   // rust red
    bgTint:      0x2B0800,
    hazardId:    'sandstorm',
    hazardDesc:  'Sandstorm pushes your ship!',
    bossTheme:   'Rock Guardian',
    bossHp:      bossHp(3),  // ~659
    theme: {
      skyTop:          0x0D0302,
      skyBottom:       0x4A1500,
      planetBody:      0xA03020,
      planetShade:     0x500E05,
      planetHighlight: 0xE07050,
      atmosphere:      0xE57373,
      starColor:       0xFFAA88,
      detail:          'dust',
    },
  },
  {
    id:          'jupiter',
    name:        'Jupiter',
    index:       4,
    accentColor: 0xFFB74D,   // amber/brown bands
    bgTint:      0x1A0D00,
    hazardId:    'gravityWell',
    hazardDesc:  'Gravity wells pull you in!',
    bossTheme:   'Giant War Machine',
    bossHp:      bossHp(4),  // ~857
    theme: {
      skyTop:          0x080400,
      skyBottom:       0x200E00,
      planetBody:      0xC08040,
      planetShade:     0x603010,
      planetHighlight: 0xF0C070,
      atmosphere:      0xFFB74D,
      starColor:       0xFFDD99,
      detail:          'bands',
    },
  },
  {
    id:          'saturn',
    name:        'Saturn',
    index:       5,
    accentColor: 0xFFF176,   // pale gold rings
    bgTint:      0x1A1600,
    hazardId:    'ringDebris',
    hazardDesc:  'Ring debris band — dodge fast!',
    bossTheme:   'Ring Serpent Guardian',
    bossHp:      bossHp(5),  // ~1114
    theme: {
      skyTop:          0x080700,
      skyBottom:       0x1A1600,
      planetBody:      0xD4B870,
      planetShade:     0x806030,
      planetHighlight: 0xF0E0A0,
      atmosphere:      0xFFF176,
      starColor:       0xFFEEBB,
      detail:          'rings',
    },
  },
  {
    id:          'uranus',
    name:        'Uranus',
    index:       6,
    accentColor: 0x80DEEA,   // icy cyan-blue
    bgTint:      0x001820,
    hazardId:    'iceComet',
    hazardDesc:  'Ice zones slow your ship!',
    bossTheme:   'Crystalline Robot',
    bossHp:      bossHp(6),  // ~1448
    theme: {
      skyTop:          0x000A10,
      skyBottom:       0x001A25,
      planetBody:      0x4AB8C8,
      planetShade:     0x204050,
      planetHighlight: 0x90E0EE,
      atmosphere:      0x80DEEA,
      starColor:       0xBBEEFF,
      detail:          'ice',
    },
  },
  {
    id:          'neptune',
    name:        'Neptune',
    index:       7,
    accentColor: 0x7C4DFF,   // deep indigo
    bgTint:      0x08001A,
    hazardId:    'windGust',
    hazardDesc:  'Violent wind gusts push you!',
    bossTheme:   'The Final Dreadnought',
    bossHp:      bossHp(7),  // ~1882
    theme: {
      skyTop:          0x020010,
      skyBottom:       0x0A0030,
      planetBody:      0x1A2A80,
      planetShade:     0x080820,
      planetHighlight: 0x4060C0,
      atmosphere:      0x7C4DFF,
      starColor:       0x9999FF,
      detail:          'storm',
    },
  },
];

/** Get planet data by its string id (e.g. 'mercury'). */
export function getPlanetById(id) {
  return PLANETS.find(p => p.id === id);
}

/** Get the planet that comes after the given one, or null if Neptune. */
export function getNextPlanet(currentId) {
  const idx = PLANETS.findIndex(p => p.id === currentId);
  return idx >= 0 && idx < PLANETS.length - 1 ? PLANETS[idx + 1] : null;
}
