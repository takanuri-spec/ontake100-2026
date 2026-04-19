# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal training-and-race-day platform for **OSJ ONTAKE 100** (109km / +3,780m, 2026-07-19 00:00 start). Single-user PWA — owner is the only user. The 2022 baseline finish was 15:20:54; the focus this cycle is GI/heat management (the failure mode that nearly DNF'd previous attempts).

The full multi-phase plan, milestones, and risk register live in [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md). Always read it before suggesting scope or sequencing — it is the source of truth for what gets built when, and Phase 4-B (Android app) is explicitly droppable if training time is tight.

## Commands

```bash
npm run dev                     # Vite dev server
npm run build                   # tsc -b && vite build  (typecheck + bundle)
npm run lint                    # eslint .
npm run preview                 # preview the built bundle
./node_modules/.bin/tsc --noEmit  # typecheck only (faster than build)

npx tsx scripts/seed-admin.ts   # (re)seed Firestore using firebase-admin + serviceAccount.json
npx tsx scripts/seed.ts         # client-SDK seed variant
```

There is no test runner configured.

The seed scripts require `scripts/serviceAccount.json` (gitignored). Re-running the seed overwrites the seeded docs but does NOT clear the collections — fields removed from the seed will linger in Firestore.

## Environment

`.env.local` (gitignored, see `.env.local.example`) supplies Firebase web SDK config and Strava OAuth (the latter is for Phase 2-A which is not yet built). Without these, `src/lib/firebase.ts` will initialize with `undefined` config and auth will silently fail — so a fresh clone needs `.env.local` populated before `npm run dev` does anything useful.

## Architecture

Vite + React 19 + TypeScript + Tailwind 4 + `vite-plugin-pwa` + Firebase 12 (Auth/Firestore/Storage). Path alias `@/* → src/*`.

### Layout

```
src/
  main.tsx              react-router-dom v7 createBrowserRouter; 5 child routes under <App/>
  App.tsx               LoginScreen + authed shell (sticky header, 5-tab bottom nav)
  contexts/AuthContext  Google sign-in via signInWithPopup; gates all routes
  lib/firebase.ts       initializeApp + db/auth/storage exports
  hooks/useFirestore.ts useDoc / useCollection / useSubCollection — onSnapshot wrappers
  pages/{RaceBible,Training,GIHeat,RaceDay,Retro}/index.tsx  one file per tab
  types/index.ts        Race, AidStation, Segment, TrainingDay, TrainingLoad, FuelingLog,
                        GISymptom, Trip, PackingItem, RaceDayChecklistItem
scripts/
  seed-admin.ts         Admin SDK seed (preferred — bypasses security rules)
  seed.ts               client SDK seed (legacy)
  serviceAccount.json   gitignored
docs/PROJECT_PLAN.md    phases, milestones, risk register
```

### Firestore as Single Source of Truth

```
races/{raceId}                   3 races: ontake100-2026 (target) + 2 sims
  .aidStations/{aidId}           5 docs for Ontake (25/54/73/83/finish)
  .segments/{segId}              5 segments with planned pace/fuel/water per hour
trainingPlan/week-{1..13}        Base→Build→Peak→Taper→Race, weekly km/elev targets
giHeatPlan/gi-heat-2026          probiotic start, gut-training ramp, heat acclimation
trips/{tripId}                   per-race rental car, hotel, packing list, drop-bag
activities/{activityId}          Phase 2 — Strava-fed (not yet wired)
trainingLog/{date}               Phase 2 — CTL/ATL/TSB rollups
```

The seeded data captures the actual race/nutrition/training/logistics decisions — when in doubt about what a field means, read `scripts/seed-admin.ts`, not just the type definitions.

### Real-time pattern

All page-level reads go through the three hooks in `src/hooks/useFirestore.ts`. They wrap `onSnapshot`, so UI updates live and persistent state (e.g. checklist toggles) round-trips with `setDoc({ merge: true })`. The hooks accept `QueryConstraint` rest args (`orderBy`, etc.) and re-export `orderBy` for convenience.

### Auth gating

`AuthProvider` wraps the router in `main.tsx`. `App.tsx` shows `<LoginScreen/>` when `user` is null — there is no per-route guard and no role/admin concept (single-user app).

### PWA + offline maps

`vite.config.ts` registers a service worker via `vite-plugin-pwa` with `registerType: 'autoUpdate'`. It pre-caches the standard bundle assets and adds a `CacheFirst` runtime rule for `cyberjapandata2.gsi.go.jp` tiles (Japan's GSI map service) — relevant for Phase 4-B (Android offline map) and any in-PWA map preview.

## Conventions

- Japanese is the primary UI language (and most domain notes/comments).
- Domain numbers (g/h carb, mL/h water, m elevation, min cutoffs) appear in both type definitions and seed data — keep them in sync if you change one.
- Tailwind 4 via `@tailwindcss/vite`; the dark palette is stone-950 background + emerald-400 accent.
- `tsconfig.app.json` is strict on unused locals/params and uses `verbatimModuleSyntax` — `import type` is required for type-only imports.
