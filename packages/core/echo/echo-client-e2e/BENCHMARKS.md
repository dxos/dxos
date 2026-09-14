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
