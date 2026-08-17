// Ship.js — The player's fighter ship.
// Handles all 3 input methods (keyboard, mouse, touch), weapons, shield, and upgrade effects.

import { BALANCE }                  from '../data/balance.js';
import { WEAPONS, WEAPON_IDS }       from '../data/weapons.js';
import { SKIN_COLORS, SKIN_MAP }     from '../data/upgrades.js';
import { SaveData }                  from '../systems/SaveData.js';
import { Projectile }                from './Projectile.js';
import { drawShipShape }             from '../systems/ShipShapes.js';

export class Ship {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    this.alive = true;

    // Load skin identity.
    const skinId          = SaveData.getSkin();
    this.skinColor        = SKIN_COLORS[skinId]     || 0x00F5FF;
    const skinData        = SKIN_MAP[skinId];
    this.skinShape        = skinData ? skinData.shape : 'interceptor';

    // ── Base stats from skin profile (before any upgrades) ────────────────
    const base = skinData?.baseStats || {};
    const baseShield = base.shield  ?? BALANCE.BASE_SHIELD;
    const baseSpeed  = base.speed   ?? BALANCE.BASE_SHIP_SPEED;

    // ── Per-ship upgrade effects — start at skin base values ──────────────
    this.weaponTier       = 0;                          // index into WEAPONS[id].damage / fireRate
    this.fireRateMult     = base.fireRateMult ?? 1.0;   // multiplies fire cooldown (lower = faster)
    this.damageMult       = base.damageMult   ?? 1.0;   // multiplies projectile damage
    this.damageReduction  = 0;      // fraction of incoming damage blocked (0–1)
    this.hazardResistance = 0;      // fraction of hazard push forces blocked (0–1)
    this.extraShots       = 0;      // extra parallel projectiles per shot
    this.iFrameBonus      = 0;      // extra ms of invulnerability after a hit

    // Apply each upgrade track for the active skin (stacks on top of base stats).
    const shipUpgrades = SaveData.getShipUpgrades(skinId);
    if (skinData) {
      skinData.upgrades.forEach(track => {
        const tier = shipUpgrades[track.id] || 0;
        if (tier > 0) this._applyTrackEffect(track, tier);
      });
    }

    // Shield/speed upgrade bonuses (accumulated by _applyTrackEffect) added to base.
    const shieldBonus = this._pendingShieldBonus || 0;
    const speedBonus  = this._pendingSpeedBonus  || 0;

    // Derived stats.
    this.maxShield    = baseShield + shieldBonus;
    this.shield       = this.maxShield;
    this.baseSpeed    = baseSpeed  + speedBonus;

    // Weapons state.
    this.weaponIndex      = 0;   // 0 = laser, 1 = spread, 2 = missile
    this.fireCooldown     = 0;
    this.tokenActive      = false;
    this.tokenTimer       = 0;

    // Position — left-centre of screen.
    const { width, height } = scene.scale;
    this.x = 130;
    this.y = height / 2;

    // Timers.
    this._iFrameTimer     = 0;
    this._regenPause      = 0;
    this._flashTimer      = 0;
    this._invulnerable    = false;

    // Mouse state.
    this._mouseHeld       = false;
    this._mouseX          = this.x;
    this._mouseY          = this.y;

    // Touch drag state.
    this._touchId         = null;
    this._touchDragX      = this.x;
    this._touchDragY      = this.y;
    this._touchFireHeld   = false;

    // Particle trail data — array of {x, y, age, maxAge}.
    this._trail = [];

    // Graphics layers.
    this.trailG = scene.add.graphics().setDepth(8);
    this.g      = scene.add.graphics().setDepth(10);

    this._setupInput();
    this._draw(false);
  }

  // ── Upgrade effect application ────────────────────────────────────────────

  /**
   * Apply one upgrade track's effect at the given tier (1-based).
   * Shield and speed bonuses are accumulated on `this._pendingShieldBonus` / `this._pendingSpeedBonus`
   * because they feed into maxShield/baseSpeed which are set after all tracks are processed.
   */
  _applyTrackEffect(track, tier) {
    const idx = tier - 1;   // 0-based index into effectValues
    switch (track.effect) {
      case 'weaponTier':
        this.weaponTier = tier;
        break;
      case 'shield': {
        // Cumulative: sum bonuses up through the purchased tier.
        const total = track.effectValues.slice(0, tier).reduce((a, b) => a + b, 0);
        this._pendingShieldBonus = (this._pendingShieldBonus || 0) + total;
        break;
      }
      case 'speed': {
        const total = track.effectValues.slice(0, tier).reduce((a, b) => a + b, 0);
        this._pendingSpeedBonus = (this._pendingSpeedBonus || 0) + total;
        break;
      }
      case 'fireRateMult':
        // Multiply into the base (e.g. Dart base ×0.60 × upgrade ×0.60 = ×0.36 total).
        this.fireRateMult *= track.effectValues[idx];
        break;
      case 'damageMult':
        // Multiply into the base (e.g. Gunship base ×2.5 × upgrade ×2.0 = ×5.0 total).
        this.damageMult *= track.effectValues[idx];
        break;
      case 'hazardResistance':
        this.hazardResistance = track.effectValues[idx];
        break;
      case 'extraShots':
        this.extraShots = track.effectValues[idx];
        break;
      case 'blastPlating': {
        // Compound: [shieldHP, damageReduction]
        const [hp, dr] = track.effectValues[idx];
        this._pendingShieldBonus = (this._pendingShieldBonus || 0) + hp;
        this.damageReduction = dr;
        break;
      }
      case 'phaseShield': {
        // Compound: [shieldHP, iFrameBonus ms]
        const [hp, bonus] = track.effectValues[idx];
        this._pendingShieldBonus = (this._pendingShieldBonus || 0) + hp;
        this.iFrameBonus = bonus;
        break;
      }
    }
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  _setupInput() {
    const scene = this.scene;

    // Keyboard.
    this.keys = scene.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.UP,
      down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w:     Phaser.Input.Keyboard.KeyCodes.W,
      a:     Phaser.Input.Keyboard.KeyCodes.A,
      s:     Phaser.Input.Keyboard.KeyCodes.S,
      d:     Phaser.Input.Keyboard.KeyCodes.D,
      fire:  Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    // Bound handlers so we can remove them on shutdown (shared input plugin across scenes).
    this._onWeapon1 = () => { this.weaponIndex = 0; };
    this._onWeapon2 = () => { this.weaponIndex = 1; };
    this._onWeapon3 = () => { this.weaponIndex = 2; };

    scene.input.keyboard.on('keydown-ONE',   this._onWeapon1);
    scene.input.keyboard.on('keydown-TWO',   this._onWeapon2);
    scene.input.keyboard.on('keydown-THREE', this._onWeapon3);

    // Mouse: hold to fire and move.
    this._onPointerDown = (ptr) => {
      if (ptr.pointerType !== 'touch') {
        this._mouseHeld = true;
        this._mouseX = ptr.x;
        this._mouseY = ptr.y;
      } else if (this._touchId === null) {
        // Touch drag — move ship by dragging on the left portion of the screen.
        const { width } = scene.scale;
        if (ptr.x < width * 0.60) {
          this._touchId = ptr.id;
          this._touchOriginX  = ptr.x;
          this._touchOriginY  = ptr.y;
          this._touchShipOriX = this.x;
          this._touchShipOriY = this.y;
        }
      }
    };
    this._onPointerMove = (ptr) => {
      if (ptr.pointerType !== 'touch') {
        this._mouseX = ptr.x;
        this._mouseY = ptr.y;
      } else if (ptr.id === this._touchId) {
        this._touchDragX = this._touchShipOriX + (ptr.x - this._touchOriginX);
        this._touchDragY = this._touchShipOriY + (ptr.y - this._touchOriginY);
      }
    };
    this._onPointerUp = (ptr) => {
      if (ptr.pointerType !== 'touch') {
        this._mouseHeld = false;
      } else if (ptr.id === this._touchId) {
        this._touchId = null;
      }
    };
    this._onWheel = (ptr, objs, dx, dy) => {
      const dir = dy > 0 ? 1 : -1;
      this.weaponIndex = (this.weaponIndex + dir + 3) % 3;
    };

    scene.input.on('pointerdown', this._onPointerDown);
    scene.input.on('pointermove', this._onPointerMove);
    scene.input.on('pointerup',   this._onPointerUp);
    scene.input.on('wheel',       this._onWheel);
  }

  /** Remove shared input listeners so the next level doesn't stack handlers. */
  shutdown() {
    const scene = this.scene;
    if (!scene || !scene.input) return;

    if (scene.input.keyboard) {
      scene.input.keyboard.off('keydown-ONE',   this._onWeapon1);
      scene.input.keyboard.off('keydown-TWO',   this._onWeapon2);
      scene.input.keyboard.off('keydown-THREE', this._onWeapon3);
      if (this.keys) {
        scene.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.UP);
        scene.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        scene.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        scene.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        scene.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.W);
        scene.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.A);
        scene.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.S);
        scene.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.D);
        scene.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keys = null;
      }
    }

    scene.input.off('pointerdown', this._onPointerDown);
    scene.input.off('pointermove', this._onPointerMove);
    scene.input.off('pointerup',   this._onPointerUp);
    scene.input.off('wheel',       this._onWheel);
  }

  /** Called by the on-screen fire button in GameScene. */
  setTouchFire(held) { this._touchFireHeld = held; }

  /** Switch weapon from an on-screen button. */
  setWeapon(index) { this.weaponIndex = Phaser.Math.Clamp(index, 0, 2); }

  get weapon()  { return WEAPONS[WEAPON_IDS[this.weaponIndex]]; }

  /** Current damage per shot (factoring in weapon tier). */
  get damage()  { return this.weapon.damage[this.weaponTier]; }

  /** Current fire rate in ms between shots (fireRateMult and token both apply). */
  get fireRate() {
    const base = this.weapon.fireRate[this.weaponTier];
    const withUpgrade = Math.floor(base * this.fireRateMult);
    return this.tokenActive ? Math.floor(withUpgrade * 0.38) : withUpgrade;
  }

  activateWeaponToken() {
    this.tokenActive = true;
    this.tokenTimer  = BALANCE.WEAPON_TOKEN_DURATION;
  }

  // ── Update (called every frame) ────────────────────────────────────────────

  /**
   * @param {number}     delta       ms since last frame
   * @param {Projectile[]} projectiles  array to push newly fired projectiles into
   * @param {AudioSystem}  audio
   * @param {{x,y,speedMult}} hazardForces  extra movement from the active hazard
   */
  update(delta, projectiles, audio, hazardForces = { x: 0, y: 0, speedMult: 1 }) {
    if (!this.alive) return;
    const dt    = delta / 1000;
    const speed = this.baseSpeed * (hazardForces.speedMult || 1);
    const { width, height } = this.scene.scale;

    let dx = 0, dy = 0;

    // Keyboard input — equal speed on all axes.
    if (this.keys.up.isDown    || this.keys.w.isDown)  dy -= speed;
    if (this.keys.down.isDown  || this.keys.s.isDown)  dy += speed;
    if (this.keys.left.isDown  || this.keys.a.isDown)  dx -= speed;
    if (this.keys.right.isDown || this.keys.d.isDown)  dx += speed;

    // Mouse: move toward cursor when button held.
    if (this._mouseHeld) {
      const tx   = this._mouseX - this.x;
      const ty   = this._mouseY - this.y;
      const dist = Math.sqrt(tx * tx + ty * ty);
      if (dist > 8) {
        dx = (tx / dist) * speed;
        dy = (ty / dist) * speed;
      }
    }

    // Touch drag.
    if (this._touchId !== null) {
      const tx   = this._touchDragX - this.x;
      const ty   = this._touchDragY - this.y;
      const dist = Math.sqrt(tx * tx + ty * ty);
      if (dist > 5) {
        const moveSpeed = Math.min(speed * 2, dist / dt);
        dx = (tx / dist) * moveSpeed;
        dy = (ty / dist) * moveSpeed;
      }
    }

    // Apply hazard push forces.
    dx += hazardForces.x || 0;
    dy += hazardForces.y || 0;

    this.x = Phaser.Math.Clamp(this.x + dx * dt, 20, width * BALANCE.SHIP_MAX_X_FRACTION);
    this.y = Phaser.Math.Clamp(this.y + dy * dt, 22, height - 22);

    // Weapon token countdown.
    if (this.tokenActive) {
      this.tokenTimer -= delta;
      if (this.tokenTimer <= 0) { this.tokenActive = false; this.tokenTimer = 0; }
    }

    // Fire cooldown.
    this.fireCooldown = Math.max(0, this.fireCooldown - delta);

    // Fire if any input is held.
    const wantFire = this.keys.fire.isDown || this._mouseHeld || this._touchFireHeld;
    if (wantFire && this.fireCooldown === 0) {
      this._fire(projectiles, audio);
    }

    // Shield regeneration.
    if (this._iFrameTimer > 0) {
      this._iFrameTimer -= delta;
      if (this._iFrameTimer <= 0) { this._iFrameTimer = 0; this._invulnerable = false; }
    }
    if (this._regenPause > 0) {
      this._regenPause -= delta;
    } else if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + BALANCE.SHIELD_REGEN_RATE * dt);
    }

    if (this._flashTimer > 0) this._flashTimer -= delta;

    // Trail.
    this._updateTrail(dt);

    // Reposition graphics.
    this.g.x = this.g.y = 0;
    this._draw(this._flashTimer > 0);
  }

  _fire(projectiles, audio) {
    const w = this.weapon;
    this.fireCooldown = this.fireRate;

    // Build the spread angles for multi-pellet weapons.
    const angles = [];
    if (w.count === 1) {
      angles.push(0);
    } else {
      const half = w.spread;
      const step = (half * 2) / (w.count - 1);
      for (let i = 0; i < w.count; i++) angles.push(-half + i * step);
    }

    // Quad Cannons: add extra parallel shots offset by ±4° each.
    const extraAngles = [];
    for (let e = 1; e <= this.extraShots; e++) {
      const offset = e % 2 === 1 ? e * 4 : -(e * 4);
      angles.forEach(a => extraAngles.push(a + offset));
    }
    const allAngles = [...angles, ...extraAngles];

    // Damage includes damageMult (Heavy Cannon upgrade).
    const dmg = Math.round(this.damage * this.damageMult);

    allAngles.forEach(angle => {
      projectiles.push(new Projectile(this.scene, this.x + 24, this.y, w, angle, dmg));
    });

    if (audio) {
      if      (w.id === 'missile') audio.playMissileFire();
      else if (w.id === 'spread')  audio.playSpreadFire();
      else                         audio.playLaserFire();
    }
  }

  // ── Damage / Healing ───────────────────────────────────────────────────────

  /** Returns true if damage was applied (false during i-frames). */
  takeDamage(amount) {
    if (this._invulnerable || !this.alive) return false;
    // Blast Plating reduces incoming damage.
    const effective = Math.ceil(amount * (1 - this.damageReduction));
    this.shield -= effective;
    this._invulnerable = true;
    this._iFrameTimer  = BALANCE.I_FRAME_DURATION + this.iFrameBonus;
    this._regenPause   = BALANCE.SHIELD_REGEN_PAUSE;
    this._flashTimer   = 200;
    if (this.shield <= 0) {
      this.shield = 0;
      this.alive  = false;
    }
    return true;
  }

  addShield(amount) {
    this.shield = Math.min(this.maxShield, this.shield + amount);
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  _draw(flashing) {
    this.g.clear();
    const color = flashing ? 0xFFFFFF : this.skinColor;

    drawShipShape(this.g, this.x, this.y, color, 1, this.skinShape);

    // Weapon token countdown arc (drawn around the ship).
    if (this.tokenActive && this.tokenTimer > 0) {
      const frac = this.tokenTimer / BALANCE.WEAPON_TOKEN_DURATION;
      this.g.lineStyle(3, 0xFF6B35, 0.88);
      this.g.beginPath();
      this.g.arc(this.x, this.y, 38, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false);
      this.g.strokePath();
    }
  }

  _updateTrail(dt) {
    // Push a new particle at the engine exhaust position.
    this._trail.push({
      x:      this.x - 20,
      y:      this.y + Phaser.Math.FloatBetween(-6, 6),
      age:    0,
      maxAge: 0.32 + this.speedTier * 0.06,
    });

    this.trailG.clear();
    this._trail = this._trail.filter(p => {
      p.age += dt;
      if (p.age >= p.maxAge) return false;
      const t = 1 - p.age / p.maxAge;
      const sz = (3 + this.speedTier) * t;
      this.trailG.fillStyle(this.skinColor, t * 0.5);
      this.trailG.fillCircle(p.x, p.y, sz);
      return true;
    });
  }

  destroy() {
    this.shutdown();
    this.alive = false;
    try { this.g.destroy();     } catch (e) {}
    try { this.trailG.destroy();} catch (e) {}
    this._trail = [];
  }
}
