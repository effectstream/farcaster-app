# Farcaster Canvas — Collaborative pixel painting Mini App

A [Farcaster Mini App](https://miniapps.farcaster.xyz) where users paint pixels on shared canvases and fork them to their own timeline. Built on the [Effectstream template](https://github.com/effectstream/effectstream/blob/v-next-bun-start/templates/effectstream-template-guidelines.md) (Bun monorepo, pgtyped, Hardhat) and inspired by the original [Paima `farcaster-frame`](https://github.com/PaimaStudios/paima-game-templates/tree/main/farcaster-frame) game.

> **Note:** Farcaster Frames v1 was deprecated at the end of March 2025 and is no longer rendered by clients. This template implements the Mini Apps (formerly Frames v2) successor using `@farcaster/miniapp-sdk`.

## Quick Start (dev)

```bash
cp .env.dev.example .env
bun install
bun run build:evm           # compiles CanvasGame.sol + regenerates contracts-evm/mod.ts
bun run build:pgtypes       # regenerates packages/database/sql/queries.queries.ts from queries.sql
bun run dev                 # orchestrator: PGlite + anvil + node + batcher + Vite dev
```

Open <http://localhost:5173> for the Mini App UI. To preview inside Farcaster,
tunnel the URL and paste it into the Warpcast Mini App Preview tool:

```bash
bunx cloudflared tunnel --url http://localhost:5173
```

## Environments

| | Dev | Mainnet |
|---|---|---|
| Chain | Hardhat anvil (chainId 31337) | Base mainnet (chainId 8453) |
| DB | PGlite (in-process) | Managed Postgres |
| Frontend | Vite dev server | Fastify static |
| Manifest | `client/public/.well-known/farcaster.json` (unsigned) | Warpcast Hosted Manifest Service |
| Run | `bun run dev` | `bun run start:mainnet` + `bun run start:batcher:mainnet` |
| Env file | `.env.dev.example` → `.env` | `.env.mainnet.example` → `.env` |

`packages/node/config.mainnet.ts` and `packages/batcher/batcher.mainnet.ts` fail fast if any required env var is unset.

### Required mainnet env vars

Backend (validated at boot by `config.mainnet.ts` / `batcher.mainnet.ts`):

| Variable | Notes |
|---|---|
| `EVM_RPC_URL` | Base mainnet RPC (Alchemy/Infura/QuickNode/etc.) |
| `CANVAS_GAME_ADDRESS` | Output of `bun run --filter @farcaster-canvas/contracts-evm deploy:mainnet` |
| `START_BLOCKHEIGHT` | Block height the contract was deployed at (look up the deploy tx on basescan.org) |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PW` | Managed Postgres connection |
| `EVM_PRIVATE_KEY` | Batcher hot wallet (funded with Base ETH for gas) |
| `CORS_ORIGIN` | Mini App origin allowed to call the API, e.g. `https://canvas.example.com`. Comma-separate for multiple. |
| `EFFECTSTREAM_API_PORT` | Defaults to `9999`. Expose this behind your reverse proxy at `api.<domain>`. |
| `BATCHER_PORT` | Defaults to `3334`. Expose this at `batcher.<domain>`. |

Frontend (baked into the SPA at build time — rebuild after changing any):

| Variable | Notes |
|---|---|
| `VITE_APP_URL` | Production Mini App domain registered in Warpcast |
| `VITE_API_URL` | Public URL of the node API (e.g. `https://api.canvas.example.com`) |
| `VITE_BATCHER_URL` | Public URL of the batcher (e.g. `https://batcher.canvas.example.com`) |
| `VITE_CHAIN_ID` | `8453` for Base mainnet |
| `VITE_CANVAS_GAME_ADDRESS` | Same value as `CANVAS_GAME_ADDRESS` |
| `VITE_MANIFEST_URL` | Hosted manifest URL from the Warpcast Mini App Manifest Tool |

## Testing

```bash
bun run test
```

Three phases run serially:

1. **Infrastructure** — anvil RPC responds, node `/api/health` is up, batcher port is listening.
2. **State machine** — submits `fork(0)`, `fork(1)`, `paint(...)` to the batcher and asserts the SQL rows + paint counts match.
3. **Frontend** — `vite build` succeeds.

## Project Structure

```
farcaster/
├── start.dev.ts              # bun run dev
├── start.mainnet.ts          # bun run start:mainnet
├── .env.dev.example
├── .env.mainnet.example
└── packages/
    ├── node/                 # grammar, configs, state machine, API
    ├── database/             # migrations + pgtyped queries
    ├── contracts-evm/        # CanvasGame.sol + Hardhat
    ├── batcher/              # transaction batcher (adapter factory)
    ├── frontend/             # Vite + React Mini App + Fastify static server
    ├── shared/               # custom events shared between node + frontend
    └── tests/                # three-phase test runner
```

### Package descriptions

- **node** — `grammar.ts` (Typebox-validated `paint` / `fork`), `state-machine.ts` (clones paints on fork, inserts paints, emits `PaintApplied` / `CanvasFilled`), `api.ts` (canvases / paints / rewards endpoints).
- **database** — Single migration creating `canvases`, `paints`, `rewards`. All app-code queries are pgtyped `PreparedQuery` objects re-exported from `mod.ts`.
- **contracts-evm** — `CanvasGame.sol` is a minimal `EffectstreamL2Contract` subclass — no custom logic. All game rules (paint/fork/seed/rewards) live in the STM. Users submit JSON inputs through the inherited `effectstreamSubmitGameInput`. Reward economics (the original Paima 90/10 split) are tracked off-chain in the `rewards` table; an onchain treasury contract is a future extension.
- **batcher** — Aggregates user inputs over time windows and submits batched txs to the contract via `EffectstreamL2DefaultAdapter`. The adapter is registered with `batcher.addBlockchainAdapter("canvas-l2", …)`, matching the sync-protocol name in `config.{dev,mainnet}.ts`. Namespace `""` matches the frontend's `EffectstreamConfig`.
- **frontend** — Mini App. `miniapp.ts` calls `sdk.actions.ready()` after mount, exposes `composeCast` for share buttons, and surfaces the host's EIP-1193 provider to `walletLogin`.
- **shared** — `AppEvents` declares `CanvasCreated` / `PaintApplied` / `CanvasFilled` so the frontend can subscribe via `EventManager`.

## Services

| Service | Port (dev) | Purpose |
|---|---|---|
| Vite dev | 5173 | Mini App UI |
| Frontend static | 10599 | Fastify static (prod) |
| Node API | 9999 | REST + MQTT events |
| Batcher | 3334 | HTTP `submit_user_input` + event stream |
| Anvil | 8545 | Local EVM |
| PGlite | 5432 | Dev Postgres |

## Game Mechanics

| Grammar input | Wire format | Effect |
|---|---|---|
| Seed canvas | `["fork", 0]` | Mint a new canvas with 3 random colors |
| Fork canvas | `["fork", <canvasId>]` | Clone `<canvasId>`'s paints to a new child canvas |
| Paint | `["paint", <canvasId>, "#rrggbb"]` | Insert one paint row; canvases fill at 25 paints |

| API endpoint | Returns |
|---|---|
| `GET /api/health` | `{ ok: true }` |
| `GET /api/canvases?limit=N` | List of open (unfilled) canvases |
| `GET /api/canvases?owner=0x..` | Canvases owned by a wallet |
| `GET /api/canvas/:id` | Canvas + ordered paint rows |
| `GET /api/rewards/:addr` | Accrued wei available for withdraw |

## Mini App publishing

1. Pick a stable production domain (e.g. `canvas.yourdomain.com`).
2. Deploy `CanvasGame` to Base: `bunx hardhat ignition deploy ignition/modules/canvasGame.ts --network base`.
3. Build and ship the frontend: `bun run build:frontend` → host `packages/frontend/client/dist/` at the production domain.
4. In Warpcast, open the [Mini App Manifest Tool](https://farcaster.xyz/~/developers/mini-apps/manifest), enter your domain, sign the `accountAssociation` payload, and copy the resulting hosted manifest URL into `VITE_MANIFEST_URL`.
5. Update `client/public/.well-known/farcaster.json` (or point the hosted manifest at it).
6. Cast the production URL — Farcaster renders the `fc:miniapp` embed with a **Paint** launch button.

## Docker

The default `Dockerfile` sets `NODE_ENV=development` and runs `start.dev.ts` (PGlite + anvil + node + batcher + Vite). For production builds, override `NODE_ENV` and `CMD`.

```bash
# Dev image — all services run in one container
docker build -f Dockerfile . -t farcaster-canvas
docker run -p 5173:5173 -p 9999:9999 -p 3334:3334 -p 8545:8545 farcaster-canvas
docker run farcaster-canvas bun run test

# Prod — split into two long-running containers + a static frontend host
docker run -d --env-file .env -e NODE_ENV=production -p 9999:9999 \
  farcaster-canvas bun run start:mainnet
docker run -d --env-file .env -e NODE_ENV=production -p 3334:3334 \
  farcaster-canvas bun run start:batcher:mainnet
```

The Mini App SPA is meant for a static host (Cloudflare Pages, Vercel, Netlify) rather than a long-running container — it's a bundle of HTML/JS + the `.well-known/farcaster.json` manifest.
