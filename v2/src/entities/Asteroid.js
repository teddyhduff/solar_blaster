// Asteroid.js — Enemy asteroid. Spawns from the right, drifts left.
// Stencil Riso: bone irregular polygon, halftone overlay, blaze misprint.
// Baked to textures; pose via setPosition/setRotation.

import { BALANCE }                        from '../data/balance.js';
import { drawAsteroid, genAsteroidVertices } from '../systems/StencilArt.js';

export const ASTEROID_SIZE = { SMALL: 'small', MEDIUM: 'medium', LARGE: 'large' };

const SIZE_CFG = {
  small:  { radius: 14, hp: 1, damage: BALANCE.DAMAGE_SMALL_ASTEROID,  score: BALANCE.SCORE_SMALL_ASTEROID  },
  medium: { radius: 24, hp: 2, damage: BALANCE.DAMAGE_MEDIUM_ASTEROID, score: BALANCE.SCORE_MEDIUM_ASTEROID },
  large:  { radius: 38, hp: 4, damage: BALANCE.DAMAGE_LARGE_ASTEROID,  score: BALANCE.SCORE_LARGE_ASTEROID  },
};

let _asteroidSeq = 0;

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
    this.sizeLabel = size.toUpperCase();
    this.cfg      = SIZE_CFG[size];
    this.x        = x;
    this.y        = y;
    this.hp       = this.cfg.hp;
    this.active   = true;
    this.damage   = this.cfg.damage;

    this.speed    = 0;
    this._vx      = 0;
    this._vy      = Phaser.Math.FloatBetween(-30, 30);
    this._rot     = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this._rotSpeed = Phaser.Math.FloatBetween(-1.8, 1.8);
    this._flashTimer = 0;
    this._flashing = false;

    this._vertices = genAsteroidVertices(this.cfg.radius, Math.random());
    this._id = ++_asteroidSeq;
    this._texKey = `asteroid_${this._id}`;

    this.img = null;
    this._bake(false);
    this.img.setPosition(this.x, this.y);
    this.img.setRotation(this._rot);
  }

  _bake(flashing) {
    const pad = 14;
    const size = Math.ceil(this.cfg.radius * 2 + pad * 2 + 6);
    const g = this.scene.make.graphics({ add: false });
    drawAsteroid(g, size / 2, size / 2, this.cfg.radius, this._vertices, flashing);
    if (this.scene.textures.exists(this._texKey)) this.scene.textures.remove(this._texKey);
    g.generateTexture(this._texKey, size, size);
    g.destroy();
    if (!this.img) {
      this.img = this.scene.add.image(this.x, this.y, this._texKey).setDepth(6);
    } else {
      this.img.setTexture(this._texKey);
    }
  }

  update(delta) {
    if (!this.active) return;
    const dt = delta / 1000;

    if (this._vx === 0) {
      this._vx = -(this.speed + Phaser.Math.Between(0, 45));
    }

    this.x    += this._vx * dt;
    this.y    += this._vy * dt;
    this._rot += this._rotSpeed * dt;

    if (this._flashTimer > 0) this._flashTimer -= delta;

    const flashing = this._flashTimer > 0;
    if (flashing !== this._flashing) {
      this._flashing = flashing;
      this._bake(flashing);
    }

    this.img.setPosition(this.x, this.y);
    this.img.setRotation(this._rot);

    const { height } = this.scene.scale;
    const r = this.cfg.radius;
    if (this.y < r && this._vy < 0) this._vy *= -1;
    if (this.y > height - r && this._vy > 0) this._vy *= -1;

    if (this.x < -(r * 3)) this.destroy();
  }

  overlapsPoint(px, py) {
    const dx = px - this.x, dy = py - this.y;
    return dx * dx + dy * dy <= this.cfg.radius * this.cfg.radius;
  }

  hit(damage) {
    this.hp -= damage;
    this._flashTimer = 140;
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }

  destroy() {
    this.active = false;
    try { this.img?.destroy(); } catch {}
    if (this._texKey && this.scene?.textures?.exists(this._texKey)) {
      this.scene.textures.remove(this._texKey);
    }
  }
}
