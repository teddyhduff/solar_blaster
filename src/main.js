// main.js — Phaser 3 config and scene registration for Solar Blaster V2.
// Stencil Riso visual scheme; Neptune → Sun inward campaign.

import { BootScene }             from './scenes/BootScene.js';
import { TitleScene }            from './scenes/TitleScene.js';
import { PlanetSelectScene }     from './scenes/PlanetSelectScene.js';
import { GameScene }             from './scenes/GameScene.js';
import { HangarScene }           from './scenes/HangarScene.js';
import { LevelWinScene }         from './scenes/LevelWinScene.js';
import { LevelLoseScene }        from './scenes/LevelLoseScene.js';
import { CampaignCompleteScene } from './scenes/CampaignCompleteScene.js';

// V2 scene list — BootScene launches first; all others started by code.
const config = {
  type: Phaser.AUTO,

  width:  1280,
  height: 720,

  backgroundColor: '#16181c',   // ink ground — matches Stencil Riso --sb-ink

  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width:  1280,
    height: 720,
  },

  input: {
    touch: { capture: true },
  },

  scene: [
    BootScene,
    TitleScene,
    PlanetSelectScene,
    GameScene,
    HangarScene,
    LevelWinScene,
    LevelLoseScene,
    CampaignCompleteScene,
  ],
};

const game = new Phaser.Game(config);
