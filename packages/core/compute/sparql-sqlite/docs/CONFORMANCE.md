# Conformance

How `@dxos/sparql-sqlite` was checked against the SPARQL specification and against Oxigraph, Comunica
and Apache Jena ARQ, what that found, and what still differs.

**Summary.** The engine passes 371 of the 529 W3C query-evaluation tests it runs (70%), against 488 (92%)
for both Oxigraph and Comunica under the same harness. Every failure is listed in
[`known-failures.json`](../src/testing/w3c/known-failures.json) with its cause. Most failures come from
three design limits: no XSD type on computed numbers, no language tag on computed strings, and no
functions that create terms (`DATATYPE`, `IRI`, `STRDT`). On 1,002 differential cases (the package's
queries, 600 random queries over a generated and a real dataset, and every W3C test it passes), only one
answer differs from what Oxigraph, Comunica and Jena agree on: an AVG that double arithmetic rounds
differently in the 15th digit. The other differences are numeric typing or quirks of the other
engines. The work fixed 13 bugs, most of which returned wrong
answers silently. The worst was that `ORDER BY` was lost on every query.

## Method

### W3C test suites

The suites are vendored from [w3c/rdf-tests](https://github.com/w3c/rdf-tests) at commit `d5d930b0`
into [`src/testing/w3c/rdf-tests/`](../src/testing/w3c/rdf-tests) (1.1 MB): all of SPARQL 1.0
`data-r2` (`sparql10/`) and the SPARQL 1.1 query manifest (`sparql11/manifest-sparql11-query.ttl`
and the 13 directories it includes). Because they are vendored, CI runs them.

- [`manifest.ts`](../src/testing/w3c/manifest.ts) reads the manifests with `n3` and follows `mf:include`.
  A test's id is `<directory>/<entry>`, for example `sparql11/aggregates/agg01`.
- [`harness.ts`](../src/testing/w3c/harness.ts) loads `qt:data` into the default graph and each
  `qt:graphData` (or `FROM`/`FROM NAMED` document) into a named graph. RDF/XML goes through Oxigraph's
  parser; everything else goes through `n3`. The query's base IRI is prepended as `BASE <…>`, so no
  engine needs a base option.
- [`results.ts`](../src/testing/w3c/results.ts) reads `.srx` (fast-xml-parser), `.srj`, and RDF
  results: DAWG result-set graphs ordered by `rs:index`, or CONSTRUCT graphs.
- [`compare.ts`](../src/testing/w3c/compare.ts) checks result-set equivalence:
  - Rows are compared as multisets under a blank-node bijection, found by backtracking. CONSTRUCT
    results get the same check after deduplication, which makes it graph isomorphism.
  - Terms must be RDF-term-equal. Two loosenings apply: numeric literals of the _same_ datatype compare
    by value (`"1.0"^^xsd:decimal` = `"1"^^xsd:decimal`), and language tags compare case-insensitively.
  - Under `ORDER BY`, the leading projected sort variables must also appear in the expected sequence.
  - Under `REDUCED`, only the distinct rows are compared.
- Syntax tests: a positive test passes when the engine accepts the query. Our engine counts as
  accepting it even if a feature then throws `UnsupportedSparqlError`. A negative test passes when the
  query is rejected with a parse error or `InvalidSparqlError`.

[`src/w3c.test.ts`](../src/w3c.test.ts) runs every test in CI in about 4 s. A test in
`known-failures.json` runs as `test.fails`, so a fix fails CI until the entry is removed, and a
regression fails because the test is not on the list.

Not run, with test counts from the full SPARQL 1.1 manifest:

| category                                                         | tests | why                                                        |
| ---------------------------------------------------------------- | ----: | ---------------------------------------------------------- |
| UPDATE evaluation (`add` … `update-silent`, 11 dirs)             |   102 | update semantics; covered by `engine.test.ts`'s round trip |
| UPDATE syntax (`syntax-update-1/2`)                              |    55 | parser-only, sparqljs                                      |
| entailment                                                       |    70 | RDFS/OWL regimes; out of scope                             |
| federation (`service`, `syntax-fed`)                             |    10 | SERVICE unsupported                                        |
| protocol, graph-store protocol, HTTP update, service description |   55+ | HTTP, not query evaluation                                 |
| results formats (`csv-tsv-res`, `json-res`)                      |    10 | serializer tests                                           |
| `dawgt:NotApproved` evaluation tests                             |     2 | skipped explicitly (`test.skip`)                           |

### Three engines on the same harness

[`scripts/w3c-compare.ts`](../scripts/w3c-compare.ts) runs the same tests and comparison against
Oxigraph 0.5.11 (`oxigraph` npm, an in-memory store) and Comunica 5.2.3 (`@comunica/query-sparql-rdfjs`
over an `n3` Store). The adapters are in [`scripts/engines.ts`](../scripts/engines.ts).

```bash
pnpm exec tsx scripts/w3c-compare.ts      # table on stdout, details in .cache/w3c-compare.json
```

### Differential testing

[`scripts/differential.ts`](../scripts/differential.ts) runs one corpus on all four engines and diffs
the answers with the same comparison.

```bash
pnpm exec tsx scripts/differential.ts [--seed 1] [--count 300] [--no-w3c] [--no-jena]
```

- **Jena ARQ 5.5.0** is downloaded once into the gitignored `.cache/`. It runs in a single JVM through
  [`scripts/jena/JenaBatch.java`](../scripts/jena/JenaBatch.java), which is launched as a source file
  and needs no build. JenaBatch loads each case's N-Quads and writes SPARQL JSON or N-Triples.
- **Datasets:**
  - `generateFacts(0, 1000)`: about 10k triples of reified facts, with decimals, dateTimes, strings
    and IRIs.
  - `generateCode(0, 2000)`: the import graph, used for `Q7_path`.
  - The schema.org 29.0 vocabulary: a real Turtle file of about 17k triples, with language-tagged
    labels, a class hierarchy and external IRIs. It is downloaded into `.cache/`.
- **Corpus:**
  - The package's `QUERIES` and `PROBES`.
  - 300 random queries per dataset from [`scripts/query-gen.ts`](../scripts/query-gen.ts). The
    generator is seedable and draws the dataset's real predicates and values. It produces 23 shapes:
    stars, chains, OPTIONAL (also with a FILTER), numeric/string/lang/term-test filters, BIND
    arithmetic, UNION, MINUS, NOT EXISTS, GROUP BY with COUNT/HAVING, MIN/MAX/SUM/AVG, ORDER BY with
    LIMIT/OFFSET, `+ * ?` paths, inverse sequences, alternatives, VALUES with BIND, DISTINCT,
    aggregate sub-selects, ASK and CONSTRUCT. It avoids shapes whose answers are not deterministic:
    LIMIT without a total order, SAMPLE, GROUP_CONCAT.
  - Every W3C evaluation test the engine passes, each on its own dataset.
- **Verdicts:**
  - `agree`: every other engine's answer matches ours.
  - `ours-vs-consensus`: all other engines agree with each other and not with us. This is a suspected
    bug of ours.
  - `other-engine`: at least one other engine agrees with us. The dissenters are counted per engine.
  - `numeric-type-only`: the answers match once numbers are compared by value whatever their XSD type.
  - `no-consensus`: nobody agrees.

## Results

### W3C query suites (evaluation and syntax)

Counts are passing tests. The harness and comparison are the same for all three engines.

| category                         | tests | sparql-sqlite |      Oxigraph |      Comunica |
| -------------------------------- | ----: | ------------: | ------------: | ------------: |
| sparql10/algebra                 |    14 |     14 (100%) |     14 (100%) |      13 (93%) |
| sparql10/ask                     |     4 |      4 (100%) |      4 (100%) |      4 (100%) |
| sparql10/basic                   |    28 |      26 (93%) |     28 (100%) |      27 (96%) |
| sparql10/boolean-effective-value |     7 |      7 (100%) |      7 (100%) |      7 (100%) |
| sparql10/bound                   |     1 |      1 (100%) |      1 (100%) |      1 (100%) |
| sparql10/cast                    |     7 |        0 (0%) |      7 (100%) |      7 (100%) |
| sparql10/dataset                 |    12 |        0 (0%) |     12 (100%) |       2 (17%) |
| sparql10/distinct                |    11 |     11 (100%) |       9 (82%) |     11 (100%) |
| sparql10/expr-builtin            |    25 |      22 (88%) |      19 (76%) |      22 (88%) |
| sparql10/expr-equals             |    15 |     15 (100%) |      13 (87%) |     15 (100%) |
| sparql10/expr-ops                |    18 |      12 (67%) |     18 (100%) |      17 (94%) |
| sparql10/graph                   |    21 |      20 (95%) |      17 (81%) |      16 (76%) |
| sparql10/i18n                    |     5 |      5 (100%) |      5 (100%) |      5 (100%) |
| sparql10/open-world              |    18 |      10 (56%) |      15 (83%) |      11 (61%) |
| sparql10/optional                |     7 |      7 (100%) |      7 (100%) |      7 (100%) |
| sparql10/optional-filter         |     5 |      5 (100%) |       4 (80%) |       4 (80%) |
| sparql10/reduced                 |     2 |      2 (100%) |      2 (100%) |       1 (50%) |
| sparql10/regex                   |    21 |       6 (29%) |     21 (100%) |     21 (100%) |
| sparql10/solution-seq            |    13 |     13 (100%) |     13 (100%) |      12 (92%) |
| sparql10/sort                    |    14 |     14 (100%) |     14 (100%) |     14 (100%) |
| sparql10/triple-match            |     4 |      4 (100%) |      4 (100%) |      4 (100%) |
| sparql10/type-promotion          |    30 |        0 (0%) |     30 (100%) |     30 (100%) |
| sparql11/aggregates              |    42 |      34 (81%) |      39 (93%) |      41 (98%) |
| sparql11/bind                    |    10 |       9 (90%) |     10 (100%) |     10 (100%) |
| sparql11/bindings                |    30 |      27 (90%) |      24 (80%) |      23 (77%) |
| sparql11/cast                    |     6 |       2 (33%) |        0 (0%) |      6 (100%) |
| sparql11/construct               |     5 |       4 (80%) |      5 (100%) |      5 (100%) |
| sparql11/exists                  |     6 |      6 (100%) |      6 (100%) |      6 (100%) |
| sparql11/functions               |    76 |      27 (36%) |      75 (99%) |     76 (100%) |
| sparql11/grouping                |     4 |      4 (100%) |      4 (100%) |      4 (100%) |
| sparql11/negation                |    12 |     12 (100%) |      11 (92%) |     12 (100%) |
| sparql11/project-expression      |     7 |       4 (57%) |      7 (100%) |      7 (100%) |
| sparql11/property-path           |    33 |      30 (91%) |      29 (88%) |     33 (100%) |
| sparql11/subquery                |    16 |      14 (88%) |      14 (88%) |      14 (88%) |
| **evaluation total**             |   529 | **371 (70%)** | **488 (92%)** | **488 (92%)** |
| sparql10 syntax (5 dirs)         |   199 |     186 (93%) |     191 (96%) |     181 (91%) |
| sparql11 syntax (4 dirs)         |   106 |      97 (92%) |     105 (99%) |     103 (97%) |
| **syntax total**                 |   305 | **283 (93%)** | **296 (97%)** | **284 (93%)** |

Where Oxigraph or Comunica fail a test that we pass, the cause is in that engine, not in the harness:

- Oxigraph canonicalizes literals on load (`"0"^^xsd:boolean` → `"false"`, decimals), which fails the
  `cast`, `distinct`, `sameTerm` and `str` tests that check lexical forms.
- Oxigraph evaluates nested `GRAPH`, zero-length paths over terms not in the graph, and MINUS inside
  `GRAPH ?g` differently from the expected results.
- Comunica does not answer `GRAPH ?g {}`, `FROM`, or MIN/MAX over IRIs.

### Differential results (seed 1, 300 random queries per dataset)

1,003 cases: 10 `QUERIES`, 22 `PROBES`, 600 generated (300 per dataset), and 371 W3C tests.

| verdict           | cases |
| ----------------- | ----: |
| agree             |   910 |
| other-engine      |    80 |
| numeric-type-only |     9 |
| no-consensus      |     3 |
| ours-vs-consensus |     1 |

In the `other-engine` cases, the engine or engines that disagree with us and with the rest:

| dissenting engine(s) | generated / package queries | W3C tests |
| -------------------- | --------------------------: | --------: |
| Comunica             |                          23 |        10 |
| Comunica + Jena      |                          13 |         – |
| Oxigraph             |                           6 |        19 |
| Oxigraph + Comunica  |                           – |         5 |
| Jena                 |                           – |         3 |
| Oxigraph + Jena      |                           – |         1 |

Before the fixes below, the same corpus produced `ours-vs-consensus` verdicts for SUM/AVG (binary
noise, errors ignored), and the W3C half could not run at all, because ORDER BY, graph scoping and
CONSTRUCT were wrong.

How the remaining differences break down:

- **`ours-vs-consensus` (1).** An AVG over `xsd:decimal`: we return `0.530476190476191` and the
  decimal engines return `0.530476190476190476`. Double arithmetic cannot settle the 15th digit. A fix
  would need exact decimal aggregation, for example SUM over integers scaled by the decimal places.
- **`no-consensus` (3).** These are GROUP BY over `xsd:dateTime` keys. Oxigraph and we canonicalize
  `.120Z` to `.12Z`, while Jena and Comunica keep the lexical form, and the AVG is also typed
  differently, so no two engines match exactly.

- **Numeric typing only.** These are AVG/SUM over `xsd:decimal`: we return `"5"^^xsd:integer` for a
  whole result, and the others return `"5"^^xsd:decimal`. This is the known type-promotion gap (below).
- **Another engine dissents:**
  - Comunica returns no MIN/MAX over IRIs. It also keeps `.730Z` in dateTime lexical forms where
    Oxigraph and we canonicalize to `.73Z`; that is a deliberate deviation of ours, see below.
  - Jena also keeps lexical forms. It returns `GROUP_CONCAT` members in a different order, which is
    unspecified.
  - Oxigraph deduplicates `(p|p)` alternative paths. Jena, Comunica and we keep both rows, as the
    spec's UNION translation does.
  - On W3C data, the dissents are the Oxigraph and Comunica quirks listed above, plus Jena's
    `REDUCED` (it removes duplicates, which is allowed).
- **Deliberate deviation.** `xsd:dateTime` lexical forms are canonicalized on ingest (`.680Z` →
  `.68Z`), as Oxigraph does, which strictly violates RDF term identity. Matching stays consistent,
  because query constants are canonicalized the same way, but the output form differs from Jena's
  and Comunica's.

## Bugs found and fixed

Each fix is covered by [`src/conformance.test.ts`](../src/conformance.test.ts) and by the W3C tests
named.

| #   | bug                                                                                                                                                                                                                                                                                                                                                               | found by                                                                          | fix                                                                                                                                                                                                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **ORDER BY was lost on every query.** The final decode `LEFT JOIN terms` reorders a derived table's rows, so results came back in storage order.                                                                                                                                                                                                                  | `sort/*` (10), `values-order-by`, `pp14`, `pp16`, `subquery11`                    | Order keys become hidden `_oN` columns that the outer select sorts by. The inner ORDER BY is kept only under LIMIT/OFFSET.                                                                                                                                                                                                                                      |
| 2   | CONSTRUCT ignored ORDER BY, OFFSET and a trailing VALUES; ASK ignored VALUES.                                                                                                                                                                                                                                                                                     | `values-construct*`, `values-ask`                                                 | Both compile through `compileSelect` with their solution modifiers.                                                                                                                                                                                                                                                                                             |
| 3   | CONSTRUCT and INSERT reused one blank node for a template label across all solutions and updates, merging unrelated nodes.                                                                                                                                                                                                                                        | `constructlist`                                                                   | Template blank nodes are fresh per solution (and per INSERT DATA).                                                                                                                                                                                                                                                                                              |
| 4   | Sub-selects and `FILTER EXISTS` inside `GRAPH` were evaluated in the default graph.                                                                                                                                                                                                                                                                               | `subquery01–05`, `exists03`                                                       | The active graph is passed down. A sub-select in `GRAPH ?g` carries the graph as a hidden column, and GROUP BY includes it.                                                                                                                                                                                                                                     |
| 5   | `GRAPH ?g { }` (empty body, nested `GRAPH <c>`, VALUES only) returned one row with `?g` unbound. `GRAPH <missing> {}` returned a row.                                                                                                                                                                                                                             | `graph-empty`, `graph-not-exist`, `graph-nested-2/3`, `bindings/graph*`           | `?g` ranges over the named graphs when the body binds none. An empty constant graph checks that it exists.                                                                                                                                                                                                                                                      |
| 6   | MINUS inside `GRAPH ?g` treated `?g` as a shared variable, so it removed rows that shared no variable.                                                                                                                                                                                                                                                            | `graph-minus`                                                                     | The graph variable no longer counts toward MINUS's shared-domain test.                                                                                                                                                                                                                                                                                          |
| 7   | `(MIN(?x) + MAX(?x)) / 2` failed with SQLite "misuse of aggregate".                                                                                                                                                                                                                                                                                               | `agg-err-01`                                                                      | Aggregates become hidden columns of the grouped select. Projection, HAVING and ORDER BY expressions run one level up.                                                                                                                                                                                                                                           |
| 8   | SUM and AVG skipped non-numeric members instead of erroring, and returned values for groups that should be unbound.                                                                                                                                                                                                                                               | `agg-err-01`, differential                                                        | Any NULL member makes the aggregate unbound.                                                                                                                                                                                                                                                                                                                    |
| 9   | A trailing VALUES after GROUP BY was joined before grouping. Variables it binds were unbound or picked from arbitrary rows.                                                                                                                                                                                                                                       | `values-group-by-*`                                                               | It joins the grouped solutions.                                                                                                                                                                                                                                                                                                                                 |
| 10  | VALUES or BIND of a literal absent from the store gave NULL to every function over it (`VALUES ?x {"new"} FILTER(STRLEN(?x) > 1)` matched nothing).                                                                                                                                                                                                               | `agg-groupconcat-04–06`, `-distinct`                                              | Only then does a `terms` CTE shadow the table with the temp terms. The decode join always uses `main.terms`, and a SQL-pinning test keeps the CTE off other queries (see note).                                                                                                                                                                                 |
| 11  | `FROM` / `FROM NAMED` were silently ignored, so a query ran over the wrong graphs.                                                                                                                                                                                                                                                                                | `dataset/*`                                                                       | Now `UnsupportedSparqlError`.                                                                                                                                                                                                                                                                                                                                   |
| 12  | Crashes and invalid SQL: `VALUES () {()()}`, `CONCAT()`, `COALESCE()`, and a custom function with no arguments.                                                                                                                                                                                                                                                   | `values-no-vars-two-rows`, `concat-empty`, `coalesce-empty`, `syntax-function-0x` | Each compiles; an unknown function throws `UnsupportedSparqlError`.                                                                                                                                                                                                                                                                                             |
| 13  | Value semantics:<br>– `"true"^^xsd:boolean = "1"^^xsd:boolean` was false.<br>– `xsd:integer("1.5")` and `xsd:boolean("string")` returned values instead of errors.<br>– MIN/MAX ordered negative numbers backwards.<br>– Zero-length paths from a VALUES-bound variable matched terms not in the graph.<br>– SUM/AVG printed binary noise (`4.4399999999999995`). | `eq-bool`, `cast-bool`, `cast-int`, `values_and_path`, `agg-sum-01`, differential | Equality compares one combined value key (one lookup per side instead of two). Casts check the lexical space. The MIN/MAX key complements digits for negatives. The zero-length seed is filtered to graph nodes. Computed fractions are rounded to 15 significant digits (the oracle checksum and the result comparison compare numbers at the same precision). |

Note on fix 10: a first version shadowed `terms` on every query with an unknown constant. On the
deployed DO this made SQLite materialize the terms table, and LUBM and DBLP queries went from ms to
seconds. The CTE is now emitted only when a temp id is bound to a variable, and the test pins the
generated SQL.

The harness found two bugs in itself: REDUCED must compare distinct rows, and `FROM NAMED` may name
graphs rather than documents.

## Known failures, by cause

The 180 entries in `known-failures.json` group as follows. "Fallback" means the construct belongs in a
fallback engine (for example Oxigraph on the same data) rather than in a single-statement compiler.

| cause                                                                                                                                                                                                               | tests | what it would take                                                                                                                                                                   | where                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| Computed numbers carry no XSD type (integer/decimal/float/double promotion; whole AVG → integer)                                                                                                                    |    17 | Carry a type rank next to each `num` expression (a second SQL column: 0 int … 3 double), promote in arithmetic and aggregates, and emit the datatype. About a day; no hot-path cost. | compiler                         |
| `DATATYPE()` (creates an IRI term) — all of `type-promotion`, 1.0 `cast`                                                                                                                                            |    45 | A computed `iri` VType decoded from `dts`, or rewriting `DATATYPE(?x) = <dt>` into a `dt` column test. The rewrite covers all 45 tests and is cheap.                                 | compiler                         |
| String functions drop the language tag (UCASE, SUBSTR, STRBEFORE/AFTER, CONCAT)                                                                                                                                     |     9 | A `lang` companion column on `str` values.                                                                                                                                           | compiler                         |
| Other functions: hashes, UUID/STRUUID, NOW, RAND, BNODE, IRI, STRDT, STRLANG, ENCODE_FOR_URI, TZ/TIMEZONE, REPLACE, unary `+`                                                                                       |    35 | No UDFs on DO SQLite. Hashes and REPLACE need JS post-processing; NOW/RAND/UUID/STRUUID could be bound per query as constants. Term-creating functions need computed terms.          | fallback (mostly)                |
| REGEX outside the LIKE/GLOB subset (quantifiers, classes, flags `s m x q`); `.` matches newline                                                                                                                     |    15 | A JS regex post-filter, which breaks single-statement execution.                                                                                                                     | fallback                         |
| FROM / FROM NAMED                                                                                                                                                                                                   |    16 | A single FROM could map to `g = <id>`. Several need an RDF merge with duplicates removed. FROM NAMED could restrict `GRAPH ?g` to a set of ids.                                      | compiler (single FROM), fallback |
| Open-world equality: `!=` between literals not comparable by value should be a type error                                                                                                                           |     5 | One extra kind lookup per `!=` side. Rarely observable outside `!(a = b)`.                                                                                                           | compiler                         |
| `xsd:date` compares as an opaque literal (only `xsd:dateTime` has `num`)                                                                                                                                            |     2 | Give `xsd:date` a `num` on ingest.                                                                                                                                                   | store                            |
| One static SQL type per variable (mixed-type IF/COALESCE, a join of an id with a computed value)                                                                                                                    |     3 | Decode computed values to terms: compare by value, or intern.                                                                                                                        | compiler                         |
| Graph-scoping corner cases: `?g` reused inside an OPTIONAL in `GRAPH ?g`; aggregate per graph with no match; LIMIT in a sub-select inside `GRAPH ?g`; paths inside `GRAPH ?g`                                       |     7 | A per-graph window (`ROW_NUMBER() OVER (PARTITION BY g)`), graph-names LEFT JOIN, and a `g` column threaded through path CTEs.                                                       | compiler                         |
| `xsd:string()` of a non-canonical literal keeps the lexical form                                                                                                                                                    |     1 | Canonicalize booleans and numerics in `STR` casts.                                                                                                                                   | compiler                         |
| COUNT(DISTINCT *)                                                                                                                                                                                                   |     1 | `COUNT(DISTINCT <all columns>)` via a DISTINCT sub-select.                                                                                                                           | compiler                         |
| sparqljs parser: `./` `../` IRI resolution, `+5` normalized to `"5"`, `\u` escapes in IRIs                                                                                                                          |     4 | Upstream fixes, or a pre-pass on the query text.                                                                                                                                     | parser                           |
| sparqljs accepts invalid queries: blank node labels across BGPs, ungrouped projections (`skipUngroupedVariableCheck` is on because sparqljs's own check rejects valid queries such as `values-group-by-projection`) |    20 | A scope check in the compiler.                                                                                                                                                       | parser                           |

## Reproducing

```bash
moon run sparql-sqlite:test                             # W3C suites + regressions (CI)
pnpm exec tsx scripts/w3c-compare.ts                    # three-engine table
pnpm exec tsx scripts/differential.ts --seed 2          # four-engine diff (needs java ≥ 17, curl)
```

Regenerate `known-failures.json` after a fix by deleting the entries whose `test.fails` now fails.
