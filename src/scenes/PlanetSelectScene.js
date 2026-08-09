// PlanetSelectScene.js — Choose your destination.
// 9 destinations laid out as an inward journey (Neptune → Sun).
// Locked ones dimmed. Shows per-planet high score.
// Stencil Riso: bone / blaze / teal only.

import { PLANETS }    from '../data/planets.js';
import { SaveData }   from '../systems/SaveData.js';
import { C, drawPlanet } from '../systems/StencilArt.js';

export class PlanetSelectScene extends Phaser.Scene {
  constructor() { super({ key: 'PlanetSelectScene' }); }

  create() {
    const { width, height } = this.scale;

    // ── Background ────────────────────────────────────────────────────────────
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(C.INK, 1);
    bg.fillRect(0, 0, width, height);
    // Grain
    bg.fillStyle(C.BONE, 0.08);
    for (let y = 0; y < height; y += 7) {
      for (let x = 0; x < width; x += 7) {
        bg.fillCircle(x + 1, y + 1, 1);
      }
    }

    // ── Header ────────────────────────────────────────────────────────────────
    this.add.text(width / 2, 24, 'SOLAR BLASTER', {
      fontFamily: "'Saira Stencil One', sans-serif",
      fontSize: '36px', color: '#efe9dd',
    }).setOrigin(0.5, 0).setDepth(10);

    this.add.text(width / 2, 64, 'SELECT DESTINATION', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '13px', color: '#ff4d17',
      fontStyle: 'bold', letterSpacing: 6,
    }).setOrigin(0.5, 0).setDepth(10);

    // Coins
    this.add.text(30, 30, `COINS: ${SaveData.getCoins()}`, {
      fontFamily: "'Space Mono', monospace",
      fontSize: '13px', color: 'rgba(239,233,221,0.65)',
    }).setDepth(10);

    // ── Planet cards ──────────────────────────────────────────────────────────
    this._buildPlanetGrid();

    // ── Hangar / back buttons ─────────────────────────────────────────────────
    const hangarBtn = this.add.text(30, height - 30, 'HANGAR', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '20px', color: '#efe9dd', fontStyle: 'bold', letterSpacing: 5,
    }).setOrigin(0, 1).setDepth(10).setInteractive({ useHandCursor: true });
    hangarBtn.on('pointerdown', () => this.scene.start('HangarScene'));
    hangarBtn.on('pointerover',  () => hangarBtn.setColor('#ff4d17'));
    hangarBtn.on('pointerout',   () => hangarBtn.setColor('#efe9dd'));

    const titleBtn = this.add.text(width - 30, height - 30, 'TITLE', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '20px', color: 'rgba(239,233,221,0.45)', fontStyle: 'bold', letterSpacing: 5,
    }).setOrigin(1, 1).setDepth(10).setInteractive({ useHandCursor: true });
    titleBtn.on('pointerdown', () => this.scene.start('TitleScene'));

    // ── Mute toggle ───────────────────────────────────────────────────────────
    const muteIcon = this.add.text(width / 2, height - 30, '', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '14px', color: 'rgba(239,233,221,0.45)', letterSpacing: 4,
    }).setOrigin(0.5, 1).setDepth(10).setInteractive({ useHandCursor: true });
    const updateMute = () => {
      const m = this.game.registry.get('muted');
      muteIcon.setText(m ? 'SOUND: OFF' : 'SOUND: ON');
    };
    updateMute();
    muteIcon.on('pointerdown', () => {
      const m = !this.game.registry.get('muted');
      this.game.registry.set('muted', m);
      if (window.gameAudio) window.gameAudio.setMuted(m);
      updateMute();
    });
  }

  _buildPlanetGrid() {
    const { width, height } = this.scale;
    const unlocked   = SaveData.getUnlocked();
    const highScores = SaveData.getHighScores();

    // 9 destinations; lay out 5 top row + 4 bottom row, left = outer (Neptune) → right = inner (Sun)
    const topRow    = PLANETS.slice(0, 5);
    const bottomRow = PLANETS.slice(5, 9);

    const cardW = 128, cardH = 110;
    const topRowY    = height * 0.42;
    const bottomRowY = height * 0.76;
    const topStartX  = (width - topRow.length    * (cardW + 16) + 16) / 2;
    const botStartX  = (width - bottomRow.length * (cardW + 16) + 16) / 2;

    const drawRow = (row, startX, rowY) => {
      row.forEach((planet, i) => {
        const cx = startX + i * (cardW + 16) + cardW / 2;
        const isUnlocked = unlocked.includes(planet.id);
        const score      = highScores[planet.id] || 0;
        this._drawPlanetCard(cx, rowY, planet, isUnlocked, score);
      });
    };

    drawRow(topRow, topStartX, topRowY);
    drawRow(bottomRow, botStartX, bottomRowY);

    // Arrow indicating inward direction (Neptune → Sun)
    this.add.text(topStartX + cardW * 2.5 + 8, topRowY - 44,
      '← OUTER SYSTEM                 INNER →', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '11px', color: 'rgba(239,233,221,0.40)',
      letterSpacing: 4, fontStyle: 'bold',
    }).setOrigin(0.5, 1).setDepth(10);
  }

  _drawPlanetCard(cx, cy, planet, isUnlocked, score) {
    const g = this.add.graphics().setDepth(5);
    const alpha = isUnlocked ? 1 : 0.30;
    const W = 120, H = 100;

    // Ink plate background
    g.fillStyle(C.INK, 1);
    g.fillRect(cx - W / 2, cy - H / 2, W, H);

    // Bone 2px stencil border
    g.lineStyle(2, isUnlocked ? C.BONE : C.INK_DEEP, alpha);
    g.strokeRect(cx - W / 2, cy - H / 2, W, H);

    // Mini planet disc (smaller blaze disc)
    const planetG = this.add.graphics().setDepth(6);
    const pr = isUnlocked ? 24 : 18;
    if (isUnlocked) {
      drawPlanet(planetG, cx, cy - 12, pr, planet, 0);
    } else {
      planetG.fillStyle(C.INK_DEEP, 1);
      planetG.fillCircle(cx, cy - 12, pr);
      planetG.lineStyle(2, C.BONE, 0.20);
      planetG.strokeCircle(cx, cy - 12, pr);
      // Lock mark
      planetG.fillStyle(C.BONE, 0.30);
      planetG.fillRect(cx - 5, cy - 18, 10, 14);
      planetG.fillCircle(cx, cy - 18, 5);
    }

    // Planet name
    this.add.text(cx, cy + 20, planet.name.toUpperCase(), {
      fontFamily: "'Saira Stencil One', sans-serif",
      fontSize: '13px', color: isUnlocked ? '#efe9dd' : 'rgba(239,233,221,0.30)',
    }).setOrigin(0.5, 0).setDepth(7);

    // High score
    if (score > 0) {
      this.add.text(cx, cy + 38, `BEST ${score}`, {
        fontFamily: "'Space Mono', monospace",
        fontSize: '9px', color: '#0f7a6a',
      }).setOrigin(0.5, 0).setDepth(7);
    }

    // Click zone (only if unlocked)
    if (isUnlocked) {
      const zone = this.add.rectangle(cx, cy, W, H, 0, 0)
        .setDepth(8).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => {
        g.clear();
        g.fillStyle(C.INK, 1);
        g.fillRect(cx - W / 2, cy - H / 2, W, H);
        g.lineStyle(2, C.BLAZE, 1);
        g.strokeRect(cx - W / 2, cy - H / 2, W, H);
        g.fillStyle(C.BLAZE, 0.05);
        g.fillRect(cx - W / 2, cy - H / 2, W, H);
      });
      zone.on('pointerout', () => {
        g.clear();
        g.fillStyle(C.INK, 1);
        g.fillRect(cx - W / 2, cy - H / 2, W, H);
        g.lineStyle(2, C.BONE, 1);
        g.strokeRect(cx - W / 2, cy - H / 2, W, H);
      });
      zone.on('pointerdown', () => {
        this.scene.start('GameScene', { planetId: planet.id });
      });
    }
  }
}
