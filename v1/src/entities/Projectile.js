// Projectile.js — A single bullet or missile fired by the player.
// Each weapon type gets its own visual style.

export class Projectile {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x          spawn x (world coords)
   * @param {number} y          spawn y
   * @param {object} weaponDef  from data/weapons.js
   * @param {number} angle      direction angle in degrees (0 = right)
   * @param {number} damage     pre-calculated damage value
   */
  constructor(scene, x, y, weaponDef, angle, damage) {
    this.scene    = scene;
    this.weaponId = weaponDef.id;
    this.damage   = damage;
    this.homing   = weaponDef.homing  || false;
    this.homingStr= weaponDef.homingStrength || 0;
    this.alive    = true;

    const rad = Phaser.Math.DegToRad(angle);
    this.vx = Math.cos(rad) * weaponDef.speed;
    this.vy = Math.sin(rad) * weaponDef.speed;

    this.x = x;
    this.y = y;

    this.g = scene.add.graphics();
    this.g.setDepth(9);
    this._draw(weaponDef.color);
  }

  _draw(color) {
    this.g.clear();
    switch (this.weaponId) {
      case 'laser':
        // Slim bright bolt with glow halo.
        this.g.fillStyle(color, 0.5);
        this.g.fillRect(-18, -4, 36, 8);
        this.g.fillStyle(color, 1);
        this.g.fillRect(-16, -2, 32, 4);
        break;

      case 'spread':
        // Glowing plasma pellet.
        this.g.fillStyle(color, 0.35);
        this.g.fillCircle(0, 0, 9);
        this.g.fillStyle(color, 0.9);
        this.g.fillCircle(0, 0, 5);
        break;

      case 'missile':
        // Elongated rocket with exhaust cone.
        this.g.fillStyle(color, 0.9);
        this.g.fillRect(-12, -3, 22, 6);
        // Warhead.
        this.g.fillStyle(0xFF4500, 1);
        this.g.fillTriangle(10, -3, 16, 0, 10, 3);
        // Exhaust glow.
        this.g.fillStyle(0xFF8C00, 0.6);
        this.g.fillTriangle(-12, -5, -20, 0, -12, 5);
        break;
    }
    this.g.x = this.x;
    this.g.y = this.y;
  }

  /**
   * Move the projectile; optionally home toward a target point.
   * @param {number} delta        ms since last frame
   * @param {{x,y}|null} target   nearest enemy position for homing
   */
  update(delta, target = null) {
    if (!this.alive) return;
    const dt = delta / 1000;

    // Homing: gradually steer toward target.
    if (this.homing && target) {
      const dx   = target.x - this.x;
      const dy   = target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        const spd    = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const desVx  = (dx / dist) * spd;
        const desVy  = (dy / dist) * spd;
        const turn   = Phaser.Math.DegToRad(this.homingStr) * dt;
        this.vx     += Phaser.Math.Clamp(desVx - this.vx, -turn * spd, turn * spd);
        this.vy     += Phaser.Math.Clamp(desVy - this.vy, -turn * spd, turn * spd);
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.g.x = this.x;
    this.g.y = this.y;

    // Rotate spread / missile graphic to match travel direction.
    if (this.weaponId !== 'laser') {
      this.g.rotation = Math.atan2(this.vy, this.vx);
    }

    // Destroy when off-screen.
    const { width, height } = this.scene.scale;
    if (this.x > width + 60 || this.x < -60 || this.y < -60 || this.y > height + 60) {
      this.destroy();
    }
  }

  /** Circle bounds for collision detection. */
  getBounds() {
    const r = this.weaponId === 'missile' ? 10 : (this.weaponId === 'laser' ? 8 : 7);
    return { x: this.x, y: this.y, r };
  }

  destroy() {
    this.alive = false;
    this.g.destroy();
  }
}
