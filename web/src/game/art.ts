/**
 * Glassbloom art: a dim hot-shop lit by the furnace, and glass that glows while it is being blown
 * and cools into colour. Everything is painted procedurally at the device's pixel density.
 */
export type Palette = { wall: [string, string]; floor: string; glow: string; ember: string; steel: string };

export const PALETTES: Palette[] = [
  { wall: ['#2a1d16', '#120c09'], floor: '#1b1410', glow: '#ff8a2a', ember: '#ffb45a', steel: '#6f6a66' },
  { wall: ['#1d1b25', '#0c0b10'], floor: '#15141a', glow: '#ff7a33', ember: '#ffb070', steel: '#6c6d78' },
  { wall: ['#22201f', '#0e0d0c'], floor: '#181615', glow: '#ff9a4a', ember: '#ffd29a', steel: '#77736f' },
];

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return { c, g: c.getContext('2d')! };
}

export function rng(seed: number) {
  let s = Math.imul(seed | 0, 2654435761) >>> 0;
  s ^= s >>> 15; s = Math.imul(s, 0x2c1b3c6d) >>> 0; s ^= s >>> 12;
  s = s >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
export function mix(a: string, b: string, t: number) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const c = (sh: number) => Math.round(((A >> sh) & 255) * (1 - t) + ((B >> sh) & 255) * t);
  return `#${((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1)}`;
}

/** The hot shop: dark wall, the furnace's glory hole, shelves of finished work, and a steel bench. */
export function studioTexture(p: Palette, w: number, h: number, benchY: number, r: number, seed: number) {
  const { c, g } = canvas(w * r, h * r);
  g.scale(r, r);
  const rand = rng(seed);
  const wall = g.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, p.wall[1]); wall.addColorStop(0.55, p.wall[0]); wall.addColorStop(1, p.wall[1]);
  g.fillStyle = wall; g.fillRect(0, 0, w, h);
  // brick courses, barely visible
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
  for (let y = 18, row = 0; y < benchY - 10; y += 22, row++) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    for (let x = (row % 2) * 30; x < w; x += 60) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 22); g.stroke(); }
  }
  g.fillStyle = 'rgba(255,170,90,0.025)';
  for (let i = 0; i < 90; i++) g.fillRect(rand() * w, rand() * benchY, 20 + rand() * 40, 1 + rand() * 2);
  // furnace light washing the wall from the right
  const fx = w * 1.02, fy = benchY - 150;
  const wash = g.createRadialGradient(fx, fy, 10, fx, fy, w * 1.1);
  wash.addColorStop(0, hexA(p.glow, 0.42)); wash.addColorStop(0.35, hexA(p.glow, 0.13)); wash.addColorStop(1, hexA(p.glow, 0));
  g.fillStyle = wash; g.fillRect(0, 0, w, h);
  // shelf of finished pieces, top left, catching the light
  const sy = benchY - 330;
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, sy + 2, w * 0.42, 6);
  g.fillStyle = '#3a2b21'; g.fillRect(0, sy - 4, w * 0.42, 6);
  const tints = ['#d98a2b', '#2f5fd0', '#bfe0d6', '#a3342b', '#4f8a5a'];
  for (let i = 0; i < 4; i++) {
    const x = 18 + i * 34, hh = 26 + rand() * 26, rr = 7 + rand() * 6;
    const col = tints[Math.floor(rand() * tints.length)];
    g.fillStyle = hexA(col, 0.35);
    g.beginPath(); g.ellipse(x, sy - 4 - hh / 2, rr, hh / 2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = hexA('#ffe0b0', 0.35); g.fillRect(x + rr * 0.35, sy - 2 - hh * 0.85, 1.4, hh * 0.6);
  }
  // bench: brushed steel marver
  const bench = g.createLinearGradient(0, benchY, 0, benchY + 26);
  bench.addColorStop(0, '#9b958f'); bench.addColorStop(0.12, p.steel); bench.addColorStop(1, '#26221f');
  g.fillStyle = bench; g.fillRect(0, benchY, w, 26);
  g.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 40; i++) { const y = benchY + 3 + rand() * 20; g.beginPath(); g.moveTo(rand() * w, y); g.lineTo(rand() * w, y); g.stroke(); }
  const reflect = g.createLinearGradient(w * 0.6, 0, w, 0);
  reflect.addColorStop(0, hexA(p.glow, 0)); reflect.addColorStop(1, hexA(p.glow, 0.35));
  g.fillStyle = reflect; g.fillRect(0, benchY, w, 3);
  g.fillStyle = p.floor; g.fillRect(0, benchY + 26, w, h - benchY - 26);
  const fl = g.createLinearGradient(0, benchY + 26, 0, h);
  fl.addColorStop(0, 'rgba(0,0,0,0.5)'); fl.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fl; g.fillRect(0, benchY + 26, w, h - benchY - 26);
  return c;
}

/** The furnace mouth: a brick ring around a white-orange core. Drawn separately so it can flicker. */
export function furnaceTexture(p: Palette, rad: number, r: number) {
  const size = rad * 3.2;
  const { c, g } = canvas(size * r, size * r);
  g.scale(r, r);
  const cx = size / 2, cy = size / 2;
  const halo = g.createRadialGradient(cx, cy, rad * 0.4, cx, cy, size / 2);
  halo.addColorStop(0, hexA(p.glow, 0.55)); halo.addColorStop(1, hexA(p.glow, 0));
  g.fillStyle = halo; g.fillRect(0, 0, size, size);
  g.fillStyle = '#2b1a12'; g.beginPath(); g.arc(cx, cy, rad * 1.18, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    g.fillStyle = i % 2 ? '#4a2c1e' : '#3c2318';
    g.beginPath(); g.arc(cx, cy, rad * 1.16, a, a + Math.PI / 7 - 0.04); g.arc(cx, cy, rad * 1.0, a + Math.PI / 7 - 0.04, a, true); g.closePath(); g.fill();
  }
  const core = g.createRadialGradient(cx - rad * 0.15, cy - rad * 0.1, 2, cx, cy, rad);
  core.addColorStop(0, '#fffbe8'); core.addColorStop(0.35, '#ffd27a'); core.addColorStop(0.75, p.glow); core.addColorStop(1, '#8a2a0a');
  g.fillStyle = core; g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fill();
  return c;
}

export function dotTexture(color: string, rad: number, r: number, core = 0.3) {
  const { c, g } = canvas(rad * 2 * r, rad * 2 * r);
  g.scale(r, r);
  const grd = g.createRadialGradient(rad, rad, 0, rad, rad, rad);
  grd.addColorStop(0, color); grd.addColorStop(core, hexA(color, 0.55)); grd.addColorStop(1, hexA(color, 0));
  g.fillStyle = grd; g.fillRect(0, 0, rad * 2, rad * 2);
  return c;
}

export type Slice = { y: number; r: number; t?: number };
const HOT = '#fff0c8', WARM = '#ff9a3a';

/**
 * Paint a vase from its slices. (cx, baseY) is the foot; y grows upward.
 * `heat` (0..1) and `now` let freshly blown glass glow hot while older glass cools to `glass`.
 */
export function drawVase(g: CanvasRenderingContext2D, raw: Slice[], cx: number, baseY: number, glass: string, tint: string, now = Infinity, cool = 2.4) {
  if (raw.length < 2) return;
  // light smoothing so a hand-blown piece reads as glass, not as a graph
  const K = 5;
  const slices = raw.map((s, i) => {
    if (i === 0 || i === raw.length - 1) return s;
    let sum = 0, wsum = 0;
    for (let k = -K; k <= K; k++) {
      const j = i + k;
      if (j < 0 || j >= raw.length) continue;
      const w = Math.exp(-(k * k) / (K * 0.9));
      sum += raw[j].r * w; wsum += w;
    }
    return { ...s, r: sum / wsum };
  });
  const edge = (side: number, k = 1) => {
    // a smooth curve through the slice points on one side
    const pts = slices.map((s) => [cx + side * s.r * k, baseY - s.y] as const);
    return pts;
  };
  const curve = (pts: readonly (readonly [number, number])[], move: boolean) => {
    if (move) g.moveTo(pts[0][0], pts[0][1]); else g.lineTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1]; g.lineTo(last[0], last[1]);
  };
  const path = () => {
    g.beginPath();
    curve(edge(-1), true);
    curve([...edge(1)].reverse(), false);
    g.closePath();
  };
  const line = (k: number) => { g.beginPath(); curve(edge(-1, k), true); };
  const topY = slices[slices.length - 1].y;
  const maxR = Math.max(...slices.map((s) => s.r));
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.beginPath(); g.ellipse(cx, baseY + 3, slices[0].r * 1.15 + 6, 5, 0, 0, Math.PI * 2); g.fill();
  path();
  g.fillStyle = hexA(glass, 0.62); g.fill();
  g.save(); path(); g.clip();
  const sh = g.createLinearGradient(cx - maxR, 0, cx + maxR, 0);
  sh.addColorStop(0, hexA(tint, 0.5)); sh.addColorStop(0.18, hexA(glass, 0.0)); sh.addColorStop(0.5, 'rgba(0,0,0,0.18)');
  sh.addColorStop(0.82, hexA(glass, 0.0)); sh.addColorStop(1, hexA(tint, 0.65));
  g.fillStyle = sh; g.fillRect(cx - maxR - 2, baseY - topY - 2, maxR * 2 + 4, topY + 4);
  g.lineJoin = 'round'; g.lineCap = 'round';
  path(); g.strokeStyle = hexA(tint, 0.85); g.lineWidth = 5; g.stroke();
  path(); g.strokeStyle = hexA('#ffffff', 0.35); g.lineWidth = 1.6; g.stroke();
  line(0.72); g.strokeStyle = hexA(tint, 0.18); g.lineWidth = 2; g.stroke();
  line(0.52); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3.2; g.filter = 'blur(1.2px)'; g.stroke(); g.filter = 'none';
  g.beginPath(); curve(edge(1, 0.66), true); g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 1.5; g.stroke();
  // heat: one smooth vertical gradient, hottest where the glass was blown most recently
  if (now !== Infinity) {
    const hg = g.createLinearGradient(0, baseY, 0, baseY - topY);
    const n = 24;
    let any = false;
    for (let i = 0; i <= n; i++) {
      const y = (i / n) * topY;
      let j = 0; while (j < raw.length - 1 && raw[j].y < y) j++;
      const heat = Math.exp(-(now - (raw[j].t ?? 0)) / cool);
      if (heat > 0.02) any = true;
      hg.addColorStop(i / n, hexA(mix(WARM, HOT, Math.min(1, heat * 1.2)), Math.min(0.92, heat)));
    }
    if (any) {
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = hg; g.fillRect(cx - maxR - 2, baseY - topY - 2, maxR * 2 + 4, topY + 4);
      g.globalCompositeOperation = 'source-over';
    }
  }
  g.restore();
  path(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.8; g.stroke();
  g.restore();
}

/** The commission: the target silhouette as a chalk-dotted line on both sides. */
export function ghostTexture(points: { y: number; r: number }[], w: number, h: number, baseY: number, r: number, color = '#f3e6d0') {
  const { c, g } = canvas(w * r, h * r);
  g.scale(r, r);
  const cx = w / 2;
  g.strokeStyle = color; g.lineWidth = 1.6; g.setLineDash([2.5, 4.5]); g.lineCap = 'round';
  for (const side of [-1, 1]) {
    g.beginPath();
    points.forEach((p, i) => { const x = cx + side * p.r, y = baseY - p.y; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.globalAlpha = 0.85; g.stroke();
  }
  g.setLineDash([]);
  // the lip and foot as faint chalk ticks
  const top = points[points.length - 1], foot = points[0];
  g.globalAlpha = 0.45;
  g.beginPath(); g.moveTo(cx - top.r, baseY - top.y); g.lineTo(cx + top.r, baseY - top.y); g.stroke();
  g.beginPath(); g.moveTo(cx - foot.r - 8, baseY); g.lineTo(cx + foot.r + 8, baseY); g.stroke();
  return c;
}

/** The blowpipe: a long steel tube with a wooden mouthpiece. */
export function pipeTexture(len: number, r: number) {
  const { c, g } = canvas(12 * r, len * r);
  g.scale(r, r);
  const st = g.createLinearGradient(0, 0, 12, 0);
  st.addColorStop(0, '#3b3836'); st.addColorStop(0.35, '#b9b4ad'); st.addColorStop(0.55, '#7a7570'); st.addColorStop(1, '#2a2725');
  g.fillStyle = st; g.fillRect(3, 0, 6, len);
  const wd = g.createLinearGradient(0, 0, 12, 0);
  wd.addColorStop(0, '#3a2414'); wd.addColorStop(0.4, '#8a5a34'); wd.addColorStop(1, '#2e1c10');
  // fade the far end into the dark so the pipe never crosses the title
  g.globalCompositeOperation = 'destination-in';
  const fade = g.createLinearGradient(0, 0, 0, len);
  fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(0.55, 'rgba(0,0,0,0.85)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = fade; g.fillRect(0, 0, 12, len);
  g.globalCompositeOperation = 'source-over';
  // heat colour where it meets the glass
  const hot = g.createLinearGradient(0, len - 30, 0, len);
  hot.addColorStop(0, 'rgba(255,120,40,0)'); hot.addColorStop(1, 'rgba(255,170,80,0.9)');
  g.fillStyle = hot; g.fillRect(3, len - 30, 6, 30);
  return c;
}
