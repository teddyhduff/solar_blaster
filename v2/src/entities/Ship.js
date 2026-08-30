// Ship.js — Player ship for Solar Blaster V2.
// Visual: REFLEX 07 (Stencil Riso, bone hull, blaze thrust).
// Input: keyboard / mouse / touch — all three equally supported.
// Weapons: delegated to WeaponSystem (magazines, reload).
// Upgrades: 4 global tracks from SaveData.

import { BALANCE }        from '../data/balance.js';
import { SaveData }       from '../systems/SaveData.js';
import { WeaponSystem }   from '../systems/WeaponSystem.js';
import { drawShip, C }    from '../systems/StencilArt.js';
import { getSkin }        from '../data/upgrades.js';

// Local-space circles matching the REFLEX 07 silhouette (fuselage + swept wings).
const HIT_CIRCLES = [
  { x:  0,  y:   0, r: 12 },  // fuselage
  { x: -22, y: -26, r: 16 },  // upper wing
  { x: -22, y:  26, r: 16 },  // lower wing
];

export class Ship {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene  = scene;
    this.alive  = true;

    // ── Stats from V2 global upgrade tracks ───────────────────────────────────
    const shieldTier = SaveData.getUpgradeTier('shieldCapacity');
    const speedTier  = SaveData.getUpgradeTier('speed');
    this.maxShield   = BALANCE.BASE_SHIELD + shieldTier * BALANCE.SHIELD_PER_CAPACITY_TIER;
    this.shield      = this.maxShield;
    this.baseSpeed   = BALANCE.BASE_SHIP_SPEED + speedTier * BALANCE.SPEED_PER_TIER;

    // ── Skin marking (bone hull always; only pattern varies) ──────────────────
    this.skinId   = SaveData.getSkin();
    this.skinData = getSkin(this.skinId);
    this.marking  = this.skinData ? this.skinData.marking : 'none';
    this.upgrades = {
      shield:   shieldTier,
      speed:    speedTier,
      weapon:   SaveData.getUpgradeTier('weaponPower'),
      magazine: SaveData.getUpgradeTier('magazineCapacity'),
    };

    // ── Timers ─────────────────────────────────────────────────────────────────
    this._iFrameTimer  = 0;
    this._regenPause   = 0;
    this._flashTimer   = 0;
    this._invulnerable = false;

    // ── Hazard state (set by HazardSystem each frame) ─────────────────────────
    this.hazardForceX   = 0;
    this.hazardForceY   = 0;
    this.hazardSpeedMult = 1;   // Mars: 0.85 floaty; Mercury cold: 0.70

    // ── Position ──────────────────────────────────────────────────────────────
    const { height } = scene.scale;
    this.x = 130;
    this.y = height / 2;

    // ── Input state ───────────────────────────────────────────────────────────
    this._mouseHeld     = false;
    this._mouseX        = this.x;
    this._mouseY        = this.y;
    this._touchId       = null;
    this._touchDragX    = this.x;
    this._touchDragY    = this.y;
    this._touchFireHeld = false;

    // ── Weapon system ─────────────────────────────────────────────────────────
    this.weapons = new WeaponSystem(scene);

    // ── Trail particles ───────────────────────────────────────────────────────
    this._trail = [];

    // ── Graphics ──────────────────────────────────────────────────────────────
    // bodyG: ship hull baked at origin; trailG/overlayG redraw lightly each frame
    this.trailG   = scene.add.graphics().setDepth(8);
    this.bodyG    = scene.add.graphics().setDepth(10);
    this.g        = scene.add.graphics().setDepth(11); // reload / rapid-fire rings
    this._flashing = false;
    this._ringKey  = '';

    this._setupInput();
    this._redrawBody(false);
    this.bodyG.setPosition(this.x, this.y);
  }

  // ── Input setup ───────────────────────────────────────────────────────────────

  _setupInput() {
    const scene = this.scene;

    this.keys = scene.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.UP,
      down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      fire: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    // Weapon keys
    this._onW1 = () => this.weapons.switchTo(0);
    this._onW2 = () => this.weapons.switchTo(1);
    this._onW3 = () => this.weapons.switchTo(2);
    this._onReload = () => this.weapons.startReload();

    scene.input.keyboard.on('keydown-ONE',   this._onW1);
    scene.input.keyboard.on('keydown-TWO',   this._onW2);
    scene.input.keyboard.on('keydown-THREE', this._onW3);
    scene.input.keyboard.on('keydown-R',     this._onReload);

    // Mouse
    this._onPointerDown = (ptr) => {
      if (ptr.pointerType !== 'touch') {
        this._mouseHeld = true;
        this._mouseX = ptr.x;
        this._mouseY = ptr.y;
      } else if (this._touchId === null) {
        const { width } = scene.scale;
        if (ptr.x < width * 0.60) {
          this._touchId       = ptr.id;
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
      if (ptr.pointerType !== 'touch') { this._mouseHeld = false; }
      else if (ptr.id === this._touchId) { this._touchId = null; }
    };
    this._onWheel = (ptr, objs, dx, dy) => {
      this.weapons.cycleWeapon(dy > 0 ? 1 : -1);
    };

    scene.input.on('pointerdown', this._onPointerDown);
    scene.input.on('pointermove', this._onPointerMove);
    scene.input.on('pointerup',   this._onPointerUp);
    scene.input.on('wheel',       this._onWheel);
  }

  /** Remove all shared input listeners. */
  shutdown() {
    const scene = this.scene;
    if (!scene || !scene.input) return;
    if (scene.input.keyboard) {
      scene.input.keyboard.off('keydown-ONE',   this._onW1);
      scene.input.keyboard.off('keydown-TWO',   this._onW2);
      scene.input.keyboard.off('keydown-THREE', this._onW3);
      scene.input.keyboard.off('keydown-R',     this._onReload);
    }
    scene.input.off('pointerdown', this._onPointerDown);
    scene.input.off('pointermove', this._onPointerMove);
    scene.input.off('pointerup',   this._onPointerUp);
    scene.input.off('wheel',       this._onWheel);
    if (this.weapons) this.weapons.destroy();
  }

  // ── Touch controls set from GameScene UI ─────────────────────────────────────

  setTouchFire(held) { this._touchFireHeld = held; }
  setTouchReload()   { this.weapons.startReload(); }
  setWeapon(index)   { this.weapons.switchTo(index); }

  // ── Shield ────────────────────────────────────────────────────────────────────

  get shieldFraction() { return this.shield / this.maxShield; }

  takeDamage(amount) {
    if (!this.alive || this._invulnerable) return false;
    this.shield = Math.max(0, this.shield - amount);
    this._iFrameTimer  = BALANCE.I_FRAME_DURATION;
    this._regenPause   = BALANCE.SHIELD_REGEN_PAUSE;
    this._flashTimer   = 300;
    this._invulnerable = true;
    this.scene.events.emit('shipHit', this.shield, this.maxShield);
    if (this.shield <= 0) {
      this.alive = false;
      this.scene.events.emit('shipDestroyed');
    }
    return true;
  }

  healShield(amount) {
    this.shield = Math.min(this.maxShield, this.shield + amount);
    this.scene.events.emit('shipShieldChanged', this.shield, this.maxShield);
  }

  /** Circle-vs-ship hit test. Wings and fuselage both count. */
  hitsCircle(cx, cy, r) {
    for (const h of HIT_CIRCLES) {
      const dx = (this.x + h.x) - cx;
      const dy = (this.y + h.y) - cy;
      const rr = h.r + r;
      if (dx * dx + dy * dy <= rr * rr) return true;
    }
    return false;
  }

  // ── Update (called every frame) ────────────────────────────────────────────────

  /**
   * @param {number}   delta  ms since last frame
   * @returns {Array}  array of shot descriptors from WeaponSystem.tryFire()
   */
  update(delta) {
    if (!this.alive) return [];
    const dt    = delta / 1000;
    const speed = this.baseSpeed * (this.hazardSpeedMult || 1);
    const { width, height } = this.scene.scale;

    // ── Movement ────────────────────────────────────────────────────────────
    let dx = 0, dy = 0;

    if (this.keys.up.isDown    || this.keys.w.isDown)  dy -= speed;
    if (this.keys.down.isDown  || this.keys.s.isDown)  dy += speed;
    if (this.keys.left.isDown  || this.keys.a.isDown)  dx -= speed;
    if (this.keys.right.isDown || this.keys.d.isDown)  dx += speed;

    if (this._mouseHeld) {
      const tx = this._mouseX - this.x, ty = this._mouseY - this.y;
      const dist = Math.sqrt(tx * tx + ty * ty);
      if (dist > 8) { dx = (tx / dist) * speed; dy = (ty / dist) * speed; }
    }
    if (this._touchId !== null) {
      const tx = this._touchDragX - this.x, ty = this._touchDragY - this.y;
      const dist = Math.sqrt(tx * tx + ty * ty);
      if (dist > 5) {
        const ms = Math.min(speed * 2, dist / dt);
        dx = (tx / dist) * ms; dy = (ty / dist) * ms;
      }
    }

    // Hazard forces
    dx += this.hazardForceX;
    dy += this.hazardForceY;

    // Diagonal normalise
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    this.x = Phaser.Math.Clamp(this.x + dx * dt, 24, width * BALANCE.SHIP_MAX_X_FRACTION - 24);
    this.y = Phaser.Math.Clamp(this.y + dy * dt, 24, height - 24);

    // ── Timers ───────────────────────────────────────────────────────────────
    if (this._iFrameTimer > 0) {
      this._iFrameTimer -= delta;
      if (this._iFrameTimer <= 0) { this._invulnerable = false; this._iFrameTimer = 0; }
    }
    if (this._flashTimer > 0) this._flashTimer -= delta;
    if (this._regenPause > 0) {
      this._regenPause -= delta;
    } else if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + BALANCE.SHIELD_REGEN_RATE * dt);
    }

    // ── Weapon system update ─────────────────────────────────────────────────
    this.weapons.update(delta);

    // ── Trail ────────────────────────────────────────────────────────────────
    const trailAge = 220 + (this.upgrades.speed || 0) * 70;
    this._trail.push({ x: this.x - 50, y: this.y, age: 0, maxAge: trailAge });
    for (let i = this._trail.length - 1; i >= 0; i--) {
      this._trail[i].age += delta;
      if (this._trail[i].age > this._trail[i].maxAge) this._trail.splice(i, 1);
    }

    // ── Try firing ───────────────────────────────────────────────────────────
    const wantsToFire = this.keys.fire.isDown || this._mouseHeld || this._touchFireHeld;
    let shots = [];
    if (wantsToFire) {
      shots = this.weapons.tryFire(this.x, this.y, 1280, this.y);
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    const flashing = this._flashTimer > 0 && Math.floor(this._flashTimer / 80) % 2 === 0;
    if (flashing !== this._flashing) {
      this._flashing = flashing;
      this._redrawBody(flashing);
    }
    this.bodyG.setPosition(this.x, this.y);
    this._drawOverlays();

    return shots;
  }

  // ── Visual ────────────────────────────────────────────────────────────────────

  _redrawBody(flashing) {
    this.bodyG.clear();
    if (!flashing) {
      drawShip(this.bodyG, 0, 0, 'gameplay', this.marking, this.upgrades);
    } else {
      this.bodyG.fillStyle(C.BONE, 1);
      this.bodyG.fillPoints([
        { x: 51, y: 0 },
        { x: 12, y: -7 },
        { x: -51, y: -9 },
        { x: -51, y: 9 },
        { x: 12, y: 7 },
      ], true);
    }
  }

  _drawOverlays() {
    this.trailG.clear();
    for (const p of this._trail) {
      const t = 1 - p.age / p.maxAge;
      this.trailG.fillStyle(C.BLAZE, t * 0.6);
      this.trailG.fillRect(p.x, p.y - 2, 6 + t * 4, 4);
    }

    const hud = this.weapons.getHudState();
    const showReload = hud.reloading && hud.reloadProgress > 0;
    const showRapid  = !!hud.rapidFireActive;
    const showEmpty  = hud.showReloadPrompt;
    if (!showReload && !showRapid && !showEmpty) {
      if (this._ringKey !== 'off') {
        this._ringKey = 'off';
        this.g.clear();
      }
      return;
    }
    const blink = Math.floor(hud.reloadPromptBlink / 350) % 2 === 0;
    const ringKey = `${showReload ? hud.reloadProgress.toFixed(2) : 0}|${showRapid ? 1 : 0}|${showEmpty ? (blink ? 1 : 0) : 0}|${this.x | 0}|${this.y | 0}`;
    if (ringKey === this._ringKey) return;
    this._ringKey = ringKey;

    this.g.clear();
    if (showReload) {
      this.g.lineStyle(3, C.TEAL, 0.8);
      this.g.beginPath();
      this.g.arc(this.x, this.y, 28, -Math.PI / 2, -Math.PI / 2 + hud.reloadProgress * Math.PI * 2);
      this.g.strokePath();
    }
    if (showRapid) {
      this.g.lineStyle(2, C.BLAZE, 0.5);
      this.g.strokeCircle(this.x, this.y, 32);
    }
    if (showEmpty && blink) {
      this.g.lineStyle(2, C.BLAZE, 0.85);
      this.g.strokeCircle(this.x, this.y, 36);
    }
  }

  // ── Destroy ───────────────────────────────────────────────────────────────────

  destroy() {
    this.shutdown();
    if (this.g)      { this.g.destroy();      this.g      = null; }
    if (this.bodyG)  { this.bodyG.destroy();  this.bodyG  = null; }
    if (this.trailG) { this.trailG.destroy(); this.trailG = null; }
  }
}
