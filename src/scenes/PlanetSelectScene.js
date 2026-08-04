// PlanetSelectScene.js — Shows all 8 planets; locked ones are greyed out.
// Tapping a planet starts that level. Hangar button opens the upgrade shop.

import { PLANETS }   from '../data/planets.js';
import { SaveData }  from '../systems/SaveData.js';

export class PlanetSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlanetSelectScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Background ──────────────────────────────────────────────────────────
    this.add.rectangle(0, 0, width, height, 0x05010F).setOrigin(0);
    this._stars = [];
    this._starG = this.add.graphics().setDepth(0);
    for (let i = 0; i < 180; i++) {
      this._stars.push({
        x: Phaser.Math.Between(0, width), y: Phaser.Math.Between(0, height),
        size: Phaser.Math.FloatBetween(0.5, 2), speed: Phaser.Math.FloatBetween(6, 22),
        alpha: Phaser.Math.FloatBetween(0.3, 0.9),
      });
    }

    // ── Header ──────────────────────────────────────────────────────────────
    this.add.text(cx, 44, 'SELECT PLANET', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize:   '36px',
      color:      '#00F5FF',
      stroke:     '#003344',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2);

    // High score and coins.
    this._coinsText = this.add.text(width - 24, 20, '', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '18px', color: '#FFD93D',
    }).setOrigin(1, 0).setDepth(2);

    this._hsText = this.add.text(24, 20, '', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '18px', color: '#00E5A0',
    }).setOrigin(0, 0).setDepth(2);

    this._refreshStats();

    // ── Planet row ──────────────────────────────────────────────────────────
    // 8 planets evenly spaced.
    const rowY    = height * 0.5;
    const totalW  = width - 120;
    const spacing = totalW / 7;
    const startX  = 60;

    this._planetBtns = [];
    const unlocked = SaveData.getUnlockedPlanets();

    PLANETS.forEach((planet, i) => {
      const x        = startX + i * spacing;
      const isOpen   = unlocked.includes(planet.id);
      const planetG  = this.add.graphics().setDepth(3);
      this.add.text(x, rowY + 64, planet.name, {
        fontFamily: "'Orbitron', 'Courier New', monospace",
        fontSize:   '13px',
        color:      isOpen ? ('#' + planet.accentColor.toString(16).padStart(6, '0')) : '#334455',
        align:      'center',
      }).setOrigin(0.5).setDepth(3);

      this._drawPlanet(planetG, x, rowY, planet, isOpen);

      if (isOpen) {
        // Make it interactive.
        const hitZone = this.add.circle(x, rowY, 42, 0xFFFFFF, 0)
          .setDepth(4)
          .setInteractive({ useHandCursor: true });
        hitZone.on('pointerover',  () => { this._drawPlanet(planetG, x, rowY, planet, true, true); });
        hitZone.on('pointerout',   () => { this._drawPlanet(planetG, x, rowY, planet, true, false); });
        hitZone.on('pointerdown',  () => {
          if (window.gameAudio) window.gameAudio.playUIClick();
          this._startPlanet(planet.id);
        });
        this._planetBtns.push({ g: planetG, hitZone, x, y: rowY, planet });
      }
    });

    // ── Hangar button ───────────────────────────────────────────────────────
    this._makeButton(cx, height - 56, 'HANGAR  ⚙', 0xFF2EC4, () => {
      if (window.gameAudio) window.gameAudio.playUIClick();
      this.scene.start('HangarScene');
    });

    // ── Back to title ────────────────────────────────────────────────────────
    this.add.text(24, height - 30, '← TITLE', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '15px', color: '#445566',
    }).setOrigin(0, 1).setDepth(4)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('TitleScene'));

    // ── Sync mute ────────────────────────────────────────────────────────────
    if (window.gameAudio) {
      window.gameAudio.setMuted(this.game.registry.get('muted') || false);
    }
  }

  _refreshStats() {
    const coins = SaveData.getCoins();
    const hs    = SaveData.getHighScore();
    this._coinsText.setText(`COINS: ${coins}`);
    this._hsText.setText(hs > 0 ? `BEST: ${hs}` : '');
  }

  _drawPlanet(g, x, y, planet, unlocked, hover = false) {
    g.clear();
    const col = planet.accentColor;

    if (!unlocked) {
      // Locked — grey silhouette.
      g.fillStyle(0x1A2233, 1);
      g.fillCircle(x, y, 36);
      g.lineStyle(1.5, 0x334455, 0.7);
      g.strokeCircle(x, y, 36);
      // Lock icon (shackle + body). Phaser Graphics has arc/strokePath, not strokeArc.
      g.fillStyle(0x334455, 0.8);
      g.fillRoundedRect(x - 8, y - 6, 16, 14, 3);
      g.lineStyle(2, 0x334455, 0.8);
      g.beginPath();
      g.arc(x, y - 8, 7, -Math.PI, 0, false);
      g.strokePath();
      return;
    }

    const r     = hover ? 42 : 38;
    const alpha = hover ? 0.22 : 0.14;

    // Glow ring.
    g.fillStyle(col, alpha);
    g.fillCircle(x, y, r + 10);

    // Planet body.
    g.fillStyle(darken(col), 1);
    g.fillCircle(x, y, r);
    g.fillStyle(col, 0.6);
    g.fillCircle(x, y, r);

    // Surface detail — diagonal stripe.
    g.fillStyle(0xFFFFFF, 0.06);
    g.fillRect(x - r, y - 6, r * 2, 12);

    // Ring for Saturn / Uranus.
    if (planet.id === 'saturn') {
      g.lineStyle(3, col, 0.65);
      g.strokeEllipse(x, y, r * 2.7, r * 0.7);
    }
    if (planet.id === 'uranus') {
      g.lineStyle(2.5, col, 0.55);
      g.strokeEllipse(x, y + 4, r * 2.4, r * 0.55);
    }

    // Bright outline.
    g.lineStyle(hover ? 2.5 : 1.5, col, 0.9);
    g.strokeCircle(x, y, r);
  }

  _startPlanet(planetId) {
    this.scene.start('GameScene', { planetId });
  }

  _makeButton(x, y, label, color, callback) {
    const hexStr = '#' + color.toString(16).padStart(6, '0');
    const bg = this.add.graphics().setDepth(4);
    const draw = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? color : 0x110011, hover ? 0.28 : 0.7);
      bg.fillRoundedRect(x - 130, y - 26, 260, 52, 8);
      bg.lineStyle(2, color, 0.85);
      bg.strokeRoundedRect(x - 130, y - 26, 260, 52, 8);
    };
    draw(false);
    const txt = this.add.text(x, y, label, {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '22px', color: hexStr,
    }).setOrigin(0.5).setDepth(5).setInteractive({ useHandCursor: true });
    txt.on('pointerover',  () => draw(true));
    txt.on('pointerout',   () => draw(false));
    txt.on('pointerdown',  callback);
  }

  update(time, delta) {
    const { width } = this.scale;
    const dt = delta / 1000;
    this._starG.clear();
    this._stars.forEach(s => {
      s.x -= s.speed * dt;
      if (s.x < 0) { s.x = width; s.y = Phaser.Math.Between(0, this.scale.height); }
      this._starG.fillStyle(0xFFFFFF, s.alpha);
      this._starG.fillCircle(s.x, s.y, s.size);
    });
  }
}

/** Darkens a hex colour by 40% for use as a planet base. */
function darken(hex) {
  const r = ((hex >> 16) & 0xFF) * 0.35 | 0;
  const g = ((hex >> 8)  & 0xFF) * 0.35 | 0;
  const b = ( hex        & 0xFF) * 0.35 | 0;
  return (r << 16) | (g << 8) | b;
}
