import { heightOf, type Level } from './levels';
import { createSim, score, speedAt, step, targetAt, type Result } from './sim';

/**
 * Autopilot used by the tests: a look-ahead controller that breathes when the glass, given its
 * current momentum, will fall short of the line a moment from now. Searching its two knobs per
 * level proves each piece can earn three stars by hand-like play.
 */
export type Policy = { look: number; gain: number };

/** `beat` > 0 models a person: the decision is only revisited every `beat` seconds. */
export function blow(level: Level, p: Policy, beat = 0) {
  const s = createSim(level);
  let guard = 0, hold = false, next = 0;
  while (s.outcome === 'blowing' && guard++ < 120 * 60) {
    if (s.t >= next) {
      const ahead = s.y + speedAt(level, s.y) * p.look;
      const want = targetAt(level, Math.min(heightOf(level), ahead));
      hold = s.r + s.w * p.gain < want;
      next = s.t + beat;
    }
    step(level, s, hold);
  }
  return { sim: s, result: score(level, s) };
}

export function search(level: Level, beat = 0): { policy: Policy; result: Result } {
  let best: { policy: Policy; result: Result } | null = null;
  for (let look = 0; look <= 0.6; look += 0.04)
    for (const gain of level.model === 'breath' ? [0] : [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8])
      {
        const policy = { look, gain };
        const { result } = blow(level, policy, beat);
        if (!best || result.fidelity > best.result.fidelity) best = { policy, result };
      }
  return best!;
}
