# echo-cloudflare-demo — Design

A deployable React demo that builds an ECHO graph with `@dxos/echo-sqlite`, with a Durable Object
holding the authoritative copy. Built for the Cloudflare conversation: the artifact that shows what a
developer writes, as opposed to Composer, which shows what ECHO can carry.

Ledger: [TASKS.md](./TASKS.md). Positioning context: `temp/echo-cloudflare-positioning.md`
(gitignored — `dxos/dxos` is public and the context is an acquisition discussion).

## Goal

`npm create` → a React app → `wrangler deploy`, in under 100 lines of user code, with no Composer
plugin framework anywhere in it. The demo must show a *graph* (schema, refs, traversal, full-text),
not a table.

## Architecture

**Decision D-1: the browser holds the graph; the DO holds the authoritative copy.** Rejected the two
alternatives:

| Option                                | Proves                                           | Why not (for the first cut)                                        |
| ------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| **Chosen** — browser graph, DO persists | local reads/writes, offline, adoptability        | no multi-client convergence; labelled *persistence, not replication* |
| Thin client on the DO                 | ECHO as a graph DB on DO SQLite                  | needs a remote `Database.Queryable` proxy; doesn't prove offline    |
| Both halves, feed-style sync          | the real product                                 | that is gap E — a project, not a demo                              |

Three reasons the first option won: it shares no code with the subduction path that finding 6 is
failing nightly, so it can be built while that is fixed; putting the database on the device is the
one thing Cloudflare has no answer for, whereas "a graph database in a DO" is a story they can
already tell with D1; and it ends with the same `echo-sqlite` running in both runtimes, which is the
increment toward feed-based sync rather than a detour from it.

**Decision D-2: ECHO runs on the main thread, OPFS runs in a worker.** `OpfsConfig` in
`@dxos/sql-sqlite` is documented "worker-only, no MessagePort" — it uses `AccessHandlePoolVFS`,
which needs OPFS sync access handles, and those exist only in a worker. Two shapes were possible:

- `SqliteDatabase` *inside* the worker via `layerOpfs`, bridging the ECHO `Database` API to the main
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
`echo-host`'s 1,678-line compiler consumes a *planned* pipeline (`SelectStep`, `FilterStep`,
`FilterDeletedStep`, `TraverseStep`, `AggregateStep`, …) produced by a planner stage `echo-sqlite`
does not have.

The shared surface is the filter vocabulary — roughly twenty node types (`and`, `or`, `not`, `eq`,
`neq`, `compare`, `range`, `in`, `contains`, `text-search`, `tag`, `annotation`, `property`,
`object`, `natural`, `mnemonic`, `rank`, `has-parent`, `child-of`, `in-query`, `feed-cursor`,
`timestamp`) hand-compiled in both. Counting db-service's 394-line JS copy of the filter *matcher*,
the filter semantics have **three** implementations.

This is a better position than "a forked planner" for the two-backends story, and a worse one than
"one shared compiler": the divergence risk is real and concentrated in those twenty node types.
Relevant to gap F in the positioning memo.
