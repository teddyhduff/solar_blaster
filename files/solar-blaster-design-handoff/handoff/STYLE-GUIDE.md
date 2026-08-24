# Solar Blaster — visual scheme "Stencil Riso" (1b)

Two inks printed on black, everything screened, one plate deliberately out of register.
Street-art stencil logic, not sci-fi rendering: flat fills, hard edges, no gradients, no bevels, no glow-on-everything.

## Inks

| token | value | use |
|---|---|---|
| `--sb-ink` | #16181c | ground, canopies, the dot screen, HUD knockout plates |
| `--sb-ink-deep` | #101216 | chrome / panels behind the play area |
| `--sb-bone` | #efe9dd | hulls, HUD strokes, numerals, asteroids |
| `--sb-blaze` | #ff4d17 | **thrust, guns, damage, danger, planets.** Nothing else. |
| `--sb-teal` | #0f7a6a | third ink, used sparingly: shields and pickups only |

Never introduce a fourth colour for UI states. Urgency is communicated by more blaze area, not new hues.

## Rules that make it look printed

1. **Halftone everything solid.** 9px dot pitch (`--sb-dot`), `mix-blend-mode: multiply`. Screens do not scale with the object — the pitch is constant in screen pixels, like a real print.
2. **Misprint offset.** Every hero object carries a blaze copy of its own silhouette offset 6px down + right (`--sb-misprint`), painted underneath. Numerals get the same as a 3px text-shadow.
3. **Stencil strokes, 2px, bone.** Bars, chips and meters are outlines, never filled panels.
4. **No gradients on objects.** Depth comes from dot density and overlap only. Blur is allowed for engine glow, nothing else.
5. **Knockout plates.** Any HUD element crossing a planet sits on a solid `--sb-ink` plate (`.sb-plate`). Bone-on-blaze at label sizes is unreadable — this is the one bug that keeps coming back.

## Type

- **Saira Stencil One** — score, coin, planet names. Big, tracked slightly.
- **Barlow Condensed 700** — all labels: uppercase, letter-spacing .3em, 11px minimum.
- **Space Mono** — readouts, debug, anything numeric that isn't the score.

## HUD anatomy

- Top-left cluster: SCORE / COINS / ARMED, left aligned, 44px numerals.
- Top-right: planet name + APPROACH meter, on a knockout plate.
- Bottom-left: HULL bar, dashed fill, numeric readout in the header row.
- Blaze thumb on the approach meter is the only moving colour in the HUD.

## Player ship — "REFLEX 07"

Needle-nosed dart, nose points **right**, swept delta wings trailing left, twin thrust bars off the tail.

Level of detail — swap the asset, don't scale one file:

| asset | size | drops |
|---|---|---|
| `ship-reflex07.svg` | > 150px | full: halftone, hairlines, vent, nose whisker |
| `ship-reflex07-small.svg` | 102px (gameplay) | halftone + hairlines |
| `ship-reflex07-icon.svg` | 54px (lives, HUD) | canopy too — silhouette + one thrust wedge |

Silhouette must stay a right-pointing dart at every size. When in doubt, cut detail, never outline weight.

Enemies inherit the same construction with the nose reversed and the canopy omitted; blaze is reserved for their weapons and damage states, so an undamaged enemy is bone-only.

## Files

- `solar-blaster.css` — tokens + HUD primitives (`.sb-screen`, `.sb-planet`, `.sb-bar`, `.sb-meter`, `.sb-chip`, `.sb-plate`, `.sb-num`, `.sb-label`)
- `hud.html` — working reference screen at 1280×720, uses only those classes
- `assets/*.svg` — the three ship LODs

Fonts load from Google Fonts inside the CSS; self-host before shipping.
