# Solar Blaster — art direction handoff

Scheme **1b "Stencil Riso"** plus the **REFLEX 07** player ship, ready to drop into the game.

```
handoff/
  README.md              you are here
  STYLE-GUIDE.md         the scheme: inks, rules, type, HUD anatomy, ship LODs
  solar-blaster.css      design tokens + HUD primitives
  hud.html               working 1280x720 reference screen — open it first
  assets/
    ship-reflex07.svg        full detail (> 150px)
    ship-reflex07-small.svg  gameplay (102px)
    ship-reflex07-icon.svg   HUD / lives (54px)
```

## For Cursor

Prompt to start from:

> Use STYLE-GUIDE.md as the visual spec for this game. Import solar-blaster.css and build all
> UI from its tokens and .sb-* primitives — no new colours, no gradients, no rounded panels.
> hud.html is the reference for the in-game HUD; match it. Use the ship SVGs at the LOD sizes
> in the guide rather than scaling one file. Blaze orange (#ff4d17) is reserved for thrust,
> weapons, damage and planets.

Two things that break the look fastest, worth pinning in your rules file: adding a fourth colour
for UI states, and putting bone text over a planet without a `.sb-plate` knockout behind it.

The ships are flat SVG geometry — they are stand-in art for layout and style, not final assets.
