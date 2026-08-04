// GameScene.js — Main gameplay scene.
// Runs through the asteroid phase, then the boss fight.
// Handles all collisions, the HUD, pause menu, touch controls, and particles.

import { BALANCE }         from '../data/balance.js';
import { PLANETS, getPlanetById, getNextPlanet } from '../data/planets.js';
import { WEAPON_IDS }      from '../data/weapons.js';
import { SaveData }        from '../systems/SaveData.js';
import { DifficultyCurve } from '../systems/DifficultyCurve.js';
import { HazardSystem }    from '../systems/HazardSystem.js';
import { AudioSystem }     from '../systems/AudioSystem.js';
import { PlanetBackdrop }  from '../systems/PlanetBackdrop.js';
import { Ship }            from '../entities/Ship.js';
import { Asteroid, ASTEROID_SIZE } from '../entities/Asteroid.js';
import { Boss }            from '../entities/Boss.js';
import { Pickup, PICKUP_TYPE } from '../entities/Pickup.js';

// Internal state machine constants.
const STATE = { PLAYING: 'playing', BOSS: 'boss', WIN: 'win', DEAD: 'dead', PAUSED: 'paused' };

export class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  // ── Receive data from PlanetSelectScene ────────────────────────────────────
  init(data) {
    this.planetData    = getPlanetById(data.planetId) || PLANETS[0];
    this.gameState     = STATE.PLAYING;
    this._prevState    = STATE.PLAYING;
    this.score         = 0;
    this.coinsThisRun  = 0;
    this.elapsed       = 0;   // ms into the asteroid phase
    this._asteroidTimer  = 0;
    this._shakeTimer     = 0;
    this._shakeAmount    = 0;
    this._particles      = [];
    this._bossProjectiles = [];
    this.asteroids     = [];
    this.projectiles   = [];
    this.pickups       = [];
    this.boss          = null;
    this._winDone      = false;
    this._deadDone     = false;

    this.backdrop = null;

    // Phaser reuses this scene instance — clear HUD refs so we never setText on
    // destroyed Text objects from the previous run.
    this._scoreTxt = null;
    this._coinTxt = null;
    this._wepTxt = null;
    this._phaseTxt = null;
    this._shieldTxt = null;
    this._shieldBarG = null;
    this._minimapG = null;
    this._pauseGroup = null;
  }

  // ── Build everything ───────────────────────────────────────────────────────
  create() {
    const { width, height } = this.scale;

    // Ensure audio system exists.
    if (!window.gameAudio) window.gameAudio = new AudioSystem(this);
    this.audio = window.gameAudio;
    this.audio.setMuted(this.game.registry.get('muted') || false);
    this.audio.resume();

    // ── Backdrop (sky, planet globe, atmosphere, tinted stars) ───────────────
    this.backdrop = new PlanetBackdrop(this, this.planetData);

    // ── Hazard system ─────────────────────────────────────────────────────────
    this.hazard = new HazardSystem(this, this.planetData.hazardId, this.planetData.accentColor);

    // ── Ship ─────────────────────────────────────────────────────────────────
    this.ship = new Ship(this);

    // ── Particles graphics layer ─────────────────────────────────────────────
    this._particleG = this.add.graphics().setDepth(11);

    // ── HUD ───────────────────────────────────────────────────────────────────
    this._buildHUD();

    // ── Touch controls ────────────────────────────────────────────────────────
    this._buildTouchControls();

    // ── Pause key ────────────────────────────────────────────────────────────
    this._onPauseEsc = () => this._togglePause();
    this._onPauseP   = () => this._togglePause();
    this.input.keyboard.on('keydown-ESC', this._onPauseEsc);
    this.input.keyboard.on('keydown-P',   this._onPauseP);

    // ── Pause menu (hidden until paused) ──────────────────────────────────────
    this._buildPauseMenu();

    // Clean up shared listeners / entities when leaving this scene (next level without reload).
    this.events.once('shutdown', () => this._shutdown());

    // ── Start music ───────────────────────────────────────────────────────────
    this.audio.startMusic(false);
  }

  /** Tear down input, hazards, and entities so a fresh GameScene can start cleanly. */
  _shutdown() {
    if (this.audio) this.audio.stopMusic();

    if (this.backdrop) {
      this.backdrop.destroy();
      this.backdrop = null;
    }

    if (this.input && this.input.keyboard) {
      if (this._onPauseEsc) this.input.keyboard.off('keydown-ESC', this._onPauseEsc);
      if (this._onPauseP)   this.input.keyboard.off('keydown-P',   this._onPauseP);
    }

    if (this.ship) {
      this.ship.destroy();
      this.ship = null;
    }
    if (this.hazard) {
      this.hazard.destroy();
      this.hazard = null;
    }
    if (this.boss) {
      this.boss.destroy();
      this.boss = null;
    }

    (this.asteroids || []).forEach(a => a.destroy());
    (this.projectiles || []).forEach(p => p.destroy());
    (this.pickups || []).forEach(pk => pk.destroy());
    (this._bossProjectiles || []).forEach(p => { try { p.g.destroy(); } catch (e) {} });

    this.asteroids = [];
    this.projectiles = [];
    this.pickups = [];
    this._bossProjectiles = [];
    this._particles = [];

    if (this.cameras && this.cameras.main) this.cameras.main.setScroll(0, 0);
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  _buildHUD() {
    const { width, height } = this.scale;
    const depth = 20;
    const style = (sz, col = '#00F5FF') => ({
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize:   sz, color: col,
    });

    // Score.
    this._scoreLbl  = this.add.text(16, 12, 'SCORE', style('13px', '#557788')).setDepth(depth);
    this._scoreTxt  = this.add.text(16, 26, '0',     style('22px')).setDepth(depth);

    // Coins this run.
    this._coinLbl   = this.add.text(180, 12, 'COINS', style('13px', '#886600')).setDepth(depth);
    this._coinTxt   = this.add.text(180, 26, '0',     style('22px', '#FFD93D')).setDepth(depth);

    // Weapon indicator.
    this._wepTxt    = this.add.text(340, 26, '',      style('18px', '#FF2EC4')).setDepth(depth);

    // Planet label.
    const accentHex = '#' + this.planetData.accentColor.toString(16).padStart(6, '0');
    this.add.text(width - 14, 12, this.planetData.name.toUpperCase(), style('14px', accentHex))
      .setOrigin(1, 0).setDepth(depth);

    // Shield bar graphics.
    this._shieldBarG = this.add.graphics().setDepth(depth);

    // Mini-map track.
    this._minimapG = this.add.graphics().setDepth(depth);

    // Phase label (shows "BOSS INCOMING!" etc.)
    this._phaseTxt = this.add.text(width / 2, 18, '', style('22px', '#FF2EC4'))
      .setOrigin(0.5, 0).setDepth(depth + 1);

    // Shield HP number (must be created here — never lazy-cache across scene restarts).
    this._shieldTxt = this.add.text(16 + 260 + 8, 56 - 2, '', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '13px', color: '#00E5A0',
    }).setDepth(depth + 1);
  }

  /** True if a Phaser display object is still usable (not destroyed by a prior scene run). */
  _hudAlive(obj) {
    return !!(obj && obj.scene && obj.active !== false && !obj.destroyed);
  }

  _drawHUD() {
    if (!this.ship || !this._hudAlive(this._scoreTxt) || !this._hudAlive(this._shieldTxt)
        || !this._hudAlive(this._shieldBarG) || !this._hudAlive(this._minimapG)) {
      return;
    }

    const { width, height } = this.scale;

    // Score + coins.
    this._scoreTxt.setText(String(this.score));
    this._coinTxt.setText(String(this.coinsThisRun));

    // Weapon name.
    const weaponNames = ['LASER', 'SPREAD', 'MISSILE'];
    this._wepTxt.setText(`[${this.ship.weaponIndex + 1}] ${weaponNames[this.ship.weaponIndex]}`);

    // ── Shield bar ──────────────────────────────────────────────────────────
    const barX = 16, barY = 56, barW = 260, barH = 14;
    const frac  = this.ship.shield / this.ship.maxShield;
    this._shieldBarG.clear();
    // Background.
    this._shieldBarG.fillStyle(0x112233, 0.8);
    this._shieldBarG.fillRect(barX, barY, barW, barH);
    // Fill.
    const shieldCol = frac > 0.5 ? 0x00E5A0 : (frac > 0.25 ? 0xFFD93D : 0xFF2222);
    this._shieldBarG.fillStyle(shieldCol, 0.9);
    this._shieldBarG.fillRect(barX, barY, barW * frac, barH);
    // Border.
    this._shieldBarG.lineStyle(1.5, 0x00E5A0, 0.5);
    this._shieldBarG.strokeRect(barX, barY, barW, barH);

    // ── Mini-map progress track ─────────────────────────────────────────────
    const mmX = width - 220, mmY = 42, mmW = 200, mmH = 12;
    this._minimapG.clear();
    // Track.
    this._minimapG.fillStyle(0x112233, 0.7);
    this._minimapG.fillRect(mmX, mmY, mmW, mmH);
    // Progress fill.
    const prog = this.gameState === STATE.BOSS || this.gameState === STATE.WIN
      ? 1 : Math.min(1, this.elapsed / BALANCE.LEVEL_DURATION);
    this._minimapG.fillStyle(this.planetData.accentColor, 0.6);
    this._minimapG.fillRect(mmX, mmY, mmW * prog, mmH);
    // Ship icon on track.
    const iconX = mmX + mmW * prog;
    this._minimapG.fillStyle(this.ship.skinColor || 0x00F5FF, 1);
    this._minimapG.fillTriangle(iconX, mmY - 2, iconX - 5, mmY + mmH + 2, iconX + 5, mmY + mmH + 2);
    // Boss icon at end.
    this._minimapG.fillStyle(0xFF2EC4, 0.8);
    this._minimapG.fillCircle(mmX + mmW - 2, mmY + mmH / 2, 6);
    // Border.
    this._minimapG.lineStyle(1, 0x336677, 0.6);
    this._minimapG.strokeRect(mmX, mmY, mmW, mmH);

    // Boss HP bar (only during boss fight).
    if (this.gameState === STATE.BOSS && this.boss && this.boss.alive) {
      const bx = width / 2 - 200, by = height - 38, bw = 400, bh = 16;
      this._shieldBarG.fillStyle(0x110000, 0.8);
      this._shieldBarG.fillRect(bx, by, bw, bh);
      const bhp = this.boss.hp / this.boss.maxHp;
      this._shieldBarG.fillStyle(0xFF2EC4, 0.9);
      this._shieldBarG.fillRect(bx, by, bw * bhp, bh);
      this._shieldBarG.lineStyle(1.5, 0xFF2EC4, 0.6);
      this._shieldBarG.strokeRect(bx, by, bw, bh);
      if (this._hudAlive(this._phaseTxt)) {
        this._phaseTxt.setText(this.boss.state === 'phase2' ? '⚠ PHASE 2' : '');
      }
    }

    this._shieldTxt.setText(`${Math.ceil(this.ship.shield)}/${this.ship.maxShield}`);
  }

  // ── Touch Controls ─────────────────────────────────────────────────────────

  _buildTouchControls() {
    const { width, height } = this.scale;
    const depth = 22;

    // Fire button — large circle bottom-right.
    const fbX = width - 75, fbY = height - 75;
    const fireG = this.add.graphics().setDepth(depth);
    const drawFireBtn = (pressed) => {
      fireG.clear();
      fireG.fillStyle(0x00F5FF, pressed ? 0.45 : 0.20);
      fireG.fillCircle(fbX, fbY, 46);
      fireG.lineStyle(2.5, 0x00F5FF, pressed ? 1 : 0.55);
      fireG.strokeCircle(fbX, fbY, 46);
    };
    drawFireBtn(false);
    this.add.text(fbX, fbY, 'FIRE', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '14px', color: '#00F5FF',
    }).setOrigin(0.5).setDepth(depth + 1);

    // Interactive zone.
    const fireZone = this.add.circle(fbX, fbY, 46, 0, 0).setDepth(depth + 2).setInteractive();
    fireZone.on('pointerdown', () => { drawFireBtn(true);  if (this.ship) this.ship.setTouchFire(true);  });
    fireZone.on('pointerup',   () => { drawFireBtn(false); if (this.ship) this.ship.setTouchFire(false); });
    fireZone.on('pointerout',  () => { drawFireBtn(false); if (this.ship) this.ship.setTouchFire(false); });

    // Weapon switch buttons — 1, 2, 3 — bottom left area.
    const wLabels = ['LAS', 'PLM', 'MSL'];
    const wColors = [0x00F5FF, 0xFF2EC4, 0xFFD93D];
    wLabels.forEach((label, i) => {
      const bx = 68 + i * 72, by = height - 62;
      const wg  = this.add.graphics().setDepth(depth);
      wg.fillStyle(wColors[i], 0.20);
      wg.fillRoundedRect(bx - 28, by - 22, 56, 44, 6);
      wg.lineStyle(1.5, wColors[i], 0.55);
      wg.strokeRoundedRect(bx - 28, by - 22, 56, 44, 6);
      this.add.text(bx, by - 6, String(i + 1), {
        fontFamily: "'Orbitron', 'Courier New', monospace",
        fontSize: '16px', color: '#' + wColors[i].toString(16).padStart(6, '0'),
      }).setOrigin(0.5).setDepth(depth + 1);
      this.add.text(bx, by + 10, label, {
        fontFamily: "'Orbitron', 'Courier New', monospace",
        fontSize: '11px', color: '#' + wColors[i].toString(16).padStart(6, '0'),
      }).setOrigin(0.5).setDepth(depth + 1);

      const zone = this.add.rectangle(bx, by, 56, 44, 0, 0)
        .setDepth(depth + 2).setInteractive();
      zone.on('pointerdown', () => { if (this.ship) this.ship.setWeapon(i); });
    });

    // Pause button — top-right corner.
    const pauseBtn = this.add.text(width - 16, 8, '⏸', {
      fontSize: '24px',
    }).setOrigin(1, 0).setDepth(depth + 2).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', () => this._togglePause());
  }

  // ── Pause Menu ─────────────────────────────────────────────────────────────

  _buildPauseMenu() {
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;
    const depth = 30;

    // Overlay.
    const overlay = this.add.rectangle(0, 0, width, height, 0x000011, 0.72).setOrigin(0).setDepth(depth);
    const panel   = this.add.graphics().setDepth(depth + 1);
    panel.fillStyle(0x050A1A, 0.95);
    panel.fillRoundedRect(cx - 180, cy - 160, 360, 320, 12);
    panel.lineStyle(2, 0x00F5FF, 0.5);
    panel.strokeRoundedRect(cx - 180, cy - 160, 360, 320, 12);

    const title = this.add.text(cx, cy - 125, 'PAUSED', {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '32px', color: '#00F5FF',
    }).setOrigin(0.5).setDepth(depth + 2);

    const btnStyle = (col) => ({
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '20px', color: col,
    });

    const resume  = this.add.text(cx, cy - 55, 'RESUME',        btnStyle('#00F5FF')).setOrigin(0.5).setDepth(depth + 2).setInteractive({ useHandCursor: true });
    const restart = this.add.text(cx, cy + 0,  'RESTART LEVEL', btnStyle('#FF2EC4')).setOrigin(0.5).setDepth(depth + 2).setInteractive({ useHandCursor: true });
    const mute    = this.add.text(cx, cy + 55, '',               btnStyle('#FFD93D')).setOrigin(0.5).setDepth(depth + 2).setInteractive({ useHandCursor: true });
    const menu    = this.add.text(cx, cy + 110,'PLANET SELECT',  btnStyle('#88AABB')).setOrigin(0.5).setDepth(depth + 2).setInteractive({ useHandCursor: true });

    const updateMuteLabel = () => {
      const m = this.game.registry.get('muted') || false;
      mute.setText(m ? 'SOUND: OFF' : 'SOUND: ON');
    };
    updateMuteLabel();

    resume.on('pointerdown',  () => this._togglePause());
    restart.on('pointerdown', () => {
      this.audio.stopMusic();
      this.scene.restart({ planetId: this.planetData.id });
    });
    mute.on('pointerdown', () => {
      const m = !this.game.registry.get('muted');
      this.game.registry.set('muted', m);
      if (this.audio) this.audio.setMuted(m);
      updateMuteLabel();
    });
    menu.on('pointerdown', () => {
      this.audio.stopMusic();
      this.scene.start('PlanetSelectScene');
    });

    this._pauseGroup = [overlay, panel, title, resume, restart, mute, menu];
    this._pauseGroup.forEach(o => o.setVisible(false));
  }

  _togglePause() {
    if (this.gameState === STATE.WIN || this.gameState === STATE.DEAD) return;
    if (this.gameState === STATE.PAUSED) {
      this.gameState = this._prevState;
      this._pauseGroup.forEach(o => o.setVisible(false));
      this.audio.startMusic(this.gameState === STATE.BOSS);
    } else {
      this._prevState = this.gameState;
      this.gameState  = STATE.PAUSED;
      this._pauseGroup.forEach(o => o.setVisible(true));
      this.audio.stopMusic();
    }
  }

  // ── Main game loop ─────────────────────────────────────────────────────────

  update(time, delta) {
    if (this.gameState === STATE.PAUSED) return;

    const { width, height } = this.scale;
    const dt = delta / 1000;

    // Scroll backdrop (stars + planet parallax).
    if (this.backdrop) this.backdrop.update(delta);

    // Screen shake countdown.
    if (this._shakeTimer > 0) {
      this._shakeTimer -= delta;
      const dx = Phaser.Math.Between(-this._shakeAmount, this._shakeAmount);
      const dy = Phaser.Math.Between(-this._shakeAmount, this._shakeAmount);
      this.cameras.main.setScroll(dx, dy);
    } else {
      this.cameras.main.setScroll(0, 0);
    }

    switch (this.gameState) {
      case STATE.PLAYING: this._updatePlaying(delta, dt); break;
      case STATE.BOSS:    this._updateBoss(delta, dt);    break;
      case STATE.WIN:
      case STATE.DEAD:    /* handled by timed transitions below */ break;
    }

    this._updateParticles(dt);
    if (this.ship && (this.ship.alive || this.gameState === STATE.WIN)) this._drawHUD();
  }

  // ── Asteroid phase ─────────────────────────────────────────────────────────

  _updatePlaying(delta, dt) {
    this.elapsed += delta;

    // Hazard update and forces.
    this.hazard.update(delta);
    const rawForces = this.ship.alive
      ? this.hazard.getForces(this.ship.x, this.ship.y)
      : { x: 0, y: 0, speedMult: 1 };

    // Green Scout's Evade Protocol reduces hazard push forces.
    const resist = this.ship.hazardResistance || 0;
    const forces = {
      x:         rawForces.x * (1 - resist),
      y:         rawForces.y * (1 - resist),
      speedMult: rawForces.speedMult,
    };

    // Apply solar-flare damage.
    if (this.hazard.hazardId === 'solarFlare' && this.hazard.isShipInFlare(this.ship.y)) {
      if (this.ship.takeDamage(22 * dt)) {
        this.audio.playShieldHit();
      }
    }

    // Ship movement and firing.
    this.ship.update(delta, this.projectiles, this.audio, forces);

    // Asteroid spawning via difficulty curve.
    this._asteroidTimer -= delta;
    if (this._asteroidTimer <= 0) {
      this._asteroidTimer = DifficultyCurve.getSpawnInterval(this.planetData.index, this.elapsed);
      this._spawnAsteroid();
    }

    // Extra cluster spawning (Earth / Saturn).
    if (this.hazard.shouldSpawnCluster && this.hazard.shouldSpawnCluster(delta)) {
      for (let i = 0; i < 4; i++) this._spawnAsteroid(true);
    }
    if (this.hazard.shouldSpawnRingAsteroid && this.hazard.shouldSpawnRingAsteroid(delta)) {
      const { width } = this.scale;
      const bandY = this.hazard.getRingBandY();
      const speed = DifficultyCurve.getAsteroidSpeed(this.planetData.index, this.elapsed) * 1.5;
      this.asteroids.push(new Asteroid(this, width + 20, bandY + Phaser.Math.Between(-40, 40), ASTEROID_SIZE.SMALL, speed));
    }

    // Update entities.
    this.asteroids.forEach(a => a.update(delta));
    this.projectiles.forEach(p => p.update(delta, this._nearestEnemy(p.x, p.y)));
    this.pickups.forEach(pk => pk.update(delta));

    // Collisions.
    this._checkProjectileAsteroidCollisions();
    this._checkShipAsteroidCollisions();
    this._checkShipPickupCollisions();

    // Prune dead objects.
    this.asteroids   = this.asteroids.filter(a  => a.alive);
    this.projectiles = this.projectiles.filter(p => p.alive);
    this.pickups     = this.pickups.filter(pk => pk.alive);

    // Ship dead?
    if (!this.ship.alive) { this._onDeath(); return; }

    // Level complete — transition to boss.
    if (this.elapsed >= BALANCE.LEVEL_DURATION) {
      this._startBoss();
    }
  }

  _spawnAsteroid(forceSmall = false) {
    const { width, height } = this.scale;
    const speed = DifficultyCurve.getAsteroidSpeed(this.planetData.index, this.elapsed);
    const sizes  = forceSmall ? [ASTEROID_SIZE.SMALL] : [ASTEROID_SIZE.SMALL, ASTEROID_SIZE.SMALL, ASTEROID_SIZE.MEDIUM, ASTEROID_SIZE.LARGE];
    const size   = sizes[Phaser.Math.Between(0, sizes.length - 1)];
    const y      = Phaser.Math.Between(30, height - 30);
    this.asteroids.push(new Asteroid(this, width + 30, y, size, speed));
  }

  // ── Boss phase ─────────────────────────────────────────────────────────────

  _startBoss() {
    this.gameState = STATE.BOSS;
    // Clear remaining asteroids gracefully.
    this.asteroids.forEach(a => a.destroy());
    this.asteroids = [];
    this._phaseTxt.setText('BOSS INCOMING!');
    this.time.delayedCall(1800, () => this._phaseTxt.setText(''));
    // Switch music.
    this.audio.startMusic(true);
    // Spawn the boss.
    this.boss = new Boss(this, this.planetData);
  }

  _updateBoss(delta, dt) {
    // Ship movement.
    const rawForces = this.ship.alive
      ? this.hazard.getForces(this.ship.x, this.ship.y)
      : { x: 0, y: 0, speedMult: 1 };
    const resist2 = this.ship.hazardResistance || 0;
    const forces = {
      x:         rawForces.x * (1 - resist2),
      y:         rawForces.y * (1 - resist2),
      speedMult: rawForces.speedMult,
    };
    this.hazard.update(delta);
    this.ship.update(delta, this.projectiles, this.audio, forces);

    // Boss update — passes a callback to spawn boss projectiles.
    this.boss.update(delta, (projData) => {
      this._bossProjectiles.push({
        x: projData.x, y: projData.y,
        vx: projData.vx, vy: projData.vy,
        damage: projData.damage,
        color: projData.color,
        r: projData.r || 7,
        alive: true,
        g: this._makeBossProjG(projData),
      });
    }, this.audio, this.ship);

    // Move boss projectiles.
    this._bossProjectiles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.g.x = p.x;
      p.g.y = p.y;
      const { width, height } = this.scale;
      if (p.x < -40 || p.x > width + 40 || p.y < -40 || p.y > height + 40) {
        p.alive = false;
        p.g.destroy();
      }
    });

    // Update player projectiles.
    this.projectiles.forEach(p => p.update(delta, this.boss.alive ? this.boss : null));

    // Collisions.
    this._checkProjectileBossCollisions();
    this._checkBossProjShipCollisions();

    // Prune.
    this.projectiles      = this.projectiles.filter(p => p.alive);
    this._bossProjectiles = this._bossProjectiles.filter(p => p.alive);

    // Ship dead?
    if (!this.ship.alive) { this._onDeath(); return; }

    // Boss dead?
    if (!this.boss.alive && this.gameState !== STATE.WIN) {
      this._onBossDefeated();
    }
  }

  _makeBossProjG(data) {
    const g = this.add.graphics().setDepth(8);
    g.fillStyle(data.color, 0.35);
    g.fillCircle(0, 0, (data.r || 7) + 4);
    g.fillStyle(data.color, 0.92);
    g.fillCircle(0, 0, data.r || 7);
    g.x = data.x;
    g.y = data.y;
    return g;
  }

  // ── Target helper for homing missiles ─────────────────────────────────────

  _nearestEnemy(x, y) {
    // During boss phase, home to the boss.
    if (this.gameState === STATE.BOSS && this.boss && this.boss.alive) return this.boss;
    // During asteroid phase, find the nearest asteroid.
    let best = null, bestDist = Infinity;
    this.asteroids.forEach(a => {
      const dx = a.x - x, dy = a.y - y;
      const d  = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = a; }
    });
    return best;
  }

  // ── Collision helpers ──────────────────────────────────────────────────────

  _checkProjectileAsteroidCollisions() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.alive) continue;
      const pb = p.getBounds();
      for (let j = this.asteroids.length - 1; j >= 0; j--) {
        const a = this.asteroids[j];
        if (!a.alive) continue;
        const ab = a.getBounds();
        if (_circles(pb, ab)) {
          const dead = a.takeDamage(p.damage);
          p.destroy();
          if (dead) {
            this.score += a.cfg.score;
            this.spawnExplosion(a.x, a.y, a.cfg.radius, a.size === ASTEROID_SIZE.LARGE);
            if (a.size === ASTEROID_SIZE.LARGE) this.audio.playExplosionLarge();
            else this.audio.playExplosionSmall();
            const children = a.explode((dropX, dropY) => this._maybeDropPickup(dropX, dropY));
            children.forEach(c => this.asteroids.push(c));
          }
          break;
        }
      }
    }
  }

  _checkShipAsteroidCollisions() {
    if (!this.ship.alive) return;
    const sb = { x: this.ship.x, y: this.ship.y, r: 16 };
    for (let j = this.asteroids.length - 1; j >= 0; j--) {
      const a = this.asteroids[j];
      if (!a.alive) continue;
      if (_circles(sb, a.getBounds())) {
        if (this.ship.takeDamage(a.cfg.damage)) {
          this.audio.playShieldHit();
          this.audio.playExplosionSmall();
          this._shake(4, 200);
          this.spawnExplosion(a.x, a.y, a.cfg.radius, false);
          a.explode(null);   // asteroid is consumed on collision
          this.asteroids.splice(j, 1);
        }
        break;
      }
    }
  }

  _checkShipPickupCollisions() {
    if (!this.ship.alive) return;
    const sb = { x: this.ship.x, y: this.ship.y, r: 24 };
    for (let k = this.pickups.length - 1; k >= 0; k--) {
      const pk = this.pickups[k];
      if (!pk.alive) continue;
      if (_circles(sb, pk.getBounds())) {
        this._collectPickup(pk);
        pk.destroy();
      }
    }
  }

  _checkProjectileBossCollisions() {
    if (!this.boss || !this.boss.alive) return;
    const bb = this.boss.getBounds();
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.alive) continue;
      if (_circles(p.getBounds(), bb)) {
        p.destroy();
        this.boss.takeDamage(p.damage);
        this.spawnExplosion(p.x, p.y, 8, false);
      }
    }
  }

  _checkBossProjShipCollisions() {
    if (!this.ship.alive) return;
    const sb = { x: this.ship.x, y: this.ship.y, r: 16 };
    for (let i = this._bossProjectiles.length - 1; i >= 0; i--) {
      const p = this._bossProjectiles[i];
      if (!p.alive) continue;
      if (_circles(sb, { x: p.x, y: p.y, r: p.r })) {
        if (this.ship.takeDamage(p.damage)) {
          this.audio.playShieldHit();
          this._shake(5, 220);
        }
        p.alive = false;
        p.g.destroy();
      }
    }
  }

  // ── Pickups ────────────────────────────────────────────────────────────────

  _maybeDropPickup(x, y) {
    const r = Math.random();
    if (r < BALANCE.GEM_DROP_CHANCE) {
      this.pickups.push(new Pickup(this, x, y, PICKUP_TYPE.GEM));
    } else if (r < BALANCE.COIN_DROP_CHANCE) {
      this.pickups.push(new Pickup(this, x, y, PICKUP_TYPE.COIN));
    } else if (r < BALANCE.COIN_DROP_CHANCE + BALANCE.POWERUP_DROP_CHANCE) {
      // Pick a random power-up.
      const types = [PICKUP_TYPE.SHIELD, PICKUP_TYPE.WEAPON_TOKEN];
      this.pickups.push(new Pickup(this, x, y, types[Phaser.Math.Between(0, 1)]));
    }
  }

  _collectPickup(pk) {
    switch (pk.type) {
      case PICKUP_TYPE.COIN:
        this.coinsThisRun += BALANCE.COIN_VALUE;
        this.score        += 5;
        this.audio.playCoinPickup();
        this._floatText(pk.x, pk.y, '+1', '#FFD93D');
        break;
      case PICKUP_TYPE.GEM:
        this.coinsThisRun += BALANCE.GEM_VALUE;
        this.score        += 15;
        this.audio.playGemPickup();
        this._floatText(pk.x, pk.y, `+${BALANCE.GEM_VALUE}`, '#FF9F43');
        break;
      case PICKUP_TYPE.SHIELD:
        this.ship.addShield(BALANCE.SHIELD_BOOST_AMOUNT);
        this.audio.playPowerUpPickup();
        this._floatText(pk.x, pk.y, `SHIELD +${BALANCE.SHIELD_BOOST_AMOUNT}`, '#00E5A0');
        break;
      case PICKUP_TYPE.WEAPON_TOKEN:
        this.ship.activateWeaponToken();
        this.audio.playPowerUpPickup();
        this._floatText(pk.x, pk.y, 'POWER UP!', '#FF6B35');
        break;
    }
  }

  // ── Outcomes ───────────────────────────────────────────────────────────────

  _onDeath() {
    if (this._deadDone) return;
    this._deadDone  = true;
    this.gameState  = STATE.DEAD;

    this.audio.stopMusic();
    this.audio.playLevelLose();
    this._shake(10, 500);

    // Bank coins even on death (kid-friendly).
    SaveData.addCoins(this.coinsThisRun);
    SaveData.maybeUpdateHighScore(this.score);

    this.spawnExplosion(this.ship.x, this.ship.y, 40, true);

    this.time.delayedCall(1800, () => {
      this.audio.stopMusic();
      this.scene.start('GameOverScene', {
        planetId:    this.planetData.id,
        score:       this.score,
        coinsEarned: this.coinsThisRun,
      });
    });
  }

  _onBossDefeated() {
    if (this._winDone) return;
    this._winDone  = true;
    this.gameState = STATE.WIN;

    this.audio.stopMusic();
    this.audio.playLevelWin();

    // Big explosion on boss position.
    if (this.boss) this.spawnExplosion(this.boss.x, this.boss.y, 80, true);

    // Score: base + survival bonus.
    const shieldFrac   = this.ship.shield / this.ship.maxShield;
    const survivalBonus = Math.round(shieldFrac * BALANCE.SCORE_BOSS_SURVIVAL_BONUS);
    this.score += BALANCE.SCORE_BOSS + survivalBonus;

    // Persist.
    SaveData.addCoins(this.coinsThisRun);
    SaveData.maybeUpdateHighScore(this.score);
    const next = getNextPlanet(this.planetData.id);
    if (next) SaveData.unlockPlanet(next.id);

    this.time.delayedCall(2200, () => {
      this.scene.start('VictoryScene', {
        planetId:    this.planetData.id,
        score:       this.score,
        coinsEarned: this.coinsThisRun,
        nextPlanetId: next ? next.id : null,
      });
    });
  }

  // ── Particles ──────────────────────────────────────────────────────────────

  /**
   * Spawn a burst of explosion particles.
   * @param {number}  x
   * @param {number}  y
   * @param {number}  radius   controls burst spread
   * @param {boolean} big      large = more particles and longer life
   */
  spawnExplosion(x, y, radius, big) {
    const count    = big ? 30 : 12;
    const baseLife = big ? 0.9 : 0.5;
    const colors   = [0xFF6B35, 0xFFD93D, 0xFF2EC4, 0xFFFFFF];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.FloatBetween(30, radius * 3.5);
      this._particles.push({
        x, y,
        vx:     Math.cos(angle) * speed,
        vy:     Math.sin(angle) * speed,
        age:    0,
        maxAge: baseLife * Phaser.Math.FloatBetween(0.5, 1.4),
        color:  colors[Phaser.Math.Between(0, colors.length - 1)],
        size:   Phaser.Math.FloatBetween(2, big ? 8 : 4),
      });
    }
  }

  _updateParticles(dt) {
    this._particleG.clear();
    this._particles = this._particles.filter(p => {
      p.age += dt;
      if (p.age >= p.maxAge) return false;
      const t = 1 - p.age / p.maxAge;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
      this._particleG.fillStyle(p.color, t * 0.9);
      this._particleG.fillCircle(p.x, p.y, p.size * t);
      return true;
    });
  }

  // ── Floating text popups ───────────────────────────────────────────────────

  _floatText(x, y, str, color = '#FFFFFF') {
    const t = this.add.text(x, y, str, {
      fontFamily: "'Orbitron', 'Courier New', monospace",
      fontSize: '16px', color,
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({
      targets: t, y: y - 50, alpha: 0, duration: 1100, ease: 'Cubic.Out',
      onComplete: () => t.destroy(),
    });
  }

  // ── Screen shake ────────────────────────────────────────────────────────────

  _shake(amount, duration) {
    this._shakeAmount = amount;
    this._shakeTimer  = duration;
  }
}

/** Circle–circle overlap test. */
function _circles(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy) < (a.r + b.r);
}
