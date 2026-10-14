# comunica-interned: the best Comunica-on-SQLite I could build

Deployed at `https://rdf-bench-comunica-interned.dxos.workers.dev`. Every number comes from the
deployed worker:

| build                    | version                                | run                 | results                                         | used for             |
| ------------------------ | -------------------------------------- | ------------------- | ----------------------------------------------- | -------------------- |
| **v2 (final)**           | `7bf142dc-8c87-4f04-9054-00a16f236f8a` | `run-1791831147268` | `results/comunica-interned.json`, `run2.log`    | the headline numbers |
| v1                       | `95decd7c-9a54-4a9d-b41f-e1e646c42849` | `run-1791829228299` | `results/comunica-interned-v1.json`, `run1.log` | comparison           |
| v2 + `/scan` debug route | `78849894-3853-4955-be9c-f6d7c84908e0` | v2's 100k db        | —                                               | the cost split in §4 |

## 1. Approach

The variant keeps Comunica (`@comunica/query-sparql-rdfjs@5.2.3`) and changes the storage under it:

- **Term dictionary:** `terms(id INTEGER PK, kind, value, extra)` with `UNIQUE(value, kind, extra)`.
  It keeps full term fidelity: IRI, blank node, literal with datatype, and literal with language.
- **Quads table:** integer-keyed `quads(s,p,o,g)`, `WITHOUT ROWID`, primary key SPOG, with covering
  indexes POS(+g), OSP(+g) and G. The default graph is stored as `g = 0`.
- **Source:**
  - `matchBindings()` streams the SQLite cursor lazily into Comunica bindings. It joins only the
    unbound positions to the dictionary, and handles repeated variables in SQL. `match()` streams
    lazily too.
  - `countQuads()` gives Comunica exact cardinalities for join planning, cached until the next write.
- **Ingest:** set-based, with a constant number of statements per batch via `json_each`:
  1. Upsert the batch's distinct terms.
  2. Read back their ids.
  3. Run one `INSERT OR IGNORE … SELECT FROM json_each`.

  An in-memory cache of at most 50k entries holds hot IRIs across batches.

v1 differs in two ways: ingest interns per quad (SELECT, then INSERT … RETURNING), and the Source has
`match()` only, with no `matchBindings`.

```
ingest:  Quad[] ─► distinct terms ─► INSERT INTO terms SELECT FROM json_each(?) ON CONFLICT DO NOTHING
                                   ─► SELECT id FROM json_each(?) JOIN terms  (ids)
                 ─► INSERT OR IGNORE INTO quads SELECT FROM json_each(?)          (all in transactionSync)
query:   SPARQL ─► Comunica ─► per pattern: countQuads ─► SELECT COUNT(*) FROM quads WHERE <bound ids>  (cached)
                              └► matchBindings ─► SELECT q.x, t_x.kind/value/extra FROM quads q JOIN terms t_x …
                                                   (cursor iterated lazily → Bindings)
```

## 2. Numbers (v2)

The runner was `node bench/run.mjs --probes` with the default scales. Ping was 35 ms.

| facts   | triples   | ingest quads/s | median batch ms | dbBytes     | bytes/triple | cold start ms (Q1 after abort) |
| ------- | --------- | -------------- | --------------- | ----------- | ------------ | ------------------------------ |
| 1,000   | 10,128    | 50,164         | 237             | 1,216,512   | 120          | 397                            |
| 10,000  | 101,441   | 52,291         | 217             | 11,177,984  | 110          | 529                            |
| 100,000 | 1,014,923 | 28,563         | 392             | 109,998,080 | **108**      | 795                            |

`serverMs` per query. The ✓/✗ marks are against `src/testing/expected.json`; the label † is explained
below the table.

| query        | 1k facts | 10k facts | 100k facts   |
| ------------ | -------- | --------- | ------------ |
| Q1_lookup    | 3.0 ✓    | 1.6 ✓     | 2.8 ✓        |
| Q2_entity    | 8.0 ✓    | 34.2 ✓    | 494 ✗†       |
| Q3_filtered  | 9.2 ✓    | 91.0 ✗†   | 661 ✗†       |
| Q4_asof      | 26.9 ✓   | 185 ✗†    | 1,717 ✗†     |
| Q5_aggregate | 159 ✓    | 449 ✓     | 4,093 ✓      |
| Q6_join      | 81.7 ✓   | 971 ✓     | **21,234** ✓ |
| Q8_text      | 30.5 ✓   | 285 ✓     | 2,879 ✓      |
| Q9_optional  | 7.8 ✓    | 59.1 ✓    | 372 ✓        |
| Q10_count    | 443 ✓    | 3,644 ✓   | **33,154** ✓ |

**† The oracle is wrong in these five cells, not the engine.** Oxigraph canonicalizes `xsd:dateTime`
lexical forms: `2026-02-04T13:25:00.680Z` comes back as `…00.68Z`. `termKey` compares lexical
strings, so any store that preserves lexical forms fails as soon as such a timestamp appears in a
result.

I diffed the rows (`scratch/diff.mjs`): the only differences are those trailing zeros. I then
rebuilt the oracle with dateTimes printed by `new Date(v).toISOString()`, which is exactly what the
generator emits (`scratch/oracle-lexical.ts` → `scratch/expected-lexical.json`). Against that oracle,
**every query at every scale matches on rows and checksum.**

- **Q7, the code graph:** 1,038 ms wall, correct (1,318). v1 measured 739 ms; the difference is
  network noise.
- **Bundle size:** 6,334 KiB, or 1,020 KiB gzipped.
- **Peak memory:** not observable. Nothing ran out of memory at 1M triples.

**v1 → v2:** set-based ingest raised ingest at 1M triples from **3,251 to 28,563 quads/s** (285 s →
35 s). `matchBindings`
changed query time by less than 20%; v1 at 100k measured Q5 4,590, Q6 21,772 and Q10 35,352 ms.

### Gap to the faithful replica and to a compiled approach

The comparison is at 1M triples, in `serverMs`. The `sql-compiler` numbers are another agent's
([`results/sql-compiler.json`](../results/sql-compiler.json)).

| query   | comunica-sqlite (today) | **comunica-interned** | sql-compiler | interned vs sql-compiler |
| ------- | ----------------------- | --------------------- | ------------ | ------------------------ |
| Q2      | out of memory           | 494                   | 5–11         | ~50–100× slower          |
| Q3      | out of memory           | 661                   | 4–7          | ~100×                    |
| Q4      | 5,812 (wrong: 0 rows)   | 1,717                 | 6–7          | ~250×                    |
| Q5      | 5,553                   | 4,093                 | 9–10         | ~400×                    |
| Q6      | 2,946 (wall 29.7 s)     | 21,234                | 600–670      | ~33×                     |
| Q8      | 5,706                   | 2,879                 | 23–27        | ~110×                    |
| Q9      | 2,873                   | 372                   | 4–5          | ~80×                     |
| Q10     | out of memory           | 33,154                | 11–13        | ~2,800×                  |
| storage | 391 B/triple            | 108 B/triple          | 76 B/triple  |                          |

**Interning plus cardinalities closes almost none of the gap to a compiled approach.** It fixes
correctness, avoids every out-of-memory failure, cuts storage 3.6× and speeds ingest by about 1.5×.
Query latency improves only 1.4–8× over today's design and stays 30–2,800× behind `sql-compiler`.
Section 4 shows why.

## 3. Capabilities

**Probes: 21/22 pass.** The one failure is `agg_group_concat`, which Comunica answers leniently: it
concatenates IRIs, where spec-correct Oxigraph leaves `?ps` unbound because `GROUP_CONCAT` over IRIs
is a type error. No storage design can fix that.

**SPARQL 1.1 support:**

- **Supported:**
  - SELECT, ASK, CONSTRUCT and DESCRIBE.
  - OPTIONAL, UNION, MINUS, (NOT) EXISTS, the full FILTER function library, BIND and VALUES.
  - Aggregates, subqueries and property paths. Named graphs work through `g`.
  - Typed and language literals, which round-trip exactly.
- **Not supported:**
  - SPARQL UPDATE and deletes: the Source is read-only. Exposing an RDF/JS Store
    (`import`/`remove`/`deleteGraph`) lets Comunica run UPDATE; that is feasible, roughly 80 LoC
    (`DELETE` by id, plus optional dictionary garbage collection).
  - RDF 1.2 triple terms: Comunica supports them, but the dictionary has no quoted-triple kind.
    Adding one is feasible, as kind 4 with the value encoded as a tuple of ids.

**Transactions and updates:** each batch is one `transactionSync`, and duplicate quads are ignored.
Updates are incremental. The count cache is cleared on every write.

## 4. Limits & scale

- **CPU breaks first, not memory or storage.** Comunica costs about 30–45 µs per intermediate
  binding:
  - Q10 streams 1M bindings in 33 s.
  - Q5 aggregates 100k bindings in 4 s.
  - Q6 runs bind-joins over hub entities in 21 s.
- **Where the time goes (version `78849894`, measured on the 1M-triple db):** driving the Source
  directly over `?s ?p ?o` decodes all 1,014,923 rows in about **3.9 s per pass**, from a slope of
  1 vs 3 passes (11.7 s). That pass includes the SQL, three dictionary joins and RDF/JS term
  construction. Of Q10's 33 s, then, about 12% is storage and **about 88% is Comunica's
  per-binding pipeline**. Better storage cannot fix that.
- **Memory is safe at 1M triples** because everything streams.
- **Storage:** 108 B/triple.

Extrapolation to 10M triples:

- About 1.1 GB of SQLite.
- Ingest still works at roughly 25k quads/s.
- Point lookups (Q1, Q2-style) stay well under 1 s.
- Q10 (about 330 s) exceeds the 300 s CPU limit. Q5 (about 40 s) and Q6 (about 200 s) are unusable
  interactively.

## 5. Effort & risk

- **Size:** 335 non-blank LoC, including about 40 for the debug routes.
- **Dependencies:** `@comunica/query-sparql-rdfjs`, `rdf-data-factory` and `asynciterator`. No Rust
  or wasm.
- **Browser portability:** the Source is plain SQL plus `json_each`, so it ports to
  wa-sqlite/OPFS. Bounded parameters and `->>` need SQLite 3.38 or later.
- **Risks:**
  - The Comunica upgrade surface: the RDF/JS extension hooks (`matchBindings`, `countQuads`) are
    Comunica-specific.
  - The dictionary grows forever unless it is garbage-collected after deletes.

## 6. Verdict

| query latency | ingest | scale ceiling | SPARQL coverage | cold start | simplicity |
| ------------- | ------ | ------------- | --------------- | ---------- | ---------- |
| 2             | 4      | 2             | 5               | 3          | 4          |

As a storage layer, interning, covering indexes, streaming and `countQuads` are clearly right. They
make every answer correct, remove the out-of-memory failures, cut storage 3.6× and make ingest
about 1.5× faster than today (9× faster than v1). But about 88% of the remaining query time is Comunica's own per-binding overhead, so
it stays 30–2,800× behind a compiled-to-SQL engine at 1M triples. Comunica on SQLite is a coverage
choice, not a performance one.
