// LevelLoseScene.js — Shield depleted. Coins kept. Retry or quit.

import { C } from '../systems/StencilArt.js';

export class LevelLoseScene extends Phaser.Scene {
  constructor() { super({ key: 'LevelLoseScene' }); }

  init(data) { this._planetId = data.planetId; }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    const bg = this.add.graphics();
    bg.fillStyle(C.INK, 1);
    bg.fillRect(0, 0, width, height);

    this.add.text(cx, height * 0.25, 'SHIELD DEPLETED', {
      fontFamily: "'Saira Stencil One', sans-serif",
      fontSize: '40px', color: '#ff4d17',
    }).setOrigin(0.5);

    this.add.text(cx, height * 0.40, 'Coins from this run have been banked.', {
      fontFamily: "'Space Mono', monospace",
      fontSize: '12px', color: 'rgba(239,233,221,0.60)',
    }).setOrigin(0.5);

    this._addButton(cx, height * 0.58, 'TRY AGAIN', () => this.scene.start('GameScene', { planetId: this._planetId }));
    this._addButton(cx, height * 0.70, 'PLANET SELECT', () => this.scene.start('PlanetSelectScene'));
  }

  _addButton(x, y, label, cb) {
    const g = this.add.graphics();
    g.lineStyle(2, C.BONE, 0.70);
    g.strokeRect(x - 140, y - 18, 280, 36);
    const txt = this.add.text(x, y, label, {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '20px', color: '#efe9dd',
      fontStyle: 'bold', letterSpacing: 5,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    txt.on('pointerdown', cb);
    txt.on('pointerover',  () => { txt.setColor('#ff4d17'); g.clear(); g.lineStyle(2, C.BLAZE, 1); g.strokeRect(x - 140, y - 18, 280, 36); });
    txt.on('pointerout',   () => { txt.setColor('#efe9dd'); g.clear(); g.lineStyle(2, C.BONE, 0.70); g.strokeRect(x - 140, y - 18, 280, 36); });
  }
}
