# AI House Planner

A production-grade AI-assisted floor plan designer with 2D canvas editing, 3D visualization, and AI-powered layout generation — similar to MakeMyHouse.

## Run & Operate

- `pnpm --filter @workspace/house-planner run dev` — run the Next.js app (port 19914)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: TailwindCSS v4
- **2D Canvas**: React Konva + Konva.js
- **3D Viewport**: React Three Fiber + Three.js + Drei
- **State**: Zustand v5 (with immer + devtools + persist middleware)
- **Animation**: Framer Motion
- **API**: Express 5 (shared `artifacts/api-server`)
- **DB**: PostgreSQL + Drizzle ORM (when needed)

## Where things live

```
artifacts/house-planner/
  app/                    — Next.js App Router (layout, pages, globals.css)
  components/
    forms/                — Form components (ProjectForm, RoomForm, etc.)
    2d/                   — React Konva 2D canvas components
    3d/                   — React Three Fiber 3D viewport components
    shared/               — Toolbar, Sidebar, AI panel, etc.
  lib/
    layoutEngine/         — Floor plan generation + validation + grid math
    geometryEngine/       — Wall graphs, room detection, 3D extrusion, snapping
    furniture/            — Catalog, placement optimizer, rotation helpers
  hooks/                  — Custom hooks wrapping stores and engines
  store/                  — Zustand stores (houseStore, uiStore, furnitureStore)
  types/                  — All TypeScript types (house, geometry, furniture, ai)
```

## Architecture decisions

- **Zustand + Immer**: All mutable state lives in three Zustand stores. Immer middleware allows ergonomic draft mutations. Persist middleware saves project to localStorage. Devtools enabled in dev.
- **History in houseStore**: Up to 50 snapshots stored in the store for undo/redo — no external library needed.
- **Engine pattern**: `layoutEngine` and `geometryEngine` are pure TypeScript modules (no React), called via custom hooks. This makes them testable in isolation.
- **Next.js App Router**: All canvas/3D components are client components (`"use client"`). The app shell is a server component.
- **Tailwind v4**: Uses `@tailwindcss/postcss` plugin (v4 PostCSS setup), with `@import "tailwindcss"` in globals.css.

## Product

Core capabilities planned:
1. **2D Floor Plan Editor** — draw walls, add rooms, place doors/windows with snap-to-grid
2. **3D Visualization** — real-time 3D preview of walls, rooms, lighting
3. **Furniture Placement** — drag-and-drop from a catalog with automatic placement suggestions
4. **AI Layout Generation** — describe your requirements and get a generated floor plan
5. **Multi-floor support** — manage separate floor levels independently

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `react-konva` and `@react-three/fiber` have peer dep warnings with React 19 — they still work but expect console warnings in dev
- Next.js dev server PORT is passed via env; the script uses `${PORT:-3000}` as fallback
- All 3D + canvas components must have `"use client"` at the top — they cannot be server components
- `zustand/middleware/immer` requires `immer` package; it's bundled with zustand v5 but kept separate for clarity
