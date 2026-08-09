# Solar Blaster V2 — Stencil Riso

A stencil-print arcade space shooter built with Phaser 3 (CDN) + vanilla JS ES modules. No bundler required.

## Quick start

```sh
npx serve .
# Open http://localhost:3000
```

Deploys to Vercel with zero configuration (static site, no backend).

---

## V2 campaign

9 destinations in fixed inward order: **Neptune → Uranus → Saturn → Jupiter → Mars → Earth → Venus → Mercury → Sun**.

Each level runs three phases:
- **Approach** (~45s) — planet disc on the horizon, sparse asteroids, gentle hazard
- **Descent** (~60s) — planet grows; moons drift through; denser asteroids; hazard intensifies
- **Conquest** — planet fills the frame; boss arrives; defeat it to unlock the next destination

---

## Controls

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

---

## Visual style — Stencil Riso

**Three inks only. No neon.**

| Token | Value | Use |
|---|---|---|
| `bone` | `#efe9dd` | Hulls, HUD strokes, asteroids, numerals |
| `blaze` | `#ff4d17` | Thrust, guns, damage, danger, planets |
| `teal` | `#0f7a6a` | Shields and pickups only |
| `ink` | `#16181c` | Ground, canopies, HUD knockout plates |

Rules: flat fills, halftone screens (9px dot pitch), misprint offset (6px down+right), 2px stencil strokes. No gradients on objects; no neon glow on UI — blur for engine exhaust only.

See `.cursor/rules/solar-blaster-visual.mdc` for the full enforced rule set and `files/solar-blaster-design-handoff/handoff/STYLE-GUIDE.md` for the design handoff.

---

## Persistence (localStorage)

| Key | What it stores |
|---|---|
| `solarBlaster.coins` | Total coins banked across all runs |
| `solarBlaster.unlocked` | Array of destination IDs (default: `["neptune"]`) |
| `solarBlaster.highScores` | Per-planet high score map `{ neptune: 4200, … }` |
| `solarBlaster.upgrades` | `{ weaponPower, shieldCapacity, speed, magazineCapacity, skin }` |
| `solarBlaster.campaignComplete` | `"true"` once Sun is defeated |

Legacy V1 keys are wiped on first boot.

---

## Upgrade tracks (Hangar)

| Track | Effect | Max tiers |
|---|---|---|
| Weapon Power | +35% / +75% / ×2.2 damage across all weapons | 3 |
| Shield Capacity | +25 HP per tier (100 → 175 max) | 3 |
| Speed & Handling | +50 px/s per tier (280 → 430 px/s max) | 3 |
| Magazine Capacity | +17% magazine + shorter reload at tier 3 | 3 |

Skin markings (bone hull always constant; only pattern changes):
- Standard (free) · Wing Stripe · Stencil Cut · Canopy Mark · Hazard

---

## Weapons

| # | Weapon | Magazine | Notes |
|---|---|---|---|
| 1 | Laser | 30 | Fast straight shots |
| 2 | Plasma | 12 | 3-way spread |
| 3 | Missiles | 6 | Slow homing |

Press **R** or touch **RELOAD** when empty. Firing on an empty magazine auto-reloads (never a dead end). Switching weapon cancels an in-progress reload.

---

## Tech stack

- **Phaser 3** (CDN) — no npm required
- **Vanilla JS ES modules** — scenes, entities, systems
- **Web Audio API** — all SFX procedurally generated (swap in real files via AudioSystem)
- **localStorage** — no backend, no accounts

---

## Acceptance checklist (V2)

Run `npx serve .` and verify:

- [ ] Title screen loads; brand is hero-level; Stencil Riso palette (bone/blaze/ink); no neon/cyan
- [ ] Neptune is the only unlocked destination on first boot (V1 save wiped)
- [ ] Each of the 3 weapons has a visible magazine counter in HUD
- [ ] R key / RELOAD button reloads; progress ring appears; firing on empty auto-reloads
- [ ] Planet disc grows continuously Approach → Descent → Conquest
- [ ] "DIST NNN km" readout decrements to 0 at Conquest
- [ ] Moon drifts through during Descent (Neptune: Triton, retrograde)
- [ ] Boss spawns at Conquest; 2-phase; bone hull, blaze weapons
- [ ] Defeating boss shows LevelWinScene; Uranus unlocked; per-planet high score saved
- [ ] Dying shows LevelLoseScene; coins banked; retry works
- [ ] Hangar: bone gantry, rotating ship, 4 upgrade console panels, skin row
- [ ] HUD matches hud.html: top-left SCORE/COINS/ARMED, top-right approach meter on ink plate, bottom-left hull bar
- [ ] No cyan/magenta neon glow on any ship, UI element, or HUD bar
- [ ] Runs on mobile (touch controls visible, portrait shows rotate overlay)
- [ ] Deploys to Vercel with zero config changes

---

## File map

```
src/
  main.js                      Phaser config + scene registration
  scenes/
    BootScene.js               SaveData.init() → TitleScene
    TitleScene.js              Stencil Riso title; bone/blaze/ink; no neon
    PlanetSelectScene.js       9 destinations, inward order, per-planet scores
    GameScene.js               Three-phase gameplay, V2 HUD, collision, pickups
    HangarScene.js             Physical interior, 4 upgrade tracks, skin row
    LevelWinScene.js           Post-conquest stats + unlock reveal
    LevelLoseScene.js          Retry / planet select
    CampaignCompleteScene.js   Solar system conquered
  entities/
    Ship.js                    REFLEX 07 (StencilArt), WeaponSystem, 4 upgrade tracks
    Asteroid.js                Bone polygon, halftone, blaze misprint
    Projectile.js              Blaze bar with misprint shadow
    Pickup.js                  Coin / gem / shield / ammo / rapid-fire
    Boss.js                    2-phase (3-phase for Sun), Stencil Riso
    Moon.js                    Slow high-HP descent obstacles
  systems/
    SaveData.js                V2 localStorage schema, V1 wipe, per-planet scores
    WeaponSystem.js            Magazines, R/auto-reload, touch RELOAD, HUD state
    PhaseManager.js            Approach → Descent → Conquest timing, planet radius
    StencilArt.js              All procedural drawing: ship, asteroid, planet, pickups, HUD helpers
    HazardSystem.js            All 9 V2 hazards (windGusts … solar)
    DifficultyCurve.js         Asteroid speed + spawn interval per planet + time
    AudioSystem.js             Web Audio procedural SFX (swap in real files here)
  data/
    planets.js                 9 destinations, Stencil Riso palette, moons, boss config
    weapons.js                 Laser / plasma / missiles — magazine sizes, damage tiers
    upgrades.js                4 global tracks + 5 skin markings
    balance.js                 All numeric tuning values (Section 13)
styles/
  style.css                   Stencil Riso design tokens, fonts, HUD primitives
index.html                    Saira Stencil One / Barlow Condensed / Space Mono fonts
.cursor/rules/
  solar-blaster-visual.mdc    Enforced Stencil Riso rules for all future AI edits
files/
  solar-blaster-v2-spec.md    V2 gameplay source of truth (Section 14 = Stencil Riso)
  cursor-instructions-v2.md   AI coding guidelines (hard req #3 = Stencil Riso, no neon)
  solar-blaster-design-handoff/  Reference CSS, HUD HTML, SVG ship geometry
```
