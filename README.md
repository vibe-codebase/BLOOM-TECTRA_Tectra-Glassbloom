# Tectra Glassbloom

By **BLOOM TECTRA** · package `com.bloomtectra.tectraglassbloom` · Expo owner `899-903`.

A one-touch glassblowing game for Android. Hold to breathe into the pipe and the molten glass swells; let go and it draws in. The glass is pulled upward as you blow, so every breath becomes part of the vase. Match the chalk outline of the commission, then watch your piece cool from white-hot into colour.

- 24 commissions in three glasses: Amber (direct breath), Cobalt (the glass keeps swelling after you stop), Opaline (fast and fine)
- Stars are glass beads for fidelity to the outline; blow too hard and it bursts, too little and the neck seals
- The gallery is the level select: your best piece of each commission stands on the shelf
- Hot-shop art painted procedurally, glass-harmonica music and synthesised breath and glass sounds, fully offline
- Every commission is proven three-bead reachable by an autopilot that only decides every 0.12 s, like a person

## Structure

| Path | What it is |
| --- | --- |
| `web/src/game/sim.ts` | Pure, deterministic glass physics and scoring |
| `web/src/game/bot.ts` | Look-ahead autopilot; tests use its human-paced mode to prove every piece |
| `web/src/game/levels.ts` | All 24 commissions with their outlines and bead thresholds |
| `web/src/game/art.ts` | Studio, furnace and the glass renderer (also used for gallery pieces) |
| `web/brand/` | Renders the icon, adaptive icon and splash |
| `src/native/` | Expo WebView shell |

## Commands

```bash
npm install && npm run web:install
npm run web:test          # 31 tests
npm run build:game
npm run validate:assets
npm run android
```

## Release builds

The Android release is configured for Google Play: target and compile SDK 36, R8 minification and resource shrinking, a non-debuggable release build, no Internet permission, and the game served offline from the app's own assets. Builds run on EAS; `eas.json` has two profiles:

```bash
npm install -g eas-cli && eas login
eas init                     # once: links this folder to your Expo project
npm run eas:apk              # preview profile: a signed APK for testing on devices
npm run eas:aab              # production profile: an AAB for Google Play (versionCode auto-increments)
```
