# EnrichMailbox — cursored fact indexing over the mailbox feed

Date: 2026-07-07 · Part of DX-1078 (Email processing pipeline) · Branch `claude/lucid-vaughan-efcdee`

## Problem

The Gmail sync operation ingests remote messages into a `Mailbox` feed (a `@dxos/pipeline` `Stage`
chain committed via `SyncBinding`: source → dedup → paged commit + cursor advance). Separately,
`@dxos/pipeline-email`'s `EmailPipeline` can summarize messages, extract RDF facts, and build
threads. There is no mechanism that runs `EmailPipeline` (or a subset of it) over the messages that
sync has already landed in the feed, and no UI to view the extracted facts against a Mailbox.

We want a second operation that iterates the feed produced by the ingestion sync and runs a subset
of `EmailPipeline` — **initially just `extractFactsStage`** — while maintaining its own sync state,
plus a **Mailbox companion surface** that renders the extracted facts. The existing `ExtractMailbox`
operation crawls the feed but reads the *entire* feed every run (no cursor) and uses imperative
`Effect.forEach`, not the pipeline API; it is left untouched by this work.

## Goal

A unified data-processing mechanism: the new operation reuses the **same** `SyncBinding` lifecycle
(source stream → `dedupStage` → stages → `commit` + `advanceCursor`) that the remote sync uses, so
ingestion and downstream enrichment are one mechanism with two cursors. Facts flow into a **shared
per-space `FactStore`** that is both written by the operation (via the `FactIndexer` closure passed
to the pipeline) and read by a Mailbox companion surface's `FactViewer`.

## Runtime findings (resolved risk)

plugin-inbox operations execute on the **browser main thread** in Composer — the `ProcessManager`
runtime is built in a main-thread capability (`app-framework/.../process-manager-capability.ts:117`,
IndexedDB-backed), and `Database.Service` is reached through the client proxy to the ECHO SharedWorker
(`plugin-client/.../layer-specs.ts:64`), not local `fs`. Operations are resolved their declared
services at spawn via `ServiceResolver.resolveAll` (`compute-runtime/.../ProcessManager.ts:555`).

Consequences:

- The operation and React run in the **same JS context**, so a plugin **capability** holding a
  per-space `FactStore` singleton can be *both* injected into the operation (the `FactIndexer` closes
  over it) *and* read by the companion surface (`useCapability`). This is the sharing mechanism.
- `@effect/sql-sqlite-node` (what `FactStore.layer`'s tests use) is native/Node-only and cannot load
  in the browser — so that specific SQLite path is unavailable in-process.
- Browser-persistent SQLite *is* otherwise available and is the DXOS-native pattern via
  `@dxos/sql-sqlite` (`@effect/sql-sqlite-wasm` + wa-sqlite/OPFS; Composer/ECHO already persist this
  way). Its OPFS sync-access VFS must run in a **Worker**, so it is not a main-thread in-process
  singleton — it is reached via an async worker-hosted client. See "Future: durability" below.

## Decisions

### D1/D2 — Sibling `DerivedBinding` relation type (shared lifecycle)

ECHO's `Type.makeRelation` types each endpoint as a **single** object-kind entity schema or the
branded `Obj.Unknown` — it does **not** accept a `Schema.Union(Connection, Feed)` endpoint (verified
against `packages/core/echo/echo/src/Type.ts:303`; no union-endpoint relation exists in the repo).

Therefore add a **sibling relation type** with concrete, fully-typed endpoints, rather than widening
`SyncBinding.source`:

- `DerivedBinding`: `source: Feed`, `target: Mailbox`, created as a child of the Mailbox (mirrors
  `SyncBinding.make`, which materializes a `Cursor` child).
- It **reuses** `SyncBinding`'s `layer` / `State` / `dedupStage` / `commit` / `advanceCursor`.
- `State.binding` is generalized to carry only what the machinery reads — the cursor — so both binding
  types share the machinery without a `Connection` dependency. This is the only change to
  `SyncBinding`'s shared code.
- `State.feed` is **omitted** for the derived binding: the feed is this operation's *source*, not an
  append target, so `seedDedupSet` (reads the append-target feed) does not run. Deduplication is by
  cursor key only (D3); `dedupSet` stays empty (the existing DB-target path).

Unification lives at the **lifecycle layer**, not the schema — both endpoints stay concrete.

### D3 — Cursor key = `message.created` (epoch-ms), as a documented workaround

`dedupStage` needs a monotonic `getKey(message)`; re-runs skip `key < cursorKey`.

ECHO's native feed/queue cursor is **not implemented**: `Feed.Cursor<T>` is an opaque marker and
`Feed.cursor()` is stubbed (`packages/core/echo/echo/src/Feed.ts` — "Currently stubbed — cursor
operations are not yet implemented"); the only `cursor?: string` is a *retention* option with
`TODO(wittjosiah): Use FeedCursor from @dxos/feed`. Query results are plain `Obj` snapshots with no
per-item position surfaced on read.

So Phase 1 keys on `message.created` (epoch-ms), present on every message; feed append order tracks
ingestion's ascending `internalDate`, so it is monotonic in practice. **This is a workaround** and
must carry a prominent code comment pointing at the stubbed `Feed.cursor` / `@dxos/feed` `FeedCursor`
TODO, to be replaced with the native queue sequence once ECHO implements it.

### D4 — Commit-time fact write (page-atomic)

Faithful to the `SyncBinding` model ("stages produce commit units → `commit` writes + advances cursor
together"):

- Add a facts-**returning** stage variant that emits extracted facts as the commit unit (the shared
  `extractFactsStage`, used by batch `EmailPipeline.run`, stays side-effecting — unchanged).
- Add a `factsCommit` sink that does `FactStore.putFacts(page) + advanceCursor` in a single flush,
  after `Stream.grouped(pageSize)`. Page-atomic, crash-safe by page.

`FactStore`'s per-source content-hash cursor (`cursor`/`setCursor`, keyed by `messageSource`) remains
a correctness backstop.

### D5 — Shared in-memory `FactStore` capability (Phase 1)

- **Store:** a plugin-inbox **capability** holding a per-space `FactStore` built from
  `FactStore.layerMemory` (browser-safe, no `SqlClient`). One instance per space, created lazily.
- **Writer:** `EnrichMailbox` receives this `FactStore` as an injected service (a space-affinity
  `LayerSpec` that returns the shared instance) and builds the `FactIndexer` closure over it +
  `AiService`; the closure is passed to `extractFactsStage`/`factsCommit`.
- **Reader:** the Mailbox companion surface reads the same capability and passes
  `FactStore.query(...)` results to `FactViewer` as `facts`.
- **AiService:** declared on the operation (`services: [AiService.AiService, …]`, resolved at spawn),
  as `classify-email.ts` does; the `ai-gate` handles unavailability.
- **Durability caveat:** `layerMemory` is not persistent, so facts are lost on reload. To keep cursor
  and store lifetimes consistent (a durable cursor over an ephemeral store would skip lost facts),
  Phase 1 treats `cursorKey` as **0 at session start** (re-crawl the feed once per session); the
  persisted `DerivedBinding` cursor still advances within a session for intra-session incremental
  skip. This reset is removed once the store is durable (below).

### D6 — Mailbox companion surface hosting `FactViewer`

- `FactViewer` (`stories-brain/.../FactViewer/FactViewer.tsx`) is **pure/presentational**:
  `{ facts: RDF.Fact[]; context?; predicate? }`, plus supporting helpers in stories-brain's
  `components/types`. It is **relocated** to a plugin-consumable package (new
  `@dxos/react-ui-fact-viewer`, React + `@dxos/pipeline-rdf`), and stories-brain is updated to import
  from there (no re-export shim, per repo rules).
- Add a companion surface in `plugin-inbox/.../react-surface.tsx` via
  `AppSurface.companion(AppSurface.Article, Mailbox.Mailbox)` (matching the existing Calendar/event
  companion pattern). Its container resolves the space's `FactStore` capability, queries facts for the
  mailbox, and renders `FactViewer`. Reactive refresh (re-query as the pipeline writes) can be a
  simple poll/subscription; deep reactivity is a follow-up (see the prior "factviewer not updated
  until pipeline completes" concern).

## Data flow

```
Feed.query(mailbox.feed, Filter.type(Message))
  → dedupStage(getForeignId = messageSource, getKey = message.created)   // cursorKey = 0 in Phase 1
  → extractFactsStage'                       // facts-returning variant (D4)
  → Stream.grouped(pageSize)
  → Pipeline.run({ sink: factsCommit })      // FactStore.putFacts(page) + advanceCursor, per page

provide (operation services, resolved at spawn):
  - DerivedBinding State layer (feed omitted; cursor from binding.cursor)
  - FactStore (shared per-space capability, layerMemory)   // ← also read by the companion surface
  - AiService (space-affinity LayerSpec) + ai-gate
  - Database.Service (client proxy)

UI:
  Mailbox companion surface → useCapability(FactStore) → FactStore.query → <FactViewer facts=… />
```

## Phasing

- **Phase 1 (this work):** `DerivedBinding` + generalized `State.binding`; `extractFactsStage'` +
  `factsCommit`; `EnrichMailbox` operation running facts only; shared in-memory `FactStore`
  capability; relocate `FactViewer`; Mailbox companion surface. `ExtractMailbox` and the
  `ObjectExtractor` dispatch untouched.
- **Phase 2 (later, out of scope):** add `summarize` / `threads`. These hit the immutable-feed-message
  constraint (`extract-message.ts`: feed messages are immutable Queue items — cannot be mutated or used
  as Ref/relation endpoints). Summaries become separate ECHO objects associated via
  `Mailbox.recordExtraction`; threads are a batch pass (need the whole set, so not a stage).
  `extractFactsStage` is first precisely because it does **not** mutate the message.

## Future: durability (run the operation in a Worker)

`FactStore.layerMemory` is a deliberate Phase-1 simplification. Durable, browser-native persistence is
available via `@dxos/sql-sqlite` (`@effect/sql-sqlite-wasm` + wa-sqlite/OPFS — the same path Composer
and ECHO already use). Its OPFS sync-access VFS must run in a **Worker**, so the durable path implies
**running `EnrichMailbox` in a worker** (its own OPFS-hosted `SqlClient`, or sharing ECHO's SQLite
worker), with the main-thread `FactViewer` reading via `@dxos/sql-sqlite`'s `OpfsPool` async reads
(which are safe alongside an open OPFS worker). At that point `FactStore.layer` (SQLite) replaces
`layerMemory`, the Phase-1 `cursorKey = 0` reset (D5) is removed, and the `DerivedBinding` cursor
becomes genuinely durable. This is the natural home for the operation long-term (feed-crawling + LLM
extraction is background/batch work); it is deferred here to keep Phase 1 shippable in-process.

## Testing

Extend the existing `packages/plugins/plugin-inbox/src/sync/sync.test.ts` pattern:

- **Operation:** seed a feed with N messages via `db.appendToFeed`; run `EnrichMailbox` with
  `FactStore.layerMemory` + a stub `AiService` (deterministic `FactIndexer`); assert facts indexed per
  message and the cursor advanced; re-run within the same store asserts zero reprocessing (items
  skipped by `key < cursorKey`).
- **Machinery:** unit-test `DerivedBinding` + generalized `State.binding` (cursor read/advance) and
  `factsCommit` (putFacts + advance in one flush) against `FactStore.layerMemory`.
- **FactViewer relocation:** the moved component keeps its existing story; add a smoke render.
- **Companion surface:** a container test that, given a `FactStore` with seeded facts, renders
  `FactViewer` with the queried facts for a mailbox.

## Out of scope

- Phase 2 stages (summarize/threads) and immutable-message enrichment plumbing.
- Retiring or migrating `ExtractMailbox` / the `ObjectExtractor` dispatch onto the pipeline API.
- Durable SQLite / worker-hosted operation (documented above as the durability follow-up).
- Lifting the shared lifecycle out of `@dxos/plugin-connector` into `@dxos/pipeline`.
- Deep UI reactivity of the companion (incremental fact streaming into the viewer).
