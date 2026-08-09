// Moon.js — Real moon entities that drift through during the Descent phase.
// Large, slow, high-HP obstacles. Dodge-only in practice (huge HP).
// Sized via radiusRatio relative to the planet data; Ganymede genuinely dwarfs Phobos.

import { BALANCE }       from '../data/balance.js';
import { drawMoon }      from '../systems/StencilArt.js';

// Base pixel radius for a "large" moon at radiusRatio=1.
const BASE_RADIUS = 55;

export class Moon {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} moonData — { id, name, radiusRatio, speedSign, desc }
   * @param {number} spawnY   — vertical position (random in playfield)
   */
  constructor(scene, moonData, spawnY) {
    this.scene    = scene;
    this.data     = moonData;
    this.radius   = Math.max(16, Math.round(BASE_RADIUS * moonData.radiusRatio));
    this.hp       = BALANCE.MOON_HP;
    this.maxHp    = BALANCE.MOON_HP;
    this.score    = BALANCE.SCORE_MOON;
    this.damage   = BALANCE.DAMAGE_MOON;
    this.active   = true;

    // Moons drift from right to left (or left to right for retrograde — Triton).
    this.x = 1280 + this.radius + 20;
    this.y = spawnY;
    // speedSign: 1 = normal (right to left), -1 = retrograde (appears from left)
    const gs = this.scene.planetData?.gameSpeed ?? BALANCE.GAME_SPEED;   // per-planet level-tempo multiplier
    this._vx = BALANCE.MOON_SPEED_PX_S * gs * (moonData.speedSign ?? 1) * -1;

    this._blazeFlashTimer = 0;
    this._blazeFlash      = false;

    // Graphics object (cleared and redrawn each frame)
    this.g = scene.add.graphics();
    this.g.setDepth(4);   // behind ship, in front of planet backdrop
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  update(dt) {
    if (!this.active) return;

    const dtSec = dt / 1000;
    this.x += this._vx * dtSec;

    // Retrograde: spawn from left
    if (this.data.speedSign === -1) {
      this.x = -this.radius - 20 + Math.abs(this._vx) * (this.scene.time.now / 1000);
    }

    // Scroll off screen
    if (this.x < -this.radius - 60 || this.x > 1280 + this.radius + 60) {
      this.destroy();
      return;
    }

    // Hit flash decay
    if (this._blazeFlashTimer > 0) {
      this._blazeFlashTimer -= dt;
      this._blazeFlash = true;
    } else {
      this._blazeFlash = false;
    }

    this._draw();
  }

  _draw() {
    this.g.clear();
    drawMoon(this.g, this.x, this.y, this.radius);

    // Name label (Barlow Condensed, bone) — only if large enough
    if (this.radius >= 30 && !this._nameText) {
      this._nameText = this.scene.add.text(
        this.x, this.y - this.radius - 12,
        this.data.name.toUpperCase(),
        { fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px',
          color: '#efe9dd', letterSpacing: 5, fontStyle: 'bold' }
      ).setOrigin(0.5, 1).setDepth(5);
    }
    if (this._nameText) {
      this._nameText.setPosition(this.x, this.y - this.radius - 12);
    }
  }

  // ── Damage ────────────────────────────────────────────────────────────────────

  hit(damage) {
    if (!this.active) return;
    this.hp -= damage;
    this._blazeFlashTimer = 100;
    if (this.hp <= 0) {
      this.hp = 0;
      this.scene.events.emit('moonDestroyed', this);
      this.destroy();
    }
  }

  // ── Bounds check (for ship collision) ────────────────────────────────────────

  overlapsPoint(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    return (dx * dx + dy * dy) <= (this.radius + 16) ** 2;
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  destroy() {
    this.active = false;
    this.g.destroy();
    if (this._nameText) this._nameText.destroy();
  }
}
