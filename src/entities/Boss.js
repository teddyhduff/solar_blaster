// Boss.js — End-of-level boss for Solar Blaster V2.
// Config comes from planet data: boss.hp, boss.phase2At, boss.threePhase, boss.attackPatterns.
// Stencil Riso: bone hull, blaze weapons/damage, ink canopy — same rules as enemies.
// The Sun boss has 3 phases instead of 2.

import { BALANCE } from '../data/balance.js';
import { C, drawEnemy, drawHalftoneDisc } from '../systems/StencilArt.js';

const STATE = { INTRO: 'intro', PHASE1: 'phase1', PHASE2: 'phase2', PHASE3: 'phase3', DEAD: 'dead' };

export class Boss {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} bossConfig  planet.boss data from planets.js
   * @param {object} planetData  full planet object
   */
  constructor(scene, bossConfig, planetData) {
    this.scene  = scene;
    this.data   = bossConfig;
    this.planet = planetData;

    this.maxHp  = bossConfig.hp ?? bossConfig.bossHp ?? 300;
    this.hp     = this.maxHp;
    this.alive  = true;
    this.state  = STATE.INTRO;

    const { width, height } = scene.scale;
    this.x = width + 160;
    this.y = height / 2;
    this._introTargetX = width * 0.72;

    this._animT      = 0;
    this._flashTimer = 0;
    this._atkTimer   = 0;
    this._spcTimer   = 0;
    this._phasesDone = new Set();

    // Attack intervals per phase
    this._atkIntervalP1 = 1600;
    this._atkIntervalP2 = 950;
    this._atkIntervalP3 = 700;
    this._spcIntervalP1 = 7500;
    this._spcIntervalP2 = 4500;

    // Boss size scales with planet index (Neptune smallest, Sun largest)
    this.radius = 44 + (planetData.index ?? 0) * 5;

    this.g = scene.add.graphics().setDepth(9);
  }

  // ── Phase thresholds ─────────────────────────────────────────────────────────

  get _phase2Threshold() { return this.maxHp * (this.data.phase2At ?? 0.5); }
  get _phase3Threshold() { return this.maxHp * (this.data.phase3At ?? 0.33); }
  get _threePhase()      { return !!this.data.threePhase; }

  // ── Update ────────────────────────────────────────────────────────────────────

  /**
   * @returns {{ newProjectiles: object[] }} projectiles to add to the world
   */
  update(delta, shipX, shipY, existingProj) {
    if (!this.alive) return { newProjectiles: [] };
    const dt = delta / 1000;
    this._animT += delta;

    const newProjectiles = [];

    // Slide in during intro
    if (this.state === STATE.INTRO) {
      this.x -= 200 * dt;
      if (this.x <= this._introTargetX) {
        this.x     = this._introTargetX;
        this.state = STATE.PHASE1;
        this.scene.events.emit('bossAlert', this.data.theme);
      }
      this._draw();
      return { newProjectiles };
    }

    // Phase transitions
    this._checkPhaseTransitions();

    // Hover oscillation (faster in later phases)
    const { height } = this.scene.scale;
    const amp = this.state === STATE.PHASE3 ? 85 : this.state === STATE.PHASE2 ? 65 : 42;
    this.y = height / 2 + Math.sin(this._animT * 0.0012) * amp;

    if (this._flashTimer > 0) this._flashTimer -= delta;

    // Attacks
    const atkInterval = this.state === STATE.PHASE3 ? this._atkIntervalP3
      : this.state === STATE.PHASE2 ? this._atkIntervalP2 : this._atkIntervalP1;
    this._atkTimer += delta;
    if (this._atkTimer >= atkInterval) {
      this._atkTimer = 0;
      const shots = this._primaryAttack(shipX, shipY);
      newProjectiles.push(...shots);
    }

    // Special attack
    const spcInterval = this.state === STATE.PHASE2 || this.state === STATE.PHASE3
      ? this._spcIntervalP2 : this._spcIntervalP1;
    this._spcTimer += delta;
    if (this._spcTimer >= spcInterval) {
      this._spcTimer = 0;
      const shots = this._specialAttack(shipX, shipY);
      newProjectiles.push(...shots);
    }

    this._draw();
    return { newProjectiles };
  }

  _checkPhaseTransitions() {
    if (this._threePhase) {
      if (this.state === STATE.PHASE1 && this.hp <= this._phase2Threshold && !this._phasesDone.has(2)) {
        this._phasesDone.add(2);
        this.state = STATE.PHASE2;
        this.scene.events.emit('bossPhase', 2);
      }
      if ((this.state === STATE.PHASE2) && this.hp <= this._phase3Threshold && !this._phasesDone.has(3)) {
        this._phasesDone.add(3);
        this.state = STATE.PHASE3;
        this.scene.events.emit('bossPhase', 3);
      }
    } else {
      if (this.state === STATE.PHASE1 && this.hp <= this._phase2Threshold && !this._phasesDone.has(2)) {
        this._phasesDone.add(2);
        this.state = STATE.PHASE2;
        this.scene.events.emit('bossPhase', 2);
      }
    }
  }

  // ── Attacks ───────────────────────────────────────────────────────────────────

  _primaryAttack(shipX, shipY) {
    // 3-way spread aimed at ship
    const cx = this.x - this.radius;
    const cy = this.y;
    const baseAngle = Math.atan2((shipY || cy) - cy, (shipX || cx) - cx);
    const count = this.state === STATE.PHASE3 ? 5 : this.state === STATE.PHASE2 ? 3 : 1;
    const spread = this.state === STATE.PHASE2 ? 0.28 : 0.18;
    const shots = [];
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spread;
      shots.push(this._makeProjectile(cx, cy, baseAngle + offset, 340));
    }
    return shots;
  }

  _specialAttack(shipX, shipY) {
    // Ring of projectiles outward
    const cx = this.x - this.radius;
    const cy = this.y;
    const count = 8;
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2;
      return this._makeProjectile(cx, cy, a, 220);
    });
  }

  _makeProjectile(x, y, angle, speed) {
    return {
      x, y, angle,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: BALANCE.DAMAGE_BOSS_PROJECTILE,
      active: true,
      radius: 6,
      update(delta) {
        const dt = delta / 1000;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        const { width, height } = { width: 1280, height: 720 };
        if (this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20) {
          this.active = false;
        }
        // Draw
        if (this._g) {
          this._g.clear();
          this._g.fillStyle(C.BLAZE, 0.45);
          this._g.fillCircle(this.x + 4, this.y + 4, this.radius);
          this._g.fillStyle(C.BLAZE, 1);
          this._g.fillCircle(this.x, this.y, this.radius);
        }
      },
      overlapsPoint(px, py) {
        const dx = px - this.x, dy = py - this.y;
        return dx * dx + dy * dy <= (this.radius + 10) ** 2;
      },
      // Graphics set up by GameScene after receiving from update()
      _g: null,
    };
  }

  // ── Draw ─────────────────────────────────────────────────────────────────────

  _draw() {
    this.g.clear();
    if (!this.alive) return;

    const blazeFlash = this._flashTimer > 0 && Math.floor(this._flashTimer / 80) % 2 === 0;

    // Misprint underlay
    this.g.fillStyle(C.BLAZE, 0.45);
    this.g.fillCircle(this.x + 6, this.y + 6, this.radius);

    // Body — bone disc, halftoned
    this.g.fillStyle(blazeFlash ? C.BLAZE : C.BONE, 1);
    this.g.fillCircle(this.x, this.y, this.radius);
    drawHalftoneDisc(this.g, this.x, this.y, this.radius, 0.50);

    // Ink "canopy" cutout
    this.g.fillStyle(C.INK, 1);
    this.g.fillCircle(this.x + 4, this.y - 4, this.radius * 0.35);

    // Blaze accent bars (left-facing weapons)
    this.g.fillStyle(C.BLAZE, 1);
    this.g.fillRect(this.x - this.radius - 18, this.y - 5, 20, 10);

    // Phase 2 / 3: extra blaze rings
    if (this.state === STATE.PHASE2 || this.state === STATE.PHASE3) {
      this.g.lineStyle(3, C.BLAZE, 0.50);
      this.g.strokeCircle(this.x, this.y, this.radius + 10);
    }
    if (this.state === STATE.PHASE3) {
      this.g.lineStyle(2, C.BLAZE, 0.30);
      this.g.strokeCircle(this.x, this.y, this.radius + 22);
    }

    // Bone outline
    this.g.lineStyle(2, C.BONE, 0.50);
    this.g.strokeCircle(this.x, this.y, this.radius);
  }

  // ── Hit / Death ───────────────────────────────────────────────────────────────

  hit(damage) {
    if (!this.alive) return;
    this.hp -= damage;
    this._flashTimer = 160;
    if (this.hp <= 0) {
      this.hp    = 0;
      this.alive = false;
      this.state = STATE.DEAD;
      this.g.clear();
    }
  }

  overlapsPoint(px, py) {
    if (!this.alive) return false;
    const dx = px - this.x, dy = py - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  destroy() {
    this.alive = false;
    try { this.g.destroy(); } catch {}
  }
}
