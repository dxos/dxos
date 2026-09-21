# echo-client-e2e — property-access benchmark results

Recorded runs of `src/property-access.bench.ts`, one section per commit. Run with:

```bash
DX_RUN_MANUAL_TESTS=1 pnpm exec vitest bench --run property-access
```

**How to read a number.** Every cell is a derived per-operation cost, not a raw row:
`(mean(x10) − mean(x1)) / 9`. tinybench adds ~70–100ns of per-callback overhead to every `x1` row,
which swamps anything cheaper than it (every plain-object row, for one); the subtraction cancels it.
Where an `x10` row is unstable the `x1` row is used directly and marked `†` — at millisecond scale the
floor is irrelevant. `T`/`S` split a write into the `Obj.update` transaction and the per-set cost,
solved from the `write x10` (ten updates) and `write x10 (batched)` (one update, ten sets) rows.

Node 22.22.2 unless noted. `dirty` marks a run on a tree with uncommitted changes to the package.

---

## `0dab2f81` — 2026-09-05 — baseline (before echo-plain-objects)

Clean tree. Wide feed block 33.7s; teardown clean. Harness floor (plain `read x1`): 98 ns.

### Narrow object — 2 fields

| per-op    |   plain | echo unpersisted |     echo automerge |        echo feed |
| --------- | ------: | ---------------: | -----------------: | ---------------: |
| **read**  |  6.8 ns |     297 ns · 44× |     1.69 µs · 249× |     271 ns · 40× |
| **write** |  4.8 ns | 14.4 µs · 3,000× |   399 µs · 83,000× | 12.4 µs · 2,600× |
| **make**  | 17.3 ns |  118 µs · 6,800× | 4.3 ms† · 250,000× | 414 µs · 24,000× |

Write split: unpersisted `T`≈4.3 / `S`≈10.1 µs · automerge `T`≈65 / `S`≈341 µs · feed `T`≈2.7 /
`S`≈9.8 µs.

### Wide object — 250 short-string fields, one field accessed

| per-op    |   plain | echo unpersisted | echo automerge | echo feed |
| --------- | ------: | ---------------: | -------------: | --------: |
| **read**  | 12.0 ns |           258 ns |        1.83 µs |    264 ns |
| **write** |  5.3 ns |          12.8 µs |         449 µs |   12.9 µs |
| **make**  | 1.20 µs |          1.54 ms |        ~26 ms† |   3.07 ms |

Write split: unpersisted `T`≈2.7 / `S`≈10.1 µs · automerge `T`≈46 / `S`≈405 µs · feed `T`≈3.0 /
`S`≈9.9 µs.

### Width scaling (narrow → wide)

|       | plain | unpersisted | automerge | feed |
| ----- | ----: | ----------: | --------: | ---: |
| read  |  1.8× |        0.9× |      1.1× | 1.0× |
| write |  1.1× |        0.9× |      1.1× | 1.0× |
| make  |   69× |         13× |       ~6× | 7.4× |

Construction per added field: plain ~4.8 ns · unpersisted ~5.7 µs · feed ~10.7 µs · automerge
~90–150 µs (wide automerge `make` grows within the row as the doc fills: ~26 ms on the first insert,
~39 ms by the tenth).

### Elision check

`x10` vs `x1` scaling: automerge read 9.0×, feed 7.5×, unpersisted 7.4× — nothing optimized away.
Plain rows scale ~2× purely because they sit below the harness floor. Plain `make` at 17 ns/object
confirms the ring sink defeated escape analysis (a scalar-replaced allocation would collapse x10 onto
x1).

### Caveats on this run

- Narrow automerge `make x10` is bimodal under the per-row drain (mean 127 ms ±32%, min 36 ms, max
  233 ms, n=10); it was ±5% before the drain existed. Its `x1` sibling (4.3 ms ±10%) is used instead.
- Unpersisted read reads _lower_ wide than narrow (258 vs 297 ns); the x10 rme is 1.9%, so this is
  noise, and the honest statement is "flat".
- Automerge rows drain before warmup only; each row's run phase starts from an empty pending queue.

---

## `f42c3714` — 2026-09-05 — Stage A: no descriptor allocation on typed-handler reads

`echo` suite 581/581 unmodified. Clean tree. Harness floor 71 ns (98 at baseline — the derivation
cancels it; plain read moved 6.8 → 7.3 ns, so ~7% is the residual run-to-run noise on cheap rows).

Change: `TypedReactiveHandler.get` reads the value first and returns any non-object outright, consulting
`getOwnPropertyDescriptor` only for values that would be proxy-wrapped; `isValidProxyTarget` checks
`typeof` before probing `symbolIsProxy`. Both are exact reorderings (DESIGN.md D8).

### Narrow object — 2 fields

| per-op    |  plain | echo unpersisted |     echo automerge |        echo feed |
| --------- | -----: | ---------------: | -----------------: | ---------------: |
| **read**  | 7.3 ns |     130 ns · 18× |     1.06 µs · 145× |     117 ns · 16× |
| **write** | 3.1 ns | 10.0 µs · 3,200× |   283 µs · 91,000× |  9.3 µs · 3,000× |
| **make**  |  16 ns |   79 µs · 5,000× | 3.3 ms† · 210,000× | 274 µs · 17,000× |

Write split: unpersisted `T`≈2.5 / `S`≈7.6 µs · automerge `T`≈46 / `S`≈241 µs · feed `T`≈1.7 /
`S`≈7.6 µs.

### Wide object — 250 fields

| per-op    |   plain | echo unpersisted | echo automerge | echo feed |
| --------- | ------: | ---------------: | -------------: | --------: |
| **read**  | 12.8 ns |           114 ns |        1.02 µs |    113 ns |
| **write** |  3.4 ns |           9.5 µs |         354 µs |    9.4 µs |
| **make**  |  841 ns |          1.03 ms |       18.7 ms† |   2.18 ms |

### Baseline → Stage A

| per-op                 | baseline | Stage A |    Δ | attributed to the diff?                                                   |
| ---------------------- | -------: | ------: | ---: | ------------------------------------------------------------------------- |
| read, unpersisted      |   297 ns |  130 ns | 2.3× | yes — the descriptor and the boxing were on this exact path               |
| read, feed             |   271 ns |  117 ns | 2.3× | yes — same handler                                                        |
| read, unpersisted wide |   258 ns |  114 ns | 2.3× | yes                                                                       |
| read, feed wide        |   264 ns |  113 ns | 2.3× | yes                                                                       |
| read, automerge        |  1.69 µs | 1.06 µs | 1.6× | **no** — `isValidProxyTarget` is unreferenced in `echo-client`; see below |
| read, automerge wide   |  1.83 µs | 1.02 µs | 1.8× | **no** — as above                                                         |
| write, unpersisted     |  14.4 µs | 10.0 µs | 1.4× | yes — `_prepareValueForAssignment` calls `isValidProxyTarget`             |
| write, feed            |  12.4 µs |  9.3 µs | 1.3× | yes                                                                       |
| make, unpersisted      |   118 µs |   79 µs | 1.5× | yes — `init` calls it per property                                        |
| make, feed             |   414 µs |  274 µs | 1.5× | yes — same `init`                                                         |

Reads on the two typed-handler kinds improved 2.3×, not the ~3.5× predicted: the residual trap floor is
higher than estimated.

**The automerge read delta is real (well outside 7% noise) but not explained by this diff.** Nothing
Stage A touched is on `EchoReactiveHandler`'s primitive read path. Two candidates: run-to-run variance
on allocation-heavy rows (four allocations per read) that the within-run rme cannot see, or machine
state between runs. It is recorded here as observed, not credited. The Stage B run measures the bench
twice back to back at one commit to bound that variance before any further automerge number is read.

### Elision check

`x10`/`x1`: unpersisted 6.3×, automerge 8.4×, feed 5.8× — lower than at baseline (7.4 / 9.0 / 7.5)
because the per-op cost fell while the floor did not, so the floor is a larger share of `x1`. A fully
elided read would sit at ~1×; nothing is close.

---

## `63cc39ab` — 2026-09-05 — Stage B: generation-stamped leaf cache on automerge reads

`echo-client` 549/549 and `echo-client-e2e` 324/324 unmodified. Clean tree. **Two passes back to back**
on the same commit, to bound run-to-run variance before reading any further automerge number; both are
shown. Harness floor 71 / 71 ns.

Change: each record target carries a `Map` of decoded primitives stamped with an `ObjectCore`
generation that `notifyUpdate` increments on every mutation; a hit returns before the document read.
Records, arrays and refs are not cached (DESIGN.md F2, "Stage B, precisely").

### Narrow object — 2 fields (pass 1 / pass 2)

| per-op    |      plain | echo unpersisted |  echo automerge |      echo feed |
| --------- | ---------: | ---------------: | --------------: | -------------: |
| **read**  |   7 / 8 ns |     108 / 103 ns |    475 / 453 ns |   111 / 101 ns |
| **write** |   3 / 4 ns |   8.25 / 8.38 µs |    285 / 339 µs | 8.39 / 8.46 µs |
| **make**  | 17 / 14 ns |   74.4 / 77.0 µs | 3.43 / 3.17 ms† |   257 / 256 µs |

Write split (pass 1): unpersisted `T`≈1.2 / `S`≈7.1 µs · automerge `T`≈22 / `S`≈263 µs · feed
`T`≈1.4 / `S`≈7.0 µs.

### Wide object — 250 fields (pass 1 / pass 2)

| per-op    |        plain | echo unpersisted |  echo automerge |      echo feed |
| --------- | -----------: | ---------------: | --------------: | -------------: |
| **read**  |   12 / 13 ns |     109 / 104 ns |    453 / 537 ns |   114 / 118 ns |
| **write** |     3 / 3 ns |   11.2 / 8.70 µs |    342 / 324 µs | 8.61 / 9.41 µs |
| **make**  | 861 / 932 ns |   1.12 / 1.11 ms | 21.0 / 18.5 ms† | 2.35 / 2.23 ms |

### What two passes on one commit say about variance

| row                  | pass 1 | pass 2 | spread |
| -------------------- | -----: | -----: | -----: |
| read, automerge      | 475 ns | 453 ns |     5% |
| read, automerge wide | 453 ns | 537 ns |    17% |
| read, unpersisted    | 108 ns | 103 ns |     5% |
| write, automerge     | 285 µs | 339 µs |    17% |
| make, automerge (x1) | 3.4 ms | 3.2 ms |     8% |

Back-to-back passes agree to ~5% on the read rows and ~17% on the allocation-heavy automerge rows.
**Across runs separated in time the spread is wider:** the unpersisted and feed reads, which no Stage B
line touches, read 130 / 117 ns at Stage A and 105 / 106 ns here — a 20% move with no diff behind it.
So on the ~100 ns rows a change under ~20% between sections of this file is not evidence; the Stage A
automerge delta (1.6×) stays outside that band and stays unattributed.

### Stage A → Stage B

| per-op               | Stage A | Stage B (mean of 2) |    Δ | vs baseline `0dab2f81` |
| -------------------- | ------: | ------------------: | ---: | ---------------------: |
| read, automerge      | 1.06 µs |              464 ns | 2.3× |         1.69 µs → 3.6× |
| read, automerge wide | 1.02 µs |              495 ns | 2.1× |         1.83 µs → 3.7× |
| write, automerge     |  283 µs |              312 µs |    – |    within the 17% band |
| make, automerge      |  3.3 ms |              3.3 ms |    – |                        |

The cache hits — 464 ns is well under the 1.06 µs document read — but it lands 4× above the unpersisted
read (105 ns), not next to it as F2 predicted. That gap is the trap prelude, not the cache; see the
next section.

### Elision check

`x10`/`x1`: unpersisted 5.9×, automerge 8.8×, feed 6.1× (pass 1). Nothing elided.

---

## `27735fbc` — 2026-09-05 — Phase 3b: leaf cache consulted before the trap prelude

`echo-client` 549/549 and `echo-client-e2e` 324/324 unmodified. Clean tree. One pass. Harness floor
66 ns.

Change: `EchoReactiveHandler.get` checks the leaf cache first — before the `invariant` (whose build-time
call-site record allocated on every read; it now sits behind a plain check), the internal-accessor
symbol `switch`, and `instanceof EchoArray`. DESIGN.md F4 has the profile that found the prelude and the
argument for why checking first is safe.

### Narrow object — 2 fields

| per-op    | plain | echo unpersisted |     echo automerge |        echo feed |
| --------- | ----: | ---------------: | -----------------: | ---------------: |
| **read**  |  8 ns |     105 ns · 13× |   **133 ns · 17×** |     110 ns · 14× |
| **write** |  3 ns | 9.98 µs · 3,300× |   287 µs · 96,000× | 8.72 µs · 2,900× |
| **make**  | 15 ns |   88 µs · 5,900× | 3.2 ms† · 210,000× | 269 µs · 18,000× |

Write split: unpersisted `T`≈2.8 / `S`≈7.2 µs · automerge `T`≈35 / `S`≈252 µs · feed `T`≈1.8 /
`S`≈6.9 µs.

### Wide object — 250 fields

| per-op    |  plain | echo unpersisted | echo automerge | echo feed |
| --------- | -----: | ---------------: | -------------: | --------: |
| **read**  |  12 ns |           114 ns |     **130 ns** |    111 ns |
| **write** |   4 ns |          8.61 µs |         360 µs |   10.1 µs |
| **make**  | 905 ns |          1.17 ms |       20.3 ms† |   2.11 ms |

### Stage B → Phase 3b

| per-op               | Stage B (mean of 2) | Phase 3b |    Δ |
| -------------------- | ------------------: | -------: | ---: |
| read, automerge      |              464 ns |   133 ns | 3.5× |
| read, automerge wide |              495 ns |   130 ns | 3.8× |
| read, unpersisted    |              105 ns |   105 ns |    – |
| read, feed           |              106 ns |   110 ns |    – |

The automerge read now sits within ~25 ns of the unpersisted read, as F2 predicted for the cache
alone; the missing 3.5× was the prelude. The tight-loop harness in F4 (85 vs 71 ns) and tinybench
(133 vs 105 ns) agree on the gap to within their floors.

### Elision check

`x10`/`x1`: unpersisted 6.0×, automerge 6.9×, feed 6.2×. Automerge fell from 8.8× because its per-op
cost is now a smaller multiple of the floor — the same effect noted at Stage A. Nothing elided.

---

## `7a5b1d98` — 2026-09-05 — review round 1: absent keys uncached, single `Map.get`

All three suites unmodified. One pass. Read rows only (nothing else on the diff's path):

| per-op                 | `27735fbc` | `7a5b1d98` |
| ---------------------- | ---------: | ---------: |
| read, unpersisted      |     105 ns |      97 ns |
| read, automerge        |     133 ns |     108 ns |
| read, unpersisted wide |     114 ns |     107 ns |
| read, automerge wide   |     130 ns |     116 ns |

Automerge moved 133 → 108 ns; one `Map.get` instead of `has`+`get` is on the hit path, so part of that
is the diff, but the unpersisted row moved 8% with nothing behind it, so the attributable share is
roughly half. Elision check: unpersisted 5.7×, automerge 6.1×.

---

## `9bc3cf29` — 2026-09-05 — Phase 3c, first cut: eager materialized record

`echo-client` 549/549 and `echo-client-e2e` 324/324 unmodified. One pass. Harness floor 67 ns. **Superseded
by the lazy form below** after review round 2 found the eager deep decode makes a read after a write
O(subtree) — a cost this bench's read rows, which never interleave a write, cannot show.

Change: each record target decodes its record once per core generation into `{ decoded, values }`;
`get` serves `values[prop]`, the key-set traps serve `decoded` (DESIGN.md D10). Read rows are hits under
both designs, so parity is the expectation; the structural win is in `ownKeys`/`has`/
`getOwnPropertyDescriptor`, which this bench does not row.

| per-op                 | `7a5b1d98` (leaf cache) | 3c (materialized) |
| ---------------------- | ----------------------: | ----------------: |
| read, unpersisted      |                   97 ns |            103 ns |
| read, automerge        |                  108 ns |            129 ns |
| read, feed             |                  110 ns |            103 ns |
| read, unpersisted wide |                  107 ns |            105 ns |
| read, automerge wide   |                  116 ns |            116 ns |
| write, automerge       |                  331 µs |            283 µs |
| make, automerge        |                  3.3 ms |            3.2 ms |

Narrow automerge read 108 → 129 ns is inside the ~20% between-run band (the wide row did not move);
the hit path is one keyed load on a null-prototype object instead of one `Map.get`, and neither is
distinguishable from the other at this floor. Elision check: unpersisted 5.8×, automerge 6.7×, feed 5.6×.

---

## `b3486ba0` — 2026-09-05 — Phase 3c, lazy form: document record held, values filled per key

`echo-client` 549/549 and `echo-client-e2e` 324/324 unmodified. Clean tree. One pass. Harness floor
66 ns.

Change: `MaterializedRecord.raw` is the document's own record object (no copy) for the key-set traps;
`values` starts empty at each generation and fills on the decode path, one key per first read; reset at a
change is O(1). DESIGN.md D10 "Revised".

| per-op                 | `9bc3cf29` (eager) | `b3486ba0` (lazy) |
| ---------------------- | -----------------: | ----------------: |
| read, unpersisted      |             103 ns |             99 ns |
| read, automerge        |             129 ns |            113 ns |
| read, feed             |             103 ns |            102 ns |
| read, unpersisted wide |             105 ns |            102 ns |
| read, automerge wide   |             116 ns |            111 ns |
| write, automerge       |             283 µs |            303 µs |
| make, automerge        |             3.2 ms |            3.2 ms |

Hit paths are identical, so parity; the difference the redesign makes — a read after a write, and
`Object.keys` on a wide record — is not rowed here (follow-up in TASKS.md). Elision check: unpersisted
5.7×, automerge 6.3×, feed 5.9×.

---

## Baseline → final, `0dab2f81` → `b3486ba0`

Per-op, both from this file. Every ECHO read row is a `Proxy` trap still (Stage C is blocked — DESIGN.md
D9), so the floor under these numbers is the trap itself.

| per-op                 | baseline |   final |     Δ |
| ---------------------- | -------: | ------: | ----: |
| read, unpersisted      |   297 ns |   99 ns |  3.0× |
| read, automerge        |  1.69 µs |  113 ns | 15.0× |
| read, feed             |   271 ns |  102 ns |  2.7× |
| read, unpersisted wide |   258 ns |  102 ns |  2.5× |
| read, automerge wide   |  1.83 µs |  111 ns | 16.5× |
| read, feed wide        |   264 ns |  102 ns |  2.6× |
| write, unpersisted     |  14.4 µs | 8.32 µs |  1.7× |
| write, automerge       |   399 µs |  303 µs |  1.3× |
| write, feed            |  12.4 µs | 8.41 µs |  1.5× |
| make, unpersisted      |   118 µs |   77 µs |  1.5× |
| make, automerge        |   4.3 ms |  3.2 ms |  1.3× |
| make, feed             |   414 µs |  251 µs |  1.6× |

Reads against plain (7 ns): unpersisted 14×, automerge 16×, feed 15× — from 44× / 249× / 40×. Writes
and construction moved only through Stage A's `isValidProxyTarget` change and sit inside the ~20%
between-run band for the µs rows; the automerge write is a per-set Automerge commit (F2) and was never
in scope here.

---

# Query materialization — `src/query-materialization.bench.ts`

What it costs to bring a database's objects back into memory after a peer reload: reload + open, then a
query for every object of one type, then one field read per result. Per-phase means come from the timings
the bench records inside its cold rows; the tinybench rows are inclusive of the reload. Run with:

```bash
DX_RUN_MANUAL_TESTS=1 pnpm exec vitest bench --run query-materialization
```

## Finding on the first run (`aad3a673` sources, 2026-09-05): 1,000 wide objects cannot be cold-queried

With 1,000 objects of 250 short-string fields, a query straight after a reload never returned a full
result set. The index query source gives each object's document 2 s to load and drops it otherwise
(`index-query-source-provider.ts`, `INDEX_OBJECT_LOAD_TIMEOUT`); the run logged 5,000 such drops, the one
sample that did complete took 33.5 s to reach a full set through re-runs, and the query itself then hit
its 20 s ceiling (`Timeout [20,000ms]: index query`) — surfaced as an **unhandled rejection**, not a
rejected `run()`. Reload + open alone for that database averaged 2.2 s (min 0.43 s). The wide block
therefore runs with 200 objects; the narrow block keeps 1,000. Recorded here because it is a product
limit the bench found, not a bench artifact: 1,000 wide objects load at ~33 ms per object, and nothing in
the query path waits for that.

The narrow block also produced short results in 3 of 33 post-reload queries (0 of 1,000 returned), all
re-run to a full set; the same per-object timeout under load.

**Second run, 200 wide objects, 10 cold samples per row (`aad3a673` sources).** Complete for the narrow
block; the wide block's third cold row again hit the 20 s index-query ceiling. Two things the run showed
that shaped the bench's final settings: cold loads **slow down over repeated reloads in one process** —
the narrow cold query ran 2.3 s on its first samples and ~5 s by its last (16 of 33 post-reload queries
came back short and were re-run) — and the wide cold query ranged 3.6–11.7 s for 200 objects. The bench
now runs 100 wide objects and 5 cold samples per row. The per-object first read after a cold query,
which is where the proxy target and its materialized record are built, was 2–3 ms for 1,000 narrow
objects (2–3 µs each) against a 2.3–5 s document load: **materializing the object is not where a cold
query's time goes; loading its document is.**

## `aad3a673` sources (bench at `965f9258`) — 2026-09-05 — current head, final settings

1,000 narrow / 100 wide, 5 cold samples per row. Phase means from the in-row timings (min in
parentheses); the warm rows are tinybench means.

| phase                              | narrow × 1,000 |    wide × 100 |
| ---------------------------------- | -------------: | ------------: |
| reload + open                      |    203 ms (79) |   118 ms (23) |
| query, cold (to a full result set) |  3.93 s (2.45) | 1.97 s (1.48) |
| read one field per result, cold    |   2.5 ms (1.9) |  0.2 ms (0.2) |
| query, warm                        |         127 ms |         16 ms |
| read one field per result, warm    |         0.4 ms |       <0.1 ms |

Per object, cold: the document load is ~2.5–3.9 ms narrow and ~15–20 ms wide; the first read, which
builds the proxy target's materialized record, is ~2.5 µs narrow and ~2 µs wide. Cold narrow queries
came back short 6 times in 12 and were re-run to a full set. Cold rows carry ±30–40% rme from the
reload-to-reload slowdown noted above; read the min alongside the mean.

## Baseline `0dab2f81` sources vs head `aad3a673` sources — same bench (`965f9258`), same machine, back to back

The baseline column was produced by checking out the `echo` and `echo-client` sources of `0dab2f81` in
place, rebuilding both packages, running the bench, and restoring. Phase means, min in parentheses.

| phase                           | narrow × 1,000: baseline | narrow × 1,000: head | wide × 100: baseline | wide × 100: head |
| ------------------------------- | -----------------------: | -------------------: | -------------------: | ---------------: |
| reload + open                   |             242 ms (111) |          203 ms (79) |          179 ms (21) |      118 ms (23) |
| query, cold                     |            3.78 s (2.50) |        3.93 s (2.45) |        2.11 s (1.77) |    1.97 s (1.48) |
| read one field per result, cold |             2.2 ms (1.9) |         2.5 ms (1.9) |         0.2 ms (0.2) |     0.2 ms (0.2) |
| query, warm                     |                   134 ms |               127 ms |                16 ms |            16 ms |
| read one field per result, warm |                   1.9 ms |               0.4 ms |               0.2 ms |          <0.1 ms |

What this says about materialization before and after the read-path work:

- **Loading is unchanged**, as it should be — nothing in Stages A–3c touches the document load, and
  the cold query (2.5–3.9 s for 1,000 narrow objects, ~15–20 ms per wide object) is that load. The
  cold rows' ±25–45% rme is the reload-to-reload slowdown, identical in both runs.
- **Building an object costs the same ~2 µs either way.** The first read of each of 1,000 cold objects
  — where the proxy target, instance state and (on head) the materialized-record slot are created — is
  2.2 ms at baseline and 2.5 ms on head; the slot is one extra hidden property. Materialization is
  ~0.1% of a cold query.
- **Repeat reads are 4–5× cheaper on head**: 1.9 → 0.4 ms for a field on each of 1,000 already-loaded
  objects, the same 1.7 µs → 0.4 µs per read the property-access bench shows at 1,000× the scale.

So a cold query's time is the document load pipeline and its 2 s per-object / 20 s per-query timeouts,
not object materialization; the read-path work moved the part it targeted and left the rest alone.

---

## `25239b3c` — 2026-09-06 — Stage D1: automerge record proxies lose their `get` trap

`echo` 581/581, `echo-client` 549/549 and `echo-client-e2e` 324/324 unmodified. Clean tree. Harness
floor 66 ns.

Change (DESIGN.md D11): a record target carries its record as own data properties — filled in `init`,
kept current by the `set`/`deleteProperty` traps writing through per key and by a refresh hook the core
calls ahead of every update notification — and the proxy then drops its `get` trap, so the engine reads
the target with no JavaScript call. Arrays keep their trap. The typed handler (unpersisted, feed) is
untouched until D2.

### Narrow object — 2 fields

| per-op    | plain | echo unpersisted |     echo automerge |        echo feed |
| --------- | ----: | ---------------: | -----------------: | ---------------: |
| **read**  |  5 ns |      75 ns · 15× |     **26 ns · 5×** |      79 ns · 16× |
| **write** |  2 ns | 6.39 µs · 3,200× |   184 µs · 92,000× | 6.65 µs · 3,300× |
| **make**  |  5 ns |   47 µs · 9,400× | 3.0 ms† · 590,000× | 157 µs · 31,000× |

### Wide object — 250 fields

| per-op    |  plain | echo unpersisted | echo automerge | echo feed |
| --------- | -----: | ---------------: | -------------: | --------: |
| **read**  |   5 ns |            82 ns |      **25 ns** |     82 ns |
| **write** |   2 ns |          6.17 µs |         476 µs |   6.64 µs |
| **make**  | 592 ns |           770 µs |       18.8 ms† |   1.85 ms |

### Phase 3c → D1

| per-op               | 3c (lazy) |    D1 |    Δ |
| -------------------- | --------: | ----: | ---: |
| read, automerge      |    113 ns | 26 ns | 4.3× |
| read, automerge wide |    111 ns | 25 ns | 4.4× |
| read, unpersisted    |     99 ns | 75 ns |    – |
| read, feed           |    102 ns | 79 ns |    – |

An automerge read is now **5× a plain-object read**, from 249× at baseline. The unpersisted and feed rows
still go through the typed handler's `get` trap; their ~20% move is between-run noise, and D2 is what
takes them down. Width remains free.

### Elision check

`x10`/`x1`: automerge 3.2× (narrow) and 3.0× (wide), unpersisted 5.2×, feed 5.6×. Automerge fell from
6.3× because its per-op cost is now a small multiple of the floor — `x1` is 108 ns against a 66 ns
floor, so 9 further reads at 26 ns each land where the arithmetic says. Nothing elided.

### Query materialization at `25239b3c` (vs `aad3a673` head sources)

| phase                           |       narrow × 1,000 |            wide × 100 |
| ------------------------------- | -------------------: | --------------------: |
| reload + open                   |          224 ms (83) |           175 ms (33) |
| query, cold                     |        3.92 s (2.54) |         2.42 s (1.93) |
| **first read per result, cold** | **0.1 ms** (was 2.5) | **<0.1 ms** (was 0.2) |
| query, warm                     |     105 ms (was 127) |        17 ms (was 16) |
| repeat read per result, warm    |    <0.1 ms (was 0.4) |               <0.1 ms |

**The fill moved the per-object work into construction and it disappeared into the noise.** The first
read of 1,000 cold objects went 2.5 ms → 0.1 ms, a plain property load per object; the cold query that
now carries the fill reads 3.92 s against 3.93 s before, unchanged within a ±36% rme dominated by the
document load. So write-through costs nothing measurable at load and removes the per-object read cost
entirely.

---

## `1b03141f` — 2026-09-06 — Stage D2: the typed handler loses its `get` trap too

`echo` 581/581, `echo-client` 549/549 and `echo-client-e2e` 324/324 unmodified. Clean tree.

Change: a typed target now holds its nested records and arrays as the sub-proxies a read returns
(wrapped in `init` and on assignment), so unpersisted and feed-backed objects forward reads the same way
automerge-backed ones did in D1. Dropping the trap became reversible: `db.add` swaps the handler on the
same slot, so `setHandler` restores it and the incoming handler opts back in.

**Sampling windows shortened this run** — 300 ms per access row and 120 ms per `make` row (was 1,000 and
250), 3 cold samples in the query bench (was 5), so a full run of either file is under a minute. The
per-op derivation is a mean and stays comparable across sections; what a shorter window costs is
resolution, and the rows below the harness floor (every plain-object row) are correspondingly noisier —
plain `read` reads 1 ns narrow and 5 ns wide here against 5-7 ns before, which is floor noise, not a
change.

### Narrow object — 2 fields

| per-op    | plain | echo unpersisted |     echo automerge |        echo feed |
| --------- | ----: | ---------------: | -----------------: | ---------------: |
| **read**  |  1 ns |  **20 ns · 20×** |    **24 ns · 24×** |  **24 ns · 24×** |
| **write** |  3 ns | 6.26 µs · 2,100× |   222 µs · 74,000× | 6.08 µs · 2,000× |
| **make**  |  7 ns |   57 µs · 8,100× | 3.2 ms† · 450,000× | 159 µs · 23,000× |

### Wide object — 250 fields

| per-op    |  plain | echo unpersisted | echo automerge | echo feed |
| --------- | -----: | ---------------: | -------------: | --------: |
| **read**  |   5 ns |        **24 ns** |      **27 ns** | **25 ns** |
| **write** |   3 ns |          5.80 µs |         434 µs |   6.76 µs |
| **make**  | 548 ns |           859 µs |       15.9 ms† |   1.67 ms |

### D1 → D2

| per-op                 |    D1 |    D2 |    Δ |
| ---------------------- | ----: | ----: | ---: |
| read, unpersisted      | 75 ns | 20 ns | 3.8× |
| read, feed             | 79 ns | 24 ns | 3.3× |
| read, unpersisted wide | 82 ns | 24 ns | 3.4× |
| read, feed wide        | 82 ns | 25 ns | 3.3× |
| read, automerge        | 26 ns | 24 ns |    – |

**All three storage kinds now read at the same cost**, 20-27 ns, because all three do the same thing: a
forwarded property load on a filled target. What separated them — a document decode for automerge, a
wrapping trap for the other two — is gone from the read path in both cases.

### Elision check

`x10`/`x1` sits at 2.8-3.2× for every ECHO row, against a 77-89 ns `x1` floor: nine further reads at
~24 ns each is exactly the arithmetic. Plain rows at 1.2-1.8× are below the floor, as always.

### Query materialization at `1b03141f`

| phase                        | narrow × 1,000 |    wide × 100 |
| ---------------------------- | -------------: | ------------: |
| reload + open                |    206 ms (80) |    55 ms (30) |
| query, cold                  |  3.72 s (2.55) | 2.16 s (1.98) |
| first read per result, cold  |         0.1 ms |       <0.1 ms |
| query, warm                  |         106 ms |         16 ms |
| repeat read per result, warm |        <0.1 ms |       <0.1 ms |

Unchanged from D1, as expected: the query bench exercises automerge-backed objects, which D2 does not
touch. Loading still dominates a cold query.

### Repeatability of the shortened windows

A second back-to-back pass at `1b03141f` read 23 / 26 / 26 ns narrow and 33 / 30 / 28 ns wide
(unpersisted / automerge / feed), against 20 / 24 / 24 and 24 / 27 / 25 on the first. So the shortened
windows carry a **~20% run-to-run spread on the read rows**, against ~5% at one second per row. Read a
single read cell as "about 25 ns", not to the nanosecond; a change under ~20% between sections of this
file is not evidence. The conclusion the two passes agree on — all three storage kinds converged, from
297 / 1,690 / 271 ns at baseline — sits far outside that band.

---

## Stage D review pass — 2026-09-06 — the write regression, found by review and fixed

The Stage D reviewer caught a regression the tables above record but the write-up did not name: **the wide
automerge write went 360 µs (Phase 3c) → 476 µs (D1) → 434 µs (D2)** while the narrow row fell. Cause: a
write refreshed the object's whole record, twice — the trap called the refresh explicitly and the
synchronous change event routed back and called it again — so one field of a 250-field object
re-materialized 500 keys.

Fixed by narrowing rather than deferring. `ObjectCore.changeTargetKey` scopes a write to the one key it
touches and the refresh updates only that key. Deferring was tried first and was wrong: a subscriber is
notified _inside_ the document write, so an update applied afterwards was invisible to it (caught by
`subscription.test.ts`). Narrowing is applied only to a leaf write — replacing a nested record leaves the
target already built for the old value stale, so that case falls back to refreshing the record (caught by
`mutable-schema.test.ts`).

Write rows re-measured at the **original 1,000 ms window**, since the effect is the size of the shortened
window's noise band:

| per-op                | baseline |     3c |     D1 |     D2 | after review |
| --------------------- | -------: | -----: | -----: | -----: | -----------: |
| write, automerge      |   399 µs | 287 µs | 184 µs | 222 µs |   **167 µs** |
| write, automerge wide |   449 µs | 360 µs | 476 µs | 434 µs |   **254 µs** |

Reads are unchanged by the fix — 24 / 26 ns narrow, 24 / 26 ns wide (unpersisted / automerge) — so the
write path was repaired without giving back the read win. The committed bench keeps the 300 ms window;
this one comparison was taken at 1,000 ms for resolution.

## `a1a06de7` — 2026-09-06 — Stage F: memoize the raw record (a null result on this bench)

`_refreshRecord` now memoizes the raw automerge record a target was last filled from, so an unchanged
record is one pointer compare and an unchanged key keeps the value already materialized for it
(DESIGN.md D13). **This bench does not measure that**, and is run only to show it costs nothing: the
matrix reads and writes a local object, whereas the memo pays off on a refresh — a change arriving from
elsewhere, an array mutation, an editor keystroke. The measurement that does show the effect is a count,
not a time: on a 41 + 41 + 40-key object, one remote key change goes from **246 calls to
`_materializeValue` to 3**.

Both halves were run back to back on the same machine, `70ca32cd~1` against `a1a06de7`, because this
machine is roughly 2× slower than the one the tables above were recorded on — narrow reads price at
43–55 ns here against the 24–26 ns recorded at Stage D. Comparing across sections would say nothing;
comparing the two halves against each other is valid.

| per-op, narrow     |  before |   after |  delta |
| ------------------ | ------: | ------: | -----: |
| read, plain        |  4.4 ns |  3.8 ns | −13.1% |
| read, unpersisted  |   43 ns |   45 ns |  +4.8% |
| read, automerge    |   55 ns |   45 ns | −17.6% |
| read, feed         |   40 ns |   44 ns | +10.2% |
| write, unpersisted | 12.7 µs | 10.6 µs | −16.2% |
| write, automerge   |  490 µs |  492 µs |  +0.3% |
| write, feed        | 10.7 µs | 11.9 µs | +10.7% |

| per-op, wide (250 fields) |  before |   after |  delta |
| ------------------------- | ------: | ------: | -----: |
| read, plain               | 15.4 ns | 12.6 ns | −17.8% |
| read, unpersisted         |   51 ns |   58 ns | +14.6% |
| read, automerge           |   53 ns |   53 ns |  −0.0% |
| read, feed                |   56 ns |   52 ns |  −7.6% |
| write, unpersisted        | 11.0 µs | 10.7 µs |  −3.0% |
| write, automerge          |  510 µs |  537 µs |  +5.3% |
| write, feed               | 11.2 µs | 14.4 µs | +28.3% |

**Read the deltas against the control, not against zero.** The `plain object` rows contain no ECHO code
at all and cannot have been changed by this commit, yet they move −24.8% to +25.7% across the run
(including the `make` rows not tabulated above). That is the noise floor of a 300 ms window on this
machine, and every ECHO row above sits inside it. The honest conclusion is that this bench cannot
distinguish before from after — which is the intended result for a change that touches only the refresh
path — not that any individual cell improved or regressed.

## `2e35502a` — 2026-09-07 — Stage E: one shared handler, no `get` trap anywhere (inconclusive)

Stage E finished what Stage D started: refs resolve through their core rather than a captured database,
so a target is filled as soon as it has a document; arrays carry their elements as own indexed
properties; and with no target anywhere needing a `get` trap, one shared `REACTIVE_PROXY_HANDLER`
replaced the per-proxy `ProxyHandlerSlot` (DESIGN.md D14). Net −159 lines.

Run back to back on one machine, `80840af0` against `2e35502a`, after-half first.

| per-op, narrow    | before |  after |  delta |
| ----------------- | -----: | -----: | -----: |
| read, plain       | 3.8 ns | 2.1 ns | −44.5% |
| read, unpersisted |  16 ns |  13 ns | −19.5% |
| read, automerge   |  20 ns |  19 ns |  −2.6% |
| read, feed        |  23 ns |  14 ns | −38.0% |

| per-op, wide (250 fields) | before |  after |  delta |
| ------------------------- | -----: | -----: | -----: |
| read, plain               | 6.9 ns | 7.3 ns |  +4.3% |
| read, unpersisted         |  26 ns |  23 ns | −10.6% |
| read, automerge           |  24 ns |  23 ns |  −2.8% |
| read, feed                |  25 ns |  17 ns | −30.5% |

**This run resolves nothing, and the control rows are why.** `plain object` contains no ECHO code and
cannot have been touched by this commit, yet across the single run its cells move from **−44.5% to
+116.5%** (the wide write row). Every ECHO delta above sits inside that band, so the feed read's −38%
is not evidence of a win any more than plain's +116% is evidence of a regression.

The absolute levels are the other half of the warning: automerge reads price at 19–24 ns here against
43–55 ns in the `a1a06de7` run earlier the same day, on the same machine and the same bench. Between-run
variance is 2–3×, which is why only a back-to-back A/B is comparable at all — and this run shows that
even that is not enough to resolve a ten-percent effect on a 300 ms window under a noisy sandbox.

What can be said: reads remain in the tens of nanoseconds and flat in object width, and nothing moved
enough to suggest the shared handler cost anything. Stage E's case is the deletion, not a number.

---

# Query executor: memory vs sql — `src/query-executor.bench.ts`

The same query workload under the host's two query executors, side by side in one process. The `memory`
column is the in-memory executor, which loads every candidate document from the Automerge repo and
evaluates the plan in JS; the `sql` executor compiles the plan into one SQLite statement over the index tables
and loads no documents. Both ship: `memory` is the default and `sql` is selected with
`DX_ECHO_QUERY_EXECUTOR=sql`, so either column can be reproduced by setting that variable. The earliest runs
below built one peer per mode in a single process, which the harness no longer does; a run now measures the
one mode it was given. Run with:

```bash
DX_RUN_MANUAL_TESTS=1 pnpm exec vitest bench --run query-executor --outputJson /tmp/query-executor.json
```

`--outputJson` matters: vitest 4's bench reporter prints its per-row table only on a TTY, so a logged run
shows the `BENCH Summary` ratios and nothing else. `QUERY_EXECUTOR_BENCH_COUNT` overrides N (default 2,000).

**Data.** Per peer, N tasks of a bench-local `BenchTask` type (`title`, `description`, `priority`, `assignee`
ref) and 50 `TestSchema.Person`. `TestSchema.Task` has no numeric field to filter and order on, hence the
local type; every field is optional, as in `TestSchema`, because `Filter.eq(n)` is a `Filter<number |
undefined>` and the typed props overload of `Filter.type` only accepts it against an optional field.
Priority cycles 1..5 and task _i_ is assigned to person _i_ mod 50, so `priority = 3` matches 400 tasks whose
assignees are 10 distinct persons. Objects are added in batches of 200 with a flush per batch and a final
`flush({ indexes: true })` before any row runs.

**Rows** (per mode in the recorded runs):

- `run: type` — `Query.select(Filter.type(BenchTask)).run()`, 2,000 results.
- `run: type + property` — `Filter.type(BenchTask, { priority: Filter.eq(3) })`, 400 results.
- `run: reference traversal` — the type + property query `.reference('assignee')`, 10 results.
- `run: order + limit` — `Filter.type(BenchTask)` ordered by `priority desc`, `limit(20)`, 20 results.
- `reactive first result` — subscribe a reactive query for type + property, wait for the first non-empty
  result, unsubscribe. Each sample uses a distinct `.limit(n > N)` so the AST differs: the client caches
  `QueryResult` by AST and fires a subscriber only when the result set changes, so re-subscribing to the
  identical query never fires a second time.
- `cold: reload + open + run type + property` — a file-backed peer is reloaded, its database
  reopened, and the type + property query run once; the reload is inside the timed body (no per-iteration
  hooks in `bench()`), so the query-only phase is also timed inside the row and printed from `afterAll`. 3
  samples + 1 warm-up. A short result (the index source's 2 s per-object load budget) would be re-run and
  counted; none occurred in this run.

Every `run:` row checks its result count and throws on a mismatch, so a row that reports a number returned
the full set.

## `f261daf7` (dirty tree) — 2026-09-17 — N = 2,000

Node 22.22.2. The bench file is as committed; the tree carries uncommitted changes to `echo-host`,
`echo-client` and `index-core`. Warm rows: 1 s window, 3 warm-up iterations. Means ± rme, sample count in
parentheses.

| row                                         |                memory |                   sql |            sql vs memory |
| ------------------------------------------- | --------------------: | --------------------: | -----------------------: |
| `run: type` (2,000 results)                 |   294.9 ms ±7.1% (10) |   178.3 ms ±2.6% (10) |                    1.65× |
| `run: type + property` (400)                |   172.8 ms ±2.3% (10) |    67.6 ms ±2.7% (15) |                    2.56× |
| `run: reference traversal` (10)             |   192.4 ms ±4.3% (10) | 3,245.5 ms ±6.8% (10) | **0.06×** (16.9× slower) |
| `run: order + limit` (20)                   |   107.7 ms ±2.9% (10) |    13.0 ms ±2.3% (77) |                    8.28× |
| `reactive first result` (400)               |   137.8 ms ±1.8% (10) |    41.6 ms ±2.3% (25) |                    3.31× |
| `cold: reload + open + run type + property` | 7,070.6 ms ±46.6% (3) | 2,311.3 ms ±41.7% (3) |                    3.06× |

Cold phases, timed inside the row (n = 4 including the warm-up; min in parentheses):

| phase                            |           memory |              sql |
| -------------------------------- | ---------------: | ---------------: |
| reload + open                    |     811 ms (479) |     596 ms (322) |
| run type + property, first, cold | 7,114 ms (5,074) | 1,863 ms (1,744) |

### Host traces

Read from `peer.host.queryService.getQueryTraces()` after the first result of a reactive query for each
shape, on the warm peers. `docsLoaded` and `indexHits` are summed over the trace tree; `exec` is the root
trace's `executionTime` on the sql path and the sum of the step traces on the memory path, because the
memory path's root trace is created with `beginTs: 0` and its own `executionTime` reads as the process
uptime (~290 s in this run).

| mode   | query               | objects | docsLoaded | indexHits |       exec | of which doc load |
| ------ | ------------------- | ------: | ---------: | --------: | ---------: | ----------------: |
| memory | type                |   2,000 |      2,000 |     2,000 |   104.5 ms |           64.7 ms |
| memory | type + property     |     400 |      2,000 |     2,000 |   103.0 ms |           60.7 ms |
| memory | reference traversal |     400 |      2,000 |     2,000 |   117.5 ms |           77.9 ms |
| memory | order + limit       |      20 |      2,000 |     2,000 |   101.6 ms |           58.0 ms |
| sql    | type                |   2,000 |          0 |     2,000 |    13.6 ms |                 0 |
| sql    | type + property     |     400 |          0 |       400 |     7.6 ms |                 0 |
| sql    | reference traversal |      10 |          0 |        10 | 3,135.6 ms |                 0 |
| sql    | order + limit       |      20 |          0 |        20 |     9.8 ms |                 0 |

The memory path's `objects` for the traversal is the host's working set before the client dedupes it (400
task → assignee hops onto 10 persons); the sql statement groups by target and returns 10.

### Reading

- **The host no longer loads documents on the sql path.** `docsLoaded` is 0 for every shape; on the memory
  path it is 2,000 for every shape — including the 400-result property filter and the 20-result
  `order + limit`, because the memory executor's type selector returns all 2,000 index hits, loads each
  document, and applies the predicate, order and limit in JS. The sql path's `indexHits` of 400 and 20 show
  the predicate and the limit moved into the statement. Host execution goes from ~100–118 ms (of which
  58–78 ms is document loading) to 8–14 ms.
- **What the client sees is smaller than what the host saved, in proportion to the result size.** `run:
type` returns 2,000 objects and improves 295 → 178 ms: the host's ~90 ms saving is a third of the row, and
  the rest is the client hydrating 2,000 result objects from their documents, which both modes pay. `order
  - limit` returns 20 objects and improves 108 → 13 ms (8×), because the memory path still loaded 2,000
    documents to sort 20. Type + property (400 objects) sits between at 2.6×, and the reactive first result
    for the same query at 3.3× (138 → 42 ms).
- **Outgoing reference traversal is 17× slower on the sql path**: 3.2 s against 192 ms, and the host trace
  places all of it in the statement (`exec` 3,136 ms, no document loads, 10 hits). The compiled traversal
  joins each source row's `objectData` body through `json_each`, then joins `objectMeta` on the URI split
  into space and local id by `CASE`/`substr` expressions (`compile.ts`, `#compileTraverse`), so 400 source
  rows are matched against 2,050 `objectMeta` rows on computed columns. Whether the planner can use the
  `(spaceId, objectId)` index against those expressions is what `EXPLAIN QUERY PLAN` would show; this run
  did not capture it (the executor's `DX_TRACE_QUERY_EXECUTION` switch is read from `import.meta.env`,
  which vitest does not populate from `DX_` variables). The cause was established afterwards and fixed in
  `c5294281`; see the re-run below.
- **Cold, the sql path is 3× faster but still pays the client's loads**: 2.3 s against 7.1 s inclusive of
  the reload, 1.86 s against 7.1 s for the query alone. On the memory path the host loads all 2,000 documents
  from disk before filtering; on the sql path the host loads none, and the 1.7–2.0 s is the reload-heavy
  client hydrating 400 results. Cold rows carry ±40–47% rme from 3 samples that include one slow first reload;
  read the min alongside the mean. No cold query came back short in either mode.

### Harness notes

- Unsubscribing from inside a `subscribe` callback hung the first run indefinitely: the callback runs inside
  the query's own `changed` emission, where a throw from `unsubscribe()` → `_stop()` is routed to the
  context's error handler rather than the caller, so the bench's promise never settled. The bench resolves
  from the callback and unsubscribes from the awaiting code.
- The memory-mode warm rows take ~300 ms per iteration; tinybench's default 16 warm-up iterations added
  ~5 s per row, so the rows cap warm-up at 3.

## `c5294281` — 2026-09-17 — N = 2,000, re-run after the index pins

Same harness, same Node 22.22.2, same N. The only code change between the runs is `c5294281`, which pins
the index seeks the compiled statements depend on (`INDEXED BY` on the working-set and traversal joins,
`NOT INDEXED` on the `objectMeta` metadata joins, children as a `UNION ALL` of two seeks, and the strong
dependency recursion per union branch). The tree is clean at this commit apart from this file.

| row                                         |                memory |                   sql | sql vs memory |
| ------------------------------------------- | --------------------: | --------------------: | ------------: |
| `run: type` (2,000 results)                 |   285.5 ms ±2.1% (10) |   168.4 ms ±2.5% (10) |         1.70× |
| `run: type + property` (400)                |   163.9 ms ±0.9% (10) |    59.4 ms ±1.4% (17) |         2.76× |
| `run: reference traversal` (10)             |   197.0 ms ±2.0% (10) |    41.8 ms ±1.4% (24) |         4.71× |
| `run: order + limit` (20)                   |   120.0 ms ±1.6% (10) |    10.7 ms ±3.3% (95) |        11.26× |
| `reactive first result` (400)               |   151.1 ms ±2.3% (10) |    41.0 ms ±4.5% (25) |         3.69× |
| `cold: reload + open + run type + property` | 7,071.8 ms ±40.5% (3) | 2,300.8 ms ±39.7% (3) |         3.07× |

Cold phases, timed inside the row (n = 4 including the warm-up; min in parentheses):

| phase                            |           memory |              sql |
| -------------------------------- | ---------------: | ---------------: |
| reload + open                    |     756 ms (514) |     356 ms (294) |
| run type + property, first, cold | 7,347 ms (5,229) | 2,108 ms (1,767) |

### Host traces

Same method as the first run.

| mode   | query               | objects | docsLoaded | indexHits |     exec | of which doc load |
| ------ | ------------------- | ------: | ---------: | --------: | -------: | ----------------: |
| memory | type                |   2,000 |      2,000 |     2,000 | 114.5 ms |           73.0 ms |
| memory | type + property     |     400 |      2,000 |     2,000 | 112.3 ms |           70.1 ms |
| memory | reference traversal |     400 |      2,000 |     2,000 | 135.0 ms |           94.1 ms |
| memory | order + limit       |      20 |      2,000 |     2,000 | 118.1 ms |           71.4 ms |
| sql    | type                |   2,000 |          0 |     2,000 |  12.3 ms |                 0 |
| sql    | type + property     |     400 |          0 |       400 |   7.1 ms |                 0 |
| sql    | reference traversal |      10 |          0 |        10 |  15.0 ms |                 0 |
| sql    | order + limit       |      20 |          0 |        20 |   7.7 ms |                 0 |

### Reading

- **The traversal regression is gone: 3,136 ms → 15 ms in the statement, 3.2 s → 42 ms end to end.**
  `EXPLAIN QUERY PLAN` on the first run's statement (captured afterwards with a standalone script against
  the bench database) showed two mis-picks by SQLite's planner, which has no `ANALYZE` statistics to work
  from: the traversal target lookup ran `SEARCH t USING INDEX idx_object_index_queuePosition (queueId=?)`,
  a scan of every non-queue row per source row, and the strong-dependency recursion seeded from a full
  `objectMeta` scan. With the `(spaceId, queueId, objectId)` index pinned on the join and the working set
  driving the recursion, the plan is one seek per source row. `explain.test.ts` now asserts this plan shape
  so a planner regression fails a unit test rather than a benchmark.
- **The other sql rows moved by a few percent, within the noise of a single run**, except `order + limit`,
  which is 13.0 → 10.7 ms; the `NOT INDEXED` hint on the metadata joins removes an index probe per result
  row there as well. The memory rows are unchanged within rme (the memory executor is not touched by
  `c5294281`).
- **Every sql row is now faster than its memory counterpart**, from 1.7× on the 2,000-result type query,
  where the client's hydration of the result objects dominates and both modes pay it, to 11× on
  `order + limit`, where the memory path still loads 2,000 documents to return 20. The sql host executes
  every shape in 7–15 ms with no document loads; the memory host takes 112–135 ms, 70–94 ms of it loading
  documents.

## `fd6e6782` — 2026-09-17 — N = 2,000, sql only, after the in-memory executor was deleted

A confirmation run of the collapsed harness, to check that the deletion changed nothing on the surviving
path. Every row is within the noise of the `c5294281` sql column; host traces are unchanged (0 documents
loaded, 6–12 ms per shape).

| row                                         |                   sql |
| ------------------------------------------- | --------------------: |
| `run: type` (2,000 results)                 |   167.3 ms ±3.8% (10) |
| `run: type + property` (400)                |    61.3 ms ±2.1% (17) |
| `run: reference traversal` (10)             |    44.0 ms ±1.8% (23) |
| `run: order + limit` (20)                   |   10.1 ms ±1.5% (100) |
| `reactive first result` (400)               |    37.1 ms ±1.6% (27) |
| `cold: reload + open + run type + property` | 2,086.5 ms ±18.0% (3) |

## `3f17ac76` — 2026-09-17 — mixed types, memory sampling, N = 2,000 and N = 5,000

The bench was rewritten (`3f17ac76`) to answer three questions the runs above leave open: what the
executors cost in memory, how they behave when the queried type is a minority of the store, and how they
scale. The memory column here comes from the `c5294281` executor written into the working tree of
`3f17ac76` for the run (the sql code is identical in both), selected with `DX_ECHO_QUERY_EXECUTOR=memory`;
each mode runs in its own process, so the memory figures are not contaminated by the other mode.

**Population**, per peer: N `BenchTask`, N/2 `BenchNote` (~1 KB `body`, two tags), N/2 `BenchEvent`
(`kind` cycling meeting/call/deadline, `day`, `organizer` ref), N/20 `TestSchema.Organization`, 50
`TestSchema.Person`. At N = 2,000 that is 4,150 objects; the type query selects 48% of them, the event
query 8%. Two new rows: `type + string property` (`Filter.type(BenchEvent, { kind: 'deadline' })`,
N/6 results) and `union of two types` (`Query.all` of notes and organizations, N/2 + N/20 results).

**Memory method.** From `afterAll`, after the timing rows: `gc()` (exposed at runtime via
`v8.setFlagsFromString`), read `process.memoryUsage()`, run the shape 3× under a 1 ms sampler that
records the highest `heapUsed` and `rss` seen, `gc()` again, read again. _Peak_ is the sampler's high
water mark over the pre-run baseline; _retained_ is the post-collection reading over the baseline. The
cold peer is then reloaded and the property query run under the same sampler, followed by the full type
query on the same reloaded peer. The baseline heap printed for the first warm row is also the heap the
timing rows left behind, since it follows them.

### N = 2,000 (4,150 objects per peer)

Seeding took 301 s per run in both modes (two peers; ~36 ms per object through `db.add` + batched
flushes). Post-seed, collected: heap 504 MB in both modes; RSS 1,765 MB (memory) / 1,727 MB (sql),
of which ~1,015 MB is `external` (Automerge's WASM heap and buffers for 8,300 documents across the two
peers).

| row                                         |                memory |                  sql | sql vs memory |
| ------------------------------------------- | --------------------: | -------------------: | ------------: |
| `run: type` (2,000 of 4,150)                |   277.9 ms ±2.6% (10) |  167.8 ms ±2.5% (10) |         1.66× |
| `run: type + property` (400)                |   166.6 ms ±5.9% (10) |   62.3 ms ±1.2% (17) |         2.67× |
| `run: reference traversal` (10)             |   191.3 ms ±2.7% (10) |   46.4 ms ±3.8% (22) |         4.12× |
| `run: order + limit` (20)                   |   110.6 ms ±3.8% (10) |   10.8 ms ±2.6% (94) |        10.27× |
| `run: type + string property` (333)         |   112.5 ms ±1.6% (10) |   56.8 ms ±1.8% (18) |         1.98× |
| `run: union of two types` (1,100)           |   258.8 ms ±5.2% (10) |  200.0 ms ±3.0% (10) |         1.29× |
| `reactive first result` (400)               |   147.4 ms ±2.0% (10) |   44.6 ms ±6.9% (23) |         3.31× |
| `cold: reload + open + run type + property` | 6,538.6 ms ±32.9% (3) | 2,305.3 ms ±7.7% (3) |         2.84× |

Host traces (first reactive run of each shape):

| mode   | query                  | objects | docsLoaded | indexHits |     exec | of which doc load |
| ------ | ---------------------- | ------: | ---------: | --------: | -------: | ----------------: |
| memory | type                   |   2,000 |      2,000 |     2,000 | 106.7 ms |           64.7 ms |
| memory | type + property        |     400 |      2,000 |     2,000 | 104.0 ms |           64.3 ms |
| memory | reference traversal    |     400 |      2,000 |     2,000 | 125.4 ms |           84.2 ms |
| memory | order + limit          |      20 |      2,000 |     2,000 | 105.4 ms |           62.2 ms |
| memory | type + string property |     333 |      1,000 |     1,000 |  50.7 ms |           31.4 ms |
| memory | union of two types     |   1,100 |      1,100 |     1,100 |  62.0 ms |           78.8 ms |
| sql    | type                   |   2,000 |          0 |     2,000 |  12.2 ms |                 0 |
| sql    | type + property        |     400 |          0 |       400 |   5.9 ms |                 0 |
| sql    | reference traversal    |      10 |          0 |        10 |  11.8 ms |                 0 |
| sql    | order + limit          |      20 |          0 |        20 |   7.2 ms |                 0 |
| sql    | type + string property |     333 |          0 |       333 |   4.5 ms |                 0 |
| sql    | union of two types     |   1,100 |          0 |     1,100 |  11.4 ms |                 0 |

Memory (deltas over the pre-row collected baseline; the first row's baseline is the heap after the timing
rows):

| measurement                                 | memory: heap peak / retained | sql: heap peak / retained | memory: rss peak / retained | sql: rss peak / retained |
| ------------------------------------------- | ---------------------------: | ------------------------: | --------------------------: | -----------------------: |
| heap after the timing rows (baseline)       |                       731 MB |                    540 MB |                             |                          |
| `warm: type` ×3                             |             +33.2 / −11.0 MB |          +53.4 / −11.1 MB |                 +0.5 / −0.5 |                    0 / 0 |
| `warm: type + property` ×3                  |              +26.8 / −6.5 MB |           +19.8 / −6.9 MB |                       0 / 0 |                    0 / 0 |
| `warm: reference traversal` ×3              |              +26.1 / −1.9 MB |           +13.7 / −2.0 MB |                       0 / 0 |                    0 / 0 |
| `warm: order + limit` ×3                    |              +18.6 / −1.6 MB |            +9.5 / −1.8 MB |                       0 / 0 |                    0 / 0 |
| `warm: type + string property` ×3           |              +21.9 / +2.6 MB |           +20.0 / +2.9 MB |                       0 / 0 |              +1.3 / +1.3 |
| `warm: union of two types` ×3               |              +34.9 / +7.8 MB |           +59.4 / +7.6 MB |                       0 / 0 |                    0 / 0 |
| `cold: reload + open + run type + property` |            +113.8 / +57.0 MB |          +90.4 / +11.8 MB |               +35.5 / +35.3 |              +3.9 / +1.6 |
| `cold: then run type` (all 2,000 tasks)     |             +50.3 / +30.9 MB |         +221.8 / +74.6 MB |               +20.9 / +20.9 |              +6.3 / +5.7 |

### Reading, N = 2,000

- **The executor's memory cost is what stays resident, not what a query allocates.** The timing rows
  leave the process at 731 MB of heap in memory mode against 540 MB in sql mode, from the same 504 MB
  after seeding: about 190 MB the memory executor's document loads left behind in the repo cache, ~46
  KB per document across 4,150. The warm peaks do not separate the modes; they are the client hydrating
  the result objects and are within noise (or higher on sql) for every shape, with retained deltas of a
  few MB either way because the warm peer already holds everything.
- **The cold peer shows the same thing per query.** One 400-result property query after a reload
  retains 57 MB of heap and 35 MB of RSS in memory mode (the host loaded all 2,000 task documents to
  evaluate `priority = 3`), against 12 MB and 1.6 MB on sql (only the 400 hydrated results). The
  follow-up `type` query inverts it: sql retains +75 MB because the client now hydrates 2,000 objects
  for the first time, memory mode only +31 MB because the host's load already put them in the cache.
  After both, heap converges (88 MB vs 87 MB) and RSS does not (56 MB vs 7 MB): the memory path's
  cost is paid by the first query regardless of result size, and its WASM-side share never comes back.
- **Speed over the mixed population matches the earlier runs.** The four original rows are within a
  few percent of the `c5294281` results (1.7× / 2.7× / 4.1× / 10.3×), so the notes and events in the
  store did not slow the task queries on either path: both start from the type index. The new
  `type + string property` row is 2.0×, smaller than the numeric one because its memory-path cost
  (1,000 event documents) is half.
- **Union is the weakest sql row at 1.29×**, and the host trace says why: 11.4 ms in the statement, so
  the remaining ~190 ms of the 200 ms is the client hydrating 1,100 results (550 of them 1 KB notes).
  Same story as `run: type`: once the result set is large, the client dominates and the executor's
  share of the row is small in both modes.

### N = 5,000 (10,300 objects per peer), `ee130802` harness

Two harness changes between this and the N = 2,000 tables, both forced by scale:

- **The store is seeded once and cloned.** Seeding a second peer in the same process gets slower with
  everything the first peer left resident, and its flushes reached the 30 s RPC timeout at this size:
  one two-peer memory run passed with a 27.8 s worst flush, the next failed at 8,000 objects of the
  second peer. The warm peer is now file-backed and seeded once (569 s memory run, 574 s sql run), and
  the cold peer opens an `exportSqliteDatabase` copy of that file. The cold peer is therefore genuinely
  cold: nothing of its store has been in this process before the row, where the two-peer harness had
  created the documents in-process and reloaded, leaving the OS page cache and possibly more warm.
- **The memory sampler runs at 10 ms** using `v8.getHeapStatistics()` and `process.memoryUsage.rss()`.
  At 1 ms with `process.memoryUsage()` it ate enough of the event loop to push the client's 2 s
  per-object load budget over on a cold 1,000-result hydration. Peaks are coarser than in the
  N = 2,000 tables; retained figures are unaffected.

Post-seed, collected: heap 629 MB (memory) / 628 MB (sql); RSS 2,231 MB / 2,085 MB, of which 1,286 MB /
1,276 MB is `external`.

| row                                         |              memory |                   sql | sql vs memory |
| ------------------------------------------- | ------------------: | --------------------: | ------------: |
| `run: type` (5,000 of 10,300)               | 678.7 ms ±2.4% (10) |   460.6 ms ±2.3% (10) |         1.47× |
| `run: type + property` (1,000)              | 404.9 ms ±1.8% (10) |   159.2 ms ±4.9% (10) |         2.54× |
| `run: reference traversal` (10)             | 469.8 ms ±0.8% (10) |   118.3 ms ±2.2% (10) |         3.97× |
| `run: order + limit` (20)                   | 293.8 ms ±1.9% (10) |    19.0 ms ±2.0% (53) |        15.46× |
| `run: type + string property` (833)         | 285.0 ms ±1.0% (10) |   150.5 ms ±5.1% (10) |         1.89× |
| `run: union of two types` (2,750)           | 696.6 ms ±2.4% (10) |   496.3 ms ±6.2% (10) |         1.40× |
| `reactive first result` (1,000)             | 359.5 ms ±2.7% (10) |   105.5 ms ±4.4% (10) |         3.41× |
| `cold: reload + open + run type + property` |   failed, see below | 9,064.6 ms ±17.0% (3) |               |

Cold phases, timed inside the row (n = 4 including the warm-up):

| phase                            |                memory |                                     sql |
| -------------------------------- | --------------------: | --------------------------------------: |
| reload + open                    |              1,646 ms |                  1,926 ms (1,706–2,138) |
| run type + property, first, cold | error after 31,965 ms | 9,715 ms (6,744–17,235), 1 short result |

Host traces (first reactive run of each shape):

| mode   | query                  | objects | docsLoaded | indexHits |     exec | of which doc load |
| ------ | ---------------------- | ------: | ---------: | --------: | -------: | ----------------: |
| memory | type                   |   5,000 |      5,000 |     5,000 | 319.6 ms |          205.1 ms |
| memory | type + property        |   1,000 |      5,000 |     5,000 | 273.8 ms |          169.8 ms |
| memory | reference traversal    |   1,000 |      5,000 |     5,000 | 336.6 ms |          228.6 ms |
| memory | order + limit          |      20 |      5,000 |     5,000 | 270.9 ms |          162.1 ms |
| memory | type + string property |     833 |      2,500 |     2,500 | 130.5 ms |           76.6 ms |
| memory | union of two types     |   2,750 |      2,750 |     2,750 | 151.3 ms |          168.4 ms |
| sql    | type                   |   5,000 |          0 |     5,000 |  37.6 ms |                 0 |
| sql    | type + property        |   1,000 |          0 |     1,000 |  13.9 ms |                 0 |
| sql    | reference traversal    |      10 |          0 |        10 |  24.8 ms |                 0 |
| sql    | order + limit          |      20 |          0 |        20 |  16.0 ms |                 0 |
| sql    | type + string property |     833 |          0 |       833 |   9.3 ms |                 0 |
| sql    | union of two types     |   2,750 |          0 |     2,750 |  28.0 ms |                 0 |

Memory (deltas over the pre-row collected baseline):

| measurement                                 | memory: heap peak / retained | sql: heap peak / retained | memory: rss peak / retained | sql: rss peak / retained |
| ------------------------------------------- | ---------------------------: | ------------------------: | --------------------------: | -----------------------: |
| heap after the timing rows (baseline)       |                       874 MB |                    883 MB |                             |                          |
| `warm: type` ×3                             |             +77.7 / −33.8 MB |          +47.7 / −33.6 MB |                 +3.1 / −0.6 |              +3.0 / +0.6 |
| `warm: type + property` ×3                  |             +63.1 / −26.4 MB |           +21.9 / −2.0 MB |                 +1.1 / −1.1 |                    0 / 0 |
| `warm: reference traversal` ×3              |              +59.4 / −4.1 MB |           +15.9 / −9.1 MB |                       0 / 0 |                    0 / 0 |
| `warm: order + limit` ×3                    |              +41.7 / +0.1 MB |           +10.1 / −0.1 MB |                       0 / 0 |                    0 / 0 |
| `warm: type + string property` ×3           |              +33.0 / +6.9 MB |           +25.0 / +7.2 MB |                       0 / 0 |                    0 / 0 |
| `warm: union of two types` ×3               |             +66.5 / +18.6 MB |          +48.7 / +18.8 MB |                 +0.1 / +0.1 |              +0.4 / +0.2 |
| `cold: reload + open + run type + property` |                       failed |          +70.7 / +20.1 MB |                             |            +34.6 / +34.6 |
| `cold: then run type` (all 5,000 tasks)     |                       failed |                    failed |                             |                          |

### Reading, N = 5,000

- **The memory executor cannot answer a cold query at this size.** `Filter.type(BenchTask, { priority:
3 })` on a freshly opened 10,300-object store fails in the client with `Timeout [20,000ms]: index
query` (the query service's first-result budget), in the timing row and in both memory-pass cold
  measurements. The host had to load all 5,000 task documents from disk before it could return
  anything, and at the 7–17 ms per cold document load this store shows, that is 35–85 s. The sql path
  returns the 1,000 identities in ~14 ms and then the client hydrates them, which is the 6.7–17.2 s
  the row measures (one sample came back 936 of 1,000 and was re-run). Cold, the executor decides
  whether the query completes at all; the client's per-document hydration then decides how long.
- **A cold 5,000-result query times out in both modes**: `cold: then run type` failed on the sql path
  too, with 115 `index object load timed out` warnings from the client's 2 s per-object budget. The
  executor is not the limiting factor for large cold result sets; document loading is, and it is the
  same loading on both paths once the identities are known.
- **Warm ratios hold from 2,000 to 5,000**, slightly compressed on the large-result rows (type 1.66 →
  1.47×, union 1.29 → 1.40×) and widened where the memory path's cost scales with the store and sql's
  with the result: order + limit 10.3 → 15.5×, reactive first result 3.3 → 3.4×. Host execution is
  9–38 ms on sql against 130–337 ms in memory mode, the latter 55–70% document loading.
- **Warm peaks now separate the modes**, by 1.5–4× on the task shapes (type + property +63 vs +22 MB,
  order + limit +42 vs +10 MB, traversal +59 vs +16 MB): the memory executor's per-query working set
  of 5,000 loaded documents is large enough at this N to show over the client's hydration, where at
  2,000 it was inside the noise. Retained deltas are within a few MB of each other on every warm row.
- **The resident-heap gap from N = 2,000 did not reproduce.** After the timing rows both modes sit at
  ~880 MB, where the two-peer harness at 2,000 had memory mode 190 MB above sql. The cold rows differ
  between the harnesses (a clone here, an in-process reload there) and the memory-mode cold row failed
  before it could load anything, so the two runs' baselines are not measuring the same sequence; the
  memory executor's document leases are also released after each query (`using` in the deleted
  `_loadFromAutomerge`), which would let a file-backed host unload them. Not established here; the
  per-query cold figures from N = 2,000 (+57 MB / +35 MB RSS retained for one 400-result query) remain
  the direct measurement of what a memory-mode query leaves behind.

### Seeding does not scale, and that bounds these runs

N = 10,000 (20,550 objects per peer) was attempted first and failed in both modes during seeding, with
`RPC timeout: call: {"timeout":30000}` from `RepoProxy._sendUpdates` and the client proxy closing. The
per-flush cost grows with the size of the store. Measured in the sql attempt, 200-object batches:

| objects seeded | elapsed | slowest flush in the last 1,000 |
| -------------: | ------: | ------------------------------: |
|          1,000 |    28 s |                           5.5 s |
|          2,000 |    63 s |                           4.6 s |
|          3,000 |   102 s |                           7.5 s |
|          4,000 |   152 s |                           8.3 s |
|          5,000 |   202 s |                           8.8 s |

and in the two-peer N = 5,000 memory run, 10,300 objects per peer: the first peer's flushes rose from
3.0 s to 13.4 s over its 10,000 objects; the second peer's, seeded into the same process, from 8.2 s
to 27.8 s. The second peer is slower at every point, so the cost is process-wide (the heap and
Automerge's WASM memory the first peer left behind), not only per-subscription. The growing call is the
`DataService.updateSubscription` the client issues for each batch of new documents; what in the host's
`addDocuments`/sync path scales with the store is not established here and is a follow-up outside the
executor. Practical limit for this harness: ~15k objects in one process before a flush hits the 30 s
RPC timeout, hence N = 5,000 as the larger run and the single-seed clone for the cold peer.
