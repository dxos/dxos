# @dxos/sparql-sqlite — design

A SPARQL 1.1 engine for a single SQLite database. It is built for Cloudflare Durable Object SQLite
(`ctx.storage.sql`) and also runs on any synchronous SQLite behind the `SqlStorage` interface
(`node:sqlite` in tests). Each SPARQL request is parsed with `sparqljs` and compiled into **one**
SQL statement. SQLite runs every join, filter, aggregate, sort and recursive path in C, and JS only
decodes the result rows.

Why this shape, and how it compares with Comunica and Oxigraph on a deployed DO, is in
[docs/BENCHMARK.md](docs/BENCHMARK.md).

```
query:  SPARQL ─sparqljs─▶ AST ─Compiler─▶ ONE SQL stmt ─▶ SQLite: joins / filters / aggregates / CTEs
                     constants → ids (hash lookup, cached)        └─▶ LEFT JOIN terms (decode) ─▶ Row[]
ingest: quads ─encode + hash53, dedupe, key→id cache─▶ ① INSERT OR IGNORE terms … FROM json_each(?)
                                                      ② SELECT id, verify … json_each(?) LEFT JOIN terms ON h
                                                      ③ INSERT OR IGNORE quads … FROM json_each(?)
                                                      ④ ANALYZE whenever the store has doubled
```

## Modules

| file             | role                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ |
| `terms.ts`       | `Term` / `Quad` / `Row` plain-data model.                                            |
| `sql-storage.ts` | `SqlStorage`: the subset of DO `ctx.storage.sql` used (`exec` → `toArray` / `raw`).  |
| `store.ts`       | `TermStore`: schema, term encoding and interning, set-oriented insert/delete.        |
| `compiler.ts`    | `Compiler`: sparqljs AST → SQL text.                                                 |
| `engine.ts`      | `SqlSparqlEngine`: parse, plan cache, run, decode, ASK / CONSTRUCT / UPDATE.         |
| `testing/`       | `node:sqlite` adapter, deterministic data generator, query set, probes, oracle JSON. |

## Schema

```sql
CREATE TABLE terms (id INTEGER PRIMARY KEY, h INTEGER NOT NULL, kind INTEGER NOT NULL,
                    lex TEXT NOT NULL, dt INTEGER, lang TEXT, num REAL);
CREATE UNIQUE INDEX terms_h ON terms (h);
CREATE TABLE dts (id INTEGER PRIMARY KEY, iri TEXT NOT NULL UNIQUE);     -- datatype IRIs
CREATE TABLE quads (s INTEGER NOT NULL, p INTEGER NOT NULL, o INTEGER NOT NULL, g INTEGER NOT NULL,
                    PRIMARY KEY (s, p, o, g)) WITHOUT ROWID;
CREATE INDEX quads_pos ON quads (p, o, s, g);
CREATE INDEX quads_osp ON quads (o, s, p, g);
CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT);                          -- indexes, approxCount, analyzedAt, named
```

- **Interning.** One row per distinct term. `h` is a 53-bit cyrb53 hash of
  `kind ␁ dt ␁ lang ␁ lex` under a UNIQUE index. A collision fails the verify step ②, and that term
  retries with the next seed, so `h` never needs to be the identity, only a probe key.
- **`kind`** orders as SPARQL `ORDER BY` needs it: IRI 0, blank 1, string 2, lang-string 3, numeric 4,
  dateTime 5, boolean 6, other typed 7.
- **`num`** holds the numeric value, or epoch ms for `xsd:dateTime`. Numeric and date `FILTER` and
  `ORDER BY` therefore compile to plain SQL comparisons. dateTime lexical forms are canonicalized on
  ingest (`.680Z` → `.68Z`, as Oxigraph does).
- **Quads** are four ids, `WITHOUT ROWID`. The primary key is the SPOG ordering, and POSG and OSPG are
  covering indexes, so every bound-position pattern is an index range. `g = 0` is the default graph.
  `EngineOptions.indexes` can drop OSPG or add GSPO; each covering index costs about 15 B/triple.
  The default layout measured 76–78 B/triple, 5.2× smaller than pipeline-rdf's text `triples` table.
- **Ingest** sends each batch as one JSON array bound to `json_each(?)`: three statements per batch,
  whatever its size. Terms are cached JS-side (key → id, bounded at 200k entries).
- **Deletes** remove quads and leave orphan terms in place.

## Compilation

Every variable is one SQL expression of a static type. It is either a term id (`id`, decoded by a
final `LEFT JOIN terms`) or a computed `num` / `str` / `bool`. SQL NULL stands for SPARQL "unbound",
and for "error" inside expressions. SQL's three-valued AND/OR/NOT matches SPARQL's error logic, so
FILTER needs no special error handling.

| SPARQL                           | SQL                                                                                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| triple pattern                   | `quads qN`, with constants as `qN.x = <id>` and shared variables as equalities                                                                                                                  |
| BGP / group                      | inner joins in one `FROM`                                                                                                                                                                       |
| OPTIONAL                         | `LEFT JOIN`, with the OPTIONAL's FILTER in `ON` (a derived table when the body is not one pattern)                                                                                              |
| UNION                            | `UNION ALL` derived table                                                                                                                                                                       |
| MINUS, `FILTER NOT EXISTS`       | correlated `NOT EXISTS`                                                                                                                                                                         |
| sub-SELECT                       | derived table                                                                                                                                                                                   |
| variable joins under nullability | `(a IS NULL OR b IS NULL OR a = b)` plus `COALESCE` (compatible mappings)                                                                                                                       |
| GROUP BY / HAVING / aggregates   | `GROUP BY` / `HAVING`, then a derived table that the projection reads                                                                                                                           |
| MIN / MAX on terms               | `MIN` / `MAX` of a packed key (`order key ␁ id`) to keep SPARQL term order and return the id                                                                                                    |
| ORDER BY                         | keys: kind class (blank < IRI < literal), then `num`, then `lex`; carried out as hidden `_oN` columns that the outer decode select sorts by (a derived table's order does not survive the join) |
| paths `/ ^ \| !(…)`              | joins, column swap, `UNION ALL`, `p NOT IN (…)`                                                                                                                                                 |
| paths `+ * ?`                    | `WITH RECURSIVE` (set semantics), anchored on a constant or an already-bound variable                                                                                                           |
| GRAPH `<iri>` / `?g`             | `g = <id>` / `g <> 0` bound to `?g`; default-graph patterns get `g = 0` once named graphs exist                                                                                                 |
| VALUES                           | `(SELECT … FROM (VALUES …))` derived table; UNDEF is NULL                                                                                                                                       |
| REGEX                            | `LIKE … ESCAPE` (flag `i`) or `GLOB`, for the subset that maps exactly                                                                                                                          |
| constants not in the store       | negative temp ids that match nothing but still project; only when VALUES/BIND binds one to a variable does a `terms` CTE shadow the table for that statement                                    |

ASK runs the WHERE with `LIMIT 1`. CONSTRUCT and `DELETE/INSERT … WHERE` compile the WHERE as one
SELECT and instantiate their templates in JS. Compiled SQL is cached per query text, and the cache is
cleared on every write, because constant ids are resolved at compile time.

## Planner gotchas

These fail silently. A bad plan gives a 100–1000× slower answer, not a wrong one.

- **`ANALYZE` on doubling.** Without `sqlite_stat1`, SQLite started Q6 with a full `p =` scan:
  570 ms against 2.4 ms at 100k triples. `TermStore.insert` re-runs `ANALYZE` whenever the quad count
  has doubled since the last run, with a floor of 2000. DO SQLite allows `ANALYZE` and writes to
  `sqlite_stat1`, but not `PRAGMA analysis_limit`.
- **`CROSS JOIN` in recursive CTEs.** The recursive step is written
  `FROM cte CROSS JOIN quads e ON …`, which pins the CTE queue as the outer loop. Without it, Q7 took
  2 s instead of 3 ms.
- **Anchored closures.** `+` and `*` seed the CTE from a constant end, or from the current bindings of
  an already-bound variable, rather than from every node.
- **`+g = 0`.** In another variant, a constant `g = 0` made SQLite choose a full-graph scan (Q6 over
  10 minutes) until it was written `+g = 0`, which disables the index on that term. This compiler emits
  `g = 0` only once the store holds named graphs (`meta.named`). If a regression shows that plan,
  the unary `+` is the fix.

## DO SQLite constraints

- No `REGEXP` and no user-defined functions, so REGEX is limited to the LIKE/GLOB subset. `floor()`,
  `->>`, `json_each`, `WITH RECURSIVE` and window functions are available.
- At most 100 bound parameters, 100 KB of statement text and 100 columns. Values travel as one JSON
  string through `json_each(?)` instead of a parameter per value. Constants are inlined as integer ids.
- Bound strings are limited to about 2 MB. Keep ingest batches around 10k quads (about 1 MB of JSON).
- No `dbstat`, `ATTACH`, `generate_series` or stat4.
- The engine is synchronous. A DO wraps each write in `ctx.storage.transactionSync` for atomicity.

## Known gaps

Measured against the W3C test suites and three reference engines in
[docs/CONFORMANCE.md](docs/CONFORMANCE.md), which lists every known failure by cause.

- REGEX beyond literals, `.`, `.*`, `^`, `$`, escapes and one level of alternation; also REPLACE.
- Functions that create terms: `DATATYPE`, `IRI`, `BNODE`, `STRDT`, `STRLANG`, `UUID`, hash functions.
- A computed value joined against a stored term (it throws `UnsupportedSparqlError`).
- Property paths inside `GRAPH ?g`, SERVICE, DESCRIBE, and RDF-star.
- Decimal arithmetic runs in doubles; computed fractions are rounded to 15 significant digits on output.
- Computed numbers and strings carry no XSD type or language tag (see [docs/CONFORMANCE.md](docs/CONFORMANCE.md)).
- `FROM` / `FROM NAMED` throw `UnsupportedSparqlError`: the store is one dataset.
- CLEAR and DROP of a named graph, LOAD, and COPY/MOVE/ADD.
- No GC of orphan terms after deletes.
- Fan-out joins rely on SQLite's nested loops only. Q6 takes 0.6 s at 1M triples. A
  DISTINCT/semi-join pushdown pass would roughly halve it.
