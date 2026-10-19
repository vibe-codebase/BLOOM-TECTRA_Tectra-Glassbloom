import { describe, expect, it } from 'vitest';
import { LEVELS, CHAPTERS, RMAX, RMIN, heightOf } from '../game/levels';
import { createSim, step, score, targetAt, sampleProfile, fidelity, SAMPLES } from '../game/sim';
import { search, blow } from '../game/bot';
import { parseSave, freshSave, recordResult, isUnlocked, totalStars } from '../state/save';

describe('levels', () => {
  it('has 24 uniquely named pieces, 8 per chapter', () => {
    expect(LEVELS).toHaveLength(24);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(24);
    CHAPTERS.forEach((_, c) => expect(LEVELS.filter((l) => l.chapter === c)).toHaveLength(8));
  });
  it('keeps every commission blowable: inside the safe radius, rising heights, ordered star thresholds', () => {
    for (const l of LEVELS) {
      for (let i = 1; i < l.profile.length; i++) expect(l.profile[i][0]).toBeGreaterThan(l.profile[i - 1][0]);
      for (let y = 0; y <= heightOf(l); y += 2) { const r = targetAt(l, y); expect(r).toBeGreaterThan(RMIN + 4); expect(r).toBeLessThan(RMAX - 8); }
      expect(l.stars[0]).toBeLessThan(l.stars[1]); expect(l.stars[1]).toBeLessThan(l.stars[2]);
      expect(heightOf(l)).toBeLessThanOrEqual(320);
    }
  });
  it.each(LEVELS.map((l) => [l.id, l] as const))('%s earns three stars at human pace (a decision every 0.12 s)', (_id, l) => {
    const { result } = search(l, 0.12);
    expect(result.outcome).toBe('done');
    expect(result.stars).toBe(3);
  });
});

describe('sim', () => {
  it('is deterministic and ends exactly at the lip', () => {
    const l = LEVELS[9];
    const a = blow(l, { look: 0.12, gain: 0.1 }).sim, b = blow(l, { look: 0.12, gain: 0.1 }).sim;
    expect(a).toEqual(b);
    expect(a.y).toBeCloseTo(heightOf(l), 5);
  });
  it('bursts when you never stop blowing and seals when you never blow', () => {
    for (const l of [LEVELS[0], LEVELS[12]]) {
      const hold = createSim(l); while (hold.outcome === 'blowing') step(l, hold, true);
      expect(hold.outcome).toBe('burst'); expect(score(l, hold).success).toBe(false);
      const none = createSim(l); while (none.outcome === 'blowing') step(l, none, false);
      expect(none.outcome).toBe('pinched');
    }
  });
  it('scores a perfect track at 100% and samples the piece for the gallery', () => {
    const l = LEVELS[0];
    const s = createSim(l);
    s.scoreN = 10; s.scoreSum = 10;
    expect(fidelity(s)).toBe(1);
    const { sim } = blow(l, { look: 0, gain: 0 });
    const prof = sampleProfile(l, sim);
    expect(prof).toHaveLength(SAMPLES);
    prof.forEach((r, i) => expect(Math.abs(r - targetAt(l, (i / (SAMPLES - 1)) * heightOf(l)))).toBeLessThan(10));
  });
});

describe('save', () => {
  it('survives garbage and rejects malformed pieces', () => {
    for (const raw of [null, '', '{', 'null', '[]', '{"v":9}', '{"v":1,"pieces":{"amber-1":[1,2]},"best":{"amber-1":"x"}}'])
      expect(parseSave(raw)).toEqual(expect.objectContaining({ v: 1 }));
    expect(parseSave('{"v":1,"pieces":{"amber-1":[1,2]}}').pieces['amber-1']).toBeUndefined();
  });
  it('keeps the most faithful piece and only raises stars', () => {
    const piece = Array.from({ length: SAMPLES }, () => 30);
    let s = freshSave();
    s = recordResult(s, 'amber-1', 2, 0.8, piece);
    s = recordResult(s, 'amber-1', 1, 0.7, piece.map(() => 20));
    expect(s.stars['amber-1']).toBe(2);
    expect(s.best['amber-1']).toBe(0.8);
    expect(s.pieces['amber-1'][0]).toBe(30);
    expect(isUnlocked(s, 1)).toBe(true);
    expect(totalStars(s)).toBe(2);
    expect(parseSave(JSON.stringify(s))).toEqual(s);
  });
});
