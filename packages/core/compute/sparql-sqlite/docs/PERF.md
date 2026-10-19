# @dxos/sparql-sqlite on real datasets

Every performance number here comes from the worker deployed to the DXOS Cloudflare account,
**`https://rdf-bench-sql-compiler.dxos.workers.dev`**, timed from the client. Local runs were used only for
debugging, and as the Oxigraph oracle and fallback column, which is labelled **LOCAL**.

| deploy (`BUILD` stamp) | Cloudflare version id                  | used for                                                        |
| ---------------------- | -------------------------------------- | --------------------------------------------------------------- |
| `1791872891`           | `955670df-aefe-454c-ba76-eb4192edbfa7` | all ingest, ingest calibration (BSBM), the no-hints baseline    |
| `1791873400`           | `5cc183f2-a536-4f25-94f0-4f8cf125e157` | first hints run; exposed the temp-terms regression (§5.2)       |
| `1791873867`           | `4d72e814-a071-42cb-8401-a885039f1f89` | **every query table below**, calibration (WatDiv), SQL variants |

The final build is the package source at the time of the run: the correctness agent's W3C fixes, including the
temp-terms fix, plus the selectivity hints from §5.1. Raw results, with the compiled SQL, `EXPLAIN QUERY PLAN` and
join-prefix counts for every query, are in [results/perf/](results/perf/). The readable plan appendix is
[results/perf/plans.md](results/perf/plans.md).

## 1. Headline

| dataset                                    |   triples | queries | rejected | median server ms | max server ms | ingest quads/s |  MB | B/triple |
| ------------------------------------------ | --------: | ------: | -------: | ---------------: | ------------: | -------------: | --: | -------: |
| BSBM 1M (2,785 products)                   | 1,000,312 |      39 |        3 |              0.2 |           7.5 |         25,961 | 130 |      130 |
| BSBM 5M (14,000 products)                  | 4,968,357 |      39 |        3 |              0.1 |          30.6 |         21,287 | 643 |      129 |
| LUBM(10), no inference                     | 1,272,953 |      14 |        0 |              0.0 |          78.7 |         73,586 |  95 |       75 |
| LUBM(10) + RDFS closure (Jena riot --rdfs) | 1,591,332 |      14 |        0 |              0.7 |           148 |         62,860 | 108 |       68 |
| WatDiv scale 10                            | 1,087,673 |      36 |        0 |              0.2 |           123 |         34,465 |  70 |       64 |
| WatDiv scale 50                            | 5,463,748 |      43 |        0 |              0.3 |           614 |         18,899 | 358 |       66 |
| DBLP, first 6M lines of dblp.nt            | 5,898,338 |      19 |        3 |             10.8 |           931 |         35,003 | 415 |       70 |

The query counts include the DESCRIBE-as-CONSTRUCT rewrites (§6). "Rejected" counts queries that throw
`UnsupportedSparqlError`: the three BSBM Q9 instances (DESCRIBE), and DBLP D15–D17, which were added to probe known gaps.

- **Every answer that can be checked matches Oxigraph.** 147 deployed answers have the same rows and checksum.
  4 more (`≈`) have the same row count, but `LIMIT` picks among ties. The one `✗` is the 1-hop DESCRIBE rewrite
  in §6, which is not a full DESCRIBE.
- **Point and star queries cost under 1 ms** at 1M and at 5M: BSBM Q2/Q7–Q12, WatDiv L/S/F, DBLP D1–D3 and D12.
  Wall time is about one ping (30–45 ms).
- **The slow tail comes from output size or full scans, not from bad plans,** once the hints are on. WatDiv C3
  returns 213k rows (614 ms). LUBM Q6/Q14 return 75k rows (79–148 ms). BSBM Q6 regex-filters every `rdfs:label` at 5M (30 ms).
  DBLP D7/D9 aggregate or filter about 100k rows (126–159 ms).
- **One plan is still bad: DBLP D10 (931 ms).** It can be brought to 28–76 ms (§5.3).
- **One DO holds all of this easily.** The largest store is 643 MB, against a 10 GB limit. The slowest ingest
  request took 3.0 s of wall time for 20k quads, against a 300 s CPU limit.

## 2. Environment and method

- **Worker:** `bench/worker.ts`, one SQLite-backed DO class per named instance (`?db=`), compatibility date
  2026-08-01, `limits.cpu_ms` 300000, `nodejs_compat`. Each dataset lives in its own DO: `bsbm1m`, `bsbm5m`,
  `lubm10`, `lubm10rdfs`, `watdiv10`, `watdiv50`, `dblp6m`.
- **Client:** the Claude Code cloud sandbox (4 vCPU), reaching Cloudflare through an egress proxy. Ping is 28–45 ms.
- **Timing:** `bench/real.mjs query`. `wall` is the median of 5 single runs (2 if the first run took over 3 s).
  `server` is the slope between 1 and 5 in-DO iterations, `(median(5×) − median(1×)) / 4`, which removes the
  network. `Date.now()` is frozen during synchronous work inside a DO, so nothing is timed in the DO. Below about
  1 ms the slope is noise: readings swing ±1–3 ms between runs on identical plans (WatDiv L2c read 1.3 and 9.4 ms).
  `1st` is the first, uncached run. It includes parsing, compiling, constant lookup and the selectivity counts.
- **Plans:** `POST /explain` returns the compiled SQL, `EXPLAIN QUERY PLAN` and `sqlite_stat1`, all from the
  deployed DO against the loaded data. DO SQLite has neither `EXPLAIN ANALYZE` nor `scanstatus`, so `--prefix`
  approximates them. For every query whose WHERE is one BGP plus FILTERs, the runner takes the plan's loop order
  and runs `SELECT (COUNT(*) AS ?n)` over each join prefix on the DO. That gives the actual rows after each step.
  The runner sets these next to an estimate built from `sqlite_stat1`: the product of the average rows per
  equality prefix of the index each step uses. See [results/perf/plans.md](results/perf/plans.md).
- **No hints vs hints:** the same DO and data, run with `hints=0` (SQLite statistics only, the engine as before
  this work) and `hints=1` (the default, §5.1).
- **Oracle and fallback (LOCAL):** `bench/oxigraph-local.ts` loads the same N-Triples into in-memory Oxigraph
  (`oxigraph` 0.4.11 npm, wasm, in node on the sandbox). It runs every query and gives rows, checksum and the
  median of 3 runs. Its milliseconds are not comparable to the DO's: they come from a different machine with no
  network or storage layer. BSBM 5M and LUBM+RDFS were not loaded into Oxigraph.

## 3. Datasets

`bench/datasets/prepare.sh` fetches the generators into `bench/.cache/` (gitignored), generates the data and
instantiates the queries. `bench/datasets/build-queries.mjs` writes `<dataset>.queries.json`. Nothing large is
committed.

| dataset   | generator / source                                                                               | scale                                                              |        N-Triples | queries                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| BSBM      | bsbmtools 0.2 (SourceForge), `generate -fc -pc N -s nt`                                          | 2,785 products = 1.00M triples; 14,000 = 4.97M                     | 257 MB / 1.28 GB | explore mix Q1–Q12, 3 instances each from the official test driver's parameter pool (`BsbmParams.java` calls `LocalSPARQLParameterPool`, seed 808080) |
| LUBM      | UBA 1.7 (swat.cse.lehigh.edu), `-univ 10`, RDF/XML → N-Triples with Apache Jena 5.6.0 `riot`     | 1,316,700 triples generated, 1,272,953 distinct                    |           224 MB | the 14 published queries, with the generator's `univ-bench.owl` namespace and the published text's bracket/comma typos fixed                          |
| LUBM+RDFS | the same data through `riot --rdfs=univ-bench.owl` (RDFS closure only, no OWL)                   | 1,591,332 distinct                                                 |           400 MB | the same 14                                                                                                                                           |
| WatDiv    | WatDiv v0.6 C++ (dsg.uwaterloo.ca, built against Boost 1.83), `watdiv -d wsdbm-data-model.txt S` | S=10: 1,087,673 distinct; S=50: 5,463,748                          |  154 MB / 771 MB | basic testing templates L1–5, S1–7, F1–5, C1–3, up to 3 distinct instances each (`watdiv -q`)                                                         |
| DBLP      | first 6,000,000 lines of `https://dblp.org/rdf/dblp.nt.gz` (dump of 2026-10-12)                  | 5,898,338 triples (about 100k publications with author signatures) |           760 MB | D1–D14 written for this report (lookup, star, joins, 2-hop, aggregates, text, paths, negation), D10r (a rewrite) and D15–D17 (known gaps)             |

Without inference, LUBM Q4–Q13 return 0 rows. Those queries need
`rdfs:subClassOf` (Q2, Q4–Q10), `owl:TransitiveProperty` (Q11), OWL class definitions (Q12) or
`owl:inverseOf` (Q13). Q1, Q3 and Q14 need none. After the RDFS closure, Q4–Q9 return rows. Q11–Q13 still return
0 because they need OWL. Q2 returns 28 rows either way: `undergraduateDegreeFrom` already links graduate students
to universities in this data.

## 4. Ingest

`bench/real.mjs load` streams the file in batches of 20,000 lines. Each batch is gzipped and POSTed to
`/load?format=nt&gzip=1`, two requests in flight. The DO decompresses the batch (`DecompressionStream`) and parses
it (`bench/ntriples.ts`). It splits the batch into chunks of at most 10k quads and about 1 MB of term text, because
DO SQLite caps a bound string at about 2 MB. Then it runs `engine.insert` per chunk inside one `transactionSync`.

| dataset   |      sent |    stored | seconds | quads/s | upload (gz) | median / p90 / max batch ms | DB MB | B/triple |
| --------- | --------: | --------: | ------: | ------: | ----------: | --------------------------: | ----: | -------: |
| BSBM 1M   | 1,000,312 | 1,000,312 |      39 |  25,961 |       28 MB |       1,411 / 1,824 / 2,199 |   130 |      130 |
| BSBM 5M   | 4,968,357 | 4,968,357 |     233 |  21,287 |      140 MB |               — / 2,378 / — |   643 |      129 |
| LUBM 10   | 1,316,700 | 1,272,953 |      18 |  73,586 |        7 MB |             488 / 585 / 907 |    95 |       75 |
| LUBM+RDFS | 2,484,830 | 1,591,332 |      40 |  62,860 |       11 MB |                 — / 759 / — |   108 |       68 |
| WatDiv 10 | 1,100,872 | 1,087,673 |      32 |  34,465 |        8 MB |       1,158 / 1,526 / 1,646 |    70 |       64 |
| WatDiv 50 | 5,508,629 | 5,463,748 |     291 |  18,899 |       40 MB |               — / 3,019 / — |   358 |       66 |
| DBLP 6M   | 5,898,342 | 5,898,338 |     169 |  35,003 |       52 MB |               — / 1,331 / — |   415 |       70 |

The per-batch medians that are missing were not kept in the summary JSON. The full load records are in
`results/perf/<db>.json` under `load`.

- **Storage is 64–75 B/triple when terms are short.** That matches the 76–78 B/triple of the synthetic benchmark.
  BSBM costs 130 B/triple because its reviews carry long text literals (55 MB of term text per 1M triples).
- **Throughput falls with size,** from 60–80k quads/s on the first batches to 19–21k quads/s at 5M. The three
  covering indexes take random inserts once they outgrow the page cache. Three or four loads ran at once from one
  client, so these are lower bounds, but each DO is its own machine and the client was mostly idle.
- **Duplicates are dropped at insert.** UBA and WatDiv emit 1–3% duplicate triples. `riot --rdfs` emits the
  inferred triples once per derivation.

**Parse in the DO or on the client?** `bench/real.mjs calibrate` posts the same 20k-line batches four ways to two
fresh DOs: N-Triples dry (decompress and parse, no insert), client-parsed JSON `Quad[]` dry, and each of the two
with the insert. Medians, wall ms per 20k quads:

| data             | client parse + JSON | N-Triples dry | JSON dry | N-Triples load | JSON load | gz N-Triples / gz JSON |
| ---------------- | ------------------: | ------------: | -------: | -------------: | --------: | ---------------------: |
| BSBM (long text) |                  47 |           155 |      267 |            475 |       732 |        589 KB / 607 KB |
| WatDiv           |                  23 |           133 |      158 |            661 |       589 |        482 KB / 510 KB |

The dry columns include one round trip (30 ms) and the upload. Parsing N-Triples in the DO costs about as much
as `JSON.parse` of the equivalent `Quad[]`: slightly less on long literals, within noise otherwise. Both are
5–20% of a batch. The insert dominates: three interning statements and one `INSERT … json_each` per chunk.
**Send gzipped N-Triples and parse in the DO.** It is the smaller payload, needs no client code, and moving the
parse to the client saves nothing.

## 5. Plans

### 5.1 Selectivity hints (implemented): `likelihood()` per constant

**Problem.** `sqlite_stat1` holds averages per index prefix. On `quads_pos` the `(p, o)` prefix averages 7 rows
on LUBM, but `(rdf:type, ub:Publication)` has 76,529 rows and `(ub:takesCourse, GraduateCourse0)` has 4. Without
stat4, which DO SQLite does not have, SQLite costs both at 7 and starts from the big class. LUBM Q3 scanned
76,529 publications to find 6 rows. On WatDiv C1/C2 the same averages made it build Bloom filters over whole
predicate ranges.

Join prefixes for LUBM Q3 on the deployed DO, before the fix:

| step (plan order)                      | stat1 est | actual |
| -------------------------------------- | --------: | -----: |
| `q0` pos (p=rdf:type, o=Publication)   |         7 | 76,529 |
| `q1` osp (o=AssistantProfessor0, s, p) |         7 |      6 |

**Fix** (`src/compiler.ts` `#hintSelectivity` and `ConstResolver.selectivity`; `src/engine.ts` `#selectivity`).
For each triple pattern with a constant predicate, the engine counts `p = ?` and, when the object is constant,
`p = ? AND o = ?`. The counts are capped at 100k rows, so each costs at most one bounded index range scan. They
are cached per engine and dropped on every write, together with the plan cache. The compiler then emits
`likelihood(q.p = P, count(p)/N)` and `likelihood(q.o = O, count(p,o)/count(p))`, where `N` comes from
`sqlite_stat1`. In SQLite's cost model a `likelihood()` on an indexed equality replaces the stat1 average for
that column, so the estimate becomes the true count (`whereLoopAddBtreeIndex`, `truthProb`). `likelihood()` only
steers the planner. A test (`selectivity hints change plans only and are refreshed on writes`) checks that answers
are identical with hints on and off, and that hints are recomputed after an insert. A constant absent from the
store gets probability 1e-9, which puts its empty pattern first. There are no hints until the store has run
`ANALYZE`, because SQLite's default table size would make absolute probabilities misleading.
`engine.selectivityHints = false` turns them off. The bench toggles them with `?hints=0|1`.

Wins, in server ms on build `1791873867`, same DO and same data:

| query         | no hints | hints |   × | what changed                                                              |
| ------------- | -------: | ----: | --: | ------------------------------------------------------------------------- |
| LUBM Q1       |      4.7 |   0.2 | ~20 | starts from `takesCourse GraduateCourse0` (4 rows), not 24k grad students |
| LUBM Q2       |     54.3 |   3.9 |  14 | starts from the 189 departments                                           |
| LUBM Q3       |     16.4 |  <0.5 | >30 | starts from the 6 publications of the author                              |
| LUBM+RDFS Q2  |     82.5 |   7.1 |  12 |                                                                           |
| LUBM+RDFS Q5  |     40.1 |   2.6 |  15 | `memberOf Department0` (719) first, not the `Person` class                |
| LUBM+RDFS Q8  |      112 |  26.6 | 4.2 | `subOrganizationOf University0` (15 departments) first                    |
| LUBM+RDFS Q10 |     21.1 |  <0.5 | >40 |                                                                           |
| WatDiv 10 C1  |      172 |   0.8 | 215 | no Bloom filters over whole predicates                                    |
| WatDiv 10 C2  |      158 |    44 | 3.6 |                                                                           |
| WatDiv 10 C3  |      682 |   123 | 5.5 | single-valued predicates (`gender`, `age`) checked before `friendOf`      |
| WatDiv 50 C1  |    1,257 |   6.0 | 210 |                                                                           |
| WatDiv 50 C2  |      591 |    31 |  19 |                                                                           |
| WatDiv 50 C3  |    3,105 |   614 | 5.1 |                                                                           |

No query got measurably slower: every other difference is within the noise of §2. The cost of the hints shows
up in `1st`, the uncached run, which also parses and compiles. With hints, the first run on LUBM is 9–16 ms above
the cached wall time. Without hints it is 0–20 ms above. Counts are cached across queries, so a parameterised mix
pays them once per distinct constant.

**Limit.** The 100k cap makes all large predicates look alike. On DBLP, `authoredBy` (303k rows) and
`yearOfPublication` (99k) both read as 100k, which is why D10 is unchanged (§5.3).

### 5.2 Temp-terms CTE (found here, fixed by the correctness work)

The W3C conformance work made constants absent from the store visible to expressions. It shadowed `terms` with
`WITH terms AS NOT MATERIALIZED (SELECT … FROM main.terms UNION ALL VALUES …)` whenever a query had such a constant.
SQLite materialised the whole compound CTE anyway (`MATERIALIZE terms`). It then built `AUTOMATIC` indexes and
Bloom filters on the copy for every decode join. Measured on build `1791873400`, server ms:

| query                | before (`1791872891`) | with the CTE (`1791873400`) | after the fix (`1791873867`) |
| -------------------- | --------------------: | --------------------------: | ---------------------------: |
| LUBM Q4/Q7/Q8/Q9/Q12 |               0.0–0.3 |                       60–77 |                          0.0 |
| LUBM+RDFS Q12        |                   0.0 |                         110 |                          0.5 |
| BSBM 1M Q8c (`"EN"`) |                   3.0 |                       1,063 |           0.2 (Q8 instances) |
| DBLP D8 (`CONTAINS`) |                    48 |                       2,952 |                           41 |
| DBLP D9              |                   125 |   **DO error 500** (memory) |                          126 |
| DBLP D10             |                   761 |                       3,026 |                          931 |

The fix landed in `src/engine.ts` (`#wrap`/`#tempTerms`). The CTE is now added only when a temp term is used
inside an expression, and decode joins use `main.terms`. `src/conformance.test.ts` pins that a plain pattern or
filter constant compiles without it. The CTE remains a cliff for queries that do use a missing constant inside
an expression: its cost is a scan of all terms (1.6M on DBLP).

### 5.3 Non-indexable filters on joined terms (DBLP D10)

D10 counts authors of 2019 publications with `FILTER (STR(?year) = "2019")`. The filter compiles to a correlated
`(SELECT lex FROM terms WHERE id = q1.o) = '2019'`, which SQLite cannot use to drive the join. Both predicates read
as 100k (§5.1), so SQLite starts from `authoredBy`: 303,261 rows, each probing the year and its term. The variants
below were measured on the deployed DO with `POST /sql` (server ms by the same slope method):

| D10 variant                                                                         | server ms |
| ----------------------------------------------------------------------------------- | --------: |
| as compiled (authoredBy first)                                                      |   840–931 |
| same SQL with `quads q1 CROSS JOIN quads q0` (year first, filter, then authors)     |        76 |
| SPARQL with the constant term, `?p dblp:yearOfPublication "2019"^^xsd:gYear` (D10r) |        28 |

There are two fixes. A per-predicate count without the cap, or a larger cap, lets SQLite order the join itself.
Better still, the compiler could turn `STR(?x) = "lit"` (and `?x = "lit"` on a stored term) into
`q.o IN (<ids of the matching terms>)`. Those ids come from probing `terms_h` with the hash of `lit` under each
kind and each datatype in `dts`, which is a few dozen point lookups. That gives an indexable constant: D10 at
about 28 ms, 33× faster.

### 5.4 Other plan notes

- **Correlated scalar subqueries per term column.** Every filter or ORDER BY on a term's `lex` or `num` is a
  `(SELECT … FROM terms WHERE id = …)`, and the same one repeats once per use. D9's integer cast reads the year's
  `lex` six times per row. Joining `main.terms` once per variable took D9 from 132 to 107 ms on the DO, about 20%.
  The same shape shows up in every BSBM `ORDER BY ?label`.
- **Full-range scans are inherent.** BSBM Q6 (`regex` over all 70k product labels at 5M) takes 30 ms. DBLP D8
  (`CONTAINS` over 99k titles) takes 41 ms. Without user functions or REGEXP, only an FTS5 trigram index on
  `terms.lex` would avoid them. FTS5 is available on DO SQLite.
- **Large results are bounded by decoding.** LUBM Q14 returns 75,547 rows in 79 ms on the server, about 1 µs
  per row of decode and JSON. WatDiv 50 C3 returns 213,730 rows in 614 ms.
- **The triangle in LUBM+RDFS Q9 (110 ms) has no better order.** Each of its 6 steps is an index lookup, and the
  join prefixes peak at 45,849 rows.
- **`USE TEMP B-TREE` for ORDER BY/DISTINCT** shows up in most BSBM plans. It is cheap at these result sizes
  (BSBM Q1/Q3/Q4/Q8 stay under 1 ms).

## 6. Fallback analysis

These are the queries the compiler rejects, plus the slowest one. Oxigraph times are **LOCAL** (in-memory, in node
on the sandbox, §2). The deployed spareval-over-DO-SQLite variant ([variants/oxigraph-sqlite.md](variants/oxigraph-sqlite.md))
was not rebuilt for this run.

| query                                                         | why                                                                                                 | sql-compiler (DO)                                                 | Oxigraph LOCAL | recommendation                                                                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------- |
| BSBM Q9 ×3 (1M, 5M)                                           | `DESCRIBE` unsupported                                                                              | as `CONSTRUCT { ?x ?p ?o } WHERE { … ?x ?p ?o }`: ≤0.3 ms, rows ✓ | 0.1 ms         | **compiler**: DESCRIBE → CONSTRUCT                                                                                  |
| DBLP D15 `DESCRIBE <pub>`                                     | `DESCRIBE` unsupported; the record's signatures are blank nodes                                     | 1-hop CONSTRUCT: 0.2 ms, 36 rows (Oxigraph's CBD: 74)             | 0.8 ms         | **compiler**: CBD needs a `WITH RECURSIVE` walk through blank-node objects                                          |
| DBLP D16 `REGEX(?t, "^(deep\|neural) [a-z]+ networks?", "i")` | quantified group and character class: outside the LIKE/GLOB subset; DO SQLite has no REGEXP or UDFs | —                                                                 | 138 ms         | **fallback**, or the engine runs the LIKE prefix `deep%`/`neural%` in SQL and the full regex in JS on the survivors |
| DBLP D17 `DATATYPE(?y)`                                       | term-creating function unsupported                                                                  | —                                                                 | 120 ms         | **compiler**: `dt` joins `dts` for the IRI; it needs a computed-IRI value type                                      |
| DBLP D10 (slow)                                               | join order with a non-indexable filter, 931 ms                                                      | 28–76 ms with the fixes in §5.3                                   | 1,072 ms       | **compiler** (§5.3)                                                                                                 |
| WatDiv 50 C3 (slowest)                                        | 213k-row bag result                                                                                 | 614 ms                                                            | 17,581 ms      | none: output-bound                                                                                                  |

No query in the BSBM, LUBM or WatDiv mixes needs the fallback for speed. On most join-heavy and aggregate queries
the compiler on the DO beats in-memory Oxigraph on the sandbox: WatDiv C3 by 29×, DBLP D6/D14 by 8–14×, LUBM Q14
by 5×. The exceptions are WatDiv 10 C2 (44 vs 21 ms), DBLP D8 (41 vs 16 ms) and the sub-millisecond lookups,
where both are noise next to the 30 ms round trip. The fallback is
needed for semantics alone: full REGEX and the rarer term-creating functions.

## 7. Top five improvements

| #   | improvement                                                                                            | status                            | measured / estimated win                                                                         |
| --- | ------------------------------------------------------------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | `likelihood()` selectivity hints from capped per-constant counts (§5.1)                                | **implemented** in `src/`         | measured: LUBM Q1–Q3/Q5/Q10 12–40×, LUBM+RDFS Q8 4×, WatDiv C1 210×, C2 4–19×, C3 5×             |
| 2   | Keep the temp-terms CTE out of statements that do not need it (§5.2)                                   | **fixed** by the correctness work | measured: 60–110 ms → 0 on LUBM; DBLP D8 2.95 s → 41 ms; DBLP D9 no longer crashes the DO        |
| 3   | `STR(?x) = "lit"` and literal-equality pushdown to term ids, plus uncapped per-predicate counts (§5.3) | proposed                          | measured on the DO: DBLP D10 931 → 28 ms (pushdown) or 76 ms (order only)                        |
| 4   | DESCRIBE (as CONSTRUCT plus a blank-node closure) and `DATATYPE()`                                     | proposed                          | removes 3 of the 36 BSBM rejections, plus D15/D17. The CONSTRUCT form runs in ≤0.3 ms on the DO  |
| 5   | One `JOIN main.terms` per variable instead of a correlated subquery per use (§5.4)                     | proposed                          | measured: DBLP D9 132 → 107 ms (−20%). It applies to every filter and ORDER BY on literal values |

An FTS5 trigram index on `terms.lex` comes next. It would turn BSBM Q6, DBLP D8 and the LIKE prefilter of D16
into index lookups. It was not measured here.

## 8. Reproduce

```bash
# 1. Generators and data (about 3.5 GB under bench/.cache; needs java, g++, libboost-date-time-dev, wamerican).
packages/core/compute/sparql-sqlite/bench/datasets/prepare.sh all

# 2. Deploy (from bench/). BUILD lets the runner wait until DOs run the new code.
pnpm exec wrangler deploy --var BUILD:$(date +%s | tee .cache/build-stamp)

# 3. Load each dataset into its own DO, then run the query mixes with and without hints.
node --experimental-strip-types bench/real.mjs load --db bsbm1m --file bench/.cache/data/bsbm-2785.nt --out bench/.cache/results/load-bsbm1m.json
bench/run-all.sh "$(cat bench/.cache/build-stamp)"

# 4. LOCAL Oxigraph oracle/fallback, then the tables and plan appendix.
node --experimental-strip-types bench/oxigraph-local.ts <dir with node_modules/oxigraph> bench/.cache/data/lubm10.nt bench/.cache/data/lubm10.queries.json bench/.cache/results/oxigraph-lubm10.json
node bench/report.mjs bench/.cache/results docs/results/perf > /tmp/tables.md
```

`bench/real.mjs calibrate` reproduces §4's format comparison. `POST /sql` (one read-only SELECT, with `iters`) runs
the hand-written variants of §5.3–5.4.

## 9. Per-query tables

The columns are: rows; ✓ for the same rows and checksum as Oxigraph (≈ means the same count, but `LIMIT` picks
among ties); server ms with hints; server ms with no hints; wall ms; the first, uncached run; Oxigraph LOCAL ms;
and the plan's loop order (`q<i>` is the i-th triple pattern, followed by the index and the bound columns),
followed by flags. "—" means not measured or not loaded. Each table heading gives the deploy and the time of the
run. Every instance of a template is listed. [results/perf/plans.md](results/perf/plans.md) holds the SQL, the
full plan and the join-prefix counts.

### BSBM 1M (2,785 products)

Deployed `https://rdf-bench-sql-compiler.dxos.workers.dev`, build `1791873867`, 2026-10-13T06:56Z. 1,000,312 triples, 130 MB. Ping 42.4 ms.

| query  | kind                  |                                                  rows | ✓   | server ms | no hints | wall ms | 1st ms | Oxigraph LOCAL ms | plan (loop order; flags)                                         |
| ------ | --------------------- | ----------------------------------------------------: | --- | --------: | -------: | ------: | -----: | ----------------: | ---------------------------------------------------------------- |
| B-Q1a  | star+filter           |                                                     1 | ✓   |       0.0 |      0.3 |      46 |     99 |               0.7 | q3 pos(p,o) → q4 spo(s,p) → q0 spo(s,p) → …(5) **temp b-tree**   |
| B-Q1b  | star+filter           |                                                     2 | ✓   |       0.0 |      0.1 |      44 |     52 |               0.3 | q2 pos(p,o) → q4 spo(s,p) → q0 spo(s,p) → …(5) **temp b-tree**   |
| B-Q1c  | star+filter           |                                                     7 | ✓   |       0.0 |      0.6 |      47 |     47 |               0.5 | q1 pos(p,o) → q4 spo(s,p) → q0 spo(s,p) → …(5) **temp b-tree**   |
| B-Q2a  | lookup star           |                                                    20 | ✓   |       0.0 |      0.3 |      49 |     65 |               3.0 | q7 spo(s,p) → q8 spo(s,p) → q0 spo(s,p) → …(15)                  |
| B-Q2b  | lookup star           |                                                    18 | ✓   |       0.2 |      0.0 |      45 |     50 |               1.6 | q7 spo(s,p) → q8 spo(s,p) → q0 spo(s,p) → …(15)                  |
| B-Q2c  | lookup star           |                                                    13 | ✓   |       0.1 |      0.3 |      45 |     52 |               1.2 | q7 spo(s,p) → q8 spo(s,p) → q0 spo(s,p) → …(15)                  |
| B-Q3a  | negation              |                                                     0 | ✓   |       0.0 |      0.0 |      43 |     46 |               0.4 | q5 pos(p,o) → q6 spo(s,p) → q1 pos(p,o) → …(7) **temp b-tree**   |
| B-Q3b  | negation              |                                                     2 | ✓   |       0.4 |      0.0 |      43 |     47 |               0.4 | q5 pos(p,o) → q6 spo(s,p) → q2 pos(p,o) → …(7) **temp b-tree**   |
| B-Q3c  | negation              |                                                     1 | ✓   |       0.3 |      0.9 |      44 |     49 |               0.4 | q5 pos(p,o) → q6 spo(s,p) → q2 pos(p,o) → …(7) **temp b-tree**   |
| B-Q4a  | union                 |                                                     0 | ✓   |       0.3 |      0.0 |      42 |     45 |               0.3 | q2 pos(p,o) → q4 spo(s,p) → q0 spo(s,p) → …(12) **temp b-tree**  |
| B-Q4b  | union                 |                                                     0 | ✓   |       0.0 |      0.0 |      44 |     47 |               0.6 | q2 pos(p,o) → q4 spo(s,p) → q0 spo(s,p) → …(12) **temp b-tree**  |
| B-Q4c  | union                 |                                                     0 | ✓   |       0.3 |      0.0 |      44 |     46 |               0.3 | q2 pos(p,o) → q4 spo(s,p) → q0 spo(s,p) → …(12) **temp b-tree**  |
| B-Q5a  | self-join+filter      |                                                     5 | ✓   |       7.4 |      6.9 |      51 |     55 |              14.3 | q3 spo(s,p) → q1 spo(s,p) → q2 pos(p,o) → …(7) **temp b-tree**   |
| B-Q5b  | self-join+filter      |                                                     5 | ✓   |       3.4 |      3.0 |      47 |     48 |               6.3 | q3 spo(s,p) → q1 spo(s,p) → q2 pos(p,o) → …(7) **temp b-tree**   |
| B-Q5c  | self-join+filter      |                                                     5 | ✓   |       7.5 |      8.7 |      54 |     66 |              13.6 | q3 spo(s,p) → q1 spo(s,p) → q2 pos(p,o) → …(7) **temp b-tree**   |
| B-Q6a  | regex                 |                                                     1 | ✓   |       6.8 |      6.4 |      55 |     66 |              10.5 | q0 pos(p) → q1 spo(s,p,o)                                        |
| B-Q6b  | regex                 |                                                     1 | ✓   |       5.3 |      9.7 |      53 |     52 |               7.4 | q1 pos(p,o) → q0 spo(s,p)                                        |
| B-Q6c  | regex                 |                                                     1 | ✓   |       6.3 |      6.3 |      54 |     67 |               7.0 | q1 pos(p,o) → q0 spo(s,p)                                        |
| B-Q7a  | optional              |                                                    10 | ✓   |       0.0 |      0.8 |      48 |     97 |               0.9 | q1 pos(p,o) → q3 spo(s,p) → q5 spo(s,p,o) → …(14)                |
| B-Q7b  | optional              |                                                     4 | ✓   |       0.0 |      0.0 |      51 |     49 |               0.6 | q1 pos(p,o) → q3 spo(s,p) → q5 spo(s,p,o) → …(14)                |
| B-Q7c  | optional              |                                                     8 | ✓   |       0.1 |      0.3 |      46 |     53 |               0.7 | q1 pos(p,o) → q3 spo(s,p) → q5 spo(s,p,o) → …(14)                |
| B-Q8a  | optional+lang         |                                                    10 | ✓   |       0.0 |      0.2 |      49 |     57 |               1.0 | q0 pos(p,o) → q4 spo(s,p) → q5 spo(s,p) → …(10) **temp b-tree**  |
| B-Q8b  | optional+lang         |                                                     2 | ✓   |       0.5 |      0.0 |      46 |     85 |               0.3 | q0 pos(p,o) → q4 spo(s,p) → q5 spo(s,p) → …(10) **temp b-tree**  |
| B-Q8c  | optional+lang         |                                                     0 | ✓   |       0.0 |      0.1 |      46 |     52 |               0.3 | q0 pos(p,o) → q4 spo(s,p) → q5 spo(s,p) → …(10) **temp b-tree**  |
| B-Q9a  | describe              | **Unsupported SPARQL construct: query type DESCRIBE** |     |         — |        — |       — |     44 |               0.1 |                                                                  |
| B-Q9b  | describe              | **Unsupported SPARQL construct: query type DESCRIBE** |     |         — |        — |       — |     51 |               0.1 |                                                                  |
| B-Q9c  | describe              | **Unsupported SPARQL construct: query type DESCRIBE** |     |         — |        — |       — |     52 |               0.1 |                                                                  |
| B-Q10a | join+filter           |                                                     4 | ✓   |       0.2 |      0.0 |      45 |     58 |               0.6 | q0 pos(p,o) → q1 spo(s,p) → q2 osp(o,s,p) → …(7) **temp b-tree** |
| B-Q10b | join+filter           |                                                     2 | ✓   |       0.2 |      0.0 |      43 |     47 |               0.2 | q0 pos(p,o) → q1 spo(s,p) → q2 osp(o,s,p) → …(7) **temp b-tree** |
| B-Q10c | join+filter           |                                                     5 | ✓   |       0.2 |      0.4 |      43 |     48 |               0.4 | q0 pos(p,o) → q1 spo(s,p) → q2 osp(o,s,p) → …(7) **temp b-tree** |
| B-Q11a | union lookup          |                                                    10 | ✓   |       0.1 |      0.2 |      45 |     42 |               0.2 | q0 spo(s) → q1 osp(o)                                            |
| B-Q11b | union lookup          |                                                    10 | ✓   |       0.1 |      0.0 |      44 |     44 |               0.2 | q0 spo(s) → q1 osp(o)                                            |
| B-Q11c | union lookup          |                                                    10 | ✓   |       0.4 |      0.3 |      43 |     45 |               0.2 | q0 spo(s) → q1 osp(o)                                            |
| B-Q12a | construct             |                                                     8 | ✓   |       0.1 |      0.0 |      44 |     56 |               0.3 | q2 spo(s,p) → q4 spo(s,p) → q6 spo(s,p) → …(9)                   |
| B-Q12b | construct             |                                                     8 | ✓   |       1.1 |      0.1 |      44 |     44 |               0.3 | q2 spo(s,p) → q4 spo(s,p) → q6 spo(s,p) → …(9)                   |
| B-Q12c | construct             |                                                     8 | ✓   |       0.3 |      0.0 |      44 |     48 |               0.4 | q2 spo(s,p) → q4 spo(s,p) → q6 spo(s,p) → …(9)                   |
| B-Q9ar | DESCRIBE as CONSTRUCT |                                                     6 | ✓   |       0.0 |        — |      43 |     56 |               0.1 | q0 spo(s,p) → q1 spo(s)                                          |
| B-Q9br | DESCRIBE as CONSTRUCT |                                                     6 | ✓   |       0.3 |        — |      43 |     44 |               0.1 | q0 spo(s,p) → q1 spo(s)                                          |
| B-Q9cr | DESCRIBE as CONSTRUCT |                                                     6 | ✓   |       0.1 |        — |      43 |     46 |               0.1 | q0 spo(s,p) → q1 spo(s)                                          |

### BSBM 5M (14,000 products)

Deployed `https://rdf-bench-sql-compiler.dxos.workers.dev`, build `1791873867`, 2026-10-13T06:58Z. 4,968,357 triples, 643 MB. Ping 43.0 ms.

| query  | kind                  |                                                  rows | ✓   | server ms | no hints | wall ms | 1st ms | Oxigraph LOCAL ms | plan (loop order; flags)                                          |
| ------ | --------------------- | ----------------------------------------------------: | --- | --------: | -------: | ------: | -----: | ----------------: | ----------------------------------------------------------------- |
| B-Q1a  | star+filter           |                                                     6 |     |       0.3 |      0.6 |      46 |    148 |                 — | q1 pos(p,o) → q4 spo(s,p) → q0 spo(s,p) → …(5) **temp b-tree**    |
| B-Q1b  | star+filter           |                                                     1 |     |       0.0 |      0.0 |      46 |     50 |                 — | q2 pos(p,o) → q4 spo(s,p) → q0 spo(s,p) → …(5) **temp b-tree**    |
| B-Q1c  | star+filter           |                                                     3 |     |       0.0 |      0.1 |      47 |     51 |                 — | q3 pos(p,o) → q4 spo(s,p) → q0 spo(s,p) → …(5) **temp b-tree**    |
| B-Q2a  | lookup star           |                                                    31 |     |       0.0 |      0.0 |      48 |     76 |                 — | q0 spo(s,p) → q1 spo(s,p) → q2 spo(s,p) → …(15)                   |
| B-Q2b  | lookup star           |                                                    22 |     |       0.7 |      0.1 |      46 |     53 |                 — | q0 spo(s,p) → q1 spo(s,p) → q2 spo(s,p) → …(15)                   |
| B-Q2c  | lookup star           |                                                    27 |     |       0.1 |      0.8 |      47 |     50 |                 — | q0 spo(s,p) → q1 spo(s,p) → q2 spo(s,p) → …(15)                   |
| B-Q3a  | negation              |                                                     0 |     |       0.0 |      0.2 |      45 |     51 |                 — | q5 pos(p,o) → q6 spo(s,p) → q2 pos(p,o) → …(7) **temp b-tree**    |
| B-Q3b  | negation              |                                                     1 |     |       0.0 |      0.3 |      45 |     50 |                 — | q5 pos(p,o) → q6 spo(s,p) → q1 pos(p,o) → …(7) **temp b-tree**    |
| B-Q3c  | negation              |                                                     0 |     |       0.7 |      0.0 |      40 |     54 |                 — | q5 pos(p,o) → q6 spo(s,p) → q2 pos(p,o) → …(7) **temp b-tree**    |
| B-Q4a  | union                 |                                                     0 |     |       0.1 |      0.3 |      43 |     44 |                 — | q3 pos(p,o) → q4 spo(s,p) → q0 spo(s,p) → …(12) **temp b-tree**   |
| B-Q4b  | union                 |                                                     0 |     |       0.0 |      1.0 |      44 |     46 |                 — | q2 pos(p,o) → q1 spo(s,p,o) → q0 spo(s,p) → …(12) **temp b-tree** |
| B-Q4c  | union                 |                                                     1 |     |       0.8 |      0.2 |      45 |     47 |                 — | q3 pos(p,o) → q1 spo(s,p,o) → q0 spo(s,p) → …(12) **temp b-tree** |
| B-Q5a  | self-join+filter      |                                                     5 |     |       8.9 |      8.6 |      55 |     55 |                 — | q3 spo(s,p) → q1 spo(s,p) → q2 pos(p,o) → …(7) **temp b-tree**    |
| B-Q5b  | self-join+filter      |                                                     5 |     |      13.5 |     14.4 |      62 |     64 |                 — | q3 spo(s,p) → q1 spo(s,p) → q2 pos(p,o) → …(7) **temp b-tree**    |
| B-Q5c  | self-join+filter      |                                                     0 |     |      12.2 |     11.7 |      52 |     57 |                 — | q3 spo(s,p) → q1 spo(s,p) → q2 pos(p,o) → …(7) **temp b-tree**    |
| B-Q6a  | regex                 |                                                     1 |     |      29.9 |     34.4 |      78 |     78 |                 — | q0 pos(p) → q1 spo(s,p,o)                                         |
| B-Q6b  | regex                 |                                                     1 |     |      30.6 |     35.2 |      74 |     74 |                 — | q0 pos(p) → q1 spo(s,p,o)                                         |
| B-Q6c  | regex                 |                                                     1 |     |      27.9 |     31.7 |      78 |     87 |                 — | q0 pos(p) → q1 spo(s,p,o)                                         |
| B-Q7a  | optional              |                                                     7 |     |       0.7 |      0.0 |      44 |    258 |                 — | q1 pos(p,o) → q3 spo(s,p) → q4 spo(s,p) → …(14)                   |
| B-Q7b  | optional              |                                                     1 |     |       0.0 |      1.8 |      47 |     49 |                 — | q1 pos(p,o) → q3 spo(s,p) → q4 spo(s,p) → …(14)                   |
| B-Q7c  | optional              |                                                     5 |     |       0.9 |      0.0 |      45 |     48 |                 — | q1 pos(p,o) → q3 spo(s,p) → q4 spo(s,p) → …(14)                   |
| B-Q8a  | optional+lang         |                                                     6 |     |       0.6 |      0.0 |      47 |    122 |                 — | q0 pos(p,o) → q4 spo(s,p) → q5 spo(s,p) → …(10) **temp b-tree**   |
| B-Q8b  | optional+lang         |                                                     1 |     |       0.8 |      0.5 |      44 |     73 |                 — | q0 pos(p,o) → q4 spo(s,p) → q5 spo(s,p) → …(10) **temp b-tree**   |
| B-Q8c  | optional+lang         |                                                     1 |     |       0.0 |      0.0 |      46 |     54 |                 — | q0 pos(p,o) → q4 spo(s,p) → q5 spo(s,p) → …(10) **temp b-tree**   |
| B-Q9a  | describe              | **Unsupported SPARQL construct: query type DESCRIBE** |     |         — |        — |       — |     44 |                 — |                                                                   |
| B-Q9b  | describe              | **Unsupported SPARQL construct: query type DESCRIBE** |     |         — |        — |       — |     49 |                 — |                                                                   |
| B-Q9c  | describe              | **Unsupported SPARQL construct: query type DESCRIBE** |     |         — |        — |       — |     47 |                 — |                                                                   |
| B-Q10a | join+filter           |                                                     1 |     |       0.0 |      0.3 |      46 |     63 |                 — | q0 pos(p,o) → q1 spo(s,p) → q2 osp(o,s,p) → …(7) **temp b-tree**  |
| B-Q10b | join+filter           |                                                     0 |     |       0.5 |      0.3 |      42 |     48 |                 — | q0 pos(p,o) → q1 spo(s,p) → q2 osp(o,s,p) → …(7) **temp b-tree**  |
| B-Q10c | join+filter           |                                                     5 |     |       0.0 |      0.7 |      45 |     49 |                 — | q0 pos(p,o) → q1 spo(s,p) → q2 osp(o,s,p) → …(7) **temp b-tree**  |
| B-Q11a | union lookup          |                                                    10 |     |       0.0 |      0.1 |      45 |     47 |                 — | q0 spo(s) → q1 osp(o)                                             |
| B-Q11b | union lookup          |                                                    10 |     |       1.2 |      0.0 |      46 |     45 |                 — | q0 spo(s) → q1 osp(o)                                             |
| B-Q11c | union lookup          |                                                    10 |     |       0.0 |      0.8 |      46 |     47 |                 — | q0 spo(s) → q1 osp(o)                                             |
| B-Q12a | construct             |                                                     8 |     |       0.0 |      0.3 |      44 |     66 |                 — | q0 spo(s,p) → q1 spo(s,p) → q2 spo(s,p) → …(9)                    |
| B-Q12b | construct             |                                                     8 |     |       0.0 |      0.0 |      45 |     47 |                 — | q0 spo(s,p) → q1 spo(s,p) → q2 spo(s,p) → …(9)                    |
| B-Q12c | construct             |                                                     8 |     |       0.5 |      0.6 |      45 |     45 |                 — | q0 spo(s,p) → q1 spo(s,p) → q2 spo(s,p) → …(9)                    |
| B-Q9ar | DESCRIBE as CONSTRUCT |                                                     6 |     |       0.0 |        — |      43 |     46 |                 — | q0 spo(s,p) → q1 spo(s)                                           |
| B-Q9br | DESCRIBE as CONSTRUCT |                                                     6 |     |       0.1 |        — |      42 |     43 |                 — | q0 spo(s,p) → q1 spo(s)                                           |
| B-Q9cr | DESCRIBE as CONSTRUCT |                                                     6 |     |       0.0 |        — |      42 |     43 |                 — | q0 spo(s,p) → q1 spo(s)                                           |

### LUBM(10), no inference

Deployed `https://rdf-bench-sql-compiler.dxos.workers.dev`, build `1791873867`, 2026-10-13T06:44Z. 1,272,953 triples, 95 MB. Ping 28.6 ms.

| query | kind                     |  rows | ✓   | server ms | no hints | wall ms | 1st ms | Oxigraph LOCAL ms | plan (loop order; flags)                                  |
| ----- | ------------------------ | ----: | --- | --------: | -------: | ------: | -----: | ----------------: | --------------------------------------------------------- |
| L-Q1  | none                     |     4 | ✓   |       0.2 |      4.7 |      29 |     43 |              40.4 | q1 pos(p,o) → q0 spo(s,p,o)                               |
| L-Q2  | subClassOf               |    28 | ✓   |       3.9 |     54.3 |      38 |     47 |               148 | q2 pos(p,o) → q4 spo(s,p) → q1 spo(s,p,o) → …(6)          |
| L-Q3  | none                     |     6 | ✓   |       0.0 |     16.4 |      30 |     37 |               103 | q1 pos(p,o) → q0 spo(s,p,o)                               |
| L-Q4  | subClassOf               |     0 | ✓   |       0.0 |      0.2 |      29 |     45 |               0.1 | q0 pos(p,o) → q1 spo(s,p,o) → q2 spo(s,p) → …(5)          |
| L-Q5  | subClassOf+subPropertyOf |     0 | ✓   |       0.0 |      0.2 |      30 |     29 |               0.0 | q0 pos(p,o) → q1 spo(s,p,o)                               |
| L-Q6  | subClassOf               |     0 | ✓   |       0.0 |      0.2 |      31 |     32 |               0.0 | q0 pos(p,o)                                               |
| L-Q7  | subClassOf               |     0 | ✓   |       0.0 |      0.0 |      28 |     37 |               0.1 | q0 pos(p,o) → q2 spo(s,p) → q1 spo(s,p,o) → q3 osp(o,s,p) |
| L-Q8  | subClassOf               |     0 | ✓   |       0.0 |      0.0 |      29 |     29 |               0.1 | q0 pos(p,o) → q2 spo(s,p) → q1 spo(s,p,o) → …(5)          |
| L-Q9  | subClassOf               |     0 | ✓   |       0.0 |      0.0 |      33 |     31 |               0.2 | q0 pos(p,o) → q3 spo(s,p) → q1 spo(s,p,o) → …(6)          |
| L-Q10 | subClassOf               |     0 | ✓   |       0.0 |      0.3 |      29 |     30 |               0.0 | q0 pos(p,o) → q1 spo(s,p,o)                               |
| L-Q11 | transitive               |     0 | ✓   |       0.0 |      0.7 |      29 |     27 |               3.3 | q1 pos(p,o) → q0 spo(s,p,o)                               |
| L-Q12 | owl                      |     0 | ✓   |       0.0 |      0.2 |      28 |     32 |               0.1 | q0 pos(p,o) → q2 spo(s,p) → q1 spo(s,p,o) → q3 spo(s,p,o) |
| L-Q13 | inverseOf                |     0 | ✓   |       0.2 |      0.2 |      28 |     28 |               0.1 | q1 spo(s,p) → q0 spo(s,p,o)                               |
| L-Q14 | none                     | 75547 | ✓   |      78.7 |     74.0 |     220 |    200 |               403 | q0 pos(p,o)                                               |

### LUBM(10) + RDFS closure (Jena riot --rdfs)

Deployed `https://rdf-bench-sql-compiler.dxos.workers.dev`, build `1791873867`, 2026-10-13T06:45Z. 1,591,332 triples, 108 MB. Ping 30.6 ms.

| query | kind                     |  rows | ✓   | server ms | no hints | wall ms | 1st ms | Oxigraph LOCAL ms | plan (loop order; flags)                                  |
| ----- | ------------------------ | ----: | --- | --------: | -------: | ------: | -----: | ----------------: | --------------------------------------------------------- |
| L-Q1  | none                     |     4 |     |       0.0 |      7.4 |      30 |     51 |                 — | q1 pos(p,o) → q0 spo(s,p,o)                               |
| L-Q2  | subClassOf               |    28 |     |       7.1 |     82.5 |      39 |     51 |                 — | q2 pos(p,o) → q4 spo(s,p) → q1 spo(s,p,o) → …(6)          |
| L-Q3  | none                     |     6 |     |       0.0 |     25.2 |      31 |     41 |                 — | q1 pos(p,o) → q0 spo(s,p,o)                               |
| L-Q4  | subClassOf               |    34 |     |       0.5 |      2.2 |      30 |     51 |                 — | q1 pos(p,o) → q0 spo(s,p,o) → q2 spo(s,p) → …(5)          |
| L-Q5  | subClassOf+subPropertyOf |   719 |     |       2.6 |     40.1 |      33 |     45 |                 — | q1 pos(p,o) → q0 spo(s,p,o)                               |
| L-Q6  | subClassOf               | 75547 |     |       148 |      142 |     302 |    297 |                 — | q0 pos(p,o)                                               |
| L-Q7  | subClassOf               |    59 |     |       0.7 |      0.0 |      31 |     41 |                 — | q3 spo(s,p) → q1 spo(s,p,o) → q2 pos(p,o) → q0 spo(s,p,o) |
| L-Q8  | subClassOf               |  5916 |     |      26.6 |      112 |      64 |     80 |                 — | q3 pos(p,o) → q1 spo(s,p,o) → q2 pos(p,o) → …(5)          |
| L-Q9  | subClassOf               |  1233 |     |       110 |      117 |     176 |    159 |                 — | q1 pos(p,o) → q4 spo(s,p) → q2 spo(s,p,o) → …(6)          |
| L-Q10 | subClassOf               |     0 |     |       0.0 |     21.1 |      30 |     32 |                 — | q1 pos(p,o) → q0 spo(s,p,o)                               |
| L-Q11 | transitive               |     0 |     |       0.0 |      1.3 |      29 |     33 |                 — | q1 pos(p,o) → q0 spo(s,p,o)                               |
| L-Q12 | owl                      |     0 |     |       0.5 |      0.6 |      29 |     29 |                 — | q0 pos(p,o) → q2 spo(s,p) → q1 spo(s,p,o) → q3 spo(s,p,o) |
| L-Q13 | inverseOf                |     0 |     |       0.0 |      0.0 |      29 |     29 |                 — | q1 spo(s,p) → q0 spo(s,p,o)                               |
| L-Q14 | none                     | 75547 |     |       140 |      127 |     315 |    277 |                 — | q0 pos(p,o)                                               |

### WatDiv scale 10

Deployed `https://rdf-bench-sql-compiler.dxos.workers.dev`, build `1791873867`, 2026-10-13T06:46Z. 1,087,673 triples, 70 MB. Ping 30.2 ms.

| query | kind      |  rows | ✓   | server ms | no hints | wall ms | 1st ms | Oxigraph LOCAL ms | plan (loop order; flags)                                |
| ----- | --------- | ----: | --- | --------: | -------: | ------: | -----: | ----------------: | ------------------------------------------------------- |
| W-L1a | linear    |     2 | ✓   |       0.0 |      0.0 |      32 |     44 |               1.1 | q0 pos(p,o) → q2 spo(s,p) → q1 spo(s,p)                 |
| W-L1b | linear    |     2 | ✓   |       0.0 |      0.0 |      30 |     33 |               0.5 | q0 pos(p,o) → q2 spo(s,p) → q1 spo(s,p)                 |
| W-L2a | linear    |    31 | ✓   |       2.6 |      0.2 |      34 |     34 |               5.2 | q0 spo(s,p) → q2 pos(p,o) → q1 spo(s,p,o)               |
| W-L2b | linear    |     7 | ✓   |       0.1 |      0.2 |      32 |     34 |               1.3 | q0 spo(s,p) → q2 pos(p,o) → q1 spo(s,p,o)               |
| W-L3a | linear    |    33 | ✓   |       0.3 |      0.0 |      31 |     33 |               0.9 | q1 pos(p,o) → q0 spo(s,p)                               |
| W-L4a | linear    |     5 | ✓   |       0.0 |      0.5 |      32 |     31 |               0.3 | q0 pos(p,o) → q1 spo(s,p)                               |
| W-L5a | linear    |    22 | ✓   |       2.5 |      2.3 |      33 |     35 |               3.4 | q1 spo(s,p) → q2 pos(p,o) → q0 spo(s,p)                 |
| W-L5b | linear    |     6 | ✓   |       0.0 |      1.1 |      32 |     32 |               1.0 | q1 spo(s,p) → q2 pos(p,o) → q0 spo(s,p)                 |
| W-S1a | star      |     9 | ✓   |       0.3 |      0.4 |      31 |     40 |               2.6 | q1 spo(s,p) → q8 spo(s,p) → q4 spo(s,p) → …(9)          |
| W-S1b | star      |     0 | ✓   |       0.0 |      0.0 |      31 |     35 |               1.2 | q1 spo(s,p) → q8 spo(s,p) → q4 spo(s,p) → …(9)          |
| W-S1c | star      |    15 | ✓   |       0.2 |      1.0 |      30 |     33 |               3.4 | q1 spo(s,p) → q8 spo(s,p) → q4 spo(s,p) → …(9)          |
| W-S2a | star      |     0 | ✓   |       0.6 |      0.0 |      30 |     34 |               0.6 | q1 pos(p,o) → q0 spo(s,p) → q2 spo(s,p) → q3 spo(s,p,o) |
| W-S2b | star      |     1 | ✓   |       0.2 |      0.0 |      30 |     33 |               0.4 | q1 pos(p,o) → q0 spo(s,p) → q2 spo(s,p) → q3 spo(s,p,o) |
| W-S3a | star      |     0 | ✓   |       0.0 |      0.0 |      30 |     36 |               0.4 | q3 pos(p) → q0 spo(s,p,o) → q1 spo(s,p) → q2 spo(s,p)   |
| W-S3b | star      |     0 | ✓   |       0.2 |      0.2 |      30 |     33 |               0.6 | q3 pos(p) → q0 spo(s,p,o) → q1 spo(s,p) → q2 spo(s,p)   |
| W-S4a | star      |     0 | ✓   |       0.0 |      0.0 |      30 |     33 |               7.6 | q2 pos(p) → q0 spo(s,p,o) → q1 spo(s,p) → q3 spo(s,p,o) |
| W-S5a | star      |     0 | ✓   |       0.1 |      0.0 |      31 |     32 |               0.3 | q3 pos(p,o) → q0 spo(s,p,o) → q1 spo(s,p) → q2 spo(s,p) |
| W-S5b | star      |     0 | ✓   |       0.0 |      0.3 |      32 |     32 |               0.3 | q3 pos(p,o) → q0 spo(s,p,o) → q1 spo(s,p) → q2 spo(s,p) |
| W-S6a | star      |     1 | ✓   |       0.3 |      0.0 |      31 |     31 |               0.2 | q0 pos(p) → q2 spo(s,p,o) → q1 spo(s,p)                 |
| W-S6b | star      |     1 | ✓   |       0.0 |      0.0 |      31 |     33 |               0.1 | q2 pos(p,o) → q0 spo(s,p) → q1 spo(s,p)                 |
| W-S7a | star      |     0 | ✓   |       0.0 |      0.0 |      30 |     31 |               0.1 | q2 spo(s,p) → q1 spo(s,p) → q0 spo(s,p)                 |
| W-S7b | star      |     0 | ✓   |       0.2 |      0.0 |      30 |     45 |               0.1 | q2 spo(s,p) → q1 spo(s,p) → q0 spo(s,p)                 |
| W-F1a | snowflake |     0 | ✓   |       0.1 |      0.2 |      31 |     33 |               0.3 | q2 pos(p) → q3 spo(s,p) → q4 spo(s,p) → …(6)            |
| W-F1b | snowflake |     0 | ✓   |       0.1 |      1.1 |      31 |     32 |               0.3 | q2 pos(p) → q3 spo(s,p) → q4 spo(s,p) → …(6)            |
| W-F2a | snowflake |     1 | ✓   |       0.5 |      0.2 |      30 |     33 |               0.7 | q7 pos(p,o) → q4 spo(s,p) → q0 spo(s,p) → …(8)          |
| W-F3a | snowflake |     6 | ✓   |       0.1 |      0.0 |      31 |     42 |               0.4 | q2 pos(p,o) → q0 spo(s,p) → q1 spo(s,p) → …(6)          |
| W-F3b | snowflake |     0 | ✓   |       0.0 |      0.1 |      30 |     39 |               0.2 | q2 pos(p,o) → q0 spo(s,p) → q1 spo(s,p) → …(6)          |
| W-F4a | snowflake |     0 | ✓   |       1.0 |      0.2 |      30 |     42 |               0.3 | q2 pos(p,o) → q0 spo(s,p) → q7 spo(s,p,o) → …(9)        |
| W-F4b | snowflake |     0 | ✓   |       0.0 |      0.0 |      32 |     31 |               0.2 | q2 pos(p,o) → q0 spo(s,p) → q7 spo(s,p,o) → …(9)        |
| W-F4c | snowflake |    27 | ✓   |       0.6 |      0.0 |      32 |     35 |               1.2 | q2 pos(p,o) → q0 spo(s,p) → q7 spo(s,p,o) → …(9)        |
| W-F5a | snowflake |    27 | ✓   |       0.8 |      0.7 |      32 |     33 |               1.2 | q1 spo(s,p) → q0 spo(s,p) → q3 spo(s,p) → …(6)          |
| W-F5b | snowflake |    37 | ✓   |       0.9 |      0.6 |      31 |     32 |               1.4 | q1 spo(s,p) → q0 spo(s,p) → q3 spo(s,p) → …(6)          |
| W-F5c | snowflake |    31 | ✓   |       0.5 |      0.1 |      32 |     33 |               1.2 | q1 spo(s,p) → q0 spo(s,p) → q3 spo(s,p) → …(6)          |
| W-C1a | complex   |     0 | ✓   |       0.8 |      172 |      30 |     37 |               2.2 | q0 pos(p) → q1 spo(s,p) → q2 spo(s,p) → …(8)            |
| W-C2a | complex   |     0 | ✓   |      44.3 |      158 |      70 |     74 |              21.2 | q0 pos(p) → q1 spo(s,p) → q3 spo(s,p) → …(10)           |
| W-C3a | complex   | 51852 | ✓   |       123 |      682 |     303 |    278 |              3666 | q2 pos(p) → q3 spo(s,p) → q5 spo(s,p) → …(6)            |

### WatDiv scale 50

Deployed `https://rdf-bench-sql-compiler.dxos.workers.dev`, build `1791873867`, 2026-10-13T06:49Z. 5,463,748 triples, 358 MB. Ping 29.1 ms.

| query | kind      |   rows | ✓   | server ms | no hints | wall ms | 1st ms | Oxigraph LOCAL ms | plan (loop order; flags)                                |
| ----- | --------- | -----: | --- | --------: | -------: | ------: | -----: | ----------------: | ------------------------------------------------------- |
| W-L1a | linear    |      3 | ✓   |       0.1 |      0.0 |      32 |     47 |               0.7 | q0 pos(p,o) → q2 spo(s,p) → q1 spo(s,p)                 |
| W-L1b | linear    |      3 | ✓   |       0.0 |      0.4 |      33 |     33 |               0.4 | q0 pos(p,o) → q2 spo(s,p) → q1 spo(s,p)                 |
| W-L1c | linear    |      2 | ✓   |       0.5 |      0.2 |      30 |     31 |               0.3 | q0 pos(p,o) → q2 spo(s,p) → q1 spo(s,p)                 |
| W-L2a | linear    |      2 | ✓   |       0.3 |      1.9 |      30 |     33 |               1.1 | q0 spo(s,p) → q2 pos(p,o) → q1 spo(s,p,o)               |
| W-L2b | linear    |      9 | ✓   |       0.2 |      0.9 |      30 |     31 |               1.8 | q0 spo(s,p) → q2 pos(p,o) → q1 spo(s,p,o)               |
| W-L2c | linear    |    116 | ✓   |       9.4 |      1.3 |      43 |     43 |              22.9 | q0 spo(s,p) → q2 pos(p,o) → q1 spo(s,p,o)               |
| W-L3a | linear    |     15 | ✓   |       0.0 |      0.1 |      31 |     31 |               0.5 | q1 pos(p,o) → q0 spo(s,p)                               |
| W-L3b | linear    |     29 | ✓   |       0.3 |      0.4 |      30 |     31 |               0.7 | q1 pos(p,o) → q0 spo(s,p)                               |
| W-L4a | linear    |     32 | ✓   |       0.2 |      1.2 |      30 |     37 |               2.0 | q0 pos(p,o) → q1 spo(s,p)                               |
| W-L4b | linear    |     29 | ✓   |       0.1 |      0.9 |      32 |     33 |               2.0 | q0 pos(p,o) → q1 spo(s,p)                               |
| W-L5a | linear    |      3 | ✓   |       0.0 |      0.2 |      31 |     31 |               1.5 | q1 spo(s,p) → q2 pos(p,o) → q0 spo(s,p)                 |
| W-L5b | linear    |      8 | ✓   |       0.2 |      0.1 |      32 |     35 |               2.3 | q1 spo(s,p) → q2 pos(p,o) → q0 spo(s,p)                 |
| W-L5c | linear    |    127 | ✓   |      15.5 |      9.7 |      43 |     48 |              20.0 | q1 spo(s,p) → q2 pos(p,o) → q0 spo(s,p)                 |
| W-S1a | star      |     12 | ✓   |       0.7 |      0.6 |      30 |     64 |               1.7 | q1 spo(s,p) → q4 spo(s,p) → q6 spo(s,p) → …(9)          |
| W-S1b | star      |      5 | ✓   |       0.1 |      0.4 |      30 |     33 |               0.9 | q1 spo(s,p) → q4 spo(s,p) → q6 spo(s,p) → …(9)          |
| W-S1c | star      |      0 | ✓   |       0.0 |      0.0 |      30 |     32 |               0.7 | q1 spo(s,p) → q4 spo(s,p) → q6 spo(s,p) → …(9)          |
| W-S2a | star      |      8 | ✓   |       0.6 |      0.4 |      30 |     41 |               1.8 | q1 pos(p,o) → q0 spo(s,p) → q2 spo(s,p) → q3 spo(s,p,o) |
| W-S3a | star      |      0 | ✓   |       2.4 |      2.6 |      31 |     37 |               3.1 | q3 pos(p) → q0 spo(s,p,o) → q1 spo(s,p) → q2 spo(s,p)   |
| W-S4a | star      |      1 | ✓   |       1.8 |      3.0 |      34 |     41 |              51.4 | q2 pos(p) → q0 spo(s,p,o) → q1 spo(s,p) → q3 spo(s,p,o) |
| W-S5a | star      |      0 | ✓   |       0.4 |      0.3 |      30 |     36 |               3.5 | q3 pos(p,o) → q0 spo(s,p,o) → q1 spo(s,p) → q2 spo(s,p) |
| W-S6a | star      |      8 | ✓   |       0.0 |      0.5 |      30 |     32 |               2.1 | q0 pos(p) → q2 spo(s,p,o) → q1 spo(s,p)                 |
| W-S6b | star      |      0 | ✓   |       0.3 |      0.0 |      28 |     30 |               0.1 | q2 pos(p,o) → q0 spo(s,p) → q1 spo(s,p)                 |
| W-S6c | star      |      0 | ✓   |       0.4 |      0.0 |      30 |     34 |               0.1 | q2 pos(p,o) → q0 spo(s,p) → q1 spo(s,p)                 |
| W-S7a | star      |      1 | ✓   |       0.2 |      0.0 |      30 |     31 |               0.1 | q2 spo(s,p) → q1 spo(s,p) → q0 spo(s,p)                 |
| W-S7b | star      |      1 | ✓   |       0.0 |      0.0 |      32 |     31 |               0.1 | q2 spo(s,p) → q1 spo(s,p) → q0 spo(s,p)                 |
| W-S7c | star      |      0 | ✓   |       0.0 |      0.3 |      29 |     30 |               0.1 | q2 spo(s,p) → q1 spo(s,p) → q0 spo(s,p)                 |
| W-F1a | snowflake |      0 | ✓   |       0.2 |      3.6 |      29 |     34 |               4.4 | q2 pos(p) → q3 spo(s,p) → q4 spo(s,p) → …(6)            |
| W-F1b | snowflake |      0 | ✓   |       0.2 |      3.3 |      29 |     36 |               2.9 | q2 pos(p) → q3 spo(s,p) → q4 spo(s,p) → …(6)            |
| W-F1c | snowflake |      0 | ✓   |       0.1 |      3.1 |      30 |     33 |               4.7 | q2 pos(p) → q3 spo(s,p) → q4 spo(s,p) → …(6)            |
| W-F2a | snowflake |      6 | ✓   |       1.2 |      2.4 |      32 |     39 |               3.2 | q7 pos(p,o) → q4 spo(s,p) → q0 spo(s,p) → …(8)          |
| W-F2b | snowflake |      0 | ✓   |       0.0 |      0.0 |      30 |     30 |               0.3 | q7 pos(p,o) → q0 spo(s,p) → q1 spo(s,p) → …(8)          |
| W-F3a | snowflake |      8 | ✓   |       2.6 |      1.8 |      35 |     46 |               2.3 | q2 pos(p,o) → q0 spo(s,p) → q1 spo(s,p) → …(6)          |
| W-F3b | snowflake |      0 | ✓   |       0.5 |      0.0 |      28 |     30 |               0.2 | q2 pos(p,o) → q0 spo(s,p) → q1 spo(s,p) → …(6)          |
| W-F3c | snowflake |      0 | ✓   |       0.0 |      0.1 |      28 |     32 |               0.2 | q2 pos(p,o) → q0 spo(s,p) → q1 spo(s,p) → …(6)          |
| W-F4a | snowflake |      0 | ✓   |       0.0 |      0.0 |      30 |     33 |               1.7 | q2 pos(p,o) → q0 spo(s,p) → q4 spo(s,p) → …(9)          |
| W-F4b | snowflake |     56 | ✓   |       1.2 |      0.7 |      31 |     40 |               4.4 | q2 pos(p,o) → q0 spo(s,p) → q4 spo(s,p) → …(9)          |
| W-F4c | snowflake |     65 | ✓   |       0.7 |      0.7 |      33 |     35 |               4.5 | q2 pos(p,o) → q0 spo(s,p) → q4 spo(s,p) → …(9)          |
| W-F5a | snowflake |     66 | ✓   |       0.7 |      1.2 |      32 |     33 |               3.7 | q1 spo(s,p) → q3 spo(s,p) → q0 spo(s,p) → …(6)          |
| W-F5b | snowflake |     48 | ✓   |       0.6 |      1.3 |      31 |     34 |               3.1 | q1 spo(s,p) → q3 spo(s,p) → q0 spo(s,p) → …(6)          |
| W-F5c | snowflake |     63 | ✓   |       1.6 |      0.6 |      31 |     37 |               3.8 | q1 spo(s,p) → q3 spo(s,p) → q0 spo(s,p) → …(6)          |
| W-C1a | complex   |      0 | ✓   |       6.0 |     1257 |      36 |     49 |              15.2 | q0 pos(p) → q1 spo(s,p) → q2 spo(s,p) → …(8)            |
| W-C2a | complex   |      2 | ✓   |      30.9 |      591 |      60 |     63 |               132 | q0 pos(p) → q1 spo(s,p) → q2 spo(s,p,o) → …(10)         |
| W-C3a | complex   | 213730 | ✓   |       614 |     3105 |     849 |    952 |             17581 | q2 pos(p) → q3 spo(s,p) → q4 spo(s,p) → …(6)            |

### DBLP, first 6M lines of dblp.nt

Deployed `https://rdf-bench-sql-compiler.dxos.workers.dev`, build `1791873867`, 2026-10-13T06:57Z. 5,898,338 triples, 415 MB. Ping 29.9 ms.

| query                | kind                  |                                                  rows | ✓      | server ms | no hints | wall ms | 1st ms | Oxigraph LOCAL ms | plan (loop order; flags)                                                        |
| -------------------- | --------------------- | ----------------------------------------------------: | ------ | --------: | -------: | ------: | -----: | ----------------: | ------------------------------------------------------------------------------- |
| D1-lookup            | lookup                |                                                     1 | ✓      |       0.4 |      0.0 |      32 |     62 |               0.3 | q0 pos(p,o) → q1 spo(s,p) → q2 spo(s,p)                                         |
| D2-star              | star                  |                                                     1 | ✓      |       0.0 |      0.5 |      30 |     66 |               0.3 | q0 spo(s,p) → q1 spo(s,p) → q2 spo(s,p) → …(6)                                  |
| D3-authors-of-pub    | star+join             |                                                     5 | ✓      |       0.5 |      0.0 |      29 |     77 |               0.3 | q0 spo(s,p) → q1 spo(s,p) → q2 spo(s,p) → q3 spo(s,p) LEFT-JOIN **temp b-tree** |
| D4-pubs-of-author    | join                  |                                                   560 | ✓      |       6.8 |      9.1 |      41 |     59 |              16.4 | q0 pos(p,o) → q1 spo(s,p) → q2 spo(s,p) **temp b-tree**                         |
| D5-coauthors         | 2-hop                 |                                                    20 | ✓      |       3.9 |      3.8 |      34 |     36 |               4.5 | q0 pos(p,o) → q1 spo(s,p) **temp b-tree**                                       |
| D6-per-year          | aggregate             |                                                    65 | ✓      |      10.8 |     14.1 |      42 |     43 |              84.5 | q0 pos(p) **temp b-tree**                                                       |
| D7-per-type-venue    | aggregate             |                                                    20 | ✓      |       159 |      177 |     179 |    186 |               441 | q1 pos(p) → q0 spo(s,p) **temp b-tree**                                         |
| D8-text              | text                  |                                                   100 | ≈      |      41.0 |     41.3 |      73 |     71 |              16.3 | q0 pos(p)                                                                       |
| D9-text-year         | text+range            |                                                    50 | ✓      |       126 |      120 |     175 |    157 |               184 | q0 pos(p) → q1 spo(s,p) **temp b-tree**                                         |
| D10-prolific         | aggregate+join        |                                                    10 | ≈      |       931 |      772 |     717 |    731 |              1072 | q0 pos(p) → q1 spo(s,p) **temp b-tree**                                         |
| D11-no-doi           | optional/negation     |                                                     1 | ✓      |      37.1 |     31.4 |      68 |     88 |              98.1 | q0 pos(p,o) → q1 spo(s,p)                                                       |
| D12-path             | property path         |                                                    37 | ✓      |       0.0 |      0.3 |      29 |     42 |               0.7 | q0 spo(s,p) → q1 spo(s,p) → q2 pos(p,o) → q3 spo(s,p)                           |
| D13-versions         | path +                |                                                   100 | ≈      |       9.4 |      9.9 |      41 |     44 |              15.5 |                                                                                 |
| D14-sameAs-count     | count                 |                                                     1 | ✓      |      11.5 |     11.0 |      42 |     47 |               161 | q0 pos(p)                                                                       |
| D10r-prolific-const  | aggregate+join        |                                                    10 | ≈      |      27.9 |     25.7 |      60 |     57 |              51.2 | q0 pos(p,o) → q1 spo(s,p) **temp b-tree**                                       |
| D15-describe         | gap: DESCRIBE         | **Unsupported SPARQL construct: query type DESCRIBE** |        |         — |        — |       — |     28 |               0.8 |                                                                                 |
| D16-regex-quantified | gap: REGEX            |    **Unsupported SPARQL construct: REGEX metachar [** |        |         — |        — |       — |     29 |               138 |                                                                                 |
| D17-datatype         | gap: DATATYPE         |   **Unsupported SPARQL construct: function datatype** |        |         — |        — |       — |     29 |               120 |                                                                                 |
| D15r-describe        | DESCRIBE as CONSTRUCT |                                                    36 | ✗ (74) |       0.2 |        — |      31 |     41 |               0.8 | q0 spo(s)                                                                       |
