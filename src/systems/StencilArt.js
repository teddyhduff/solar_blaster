// StencilArt.js — All procedural drawing for Solar Blaster V2 (Stencil Riso scheme 1b).
//
// Rules (enforced throughout):
//  1. Only three inks: BONE, BLAZE, TEAL (plus INK ground).
//  2. Misprint: every hero object gets a blaze silhouette copy drawn 6px down+right first.
//  3. Halftone: dot-grid overlay at 9px constant pitch on solid fills.
//  4. No gradients on objects; no neon glow halos on UI/ship/asteroids.
//     Blur is allowed for engine exhaust only.
//  5. Stencil strokes 2px bone; never solid-filled panels for HUD.

// ── Colour constants (Phaser 0xRRGGBB integers) ─────────────────────────────
export const C = {
  INK:      0x16181c,
  INK_DEEP: 0x101216,
  BONE:     0xefe9dd,
  BLAZE:    0xff4d17,
  TEAL:     0x0f7a6a,
};

const MISPRINT_DX = 6;
const MISPRINT_DY = 6;
const DOT_PITCH   = 9;   // halftone pitch in screen pixels

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Draw a halftone dot-grid over a bounding rect on graphics g.
 * Uses ink dots at DOT_PITCH, simulating the multiply-blended screen.
 * fillRect is far cheaper than fillCircle for thousands of dots.
 */
export function drawHalftone(g, x, y, w, h, alpha = 0.5) {
  g.fillStyle(C.INK, alpha);
  for (let dy = 0; dy < h; dy += DOT_PITCH) {
    for (let dx = 0; dx < w; dx += DOT_PITCH) {
      g.fillRect(x + dx, y + dy, 3, 3);
    }
  }
}

/**
 * Draw a halftone dot-grid inside a circle (planet/disc).
 */
export function drawHalftoneDisc(g, cx, cy, r, alpha = 0.5) {
  g.fillStyle(C.INK, alpha);
  const r2 = r * r;
  for (let dy = -r; dy <= r; dy += DOT_PITCH) {
    for (let dx = -r; dx <= r; dx += DOT_PITCH) {
      if (dx * dx + dy * dy <= r2) {
        g.fillRect(cx + dx - 1, cy + dy - 1, 3, 3);
      }
    }
  }
}

/**
 * Bake a full-screen ink ground + paper grain into a texture Image.
 * Live Graphics with ~18k dots get re-rasterized every frame and kill FPS.
 */
export function bakeInkGrain(scene, key, width, height, {
  grainAlpha = 0.12,
  pitch = 7,
  depth = 0,
  starCount = 0,
} = {}) {
  const g = scene.make.graphics({ add: false });
  g.fillStyle(C.INK, 1);
  g.fillRect(0, 0, width, height);
  g.fillStyle(C.BONE, grainAlpha);
  for (let y = 0; y < height; y += pitch) {
    for (let x = 0; x < width; x += pitch) {
      g.fillRect(x, y, 2, 2);
    }
  }
  if (starCount > 0) {
    g.fillStyle(C.BONE, 0.55);
    for (let i = 0; i < starCount; i++) {
      const sx = Math.floor(Math.random() * width);
      const sy = Math.floor(Math.random() * height);
      g.fillRect(sx, sy, 2, 2);
    }
  }
  if (scene.textures.exists(key)) scene.textures.remove(key);
  g.generateTexture(key, width, height);
  g.destroy();
  return scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(depth);
}

/**
 * Bake a planet disc into a texture and return a centred Image.
 * Callers should destroy the image and remove the texture key when done.
 * Spin via image.setRotation — bake with rotation=0.
 */
export function bakePlanetImage(scene, key, r, planet, depth = 1) {
  const pad = 28; // misprint + stroke + atmosphere bleed
  const size = Math.ceil(r * 2 + pad * 2);
  const g = scene.make.graphics({ add: false });
  drawPlanet(g, size / 2, size / 2, r, planet, 0);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  g.generateTexture(key, size, size);
  g.destroy();
  return scene.add.image(0, 0, key).setDepth(depth);
}

/**
 * Draw a misprint underlay: blaze copy of polygon at +6px offset.
 * Pass the same points array used for the main shape.
 */
function drawMisprint(g, points) {
  g.fillStyle(C.BLAZE, 0.55);
  g.fillPoints(
    points.map(p => ({ x: p.x + MISPRINT_DX, y: p.y + MISPRINT_DY })),
    true
  );
}

// ── REFLEX 07 Player Ship ────────────────────────────────────────────────────

/**
 * Draw the player ship (REFLEX 07) centred at (cx, cy).
 * lod: 'gameplay' (102px wide) | 'icon' (54px wide)
 * marking: skin marking id (see upgrades.js SKINS)
 */
export function drawShip(g, cx, cy, lod = 'gameplay', marking = 'none') {
  const scale = lod === 'icon' ? 0.53 : 1.0;   // 54/102 ≈ 0.53
  _drawReflex07(g, cx, cy, scale, marking);
}

function _drawReflex07(g, cx, cy, scale, marking) {
  const s = scale;

  // All coordinates relative to the SVG viewport centre.
  // SVG viewBox: -40 0 400 140 → centre of ship geometry ≈ (169, 70) in SVG units.
  // We work in game-px where the ship is 102px wide at scale=1.
  // Simplified geometry derived from ship-reflex07-small.svg:
  //   Main body:  nose at x+51, tail at x-51 (102px total), vertical span ±18px
  //   Wings:      upper from body, sweeping back; lower mirror
  //   Canopy:     ink filled polygon over fuselage centre
  //   Thrust bars: twin blaze rects at tail

  // ── Misprint underlay (blaze silhouette, shifted down+right) ──────────────
  const bodyPts = [
    { x: cx + 51*s, y: cy },
    { x: cx + 12*s, y: cy - 7*s },
    { x: cx - 51*s, y: cy - 9*s },
    { x: cx - 51*s, y: cy + 9*s },
    { x: cx + 12*s, y: cy + 7*s },
  ];
  g.fillStyle(C.BLAZE, 0.55);
  g.fillPoints(
    bodyPts.map(p => ({ x: p.x + MISPRINT_DX, y: p.y + MISPRINT_DY })),
    true
  );

  // Upper wing misprint
  const upWingPts = [
    { x: cx + 12*s,  y: cy - 7*s  },
    { x: cx - 18*s,  y: cy - 36*s },
    { x: cx - 51*s,  y: cy - 38*s },
    { x: cx - 32*s,  y: cy - 16*s },
  ];
  g.fillPoints(
    upWingPts.map(p => ({ x: p.x + MISPRINT_DX, y: p.y + MISPRINT_DY })),
    true
  );

  // Lower wing misprint (mirror)
  const loWingPts = upWingPts.map(p => ({ x: p.x, y: cy + (cy - p.y) }));
  g.fillPoints(
    loWingPts.map(p => ({ x: p.x + MISPRINT_DX, y: p.y + MISPRINT_DY })),
    true
  );

  // ── Bone hull body ────────────────────────────────────────────────────────
  g.fillStyle(C.BONE, 1);
  g.fillPoints(bodyPts, true);

  // ── Bone upper wing ───────────────────────────────────────────────────────
  g.fillPoints(upWingPts, true);

  // ── Bone lower wing (mirror) ──────────────────────────────────────────────
  g.fillPoints(loWingPts, true);

  // ── Halftone on hull ──────────────────────────────────────────────────────
  // Approximate with a strip across the body.
  drawHalftone(g, cx - 51*s, cy - 9*s, 102*s, 18*s, 0.38);

  // ── Ink canopy (omit on icon LOD — too small) ─────────────────────────────
  if (s > 0.6) {
    g.fillStyle(C.INK, 1);
    const canopyPts = [
      { x: cx + 10*s, y: cy - 3*s },
      { x: cx - 12*s, y: cy - 9*s },
      { x: cx - 28*s, y: cy - 8*s },
      { x: cx - 14*s, y: cy - 2*s },
    ];
    g.fillPoints(canopyPts, true);
  }

  // ── Blaze thrust bars (twin, at tail) ─────────────────────────────────────
  g.fillStyle(C.BLAZE, 1);
  // Upper thrust bar
  g.fillRect(cx - 51*s, cy - 8*s, 17*s, 5*s);
  // Lower thrust bar
  g.fillRect(cx - 51*s, cy + 3*s,  17*s, 5*s);

  // ── Bone 2px stencil stroke around body ───────────────────────────────────
  g.lineStyle(2 * s, C.BONE, 0.45);
  g.strokePoints(bodyPts, true);

  // ── Skin marking ──────────────────────────────────────────────────────────
  _drawMarking(g, cx, cy, s, marking);
}

function _drawMarking(g, cx, cy, s, marking) {
  switch (marking) {
    case 'stripe':
      // Blaze diagonal stripe across upper wing
      g.fillStyle(C.BLAZE, 0.75);
      g.fillRect(cx - 30*s, cy - 36*s, 10*s, 30*s);
      g.fillRect(cx - 30*s, cy + 6*s,  10*s, 30*s);
      break;
    case 'stencilCut':
      // Ink panel cut-out on hull
      g.fillStyle(C.INK, 0.65);
      g.fillRect(cx - 10*s, cy - 5*s, 30*s, 10*s);
      break;
    case 'canopyMark':
      // Teal geometric diamond over canopy region
      g.fillStyle(C.TEAL, 0.80);
      const diamondPts = [
        { x: cx - 12*s, y: cy - 6*s },
        { x: cx - 20*s, y: cy       },
        { x: cx - 12*s, y: cy + 6*s },
        { x: cx - 4*s,  y: cy       },
      ];
      g.fillPoints(diamondPts, true);
      break;
    case 'hazardStripes':
      // Blaze/bone chevron on wings
      g.fillStyle(C.BLAZE, 0.80);
      g.fillRect(cx - 40*s, cy - 35*s, 8*s, 16*s);
      g.fillStyle(C.BONE, 0.50);
      g.fillRect(cx - 32*s, cy - 35*s, 4*s, 16*s);
      g.fillRect(cx - 40*s, cy + 19*s, 8*s, 16*s);
      g.fillStyle(C.BONE, 0.50);
      g.fillRect(cx - 32*s, cy + 19*s, 4*s, 16*s);
      break;
    default:
      break;
  }
}

// ── Enemy Ship ───────────────────────────────────────────────────────────────

/**
 * Draw an enemy: same construction as REFLEX 07 but nose left, no canopy.
 * Bone-only when undamaged. Blaze only on damage flash.
 */
export function drawEnemy(g, cx, cy, scale = 0.7, blazeFlash = false) {
  const s = scale;
  const hullColor = blazeFlash ? C.BLAZE : C.BONE;

  // Misprint underlay
  g.fillStyle(C.BLAZE, 0.40);
  const bodyPts = [
    { x: cx - 38*s, y: cy },
    { x: cx - 8*s,  y: cy - 7*s },
    { x: cx + 38*s, y: cy - 8*s },
    { x: cx + 38*s, y: cy + 8*s },
    { x: cx - 8*s,  y: cy + 7*s },
  ];
  g.fillPoints(
    bodyPts.map(p => ({ x: p.x + MISPRINT_DX, y: p.y + MISPRINT_DY })),
    true
  );

  // Body
  g.fillStyle(hullColor, 1);
  g.fillPoints(bodyPts, true);

  // Upper wing (sweeping forward-left from reversed nose)
  const upWingPts = [
    { x: cx - 8*s,  y: cy - 7*s  },
    { x: cx + 14*s, y: cy - 28*s },
    { x: cx + 38*s, y: cy - 30*s },
    { x: cx + 24*s, y: cy - 12*s },
  ];
  g.fillStyle(hullColor, 1);
  g.fillPoints(upWingPts, true);

  const loWingPts = upWingPts.map(p => ({ x: p.x, y: cy + (cy - p.y) }));
  g.fillPoints(loWingPts, true);

  // Halftone
  drawHalftone(g, cx - 38*s, cy - 8*s, 76*s, 16*s, 0.35);

  // Blaze on weapons/damage state — left-nose accent stripe
  g.fillStyle(C.BLAZE, blazeFlash ? 1 : 0.30);
  g.fillRect(cx - 38*s, cy - 3*s, 12*s, 6*s);

  // Bone stroke
  g.lineStyle(2 * s, C.BONE, 0.40);
  g.strokePoints(bodyPts, true);
}

// ── Asteroid ─────────────────────────────────────────────────────────────────

/**
 * Draw an asteroid irregular polygon, bone with halftone.
 * size: 'small' | 'medium' | 'large'
 * The vertex array is passed in so each asteroid instance has a stable random shape.
 */
export function drawAsteroid(g, cx, cy, r, vertices, blazeFlash = false) {
  // Misprint underlay
  g.fillStyle(C.BLAZE, 0.35);
  const pts = vertices.map(v => ({
    x: cx + Math.cos(v.a) * v.r + MISPRINT_DX,
    y: cy + Math.sin(v.a) * v.r + MISPRINT_DY,
  }));
  g.fillPoints(pts, true);

  // Bone fill
  const color = blazeFlash ? C.BLAZE : C.BONE;
  g.fillStyle(color, 1);
  const mainPts = vertices.map(v => ({
    x: cx + Math.cos(v.a) * v.r,
    y: cy + Math.sin(v.a) * v.r,
  }));
  g.fillPoints(mainPts, true);

  // Halftone overlay
  drawHalftone(g, cx - r, cy - r, r * 2, r * 2, 0.42);

  // Bone stroke
  g.lineStyle(2, C.BONE, 0.45);
  g.strokePoints(mainPts, true);
}

/**
 * Generate stable random asteroid vertices for a given radius.
 * Call once per asteroid and store; pass to drawAsteroid every frame.
 */
export function genAsteroidVertices(r, seed = Math.random()) {
  const count = 7 + Math.floor(seed * 4);
  const angleStep = (Math.PI * 2) / count;
  return Array.from({ length: count }, (_, i) => {
    const noise = 0.6 + (((seed * (i + 7)) % 1)) * 0.4;
    return { a: i * angleStep, r: r * noise };
  });
}

// ── Planet Disc ──────────────────────────────────────────────────────────────

/**
 * Draw the approaching planet disc.
 * cx, cy: centre; r: current radius (grows Approach → Descent → Conquest)
 * planet: planet data object from planets.js
 * rotation: current rotation angle (radians) for slow spin
 */
export function drawPlanet(g, cx, cy, r, planet, rotation = 0) {
  // ── Misprint underlay
  g.fillStyle(C.BLAZE, 0.30);
  g.fillCircle(cx + MISPRINT_DX, cy + MISPRINT_DY, r);

  // ── Main blaze disc
  g.fillStyle(C.BLAZE, 1);
  g.fillCircle(cx, cy, r);

  // ── Halftone screen (density varies by planet)
  drawHalftoneDisc(g, cx, cy, r, planet.blazeDensity ?? 0.60);

  // ── Craters
  if (planet.craterCount > 0) {
    const scale = planet.craterScale ?? 0.07;
    const baseAngles = [0.3, 1.1, 2.0, 2.8, 3.5, 4.2, 5.0, 5.8, 0.8, 1.7, 2.5, 3.2, 4.0, 4.8];
    g.fillStyle(C.INK, 0.35);
    for (let i = 0; i < planet.craterCount; i++) {
      const a = (baseAngles[i % baseAngles.length] + rotation) % (Math.PI * 2);
      const dist = r * (0.35 + (i * 0.05) % 0.45);
      const cr = r * scale * (0.7 + (i * 0.03) % 0.5);
      g.fillCircle(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, cr);
    }
  }

  // ── Horizontal banding (Jupiter)
  if (planet.bandCount) {
    g.lineStyle(3, C.BONE, 0.18);
    const step = (r * 2) / (planet.bandCount + 1);
    for (let i = 1; i <= planet.bandCount; i++) {
      const bandY = cy - r + i * step;
      const halfW = Math.sqrt(Math.max(0, r * r - (bandY - cy) ** 2));
      g.lineBetween(cx - halfW, bandY, cx + halfW, bandY);
    }
  }

  // ── Bone keyline (slightly misregistered)
  g.lineStyle(3, C.BONE, 0.50);
  g.strokeCircle(cx - 4, cy - 4, r + 3);

  // ── Atmosphere rim (bone, very faint)
  if (planet.atmosphereAlpha > 0) {
    g.lineStyle(r * 0.15, C.BONE, planet.atmosphereAlpha * 0.35);
    g.strokeCircle(cx, cy, r + r * 0.06);
  }

  // ── Saturn ring arc
  if (planet.ringVisible && r > 30) {
    g.lineStyle(Math.max(4, r * 0.08), C.BONE, 0.35);
    g.strokeEllipse(cx, cy + r * 0.15, r * 2.6, r * 0.45);
  }
}

// ── Moon ─────────────────────────────────────────────────────────────────────

/**
 * Draw a moon: smaller blaze disc + bone keyline.
 * r: radius
 */
export function drawMoon(g, cx, cy, r) {
  // Misprint
  g.fillStyle(C.BLAZE, 0.25);
  g.fillCircle(cx + MISPRINT_DX * 0.5, cy + MISPRINT_DY * 0.5, r);

  // Disc
  g.fillStyle(C.BONE, 1);
  g.fillCircle(cx, cy, r);

  // Halftone
  drawHalftoneDisc(g, cx, cy, r, 0.50);

  // Keyline
  g.lineStyle(2, C.INK, 0.60);
  g.strokeCircle(cx, cy, r);
}

// ── Projectile (laser bolt / plasma / missile) ────────────────────────────────

/**
 * Draw a projectile bar.
 * weapon: weapon data object
 * facing: direction in radians (0 = right)
 */
export function drawProjectile(g, cx, cy, weapon, isHoming = false) {
  const w = weapon.width;
  const h = weapon.height;

  // Misprint shadow
  g.fillStyle(C.BLAZE, 0.40);
  g.fillRect(cx + MISPRINT_DX - w/2, cy + MISPRINT_DY - h/2, w, h);

  // Main bar
  g.fillStyle(weapon.color ?? C.BLAZE, 1);
  g.fillRect(cx - w/2, cy - h/2, w, h);

  // Missile: add bone nose and ink body
  if (isHoming) {
    g.fillStyle(C.BONE, 1);
    g.fillRect(cx + w/2 - 4, cy - h/2, 4, h);
  }
}

// ── HUD Stencil Primitives ────────────────────────────────────────────────────

/**
 * Draw a dashed hull/shield bar (the repeating 3px-on / 3px-off bone pattern).
 * Returns the Phaser Graphics object after drawing.
 */
export function drawHullBar(g, x, y, w, h, fraction, strokeColor = C.BONE) {
  // Outline
  g.lineStyle(2, strokeColor, 1);
  g.strokeRect(x, y, w, h);

  // Dashed fill
  const inner = fraction * (w - 4);
  const dashW = 3;
  const gapW  = 3;
  let dx = 0;
  g.fillStyle(strokeColor, 1);
  while (dx < inner) {
    const segW = Math.min(dashW, inner - dx);
    g.fillRect(x + 2 + dx, y + 2, segW, h - 4);
    dx += dashW + gapW;
  }
}

/**
 * Draw a blaze approach meter.
 */
export function drawApproachMeter(g, x, y, w, h, fraction) {
  g.lineStyle(2, C.BONE, 1);
  g.strokeRect(x, y, w, h);

  // Blaze fill
  g.fillStyle(C.BLAZE, 1);
  g.fillRect(x, y, w * fraction, h);

  // Thumb line
  g.fillStyle(C.BLAZE, 1);
  g.fillRect(x + w * fraction - 1, y - 4, 2, h + 8);
}

/**
 * Draw an ink knockout plate behind a HUD block (required whenever HUD crosses planet).
 */
export function drawPlate(g, x, y, w, h) {
  g.fillStyle(C.INK, 1);
  g.fillRect(x, y, w, h);
}

// ── Pickup Icons ─────────────────────────────────────────────────────────────

export function drawPickupCoin(g, cx, cy) {
  // Small bone disc with blaze misprint
  g.fillStyle(C.BLAZE, 0.50);
  g.fillCircle(cx + 2, cy + 2, 7);
  g.fillStyle(C.BONE, 1);
  g.fillCircle(cx, cy, 7);
  g.lineStyle(2, C.INK, 0.60);
  g.strokeCircle(cx, cy, 7);
}

export function drawPickupGem(g, cx, cy) {
  // Teal diamond
  g.fillStyle(C.BLAZE, 0.40);
  const mpts = [
    { x: cx + MISPRINT_DX, y: cy + MISPRINT_DY - 9 },
    { x: cx + MISPRINT_DX + 7, y: cy + MISPRINT_DY },
    { x: cx + MISPRINT_DX, y: cy + MISPRINT_DY + 9 },
    { x: cx + MISPRINT_DX - 7, y: cy + MISPRINT_DY },
  ];
  g.fillPoints(mpts, true);
  g.fillStyle(C.TEAL, 1);
  const pts = [
    { x: cx, y: cy - 9 }, { x: cx + 7, y: cy },
    { x: cx, y: cy + 9 }, { x: cx - 7, y: cy },
  ];
  g.fillPoints(pts, true);
  g.lineStyle(2, C.BONE, 0.60);
  g.strokePoints(pts, true);
}

export function drawPickupShield(g, cx, cy) {
  // Teal shield wedge
  g.fillStyle(C.BLAZE, 0.30);
  g.fillCircle(cx + 2, cy + 2, 8);
  g.fillStyle(C.TEAL, 1);
  g.fillCircle(cx, cy, 8);
  drawHalftone(g, cx - 8, cy - 8, 16, 16, 0.45);
  g.lineStyle(2, C.BONE, 0.55);
  g.strokeCircle(cx, cy, 8);
}

export function drawPickupAmmo(g, cx, cy) {
  // Bone crate outline with blaze bolt icon
  g.fillStyle(C.INK, 1);
  g.fillRect(cx - 9, cy - 7, 18, 14);
  g.lineStyle(2, C.BONE, 1);
  g.strokeRect(cx - 9, cy - 7, 18, 14);
  g.fillStyle(C.BLAZE, 1);
  g.fillRect(cx - 5, cy - 3, 10, 6);
}

export function drawPickupRapidFire(g, cx, cy) {
  // Blaze lightning bolt (two filled triangles)
  g.fillStyle(C.BLAZE, 0.45);
  g.fillCircle(cx + 2, cy + 2, 8);
  g.fillStyle(C.BLAZE, 1);
  g.fillTriangle(cx + 3, cy - 8, cx - 2, cy, cx + 4, cy);
  g.fillTriangle(cx - 3, cy + 8, cx + 2, cy, cx - 1, cy);
}

// ── Particle / hit flash helpers ──────────────────────────────────────────────

/**
 * Return a Phaser particle emitter config for an ink/blaze explosion.
 * No bloom — just bone + blaze dots flying out.
 */
export function explosionEmitterConfig(small = false) {
  return {
    lifespan:  small ? 400 : 700,
    speed:     { min: small ? 40 : 80, max: small ? 120 : 220 },
    angle:     { min: 0, max: 360 },
    scale:     { start: small ? 0.5 : 0.9, end: 0 },
    alpha:     { start: 1, end: 0 },
    tint:      [C.BONE, C.BLAZE],
    quantity:  small ? 5 : 12,
    emitting:  false,
  };
}
