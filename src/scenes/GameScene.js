// GameScene.js — Main gameplay for Solar Blaster V2.
// Seamlessly runs three phases via PhaseManager: Approach → Descent → Conquest.
// HUD matches hud.html (Stencil Riso layout).
// Ship delegates weapons/reload to WeaponSystem.

import { BALANCE }          from '../data/balance.js';
import { PLANETS, getPlanet } from '../data/planets.js';
import { SaveData }          from '../systems/SaveData.js';
import { DifficultyCurve }   from '../systems/DifficultyCurve.js';
import { HazardSystem }      from '../systems/HazardSystem.js';
import { AudioSystem }       from '../systems/AudioSystem.js';
import { PhaseManager, PHASE } from '../systems/PhaseManager.js';
import { Ship }              from '../entities/Ship.js';
import { Asteroid, ASTEROID_SIZE } from '../entities/Asteroid.js';
import { Moon }              from '../entities/Moon.js';
import { Boss }              from '../entities/Boss.js';
import { Pickup, PICKUP_TYPE } from '../entities/Pickup.js';
import { Projectile }        from '../entities/Projectile.js';
import {
  C, drawPlanet, drawHullBar, drawApproachMeter, drawPlate,
  drawPickupCoin, drawPickupGem, drawPickupShield, drawPickupAmmo, drawPickupRapidFire,
} from '../systems/StencilArt.js';

const STATE = { PLAYING: 'playing', WIN: 'win', DEAD: 'dead', PAUSED: 'paused' };

export class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  // ── Init ────────────────────────────────────────────────────────────────────

  init(data) {
    this.planetData      = getPlanet(data.planetId) || PLANETS[0];
    this.gameState       = STATE.PLAYING;
    this.score           = 0;
    this.coinsThisRun    = 0;
    this._asteroidTimer  = 0;
    this._shakeTimer     = 0;
    this._shakeAmt       = 0;
    this._winDone        = false;
    this._deadDone       = false;

    this.asteroids    = [];
    this.projectiles  = [];
    this.pickups      = [];
    this.moons        = [];
    this.boss         = null;
    this._bossProj    = [];
    this._particles   = [];

    // HUD display objects (cleared between runs)
    this._hudG      = null;
    this._scoreTxt  = null;
    this._coinTxt   = null;
    this._wepChip   = null;
    this._ammoTxt   = null;
    this._reloadTxt = null;
    this._distTxt   = null;
    this._shieldTxt = null;
    this._planetNameTxt = null;
    this._bossHpG   = null;
    this._pauseGroup = null;
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  create() {
    const { width, height } = this.scale;

    // Audio
    if (!window.gameAudio) window.gameAudio = new AudioSystem(this);
    this.audio = window.gameAudio;
    this.audio.setMuted(this.game.registry.get('muted') || false);
    this.audio.resume();

    // ── Planet backdrop graphics layer (behind everything) ───────────────────
    this._backdropG = this.add.graphics().setDepth(1);

    // ── Starfield (ink ground + paper grain) ─────────────────────────────────
    this._buildStarfield();

    // ── Phase manager ─────────────────────────────────────────────────────────
    this.phases = new PhaseManager(this, this.planetData);

    // ── Hazard ────────────────────────────────────────────────────────────────
    this.hazard = new HazardSystem(this, this.planetData.hazardId, 0);

    // ── Difficulty curve ──────────────────────────────────────────────────────
    this.difficulty = new DifficultyCurve(this.planetData.index, this.planetData.gameSpeed);

    // ── Ship ──────────────────────────────────────────────────────────────────
    this.ship = new Ship(this);

    // ── Ship events ───────────────────────────────────────────────────────────
    this.events.on('shipDestroyed', this._onShipDestroyed, this);
    this.events.on('conquestComplete', this._onConquestComplete, this);

    // ── HUD ───────────────────────────────────────────────────────────────────
    this._buildHUD();

    // ── Touch controls ────────────────────────────────────────────────────────
    this._buildTouchControls();

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    this._onPause = () => this._togglePause();
    this.input.keyboard.on('keydown-ESC', this._onPause);
    this.input.keyboard.on('keydown-P',   this._onPause);

    // ── Pause menu ────────────────────────────────────────────────────────────
    this._buildPauseMenu();

    this.events.once('shutdown', () => this._shutdown());

    this.audio.startMusic(false);
  }

  // ── Starfield ────────────────────────────────────────────────────────────────

  _buildStarfield() {
    const { width, height } = this.scale;

    const g = this.add.graphics().setDepth(0);

    // Ink ground
    g.fillStyle(C.INK, 1);
    g.fillRect(0, 0, width, height);

    // Bone paper grain dots (7px pitch, very faint)
    g.fillStyle(C.BONE, 0.12);
    for (let y = 0; y < height; y += 7) {
      for (let x = 0; x < width; x += 7) {
        g.fillCircle(x + 1, y + 1, 1);
      }
    }

    // A few brighter star points
    g.fillStyle(C.BONE, 0.55);
    const rng = Phaser.Math.RND;
    for (let i = 0; i < 40; i++) {
      g.fillCircle(rng.integerInRange(0, width), rng.integerInRange(0, height), 1.2);
    }
  }

  // ── HUD ─────────────────────────────────────────────────────────────────────
  // Layout matches hud.html: top-left cluster, top-right plate, bottom-left hull.

  _buildHUD() {
    const { width, height } = this.scale;
    const D = 20;
    const lbl = (x, y, t) => this.add.text(x, y, t, {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '11px', color: '#ff4d17',
      fontStyle: 'bold', letterSpacing: 5,
    }).setDepth(D).setAlpha(1);
    const num = (x, y, t) => this.add.text(x, y, t, {
      fontFamily: "'Saira Stencil One', sans-serif",
      fontSize: '44px', color: '#efe9dd',
    }).setDepth(D);

    // Top-left: SCORE / COINS / ARMED
    lbl(30, 28, 'SCORE');
    this._scoreTxt = num(30, 38, '0').setFontSize('32px');

    lbl(174, 28, 'COINS');
    this._coinTxt = num(174, 38, '0').setFontSize('32px');

    lbl(318, 28, 'ARMED');
    this._wepChip = this.add.text(318, 42, '01 LASER', {
      fontFamily: "'Saira Stencil One', sans-serif",
      fontSize: '18px', color: '#efe9dd',
      padding: { x: 6, y: 4 },
    }).setDepth(D);
    // Chip border (2px bone stencil outline)
    this._wepChipG = this.add.graphics().setDepth(D - 1);

    // Ammo + reload prompt (near chip)
    this._ammoTxt = this.add.text(318, 66, '', {
      fontFamily: "'Space Mono', monospace",
      fontSize: '11px', color: 'rgba(239,233,221,0.7)',
    }).setDepth(D);
    this._reloadTxt = this.add.text(318, 66, 'PRESS R TO RELOAD', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '11px', color: '#ff4d17',
      fontStyle: 'bold', letterSpacing: 4,
    }).setDepth(D + 1).setVisible(false);

    // Top-right: planet name + approach meter (on an ink plate)
    this._hudG = this.add.graphics().setDepth(D - 1);
    this._planetNameTxt = this.add.text(width - 30, 28, this.planetData.name.toUpperCase(), {
      fontFamily: "'Saira Stencil One', sans-serif",
      fontSize: '24px', color: '#efe9dd',
    }).setOrigin(1, 0).setDepth(D);
    lbl(width - 30 - 230, 58, 'APPROACH').setOrigin(0, 0.5);
    this._approachPct = 0;

    // Distance readout
    this._distTxt = this.add.text(width - 30, 80, 'DIST 1000 km', {
      fontFamily: "'Space Mono', monospace",
      fontSize: '11px', color: 'rgba(239,233,221,0.55)',
    }).setOrigin(1, 0).setDepth(D);

    // Bottom-left: HULL bar
    this._shieldLbl = lbl(30, height - 52, 'HULL');
    this._shieldTxt = this.add.text(330, height - 52, '', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '11px', color: 'rgba(239,233,221,0.6)',
      letterSpacing: 4, fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(D);
    this._shieldBarG = this.add.graphics().setDepth(D);

    // Boss HP bar (hidden until Conquest)
    this._bossHpG   = this.add.graphics().setDepth(D);
    this._bossHpLbl = lbl(width / 2, height - 52, '').setOrigin(0.5, 0);
    this._bossHpLbl.setVisible(false);

    // Objective banner (shown at start of each phase)
    this._bannerTxt = this.add.text(width / 2, height * 0.42, '', {
      fontFamily: "'Saira Stencil One', sans-serif",
      fontSize: '28px', color: '#efe9dd',
    }).setOrigin(0.5).setDepth(D + 2).setAlpha(0);

    this._showBanner(`${this.planetData.name.toUpperCase()} — ${this.planetData.subtitle}`);
  }

  _showBanner(text, duration = 2500) {
    if (!this._bannerTxt) return;
    this._bannerTxt.setText(text).setAlpha(1);
    this.tweens.add({
      targets: this._bannerTxt,
      alpha: 0,
      delay: duration - 500,
      duration: 500,
    });
  }

  // ── Touch Controls ────────────────────────────────────────────────────────────

  _buildTouchControls() {
    const { width, height } = this.scale;
    const D = 22;

    // FIRE button — bone outlined circle, blaze label
    const fbX = width - 80, fbY = height - 80;
    const fireG = this.add.graphics().setDepth(D);
    const redrawFire = (pressed) => {
      fireG.clear();
      fireG.lineStyle(2, C.BONE, pressed ? 1 : 0.55);
      fireG.strokeCircle(fbX, fbY, 46);
      if (pressed) { fireG.fillStyle(C.BLAZE, 0.25); fireG.fillCircle(fbX, fbY, 46); }
    };
    redrawFire(false);
    this.add.text(fbX, fbY, 'FIRE', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '14px', color: '#ff4d17', fontStyle: 'bold', letterSpacing: 4,
    }).setOrigin(0.5).setDepth(D + 1);
    const fireZone = this.add.circle(fbX, fbY, 46, 0, 0).setDepth(D + 2).setInteractive();
    fireZone.on('pointerdown', () => { redrawFire(true);  this.ship?.setTouchFire(true);  });
    fireZone.on('pointerup',   () => { redrawFire(false); this.ship?.setTouchFire(false); });
    fireZone.on('pointerout',  () => { redrawFire(false); this.ship?.setTouchFire(false); });

    // RELOAD button — teal outlined, below FIRE
    const rbX = width - 80, rbY = height - 170;
    const reloadG = this.add.graphics().setDepth(D);
    reloadG.lineStyle(2, C.TEAL, 0.65);
    reloadG.strokeCircle(rbX, rbY, 36);
    this.add.text(rbX, rbY, 'RELOAD', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '11px', color: '#0f7a6a', fontStyle: 'bold', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(D + 1);
    const reloadZone = this.add.circle(rbX, rbY, 36, 0, 0).setDepth(D + 2).setInteractive();
    reloadZone.on('pointerdown', () => this.ship?.setTouchReload());

    // Weapon switch — 3 bone-outlined chips
    const wLabels = ['LAS', 'PLM', 'MSL'];
    wLabels.forEach((label, i) => {
      const bx = 68 + i * 72, by = height - 65;
      const wg = this.add.graphics().setDepth(D);
      wg.lineStyle(2, C.BONE, 0.50);
      wg.strokeRect(bx - 28, by - 22, 56, 44);
      this.add.text(bx, by - 8, String(i + 1), {
        fontFamily: "'Saira Stencil One', sans-serif",
        fontSize: '16px', color: '#efe9dd',
      }).setOrigin(0.5).setDepth(D + 1);
      this.add.text(bx, by + 10, label, {
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: '11px', color: '#efe9dd', letterSpacing: 3, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(D + 1);
      const zone = this.add.rectangle(bx, by, 56, 44, 0, 0).setDepth(D + 2).setInteractive();
      zone.on('pointerdown', () => this.ship?.setWeapon(i));
    });

    // Pause button
    const pauseBtn = this.add.text(width - 16, 10, '||', {
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '20px', color: '#efe9dd', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(D + 2).setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', () => this._togglePause());
  }

  // ── Pause Menu ────────────────────────────────────────────────────────────────

  _buildPauseMenu() {
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;
    const D = 30;

    const overlay = this.add.rectangle(0, 0, width, height, C.INK, 0.82)
      .setOrigin(0).setDepth(D).setVisible(false);
    const panelG = this.add.graphics().setDepth(D + 1).setVisible(false);
    panelG.fillStyle(C.INK_DEEP, 0.98);
    panelG.fillRect(cx - 180, cy - 150, 360, 300);
    panelG.lineStyle(2, C.BONE, 0.55);
    panelG.strokeRect(cx - 180, cy - 150, 360, 300);

    const title = this.add.text(cx, cy - 118, 'PAUSED', {
      fontFamily: "'Saira Stencil One', sans-serif",
      fontSize: '32px', color: '#efe9dd',
    }).setOrigin(0.5).setDepth(D + 2).setVisible(false);

    const btnStyle = { fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: '20px', fontStyle: 'bold', color: '#efe9dd', letterSpacing: 4 };

    const resume  = this.add.text(cx, cy - 55, 'RESUME',        btnStyle).setOrigin(0.5).setDepth(D + 2).setInteractive({ useHandCursor: true }).setVisible(false);
    const restart = this.add.text(cx, cy,      'RESTART LEVEL', { ...btnStyle, color: '#ff4d17' }).setOrigin(0.5).setDepth(D + 2).setInteractive({ useHandCursor: true }).setVisible(false);
    const muteBtn = this.add.text(cx, cy + 55, '',              btnStyle).setOrigin(0.5).setDepth(D + 2).setInteractive({ useHandCursor: true }).setVisible(false);
    const menuBtn = this.add.text(cx, cy + 110,'PLANET SELECT', { ...btnStyle, color: 'rgba(239,233,221,0.55)' }).setOrigin(0.5).setDepth(D + 2).setInteractive({ useHandCursor: true }).setVisible(false);

    const allItems = [overlay, panelG, title, resume, restart, muteBtn, menuBtn];

    const updateMute = () => {
      const m = this.game.registry.get('muted') || false;
      muteBtn.setText(m ? 'SOUND: OFF' : 'SOUND: ON');
    };
    updateMute();

    resume.on('pointerdown',  () => this._togglePause());
    restart.on('pointerdown', () => { this.audio.stopMusic(); this.scene.restart({ planetId: this.planetData.id }); });
    muteBtn.on('pointerdown', () => {
      const m = !this.game.registry.get('muted');
      this.game.registry.set('muted', m);
      if (this.audio) this.audio.setMuted(m);
      updateMute();
    });
    menuBtn.on('pointerdown', () => { this.audio.stopMusic(); this.scene.start('PlanetSelectScene'); });

    this._pauseItems    = allItems;
    this._pauseVisible  = false;
  }

  _togglePause() {
    this._pauseVisible = !this._pauseVisible;
    this._pauseItems.forEach(o => o.setVisible(this._pauseVisible));
    this.physics && this.physics.world && (this._pauseVisible
      ? this.physics.world.pause()
      : this.physics.world.resume());
    if (this._pauseVisible) {
      this.gameState = STATE.PAUSED;
    } else {
      this.gameState = STATE.PLAYING;
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this.gameState === STATE.PAUSED) return;
    if (this.gameState === STATE.WIN || this.gameState === STATE.DEAD) {
      this._runEndSequence(delta);
      return;
    }

    // ── Phase update ──────────────────────────────────────────────────────────
    const phaseEvents = this.phases.update(delta);
    for (const ev of phaseEvents) {
      if (ev.type === 'phaseChange') {
        this._showBanner(ev.to === PHASE.DESCENT ? 'DESCENT' : 'CONQUEST');
      }
      if (ev.type === 'spawnMoon') {
        this._spawnMoon(ev.moon);
      }
      if (ev.type === 'spawnBoss') {
        this._spawnBoss();
      }
    }

    // ── Backdrop: draw growing planet ─────────────────────────────────────────
    this._drawBackdrop();

    // ── Hazard ────────────────────────────────────────────────────────────────
    const hazardOut = this.hazard.update(delta, this.phases.hazardIntensity);
    if (this.ship) {
      this.ship.hazardForceX    = hazardOut.x    || 0;
      this.ship.hazardForceY    = hazardOut.y    || 0;
      this.ship.hazardSpeedMult = hazardOut.speedMult ?? 1;
    }

    // Hazard shield drain (Venus acid, Mercury heat, Sun passive)
    if (hazardOut.shieldDrain && this.ship?.alive) {
      this.ship.shield = Math.max(0, this.ship.shield - hazardOut.shieldDrain * (delta / 1000));
      if (this.ship.shield <= 0 && this.ship.alive) {
        this.ship.alive = false;
        this.events.emit('shipDestroyed');
      }
    }

    // ── Ship update ───────────────────────────────────────────────────────────
    let newShots = [];
    if (this.ship?.alive) {
      newShots = this.ship.update(delta);
    }

    // ── Spawn new projectiles ─────────────────────────────────────────────────
    for (const shot of newShots) {
      this.projectiles.push(new Projectile(this, shot));
    }

    // ── Asteroid spawning (Approach + Descent only) ───────────────────────────
    if (!this.phases.isConquest) {
      this._asteroidTimer -= delta;
      if (this._asteroidTimer <= 0) {
        this._spawnAsteroid();
        const baseInterval = this.difficulty.spawnInterval(
          this.phases.journeyProgress * (BALANCE.PHASE_APPROACH_MS + BALANCE.PHASE_DESCENT_MS)
        );
        this._asteroidTimer = baseInterval * this.phases.spawnIntervalMult;
      }
    }

    // ── Update entities ───────────────────────────────────────────────────────
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      a.update(delta);
      if (!a.active) { this.asteroids.splice(i, 1); continue; }

      // Ship collision
      if (this.ship?.alive && a.overlapsPoint(this.ship.x, this.ship.y)) {
        this.ship.takeDamage(BALANCE[`DAMAGE_${a.sizeLabel}_ASTEROID`]);
        this._shakeCamera(6, 300);
        this._explodeAsteroid(a);
        this.asteroids.splice(i, 1);
        continue;
      }

      // Projectile hits
      for (let j = this.projectiles.length - 1; j >= 0; j--) {
        const p = this.projectiles[j];
        if (!p.active) continue;
        if (a.overlapsPoint(p.x, p.y)) {
          const died = a.hit(p.damage);
          p.destroy(); this.projectiles.splice(j, 1);
          if (died) {
            this._onAsteroidDestroyed(a);
            this.asteroids.splice(i, 1);
          }
          break;
        }
      }
    }

    // Moons
    for (let i = this.moons.length - 1; i >= 0; i--) {
      const m = this.moons[i];
      m.update(delta);
      if (!m.active) { this.moons.splice(i, 1); continue; }
      if (this.ship?.alive && m.overlapsPoint(this.ship.x, this.ship.y)) {
        this.ship.takeDamage(BALANCE.DAMAGE_MOON);
        this._shakeCamera(10, 400);
      }
    }

    // Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(delta);
      if (!p.active) { this.projectiles.splice(i, 1); }
    }

    // Pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.update(delta);
      if (!pk.active) { this.pickups.splice(i, 1); continue; }
      if (this.ship?.alive && pk.overlapsPoint(this.ship.x, this.ship.y)) {
        this._collectPickup(pk);
        this.pickups.splice(i, 1);
      }
    }

    // Boss
    if (this.boss?.alive) {
      this._bossProj = this._bossProj.filter(p => p.active !== false);
      const bossOut = this.boss.update(delta, this.ship?.x, this.ship?.y, this._bossProj);
      if (bossOut?.newProjectiles) this._bossProj.push(...bossOut.newProjectiles);

      // Player projectiles vs boss
      for (let j = this.projectiles.length - 1; j >= 0; j--) {
        const p = this.projectiles[j];
        if (!p.active) continue;
        if (this.boss.overlapsPoint(p.x, p.y)) {
          this.boss.hit(p.damage);
          p.destroy(); this.projectiles.splice(j, 1);
          this._shakeCamera(3, 150);
          if (!this.boss.alive) { this._onBossDefeated(); }
          break;
        }
      }

      // Boss projectiles vs ship
      for (let k = this._bossProj.length - 1; k >= 0; k--) {
        const bp = this._bossProj[k];
        if (!bp.active) continue;
        bp.update(delta);
        if (this.ship?.alive && bp.overlapsPoint && bp.overlapsPoint(this.ship.x, this.ship.y)) {
          this.ship.takeDamage(BALANCE.DAMAGE_BOSS_PROJECTILE);
          bp.active = false;
          this._shakeCamera(5, 200);
        }
      }
    }

    // ── Camera shake ──────────────────────────────────────────────────────────
    if (this._shakeTimer > 0) {
      this._shakeTimer -= delta;
      const amt = this._shakeAmt * (this._shakeTimer / 300);
      this.cameras.main.setScroll(
        (Math.random() - 0.5) * amt * 2,
        (Math.random() - 0.5) * amt * 2
      );
    } else {
      this.cameras.main.setScroll(0, 0);
    }

    // ── HUD update ────────────────────────────────────────────────────────────
    this._drawHUD();
  }

  // ── Backdrop (planet disc) ────────────────────────────────────────────────────

  _drawBackdrop() {
    this._backdropG.clear();
    drawPlanet(
      this._backdropG,
      this.phases.planetCX, this.phases.planetCY,
      this.phases.planetR,
      this.planetData,
      this.phases.planetRotation
    );
  }

  // ── HUD drawing ───────────────────────────────────────────────────────────────

  _drawHUD() {
    const { width, height } = this.scale;

    if (!this._hudG || !this._shieldBarG) return;

    // Score / coins
    if (this._scoreTxt) this._scoreTxt.setText(String(this.score));
    if (this._coinTxt)  this._coinTxt.setText(String(this.coinsThisRun));

    // Weapon chip
    const hudW = this.ship?.weapons.getHudState();
    if (hudW && this._wepChip) {
      const ammoStr = `${String(hudW.ammo).padStart(2, '0')} ${hudW.weaponLabel}`;
      this._wepChip.setText(ammoStr);
      this._wepChipG.clear();
      const cb = this._wepChip.getBounds();
      this._wepChipG.lineStyle(2, C.BONE, 0.80);
      this._wepChipG.strokeRect(cb.x - 6, cb.y - 4, cb.width + 12, cb.height + 8);
    }

    // Ammo / reload prompt
    if (hudW && this._reloadTxt && this._ammoTxt) {
      const showReload = hudW.showReloadPrompt;
      this._reloadTxt.setVisible(showReload);
      if (showReload) {
        const blink = Math.floor(hudW.reloadPromptBlink / 350) % 2 === 0;
        this._reloadTxt.setAlpha(blink ? 1 : 0.3);
      }
      this._ammoTxt.setVisible(!showReload);
      if (!showReload) {
        this._ammoTxt.setText(`MAG ${hudW.ammo}/${hudW.maxAmmo}${hudW.reloading ? ' — RELOADING' : ''}`);
      }
    }

    // Top-right plate (always draw ink bg to knockout planet bleed)
    this._hudG.clear();
    drawPlate(this._hudG, width - 320, 18, 300, 80);

    // Approach meter
    drawApproachMeter(this._hudG, width - 300, 62, 220, 10, this.phases.journeyProgress);

    // Distance
    if (this._distTxt) {
      this._distTxt.setText(`DIST ${this.phases.distanceKm} km`);
    }

    // Hull bar
    if (this.ship) {
      this._shieldBarG.clear();
      drawPlate(this._shieldBarG, 22, height - 60, 330, 36);
      drawHullBar(this._shieldBarG, 30, height - 48, 310, 16, this.ship.shieldFraction);
      if (this._shieldTxt) {
        this._shieldTxt.setText(`${Math.ceil(this.ship.shield)} / ${this.ship.maxShield}`);
      }
    }

    // Boss HP bar
    if (this.boss?.alive && this._bossHpG) {
      const bx = width / 2 - 200, by = height - 44, bw = 400, bh = 16;
      this._bossHpG.clear();
      drawPlate(this._bossHpG, bx - 10, by - 14, bw + 20, 38);
      // Boss bar outline
      this._bossHpG.lineStyle(2, C.BONE, 1);
      this._bossHpG.strokeRect(bx, by, bw, bh);
      // Blaze fill
      const frac = this.boss.hp / this.boss.maxHp;
      this._bossHpG.fillStyle(C.BLAZE, 1);
      this._bossHpG.fillRect(bx, by, bw * frac, bh);
      if (this._bossHpLbl) {
        this._bossHpLbl.setVisible(true).setPosition(width / 2, height - 58);
        this._bossHpLbl.setText(this.boss.data?.theme?.toUpperCase() || 'BOSS');
      }
    } else if (this._bossHpG) {
      this._bossHpG.clear();
      if (this._bossHpLbl) this._bossHpLbl.setVisible(false);
    }
  }

  // ── Camera shake ──────────────────────────────────────────────────────────────

  _shakeCamera(amount, duration) {
    this._shakeAmt   = amount;
    this._shakeTimer = Math.max(this._shakeTimer, duration);
  }

  // ── Spawning ──────────────────────────────────────────────────────────────────

  _spawnAsteroid() {
    const { height } = this.scale;
    const _pool = [
      ASTEROID_SIZE.LARGE, ASTEROID_SIZE.LARGE,
      ASTEROID_SIZE.MEDIUM, ASTEROID_SIZE.MEDIUM, ASTEROID_SIZE.MEDIUM,
      ASTEROID_SIZE.SMALL, ASTEROID_SIZE.SMALL, ASTEROID_SIZE.SMALL,
    ];
    const size = _pool[Phaser.Math.Between(0, _pool.length - 1)];
    const a = new Asteroid(this, size, 1300, Phaser.Math.Between(30, height - 30));
    a.speed = this.difficulty.asteroidSpeed(
      this.phases.journeyProgress * (BALANCE.PHASE_APPROACH_MS + BALANCE.PHASE_DESCENT_MS)
    );
    this.asteroids.push(a);
  }

  _spawnMoon(moonDef) {
    const { height } = this.scale;
    const y = Phaser.Math.Between(80, height - 80);
    this.moons.push(new Moon(this, moonDef, y));
  }

  _spawnBoss() {
    const bossConfig = { ...this.planetData.boss, bossHp: this.planetData.boss.hp };
    this.boss = new Boss(this, bossConfig, this.planetData);
    this.audio.startMusic(true);   // switch to boss music variant
  }

  // ── Asteroid destroyed ────────────────────────────────────────────────────────

  _onAsteroidDestroyed(a) {
    this.score += BALANCE[`SCORE_${a.sizeLabel}_ASTEROID`];
    this._spawnPickup(a.x, a.y);
    // Large splits into mediums
    if (a.sizeLabel === 'LARGE') {
      for (let i = 0; i < BALANCE.ASTEROID_SPLIT_INTO; i++) {
        const child = new Asteroid(this, ASTEROID_SIZE.MEDIUM, a.x, a.y);
        child.speed = a.speed * 1.2;
        child._vx = Math.cos((i / BALANCE.ASTEROID_SPLIT_INTO) * Math.PI * 2) * child.speed;
        child._vy = Math.sin((i / BALANCE.ASTEROID_SPLIT_INTO) * Math.PI * 2) * child.speed * 0.4;
        this.asteroids.push(child);
      }
    }
    a.destroy();
    this._shakeCamera(2, 100);
  }

  _spawnPickup(x, y) {
    const r = Math.random();
    let type = null;
    if (r < BALANCE.GEM_DROP_CHANCE)                                    type = PICKUP_TYPE.GEM;
    else if (r < BALANCE.GEM_DROP_CHANCE + BALANCE.COIN_DROP_CHANCE)   type = PICKUP_TYPE.COIN;
    else if (r < BALANCE.GEM_DROP_CHANCE + BALANCE.COIN_DROP_CHANCE + BALANCE.AMMO_CRATE_DROP_CHANCE) type = PICKUP_TYPE.AMMO;
    else if (r < BALANCE.GEM_DROP_CHANCE + BALANCE.COIN_DROP_CHANCE + BALANCE.AMMO_CRATE_DROP_CHANCE + BALANCE.POWERUP_DROP_CHANCE) type = PICKUP_TYPE.SHIELD;
    if (type) this.pickups.push(new Pickup(this, type, x, y));
  }

  _collectPickup(pk) {
    switch (pk.type) {
      case PICKUP_TYPE.COIN:
        this.coinsThisRun += BALANCE.COIN_VALUE;
        this.score        += 5;
        break;
      case PICKUP_TYPE.GEM:
        this.coinsThisRun += BALANCE.GEM_VALUE;
        this.score        += 15;
        break;
      case PICKUP_TYPE.SHIELD:
        this.ship?.healShield(BALANCE.SHIELD_BOOST_AMOUNT);
        break;
      case PICKUP_TYPE.AMMO:
        this.ship?.weapons.refillCurrentMag();
        break;
      case PICKUP_TYPE.RAPID_FIRE:
        this.events.emit('pickupRapidFire');
        break;
    }
    pk.destroy();
  }

  _explodeAsteroid(a) {
    a.destroy();
  }

  // ── Boss defeated ─────────────────────────────────────────────────────────────

  _onConquestComplete() {
    this._onBossDefeated();
  }

  _onBossDefeated() {
    if (this.gameState === STATE.WIN) return;   // guard against double-trigger (direct call + event)
    const survivalBonus = Math.floor((this.ship?.shieldFraction || 0) * BALANCE.SCORE_BOSS_SURVIVAL_BONUS);
    this.score += BALANCE.SCORE_BOSS + survivalBonus;

    SaveData.addCoins(this.coinsThisRun);
    SaveData.maybeUpdateHighScore(this.planetData.id, this.score);
    const nextId = SaveData.unlockNext(this.planetData.id);

    // Campaign complete?
    if (this.planetData.id === 'sun') {
      SaveData.setCampaignComplete();
    }

    this._shakeCamera(18, 800);
    this.gameState = STATE.WIN;
    this._winData = { score: this.score, coins: this.coinsThisRun, nextId };
  }

  // ── Ship destroyed ────────────────────────────────────────────────────────────

  _onShipDestroyed() {
    SaveData.addCoins(this.coinsThisRun);
    this._shakeCamera(20, 1000);
    this.gameState = STATE.DEAD;
  }

  // ── End sequences ─────────────────────────────────────────────────────────────

  _runEndSequence(delta) {
    if (this.gameState === STATE.WIN && !this._winDone) {
      this._winDone = true;
      this.time.delayedCall(1800, () => {
        if (SaveData.isCampaignComplete() && this.planetData.id === 'sun') {
          this.scene.start('CampaignCompleteScene');
        } else {
          this.scene.start('LevelWinScene', this._winData);
        }
      });
    }
    if (this.gameState === STATE.DEAD && !this._deadDone) {
      this._deadDone = true;
      this.time.delayedCall(1200, () => {
        this.scene.start('LevelLoseScene', { planetId: this.planetData.id });
      });
    }
  }

  // ── Shutdown ──────────────────────────────────────────────────────────────────

  _shutdown() {
    if (this.audio) this.audio.stopMusic();

    if (this.input?.keyboard) {
      this.input.keyboard.off('keydown-ESC', this._onPause);
      this.input.keyboard.off('keydown-P',   this._onPause);
    }

    this.events.off('shipDestroyed',    this._onShipDestroyed,    this);
    this.events.off('conquestComplete', this._onConquestComplete, this);

    this.ship?.destroy();
    this.boss?.destroy();
    this.hazard?.destroy();

    this.asteroids.forEach(a  => a.destroy());
    this.projectiles.forEach(p => p.destroy());
    this.pickups.forEach(pk   => pk.destroy());
    this.moons.forEach(m      => m.destroy());

    this.asteroids  = [];
    this.projectiles = [];
    this.pickups    = [];
    this.moons      = [];
    this._bossProj  = [];

    this.cameras?.main?.setScroll(0, 0);
  }
}
