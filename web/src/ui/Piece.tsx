import { useEffect, useRef } from 'react';
import { drawVase, hexA } from '../game/art';
import { CHAPTERS, heightOf, type Level } from '../game/levels';
import { SAMPLES, targetAt } from '../game/sim';

/** A gallery piece: the player's best vase, or the commission's chalk outline if not made yet. */
export function Piece({ level, profile, dim = false, size = 1 }: { level: Level; profile?: number[]; dim?: boolean; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const cssW = 84 * size, cssH = 116 * size;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = cssW * dpr; c.height = cssH * dpr;
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, cssW, cssH);
    const H = heightOf(level);
    const maxR = Math.max(...level.profile.map((p) => p[1]), ...(profile ?? [0]));
    const k = Math.min((cssH - 8) / H, (cssW - 6) / (maxR * 2));
    g.save();
    g.translate(cssW / 2, cssH - 3);
    g.scale(k, k);
    if (profile) {
      const slices = profile.map((r, i) => ({ y: (i / (SAMPLES - 1)) * H, r }));
      const ch = CHAPTERS[level.chapter];
      drawVase(g, slices, 0, 0, ch.glass, ch.tint);
    } else {
      g.setLineDash([3 / k, 5 / k]);
      g.lineWidth = 1.4 / k;
      g.strokeStyle = hexA('#f3e6d0', dim ? 0.18 : 0.5);
      for (const side of [-1, 1]) {
        g.beginPath();
        for (let y = 0; y <= H; y += 4) { const x = side * targetAt(level, y); if (y) g.lineTo(x, -y); else g.moveTo(x, -y); }
        g.stroke();
      }
    }
    g.restore();
  }, [level, profile, dim, size]);
  return <canvas ref={ref} className="piece" style={{ width: 84 * size, height: 116 * size }} aria-hidden />;
}
