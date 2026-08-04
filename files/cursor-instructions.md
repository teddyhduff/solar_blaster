# Instruction for Cursor

Copy the text below into Cursor (with `solar-blaster-game-spec.md` added to the project folder / attached as context):

---

Build the complete game described in `solar-blaster-game-spec.md`. Follow the spec exactly — it is the source of truth for all gameplay, UI, visual, and persistence decisions. Where the spec marks something as a "suggested default," implement the default as written rather than asking me.

**Hard requirements:**

1. **Stack:** Phaser 3 loaded from a CDN `<script>` tag, vanilla JavaScript ES modules, no bundler, no npm dependencies, no backend. The finished project must be a pure static site.
2. **Runs locally with one command:** From the project root, `npx serve .` (or any static file server) must serve a fully working game at localhost. Opening the served URL should land on the Title Screen with everything functional. Document this in a README, including how to deploy to Vercel (which should be: import the repo, zero configuration).
3. **No external assets:** All graphics are procedurally drawn vector shapes with neon glow effects per the spec's Visual Style Guide (Section 15). All audio is generated with the Web Audio API as placeholder tones/bleeps (Section 16) — structure the audio code so files can be swapped in later, and note in the README where.
4. **Complete scope:** All 8 planet levels with their unique hazards, all 8 bosses with 2-phase attack patterns, all 3 weapons, the full upgrade shop (weapon power, shield capacity, speed, cosmetic skins), all pickups, difficulty scaling, and every screen listed in Section 12 (Title, Planet Select, Hangar, Pause, Win, Lose). Do not stub or "TODO" any of these.
5. **All three input methods** (keyboard, mouse, touch) working per Section 4, including on-screen touch controls and the portrait-mode "rotate your device" overlay.
6. **Persistence:** localStorage per the schema in Section 17 — high score, coins, unlocked planets, upgrades all survive a page refresh.
7. **Balance values** live in a single `data/balance.js` constants file using the numbers from Section 14b, so they're easy to tune.
8. **Code organization:** Follow the project structure in Section 2. Keep each scene/entity in its own module. Comment the code generously — a motivated kid will be reading and tweaking this.

**Build order (work through these as milestones, verifying each runs before moving on):**

1. Project skeleton + Phaser boot + Title Screen → Planet Select flow with localStorage stubs
2. GameScene core: scrolling starfield background, ship movement (all 3 input methods), firing the basic Laser, asteroid spawning/collision/destruction, shield bar + damage + regen
3. Full weapons (spread + missiles + switching), pickups (coins, shield boost, weapon token), scoring, HUD including mini-map progress track
4. Boss framework + Mercury's boss end-to-end (level win/lose flow, unlock persistence)
5. Remaining 7 planets: hazards, per-planet tinting, remaining bosses, cross-planet difficulty scaling
6. Hangar upgrade shop wired to persistent upgrades
7. Audio (generated SFX + simple looping music), pause menu, polish pass (particles, screen shake on explosions, hit flashes)
8. README + final check that `npx serve .` works from a clean clone

**Acceptance test (run through this before calling it done):**
- Fresh browser profile → only Mercury unlocked, 0 coins, no high score
- Play Mercury → collect coins → die → coins kept, retry offered
- Beat Mercury's boss → Venus unlocks → refresh page → Venus still unlocked
- Buy an upgrade in the Hangar → refresh → upgrade persists and visibly affects gameplay
- Resize the window and try mobile emulation in devtools → landscape scales correctly, portrait shows rotate overlay, touch controls work
- Set a high score, close the tab, reopen → high score displayed on Planet Select

Ask me questions only if the spec is genuinely contradictory; otherwise use the spec's defaults and keep building.
