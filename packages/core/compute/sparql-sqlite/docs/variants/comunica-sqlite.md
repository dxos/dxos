# comunica-sqlite: a replica of today's `@dxos/pipeline-rdf` storage

Deployed at `https://rdf-bench-comunica-sqlite.dxos.workers.dev`. Every number below comes from that
deployed worker, **version `10b9d73a-8b19-461e-b765-9ffec8ab5124`**, run `run-1791829228257`
(`results/comunica-sqlite.json`, log `variants/comunica-sqlite/run1.log`). A later version,
`51d0b4bb-97b3-4960-a688-f0b3eea3c276`, only wraps the worker entrypoint in a try/catch. I deployed
it to diagnose the 100k errors and took no benchmark numbers from it.

## 1. Approach

This variant copies pipeline-rdf one-for-one:

- The schema is `0001_init.sql`: a text-keyed `triples(s,p,o,oType,g)` table with
  `UNIQUE(s,p,o,oType,g)`, `(s,p,o)` and `(p,o)` indexes, plus the unused `entities` and `cursors`
  tables.
- Ingest is one `INSERT … ON CONFLICT DO NOTHING` per quad inside `ctx.storage.transactionSync`.
- The query path is `new QueryEngine()` from `@comunica/query-sparql-rdfjs@5.2.3`, the version the
  dxos catalog pins. It runs over an RDF/JS Source whose `match()` builds a `WHERE` from the bound
  positions.

The Source copies two pipeline-rdf behaviours exactly:

- It materializes the SQL result into an array of n3 quads and wraps it with `asynciterator.wrap`.
- It has no `countQuads`.

It also drops literal datatypes the same way: `rowToQuad` → `literal(row.o)`, and `oType` holds only
`iri` or `literal`. The only change from pipeline-rdf is the SQL client: `ctx.storage.sql.exec`
(synchronous) replaces `@effect/sql`.

```
ingest:  Quad[] ─► transactionSync { for q: INSERT INTO triples(s,p,o,oType,g) … ON CONFLICT DO NOTHING }
query:   SPARQL ─► Comunica (parse → algebra → optimize → joins/filters/aggregates)
                     │ per triple pattern:
                     ├─► Source.match(s,p,o,g) ─► SELECT … FROM triples WHERE … ─► toArray() ─► n3 Quads ─► wrap()
                     └─► no countQuads ⇒ Comunica calls match() AGAIN and counts the stream for cardinality
```

## 2. Numbers

The runner was `node bench/run.mjs --probes` with the default scales. Ping was 34 ms. `serverMs` is
the per-execution slope; wall time includes the network.

| facts   | triples   | ingest quads/s | median batch ms | dbBytes     | bytes/triple | cold start ms (Q1 after abort) |
| ------- | --------- | -------------- | --------------- | ----------- | ------------ | ------------------------------ |
| 1,000   | 10,128    | 31,769         | 353             | 3,883,008   | 383          | 355                            |
| 10,000  | 101,441   | 35,567         | 330             | 39,231,488  | 387          | 453                            |
| 100,000 | 1,014,923 | 19,617         | 545             | 396,468,224 | **391**      | 451                            |

`serverMs` per query (✓ means rows and checksum match `src/testing/expected.json`):

| query        | 1k facts        | 10k facts      | 100k facts                                      |
| ------------ | --------------- | -------------- | ----------------------------------------------- |
| Q1_lookup    | 1.0 ✗           | 2.6 ✗          | 2.8 ✗                                           |
| Q2_entity    | 95.7 ✗          | 990 ✗          | **error 1101 (isolate reset)**                  |
| Q3_filtered  | 101 ✓ (0 rows)  | 1,485 ✗        | **error 1101**                                  |
| Q4_asof      | 37.1 ✗ (0 rows) | 483 ✗ (0 rows) | 5,812 ✗ (0 rows)                                |
| Q5_aggregate | 137 ✓           | 629 ✓          | 5,553 ✓                                         |
| Q6_join      | 112 ✓           | 1,172 ✓        | 2,946 ✓ (wall 29,686 — the slope is noisy here) |
| Q8_text      | 30.7 ✓          | 371 ✓          | 5,706 ✓                                         |
| Q9_optional  | 16.8 ✓          | 280 ✓          | 2,873 ✓                                         |
| Q10_count    | 306 ✓           | 4,403 ✓        | **error 1101**                                  |

- **Q7, the code graph (10k files, 65k triples):** wall time 997 ms, correct (1,318 rows). Ingest took
  3.1 s.
- **Bundle size:** 6,326 KiB, or 1,018.6 KiB gzipped, from the `wrangler deploy` output. Comunica is
  essentially all of it.
- **workerd:** Comunica runs in workerd. I deployed with `nodejs_compat`, copied from noop. The bundle
  also builds without that flag (1,037 KiB gzipped, because wrangler polyfills `events`, `buffer` and
  `readable-stream`), but I did not run it that way.
- **Peak memory:** not observable in a deployed Durable Object. The 1101 errors are memory
  exhaustion, inferred: each one ran 12 s and then killed the whole isolate, so even a try/catch in
  the worker entrypoint could not catch it.

## 3. Capabilities

**Probes: 16/22 pass.** The failures:

| probe            | rows (ours/oracle) | cause                                                                                                                  |
| ---------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| bgp_star         | 28/28              | `?c` comes back as a plain string, not `xsd:decimal`, so the checksum differs                                          |
| filter_numeric   | 0/91               | `?c > 0.5` compares a string to a number. That is a type error, so every row is filtered out                           |
| filter_date      | 0/288              | `YEAR(?t)` on a plain string is a type error                                                                           |
| agg_having       | 1/1                | `AVG(?c)` over strings is an error, so `?avg` is unbound                                                               |
| order_offset     | 5/5                | ISO strings sort correctly, but `?t` loses `xsd:dateTime`                                                              |
| agg_group_concat | 1/1                | Comunica concatenates IRIs, while the SPARQL spec (and Oxigraph) leave `?ps` unbound. comunica-interned fails this too |

**The datatype loss breaks results today, without raising an error.** pipeline-rdf stores `oType`
as `literal` and rebuilds every literal as `xsd:string`. As a result:

- Every typed comparison that lacks an explicit cast silently returns **0 rows**:
  - Q4 as-of (`?t <= "…"^^xsd:dateTime`) returns 0 rows at every scale.
  - `filter_numeric` and `filter_date` return 0 rows.
- Every result that carries numbers or dates comes back typed as a string. That makes Q1, Q2 and Q3
  wrong, and `bgp_star` and `order_offset` too.
- Aggregates over typed values (AVG, SUM) are errors.

`buildSparql({minConfidence})` survives only because it wraps the value in an explicit
`xsd:decimal(?conf)` cast: Q3's row count is right, though its `?o` values are mistyped. Any new
query shape that relies on literal types, such as as-of time windows, numeric ranges or dates, is
broken by the storage format, not by Comunica.

**SPARQL 1.1 support**, all Comunica's:

- **Supported:**
  - SELECT, ASK, CONSTRUCT and DESCRIBE.
  - OPTIONAL, UNION, MINUS, (NOT) EXISTS, FILTER functions, BIND and VALUES.
  - Aggregates, subqueries and property paths.
  - Named graphs, through the `g` column.
- **Not supported:**
  - SPARQL UPDATE: the Source is read-only. Comunica would need an RDF/JS Store with
    `import`/`remove`/`deleteGraph`. That is feasible, roughly 50 LoC.
  - Deletes: the schema has no delete path today.
  - RDF-star / RDF 1.2 triple terms: they cannot be stored, because `oType` has no quoted-triple
    kind.

**Transactions and updates:** each ingest batch is one transaction, and the unique index makes
duplicate inserts no-ops. Updates are incremental, with no index rebuild.

## 4. Limits & scale

At 1M triples, **memory breaks first.**

- **Q2, Q3 and Q10 kill the isolate.** Q10 materializes every row. For Q2 and Q3, Comunica requests
  cardinality metadata for every pattern, including the unbound `?fact ?p ?o` of the expand step.
  With no `countQuads`, the Source answers by running `match()` a second time, so the whole 1M-row
  table is materialized as n3 quads, twice. This mechanism is inferred from Comunica's source; the
  1101 errors are measured.
- **Every query that touches more than about 10⁵ bindings costs seconds.** Comunica spends roughly
  30–60 µs per binding.
- **Storage is large:** 391 B/triple, because every index repeats the full IRIs and literals.

Extrapolation to 10M triples:

- About 3.9 GB of SQLite, which is within the 10 GB Durable Object limit but costly.
- Every non-point query except Q1 would hit the 128 MB memory limit or the 300 s CPU limit.

## 5. Effort & risk

- **Size:** 110 non-blank LoC.
- **Dependencies:** `@comunica/query-sparql-rdfjs`, `n3` and `asynciterator`, about 120 transitive
  packages. No Rust or wasm.
- **Browser portability:** it ports easily. This is the code pipeline-rdf already runs.
- **Risk:** the bundle (1 MB gzipped) and the silent wrong answers on typed literals.

## 6. Verdict

| query latency | ingest | scale ceiling | SPARQL coverage                           | cold start | simplicity |
| ------------- | ------ | ------------- | ----------------------------------------- | ---------- | ---------- |
| 1             | 3      | 1             | 3 (full syntax, broken literal semantics) | 3          | 5          |

The current design is the simplest one, but it cannot answer typed-literal queries correctly at any
scale (Q4 as-of always returns 0 rows). At 1M triples it runs out of memory on three of the nine
queries, because the Source materializes rows and gives Comunica no cardinalities.
