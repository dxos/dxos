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

| Operation                                         | ECHO — automerge object                     | ECHO — feed object                            |
| ------------------------------------------------- | ------------------------------------------- | --------------------------------------------- |
| insert (batched x20) — per batch                  | 2.93 hz / 341.43ms                          | 4.97 hz / 201.16ms                            |
| insert (batched x20) — per item (batch mean ÷ 20) | ~17.1ms/item                                | ~10.1ms/item                                  |
| vs. single-insert per item                        | 46.85ms/item (**2.7x slower** than batched) | 179.69ms/item (**17.7x slower** than batched) |

Feed gets a much larger relative win from batching than automerge — consistent with
FEED-TRACK.md's finding that feed's per-op cost is dominated by per-flush RPC overhead rather than
a real per-object cost, so amortizing that RPC over 20 items removes most of it. Automerge's
per-item cost has a real per-object component (Automerge document creation) that batching can't
remove, so its relative win is smaller.

## Headline takeaways

- **Raw SQLite is 100-1,000x faster than either ECHO storage kind** across every operation — this
  is the expected cost of ECHO's RPC/schema/reactivity layer on top of the same underlying SQLite
  driver, not a bug.
- **Feed beats automerge on every single-op benchmark except point-select**, by 1.9x (delete) to
  4.9x (insert) — matches the architectural expectation that feed avoids Automerge document
  creation. Point-select is the one exception (automerge 334.5 hz vs. feed 31.4 hz) because a
  by-ID automerge lookup hits the entity manager's in-memory doc-handle map directly, while feed's
  by-ID query goes through the general index-backed `Query.select(...).from(feed)` path.
- **Automerge's update/delete numbers here are NOT a stable "per-op" cost** — see below.

## Why automerge update/delete looks so much worse than the track file's isolated numbers

AUTOMERGE-TRACK.md's CPU-profile numbers (250 update / 250 delete, `flush({indexes:false})`,
smaller corpus) don't show update/delete anywhere near 700ms/op. The gap is the un-scoped-flush
issue that same file documents as finding #2: `EntityManager.flush()`
(`entity-manager.ts:662-685`) passes **every currently-loaded document handle** —
`_getAllDocHandles()`, `entity-manager.ts:1420-1424` — to `Repo.flush()`/`DataService.flush`, not
just the touched one. This run's `DELETE_POOL` default was raised from 300 to 1,000 in PR #12668
(to fix a real correctness bug — see AUTOMERGE-TRACK.md's sibling finding in the delete bench), so
by the time the update/delete benches run, ~1,200 per-object Automerge documents are loaded into
the space, and _every_ `db.flush()` call in this run walks all ~1,200 of them. This benchmark run
is itself a live demonstration of that finding: raising `DELETE_POOL` for correctness had the
side-effect of making automerge's update/delete numbers ~7x worse purely from corpus growth,
without changing what a single update/delete operation actually does. Feed's update/delete also
got somewhat slower with the larger corpus (shared `indexes: true` cost scales with total object
count too, for both storage kinds) but nowhere near as much, since feed mutations don't add
per-object Automerge document handles to `_getAllDocHandles()` in the first place.

**Practical implication:** don't read the automerge column of the point-operations table above as
"automerge update/delete costs ~700ms" — read it as "automerge update/delete cost grows with total
loaded document count, and at ~1,200 loaded docs it's ~700ms here." Fixing AUTOMERGE-TRACK.md
optimization #2 (scope the flush to the touched document) should flatten this back down to
roughly the per-op cost shown in that file's isolated profile.
