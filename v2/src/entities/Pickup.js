// Pickup.js — Coins, gems, shield boosts, ammo crates, and rapid-fire tokens.
// Stencil Riso: bone/blaze/teal only. No neon colours.

import { BALANCE }  from '../data/balance.js';
import {
  C,
  drawPickupCoin, drawPickupGem, drawPickupShield,
  drawPickupAmmo, drawPickupRapidFire,
} from '../systems/StencilArt.js';

export const PICKUP_TYPE = {
  COIN:       'coin',
  GEM:        'gem',
  SHIELD:     'shield',
  AMMO:       'ammo',         // V2: refills current weapon magazine
  RAPID_FIRE: 'rapidFire',
};

export class Pickup {
  /**
   * @param {Phaser.Scene} scene
   * @param {string} type  PICKUP_TYPE value
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, type, x, y) {
    this.scene  = scene;
    this.type   = type;
    this.x      = x;
    this.y      = y;
    this.active = true;
    this._vx    = -55;
    this._vy    = Phaser.Math.FloatBetween(-25, 25);
    this._age   = 0;
    this._maxAge = 11000;
    this._bob   = Phaser.Math.FloatBetween(0, Math.PI * 2);

    this.g = scene.add.graphics().setDepth(7);
    this._draw();
  }

  _draw() {
    this.g.clear();
    switch (this.type) {
      case PICKUP_TYPE.COIN:       drawPickupCoin(this.g, 0, 0);      break;
      case PICKUP_TYPE.GEM:        drawPickupGem(this.g, 0, 0);       break;
      case PICKUP_TYPE.SHIELD:     drawPickupShield(this.g, 0, 0);    break;
      case PICKUP_TYPE.AMMO:       drawPickupAmmo(this.g, 0, 0);      break;
      case PICKUP_TYPE.RAPID_FIRE: drawPickupRapidFire(this.g, 0, 0); break;
    }
  }

  update(delta) {
    if (!this.active) return;
    const dt = delta / 1000;

    this.x   += this._vx * dt;
    this._vy *= 0.996;   // gentle friction
    this.y   += this._vy * dt;

    // Bob up-down
    this._bob += dt * 2.5;
    const bobY = Math.sin(this._bob) * 3;

    this.g.x = this.x;
    this.g.y = this.y + bobY;

    this._age += delta;
    if (this._age > this._maxAge) { this.destroy(); return; }

    // Fade out last 2 seconds
    const fadeFrac = Math.min(1, (this._maxAge - this._age) / 2000);
    this.g.setAlpha(fadeFrac);
  }

  overlapsPoint(px, py) {
    const dx = px - this.x, dy = py - this.y;
    return dx * dx + dy * dy <= 20 * 20;
  }

  destroy() {
    this.active = false;
    try { this.g.destroy(); } catch {}
  }
}
