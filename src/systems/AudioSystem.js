// AudioSystem.js — Procedurally generated SFX and background music using the Web Audio API.
// No external audio files are needed.
//
// ┌─ HOW TO SWAP IN REAL AUDIO FILES ──────────────────────────────────────────┐
// │  1. Load your audio file in BootScene.js:                                  │
// │       this.load.audio('laser', 'assets/audio/laser.mp3');                  │
// │  2. In the relevant play*() method below, replace the tone generation      │
// │     with a Phaser sound call:                                               │
// │       this.scene.sound.play('laser', { volume: 0.5 });                     │
// │  See README for the full list of audio cue names to replace.                │
// └────────────────────────────────────────────────────────────────────────────┘

export class AudioSystem {
  /** @param {Phaser.Scene} scene — used to resume the AudioContext on first interaction */
  constructor(scene) {
    this.scene   = scene;
    this.ctx     = null;
    this.masterGain = null;
    this.musicGain  = null;
    this.sfxGain    = null;
    this.muted   = false;
    this._musicInterval = null;
    this._init();
  }

  _init() {
    // Try to reuse Phaser's AudioContext so we share one context with the engine.
    if (this.scene.sound && this.scene.sound.context) {
      this.ctx = this.scene.sound.context;
    } else {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('[AudioSystem] Web Audio not available:', e);
        return;
      }
    }
    this._buildGraph();
  }

  _buildGraph() {
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.18;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.7;
    this.sfxGain.connect(this.masterGain);
  }

  /** Resume the context after a user gesture (required by browsers). */
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 0.5;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ── Low-level helpers ──────────────────────────────────────────────────────

  /** Play a simple oscillator tone with an exponential decay envelope. */
  _tone(freq, dur, type = 'square', vol = 0.25, dest = null) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  /** White-noise burst for explosions / impacts. */
  _noise(dur, vol = 0.25, dest = null) {
    if (!this.ctx || this.muted) return;
    const t          = this.ctx.currentTime;
    const bufLen     = Math.ceil(this.ctx.sampleRate * dur);
    const buf        = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data       = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src  = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(gain);
    gain.connect(dest || this.sfxGain);
    src.start(t);
  }

  // ── SFX ───────────────────────────────────────────────────────────────────

  playLaserFire() {
    this._tone(900, 0.07, 'sawtooth', 0.22);
    this._tone(600, 0.09, 'square',   0.12);
  }

  playSpreadFire() {
    this._tone(660, 0.06, 'sawtooth', 0.18);
    this._tone(880, 0.06, 'sawtooth', 0.14);
    this._tone(550, 0.08, 'square',   0.12);
  }

  playMissileFire() {
    this._tone(200, 0.16, 'sawtooth', 0.30);
    this._tone(160, 0.20, 'triangle', 0.18);
  }

  playExplosionSmall() {
    this._noise(0.18, 0.32);
    this._tone(110, 0.18, 'sawtooth', 0.16);
  }

  playExplosionLarge() {
    this._noise(0.42, 0.48);
    this._tone( 60, 0.38, 'sawtooth', 0.28);
    this._tone( 80, 0.30, 'square',   0.18);
  }

  playShieldHit() {
    this._tone(440, 0.10, 'triangle', 0.38);
    this._tone(330, 0.13, 'triangle', 0.26);
  }

  playCoinPickup() {
    this._tone(880,  0.06, 'sine', 0.28);
    this._tone(1100, 0.06, 'sine', 0.28);
  }

  playGemPickup() {
    [660, 880, 1320].forEach((f, i) => setTimeout(() => this._tone(f, 0.07, 'sine', 0.30), i * 50));
  }

  playPowerUpPickup() {
    [440, 550, 660, 880].forEach((f, i) => setTimeout(() => this._tone(f, 0.09, 'sine', 0.32), i * 65));
  }

  playBossAlert() {
    [110, 110, 165, 220].forEach((f, i) => setTimeout(() => this._tone(f, 0.22, 'sawtooth', 0.38), i * 200));
  }

  playLevelWin() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 0.20, 'sine', 0.42), i * 150));
  }

  playLevelLose() {
    [330, 262, 196, 147].forEach((f, i) => setTimeout(() => this._tone(f, 0.24, 'sawtooth', 0.34), i * 180));
  }

  playUIClick() {
    this._tone(660, 0.05, 'square', 0.18);
  }

  // ── Background Music ──────────────────────────────────────────────────────
  // Aussie hip-hop / boom-bap style loop: punchy 808, snare on 2+4, busy hats, sparse bass.
  // Still fully procedural via Web Audio — swap real tracks later via BootScene (see README).

  /** Short noise burst used for snare / hats. */
  _drumNoise(dur, vol, dest) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const bufLen = Math.ceil(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest || this.musicGain);
    src.start(t);
  }

  /** Deep 808-style kick: sine with quick pitch drop. */
  _kick(dest) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(gain);
    gain.connect(dest || this.musicGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  /** Snare / clap: noise + low tone. */
  _snare(dest) {
    this._drumNoise(0.12, 0.32, dest);
    this._tone(180, 0.08, 'triangle', 0.12, dest);
  }

  /** Closed hi-hat tick. */
  _hat(vol, dest) {
    this._drumNoise(0.035, vol, dest);
  }

  /**
   * Start the looping background music.
   * @param {boolean} isBoss  true = denser / tenser hip-hop groove for boss fights
   */
  startMusic(isBoss = false) {
    this.stopMusic();
    if (!this.ctx) return;

    // ~90 BPM: 16th-note step every ~167ms.
    const stepMs = isBoss ? 150 : 167;
    // A minor pentatonic-ish bass (Aussie hip-hop vibe — punchy, sparse).
    const bassNotes = isBoss
      ? [55, 0, 55, 0, 65.4, 0, 55, 73.4, 55, 0, 49, 0, 55, 0, 65.4, 73.4]
      : [55, 0, 0, 55, 65.4, 0, 55, 0, 49, 0, 55, 0, 73.4, 0, 65.4, 0];

    // Kick / snare patterns over 16 steps (1 bar of 16ths).
    const kicks  = isBoss
      ? [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0]
      : [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0];
    const snares = isBoss
      ? [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0]
      : [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];

    let step = 0;
    const tick = () => {
      if (this.muted || !this.ctx) return;
      const i = step % 16;
      const dest = this.musicGain;

      if (kicks[i])  this._kick(dest);
      if (snares[i]) this._snare(dest);

      // Hats: 8ths normally, denser 16ths in boss fights.
      if (isBoss || i % 2 === 0) {
        this._hat(isBoss ? 0.10 : 0.07, dest);
      }
      // Extra open-feeling hat on offbeats.
      if (i % 4 === 2) this._hat(0.04, dest);

      // Bass note.
      const bass = bassNotes[i];
      if (bass > 0) {
        this._tone(bass, 0.18, 'sine', isBoss ? 0.12 : 0.09, dest);
        this._tone(bass * 0.5, 0.22, 'triangle', 0.05, dest);
      }

      step++;
    };
    tick();
    this._musicInterval = setInterval(tick, stepMs);
  }

  stopMusic() {
    if (this._musicInterval) {
      clearInterval(this._musicInterval);
      this._musicInterval = null;
    }
  }

  destroy() {
    this.stopMusic();
  }
}
