# oxigraph-sqlite — spareval (Oxigraph's SPARQL engine) in wasm, data in DO SQLite

Every number below comes from the deployed worker `https://rdf-bench-oxigraph-sqlite.dxos.workers.dev`.
The benchmark run (`results/oxigraph-sqlite.json`, db `run-1791831020627`) ran on worker version
`8dd8f26f-c04e-4a33-9773-c529b8a71921`. The micro-benchmarks, cold-start probe and ingest A/B ran on
`f7aae0bd-d08e-45e9-be5d-e8e946b08141`, which has the same engine plus one extra `/micro` mode. No local number is
reported. The sibling variant [oxigraph-kv](oxigraph-kv.md) (the full Oxigraph Store with SQLite as its KV store) is compared
in §6.

## 1. Approach

A Rust crate (`rs/`, built for `wasm32-unknown-unknown` with wasm-bindgen 0.2.129 and wasm-opt) links
`spareval 0.2.7` / `spargebra 0.4.7` / `sparopt 0.3.7` / `oxrdf 0.3.4`. These are the evaluator crates Oxigraph 0.5.11
uses; spareval is built with `sep-0006`, which enables LATERAL for-loop joins. The crate implements spareval's
`QueryableDataset` over a dictionary-encoded quad table in DO SQLite. `InternalTerm` is a `u32` term id, or a
boxed term for values that are not stored (BIND results, unknown constants). `internal_quads_for_pattern` makes a
synchronous wasm→JS call that opens a lazy `sql.exec` cursor on the right covering index. Pages of integer ids then come
back through a shared `Uint32Array` in wasm memory, holding only the unbound columns. Pages start at 16 rows and
grow ×4 up to 2048, so LIMIT and EXISTS probes stay cheap. Terms decode lazily (`id → key`, one SQL point
lookup per miss) into a per-DO cache in wasm. Two per-query memos cut SQL round trips:

- **Subject-star prefetch:** any default-graph pattern with a bound subject fetches all of that subject's rows once
  and filters them in wasm.
- **Small-scan memo:** scans of ≤1024 rows are memoized, because bind-join probes repeat.

Ingest stays in JS: term keys are interned set-wise in SQL (`INSERT OR IGNORE … SELECT FROM json_each(?)`, then one
`SELECT id,k … WHERE k IN json_each(?)`). The quads go in as one `INSERT … SELECT FROM json_each(?)`. All of it runs in
one `transactionSync` per batch.

```
query:  SPARQL ──► wasm: spargebra parse ─► sparopt plan ─► spareval eval
                      │  internal_quads_for_pattern(s?,p?,o?,g?)     (sync import, ~5–13 ns)
                      ▼
        JS host: sql.exec("SELECT <free cols> FROM quads WHERE s=? AND p=? AND +g=0").raw()
                      │  rows → Uint32Array page in wasm memory (ids only)
                      ▼
        DO SQLite: terms(id INTEGER PK, k TEXT UNIQUE)
                   quads(s,p,o,g) PK(s,p,o,g) WITHOUT ROWID + idx (p,o,s,g) (o,s,p,g) (g,s,p,o)
        result terms: id → key via cached point lookups → JSON → harness Row[]

ingest: Quad[] ─► JS keys ("I<iri>", "S<lex>", "D<dt> <lex>", "L<lang> <lex>", "B<id>")
        ─► transactionSync { INSERT OR IGNORE terms FROM json_each ; SELECT ids ; INSERT OR IGNORE quads FROM json_each }
```

## 2. Numbers

### Per scale (harness run)

| facts   | triples   | ingest quads/s | median batch ms | dbBytes     | bytes/triple | cold start ms (harness) |
| ------- | --------- | -------------- | --------------- | ----------- | ------------ | ----------------------- |
| 1,000   | 10,128    | 58,833         | 218             | 1,200,128   | 118.5        | 551                     |
| 10,000  | 101,441   | 59,911         | 201             | 11,038,720  | 108.8        | 310                     |
| 100,000 | 1,014,923 | 25,795         | 427             | 109,199,360 | 107.6        | 492                     |

Ping was 45.7 ms. The 100k-fact scale was loaded in full.

### Queries

Each cell is serverMs (wallMs), then correctness against `expected.json`.

| query        | 1,000 facts | 10,000 facts | 100,000 facts  |
| ------------ | ----------- | ------------ | -------------- |
| Q1_lookup    | 0.6 (45) ✓  | 0.7 (45) ✓   | 0.1 (45) ✓     |
| Q2_entity    | 0.1 (46) ✓  | 2.7 (48) ✓   | 10.0 (58) ✓    |
| Q3_filtered  | 0.0 (47) ✓  | 0.9 (50) ✓   | 14.3 (66) ✓    |
| Q4_asof      | 0.4 (48) ✓  | 4.1 (53) ✓   | 55.9 (72) ✓    |
| Q5_aggregate | 2.8 (51) ✓  | 15.0 (60) ✓  | 56.9 (158) ✓   |
| Q6_join      | 2.1 (46) ✓  | 18.0 (88) ✓  | 1158.5 (991) ✓ |
| Q8_text      | 0.3 (47) ✓  | 10.5 (57) ✓  | 121.5 (148) ✓  |
| Q9_optional  | 0.0 (48) ✓  | 4.7 (46) ✓   | 9.3 (59) ✓     |
| Q10_count    | 12.4 (54) ✓ | 70.4 (115) ✓ | 843.3 (762) ✓  |

**Q7** (code graph, 10k files, `imports+`): wall 79.7 ms, ✓ (1318 files). Code-graph ingest took 1538 ms.

All 27 query × scale results match the oracle. Literal outputs are canonicalized in wasm (`ExpressionTerm`
round trip), so typed literals print the way Oxigraph prints them.

### Crossing and SQL costs (`/micro`, deployed)

Each figure is the slope between n=1 and n=K in-DO iterations, so the network cancels out. Two runs are shown because
the figures are noisy at the µs level.

| operation                                                                        | µs per op     |
| -------------------------------------------------------------------------------- | ------------- |
| bare wasm→JS import call                                                         | 0.005 / 0.013 |
| one pattern scan driven from wasm (bound subject, 10 rows, ids copied into wasm) | 19.6 / 21.1   |
| the same scan issued directly from JS (no wasm)                                  | 16.0 / 24.3   |
| `sql.exec('SELECT 1')`                                                           | 8.4 / 8.1     |
| term point lookup `SELECT k FROM terms WHERE id=?`                               | 10.6 / 13.2   |

So the wasm↔JS crossing is free. A triple pattern costs about 20 µs, which is the SQL statement itself (about 8 µs
fixed per `exec`, plus row materialization of about 1 µs per row). The cost of a query is therefore
(number of patterns spareval issues) × ~20 µs plus rows × ~1 µs. The per-query counters (`/stats` →
`lastQueryCounters`) show this directly. The table below comes from the deployed worker on a 10k-fact db:

| query | SQL scans | memo hits | rows crossed | term decodes |
| ----- | --------- | --------- | ------------ | ------------ |
| Q1    | 1         | 0         | 10           | 20           |
| Q2    | 18        | 0         | 179          | 133          |
| Q3    | 58        | 11        | 635          | 109          |
| Q4    | 102       | 101       | 1,128        | 117          |
| Q5    | 1         | 0         | 10,000       | 151          |
| Q6    | 1,044     | 935       | 10,557       | 328          |
| Q8    | 451       | 0         | 5,026        | 566          |
| Q9    | 41        | 40        | 446          | 46           |
| Q10   | 1         | 0         | 101,441      | 0            |

### Ingest: interning in SQL, with and without the JS key cache

Deployed, 20 batches of 1000 facts (10,150 quads) into a fresh db, median batch round trip:

- JS key→id cache on: 251 ms.
- Cache off (every batch interns every key through SQL): 220 ms.

The difference is within noise. Set-based interning through `json_each` is cheap enough that a cache, whether in JS or
in Rust, buys nothing. Ingest slows at 100k facts (427 ms per batch vs about 200) as the four B-tree indexes and the
`terms.k` unique index grow.

### Bundle, memory, cold start

- **Bundle:** `wrangler deploy` reports 2092 KiB total, **724 KiB gzip**. The wasm alone is 2.10 MB raw and
  715 KB gzip. That is about 7% of the 10 MB paid-plan limit.
- **Peak wasm memory** (`memory.buffer.byteLength`): **2.0 MB** at 1M triples. The data never enters wasm.
- **Wasm instantiate cost:** **14.1 ms** per `new WebAssembly.Instance` of the precompiled module, deployed slope over 40
  instances.
- **Cold start:** the harness cold numbers are 551 / 310 / 492 ms against a ping of about 46 ms. My probe (`cold.mjs`,
  5 rounds at 10k facts) measured 88–420 ms first request after `ctx.abort()` vs 52–60 ms warm. **`ctx.abort()` did
  not recycle the isolate:** the module-level counters show the wasm instance was reused every time. The cold cost is
  therefore DO restart plus SQLite reopen, not wasm. Nothing replays: the data stays in SQLite and there is no index
  rebuild. A truly fresh isolate adds the ~14 ms instantiate.

## 3. Capabilities

**Probes: 22/22** pass. There are no failures.

| feature                                                | status                                                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| SELECT / ASK / CONSTRUCT / DESCRIBE                    | supported (spareval). ASK and CONSTRUCT are serialized as rows by `query()`                                                         |
| OPTIONAL, UNION, MINUS, FILTER (NOT) EXISTS            | supported                                                                                                                           |
| FILTER functions (REGEX, string, numeric, date, casts) | supported, with full XPath function coverage from spareval                                                                          |
| BIND, VALUES, subqueries, ORDER/LIMIT/OFFSET           | supported                                                                                                                           |
| aggregates incl. GROUP_CONCAT, HAVING                  | supported                                                                                                                           |
| property paths (`/`, `^`, `\|`, `*`, `+`)              | supported. Q7 `imports+` returns correct results                                                                                    |
| named graphs (`GRAPH ?g`)                              | supported through the `g` column (0 = default graph)                                                                                |
| SPARQL UPDATE                                          | **not wired**. Feasible: spareval's `prepare_delete_insert` yields the quads to delete and insert, which then map to SQL (≈100 LoC) |
| deletes                                                | feasible with SQL (`DELETE FROM quads WHERE …`). Orphaned terms are left behind, and a GC pass is optional                          |
| RDF 1.2 triple terms                                   | not enabled. Feasible: spareval `sparql-12` feature plus a `T` key tag with nested term ids                                         |

**Transactions:** each ingest batch is one `transactionSync`, so a batch is atomic. A query reads the live DB and is
consistent because DO requests are single-threaded and the evaluation is synchronous. Incremental updates are
row-level: adding or removing a quad costs O(log n) in SQLite, with no rebuild or replay.

**Semantic caveat:** terms are stored lexically. `"1"^^xsd:decimal` and `"1.0"^^xsd:decimal` get different ids, so
joins or DISTINCT over non-canonical numeric spellings differ from Oxigraph, which stores values. FILTER comparisons
are value-based and unaffected. Canonicalizing at ingest (in wasm) would close this; the benchmark data never hits it.

## 4. Limits & scale

- **What breaks first:** CPU and latency on plans that issue many patterns, not memory. Q6 at 1M triples issues tens of
  thousands of SQL scans, which comes to about 1.0–1.2 s. Q10 (`COUNT(*)` over everything) streams all 1M ids through
  JS at about 0.8 µs per row, which comes to about 0.8 s.
- **sparopt has no statistics:** with `sep-0006` it prefers LATERAL bind joins whenever they fit. That is right for
  selective queries and wrong for fan-out joins like Q6. Without `sep-0006`, spareval hash-joins over full pattern scans:
  Q2 at 10k facts then streamed 101,457 rows across the boundary, against 179 with LATERAL. These are deterministic row
  counters from a debug build, not a timing.
- **SQLite planner trap (fixed):** the constant `g = 0` made SQLite choose the `(g,s,p,o)` index and scan the whole
  default graph for every `p`- or `o`-bound pattern. On the deployed build that still had it (version `2b65bc6c`, also
  without the memos), Q6 at 10k facts took 782 ms serverMs, and Q6 at 100k did not finish within 10 minutes of
  iterations. After writing it as `+g = 0`, Q6 takes 18 ms and 1.16 s. Logs are in `run1-oldbuild.log` and
  `run2-badplan.log`.
- **Memory:** wasm stays at about 2 MB. The JS key cache is capped at 500k entries, roughly 50 MB at 10M triples. It
  buys nothing (§2), so it should be dropped or capped near 50k before production.
- **Storage:** 108 bytes/triple. Of that, the `terms.k` text appears twice (table and UNIQUE index), and there are four
  quad indexes. Dropping `(g,s,p,o)` when there are no named graphs, or hashing the key index, would save about 25–30%.
- **Request and string limits:** DO SQLite rejects a bound string over about 2 MB. Batches use `json_each`, and a
  1000-fact batch is far below that.
- **Extrapolation to 10M triples (labelled extrapolation, linear from 1M):**

  | metric                       | estimate                 |
  | ---------------------------- | ------------------------ |
  | DB size                      | ~1.1 GB (DO limit 10 GB) |
  | full ingest                  | ~6.5 min at ~26k quads/s |
  | Q1, Q2, Q3, Q9 (index-bound) | stay at ≤ tens of ms     |
  | Q5 (one-predicate scan)      | ~0.6 s                   |
  | Q6                           | ~10+ s CPU               |
  | Q10                          | ~8 s                     |

  Q10 needs a count pushdown to be usable at that size. Within the 300 s CPU budget, the risk is latency, not failure.

## 5. Effort & risk

- **LoC:** Rust 619 (`rs/src/lib.rs`, including about 60 lines of micro-benchmarks); TS 373 (`src/index.ts`, including
  about 90 lines of `/micro`). Build script is 10 lines.
- **Dependencies:** spareval, spargebra, sparopt, oxrdf and oxsdatatypes, all pinned `=` as Oxigraph pins them, plus
  wasm-bindgen 0.2.129 and rustc-hash. This is upstream code with no fork.
- **Toolchain:** rustc ≥1.87 with `wasm32-unknown-unknown`, a version-matched `wasm-bindgen-cli`, and binaryen
  `wasm-opt`. A clean build takes about 50 s; an incremental one about 15 s.
- **Maintenance:** small. The only coupling is the `QueryableDataset` trait, which is stable across 0.2.x.
  The SQL schema and the query → index mapping are ours.
- **Portability to the browser:** good. The engine only needs a synchronous `exec(sql, params) → rows` function. In
  the browser, wa-sqlite's synchronous build (OPFS `AccessHandlePool` VFS in a worker) or sql.js fits directly, with
  the same wasm and SQL. The async-only wa-sqlite builds would not work, because spareval's iterators are synchronous.

## 6. Verdict

Compared with `oxigraph-kv` (same evaluator, full Oxigraph Store over a SQLite KV table, all correct, 22/22), this
variant ingests 4× faster, stores 2× less per triple, and is 8× faster on Q6 at 1M triples. See
[oxigraph-kv](oxigraph-kv.md).

| criterion                                | score (1–5) |
| ---------------------------------------- | ----------- |
| query latency                            | 4           |
| ingest throughput                        | 4           |
| scale ceiling                            | 4           |
| SPARQL coverage                          | 5           |
| cold start                               | 5           |
| implementation complexity (5 = simplest) | 3           |

Full SPARQL 1.1 from Oxigraph's own evaluator is correct on every query and probe, in a 724 KiB gzip bundle with about
2 MB of wasm memory. The data lives in SQLite, so there is no memory ceiling and no cold-start replay. The remaining
cost is about 20 µs of SQL per triple pattern. That makes fan-out joins and whole-graph aggregates the slow spot, and
the fixes are statistics-aware planning (hash join vs LATERAL) and aggregate pushdown.
