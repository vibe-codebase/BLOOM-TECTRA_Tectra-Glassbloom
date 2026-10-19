import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CHAPTERS, LEVELS, levelIndex, type Level } from './game/levels';
import { FAIL_COPY } from './game/sim';
import { studio, startGame, type Finish } from './game/scene';
import { sound } from './audio/sound';
import { haptic, onNative, toNative } from './bridge';
import { freshSave, isUnlocked, loadSave, recordResult, totalStars, writeSave, type Save } from './state/save';
import { Piece } from './ui/Piece';
import * as I from './ui/icons';

type Screen = 'home' | 'gallery' | 'play' | 'settings';

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const [save, setSave] = useState<Save>(() => loadSave());
  const [screen, setScreen] = useState<Screen>('home');
  const [chapter, setChapter] = useState(0);
  const [level, setLevel] = useState<Level>(LEVELS[0]);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [settingsFrom, setSettingsFrom] = useState<Screen>('home');
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!host.current) return;
    studio.reducedMotion = save.settings.reducedMotion;
    return startGame(host.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { writeSave(save); }, [save]);
  useEffect(() => {
    sound.setVolumes(save.settings.music, save.settings.sfx);
    studio.reducedMotion = save.settings.reducedMotion;
    document.documentElement.dataset.motion = save.settings.reducedMotion ? 'reduced' : 'full';
  }, [save.settings]);

  const buzz = useCallback((s: 'light' | 'medium' | 'success' | 'warning') => haptic(s, saveRef.current.settings.haptics), []);
  useEffect(() => {
    const unlock = () => { sound.unlock(); sound.startMusic(chapter); };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [chapter]);

  const startLevel = useCallback((l: Level) => {
    sound.unlock(); sound.startMusic(l.chapter); sound.duck(false);
    setLevel(l); setChapter(l.chapter); setFinish(null); setPaused(false); setStarted(false);
    setScreen('play');
    studio.show('play', l);
  }, []);

  useEffect(() => {
    studio.hooks = {
      onFinish: (f) => {
        setFinish(f);
        if (f.result.success) setSave((s) => recordResult(s, f.level.id, f.result.stars, f.result.fidelity, f.profile));
        sound.duck(true);
      },
      onStart: () => {
        setStarted(true);
        setSave((s) => (s.seenHints.includes(level.id) ? s : { ...s, seenHints: [...s.seenHints, level.id] }));
      },
      onHaptic: buzz,
    };
  }, [buzz, level.id]);

  const showMenu = useCallback((c: number) => studio.show('menu', LEVELS.find((l) => l.chapter === c) ?? LEVELS[0]), []);
  const goHome = useCallback(() => { setScreen('home'); setFinish(null); setPaused(false); sound.duck(false); showMenu(chapter); }, [chapter, showMenu]);
  const goGallery = useCallback(() => { setScreen('gallery'); setFinish(null); setPaused(false); sound.duck(false); showMenu(chapter); }, [chapter, showMenu]);
  const pause = useCallback((p: boolean) => { setPaused(p); studio.setPaused(p); sound.duck(p); }, []);

  useEffect(() => onNative((e) => {
    if (e.type === 'native.lifecycle') {
      if (e.state === 'background') { sound.suspend(); if (screen === 'play' && !finish) pause(true); }
      else sound.resume();
      return;
    }
    if (screen === 'play') { if (finish) goGallery(); else if (!paused) pause(true); else goGallery(); }
    else if (screen === 'gallery') goHome();
    else if (screen === 'settings') setScreen(settingsFrom);
    else toNative({ type: 'exit' });
  }), [screen, paused, finish, pause, goHome, goGallery, settingsFrom]);

  useEffect(() => {
    const vis = () => { if (document.hidden) { sound.suspend(); if (screen === 'play' && !finish) pause(true); } else sound.resume(); };
    document.addEventListener('visibilitychange', vis);
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && screen === 'play' && !finish) pause(!paused); };
    window.addEventListener('keydown', key);
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('keydown', key); };
  }, [screen, paused, finish, pause]);

  const nextLevel = useMemo(() => { const i = levelIndex(level.id); return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1] : null; }, [level]);
  const firstOpen = useMemo(() => { const i = LEVELS.findIndex((l, idx) => isUnlocked(save, idx) && !save.stars[l.id]); return LEVELS[i >= 0 ? i : 0]; }, [save]);

  return (
    <div className={`app ch-${chapter} screen-${screen}`}>
      <div className="stage" ref={host} />
      {screen === 'home' && (
        <Home stars={totalStars(save)} made={Object.keys(save.pieces).length} resume={save.stars[LEVELS[0].id] ? firstOpen : null} onPlay={() => startLevel(firstOpen)}
          onGallery={() => { setChapter(firstOpen.chapter); setScreen('gallery'); showMenu(firstOpen.chapter); }}
          onSettings={() => { setSettingsFrom('home'); setScreen('settings'); }} />
      )}
      {screen === 'gallery' && (
        <Gallery save={save} chapter={chapter} onChapter={(c) => { setChapter(c); sound.startMusic(c); showMenu(c); }} onPick={startLevel} onBack={goHome} />
      )}
      {screen === 'play' && (
        <Hud level={level} started={started} dim={paused || !!finish} onPause={() => pause(true)} showHint={!save.seenHints.includes(level.id) || !started} />
      )}
      {screen === 'play' && paused && !finish && (
        <PauseCard level={level} onResume={() => pause(false)} onRestart={() => startLevel(level)} onGallery={goGallery}
          onSettings={() => { setSettingsFrom('play'); setScreen('settings'); }} />
      )}
      {screen === 'play' && finish && (
        <ResultCard finish={finish} best={save.best[finish.level.id]} next={nextLevel && isUnlocked(save, levelIndex(nextLevel.id)) ? nextLevel : null}
          onNext={startLevel} onRetry={() => startLevel(level)} onGallery={goGallery} />
      )}
      {screen === 'settings' && (
        <Settings save={save} onChange={(st) => setSave((s) => ({ ...s, settings: st }))} onReset={() => setSave((s) => ({ ...freshSave(), settings: s.settings }))}
          onBack={() => { setScreen(settingsFrom); if (settingsFrom === 'play') pause(true); }} />
      )}
    </div>
  );
}

function Home({ stars, made, resume, onPlay, onGallery, onSettings }: { stars: number; made: number; resume: Level | null; onPlay: () => void; onGallery: () => void; onSettings: () => void }) {
  const actions = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // keep the demo piece standing above the buttons on any screen shape
    const measure = () => { if (actions.current) studio.setMenuBottom(window.innerHeight - actions.current.getBoundingClientRect().top); };
    measure();
    window.addEventListener('resize', measure);
    const t = window.setTimeout(measure, 900);
    return () => { window.removeEventListener('resize', measure); clearTimeout(t); };
  }, []);
  return (
    <div className="screen home">
      <header className="title">
        <span className="eyebrow"><I.Flame size={13} /> the hot shop is open</span>
        <h1><small>Tectra</small><em>Glass</em>bloom</h1>
        <p>Hold to breathe into the pipe. Shape molten glass to the chalk line, then watch it cool into colour.</p>
      </header>
      <div className="home-actions" ref={actions}>
        <button className="molten" onClick={() => { sound.tap(); onPlay(); }} data-testid="play">
          {resume ? <>Continue <small>{resume.name}</small></> : 'Light the furnace'}
        </button>
        <div className="row">
          <button className="smoke" onClick={() => { sound.tap(); onGallery(); }}><I.Vase /> Gallery</button>
          <button className="smoke round" aria-label="Settings" onClick={() => { sound.tap(); onSettings(); }}><I.Gear /></button>
        </div>
        <div className="tally"><I.Bead size={15} lit /> {stars} / {LEVELS.length * 3} · {made} pieces on the shelf</div>
      </div>
    </div>
  );
}

function Gallery({ save, chapter, onChapter, onPick, onBack }: { save: Save; chapter: number; onChapter: (c: number) => void; onPick: (l: Level) => void; onBack: () => void }) {
  const levels = LEVELS.filter((l) => l.chapter === chapter);
  const got = levels.reduce((a, l) => a + (save.stars[l.id] ?? 0), 0);
  const chapterOpen = (c: number) => isUnlocked(save, LEVELS.findIndex((l) => l.chapter === c));
  const pieceSize = Math.min(1, (window.innerWidth - 56) / (4 * 86), (window.innerHeight - 330) / (2 * 150));
  return (
    <div className="screen gallery">
      <div className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => { sound.tap(); onBack(); }}><I.Back /></button>
        <div className="heading"><span className="eyebrow">gallery · {got}/24</span><h2><em>{CHAPTERS[chapter].name}</em> glass</h2></div>
        <span />
      </div>
      <div className="swatches" role="tablist">
        {CHAPTERS.map((c, i) => (
          <button key={c.name} role="tab" aria-selected={i === chapter} aria-label={`${c.name}${chapterOpen(i) ? '' : ' (locked)'}`} disabled={!chapterOpen(i)}
            className={`swatch ${i === chapter ? 'on' : ''}`} style={{ ['--glass' as never]: c.glass, ['--tint' as never]: c.tint }}
            onClick={() => { sound.tap(); onChapter(i); }}><i />{c.name}</button>
        ))}
      </div>
      <p className="blurb">{CHAPTERS[chapter].blurb}</p>
      <div className="shelves">
        {[0, 1].map((row) => (
          <div className="shelf" key={row}>
            {levels.slice(row * 4, row * 4 + 4).map((l) => {
              const idx = levelIndex(l.id);
              const open = isUnlocked(save, idx);
              const st = save.stars[l.id] ?? 0;
              return (
                <button key={l.id} className={`slot ${open ? '' : 'locked'}`} disabled={!open} onClick={() => { sound.tap(); onPick(l); }}
                  aria-label={`${l.name}${open ? '' : ' (locked)'}`} data-testid={`level-${idx + 1}`}>
                  <span className="slot-art"><Piece level={l} profile={save.pieces[l.id]} dim={!open} size={pieceSize} />{!open && <span className="lock"><I.Lock size={16} /></span>}</span>
                  <span className="slot-name">{l.name}</span>
                  <span className="beads">{[0, 1, 2].map((k) => <I.Bead key={k} size={11} lit={k < st} />)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Hud({ level, started, dim, showHint, onPause }: { level: Level; started: boolean; dim: boolean; showHint: boolean; onPause: () => void }) {
  const needle = useRef<HTMLDivElement>(null);
  const value = useRef<HTMLSpanElement>(null);
  const prog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const f = Math.max(0, Math.min(1, studio.fidelity));
      if (needle.current) needle.current.style.transform = `scaleX(${f})`;
      if (value.current) value.current.textContent = `${Math.round(f * 100)}%`;
      if (prog.current) prog.current.style.transform = `scaleY(${Math.min(1, studio.progress)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => { studio.fidelity = 1; studio.progress = 0; }, [level]);
  const n = LEVELS.filter((l) => l.chapter === level.chapter).indexOf(level) + 1;
  return (
    <div className={`hud ${dim ? 'dim' : ''}`}>
      <div className="hud-top">
        <button className="icon-btn" aria-label="Pause" onClick={() => { sound.tap(); onPause(); }} data-testid="pause"><I.Pause /></button>
        <div className="hud-title"><span>{CHAPTERS[level.chapter].name} · {n} of 8</span><strong>{level.name}</strong></div>
        <div className="gauge" aria-label="Fidelity to the commission">
          <span className="gauge-label">fidelity <b ref={value}>100%</b></span>
          <div className="gauge-track">
            <div className="gauge-fill" ref={needle} />
            {level.stars.map((s, i) => <i key={i} style={{ left: `${s * 100}%` }} title={`${i + 1} bead${i ? 's' : ''}`} />)}
          </div>
        </div>
      </div>
      <div className="progress" aria-hidden><div ref={prog} /></div>
      {!started && (
        <div className="ready">
          <p className="note">“{level.note}”</p>
          <p className="press"><span className="ring" /> {showHint && level.hint ? level.hint : 'Hold anywhere to begin breathing'}</p>
        </div>
      )}
    </div>
  );
}

function PauseCard({ level, onResume, onRestart, onGallery, onSettings }: { level: Level; onResume: () => void; onRestart: () => void; onGallery: () => void; onSettings: () => void }) {
  return (
    <div className="veil">
      <div className="card" role="dialog" aria-label="Paused">
        <span className="eyebrow">{level.name}</span>
        <h2><em>Resting</em> the glass</h2>
        <button className="molten" onClick={() => { sound.tap(); onResume(); }} data-testid="resume">Back to the pipe</button>
        <div className="row">
          <button className="smoke" onClick={() => { sound.tap(); onRestart(); }}><I.Retry /> Restart</button>
          <button className="smoke" onClick={() => { sound.tap(); onGallery(); }}><I.Vase /> Gallery</button>
          <button className="smoke round" aria-label="Settings" onClick={() => { sound.tap(); onSettings(); }}><I.Gear /></button>
        </div>
      </div>
    </div>
  );
}

const TITLES = ['Good enough to sell', 'A fine piece', 'Museum quality'];
function ResultCard({ finish, best, next, onNext, onRetry, onGallery }: { finish: Finish; best?: number; next: Level | null; onNext: (l: Level) => void; onRetry: () => void; onGallery: () => void }) {
  const r = finish.result;
  const [lit, setLit] = useState(0);
  useEffect(() => {
    if (!r.success) return;
    const t = [0, 1, 2].filter((i) => i < r.stars).map((i) => window.setTimeout(() => { setLit(i + 1); sound.star(i); }, 350 + i * 320));
    return () => t.forEach(clearTimeout);
  }, [r.success, r.stars]);
  const fail = r.outcome === 'burst' ? FAIL_COPY.burst : r.outcome === 'pinched' ? FAIL_COPY.pinched : FAIL_COPY.low;
  const pct = Math.round(r.fidelity * 100);
  return (
    <div className="veil soft">
      <div className={`card result ${r.success ? 'win' : 'lose'}`} role="dialog" aria-label={r.success ? 'Piece finished' : 'Try again'}>
        <span className="eyebrow">{finish.level.name}</span>
        <h2>{r.success ? TITLES[r.stars - 1] : fail.title}</h2>
        {r.success ? (
          <>
            <div className="big-beads">{[0, 1, 2].map((i) => <span key={i} className={i < lit ? 'lit' : ''}><I.Bead size={42} lit={i < lit} /></span>)}</div>
            <p className="fid"><b>{pct}%</b> true to the commission</p>
            <p className="thresholds">{finish.level.stars.map((s, i) => <span key={i} className={r.fidelity >= s ? 'on' : ''}>{Math.round(s * 100)}%</span>)}</p>
            {best !== undefined && best > r.fidelity && <p className="note-small">Your best here is {Math.round(best * 100)}%.</p>}
          </>
        ) : (
          <>
            <p className="fail-line">{fail.line}</p>
            {r.outcome === 'done' && <p className="fid"><b>{pct}%</b> · needed {Math.round(finish.level.stars[0] * 100)}%</p>}
          </>
        )}
        {r.success && next ? (
          <button className="molten" onClick={() => { sound.tap(); onNext(next); }} data-testid="next">Next: {next.name} <I.Next size={18} /></button>
        ) : (
          <button className="molten" onClick={() => { sound.tap(); onRetry(); }} data-testid="retry"><I.Retry size={18} /> {r.success ? 'Blow it again' : 'Try again'}</button>
        )}
        <div className="row">
          {r.success && next && <button className="smoke" onClick={() => { sound.tap(); onRetry(); }}><I.Retry /> Again</button>}
          <button className="smoke" onClick={() => { sound.tap(); onGallery(); }}><I.Vase /> Gallery</button>
        </div>
      </div>
    </div>
  );
}

function Settings({ save, onChange, onReset, onBack }: { save: Save; onChange: (s: Save['settings']) => void; onReset: () => void; onBack: () => void }) {
  const st = save.settings;
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="screen settings">
      <div className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => { sound.tap(); onBack(); }}><I.Back /></button>
        <div className="heading"><span className="eyebrow">settings</span><h2><em>Workshop</em></h2></div>
        <span />
      </div>
      <div className="card flat">
        <label className="slider">Music <input type="range" min={0} max={1} step={0.05} value={st.music} onChange={(e) => onChange({ ...st, music: +e.target.value })} /><output>{Math.round(st.music * 100)}</output></label>
        <label className="slider">Sounds <input type="range" min={0} max={1} step={0.05} value={st.sfx} onChange={(e) => onChange({ ...st, sfx: +e.target.value })} /><output>{Math.round(st.sfx * 100)}</output></label>
        <label className="toggle">Vibration <input type="checkbox" checked={st.haptics} onChange={(e) => onChange({ ...st, haptics: e.target.checked })} /><i /></label>
        <label className="toggle">Reduce motion <input type="checkbox" checked={st.reducedMotion} onChange={(e) => onChange({ ...st, reducedMotion: e.target.checked })} /><i /></label>
        <div className="reset">
          {confirm ? (
            <>
              <span>Clear the gallery?</span>
              <button className="smoke danger" onClick={() => { onReset(); setConfirm(false); }}>Clear</button>
              <button className="smoke" onClick={() => setConfirm(false)}>Keep</button>
            </>
          ) : <button className="smoke" onClick={() => setConfirm(true)}>Reset progress</button>}
        </div>
      </div>
      <p className="small-print">Plays fully offline. No ads, accounts or tracking.</p>
    </div>
  );
}
