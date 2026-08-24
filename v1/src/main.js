// main.js — Phaser 3 game configuration and scene registration.
// This is the entry point for Solar Blaster.

import { BootScene }        from './scenes/BootScene.js';
import { TitleScene }       from './scenes/TitleScene.js';
import { PlanetSelectScene } from './scenes/PlanetSelectScene.js';
import { GameScene }        from './scenes/GameScene.js';
import { HangarScene }      from './scenes/HangarScene.js';
import { GameOverScene }    from './scenes/GameOverScene.js';
import { VictoryScene }     from './scenes/VictoryScene.js';

// ── Phaser 3 game config ──────────────────────────────────────────────────────

const config = {
  type: Phaser.AUTO,              // use WebGL if available, fall back to Canvas

  // Logical resolution — everything is drawn as if the screen is 1280×720.
  // Phaser's scale manager stretches / shrinks to fit the actual window.
  width:  1280,
  height: 720,

  backgroundColor: '#05010F',     // deep space near-black

  scale: {
    mode:       Phaser.Scale.FIT, // keep aspect ratio, letterbox if needed
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width:  1280,
    height: 720,
  },

  // Allow multi-touch for mobile controls.
  input: {
    touch: { capture: true },
  },

  // Scene list — order matters: the first scene (BootScene) is launched automatically.
  scene: [
    BootScene,
    TitleScene,
    PlanetSelectScene,
    GameScene,
    HangarScene,
    GameOverScene,
    VictoryScene,
  ],
};

// Create the game! Everything else is driven by the scenes.
const game = new Phaser.Game(config);
