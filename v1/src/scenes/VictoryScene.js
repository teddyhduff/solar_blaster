// VictoryScene.js — Shown when the boss is defeated.
// Announces the next unlocked planet and returns to Planet Select.

import { getPlanetById } from '../data/planets.js';

export class VictoryScene extends Phaser.Scene {
  constructor() { super({ key: 'VictoryScene' }); }

  init(data) {
    this.planetId     = data.planetId     || 'mercury';
    this.score        = data.score        || 0;
    this.coinsEarned  = data.coinsEarned  || 0;
    this.nextPlanetId = data.nextPlanetId || null;
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;

    // Background.
    this.add.rectangle(0, 0, width, height, 0x050A00).setOrigin(0);

    // Golden starburst vignette.
    const vigG = this.add.graphics().setDepth(0);
    for (let i = 0; i < 6; i++) {
      vigG.lineStyle(20 - i * 3, 0xFFD93D, 0.05 - i * 0.006);
      vigG.strokeRect(0, 0, width, height);
    }

    // Animated star particles.
    this._stars = [];
    this._starG = this.add.graphics().setDepth(1);
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.FloatBetween(30, 180);
      this._stars.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [0xFFD93D, 0x00F5FF, 0xFF2EC4, 0xFFFFFF][i % 4],
        size:  Phaser.Math.FloatBetween(1.5, 4),
        life:  Phaser.Math.FloatBetween(1, 3),
        age:   0,
      });
    }

    // ── Titles ────────────────────────────────────────────────────────────────
    const beaten = getPlanetById(this.planetId);

    this.add.text(cx, cy - 155, 'BOSS DEFEATED!', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '52px', color: '#FFD93D',
      stroke: '#332200', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(3);

    this.add.text(cx, cy - 95, `${beaten ? beaten.name.toUpperCase() : ''} — CLEARED`, {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '26px', color: beaten ? ('#' + beaten.accentColor.toString(16).padStart(6, '0')) : '#FFFFFF',
    }).setOrigin(0.5).setDepth(3);

    // Stats.
    this.add.text(cx, cy - 35, `Score: ${this.score}`, {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '24px', color: '#AABBCC',
    }).setOrigin(0.5).setDepth(3);

    this.add.text(cx, cy + 3, `Coins earned: ${this.coinsEarned}`, {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '20px', color: '#FFD93D',
    }).setOrigin(0.5).setDepth(3);

    // Next planet unlock announcement.
    if (this.nextPlanetId) {
      const next = getPlanetById(this.nextPlanetId);
      const nextCol = next ? ('#' + next.accentColor.toString(16).padStart(6, '0')) : '#00F5FF';
      this.add.text(cx, cy + 50, `${next ? next.name.toUpperCase() : 'NEXT PLANET'} UNLOCKED!`, {
        fontFamily: "'Orbitron', 'Courier New', monospace",
        fontSize: '22px', color: nextCol,
      }).setOrigin(0.5).setDepth(3);
    } else {
      this.add.text(cx, cy + 50, 'ALL PLANETS CLEARED — YOU WIN!', {
        fontFamily: "'Orbitron', 'Courier New', monospace",
        fontSize: '20px', color: '#FFD93D',
      }).setOrigin(0.5).setDepth(3);
    }

    // ── Buttons ──────────────────────────────────────────────────────────────
    if (this.nextPlanetId) {
      this._makeButton(cx, cy + 110, 'PLAY NEXT', 0xFFD93D, () => {
        this.scene.start('GameScene', { planetId: this.nextPlanetId });
      });
      this._makeButton(cx, cy + 172, 'PLANET SELECT', 0x00F5FF, () => {
        this.scene.start('PlanetSelectScene');
      });
    } else {
      this._makeButton(cx, cy + 126, 'PLANET SELECT', 0x00F5FF, () => {
        this.scene.start('PlanetSelectScene');
      });
    }

    // Auto-return after 12 s (skip if already left).
    this.time.delayedCall(12000, () => {
      if (this.scene.isActive('VictoryScene')) {
        this.scene.start('PlanetSelectScene');
      }
    });
  }

  _makeButton(x, y, label, color, cb) {
    const hexStr = '#' + color.toString(16).padStart(6, '0');
    const bg = this.add.graphics().setDepth(3);
    const draw = (h) => {
      bg.clear();
      bg.fillStyle(h ? color : 0x001100, h ? 0.3 : 0.75);
      bg.fillRoundedRect(x - 160, y - 26, 320, 52, 8);
      bg.lineStyle(2, color, 0.9);
      bg.strokeRoundedRect(x - 160, y - 26, 320, 52, 8);
    };
    draw(false);
    const txt = this.add.text(x, y, label, {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '22px', color: hexStr,
    }).setOrigin(0.5).setDepth(4).setInteractive({ useHandCursor: true });
    txt.on('pointerover',  () => draw(true));
    txt.on('pointerout',   () => draw(false));
    txt.on('pointerdown',  () => { if (window.gameAudio) window.gameAudio.playUIClick(); cb(); });
  }

  update(time, delta) {
    const dt = delta / 1000;
    this._starG.clear();
    this._stars.forEach(s => {
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.98;
      s.vy *= 0.98;
      if (s.age < s.life) {
        const t = 1 - s.age / s.life;
        this._starG.fillStyle(s.color, t * 0.9);
        this._starG.fillCircle(s.x, s.y, s.size * t);
      }
    });
  }
}
