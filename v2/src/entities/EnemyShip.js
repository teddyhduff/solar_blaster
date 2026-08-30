// EnemyShip.js — Reversed REFLEX 07 fighter that drifts in and shoots.
// Bone hull; blaze only on weapons and damage flash.

import { BALANCE } from '../data/balance.js';
import { C, drawEnemy } from '../systems/StencilArt.js';

export class EnemyShip {
  constructor(scene, x, y) {
    this.scene  = scene;
    this.x      = x;
    this.y      = y;
    this.hp     = BALANCE.ENEMY_HP;
    this.active = true;
    this.radius = 22;

    this._vx = -(BALANCE.ENEMY_SPEED + Phaser.Math.Between(-20, 30));
    this._amp = Phaser.Math.FloatBetween(18, 40);
    this._baseY = y;
    this._t = Math.random() * Math.PI * 2;
    this._fireTimer = Phaser.Math.Between(400, BALANCE.ENEMY_FIRE_MS);
    this._flashTimer = 0;
    this._flashing = false;

    this.g = scene.add.graphics().setDepth(7);
    this._redraw(false);
    this.g.setPosition(this.x, this.y);
  }

  _redraw(flashing) {
    this.g.clear();
    drawEnemy(this.g, 0, 0, 0.62, flashing);
  }

  update(delta) {
    if (!this.active) return [];
    const dt = delta / 1000;
    this._t += dt;
    this.x += this._vx * dt;
    this.y = this._baseY + Math.sin(this._t * 1.6) * this._amp;

    if (this._flashTimer > 0) this._flashTimer -= delta;
    const flashing = this._flashTimer > 0 && Math.floor(this._flashTimer / 70) % 2 === 0;
    if (flashing !== this._flashing) {
      this._flashing = flashing;
      this._redraw(flashing);
    }
    this.g.setPosition(this.x, this.y);

    const { width, height } = this.scene.scale;
    if (this.y < 30) this._baseY += 20;
    if (this.y > height - 30) this._baseY -= 20;
    if (this.x < -80) { this.destroy(); return []; }

    const shots = [];
    this._fireTimer -= delta;
    if (this._fireTimer <= 0 && this.x < width - 40 && this.x > 80) {
      this._fireTimer = BALANCE.ENEMY_FIRE_MS;
      const ship = this.scene.ship;
      const tx = ship?.x ?? 100, ty = ship?.y ?? this.y;
      const a = Math.atan2(ty - this.y, tx - this.x);
      shots.push(this._makeShot(this.x - 18, this.y, a, 260));
    }
    return shots;
  }

  _makeShot(x, y, angle, speed) {
    return {
      x, y, angle,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: BALANCE.ENEMY_SHOT_DAMAGE,
      active: true,
      radius: 5,
      kind: 'bolt',
      update(delta) {
        const dt = delta / 1000;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.x < -20 || this.x > 1300 || this.y < -20 || this.y > 740) this.active = false;
        if (this._g) this._g.setPosition(this.x, this.y);
      },
      _g: null,
    };
  }

  overlapsPoint(px, py) {
    const dx = px - this.x, dy = py - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  hit(damage) {
    this.hp -= damage;
    this._flashTimer = 140;
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }

  destroy() {
    this.active = false;
    try { this.g?.destroy(); } catch {}
  }
}
