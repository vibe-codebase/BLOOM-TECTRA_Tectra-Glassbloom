import { heightOf, RMAX, RMIN, type Level } from './levels';

/**
 * Glassbloom physics. The glass is pulled upward at a steady speed while the player's breath
 * sets how wide it swells. Each slice of glass freezes into the piece as it passes, so the
 * finished vase is a record of every breath. Pure and deterministic for tests and the autopilot.
 */
export const DT = 1 / 120;
export const TOL = 15;           // deviation (units) at which a slice scores zero
export const SAMPLES = 64;       // stored profile resolution for the gallery

export type Outcome = 'blowing' | 'done' | 'burst' | 'pinched';
export type Sim = {
  t: number; y: number; r: number; w: number; holding: boolean;
  outcome: Outcome;
  slices: { y: number; r: number; t: number }[];   // every frozen slice (for drawing)
  scoreSum: number; scoreN: number;
  events: ('burst' | 'pinched' | 'done' | 'breath-start' | 'breath-end')[];
};

/** Smooth interpolation through the control points (monotone cubic Hermite). */
export function targetAt(level: Level, y: number): number {
  const p = level.profile;
  if (y <= p[0][0]) return p[0][1];
  if (y >= p[p.length - 1][0]) return p[p.length - 1][1];
  let i = 0;
  while (i < p.length - 2 && y > p[i + 1][0]) i++;
  const [x0, y0] = p[i], [x1, y1] = p[i + 1];
  const h = x1 - x0, t = (y - x0) / h;
  const slope = (j: number) => {
    if (j <= 0 || j >= p.length - 1) return 0;
    const dl = (p[j][1] - p[j - 1][1]) / (p[j][0] - p[j - 1][0]);
    const dr = (p[j + 1][1] - p[j][1]) / (p[j + 1][0] - p[j][0]);
    return dl * dr <= 0 ? 0 : (2 * dl * dr) / (dl + dr);
  };
  const m0 = slope(i) * h, m1 = slope(i + 1) * h;
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1;
}

export function speedAt(level: Level, y: number) {
  return level.speed * (1 + (level.accel ?? 0) * Math.min(1, y / heightOf(level)));
}

export function createSim(level: Level): Sim {
  const r = targetAt(level, 0);
  return { t: 0, y: 0, r, w: 0, holding: false, outcome: 'blowing', slices: [{ y: 0, r, t: 0 }], scoreSum: 0, scoreN: 0, events: [] };
}

export function step(level: Level, s: Sim, hold: boolean, dt = DT): Sim {
  s.events = [];
  if (s.outcome !== 'blowing') return s;
  if (hold !== s.holding) s.events.push(hold ? 'breath-start' : 'breath-end');
  s.holding = hold;
  s.t += dt;
  if (level.model === 'breath') {
    // breath responds quickly but not instantly, which keeps the walls of the glass smooth
    const want = hold ? level.inflate : -level.deflate;
    s.w += (want - s.w) * Math.min(1, dt / 0.12);
  } else {
    s.w += (hold ? level.inflate : -level.deflate) * dt;
    s.w *= Math.exp(-(level.damping ?? 1.4) * dt);
  }
  s.r += s.w * dt;
  s.y = Math.min(heightOf(level), s.y + speedAt(level, s.y) * dt);
  if (s.r >= RMAX) { s.r = RMAX; s.outcome = 'burst'; s.events.push('burst'); }
  else if (s.r <= RMIN) { s.r = RMIN; s.outcome = 'pinched'; s.events.push('pinched'); }
  const dev = Math.abs(s.r - targetAt(level, s.y));
  s.scoreSum += Math.max(0, 1 - dev / TOL);
  s.scoreN++;
  const last = s.slices[s.slices.length - 1];
  if (s.y - last.y >= 1.5 || s.outcome !== 'blowing') s.slices.push({ y: s.y, r: s.r, t: s.t });
  if (s.outcome === 'blowing' && s.y >= heightOf(level)) { s.outcome = 'done'; s.events.push('done'); }
  return s;
}

export const fidelity = (s: Sim) => (s.scoreN ? s.scoreSum / s.scoreN : 1);

export type Result = { success: boolean; stars: number; fidelity: number; outcome: Outcome };
export function score(level: Level, s: Sim): Result {
  const f = fidelity(s);
  const ok = s.outcome === 'done' && f >= level.stars[0];
  const stars = ok ? (f >= level.stars[2] ? 3 : f >= level.stars[1] ? 2 : 1) : 0;
  return { success: ok, stars, fidelity: f, outcome: s.outcome };
}

/** The finished piece resampled to a fixed resolution, for saving to the gallery. */
export function sampleProfile(level: Level, s: Sim): number[] {
  const H = heightOf(level), out: number[] = [];
  let j = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const y = (i / (SAMPLES - 1)) * H;
    while (j < s.slices.length - 2 && s.slices[j + 1].y < y) j++;
    const a = s.slices[j], b = s.slices[Math.min(j + 1, s.slices.length - 1)];
    const k = b.y > a.y ? Math.max(0, Math.min(1, (y - a.y) / (b.y - a.y))) : 0;
    out.push(Math.round((a.r + (b.r - a.r) * k) * 10) / 10);
  }
  return out;
}

export const FAIL_COPY = {
  burst: { title: 'It burst', line: 'Too much breath at once. Ease off as the glass nears the line.' },
  pinched: { title: 'The neck closed', line: 'The glass drew in until it sealed. Breathe a little sooner.' },
  low: { title: 'Back to the furnace', line: 'A lovely piece, but not quite the commission. Stay closer to the line.' },
} as const;
