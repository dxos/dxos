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
