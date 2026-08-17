# Solar Blaster

Arcade space shooter — **V1** and **V2** ship together with separate saves.

## Quick start

```sh
npx serve .
# Open http://localhost:3000
```

Pick a version on the hub page:
- **[V1 — Neon Outward](v1/)** — Mercury → Neptune
- **[V2 — Stencil Riso](v2/)** — Neptune → Sun

Deploys to Vercel as a static site (no backend).

---

## Saves (isolated)

| Version | localStorage prefix |
|---|---|
| V1 | `solarBlaster.v1.*` |
| V2 | `solarBlaster.v2.*` |

Playing one version never overwrites the other. Legacy unprefixed keys are migrated into the matching namespace on first boot of that version.

---

## V2 campaign

9 destinations in fixed inward order: **Neptune → Uranus → Saturn → Jupiter → Mars → Earth → Venus → Mercury → Sun**.

Each level runs three phases:
- **Approach** (~45s) — planet disc on the horizon, sparse asteroids, gentle hazard
- **Descent** (~60s) — planet grows; moons drift through; denser asteroids; hazard intensifies
- **Conquest** — planet fills the frame; boss arrives; defeat it to unlock the next destination

### Controls (V2)

| Input | Action |
|---|---|
| WASD / Arrow keys | Move ship |
| SPACE | Fire |
| 1 / 2 / 3 | Switch weapon |
| R | Reload current magazine |
| Scroll wheel | Cycle weapons |
| Mouse hold | Move toward cursor + fire |
| Touch left side | Drag to move |
| Touch FIRE button | Fire |
| Touch RELOAD button | Reload |
| Touch 1/2/3 chips | Switch weapon |
| ESC / P | Pause |

### Visual style — Stencil Riso

**Three inks only. No neon.**

| Token | Value | Use |
|---|---|---|
| `bone` | `#efe9dd` | Hulls, HUD strokes, asteroids, numerals |
| `blaze` | `#ff4d17` | Thrust, guns, damage, danger, planets |
| `teal` | `#0f7a6a` | Shields and pickups only |
| `ink` | `#16181c` | Ground, canopies, HUD knockout plates |

### V2 persistence

| Key | What it stores |
|---|---|
| `solarBlaster.v2.coins` | Total coins banked across all runs |
| `solarBlaster.v2.unlocked` | Array of destination IDs (default: `["neptune"]`) |
| `solarBlaster.v2.highScores` | Per-planet high score map |
| `solarBlaster.v2.upgrades` | `{ weaponPower, shieldCapacity, speed, magazineCapacity, skin }` |
| `solarBlaster.v2.campaignComplete` | `"true"` once Sun is defeated |

Tune V2 numbers in [`v2/src/data/balance.js`](v2/src/data/balance.js). `GAME_SPEED` drives all planets.

---

## V1 campaign

Outward journey **Mercury → Venus → Earth → Mars → Jupiter → Saturn → Uranus → Neptune**. Neon palette, per-skin upgrade tracks, single global high score.

V1 code lives under [`v1/`](v1/).

---

## Layout

```
index.html                 Version picker hub
styles/hub.css             Hub styles
v1/                        Classic Neon Outward build
  index.html
  src/ …
  styles/
v2/                        Stencil Riso inward campaign
  index.html
  src/ …
  styles/
files/                     Specs + design handoff
```

---

## Tech stack

- **Phaser 3** (CDN) — no npm required
- **Vanilla JS ES modules**
- **Web Audio API** — procedural SFX
- **localStorage** — separate V1 / V2 namespaces
