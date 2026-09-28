# SyncJam

SyncJam lets nearby phones join a short-code room and see the shared speaker group in real time.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server with REST room routes and WebSocket presence
- `pnpm --filter @workspace/syncjam run dev` — run the mobile-first web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/syncjam` — React/Vite web app
- `artifacts/api-server/src/lib/rooms.ts` — in-memory room and participant state
- `artifacts/api-server/src/index.ts` — HTTP server upgrade path and WebSocket presence
- `lib/api-spec/openapi.yaml` — REST contract for room creation and lookup

## Architecture decisions

- Room state is intentionally in memory for the milestone; no accounts or database are needed.
- Each room can load one official YouTube embedded player per connected device; host playback commands are relayed over WebSocket.
- Playback commands carry server timestamps; clients estimate clock offset and correct meaningful playback drift locally.
- WebSocket presence is served from the API artifact at `/api/ws`; the proxy explicitly exposes that path.
- Room creation and lookup use generated OpenAPI hooks; participant presence uses a reconnecting WebSocket client.
- The synchronization design is based on NTP-style clock estimation and a server-authoritative timeline, informed by the inspected SyncTune, Beatsync, MUSIXQUARE, and SyncPlay projects.

## Product

- Create a five-character room code.
- Join an existing room by code.
- See connected devices and host ownership update live.
- Host can load, play, pause, and seek the shared YouTube source for the room.
- Guests follow the server-timestamped room timeline with late-join positioning and periodic drift correction.
- Recover from temporary WebSocket disconnects with exponential backoff.

## User preferences

- Keep the MVP focused on proving two-phone room and playback synchronization before adding accounts or social features.

## Gotchas

- Rooms disappear when their last WebSocket participant disconnects.
- Build checks for the web artifact need `PORT` and `BASE_PATH`; managed workflows provide both.
- The API artifact must keep `/api/ws` in its service paths or WebSocket upgrades will not reach the server.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
