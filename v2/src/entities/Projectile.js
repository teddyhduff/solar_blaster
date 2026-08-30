// Projectile.js — A player-fired projectile (laser bolt, plasma pellet, missile).
// Stencil Riso: blaze bars with misprint shadow. No neon glow halos.
// Constructed from a shot descriptor object produced by WeaponSystem.tryFire().
// Drawn once at origin; moved via setPosition.

import { C } from '../systems/StencilArt.js';
import { BALANCE } from '../data/balance.js';

export class Projectile {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} shot  { weapon, x, y, angle, damage, homing, pierce, smear }
   */
  constructor(scene, shot) {
    this.scene   = scene;
    this.weapon  = shot.weapon;
    this.damage  = shot.damage;
    this.homing  = shot.homing || false;
    this.active  = true;
    this.pierce  = shot.pierce || 0;
    this.smear   = !!shot.smear;
    this._hitIds = new Set();
    this._smearAcc = 0;

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

    // Mild homing toward the current lock target (boss / moon / large rock / enemy)
    const lock = this.scene.lockTarget;
    if (this.homing && lock) {
      const bx = lock.x, by = lock.y;
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

    const prevX = this.x, prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.smear && this.scene.spawnPlasmaSmear) {
      const dx = this.x - prevX, dy = this.y - prevY;
      this._smearAcc += Math.sqrt(dx * dx + dy * dy);
      if (this._smearAcc >= BALANCE.PLASMA_SMEAR_GAP) {
        this._smearAcc = 0;
        this.scene.spawnPlasmaSmear(this.x, this.y);
      }
    }

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
