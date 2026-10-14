# Timeline

How DEUS evolved, one row per stage. Times are the commit times on the branch (UTC). Each
stage's duration is the real wall time since the previous stage. The first stage has no
previous commit, so its duration is not recorded.

| #   | Finished (UTC) | Since previous | Commit     | Stage                                                                                    |
| --- | -------------- | -------------- | ---------- | ---------------------------------------------------------------------------------------- |
| 1   | 10-14 09:43    | —              | `b0e907ec` | Kernel (Core CEK machine, deep multi-shot handlers) and a temporary TypeScript front-end |
| 2   | 10-14 09:49    | 6m 08s         | `94c66519` | Prelude, S-expressions, lexer and parser written in DEUS                                 |
| 3   | 10-14 09:59    | 9m 51s         | `f6a6f7b6` | Self-hosting: the seed compiles the compiler to itself; TypeScript front-end deleted     |
| 4   | 10-14 10:12    | 13m 23s        | `dbecd1f5` | Codebase CLI: add/update with propagation, view, branches, merge, run, test, check       |
| 5   | 10-14 10:26    | 14m 07s        | `ddf90c50` | Formal tactic proofs (insertion sort proved); VS Code syntax                             |
| 6   | 10-14 10:27    | 1m 07s         | `45da005f` | Replication, layers and container proposals evaluated                                    |
| 7   | 10-14 10:57    | 29m 35s        | `0d595083` | Effect-typed checker (HM + ability rows); the compiler checks itself                     |
| 8   | 10-14 10:59    | 2m 35s         | `16e1c65c` | Deterministic simulation for tests; opt-in integration tests                             |
| 9   | 10-14 11:08    | 9m 05s         | `f044360c` | Faster kernel: self-compile 13.0 s to 7.7 s                                              |
| 10  | 10-14 11:14    | 5m 50s         | `744a824f` | Terminates on truncated source and malformed images                                      |
| 11  | 10-14 11:17    | 2m 31s         | `8b82fb44` | Review fixes: lexer, parser, prelude and kernel edge cases                               |
| 12  | 10-14 11:18    | 0m 43s         | `0458784b` | Decision D34 recorded                                                                    |
| 13  | 10-14 11:22    | 4m 34s         | `fa3b4476` | Defects carry named stack traces                                                         |
| 14  | 10-14 11:26    | 4m 00s         | `559f9f4b` | Log, Trace and Metrics abilities with OTLP export                                        |
| 15  | 10-14 11:33    | 6m 41s         | `88a24b20` | Sound effect rows for rethrow; Failure context chains                                    |
| 16  | 10-14 11:45    | 11m 45s        | `d0e33d51` | `deus build`: standalone executables; the CLI builds itself                              |

Total from stage 1 to stage 16: 2h 01m.
