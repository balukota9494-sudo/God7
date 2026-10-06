# SafeRoute AI

A mobile-first safety-navigation prototype that compares illustrative routes with explainable demo scores, then provides a guided demo journey with SOS and SafeCircle access.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/saferoute-ai/` — Expo app and local demo route-scoring flow
- `artifacts/saferoute-ai/utils/safety.ts` — route-factor weights, score calculation, and preference ranking
- `artifacts/saferoute-ai/components/` — route map, route cards, map picker, and SafeCircle

## Architecture decisions

- Route scoring is an explainable local weighted model with clearly identified illustrative factors; it does not use live incident or map data.
- Current location is requested only when the user taps the location control; a manually entered origin remains available.
- Trusted SafeCircle contacts are stored locally and trip sharing is initiated by the user through the device share sheet.

## Product

- Compare three simulated routes using a 0–100 safety score and see factor-level explanations.
- Choose walking, cycling, two-wheeler, or car, then prioritize fastest, safest, or balanced routing.
- Preview a schematic route, advance through demo navigation steps, and open SOS or SafeCircle tools.

## User preferences

- Treat the attached product brief as the source for the initial SafeRoute AI scope.

## Gotchas

- Safety scores and route paths are prototype estimates, not live safety guidance. Keep that limitation visible in the UI.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
