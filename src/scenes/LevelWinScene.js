// LevelWinScene.js — Planet conquered. Shows score vs personal best, next destination unlocked.
// Stencil Riso.

import { C } from '../systems/StencilArt.js';
import { SaveData } from '../systems/SaveData.js';

export class LevelWinScene extends Phaser.Scene {
  constructor() { super({ key: 'LevelWinScene' }); }

  init(data) {
    this._score  = data.score  || 0;
    this._coins  = data.coins  || 0;
    this._nextId = data.nextId || null;
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    const bg = this.add.graphics();
    bg.fillStyle(C.INK, 1);
    bg.fillRect(0, 0, width, height);

    this.add.text(cx, height * 0.25, 'CONQUERED', {
      fontFamily: "'Saira Stencil One', sans-serif",
      fontSize: '52px', color: '#efe9dd',
    }).setOrigin(0.5);

    this.add.text(cx, height * 0.38, `SCORE  ${this._score}`, {
      fontFamily: "'Saira Stencil One', sans-serif",
      fontSize: '32px', color: '#efe9dd',
      shadow: { x: 3, y: 3, color: '#ff4d17', blur: 0, fill: true },
    }).setOrigin(0.5);

    this.add.text(cx, height * 0.48, `COINS EARNED  ${this._coins}`, {
      fontFamily: "'Space Mono', monospace",
      fontSize: '14px', color: 'rgba(239,233,221,0.70)',
    }).setOrigin(0.5);

    if (this._nextId) {
      const nextName = this._nextId.charAt(0).toUpperCase() + this._nextId.slice(1);
      this.add.text(cx, height * 0.60, `${nextName.toUpperCase()} UNLOCKED`, {
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '16px', color: '#ff4d17',
        fontStyle: 'bold', letterSpacing: 6,
      }).setOrigin(0.5);
    }

    this._addButton(cx, height * 0.74, 'CONTINUE', () => this.scene.start('PlanetSelectScene'));
    this._addButton(cx, height * 0.84, 'PLAY AGAIN', () => this.scene.start('GameScene', { planetId: this._planetId }));
  }

  _addButton(x, y, label, cb) {
    const g = this.add.graphics();
    g.lineStyle(2, C.BONE, 0.70);
    g.strokeRect(x - 130, y - 18, 260, 36);
    const txt = this.add.text(x, y, label, {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '20px', color: '#efe9dd',
      fontStyle: 'bold', letterSpacing: 5,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    txt.on('pointerdown', cb);
    txt.on('pointerover',  () => { txt.setColor('#ff4d17'); g.clear(); g.lineStyle(2, C.BLAZE, 1); g.strokeRect(x - 130, y - 18, 260, 36); });
    txt.on('pointerout',   () => { txt.setColor('#efe9dd'); g.clear(); g.lineStyle(2, C.BONE, 0.70); g.strokeRect(x - 130, y - 18, 260, 36); });
  }
}
