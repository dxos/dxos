# sql-compiler — SPARQL compiled to one SQLite statement over interned quads

All numbers below come from the **deployed** worker `https://rdf-bench-sql-compiler.dxos.workers.dev`,
**version `fc7dbdb1-3ff1-4abe-9e00-340d1c43ba15`**, run `run-1791829875875` (2026-10-12, [`results/sql-compiler.json`](../results/sql-compiler.json)).
An earlier full run on version `12721567-387e-4bba-9c18-505837383490` ([`results/sql-compiler-run1.json`](../results/sql-compiler-run1.json)) agrees
within network noise. Local node:sqlite / wrangler dev runs were used only for debugging.

## 1. Approach

Each SPARQL request is parsed with `sparqljs` and compiled into **one** SQL statement. SQLite runs every join,
filter, aggregate, sort and recursive path in C, and JS only decodes the result rows. Terms are interned into
`terms(id INTEGER PRIMARY KEY, h, kind, lex, dt, lang, num)`. `h` is a 53-bit hash under a UNIQUE index, with
collisions resolved by probing with the next seed. `num` holds the numeric value, or epoch ms for xsd:dateTime,
so FILTER and ORDER BY compile to plain SQL. Quads are `quads(s,p,o,g)` of ids, `WITHOUT ROWID`, with PK SPOG
plus covering POSG and OSPG indexes.

Every variable is one SQL expression of a static type: a term id, or a computed num/str/bool. SQL NULL stands
for SPARQL "unbound", and for "error" inside expressions. SQL's three-valued AND/OR/NOT matches SPARQL's error
logic. The compiler maps SPARQL constructs to SQL like this:

- OPTIONAL becomes LEFT JOIN, with the inner FILTER in ON.
- UNION becomes a UNION ALL derived table.
- MINUS and NOT EXISTS become correlated NOT EXISTS.
- Sub-SELECTs become derived tables.
- Paths `+`/`*`/`?` become `WITH RECURSIVE` with set semantics. The recursion is anchored on a constant end, or
  on the current bindings of an already-bound variable.
- Variables that may be NULL join under compatible-mapping rules: `(a IS NULL OR a = b)` and `COALESCE`.

A query's compiled SQL is cached by its text and dropped on every write. Ingest stays set-oriented: 3 SQL
statements per batch through `json_each`, inside one `transactionSync`.

```
query:  SPARQL ─sparqljs─▶ AST ─compile─▶ ONE SQL stmt ─▶ SQLite (C): joins/filters/agg/CTE
                     constants → ids (hash lookup, cached)          └─▶ LEFT JOIN terms (decode) ─▶ rows → JS Terms
ingest: quads ─JS: encode+hash53, dedupe, LRU key→id─▶ ① INSERT OR IGNORE terms SELECT … json_each(?)
                                                      ② SELECT id, verify FROM json_each(?) LEFT JOIN terms ON h  (collisions → reprobe)
                                                      ③ INSERT OR IGNORE quads SELECT … json_each(?)
                                                      ④ ANALYZE whenever the store has doubled
```

## 2. Numbers

Ping 51 ms. Data generation alone takes 62 ms per batch and is included in the ingest numbers.
`serverMs` = (median of 5 iterations − median of 1) / 4, so values under ~1 ms are noise.

| scale (facts) | triples   | ingest quads/s | median batch ms | dbBytes    | bytes/triple | terms   | cold start ms (Q1) |
| ------------- | --------- | -------------- | --------------- | ---------- | ------------ | ------- | ------------------ |
| 1 000         | 10 128    | 55 621         | 233             | 901 120    | 89.0         | 5 512   | 224                |
| 10 000        | 101 441   | 48 342         | 256             | 7 897 088  | 77.8         | 43 339  | 250                |
| 100 000       | 1 014 923 | 26 266         | 426             | 76 951 552 | 75.8         | 346 742 | 294                |

Cold start for noop is 77 ms. After the cold Q1, Q2 took 59 / 50 / 76 ms wall.

`serverMs` per query (all ✓ = row count and checksum match the oracle):

| query        | 10k triples | 100k triples | 1M triples |
| ------------ | ----------- | ------------ | ---------- |
| Q1_lookup    | 0.0 ✓       | 0.9 ✓        | 0.0 ✓      |
| Q2_entity    | 0.4 ✓       | 0.0 ✓        | 11.0 ✓     |
| Q3_filtered  | 0.0 ✓       | 0.7 ✓        | 3.9 ✓      |
| Q4_asof      | 0.0 ✓       | 0.0 ✓        | 5.7 ✓      |
| Q5_aggregate | 1.1 ✓       | 1.8 ✓        | 9.7 ✓      |
| Q6_join      | 0.1 ✓       | 3.6 ✓        | **597** ✓  |
| Q8_text      | 0.0 ✓       | 2.5 ✓        | 26.5 ✓     |
| Q9_optional  | 0.0 ✓       | 0.4 ✓        | 3.6 ✓      |
| Q10_count    | 0.3 ✓       | 0.4 ✓        | 11.4 ✓     |

- **Q7, code graph** (10 000 files, ~65k triples): wall 53.5 ms (≈ ping, so the query itself is a few ms).
  Correct (1318 reachable). Code ingest took 1.27 s in total.
- **Bundle:** 257.95 KiB, **55.29 KiB gzip** (wrangler deploy). Worker startup time 8 ms.
- **Peak memory:** not observable in a DO (no heap API). The JS side holds one batch's JSON (≤ ~1 MB) and a
  term-key cache bounded at 200k entries (estimated ≤ ~40 MB; can be lowered). All data lives in SQLite pages.
- **Compile cost:** with the plan cache off ([`results/sql-compiler-noplancache.json`](../results/sql-compiler-noplancache.json), 10k facts), serverMs
  stayed in the same 0–10 ms band, within network noise. Parse + compile is a few ms at most.

**Storage experiment** (deployed, 10k facts = 101 441 triples, [`results/sql-compiler-storage.json`](../results/sql-compiler-storage.json)):

| layout                                                              | dbBytes    | bytes/triple |
| ------------------------------------------------------------------- | ---------- | ------------ |
| SPOG only + POSG (2 orderings)                                      | 6 418 432  | 63.3         |
| **+ OSPG (default, 3 orderings)**                                   | 7 897 088  | **77.8**     |
| + GSPO (4 orderings)                                                | 9 424 896  | 92.9         |
| pipeline-rdf text `triples` table (0001_init.sql schema, same data) | 41 074 688 | **404.9**    |

Each covering index costs ≈ 14.6 B/triple. The terms dictionary costs ≈ 20 B/triple (raw lexical bytes alone
are 15 B/triple). Interning is **5.2× smaller** than the text schema.

**EXPLAIN QUERY PLAN** (deployed 1M db; full SQL in [`results/sql-compiler-explain.txt`](../results/sql-compiler-explain.txt)):

- **Q6:** POS(p,o) → PK(s,p) → POS(p,o) → PK(s,p), then a temp B-tree for DISTINCT. That is the optimal
  nested-loop order. The cost is the fan-out over hot subjects (subjects are skewed: entity 0 has thousands
  of facts).
  - The same query rewritten by hand with `{ SELECT DISTINCT ?e … }` (semi-join reduction) returns the same
    499 rows / checksum in ~390 ms wall vs ~840 ms.
  - Doing that automatically is a feasible compiler pass: push DISTINCT down to the join variables.
- **Q8:** POS(p,o) for agent a0 (~4.5k facts), then a PK probe, then `instr()` on the term. CPU-bound on the
  term lookup per row.
- **Q10:** `SCAN quads`, a full B-tree count of 1M rows (11 ms).
- **Q2, Q4, Q5:** index searches only, plus a temp B-tree for DISTINCT / ORDER BY.

**Planner statistics matter.** With no `sqlite_stat1`, SQLite started Q6 from a full `p=` scan: 570 ms vs
2.4 ms at 100k triples, measured locally while debugging. `ANALYZE` and writes to `sqlite_stat1` are allowed
in DO SQLite, so ingest re-runs `ANALYZE` each time the store doubles (its cost is inside the ingest numbers).
Recursive CTE steps use `CROSS JOIN` to pin queue-outer order; without it Q7 took 2 s instead of 3 ms.

What DO SQLite allows, probed live via `/caps`:

- Not allowed: `REGEXP`, `dbstat`, `PRAGMA analysis_limit`, `PRAGMA compile_options`, `sqlite_version()`.
- Allowed: `ANALYZE`, `PRAGMA optimize`, `->>`, `json_each`, `floor()`.

## 3. Capabilities

**Probes 22/22 pass** on the deployed worker.

- **Supported:**
  - Query forms: SELECT (incl. `*`, DISTINCT/REDUCED, projection expressions), ASK, CONSTRUCT (template
    instantiated in JS).
  - Patterns: BGP; OPTIONAL (incl. inner FILTER over outer vars); UNION; MINUS; FILTER EXISTS / NOT EXISTS
    (substitution via correlation); nested groups; BIND; VALUES (incl. UNDEF, unknown constants via negative
    temp ids); sub-SELECT with ORDER/LIMIT.
  - Aggregates: GROUP BY / HAVING with COUNT (incl. DISTINCT and `*`), SUM, AVG, MIN, MAX, SAMPLE,
    GROUP_CONCAT (error → unbound, as Oxigraph does).
  - Solution modifiers: ORDER BY in SPARQL term order (blank < IRI < literal; numbers and dates by value),
    LIMIT/OFFSET.
  - Property paths: `/ ^ | + * ? !(…)`.
  - Named graphs: GRAPH `<iri>` / `?g`; the default graph is distinct from named graphs.
  - FILTER functions: comparisons with numeric promotion, dateTime and string; arithmetic; `&& || !`; IN /
    NOT IN; BOUND; IF; COALESCE; sameTerm; isIRI / isBlank / isLiteral / isNumeric; STR; LANG;
    LANGMATCHES; STRLEN; SUBSTR; UCASE / LCASE; STRSTARTS / STRENDS / CONTAINS / STRBEFORE / STRAFTER;
    CONCAT; YEAR / MONTH / DAY / HOURS / MINUTES / SECONDS; ABS / ROUND / FLOOR / CEIL; xsd:decimal /
    double / float / integer / string / boolean casts.
  - REGEX: DO SQLite has no REGEXP and no user-defined functions. The compiler translates the regex subset
    that maps exactly onto `LIKE` (flag `i`) or `GLOB` (case-sensitive): literals, `.`, `.*`, `^`, `$`,
    escapes, and alternation at the top level or one group level, expanded into ORs. Anything else throws
    `Unsupported`.
  - SPARQL UPDATE: INSERT DATA, DELETE DATA (incl. GRAPH), DELETE/INSERT … WHERE and DELETE WHERE (the WHERE
    runs as one compiled SELECT; templates are applied in JS through the same json_each path), CLEAR/DROP of
    the default graph or ALL. Checked locally against hand-written expectations; no oracle exists for
    updates.
- **Unsupported, but feasible to add:**
  - REPLACE, and REGEX beyond the LIKE/GLOB subset. A post-filter in JS is possible but breaks the
    one-statement model under LIMIT.
  - DATATYPE(), IRI()/BNODE()/STRDT/STRLANG/UUID/hash functions. These produce new terms; they would need a
    computed-term column type.
  - A computed value joined against a stored term. It throws `Unsupported`; it would need a term-equality
    join on (kind, lex, dt, lang).
  - Paths inside `GRAPH ?g`.
  - MIN/MAX among negative numbers. The packed sort key orders negatives incorrectly among themselves; fixable.
  - SERVICE.
  - Precision edge cases. Decimal arithmetic is done in doubles, so AVG/SUM can differ from xsd:decimal in
    the last digit (not hit by the probes).
- **RDF-star / RDF 1.2 triple terms:** unsupported. Feasible as a fifth term kind whose `lex` holds the 3 ids.
- **Transactions and incremental updates:**
  - Each ingest batch / UPDATE request is one `transactionSync`, so it is atomic.
  - Writes are incremental: B-tree inserts with no rebuild.
  - Deletes remove quads but leave orphan terms in the dictionary; GC is a single `DELETE … WHERE NOT EXISTS`,
    not implemented.
  - Statistics are refreshed by ANALYZE when the store doubles.

## 4. Limits & scale

- Up to 1M triples, nothing broke. The DB is 77 MB.
- What degrades first:
  - **Join fan-out:** Q6 reaches 0.6 s at 1M, because SQLite's nested-loop execution has no
    hash joins or semi-join reduction.
  - **Ingest throughput:** it falls from ~55k to ~26k quads/s once the B-trees outgrow the page cache, since
    random inserts go into 3 indexes plus the term hash index.
- Request size is not a constraint: a 1000-fact batch sends ~10k quads, and each JSON parameter stays ≤ ~1 MB.
- _Extrapolation to 10M triples (not measured):_
  - ~760 MB storage, well under the 10 GB DO limit.
  - Ingest ~15–20k quads/s, so ~10 min for 10M.
  - The ANALYZE at ~8M rows is a few seconds of CPU in one ingest request, within the 300 s limit.
  - Point and star lookups (Q1–Q4, Q9) stay at a few ms (log-depth B-trees).
  - Full-predicate scans (Q5, Q10) grow linearly to ~100 ms.
  - Fan-out joins like Q6 grow linearly, ~6 s, unless DISTINCT pushdown is added.
  - JS memory stays flat: all state is in SQLite, apart from the bounded term cache.

## 5. Effort & risk

- **Code:**
  - ~1 950 LoC of TypeScript: `compile.ts` 1 263 (the compiler), `store.ts` 373, `engine.ts` 309,
    `index.ts` 117.
  - Plus ~130 lines of local debug tests: node:sqlite with an Oxigraph row diff.
- **Dependencies:** only `sparqljs` (parser, pure JS). No wasm, no Rust, no native toolchain.
- **Maintenance burden:** moderate. The SPARQL→SQL semantics (NULL/unbound, type promotion, OPTIONAL
  filters, term ordering) live in one file. Correctness relies on oracle-diff tests, which already exist
  locally.
  - The oracle canonicalizes dateTime lexical forms (`.680Z` → `.68Z`). Ingest canonicalizes the same way,
    or Q3/Q4 checksums fail at 10k+ facts.
- **Planner risk:** SQLite needs fresh statistics, and recursive CTEs need pinned join order. Both are
  handled, but they are invisible failure modes (a 100–1000× slowdown, not wrong answers).
- **Browser portability: high.** The same `SqlLike` interface runs on node:sqlite here, and would run on
  wa-sqlite/OPFS or sql.js, which have REGEXP/UDFs (making REGEX easier there). The schema is plain SQLite 3.38+
  (`->>`, `json_each`), so pipeline-rdf could share one engine client- and server-side.

## 6. Verdict

| criterion                                | score (1–5) |
| ---------------------------------------- | ----------- |
| query latency                            | 4           |
| ingest throughput                        | 4           |
| scale ceiling                            | 4           |
| SPARQL coverage                          | 4           |
| cold start                               | 4           |
| implementation complexity (5 = simplest) | 3           |

Compiling SPARQL into a single SQLite statement passes all 22 probes and every oracle query. It answers
lookups in single-digit ms at 1M triples, with 76 B/triple of storage (5.2× smaller than the current text
schema), a 55 KiB gzip bundle and no wasm. Its weak spot is SQLite's nested-loop-only execution on fan-out
joins (Q6 ≈ 0.6 s at 1M). A DISTINCT/semi-join pushdown pass in the compiler would roughly halve that, and the
engine needs ANALYZE kept fresh to avoid catastrophic plans.
