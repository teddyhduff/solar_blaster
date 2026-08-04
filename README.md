# Solar Blaster 🚀

A neon-styled 2D arcade space shooter — blast through all 8 planets of the solar system, defeat their bosses, and rack up the high score.

---

## Running locally

**One command from the project root:**

```bash
npx serve .
```

Then open the URL shown (usually `http://localhost:3000`).

Any static file server works:
- `npx serve .`
- VS Code "Live Server" extension (right-click `index.html` → Open with Live Server)
- Python: `python -m http.server 8000`

> **Important:** The game uses ES modules, so it must be served over HTTP — it won't work if you just double-click `index.html` and open it as a `file://` URL.

---

## Deploying to Vercel

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. Go to [vercel.com](https://vercel.com) and click **New Project**.
3. Import the repo.
4. **Zero configuration needed** — Vercel auto-detects it as a static site.
5. Click **Deploy**.

That's it. The live URL is ready in about 30 seconds.

---

## Controls

| Input    | Move              | Fire                     | Switch weapon             |
|----------|-------------------|--------------------------|---------------------------|
| Keyboard | Arrow keys / WASD | Hold Space               | Keys 1 / 2 / 3            |
| Mouse    | Hold + drag       | Hold left button         | Scroll wheel or 1 / 2 / 3 |
| Touch    | Drag (left side)  | FIRE button (right side) | LAS / PLM / MSL buttons   |

**Pause:** `ESC` or `P` on keyboard, or the ⏸ button on mobile.

---

## Weapons

| # | Name           | Behaviour                        |
|---|----------------|----------------------------------|
| 1 | Laser          | Fast, thin bolts — fast fire rate |
| 2 | Plasma Spread  | 3-way fan — great vs clusters     |
| 3 | Missiles       | Slow, homing, high damage         |

All three weapons are available from the start. Upgrade their power in the Hangar.

---

## Progression

- Beat each planet's boss to unlock the next planet.
- Coins collected during a run are **always kept**, even if you die.
- Spend coins in the **Hangar** on upgrades and cosmetic skins.
- Your high score is the best single-run score ever achieved.
- Everything persists across page refreshes via `localStorage`.

---

## Tuning the balance

All numeric gameplay values live in one file:

```
src/data/balance.js
```

Open it in any text editor and change the numbers — no build step needed. Key values:

| Constant | What it controls |
|---|---|
| `BASE_SHIELD` | Starting max HP |
| `SHIELD_REGEN_RATE` | HP regenerated per second |
| `LEVEL_DURATION` | Seconds of asteroid phase before boss spawns |
| `COIN_DROP_CHANCE` | Probability an asteroid drops a coin |
| `BOSS_HP_MERCURY` | Mercury boss health (other bosses scale from this) |
| `CROSS_PLANET_ASTEROID_SPEED_SCALE` | How much harder each successive planet is |
| `UPGRADE_TIER1/2/3_COST` | Hangar upgrade prices |

---

## Swapping in real audio

The game generates all sounds procedurally using the Web Audio API. To swap in real audio files:

1. Add your files to `assets/audio/` (create the folder).
2. In `src/scenes/BootScene.js`, add a load call for each file:
   ```js
   this.load.audio('laser',       'assets/audio/laser.mp3');
   this.load.audio('explosion',   'assets/audio/explosion.mp3');
   this.load.audio('shield_hit',  'assets/audio/shield_hit.mp3');
   // etc.
   ```
3. In `src/systems/AudioSystem.js`, replace the `_tone()` / `_noise()` calls
   inside each `play*()` method with:
   ```js
   this.scene.sound.play('laser', { volume: 0.5 });
   ```

**Full list of audio cues to replace:**

| Method | Sound event |
|---|---|
| `playLaserFire()` | Laser weapon fire |
| `playSpreadFire()` | Plasma spread fire |
| `playMissileFire()` | Missile launch |
| `playExplosionSmall()` | Small asteroid explosion |
| `playExplosionLarge()` | Large asteroid / big explosion |
| `playShieldHit()` | Shield taking damage |
| `playCoinPickup()` | Collecting a coin |
| `playGemPickup()` | Collecting a rare gem |
| `playPowerUpPickup()` | Collecting a power-up |
| `playBossAlert()` | Boss spawning alert |
| `playLevelWin()` | Level completed |
| `playLevelLose()` | Ship destroyed |
| `playUIClick()` | Button click |
| `startMusic(false)` | Asteroid-phase Aussie hip-hop style loop |
| `startMusic(true)` | Boss-fight denser hip-hop variant |

---

## Project structure

```
index.html              — Entry point (loads Phaser CDN + src/main.js)
styles/style.css        — Full-bleed canvas, portrait overlay
src/
  main.js               — Phaser config + scene registration
  scenes/
    BootScene.js        — Boot + preload
    TitleScene.js       — Title screen
    PlanetSelectScene.js — Planet selection / level select
    GameScene.js        — Main gameplay (asteroid phase + boss fight)
    HangarScene.js      — Upgrade shop
    GameOverScene.js    — Shield depleted screen
    VictoryScene.js     — Boss defeated screen
  entities/
    Ship.js             — Player ship (input, weapons, shield)
    Asteroid.js         — Asteroid (sizes, splitting)
    Boss.js             — Boss (8 unique designs, 2-phase attacks)
    Projectile.js       — Player bullets/missiles
    Pickup.js           — Coins, gems, shield boosts, weapon tokens
  systems/
    SaveData.js         — localStorage read/write wrapper
    DifficultyCurve.js  — Spawn rate + speed scaling
    HazardSystem.js     — Planet-specific hazards
    AudioSystem.js      — Web Audio SFX + Aussie hip-hop style music loop
  data/
    balance.js          — ← Edit this to tune the game
    planets.js          — 8 planet configs (hazard, boss, colours)
    weapons.js          — Weapon stats per upgrade tier
    upgrades.js         — Hangar upgrade tracks + skin definitions
```

---

## Acceptance checklist

Run through these to confirm everything works:

- [ ] Fresh browser profile (clear site data) → only Mercury unlocked, 0 coins, no high score shown
- [ ] Play Mercury → collect coins → die → coins are kept, retry offered
- [ ] Beat Mercury's boss → Venus unlocks → refresh page → Venus still unlocked
- [ ] Buy an upgrade in the Hangar → refresh → upgrade persists and visibly affects gameplay
- [ ] Resize the window → landscape scales correctly; portrait on mobile shows rotate overlay
- [ ] Touch controls work: drag to move, FIRE button fires, LAS/PLM/MSL switch weapons
- [ ] Set a high score, close the tab, reopen → high score displayed on Planet Select
- [ ] All 8 planets accessible after sequential unlocking
- [ ] Pause (ESC/P) mid-level → game freezes → resume continues correctly
