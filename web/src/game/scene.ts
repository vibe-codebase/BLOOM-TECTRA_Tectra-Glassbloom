import Phaser from 'phaser';
import * as A from './art';
import { CHAPTERS, heightOf, LEVELS, RMAX, type Level } from './levels';
import { createSim, DT, fidelity, score, step, targetAt, sampleProfile, type Outcome, type Result, type Sim } from './sim';
import { search, blow } from './bot';
import { sound } from '../audio/sound';

export type Finish = { level: Level; result: Result; profile: number[] };
type Hooks = {
  onFinish?: (f: Finish) => void;
  onStart?: () => void;
  onHaptic?: (style: 'light' | 'medium' | 'success' | 'warning') => void;
};

/** Bridge between React and the Phaser scene. */
export const studio = {
  hooks: {} as Hooks,
  scene: null as StudioScene | null,
  reducedMotion: false,
  fidelity: 1,
  menuBottom: 210,   // css px taken by the title screen's buttons
  setMenuBottom(px: number) { if (Math.abs(px - this.menuBottom) < 4) return; this.menuBottom = px; if (this.scene && this.scene.isMenu()) this.scene.relayout(); },
  progress: 0,
  show(mode: 'menu' | 'play', level: Level) { this.scene?.show(mode, level); },
  setPaused(p: boolean) { this.scene?.setPaused(p); },
  debug() { return this.scene?.debugState(); },
  /** QA only: play the piece instantly with the autopilot ('win') or by never breathing ('fail'). */
  qa(kind: 'win' | 'fail') { this.scene?.qaRun(kind); },
};
(window as unknown as { __studio: typeof studio }).__studio = studio;

const W = 360;
const BENCH_FROM_BOTTOM = 150;

export class StudioScene extends Phaser.Scene {
  level: Level = LEVELS[0];
  private mode: 'menu' | 'play' = 'menu';
  private state: 'ready' | 'blowing' | 'finished' = 'ready';
  private sim!: Sim;
  private hold = false;
  private paused = false;
  private acc = 0;
  private r = 2;
  private H = 640;
  private benchY = 490;
  private texSeq = 0;
  private runId = 0;
  private vaseTex!: Phaser.Textures.CanvasTexture;
  private vaseKey = '';
  private ghost!: Phaser.GameObjects.Image;
  private pipe!: Phaser.GameObjects.Image;
  private gather!: Phaser.GameObjects.Image;
  private gatherCore!: Phaser.GameObjects.Ellipse;
  private ticks: Phaser.GameObjects.Rectangle[] = [];
  private furnace!: Phaser.GameObjects.Image;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private shards: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private demoPolicy = { look: 0.1, gain: 0.1 };
  private demoHold = 0;
  private cooledAt = 0;

  constructor() { super('studio'); }

  create() {
    studio.scene = this;
    this.input.on('pointerdown', () => this.setHold(true));
    this.input.on('pointerup', () => this.setHold(false));
    this.input.on('pointerupoutside', () => this.setHold(false));
    this.input.keyboard?.on('keydown-SPACE', () => this.setHold(true));
    this.input.keyboard?.on('keyup-SPACE', () => this.setHold(false));
    this.scale.on('resize', () => this.rebuild());
    this.rebuild();
  }

  debugState() { return { mode: this.mode, state: this.state, paused: this.paused, sim: this.sim && { t: this.sim.t, y: this.sim.y, r: this.sim.r, outcome: this.sim.outcome, fidelity: fidelity(this.sim) } }; }

  show(mode: 'menu' | 'play', level: Level) {
    this.mode = mode;
    this.level = level;
    this.paused = false;
    this.hold = false;
    this.state = 'ready';
    this.runId++;
    if (mode === 'menu') this.demoPolicy = search(level).policy;
    this.rebuild();
  }
  setPaused(p: boolean) { this.paused = p; if (p) this.setHold(false); }
  isMenu() { return this.mode === 'menu'; }
  relayout() { this.rebuild(); }

  private setHold(h: boolean) {
    if (this.mode !== 'play' || this.paused || this.state === 'finished') { this.hold = false; return; }
    if (h && this.state === 'ready') { this.state = 'blowing'; studio.hooks.onStart?.(); }
    if (h !== this.hold) {
      this.hold = h;
      if (h) { sound.breathStart(); studio.hooks.onHaptic?.('light'); } else sound.breathEnd();
    }
  }

  private tex(prefix: string, c: HTMLCanvasElement) {
    const k = `${prefix}-${++this.texSeq}`;
    this.textures.addCanvas(k, c);
    return k;
  }
  private img(x: number, y: number, c: HTMLCanvasElement, prefix: string) {
    return this.add.image(x, y, this.tex(prefix, c)).setScale(1 / this.r);
  }

  private rebuild() {
    const stale = this.textures.getTextureKeys().filter((k) => /-\d+$/.test(k));
    this.tweens.killAll();
    this.children.removeAll(true);
    if (stale.length) this.events.once('postrender', () => stale.forEach((k) => this.textures.exists(k) && this.textures.remove(k)));
    this.ticks = []; this.shards = null;

    const pw = this.scale.width, ph = this.scale.height;
    const zoom = pw / W;
    this.r = Math.min(2, Math.max(1, zoom));
    this.H = Math.max(600, ph / zoom);
    const k = W / Math.max(1, this.game.canvas.clientWidth || W);
    this.benchY = this.mode === 'menu' ? this.H - Math.max(BENCH_FROM_BOTTOM, studio.menuBottom * k + 14) : this.H - BENCH_FROM_BOTTOM;
    this.cameras.main.setZoom(zoom).centerOn(W / 2, this.H / 2);
    const L = this.level, p = A.PALETTES[L.chapter], r = this.r, H = this.H, by = this.benchY;
    this.cameras.main.setBackgroundColor(p.wall[1]);

    this.img(W / 2, H / 2, A.studioTexture(p, W, H, by, r, 11 + L.chapter), 'studio');
    this.furnace = this.img(W + 18, by - 170, A.furnaceTexture(p, 56, r), 'furnace');
    if (!studio.reducedMotion) this.flicker();

    const emberKey = this.tex('ember', A.dotTexture(p.ember, 3, r, 0.5));
    this.add.particles(0, 0, emberKey, {
      x: { min: W - 60, max: W }, y: { min: by - 220, max: by - 120 }, lifespan: { min: 2500, max: 5000 },
      speedY: { min: -26, max: -12 }, speedX: { min: -14, max: 2 }, scale: { start: 1 / r, end: 0.2 / r }, alpha: { start: 0.9, end: 0 },
      frequency: studio.reducedMotion ? -1 : 260, blendMode: 'ADD',
    });

    // the piece being blown lives on a canvas we repaint as it grows
    this.vaseKey = `vase-${++this.texSeq}`;
    this.vaseTex = this.textures.createCanvas(this.vaseKey, W * r, (by + 12) * r)!;
    this.add.image(0, 0, this.vaseKey).setOrigin(0, 0).setScale(1 / r);

    const pts = [];
    for (let y = 0; y <= heightOf(L); y += 3) pts.push({ y, r: targetAt(L, y) });
    pts.push({ y: heightOf(L), r: targetAt(L, heightOf(L)) });
    this.ghost = this.img(W / 2, (by + 12) / 2, A.ghostTexture(pts, W, by + 12, by, r), 'ghost').setAlpha(this.mode === 'menu' ? 0 : 0.8);
    for (let i = 0; i < 2; i++) this.ticks.push(this.add.rectangle(0, 0, 9, 2.2, 0xfff1d6, 0.95).setVisible(this.mode === 'play'));

    this.pipe = this.img(W / 2, 0, A.pipeTexture(230, r), 'pipe').setOrigin(0.5, 1);
    this.gather = this.img(W / 2, 0, A.dotTexture('#ffb35c', 26, r, 0.25), 'gather').setBlendMode(Phaser.BlendModes.ADD);
    this.gatherCore = this.add.ellipse(W / 2, 0, 14, 7, 0xfff0c8, 0.95);

    const sparkKey = this.tex('spark', A.dotTexture('#ffd08a', 2.2, r, 0.6));
    this.sparks = this.add.particles(0, 0, sparkKey, {
      speed: { min: 20, max: 70 }, angle: { min: 200, max: 340 }, gravityY: 90, lifespan: { min: 300, max: 700 },
      scale: { start: 1 / r, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 40, blendMode: 'ADD', emitting: false,
    });

    this.sim = createSim(L);
    this.acc = 0;
    this.demoHold = 0;
    this.paintVase();
    this.placeTools();
  }

  private flicker() {
    this.tweens.add({ targets: this.furnace, alpha: { from: 0.86, to: 1 }, scale: { from: 0.98 / this.r, to: 1.03 / this.r }, duration: 120 + Math.random() * 260, yoyo: true,
      onComplete: () => this.flicker() });
  }

  // ── loop ──────────────────────────────────────────────────────────────
  update(_t: number, deltaMs: number) {
    const dt = Math.min(0.1, deltaMs / 1000);
    if (!this.sim || this.paused) return;
    if (this.mode === 'menu') this.demo(dt);
    else if (this.state === 'blowing') {
      this.acc += dt;
      let n = 0;
      while (this.acc >= DT && n < 24 && this.sim.outcome === 'blowing') {
        this.acc -= DT; n++;
        step(this.level, this.sim, this.hold);
        this.handleEvents();
      }
      if (n >= 24) this.acc = 0;
      studio.fidelity = fidelity(this.sim);
      studio.progress = this.sim.y / heightOf(this.level);
    }
    this.sparks.emitting = this.hold && this.state === 'blowing' && !studio.reducedMotion;
    this.paintVase();
    this.placeTools();
  }

  private demo(dt: number) {
    // Title screen: the autopilot blows the chapter's first piece, it cools on the bench, then begins again.
    if (this.sim.outcome === 'blowing') {
      this.acc += dt;
      while (this.acc >= DT && this.sim.outcome === 'blowing') {
        this.acc -= DT;
        if (this.demoHold <= 0) {
          const ahead = this.sim.y + this.level.speed * this.demoPolicy.look;
          this.hold = this.sim.r + this.sim.w * this.demoPolicy.gain < targetAt(this.level, Math.min(heightOf(this.level), ahead));
          this.demoHold = 0;
        }
        this.demoHold -= DT;
        step(this.level, this.sim, this.hold);
      }
      if (this.sim.outcome !== 'blowing') { this.hold = false; this.cooledAt = this.sim.t; }
    } else {
      this.sim.t += dt;
      if (this.sim.t - this.cooledAt > 5) { this.sim = createSim(this.level); this.acc = 0; }
    }
  }

  private handleEvents() {
    for (const e of this.sim.events) {
      if (e === 'done') this.finish('done');
      else if (e === 'burst') this.finish('burst');
      else if (e === 'pinched') this.finish('pinched');
    }
  }

  private finish(outcome: Outcome) {
    if (this.state === 'finished') return;
    this.state = 'finished';
    this.hold = false;
    sound.breathEnd();
    const result = score(this.level, this.sim);
    const profile = sampleProfile(this.level, this.sim);
    if (outcome === 'burst') { this.shatter(); sound.shatter(); studio.hooks.onHaptic?.('warning'); }
    else if (outcome === 'pinched') { sound.pinch(); studio.hooks.onHaptic?.('warning'); }
    else { sound.finish(result.stars, this.level.chapter); studio.hooks.onHaptic?.(result.success ? 'success' : 'medium'); }
    // let the glass cool before the result, so the player sees the colour come in
    this.cooledAt = this.sim.t;
    const run = this.runId;
    window.setTimeout(() => { if (run === this.runId) studio.hooks.onFinish?.({ level: this.level, result, profile }); }, outcome === 'done' ? 1900 : 1300);
  }

  private shatter() {
    if (studio.reducedMotion) return;
    const key = this.tex('shard', (() => { const { c, g } = A.canvas(6 * this.r, 6 * this.r); g.scale(this.r, this.r); g.fillStyle = A.hexA(CHAPTERS[this.level.chapter].tint, 0.9); g.beginPath(); g.moveTo(0, 0); g.lineTo(6, 2); g.lineTo(2, 6); g.closePath(); g.fill(); return c; })());
    const top = this.benchY - this.sim.y;
    this.shards = this.add.particles(W / 2, top + 30, key, {
      speed: { min: 80, max: 260 }, angle: { min: 0, max: 360 }, gravityY: 500, lifespan: 1400, rotate: { min: 0, max: 360 },
      scale: { start: 1 / this.r, end: 0.6 / this.r }, alpha: { start: 1, end: 0 }, emitting: false,
    });
    this.shards.explode(46);
    this.sim.slices = this.sim.slices.slice(0, 2);
  }

  qaRun(kind: 'win' | 'fail') {
    if (this.mode !== 'play' || this.state === 'finished') return;
    this.state = 'blowing';
    if (kind === 'win') {
      const pol = search(this.level, 0.12).policy;
      const { sim } = blow(this.level, pol, 0.12);
      this.sim = sim;
      this.finish(sim.outcome);
    } else {
      while (this.sim.outcome === 'blowing') { step(this.level, this.sim, false); }
      this.finish(this.sim.outcome);
    }
  }

  // ── drawing ───────────────────────────────────────────────────────────
  private paintVase() {
    const g = this.vaseTex.context, r = this.r;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.vaseTex.width, this.vaseTex.height);
    g.setTransform(r, 0, 0, r, 0, 0);
    const ch = CHAPTERS[this.level.chapter];
    const live = this.sim.outcome === 'blowing';
    A.drawVase(g, this.sim.slices, W / 2, this.benchY, ch.glass, ch.tint, this.sim.t, live ? 2.6 : 1.1);
    this.vaseTex.refresh();
  }

  private placeTools() {
    const s = this.sim, by = this.benchY;
    const top = by - s.y;
    const working = s.outcome === 'blowing';
    const pipeOn = working || (this.mode === 'play' && this.state === 'ready');
    this.pipe.setVisible(pipeOn || (this.mode === 'menu' && working)).setPosition(W / 2, top - 4).setAlpha(this.mode === 'menu' ? 0.5 : 1);
    const pulse = this.hold ? 1.25 : 1;
    this.gather.setVisible(pipeOn).setPosition(W / 2, top).setScale((Math.max(0.6, s.r / 40) * pulse) / this.r).setAlpha(this.hold ? 0.95 : 0.7);
    this.gatherCore.setVisible(pipeOn).setPosition(W / 2, top).setSize(Math.max(8, s.r * 2), 5);
    this.sparks.setPosition(W / 2, top);
    const tgt = targetAt(this.level, Math.min(heightOf(this.level), s.y));
    this.ticks[0].setPosition(W / 2 - tgt - 6, top).setVisible(this.mode === 'play' && working);
    this.ticks[1].setPosition(W / 2 + tgt + 6, top).setVisible(this.mode === 'play' && working);
    if (this.mode === 'play') this.ghost.setAlpha(this.state === 'finished' ? Math.max(0, this.ghost.alpha - 0.02) : 0.8);
  }
}

export const MAX_WIDTH = RMAX * 2;

export function startGame(parent: HTMLElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#120c09',
    scale: { mode: Phaser.Scale.NONE, width: parent.clientWidth * dpr, height: parent.clientHeight * dpr, zoom: 1 / dpr },
    render: { antialias: true, pixelArt: false, powerPreference: 'high-performance' },
    audio: { noAudio: true },
    fps: { target: 60, smoothStep: false },
    input: { activePointers: 2 },
    scene: [StudioScene],
    banner: false,
  });
  const onResize = () => {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    game.scale.setZoom(1 / d);
    game.scale.resize(parent.clientWidth * d, parent.clientHeight * d);
  };
  window.addEventListener('resize', onResize);
  return () => { window.removeEventListener('resize', onResize); game.destroy(true); };
}
