# Feed-object optimization track

Storage kind: `db.add(obj, { to: feed })` — append-only queue, backed by `@dxos/feed`'s SQL store,
NOT Automerge.

## How this was measured

Same methodology as AUTOMERGE-TRACK.md: CPU profile of the equivalent workload (250 append / 250
point-select / 50 filtered-scan / 250 update / 250 delete via `db.removeFeedItemsByIds`), same
`flush({ indexes: false })` isolation. 13,845 samples / 16.2s wall for the full workload — **~2.3x
fewer samples / ~2.3x less wall time than the automerge track for the same op counts.**

| Bucket | Share |
|---|---|
| idle (I/O wait) | **53.6%** |
| Effect runtime | 10.5% |
| SQLite driver | 7.0% |
| Automerge WASM + doc-ID checksums (combined) | **1.8%** |
| gc | 1.1% |

Related benchmark: `packages/core/echo/echo-client-e2e/src/echo.bench.ts`'s "feed object" describe
block (PR #12649, #12668).

## Explicitly verified: feed writes do not create an Automerge document

This was checked two independent ways before trusting the profile:

1. **Direct source read** of `packages/core/echo/echo-client/src/feed/feed-handle.ts` (full file,
   ~676 lines). `append()` (218-247) → `appendSync()` (254-260, backs `db.add(obj, {to: feed})`) →
   `#registerItemsForAppend()` (266-292) only stamps hidden properties on the plain reactive proxy
   and captures it as JSON (`FeedObjectCore.captureForAppend()`) — no call to
   `_entityManager.addCore`/`createObject` anywhere in the path. `#sendAppendBatches()` (343-355)
   sends the captured items via the `FeedService.insertIntoFeed` RPC directly.
2. Server-side, `LocalFeedServiceImpl`
   (`packages/core/echo/echo-host/src/db-host/local-feed-service.ts`) encodes with the plain
   `EchoFeedCodec` and calls `FeedStore.appendLocal()`
   (`packages/core/echo/feed/src/feed-store.ts:673`) — a direct SQL insert, bypassing
   automerge-repo entirely.

The profile corroborates this: combined Automerge WASM + bs58check/noble-hashes is 1.8% here vs.
30.4% on the automerge track. The residual 1.8% traces to the **space-root** document (one
Automerge doc per space, not per feed item) being touched incidentally, not per-item overhead.

## Current findings

**There is no feed-specific hotspot worth chasing.** Over half of wall time (53.6%) is idle
(waiting on the SQLite/RPC round trip per operation), and the rest is generic ECHO plumbing
(Effect runtime dispatch, SQLite driver execution) shared by every write path in the system, not
something specific to feed placement. Feed operations are RPC/IO-latency-bound, not CPU-bound.

Index-engine code (`entity-meta-index.ts`, `fts-index.ts`, `index-query-source-provider.ts`)
appears in this profile at higher relative % than in the automerge-track profile (~0.5-1% here vs.
<0.2% there) purely because the feed track has so much less *other* CPU work competing for
samples — not because feed mutations trigger disproportionately more indexing work in absolute
terms. Confirmed by counting absolute hit counts for index-related frames in both profiles: they
are comparable in raw sample count, just a larger percentage of a much smaller total.

## Proposed optimizations

**No code-level optimization is proposed for the feed write/read path itself** — it is already
near the minimum possible overhead for this architecture (one RPC + one SQL statement, no
document-creation cost). The only lever that would move feed-op latency is reducing **round-trip
count**, not per-op CPU:

1. **Batch appends at the call site.** `FeedHandle` already supports batching internally
   (`#sendAppendBatches()`), and the benchmark now measures this directly: `echo.bench.ts`'s
   "insert (batched xN, single flush)" bench (PR #12668) shows batching cuts per-item feed insert
   latency ~14x (vs. ~2.8x for automerge) — feed benefits far more from batching because its cost
   is dominated by per-flush RPC/index overhead rather than a real per-object cost. Any production
   call site doing single-append-then-flush-then-append-again should switch to
   append-many-then-flush-once wherever the caller can tolerate the latency of batching.
2. **(Shared with automerge track, not feed-specific)** If `EntityManager.flush()`'s disk-flush
   scoping is fixed per AUTOMERGE-TRACK.md optimization #2, feed operations benefit too, since
   `Database.flush()` (`packages/core/echo/echo-client/src/proxy-db/database.ts:725-728`)
   unconditionally calls both the entity-manager flush AND every feed handle's
   `waitForPendingWrites()` on every call, regardless of which storage kind actually changed.

## Status

Analysis complete; no feed-specific optimization opportunity found beyond the batching guidance
above, which is a call-site/usage recommendation rather than a code change to the feed path
itself. The "batched insert" benchmark that quantifies this landed in PR #12668.
