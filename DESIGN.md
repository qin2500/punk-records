# Punk Records — Design Document

## 1. Overview

Punk Records is a personal inspiration and idea capture tool. It consists of two parts:

1. **A Discord bot** that passively collects every message sent in designated channels and stores them as cards.
2. **A web app** that displays those cards on an infinite canvas per collage, with full mobile support.

The central mental model is: **Discord channels are canvases**. There is no separate collage management UI — you manage collages entirely by creating and deleting Discord channels with the `canvas-` prefix. The web app reflects that state in real time.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Discord Server                       │
│  #canvas-music-inspo   #canvas-design   #canvas-random  │
└────────────────────────┬────────────────────────────────┘
                         │ discord.js (WebSocket)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Discord Bot (Node.js)                  │
│  - Watches canvas-* channels for messages                │
│  - Watches for channel create / delete events            │
│  - Scrapes OG metadata for URLs                          │
│  - Emits events to Backend API                           │
└────────────────────────┬────────────────────────────────┘
                         │ Internal HTTP / shared module
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Backend API (Express.js)                 │
│  - REST endpoints for cards and collages                 │
│  - OG metadata scraping                                  │
│  - Circular layout position calculation                  │
│  - Socket.io server for real-time push                   │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
           ▼                          ▼
┌──────────────────┐      ┌───────────────────────────────┐
│   PostgreSQL DB   │      │     Web App (Next.js)          │
│  collages, cards  │      │  - Infinite canvas (React Flow)│
│                  │      │  - Mobile-first UI             │
└──────────────────┘      │  - Socket.io client            │
                          │  - Add cards directly          │
                          └───────────────────────────────┘
```

The Discord bot and the Express API live in the same monorepo and can share code (e.g. the database client, OG scraper). In production they can run as separate processes or as one combined Node process.

---

## 3. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Discord Bot | discord.js v14 | Standard, well-documented |
| Backend API | Express.js | Familiar, battle-tested |
| ORM | Prisma | Clean schema management, type-safe queries |
| Database | PostgreSQL | Relational, good for positional data |
| Real-time | Socket.io | Bi-directional push to browser |
| OG Scraping | open-graph-scraper | Reliable, handles most platforms |
| Frontend | Next.js (App Router) | React + routing + API routes in one |
| Canvas | React Flow | Built-in infinite canvas, pan/zoom, touch support |
| Styling | Tailwind CSS | Mobile-first utility classes |
| Language | TypeScript throughout | Shared types between layers |

---

## 4. Data Model

### Collage
Mirrors a Discord channel with the `canvas-` prefix.

```
Collage {
  id              String    @id @default(cuid())
  name            String               // e.g. "music-inspo"
  discordChannelId String   @unique    // Discord channel snowflake ID
  createdAt       DateTime @default(now())
  cards           Card[]
}
```

When a `canvas-*` channel is created in Discord, a Collage row is inserted.
When a channel is deleted, the Collage row (and all its cards) is deleted.

### Card
One item on a canvas. Can be a link (with OG data) or a plain note.

```
Card {
  id          String   @id @default(cuid())
  collageId   String
  collage     Collage  @relation(...)

  type        CardType           // LINK | NOTE
  content     String?            // note text, or the raw URL
  url         String?            // normalized URL for LINK cards

  // OG metadata (LINK cards only)
  ogTitle     String?
  ogDescription String?
  ogImage     String?
  ogSiteName  String?
  ogFavicon   String?

  // Canvas position (calculated server-side on creation)
  x           Float    @default(0)
  y           Float    @default(0)
  width       Float    @default(280)
  height      Float    @default(160)

  // Source
  source      CardSource         // DISCORD | WEBAPP
  discordMessageId String?       // set if source = DISCORD

  createdAt   DateTime @default(now())
}

enum CardType   { LINK NOTE }
enum CardSource { DISCORD WEBAPP }
```

---

## 5. Discord Bot

### Channel Naming Convention
Any channel whose name starts with `canvas-` is tracked.

- `canvas-music-inspo` → collage named "music inspo"
- `canvas-design` → collage named "design"

The bot strips the `canvas-` prefix and replaces hyphens with spaces for display.

### Events the Bot Listens For

**`messageCreate`**
- Fires on every new message in a `canvas-*` channel.
- Ignores messages from bots (including itself).
- Detects whether the message contains a URL or is plain text.
- If URL: triggers OG scrape, creates a LINK card.
- If plain text: creates a NOTE card.
- A message can contain both a URL and text — treat the URL as the card, ignore the surrounding text (Discord does the same thing with its own previews).

**`channelCreate`**
- Fires when any channel is created in the guild.
- If the channel name starts with `canvas-`: insert a new Collage row.
- Emit `collage:created` event via Socket.io to all connected web clients.

**`channelDelete`**
- Fires when a channel is deleted.
- Look up the Collage by `discordChannelId`.
- If found: delete the Collage and cascade-delete all its Cards.
- Emit `collage:deleted` event via Socket.io.

**`channelUpdate`**
- Fires when a channel is renamed.
- If old name had `canvas-` prefix and new name does not: treat as delete.
- If old name did not and new name does: treat as create.
- If both have the prefix: update the Collage name in the DB.

### Startup Sync
On bot start, fetch all channels in the guild and reconcile against the DB:
- Channels with `canvas-` prefix that have no DB row → insert Collage.
- DB rows whose `discordChannelId` no longer exists in the guild → delete Collage.

This handles any changes that happened while the bot was offline.

---

## 6. Backend API

### REST Endpoints

```
GET    /api/collages                     List all collages
GET    /api/collages/:id                 Get one collage
GET    /api/collages/:id/cards           Get all cards for a collage
POST   /api/collages/:id/cards           Add a card (from web app)
PATCH  /api/cards/:cardId/position       Update card x/y after drag
DELETE /api/cards/:cardId               Delete a card

GET    /api/health                       Health check
```

### POST /api/collages/:id/cards — Request Body

```json
{
  "type": "LINK",
  "content": "https://youtube.com/watch?v=..."
}
```

or

```json
{
  "type": "NOTE",
  "content": "Look into generative music with Markov chains"
}
```

The API calculates the card's initial position using the circular layout algorithm (see Section 8) and returns the full card object including `x`, `y`.

### PATCH /api/cards/:cardId/position — Request Body

```json
{ "x": 412.5, "y": -230.0 }
```

Called when the user finishes dragging a card on the canvas. Debounced on the client to avoid hammering the API on every pixel of movement (fire after drag ends, not during).

### OG Scraping
The API uses `open-graph-scraper` to fetch metadata for LINK cards. This happens asynchronously:

1. Card is inserted immediately with `content = url` and no OG data.
2. `card:created` is emitted to Socket.io clients right away (card appears on canvas).
3. OG scrape runs in the background.
4. On completion, card row is updated with OG fields.
5. `card:updated` is emitted — canvas updates the card preview in place.

This means cards appear instantly on the canvas and "fill in" their preview within a second or two.

---

## 7. Real-time Events (Socket.io)

All connected web clients join a room per collage (e.g. room id = collage id).
The server emits targeted events only to the relevant room.

| Event | Payload | Trigger |
|---|---|---|
| `card:created` | full Card object | new Discord message or web app add |
| `card:updated` | partial Card (id + changed fields) | OG scrape completes |
| `card:deleted` | `{ cardId }` | card deleted |
| `card:moved` | `{ cardId, x, y }` | position saved (from another client) |
| `collage:created` | full Collage object | Discord channel created |
| `collage:deleted` | `{ collageId }` | Discord channel deleted |
| `collage:renamed` | `{ collageId, name }` | Discord channel renamed |

The web app listens to these events and updates its local React state directly — no page reload required.

---

## 8. Circular Layout Algorithm

New cards are placed using a **golden angle spiral** (the same pattern as sunflower seeds). This produces a naturally expanding circular arrangement that never clusters and looks organic.

### Formula

```
goldenAngle = 137.508° (in radians: 2.399963...)
spacing     = 320      // pixels between card centers; adjust to taste

For card index n (0-based):
  angle  = n * goldenAngle
  radius = spacing * sqrt(n)
  x      = radius * cos(angle)
  y      = radius * sin(angle)
```

- Card 0 lands exactly at origin (0, 0).
- Every subsequent card spirals outward, evenly distributed around the center.
- No two cards overlap as long as `spacing` ≥ card diagonal (~290px for 280×160 cards, so 320 is safe).

### Implementation Notes
- `n` is the **total number of cards currently in the collage** at insert time, not a stored sequence number. This means positions are deterministic and can be recalculated.
- After a card is manually dragged, its `x`/`y` is saved to the DB and it no longer participates in the spiral formula.
- Newly added cards always get the spiral position for index `n = current card count`.

---

## 9. Frontend — Web App

### Page Structure

```
/                    → redirect to first collage, or empty state
/canvas/[collageId]  → the infinite canvas for one collage
```

### Layout (Desktop)

```
┌──────────────────────────────────────────────────────────┐
│ [≡] Punk Records          [+ Add Card]                   │  ← top bar
├───────────┬──────────────────────────────────────────────┤
│           │                                              │
│ Collages  │           Infinite Canvas                   │
│           │                                              │
│ • music   │    [card]      [card]                        │
│ • design  │         [card]       [card]                  │
│ • random  │    [card]                                    │
│           │                                              │
│           │                                              │
└───────────┴──────────────────────────────────────────────┘
```

The left sidebar lists collages pulled from `/api/collages`. Clicking one navigates to `/canvas/[collageId]`.

### Layout (Mobile)

On screens < 768px the sidebar collapses entirely. Navigation is handled by a **bottom tab bar**:

```
┌──────────────────────────┐
│     Punk Records     [+] │  ← thin top bar, + opens add sheet
├──────────────────────────┤
│                          │
│    Infinite Canvas       │
│                          │
│  [card]    [card]        │
│       [card]             │
│                          │
│                          │
├──────────────────────────┤
│  [music] [design] [more] │  ← bottom tab bar (max 3 visible + overflow)
└──────────────────────────┘
```

- Bottom tab bar shows up to 3 collages; a "more" button opens a full-screen drawer listing all collages.
- The `[+]` button in the top bar opens a **bottom sheet** for adding a card (see below).
- React Flow's built-in touch handlers manage pinch-to-zoom and one-finger pan.

### Cards on Canvas

Cards are React Flow custom nodes. Two visual variants:

**LINK card (with OG data)**
```
┌────────────────────────────────┐
│ [thumbnail image]              │
├────────────────────────────────┤
│ [favicon] youtube.com          │
│ My Favourite Video Title       │
│ Short description text here... │
└────────────────────────────────┘
```

**NOTE card**
```
┌────────────────────────────────┐
│                                │
│  Look into generative music    │
│  with Markov chains            │
│                                │
└────────────────────────────────┘
```

**LINK card (OG still loading)**
```
┌────────────────────────────────┐
│  [shimmer skeleton]            │
│  [shimmer skeleton]            │
│  [shimmer]                     │
└────────────────────────────────┘
```

Cards have a small `×` delete button visible on hover (desktop) or long-press (mobile).

### Adding a Card from the Web App

Tapping `[+]` opens a bottom sheet (mobile) or a centered modal (desktop):

```
┌──────────────────────────────┐
│  Add to music inspo          │
│                              │
│  ○ Link   ● Note             │  ← toggle
│                              │
│  [paste a URL or type here ] │  ← single textarea
│                              │
│  [     Add Card     ]        │
└──────────────────────────────┘
```

- If the input starts with `http` it's treated as a LINK card, otherwise a NOTE.
- Or the user can explicitly toggle. 
- On mobile, the sheet slides up over the keyboard so the input is always visible.

### Empty State
When a collage has no cards yet, the canvas shows a centered message:
```
Drop a link in #canvas-music-inspo on Discord,
or tap + to add your first card.
```

### React Flow Config
- `nodesDraggable: true` — drag to reposition, fires PATCH on drag end
- `panOnDrag: true` with touch support enabled
- `zoomOnPinch: true`
- `minZoom: 0.1`, `maxZoom: 2`
- `fitView` on initial load to center all existing cards
- Background: subtle dot grid pattern (React Flow built-in)

---

## 10. Mobile UX Considerations

These are first-class requirements, not afterthoughts:

1. **Touch targets** — all interactive elements minimum 44×44px.
2. **Bottom sheet** — the add card form slides up from the bottom, never a centered modal on mobile. Bottom sheets feel native on both iOS and Android.
3. **Keyboard avoidance** — the add sheet adjusts when the soft keyboard opens so the input field stays visible. Use CSS `env(keyboard-inset-height)` or a JS listener.
4. **No hover-only UI** — anything shown on hover on desktop must also be accessible via long-press or a visible tap target on mobile.
5. **Scroll vs. pan conflict** — React Flow handles this natively; the canvas captures touch events, so the bottom tab bar must be outside the React Flow container to avoid conflicts.
6. **Fast load** — cards are loaded and displayed before OG images arrive (skeleton → fill-in pattern). Canvas is usable immediately.
7. **Collage switcher overflow** — if the user has many collages, the bottom tab bar shows the 3 most recently used + "more". The "more" drawer is a full-height sheet with a search/filter input.

---

## 11. Project Structure (Monorepo)

```
punk-records/
├── packages/
│   ├── bot/                  # Discord bot
│   │   ├── src/
│   │   │   ├── index.ts      # Bot entry point
│   │   │   ├── events/       # messageCreate, channelCreate, etc.
│   │   │   └── sync.ts       # Startup reconciliation
│   │   └── package.json
│   │
│   ├── api/                  # Express backend
│   │   ├── src/
│   │   │   ├── index.ts      # Express + Socket.io entry
│   │   │   ├── routes/       # collages.ts, cards.ts
│   │   │   ├── services/     # og-scraper.ts, layout.ts
│   │   │   └── socket/       # event emitters
│   │   └── package.json
│   │
│   ├── web/                  # Next.js frontend
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   └── canvas/[collageId]/page.tsx
│   │   ├── components/
│   │   │   ├── Canvas.tsx
│   │   │   ├── cards/        # LinkCard.tsx, NoteCard.tsx
│   │   │   ├── AddCardSheet.tsx
│   │   │   ├── CollageNav.tsx
│   │   │   └── BottomTabBar.tsx
│   │   └── package.json
│   │
│   └── shared/               # Shared TypeScript types + Prisma client
│       ├── prisma/
│       │   └── schema.prisma
│       └── src/
│           └── types.ts      # Card, Collage, socket event types
│
├── CLAUDE.md
├── DESIGN.md
└── package.json              # Workspace root (npm workspaces)
```

---

## 12. Environment Variables

```
# Discord
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=

# Database
DATABASE_URL=postgresql://...

# API
PORT=3001
API_URL=http://localhost:3001    # used by web app

# Web
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

---

## 13. Deployment

Since this is a personal tool, a single cheap VPS works fine.

**Recommended**: [Railway](https://railway.app) — deploy three services (bot, api, web) from the monorepo with one config file each. Railway provides a managed PostgreSQL instance. Total cost ~$5–10/month.

**Alternative**: Single DigitalOcean droplet ($6/month), run all three processes with PM2, self-managed Postgres.

The Discord bot must be always-on — it cannot be serverless. The API and web app can be serverless (Vercel for web, Railway for API) but a single VPS is simpler.
