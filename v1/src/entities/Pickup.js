// Pickup.js — Coins, gems, shield boosts, and weapon tokens.
// Dropped by destroyed asteroids and collected on overlap with the ship.

import { BALANCE } from '../data/balance.js';

export const PICKUP_TYPE = {
  COIN:         'coin',
  GEM:          'gem',
  SHIELD:       'shieldBoost',
  WEAPON_TOKEN: 'weaponToken',
};

export class Pickup {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} type  one of PICKUP_TYPE
   */
  constructor(scene, x, y, type) {
    this.scene = scene;
    this.type  = type;
    this.x     = x;
    this.y     = y;
    this.alive = true;
    this.vx    = -55;
    this.vy    = Phaser.Math.FloatBetween(-25, 25);
    this._age  = 0;
    this._maxAge = 11000;
    this._bob  = Phaser.Math.FloatBetween(0, Math.PI * 2);   // phase offset for bobbing

    this.g = scene.add.graphics();
    this.g.setDepth(7);
    this._draw();
  }

  _draw() {
    this.g.clear();
    switch (this.type) {
      case PICKUP_TYPE.COIN:
        this.g.fillStyle(0xFFD93D, 1);
        this.g.fillCircle(0, 0, 7);
        this.g.lineStyle(2, 0xFFEE99, 0.8);
        this.g.strokeCircle(0, 0, 7);
        break;

      case PICKUP_TYPE.GEM:
        // Diamond shape.
        this.g.fillStyle(0xFF9F43, 1);
        this.g.fillTriangle(0, -11, 9, 1, 0, 11);
        this.g.fillTriangle(0, -11, -9, 1, 0, 11);
        this.g.lineStyle(1.5, 0xFFEEAA, 0.9);
        this.g.strokeTriangle(0, -11, 9, 1, 0, 11);
        this.g.strokeTriangle(0, -11, -9, 1, 0, 11);
        break;

      case PICKUP_TYPE.SHIELD:
        // Green circle with a cross.
        this.g.fillStyle(0x00E5A0, 0.35);
        this.g.fillCircle(0, 0, 10);
        this.g.lineStyle(2.5, 0x00E5A0, 1);
        this.g.strokeCircle(0, 0, 10);
        this.g.fillStyle(0xFFFFFF, 0.9);
        this.g.fillRect(-1.5, -6, 3, 12);
        this.g.fillRect(-6, -1.5, 12, 3);
        break;

      case PICKUP_TYPE.WEAPON_TOKEN:
        // Orange circle with a lightning bolt.
        this.g.fillStyle(0xFF6B35, 0.35);
        this.g.fillCircle(0, 0, 10);
        this.g.lineStyle(2.5, 0xFF6B35, 1);
        this.g.strokeCircle(0, 0, 10);
        // Bolt shape.
        this.g.fillStyle(0xFFFF00, 1);
        this.g.fillTriangle(3, -8, -3, 0, 2, 0);
        this.g.fillTriangle(-3, 8, 3, 0, -2, 0);
        break;
    }
    this.g.x = this.x;
    this.g.y = this.y;
  }

  update(delta) {
    if (!this.alive) return;
    const dt = delta / 1000;
    this._age += delta;

    // Drift left with a gentle vertical bob.
    this.x += this.vx * dt;
    this.y += Math.sin(this._age * 0.004 + this._bob) * 0.55;

    this.g.x = this.x;
    this.g.y = this.y;

    // Fade out in the last 30% of lifespan.
    if (this._age > this._maxAge * 0.7) {
      this.g.alpha = 1 - (this._age - this._maxAge * 0.7) / (this._maxAge * 0.3);
    }

    if (this._age >= this._maxAge || this.x < -30) {
      this.destroy();
    }
  }

  /** Circle bounds for collision. */
  getBounds() {
    return { x: this.x, y: this.y, r: 14 };
  }

  destroy() {
    this.alive = false;
    this.g.destroy();
  }
}
