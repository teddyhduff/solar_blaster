// HangarScene.js — The Hangar: a physical interior space, not a flat menu.
// Layout: gantry + rotating ship centre, tool panels for each upgrade track,
//         mechanic-bot install animation on purchase, welding arm sparks overhead.
// Stencil Riso: bone / blaze / teal only.

import { SaveData }         from '../systems/SaveData.js';
import { UPGRADE_TRACKS, SKINS, getSkin } from '../data/upgrades.js';
import { BALANCE }          from '../data/balance.js';
import { C, drawShip } from '../systems/StencilArt.js';

export class HangarScene extends Phaser.Scene {
  constructor() { super({ key: 'HangarScene' }); }

  create() {
    const { width, height } = this.scale;

    // ── Physical interior background ─────────────────────────────────────────
    this._buildInterior();

    // ── Gantry + ship on lift ─────────────────────────────────────────────────
    this._shipAngle   = 0;
    this._shipMarking = null;
    this._shipG       = this.add.graphics().setDepth(10);
    this._gantryG     = this.add.graphics().setDepth(8);
    this._drawGantry();
    this._drawShipOnLift(0);

    // ── Mechanic bot ─────────────────────────────────────────────────────────
    this._botX    = width * 0.5 + 120;
    this._botY    = height * 0.58;
    this._botG    = this.add.graphics().setDepth(11);
    this._botIdle = true;
    this._drawBot(false);

    // ── Welding arm ──────────────────────────────────────────────────────────
    this._weldG    = this.add.graphics().setDepth(9);
    this._weldT    = 0;
    this._sparkTimer = 4000;

    // ── Header ────────────────────────────────────────────────────────────────
    this.add.text(30, 24, 'HANGAR', {
      fontFamily: "'Saira Stencil One', sans-serif",
      fontSize: '32px', color: '#efe9dd',
    }).setDepth(20);
    this.add.text(30, 60, `COINS: ${SaveData.getCoins()}`, {
      fontFamily: "'Space Mono', monospace",
      fontSize: '14px', color: 'rgba(239,233,221,0.65)',
    }).setDepth(20).setName('coinTxt');
    this._coinTxt = this.children.getByName('coinTxt');

    // ── Upgrade console panels ────────────────────────────────────────────────
    this._buildUpgradePanels();

    // ── Skin marking row ──────────────────────────────────────────────────────
    this._buildSkinRow();

    // ── Back button ───────────────────────────────────────────────────────────
    const back = this.add.text(width - 30, 24, 'BACK', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '20px', color: '#efe9dd', fontStyle: 'bold', letterSpacing: 5,
    }).setOrigin(1, 0).setDepth(20).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('PlanetSelectScene'));
    back.on('pointerover',  () => back.setColor('#ff4d17'));
    back.on('pointerout',   () => back.setColor('#efe9dd'));

    // Animate
    this._animTimer = this.time.addEvent({
      delay: 16, loop: true, callback: this._tick, callbackScope: this,
    });
  }

  // ── Interior background ───────────────────────────────────────────────────────

  _buildInterior() {
    const { width, height } = this.scale;
    const g = this.add.graphics().setDepth(0);

    // Deep ink ground
    g.fillStyle(C.INK_DEEP, 1);
    g.fillRect(0, 0, width, height);

    // Floor plate — bone stencil grid
    g.lineStyle(1, C.BONE, 0.10);
    for (let x = 0; x < width; x += 60) g.lineBetween(x, height * 0.55, x, height);
    for (let y = height * 0.55; y < height; y += 40) g.lineBetween(0, y, width, y);

    // Ceiling cable runs
    g.lineStyle(2, C.BONE, 0.18);
    g.lineBetween(0, 60, width, 60);
    for (let x = 80; x < width; x += 120) {
      g.lineBetween(x, 60, x, 80 + (x % 60));
    }

    // Tool racks (left and right walls)
    g.lineStyle(2, C.BONE, 0.20);
    g.strokeRect(10, 90, 60, height - 110);
    g.strokeRect(width - 70, 90, 60, height - 110);
    // Tool handles
    for (let y = 110; y < height - 30; y += 40) {
      g.fillStyle(C.BONE, 0.15);
      g.fillRect(20, y, 40, 14);
      g.fillRect(width - 60, y, 40, 14);
    }

    // Diagnostic panels on rear wall
    g.lineStyle(1, C.BONE, 0.14);
    for (let i = 0; i < 5; i++) {
      const px = width * 0.12 + i * width * 0.16;
      g.strokeRect(px, 80, width * 0.10, 55);
      g.fillStyle(C.BLAZE, 0.07);
      g.fillRect(px + 4, 84, width * 0.10 - 8, 47);
    }

    // Paper grain / halftone on floor
    const grainG = this.add.graphics().setDepth(1);
    grainG.fillStyle(C.BONE, 0.05);
    for (let y = height * 0.55; y < height; y += 7) {
      for (let x = 0; x < width; x += 7) {
        grainG.fillCircle(x + 1, y + 1, 1);
      }
    }
  }

  // ── Gantry ───────────────────────────────────────────────────────────────────

  _drawGantry() {
    const { width, height } = this.scale;
    const g = this._gantryG;
    g.clear();
    const cx = width * 0.50, cy = height * 0.48;

    // Gantry arms
    g.lineStyle(4, C.BONE, 0.35);
    g.lineBetween(cx - 110, 60, cx - 110, cy - 50);
    g.lineBetween(cx + 110, 60, cx + 110, cy - 50);
    g.lineBetween(cx - 110, cy - 50, cx + 110, cy - 50);

    // Lift platform (the ship rests on this)
    g.lineStyle(3, C.BONE, 0.55);
    g.lineBetween(cx - 80, cy + 40, cx + 80, cy + 40);
    g.fillStyle(C.INK, 1);
    g.fillRect(cx - 80, cy + 40, 160, 8);
    g.lineStyle(2, C.BONE, 0.30);
    g.strokeRect(cx - 80, cy + 40, 160, 8);
  }

  // ── Welding arm + sparks ──────────────────────────────────────────────────────

  _updateWeldArm(delta) {
    const { width } = this.scale;
    this._weldG.clear();
    this._weldT += delta * 0.0008;
    const armX = width * 0.50 + Math.sin(this._weldT) * 80;
    const armY = 60 + Math.abs(Math.sin(this._weldT * 0.7)) * 30;

    this._weldG.lineStyle(3, C.BONE, 0.25);
    this._weldG.lineBetween(width * 0.50, 60, armX, armY + 35);

    // Sparks
    this._sparkTimer -= delta;
    if (this._sparkTimer <= 0) {
      this._sparkTimer = 3000 + Math.random() * 2000;
      // Brief blaze sparkle burst
      for (let i = 0; i < 8; i++) {
        const sx = armX + Phaser.Math.Between(-10, 10);
        const sy = armY + 35 + Phaser.Math.Between(-5, 5);
        this._weldG.fillStyle(C.BLAZE, Math.random() * 0.9 + 0.1);
        this._weldG.fillCircle(sx, sy, Math.random() * 3 + 1);
      }
    }
  }

  // ── Ship on lift ─────────────────────────────────────────────────────────────

  _drawShipOnLift(delta) {
    const { width, height } = this.scale;
    const cx = width * 0.50, cy = height * 0.46;
    this._shipAngle += 0.0005 * delta;
    const bob = Math.sin(this._shipAngle * 1.2) * 5;
    const marking = SaveData.getSkin();
    if (marking !== this._shipMarking) {
      this._shipMarking = marking;
      this._shipG.clear();
      drawShip(this._shipG, 0, 0, 'gameplay', marking);
    }
    this._shipG.setPosition(cx, cy + bob);
  }

  // ── Mechanic bot ─────────────────────────────────────────────────────────────

  _drawBot(active) {
    const g = this._botG;
    g.clear();
    const bx = this._botX, by = this._botY;

    // Body: small bone rectangle
    g.fillStyle(C.BONE, 0.90);
    g.fillRect(bx - 12, by - 20, 24, 28);
    g.lineStyle(2, C.INK, 0.60);
    g.strokeRect(bx - 12, by - 20, 24, 28);

    // Head
    g.fillStyle(C.BONE, 0.90);
    g.fillRect(bx - 9, by - 30, 18, 12);
    g.lineStyle(1, C.INK, 0.50);
    g.strokeRect(bx - 9, by - 30, 18, 12);

    // Eye (blaze when active)
    g.fillStyle(active ? C.BLAZE : C.TEAL, 1);
    g.fillCircle(bx, by - 24, 3);

    // Wheels
    g.fillStyle(C.INK, 1);
    g.fillCircle(bx - 8, by + 10, 4);
    g.fillCircle(bx + 8, by + 10, 4);

    // Arm (extended toward ship during install)
    if (active) {
      g.lineStyle(3, C.BLAZE, 0.80);
      g.lineBetween(bx - 12, by - 6, bx - 50, by - 20);
    }
  }

  // ── Install animation (called when upgrade is purchased) ──────────────────────

  _triggerInstall() {
    this._botIdle = false;
    this._drawBot(true);
    // Tween bot toward ship
    this.tweens.add({
      targets: this,
      _botX: this.scale.width * 0.50 + 80,
      duration: 600,
      yoyo: true,
      onComplete: () => {
        this._botIdle = true;
        this._botX = this.scale.width * 0.50 + 120;
        this._drawBot(false);
        this._refreshUpgradePanels();
        if (this._coinTxt) this._coinTxt.setText(`COINS: ${SaveData.getCoins()}`);
      },
    });
  }

  // ── Upgrade console panels ────────────────────────────────────────────────────

  _buildUpgradePanels() {
    const { width, height } = this.scale;
    this._panelGroup = this.add.group();
    const panelW = 200, panelH = 115;
    const startX = width * 0.05;
    const panelY = height * 0.67;
    const cols   = [0, 1, 2, 3];

    UPGRADE_TRACKS.forEach((track, i) => {
      const px = startX + i * (panelW + 14);
      this._drawUpgradePanel(px, panelY, panelW, panelH, track);
    });
  }

  _drawUpgradePanel(px, py, pw, ph, track) {
    const tier     = SaveData.getUpgradeTier(track.id);
    const maxTier  = track.maxTier;
    const atMax    = tier >= maxTier;
    const nextCost = atMax ? 0 : track.costs[tier];

    // Panel outline (bone, 2px stencil stroke)
    const g = this.add.graphics().setDepth(18);
    g.lineStyle(2, C.BONE, 0.70);
    g.strokeRect(px, py, pw, ph);

    // Track label
    this.add.text(px + 10, py + 10, track.label, {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '11px', color: '#efe9dd', fontStyle: 'bold', letterSpacing: 4,
    }).setDepth(19);

    // Description
    this.add.text(px + 10, py + 28, track.description, {
      fontFamily: "'Space Mono', monospace",
      fontSize: '9px', color: 'rgba(239,233,221,0.55)',
      wordWrap: { width: pw - 20 },
    }).setDepth(19);

    // Tier pips
    for (let t = 0; t < maxTier; t++) {
      const pipG = this.add.graphics().setDepth(19);
      const filled = t < tier;
      pipG.fillStyle(filled ? C.BLAZE : C.INK, 1);
      pipG.fillRect(px + 10 + t * 22, py + 68, 16, 8);
      pipG.lineStyle(1, C.BONE, 0.60);
      pipG.strokeRect(px + 10 + t * 22, py + 68, 16, 8);
    }

    // Buy button
    if (!atMax) {
      const canAfford = SaveData.getCoins() >= nextCost;
      const btnG = this.add.graphics().setDepth(19);
      btnG.lineStyle(2, canAfford ? C.BLAZE : C.BONE, 0.60);
      btnG.strokeRect(px + 10, py + 84, pw - 20, 22);
      if (canAfford) {
        btnG.fillStyle(C.BLAZE, 0.10);
        btnG.fillRect(px + 10, py + 84, pw - 20, 22);
      }
      const btnLabel = `${nextCost} COINS — TIER ${tier + 1}`;
      const btnTxt = this.add.text(px + pw / 2, py + 95, btnLabel, {
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '11px', color: canAfford ? '#ff4d17' : 'rgba(239,233,221,0.40)',
        fontStyle: 'bold', letterSpacing: 3,
      }).setOrigin(0.5).setDepth(20);

      // Click zone
      const zone = this.add.rectangle(px + pw / 2, py + 95, pw - 20, 22, 0, 0)
        .setDepth(21).setInteractive({ useHandCursor: canAfford });
      if (canAfford) {
        zone.on('pointerdown', () => {
          if (SaveData.spendCoins(nextCost)) {
            SaveData.purchaseUpgrade(track.id);
            this._triggerInstall();
          }
        });
      }
    } else {
      this.add.text(px + pw / 2, py + 95, 'MAX TIER', {
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '11px', color: '#0f7a6a',
        fontStyle: 'bold', letterSpacing: 4,
      }).setOrigin(0.5).setDepth(20);
    }
  }

  _refreshUpgradePanels() {
    // Destroy and rebuild all panels
    this._panelGroup?.clear(true, true);
    const { width, height } = this.scale;
    const panelW = 200, panelH = 115;
    const startX = width * 0.05;
    const panelY = height * 0.67;
    UPGRADE_TRACKS.forEach((track, i) => {
      const px = startX + i * (panelW + 14);
      this._drawUpgradePanel(px, panelY, panelW, panelH, track);
    });
  }

  // ── Skin marking row ──────────────────────────────────────────────────────────

  _buildSkinRow() {
    const { width, height } = this.scale;
    const currentSkin = SaveData.getSkin();

    this.add.text(width * 0.73, height * 0.67, 'MARKINGS', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '11px', color: '#efe9dd', fontStyle: 'bold', letterSpacing: 4,
    }).setDepth(19);

    SKINS.forEach((skin, i) => {
      const sx = width * 0.73, sy = height * 0.73 + i * 34;
      const owned   = skin.cost === 0 || this._skinOwned(skin.id);
      const active  = skin.id === currentSkin;
      const canBuy  = !owned && SaveData.getCoins() >= skin.cost;

      const g = this.add.graphics().setDepth(18);
      g.lineStyle(2, active ? C.BLAZE : C.BONE, active ? 0.90 : 0.40);
      g.strokeRect(sx, sy, 230, 28);
      if (active) { g.fillStyle(C.BLAZE, 0.07); g.fillRect(sx, sy, 230, 28); }

      this.add.text(sx + 10, sy + 14, skin.label, {
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '12px', color: active ? '#ff4d17' : '#efe9dd',
        fontStyle: 'bold', letterSpacing: 3,
      }).setOrigin(0, 0.5).setDepth(19);

      const badge = owned ? (active ? 'EQUIPPED' : 'OWN IT') : `${skin.cost}c`;
      this.add.text(sx + 220, sy + 14, badge, {
        fontFamily: "'Space Mono', monospace",
        fontSize: '10px', color: owned ? '#0f7a6a' : 'rgba(239,233,221,0.50)',
      }).setOrigin(1, 0.5).setDepth(19);

      const zone = this.add.rectangle(sx + 115, sy + 14, 230, 28, 0, 0)
        .setDepth(20).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        if (!owned && canBuy) {
          if (SaveData.spendCoins(skin.cost)) {
            this._ownedSkins = this._ownedSkins || new Set(['standard']);
            this._ownedSkins.add(skin.id);
            SaveData.setSkin(skin.id);
            this._triggerInstall();
            this.scene.restart();
          }
        } else if (owned) {
          SaveData.setSkin(skin.id);
          this._triggerInstall();
          this.scene.restart();
        }
      });
    });
  }

  _skinOwned(id) {
    if (id === 'standard') return true;
    // We track owned skins via the upgrades schema skin key
    return SaveData.getSkin() === id || (this._ownedSkins && this._ownedSkins.has(id));
  }

  // ── Animation tick ────────────────────────────────────────────────────────────

  _tick() {
    const delta = 16;
    this._drawShipOnLift(delta);
    this._updateWeldArm(delta);
    if (!this._botIdle) {
      this._drawBot(true);
    }
  }

  shutdown() {
    if (this._animTimer) { this._animTimer.remove(); this._animTimer = null; }
  }
}
