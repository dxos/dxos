# RDF store in a Durable Object — benchmark

All numbers come from temporary workers deployed to the DXOS Cloudflare account
(`rdf-bench-<variant>.dxos.workers.dev`) and were timed from the client. "server ms" is the
per-execution slope between 1 and 5 in-DO runs, with the network removed.

The data is generated to match pipeline-rdf's reified facts: about 10.1 triples per fact, with a
Zipf-skewed spread of entities and agents. The code graph has 10k files, about 65k triples.
Answers are checked against an in-memory Oxigraph oracle. Per-variant detail is in
[variants/](variants/), and the survey of other approaches is in [variants/survey.md](variants/survey.md).

**sql-compiler is this package.** Its benchmark worker is in [`bench/`](../bench/README.md), and its raw
results are in [results/](results/). The other variants were throwaway prototypes: their code and raw
results are not in the repo, so their write-ups in `variants/` are the record. Paths those write-ups
mention under `results/` or `variants/<name>/` refer to that prototype workspace.

## Headline at 1M triples (100k facts)

| variant                                         | probes /22 | ingest quads/s | B/triple | cold start  | Q2 entity | Q4 as-of | Q5 agg | Q6 2-hop join | Q8 text | Q10 count | Q7 path (wall) | bundle gz |
| ----------------------------------------------- | ---------- | -------------- | -------- | ----------- | --------- | -------- | ------ | ------------- | ------- | --------- | -------------- | --------- |
| **sql-compiler** (SPARQL→1 SQL stmt, interned)  | **22**     | 26k            | **76**   | **0.29 s**  | 11        | 6        | 10     | 597           | 27      | **11**    | **54 ms**      | **55 KB** |
| oxigraph-sqlite (spareval wasm, patterns→SQL)   | 22         | 26k            | 108      | 0.49 s      | 10        | 56       | 57     | 1,159         | 121     | 843       | 80 ms          | 724 KB    |
| comunica-pushdown (Comunica, subtrees→SQL)      | 21         | 2.2k           | 109      | 0.6 s       | 48        | 75       | 48     | 1,593         | 73      | 104       | 552 ms         | 659 KB    |
| oxigraph-kv (full Oxigraph, SQLite as KV pages) | 22         | 6.4k           | 221      | 0.39 s      | 133       | 70       | 219    | 8,875         | 364     | 2,258     | 75 ms          | 1.1 MB    |
| comunica-interned (Comunica + better Source)    | 21         | 29k            | 108      | 0.8 s       | 494       | 1,717    | 4,093  | 21,234        | 2,879   | 33,154    | 1.0 s          | 1.0 MB    |
| comunica-sqlite (**today's pipeline-rdf**)      | 16         | 20k            | 391      | 0.45 s      | OOM       | 5,812 ✗  | 5,553  | 2,946*        | 5,706   | OOM       | 1.0 s          | 1.0 MB    |
| oxigraph-mem (wasm in memory + gzip journal)    | 22         | 70–90k         | 9 (disk) | 3.5 s @450k | —         | —        | —      | —             | —       | —         | 61 ms          | 1.43 MB   |

Query columns are server ms. ✗ = wrong answer. *Wall time was 29.7 s; the server-ms reading is unreliable there.

oxigraph-mem cannot reach 1M triples: the DO isolate's 128 MB limit caps it at about 450k
triples (about 300 B/triple of wasm heap). At 100k triples its queries take 1–7 ms, the fastest
measured, and Q10 takes 46 ms. Cold start replays the journal at about 4 µs/triple. Every query
fails with `RangeError` above about 500k triples, and the instance stays broken.

## Findings

1. **Today's pipeline-rdf store is wrong and does not scale.** It drops literal datatypes
   (`oType` is just iri|literal), so as-of (`<=` on dateTime) and numeric filters silently
   return 0 rows, and results come back string-typed. At 1M triples Comunica OOMs the isolate on
   the production `buildSparql` shape (Q2), because the Source has no `countQuads` and Comunica
   materialises whole tables to estimate cardinality. Its storage is 391 B/triple.
2. **Comunica is the bottleneck, not SQLite.** A properly interned, cardinality-aware Source
   fixes correctness, but at 1M triples it is still 30–2,800× slower than compiled SQL. About 88%
   of Q10 is Comunica's per-binding overhead. Pushing subtrees into SQL recovers most query speed,
   but ingest falls to 2.2k quads/s.
3. **Compiling SPARQL to one SQL statement wins on every axis**: fastest queries, smallest storage
   (5.2× smaller than today), smallest bundle, flat cold start, 22/22 probes, nothing broken at 1M
   triples. The cost is about 2.2 kLoC of compiler we own, and planner sensitivity: a bad plan
   gives a slow answer, not a wrong one. Without `ANALYZE` stats Q6 went from 2.4 ms to 570 ms,
   and `WITH RECURSIVE` needs `CROSS JOIN` ordering.
4. **Oxigraph's evaluator over SQLite (your option b) is a strong runner-up.** It gives full
   SPARQL 1.1 with no evaluator for us to maintain, needs no memory ceiling or replay, and uses
   2 MB of wasm heap at 1M triples. It costs about 20 µs per triple-pattern lookup (the SQL
   statement; a wasm↔JS crossing is about 10 ns), so it loses on high-fan-out joins and full
   scans (Q6 2×, Q10 75× slower). Re-backing Oxigraph's own storage with a SQLite KV table
   ("SQLite as page store only", oxigraph-kv) is the worst SQLite-backed option.
5. **In-memory engines hit the 128 MB isolate limit**: Oxigraph at about 450k triples, N3.js at
   about 405k, rdf-stores at about 710k. Hibernation and eviction mean multi-second rebuilds. They
   fit only a small, hot per-DO graph.
6. **DO SQLite facts** (tested on a deployed DO):
   - Available: FTS5 (trigram, BM25), JSON1, `WITH RECURSIVE`, window functions, R*Tree,
     `ANALYZE`/`sqlite_stat1`.
   - Missing: `REGEXP` and user-defined functions, `generate_series`, `ATTACH`, stat4.
   - Limits: 100 bound params, 100 KB statements, 100 columns, bound strings about 2 MB (batch
     via `json_each`).
   - A constant `g = 0` predicate can make SQLite pick a full-graph scan (Q6 > 10 min) until it is
     written `+g = 0`.

## Recommendation

- Replace Comunica in pipeline-rdf with a **SPARQL→SQL compiler over an interned quad schema**.
  It runs unchanged on DO SQLite and on wa-sqlite/OPFS in the browser.
- **Keep spareval-over-SQLite as the fallback** for constructs the compiler rejects (REGEX
  beyond LIKE/GLOB, exotic functions). It shares the same schema, so no data duplication.
- Add FTS5 for quote/text predicates, and a compiler pass that rewrites skewed star joins as
  semi-joins (Q6 roughly halves).
- Run `ANALYZE` as data grows.

## Harness caveats

- The oracle stores dateTimes in Oxigraph's canonical form (`.680Z` → `.68Z`). Variants that
  keep the lexical form show ✗ on Q2–Q4 with correct row counts.
  The prototype workspace kept a corrected oracle for them; it is not in the repo.
- The probe `agg_group_concat` fails for every Comunica variant: Comunica concatenates IRIs,
  whereas Oxigraph follows the spec and returns unbound.
- `ctx.abort()` keeps the isolate, so "cold start" means DO restart plus SQLite reopen; wasm
  instantiate (14–19 ms) was measured separately.
- Server-ms is noisy below about 1 ms and for multi-second queries.
