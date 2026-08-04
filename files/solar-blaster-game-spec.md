# Solar Blaster — Game Design Spec
*(working title — rename freely; see Section 13)*

A neon-styled 2D side-scrolling space shooter where the player pilots a fighter jet–style ship through the 8 planets of the solar system, blasting asteroids, dodging planet-specific hazards, and defeating a boss at the end of each planet to unlock the next.

This document is written to be handed directly to an AI coding assistant (Cursor) to implement as a locally-runnable, Vercel-deployable web game.

---

## 1. Overview

- **Genre:** Neon arcade shoot-'em-up (side-scrolling "shmup")
- **Perspective:** Classic 2D side-scroller — ship stays roughly fixed on the left-center of the screen; the world scrolls past horizontally.
- **Platform:** Web browser (desktop + mobile), static site, deployable to Vercel, runnable locally with zero backend.
- **Orientation:** Landscape / widescreen (16:9 base resolution, e.g. 1280×720, scaled to fit). On mobile in portrait, show a "rotate your device" overlay.
- **Players:** Single-player only.
- **Session shape:** Player selects a planet from a level-select menu, plays a short (~1–2 minute) run through an asteroid field with a planet-specific hazard, then fights a boss. Beating the boss unlocks the next planet.
- **Tone:** Bright, glowing, arcade-fun. No story/narrative framing needed — it's a pure arcade shooter.

---

## 2. Tech Stack & Project Setup

**Recommended stack:**
- **Phaser 3** (game framework) — loaded via CDN `<script>` tag, **no bundler/build step required**. This keeps the project "just open index.html" simple while giving us sprite/physics/particle/sound/scene management out of the box, which this game needs (8 levels, bosses, upgrades, persistent state).
- **Vanilla JavaScript** (ES modules) for game logic, organized into scene files.
- **HTML5 Canvas** (via Phaser) for all rendering — no external image/sprite files. All visuals are drawn procedurally as vector shapes with glow effects (see Section 15).
- **Web Audio** via Phaser's built-in sound manager for SFX and music.
- **localStorage** for all persistence (high score, coins, unlocked planets, purchased upgrades) — no backend/database needed.

**Why no bundler:** the goal is "locally hosted game I can just run." A plain `index.html` + Phaser CDN + a handful of `.js` files can be run with any static file server (`npx serve .`, VS Code Live Server, or Vercel's default static hosting) with no `npm install` step required. If Cursor prefers Vite for dev-experience reasons, that's an acceptable alternative — but the output must still deploy as a static site with no server-side code.

**Suggested project structure:**
```
/solar-blaster
  index.html
  /src
    main.js              // Phaser config + scene registration
    scenes/
      BootScene.js
      TitleScene.js
      PlanetSelectScene.js
      GameScene.js
      HangarScene.js       // upgrade shop
      GameOverScene.js
      VictoryScene.js
    entities/
      Ship.js
      Asteroid.js
      Boss.js
      Projectile.js
      Pickup.js
    systems/
      SaveData.js           // localStorage read/write wrapper
      DifficultyCurve.js
      HazardSystem.js
    data/
      planets.js             // planet order, hazards, boss config
      weapons.js
      upgrades.js
  /styles
    style.css
  README.md                  // how to run locally + deploy to Vercel
```

---

## 3. Core Gameplay Loop

1. **Title Screen** → Planet Select
2. **Planet Select Menu** → shows all 8 planets in solar-system order; locked planets are greyed out; shows current coin total and high score
3. **Hangar (upgrade shop)** accessible from the menu → spend coins on upgrades
4. **Level (GameScene):**
   - Ship auto-scrolls forward through space (world scrolls left, ~1–2 min duration)
   - Asteroids spawn and must be dodged/shot
   - Planet-specific hazard is active throughout
   - Difficulty (spawn rate + asteroid speed) ramps up over the level
   - Coins/gems drop from destroyed asteroids
   - Power-ups occasionally drop (shield, weapon upgrade token)
   - At the end of the level, a **boss fight** begins
5. **Boss fight:** boss has its own health bar, attack patterns; defeating it = level win
6. **Level result:**
   - **Win:** next planet unlocks, coins banked, return to Planet Select
   - **Lose (shield hits 0):** retry the same level, with return to Planet Select as an option. **Coins collected during the failed run are kept** (no penalty — keeps it kid-friendly and makes upgrades always feel earnable)
7. Repeat until all 8 planets are cleared (no forced "game over" ending screen needed beyond a small celebration — this is an arcade game meant to be replayed for high score)

---

## 4. Controls

Must support all three equally well:

| Input | Action |
|---|---|
| **Keyboard** | Arrow keys / WASD to move ship (vertical + limited horizontal drift); Spacebar to fire; number keys 1–3 to switch weapon |
| **Mouse** | Move mouse to aim/position ship; click or hold to fire; scroll wheel (or number keys 1–3) to switch weapon |
| **Touch** | Drag to move ship; tap-and-hold on-screen fire button; on-screen weapon-switch buttons |

Ship movement is constrained mostly to a vertical band on the left-third of the screen (classic side-scroller shmup positioning), with some horizontal drift allowed for dodging.

---

## 5. Ship

- **Visual style:** Sleek fighter-jet silhouette — angular, pointed nose, small wings, drawn as a glowing vector shape (not a photo-real sprite).
- **Default color:** Cyan neon outline (customizable via skins — see Section 11).
- **Trail effect:** Particle engine trail behind the ship (glowing dots/lines) that intensifies with speed upgrades.
- **Hit feedback:** Ship flashes white and shield bar visibly drops when hit; brief invulnerability window (~1 second) after taking damage to avoid instant multi-hit death.

---

## 6. Weapons System

**All three weapons are available from the start** — the shop upgrades their power, it does not unlock them. Player can switch between weapon types **in-game** at any time. Suggested default set:

| Weapon | Behavior | Fire rate | Damage | Notes |
|---|---|---|---|---|
| **Laser** | Straight, fast, thin bolt | Fast | Low | Default starting weapon, unlimited use |
| **Plasma Spread** | 3-way spread shot | Medium | Medium | Good against clustered asteroids |
| **Missiles** | Slower-moving, mild homing toward nearest target | Slow | High | Best against bosses |

Each weapon has its own **upgrade tier** purchasable in the Hangar (see Section 11), improving damage and/or fire rate. Weapon switching is instant (no cooldown to switch, only to fire).

---

## 7. Enemies — Asteroids

- **Only regular enemy type** in the game (no alien/robot grunts — those are reserved for bosses).
- Spawn from the right edge of the screen, drift left toward the player at varying speeds.
- **Sizes:** small / medium / large — large asteroids can optionally split into 2 smaller ones when shot (adds a satisfying "shatter" moment; recommended but adjustable).
- Destroying an asteroid drops a small chance of a coin/gem or power-up.
- Behavior is simple: dodge-and-shoot, no enemy return fire (keeps this distinct from bosses, which do attack).

---

## 8. Bosses

- One boss per planet, appearing after the asteroid field phase.
- **Theme:** mixed — a blend of alien motherships, rogue robots, and "planet guardian" creatures across the 8 planets (assign a distinct theme per planet for visual variety; see suggested table in Section 9).
- **Mechanics:**
  - Boss has a visible health bar (separate from player's shield bar).
  - Boss has 2–3 attack patterns (e.g., spread-fire volleys, a telegraphed charge/laser sweep, summon a few asteroids) that escalate as its health drops (classic "phase" structure — recommend 2 phases: full-health and below-50%).
  - Boss does not move much horizontally; player must dodge patterned bullets while returning fire.
- Defeating the boss triggers a short explosion/victory animation before returning to Planet Select.

---

## 9. Levels — The 8 Planets

Planets appear in real solar-system order, each unlocked by beating the previous one. Suggested hazard + boss theme per planet (adjust freely):

| # | Planet | Unique Hazard | Suggested Boss Theme |
|---|---|---|---|
| 1 | Mercury | Solar flare bursts sweep across the screen periodically | Rogue mining robot |
| 2 | Venus | Thick toxic cloud reduces visibility | Alien bio-creature |
| 3 | Earth | Satellite/debris field, denser asteroid clusters | Alien mothership |
| 4 | Mars | Sandstorm reduces visibility + pushes ship off course | Planet guardian (rock creature) |
| 5 | Jupiter | Gravity wells pull the ship toward the center of the screen | Giant robot war-machine |
| 6 | Saturn | Ring debris — dense band of small fast asteroids | Alien ring-serpent guardian |
| 7 | Uranus | Ice comet fragments + slowed ship handling (cold) | Crystalline robot |
| 8 | Neptune | Violent wind gusts + darker visibility (final/hardest level) | Final boss — largest, combines patterns from earlier bosses |

Each level lasts roughly **1–2 minutes** before the boss phase begins. Difficulty baseline increases with each successive planet (Neptune's asteroid field is faster/denser from the start than Mercury's).

---

## 10. Power-ups & Pickups

Dropped occasionally from destroyed asteroids:

| Pickup | Effect |
|---|---|
| **Coin/Gem** | Adds to currency total (persists after level, used for upgrades) |
| **Shield Boost** | Instantly restores a chunk of the shield bar |
| **Weapon Token** | Rapid-fire mode for the current weapon for ~10 seconds (visible countdown ring around the ship while active) |

Shield also **slowly regenerates on its own** over time during a level, in addition to pickups (per your earlier answer: both regeneration + pickups).

---

## 11. Progression, Currency & Upgrades

- **Currency:** Coins/gems collected during levels (not points — points are separate, for the high score).
- **Scoring (how points are earned):**
  - Small asteroid destroyed: 10 pts · Medium: 25 pts · Large: 50 pts
  - Boss defeated: 500 pts + a survival bonus based on remaining shield
  - Score accumulates over a single level run; **high score = the best single-run score ever achieved**, saved to localStorage and shown on Planet Select.
- **Persistent upgrades**, purchased in the Hangar screen with coins:
  - **Weapon power** — increases damage per weapon type
  - **Shield capacity** — increases max shield/health
  - **Speed & handling** — faster, tighter ship movement
  - **Cosmetic skins** — alternate ship colors (no gameplay effect)
- Upgrades persist across sessions via localStorage and carry into every level.

---

## 12. HUD / UI

Visible during gameplay:
- **Score** (top area)
- **Coins collected this run** (top area)
- **Shield bar** (visual bar, top area)
- **Mini-map** (corner) — shows progress through the current level as a horizontal track, with an icon marking how close the player is to the boss encounter

Menus needed:
- **Title screen** (Play button, maybe a settings/mute icon)
- **Planet Select** (8 planet icons in a row/orbit layout, locked ones dimmed, shows coins + high score)
- **Hangar / Upgrade shop** (list of upgrades with coin costs, purchase buttons)
- **Pause menu** (resume, restart level, mute, return to planet select) — accessible mid-level
- **Level Win screen** (coins earned, next planet unlocked, return to menu)
- **Level Lose screen** ("Shield depleted" — retry same level or return to menu)

---

## 13. Naming

No name locked in yet. "Solar Blaster" is used as a placeholder throughout this doc — swap in the real title once you and Ted land on one (this is a pure find-and-replace, not a structural decision).

---

## 14. Difficulty Scaling

Two layers:
1. **Within a level:** asteroid spawn rate and speed increase gradually the longer the level runs (roughly linear ramp over the 1–2 minute duration).
2. **Across planets:** each successive planet starts at a higher baseline difficulty than the last planet's starting point — Neptune (planet 8) should feel noticeably more intense from the first second than Mercury (planet 1).

---

## 14b. Starter Balance Numbers (tune during playtesting)

| Value | Suggested default |
|---|---|
| Base shield (HP) | 100 (+25 per shield-capacity upgrade tier, max 3 tiers) |
| Shield passive regen | 2 HP/sec, pauses for 3s after taking a hit |
| Asteroid damage on collision | Small 10 · Medium 20 · Large 35 |
| Boss projectile damage | 15 |
| Level duration before boss | 75–90 seconds |
| Coin drop chance per asteroid | ~30% (coin worth 1; rare gem worth 5, ~5% chance) |
| Power-up drop chance | ~8% |
| Upgrade costs | Tier 1: 50 coins · Tier 2: 125 · Tier 3: 300 (per upgrade track); skins: 75 each |
| Boss HP | Mercury ≈ 300, scaling up ~30% per planet to Neptune |

These are starting points, not laws — the README should note where to tweak them (a single `data/balance.js` constants file is ideal).

---

## 15. Visual Style Guide

**Aesthetic:** Bright neon glow on a deep-space black background. Everything is drawn procedurally (vector shapes + glow/blur effects) — no external image assets required.

**Suggested palette** (adjust as desired):
- Background: near-black deep space, `#05010F`
- Ship default: electric cyan, `#00F5FF`
- Asteroids: muted violet-grey with a faint glow, `#8C7AE6`
- Coins/gems: bright gold, `#FFD93D`
- Shield bar: teal-green, `#00E5A0`
- Boss accents: hot magenta, `#FF2EC4`
- Per-planet accent colors for background/hazard tinting (e.g., Mercury = orange-red flare tones, Venus = sickly yellow-green haze, Earth = blue-green with white satellite glints, Mars = rust red, Jupiter = amber/brown bands, Saturn = pale gold rings, Uranus = icy cyan-blue, Neptune = deep indigo)

**Glow technique:** Use layered shapes with soft blur/shadow (Phaser's post-fx glow or manually layered semi-transparent duplicate shapes) rather than sprite sheets — this keeps the whole game code-generated with no art pipeline needed.

---

## 16. Audio

- **Music:** upbeat synthwave/chiptune-style looping background track, ideally one variant per planet (or at minimum, one general track + a more intense variant for boss fights).
- **SFX needed:** laser fire, missile fire, explosion (small/large), shield hit, coin pickup, power-up pickup, boss alert/roar, level win, level lose, UI click.
- **Source:** since Cursor can't generate audio, use royalty-free/CC0 sound packs (e.g., from freesound.org or opengameart.org) or simple Web Audio API–generated tones as placeholders, with a note in the README on where to swap in final audio files.

---

## 17. Data Persistence (localStorage schema)

Suggested keys:
```js
{
  "solarBlaster.highScore": 12500,
  "solarBlaster.coins": 340,
  "solarBlaster.unlockedPlanets": ["mercury", "venus", "earth"],
  "solarBlaster.upgrades": {
    "weaponPower": 2,
    "shieldCapacity": 1,
    "speed": 0,
    "skin": "cyan"
  }
}
```
All progress is local-device only (no online accounts, no shared/online leaderboard).

---

## 18. Explicitly Out of Scope

- No multiplayer (single-player only)
- No online/shared leaderboards (local high score only)
- No story/narrative elements
- No external image or sprite assets (everything is code-drawn)
- No backend/server — fully static site

---

## 19. Design Decisions Filled In By Default

The following details were not explicitly decided in the design Q&A and use sensible defaults chosen to make this spec fully buildable. They are all easy to change later and are centralized in data/constants files:

- Weapon set (Laser / Plasma Spread / Missiles) and stats
- Boss attack patterns and 2-phase structure
- Per-planet hazard mechanics and boss theme assignments
- Large asteroids splitting into two smaller ones
- Palette hex values and per-planet accents
- All balance numbers in Section 14b
- Scoring values in Section 11
- Audio placeholder approach (Web Audio generated tones)

Everything else in this doc reflects a direct answer from the design sessions.
