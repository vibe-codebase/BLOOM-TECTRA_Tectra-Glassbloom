type P = { size?: number };
const s = (size = 22) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const Pause = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 6.5v11M15 6.5v11" /></svg>;
export const Back = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>;
export const Next = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg>;
export const Retry = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4 4.5v3.5h3.5" /></svg>;
export const Gear = ({ size }: P) => (
  <svg {...s(size)} aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" /></svg>
);
/** A vase silhouette: the gallery. */
export const Vase = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 3h6M10 3v3c0 1.5-4 3-4 8a6 6 0 0 0 12 0c0-5-4-6.5-4-8V3" /></svg>;
export const Flame = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 0 2 1 3 2 3-.5-3 .5-6 .5-8z" fill="currentColor" stroke="none" /></svg>;
export const Lock = ({ size }: P) => <svg {...s(size)} aria-hidden><rect x="6" y="11" width="12" height="9" rx="2" /><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" /></svg>;
/** Stars are blown-glass beads. */
export const Bead = ({ size = 22, lit }: P & { lit?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <defs>
      <radialGradient id={`bead-${lit ? 'on' : 'off'}`} cx="38%" cy="32%" r="70%">
        <stop offset="0" stopColor={lit ? '#fff4d6' : 'rgba(255,255,255,.18)'} />
        <stop offset=".45" stopColor={lit ? '#ffb347' : 'rgba(255,255,255,.06)'} />
        <stop offset="1" stopColor={lit ? '#b4501a' : 'rgba(255,255,255,.02)'} />
      </radialGradient>
    </defs>
    <circle cx="12" cy="12" r="9" fill={`url(#bead-${lit ? 'on' : 'off'})`} stroke={lit ? 'rgba(255,220,170,.8)' : 'rgba(243,230,208,.35)'} strokeWidth="1.2" />
    <ellipse cx="9" cy="8.5" rx="2.6" ry="1.6" fill="rgba(255,255,255,.7)" opacity={lit ? 1 : 0.4} />
  </svg>
);
