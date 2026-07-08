# EnrichMailbox — cursored fact indexing over the mailbox feed

Date: 2026-07-07 · Part of DX-1078 (Email processing pipeline) · Branch `claude/lucid-vaughan-efcdee`

## Problem

The Gmail sync operation ingests remote messages into a `Mailbox` feed (a `@dxos/pipeline` `Stage`
chain committed via `SyncBinding`: source → dedup → paged commit + cursor advance). Separately,
`@dxos/pipeline-email`'s `EmailPipeline` can summarize messages, extract RDF facts, and build
threads. There is no mechanism that runs `EmailPipeline` (or a subset of it) over the messages that
sync has already landed in the feed.

We want a second operation that iterates the feed produced by the ingestion sync and runs a subset
of `EmailPipeline` — **initially just `extractFactsStage`** — while maintaining its own durable sync
state, so it processes incrementally rather than reprocessing the whole feed each run. The existing
`ExtractMailbox` operation crawls the feed but reads the *entire* feed every run (no cursor) and uses
imperative `Effect.forEach`, not the pipeline API; it is left untouched by this work.

## Goal

A unified data-processing mechanism: the new operation reuses the **same** `SyncBinding` lifecycle
(source stream → `dedupStage` → stages → `commit` + `advanceCursor`) that the remote sync uses, so
ingestion and downstream enrichment are one mechanism with two cursors, not two bespoke code paths.

## Architecture

```
[remote provider] --GmailSync-->  Feed (Message queue)  --EnrichMailbox-->  FactStore (SemanticStore)
                   cursor A                                       cursor B
```

- `GmailSync` unchanged: `source = Connection`, `target = Mailbox`, cursor A (provider `internalDate`).
- `EnrichMailbox` (new): reads the Mailbox feed as its source, runs `extractFactsStage`, writes facts
  to the space's `FactStore`, and advances its own cursor B.
- Both assemble from the shared `SyncBinding` machinery, confirmed source-agnostic today (`State`,
  `layer`, `commit`, `upsertCommit`, `dedupStage`, `advanceCursor` never reference `Connection`; each
  operation supplies its own source `Stream`, and the DB-target path with `feed?` omitted already
  exists for the contacts sync).

## Decisions

### D1/D2 — Sibling `DerivedBinding` relation type (shared lifecycle)

ECHO's `Type.makeRelation` types each endpoint as a **single** object-kind entity schema or the
branded `Obj.Unknown` — it does **not** accept a `Schema.Union(Connection, Feed)` endpoint (verified
against `packages/core/echo/echo/src/Type.ts:303`; no union-endpoint relation exists in the repo).

Therefore, rather than widening `SyncBinding.source` to `Obj.Unknown`, add a **sibling relation
type** with concrete, fully-typed endpoints:

- `DerivedBinding`: `source: Feed`, `target: Mailbox`, created as a child of the Mailbox (cascade
  behavior mirrors `SyncBinding.make`, which materializes a `Cursor` child).
- It **reuses** `SyncBinding`'s `layer` / `State` / `dedupStage` / `commit` / `advanceCursor`.
- `State.binding` is generalized to carry only what the machinery reads — the cursor (`{ cursor:
  Ref<Cursor> }` or an equivalent shared shape) — so both binding types share the machinery without a
  `Connection` dependency. This is the only change to `SyncBinding`'s shared code.
- `State.feed` is **omitted** for the derived binding: the feed is this operation's *source*, not an
  append target, so `seedDedupSet` (which reads the append-target feed) does not run. Deduplication
  is by cursor key only (see D3); `dedupSet` stays empty (the DB-target path).

Unification lives at the **lifecycle layer**, not the schema — both endpoints stay concrete.

### D3 — Cursor key = `message.created` (epoch-ms), as a documented workaround

`dedupStage` needs a monotonic `getKey(message)`; re-runs skip `key < cursorKey`.

ECHO's native feed/queue cursor is **not implemented**: `Feed.Cursor<T>` is an opaque marker
interface and `Feed.cursor()` is stubbed (`packages/core/echo/echo/src/Feed.ts` — "Currently stubbed
— cursor operations are not yet implemented"); the only `cursor?: string` is a *retention* option
with a `TODO(wittjosiah): Use FeedCursor from @dxos/feed`. Query results are plain `Obj` snapshots
with no per-item monotonic position surfaced on read.

So Phase 1 keys on `message.created` (epoch-ms), which is present on every message; feed append order
tracks ingestion's ascending `internalDate`, so it is monotonic in practice. **This is a workaround**
and must carry a prominent code comment pointing at the stubbed `Feed.cursor` / `@dxos/feed`
`FeedCursor` TODO, to be replaced with the native queue sequence once ECHO implements it.

### D4 — Commit-time fact write (page-atomic)

Faithful to the `SyncBinding` model ("stages produce commit units → `commit` writes + advances cursor
together"):

- Add a facts-**returning** stage variant that emits the extracted facts as the commit unit (the
  shared `extractFactsStage`, used by batch `EmailPipeline.run`, stays side-effecting — unchanged).
- Add a `factsCommit` sink that does `FactStore.putFacts(page) + advanceCursor` in a single flush,
  after `Stream.grouped(pageSize)`.

This makes progress page-atomic and crash-safe by page. `FactStore`'s per-source content-hash cursor
(`cursor`/`setCursor`, keyed by `messageSource`) remains a correctness backstop.

### D5 — Durable per-space SQLite `FactStore`

- **AiService:** reuse the existing operation pattern
  `ServiceResolver.provide({ space: spaceId }, AiService.AiService)` (as in `classify-email.ts` /
  `EditMessageArticle.tsx`), with the `ai-gate` unavailable-handling already in plugin-inbox.
- **FactStore:** use the durable `FactStore.layer` (SQLite via `@effect/sql/SqlClient` +
  `@effect/sql-sqlite-node`, file-backed per space) so facts **and** the cursor are durable and
  consistent (a durable cursor over an ephemeral store would skip facts that no longer exist).

**Constraint (browser gap):** the SQLite `FactStore.layer` is Node/worker-only — the browser has no
SQLite `SqlClient` (this is why `FactStore.layerMemory` exists, per `docs/AUDIT.md`). And there is
**no production `SqlClient` provider anywhere today** — per-space SQLite hosting is greenfield.

## Data flow

```
Feed.query(mailbox.feed, Filter.type(Message))
  → dedupStage(getForeignId = messageSource, getKey = message.created)
  → extractFactsStage'         // facts-returning variant (D4)
  → Stream.grouped(pageSize)
  → Pipeline.run({ sink: factsCommit })   // putFacts(page) + advanceCursor, per page

provide:
  - DerivedBinding State layer (feed omitted; cursor from binding.cursor)
  - FactStore.layer (per-space SQLite)      // Node/worker runtime
  - AiService via ServiceResolver.provide({ space }, AiService.AiService)
  - Database.Service
```

## Phasing

- **Phase 1 (this work):** `DerivedBinding` type + generalized `State.binding` + `EnrichMailbox`
  operation running `extractFactsStage` only. `ExtractMailbox` and the `ObjectExtractor` dispatch are
  untouched.
- **Phase 2 (later, out of scope):** add `summarize` / `threads`. These hit the immutable-feed-message
  constraint (`extract-message.ts`: feed messages are immutable Queue items — cannot be mutated or used
  as Ref/relation endpoints). Summaries become separate ECHO objects associated via
  `Mailbox.recordExtraction`; threads are a batch pass (they need the whole set, so cannot be a stage).
  `extractFactsStage` is chosen first precisely because it does **not** mutate the message.

## Primary risk / first planning task

Pin the **operation execution host** and the **per-space SQLite file location + `SqlClient` provider
layer**, which do not exist yet. Likely the `functions`/`edge` Node runtime (operations already run in
a separate process per `extract-message.ts`; the browser has no fs). If the host turns out to be
browser-only, D5 degrades to `FactStore.layerMemory` and the durable-cursor promise weakens — confirm
early, before building the operation.

## Testing

Extend the existing `packages/plugins/plugin-inbox/src/sync/sync.test.ts` pattern:

- Seed a feed with N messages via `db.appendToFeed`.
- Run `EnrichMailbox` with `FactStore.layerMemory` + a stub `AiService`.
- Assert facts indexed for each message and cursor B advanced.
- Re-run and assert zero reprocessing (items skipped by `key < cursorKey`).

## Out of scope

- Phase 2 stages (summarize/threads) and immutable-message enrichment plumbing.
- Retiring or migrating `ExtractMailbox` / the `ObjectExtractor` dispatch onto the pipeline API.
- Lifting the shared lifecycle out of `@dxos/plugin-connector` into `@dxos/pipeline` (possible future
  unification; not required here).
- Browser-side durable fact persistence (blocked on the SQLite/WASM browser gap in `docs/AUDIT.md`).
