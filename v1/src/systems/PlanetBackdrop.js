// PlanetBackdrop.js — Procedural per-planet background.
// Layers: sky gradient → planet globe + surface detail → atmosphere glow → tinted starfield.
// All drawing done with Phaser Graphics — zero external assets.

export class PlanetBackdrop {
  /**
   * @param {Phaser.Scene} scene
   * @param {object}       planetData  one entry from PLANETS array (must have theme object)
   */
  constructor(scene, planetData) {
    this.scene      = scene;
    this.theme      = planetData.theme;
    this.accentColor = planetData.accentColor;

    const { width, height } = scene.scale;
    this.W = width;
    this.H = height;

    // Planet globe sits on the right side, partially off-screen.
    // Radius roughly 55% of screen height — unmissable but leaves room for gameplay.
    this._globeR  = height * 0.55;
    this._globeX  = width  * 0.82;
    this._globeY  = height * 0.58;
    // Parallax offset accumulated over time.
    this._globeOffY = 0;

    // ── Depth-ordered graphics layers ─────────────────────────────────────────
    this._skyG    = scene.add.graphics().setDepth(0);
    this._globeG  = scene.add.graphics().setDepth(1);
    this._atmosG  = scene.add.graphics().setDepth(2);
    this._starG   = scene.add.graphics().setDepth(3);

    // Build static layers.
    this._drawSky();
    this._drawGlobe();
    this._drawAtmosphere();

    // Build animated star layer.
    this._stars = this._makeStars(120);
    this._drawStars();
  }

  // ── Sky gradient ─────────────────────────────────────────────────────────────

  _drawSky() {
    const { skyTop, skyBottom } = this.theme;
    this._skyG.clear();

    // fillGradientStyle renders a quad with per-corner colors.
    // Top two corners = skyTop, bottom two corners = skyBottom.
    this._skyG.fillGradientStyle(skyTop, skyTop, skyBottom, skyBottom, 1, 1, 1, 1);
    this._skyG.fillRect(0, 0, this.W, this.H);
  }

  // ── Planet globe + surface detail ────────────────────────────────────────────

  _drawGlobe() {
    this._globeG.clear();
    const { planetBody, planetShade, planetHighlight, detail } = this.theme;
    const { _globeX: cx, _globeY: cy, _globeR: r } = this;

    const offY = this._globeOffY;

    // Base fill.
    this._globeG.fillStyle(planetBody, 1);
    this._globeG.fillCircle(cx, cy + offY, r);

    // Shadow hemisphere (dark ellipse on the left third of the globe).
    this._globeG.fillStyle(planetShade, 0.65);
    this._globeG.fillEllipse(cx - r * 0.22, cy + offY, r * 1.05, r * 1.9);

    // Highlight crescent (bright, right side).
    this._globeG.fillStyle(planetHighlight, 0.30);
    this._globeG.fillEllipse(cx + r * 0.30, cy - r * 0.05 + offY, r * 0.55, r * 1.55);

    // Surface detail.
    this._drawDetail(detail, cx, cy + offY, r);
  }

  _drawDetail(detail, cx, cy, r) {
    const g = this._globeG;
    const { planetShade, planetHighlight, planetBody } = this.theme;

    switch (detail) {

      case 'craters': {
        // Mercury / Mars cratered surface.
        const craters = [
          { ox: -0.25, oy: -0.15, rs: 0.12 },
          { ox:  0.10, oy:  0.32, rs: 0.17 },
          { ox:  0.38, oy: -0.28, rs: 0.09 },
          { ox: -0.10, oy:  0.18, rs: 0.07 },
          { ox:  0.22, oy:  0.08, rs: 0.11 },
          { ox: -0.35, oy:  0.30, rs: 0.08 },
        ];
        craters.forEach(({ ox, oy, rs }) => {
          const px = cx + ox * r;
          const py = cy + oy * r;
          const pr = rs * r;
          // Only draw if mostly inside the globe.
          const dist = Math.hypot(ox, oy);
          if (dist + rs > 0.9) return;
          g.fillStyle(planetShade, 0.50);
          g.fillCircle(px, py, pr);
          g.fillStyle(planetHighlight, 0.15);
          g.fillCircle(px - pr * 0.2, py - pr * 0.2, pr * 0.5);
        });
        // Polar cap highlight for Mars-style.
        if (this.theme.detail === 'dust') {
          g.fillStyle(0xFFFFFF, 0.25);
          g.fillEllipse(cx, cy - r * 0.88, r * 0.45, r * 0.22);
        }
        break;
      }

      case 'dust': {
        // Mars — craters + polar cap (handled via shared 'craters' + dust).
        const craters = [
          { ox: -0.18, oy: -0.10, rs: 0.10 },
          { ox:  0.12, oy:  0.28, rs: 0.14 },
          { ox:  0.30, oy: -0.22, rs: 0.08 },
          { ox: -0.08, oy:  0.15, rs: 0.06 },
        ];
        craters.forEach(({ ox, oy, rs }) => {
          const px = cx + ox * r;
          const py = cy + oy * r;
          const pr = rs * r;
          const dist = Math.hypot(ox, oy);
          if (dist + rs > 0.9) return;
          g.fillStyle(planetShade, 0.45);
          g.fillCircle(px, py, pr);
        });
        // White polar cap.
        g.fillStyle(0xFFEEEE, 0.30);
        g.fillEllipse(cx, cy - r * 0.85, r * 0.55, r * 0.28);
        // Dust haze near limb.
        g.fillStyle(this.accentColor, 0.07);
        g.fillCircle(cx, cy, r * 0.92);
        break;
      }

      case 'clouds': {
        // Venus — solid opaque cloud layer with brighter blobs.
        const blobs = [
          { ox: -0.30, oy: -0.20, rw: 0.45, rh: 0.18 },
          { ox:  0.10, oy:  0.10, rw: 0.40, rh: 0.14 },
          { ox: -0.05, oy: -0.38, rw: 0.38, rh: 0.12 },
          { ox:  0.28, oy:  0.32, rw: 0.35, rh: 0.13 },
          { ox: -0.35, oy:  0.28, rw: 0.30, rh: 0.12 },
          { ox:  0.20, oy: -0.15, rw: 0.25, rh: 0.10 },
        ];
        blobs.forEach(({ ox, oy, rw, rh }) => {
          const px = cx + ox * r;
          const py = cy + oy * r;
          g.fillStyle(planetHighlight, 0.22);
          g.fillEllipse(px, py, rw * r * 2, rh * r * 2);
        });
        break;
      }

      case 'continents': {
        // Earth — green land blobs over blue ocean base, thin cloud wisps.
        const land = [
          { ox: -0.10, oy: -0.20, rw: 0.28, rh: 0.38 },
          { ox:  0.25, oy:  0.08, rw: 0.20, rh: 0.30 },
          { ox: -0.30, oy:  0.28, rw: 0.22, rh: 0.18 },
          { ox:  0.35, oy: -0.30, rw: 0.15, rh: 0.22 },
        ];
        land.forEach(({ ox, oy, rw, rh }) => {
          const dist = Math.hypot(ox, oy);
          if (dist > 0.78) return;
          const px = cx + ox * r;
          const py = cy + oy * r;
          g.fillStyle(0x2A6030, 0.72);
          g.fillEllipse(px, py, rw * r * 2, rh * r * 2);
          g.fillStyle(0x3A8040, 0.30);
          g.fillEllipse(px - rw * r * 0.15, py - rh * r * 0.15, rw * r * 1.3, rh * r * 1.3);
        });
        // Ice cap.
        g.fillStyle(0xDDEEFF, 0.40);
        g.fillEllipse(cx, cy - r * 0.84, r * 0.60, r * 0.25);
        // Cloud wisps.
        g.fillStyle(0xFFFFFF, 0.12);
        g.fillEllipse(cx - r * 0.05, cy - r * 0.12, r * 0.70, r * 0.14);
        g.fillStyle(0xFFFFFF, 0.10);
        g.fillEllipse(cx + r * 0.12, cy + r * 0.22, r * 0.55, r * 0.10);
        break;
      }

      case 'bands': {
        // Jupiter — horizontal atmospheric bands.
        const bands = [
          { oy: -0.42, h: 0.12, col: 0xC09858, a: 0.55 },
          { oy: -0.28, h: 0.09, col: 0x8B5E35, a: 0.65 },
          { oy: -0.17, h: 0.14, col: 0xE8B870, a: 0.40 },
          { oy:  0.00, h: 0.10, col: 0x9B6A42, a: 0.60 },
          { oy:  0.12, h: 0.16, col: 0xC8906A, a: 0.45 },
          { oy:  0.30, h: 0.10, col: 0x8B5E35, a: 0.55 },
          { oy:  0.42, h: 0.12, col: 0xC09858, a: 0.50 },
        ];
        bands.forEach(({ oy, h, col, a }) => {
          g.fillStyle(col, a);
          // Clip-like ellipse that follows the globe curve.
          g.fillEllipse(cx, cy + oy * r, r * 2.15, h * r * 2.8);
        });
        // Great Red Spot (oval storm).
        g.fillStyle(0xC04030, 0.70);
        g.fillEllipse(cx + r * 0.18, cy + r * 0.08, r * 0.32, r * 0.18);
        g.fillStyle(0xFF6050, 0.30);
        g.fillEllipse(cx + r * 0.18, cy + r * 0.08, r * 0.22, r * 0.11);
        break;
      }

      case 'rings': {
        // Saturn — rings drawn BEHIND the globe (separate call order matters;
        // we draw front rings again in _drawAtmosphere at higher depth).
        this._drawSaturnRingsBack(cx, cy, r);
        break;
      }

      case 'ice': {
        // Uranus — smooth icy globe with faint thin rings and subtle surface lines.
        // Faint latitude lines.
        [-0.35, -0.15, 0.10, 0.30].forEach(oy => {
          g.lineStyle(1, planetHighlight, 0.15);
          g.beginPath();
          g.arc(cx, cy + oy * r, r * Math.cos(Math.asin(oy)), 0, Math.PI * 2);
          g.strokePath();
        });
        // Slight polar shimmer.
        g.fillStyle(0xCCF8FF, 0.18);
        g.fillEllipse(cx, cy - r * 0.82, r * 0.70, r * 0.28);
        break;
      }

      case 'storm': {
        // Neptune — dark storm oval + faint horizontal bands.
        const nbands = [
          { oy: -0.30, h: 0.08, col: 0x203880, a: 0.50 },
          { oy:  0.00, h: 0.10, col: 0x182860, a: 0.45 },
          { oy:  0.28, h: 0.08, col: 0x203880, a: 0.40 },
        ];
        nbands.forEach(({ oy, h, col, a }) => {
          g.fillStyle(col, a);
          g.fillEllipse(cx, cy + oy * r, r * 2.2, h * r * 2.5);
        });
        // Great Dark Spot.
        g.fillStyle(0x050818, 0.75);
        g.fillEllipse(cx - r * 0.15, cy - r * 0.08, r * 0.38, r * 0.22);
        g.fillStyle(0x2030A0, 0.25);
        g.fillEllipse(cx - r * 0.15, cy - r * 0.08, r * 0.28, r * 0.15);
        break;
      }

    }
  }

  /** Saturn rings behind the globe (rendered before globe body via paint order). */
  _drawSaturnRingsBack(cx, cy, r) {
    const g = this._globeG;
    const ringData = [
      { rx: r * 2.30, ry: r * 0.38, col: 0xE8D888, a: 0.55 },
      { rx: r * 2.00, ry: r * 0.32, col: 0xD4B870, a: 0.45 },
      { rx: r * 1.70, ry: r * 0.26, col: 0xC0A060, a: 0.35 },
    ];
    ringData.forEach(({ rx, ry, col, a }) => {
      g.lineStyle(Math.max(2, r * 0.045), col, a);
      g.beginPath();
      g.arc(cx, cy, rx * 0.5, Math.PI, Math.PI * 2, false);
      g.strokePath();
    });
  }

  /** Saturn rings in front of the globe — drawn onto _atmosG after the globe. */
  _drawSaturnRingsFront(cx, cy, r) {
    const g = this._atmosG;
    const ringData = [
      { rx: r * 2.30, ry: r * 0.38, col: 0xE8D888, a: 0.50 },
      { rx: r * 2.00, ry: r * 0.32, col: 0xD4B870, a: 0.40 },
      { rx: r * 1.70, ry: r * 0.26, col: 0xC0A060, a: 0.30 },
    ];
    ringData.forEach(({ rx, ry, col, a }) => {
      g.lineStyle(Math.max(2, r * 0.045), col, a);
      g.beginPath();
      g.arc(cx, cy, rx * 0.5, 0, Math.PI, false);
      g.strokePath();
    });
  }

  // ── Atmosphere glow ──────────────────────────────────────────────────────────

  _drawAtmosphere() {
    this._atmosG.clear();
    const { atmosphere, detail } = this.theme;
    const { _globeX: cx, _globeY: cy, _globeR: r } = this;
    const offY = this._globeOffY;

    // Concentric soft rings expanding outward.
    [
      { scale: 1.04, alpha: 0.22 },
      { scale: 1.09, alpha: 0.14 },
      { scale: 1.15, alpha: 0.08 },
      { scale: 1.22, alpha: 0.04 },
    ].forEach(({ scale, alpha }) => {
      this._atmosG.fillStyle(atmosphere, alpha);
      this._atmosG.fillCircle(cx, cy + offY, r * scale);
    });

    // Saturn: also draw front ring arcs on top.
    if (detail === 'rings') {
      this._drawSaturnRingsFront(cx, cy + offY, r);
    }

    // Uranus: faint thin tilted rings.
    if (detail === 'ice') {
      const g = this._atmosG;
      [r * 1.35, r * 1.50, r * 1.62].forEach((rx, i) => {
        g.lineStyle(2 - i * 0.4, atmosphere, 0.22 - i * 0.05);
        g.beginPath();
        // Uranus rings are tilted — approximate with a tilted ellipse.
        g.arc(cx, cy + offY, rx, 0.3, Math.PI + 0.3, false);
        g.strokePath();
        g.beginPath();
        g.arc(cx, cy + offY, rx, Math.PI + 0.3, Math.PI * 2 + 0.3, false);
        g.strokePath();
      });
    }
  }

  // ── Stars ────────────────────────────────────────────────────────────────────

  _makeStars(n) {
    const { W, H } = this;
    return Array.from({ length: n }, () => ({
      x:     Phaser.Math.Between(0, W),
      y:     Phaser.Math.Between(0, H),
      size:  Phaser.Math.FloatBetween(0.4, 2.0),
      speed: Phaser.Math.FloatBetween(12, 50),
      alpha: Phaser.Math.FloatBetween(0.20, 0.85),
    }));
  }

  _drawStars() {
    const { starColor } = this.theme;
    this._starG.clear();
    this._stars.forEach(s => {
      this._starG.fillStyle(starColor, s.alpha);
      this._starG.fillCircle(s.x, s.y, s.size);
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /** Call from GameScene.update each frame. */
  update(delta) {
    const dt = delta / 1000;
    const { W, H } = this;

    // Slow planet parallax drift (subtle breathing feel).
    this._globeOffY = Math.sin(this.scene.time.now * 0.0003) * 6;

    // Scroll stars left, wrapping at left edge.
    this._stars.forEach(s => {
      s.x -= s.speed * dt;
      if (s.x < 0) { s.x = W; s.y = Phaser.Math.Between(0, H); }
    });
    this._drawStars();

    // Redraw globe + atmosphere with updated parallax offset.
    this._drawGlobe();
    this._drawAtmosphere();
  }

  /** Call on scene shutdown to free all graphics objects. */
  destroy() {
    this._skyG.destroy();
    this._globeG.destroy();
    this._atmosG.destroy();
    this._starG.destroy();
  }
}
