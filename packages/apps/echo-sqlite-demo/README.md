# @dxos/echo-sqlite-demo

A graph database in the browser. `@dxos/echo-sqlite` runs on the device over OPFS, and a Durable
Object per space fronts R2 to hold the authoritative copy.

Built to answer one question a developer asks: **what do I write to get this?** Composer shows what
ECHO can carry; this shows the surface area. The whole data model is
[`src/schema.ts`](./src/schema.ts) — three types, a reference and a list of them — and every view is
driven by it: the icons, the type names, the forms and the graph's edges are all read off the schema.

## What it demonstrates

| Property | Where to look |
| --- | --- |
| Reads and writes never touch the network | type in the list with the network off |
| A graph, not tables | `person.employer` and `event.attendees` — the targets, not a join |
| Reactive queries compiled to SQL | `useQuery(db, Filter.type(Person))`, one `WITH RECURSIVE` statement |
| Full-text search on the device | the search box — trigram FTS5, in the browser |
| Opening costs the same at any size | `openDatabase` reads only persisted type rows |

## What it does not demonstrate

**Sync, not convergence.** Every object travels as a record the Durable Object versions, so the last
writer of a record wins and a concurrent edit to the same record is lost. Real convergence is the
feed protocol against an `echo-sqlite` instance inside the Durable Object — see
`.agents/projects/echo-cloudflare-demo/DESIGN.md`, D-1 and D-4.

**One tab per device.** An OPFS file is held by one tab, so a second tab on the same graph says so
rather than waiting on a handle it cannot have.

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
storage.

Sync needs the Durable Object, which the dev server does not host: without one every round trip is a
404 and the status light stays red. Run a worker beside it — the dev server proxies `/api` to 8787:

```bash
moon run echo-sqlite-demo:bundle && pnpm exec wrangler dev --port 8787
```

Or serve the built app from the worker alone, with no dev server:

```bash
moon run echo-sqlite-demo:bundle && pnpm exec wrangler dev
```

## Deploy

`--force`, because `@dxos/*` resolve from source and the task's inputs are this package's files: a
change in a library it imports leaves the bundle cached, and the deploy ships the previous build.

```bash
moon run echo-sqlite-demo:bundle --force && pnpm exec wrangler deploy -c packages/apps/echo-sqlite-demo/wrangler.jsonc
```

Graphs live in a Durable Object per slug and are deleted 24 hours after creation.
