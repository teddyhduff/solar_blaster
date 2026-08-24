// SaveData.js — All localStorage reads and writes go through here.
// V1 schema, namespaced under solarBlaster.v1.* so V2 saves stay intact.
// Default state: Mercury only unlocked, 0 coins, no high score, all upgrade tiers 0, skin cyan.

const LEGACY = {
  HIGH_SCORE:       'solarBlaster.highScore',
  COINS:            'solarBlaster.coins',
  UNLOCKED_PLANETS: 'solarBlaster.unlockedPlanets',
  UPGRADES:         'solarBlaster.upgrades',
};

const KEYS = {
  HIGH_SCORE:       'solarBlaster.v1.highScore',
  COINS:            'solarBlaster.v1.coins',
  UNLOCKED_PLANETS: 'solarBlaster.v1.unlockedPlanets',
  UPGRADES:         'solarBlaster.v1.upgrades',
  SCHEMA_VERSION:   'solarBlaster.v1.schemaVersion',
};

const CURRENT_VERSION = 1;

// Per-skin default upgrade tiers (all 0 = no upgrades purchased).
const DEFAULT_SHIP_UPGRADES = {
  cyan:    { targeting: 0, reactiveArmour: 0 },
  magenta: { hyperdrive: 0, microreactor: 0 },
  gold:    { heavyCannon: 0, blastPlating: 0 },
  green:   { afterburner: 0, evadeProtocol: 0 },
  white:   { quadCannons: 0, phaseShield: 0 },
};

const DEFAULT_UPGRADES = {
  skin:       'cyan',
  ownedSkins: ['cyan'],
  ships:      DEFAULT_SHIP_UPGRADES,
};

/** Deeply merge saved ships data with defaults so new skins/tracks always have a base value. */
function mergeUpgrades(saved) {
  const ships = {};
  Object.keys(DEFAULT_SHIP_UPGRADES).forEach(skinId => {
    ships[skinId] = {
      ...DEFAULT_SHIP_UPGRADES[skinId],
      ...(saved.ships?.[skinId] || {}),
    };
  });
  return {
    ...DEFAULT_UPGRADES,
    ...saved,
    ownedSkins: saved.ownedSkins || ['cyan'],
    ships,
  };
}

function looksLikeV1Upgrades(raw) {
  try {
    const u = JSON.parse(raw);
    return u && typeof u === 'object' && (u.ships || ['cyan', 'magenta', 'gold', 'green', 'white'].includes(u.skin));
  } catch {
    return false;
  }
}

function migrate() {
  const version = parseInt(localStorage.getItem(KEYS.SCHEMA_VERSION) || '0', 10);
  if (version >= CURRENT_VERSION) return;

  const legacyUpgrades = localStorage.getItem(LEGACY.UPGRADES);
  const hasLegacyV1 =
    localStorage.getItem(LEGACY.HIGH_SCORE) !== null ||
    localStorage.getItem(LEGACY.UNLOCKED_PLANETS) !== null ||
    (legacyUpgrades && looksLikeV1Upgrades(legacyUpgrades));

  if (hasLegacyV1) {
    localStorage.setItem(KEYS.HIGH_SCORE, localStorage.getItem(LEGACY.HIGH_SCORE) || '0');
    localStorage.setItem(
      KEYS.UNLOCKED_PLANETS,
      localStorage.getItem(LEGACY.UNLOCKED_PLANETS) || JSON.stringify(['mercury'])
    );
    if (legacyUpgrades && looksLikeV1Upgrades(legacyUpgrades)) {
      localStorage.setItem(KEYS.UPGRADES, legacyUpgrades);
      localStorage.setItem(KEYS.COINS, localStorage.getItem(LEGACY.COINS) || '0');
      localStorage.removeItem(LEGACY.UPGRADES);
      localStorage.removeItem(LEGACY.COINS);
    } else {
      localStorage.setItem(KEYS.UPGRADES, JSON.stringify(DEFAULT_UPGRADES));
      localStorage.setItem(KEYS.COINS, '0');
    }
    localStorage.removeItem(LEGACY.HIGH_SCORE);
    localStorage.removeItem(LEGACY.UNLOCKED_PLANETS);
  } else {
    localStorage.setItem(KEYS.HIGH_SCORE, '0');
    localStorage.setItem(KEYS.COINS, '0');
    localStorage.setItem(KEYS.UNLOCKED_PLANETS, JSON.stringify(['mercury']));
    localStorage.setItem(KEYS.UPGRADES, JSON.stringify(DEFAULT_UPGRADES));
  }

  localStorage.setItem(KEYS.SCHEMA_VERSION, String(CURRENT_VERSION));
}

migrate();

export const SaveData = {

  // ── High Score ─────────────────────────────────────────────────────────────
  getHighScore() {
    return parseInt(localStorage.getItem(KEYS.HIGH_SCORE) || '0', 10);
  },
  setHighScore(score) {
    localStorage.setItem(KEYS.HIGH_SCORE, String(score));
  },
  /** Update the high score only if this run beats it. */
  maybeUpdateHighScore(score) {
    if (score > this.getHighScore()) {
      this.setHighScore(score);
      return true;
    }
    return false;
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
  /** Deducts coins. Returns true if successful, false if not enough coins. */
  spendCoins(amount) {
    const current = this.getCoins();
    if (current < amount) return false;
    this.setCoins(current - amount);
    return true;
  },

  // ── Unlocked Planets ───────────────────────────────────────────────────────
  getUnlockedPlanets() {
    const raw = localStorage.getItem(KEYS.UNLOCKED_PLANETS);
    return raw ? JSON.parse(raw) : ['mercury'];
  },
  unlockPlanet(id) {
    const list = this.getUnlockedPlanets();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(KEYS.UNLOCKED_PLANETS, JSON.stringify(list));
    }
  },
  isPlanetUnlocked(id) {
    return this.getUnlockedPlanets().includes(id);
  },

  // ── Upgrades (top-level) ───────────────────────────────────────────────────
  _getUpgradesRaw() {
    const raw = localStorage.getItem(KEYS.UPGRADES);
    return raw ? mergeUpgrades(JSON.parse(raw)) : { ...DEFAULT_UPGRADES, ships: { ...DEFAULT_SHIP_UPGRADES } };
  },
  _saveUpgrades(data) {
    localStorage.setItem(KEYS.UPGRADES, JSON.stringify(data));
  },

  // ── Skin ──────────────────────────────────────────────────────────────────
  getSkin() {
    return this._getUpgradesRaw().skin || 'cyan';
  },
  setSkin(id) {
    const data = this._getUpgradesRaw();
    data.skin = id;
    this._saveUpgrades(data);
  },

  // ── Owned Skins ───────────────────────────────────────────────────────────
  getOwnedSkins() {
    return this._getUpgradesRaw().ownedSkins || ['cyan'];
  },
  isSkinOwned(id) {
    return id === 'cyan' || this.getOwnedSkins().includes(id);
  },
  buySkin(id) {
    const data = this._getUpgradesRaw();
    if (!data.ownedSkins.includes(id)) {
      data.ownedSkins.push(id);
      this._saveUpgrades(data);
    }
  },

  // ── Per-ship Upgrades ─────────────────────────────────────────────────────
  /** Returns { trackId: tier } for the given skin. All keys default to 0. */
  getShipUpgrades(skinId) {
    const data = this._getUpgradesRaw();
    return { ...(DEFAULT_SHIP_UPGRADES[skinId] || {}), ...(data.ships?.[skinId] || {}) };
  },
  /** Save a single track tier for a given skin. */
  setShipUpgradeTier(skinId, trackId, tier) {
    const data = this._getUpgradesRaw();
    if (!data.ships[skinId]) data.ships[skinId] = { ...(DEFAULT_SHIP_UPGRADES[skinId] || {}) };
    data.ships[skinId][trackId] = tier;
    this._saveUpgrades(data);
  },
  /** Convenience: get one track tier for a skin. */
  getShipUpgradeTier(skinId, trackId) {
    return this.getShipUpgrades(skinId)[trackId] || 0;
  },

  // ── Dev helper ────────────────────────────────────────────────────────────
  /** Wipe all saved data back to defaults. Open browser console and call SaveData.resetAll() to use. */
  resetAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    console.log('[SaveData] All V1 data reset.');
  },
};
