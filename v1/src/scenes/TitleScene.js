// TitleScene.js — The game's title screen.
// Shows the brand, a PLAY button, and a mute toggle.

import { AudioSystem } from '../systems/AudioSystem.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // ── Background: deep space with animated stars ──────────────────────────
    this._bg = this.add.graphics();
    this._bg.fillStyle(0x05010F, 1);
    this._bg.fillRect(0, 0, width, height);

    // Slow scrolling starfield.
    this._stars = [];
    for (let i = 0; i < 200; i++) {
      this._stars.push({
        x:    Phaser.Math.Between(0, width),
        y:    Phaser.Math.Between(0, height),
        size: Phaser.Math.FloatBetween(0.5, 2.5),
        speed: Phaser.Math.FloatBetween(8, 35),
        alpha: Phaser.Math.FloatBetween(0.3, 1),
      });
    }
    this._starG = this.add.graphics().setDepth(1);

    // ── Glowing planet silhouette ────────────────────────────────────────────
    this._planetG = this.add.graphics().setDepth(2);
    this._planetG.fillStyle(0x1A0033, 1);
    this._planetG.fillCircle(cx + 380, cy + 160, 260);
    this._planetG.fillStyle(0x7C4DFF, 0.18);
    this._planetG.fillCircle(cx + 380, cy + 160, 300);
    this._planetG.lineStyle(2, 0x7C4DFF, 0.45);
    this._planetG.strokeCircle(cx + 380, cy + 160, 265);

    // ── Title text ────────────────────────────────────────────────────────────
    // Giant title with a glow shadow.
    this.add.text(cx + 3, cy - 145 + 3, 'SOLAR', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize:   '108px',
      color:      '#002233',
      stroke:     '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(3);

    this.add.text(cx, cy - 148, 'SOLAR', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize:   '108px',
      color:      '#00F5FF',
      stroke:     '#003344',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(4);

    this.add.text(cx + 3, cy - 38 + 3, 'BLASTER', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize:   '80px',
      color:      '#220033',
      stroke:     '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(3);

    this.add.text(cx, cy - 40, 'BLASTER', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize:   '80px',
      color:      '#FF2EC4',
      stroke:     '#330011',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(4);

    // Tagline.
    this.add.text(cx, cy + 45, 'Blast through the solar system', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize:   '20px',
      color:      '#88AABB',
    }).setOrigin(0.5).setDepth(4);

    // ── PLAY button ─────────────────────────────────────────────────────────
    this._playBtn = this._makeButton(cx, cy + 118, 'PLAY', 0x00F5FF, () => {
      this.scene.start('PlanetSelectScene');
    });

    // ── Mute toggle ────────────────────────────────────────────────────────
    this._muted = this.game.registry.get('muted') || false;
    this._muteBtn = this.add.text(width - 28, 28, this._muted ? '🔇' : '🔊', {
      fontSize: '26px',
    }).setOrigin(1, 0).setDepth(10).setInteractive({ useHandCursor: true });
    this._muteBtn.on('pointerdown', () => {
      this._muted = !this._muted;
      this.game.registry.set('muted', this._muted);
      this._muteBtn.setText(this._muted ? '🔇' : '🔊');
    });

    // ── Version / credit ────────────────────────────────────────────────────
    this.add.text(cx, height - 48, 'VERSIONS', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize:   '13px',
      color:      '#667788',
    }).setOrigin(0.5).setDepth(4).setInteractive({ useHandCursor: true })
      .on('pointerover', function () { this.setColor('#00F5FF'); })
      .on('pointerout',  function () { this.setColor('#667788'); })
      .on('pointerdown', () => { window.location.href = '../'; });

    this.add.text(cx, height - 22, 'Use keyboard, mouse or touch · Collect coins · Beat all 8 planets', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize:   '13px',
      color:      '#445566',
    }).setOrigin(0.5).setDepth(4);

    // Animate the title floating up/down.
    this._titleT = 0;

    // Initialise AudioSystem on first interaction (browser requires user gesture).
    this._audioReady = false;
    this.input.on('pointerdown', () => this._resumeAudio());
    this.input.keyboard.on('keydown', () => this._resumeAudio());
  }

  _resumeAudio() {
    if (this._audioReady) return;
    this._audioReady = true;
    if (!window.gameAudio) {
      window.gameAudio = new AudioSystem(this);
    }
    window.gameAudio.setMuted(this.game.registry.get('muted') || false);
    window.gameAudio.resume();
  }

  _makeButton(x, y, label, color, callback) {
    const hexStr = '#' + color.toString(16).padStart(6, '0');
    const bg = this.add.graphics().setDepth(5);
    const drawBg = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? color : 0x001122, hover ? 0.3 : 0.65);
      bg.fillRoundedRect(x - 120, y - 28, 240, 56, 8);
      bg.lineStyle(2, color, 0.9);
      bg.strokeRoundedRect(x - 120, y - 28, 240, 56, 8);
    };
    drawBg(false);

    const txt = this.add.text(x, y, label, {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize:   '28px',
      color:      hexStr,
    }).setOrigin(0.5).setDepth(6);

    // Make the text interactive.
    txt.setInteractive({ useHandCursor: true });
    txt.on('pointerover',  () => { drawBg(true);  this.tweens.add({ targets: txt, scaleX: 1.07, scaleY: 1.07, duration: 80 }); });
    txt.on('pointerout',   () => { drawBg(false); this.tweens.add({ targets: txt, scaleX: 1,    scaleY: 1,    duration: 80 }); });
    txt.on('pointerdown',  () => {
      if (window.gameAudio) window.gameAudio.playUIClick();
      callback();
    });

    return { bg, txt };
  }

  update(time, delta) {
    const { width } = this.scale;
    const dt = delta / 1000;
    this._titleT += dt;

    // Scroll stars left.
    this._starG.clear();
    this._stars.forEach(s => {
      s.x -= s.speed * dt;
      if (s.x < 0) { s.x = width; s.y = Phaser.Math.Between(0, this.scale.height); }
      this._starG.fillStyle(0xFFFFFF, s.alpha);
      this._starG.fillCircle(s.x, s.y, s.size);
    });
  }
}
