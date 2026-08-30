// HazardSystem.js — All 9 V2 environmental hazards.
// Each hazard is derived from real planetary science (see planets.js descriptions).
// update() returns forces/drains to apply to the ship each frame.
// Visuals: Stencil Riso — bone/blaze/teal only, no neon glow.

import { C } from './StencilArt.js';

export class HazardSystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {string} hazardId   from planet data
   * @param {number} accentColor  (ignored — Stencil Riso uses only the three inks)
   */
  constructor(scene, hazardId, accentColor) {
    this.scene    = scene;
    this.hazardId = hazardId;
    this._g       = scene.add.graphics().setDepth(15);  // above most gameplay
    this._overlayG = scene.add.graphics().setDepth(3);   // under asteroids
    this._objects  = [];
    this._state    = {};
    this._init();
  }

  _init() {
    const s = this._state;
    const { width, height } = this.scene.scale;

    switch (this.hazardId) {

      // 1. Neptune — wind gusts + Dark Spot vortex
      case 'windGusts':
        s.gustTimer  = 4000;
        s.gustActive = false;
        s.gustForceX = 0;
        s.gustDir    = 1;
        s.gustAge    = 0;
        s.gustDur    = 0;
        s.vortexX    = width * 0.7;
        s.vortexY    = height / 2;
        s.vortexR    = 90;
        s.vortexPull = 0;
        s.vortexTimer = 12000;
        break;

      // 2. Uranus — tilting field (drift direction rotates 90° and back)
      case 'tiltingField':
        s.tiltAngle     = 0;   // current field tilt in radians
        s.tiltTarget    = 0;
        s.tiltTimer     = 8000;
        s.isTilting     = false;
        s.tiltDir       = 1;
        break;

      // 3. Saturn — ring debris band + hexagonal bonus pocket
      case 'ringDebris':
        s.debrisTimer = 0;
        s.hexTimer    = 25000;
        s.hexActive   = false;
        s.hexAge      = 0;
        s.hexX        = width * 0.5;
        s.hexY        = height * 0.4;
        break;

      // 4. Jupiter — gravity wells + radiation belt lanes
      case 'gravityWells':
        s.wells = [
          { x: width * 0.6, y: height * 0.25, strength: 0 },
          { x: width * 0.8, y: height * 0.75, strength: 0 },
        ];
        s.wellTimer   = 3000;
        s.beltY       = height * 0.5;
        s.beltActive  = false;
        s.beltTimer   = 6000;
        s.beltDrain   = 4;   // HP/s
        break;

      // 5. Mars — dust storm + low-gravity floatiness
      case 'dustStorm':
        s.stormActive = false;
        s.stormTimer  = 5000;
        s.stormAlpha  = 0;
        s.pushX       = 0;
        s.pushY       = 0;
        break;

      // 6. Earth — space junk (angular debris) + lightning + rocket
      case 'spaceJunk':
        s.rocketTimer  = 15000;
        s.rocketX      = width + 100;
        s.rocketY      = Phaser.Math.Between(80, height - 80);
        s.rocketActive = false;
        s.lightningTimer = Phaser.Math.Between(3000, 7000);
        s.lightningFlash = 0;
        break;

      // 7. Venus — acid cloud banks + heat-haze distortion
      case 'acidCloud':
        s.cloudAlpha  = 0;
        s.cloudTarget = 0;
        s.cloudTimer  = 3000;
        s.drainPerSec = 0;
        s.haze        = 0;
        break;

      // 8. Mercury — alternating heat and cold zones
      case 'heatColdZones':
        s.zone        = 'heat';   // 'heat' | 'cold' | 'neutral'
        s.zoneTimer   = 4000;
        s.zoneAge     = 0;
        s.zoneDur     = 3500;
        s.heatDrain   = 3;   // HP/s in heat zone
        s.coldSlow    = 0.65;  // speed multiplier in cold zone
        s.flashAlpha  = 0;
        break;

      // 9. Sun — constant heat drain + flare sweeps + plasma prominences
      case 'solar':
        s.baseDrainPerSec = 2;   // constant passive drain
        s.flareTimer   = 5000;
        s.flares       = [];
        s.prominences  = [];
        s.prominenceTimer = 8000;
        break;

      default: break;
    }
  }

  // ── Main update ───────────────────────────────────────────────────────────────
  // Returns { x, y, speedMult, shieldDrain } forces/effects to apply to ship.

  update(delta, intensity = 1.0) {
    this._g.clear();
    this._overlayG.clear();

    switch (this.hazardId) {
      case 'windGusts':     return this._updateWindGusts(delta, intensity);
      case 'tiltingField':  return this._updateTiltingField(delta, intensity);
      case 'ringDebris':    return this._updateRingDebris(delta, intensity);
      case 'gravityWells':  return this._updateGravityWells(delta, intensity);
      case 'dustStorm':     return this._updateDustStorm(delta, intensity);
      case 'spaceJunk':     return this._updateSpaceJunk(delta, intensity);
      case 'acidCloud':     return this._updateAcidCloud(delta, intensity);
      case 'heatColdZones': return this._updateHeatColdZones(delta, intensity);
      case 'solar':         return this._updateSolar(delta, intensity);
      default:              return { x: 0, y: 0, speedMult: 1, shieldDrain: 0 };
    }
  }

  // ── 1. Neptune — wind gusts ───────────────────────────────────────────────────

  _updateWindGusts(delta, intensity) {
    const s = this._state;
    const { width, height } = this.scene.scale;
    let fx = 0;

    // Gust countdown
    s.gustTimer -= delta;
    if (s.gustTimer <= 0 && !s.gustActive) {
      s.gustActive = true;
      s.gustDir    = Math.random() > 0.5 ? 1 : -1;
      s.gustDur    = 1800 + Math.random() * 800;
      s.gustAge    = 0;
      s.gustForceX = (100 + Math.random() * 80) * intensity;
      s.gustTimer  = 5000 + Math.random() * 3000;
    }
    if (s.gustActive) {
      s.gustAge += delta;
      const t = s.gustAge / s.gustDur;
      fx = s.gustForceX * s.gustDir * Math.sin(t * Math.PI);   // ease in-out
      if (s.gustAge >= s.gustDur) { s.gustActive = false; s.gustForceX = 0; }

      // Visual: blaze horizontal sweep lines
      this._g.lineStyle(2, C.BLAZE, 0.20 * Math.sin(t * Math.PI));
      for (let y = 20; y < height; y += 40) {
        this._g.lineBetween(0, y, width, y + (s.gustDir > 0 ? 8 : -8));
      }
    }

    // Vortex (Dark Spot) — slow drift pull
    s.vortexTimer -= delta;
    if (s.vortexTimer <= 0) {
      s.vortexTimer = 14000;
      s.vortexX     = width * (0.55 + Math.random() * 0.35);
      s.vortexY     = height * (0.2 + Math.random() * 0.6);
    }

    // Draw vortex: ink circle, bone stroke
    this._g.lineStyle(3, C.BONE, 0.25);
    this._g.strokeCircle(s.vortexX, s.vortexY, s.vortexR);
    this._g.lineStyle(2, C.BONE, 0.10);
    this._g.strokeCircle(s.vortexX, s.vortexY, s.vortexR * 0.6);

    // Vortex ship pull (gentle)
    const ship = this.scene.ship;
    let vx = 0, vy = 0;
    if (ship?.alive) {
      const dx = s.vortexX - ship.x, dy = s.vortexY - ship.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < s.vortexR * 1.5) {
        const pull = 30 * (1 - dist / (s.vortexR * 1.5)) * intensity;
        vx = (dx / dist) * pull;
        vy = (dy / dist) * pull;
      }
    }

    return { x: fx + vx, y: vy, speedMult: 1, shieldDrain: 0 };
  }

  // ── 2. Uranus — tilting field ─────────────────────────────────────────────────

  _updateTiltingField(delta, intensity) {
    const s = this._state;
    const { width, height } = this.scene.scale;

    s.tiltTimer -= delta;
    if (s.tiltTimer <= 0) {
      s.tiltTimer = 9000 + Math.random() * 4000;
      s.tiltDir  = s.tiltDir === 1 ? -1 : 1;
      // Rotate 90° and back
      s.tiltTarget = s.tiltAngle === 0
        ? (Math.PI / 2) * s.tiltDir
        : 0;
    }

    // Smooth tilt toward target
    const diff = s.tiltTarget - s.tiltAngle;
    s.tiltAngle += diff * 0.015;

    // Gravity along tilt direction (90° tilt = side gravity)
    const grav = 40 * Math.abs(Math.sin(s.tiltAngle)) * intensity;
    const fx = Math.sin(s.tiltAngle) * grav;
    const fy = Math.cos(s.tiltAngle) * grav * 0.3;

    // Visual: draw faint bone grid lines rotated by tilt angle
    if (Math.abs(s.tiltAngle) > 0.05) {
      this._g.lineStyle(1, C.BONE, 0.08);
      for (let x = 0; x < width + 200; x += 80) {
        const cos = Math.cos(s.tiltAngle), sin = Math.sin(s.tiltAngle);
        this._g.lineBetween(
          x * cos - 0 * sin, x * sin + 0 * cos,
          x * cos - height * sin, x * sin + height * cos
        );
      }
    }

    return { x: fx, y: fy, speedMult: 1, shieldDrain: 0 };
  }

  // ── 3. Saturn — ring debris ────────────────────────────────────────────────────

  _updateRingDebris(delta, intensity) {
    const s = this._state;
    const { width, height } = this.scene.scale;

    // Dense ring band: draw bone horizontal band overlay
    const bandY = height * 0.45;
    const bandH = 70 * intensity;
    this._overlayG.fillStyle(C.BONE, 0.06 * intensity);
    this._overlayG.fillRect(0, bandY - bandH / 2, width, bandH);
    // Dashes within the band
    this._overlayG.fillStyle(C.BONE, 0.18 * intensity);
    for (let x = 0; x < width; x += 14) {
      this._overlayG.fillRect(x, bandY - 1 + Math.sin(x * 0.2) * 10, 6, 2);
    }

    // Hexagonal bonus pocket (appears briefly, packed with coins)
    s.hexTimer -= delta;
    if (s.hexTimer <= 0 && !s.hexActive) {
      s.hexActive = true;
      s.hexAge    = 0;
      s.hexX      = width * (0.4 + Math.random() * 0.4);
      s.hexY      = height * (0.2 + Math.random() * 0.6);
      s.hexTimer  = 20000;
      this.scene.events.emit('hexPocketOpen', { x: s.hexX, y: s.hexY });
    }
    if (s.hexActive) {
      s.hexAge += delta;
      if (s.hexAge > 5000) {
        s.hexActive = false;
        this.scene.events.emit('hexPocketClose');
      } else {
        // Draw hexagon outline in blaze
        const hex = s.hexX, hey = s.hexY, hr = 60;
        this._g.lineStyle(2, C.BLAZE, 0.70);
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          pts.push({ x: hex + Math.cos(a) * hr, y: hey + Math.sin(a) * hr });
        }
        this._g.strokePoints(pts, true);
      }
    }

    return { x: 0, y: 0, speedMult: 1, shieldDrain: 0 };
  }

  // ── 4. Jupiter — gravity wells + radiation belts ──────────────────────────────

  _updateGravityWells(delta, intensity) {
    const s = this._state;
    const { width, height } = this.scene.scale;
    let fx = 0, fy = 0, drain = 0;

    // Animate well strengths
    s.wellTimer -= delta;
    if (s.wellTimer <= 0) {
      s.wellTimer = 2000;
      s.wells.forEach(w => {
        w.strength = (0.5 + Math.random() * 0.5) * intensity;
      });
    }

    const ship = this.scene.ship;
    s.wells.forEach((w, i) => {
      // Draw well: concentric bone circles
      const strength = w.strength;
      const r = 70 + i * 20;
      this._g.lineStyle(2, C.BONE, 0.12 * strength);
      this._g.strokeCircle(w.x, w.y, r);
      this._g.lineStyle(1, C.BONE, 0.06 * strength);
      this._g.strokeCircle(w.x, w.y, r * 0.5);

      // Pull ship
      if (ship?.alive) {
        const dx = w.x - ship.x, dy = w.y - ship.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < r * 1.5 && dist > 1) {
          const pull = 60 * strength * (1 - dist / (r * 1.5));
          fx += (dx / dist) * pull;
          fy += (dy / dist) * pull;
        }
      }
    });

    // Radiation belt
    s.beltTimer -= delta;
    if (s.beltTimer <= 0) {
      s.beltActive = !s.beltActive;
      s.beltTimer  = s.beltActive ? 3000 : 5000;
      s.beltY      = height * (0.25 + Math.random() * 0.5);
    }
    if (s.beltActive) {
      this._overlayG.fillStyle(C.BLAZE, 0.08 * intensity);
      this._overlayG.fillRect(0, s.beltY - 35, width, 70);
      if (ship?.alive && Math.abs(ship.y - s.beltY) < 35) {
        drain = s.beltDrain * intensity;
      }
    }

    return { x: fx, y: fy, speedMult: 1, shieldDrain: drain };
  }

  // ── 5. Mars — dust storm ────────────────────────────────────────────────────

  _updateDustStorm(delta, intensity) {
    const s = this._state;
    const { width, height } = this.scene.scale;

    s.stormTimer -= delta;
    if (s.stormTimer <= 0) {
      s.stormActive = !s.stormActive;
      s.stormTimer  = s.stormActive ? 4000 + Math.random() * 2000 : 6000;
      if (s.stormActive) {
        s.pushX = (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 40) * intensity;
        s.pushY = (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 20) * intensity;
      } else {
        s.pushX = 0; s.pushY = 0;
      }
    }

    // Storm overlay — bone particles drifting right
    if (s.stormActive) {
      s.stormAlpha = Math.min(0.35 * intensity, s.stormAlpha + 0.002 * delta);
      this._overlayG.fillStyle(C.BONE, s.stormAlpha * 0.30);
      this._overlayG.fillRect(0, 0, width, height);
      // Dash lines simulating dust
      this._overlayG.lineStyle(1, C.BONE, s.stormAlpha * 0.70);
      for (let i = 0; i < 20; i++) {
        const y = (i * 42 + (Date.now() / 10) % height);
        this._overlayG.lineBetween(0, y % height, 60, (y + 15) % height);
      }
    } else {
      s.stormAlpha = Math.max(0, s.stormAlpha - 0.001 * delta);
    }

    // Mars: low gravity = floatier handling
    const speedMult = 0.80 + s.stormAlpha * 0.40;   // slightly floaty even without storm

    return { x: s.pushX, y: s.pushY, speedMult, shieldDrain: 0 };
  }

  // ── 6. Earth — space junk + lightning + rocket ────────────────────────────────

  _updateSpaceJunk(delta, intensity) {
    const s = this._state;
    const { width, height } = this.scene.scale;

    // Lightning flash
    s.lightningTimer -= delta;
    if (s.lightningTimer <= 0) {
      s.lightningFlash = 120;
      s.lightningTimer = Phaser.Math.Between(3000, 8000);
    }
    if (s.lightningFlash > 0) {
      s.lightningFlash -= delta;
      const lx = Phaser.Math.Between(100, width - 100);
      this._g.lineStyle(2, C.BONE, 0.80);
      this._g.lineBetween(lx, 0, lx + Phaser.Math.Between(-40, 40), height * 0.6);
      this._g.lineStyle(1, C.BONE, 0.40);
      this._g.lineBetween(lx + 10, 0, lx + Phaser.Math.Between(-20, 20), height * 0.4);
    }

    // Commercial rocket crossing the screen
    s.rocketTimer -= delta;
    if (s.rocketTimer <= 0 && !s.rocketActive) {
      s.rocketActive = true;
      s.rocketX      = width + 80;
      s.rocketY      = Phaser.Math.Between(60, height - 60);
      s.rocketTimer  = 18000;
    }
    if (s.rocketActive) {
      s.rocketX -= 180 * (delta / 1000);
      // Draw rocket: bone rectangle + blaze exhaust
      this._g.fillStyle(C.BONE, 0.90);
      this._g.fillRect(s.rocketX - 24, s.rocketY - 8, 48, 16);
      this._g.fillStyle(C.BLAZE, 1);
      this._g.fillRect(s.rocketX - 34, s.rocketY - 5, 12, 10);   // exhaust
      this._g.lineStyle(2, C.INK, 0.60);
      this._g.strokeRect(s.rocketX - 24, s.rocketY - 8, 48, 16);
      if (s.rocketX < -100) s.rocketActive = false;
    }

    return { x: 0, y: 0, speedMult: 1, shieldDrain: 0 };
  }

  // ── 7. Venus — acid clouds + heat-haze ────────────────────────────────────────

  _updateAcidCloud(delta, intensity) {
    const s = this._state;
    const { width, height } = this.scene.scale;

    // Cloud banks pulse in and out
    s.cloudTimer -= delta;
    if (s.cloudTimer <= 0) {
      s.cloudTarget = s.cloudTarget < 0.3 ? 0.38 * intensity : 0;
      s.cloudTimer  = 2500 + Math.random() * 2000;
    }
    s.cloudAlpha += (s.cloudTarget - s.cloudAlpha) * 0.003 * delta;

    // Draw acid cloud overlay (bone + faint teal tint)
    this._overlayG.fillStyle(C.BONE, s.cloudAlpha * 0.20);
    this._overlayG.fillRect(0, 0, width, height);
    this._overlayG.fillStyle(C.TEAL, s.cloudAlpha * 0.10);
    this._overlayG.fillRect(0, height * 0.3, width, height * 0.4);

    // Drain while inside cloud
    const drain = s.cloudAlpha > 0.15 ? 6 * s.cloudAlpha * intensity : 0;

    return { x: 0, y: 0, speedMult: 1, shieldDrain: drain };
  }

  // ── 8. Mercury — heat and cold zones ────────────────────────────────────────

  _updateHeatColdZones(delta, intensity) {
    const s = this._state;
    const { width, height } = this.scene.scale;

    s.zoneAge  += delta;
    s.zoneTimer -= delta;
    if (s.zoneTimer <= 0) {
      s.zoneTimer = 3500 + Math.random() * 2000;
      s.zoneAge   = 0;
      // Cycle: heat → neutral → cold → neutral → heat…
      s.zone = s.zone === 'heat' ? 'cold' : 'heat';
    }

    const t = Math.min(1, s.zoneAge / 800);   // ramp in
    let drain = 0, speedMult = 1, flashColor = 0;

    if (s.zone === 'heat') {
      // Blaze overlay — heat shimmer
      this._overlayG.fillStyle(C.BLAZE, 0.10 * t * intensity);
      this._overlayG.fillRect(0, 0, width, height);
      drain = s.heatDrain * t * intensity;
    } else if (s.zone === 'cold') {
      // Bone overlay — cold zone
      this._overlayG.fillStyle(C.BONE, 0.08 * t * intensity);
      this._overlayG.fillRect(0, 0, width, height);
      speedMult = 1 - (1 - s.coldSlow) * t * intensity;
    }

    // Zone label flash at transition
    if (s.zoneAge < 1500) {
      const label = s.zone === 'heat' ? 'HEAT ZONE' : 'COLD ZONE';
      const col   = s.zone === 'heat' ? C.BLAZE : C.BONE;
      this._g.fillStyle(col, (1 - s.zoneAge / 1500) * 0.70);
      // (text drawn as HUD by GameScene watching hazard events)
      this.scene.events.emit('zoneLabel', { label, color: s.zone === 'heat' ? '#ff4d17' : '#efe9dd' });
    }

    return { x: 0, y: 0, speedMult, shieldDrain: drain };
  }

  // ── 9. Sun — constant drain + flares + prominences ───────────────────────────

  _updateSolar(delta, intensity) {
    const s = this._state;
    const { width, height } = this.scene.scale;

    // Constant passive heat drain
    const drain = s.baseDrainPerSec * intensity;

    // Flare sweeps (telegraphed)
    s.flareTimer -= delta;
    if (s.flareTimer <= 0) {
      s.flareTimer = 4000 + Math.random() * 3000;
      s.flares.push({ y: -20, speed: 260 + Math.random() * 80, warned: false });
    }
    s.flares = s.flares.filter(f => {
      f.y += f.speed * (delta / 1000);
      // Warning line appears before it arrives
      if (!f.warned && f.y > -80) {
        f.warned = true;
        this._g.lineStyle(2, C.BLAZE, 0.50);
        this._g.lineBetween(0, f.y + 60, width, f.y + 60);
      }
      // Active flare band
      this._g.fillStyle(C.BLAZE, 0.22);
      this._g.fillRect(0, f.y, width, 28);
      this._g.lineStyle(1, C.BONE, 0.30);
      this._g.lineBetween(0, f.y, width, f.y);
      return f.y < height + 50;
    });

    // Plasma prominences (arcs from right edge)
    s.prominenceTimer -= delta;
    if (s.prominenceTimer <= 0) {
      s.prominenceTimer = 7000 + Math.random() * 4000;
      const startY = Phaser.Math.Between(80, height - 80);
      s.prominences.push({ x: width, y: startY, t: 0, dur: 2200, amp: 100 + Math.random() * 80 });
    }
    s.prominences = s.prominences.filter(p => {
      p.t += delta;
      const frac = p.t / p.dur;
      const arcX = p.x - (width * 0.35) * frac;
      const arcY = p.y + Math.sin(frac * Math.PI) * -p.amp;
      this._g.lineStyle(3, C.BLAZE, 0.55 * (1 - frac));
      this._g.lineBetween(p.x, p.y, arcX, arcY);
      return p.t < p.dur;
    });

    // Intense corona glow over whole screen
    this._overlayG.fillStyle(C.BLAZE, 0.06 * intensity);
    this._overlayG.fillRect(0, 0, width, height);

    return { x: 0, y: 0, speedMult: 1, shieldDrain: drain };
  }

  /** Earth rocket — circle hitbox while the launch is on-screen. */
  getRocketHitbox() {
    const s = this._state;
    if (this.hazardId !== 'spaceJunk' || !s.rocketActive) return null;
    return { x: s.rocketX, y: s.rocketY, r: 20 };
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  destroy() {
    try { this._g.destroy(); }        catch {}
    try { this._overlayG.destroy(); } catch {}
    this._objects.forEach(o => { try { o.destroy(); } catch {} });
    this._objects = [];
  }
}
