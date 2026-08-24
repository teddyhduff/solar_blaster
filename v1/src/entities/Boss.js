// Boss.js — End-of-level boss. One per planet; each has a distinct look and 2-phase attack pattern.
// Phase 1 = full health. Phase 2 = below 50% HP (faster and more aggressive attacks).

import { BALANCE } from '../data/balance.js';

const STATE = { INTRO: 'intro', PHASE1: 'phase1', PHASE2: 'phase2', DEAD: 'dead' };

export class Boss {
  /**
   * @param {Phaser.Scene} scene
   * @param {object}       planetData  entry from data/planets.js
   */
  constructor(scene, planetData) {
    this.scene      = scene;
    this.planet     = planetData;
    this.maxHp      = planetData.bossHp;
    this.hp         = this.maxHp;
    this.alive      = true;
    this.state      = STATE.INTRO;

    const { width, height } = scene.scale;
    this.x = width + 140;
    this.y = height / 2;
    this._introTargetX = width * 0.73;

    this._phase2Done   = false;
    this._animT        = 0;
    this._flashTimer   = 0;

    // Attack timers — reset per phase.
    this._atkTimer     = 0;
    this._atkInterval  = 1600;
    this._spcTimer     = 0;
    this._spcInterval  = 7500;

    this.g = scene.add.graphics().setDepth(9);
  }

  // ── Radius / Size ─────────────────────────────────────────────────────────

  get radius() {
    // Bosses grow slightly with planet index.
    return 42 + this.planet.index * 4;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  /**
   * @param {number}   delta            ms
   * @param {Function} spawnProjectile  callback(projData) to send a projectile into the world
   * @param {object}   audio
   * @param {object}   shipRef          live ship reference for targeted attacks
   */
  update(delta, spawnProjectile, audio, shipRef) {
    if (!this.alive) return;
    const dt = delta / 1000;
    this._animT += delta;

    // Slide in from the right.
    if (this.state === STATE.INTRO) {
      this.x -= 200 * dt;
      if (this.x <= this._introTargetX) {
        this.x     = this._introTargetX;
        this.state = STATE.PHASE1;
        if (audio) audio.playBossAlert();
      }
    }

    // Phase 2 trigger.
    if (!this._phase2Done && this.hp < this.maxHp * 0.5) {
      this._phase2Done  = true;
      this.state        = STATE.PHASE2;
      this._atkInterval = 900;
      this._spcInterval = 4500;
    }

    // Gentle hover oscillation.
    const { height } = this.scene.scale;
    const amp = this.state === STATE.PHASE2 ? 70 : 42;
    this.y = height / 2 + Math.sin(this._animT * 0.0013) * amp;

    // Fire attacks.
    if (this.state !== STATE.INTRO) {
      this._atkTimer += delta;
      if (this._atkTimer >= this._atkInterval) {
        this._atkTimer = 0;
        this._doSpread(spawnProjectile, shipRef);
      }
      this._spcTimer += delta;
      if (this._spcTimer >= this._spcInterval) {
        this._spcTimer = 0;
        this._doSpecial(spawnProjectile, shipRef);
      }
    }

    if (this._flashTimer > 0) this._flashTimer -= delta;

    this.g.x = this.x;
    this.g.y = this.y;
    this._draw();
  }

  // ── Attack patterns ───────────────────────────────────────────────────────

  /** Standard spread volley fired leftward. Phase 2 adds two extra shots. */
  _doSpread(spawn, ship) {
    const angles = this.state === STATE.PHASE2
      ? [-30, -15, 0, 15, 30]
      : [-20,   0, 20];
    angles.forEach(deg => {
      const rad = Phaser.Math.DegToRad(180 + deg);
      spawn({ x: this.x - 35, y: this.y, vx: Math.cos(rad) * 300, vy: Math.sin(rad) * 300,
              damage: BALANCE.DAMAGE_BOSS_PROJECTILE, color: this.planet.accentColor, r: 7 });
    });
  }

  /** Special attack: 8-way burst + a homing shot in Phase 2. */
  _doSpecial(spawn, ship) {
    // 8-direction burst.
    for (let i = 0; i < 8; i++) {
      const rad = (i / 8) * Math.PI * 2;
      spawn({ x: this.x, y: this.y, vx: Math.cos(rad) * 230, vy: Math.sin(rad) * 230,
              damage: BALANCE.DAMAGE_BOSS_PROJECTILE, color: this.planet.accentColor, r: 6 });
    }
    // Phase 2 also fires a targeted high-speed shot at the player.
    if (this.state === STATE.PHASE2 && ship) {
      const dx   = ship.x - this.x;
      const dy   = ship.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const spd  = 420;
      spawn({ x: this.x - 20, y: this.y, vx: (dx / dist) * spd, vy: (dy / dist) * spd,
              damage: Math.round(BALANCE.DAMAGE_BOSS_PROJECTILE * 1.6), color: 0xFFFFFF, r: 9 });
    }
  }

  // ── Damage ────────────────────────────────────────────────────────────────

  takeDamage(amount) {
    if (!this.alive || this.state === STATE.INTRO) return false;
    this.hp          -= amount;
    this._flashTimer  = 160;
    if (this.hp <= 0) {
      this.hp    = 0;
      this.alive = false;
      this.state = STATE.DEAD;
      this.g.destroy();
      return true;  // boss is dead
    }
    return false;
  }

  getBounds() { return { x: this.x, y: this.y, r: this.radius }; }

  // ── Drawing — each boss has a unique silhouette ───────────────────────────

  _draw() {
    this.g.clear();
    const flash = this._flashTimer > 0;
    const col   = flash ? 0xFFFFFF : this.planet.accentColor;
    const p2    = this.state === STATE.PHASE2;
    const r     = this.radius;
    const t     = this._animT * 0.001;

    switch (this.planet.index) {
      case 0: this._drawMiningRobot(r, col, p2, t); break;
      case 1: this._drawBioCreature(r, col, p2, t); break;
      case 2: this._drawMothership( r, col, p2, t); break;
      case 3: this._drawRockGuardian(r,col, p2, t); break;
      case 4: this._drawWarMachine( r, col, p2, t); break;
      case 5: this._drawRingSerpent(r, col, p2, t); break;
      case 6: this._drawCrystalBot( r, col, p2, t); break;
      case 7: this._drawFinalBoss(  r, col, p2, t); break;
      default: this._drawGeneric(   r, col, p2, t);
    }
  }

  _drawGeneric(r, c, p2, t) {
    this.g.fillStyle(c, 0.7);
    this.g.fillCircle(0, 0, r);
    this.g.lineStyle(3, c, 1);
    this.g.strokeCircle(0, 0, r);
  }

  // Mercury — boxy mining robot with a drill.
  _drawMiningRobot(r, c, p2, t) {
    const g = this.g;
    g.fillStyle(c, 0.80);
    g.fillRect(-r * 0.65, -r * 0.9, r * 1.3, r * 1.8);
    g.fillStyle(c, 0.60);
    g.fillRect(-r * 0.95, -r * 0.28, r * 1.9, r * 0.56);
    g.fillStyle(0xFFFFFF, 0.9);
    g.fillCircle(-r * 0.22, -r * 0.35, r * 0.17);
    g.fillCircle( r * 0.22, -r * 0.35, r * 0.17);
    if (p2) { g.lineStyle(2, 0xFF2222, 1); g.strokeCircle(-r * 0.22, -r * 0.35, r * 0.22); g.strokeCircle(r * 0.22, -r * 0.35, r * 0.22); }
    g.fillStyle(c, 1);
    g.fillTriangle(-r * 0.95, -9, -r * 1.45, 0, -r * 0.95, 9);
  }

  // Venus — pulsing organic blob with tentacles.
  _drawBioCreature(r, c, p2, t) {
    const g = this.g;
    const pulse = 1 + Math.sin(t * 3.2) * 0.09;
    g.fillStyle(c, 0.72);
    g.fillEllipse(0, 0, r * 2.3 * pulse, r * 2.0 * pulse);
    for (let i = 0; i < 6; i++) {
      const a   = (i / 6) * Math.PI * 2 + t * 1.2;
      const len = r * (0.7 + Math.sin(t * 2 + i) * 0.2);
      g.lineStyle(5, c, 0.65);
      g.lineBetween(0, 0, Math.cos(a) * len, Math.sin(a) * len);
    }
    g.fillStyle(0x000020, 0.85);
    g.fillEllipse(0, -r * 0.28, r * 0.55, r * 0.38);
    if (p2) { g.fillStyle(0xFF0000, 0.9); g.fillCircle(0, -r * 0.28, r * 0.15); }
  }

  // Earth — flying saucer.
  _drawMothership(r, c, p2, t) {
    const g = this.g;
    g.fillStyle(c, 0.68);
    g.fillEllipse(0, 0, r * 2.9, r * 0.9);
    g.fillStyle(c, 0.92);
    g.fillEllipse(0, -r * 0.38, r * 1.35, r * 0.88);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 2.2;
      g.fillStyle(i % 2 === 0 ? 0xFFFFFF : c, 0.9);
      g.fillCircle(Math.cos(a) * r * 1.05, Math.sin(a) * r * 0.22, 3.5);
    }
    if (p2) { g.lineStyle(3, 0xFF2EC4, 0.8); g.strokeEllipse(0, 0, r * 3.4, r * 1.2); }
  }

  // Mars — craggy rock guardian.
  _drawRockGuardian(r, c, p2, t) {
    const g = this.g;
    const pts = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const d = r * (0.82 + Math.sin(i * 2.1) * 0.22);
      pts.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
    }
    g.fillStyle(c, 0.86);
    g.fillPoints(pts, true);
    g.lineStyle(2.5, 0xFF4500, 0.9);
    g.strokePoints(pts, true);
    if (p2) { g.fillStyle(0xFF4500, 0.55); g.fillCircle(0, 0, r * 0.42); }
    g.fillStyle(0x000000, 0.5);
    for (let i = 0; i < 3; i++) g.fillCircle(-r * 0.3 + i * r * 0.3, 0, r * 0.09);
  }

  // Jupiter — giant mech war machine.
  _drawWarMachine(r, c, p2, t) {
    const g = this.g;
    g.fillStyle(c, 0.82);
    g.fillRect(-r * 0.52, -r * 0.75, r * 1.04, r * 1.5);
    g.fillStyle(c, 0.65);
    g.fillRect(-r, -r * 0.22, r * 0.52, r * 0.22);
    g.fillRect(-r,  r * 0.08, r * 0.52, r * 0.22);
    g.fillStyle(p2 ? 0xFF2222 : 0xFFFF22, 0.95);
    g.fillRect(-r * 0.38, -r * 0.38, r * 0.76, r * 0.20);
    if (p2) {
      g.lineStyle(2, 0xFF0000, 0.8);
      g.strokeRect(-r * 0.52, -r * 0.75, r * 1.04, r * 1.5);
    }
    // Shoulder cannons.
    g.fillStyle(c, 0.7);
    g.fillCircle(-r * 0.55, -r * 0.6, r * 0.18);
    g.fillCircle(-r * 0.55,  r * 0.6, r * 0.18);
  }

  // Saturn — ring serpent.
  _drawRingSerpent(r, c, p2, t) {
    const g = this.g;
    const segs = 8;
    for (let i = segs - 1; i >= 0; i--) {
      const ox  = -i * r * 0.36;
      const oy  = Math.sin(t * 2.2 + i * 0.9) * r * 0.38;
      const sr  = r * (1 - i * 0.07) * 0.46;
      g.fillStyle(c, 0.82 - i * 0.06);
      g.fillCircle(ox, oy, sr);
    }
    g.fillStyle(c, 0.98);
    g.fillCircle(0, Math.sin(t * 2.2) * r * 0.38, r * 0.46);
    g.fillStyle(0xFFFFFF, 0.9);
    g.fillCircle(-9,  Math.sin(t * 2.2) * r * 0.38 - 9, 6);
    g.fillCircle( 9,  Math.sin(t * 2.2) * r * 0.38 - 9, 6);
    if (p2) { g.lineStyle(2, 0xFF2EC4, 0.7); g.strokeCircle(0, Math.sin(t * 2.2) * r * 0.38, r * 0.52); }
  }

  // Uranus — crystalline robot.
  _drawCrystalBot(r, c, p2, t) {
    const g = this.g;
    for (let i = 5; i >= 0; i--) {
      const a  = (i / 5) * Math.PI * 2 + t * 0.6;
      const cr = r * (0.45 + i * 0.12);
      g.fillStyle(c, 0.22 + i * 0.08);
      g.fillTriangle(
        Math.cos(a) * cr,          Math.sin(a) * cr,
        Math.cos(a + 0.62) * cr * 0.65, Math.sin(a + 0.62) * cr * 0.65,
        Math.cos(a - 0.62) * cr * 0.65, Math.sin(a - 0.62) * cr * 0.65,
      );
    }
    g.fillStyle(p2 ? 0xFFFFFF : c, 0.78);
    g.fillCircle(0, 0, r * 0.38);
    if (p2) { g.lineStyle(3, 0xFFFFFF, 0.6); g.strokeCircle(0, 0, r * 0.5); }
  }

  // Neptune — final dreadnought combining multiple themes.
  _drawFinalBoss(r, c, p2, t) {
    const g = this.g;
    // Pulsing outer rings.
    [r * 1.5, r * 1.2, r].forEach((rad, i) => {
      g.lineStyle(2.5 - i * 0.5, c, 0.45 + Math.sin(t * 2 + i) * 0.2);
      g.strokeCircle(0, 0, rad);
    });
    // Saucer body.
    g.fillStyle(c, 0.80);
    g.fillEllipse(0, 0, r * 2.0, r * 1.5);
    // Dome.
    g.fillStyle(0xFF2EC4, 0.55);
    g.fillEllipse(0, -r * 0.35, r * 1.1, r * 0.65);
    // Eyes.
    g.fillStyle(p2 ? 0xFF0000 : 0xFFFF00, 1);
    g.fillCircle(-r * 0.28, -r * 0.28, r * 0.15);
    g.fillCircle( r * 0.28, -r * 0.28, r * 0.15);
    // Tentacle arms.
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI * 0.4 + (i / 3) * Math.PI * 0.8 + Math.sin(t * 1.5) * 0.2;
      g.lineStyle(6, c, 0.7);
      g.lineBetween(0, 0, Math.cos(a + Math.PI) * r * 1.5, Math.sin(a + Math.PI) * r * 1.5);
    }
    if (p2) {
      // Extra energy ring in phase 2.
      g.lineStyle(4, 0xFF2EC4, 0.7 + Math.sin(t * 4) * 0.3);
      g.strokeCircle(0, 0, r * 0.75);
    }
  }

  destroy() {
    this.alive = false;
    try { this.g.destroy(); } catch (e) {}
  }
}
