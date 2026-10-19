# Bundle size

What `@dxos/sparql-sqlite` costs a Worker or a browser app, where the bytes go, and what was done about it.

**Summary.** The public entry bundles to **38,350 B gzip** (130,755 B minified), down from 41,855 B (−8.4%).
The bench Worker uploads **44.0 KiB gzip**, down from 62.9 KiB (−30%), most of it from turning on minification.
Two thirds of the package is sparqljs's generated Jison parser, and nothing smaller can replace it today
without writing a parser. The change imports that parser on its own, without the sparqljs entry's SPARQL
generator and `rdf-data-factory`. Tests, conformance and deployed query times are unchanged.

## Method

`node scripts/size.mjs` (also `moon run sparql-sqlite:size`) bundles `src/index.ts` the way a Worker or Vite
app would: esbuild, minified, ESM, `platform: browser`, tree-shaken, every dependency inlined, workspace
packages from source. It prints raw, gzip (level 9) and brotli (quality 11) bytes and, from the esbuild
metafile, the minified bytes each module contributes. `--json <file>` writes the report and `--max-gzip <bytes>`
fails over budget. `src/size.test.ts` runs the same bundle in CI and fails above 40,000 B gzip, about 4% over the
current size and below the baseline.

The Worker number is wrangler's own `Total Upload` from `wrangler deploy --dry-run --outdir <dir>` in `bench/`.
It includes the bench's routes, the data generator and the query set from `src/testing/`.

## Baseline

Package entry, before:

| raw (B) | gzip (B) | brotli (B) |
| ------: | -------: | ---------: |
| 143,096 |   41,855 |     35,341 |

Minified bytes per module, before compression:

| module                                        | KB minified | share |
| --------------------------------------------- | ----------: | ----: |
| `sparqljs/lib/SparqlParser.js` (Jison output) |        82.6 | 59.4% |
| `src/compiler.ts`                             |        27.7 | 19.9% |
| `sparqljs/lib/SparqlGenerator.js`             |         8.6 |  6.2% |
| `src/store.ts`                                |         6.8 |  4.9% |
| `src/engine.ts`                               |         6.7 |  4.8% |
| `rdf-data-factory` (6 files)                  |         3.8 |  2.7% |
| `@dxos/errors`, `@dxos/invariant`             |         1.3 |  0.9% |
| `sparqljs/sparql.js`, `Wildcard.js`           |         0.8 |  0.6% |
| `src/errors.ts`, `terms.ts`, `sql-storage.ts` |         0.7 |  0.5% |

Gzip of each half bundled on its own: the sparqljs entry is 26,863 B, of which the parser file alone is
22,744 B; our own code with sparqljs external is 15,036 B.

The generator and `rdf-data-factory` are there only because sparqljs is CommonJS: its entry `require`s the
generator, and esbuild cannot drop an unused `module.exports` member.

Inside `SparqlParser.js` (unminified source, gzip of each part):

| part                                          |  bytes |  gzip |
| --------------------------------------------- | -----: | ----: |
| LALR `table` and its shared row arrays        | 43,074 | 7,492 |
| `performAction` (grammar actions)             | 18,123 | 4,438 |
| helpers (IRI resolution, validation, escapes) | 15,314 | 4,550 |
| lexer (driver and 126 rules)                  | 21,157 | 4,599 |
| `symbols_`, `terminals_`, `productions_`      | 12,490 | 4,333 |
| parse driver                                  |  5,437 | 1,538 |

Bench Worker, before: **285.39 KiB / 62.85 KiB gzip** as deployed (wrangler does not minify by default),
157.31 / 47.54 KiB with `--minify`. Wrangler reported a startup time of 11 ms.

## Options

Each option was measured against the same baseline. Gzip deltas are for the package entry.

| option                                                   |                     gzip (B) |               Δ | status            |
| -------------------------------------------------------- | ---------------------------: | --------------: | ----------------- |
| baseline                                                 |                       41,855 |                 |                   |
| own code: unused exports, duplicated `quoteName`         |                              | −7 (final tree) | done (hygiene)    |
| parser alone + minimal term factory                      |                       38,350 |          −3,505 | **implemented**   |
| `@traqula/parser-sparql-1-1` 1.5.0-alpha.0 (parser only) |                      ~86,000 |         +44,000 | rejected          |
| lazy parser chunk                                        | 14,996 initial + 22,940 lazy |      +530 total | not implemented   |
| split off property paths                                 |                              |          −1,140 | not worth it      |
| split off aggregates                                     |                              |            −462 | not worth it      |
| split off UPDATE                                         |                              |            −434 | not worth it      |
| split off CONSTRUCT                                      |                              |             −73 | not worth it      |
| all four together                                        |                              |          −2,219 | below the 10% bar |

**Parser alone (implemented).** `src/parser.ts` imports `sparqljs/lib/SparqlParser.js`, the generated Jison
parser. sparqljs has no `exports` map, so the deep import resolves in Node, Vite, esbuild and wrangler alike.
`parser.ts` sets the per-parse statics that the sparqljs `Parser` wrapper sets (`base`, `prefixes`, `factory`,
`sparqlStar`, `pathOnly`, `skipValidation`) and supplies a term factory of plain objects with the RDF/JS
`equals`, about 1 KB minified, in place of `rdf-data-factory`. `src/sparqljs-parser.d.ts` types the deep
module, because `@types/sparqljs` types only the entry. A local check over the package's query set gave
identical ASTs and the same parse time (460–550 µs per query either way, within run-to-run noise).

**Traqula (rejected).** Comunica 5's parser bundles to 252,263 B minified and 71,072 B gzip on its own,
2.6 times sparqljs, since it carries a Chevrotain fork. Its AST also differs from sparqljs's, so the compiler and
engine would need porting. `ll-sparql-parser` (0.17) is a WASM CST parser for editors (566 KB unpacked).
No other maintained SPARQL 1.1 parser for JS turned up.

**Lazy parser chunk (not implemented).** With the parser behind a dynamic `import()`, esbuild splits the
package into a 14,996 B initial chunk and a 22,940 B parser chunk, 530 B more in total. A Worker uploads and
evaluates every chunk at startup, so a DO gains nothing. A browser could defer 23 KB, but `query()` is
synchronous, so the API would need an `await engine.ready()` first.

**Separable features (not done).** Stubbing out each feature's compiler and engine code and re-bundling gives
the savings in the table. Even together they come to 5.3% of the package, below the 10% bar, and the parser
would still parse all of them, since its grammar cannot be split.

**Our own code.** The compiler is dense and has no duplicated subsystems worth merging. The one helper defined
twice, `quoteName`, now lives in `compiler.ts` only, and the two unused exports were removed. Both are hygiene:
esbuild had already tree-shaken the exports, and the duplicate was one line.

## Result

| bundle                                    |         before |              after |
| ----------------------------------------- | -------------: | -----------------: |
| package entry, minified (B)               |        143,096 |            130,755 |
| package entry, gzip (B)                   |         41,855 |         **38,350** |
| package entry, brotli (B)                 |         35,341 |             32,188 |
| bench Worker as deployed (KiB / KiB gzip) | 285.39 / 62.85 | **144.96 / 44.02** |
| bench Worker, both minified               | 157.31 / 47.54 |     144.96 / 44.02 |
| bench Worker unminified                   | 285.39 / 62.85 |     258.28 / 57.50 |
| wrangler startup time                     |          11 ms |               7 ms |

`bench/wrangler.jsonc` now sets `"minify": true`. A consumer's own Worker should do the same: it is worth more
than everything done to the package.

Package entry, after:

| module                         | KB minified | share |
| ------------------------------ | ----------: | ----: |
| `sparqljs/lib/SparqlParser.js` |        82.6 | 65.0% |
| `src/compiler.ts`              |        27.7 | 21.8% |
| `src/store.ts`                 |         6.8 |  5.4% |
| `src/engine.ts`                |         6.6 |  5.2% |
| `src/parser.ts`                |         1.0 |  0.8% |
| everything else                |         2.4 |  1.8% |

### Performance check

Deployed to `rdf-bench-sql-compiler` (baseline version `cf47676c`, new version `42586bfb`; the final code, which only moves `quoteName`, is `a5be34a2`) and run with
`bench/run.mjs --scales 1000,10000 --probes`. Both deploys pass all 22 probes and return the oracle's rows
and checksum for every query. Server ms at 10k facts (about 100k triples), the slope method of
[BENCHMARK.md](BENCHMARK.md):

| query        | before | after | first run before | first run after |
| ------------ | -----: | ----: | ---------------: | --------------: |
| Q1_lookup    |    0.0 |   1.2 |             57.4 |            40.8 |
| Q2_entity    |    1.3 |   0.7 |             45.9 |            44.4 |
| Q3_filtered  |    1.2 |   0.4 |             58.1 |            48.2 |
| Q4_asof      |    0.2 |   0.7 |             47.9 |            48.7 |
| Q5_aggregate |    0.8 |   1.1 |             45.0 |            45.0 |
| Q6_join      |    2.0 |   2.0 |             48.5 |            54.0 |
| Q8_text      |    2.4 |   1.9 |             52.4 |            45.3 |
| Q9_optional  |    0.0 |   0.0 |             60.3 |            41.4 |
| Q10_count    |    0.0 |   0.3 |             44.4 |            41.8 |

Every difference is within the ±1–3 ms noise of sub-millisecond slopes. The hot path, compiled SQL from the
plan cache, does not touch the parser. Cold start (abort, then Q1) read 259 ms before and 318 ms after. Six
more samples after the change read 252–537 ms (median about 300 ms), so the single readings are not
distinguishable.

## Further ideas

| idea                                                              | estimated gzip saving | cost                                                                                                                                                  |
| ----------------------------------------------------------------- | --------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hand-written recursive-descent parser emitting the sparqljs AST   |     13–15 KB (35–40%) | 1,500–2,000 lines. The vendored W3C syntax tests already cover acceptance and rejection. Also removes a dependency that npm marks deprecated (below). |
| Regenerate the Jison grammar without UPDATE or SPARQL-star        |                2–4 KB | Needs a forked grammar and the `jison` toolchain; updates would need a second parser.                                                                 |
| Strip Jison's error-message tables (`terminals_`, `productions_`) |                 ~1 KB | Post-processing generated code; worse syntax errors.                                                                                                  |
| Shorter SQL fragments and private method names in the compiler    |                < 1 KB | Hurts readability; esbuild does not mangle `#private` or public method names.                                                                         |

**sparqljs is deprecated on npm.** `npm view sparqljs@3.7.4 deprecated` answers "Package no longer
supported". Comunica has moved to Traqula. That is a maintenance risk rather than a size one, and it favours
the hand-written parser over adopting Traqula.
