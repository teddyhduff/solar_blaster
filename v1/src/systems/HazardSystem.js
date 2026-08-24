// HazardSystem.js — Manages the unique environmental hazard for each planet.
// GameScene creates one of these per level and calls update(delta) every frame.
// The hazard can also affect ship movement — GameScene queries getForces() each frame.

export class HazardSystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {string}       hazardId      from planet data (e.g. 'solarFlare')
   * @param {number}       accentColor   planet's hex accent colour for visuals
   */
  constructor(scene, hazardId, accentColor) {
    this.scene       = scene;
    this.hazardId    = hazardId;
    this.accentColor = accentColor;
    this._objects    = [];   // Phaser objects we created (destroyed in destroy())
    this._init();
  }

  _init() {
    switch (this.hazardId) {
      case 'solarFlare':  this._initSolarFlare();  break;
      case 'toxicCloud':  this._initToxicCloud();  break;
      case 'debrisField': this._initDebrisField(); break;
      case 'sandstorm':   this._initSandstorm();   break;
      case 'gravityWell': this._initGravityWell(); break;
      case 'ringDebris':  this._initRingDebris();  break;
      case 'iceComet':    this._initIceComet();    break;
      case 'windGust':    this._initWindGust();    break;
    }
  }

  // ── Solar Flare (Mercury) ─────────────────────────────────────────────────
  // Bright sweeping bands scroll downward across the screen.
  _initSolarFlare() {
    this._flareTimer    = 5000;   // first flare after 5 s
    this._flareInterval = 6000;
    this._flares        = [];     // { g, y, speed }
  }

  _updateSolarFlare(delta) {
    this._flareTimer -= delta;
    if (this._flareTimer <= 0) {
      this._flareTimer = this._flareInterval;
      this._spawnFlare();
    }
    const { width } = this.scene.scale;
    this._flares = this._flares.filter(f => {
      f.y += f.speed * (delta / 1000);
      f.g.clear();
      f.g.fillStyle(this.accentColor, 0.28);
      f.g.fillRect(0, f.y - 22, width, 44);
      if (f.y > this.scene.scale.height + 50) {
        f.g.destroy();
        return false;
      }
      return true;
    });
  }

  _spawnFlare() {
    const g = this.scene.add.graphics().setDepth(5);
    const f = { g, y: -30, speed: Phaser.Math.Between(140, 220) };
    this._flares.push(f);
    this._objects.push(g);
  }

  /** Returns true if shipY is inside an active flare band. */
  isShipInFlare(shipY) {
    return this._flares.some(f => Math.abs(f.y - shipY) < 26);
  }

  // ── Toxic Cloud (Venus) ───────────────────────────────────────────────────
  // Pulsing semi-transparent overlay that reduces visibility.
  _initToxicCloud() {
    const { width, height } = this.scene.scale;
    this._cloudG     = this.scene.add.graphics().setDepth(4);
    this._cloudAlpha = 0.05;
    this._cloudDir   = 1;
    this._objects.push(this._cloudG);
    this.scene.add.rectangle(0, 0, width, height, this.accentColor, 0.05)
      .setOrigin(0).setDepth(3);
  }

  _updateToxicCloud(delta) {
    this._cloudAlpha += this._cloudDir * 0.10 * (delta / 1000);
    if (this._cloudAlpha > 0.40) { this._cloudAlpha = 0.40; this._cloudDir = -1; }
    if (this._cloudAlpha < 0.05) { this._cloudAlpha = 0.05; this._cloudDir =  1; }
    const { width, height } = this.scene.scale;
    this._cloudG.clear();
    this._cloudG.fillStyle(this.accentColor, this._cloudAlpha);
    this._cloudG.fillRect(0, 0, width, height);
  }

  // ── Debris Field (Earth) ──────────────────────────────────────────────────
  // Extra dense cluster spawns — GameScene queries shouldSpawnCluster().
  _initDebrisField() {
    this._clusterTimer    = 3000;
    this._clusterInterval = 3500;
  }

  /** Returns true once every clusterInterval ms — GameScene spawns a burst of asteroids. */
  shouldSpawnCluster(delta) {
    if (this.hazardId !== 'debrisField') return false;
    this._clusterTimer -= delta;
    if (this._clusterTimer <= 0) { this._clusterTimer = this._clusterInterval; return true; }
    return false;
  }

  // ── Sandstorm (Mars) ──────────────────────────────────────────────────────
  // Intermittent gusts that push the ship vertically.
  _initSandstorm() {
    this._stormY      = 0;       // vertical push force in px/s
    this._stormTimer  = 3000;
    this._stormActive = false;
    this._stormDuration = 0;

    // Dust particles array: { x, y, vx, vy, life }
    this._dustG = this.scene.add.graphics().setDepth(4);
    this._dust  = [];
    this._objects.push(this._dustG);
  }

  _updateSandstorm(delta) {
    const dt = delta / 1000;
    this._stormTimer -= delta;
    if (!this._stormActive && this._stormTimer <= 0) {
      this._stormActive   = true;
      this._stormY        = Phaser.Math.Between(60, 110) * (Math.random() < 0.5 ? 1 : -1);
      this._stormDuration = Phaser.Math.Between(2000, 3500);
      this._stormTimer    = Phaser.Math.Between(3000, 5000);
    }
    if (this._stormActive) {
      this._stormDuration -= delta;
      if (this._stormDuration <= 0) { this._stormActive = false; this._stormY = 0; }
      // Spawn dust particles.
      if (Math.random() < 0.4) {
        const { width, height } = this.scene.scale;
        this._dust.push({
          x: width + 10, y: Phaser.Math.Between(0, height),
          vx: -Phaser.Math.Between(200, 350),
          vy: this._stormY * 0.3 + Phaser.Math.FloatBetween(-20, 20),
          life: 1,
        });
      }
    }
    // Update dust.
    this._dustG.clear();
    this._dust = this._dust.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.2;
      this._dustG.fillStyle(this.accentColor, p.life * 0.3);
      this._dustG.fillRect(p.x, p.y, 4 + Math.random() * 6, 1);
      return p.life > 0 && p.x > -20;
    });
  }

  // ── Gravity Well (Jupiter) ────────────────────────────────────────────────
  // Pulls the ship toward the vertical centre of the screen.
  _initGravityWell() {
    const { width, height } = this.scene.scale;
    this._wellG  = this.scene.add.graphics().setDepth(2);
    this._wellT  = 0;
    this._wellCY = height / 2;
    this._objects.push(this._wellG);
  }

  _updateGravityWell(delta) {
    this._wellT += delta * 0.0015;
    const { width, height } = this.scene.scale;
    const r = 70 + Math.sin(this._wellT) * 18;
    this._wellG.clear();
    [r * 2.2, r * 1.4, r].forEach((rad, i) => {
      this._wellG.lineStyle(1.5, this.accentColor, 0.18 - i * 0.04);
      this._wellG.strokeCircle(width * 0.5, height * 0.5, rad);
    });
  }

  /** Returns vertical pull force in px/s toward screen centre. */
  getGravityPull(shipY) {
    if (this.hazardId !== 'gravityWell') return 0;
    const { height } = this.scene.scale;
    const cy  = height / 2;
    const dir = shipY < cy ? 1 : -1;
    return dir * 60;
  }

  // ── Ring Debris (Saturn) ──────────────────────────────────────────────────
  // A visible band across the centre; GameScene spawns fast small asteroids there.
  _initRingDebris() {
    const { width, height } = this.scene.scale;
    this._ringBandY = height / 2;
    const bandG = this.scene.add.graphics().setDepth(1);
    bandG.fillStyle(this.accentColor, 0.10);
    bandG.fillRect(0, this._ringBandY - 60, width, 120);
    bandG.lineStyle(1, this.accentColor, 0.35);
    bandG.strokeRect(0, this._ringBandY - 60, width, 120);
    this._objects.push(bandG);
    this._ringTimer    = 0;
    this._ringInterval = 380;
  }

  /** Returns true at the ring-asteroid spawn rate. */
  shouldSpawnRingAsteroid(delta) {
    if (this.hazardId !== 'ringDebris') return false;
    this._ringTimer -= delta;
    if (this._ringTimer <= 0) { this._ringTimer = this._ringInterval; return true; }
    return false;
  }

  getRingBandY() { return this._ringBandY; }

  // ── Ice Comet (Uranus) ────────────────────────────────────────────────────
  // Patches of ice on the field slow the ship while inside.
  _initIceComet() {
    this._iceG         = this.scene.add.graphics().setDepth(3);
    this._iceZones     = [];   // { y, radius, age, maxAge }
    this._iceTimer     = 4000;
    this._iceInterval  = 4500;
    this._objects.push(this._iceG);
  }

  _updateIceComet(delta) {
    const { width, height } = this.scene.scale;
    this._iceTimer -= delta;
    if (this._iceTimer <= 0) {
      this._iceTimer = this._iceInterval;
      this._iceZones.push({ x: Phaser.Math.Between(80, width - 80), y: Phaser.Math.Between(60, height - 60), radius: 90, age: 0, maxAge: 5000 });
    }
    this._iceG.clear();
    this._iceZones = this._iceZones.filter(z => {
      z.age += delta;
      const alpha = 0.28 * (1 - z.age / z.maxAge);
      this._iceG.fillStyle(0x80DEEA, alpha);
      this._iceG.fillCircle(z.x, z.y, z.radius);
      this._iceG.lineStyle(1.5, 0xFFFFFF, alpha * 0.6);
      this._iceG.strokeCircle(z.x, z.y, z.radius);
      return z.age < z.maxAge;
    });
  }

  /** Returns true if the ship is inside a slowing ice zone. */
  isShipInIce(shipX, shipY) {
    return this._iceZones.some(z => {
      const dx = shipX - z.x, dy = shipY - z.y;
      return Math.sqrt(dx * dx + dy * dy) < z.radius;
    });
  }

  // ── Wind Gust (Neptune) ───────────────────────────────────────────────────
  // Intermittent horizontal wind pushes the ship.
  _initWindGust() {
    const { width, height } = this.scene.scale;
    this._windX       = 0;
    this._windTimer   = 2500;
    this._windActive  = false;
    this._windDur     = 0;
    // Dark overlay for reduced visibility.
    const ov = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.28)
      .setOrigin(0).setDepth(4);
    this._windStreakG = this.scene.add.graphics().setDepth(5);
    this._streaks     = [];
    this._objects.push(ov, this._windStreakG);
  }

  _updateWindGust(delta) {
    const dt = delta / 1000;
    this._windTimer -= delta;
    if (!this._windActive && this._windTimer <= 0) {
      this._windActive = true;
      this._windX      = Phaser.Math.Between(70, 130) * (Math.random() < 0.5 ? 1 : -1);
      this._windDur    = Phaser.Math.Between(1500, 2800);
      this._windTimer  = Phaser.Math.Between(2500, 4000);
    }
    if (this._windActive) {
      this._windDur -= delta;
      if (this._windDur <= 0) { this._windActive = false; this._windX = 0; }
      if (Math.random() < 0.35) {
        const { height } = this.scene.scale;
        this._streaks.push({
          x: this._windX > 0 ? -10 : this.scene.scale.width + 10,
          y: Phaser.Math.Between(0, height),
          vx: this._windX * 2.5,
          vy: Phaser.Math.FloatBetween(-15, 15),
          life: 1,
        });
      }
    }
    this._windStreakG.clear();
    this._streaks = this._streaks.filter(s => {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 1.5;
      this._windStreakG.lineStyle(1.5, 0x9090FF, s.life * 0.4);
      this._windStreakG.lineBetween(s.x, s.y, s.x - s.vx * 0.05, s.y);
      return s.life > 0;
    });
  }

  // ── Master update dispatcher ──────────────────────────────────────────────

  update(delta) {
    switch (this.hazardId) {
      case 'solarFlare':  this._updateSolarFlare(delta);  break;
      case 'toxicCloud':  this._updateToxicCloud(delta);  break;
      case 'sandstorm':   this._updateSandstorm(delta);   break;
      case 'gravityWell': this._updateGravityWell(delta); break;
      case 'iceComet':    this._updateIceComet(delta);    break;
      case 'windGust':    this._updateWindGust(delta);    break;
      // debrisField and ringDebris are poll-based; no per-frame update needed here.
    }
  }

  /**
   * Returns the extra force vector {x, y} in px/s the hazard applies to the ship this frame.
   * GameScene adds this to the ship's movement each tick.
   */
  getForces(shipX, shipY) {
    const forces = { x: 0, y: 0, speedMult: 1 };
    switch (this.hazardId) {
      case 'sandstorm':
        forces.y = this._stormY;
        break;
      case 'gravityWell':
        forces.y = this.getGravityPull(shipY);
        break;
      case 'iceComet':
        if (this.isShipInIce(shipX, shipY)) forces.speedMult = 0.55;
        break;
      case 'windGust':
        forces.x = this._windX;
        break;
    }
    return forces;
  }

  destroy() {
    this._objects.forEach(o => { try { o.destroy(); } catch (e) {} });
    this._objects = [];
  }
}
