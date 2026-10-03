# echo-sqlite — benchmark results

Recorded runs of `src/testing/database.bench.ts` (throughput) and `src/memory.report.test.ts` (heap), one section
per commit. Run from this package:

```bash
DX_RUN_MANUAL_TESTS=1 pnpm exec vitest bench --run                         # ECHO_SQLITE_BENCH_OBJECTS=10000
DX_RUN_MANUAL_TESTS=1 pnpm exec vitest run src/memory.report.test.ts
```

The bench space is 10,000 `Person` objects, each with a ref to one of 100 `Organization`s, in a file-backed
SQLite database (`@effect/sql-sqlite-node`). Times are the per-call mean; every call includes compiling the
query, running the one SQL statement and hydrating the returned rows into live objects.

---

## RPC boundary

2026-10-03, `src/testing/rpc.bench.ts`. Node 22.22.0, 4 × Intel Xeon @ 2.10 GHz (cloud sandbox), same
10,000-person space. One file, three placements of SQLite:

- **in-process** — `makeLocalDriver`: statements run on the calling thread.
- **rpc: op** — `RemoteStoreDriver` → `serveStore` on a worker thread: one `MessagePort` round trip per
  driver call (query, row load, write batch). Hydration stays on the calling thread.
- **rpc: statement** — the `@effect/sql-sqlite-wasm` worker protocol, which is what the browser's OPFS
  worker speaks: one round trip per SQL statement, including `BEGIN` / `COMMIT`.

| operation (mean)                       | in-process |  rpc: op | rpc: statement |
| -------------------------------------- | ---------: | -------: | -------------: |
| store: load 1 row (no hydration)       |   0.021 ms | 0.085 ms |       0.084 ms |
| store: query 100 rows (no hydration)   |   0.065 ms | 0.215 ms |       0.239 ms |
| open + first page (`limit(10)`)        |    2.19 ms |  2.57 ms |        2.92 ms |
| query: type, `limit(10)`               |    0.31 ms |  0.50 ms |        0.58 ms |
| query: property `eq` (1 match of 10k)  |    10.7 ms |  10.6 ms |        11.7 ms |
| query: reference traversal (10 → orgs) |    0.49 ms |  0.66 ms |        0.96 ms |
| query: hydrate all 10,000 people       |    24.2 ms |  35.5 ms |        37.7 ms |
| insert 1 object + flush                |    1.23 ms |  1.42 ms |        1.71 ms |
| insert 100 objects + flush (one batch) |    20.7 ms |  19.9 ms |        43.8 ms |

- **A crossing costs about 65 µs.** That is the fixed price of a round trip between threads
  (`load 1 row`: 21 → 85 µs). Everything else follows from how many crossings an operation makes and how
  many bytes it clones.
- **Reads cross once in both shapes,** so they pay the same fixed cost: +0.2–0.5 ms on small queries
  (+40–100 %), nothing visible on a query that spends 10 ms in SQLite.
- **Large results pay for the clone.** Hydrating 10,000 rows adds 11–13 ms (+47–56 %), roughly 1 µs per
  row. Rows cross as unparsed JSON text: a measured run that parsed on the worker and cloned the object
  graph made the op-level path the _slower_ of the two on this row (5.7 vs 4.5 ms at 1,000 rows).
- **Writes decide the shape.** A write batch runs four statements per object, plus one per reference. Op-level sends the batch once
  and costs the same as in-process; statement-level crosses per statement and is 2.2× slower at
  100 objects, and the gap grows with the batch.
- **Not measured: the main thread.** These are latencies. In-process, a 10 ms query blocks the calling
  thread for 10 ms; behind either boundary it blocks only the worker. In the browser that choice is not
  available — OPFS sync access handles exist only in workers — so a main-thread `localDatabase` needs a
  boundary, and the numbers argue for the op-level one.

## 2026-09-26 — SQL-compiled queries, weak working set

Node 22.22.2, 4 × Intel Xeon @ 2.10 GHz (cloud sandbox), SQLite 3.51. Dirty tree on top of `7fa01e89`.

### Throughput

| operation                                          |    mean |     p99 | rows hydrated |
| -------------------------------------------------- | ------: | ------: | ------------: |
| open space + first page (`limit(10)`)              | 2.45 ms | 5.73 ms |            10 |
| query: type, `limit(10)`                           | 0.44 ms | 0.89 ms |            10 |
| query: type + property `eq` (1 match of 10k)       | 10.1 ms | 10.8 ms |             1 |
| query: type + `between` + `orderBy(property)`, 20  | 16.8 ms | 28.4 ms |            20 |
| query: full-text (trigram FTS5), `limit(10)`       | 1.76 ms | 3.80 ms |             1 |
| query: reference traversal (10 people → employers) | 0.54 ms | 0.89 ms |          ≤ 10 |
| query: incoming references (org ← its 100 people)  | 0.93 ms | 2.06 ms |           100 |
| query: hydrate all 10,000 people                   | 44.0 ms | 78.7 ms |        10,000 |
| ref load, cold (read + hydrate one row)            | 0.22 ms | 0.52 ms |             1 |
| ref load, resident (working-set hit)               |  2.9 µs |  7.4 µs |             0 |
| insert 1 object + flush (run alone)                | 1.44 ms | 3.92 ms |             — |
| update 1 resident object + flush (run alone)       | 1.11 ms | 2.29 ms |             — |

- **Opening costs the same at any size.** It runs the migration check and reads only persisted types. The
  page after it hydrates 10 rows.
- **Property filters and ordering read JSON in SQL.** `json_extract` over every row of the type, with no
  expression index. That is the 10–17 ms rows: they scale with the number of objects of the type, but
  hydrate only the matches. Expression indexes on hot paths are the next step (SPEC F-2.2 allows them).
- **Insert/update in the full suite** show multi-hundred-ms outliers (mean 37 ms / 6.7 ms). Those are GC
  pauses from the preceding benches, which churn about 700k objects. Run alone (`-t "insert|update"`, the
  numbers above) they are steady.

**Effect of pinning plans.** Measured on the first run, before the compiler pinned join order
(`CROSS JOIN`), paged by the type index, and short-circuited the deletion cascade for rows with no
parent or endpoints:

| operation                  |  before |   after | speed-up |
| -------------------------- | ------: | ------: | -------: |
| open + first page          | 10.8 ms | 2.45 ms |     4.4× |
| query: type, `limit(10)`   | 8.45 ms | 0.44 ms |      19× |
| query: reference traversal | 8.95 ms | 0.54 ms |      17× |
| query: hydrate all 10,000  | 50.9 ms | 44.0 ms |     1.2× |

### Memory: heap vs. space size

Heap above a GC'd baseline taken before open (`process.memoryUsage().heapUsed`, after forced full GCs):

| objects in space | after open | after `limit(20)` | holding a full hydration   | after releasing it              |
| ---------------: | ---------: | ----------------: | -------------------------- | ------------------------------- |
|            1,000 |    −0.1 MB |            0.1 MB | 13.0 MB (1,000 resident)   | 1.0 MB (0 resident, 0 tracked)  |
|           10,000 |    −0.1 MB |           −0.2 MB | 118.0 MB (10,000 resident) | 5.7 MB (0 resident, 0 tracked)  |
|           50,000 |    −0.0 MB |           −0.2 MB | 443.2 MB (50,000 resident) | 26.7 MB (0 resident, 0 tracked) |

- **Open and paging are flat.** Opening and paging cost nothing measurable, whether the space holds
  1,000 or 50,000 objects.
- **A full hydration is released.** Holding one costs about 9 KB per live object. Once dropped, every
  object is collected and every working-set entry is finalized.
- **The residue is not a leak.** Repeating hydrate-all-then-release five times over 20,000 objects
  (100,000 hydrations) leaves the heap flat or shrinking (61.7 → 59.1 MB). The residue after the first
  cycle is one-time warm-up: schema, compiled code and string tables.

Enforced in CI by `src/memory.test.ts`. It asserts, through `WeakRef` and forced GC, that query results
nobody holds are collected and the working set empties. With a deliberately planted strong reference,
4 of its 5 tests fail.
