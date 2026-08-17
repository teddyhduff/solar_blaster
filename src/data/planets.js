// planets.js — All 9 V2 destinations in fixed inward campaign order.
// Neptune → Uranus → Saturn → Jupiter → Mars → Earth → Venus → Mercury → Sun
//
// Stencil Riso palette: three inks only (bone, blaze, teal).
// 'blazeDensity' controls halftone dot density on the planet disc (0–1).
// 'craterCount' and 'craterScale' tune the ink-disc craters.
// No new hues — per-planet visual identity comes from dot density + crater placement.

import { BALANCE } from './balance.js';

// Phaser integer colours for the three inks.
const INK   = 0x16181c;
const BONE  = 0xefe9dd;
const BLAZE = 0xff4d17;
const TEAL  = 0x0f7a6a;

function bossHp(index) {
  return Math.round(BALANCE.BOSS_HP_NEPTUNE * Math.pow(BALANCE.BOSS_HP_SCALE, index));
}

export const PLANETS = [

  // ── 1. Neptune ──────────────────────────────────────────────────────────────
  {
    id:           'neptune',
    name:         'Neptune',
    subtitle:     'THE OUTER GATE',
    index:        0,
    gameSpeed:    BALANCE.GAME_SPEED,               // from balance.js — edit GAME_SPEED there
    hazardId:     'windGusts',     // sudden lateral gusts + drifting Dark Spot vortex
    hazardDesc:   'Supersonic wind gusts shove the ship sideways.',
    moons: [
      { id: 'triton', name: 'Triton', radiusRatio: 0.18, speedSign: -1,
        desc: 'Retrograde orbit — drifts against the flow of everything else.' },
    ],
    boss: {
      theme:      'Wind Leviathan',
      hp:          bossHp(0),
      phase2At:   0.5,
      attackPatterns: ['gustSweep', 'vortexPull', 'plasmaBolts'],
    },
    // Stencil Riso palette
    blazeDensity:    0.45,   // lighter halftone — outer, cold, dark
    craterCount:     0,
    inkAccent:       INK,
    atmosphereAlpha: 0.25,   // faint bone rim
  },

  // ── 2. Uranus ───────────────────────────────────────────────────────────────
  {
    id:           'uranus',
    name:         'Uranus',
    subtitle:     'THE TILTED WORLD',
    index:        1,
    gameSpeed:    BALANCE.GAME_SPEED,              // from balance.js — edit GAME_SPEED there
    hazardId:     'tiltingField', // entire play-field direction rotates 90° periodically
    hazardDesc:   "The planet's 98° tilt warps the field — drift direction rotates.",
    moons: [
      { id: 'miranda',  name: 'Miranda',  radiusRatio: 0.09, speedSign: 1 },
      { id: 'titania',  name: 'Titania',  radiusRatio: 0.14, speedSign: 1 },
      { id: 'oberon',   name: 'Oberon',   radiusRatio: 0.14, speedSign: 1 },
    ],
    boss: {
      theme:      'Crystalline Robot',
      hp:          bossHp(1),
      phase2At:   0.5,
      attackPatterns: ['iceShard', 'tiltReorient', 'crystalWall'],
    },
    blazeDensity:    0.38,
    craterCount:     0,
    inkAccent:       INK,
    atmosphereAlpha: 0.20,
  },

  // ── 3. Saturn ───────────────────────────────────────────────────────────────
  {
    id:           'saturn',
    name:         'Saturn',
    subtitle:     'THE RING RUN',
    index:        2,
    gameSpeed:    BALANCE.GAME_SPEED,              // from balance.js — edit GAME_SPEED there
    hazardId:     'ringDebris',   // dense fast small asteroid bands + hexagonal bonus pocket
    hazardDesc:   'Ring debris demands precise weaving. Find the hexagonal pocket for coins.',
    moons: [
      { id: 'titan',     name: 'Titan',     radiusRatio: 0.20, speedSign: 1 },
      { id: 'enceladus', name: 'Enceladus', radiusRatio: 0.08, speedSign: 1 },
      { id: 'mimas',     name: 'Mimas',     radiusRatio: 0.07, speedSign: 1 },
    ],
    boss: {
      theme:      'Ring Harvester',
      hp:          bossHp(2),
      phase2At:   0.5,
      attackPatterns: ['ringShrapnel', 'segmentCharge', 'debrisCloud'],
    },
    blazeDensity:    0.55,   // warm, medium density
    craterCount:     0,
    inkAccent:       INK,
    atmosphereAlpha: 0.18,
    ringVisible:     true,   // Saturn renders a bone ring arc behind the disc
  },

  // ── 4. Jupiter ──────────────────────────────────────────────────────────────
  {
    id:           'jupiter',
    name:         'Jupiter',
    subtitle:     'THE GIANT\'S EYE',
    index:        3,
    gameSpeed:    BALANCE.GAME_SPEED,               // from balance.js — edit GAME_SPEED there
    hazardId:     'gravityWells',  // gravity wells + radiation belt lanes
    hazardDesc:   'Gravity wells drag the ship. Radiation belt lanes drain shield.',
    moons: [
      { id: 'io',       name: 'Io',       radiusRatio: 0.12, speedSign: 1 },
      { id: 'europa',   name: 'Europa',   radiusRatio: 0.11, speedSign: 1 },
      { id: 'ganymede', name: 'Ganymede', radiusRatio: 0.20, speedSign: 1 },
      { id: 'callisto', name: 'Callisto', radiusRatio: 0.16, speedSign: 1 },
    ],
    boss: {
      theme:      'Robot War Machine',
      hp:          bossHp(3),
      phase2At:   0.5,
      attackPatterns: ['gravitySlam', 'radiationBurst', 'missileBarrage'],
      bossArena:  'greatRedSpot',  // Conquest replaces backdrop with GRS swirl
    },
    blazeDensity:    0.70,   // dense banding, vivid
    craterCount:     0,
    inkAccent:       INK,
    atmosphereAlpha: 0.30,
    bandCount:       6,      // bone horizontal banding lines on disc
  },

  // ── 5. Mars ─────────────────────────────────────────────────────────────────
  {
    id:           'mars',
    name:         'Mars',
    subtitle:     'THE RUST PLAINS',
    index:        4,
    gameSpeed:    BALANCE.GAME_SPEED,              // from balance.js — edit GAME_SPEED there
    hazardId:     'dustStorm',    // cuts visibility + pushes ship + floaty low-gravity
    hazardDesc:   'Dust storms blind and push you. Lower gravity makes the ship floatier.',
    moons: [
      { id: 'phobos', name: 'Phobos', radiusRatio: 0.06, speedSign: 1 },
      { id: 'deimos', name: 'Deimos', radiusRatio: 0.05, speedSign: 1 },
    ],
    boss: {
      theme:      'Rock Construct',
      hp:          bossHp(4),
      phase2At:   0.5,
      attackPatterns: ['boulderThrow', 'dustSurge', 'groundSlam'],
    },
    blazeDensity:    0.75,
    craterCount:     8,
    craterScale:     0.06,
    inkAccent:       INK,
    atmosphereAlpha: 0.22,
    lowGravity:      true,   // ship gravity coefficient drops to 0.6× for this level
  },

  // ── 6. Earth ─────────────────────────────────────────────────────────────────
  {
    id:           'earth',
    name:         'Earth',
    subtitle:     'HOME TURF',
    index:        5,
    gameSpeed:    BALANCE.GAME_SPEED,              // from balance.js — edit GAME_SPEED there
    hazardId:     'spaceJunk',    // angular metallic debris + lightning flashes + rocket launch
    hazardDesc:   'Space junk and lightning. A rocket crosses the field periodically.',
    moons: [
      { id: 'moon', name: 'The Moon', radiusRatio: 0.22, speedSign: 1 },
    ],
    boss: {
      theme:      'Orbital Platform (TBC — placeholder art)',
      hp:          bossHp(5),
      phase2At:   0.5,
      attackPatterns: ['laserGrid', 'missileStrike', 'satelliteSwarm'],
      placeholder: true,   // Earth boss is human-made — final design is a cosmetic swap
    },
    blazeDensity:    0.60,
    craterCount:     0,
    inkAccent:       INK,
    atmosphereAlpha: 0.35,
    hasClouds:       true,
  },

  // ── 7. Venus ─────────────────────────────────────────────────────────────────
  {
    id:           'venus',
    name:         'Venus',
    subtitle:     'THE FURNACE',
    index:        6,
    gameSpeed:    BALANCE.GAME_SPEED,              // from balance.js — edit GAME_SPEED there
    hazardId:     'acidCloud',    // acid cloud banks drain shield + heat-haze distortion
    hazardDesc:   'Acid clouds drain shield. Constant movement is survival.',
    moons: [],   // Venus has no moons — the level is designed around their absence
    boss: {
      theme:      'Acid Creature',
      hp:          bossHp(6),
      phase2At:   0.5,
      attackPatterns: ['acidSpray', 'heatSurge', 'cloudBurst'],
    },
    blazeDensity:    0.80,
    craterCount:     0,
    inkAccent:       INK,
    atmosphereAlpha: 0.50,   // thick, hazy
    heatHaze:        true,
  },

  // ── 8. Mercury ───────────────────────────────────────────────────────────────
  {
    id:           'mercury',
    name:         'Mercury',
    subtitle:     'THE ANVIL',
    index:        7,
    gameSpeed:    BALANCE.GAME_SPEED,                // from balance.js — edit GAME_SPEED there
    hazardId:     'heatColdZones', // alternating heat (shield drain) and cold (slow handling) sweeps
    hazardDesc:   'Alternating heat and cold zones. Read the field, time your movement.',
    moons: [],   // Mercury has no moons
    boss: {
      theme:      'Solar-Forged Robot',
      hp:          bossHp(7),
      phase2At:   0.5,
      attackPatterns: ['heatBeam', 'coldPulse', 'flareBarrage'],
    },
    blazeDensity:    0.90,
    craterCount:     14,
    craterScale:     0.05,
    inkAccent:       INK,
    atmosphereAlpha: 0.05,   // almost no atmosphere
  },

  // ── 9. The Sun ──────────────────────────────────────────────────────────────
  {
    id:           'sun',
    name:         'The Sun',
    subtitle:     'THE PRIZE',
    index:        8,
    gameSpeed:    BALANCE.GAME_SPEED,              // from balance.js — edit GAME_SPEED there
    hazardId:     'solar',        // constant passive heat drain + flare sweeps + plasma prominences
    hazardDesc:   'Constant heat drain. Flare sweeps and plasma arcs cross the field.',
    moons: [],   // no moons
    boss: {
      theme:      'Corona Entity',
      hp:          bossHp(8),    // ≈ 1800
      phase2At:   0.66,          // 3 phases: >66%, 33–66%, <33%
      phase3At:   0.33,
      attackPatterns: [
        'solarFlare',            // borrowed from Mercury atmosphere
        'windVortex',            // borrowed from Neptune boss
        'coronaBlast',           // Sun's own signature move
      ],
      threePhase: true,          // Sun boss uses 3 phases, not 2
    },
    blazeDensity:    1.0,        // maximum density — white-hot core
    craterCount:     0,
    inkAccent:       INK,
    atmosphereAlpha: 0.80,       // massive corona
    isSun:           true,       // backdrop uses white-core bleeding to gold
  },
];

/** Return a planet definition by id string. */
export function getPlanet(id) {
  return PLANETS.find(p => p.id === id);
}
