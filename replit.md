# House Floor Plan Generator

A 2D architectural floor plan generator where users input plot dimensions, road facing direction, number of floors, and room requirements to generate SVG blueprints with optional Vastu compliance scoring.

## Run & Operate

- `PORT=5000 pnpm --filter @workspace/house-planner run dev` — run the app (port 5000)
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned by Replit)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite, Tailwind CSS v4, Radix UI, Wouter, Zustand, React Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod, drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild

## Where things live

- `artifacts/house-planner/` — main React frontend (Floor Plan Generator UI)
- `artifacts/house-planner/src/lib/layoutEngine/` — core procedural layout engine (vastu, walls, stairs, rooms)
- `artifacts/api-server/` — Express backend API
- `lib/db/` — Drizzle ORM schema and DB client
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API)
- `lib/api-client-react/` — generated React hooks
- `lib/api-zod/` — generated Zod schemas

## Architecture decisions

- The layout engine is entirely client-side and deterministic — no AI or external APIs required.
- Vastu compliance is computed locally in `vastu.ts` based on room placement and cardinal direction.
- The frontend runs on port 5000 (Replit webview requirement); `PORT=5000` must be passed to the dev command.
- Database is provisioned via Replit's built-in PostgreSQL; `DATABASE_URL` is auto-set.

## Product

Users enter plot width/depth, road facing direction (N/E/S/W), number of floors (G, G+1, G+2), bedrooms/bathrooms count, and feature toggles (parking, staircase, balcony, Vastu). Clicking "Generate Plan" produces a zoomable SVG floor plan blueprint.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always pass `PORT=5000` when running the house-planner dev server, as Replit's webview requires port 5000.
- pnpm only — the preinstall script rejects npm and yarn.
- The `@workspace/db` package requires `DATABASE_URL` to be set; Replit provisions this automatically.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
