import { LEVELS } from '../game/levels';
import { SAMPLES } from '../game/sim';

export type Settings = { music: number; sfx: number; haptics: boolean; reducedMotion: boolean };
/** stars and best fidelity per piece, plus the best piece itself so the gallery can show it. */
export type Save = { v: 1; stars: Record<string, number>; best: Record<string, number>; pieces: Record<string, number[]>; seenHints: string[]; settings: Settings };

const KEY = 'glassbloom.save.v1';
export const DEFAULT_SETTINGS: Settings = { music: 0.6, sfx: 0.8, haptics: true, reducedMotion: false };
export const freshSave = (): Save => ({ v: 1, stars: {}, best: {}, pieces: {}, seenHints: [], settings: { ...DEFAULT_SETTINGS } });

const clamp01 = (n: unknown, d: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : d);

export function parseSave(raw: string | null): Save {
  const out = freshSave();
  if (!raw) return out;
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || d.v !== 1) return out;
    const ids = new Set(LEVELS.map((l) => l.id));
    for (const [k, v] of Object.entries(d.stars ?? {})) if (ids.has(k) && Number.isInteger(v) && (v as number) > 0) out.stars[k] = Math.min(3, v as number);
    for (const [k, v] of Object.entries(d.best ?? {})) if (ids.has(k) && typeof v === 'number' && Number.isFinite(v)) out.best[k] = Math.min(1, Math.max(0, v));
    for (const [k, v] of Object.entries(d.pieces ?? {}))
      if (ids.has(k) && Array.isArray(v) && v.length === SAMPLES && v.every((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 120)) out.pieces[k] = v as number[];
    if (Array.isArray(d.seenHints)) out.seenHints = d.seenHints.filter((h: unknown) => typeof h === 'string' && ids.has(h));
    const s = d.settings ?? {};
    out.settings = { music: clamp01(s.music, DEFAULT_SETTINGS.music), sfx: clamp01(s.sfx, DEFAULT_SETTINGS.sfx), haptics: s.haptics !== false, reducedMotion: s.reducedMotion === true };
  } catch { /* corrupted: start fresh */ }
  return out;
}

export function loadSave(): Save {
  try { return parseSave(localStorage.getItem(KEY)); } catch { return freshSave(); }
}
export function writeSave(s: Save) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable: progress stays in memory */ }
}

/** Record a finished piece. Stars only go up; the gallery keeps the most faithful piece. */
export function recordResult(s: Save, id: string, stars: number, fidelity: number, profile: number[]): Save {
  if (stars <= 0) return s;
  const better = s.best[id] === undefined || fidelity > s.best[id];
  return {
    ...s,
    stars: { ...s.stars, [id]: Math.max(s.stars[id] ?? 0, stars) },
    best: better ? { ...s.best, [id]: fidelity } : s.best,
    pieces: better ? { ...s.pieces, [id]: profile } : s.pieces,
  };
}

export function isUnlocked(s: Save, index: number) {
  return index === 0 || (s.stars[LEVELS[index - 1].id] ?? 0) > 0;
}
export const totalStars = (s: Save) => Object.values(s.stars).reduce((a, b) => a + b, 0);
