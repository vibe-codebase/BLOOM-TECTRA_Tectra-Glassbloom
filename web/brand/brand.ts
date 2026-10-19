// Store icon, adaptive-icon layers and splash, painted with the game's own art.
import * as A from '../src/game/art';
import { LEVELS } from '../src/game/levels';
import { targetAt } from '../src/game/sim';

const P = A.PALETTES[0];

/** A bud vase, still glowing at the lip where it was just blown. */
function vase(g: CanvasRenderingContext2D, cx: number, baseY: number, k: number, hot = true) {
  const l = LEVELS[1];
  const H = l.profile[l.profile.length - 1][0];
  const slices: A.Slice[] = [];
  for (let y = 0; y <= H; y += 2) slices.push({ y, r: targetAt(l, y), t: (y / H) * 3 });
  g.save(); g.translate(cx, baseY); g.scale(k, k);
  A.drawVase(g, slices, 0, 0, '#d98a2b', '#f3c27a', hot ? 3.2 : Infinity, 1.6);
  g.restore();
  return H * k;
}

function backdrop(g: CanvasRenderingContext2D, W: number, H: number, glowX: number, glowY: number, glowR: number) {
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#22170f'); bg.addColorStop(1, '#0b0705');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowR);
  glow.addColorStop(0, 'rgba(255,150,60,0.55)'); glow.addColorStop(0.4, 'rgba(255,120,40,0.18)'); glow.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
}

function embers(g: CanvasRenderingContext2D, W: number, H: number, n: number, seed: number, scale: number) {
  const rand = A.rng(seed);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = rand() * W, y = rand() * H, r = (1 + rand() * 2.5) * scale;
    const d = g.createRadialGradient(x, y, 0, x, y, r * 3);
    d.addColorStop(0, 'rgba(255,200,120,0.9)'); d.addColorStop(1, 'rgba(255,140,60,0)');
    g.fillStyle = d; g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  }
  g.globalCompositeOperation = 'source-over';
}

export function icon() {
  const { c, g } = A.canvas(1024, 1024);
  backdrop(g, 1024, 1024, 512, 470, 560);
  embers(g, 1024, 1024, 26, 3, 3);
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.ellipse(512, 852, 210, 26, 0, 0, Math.PI * 2); g.fill();
  vase(g, 512, 845, 3.05);
  return c;
}
export function adaptive() {
  const { c, g } = A.canvas(1024, 1024);
  vase(g, 512, 790, 2.45);
  return c;
}
export function adaptiveBg() {
  const { c, g } = A.canvas(1024, 1024);
  backdrop(g, 1024, 1024, 512, 470, 620);
  embers(g, 1024, 1024, 18, 8, 3);
  return c;
}
export function splash() {
  const W = 1284, H = 2778;
  const { c, g } = A.canvas(W, H);
  backdrop(g, W, H, W / 2, H * 0.62, 1300);
  embers(g, W, H, 60, 5, 3);
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.ellipse(W / 2, H * 0.8 + 6, 230, 26, 0, 0, Math.PI * 2); g.fill();
  vase(g, W / 2, H * 0.8, 3.4);
  g.textAlign = 'center';
  const grad = g.createLinearGradient(0, H * 0.22, 0, H * 0.3);
  grad.addColorStop(0, '#ffe7b8'); grad.addColorStop(1, '#ff8a2a');
  g.font = 'italic 700 230px "Bodoni Moda", Didot, Georgia, serif';
  g.fillStyle = grad; g.shadowColor = 'rgba(255,140,40,0.5)'; g.shadowBlur = 50;
  g.fillText('Glassbloom', W / 2, H * 0.28);
  g.shadowBlur = 0;
  g.font = '600 56px Manrope, system-ui, sans-serif';
  g.fillStyle = 'rgba(243,230,208,0.75)';
  g.fillText('breathe a shape into molten glass', W / 2, H * 0.28 + 110);
  g.save(); g.shadowBlur = 0; g.font = '700 58px Manrope, sans-serif'; g.fillStyle = '#c98a4b'; try { g.letterSpacing = '34px'; } catch { /* */ } g.fillText('TECTRA', W / 2 + 17, H * 0.28 - 210); g.restore();
  return c;
}
/** The Play Store feature graphic: a bud vase still glowing from the furnace on the right; the words at the left. */
export function feature() {
  const W = 1024, H = 500, { c, g } = A.canvas(W, H);
  backdrop(g, W, H, 790, 280, 460);
  embers(g, W, H, 30, 9, 2);
  const l = LEVELS[1], vh = l.profile[l.profile.length - 1][0], k = 360 / vh;
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.ellipse(790, 446, 120, 16, 0, 0, Math.PI * 2); g.fill();
  vase(g, 790, 440, k);
  const shade = g.createLinearGradient(0, 0, 580, 0); shade.addColorStop(0, 'rgba(10,6,4,0.9)'); shade.addColorStop(0.75, 'rgba(10,6,4,0.55)'); shade.addColorStop(1, 'rgba(10,6,4,0)'); g.fillStyle = shade; g.fillRect(0, 0, 580, H);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.save(); g.shadowBlur = 0; g.font = '700 22px Manrope, sans-serif'; g.fillStyle = '#c98a4b'; try { g.letterSpacing = '13px'; } catch { /* */ } g.fillText('TECTRA', 60, 116); g.restore();
  const tg = g.createLinearGradient(0, 140, 0, 230); tg.addColorStop(0, '#ffe7b8'); tg.addColorStop(1, '#ff8a2a');
  g.save(); g.shadowColor = 'rgba(255,140,40,0.45)'; g.shadowBlur = 24; g.fillStyle = tg; g.font = 'italic 700 104px "Bodoni Moda", Didot, Georgia, serif'; g.fillText('Glassbloom', 50, 226); g.restore();
  g.fillStyle = '#c98a4b'; g.fillRect(60, 256, 52, 3);
  g.fillStyle = '#f3e6d0'; g.font = '700 26px Manrope, sans-serif'; g.fillText('Breathe a shape into molten glass.', 60, 302);
  g.fillStyle = 'rgba(243,230,208,0.75)'; g.font = '600 18px Manrope, sans-serif'; g.fillText('24 commissions · amber, cobalt and opaline', 60, 338);
  return c;
}
(window as unknown as { brand: unknown }).brand = { icon, adaptive, adaptiveBg, splash, feature };
