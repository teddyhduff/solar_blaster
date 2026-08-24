// Projectile.js — A player-fired projectile (laser bolt, plasma pellet, missile).
// Stencil Riso: blaze bars with misprint shadow. No neon glow halos.
// Constructed from a shot descriptor object produced by WeaponSystem.tryFire().
// Drawn once at origin; moved via setPosition.

import { C } from '../systems/StencilArt.js';

export class Projectile {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} shot  { weapon, x, y, angle, damage, homing }
   */
  constructor(scene, shot) {
    this.scene   = scene;
    this.weapon  = shot.weapon;
    this.damage  = shot.damage;
    this.homing  = shot.homing || false;
    this.active  = true;

    this.x = shot.x;
    this.y = shot.y;

    this.vx = Math.cos(shot.angle) * this.weapon.projectileSpeed;
    this.vy = Math.sin(shot.angle) * this.weapon.projectileSpeed;

    this.g = scene.add.graphics().setDepth(9);
    this._draw();
    this.g.setPosition(this.x, this.y);
    this.g.setRotation(shot.angle);
  }

  // ── Visual ────────────────────────────────────────────────────────────────────

  _draw() {
    this.g.clear();
    const w = this.weapon;

    // Local-space draw along +X; rotation applied via setRotation
    this.g.fillStyle(C.BLAZE, 0.35);
    this.g.fillRect(-w.width / 2 + 6, -w.height / 2 + 6, w.width, w.height);

    this.g.fillStyle(C.BLAZE, 1);
    this.g.fillRect(-w.width / 2, -w.height / 2, w.width, w.height);

    if (w.id === 'missiles') {
      this.g.fillStyle(C.BONE, 1);
      this.g.fillRect(w.width / 2 - 5, -w.height / 2, 5, w.height);
      this.g.fillStyle(C.BLAZE, 0.60);
      this.g.fillCircle(-w.width / 2 + 2, 0, w.height * 0.6);
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  update(delta) {
    if (!this.active) return;
    const dt = delta / 1000;

    // Mild homing toward boss/nearest target for missiles
    if (this.homing && this.scene.boss?.alive) {
      const bx = this.scene.boss.x, by = this.scene.boss.y;
      const tx = bx - this.x, ty = by - this.y;
      const len = Math.sqrt(tx * tx + ty * ty);
      if (len > 10) {
        const str = this.weapon.homingStrength || 0.04;
        this.vx += (tx / len) * str * this.weapon.projectileSpeed;
        this.vy += (ty / len) * str * this.weapon.projectileSpeed;
        const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const target = this.weapon.projectileSpeed;
        this.vx = (this.vx / spd) * target;
        this.vy = (this.vy / spd) * target;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const { width, height } = this.scene.scale;
    if (this.x < -40 || this.x > width + 40 || this.y < -40 || this.y > height + 40) {
      this.destroy();
      return;
    }

    this.g.setPosition(this.x, this.y);
    if (this.homing) this.g.setRotation(Math.atan2(this.vy, this.vx));
  }

  destroy() {
    this.active = false;
    try { this.g.destroy(); } catch {}
  }
}
