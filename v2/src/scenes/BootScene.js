// BootScene.js — Minimal boot. Runs SaveData migration then goes to Title.

import { SaveData } from '../systems/SaveData.js';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    // No external image/audio assets — everything procedural.
    // To add real audio later: this.load.audio('laser', 'assets/audio/laser.mp3');
  }

  create() {
    // Init V2 localStorage (namespaced; does not wipe V1).
    SaveData.init();

    if (!this.game.registry.has('muted')) {
      this.game.registry.set('muted', false);
    }
    this.scene.start('TitleScene');
  }
}
