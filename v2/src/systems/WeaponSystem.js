// WeaponSystem.js — Per-weapon magazine, reload, and firing for Solar Blaster V2.
//
// Reload rules (V2 spec Section 7):
//   - Each weapon has its own magazine.
//   - When empty, a flashing "PRESS R TO RELOAD" prompt appears near the ship.
//   - Reload takes ~1s; ship can move freely but cannot shoot during reload.
//   - Firing on an empty magazine auto-triggers reload (never a dead end for new players).
//   - Each weapon reloads independently; switching cancels an in-progress reload.
//   - Magazine Capacity upgrade: +~17% per tier; reload time shortens to 0.7s at tier 3.

import { WEAPONS, getWeapon }  from '../data/weapons.js';
import { BALANCE }              from '../data/balance.js';
import { SaveData }             from './SaveData.js';

export class WeaponSystem {
  /**
   * @param {Phaser.Scene} scene — the owning scene
   */
  constructor(scene) {
    this.scene = scene;

    // Current weapon index (0 = laser, 1 = plasma, 2 = missiles)
    this._weaponIndex = 0;

    // Per-weapon magazine state (ammo remaining)
    this._mags = {};

    // Reload state
    this._reloading    = false;
    this._reloadTimer  = 0;    // ms remaining in reload
    this._reloadTotal  = 0;    // total ms for this reload (for progress ring)

    // Fire cooldown
    this._fireCooldown = 0;

    // Rapid-fire token state
    this._rapidFireActive   = false;
    this._rapidFireTimer    = 0;
    this._rapidFireMult     = 0.35;   // multiplier on fire cooldown during rapid-fire

    // Visual prompt state
    this._reloadPromptVisible = false;
    this._reloadPromptBlink   = 0;

    // Apply upgrade-based mag sizes on construction
    this._magTier = SaveData.getUpgradeTier('magazineCapacity');
    this._initMags();

    // Listen for rapid-fire pickup
    scene.events.on('pickupRapidFire', this._startRapidFire, this);
  }

  // ── Init ────────────────────────────────────────────────────────────────────

  _magSize(weapon) {
    const base   = weapon.magazine;
    const bonus  = BALANCE.MAG_CAPACITY_PER_TIER * this._magTier;
    return Math.ceil(base * (1 + bonus));
  }

  _initMags() {
    for (const w of WEAPONS) {
      this._mags[w.id] = this._magSize(w);
    }
  }

  // ── Accessors ────────────────────────────────────────────────────────────────

  get currentWeapon() { return WEAPONS[this._weaponIndex]; }
  get currentAmmo()   { return this._mags[this.currentWeapon.id]; }
  get maxAmmo()       { return this._magSize(this.currentWeapon); }
  get isReloading()   { return this._reloading; }
  get reloadProgress() {
    if (!this._reloading || this._reloadTotal === 0) return 0;
    return 1 - (this._reloadTimer / this._reloadTotal);
  }

  // ── Reload time (shorter at higher mag tier) ─────────────────────────────────

  _reloadTimeMs() {
    if (this._magTier >= 3) return BALANCE.RELOAD_TIME_MIN_MS;
    const t = this._magTier / 3;
    return Math.round(
      BALANCE.RELOAD_TIME_MS * (1 - t) + BALANCE.RELOAD_TIME_MIN_MS * t
    );
  }

  // ── Public: switch weapon ────────────────────────────────────────────────────

  switchTo(index) {
    if (index < 0 || index >= WEAPONS.length) return;
    if (this._weaponIndex === index) return;
    this._weaponIndex = index;
    // Cancel any in-progress reload (stays on old weapon's mag state)
    this._reloading = false;
    this._reloadTimer = 0;
    this._reloadPromptVisible = this.currentAmmo <= 0;
  }

  switchByKey(key) {
    const idx = [1, 2, 3].indexOf(key);
    if (idx >= 0) this.switchTo(idx);
  }

  cycleWeapon(dir = 1) {
    this.switchTo((this._weaponIndex + dir + WEAPONS.length) % WEAPONS.length);
  }

  // ── Public: start reload ─────────────────────────────────────────────────────

  startReload() {
    if (this._reloading) return;
    if (this.currentAmmo >= this.maxAmmo) return;
    this._reloading   = true;
    this._reloadTotal = this._reloadTimeMs();
    this._reloadTimer = this._reloadTotal;
    this._reloadPromptVisible = false;
    this.scene.events.emit('weaponReloadStart', this.currentWeapon.id);
    this._tryPlay('reload_start', 0.6);
  }

  // ── Public: attempt fire ─────────────────────────────────────────────────────

  /**
   * Try to fire. Returns an array of projectile descriptor objects (may be empty).
   * Each descriptor: { weapon, x, y, angle, damage }
   */
  tryFire(shipX, shipY, targetX, targetY) {
    if (this._reloading) return [];
    if (this._fireCooldown > 0) return [];

    const w = this.currentWeapon;

    if (this.currentAmmo <= 0) {
      // Auto-trigger reload
      this.startReload();
      return [];
    }

    // Deduct ammo
    this._mags[w.id]--;
    if (this._mags[w.id] <= 0) {
      this._mags[w.id] = 0;
      this._reloadPromptVisible = true;
      this.scene.events.emit('weaponEmpty', w.id);
    }

    // Set fire cooldown (rapid-fire reduces it)
    const tier = SaveData.getUpgradeTier('weaponPower');
    const cooldownMult = w.fireRateMults[tier] * (this._rapidFireActive ? this._rapidFireMult : 1);
    this._fireCooldown = w.fireRateMs * cooldownMult;

    // Damage with weapon power upgrade
    const damage = w.baseDamage * w.damageMults[tier];

    // Build shot descriptors
    const shots = [];
    const baseAngle = Math.atan2(targetY - shipY, targetX - shipX);
    const spreadAngles = this._spreadAngles(w);
    for (const offset of spreadAngles) {
      shots.push({
        weapon:   w,
        x:        shipX + 28,
        y:        shipY,
        angle:    baseAngle + Phaser.Math.DegToRad(offset),
        damage,
        homing:   w.id === 'missiles',
        pierce:   w.id === 'laser' ? 1 : 0,
        smear:    w.id === 'plasma',
      });
    }

    this._tryPlay(`fire_${w.id}`, 0.5);
    return shots;
  }

  _spreadAngles(weapon) {
    if (weapon.shotCount === 1 || !weapon.spread) return [0];
    const half = (weapon.shotCount - 1) / 2;
    return Array.from({ length: weapon.shotCount }, (_, i) => (i - half) * weapon.spread);
  }

  // ── Public: ammo crate pickup (instant full-mag) ──────────────────────────────

  refillCurrentMag() {
    this._mags[this.currentWeapon.id] = this.maxAmmo;
    this._reloadPromptVisible = false;
    if (this._reloading) {
      this._reloading   = false;
      this._reloadTimer = 0;
    }
  }

  // ── Rapid-fire ────────────────────────────────────────────────────────────────

  _startRapidFire() {
    this._rapidFireActive = true;
    this._rapidFireTimer  = BALANCE.WEAPON_TOKEN_DURATION;
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  update(dt) {
    // Fire cooldown
    if (this._fireCooldown > 0) this._fireCooldown -= dt;

    // Rapid-fire countdown
    if (this._rapidFireActive) {
      this._rapidFireTimer -= dt;
      if (this._rapidFireTimer <= 0) {
        this._rapidFireActive = false;
        this.scene.events.emit('rapidFireEnd');
      }
    }

    // Reload countdown
    if (this._reloading) {
      this._reloadTimer -= dt;
      if (this._reloadTimer <= 0) {
        this._reloading = false;
        this._mags[this.currentWeapon.id] = this.maxAmmo;
        this._reloadPromptVisible = false;
        this.scene.events.emit('weaponReloadComplete', this.currentWeapon.id);
        this._tryPlay('reload_done', 0.6);
      }
    }

    // Blink prompt
    if (this._reloadPromptVisible && !this._reloading) {
      this._reloadPromptBlink += dt;
    } else {
      this._reloadPromptBlink = 0;
    }
  }

  // ── HUD data for external rendering ──────────────────────────────────────────

  getHudState() {
    return {
      weaponLabel:          this.currentWeapon.label,
      ammo:                 this.currentAmmo,
      maxAmmo:              this.maxAmmo,
      reloading:            this._reloading,
      reloadProgress:       this.reloadProgress,
      showReloadPrompt:     this._reloadPromptVisible && !this._reloading,
      reloadPromptBlink:    this._reloadPromptBlink,
      rapidFireActive:      this._rapidFireActive,
      rapidFireFraction:    this._rapidFireActive
        ? this._rapidFireTimer / BALANCE.WEAPON_TOKEN_DURATION : 0,
    };
  }

  /** Play a sound key only if the asset has been loaded, to avoid Phaser errors. */
  _tryPlay(key, volume) {
    try {
      if (this.scene.sound && this.scene.cache?.audio?.has(key)) {
        this.scene.sound.play(key, { volume });
      } else if (window.gameAudio) {
        // Delegate to AudioSystem procedural SFX instead
        const method = key.startsWith('fire_')   ? 'playLaserShot'
                     : key === 'reload_start'     ? 'playReloadStart'
                     : key === 'reload_done'      ? 'playReloadDone'
                     : null;
        if (method && typeof window.gameAudio[method] === 'function') {
          window.gameAudio[method]();
        }
      }
    } catch {}
  }

  destroy() {
    this.scene.events.off('pickupRapidFire', this._startRapidFire, this);
  }
}
