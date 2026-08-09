// SaveData.js — All localStorage reads and writes go through here.
// V2 schema (Section 16). Legacy V1 keys are wiped on first boot.
//
// Default state: Neptune only unlocked, 0 coins, no high scores,
// all upgrade tiers 0, default skin marking 'standard', campaignComplete false.

// ── V1 legacy keys (wiped on migrate) ──────────────────────────────────────
const V1_KEYS = [
  'solarBlaster.highScore',
  'solarBlaster.unlockedPlanets',
  'solarBlaster.upgrades',
];

// ── V2 keys ─────────────────────────────────────────────────────────────────
const KEYS = {
  COINS:             'solarBlaster.coins',
  UNLOCKED:          'solarBlaster.unlocked',
  HIGH_SCORES:       'solarBlaster.highScores',
  UPGRADES:          'solarBlaster.upgrades',
  CAMPAIGN_COMPLETE: 'solarBlaster.campaignComplete',
  SCHEMA_VERSION:    'solarBlaster.schemaVersion',
};

const CURRENT_VERSION = 2;

// All 9 destination IDs in campaign order (Neptune → Sun).
export const DESTINATION_IDS = [
  'neptune', 'uranus', 'saturn', 'jupiter', 'mars',
  'earth', 'venus', 'mercury', 'sun',
];

// ── Default upgrade object (V2 — 4 global tracks + skin marking) ────────────
const DEFAULT_UPGRADES = {
  weaponPower:      0,   // 0–3 tiers
  shieldCapacity:   0,   // 0–3 tiers
  speed:            0,   // 0–3 tiers
  magazineCapacity: 0,   // 0–3 tiers
  skin:             'standard',   // marking/pattern id, not hull colour
};

// ── Migration ────────────────────────────────────────────────────────────────
function migrate() {
  const version = parseInt(localStorage.getItem(KEYS.SCHEMA_VERSION) || '0', 10);
  if (version >= CURRENT_VERSION) return;

  // Wipe V1 keys.
  V1_KEYS.forEach(k => localStorage.removeItem(k));

  // Write fresh V2 defaults.
  localStorage.setItem(KEYS.COINS, '0');
  localStorage.setItem(KEYS.UNLOCKED, JSON.stringify(['neptune']));
  localStorage.setItem(KEYS.HIGH_SCORES, JSON.stringify({}));
  localStorage.setItem(KEYS.UPGRADES, JSON.stringify(DEFAULT_UPGRADES));
  localStorage.setItem(KEYS.CAMPAIGN_COMPLETE, 'false');
  localStorage.setItem(KEYS.SCHEMA_VERSION, String(CURRENT_VERSION));
}

// ── Public API ───────────────────────────────────────────────────────────────
export const SaveData = {

  /** Call once from BootScene before any other access. */
  init() {
    migrate();
  },

  // ── Coins ──────────────────────────────────────────────────────────────────
  getCoins() {
    return parseInt(localStorage.getItem(KEYS.COINS) || '0', 10);
  },
  setCoins(amount) {
    localStorage.setItem(KEYS.COINS, String(Math.max(0, amount)));
  },
  addCoins(amount) {
    this.setCoins(this.getCoins() + amount);
  },
  /** Returns true if deduction succeeded; false if insufficient funds. */
  spendCoins(amount) {
    const current = this.getCoins();
    if (current < amount) return false;
    this.setCoins(current - amount);
    return true;
  },

  // ── Unlocked destinations ──────────────────────────────────────────────────
  getUnlocked() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.UNLOCKED) || '["neptune"]');
    } catch {
      return ['neptune'];
    }
  },
  isUnlocked(id) {
    return this.getUnlocked().includes(id);
  },
  /** Unlock the next destination after id, if not already unlocked. */
  unlockNext(id) {
    const idx = DESTINATION_IDS.indexOf(id);
    if (idx < 0 || idx >= DESTINATION_IDS.length - 1) return null;
    const next = DESTINATION_IDS[idx + 1];
    const current = this.getUnlocked();
    if (!current.includes(next)) {
      current.push(next);
      localStorage.setItem(KEYS.UNLOCKED, JSON.stringify(current));
    }
    return next;
  },

  // ── Per-planet high scores ─────────────────────────────────────────────────
  getHighScores() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.HIGH_SCORES) || '{}');
    } catch {
      return {};
    }
  },
  getHighScore(planetId) {
    return this.getHighScores()[planetId] || 0;
  },
  /** Update a planet's high score only if the new score beats it. Returns true if updated. */
  maybeUpdateHighScore(planetId, score) {
    const scores = this.getHighScores();
    if (score > (scores[planetId] || 0)) {
      scores[planetId] = score;
      localStorage.setItem(KEYS.HIGH_SCORES, JSON.stringify(scores));
      return true;
    }
    return false;
  },

  // ── Upgrades ───────────────────────────────────────────────────────────────
  getUpgrades() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEYS.UPGRADES) || '{}');
      return { ...DEFAULT_UPGRADES, ...saved };
    } catch {
      return { ...DEFAULT_UPGRADES };
    }
  },
  getUpgradeTier(track) {
    return this.getUpgrades()[track] ?? 0;
  },
  setUpgradeTier(track, tier) {
    const upgrades = this.getUpgrades();
    upgrades[track] = tier;
    localStorage.setItem(KEYS.UPGRADES, JSON.stringify(upgrades));
  },
  /** Increment a track by 1 tier. Returns new tier, or false if already at max. */
  purchaseUpgrade(track, maxTier = 3) {
    const current = this.getUpgradeTier(track);
    if (current >= maxTier) return false;
    const next = current + 1;
    this.setUpgradeTier(track, next);
    return next;
  },

  // ── Skin marking ──────────────────────────────────────────────────────────
  getSkin() {
    return this.getUpgrades().skin || 'standard';
  },
  setSkin(id) {
    const upgrades = this.getUpgrades();
    upgrades.skin = id;
    localStorage.setItem(KEYS.UPGRADES, JSON.stringify(upgrades));
  },

  // ── Campaign complete ──────────────────────────────────────────────────────
  isCampaignComplete() {
    return localStorage.getItem(KEYS.CAMPAIGN_COMPLETE) === 'true';
  },
  setCampaignComplete() {
    localStorage.setItem(KEYS.CAMPAIGN_COMPLETE, 'true');
  },
};
