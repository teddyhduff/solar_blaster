// Boss.js — End-of-level boss for Solar Blaster V2.
// Config comes from planet data: boss.hp, boss.phase2At, boss.threePhase, boss.attackPatterns.
// Stencil Riso: bone hull, blaze weapons/damage, ink canopy — same rules as enemies.
// The Sun boss has 3 phases instead of 2.
// Visual is baked to a texture so live halftone Graphics don't tank FPS.

import { BALANCE } from '../data/balance.js';
import { C, drawHalftoneDisc } from '../systems/StencilArt.js';

const STATE = { INTRO: 'intro', PHASE1: 'phase1', PHASE2: 'phase2', PHASE3: 'phase3', DEAD: 'dead' };
const BOSS_TEX = 'bossBody';

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

    this._atkIntervalP1 = 1600;
    this._atkIntervalP2 = 950;
    this._atkIntervalP3 = 700;
    this._spcIntervalP1 = 7500;
    this._spcIntervalP2 = 4500;

    this.radius = 44 + (planetData.index ?? 0) * 5;

    this.img = null;
    this._drawKey = null;
    this._redraw(false);
    if (this.img) this.img.setPosition(this.x, this.y);
  }

  get _phase2Threshold() { return this.maxHp * (this.data.phase2At ?? 0.5); }
  get _phase3Threshold() { return this.maxHp * (this.data.phase3At ?? 0.33); }
  get _threePhase()      { return !!this.data.threePhase; }

  update(delta, shipX, shipY, existingProj) {
    if (!this.alive) return { newProjectiles: [] };
    const dt = delta / 1000;
    this._animT += delta;

    const newProjectiles = [];

    if (this.state === STATE.INTRO) {
      this.x -= 200 * dt;
      if (this.x <= this._introTargetX) {
        this.x     = this._introTargetX;
        this.state = STATE.PHASE1;
        this.scene.events.emit('bossAlert', this.data.theme);
      }
      this._syncVisual();
      return { newProjectiles };
    }

    this._checkPhaseTransitions();

    const { height } = this.scene.scale;
    const amp = this.state === STATE.PHASE3 ? 85 : this.state === STATE.PHASE2 ? 65 : 42;
    this.y = height / 2 + Math.sin(this._animT * 0.0012) * amp;

    if (this._flashTimer > 0) this._flashTimer -= delta;

    const atkInterval = this.state === STATE.PHASE3 ? this._atkIntervalP3
      : this.state === STATE.PHASE2 ? this._atkIntervalP2 : this._atkIntervalP1;
    this._atkTimer += delta;
    if (this._atkTimer >= atkInterval) {
      this._atkTimer = 0;
      newProjectiles.push(...this._primaryAttack(shipX, shipY));
    }

    const spcInterval = this.state === STATE.PHASE2 || this.state === STATE.PHASE3
      ? this._spcIntervalP2 : this._spcIntervalP1;
    this._spcTimer += delta;
    if (this._spcTimer >= spcInterval) {
      this._spcTimer = 0;
      newProjectiles.push(...this._specialAttack(shipX, shipY));
    }

    this._syncVisual();
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
    } else if (this.state === STATE.PHASE1 && this.hp <= this._phase2Threshold && !this._phasesDone.has(2)) {
      this._phasesDone.add(2);
      this.state = STATE.PHASE2;
      this.scene.events.emit('bossPhase', 2);
    }
  }

  _primaryAttack(shipX, shipY) {
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
        if (this.x < -20 || this.x > 1300 || this.y < -20 || this.y > 740) {
          this.active = false;
        }
        if (this._g) this._g.setPosition(this.x, this.y);
      },
      overlapsPoint(px, py) {
        const dx = px - this.x, dy = py - this.y;
        return dx * dx + dy * dy <= (this.radius + 10) ** 2;
      },
      _g: null,
    };
  }

  _syncVisual() {
    if (!this.alive) return;
    const blazeFlash = this._flashTimer > 0 && Math.floor(this._flashTimer / 80) % 2 === 0;
    const key = `${this.state}|${blazeFlash ? 1 : 0}`;
    if (key !== this._drawKey) {
      this._drawKey = key;
      this._redraw(blazeFlash);
    }
    if (this.img) this.img.setPosition(this.x, this.y);
  }

  _redraw(blazeFlash) {
    if (!this.alive) return;

    const pad = 36;
    const extent = this.radius + 22;
    const size = Math.ceil(extent * 2 + pad * 2);
    const ox = size / 2;
    const oy = size / 2;

    const g = this.scene.make.graphics({ add: false });
    g.fillStyle(C.BLAZE, 0.45);
    g.fillCircle(ox + 6, oy + 6, this.radius);

    g.fillStyle(blazeFlash ? C.BLAZE : C.BONE, 1);
    g.fillCircle(ox, oy, this.radius);
    drawHalftoneDisc(g, ox, oy, this.radius, 0.50);

    g.fillStyle(C.INK, 1);
    g.fillCircle(ox + 4, oy - 4, this.radius * 0.35);

    g.fillStyle(C.BLAZE, 1);
    g.fillRect(ox - this.radius - 18, oy - 5, 20, 10);

    if (this.state === STATE.PHASE2 || this.state === STATE.PHASE3) {
      g.lineStyle(3, C.BLAZE, 0.50);
      g.strokeCircle(ox, oy, this.radius + 10);
    }
    if (this.state === STATE.PHASE3) {
      g.lineStyle(2, C.BLAZE, 0.30);
      g.strokeCircle(ox, oy, this.radius + 22);
    }

    g.lineStyle(2, C.BONE, 0.50);
    g.strokeCircle(ox, oy, this.radius);

    if (this.scene.textures.exists(BOSS_TEX)) this.scene.textures.remove(BOSS_TEX);
    g.generateTexture(BOSS_TEX, size, size);
    g.destroy();

    if (!this.img) {
      this.img = this.scene.add.image(this.x, this.y, BOSS_TEX).setDepth(9);
    } else {
      this.img.setTexture(BOSS_TEX);
    }
  }

  hit(damage) {
    if (!this.alive) return;
    this.hp -= damage;
    this._flashTimer = 160;
    if (this.hp <= 0) {
      this.hp    = 0;
      this.alive = false;
      this.state = STATE.DEAD;
      if (this.img) this.img.setVisible(false);
    }
  }

  overlapsPoint(px, py) {
    if (!this.alive) return false;
    const dx = px - this.x, dy = py - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  destroy() {
    this.alive = false;
    try { this.img?.destroy(); } catch {}
    if (this.scene?.textures?.exists(BOSS_TEX)) this.scene.textures.remove(BOSS_TEX);
  }
}
