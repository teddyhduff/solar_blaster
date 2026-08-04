// HangarScene.js — The upgrade shop.
// Layout: skin picker at top (buy / select / active) → per-ship upgrade rows below.
// Clicking any skin (owned or not) shows its 2 upgrade tracks.
// Unowned skins show a "BUY SKIN" button; owned skins show their real upgrade tiers.

import { SKINS }       from '../data/upgrades.js';
import { SaveData }    from '../systems/SaveData.js';
import { drawShipShape } from '../systems/ShipShapes.js';

export class HangarScene extends Phaser.Scene {
  constructor() { super({ key: 'HangarScene' }); }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Background ──────────────────────────────────────────────────────────
    this.add.rectangle(0, 0, width, height, 0x05010F).setOrigin(0);
    const gridG = this.add.graphics().setDepth(0);
    gridG.lineStyle(1, 0x111A2A, 1);
    for (let x = 0; x < width; x += 80)  gridG.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 80) gridG.lineBetween(0, y, width, y);

    // ── Header ──────────────────────────────────────────────────────────────
    this.add.text(cx, 36, 'HANGAR', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '42px', color: '#FF2EC4',
      stroke: '#330011', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(2);

    // ── Coin display ─────────────────────────────────────────────────────────
    this._coinTxt = this.add.text(width - 24, 24, '', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '22px', color: '#FFD93D',
    }).setOrigin(1, 0).setDepth(2);
    this._updateCoinDisplay();

    // ── State ────────────────────────────────────────────────────────────────
    this._activeSkin  = SaveData.getSkin();
    this._viewedSkin  = this._activeSkin;   // which skin the panel below shows

    // ── Skin picker ──────────────────────────────────────────────────────────
    this._buildSkinPicker(88);

    // ── Divider ──────────────────────────────────────────────────────────────
    const divY = 210;
    const divG = this.add.graphics().setDepth(2);
    divG.lineStyle(1, 0x334455, 0.8);
    divG.lineBetween(30, divY, width - 30, divY);

    // ── Upgrade panel header ─────────────────────────────────────────────────
    this._panelHeaderTxt = this.add.text(cx, divY + 18, '', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '16px', color: '#557788',
    }).setOrigin(0.5).setDepth(2);

    // ── Upgrade rows container (rebuilt on skin change) ───────────────────────
    this._upgradeContainer = [];
    this._buildUpgradePanel(divY + 40);

    // ── Back button ──────────────────────────────────────────────────────────
    const backY = height - 44;
    const backTxt = this.add.text(cx, backY, '← PLANET SELECT', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '22px', color: '#00F5FF',
    }).setOrigin(0.5).setDepth(3).setInteractive({ useHandCursor: true });

    const backBg = this.add.graphics().setDepth(2);
    backBg.lineStyle(2, 0x00F5FF, 0.5);
    backBg.strokeRoundedRect(cx - 170, backY - 22, 340, 44, 8);

    backTxt.on('pointerdown', () => {
      if (window.gameAudio) window.gameAudio.playUIClick();
      this.scene.start('PlanetSelectScene');
    });
  }

  // ── Skin picker ────────────────────────────────────────────────────────────

  _buildSkinPicker(topY) {
    const { width } = this.scale;
    const cx = width / 2;
    const count   = SKINS.length;
    const slotW   = Math.min(120, (width - 40) / count);
    const totalW  = count * slotW;
    const startX  = cx - totalW / 2 + slotW / 2;
    const previewY = topY + 52;

    SKINS.forEach((skin, i) => {
      const sx      = startX + i * slotW;
      const isOwned  = SaveData.isSkinOwned(skin.id);
      const isActive = skin.id === this._activeSkin;
      const isViewed = skin.id === this._viewedSkin;
      const hexStr   = '#' + skin.color.toString(16).padStart(6, '0');

      // Selection highlight ring (behind the ship).
      if (isViewed) {
        const selG = this.add.graphics().setDepth(2);
        selG.lineStyle(2, skin.color, 0.85);
        selG.strokeRoundedRect(sx - slotW / 2 + 4, topY - 2, slotW - 8, 108, 6);
        selG.fillStyle(skin.color, 0.06);
        selG.fillRoundedRect(sx - slotW / 2 + 4, topY - 2, slotW - 8, 108, 6);
      }

      // Ship preview.
      const shipG = this.add.graphics().setDepth(3);
      const previewColor = isOwned ? skin.color : 0x223344;
      const previewAlpha = isOwned ? 0.85 : 0.30;
      drawShipShape(shipG, sx, previewY, previewColor, previewAlpha, skin.shape);

      // Skin label.
      this.add.text(sx, topY + 92, skin.label, {
        fontFamily: "'Orbitron', 'Courier New', monospace",
        fontSize: '9px', color: isOwned ? hexStr : '#334455', align: 'center',
      }).setOrigin(0.5).setDepth(3);

      // Active badge.
      if (isActive) {
        this.add.text(sx, topY + 6, '▶ ACTIVE', {
          fontFamily: "'Orbitron', 'Courier New', monospace",
          fontSize: '8px', color: hexStr,
        }).setOrigin(0.5).setDepth(3);
      }

      // Click zone — selects this skin as "viewed" (and equips if owned).
      const zone = this.add.zone(sx, previewY, slotW - 8, 100)
        .setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(4);

      zone.on('pointerdown', () => {
        if (window.gameAudio) window.gameAudio.playUIClick();
        if (!isOwned) {
          // Try to buy.
          if (!SaveData.spendCoins(skin.cost)) {
            this._floatMsg(sx, topY + 50, 'Not enough coins!', '#FF2222');
            return;
          }
          SaveData.buySkin(skin.id);
          SaveData.setSkin(skin.id);
        } else {
          SaveData.setSkin(skin.id);
        }
        this.scene.restart();
      });
    });
  }

  // ── Upgrade panel (rebuilt when viewed skin changes) ───────────────────────

  _buildUpgradePanel(startY) {
    const skin     = SKINS.find(s => s.id === this._viewedSkin);
    const isOwned  = SaveData.isSkinOwned(this._viewedSkin);
    const hexStr   = '#' + skin.color.toString(16).padStart(6, '0');

    this._panelHeaderTxt.setText(
      `UPGRADES  ·  ${skin.label.toUpperCase()}` + (isOwned ? '' : '  [not owned]')
    );

    if (!isOwned) {
      // Show locked message and buy cost.
      const { width } = this.scale;
      const cx = width / 2;
      this.add.text(cx, startY + 40, `Buy ${skin.label} for ${skin.cost} coins to unlock upgrades.`, {
        fontFamily: "'Orbitron', 'Courier New', monospace",
        fontSize: '14px', color: '#334455', align: 'center',
      }).setOrigin(0.5).setDepth(3);
      return;
    }

    const shipUpgrades = SaveData.getShipUpgrades(this._viewedSkin);
    skin.upgrades.forEach((track, i) => {
      this._buildUpgradeRow(track, startY + i * 100, shipUpgrades[track.id] || 0, skin);
    });
  }

  // ── Single upgrade track row ───────────────────────────────────────────────

  _buildUpgradeRow(track, y, currentTier, skin) {
    const { width } = this.scale;
    const cx = width / 2;
    const hexStr = '#' + skin.color.toString(16).padStart(6, '0');
    const maxTier = track.maxTier ?? track.costs?.length ?? 0;

    // Row background.
    const rowBg = this.add.graphics().setDepth(1);
    rowBg.fillStyle(0x0A1020, 0.7);
    rowBg.fillRoundedRect(30, y, width - 60, 85, 8);
    rowBg.lineStyle(1.5, 0x223344, 0.8);
    rowBg.strokeRoundedRect(30, y, width - 60, 85, 8);

    // Track name.
    this.add.text(60, y + 14, track.label, {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '18px', color: hexStr,
    }).setDepth(3);

    // Description + next-tier bonus.
    const nextBonus = currentTier < maxTier
      ? `  ›  ${track.bonusLabels[currentTier]}`
      : '  ›  MAXED OUT';
    this.add.text(60, y + 38, track.description + nextBonus, {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '12px', color: '#446677',
    }).setDepth(3);

    // Tier pip indicators.
    for (let t = 0; t < maxTier; t++) {
      const px     = cx + t * 32 - 32;
      const filled = t < currentTier;
      const pipG   = this.add.graphics().setDepth(3);
      pipG.fillStyle(filled ? skin.color : 0x112233, 1);
      pipG.fillCircle(px, y + 62, 10);
      pipG.lineStyle(2, skin.color, filled ? 0.9 : 0.30);
      pipG.strokeCircle(px, y + 62, 10);
    }

    // Buy / MAX button.
    if (currentTier < maxTier) {
      const cost  = track.costs[currentTier];
      const btnX  = width - 130;
      const btnBg = this.add.graphics().setDepth(3);
      const drawBtn = (hover) => {
        btnBg.clear();
        btnBg.fillStyle(hover ? skin.color : 0x1A1200, hover ? 0.35 : 0.8);
        btnBg.fillRoundedRect(btnX - 80, y + 44, 160, 36, 6);
        btnBg.lineStyle(2, skin.color, 0.9);
        btnBg.strokeRoundedRect(btnX - 80, y + 44, 160, 36, 6);
      };
      drawBtn(false);

      const btnTxt = this.add.text(btnX, y + 62, `${cost} COINS`, {
        fontFamily: "'Orbitron', 'Courier New', monospace",
        fontSize: '15px', color: hexStr,
      }).setOrigin(0.5).setDepth(4).setInteractive({ useHandCursor: true });

      btnTxt.on('pointerover',  () => drawBtn(true));
      btnTxt.on('pointerout',   () => drawBtn(false));
      btnTxt.on('pointerdown',  () => {
        if (SaveData.getCoins() < cost) {
          this._floatMsg(btnX, y + 40, 'Not enough coins!', '#FF2222');
          return;
        }
        SaveData.spendCoins(cost);
        SaveData.setShipUpgradeTier(this._viewedSkin, track.id, currentTier + 1);
        if (window.gameAudio) window.gameAudio.playPowerUpPickup();
        this._updateCoinDisplay();
        this.scene.restart();
      });
    } else {
      this.add.text(width - 90, y + 62, '✓ MAX', {
        fontFamily: "'Orbitron', 'Courier New', monospace",
        fontSize: '16px', color: '#00E5A0',
      }).setOrigin(0.5).setDepth(4);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _updateCoinDisplay() {
    if (this._coinTxt) this._coinTxt.setText(`COINS: ${SaveData.getCoins()}`);
  }

  _floatMsg(x, y, msg, color) {
    const t = this.add.text(x, y, msg, {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '14px', color,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
  }
}
