// GameOverScene.js — Shown when the ship's shield reaches zero.
// Coins collected during the failed run are kept (kid-friendly).

export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  init(data) {
    this.planetId    = data.planetId    || 'mercury';
    this.score       = data.score       || 0;
    this.coinsEarned = data.coinsEarned || 0;
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;

    // Dark background.
    this.add.rectangle(0, 0, width, height, 0x02000A).setOrigin(0);

    // Red vignette edge.
    const vigG = this.add.graphics().setDepth(0);
    for (let i = 0; i < 8; i++) {
      vigG.lineStyle(22 - i * 2.5, 0xFF0000, 0.06 - i * 0.006);
      vigG.strokeRect(0, 0, width, height);
    }

    // ── "SHIELD DEPLETED" header ─────────────────────────────────────────────
    this.add.text(cx, cy - 145, 'SHIELD', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '72px', color: '#FF2222',
      stroke: '#330000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(2);

    this.add.text(cx, cy - 70, 'DEPLETED', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '50px', color: '#FF6644',
      stroke: '#330000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2);

    // ── Stats ────────────────────────────────────────────────────────────────
    this.add.text(cx, cy + 15, `Score: ${this.score}`, {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '26px', color: '#AABBCC',
    }).setOrigin(0.5).setDepth(2);

    this.add.text(cx, cy + 52, `Coins banked: ${this.coinsEarned}  ✓ kept`, {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '18px', color: '#FFD93D',
    }).setOrigin(0.5).setDepth(2);

    // ── Buttons ──────────────────────────────────────────────────────────────
    this._makeButton(cx, cy + 116, 'TRY AGAIN', 0x00F5FF, () => {
      this.scene.start('GameScene', { planetId: this.planetId });
    });
    this._makeButton(cx, cy + 178, 'PLANET SELECT', 0xFF2EC4, () => {
      this.scene.start('PlanetSelectScene');
    });
  }

  _makeButton(x, y, label, color, cb) {
    const hexStr = '#' + color.toString(16).padStart(6, '0');
    const bg = this.add.graphics().setDepth(3);
    const draw = (h) => {
      bg.clear();
      bg.fillStyle(h ? color : 0x0A0010, h ? 0.3 : 0.75);
      bg.fillRoundedRect(x - 150, y - 26, 300, 52, 8);
      bg.lineStyle(2, color, 0.9);
      bg.strokeRoundedRect(x - 150, y - 26, 300, 52, 8);
    };
    draw(false);
    const txt = this.add.text(x, y, label, {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '22px', color: hexStr,
    }).setOrigin(0.5).setDepth(4).setInteractive({ useHandCursor: true });
    txt.on('pointerover',  () => draw(true));
    txt.on('pointerout',   () => draw(false));
    txt.on('pointerdown',  () => { if (window.gameAudio) window.gameAudio.playUIClick(); cb(); });
  }
}
