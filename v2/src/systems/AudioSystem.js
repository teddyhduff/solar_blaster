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
   * @param {number}  planetIndex  0 = Neptune (cold/sparse) … 8 = Sun (hot/dense)
   */
  startMusic(isBoss = false, planetIndex = 0) {
    this.stopMusic();
    if (!this.ctx) return;

    const idx = Phaser.Math.Clamp(planetIndex ?? 0, 0, 8);
    // Outer planets sit lower and slower; inward planets heat up.
    const roots = [49.0, 52.0, 55.0, 58.3, 61.7, 65.4, 69.3, 73.4, 82.4];
    const root = roots[idx];
    const stepMs = Math.max(118, (isBoss ? 152 : 176) - idx * 5);

    const scale = [1, 0, 1.2, 0, 1.33, 0, 1, 1.5, 1, 0, 0.89, 0, 1, 0, 1.33, 1.5];
    const bassNotes = scale.map((m, i) => {
      if (isBoss) return m > 0 ? root * m : (i % 4 === 0 ? root : 0);
      return m > 0 ? root * m : 0;
    });

    const kicks  = isBoss || idx >= 5
      ? [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0]
      : [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0];
    const snares = isBoss
      ? [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0]
      : [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];

    const denseHats = isBoss || idx >= 4;

    let step = 0;
    const tick = () => {
      if (this.muted || !this.ctx) return;
      const i = step % 16;
      const dest = this.musicGain;

      if (kicks[i])  this._kick(dest);
      if (snares[i]) this._snare(dest);

      if (denseHats || i % 2 === 0) {
        this._hat(isBoss ? 0.10 : 0.06 + idx * 0.004, dest);
      }
      if (i % 4 === 2) this._hat(0.04, dest);

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

  // ── V2 weapon SFX placeholders ───────────────────────────────────────────────
  // WeaponSystem calls these if a real asset isn't loaded.

  playLaserShot() {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(1200, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.06);
    g.gain.setValueAtTime(0.18, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);
    o.connect(g); g.connect(this.sfxGain ?? this.masterGain);
    o.start(); o.stop(this.ctx.currentTime + 0.07);
  }

  playReloadStart() {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(180, this.ctx.currentTime);
    o.frequency.linearRampToValueAtTime(240, this.ctx.currentTime + 0.15);
    g.gain.setValueAtTime(0.12, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
    o.connect(g); g.connect(this.sfxGain ?? this.masterGain);
    o.start(); o.stop(this.ctx.currentTime + 0.18);
  }

  playReloadDone() {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(440, this.ctx.currentTime);
    o.frequency.linearRampToValueAtTime(660, this.ctx.currentTime + 0.10);
    g.gain.setValueAtTime(0.14, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);
    o.connect(g); g.connect(this.sfxGain ?? this.masterGain);
    o.start(); o.stop(this.ctx.currentTime + 0.14);
  }

  playUIClick() {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, this.ctx.currentTime);
    g.gain.setValueAtTime(0.10, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
    o.connect(g); g.connect(this.sfxGain ?? this.masterGain);
    o.start(); o.stop(this.ctx.currentTime + 0.06);
  }

  playBossAlert() {
    if (!this.ctx) return;
    const freqs = [220, 330, 440];
    freqs.forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, this.ctx.currentTime + i * 0.12);
      g.gain.setValueAtTime(0.18, this.ctx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.12 + 0.25);
      o.connect(g); g.connect(this.sfxGain ?? this.masterGain);
      o.start(this.ctx.currentTime + i * 0.12);
      o.stop(this.ctx.currentTime + i * 0.12 + 0.25);
    });
  }

  destroy() {
    this.stopMusic();
  }
}
