/**
 * Glassbloom levels. Each piece is a target silhouette the player blows on the pipe.
 * A profile is a list of [height, radius] control points from the foot (0) to the lip.
 * Units are studio units: the vase stands on the marver, up to ~300 tall and ~90 wide in radius.
 */
export type Model = 'breath' | 'swell';   // breath: holding inflates directly; swell: holding builds momentum
export type Level = {
  id: string; chapter: 0 | 1 | 2; name: string; note: string;
  profile: [number, number][];
  speed: number;          // pull speed (units/s) at the foot
  accel?: number;         // extra speed by the lip, as a fraction (0.4 = 40% faster)
  model: Model;
  inflate: number;        // breath: radius/s while holding; swell: radial accel while holding
  deflate: number;        // breath: radius/s when released; swell: radial accel when released
  damping?: number;       // swell only
  stars: [number, number, number]; // fidelity needed for 1, 2 and 3 stars (0..1)
  hint?: string;
};

export const CHAPTERS = [
  { name: 'Amber', blurb: 'Warm, forgiving glass. Learn to breathe a shape.', glass: '#d98a2b', tint: '#f3c27a' },
  { name: 'Cobalt', blurb: 'Glass with weight. A breath keeps swelling after you stop.', glass: '#2f5fd0', tint: '#86a8ff' },
  { name: 'Opaline', blurb: 'Milky, quick glass and the finest forms in the studio.', glass: '#bfe0d6', tint: '#f1fbf6' },
] as const;

export const RMIN = 5;
export const RMAX = 96;

const L = (o: Omit<Level, 'stars'> & { stars?: Level['stars'] }): Level => ({ stars: [0.6, 0.76, 0.86], ...o });

export const LEVELS: Level[] = [
  // ── Amber ────────────────────────────────────────────────────────────
  L({ id: 'amber-1', stars: [0.64, 0.75, 0.84], chapter: 0, name: 'Tumbler', note: 'A straight cup to warm the hands.', model: 'breath', speed: 34, inflate: 46, deflate: 28,
    profile: [[0, 34], [40, 38], [120, 40], [170, 42]], hint: 'Hold to breathe the glass wider. Let go and it draws in. Follow the dotted line.' }),
  L({ id: 'amber-2', stars: [0.62, 0.73, 0.82], chapter: 0, name: 'Bud Vase', note: 'Round belly, slim neck.', model: 'breath', speed: 36, inflate: 50, deflate: 28,
    profile: [[0, 22], [50, 52], [95, 54], [140, 22], [190, 14], [215, 20]] }),
  L({ id: 'amber-3', stars: [0.6, 0.71, 0.8], chapter: 0, name: 'Carafe', note: 'Wide shoulders for wine.', model: 'breath', speed: 38, inflate: 52, deflate: 29,
    profile: [[0, 40], [60, 62], [110, 60], [160, 26], [230, 18], [250, 24]] }),
  L({ id: 'amber-4', stars: [0.65, 0.76, 0.85], chapter: 0, name: 'Hourglass', note: 'Two bulbs that meet in a whisper.', model: 'breath', speed: 40, inflate: 56, deflate: 31,
    profile: [[0, 48], [55, 58], [120, 14], [185, 58], [240, 48]] }),
  L({ id: 'amber-5', stars: [0.61, 0.72, 0.81], chapter: 0, name: 'Lantern Glass', note: 'Tall and patient.', model: 'breath', speed: 42, inflate: 52, deflate: 29,
    profile: [[0, 30], [40, 46], [230, 48], [270, 36], [290, 42]] }),
  L({ id: 'amber-6', stars: [0.55, 0.66, 0.75], chapter: 0, name: 'Gourd', note: 'Small head, generous body.', model: 'breath', speed: 42, inflate: 58, deflate: 32,
    profile: [[0, 30], [55, 70], [110, 66], [150, 30], [185, 40], [225, 22], [250, 16]] }),
  L({ id: 'amber-7', stars: [0.58, 0.69, 0.78], chapter: 0, name: 'Tulip', note: 'A cup that opens like a flower.', model: 'breath', speed: 44, inflate: 60, deflate: 33,
    profile: [[0, 14], [50, 18], [70, 40], [150, 46], [215, 72], [235, 76]] }),
  L({ id: 'amber-8', stars: [0.55, 0.66, 0.75], chapter: 0, name: 'Apothecary', note: 'Three swells for three remedies.', model: 'breath', speed: 46, inflate: 64, deflate: 35,
    profile: [[0, 46], [40, 52], [80, 26], [120, 44], [160, 22], [200, 36], [240, 16], [270, 22]] }),

  // ── Cobalt ───────────────────────────────────────────────────────────
  L({ id: 'cobalt-1', stars: [0.68, 0.79, 0.88], chapter: 1, name: 'Ink Pot', note: 'Squat, heavy and calm.', model: 'swell', speed: 32, inflate: 90, deflate: 80, damping: 1.6,
    profile: [[0, 40], [50, 60], [100, 54], [130, 20], [150, 24]], hint: 'Cobalt glass keeps moving after you stop breathing. Ease off early.' }),
  L({ id: 'cobalt-2', stars: [0.7, 0.81, 0.9], chapter: 1, name: 'Decanter', note: 'Broad base, long throat.', model: 'swell', speed: 34, inflate: 95, deflate: 85, damping: 1.6,
    profile: [[0, 66], [50, 70], [110, 30], [200, 16], [235, 22]] }),
  L({ id: 'cobalt-3', stars: [0.7, 0.81, 0.9], chapter: 1, name: 'Bell', note: 'Flares wide at the rim.', model: 'swell', speed: 36, inflate: 100, deflate: 88, damping: 1.5,
    profile: [[0, 18], [70, 22], [140, 36], [190, 62], [215, 80]] }),
  L({ id: 'cobalt-4', stars: [0.66, 0.77, 0.86], chapter: 1, name: 'Twin Moons', note: 'Two round bulbs, one above the other.', model: 'swell', speed: 38, inflate: 105, deflate: 95, damping: 1.5,
    profile: [[0, 24], [50, 54], [100, 20], [150, 54], [200, 20], [220, 26]] }),
  L({ id: 'cobalt-5', stars: [0.7, 0.81, 0.9], chapter: 1, name: 'Amphora', note: 'Shoulders high, foot narrow.', model: 'swell', speed: 38, inflate: 105, deflate: 92, damping: 1.4,
    profile: [[0, 16], [70, 46], [170, 66], [220, 30], [270, 26], [290, 36]] }),
  L({ id: 'cobalt-6', stars: [0.69, 0.8, 0.89], chapter: 1, name: 'Ripple Glass', note: 'A gentle wave all the way up.', model: 'swell', speed: 40, inflate: 115, deflate: 105, damping: 1.4,
    profile: [[0, 40], [35, 52], [70, 36], [105, 52], [140, 36], [175, 52], [210, 36], [245, 50]] }),
  L({ id: 'cobalt-7', stars: [0.7, 0.81, 0.9], chapter: 1, name: 'Hurricane', note: 'A tall chimney with a waist.', model: 'swell', speed: 42, inflate: 115, deflate: 100, damping: 1.3, accel: 0.25,
    profile: [[0, 50], [60, 58], [130, 28], [220, 50], [290, 44]] }),
  L({ id: 'cobalt-8', stars: [0.66, 0.77, 0.86], chapter: 1, name: 'Night Ewer', note: 'Full belly, narrow neck, a spout of a lip.', model: 'swell', speed: 44, inflate: 125, deflate: 110, damping: 1.3, accel: 0.25,
    profile: [[0, 30], [60, 74], [120, 70], [170, 24], [240, 14], [275, 34]] }),

  // ── Opaline ──────────────────────────────────────────────────────────
  L({ id: 'opal-1', stars: [0.7, 0.81, 0.9], chapter: 2, name: 'Pearl', note: 'Almost a sphere.', model: 'swell', speed: 40, inflate: 115, deflate: 105, damping: 1.5,
    profile: [[0, 18], [40, 48], [90, 64], [140, 48], [178, 18], [195, 20]] }),
  L({ id: 'opal-2', stars: [0.7, 0.81, 0.9], chapter: 2, name: 'Fluted Stem', note: 'A thin stem that blooms at the top.', model: 'swell', speed: 42, inflate: 120, deflate: 110, damping: 1.4,
    profile: [[0, 40], [38, 12], [140, 11], [200, 40], [245, 64], [262, 68]] }),
  L({ id: 'opal-3', stars: [0.66, 0.77, 0.86], chapter: 2, name: 'Onion Dome', note: 'Round, then pointed, then a finial.', model: 'swell', speed: 44, inflate: 125, deflate: 110, damping: 1.4,
    profile: [[0, 30], [40, 64], [100, 64], [160, 26], [200, 12], [220, 17], [240, 12]] }),
  L({ id: 'opal-4', stars: [0.68, 0.79, 0.88], chapter: 2, name: 'Stacked Stones', note: 'Three pebbles, balanced.', model: 'swell', speed: 40, inflate: 140, deflate: 130, damping: 1.5,
    profile: [[0, 30], [45, 58], [95, 26], [140, 48], [185, 22], [220, 38], [255, 16], [270, 20]] }),
  L({ id: 'opal-5', stars: [0.7, 0.81, 0.9], chapter: 2, name: 'Lily', note: 'Narrow waist, petal lip.', model: 'swell', speed: 46, inflate: 130, deflate: 115, damping: 1.3, accel: 0.3,
    profile: [[0, 40], [40, 26], [150, 16], [230, 54], [275, 82]] }),
  L({ id: 'opal-6', stars: [0.64, 0.75, 0.84], chapter: 2, name: 'Moon Flask', note: 'A wide drum on a tiny foot.', model: 'swell', speed: 46, inflate: 135, deflate: 120, damping: 1.3, accel: 0.3,
    profile: [[0, 14], [35, 34], [85, 78], [150, 78], [205, 32], [250, 16], [270, 22]] }),
  L({ id: 'opal-7', stars: [0.6, 0.71, 0.8], chapter: 2, name: 'Spindle', note: 'Thin, thick, thin, thick, quickly.', model: 'swell', speed: 44, inflate: 150, deflate: 140, damping: 1.4, accel: 0.2,
    profile: [[0, 20], [40, 46], [80, 20], [120, 48], [160, 18], [200, 50], [240, 20], [270, 30]] }),
  L({ id: 'opal-8', stars: [0.62, 0.73, 0.82], chapter: 2, name: 'Masterpiece', note: 'Everything you have learned, in one breath.', model: 'swell', speed: 46, inflate: 155, deflate: 140, damping: 1.25, accel: 0.35,
    profile: [[0, 36], [45, 62], [95, 40], [130, 20], [175, 50], [220, 72], [262, 30], [292, 16], [310, 40]] }),
];

export const levelIndex = (id: string) => LEVELS.findIndex((l) => l.id === id);
export const heightOf = (l: Level) => l.profile[l.profile.length - 1][0];
