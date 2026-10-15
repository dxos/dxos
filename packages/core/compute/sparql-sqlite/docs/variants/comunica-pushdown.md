# comunica-pushdown: Comunica with SQL pushdown through selector shapes

**Deployed:** `https://rdf-bench-comunica-pushdown.dxos.workers.dev`, version
`46dd5f97-7fa1-426d-a61e-86c03774082e`. Every number below comes from that deployed worker unless it
is labelled otherwise. Results are in `results/comunica-pushdown.json` (db `run-1791830820730`, run
2026-10-12 18:47–18:55 UTC).

Ablation data is in two more files:

- `results/comunica-pushdown-v2-run.json`: an earlier version, `56fa023f-…`, that pushed down only BGPs,
  PROJECT, DISTINCT, COUNT-GROUP and IRI filters, and decoded each term with its own statement.
- `results/comunica-pushdown-v4-100k-requery.json`: final code, re-timed on the v2 run's 1M-triple db.

## 1. Approach

The store is SQLite: a `terms` dictionary (`id, kind, value, dt, lang`, with a unique key) and an integer
`quads(s,p,o,g)` table (`WITHOUT ROWID`, PK `spog` plus covering indexes `posg`, `ospg`, `gspo`).
Comunica 5.4 (`@comunica/query-sparql-rdfjs`, today's pipeline-rdf engine) does the parsing and
planning.

The source is not an RDF/JS `match()` source. It is a custom Comunica **`IQuerySource`** whose
**selector shape** accepts patterns plus JOIN, BGP, PROJECT, DISTINCT, UNION and GROUP. It also accepts
FILTER and LEFT_JOIN when the query's filters and OPTIONALs are of the compilable kind, which it checks
from the parsed query in `getSelectorShape(context)`.

Comunica's `group-sources` optimizer then hoists the largest accepted subtrees into the source, the
same mechanism its SPARQL-endpoint source uses. The source compiles each hoisted subtree to **one SQL
statement**:

- self-joins for BGPs
- `JOIN` / `LEFT JOIN` on shared variables
- `UNION ALL`, `DISTINCT`, `COUNT` / `COUNT(DISTINCT)` with `GROUP BY`
- IRI `=` / `!=` and `CONTAINS`

Terms are decoded by a `LEFT JOIN terms` in the same statement. Cardinality comes from a capped
`COUNT(*) … LIMIT 1000`, which is exact for small results, so Comunica's join planner gets real numbers.
Rows stream lazily from the cursor.

A hoisted subtree the compiler cannot handle is evaluated by a **nested Comunica query** against a
BGP-only twin of the source, so coverage never drops below plain Comunica. Typed filters
(`xsd:decimal`, dateTime), REGEX, paths, ORDER BY / LIMIT and non-COUNT aggregates stay in Comunica.

```
query:  SPARQL ─► Comunica parse + optimize ─► group-sources hoists accepted subtrees
                       │                                │
                       │ (FILTER typed, paths,          ▼
                       │  ORDER/LIMIT, SUM/AVG…)   SqlBgpSource.queryBindings(op)
                       ▼                                │ compileOperation(op) ──► 1 SQL stmt ──► ctx.storage.sql
                 Comunica operators ◄── bindings ◄──────┤   (joins terms for decode, capped COUNT for cardinality)
                                                        └ uncompilable ─► nested Comunica over BGP-only source
ingest: Quad[] ─► transactionSync { per term: INSERT…ON CONFLICT…RETURNING id (LRU-cached);
                                    INSERT OR IGNORE quads(s,p,o,g) }  ─► PRAGMA optimize
```

## 2. Numbers (deployed)

Network ping is 31.5 ms median, and generating data in the DO costs 45.9 ms per 1000-fact batch;
`wallMs` includes both.

| scale (facts) | triples   | ingest quads/s | median batch ms | dbBytes     | bytes/triple | cold start ms (Q1 after `abort`) |
| ------------- | --------- | -------------- | --------------- | ----------- | ------------ | -------------------------------- |
| 1,000         | 10,128    | 26,435         | 415             | 1,224,704   | 120.9        | 385                              |
| 10,000        | 101,441   | 10,134         | 949             | 11,255,808  | 111.0        | 471                              |
| 100,000       | 1,014,923 | **2,208**      | **4,228**       | 110,837,760 | **109.2**    | 595                              |

Ingest slows as the B-trees grow: from 27k to 2.2k quads/s. At 1M triples a 10k-quad batch takes
4.2 s; the whole 1M load took 417 s.

`serverMs` per query (✓ = matches the Oxigraph oracle in rows and checksum):

| query                                          | 10k triples | 100k triples | 1M triples   | what runs in SQL                        |
| ---------------------------------------------- | ----------- | ------------ | ------------ | --------------------------------------- |
| Q1_lookup                                      | 2.8 ✓       | 2.2 ✓        | **2.4** ✓    | whole query                             |
| Q2_entity (UNION + DISTINCT subquery + expand) | 2.9 ✓       | 5.9 ✓        | **47.8** ✓   | whole query                             |
| Q3_filtered (`xsd:decimal` filter)             | 4.2 ✓       | 18.5 ✓       | 145.8 ✓      | BGP + expand; typed filter in Comunica  |
| Q4_asof (dateTime filter, ORDER, LIMIT)        | 6.9 ✓       | 32.3 ✓       | 74.8 ✓       | BGP; filter, sort and limit in Comunica |
| Q5_aggregate (GROUP/COUNT/ORDER)               | 24.6 ✓      | 31.7 ✓       | 47.7 ✓       | GROUP + COUNT; ORDER/LIMIT in Comunica  |
| Q6_join (2-hop star, DISTINCT)                 | 2.3 ✓       | 9.3 ✓        | **1592.9** ✓ | whole query (SQLite-bound, see §4)      |
| Q8_text (CONTAINS)                             | 2.3 ✓       | 6.8 ✓        | 72.5 ✓       | whole query (`instr` on joined term)    |
| Q9_optional                                    | 2.1 ✓       | 2.7 ✓        | **11.7** ✓   | whole query (`LEFT JOIN`)               |
| Q10_count (COUNT(*))                           | 3.0 ✓       | 9.8 ✓        | 104.1 ✓      | whole query                             |

**Q7 (code graph, 10k files, `imports+`):** wall 552 ms, ✓ correct (n = 1318). The property path runs in
Comunica, and code ingest took 3.1 s.

**Ablation at 1M triples (`serverMs`).** The baseline pushes down only BGPs; the final version pushes
down whole subtrees.

| query | BGP-only pushdown (v2) | Full-subtree pushdown (final) |
| ----- | ---------------------- | ----------------------------- |
| Q2    | 239                    | 48                            |
| Q8    | 185                    | 73                            |
| Q9    | 131                    | 12                            |

The first version (v1) materialised up to 20k rows per pattern eagerly. At 10k triples its Q2 took
47 ms and Q10 took 167 ms, against 2.9 ms and 3.0 ms now (`scratch/run1-v1-eager.log`). Making results
lazy with capped-count cardinality was the largest single win.

**Bundle:** 659 KiB gzip as deployed, including the `/sqlprobe` and `/memprobe` debug routes, which
pull in `rdf-stores`. Without them it was 631 KiB (4.17 MiB raw), and Worker startup time is 71 ms.

**Peak memory:** not observable from inside the DO. The engine keeps two LRU maps of up to 300k
entries each; the data stays in SQLite.

**In-memory comparison** (deployed `/memprobe`, loading only, no querying):

| store        | loads OK     | fails (error 1101) |
| ------------ | ------------ | ------------------ |
| N3 `Store`   | 304k triples | 405k triples       |
| `rdf-stores` | 507k triples | 710k triples       |

So pipeline-rdf's in-memory configuration cannot hold 1M triples in a DO.

## 3. Capabilities

**Probes: 21/22.** The one failure is `agg_group_concat`. Comunica concatenates the IRI strings, while
Oxigraph treats `GROUP_CONCAT` over IRIs as a type error and leaves `?ps` unbound. That is Comunica
leniency, not this storage layer, so any Comunica-based variant fails it.

SPARQL coverage is Comunica's, because anything not compiled falls back to it:

- **Supported:** SELECT (ASK / CONSTRUCT / DESCRIBE through Comunica, not exercised by the harness), OPTIONAL, UNION, MINUS, FILTER functions,
  BIND / VALUES, all aggregates, subqueries, property paths and named graphs.
- **Compiled to SQL today:** BGP, JOIN, OPTIONAL without a filter, UNION, PROJECT, DISTINCT,
  COUNT / COUNT DISTINCT with GROUP BY, IRI `=` / `!=` / `sameTerm`, `CONTAINS`.
- **Feasible to add to SQL:**
  - `+` / `*` paths, through `WITH RECURSIVE` (verified available in DO).
  - Numeric and dateTime comparisons, through a typed `num` column on `terms`.
  - ORDER BY / LIMIT.
  - FTS5 for `REGEX` / `CONTAINS` (FTS5 verified available in DO).
- **SPARQL UPDATE / deletes:** not wired. Comunica's update path needs `queryQuads` plus an RDF/JS
  destination store, which is straightforward to add: `DELETE FROM quads WHERE …`, with
  term-dictionary garbage collection optional.
- **RDF 1.2 triple terms:** not supported. They would need a `kind = triple` term with s/p/o ids.

**Transactions:** each insert batch is one `transactionSync`. Inserts are incremental, with no
whole-store snapshot. Queries read SQLite directly, so there is no cache invalidation beyond the term
caches, which are append-only.

## 4. Limits & scale

**First thing to break: ingest throughput,** not memory or CPU. It falls to 2.2k quads/s at 1M triples
because 10k random inserts per batch go into four quad indexes plus the term index. The 300 s CPU limit
per request leaves plenty of room per batch: the measured maximum was 4.2 s for 10k quads.

**Next: queries with large intermediate results.** Q6 at 1M takes 1.6 s even though its plan is the ideal
index-nested-loop. `/sqltrace` shows `SEARCH … USING COVERING INDEX` on every alias. The skewed
subjects produce hundreds of thousands of join rows, so this is the floor for any engine that executes
that join.

**Not a problem:**

- Memory: data lives in SQLite.
- Statement size: Q2 compiles to a single 748-byte statement (`/sqltrace`), against the 100 KB limit.
- Bound parameters: at most about 10 per statement, against the 100 limit.

**Extrapolation to 10M triples (labelled extrapolation):**

- Storage: about 1.1 GB at 109 B/triple, within the 10 GB DO limit.
- Ingest: below 1k quads/s at the observed decay, so bulk loads of 10M would need hours or a different
  layout (fewer indexes, or batched sorted inserts).
- Point and entity queries (Q1, Q9): stay in the low ms, since they are index lookups.
- Scans and aggregates (Q5, Q10): grow linearly, roughly 0.5–1 s.
- Q6-style skewed joins: grow with fan-out and can reach several seconds.

## 5. Effort & risk

- **Code:** about 790 LoC in `src/engine.ts`, plus 60 in `src/index.ts`; the probes add 160 LoC. All of
  it is TypeScript, with no Rust or wasm.
- **Dependencies:** `@comunica/query-sparql-rdfjs` 5.4, which pipeline-rdf already uses, plus its
  `utils-*` / `context-entries` packages, `n3` and `asynciterator`.
- **Main risk: internal Comunica APIs.** The variant uses `IQuerySource`, selector shapes, the
  `scopedSource` annotation and the `querySources` context key, which are internals more than public
  API. A Comunica major version could move them, so pin the version and cover it with a contract test.
- **Nested fallback:** the fallback query has to strip `scopedSource` annotations (otherwise it
  recursed forever) and materialise its results (otherwise it deadlocked on metadata). Both pitfalls are
  documented in code.
- **Browser portability:** the SQL is plain SQLite with no DO-only features, and the source only needs
  a synchronous `exec` (the `Sql` interface, already tested here against `node:sqlite`). It should
  therefore run on wa-sqlite / OPFS in a worker, where an async `exec` would need either the sync OPFS
  VFS or an `await` per statement. The same code serves pipeline-rdf on both sides.

## 6. Verdict

| criterion                                | score (1–5) |
| ---------------------------------------- | ----------- |
| Query latency                            | 4           |
| Ingest throughput                        | 2           |
| Scale ceiling                            | 4           |
| SPARQL coverage                          | 5           |
| Cold start (≈0.4–0.6 s)                  | 4           |
| Implementation complexity (5 = simplest) | 3           |

This is the cheapest evolution of today's pipeline-rdf design. It keeps Comunica's full SPARQL
coverage, holds 1M triples at 109 B/triple with no memory risk, and puts every production-shaped query
(Q1, Q2, Q9) at 2–50 ms by turning whole subtrees into single SQLite statements. Its weak spots are
ingest at scale (2.2k quads/s at 1M) and the typed filters still evaluated in Comunica; both are fixable
in SQL (a numeric/date column, fewer indexes) without changing the architecture.
