# Timeline

How DEUS evolved, one row per stage (a commit). Times are commit times on the branch. Each
stage's duration is the real wall time since the previous stage; the first has no previous
stage. The table is regenerated from `git log` with every commit.

| #   | Finished    | Since previous | Commit      | Stage                                                                                       |
| --- | ----------- | -------------- | ----------- | ------------------------------------------------------------------------------------------- |
| 1   | 10-14 09:43 | —              | `b0e907ec`  | kernel (Core CEK machine with deep multi-shot handlers) and stage0 bootstrap front-end      |
| 2   | 10-14 09:49 | 6m 08s         | `94c66519`  | prelude, sexp, lexer and parser written in DEUS                                             |
| 3   | 10-14 09:59 | 9m 51s         | `f6a6f7b6`  | self-hosting DEUS toolchain; seed reproduces itself, stage0 removed                         |
| 4   | 10-14 10:12 | 13m 23s        | `dbecd1f5`  | codebase CLI in DEUS — add/update with propagation, view, branches, merge, run, test, check |
| 5   | 10-14 10:26 | 14m 07s        | `ddf90c50`  | formal tactic proofs (insertion sort proved), VS Code syntax, commit the seed               |
| 6   | 10-14 10:27 | 1m 07s         | `45da005f`  | evaluate replication, layers and container proposals                                        |
| 7   | 10-14 10:57 | 29m 35s        | `0d595083`  | effect-typed checker (HM + row-polymorphic abilities); the compiler checks itself           |
| 8   | 10-14 10:59 | 2m 35s         | `16e1c65c`  | deterministic simulation for tests (in-memory IO, seeded Random); opt-in integration tests  |
| 9   | 10-14 11:08 | 9m 05s         | `f044360c`  | faster kernel (monomorphic nodes, frame-free quick terms) and hash-map primitives           |
| 10  | 10-14 11:14 | 5m 50s         | `744a824f`  | terminate on truncated source and malformed images                                          |
| 11  | 10-14 11:17 | 2m 31s         | `8b82fb44`  | fix lexer, parser, prelude and kernel edge cases                                            |
| 12  | 10-14 11:18 | 0m 43s         | `0458784b`  | record D34 (robustness against hostile input)                                               |
| 13  | 10-14 11:22 | 4m 34s         | `fa3b4476`  | name the definitions a defect passed through                                                |
| 14  | 10-14 11:26 | 4m 00s         | `559f9f4b`  | Log, Trace and Metrics abilities with OTLP export                                           |
| 15  | 10-14 11:33 | 6m 41s         | `88a24b20`  | sound effect rows for rethrow; Failure context chains                                       |
| 16  | 10-14 11:45 | 11m 45s        | `d0e33d51`  | `deus build` writes a standalone executable                                                 |
| 17  | 10-14 11:55 | 10m 25s        | `fc077d42`  | JIT-compile handler-free lambdas to JavaScript                                              |
| 18  | 10-14 11:58 | 3m 14s         | `beb703a9`  | charge JIT deoptimizations to the innermost call                                            |
| 19  | 10-14 11:59 | 0m 52s         | `3052ae66`  | sort JIT imports                                                                            |
| 20  | 10-14 12:03 | 3m 38s         | `6dd9c38d`  | work the agentic review; enforce the step budget under the JIT                              |
| 21  | 10-14 12:15 | 11m 49s        | `a59e6eb3`  | deus-kernel: the DEUS kernel in Rust, byte-identical to the TypeScript one                  |
| 22  | 10-14 12:28 | 13m 26s        | `73d4429d`  | deus-kernel: wasm32-wasip1 build reproduces the seed under Node's WASI                      |
| 23  | 10-14 13:05 | 37m 06s        | `5a64f053`  | deus-kernel: embeddable kernel with suspend/resume; deus build --native; JIT backoff        |
| 24  | 10-14 13:22 | 17m 09s        | `d04c0e0c`  | Cloudflare target — a DEUS actor served by a Durable Object                                 |
| 25  | 10-14 13:34 | 11m 53s        | `082c450c`  | MDL extensions as DEUS definitions; perf requirements in machine steps                      |
| 26  | 10-14 13:48 | 13m 31s        | `bd139e99`  | external requirements and containers as pinned data and abilities                           |
| 27  | 10-14 13:54 | 6m 39s         | `28abe17e`  | codebase layers — spec objects, results, provenance                                         |
| 28  | 10-14 13:57 | 2m 59s         | `65420c8e`  | projects — IRI identity, pinned libraries, inferred subgraphs                               |
| 29  | 10-14 14:05 | 8m 13s         | `bb45ea74`  | replication — immutable bundles on R2, concurrent heads, sedimentree compaction             |
| 30  | 10-14 14:12 | 6m 42s         | `e1a252f4`  | wasm compiler for first-order code, written in DEUS                                         |
| 31  | 10-14 14:26 | 13m 32s        | `aaf0728a`  | perf — profiling by definition, fewer allocations, memoized dependencies                    |
| 32  | 10-14 14:26 | 0m 33s         | `46dff492`  | README and LLM guide cover projects, specs, replication and wasm                            |
| 33  | 10-14 14:30 | 4m 06s         | `cb7fd584`  | Durable Objects — actor calls, alarms, multi-object simulation                              |
| 34  | 10-14 14:35 | 4m 49s         | `75b49f19`  | artifacts layer caches builds; operators get types                                          |
| 35  | 10-14 14:39 | 4m 02s         | this commit | replication: retention GC with shallow history                                              |

Total from stage 1 to stage 35: 4h 56m.
