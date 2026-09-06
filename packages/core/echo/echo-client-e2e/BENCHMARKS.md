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
