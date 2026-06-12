# Punk Records

Personal inspiration and idea capture tool. A Discord bot collects messages from designated channels and displays them as cards on an infinite canvas web app.

## What this is

- Discord channels prefixed with `canvas-` are canvases. Creating/deleting a channel creates/deletes a canvas.
- Every message posted in a `canvas-*` channel becomes a card (link with OG preview, or plain note).
- The web app is an infinite canvas per collage with mobile as a first-class concern.
- Cards can also be added directly from the web app without going through Discord.

## Architecture

Three packages in a monorepo:
- `packages/bot` — Discord bot (discord.js)
- `packages/api` — Express.js REST API + Socket.io
- `packages/web` — Next.js frontend (React Flow canvas)
- `packages/shared` — Prisma schema + shared TypeScript types

See `DESIGN.md` for the full design document.

## Key design decisions

- **Channel = collage**: collage lifecycle is driven entirely by Discord channel create/delete events. No collage management in the web UI.
- **Circular layout**: new cards are placed using a golden angle spiral (r = 320*sqrt(n), θ = n * 137.5°) starting from origin. Cards manually dragged save their new position and are no longer governed by the formula.
- **OG scraping is async**: cards appear on the canvas immediately, then "fill in" their preview once the scrape completes. Use skeleton loading state.
- **Mobile-first**: bottom sheet for add card form, bottom tab bar for collage navigation, no hover-only interactions, 44px minimum touch targets.

## Tech stack

| Layer | Tech |
|---|---|
| Discord Bot | discord.js v14 |
| API | Express.js + Socket.io |
| ORM | Prisma |
| Database | PostgreSQL |
| OG scraping | open-graph-scraper |
| Frontend | Next.js + React Flow + Tailwind CSS |
| Language | TypeScript throughout |

## Running locally

```bash
# Install all workspace dependencies
npm install

# Start Postgres (Docker recommended)
docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres

# Copy and fill in env vars
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start all three services in dev mode
npm run dev
```

## Environment variables

See `.env.example`. Required:
- `DISCORD_BOT_TOKEN` — from Discord Developer Portal
- `DISCORD_GUILD_ID` — your personal server's ID
- `DATABASE_URL` — PostgreSQL connection string
- `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` — points web app at the API

## Real-time events

Socket.io events emitted by the API and consumed by the web app:
- `card:created`, `card:updated`, `card:deleted`, `card:moved`
- `collage:created`, `collage:deleted`, `collage:renamed`

## Prisma

```bash
# After editing packages/shared/prisma/schema.prisma:
npm run db:migrate        # create and apply migration
npm run db:generate       # regenerate Prisma client
npm run db:studio         # open Prisma Studio (visual DB browser)
```
