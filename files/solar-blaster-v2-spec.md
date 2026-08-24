# Solar Blaster V2 — Game Design Spec
*(working title — rename freely)*

A stencil-print arcade space shooter. The player arrives from beyond the solar system and conquers it planet by planet, working inward from Neptune to Mercury, with the Sun itself as the final objective — the ultimate power source, and the reason for the whole campaign.

**This document supersedes V1.** It is written to be handed directly to an AI coding assistant (Cursor) to implement as a locally-runnable, Vercel-deployable web game.

---

## 1. Overview

- **Genre:** Stencil-print arcade shoot-'em-up (side-scrolling "shmup") with light educational grounding in real planetary science
- **Perspective:** Classic 2D side-scroller — ship holds position on the left-third of the screen; the world scrolls past horizontally
- **Orientation:** Landscape / widescreen (1280×720 base, scaled to fit). Portrait on mobile shows a "rotate your device" overlay
- **Platform:** Web browser (desktop + mobile), static site, Vercel-deployable, runs locally with no backend
- **Players:** Single-player only
- **Campaign:** 9 levels — 8 planets plus the Sun — played in a fixed inward order, each unlocked by beating the previous one
- **Session shape:** ~2–3 minutes per level across three phases (Approach → Descent → Conquest/boss)
- **Tone:** High-contrast, bold, arcade-fun; a two-ink stencil print on black with real planetary facts woven into hazards rather than delivered as text

---

## 2. Story Framing

The player is conquering the solar system in order to reach and harness the Sun's power. Each planet must be taken before pushing further inward; the Sun is the final prize.

Delivered lightly — a single opening title card at campaign start, and a one-line objective banner when each level begins ("NEPTUNE — TAKE THE OUTER GATE"). No cutscenes, no dialogue trees. This is an arcade game with a reason to exist, not a narrative game.

---

## 3. Tech Stack & Project Setup

**Stack:**
- **Phaser 3** loaded via CDN `<script>` tag — **no bundler, no npm install required**
- **Vanilla JavaScript** (ES modules), organised into scene/entity/system files
- **HTML5 Canvas** via Phaser for all rendering — no external image assets; everything is procedurally drawn using Stencil Riso rules: flat fills, hard edges, halftone screens, misprint offset (see Section 14)
- **Web Audio** via Phaser's sound manager, using generated placeholder tones (see Section 15)
- **localStorage** for all persistence — no backend, no accounts, no online leaderboards

**Why no bundler:** the goal is "a game I can just run." A plain `index.html` + Phaser CDN + `.js` modules runs under any static file server (`npx serve .`) and deploys to Vercel with zero configuration.

**Project structure:**
```
/solar-blaster
  index.html
  /src
    main.js                  // Phaser config + scene registration
    scenes/
      BootScene.js
      TitleScene.js
      PlanetSelectScene.js
      HangarScene.js
      GameScene.js           // handles all three level phases
      PauseScene.js
      LevelWinScene.js
      LevelLoseScene.js
      CampaignCompleteScene.js
    entities/
      Ship.js
      Asteroid.js
      Moon.js
      Boss.js
      Projectile.js
      Pickup.js
    systems/
      SaveData.js            // localStorage wrapper
      WeaponSystem.js        // firing, magazines, reload
      HazardSystem.js        // per-planet environmental effects
      DifficultyCurve.js
      PhaseManager.js        // Approach → Descent → Conquest
    data/
      planets.js             // order, hazards, moons, boss config, palettes
      weapons.js
      upgrades.js
      balance.js             // ALL tunable numbers live here
  /styles
    style.css
  README.md                  // run locally + deploy to Vercel
```

---

## 4. Core Gameplay Loop

1. **Title Screen** → Planet Select
2. **Planet Select** — the 9 destinations laid out as an inward journey from deep space toward the Sun. Locked destinations dimmed. Shows total coins and **each planet's individual high score**
3. **Hangar** — accessible from Planet Select; spend coins on upgrades
4. **Level (GameScene)** — three phases, seamless, no loading between them:
   - **Phase 1 — Approach.** The target planet is a small distant disc on the right horizon. Open space, moderate asteroid density, the planet's signature hazard introduced gently. ~45 seconds
   - **Phase 2 — Descent.** The planet grows steadily larger in the background as the ship closes in. Asteroid density and speed ramp up; the hazard intensifies; the planet's moons drift through as large slow obstacles. ~60 seconds
   - **Phase 3 — Conquest.** The planet fills the background. Asteroids stop spawning; the boss arrives. Fight to the finish
5. **Level result:**
   - **Win:** planet conquered, next destination unlocks, coins banked, score checked against that planet's personal best
   - **Lose (shield hits 0):** retry the same level, or return to Planet Select. **Coins collected during the failed run are kept** — no penalty
6. Beating the Sun completes the campaign (short celebration screen). All levels remain replayable for score.

**The planet growing in the background is the progress indicator.** It replaces V1's mini-map entirely — a small "DISTANCE TO PLANET" readout in the HUD supplements it numerically.

---

## 5. Controls

| Input | Action |
|---|---|
| **Keyboard** | Arrow keys / WASD to move; Spacebar to fire; **R to reload**; 1–3 to switch weapon; Esc to pause |
| **Mouse** | Move to position ship; click or hold to fire; scroll wheel to switch weapon; **R to reload** |
| **Touch** | Drag to move; on-screen fire button; on-screen **RELOAD** button; on-screen weapon-switch buttons; pause button |

Ship movement is constrained to the left-third of the screen with vertical freedom and limited horizontal drift.

---

## 6. Ship

- **Visual:** REFLEX 07 — needle-nosed dart, nose pointing right, swept delta wings trailing left, twin blaze thrust bars off the tail. Procedurally drawn using Stencil Riso rules (bone hull, ink canopy, blaze misprint silhouette underlay). Three LOD sizes: gameplay ~102px wide, icon ~54px for HUD/lives. Enemies use the same construction with the nose reversed and no canopy; they are bone-only when undamaged and blaze only on their weapons and damage states
- **Default colour:** Bone hull with blaze thrust (no cyan). Skins are marking/pattern variants — stripe, stencil cut, canopy mark — not hull colour changes
- **Trail:** Short blaze dashes off the tail, intensifying with speed upgrades. Blur is permitted for engine glow only
- **Hit feedback:** Flash bone-white, screen shake, shield bar drop, ~1 second invulnerability window to prevent instant multi-hit death

---

## 7. Weapons, Magazines & Reload

All three weapons are available from the start. Shop upgrades improve them; they do not unlock them.

| Weapon | Behaviour | Magazine | Fire rate | Damage | Role |
|---|---|---|---|---|---|
| **Laser** | Straight, fast, thin bolt | 30 | Fast | Low | Default workhorse |
| **Plasma Spread** | 3-way spread shot | 12 | Medium | Medium | Crowd clearing |
| **Missiles** | Slow, mildly homing | 6 | Slow | High | Boss killing |

**Reload mechanic:**
- Each weapon has its own magazine. Firing depletes it
- When empty, a **flashing "PRESS R TO RELOAD"** prompt appears near the ship
- Reload takes **~1 second**. During reload the player **can move freely but cannot shoot**
- Attempting to fire on an empty magazine **auto-triggers the reload** — never a trap for new players
- Each weapon reloads independently; switching weapons mid-reload is allowed and cancels it
- A distinct reload sound and a small circular progress indicator on the ship communicate the wait

**Design intent:** magazines discourage holding down fire indiscriminately and make weapon choice meaningful — you can't spam missiles, and running dry mid-boss is a real consequence of poor discipline.

**Magazine capacity is a purchasable upgrade track** (Section 11).

---

## 8. Enemies & Obstacles

**Asteroids** — the standard threat on every level. Spawn from the right, drift left at varying speeds. Three sizes (small/medium/large); large ones split into two mediums when destroyed. Drop coins and occasional power-ups. They do not shoot back.

**Moons** — real moons of the target planet, appearing during the Descent phase as **large, slow, high-health obstacles**. They are dodge-only hazards rather than realistic targets: enormous HP, worth big points if a player is stubborn enough to destroy one. Sized relative to each other with rough real-world accuracy, so Ganymede genuinely dwarfs Phobos. Per-planet moon assignments in Section 9.

**Bosses** — one per level, arriving in the Conquest phase. Visible health bar, 2 phases (full-health and below-50%), 3 attack patterns each, escalating on phase change. Bosses hold position horizontally; the fight is about dodging patterned fire while managing ammo. Defeating one triggers an explosion sequence and the level win.

---

## 9. The Nine Destinations

Played in this fixed inward order. Difficulty baseline climbs steadily from Neptune to the Sun.

### 1. Neptune — *The Outer Gate*
**Real science:** The windiest place in the solar system, with supersonic storms reaching roughly 2,100 km/h. Deeply cold, dark, and far from the Sun. Historically home to a huge storm system, the Great Dark Spot.
**Hazard:** Sudden violent wind gusts shove the ship sideways without warning. A slow-drifting Dark Spot vortex periodically sweeps the field, pulling both the ship and nearby asteroids toward its centre.
**Moons:** Triton (large, drifting against the flow of everything else — a nod to its genuine retrograde orbit).
**Boss:** Planet guardian — a windborne leviathan woven from storm plasma.
**Palette:** Deep indigo and pale storm-blue.

### 2. Uranus — *The Tilted World*
**Real science:** Rotates on its side at an axial tilt of about 98°, unique among the planets. An ice giant with faint rings and extreme seasons.
**Hazard:** **The play field periodically tilts.** The direction that asteroids drift and the ship gets pulled rotates through 90° and back — the game's most distinctive one-off mechanic, and no other level reuses it.
**Moons:** Miranda (visibly scarred with cliff faces), Titania, Oberon.
**Boss:** Crystalline robot — an angular ice-machine that reorients itself as the field tilts.
**Palette:** Icy cyan-blue and pale mint.

### 3. Saturn — *The Ring Run*
**Real science:** Spectacular rings of ice and rock. Low enough density to float in water. A genuine, persistent hexagonal storm at its north pole.
**Hazard:** Dense ring-debris fields demanding precise weaving — fast, small, relentless. A rare **hexagonal bonus pocket** briefly opens in the debris, packed with coins, rewarding precision flying.
**Moons:** Titan (huge, hazy orange), Enceladus (icy, venting geysers), Mimas (dominated by one enormous crater).
**Boss:** Alien ring-harvester — a segmented serpentine machine strip-mining the rings.
**Palette:** Pale gold and warm cream.

### 4. Jupiter — *The Giant's Eye*
**Real science:** Overwhelming gravity, roughly 2.5× Earth's. The Great Red Spot is a storm larger than Earth that has raged for centuries. Intense radiation belts surround the planet.
**Hazard:** Gravity wells drag the ship off course. Radiation belt lanes slowly drain shield unless the player weaves clear of them.
**Moons:** The Galilean four — Io (volcanic, sulphur-yellow), Europa (smooth ice), Ganymede (largest moon in the solar system, larger than Mercury), Callisto (heavily cratered).
**Boss:** Giant robot war-machine — **fought inside the Great Red Spot itself**, which becomes a vast swirling arena filling the entire background.
**Palette:** Amber, rust and cream banding.

### 5. Mars — *The Rust Plains*
**Real science:** Planet-engulfing dust storms. Iron-oxide surface. Roughly 38% of Earth's surface gravity. Home to Olympus Mons, the largest volcano in the solar system.
**Hazard:** Dust storms cut visibility and push the ship off course. **Lower gravity makes the ship handle floatier here than anywhere else** — a physics change unique to this level, requiring the player to adapt.
**Moons:** Phobos and Deimos — both small, lumpy and irregular, deliberately unimpressive after Jupiter's giants.
**Boss:** Planet guardian — a colossal rock construct rising from Olympus Mons.
**Palette:** Rust red and dusty ochre.

### 6. Earth — *Home Turf*
**Real science:** Dense weather-bearing atmosphere, a protective magnetic field, and a genuinely crowded belt of human-made satellites and orbital debris.
**Hazard:** **Space junk** — angular, metallic, visually distinct from natural asteroids — plus lightning storm flashes across the atmosphere below. A **commercial rocket** (generic silhouette, fictional branding) launches across the screen periodically as a large moving obstacle.
**Moons:** The Moon.
**Boss:** **TBC — placeholder.** The only fixed design constraint is that Earth's boss should be **human-made rather than alien or natural** — the one planet where the threat is our own technology turned against us. Mechanically fully specified regardless: 2 phases, 3 attack patterns, HP per Section 13. Build it with placeholder art (a large angular orbital structure with neon accents); the final character is a cosmetic swap requiring no changes to fight logic.
**Palette:** Blue-green with white satellite glints.

### 7. Venus — *The Furnace*
**Real science:** The hottest planet in the solar system — hotter than Mercury despite being further from the Sun — due to a runaway greenhouse effect. Crushing surface pressure. Clouds of sulphuric acid. **No moons at all.**
**Hazard:** Lingering inside acid cloud banks slowly drains shield, forcing constant movement. Heat-haze distortion warps the visuals. With no moons to dodge, this level leans entirely on its atmosphere.
**Moons:** None — and the level is designed around their absence.
**Boss:** Alien bio-creature — something that evolved to thrive in acid and pressure.
**Palette:** Sickly yellow-green and sulphur orange.

### 8. Mercury — *The Anvil*
**Real science:** Almost no atmosphere, so surface temperatures swing from roughly 430°C in daylight to −180°C at night. Heavily cratered. Closest planet to the Sun. **No moons.**
**Hazard:** **Alternating heat and cold zones** sweeping across the field. Heat zones apply passive shield damage; cold zones slow the ship's handling. A rhythm hazard rather than a constant one — the player must read the field and time their movement.
**Moons:** None.
**Boss:** Solar-forged robot — a machine built from Mercury's own scorched crust.
**Palette:** Scorched orange-red against deep shadow.

### 9. The Sun — *The Prize*
The campaign finale. Follows the same three-phase structure — Approach, Descent, Conquest — but every element runs at maximum intensity.
**Real science:** Solar flares, coronal mass ejections, sunspots, and prominences — vast arcs of plasma looping off the surface.
**Hazard:** **Constant passive heat drain** on the shield throughout the level, forcing aggressive use of shield pickups and rewarding speed. Flare sweeps cut across the screen on a telegraphed rhythm. Plasma prominences arc up as moving terrain to weave through.
**Moons:** None.
**Boss:** **A plasma entity born from the corona** — deliberately breaking the alien/robot/guardian pattern established by every previous level. Three phases rather than two, incorporating one signature attack borrowed from an earlier boss in each phase, so the finale feels like a summation of the whole journey.
**Palette:** White-hot core bleeding into gold and deep orange.

---

## 10. Pickups

Dropped from destroyed asteroids:

| Pickup | Effect |
|---|---|
| **Coin / Gem** | Currency. Persists after the level, spent in the Hangar |
| **Shield Boost** | Instantly restores a chunk of shield |
| **Ammo Crate** | Instantly refills the current weapon's magazine, no reload needed |
| **Rapid Fire Token** | Rapid fire for ~10 seconds, with a countdown ring around the ship. Does **not** bypass magazine limits — it drains ammo faster, a deliberate risk/reward tension |

Shield also **regenerates slowly on its own** during a level, pausing briefly after each hit.

---

## 11. Progression, Currency & Upgrades

**Currency:** Coins and gems collected in-level. Kept whether the level is won or lost.

**Scoring:**
- Small asteroid 10 pts · Medium 25 pts · Large 50 pts
- Moon destroyed 250 pts (rarely worth it — that's the joke)
- Boss defeated 500 pts, plus a survival bonus scaled to remaining shield
- **High scores are recorded per planet**, not globally. Each destination shows its own personal best on the Planet Select screen, encouraging replay of earlier levels

**Upgrade tracks** (purchased in the Hangar, persistent, apply to every level):
- **Weapon Power** — damage per weapon type
- **Shield Capacity** — maximum shield
- **Speed & Handling** — movement responsiveness
- **Magazine Capacity** — larger magazines across all weapons, plus faster reloads
- **Cosmetic Skins** — alternate ship colours, no gameplay effect

---

## 12. HUD & Screens

**In-level HUD:**
- Score (current run)
- Coins collected this run
- Shield bar
- **Ammo counter** for the current weapon, with the flashing reload prompt when empty
- Current weapon indicator
- **"DISTANCE TO PLANET"** readout — replaces V1's mini-map, since the planet visibly growing in the background now carries the sense of progress
- Boss health bar (Conquest phase only)

**Screens:**
- **Title** — play, mute toggle
- **Planet Select** — the nine destinations as an inward journey; locked ones dimmed; per-planet high scores; total coins; entrance to the Hangar
- **Hangar** — see Section 12b
- **Pause** — resume, restart level, mute, quit to Planet Select
- **Level Win** — planet conquered, coins earned, score vs personal best, next destination unlocked
- **Level Lose** — shield depleted; retry or quit to Planet Select; coins kept
- **Campaign Complete** — short celebration after the Sun falls

### 12b. The Hangar

Not a menu — a **place**. The player is standing inside a working hangar bay:

- The ship sits on a mechanical lift/gantry in the centre, slowly rotating
- Tool racks, cable runs and diagnostic panels line the walls
- A welding arm passes overhead periodically, throwing sparks
- A holographic blueprint panel beside the ship shows upgrades applying **live** — buy a wing upgrade and the ship visibly changes on the lift
- A small mechanic-bot trundles over and performs a brief install animation whenever an upgrade is purchased
- Upgrade tracks are presented as physical console panels rather than a list of buttons

Same Stencil Riso visual language as the rest of the game — bone outlines, ink fills, blaze accents — but composed as a physical interior with depth, not a flat UI. No neon glow; depth comes from halftone density and overlap.

---

## 13. Balance Numbers

All values live in `data/balance.js` for easy tuning.

| Value | Default |
|---|---|
| Base shield | 100 (+25 per Shield Capacity tier, max 3 tiers) |
| Shield passive regen | 2 HP/sec, pauses 3s after a hit |
| Asteroid collision damage | Small 10 · Medium 20 · Large 35 |
| Moon collision damage | 50 |
| Boss projectile damage | 15 |
| Phase durations | Approach ~45s · Descent ~60s · Conquest until boss dies |
| Magazine sizes | Laser 30 · Plasma 12 · Missiles 6 (+50% at max Magazine Capacity tier) |
| Reload time | 1.0s (0.7s at max Magazine Capacity tier) |
| Coin drop chance | ~30% per asteroid (coin = 1, rare gem = 5 at ~5%) |
| Ammo crate drop chance | ~10% |
| Other power-up drop chance | ~8% |
| Upgrade costs | Tier 1: 50 · Tier 2: 125 · Tier 3: 300 coins per track; skins 75 each |
| Boss HP | Neptune ≈ 300, scaling ~25% per destination, Sun ≈ 1,800 |
| Difficulty ramp | Within a level: linear increase in spawn rate and speed across Approach → Descent. Across levels: each destination starts higher than the last one started |

---

## 14. Visual Style — Stencil Riso (scheme 1b)

**Aesthetic:** Two inks printed on black. Street-art stencil logic — flat fills, hard edges, halftone screens, one plate deliberately out of register. No neon glow on UI or objects; blur is permitted only for engine exhaust. Everything is procedurally drawn via Phaser Graphics; no external image files.

**The three inks (never introduce a fourth colour for UI states):**

| Token | Value | Reserved for |
|---|---|---|
| `ink` | `#16181c` | Ground, canopies, dot screen, HUD knockout plates |
| `ink-deep` | `#101216` | Chrome / panels behind the play area |
| `bone` | `#efe9dd` | Hulls, HUD strokes, numerals, asteroids |
| `blaze` | `#ff4d17` | Thrust, guns, damage, danger, planets — **nothing else** |
| `teal` | `#0f7a6a` | Shields and pickups only |

**Urgency** is communicated by more blaze area, not new hues.

**Rules that make it look printed:**
1. Halftone everything solid. 9px dot pitch, `mix-blend-mode: multiply`. Pitch is constant in screen pixels, not scaled with the object.
2. Misprint offset. Every hero object carries a blaze copy of its silhouette offset 6px down + right, painted underneath. Score numerals get a 3px text-shadow version.
3. Stencil strokes, 2px, bone. Bars, chips and meters are outlines, never filled panels.
4. No gradients on objects. Depth comes from dot density and overlap. Blur is allowed for engine glow only.
5. Knockout plates. Any HUD element crossing a planet sits on a solid ink plate. Bone-on-blaze at label size is unreadable — this is the one bug that keeps coming back.

**Per-planet palettes:** as defined in `data/planets.js`. Each destination varies the blaze disc density, crater colours and hazard tint within the three-ink system so all nine levels are visually distinct without introducing new hues.

**The approaching planet:** a flat blaze disc + fixed-pitch halftone + bone keyline + craters. Scale grows continuously Approach → Descent; Conquest fills the frame. Jupiter's boss phase swaps the background for the Great Red Spot arena. This is the single most important visual element for progress — give it proper attention.

**HUD anatomy** (match `files/solar-blaster-design-handoff/handoff/hud.html` exactly):
- Top-left: SCORE / COINS / ARMED — Saira Stencil One 44px numerals, misprint text-shadow
- Top-right: planet name + APPROACH meter — on a knockout ink plate
- Bottom-left: HULL bar, dashed fill, numeric readout in the header row
- Ammo counter next to ARMED chip; flashing "PRESS R TO RELOAD" prompt when empty

**Type:**
- Saira Stencil One — score, coin total, planet names
- Barlow Condensed 700 — all labels: uppercase, letter-spacing 0.3em, 11px minimum
- Space Mono — readouts, debug, anything numeric that isn't the score

---

## 15. Audio

- **Music:** upbeat synthwave loop, ideally one variant per destination, plus a more intense boss variant
- **SFX:** laser fire, plasma fire, missile launch, **reload click/whirr**, **empty-magazine click**, small explosion, large explosion, shield hit, coin pickup, ammo pickup, power-up pickup, boss alert, boss defeat, level win, level lose, UI click, hangar mechanic-bot beeps
- **Source:** generated Web Audio tones as placeholders, structured so real audio files can be dropped in later. README should document where.

---

## 16. Persistence (localStorage)

```js
{
  "solarBlaster.coins": 340,
  "solarBlaster.unlocked": ["neptune", "uranus", "saturn"],
  "solarBlaster.highScores": {
    "neptune": 4200,
    "uranus": 3100,
    "saturn": 0
  },
  "solarBlaster.upgrades": {
    "weaponPower": 2,
    "shieldCapacity": 1,
    "speed": 0,
    "magazineCapacity": 1,
    "skin": "cyan"
  },
  "solarBlaster.campaignComplete": false
}
```

Local device only. No accounts, no online leaderboards.

---

## 17. Out of Scope

- Multiplayer
- Online or shared leaderboards
- Educational quiz cards or fact pop-ups — **the science lives in the hazards and moons, not in text**
- Asteroid-belt bonus level
- External image or audio assets
- Any backend or server-side code

---

## 18. Changes From V1

For reference if any V1 code exists:

| V1 | V2 |
|---|---|
| Planets in outward order, free selection | Fixed inward order, Neptune → Sun, sequential unlock |
| 8 levels | 9 levels (Sun added as finale) |
| No story | Conquering the system to harness the Sun |
| Flat scrolling level | Three phases: Approach → Descent → Conquest |
| Single global high score | Per-planet high scores |
| Mini-map | Planet growing in background + distance readout |
| Unlimited ammo | Per-weapon magazines with manual reload |
| Generic hazards | Hazards derived from each planet's real physical properties |
| No moons | Real moons as large obstacles during Descent |
| Menu-style shop | Hangar rendered as a physical interior |
| 3 upgrade tracks + skins | 4 upgrade tracks + skins (magazine capacity added) |

---

## 19. Open Items

- **Earth's boss character** — deliberately left TBC (Section 9.6). Placeholder art and full mechanics are specified; final design is a cosmetic swap
- All balance numbers in Section 13 are starting points for playtesting, not fixed requirements
