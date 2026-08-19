# Feed-object optimization track

Storage kind: `db.add(obj, { to: feed })` — append-only queue, backed by `@dxos/feed`'s SQL store,
NOT Automerge.

## How this was measured

Same methodology as AUTOMERGE-TRACK.md: CPU profile of the equivalent workload (250 append / 250
point-select / 50 filtered-scan / 250 update / 250 delete via `db.removeFeedItemsByIds`), same
`flush({ indexes: false })` isolation. 13,845 samples / 16.2s wall for the full workload — **~2.3x
fewer samples / ~2.3x less wall time than the automerge track for the same op counts.**

| Bucket                                       | Share     |
| -------------------------------------------- | --------- |
| idle (I/O wait)                              | **53.6%** |
| Effect runtime                               | 10.5%     |
| SQLite driver                                | 7.0%      |
| Automerge WASM + doc-ID checksums (combined) | **1.8%**  |
| gc                                           | 1.1%      |

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

At the 250-append scale this profile was taken at, there was no feed-specific CPU hotspot: over
half of wall time (53.6%) was idle (waiting on the SQLite/RPC round trip per operation), and the
rest was generic ECHO plumbing (Effect runtime dispatch, SQLite driver execution) shared by every
write path, not something specific to feed placement.

**That conclusion does not hold at larger working-set sizes — there IS a real, now-fixed,
feed-specific hotspot: `FeedHandle#addOptimistic` rebuilt its entire working-set array (and a
fresh `Set` of every existing id) on every single append call.**

```ts
// Before (packages/core/echo/echo-client/src/feed/feed-handle.ts):
#addOptimistic(cores: FeedObjectCore[]): void {
  const existingIds = new Set(this._objects.map((obj) => obj.id)); // O(current working-set size)
  this._objects = [...this._objects, ...cores.map((core) => core.entity).filter((obj) => !existingIds.has(obj.id))];
  this.updated.emit();
}
```

`this._objects` holds reactive proxies, so every `.id` access during that dedup pass went through
the proxy's `get` trap (`typed-handler.ts`'s intercept, which itself calls `isValidProxyTarget`) —
not a cheap plain-object read. One append call therefore cost O(current working-set size), and N
sequential appends cost O(N²) total. At N=250 (this profile's scale) that's ~31,000 touches —
small enough to hide inside the idle/RPC-dominated picture above. Discovered by timing
`db.add(obj, {to: feed})` in a loop at larger batch sizes (see THROUGHPUT-OVERVIEW.md): per-item
cost for a 1,000-item batch's client-side registration phase was 0.575ms; at 5,000 items it rose
to 1.238ms — _worse_ per item with a bigger batch, the opposite of what batching should do. A CPU
profile of the 5,000-item case (`DX_PROFILE_TESTS=1`) confirmed `#addOptimistic` and its callback
at 12.67% combined self-time, plus the proxy `get`/`isValidProxyTarget` overhead it drove (another
~12.5%) — together the single largest chunk of the profile.

**Fixed**: `feed-handle.ts` now maintains `#objectIds: Set<string>` incrementally (updated on
append, delete, and full refresh) instead of rebuilding it from `_objects` on every call, so
`#addOptimistic` is O(new items in this call) instead of O(current working-set size). Verified:
per-item registration cost at 5,000 items dropped from 1.238ms (worse than 1,000 items) to
0.301ms (better than 1,000 items, as batching should behave) — true amortization instead of
quadratic blowup. `echo-client`'s and `echo-client-e2e`'s full test suites pass unchanged (525 +
301 tests).

Index-engine code (`entity-meta-index.ts`, `fts-index.ts`, `index-query-source-provider.ts`)
appears in the original 250-append profile at higher relative % than in the automerge-track
profile (~0.5-1% here vs. <0.2% there) purely because the feed track had so much less _other_ CPU
work competing for samples at that scale — not because feed mutations trigger disproportionately
more indexing work in absolute terms. Confirmed by counting absolute hit counts for index-related
frames in both profiles: they were comparable in raw sample count, just a larger percentage of a
much smaller total.

## Proposed optimizations

1. **DONE: fix `#addOptimistic`'s O(n²) working-set rebuild** (`feed-handle.ts`) — see above.
   Confirmed both by direct timing (batch-size scaling now amortizes correctly) and by full test
   suite passes.
2. **Batch appends at the call site.** `FeedHandle` already supports batching internally
   (`#sendAppendBatches()`), and the benchmark now measures this directly: `echo.bench.ts`'s
   "insert (batched xN, single flush)" bench (PR #12668) shows batching cuts per-item feed insert
   latency by a double-digit multiple, well past automerge's — feed benefits far more from
   batching because its cost is dominated by per-flush RPC/index overhead rather than a real
   per-object cost. See THROUGHPUT-OVERVIEW.md for the current measured ratio; the exact multiple
   is corpus-size-sensitive (it moves with how many documents are loaded — see optimization #3
   below), so treat any single number as a snapshot, not a constant. Any production call site
   doing single-append-then-flush-then-append-again should switch to append-many-then-flush-once
   wherever the caller can tolerate the latency of batching. Now that #1 is fixed, batching at any
   size delivers the amortization it was always meant to — previously, above a few hundred items
   per batch, the O(n²) bug would eventually outweigh the RPC-amortization win.
3. **(Shared with automerge track, not feed-specific)** If `EntityManager.flush()`'s disk-flush
   scoping is fixed per AUTOMERGE-TRACK.md optimization #2, feed operations benefit too, since
   `Database.flush()` (`packages/core/echo/echo-client/src/proxy-db/database.ts:725-728`)
   unconditionally calls both the entity-manager flush AND every feed handle's
   `waitForPendingWrites()` on every call, regardless of which storage kind actually changed.

## Status

Optimization #1 (the `#addOptimistic` O(n²) fix) is implemented and verified — see
THROUGHPUT-OVERVIEW.md for the before/after numbers at batch sizes 1,000 and 5,000. #2 (batching
guidance) is a call-site/usage recommendation, not a further code change. #3 is shared with
AUTOMERGE-TRACK.md and not yet implemented.
