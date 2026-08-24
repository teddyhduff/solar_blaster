# Instruction for Cursor — Solar Blaster V2

Paste the text below into Cursor with `solar-blaster-v2-spec.md` attached as context.

---

Build the complete game described in `solar-blaster-v2-spec.md`. That spec is the source of truth for all gameplay, visual, and persistence decisions. Where it gives a default value, implement it as written rather than asking me.

**Hard requirements:**

1. **Stack:** Phaser 3 from a CDN `<script>` tag, vanilla JavaScript ES modules, no bundler, no npm dependencies, no backend. The finished project must be a pure static site.
2. **Runs locally with one command:** `npx serve .` from the project root must serve a fully working game. Write a README covering local run and Vercel deploy (import repo, zero config).
3. **No external assets:** all graphics procedurally drawn in Phaser using Stencil Riso rules per Section 14 — flat fills, hard edges, halftone screens, misprint offset; no neon glow on UI or game objects (blur allowed for engine exhaust only); no sprite sheets or image files. All audio generated via Web Audio API as placeholders per Section 15, structured so real files can be swapped in later. The visual token source of truth is `files/solar-blaster-design-handoff/handoff/STYLE-GUIDE.md` and `solar-blaster.css`; the enforced project rule is `.cursor/rules/solar-blaster-visual.mdc`.
4. **Complete scope:** all 9 destinations with their three-phase structure, unique science-derived hazards, real moons, and bosses; all 3 weapons with magazines and reload; all 4 upgrade tracks plus skins; the Hangar as a rendered physical interior; every screen in Section 12. Do not stub or TODO any of these.
5. **All three input methods** (keyboard, mouse, touch) per Section 5, including on-screen touch controls for fire, reload and weapon switching, and the portrait "rotate your device" overlay.
6. **Persistence** per the Section 16 schema — coins, unlocks, **per-planet high scores**, and upgrades all survive a refresh.
7. **All tunable numbers** live in `data/balance.js` using Section 13 values.
8. **Per-planet configuration is data-driven** — `data/planets.js` should define order, hazard type, moons, boss config and palette so a planet can be retuned without touching scene code.
9. **Code organisation** follows Section 3. One module per scene/entity/system. Comment generously — a motivated kid will be reading and modifying this.

**Build order — verify each milestone runs before moving on:**

1. Skeleton: Phaser boot, Title → Planet Select flow, SaveData wired to localStorage
2. GameScene core: scrolling starfield, ship movement across all three input methods, Laser firing, asteroid spawn/collision/destruction, shield with damage and regen
3. **Weapons + magazine/reload system** — all three weapons, per-weapon magazines, R-to-reload with flashing prompt, auto-reload on empty-fire, movable-but-can't-shoot during reload, ammo counter in HUD
4. **PhaseManager** — Approach → Descent → Conquest transitions, the growing planet in the background, distance readout
5. Pickups (coins, shield, ammo crate, rapid fire), scoring, full HUD
6. Boss framework + Neptune's boss end-to-end, including win/lose flow, per-planet high score recording and unlock persistence
7. Remaining 8 destinations: hazards, moons, palettes, bosses, cross-level difficulty scaling. Earth's boss uses placeholder art per Section 9.6 with full mechanics implemented
8. Hangar as a rendered interior — gantry, live-updating ship, mechanic-bot install animation, console-panel upgrade tracks
9. Audio, pause menu, campaign complete screen, polish pass (particles, screen shake, hit flashes)
10. README + verify `npx serve .` works from a clean clone

**Acceptance test before calling it done:**

- Fresh browser profile → only Neptune unlocked, 0 coins, no high scores
- Play Neptune → fire until a magazine empties → reload prompt flashes → R reloads in ~1s → ship still moves but cannot shoot during it
- Fire on an empty magazine → auto-reload triggers rather than nothing happening
- Watch the planet grow across Approach and Descent; moons appear during Descent; boss arrives in Conquest
- Die → coins kept, retry offered
- Beat Neptune's boss → Uranus unlocks → refresh → still unlocked, Neptune's high score recorded against Neptune specifically
- Replay Neptune with a worse score → the previous personal best is not overwritten
- Buy a Magazine Capacity upgrade → refresh → persists and visibly increases magazine size in-level
- Check Uranus's tilting field, Jupiter's Great Red Spot boss arena, Venus's lack of moons, and Mercury's alternating heat/cold zones each behave distinctly
- Mobile emulation in devtools → landscape scales, portrait shows rotate overlay, touch fire/reload/switch all work

Ask me questions only if the spec is genuinely contradictory; otherwise use its defaults and keep building.
