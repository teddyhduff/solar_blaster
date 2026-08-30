// Boss.js — End-of-level boss. Silhouette and attack patterns come from the planet.
// Stencil Riso: bone hull, blaze weapons/damage, ink canopy.
// Visual is baked to a texture so live Graphics don't tank FPS.

import { BALANCE } from '../data/balance.js';
import { C, drawHalftoneDisc } from '../systems/StencilArt.js';

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
    this.id     = planetData.id;

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
    this._atkIntervalP2 = 980;
    this._atkIntervalP3 = 720;
    this._spcIntervalP1 = 7200;
    this._spcIntervalP2 = 4200;

    this.radius = 44 + (planetData.index ?? 0) * 4;
    this._texKey = `boss_${this.id}`;

    this.img = null;
    this._drawKey = null;
    this._redraw(false);
    if (this.img) this.img.setPosition(this.x, this.y);
  }

  get _phase2Threshold() { return this.maxHp * (this.data.phase2At ?? 0.5); }
  get _phase3Threshold() { return this.maxHp * (this.data.phase3At ?? 0.33); }
  get _threePhase()      { return !!this.data.threePhase; }

  update(delta, shipX, shipY) {
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
    const amp = this._motionAmp();
    this.y = height / 2 + Math.sin(this._animT * this._motionFreq()) * amp;
    if (this.id === 'saturn') {
      this.x = this._introTargetX + Math.sin(this._animT * 0.0007) * 36;
    }

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

  _motionAmp() {
    if (this.id === 'earth') return 18;
    if (this.id === 'sun') return this.state === STATE.PHASE3 ? 96 : 70;
    return this.state === STATE.PHASE3 ? 85 : this.state === STATE.PHASE2 ? 65 : 42;
  }

  _motionFreq() {
    if (this.id === 'uranus') return 0.0022;
    if (this.id === 'mars') return 0.0008;
    return 0.0012;
  }

  _checkPhaseTransitions() {
    if (this._threePhase) {
      if (this.state === STATE.PHASE1 && this.hp <= this._phase2Threshold && !this._phasesDone.has(2)) {
        this._phasesDone.add(2);
        this.state = STATE.PHASE2;
        this.scene.events.emit('bossPhase', 2);
      }
      if (this.state === STATE.PHASE2 && this.hp <= this._phase3Threshold && !this._phasesDone.has(3)) {
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

  // ── Attacks (named patterns from planets.js) ────────────────────────────────

  _primaryAttack(shipX, shipY) {
    switch (this.id) {
      case 'neptune':  return this._atkGustSweep(shipX, shipY);
      case 'uranus':   return this._atkIceShard(shipX, shipY);
      case 'saturn':   return this._atkRingShrapnel(shipX, shipY);
      case 'jupiter':  return this._atkGravitySlam(shipX, shipY);
      case 'mars':     return this._atkBoulderThrow(shipX, shipY);
      case 'earth':    return this._atkLaserGrid(shipX, shipY);
      case 'venus':    return this._atkAcidSpray(shipX, shipY);
      case 'mercury':  return this._atkHeatBeam(shipX, shipY);
      case 'sun':      return this.state === STATE.PHASE1
        ? this._atkGustSweep(shipX, shipY)
        : this._atkHeatBeam(shipX, shipY);
      default:         return this._atkAimed(shipX, shipY, 1);
    }
  }

  _specialAttack(shipX, shipY) {
    switch (this.id) {
      case 'neptune':  return this._atkRing(8, 220);
      case 'uranus':   return this._atkCrystalWall();
      case 'saturn':   return this._atkAimed(shipX, shipY, 3, 0.22, 520);
      case 'jupiter':  return this._atkRing(10, 200);
      case 'mars':     return this._atkSpread(shipX, shipY, 5, 0.32, 280);
      case 'earth':    return this._atkSatelliteSwarm(shipX, shipY);
      case 'venus':    return this._atkSpread(shipX, shipY, 6, 0.4, 260);
      case 'mercury':  return this._atkFlareBarrage();
      case 'sun':      return this.state === STATE.PHASE3
        ? [...this._atkRing(10, 240), ...this._atkAimed(shipX, shipY, 3, 0.2, 380)]
        : this._atkRing(8, 230);
      default:         return this._atkRing(8, 220);
    }
  }

  _muzzle() {
    return { x: this.x - this.radius, y: this.y };
  }

  _aim(shipX, shipY) {
    const { x, y } = this._muzzle();
    return Math.atan2((shipY || y) - y, (shipX || x) - x);
  }

  _atkAimed(shipX, shipY, count = 1, spread = 0.18, speed = 340) {
    const { x, y } = this._muzzle();
    const base = this._aim(shipX, shipY);
    const shots = [];
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spread;
      shots.push(this._makeProjectile(x, y, base + offset, speed));
    }
    return shots;
  }

  _atkGustSweep(shipX, shipY) {
    const { height } = this.scene.scale;
    const n = this.state === STATE.PHASE1 ? 4 : 6;
    const targetY = shipY || height / 2;
    const shots = [];
    for (let i = 0; i < n; i++) {
      const y = Phaser.Math.Clamp(targetY + (i - (n - 1) / 2) * 28, 40, height - 40);
      shots.push(this._makeProjectile(this.x - this.radius, y, Math.PI, 300, { kind: 'shard' }));
    }
    return shots;
  }

  _atkIceShard(shipX, shipY) {
    return this._atkAimed(shipX, shipY, this.state === STATE.PHASE1 ? 3 : 5, 0.26, 360)
      .map(s => ({ ...s, kind: 'shard', radius: 5 }));
  }

  _atkCrystalWall() {
    const { height } = this.scene.scale;
    const n = 6;
    const shots = [];
    for (let i = 0; i < n; i++) {
      const y = 60 + (i / (n - 1)) * (height - 120);
      shots.push(this._makeProjectile(this.x - this.radius, y, Math.PI, 240, { kind: 'shard' }));
    }
    return shots;
  }

  _atkRingShrapnel(shipX, shipY) {
    const base = this._aim(shipX, shipY);
    const { x, y } = this._muzzle();
    const n = this.state === STATE.PHASE1 ? 5 : 7;
    const shots = [];
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.22;
      shots.push(this._makeProjectile(x, y, a, 310));
    }
    return shots;
  }

  _atkGravitySlam(shipX, shipY) {
    const { x, y } = this._muzzle();
    const a = this._aim(shipX, shipY);
    return [
      this._makeProjectile(x, y, a, 220, { radius: 11, kind: 'boulder' }),
      this._makeProjectile(x, y, a - 0.35, 300),
      this._makeProjectile(x, y, a + 0.35, 300),
    ];
  }

  _atkBoulderThrow(shipX, shipY) {
    const { x, y } = this._muzzle();
    const a = this._aim(shipX, shipY);
    const n = this.state === STATE.PHASE1 ? 2 : 3;
    const shots = [];
    for (let i = 0; i < n; i++) {
      shots.push(this._makeProjectile(x, y + (i - 1) * 18, a, 200, { radius: 10, kind: 'boulder' }));
    }
    return shots;
  }

  _atkLaserGrid() {
    const { height } = this.scene.scale;
    const lanes = this.state === STATE.PHASE1 ? [0.3, 0.5, 0.7] : [0.22, 0.4, 0.58, 0.76];
    return lanes.map(f => this._makeProjectile(
      this.x - this.radius, height * f, Math.PI, 480, { kind: 'beam', radius: 4 }
    ));
  }

  _atkSatelliteSwarm(shipX, shipY) {
    const { x, y } = this._muzzle();
    const a = this._aim(shipX, shipY);
    return [-50, -18, 18, 50].map(off =>
      this._makeProjectile(x, y + off, a, 330, { kind: 'beam', radius: 4 })
    );
  }

  _atkAcidSpray(shipX, shipY) {
    return this._atkSpread(shipX, shipY, this.state === STATE.PHASE1 ? 5 : 7, 0.28, 270);
  }

  _atkHeatBeam(shipX, shipY) {
    const { x, y } = this._muzzle();
    return [this._makeProjectile(x, y, this._aim(shipX, shipY), 520, { kind: 'beam', radius: 5 })];
  }

  _atkFlareBarrage() {
    const { x, y } = this._muzzle();
    const n = 6;
    const shots = [];
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 0.65 + Math.random() * Math.PI * 0.7;
      shots.push(this._makeProjectile(x, y, a, 280 + Math.random() * 80));
    }
    return shots;
  }

  _atkSpread(shipX, shipY, count, spread, speed) {
    return this._atkAimed(shipX, shipY, count, spread, speed);
  }

  _atkRing(count, speed) {
    const { x, y } = this._muzzle();
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2;
      return this._makeProjectile(x, y, a, speed);
    });
  }

  _makeProjectile(x, y, angle, speed, opts = {}) {
    return {
      x, y, angle,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: BALANCE.DAMAGE_BOSS_PROJECTILE,
      active: true,
      radius: opts.radius ?? 6,
      kind: opts.kind ?? 'bolt',
      update(delta) {
        const dt = delta / 1000;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.x < -20 || this.x > 1300 || this.y < -20 || this.y > 740) {
          this.active = false;
        }
        if (this._g) this._g.setPosition(this.x, this.y);
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

    const pad = 40;
    const extent = this.radius + 28;
    const size = Math.ceil(extent * 2 + pad * 2);
    const ox = size / 2;
    const oy = size / 2;

    const g = this.scene.make.graphics({ add: false });
    const hull = blazeFlash ? C.BLAZE : C.BONE;
    g.fillStyle(C.BLAZE, 0.45);
    this._drawSilhouette(g, ox + 6, oy + 6, C.BLAZE, false);
    g.fillStyle(hull, 1);
    this._drawSilhouette(g, ox, oy, hull, true);

    if (this.scene.textures.exists(this._texKey)) this.scene.textures.remove(this._texKey);
    g.generateTexture(this._texKey, size, size);
    g.destroy();

    if (!this.img) {
      this.img = this.scene.add.image(this.x, this.y, this._texKey).setDepth(9);
    } else {
      this.img.setTexture(this._texKey);
    }
  }

  _drawSilhouette(g, ox, oy, color, detail) {
    const r = this.radius;
    const id = this.id;

    if (id === 'neptune') {
      g.fillEllipse(ox, oy, r * 2.2, r * 1.35);
      if (detail) {
        drawHalftoneDisc(g, ox, oy, r, 0.4);
        g.fillStyle(C.INK, 1);
        g.fillEllipse(ox + 8, oy - 6, r * 0.7, r * 0.4);
        g.fillStyle(C.BLAZE, 1);
        g.fillTriangle(ox - r - 18, oy, ox - r + 4, oy - 10, ox - r + 4, oy + 10);
        g.lineStyle(2, C.BONE, 0.45);
        g.strokeEllipse(ox, oy, r * 2.2, r * 1.35);
      }
      return;
    }

    if (id === 'uranus') {
      const pts = [
        { x: ox, y: oy - r }, { x: ox + r * 0.7, y: oy - r * 0.2 },
        { x: ox + r * 0.5, y: oy + r * 0.85 }, { x: ox - r * 0.5, y: oy + r * 0.85 },
        { x: ox - r * 0.7, y: oy - r * 0.2 },
      ];
      g.fillPoints(pts, true);
      if (detail) {
        g.fillStyle(C.INK, 1);
        g.fillTriangle(ox, oy - 8, ox + 14, oy + 12, ox - 14, oy + 12);
        g.lineStyle(2, C.BONE, 0.5);
        g.strokePoints(pts, true);
      }
      return;
    }

    if (id === 'saturn') {
      g.fillCircle(ox, oy, r * 0.55);
      g.fillCircle(ox + r * 0.7, oy + 6, r * 0.38);
      g.fillCircle(ox - r * 0.7, oy - 4, r * 0.38);
      if (detail) {
        g.lineStyle(3, C.BONE, 0.55);
        g.strokeEllipse(ox, oy, r * 2.4, r * 0.7);
        g.fillStyle(C.BLAZE, 1);
        g.fillRect(ox - r - 16, oy - 4, 16, 8);
      }
      return;
    }

    if (id === 'jupiter') {
      g.fillRect(ox - r, oy - r * 0.75, r * 2, r * 1.5);
      if (detail) {
        drawHalftoneDisc(g, ox, oy, r * 0.7, 0.45);
        g.fillStyle(C.INK, 1);
        g.fillRect(ox - 16, oy - 14, 32, 18);
        g.fillStyle(C.BLAZE, 1);
        g.fillRect(ox - r - 20, oy - 18, 22, 8);
        g.fillRect(ox - r - 20, oy + 10, 22, 8);
        g.lineStyle(2, C.BONE, 0.5);
        g.strokeRect(ox - r, oy - r * 0.75, r * 2, r * 1.5);
      }
      return;
    }

    if (id === 'mars') {
      const rock = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rr = r * (0.75 + ((i % 3) * 0.12));
        rock.push({ x: ox + Math.cos(a) * rr, y: oy + Math.sin(a) * rr });
      }
      g.fillPoints(rock, true);
      if (detail) {
        drawHalftoneDisc(g, ox, oy, r * 0.7, 0.5);
        g.fillStyle(C.BLAZE, 1);
        g.fillTriangle(ox - r, oy - 20, ox - r - 16, oy, ox - r, oy + 20);
        g.lineStyle(2, C.BONE, 0.45);
        g.strokePoints(rock, true);
      }
      return;
    }

    if (id === 'earth') {
      g.fillRect(ox - r * 0.9, oy - r * 0.45, r * 1.8, r * 0.9);
      g.fillRect(ox - r * 0.2, oy - r * 1.05, r * 0.4, r * 0.6);
      if (detail) {
        g.fillStyle(C.INK, 1);
        g.fillRect(ox - 20, oy - 10, 40, 20);
        g.fillStyle(C.BLAZE, 1);
        g.fillRect(ox - r * 0.9 - 14, oy - 6, 14, 12);
        g.lineStyle(2, C.BONE, 0.55);
        g.strokeRect(ox - r * 0.9, oy - r * 0.45, r * 1.8, r * 0.9);
      }
      return;
    }

    if (id === 'venus') {
      g.fillCircle(ox, oy, r);
      g.fillCircle(ox - r * 0.45, oy + r * 0.2, r * 0.55);
      g.fillCircle(ox + r * 0.35, oy - r * 0.25, r * 0.4);
      if (detail) {
        g.fillStyle(C.INK, 1);
        g.fillCircle(ox + 6, oy - 8, r * 0.28);
        g.fillStyle(C.BLAZE, 1);
        g.fillCircle(ox - r - 6, oy, 8);
        g.lineStyle(2, C.BONE, 0.4);
        g.strokeCircle(ox, oy, r);
      }
      return;
    }

    if (id === 'mercury') {
      g.fillRect(ox - r * 0.7, oy - r * 0.85, r * 1.4, r * 1.7);
      g.fillCircle(ox, oy - r * 0.7, r * 0.45);
      if (detail) {
        g.fillStyle(C.INK, 1);
        g.fillRect(ox - 10, oy - r * 0.85, 20, 12);
        g.fillStyle(C.BLAZE, 1);
        g.fillRect(ox - r * 0.7 - 16, oy - 8, 16, 6);
        g.fillRect(ox - r * 0.7 - 16, oy + 8, 16, 6);
        g.lineStyle(2, C.BONE, 0.5);
        g.strokeRect(ox - r * 0.7, oy - r * 0.85, r * 1.4, r * 1.7);
      }
      return;
    }

    // Sun / fallback — corona disc with spikes
    g.fillCircle(ox, oy, r);
    if (detail) {
      drawHalftoneDisc(g, ox, oy, r, 0.62);
      g.fillStyle(C.INK, 0.85);
      g.fillCircle(ox + 6, oy - 6, r * 0.32);
      g.lineStyle(2, C.BLAZE, 0.7);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + this._animT * 0.0004;
        g.lineBetween(
          ox + Math.cos(a) * r,
          oy + Math.sin(a) * r,
          ox + Math.cos(a) * (r + 18),
          oy + Math.sin(a) * (r + 18)
        );
      }
      g.lineStyle(2, C.BONE, 0.5);
      g.strokeCircle(ox, oy, r);
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
    if (this._texKey && this.scene?.textures?.exists(this._texKey)) {
      this.scene.textures.remove(this._texKey);
    }
  }
}
