// CampaignCompleteScene.js — Solar system conquered. Short celebration after the Sun falls.
// All levels remain replayable. Stencil Riso.

import { C } from '../systems/StencilArt.js';
import { SaveData } from '../systems/SaveData.js';

export class CampaignCompleteScene extends Phaser.Scene {
  constructor() { super({ key: 'CampaignCompleteScene' }); }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    const bg = this.add.graphics();
    bg.fillStyle(C.INK_DEEP, 1);
    bg.fillRect(0, 0, width, height);

    // Blaze flash
    const flash = this.add.graphics().setDepth(1);
    flash.fillStyle(C.BLAZE, 0.10);
    flash.fillRect(0, 0, width, height);

    // Starburst lines radiating from centre
    const burst = this.add.graphics().setDepth(2);
    burst.lineStyle(2, C.BLAZE, 0.25);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
      burst.lineBetween(cx, height / 2, cx + Math.cos(a) * 600, height / 2 + Math.sin(a) * 600);
    }

    // Title
    this.add.text(cx, height * 0.24, 'THE SUN IS YOURS', {
      fontFamily: "'Saira Stencil One', sans-serif",
      fontSize: '52px', color: '#efe9dd',
    }).setOrigin(0.5).setDepth(5);

    this.add.text(cx, height * 0.38, 'SOLAR SYSTEM CONQUERED', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '16px', color: '#ff4d17',
      fontStyle: 'bold', letterSpacing: 6,
    }).setOrigin(0.5).setDepth(5);

    // Stats
    const totalCoins = SaveData.getCoins();
    this.add.text(cx, height * 0.50, `TOTAL COINS BANKED: ${totalCoins}`, {
      fontFamily: "'Space Mono', monospace",
      fontSize: '14px', color: 'rgba(239,233,221,0.60)',
    }).setOrigin(0.5).setDepth(5);

    // Replay
    const replay = this.add.text(cx, height * 0.70, 'PLAY AGAIN', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '22px', color: '#efe9dd',
      fontStyle: 'bold', letterSpacing: 5,
    }).setOrigin(0.5).setDepth(5).setInteractive({ useHandCursor: true });
    const replayG = this.add.graphics().setDepth(4);
    replayG.lineStyle(2, C.BONE, 0.70);
    replayG.strokeRect(cx - 130, height * 0.70 - 18, 260, 36);
    replay.on('pointerdown', () => this.scene.start('PlanetSelectScene'));
    replay.on('pointerover',  () => { replay.setColor('#ff4d17'); replayG.clear(); replayG.lineStyle(2, C.BLAZE, 1); replayG.strokeRect(cx - 130, height * 0.70 - 18, 260, 36); });
    replay.on('pointerout',   () => { replay.setColor('#efe9dd'); replayG.clear(); replayG.lineStyle(2, C.BONE, 0.70); replayG.strokeRect(cx - 130, height * 0.70 - 18, 260, 36); });
  }
}
