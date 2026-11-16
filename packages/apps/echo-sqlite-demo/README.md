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
| A write reaches the other peers at once | one socket per client; the object broadcasts, nothing polls |
| A delete travels too | `db.remove` is a soft delete, and the row it leaves is sent as a tombstone |

## What it does not demonstrate

**Merge, not CRDT convergence.** Every object travels as a record. The Durable Object stamps each
accepted write with its next sequence number, and refuses a push whose records it has moved on
from; the client pulls what it missed, merges it field by field into its own edits, and pushes
again. Concurrent edits to different fields both survive; to the same field, the push that lands
last wins — but only after its writer has seen what it overwrites. No wall clock is involved. The
protocol is described in [`@dxos/echo-sync-worker`](../../core/echo/echo-sync-worker). Real
convergence is the feed protocol against an `echo-sqlite` instance inside the Durable Object — see
`.agents/projects/echo-cloudflare-demo/DESIGN.md`, D-1, D-4 and D-6.

**One tab per device.** An OPFS file is held by one tab, so a second tab says so rather than waiting
on a handle it cannot have, and opens by itself once the first one closes. Turso's browser build has
the same limit (an exclusive OPFS handle per file), so switching engines does not lift it.

## Architecture

```text
 browser (main thread)                      Cloudflare
┌────────────────────────────────┐        ┌──────────────────────────────┐
│ React  ─ useQuery / useObject  │        │ Worker                       │
│   │                            │        │  ├─ /api/* ──▶ SpaceObject   │
│ SqliteDatabase (@dxos/echo-    │  push  │  │              (one per     │
│   sqlite): query compiler,     ├───────▶│  │               space)      │
│   hydration, reactivity        │ records│  │                 │         │
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

The sync server deploys on its own from
[`@dxos/echo-sync-worker`](../../core/echo/echo-sync-worker) — it has a "Deploy to Cloudflare"
button. Build the app against it with `VITE_SYNC_URL=https://<worker>`.

To deploy the app and the server as one Worker:

`--force`, because `@dxos/*` resolve from source and the task's inputs are this package's files: a
change in a library it imports leaves the bundle cached, and the deploy ships the previous build.

```bash
moon run echo-sqlite-demo:bundle --force && pnpm exec wrangler deploy -c packages/apps/echo-sqlite-demo/wrangler.jsonc
```

Graphs live in a Durable Object per slug and are deleted 24 hours after creation.
