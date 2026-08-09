// TitleScene.js — Title screen for Solar Blaster V2.
// Stencil Riso: bone text, blaze planet, misprint offset, halftone.
// Brand is hero-level signal; no dashboard crowding.

import { AudioSystem } from '../systems/AudioSystem.js';
import { C, drawPlanet } from '../systems/StencilArt.js';
import { PLANETS } from '../data/planets.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super({ key: 'TitleScene' }); }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Ink ground + grain ────────────────────────────────────────────────────
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(C.INK, 1);
    bg.fillRect(0, 0, width, height);
    // Paper grain
    bg.fillStyle(C.BONE, 0.07);
    for (let y = 0; y < height; y += 7) {
      for (let x = 0; x < width; x += 7) {
        bg.fillCircle(x + 1, y + 1, 1);
      }
    }

    // ── Neptune silhouette (right side, partial) ──────────────────────────────
    this._planetG = this.add.graphics().setDepth(2);
    this._planetT = 0;

    // ── Moving bone star points ───────────────────────────────────────────────
    this._stars = [];
    for (let i = 0; i < 60; i++) {
      this._stars.push({
        x:     Phaser.Math.Between(0, width),
        y:     Phaser.Math.Between(0, height),
        size:  Phaser.Math.FloatBetween(0.8, 2),
        speed: Phaser.Math.FloatBetween(6, 22),
        alpha: Phaser.Math.FloatBetween(0.25, 0.80),
      });
    }
    this._starG = this.add.graphics().setDepth(1);

    // ── Brand: SOLAR BLASTER — Saira Stencil One, full-bleed hero ────────────
    // Misprint underlay
    this.add.text(cx + 6, height * 0.36 + 6, 'SOLAR', {
      fontFamily: "'Saira Stencil One', sans-serif",
      fontSize: '108px', color: '#ff4d17', alpha: 0.55,
    }).setOrigin(0.5).setDepth(3);
    this.add.text(cx + 6, height * 0.53 + 6, 'BLASTER', {
      fontFamily: "'Saira Stencil One', sans-serif",
      fontSize: '80px', color: '#ff4d17', alpha: 0.55,
    }).setOrigin(0.5).setDepth(3);

    // Main text — bone
    this.add.text(cx, height * 0.36, 'SOLAR', {
      fontFamily: "'Saira Stencil One', sans-serif",
      fontSize: '108px', color: '#efe9dd',
    }).setOrigin(0.5).setDepth(4);
    this.add.text(cx, height * 0.53, 'BLASTER', {
      fontFamily: "'Saira Stencil One', sans-serif",
      fontSize: '80px', color: '#efe9dd',
    }).setOrigin(0.5).setDepth(4);

    // Tagline
    this.add.text(cx, height * 0.67, 'Conquer the solar system. Reach the Sun.', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '18px', color: 'rgba(239,233,221,0.60)',
      letterSpacing: 3,
    }).setOrigin(0.5).setDepth(4);

    // ── PLAY button — 2px bone stencil outline ────────────────────────────────
    const btnG = this.add.graphics().setDepth(5);
    const redrawBtn = (hover) => {
      btnG.clear();
      btnG.lineStyle(2, hover ? C.BLAZE : C.BONE, hover ? 1 : 0.80);
      btnG.strokeRect(cx - 130, height * 0.76 - 22, 260, 44);
      if (hover) { btnG.fillStyle(C.BLAZE, 0.08); btnG.fillRect(cx - 130, height * 0.76 - 22, 260, 44); }
    };
    redrawBtn(false);

    const playTxt = this.add.text(cx, height * 0.76, 'PLAY', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '28px', color: '#efe9dd',
      fontStyle: 'bold', letterSpacing: 8,
    }).setOrigin(0.5).setDepth(6).setInteractive({ useHandCursor: true });
    playTxt.on('pointerover',  () => { redrawBtn(true);  playTxt.setColor('#ff4d17'); });
    playTxt.on('pointerout',   () => { redrawBtn(false); playTxt.setColor('#efe9dd'); });
    playTxt.on('pointerdown',  () => {
      if (window.gameAudio) window.gameAudio.playUIClick?.();
      this.scene.start('PlanetSelectScene');
    });

    // ── Mute ─────────────────────────────────────────────────────────────────
    const muteBtn = this.add.text(width - 28, 28, '', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '14px', color: 'rgba(239,233,221,0.50)',
      letterSpacing: 4, fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(10).setInteractive({ useHandCursor: true });
    const updateMute = () => {
      const m = this.game.registry.get('muted');
      muteBtn.setText(m ? 'SOUND: OFF' : 'SOUND: ON');
    };
    updateMute();
    muteBtn.on('pointerdown', () => {
      const m = !this.game.registry.get('muted');
      this.game.registry.set('muted', m);
      if (window.gameAudio) window.gameAudio.setMuted(m);
      updateMute();
    });

    // Credit
    this.add.text(cx, height - 18, 'Keyboard · Mouse · Touch  ·  9 destinations  ·  Conquer all to win', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '12px', color: 'rgba(239,233,221,0.35)',
      letterSpacing: 3,
    }).setOrigin(0.5, 1).setDepth(4);

    // Resume audio on first interaction
    this._audioReady = false;
    this.input.on('pointerdown', () => this._resumeAudio());
    this.input.keyboard.on('keydown', () => this._resumeAudio());

    this._titleT = 0;
  }

  _resumeAudio() {
    if (this._audioReady) return;
    this._audioReady = true;
    if (!window.gameAudio) window.gameAudio = new AudioSystem(this);
    window.gameAudio.setMuted(this.game.registry.get('muted') || false);
    window.gameAudio.resume();
  }

  update(time, delta) {
    const { width } = this.scale;
    const dt = delta / 1000;
    this._titleT += dt;
    this._planetT += dt;

    // Scroll stars
    this._starG.clear();
    this._starG.fillStyle(C.BONE, 1);
    for (const s of this._stars) {
      s.x -= s.speed * dt;
      if (s.x < 0) { s.x = width; s.y = Phaser.Math.Between(0, this.scale.height); }
      this._starG.fillStyle(C.BONE, s.alpha);
      this._starG.fillCircle(s.x, s.y, s.size);
    }

    // Slowly rotating Neptune partial disc at top-right
    this._planetG.clear();
    drawPlanet(
      this._planetG,
      width * 0.88, -60,
      200,
      PLANETS[0],   // Neptune
      this._planetT * 0.15
    );
  }
}
