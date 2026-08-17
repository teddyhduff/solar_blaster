// Asteroid.js — Enemy asteroid. Spawns from the right, drifts left.
// Large asteroids split into medium ones when destroyed.

import { BALANCE } from '../data/balance.js';

/** Blend two hex colors. t=0 → a, t=1 → b. */
function blendColor(a, b, t) {
  const ar = (a >> 16) & 0xFF, ag = (a >> 8) & 0xFF, ab = a & 0xFF;
  const br = (b >> 16) & 0xFF, bg = (b >> 8) & 0xFF, bb = b & 0xFF;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bv = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bv;
}

export const ASTEROID_SIZE = { SMALL: 'small', MEDIUM: 'medium', LARGE: 'large' };

// Physical properties per size.
const SIZE_CFG = {
  small:  { radius: 14, hp: 1, damage: BALANCE.DAMAGE_SMALL_ASTEROID,  score: BALANCE.SCORE_SMALL_ASTEROID  },
  medium: { radius: 24, hp: 2, damage: BALANCE.DAMAGE_MEDIUM_ASTEROID, score: BALANCE.SCORE_MEDIUM_ASTEROID },
  large:  { radius: 38, hp: 4, damage: BALANCE.DAMAGE_LARGE_ASTEROID,  score: BALANCE.SCORE_LARGE_ASTEROID  },
};

export class Asteroid {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x         spawn x (usually off-screen right edge)
   * @param {number} y         spawn y
   * @param {string} size      ASTEROID_SIZE constant
   * @param {number} speed     base horizontal drift speed in px/s
   */
  constructor(scene, x, y, size, speed) {
    this.scene = scene;
    this.size  = size;
    this.cfg   = SIZE_CFG[size];
    this.x     = x;
    this.y     = y;
    this.hp    = this.cfg.hp;
    this.alive = true;

    // Give each asteroid a slightly different speed and random vertical drift.
    this.vx = -(speed + Phaser.Math.Between(0, 45));
    this.vy = Phaser.Math.FloatBetween(-30, 30);

    // Random rotation speed for visual variety.
    this._rot      = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this._rotSpeed = Phaser.Math.FloatBetween(-1.8, 1.8);
    this._flash    = 0;

    // Generate a jagged polygon shape (unique per asteroid).
    this._pts = this._makePoints();

    // Lightly tint glow toward the planet's accent color (~20% blend).
    const accent = scene.planetData?.accentColor ?? 0xAA99FF;
    this._bodyColor = blendColor(0x8C7AE6, accent, 0.20);
    this._glowColor = blendColor(0xAA99FF, accent, 0.20);

    this.g = scene.add.graphics();
    this.g.setDepth(6);
    this._draw(false);
  }

  /** Build a jagged polygon by perturbing a circle. */
  _makePoints() {
    const r   = this.cfg.radius;
    const n   = Phaser.Math.Between(7, 12);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const d = r * Phaser.Math.FloatBetween(0.70, 1.18);
      pts.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
    }
    return pts;
  }

  _draw(flashing) {
    this.g.clear();
    const bodyColor  = flashing ? 0xFFFFFF : this._bodyColor;
    const glowColor  = flashing ? 0xFFFFFF : this._glowColor;

    // Rotate the shape points.
    const cos = Math.cos(this._rot);
    const sin = Math.sin(this._rot);
    const pts = this._pts.map(p => ({
      x: p.x * cos - p.y * sin,
      y: p.x * sin + p.y * cos,
    }));

    // Glow halo (larger, semi-transparent duplicate).
    this.g.fillStyle(glowColor, 0.12);
    this.g.fillPoints(pts, true);

    // Main rock body.
    this.g.fillStyle(bodyColor, 0.88);
    this.g.fillPoints(pts, true);

    // Outline.
    this.g.lineStyle(1.5, glowColor, 0.70);
    this.g.strokePoints(pts, true);
  }

  update(delta) {
    if (!this.alive) return;
    const dt = delta / 1000;

    this.x     += this.vx * dt;
    this.y     += this.vy * dt;
    this._rot  += this._rotSpeed * dt;
    if (this._flash > 0) this._flash -= delta;

    this.g.x = this.x;
    this.g.y = this.y;
    this._draw(this._flash > 0);

    // Bounce off top and bottom screen edges.
    const { height } = this.scene.scale;
    const r = this.cfg.radius;
    if (this.y < r  && this.vy < 0) this.vy *= -1;
    if (this.y > height - r && this.vy > 0) this.vy *= -1;

    // Remove once it has drifted past the left edge.
    if (this.x < -(r * 3)) this.destroy();
  }

  /** Circle bounds for collision. */
  getBounds() {
    return { x: this.x, y: this.y, r: this.cfg.radius };
  }

  /** Deal weapon damage. Returns true if the asteroid should be destroyed. */
  takeDamage(dmg) {
    this.hp   -= dmg;
    this._flash = 140;
    return this.hp <= 0;
  }

  /**
   * Destroy this asteroid and return any child fragments (for large → medium split).
   * @param {Function} onDropPickup  called with (x, y) if a pickup should spawn
   * @returns {Asteroid[]} child asteroids to add to the world
   */
  explode(onDropPickup) {
    this.alive = false;
    this.g.destroy();

    const children = [];

    // Large asteroids shatter into medium fragments.
    if (this.size === ASTEROID_SIZE.LARGE) {
      for (let i = 0; i < BALANCE.ASTEROID_SPLIT_INTO; i++) {
        const ox    = Phaser.Math.Between(-22, 22);
        const oy    = Phaser.Math.Between(-22, 22);
        const child = new Asteroid(
          this.scene,
          this.x + ox,
          this.y + oy,
          ASTEROID_SIZE.MEDIUM,
          Math.abs(this.vx) * 0.85,
        );
        // Give split pieces some diverging vertical velocity.
        child.vy += (i === 0 ? -40 : 40);
        children.push(child);
      }
    }

    if (onDropPickup) onDropPickup(this.x, this.y);

    return children;
  }

  destroy() {
    this.alive = false;
    try { this.g.destroy(); } catch (e) {}
  }
}
