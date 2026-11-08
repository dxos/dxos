# @dxos/echo-sqlite-demo

A graph database in the browser. `@dxos/echo-sqlite` runs on the device over OPFS, and a Durable
Object per space fronts R2 to hold the authoritative copy.

Built to answer one question a developer asks: **what do I write to get this?** Composer shows what
ECHO can carry; this shows the surface area. The whole data model is
[`src/schema.ts`](./src/schema.ts) — two types and a reference — and the app is one component.

## What it demonstrates

| Property | Where to look |
| --- | --- |
| Reads and writes never touch the network | type in the list with the network off |
| A graph, not tables | `PersonRow`'s `useResolveRef(person.employer)` — one row loaded, not the space |
| Reactive queries compiled to SQL | `useQuery(db, Filter.type(Person))`, one `WITH RECURSIVE` statement |
| Full-text search on the device | the search box — trigram FTS5, in the browser |
| Opening costs the same at any size | `openDatabase` reads only persisted type rows |

## What it does not demonstrate

**Persistence, not replication.** Push uploads the whole SQLite file and pull replaces it, so the
last writer wins and a concurrent edit elsewhere is lost. Real convergence is the feed protocol
against an `echo-sqlite` instance inside the Durable Object — see
`.agents/projects/echo-cloudflare-demo/DESIGN.md`, D-1 and D-4.

## Architecture

```text
 browser (main thread)                      Cloudflare
┌────────────────────────────────┐        ┌──────────────────────────────┐
│ React  ─ useQuery / useObject  │        │ Worker                       │
│   │                            │        │  ├─ /api/* ──▶ SpaceObject   │
│ SqliteDatabase (@dxos/echo-    │  PUT   │  │              (one per     │
│   sqlite): query compiler,     ├───────▶│  │               space)      │
│   hydration, reactivity        │  GET   │  │                 │         │
│   │ postMessage               ◀├────────┤  │                 ▼         │
│ OPFS worker ─ SQLite + FTS5    │        │  └─ assets      R2 bucket    │
└────────────────────────────────┘        └──────────────────────────────┘
```

SQLite runs in a worker because OPFS sync access handles exist only there. Everything above it stays
on the main thread, which is what lets `@dxos/echo-react` bind to the database with no bridge — the
hooks take a `Database.Queryable`, so they work against this backend unchanged.

## Run it

```bash
moon run echo-sqlite-demo:serve
```

Needs Chrome, Edge or Safari 17+ for OPFS in a dedicated worker. A private window may block origin
storage. The push/pull buttons need the Worker, so use `wrangler dev` for those:

```bash
moon run echo-sqlite-demo:bundle && pnpm exec wrangler dev
```

## Deploy

```bash
moon run echo-sqlite-demo:bundle && pnpm exec wrangler deploy -c packages/apps/echo-sqlite-demo/wrangler.jsonc
```

Graphs live in a Durable Object per slug and are deleted 24 hours after creation.
