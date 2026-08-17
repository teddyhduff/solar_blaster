// ShipShapes.js — Shared ship silhouette drawing.
// Used by both Ship (in-game) and HangarScene (preview) so they always match.
//
// All shapes point RIGHT (nose at +x), centred on (cx, cy), fitting ~60×60 px.
// Call with the Graphics object already created; this function only draws, never clears.

/**
 * Draw one of the 5 ship silhouettes.
 * @param {Phaser.GameObjects.Graphics} g
 * @param {number} cx        centre x
 * @param {number} cy        centre y
 * @param {number} color     hex color integer
 * @param {number} alpha     master opacity (0–1)
 * @param {string} shapeId   'interceptor' | 'dart' | 'gunship' | 'scout' | 'cruiser'
 */
export function drawShipShape(g, cx, cy, color, alpha, shapeId) {
  switch (shapeId) {
    case 'dart':        _drawDart(g, cx, cy, color, alpha);        break;
    case 'gunship':     _drawGunship(g, cx, cy, color, alpha);     break;
    case 'scout':       _drawScout(g, cx, cy, color, alpha);       break;
    case 'cruiser':     _drawCruiser(g, cx, cy, color, alpha);     break;
    default:            _drawInterceptor(g, cx, cy, color, alpha); break;  // 'interceptor'
  }
}

// ── Interceptor (Cyber Cyan — default) ────────────────────────────────────────
// Classic angular fighter, sharp nose, two swept wings.
function _drawInterceptor(g, cx, cy, color, alpha) {
  // Glow halo.
  g.fillStyle(color, alpha * 0.07);
  g.fillEllipse(cx, cy, 90, 46);

  // Fuselage.
  g.fillStyle(color, alpha * 0.92);
  g.fillTriangle(cx + 36, cy, cx - 12, cy - 14, cx - 12, cy + 14);

  // Wings.
  g.fillStyle(color, alpha * 0.72);
  g.fillTriangle(cx - 4, cy - 14, cx - 22, cy - 30, cx - 20, cy - 2);
  g.fillTriangle(cx - 4, cy + 14, cx - 22, cy + 30, cx - 20, cy + 2);

  // Cockpit glint.
  g.fillStyle(0xCCFFFF, alpha * 0.55);
  g.fillEllipse(cx + 14, cy, 16, 8);

  // Outline.
  g.lineStyle(1.5, color, alpha * 0.65);
  g.strokeTriangle(cx + 36, cy, cx - 12, cy - 14, cx - 12, cy + 14);
}

// ── Dart (Hot Magenta) ────────────────────────────────────────────────────────
// Ultra-slim needle body, tiny rear fins, no large wings.
function _drawDart(g, cx, cy, color, alpha) {
  // Glow.
  g.fillStyle(color, alpha * 0.07);
  g.fillEllipse(cx, cy, 96, 32);

  // Main long needle body.
  g.fillStyle(color, alpha * 0.92);
  const body = [
    { x: cx + 42, y: cy      },   // nose tip
    { x: cx -  8, y: cy -  8 },   // body upper
    { x: cx - 22, y: cy -  6 },   // tail flare upper
    { x: cx - 22, y: cy +  6 },   // tail flare lower
    { x: cx -  8, y: cy +  8 },   // body lower
  ];
  g.fillPoints(body, true);

  // Tiny swept fins (barely wider than the body).
  g.fillStyle(color, alpha * 0.65);
  g.fillTriangle(cx - 8, cy - 8,  cx - 22, cy - 20, cx - 18, cy - 4);
  g.fillTriangle(cx - 8, cy + 8,  cx - 22, cy + 20, cx - 18, cy + 4);

  // Cockpit sliver.
  g.fillStyle(0xFFCCFF, alpha * 0.50);
  g.fillEllipse(cx + 18, cy, 18, 5);

  // Outline.
  g.lineStyle(1.5, color, alpha * 0.70);
  g.strokePoints(body, true);
}

// ── Gunship (Solar Gold) ──────────────────────────────────────────────────────
// Wide, heavy silhouette: boxy fuselage, large flat wings, twin rear engine pods.
function _drawGunship(g, cx, cy, color, alpha) {
  // Glow.
  g.fillStyle(color, alpha * 0.07);
  g.fillEllipse(cx, cy, 88, 76);

  // Wide flat wings.
  g.fillStyle(color, alpha * 0.62);
  // Upper wing — wide sweep.
  g.fillTriangle(cx + 10, cy - 10, cx - 28, cy - 38, cx - 22, cy - 6);
  // Lower wing.
  g.fillTriangle(cx + 10, cy + 10, cx - 28, cy + 38, cx - 22, cy + 6);

  // Boxy fuselage (polygon instead of triangle).
  g.fillStyle(color, alpha * 0.90);
  const hull = [
    { x: cx + 36, y: cy      },   // nose
    { x: cx +  8, y: cy - 12 },   // upper front
    { x: cx - 18, y: cy - 10 },   // upper rear
    { x: cx - 18, y: cy + 10 },   // lower rear
    { x: cx +  8, y: cy + 12 },   // lower front
  ];
  g.fillPoints(hull, true);

  // Twin engine pods.
  g.fillStyle(color, alpha * 0.55);
  g.fillEllipse(cx - 22, cy - 7, 18, 8);
  g.fillEllipse(cx - 22, cy + 7, 18, 8);

  // Cockpit.
  g.fillStyle(0xFFEEAA, alpha * 0.55);
  g.fillEllipse(cx + 16, cy, 18, 8);

  // Outline.
  g.lineStyle(1.5, color, alpha * 0.65);
  g.strokePoints(hull, true);
}

// ── Scout (Plasma Green) ──────────────────────────────────────────────────────
// Compact delta wing — single large triangle with rounded nose, no separate fins.
function _drawScout(g, cx, cy, color, alpha) {
  // Glow (wide, low).
  g.fillStyle(color, alpha * 0.07);
  g.fillEllipse(cx - 2, cy, 78, 58);

  // Delta body — one filled convex hull.
  g.fillStyle(color, alpha * 0.88);
  const delta = [
    { x: cx + 30, y: cy      },   // nose
    { x: cx +  6, y: cy - 10 },   // leading edge upper shoulder
    { x: cx - 28, y: cy - 28 },   // wingtip upper
    { x: cx - 22, y: cy -  4 },   // trailing root upper
    { x: cx - 22, y: cy +  4 },   // trailing root lower
    { x: cx - 28, y: cy + 28 },   // wingtip lower
    { x: cx +  6, y: cy + 10 },   // leading edge lower shoulder
  ];
  g.fillPoints(delta, true);

  // Inner panel highlight (lighter centre spine).
  g.fillStyle(color, alpha * 0.28);
  g.fillTriangle(cx + 28, cy, cx - 10, cy - 8, cx - 10, cy + 8);

  // Cockpit bubble.
  g.fillStyle(0xAAFFCC, alpha * 0.55);
  g.fillEllipse(cx + 12, cy, 14, 7);

  // Outline.
  g.lineStyle(1.5, color, alpha * 0.65);
  g.strokePoints(delta, true);
}

// ── Cruiser (Arctic White) ────────────────────────────────────────────────────
// Four swept X-wings, wide chord, commanding profile.
function _drawCruiser(g, cx, cy, color, alpha) {
  // Glow (broadest of all shapes).
  g.fillStyle(color, alpha * 0.07);
  g.fillEllipse(cx - 4, cy, 84, 84);

  // Four wings — upper-front, lower-front, upper-rear, lower-rear.
  g.fillStyle(color, alpha * 0.60);
  // Upper-front sweep.
  g.fillTriangle(cx + 18, cy - 10, cx - 10, cy - 36, cx -  4, cy -  6);
  // Lower-front sweep.
  g.fillTriangle(cx + 18, cy + 10, cx - 10, cy + 36, cx -  4, cy +  6);
  // Upper-rear sweep.
  g.fillTriangle(cx -  4, cy - 6,  cx - 10, cy - 36, cx - 26, cy - 16);
  // Lower-rear sweep.
  g.fillTriangle(cx -  4, cy + 6,  cx - 10, cy + 36, cx - 26, cy + 16);

  // Central fuselage — elongated hexagon.
  g.fillStyle(color, alpha * 0.92);
  const hull = [
    { x: cx + 32, y: cy      },
    { x: cx + 14, y: cy - 10 },
    { x: cx - 20, y: cy - 8  },
    { x: cx - 26, y: cy      },
    { x: cx - 20, y: cy + 8  },
    { x: cx + 14, y: cy + 10 },
  ];
  g.fillPoints(hull, true);

  // Cockpit.
  g.fillStyle(0xDDDDFF, alpha * 0.55);
  g.fillEllipse(cx + 14, cy, 18, 8);

  // Outline.
  g.lineStyle(1.5, color, alpha * 0.65);
  g.strokePoints(hull, true);
}
