# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Architecture decisions

- **Distance calculation**: Routes API v2 (POST /api/drive-time) is called before showing any quote. The quote effect is gated on `driveTimeReady` (freshDriveTime set OR error fallback). `freshDriveTimeKey` (primitive string) is used as the quote effect dep instead of the `freshDriveTime` object — this prevents React Strict Mode's double-fire from oscillating the object reference and causing repeated quote resets.
- **Hook ordering**: `use-drive-time.ts` must have `useState` calls BEFORE `useGetDriveTime()` — changing this order requires a workflow restart (not just HMR) to avoid "hooks called in different order" crashes.
- **Non-debounced drive time**: Drive time hook uses raw `destLat/destLng` (not debounced) to fire ASAP when pit + address are both known. Quote calculation uses `debouncedLat/Lng` to avoid firing on every keystroke.
- **Pre-existing TS errors**: `google` namespace in `address-search.tsx`/`map.tsx`; `notes: string | null` in `pits/edit.tsx` — do NOT fix these.
- **Google Maps autocomplete**: Does not fire `place_changed` in headless Playwright — use map clicks for E2E testing instead of autocomplete.
