// BootScene.js — Minimal boot / preload scene.
// Sets up any global game config and immediately transitions to the Title screen.

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // No external assets to load — everything is drawn procedurally.
    // If you want to add real audio files later, load them here:
    //   this.load.audio('laser', 'assets/audio/laser.mp3');
    //   this.load.audio('explosion', 'assets/audio/explosion.mp3');
    //   etc. — see README for the full list.
  }

  create() {
    // Store a global mute preference (false = sound on).
    if (!this.game.registry.has('muted')) {
      this.game.registry.set('muted', false);
    }
    this.scene.start('TitleScene');
  }
}
