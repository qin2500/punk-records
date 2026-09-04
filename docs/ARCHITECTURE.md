# Punk Records — Architecture & Onboarding Guide

> A high-level map of the codebase for engineers joining the project. For the original product/design rationale see [`DESIGN.md`](../DESIGN.md); this document reflects the system **as currently implemented**, which has evolved past that spec in several places (private canvases, image cards, rich link previews for Twitter/X, IMDb, and Reddit, EC2 deployment instead of Railway).

---

## 1. Executive Overview & Purpose

**Punk Records** is a personal inspiration/idea-capture tool. It solves the "I saw something interesting but have nowhere lightweight to put it" problem: instead of a bookmarks folder or a notes app with friction, the user drops a link, image, or thought into a Discord channel from any device with Discord installed, and it appears automatically as a visual card on an infinite canvas.

- **Who it's for**: a single user (or small trusted group) organizing inspiration/ideas by topic. It is explicitly a personal tool, not a multi-tenant SaaS product — there is no user account system; access is gated by Discord server membership.
- **Core mental model**: a Discord channel *is* a canvas. Creating a channel named `canvas-<topic>` creates a new canvas ("collage"); deleting the channel deletes the canvas and all its cards. There is no separate collage-management UI in the web app.
- **Capture paths**: post a message/image/link in a `canvas-*` Discord channel, **or** add a card directly from the web app (link, note, or image upload — the latter is silently relayed through Discord so Discord remains the canonical image host).
- **Private canvases**: channels named `canvas-private-<topic>` behave the same but are hidden behind a lightweight, obscurity-based unlock gate in the web UI (see §5.3), and the bot deletes the original Discord message after capturing it as a card.

---

## 2. Tech Stack & Key Dependencies

| Layer | Technology | Notes |
|---|---|---|
| Language | TypeScript (throughout) | Shared types via the `shared` workspace package |
| Discord Bot | discord.js v14 | Gateway client; long-running process |
| Backend API | Express.js + Socket.io | REST + WebSocket in one process |
| ORM / Migrations | Prisma | Schema in `packages/shared/prisma/schema.prisma` |
| Database | PostgreSQL | Supabase-hosted in production |
| Validation | Zod | Request body validation in the API |
| File uploads | Multer (memory storage) | Images are forwarded to Discord, never written to disk |
| OG / link scraping | `open-graph-scraper`, plus bespoke scrapers for X/Twitter (fxtwitter API), Reddit (official OAuth API), and IMDb (OMDb API with HTML-scrape fallback) | See `packages/api/src/services/og-scraper.ts` |
| Frontend | Next.js (App Router) | Server components fetch initial data; client components handle live updates |
| Canvas | React Flow (`reactflow`) | Pan/zoom/drag infinite canvas, touch-native |
| Styling | Tailwind CSS | Mobile-first utility classes |
| Real-time transport | Socket.io (server + client) | Room-per-collage broadcast model |
| Containerization | Docker (per-service Dockerfiles) | `packages/api/Dockerfile`, `packages/bot/Dockerfile` |
| CI/CD | GitHub Actions (`.github/workflows/deploy.yml`) | Builds images, pushes to GHCR, deploys over SSH |
| Production ingress | Cloudflare Tunnel (`cloudflared`) | Exposes the API without opening inbound ports on the host |
| Monorepo tooling | npm workspaces + `concurrently` | No Turborepo/Nx — plain npm scripts |

---

## 3. High-Level System Architecture

### 3.1 Design pattern

This is a **monolith-per-concern** setup inside a single monorepo: three independently deployable Node.js processes (bot, API, web) plus a shared library package, coordinated through a Postgres database and an HTTP+WebSocket event bus. It is **event-driven at the edges** (Discord gateway events drive bot behavior; Socket.io events drive UI updates) but each service is internally a simple layered app (routes/services, or event handlers), not microservices in the full sense — there's a single shared database and no service mesh.

A notable architectural quirk: **the bot cannot reach the API's in-process Socket.io server directly** (separate process/container), so it triggers real-time UI updates by POSTing to an API-internal `/internal/emit` endpoint, which then re-emits over the real Socket.io connection to browsers. See `packages/bot/src/socketClient.ts` and `packages/api/src/routes/internal.ts`.

### 3.2 Architecture diagram

```mermaid
flowchart TB
    subgraph Discord["Discord Server"]
        CH1["#canvas-music-inspo"]
        CH2["#canvas-private-journal"]
    end

    subgraph EC2["EC2 host (Docker Compose)"]
        BOT["Bot process\n(discord.js gateway client)"]
        API["API process\n(Express + Socket.io)"]
        TUNNEL["cloudflared tunnel"]
    end

    WEB["Web app (Next.js)\ndeployed separately"]
    DB[("PostgreSQL\n(Supabase)")]
    OG["External preview sources:\nopen-graph-scraper, fxtwitter,\nReddit OAuth API, OMDb API"]

    Discord -- "WebSocket gateway" --> BOT
    BOT -- "Prisma (direct DB access)" --> DB
    BOT -- "POST /internal/emit\n(relay for socket events)" --> API
    BOT -- "POST /api/... (bot image posting is reverse:\nweb->bot via Discord REST, see 5.2)" -.-> Discord

    API -- "Prisma" --> DB
    API -- "fetch()" --> OG
    API -- "Socket.io (rooms per collage)" --> WEB
    API == "REST: /api/collages, /api/cards, /api/upload" ==> WEB
    WEB -- "REST: POST /api/upload" --> API
    API -- "Discord REST API\n(post image, get attachment URL)" --> Discord

    TUNNEL -- "exposes API publicly" --> API
    WEB -- "NEXT_PUBLIC_API_URL / SOCKET_URL\n(via tunnel in prod)" --> TUNNEL

    classDef proc fill:#4c1d95,stroke:#c4b5fd,color:#fff;
    classDef store fill:#1e3a5f,stroke:#93c5fd,color:#fff;
    classDef ext fill:#374151,stroke:#9ca3af,color:#fff;
    class BOT,API,WEB proc;
    class DB store;
    class OG,Discord,TUNNEL ext;
```

### 3.3 Process/deployment topology

- **Bot** and **API** run as separate Docker containers on a single EC2 instance, orchestrated by `docker-compose.yml`, alongside a `cloudflared` sidecar that tunnels the API to the public internet (no inbound security-group ports needed).
- **Web** (Next.js) is *not* in `docker-compose.yml` and has no Dockerfile — it's built/deployed independently (its own hosting, e.g. Vercel-style), and talks to the API purely over the public tunnel URL via `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL`.
- **Database** in production is Supabase Postgres, reached over its *direct* (non-pooled) connection string — the pooled connection is explicitly avoided (see `.env.production.example` and a recent commit reverting startup migrations because "Supabase pooler blocks advisory locks").
- **CI/CD**: pushing to `main` triggers `.github/workflows/deploy.yml`, which builds & pushes `api` and `bot` images to GHCR, then SSHes into the EC2 host through a bastion, pulls the new images, rewrites `.env.production` from a GitHub secret, and runs `docker compose up -d` followed by `docker image prune -af` to reclaim disk space from old images.

---

## 4. Directory Structure & Module Breakdown

```
punk-records/
├── packages/
│   ├── bot/                        # Discord bot — long-running gateway client
│   │   └── src/
│   │       ├── index.ts            # Client setup, intents, event wiring, login
│   │       ├── sync.ts             # Startup reconciliation: DB <-> live Discord channels
│   │       ├── cardService.ts      # scrapeAndUpdateCard: fetch OG data, PATCH card, emit update
│   │       ├── layout.ts           # Golden-angle spiral position calculator (bot's copy)
│   │       ├── socketClient.ts     # Relays real-time events to the API's /internal/emit
│   │       ├── utils.ts            # Channel-name helpers (canvas-/canvas-private- prefixes, URL extraction)
│   │       └── events/
│   │           ├── messageCreate.ts   # New message -> LINK/NOTE/IMAGE card(s); deletes msg if private
│   │           ├── channelCreate.ts   # New canvas-* channel -> Collage row
│   │           ├── channelDelete.ts   # Deleted channel -> cascade-delete Collage + cards
│   │           └── channelUpdate.ts   # Renames / prefix add-remove -> create/delete/rename Collage
│   │
│   ├── api/                        # Express REST API + Socket.io server
│   │   └── src/
│   │       ├── index.ts            # App bootstrap: middleware, routers, Socket.io room join/leave
│   │       ├── routes/
│   │       │   ├── collages.ts     # GET /api/collages, GET /api/collages/:id
│   │       │   ├── cards.ts        # Card CRUD, position updates, rescrape, collage-scoped card list
│   │       │   ├── upload.ts       # POST /api/upload — relays an image to Discord, returns its URL
│   │       │   └── internal.ts     # POST /internal/emit — bot's back-channel into Socket.io
│   │       ├── services/
│   │       │   ├── layout.ts       # Golden-angle spiral position calculator (API's copy)
│   │       │   └── og-scraper.ts   # scrapeOg(): dispatches to Twitter/IMDb/Reddit/generic scrapers
│   │       └── socket/
│   │           └── emitter.ts      # Typed wrappers around io.to(room).emit(...)
│   │
│   ├── web/                        # Next.js (App Router) frontend
│   │   ├── app/
│   │   │   ├── page.tsx                     # "/" — redirects to first collage or shows empty state
│   │   │   └── canvas/[collageId]/page.tsx  # Server component: fetches collage/cards/collages, renders client shell
│   │   ├── components/
│   │   │   ├── CanvasPageClient.tsx  # Top-level client shell: header, sidebar, sheet, private-gate logic
│   │   │   ├── Canvas.tsx            # React Flow canvas wrapper: node state, socket listeners, drag persistence
│   │   │   ├── CardNode.tsx          # Dispatches a Card to the right visual component by type/URL pattern
│   │   │   ├── AddCardSheet.tsx      # Bottom sheet / modal for adding link, note, or image cards
│   │   │   ├── CollageNav.tsx        # Desktop sidebar list of collages
│   │   │   ├── BottomTabBar.tsx      # Mobile bottom tab bar collage switcher
│   │   │   ├── PrivateGate.tsx       # Obscurity-based unlock overlay for private canvases
│   │   │   └── cards/                # Per-type card visuals: Link, Note, Image, Twitter, Reddit, Imdb, Skeleton, RefreshButton
│   │   ├── hooks/
│   │   │   └── usePrivateUnlock.ts   # In-memory + sessionStorage "keep open" unlock state machine
│   │   └── lib/
│   │       ├── api.ts                # fetchCollage/fetchCards/fetchCollages REST helpers
│   │       ├── socket.ts             # Singleton Socket.io client
│   │       └── useRescrape.ts        # Hook for the manual "refresh preview" action
│   │
│   └── shared/                     # Shared Prisma schema + TypeScript types
│       ├── prisma/
│       │   ├── schema.prisma       # Collage, Card models; CardType/CardSource enums
│       │   └── migrations/         # Timestamped SQL migrations (incl. add_is_private, add_image_card_type)
│       └── src/
│           ├── prisma.ts           # Shared PrismaClient singleton
│           ├── types.ts            # Card, Collage, Socket.io event payload types
│           └── index.ts            # Package entry point (re-exports)
│
├── docker-compose.yml              # Production topology: api, bot, cloudflared tunnel
├── .github/workflows/deploy.yml    # Build images -> GHCR -> SSH deploy to EC2 via bastion
├── DESIGN.md                       # Original design spec (see note at top of this doc for drift)
└── package.json                    # npm workspaces root; dev/build/db:* scripts
```

---

## 5. Key Data Flows & Execution Pipeline

### 5.1 Primary flow: posting a link in Discord → card appears on canvas

1. User posts a message containing a URL in `#canvas-music-inspo`.
2. Bot's `messageCreate` handler (`packages/bot/src/events/messageCreate.ts`) fires. It ignores bot-authored messages and non-`canvas-*` channels, then looks up the `Collage` row by `discordChannelId`.
3. It computes the card's position via the **golden-angle spiral** (`layout.ts`): `angle = n * 137.508°`, `radius = 320 * sqrt(n)`, where `n` is the current card count in that collage — deterministic, no stored sequence number.
4. A `Card` row is inserted immediately (`type: LINK`, no OG fields yet, `source: DISCORD`).
5. The bot calls `emitCardCreated` (`socketClient.ts`), which **POSTs to `/internal/emit`** on the API (the bot has no direct Socket.io connection). The API's `internal.ts` route receives this and calls the real `emitCardCreated`, broadcasting `card:created` to every browser in that collage's Socket.io room. The card appears on the canvas instantly, as a skeleton (no preview yet).
6. Asynchronously, `scrapeAndUpdateCard` (`cardService.ts`) calls `scrapeOg(url)`. This dispatches by URL pattern:
   - `twitter.com`/`x.com` → fxtwitter API (tweet text, author, media)
   - `imdb.com` → OMDb API by IMDb ID (falls back to scraping IMDb's own OG tags with a spoofed User-Agent if no `OMDB_API_KEY` or OMDb has no data)
   - `reddit.com`/`redd.it` → Reddit's official OAuth API (client-credentials flow, cached token) for gallery/preview images and self-text
   - everything else → generic `open-graph-scraper`
7. The `Card` row is updated with whatever OG fields were found, and `card:updated` is emitted the same way (bot → `/internal/emit` → Socket.io room).
8. Connected browsers receive `card:updated` and the card visually "fills in" from skeleton to its final preview (`CardNode.tsx` picks the right visual component — `LinkCard`, `TwitterCard`, `ImdbCard`, or `RedditCard` — based on the card's URL).
9. If the collage `isPrivate`, the bot deletes the original Discord message once the card is saved, so the source content doesn't linger in the channel.

### 5.2 Secondary flow: adding an image card from the web app

Images added via the web UI are **not stored on Punk Records' own infrastructure** — they're relayed through Discord so Discord remains the single source of truth for image hosting:

1. User picks an image in `AddCardSheet`; the client `POST`s it as multipart form data to `/api/upload` with the target `collageId`.
2. `upload.ts` (Multer, in-memory buffer, 20MB limit, image-mimetype filter) forwards the file to the collage's Discord channel via the **Discord REST API** (`POST /channels/:id/messages`), authenticated as the bot.
3. Discord returns the message with an `attachments[0].url`; the API responds to the web client with that URL.
   - Because the bot's own `messageCreate` handler ignores messages from bot users, this does **not** create a duplicate card via the normal Discord flow.
4. The web client then `POST`s `/api/collages/:id/cards` with `{ type: "IMAGE", url, notes }`. The API computes the spiral position, creates the `Card` row (`source: WEBAPP`), and emits `card:created` directly (API has its own in-process Socket.io server — no relay needed here).

### 5.3 Startup reconciliation (bot)

On every bot boot, `sync.ts` fetches all guild channels and diffs `canvas-*` channels against the `Collage` table: missing channels get inserted, and DB rows whose Discord channel no longer exists get deleted (cascading their cards). This repairs drift from any channel create/delete events missed while the bot was offline.

### 5.4 Private canvas unlock (client-side only — not real auth)

`PrivateGate.tsx` shows a lock icon and listens for either an "S → D → U" keystroke sequence (desktop) or 8 taps within 3 seconds (mobile) to unlock. `usePrivateUnlock.ts` tracks unlock state in memory (cleared on tab blur/hide) plus an optional 1-hour "keep open" window persisted in `sessionStorage`. **This is obscurity, not access control** — the API enforces no authorization on private-collage endpoints; anyone with the collage ID and API URL can read its cards directly. Treat it purely as a casual-glance deterrent, not a security boundary.

---

## 6. Configuration & Setup Requirements

### 6.1 Required environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `DISCORD_BOT_TOKEN` | bot, api | Discord bot auth; API also uses it to post images to Discord on the web app's behalf |
| `DISCORD_GUILD_ID` | bot | The single Discord server the bot watches |
| `DATABASE_URL` | bot, api, shared (Prisma) | Postgres connection string. **Production note**: must be Supabase's *direct* connection (port 5432), not the pooled one — the pooler blocks the advisory locks Prisma migrations need |
| `PORT` | api | API listen port (defaults to 3001) |
| `API_URL` | bot | How the bot reaches the API — `http://api:3001` inside Docker Compose's internal network, `http://localhost:3001` in local dev |
| `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` | web | Where the browser reaches the API for REST and Socket.io (public tunnel URL in production) |
| `OMDB_API_KEY` | api | Optional; enables richer IMDb cards via OMDb (1000 req/day free tier). Without it, IMDb falls back to scraping IMDb's page directly, which is less reliable |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | api | Optional; a free Reddit "script" app. Without these, Reddit links get no rich preview (Reddit blocks unauthenticated scraping) |
| `CLOUDFLARE_TUNNEL_TOKEN` | tunnel (prod only) | Authenticates the `cloudflared` sidecar to Cloudflare Zero Trust |

### 6.2 Local setup

```bash
npm install
docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres   # or use Supabase locally
cp .env.example .env   # fill in Discord token/guild ID at minimum
npm run db:migrate
npm run dev            # runs api + web concurrently (NOT the bot — start it separately if needed)
```

Note: the root `npm run dev` script only starts `api` and `web` (via `concurrently`); the bot must be run separately (e.g. `npm run dev --workspace=packages/bot`) if you need live Discord capture during local development.

### 6.3 Setup quirks worth knowing

- **Prisma migrations require the direct DB connection**, not a connection pooler — a prior attempt to run migrations automatically on container startup was reverted specifically because Supabase's pooler blocks the advisory locks Prisma needs (see git history / `.env.production.example` comments). Run `npm run db:migrate` from a machine with direct DB access, not from inside the pooled production containers.
- **The bot has no direct Socket.io access.** Any new real-time event triggered from bot code must go through `POST /internal/emit` (`packages/bot/src/socketClient.ts` → `packages/api/src/routes/internal.ts`), not a direct `io.emit`.
- **`layout.ts` (the golden-angle spiral) is duplicated** between `packages/bot/src` and `packages/api/src/services` rather than living in `shared` — keep both in sync if the formula changes.
- **Image cards never touch this app's storage.** They're proxied through Discord's CDN via the bot token; there is no S3/blob storage dependency.
- **Card type + URL pattern together decide the rendered component** (`CardNode.tsx` and `og-scraper.ts` both hardcode the same Twitter/IMDb/Reddit regexes independently) — adding a new "special" link type means updating the matcher in both places.
- **Deployment never builds on the host.** The EC2 instance only runs `docker compose pull` + `up -d`; all image builds happen in GitHub Actions and are pushed to GHCR. `docker image prune -af` runs after every deploy to prevent disk exhaustion from accumulated old image layers.
- **The web app is deployed independently** of the Dockerized bot/API stack — there's no `packages/web/Dockerfile` or Compose service for it.
