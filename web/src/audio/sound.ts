/**
 * Glassbloom sound, synthesised with Web Audio: a low furnace roar, the player's breath through
 * the pipe, glass-harmonica music, and bell-like glass tones. Nothing is downloaded.
 */
const semis = (root: number, n: number) => root * Math.pow(2, n / 12);
const MODES = [
  { root: 220, scale: [0, 2, 4, 7, 9, 12, 14, 16, 19] },     // A major pentatonic: warm amber
  { root: 196, scale: [0, 3, 5, 7, 10, 12, 15, 17, 19] },    // G minor pentatonic: cobalt dusk
  { root: 246.94, scale: [0, 2, 4, 6, 9, 11, 12, 14, 16] },  // B lydian: opaline shimmer
];

export class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private verb!: ConvolverNode;
  private noise!: AudioBuffer;
  private timer: number | null = null;
  private next = 0;
  private beat = 0;
  private chapter = 0;
  private seed = 5;
  private roar: { stop(): void } | null = null;
  private breath: { gain: GainNode; filter: BiquadFilterNode; src: AudioBufferSourceNode; tone: OscillatorNode; toneGain: GainNode } | null = null;
  private musicVol = 0.6;
  private sfxVol = 0.8;
  private ducked = false;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain(); this.master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
      this.master.connect(comp).connect(ctx.destination);
      this.music = ctx.createGain(); this.sfx = ctx.createGain();
      this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(3);
      const wet = ctx.createGain(); wet.gain.value = 0.34;
      this.verb.connect(wet).connect(this.master);
      this.music.connect(this.master); this.music.connect(this.verb);
      this.sfx.connect(this.master); this.sfx.connect(this.verb);
      this.noise = this.makeNoise();
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
  setVolumes(music: number, sfx: number) { this.musicVol = music; this.sfxVol = sfx; this.applyVolumes(); }
  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(this.musicVol * 0.5 * (this.ducked ? 0.4 : 1), t, 0.2);
    this.sfx.gain.setTargetAtTime(this.sfxVol, t, 0.05);
  }
  duck(on: boolean) { this.ducked = on; this.applyVolumes(); }
  suspend() { void this.ctx?.suspend(); }
  resume() { if (this.ctx?.state === 'suspended') void this.ctx.resume(); }

  // ── music: slow glass-harmonica phrases over the furnace ────────────────
  startMusic(chapter: number) {
    if (!this.ctx) return;
    if (this.timer !== null && chapter === this.chapter) return;
    this.chapter = chapter;
    this.next = this.ctx.currentTime + 0.4;
    if (!this.roar) this.roar = this.furnace();
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 150);
  }
  stopMusic() {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    this.roar?.stop(); this.roar = null;
  }
  private rnd() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  private schedule() {
    const ctx = this.ctx!;
    const step = 60 / 48;
    const mode = MODES[this.chapter % MODES.length];
    while (this.next < ctx.currentTime + 1) {
      const t = this.next;
      const bar = Math.floor(this.beat / 4);
      if (this.beat % 8 === 0) {
        const roots = [0, 5, 3, 4];
        const deg = roots[bar / 2 % 4 | 0];
        [0, 2, 4].forEach((k, i) => this.harmonica(t + i * 0.08, semis(mode.root / 2, mode.scale[(deg + k) % mode.scale.length]), 0.045, step * 7.5));
      }
      if (this.rnd() < (this.beat % 2 === 0 ? 0.55 : 0.22)) {
        const deg = Math.floor(this.rnd() * mode.scale.length);
        this.harmonica(t, semis(mode.root, mode.scale[deg]), 0.06, step * (1.5 + this.rnd() * 2));
      }
      this.next += step;
      this.beat++;
    }
  }
  /** Rubbed glass: sine partials with a slow bow-like swell and a little shimmer. */
  private harmonica(t: number, f: number, vol: number, d: number, bus?: GainNode) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.6, d * 0.3));
    g.gain.setTargetAtTime(0, t + d * 0.6, d * 0.25);
    const vib = ctx.createOscillator(); vib.frequency.value = 4.2;
    const vg = ctx.createGain(); vg.gain.value = f * 0.004;
    vib.connect(vg);
    for (const [m, a] of [[1, 1], [2.01, 0.22], [3.02, 0.08]] as const) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * m;
      vg.connect(o.frequency);
      const og = ctx.createGain(); og.gain.value = a;
      o.connect(og).connect(g); o.start(t); o.stop(t + d * 2 + 0.2);
    }
    vib.start(t); vib.stop(t + d * 2 + 0.2);
    g.connect(bus ?? this.music);
  }
  private furnace() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    const g = ctx.createGain(); g.gain.value = 0.09;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.31;
    const lg = ctx.createGain(); lg.gain.value = 0.03; lfo.connect(lg).connect(g.gain);
    src.connect(lp).connect(g).connect(this.music);
    src.start(); lfo.start();
    return { stop: () => { try { src.stop(); lfo.stop(); } catch { /* stopped */ } } };
  }

  // ── breath: a sustained, filtered rush that brightens while you blow ────
  breathStart() {
    const ctx = this.ctx;
    if (!ctx) return;
    if (!this.breath) {
      const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.Q.value = 0.8; filter.frequency.value = 500;
      const gain = ctx.createGain(); gain.gain.value = 0;
      const tone = ctx.createOscillator(); tone.type = 'sine'; tone.frequency.value = 110;
      const toneGain = ctx.createGain(); toneGain.gain.value = 0;
      src.connect(filter).connect(gain).connect(this.sfx);
      tone.connect(toneGain).connect(this.sfx);
      src.start(); tone.start();
      this.breath = { gain, filter, src, tone, toneGain };
    }
    const t = ctx.currentTime, b = this.breath;
    b.gain.gain.setTargetAtTime(0.16, t, 0.05);
    b.filter.frequency.setTargetAtTime(1300, t, 0.4);
    b.toneGain.gain.setTargetAtTime(0.025, t, 0.1);
    b.tone.frequency.setTargetAtTime(150, t, 0.6);
  }
  breathEnd() {
    if (!this.ctx || !this.breath) return;
    const t = this.ctx.currentTime, b = this.breath;
    b.gain.gain.setTargetAtTime(0, t, 0.08);
    b.filter.frequency.setTargetAtTime(500, t, 0.2);
    b.toneGain.gain.setTargetAtTime(0, t, 0.08);
    b.tone.frequency.setTargetAtTime(110, t, 0.3);
  }

  // ── glass ───────────────────────────────────────────────────────────────
  private bell(t: number, f: number, vol: number, d = 2.4) {
    const ctx = this.ctx!;
    for (const [m, a, dd] of [[1, 1, 1], [2.76, 0.35, 0.6], [5.4, 0.15, 0.35], [8.93, 0.06, 0.2]] as const) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * m;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * a, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d * dd);
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + d * dd + 0.05);
    }
  }
  private hiss(t: number, dur: number, vol: number, freq: number, q = 1, sweepTo?: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.setValueAtTime(freq, t);
    if (sweepTo) bp.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(this.sfx); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  tap() { if (this.ctx) this.bell(this.ctx.currentTime, 1760, 0.035, 0.8); }
  finish(stars: number, chapter: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const mode = MODES[chapter % MODES.length];
    this.hiss(t, 1.6, 0.06, 3000, 0.6, 600);     // the hiss of glass cooling
    [0, 2, 4, 7].slice(0, 1 + stars).forEach((d, i) => this.bell(t + 0.5 + i * 0.22, semis(mode.root * 2, mode.scale[d % mode.scale.length] + (d >= mode.scale.length ? 12 : 0)), 0.09));
  }
  star(i: number) { if (this.ctx) this.bell(this.ctx.currentTime, [1318.5, 1567.98, 2093][i] ?? 2093, 0.08); }
  shatter() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.hiss(t, 0.5, 0.3, 4200, 0.5, 1800);
    for (let i = 0; i < 9; i++) this.bell(t + Math.random() * 0.35, 1800 + Math.random() * 3200, 0.04, 0.6);
  }
  pinch() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.3);
    g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.4);
    this.hiss(t, 0.2, 0.06, 900, 1);
  }

  private makeNoise() {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = w * 0.6 + last * 3; }
    return b;
  }
  private impulse(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return b;
  }
}

export const sound = new Sound();
