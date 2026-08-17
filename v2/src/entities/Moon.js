// Moon.js — Real moon entities that drift through during the Descent phase.
// Large, slow, high-HP obstacles. Dodge-only in practice (huge HP).
// Sized via radiusRatio relative to the planet data; Ganymede genuinely dwarfs Phobos.
// Baked to a texture so live halftone Graphics don't tank FPS.

import { BALANCE }       from '../data/balance.js';
import { drawMoon }      from '../systems/StencilArt.js';

const BASE_RADIUS = 55;

export class Moon {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} moonData — { id, name, radiusRatio, speedSign, desc }
   * @param {number} spawnY   — vertical position (random in playfield)
   */
  constructor(scene, moonData, spawnY) {
    this.scene    = scene;
    this.data     = moonData;
    this.radius   = Math.max(16, Math.round(BASE_RADIUS * moonData.radiusRatio));
    this.hp       = BALANCE.MOON_HP;
    this.maxHp    = BALANCE.MOON_HP;
    this.score    = BALANCE.SCORE_MOON;
    this.damage   = BALANCE.DAMAGE_MOON;
    this.active   = true;

    this.x = 1280 + this.radius + 20;
    this.y = spawnY;
    const gs = this.scene.planetData?.gameSpeed ?? BALANCE.GAME_SPEED;
    this._vx = BALANCE.MOON_SPEED_PX_S * gs * (moonData.speedSign ?? 1) * -1;

    this._blazeFlashTimer = 0;
    this._blazeFlash      = false;

    const pad = 16;
    const size = Math.ceil(this.radius * 2 + pad * 2);
    const g = scene.make.graphics({ add: false });
    drawMoon(g, size / 2, size / 2, this.radius);
    this._texKey = `moon_${moonData.id}_${this.radius}`;
    if (scene.textures.exists(this._texKey)) scene.textures.remove(this._texKey);
    g.generateTexture(this._texKey, size, size);
    g.destroy();

    this.img = scene.add.image(this.x, this.y, this._texKey).setDepth(4);

    if (this.radius >= 30) {
      this._nameText = this.scene.add.text(
        this.x, this.y - this.radius - 12,
        this.data.name.toUpperCase(),
        { fontFamily: "'Barlow Condensed', sans-serif", fontSize: '11px',
          color: '#efe9dd', letterSpacing: 5, fontStyle: 'bold' }
      ).setOrigin(0.5, 1).setDepth(5);
    }
  }

  update(dt) {
    if (!this.active) return;

    const dtSec = dt / 1000;
    this.x += this._vx * dtSec;

    if (this.data.speedSign === -1) {
      this.x = -this.radius - 20 + Math.abs(this._vx) * (this.scene.time.now / 1000);
    }

    if (this.x < -this.radius - 60 || this.x > 1280 + this.radius + 60) {
      this.destroy();
      return;
    }

    if (this._blazeFlashTimer > 0) {
      this._blazeFlashTimer -= dt;
      this._blazeFlash = true;
    } else {
      this._blazeFlash = false;
    }

    this.img.setPosition(this.x, this.y);
    if (this._nameText) {
      this._nameText.setPosition(this.x, this.y - this.radius - 12);
    }
  }

  hit(damage) {
    if (!this.active) return;
    this.hp -= damage;
    this._blazeFlashTimer = 100;
    if (this.hp <= 0) {
      this.hp = 0;
      this.scene.events.emit('moonDestroyed', this);
      this.destroy();
    }
  }

  overlapsPoint(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    return (dx * dx + dy * dy) <= (this.radius + 16) ** 2;
  }

  destroy() {
    this.active = false;
    try { this.img?.destroy(); } catch {}
    if (this._nameText) this._nameText.destroy();
    if (this._texKey && this.scene?.textures?.exists(this._texKey)) {
      this.scene.textures.remove(this._texKey);
    }
  }
}
