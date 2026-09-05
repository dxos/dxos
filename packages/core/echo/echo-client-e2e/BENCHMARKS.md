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

## Baseline → final, `0dab2f81` → `27735fbc`

Per-op, both from this file. Every ECHO read row is a `Proxy` trap still (Stage C is blocked — DESIGN.md
D9), so the floor under these numbers is the trap itself.

| per-op                 | baseline |   final |     Δ |
| ---------------------- | -------: | ------: | ----: |
| read, unpersisted      |   297 ns |  105 ns |  2.8× |
| read, automerge        |  1.69 µs |  133 ns | 12.7× |
| read, feed             |   271 ns |  110 ns |  2.5× |
| read, unpersisted wide |   258 ns |  114 ns |  2.3× |
| read, automerge wide   |  1.83 µs |  130 ns | 14.1× |
| read, feed wide        |   264 ns |  111 ns |  2.4× |
| write, unpersisted     |  14.4 µs | 10.0 µs |  1.4× |
| write, automerge       |   399 µs |  287 µs |  1.4× |
| write, feed            |  12.4 µs |  8.7 µs |  1.4× |
| make, unpersisted      |   118 µs |   88 µs |  1.3× |
| make, automerge        |   4.3 ms |  3.2 ms |  1.3× |
| make, feed             |   414 µs |  269 µs |  1.5× |

Reads against plain (8 ns): unpersisted 13×, automerge 17×, feed 14× — from 44× / 249× / 40×. Writes
and construction moved only through Stage A's `isValidProxyTarget` change and sit inside the ~20%
between-run band for the µs rows; the automerge write is a per-set Automerge commit (F2) and was never
in scope here.
