// Asteroid.js — Enemy asteroid. Spawns from the right, drifts left.
// Stencil Riso: bone irregular polygon, halftone overlay, blaze misprint.

import { BALANCE }                        from '../data/balance.js';
import { drawAsteroid, genAsteroidVertices } from '../systems/StencilArt.js';

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
   * @param {string} size   ASTEROID_SIZE constant
   * @param {number} x      spawn x
   * @param {number} y      spawn y
   */
  constructor(scene, size, x, y) {
    this.scene    = scene;
    this.size     = size;
    this.sizeLabel = size.toUpperCase();   // 'SMALL' | 'MEDIUM' | 'LARGE'
    this.cfg      = SIZE_CFG[size];
    this.x        = x;
    this.y        = y;
    this.hp       = this.cfg.hp;
    this.active   = true;
    this.damage   = this.cfg.damage;

    this.speed    = 0;  // set by spawner after construction
    this._vx      = 0;
    this._vy      = Phaser.Math.FloatBetween(-30, 30);
    this._rot     = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this._rotSpeed = Phaser.Math.FloatBetween(-1.8, 1.8);
    this._flashTimer = 0;

    // Stable vertex array for StencilArt
    this._vertices = genAsteroidVertices(this.cfg.radius, Math.random());

    this.g = scene.add.graphics().setDepth(6);
    this._draw(false);
  }

  _draw(flashing) {
    this.g.clear();
    // Rotate vertices
    const cos = Math.cos(this._rot), sin = Math.sin(this._rot);
    const rotated = this._vertices.map(v => ({
      a: v.a + this._rot,
      r: v.r,
    }));
    drawAsteroid(this.g, this.x, this.y, this.cfg.radius, rotated, flashing);
  }

  update(delta) {
    if (!this.active) return;
    const dt = delta / 1000;

    if (this._vx === 0) {
      // First frame: apply speed set by spawner
      this._vx = -(this.speed + Phaser.Math.Between(0, 45));
    }

    this.x    += this._vx * dt;
    this.y    += this._vy * dt;
    this._rot += this._rotSpeed * dt;

    if (this._flashTimer > 0) this._flashTimer -= delta;

    this._draw(this._flashTimer > 0);

    // Bounce off screen edges
    const { height } = this.scene.scale;
    const r = this.cfg.radius;
    if (this.y < r && this._vy < 0) this._vy *= -1;
    if (this.y > height - r && this._vy > 0) this._vy *= -1;

    if (this.x < -(r * 3)) this.destroy();
  }

  /** Returns true if a point overlaps this asteroid (circle check). */
  overlapsPoint(px, py) {
    const dx = px - this.x, dy = py - this.y;
    return dx * dx + dy * dy <= this.cfg.radius * this.cfg.radius;
  }

  /** Hit with damage. Returns true if destroyed. */
  hit(damage) {
    this.hp -= damage;
    this._flashTimer = 140;
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }

  destroy() {
    this.active = false;
    try { this.g.destroy(); } catch {}
  }
}
