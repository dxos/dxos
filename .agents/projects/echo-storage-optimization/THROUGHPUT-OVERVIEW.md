# Throughput overview: raw SQLite vs. ECHO (automerge objects) vs. ECHO (feed objects)

Single fresh run of the full bench suite (`sqlite.bench.ts` + `echo.bench.ts`, both storage kinds)
on this machine, `DX_RUN_MANUAL_TESTS=1 pnpm exec vitest bench --run src/sqlite.bench.ts
src/echo.bench.ts` from `packages/core/echo/echo-client-e2e`. One run, not statistically averaged
across machines — read as directional, not a certified number (`rme` column in the raw output
gives the tinybench margin per bench). Full detailed hotspot/optimization findings behind these
numbers live in `AUTOMERGE-TRACK.md` and `FEED-TRACK.md`; this file is just the throughput
comparison across all three.

**Important methodology note:** unlike the two track files (which isolate `flush({ indexes:
false })` to remove the index-engine RPC as a confound), this run uses `echo.bench.ts`'s actual
default — plain `db.flush()`, i.e. `indexes: true` — because that's what ships to real callers who
don't opt out. That default RPC scales with total corpus size (see "Why automerge update/delete
looks so much worse than the track file's isolated numbers" below), so these numbers are the
_realistic default-config_ throughput, not the _architecture-isolated_ throughput. Both views are
useful for different questions; don't mix them without noting which is which.

Seed sizes: sqlite `SEED_ROWS=2,000`/`DELETE_POOL=20,000` (defaults); ECHO
`SEED_COUNT=200`/`DELETE_POOL=1,000`/`BATCH_SIZE=20` (defaults as of PR #12668).

## Point operations (ops/sec, mean ms/op)

| Operation                | Raw SQLite            | ECHO — automerge object | ECHO — feed object |
| ------------------------ | --------------------- | ----------------------- | ------------------ |
| insert                   | 3,021.8 hz / 0.33ms   | 21.3 hz / 46.85ms       | 5.6 hz / 179.69ms  |
| select (point, by id/PK) | 36,639.8 hz / 0.027ms | 334.5 hz / 2.99ms       | 31.4 hz / 31.87ms  |
| select (filtered scan)   | 5,002.0 hz / 0.20ms   | 10.4 hz / 96.01ms       | 13.5 hz / 74.05ms  |
| update (point)           | 3,181.7 hz / 0.31ms   | 1.3 hz / 748.86ms       | 5.3 hz / 189.66ms  |
| delete (point)           | 3,433.7 hz / 0.29ms   | 1.4 hz / 701.14ms       | 5.0 hz / 200.41ms  |

## Batched insert (single flush per batch of 20)

**Updated after the `#addOptimistic` fix below** — the feed column changed materially; automerge
is a fresh run and moves only by ordinary run-to-run noise (that fix doesn't touch automerge code).

| Operation                                         | ECHO — automerge object                     | ECHO — feed object                           |
| ------------------------------------------------- | ------------------------------------------- | -------------------------------------------- |
| insert (batched x20) — per batch                  | 3.24 hz / 308.66ms                          | 15.95 hz / 62.72ms                           |
| insert (batched x20) — per item (batch mean ÷ 20) | ~15.4ms/item                                | ~3.14ms/item                                 |
| vs. single-insert per item                        | 38.71ms/item (**2.5x slower** than batched) | 46.55ms/item (**14.8x slower** than batched) |

Before the fix, feed's batch-of-20 per-item cost was ~10.1ms; it's now ~3.14ms — a ~3.2x
improvement from fixing one method, at the _same_ batch size. Feed gets a much larger relative win
from batching than automerge — consistent with FEED-TRACK.md's finding that feed's per-op cost is
dominated by per-flush RPC overhead rather than a real per-object cost, so amortizing that RPC
over 20 items removes most of it. Automerge's per-item cost has a real per-object component
(Automerge document creation) that batching can't remove, so its relative win is smaller.

## Feed batching at larger batch sizes (1,000 / 5,000) — the real bottleneck, found and fixed

Prompted by "batching to 20 still leaves feed ~30x slower than raw SQLite — is that really as
good as it gets?" Raw SQLite insert is 0.33ms/item; a scratch phase-timing script (fresh peer,
timing the `db.add(obj, {to: feed})` loop separately from the single trailing `flush()`) gave:

| Batch size | flush config     | add-phase ms/item (before fix) | add-phase ms/item (after fix)          |
| ---------- | ---------------- | ------------------------------ | -------------------------------------- |
| 1,000      | `indexes: false` | 0.575                          | 0.386                                  |
| 5,000      | `indexes: false` | 1.238 (**worse** than 1,000!)  | 0.301 (better than 1,000, as expected) |

The pre-fix numbers are the tell: per-item cost for the _client-side registration_ phase (before
any RPC) got **worse** with a 5x bigger batch, the opposite of what batching should do. A CPU
profile of the 5,000-item case (`DX_PROFILE_TESTS=1`) found the cause: `FeedHandle#addOptimistic`
(`packages/core/echo/echo-client/src/feed/feed-handle.ts`) rebuilt a `Set` of every id in the
current working set, and copied the whole working-set array, on **every single append call** —
O(current working-set size) per call, O(n²) total across N appends, made worse by `_objects`
holding reactive proxies (so every `.id` read during the rebuild went through the proxy `get`
trap). Combined, `#addOptimistic` and the proxy-getter overhead it drove were roughly 25% of that
profile's self-time. Full writeup, the exact fix, and verification (`echo-client`/`echo-client-e2e`
full suites still pass) are in FEED-TRACK.md.

With the fix, total (add + flush) per-item cost at batch=5,000 with `indexes: false` is
**0.44ms/item — only ~1.3x slower than raw SQLite's 0.33ms/item.** Batching feed appends to a large
batch size is now close to architecturally free relative to the underlying SQLite driver; the
remaining gap is ordinary ECHO-layer overhead (RPC dispatch, schema validation), not a bug.

## Headline takeaways

- **Raw SQLite is roughly 100x to over 2,000x faster than either ECHO storage kind**, depending on
  operation and storage kind — this is the expected cost of ECHO's RPC/schema/reactivity layer on
  top of the same underlying SQLite driver, not a bug. The low end is automerge point-select
  (~110x); the high end is automerge update/delete (~2,400x) and feed point-select (~1,170x), both
  inflated by factors explained below rather than being a flat "ECHO overhead" multiple.
- **The automerge-vs-feed comparison is mixed, not one-sided** — read directionally per op, not as
  a blanket "feed wins":
  - Feed is faster: filtered scan (~1.3x), update (~4.0x), delete (~3.5x).
  - Automerge is faster: insert (~3.8x), point-select (~10.7x).
  - Point-select favors automerge because a by-ID lookup hits the entity manager's in-memory
    doc-handle map directly, while feed's by-ID query goes through the general index-backed
    `Query.select(...).from(feed)` path.
  - Insert and update/delete pull in opposite directions for a specific, verifiable reason — see
    below — so don't treat this table as "automerge insert is just faster than feed insert" in
    general; it reflects each bench's position in the run and the resulting corpus size at that
    point, not a fixed per-op cost for either storage kind.
- **Automerge's update/delete numbers here are NOT a stable "per-op" cost** — see below.

## Why automerge update/delete looks so much worse than the track file's isolated numbers

AUTOMERGE-TRACK.md's CPU-profile numbers (250 update / 250 delete, `flush({indexes:false})`,
smaller corpus) don't show update/delete anywhere near 700ms/op. The gap is the un-scoped-flush
issue that same file documents as finding #2: `EntityManager.flush()`
(`entity-manager.ts:662-685`) passes **every currently-loaded document handle** —
`_getAllDocHandles()`, `entity-manager.ts:1420-1424` — to `Repo.flush()`/`DataService.flush`, not
just the touched one. This run's `DELETE_POOL` default was raised from 300 to 1,000 in
`echo.bench.ts` (PR #12668, the delete-pool exhaustion guard added alongside it — that specific
fix is in the benchmark file itself, not yet written up as its own AUTOMERGE-TRACK.md finding), so
by the time the update/delete benches run, ~1,200 per-object Automerge documents are loaded into
the space, and _every_ `db.flush()` call in this run walks all ~1,200 of them. This benchmark run
is itself a live demonstration of that finding: raising `DELETE_POOL` for correctness had the
side-effect of making automerge's update/delete numbers ~7x worse purely from corpus growth,
without changing what a single update/delete operation actually does. Feed's update/delete also
got somewhat slower with the larger corpus (shared `indexes: true` cost scales with total object
count too, for both storage kinds) but nowhere near as much, since feed mutations don't add
per-object Automerge document handles to `_getAllDocHandles()` in the first place.

The same ordering effect explains why automerge's **insert** number (46.85ms) looks faster than
feed's (179.69ms) in this table, apparently contradicting the update/delete story: within each
describe block, `insert` and `insert (batched)` run _before_ `select (point)` first triggers
`ensureSeed()`, so both storage kinds' insert benches run against a small, still-growing corpus,
not the ~1,200-object one update/delete see. Automerge and feed's _absolute_ insert costs at that
point aren't directly comparable to each other either, since the two storage kinds' describe
blocks run one after another in the same worker process — the automerge suite's heavier work
(document creation, checksum overhead) can leave more GC/heap pressure behind for the feed suite
that runs right after it. Take the insert-vs-update/delete direction flip as a demonstration that
_bench position and corpus size at that position_ matter as much as storage kind here, not as a
claim that automerge inserts are reliably faster than feed inserts — AUTOMERGE-TRACK.md and
FEED-TRACK.md's isolated, order-independent profiles are the more trustworthy source for
per-op-type comparisons; this file is about realistic default-config throughput, corpus-size warts
included.

**Practical implication:** don't read the automerge column of the point-operations table above as
"automerge update/delete costs ~700ms" — read it as "automerge update/delete cost grows with total
loaded document count, and at ~1,200 loaded docs it's ~700ms here." Fixing AUTOMERGE-TRACK.md
optimization #2 (scope the flush to the touched document) would remove the O(loaded docs) scan
component of that cost, but the run still uses `indexes: true`, so the remaining index-engine RPC
(which itself scales with total corpus size, for both storage kinds) would still be there — expect
a real improvement, not a full return to AUTOMERGE-TRACK.md's `indexes: false` isolated numbers
without a follow-up measurement to confirm by how much.
