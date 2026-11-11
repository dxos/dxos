# echo-cloudflare-demo — Design

A deployable React demo that builds an ECHO graph with `@dxos/echo-sqlite`, with a Durable Object
holding the authoritative copy. Built for the Cloudflare conversation: the artifact that shows what a
developer writes, as opposed to Composer, which shows what ECHO can carry.

Ledger: [TASKS.md](./TASKS.md). Positioning context: `temp/echo-cloudflare-positioning.md`
(gitignored — `dxos/dxos` is public and the context is an acquisition discussion).

## Goal

`npm create` → a React app → `wrangler deploy`, in under 100 lines of user code, with no Composer
plugin framework anywhere in it. The demo must show a _graph_ (schema, refs, traversal, full-text),
not a table.

## Architecture

**Decision D-1: the browser holds the graph; the DO holds the authoritative copy.** Rejected the two
alternatives:

| Option                                  | Proves                                    | Why not (for the first cut)                                          |
| --------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| **Chosen** — browser graph, DO persists | local reads/writes, offline, adoptability | no multi-client convergence; labelled _persistence, not replication_ |
| Thin client on the DO                   | ECHO as a graph DB on DO SQLite           | needs a remote `Database.Queryable` proxy; doesn't prove offline     |
| Both halves, feed-style sync            | the real product                          | that is gap E — a project, not a demo                                |

Three reasons the first option won: it shares no code with the subduction path that finding 6 is
failing nightly, so it can be built while that is fixed; putting the database on the device is the
one thing Cloudflare has no answer for, whereas "a graph database in a DO" is a story they can
already tell with D1; and it ends with the same `echo-sqlite` running in both runtimes, which is the
increment toward feed-based sync rather than a detour from it.

**Decision D-2: ECHO runs on the main thread, OPFS runs in a worker.** `OpfsConfig` in
`@dxos/sql-sqlite` is documented "worker-only, no MessagePort" — it uses `AccessHandlePoolVFS`,
which needs OPFS sync access handles, and those exist only in a worker. Two shapes were possible:

- `SqliteDatabase` _inside_ the worker via `layerOpfs`, bridging the ECHO `Database` API to the main
  thread. Rejected: that is the client/host split `@dxos/echo-client` already is, rebuilt.
- `SqliteDatabase` on the **main thread** over `SqliteClient.layer({ worker })`, with SQL crossing
  postMessage. **Chosen** — the query compiler, object hydration, reactivity and `QueryResult` all
  stay next to React, so `@dxos/echo-react` binds directly with no new code.

The cost is a postMessage round trip per statement. Worth measuring against `BENCHMARKS.md`'s native
numbers (0.44 ms for a typed query, 0.22 ms for a cold ref load) before the demo claims a latency
figure.

## Why the React layer is free

`@dxos/echo-react` depends on `@dxos/echo` and `@effect/atom-react` only — not `@dxos/client`, not
`@dxos/react-client`. `useQuery` takes an interface:

```ts
useQuery(resource: Database.Queryable | undefined, query)
```

and `echo-sqlite`'s `LiveQueryResult` already implements `QueryResult` with `subscribe`, `runSync`
and an `atom`. So the hooks work against `echo-sqlite` unchanged, wherever it runs.

## Why the DO half is nearly free

`@effect/sql-sqlite-do` wraps a Durable Object's `ctx.storage.sql` as an effect `SqlClient`, and is
already in production in edge's `db-service`:

```ts
this._layer = SqliteDoClient.SqliteClient.layer({ storage: state.storage });
```

`echo-sqlite` consumes only the generic `SqlClient.SqlClient` — `@effect/sql-sqlite-node` is a
devDependency used by tests and benches. So it is driver-agnostic by construction, and composing the
two gives a full ECHO `Database.Service` inside a DO.

## Deployment

The `CLOUDFLARE_API_TOKEN` in this environment grants the **DXOS** account
(`950816f3f59b079880a1ae33fb0ec320`) — the same account that hosts production EDGE workers.
Guardrails, since the demo lands beside production:

- A distinct worker name (`echo-sqlite-demo`), no `env` blocks, so it cannot shadow or collide with
  an existing worker.
- A new DO class name and namespace, so migration tags cannot collide.
- No changes to any existing worker, binding or `wrangler.jsonc`.
- Reachable on `*.workers.dev`, which is public by default.

## Decision D-4: the server stores bytes, not objects

With the workerd spike parked (TASKS.md risk 10), the DO cannot run `echo-sqlite` yet — and for
option 1 it does not need to. The browser owns the graph; the server's whole job is to hold the
authoritative copy of the exported SQLite file.

So: **a Durable Object per space, fronting R2.** The DO is the per-space authority — one writer,
serializing uploads and handing out the current version — and R2 holds the bytes. Not DO storage:
its key-value values cap at 128 KiB, and DO SQLite would need the file chunked across rows, where
R2 takes a whole object.

That keeps the Cloudflare story intact (a space is a Durable Object, exactly as in option 3) without
waiting on the harness, and it is honest about what it is: **persistence, not replication**. When
risk 10 clears, the same DO gains an `echo-sqlite` instance over `ctx.storage.sql` and the transport
becomes feed-based sync — option 3 — without the client changing.

## Decision D-5: two-way sync, with the Durable Object as version authority

Supersedes D-1's "persistence, not replication" and D-4's whole-file transport. Requested
2026-11-08: a slug in the URL names a graph, created on demand, syncing both ways by default, and
expiring after 24 hours.

**Rows, not files, with per-object versions assigned by the DO.** The DO keeps its own SQLite table
of `(key, version, deleted, typename, props, refs)` plus a monotonic counter — `refs` is its own
column because an edge names another record's key rather than being a value. Two transports reach
it, and both go through the same apply:

```
WS   /api/space/:slug/socket  ← hello { since } | push { records[] }  →  records { version, records[] }
POST /api/space/:slug/sync      { since, records[] }                  →  { version, records[] }
```

The socket is the normal path: the object broadcasts every write to every connected client, the
sender included, so a change reaches the other peers at once and an idle graph costs nothing
(hibernation). The POST remains for a peer that cannot hold a socket open, and for a script; its
writes are broadcast too. A delete travels as a tombstone — `db.remove` is a soft delete, and the
row it leaves is read back and sent like any other record.

The client sends the records it has changed since its last sync and the version it last saw; the DO
applies them (assigning each a new version), then returns everything above `since`. Conflicts are
last-writer-wins per object, and the DO's version order _defines_ "last" — which is the feed
protocol's position authority applied to objects instead of blocks, so this is a step toward
option 3 rather than a detour from it.

**Identity travels as a foreign key, not the ECHO id.** `Obj.make` mints its own id and takes no
`id` option, so two instances cannot share one. ECHO's own mechanism for correlating objects across
sources is `Obj.Meta.keys`, and echo-sqlite supports filtering on meta keys — so each synced object
carries `{ source: 'echo-sqlite-demo', id: <uuid> }` and sync matches on that.

This also solves a problem the file transport did not have: remote changes must land **through the
ECHO API** (`db.add` / `Obj.update`), not by writing `echo_entities` behind the database's back.
echo-sqlite invalidates queries from its own commits only, so raw-SQL imports would never reach the
UI. Going through the API means the existing `useQuery` subscriptions just update.

Refs are applied in two passes — nodes, then edges — since an edge's target may arrive in the same
batch.

**R2 is dropped.** Rows live in the DO's own SQLite (10 GB), so the bucket
`echo-sqlite-demo-spaces` is now unused and can be deleted. Expiry is a DO alarm set 24 hours out
on first write, which calls `deleteAll` on its own storage.

## Decision D-6: sequence numbers and compare-and-set, not arrival order

Requested 2026-11-10. Supersedes D-5's conflict rule.

**Two counters, no clocks.** The DO keeps one `seq` per graph and stamps each accepted write with the
next one. Each client keeps its own `clientSeq`, which numbers its pushes, so the DO can apply a retried
push once.

**Pull → merge → push.** Every pushed record carries `base`, the `seq` of the version it was edited
on. The DO applies a push only if every `base` is still current, all or nothing. If one is stale, the
DO applies nothing and answers with the records the client missed. The client merges them three-way
(base, local, remote) field by field, and pushes again. A delete on either side wins.

Under D-5 the DO applied every push in arrival order, so a client could overwrite a version it never
saw. Now the last write still wins, but only after its writer has seen what it overwrites, and edits
to different fields of one record both survive.

**The DO is its own package, `@dxos/echo-sync-worker`,** with no dependencies outside its directory,
so the "Deploy to Cloudflare" button can clone and build it alone. The client imports the protocol
from it.

**Two tabs are still out of scope.** Turso's browser build (`@tursodatabase/database-wasm` 0.8.3
and 0.9.0-pre.2) opens each OPFS file with an exclusive sync access handle and needs cross-origin
isolation for its thread pool, so it has the same one-tab limit as wa-sqlite. A file per tab would
work, but was declined.

## Open questions

- **Q-1** Does `echo-sqlite` need synchronous SQL anywhere? The README says `runSync()` "never
  blocks", and it uses `SqlClient` rather than the sync `Storage` interface, so it should not — but
  `transactionSync` exists on `Storage` and the worker protocol's transaction support is unverified.
- **Q-2** Does the browser wa-sqlite build include FTS5? `echo-sqlite` compiles text queries to
  trigram FTS5; without it, `Filter.text` breaks in the browser. The spike tests this directly.
- **Q-3** Can the export/import transport reuse `@dxos/sql-sqlite/SqlExport` and `OpfsPool`'s
  `readDatabase`/`writeDatabase`/`wipe` (which work on the main thread), rather than new code?

## Findings so far

**F-1 — the two query compilers are independent implementations, not a fork.** They work at
different AST levels: `echo-sqlite`'s 572-line compiler goes straight from the Query AST
(`select`, `filter`, `from`, `union`, `set-difference`, `order`, `aggregate`) to one statement, while
`echo-host`'s 1,678-line compiler consumes a _planned_ pipeline (`SelectStep`, `FilterStep`,
`FilterDeletedStep`, `TraverseStep`, `AggregateStep`, …) produced by a planner stage `echo-sqlite`
does not have.

The shared surface is the filter vocabulary — roughly twenty node types (`and`, `or`, `not`, `eq`,
`neq`, `compare`, `range`, `in`, `contains`, `text-search`, `tag`, `annotation`, `property`,
`object`, `natural`, `mnemonic`, `rank`, `has-parent`, `child-of`, `in-query`, `feed-cursor`,
`timestamp`) hand-compiled in both. Counting db-service's 394-line JS copy of the filter _matcher_,
the filter semantics have **three** implementations.

This is a better position than "a forked planner" for the two-backends story, and a worse one than
"one shared compiler": the divergence risk is real and concentrated in those twenty node types.
Relevant to gap F in the positioning memo.

**F-2 — end-to-end encryption looks more reachable than the memo assumed.** The memo's §3.A worried
that sealing commit payloads would break subduction's own sync, because the engine might need to
parse a commit to find its dependencies. The evidence so far points the other way: the server
already treats the payload as opaque bytes.

db-service's Durable Object schema
(`packages/services/db-service/src/worker/subduction/do-sedimentree-storage.ts`) is:

| Table           | Columns                                                     |
| --------------- | ----------------------------------------------------------- |
| `SedimentreeId` | `id`                                                        |
| `Commit`        | `sedimentree_id`, `commit_id`, `signed`, **`blob`**         |
| `Fragment`      | `sedimentree_id`, `fragment_head`, `signed`, **`blob`**     |
| `Heads`         | `sedimentree_id`, `heads` (sorted 32-byte ids concatenated) |
| `HeadsDirty`    | `sedimentree_id`, `mark`                                    |

Identity (`commit_id` / `fragment_head`), signature (`signed`) and payload (`blob`) are already
three separate columns. Three further signals:

- The upstream storage types are `CommitWithBlob` and `FragmentWithBlob` — the naming implies a
  commit _without_ a blob is a first-class value in `@automerge/automerge-subduction`.
- `StoredFragmentRecord` is documented as "One `Fragment` row as raw bytes, **without its blob**",
  so the server routinely handles records with the payload omitted.
- The heads index (`heads-index.ts`, 71 lines) holds no blob, parent or decode logic of its own: it
  delegates to a `ComputeHeads` callback, one WASM call per dirty tree.

So the open question is narrower than "can subduction carry sealed payloads" — it is **does the
Rust engine read the `blob` column to compute heads, or only `commit_id` and `signed`.** The Rust is
not vendored in either repo (`vendor/` holds hypercore, hyperformula, kbn-handlebars and quickjs;
`@automerge/automerge-subduction` resolves from the registry), so answering it means reading
`inkandswitch/subduction`'s `subduction_core` commit type upstream.

If the dependency edges live in `signed` or are derivable from the ids, E2E spaces reduce to
extending `@dxos/feed`'s existing `Cypher` (AES-256-GCM, per-block nonce, id bound as AAD,
WebCrypto-only) over the `blob` column and keying it from HALO instead of the operator KEK — a
contained change rather than a protocol fork. That would make the memo's §3.A materially cheaper
than it currently claims, and it is worth correcting there either way.
