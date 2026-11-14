# CI testing — gating, test ontology and result tracking

Discussion notes for moving PR gating to fast tests only and making flakiness visible. Status: draft
for discussion; nothing here is implemented yet.

## Test ontology

Every check and test in dxos and edge, ordered from fast and stable to slow and expensive. The
inventory is from the repos as of 2026-11-14. The cost and flake columns are filled from CI data
(nightly and merge-queue JUnit reports, job timings); "pending" means that data is still being
collected. When and where each tier runs is decided separately (see [Run policy](#run-policy)).

### T0 — Static checks (no build)

| Kind                                                                                                                                                                                             | Repo | What it covers                        | Scope      | Runs today                                | Blocks today | Cost    | Flake   |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--- | :------------------------------------ | :--------- | :---------------------------------------- | :----------- | :------ | :------ |
| Repo scripts (13): format, import cycles, publish config, changesets, spec changelog and decisions, version sync, cache wiring, `pkg-lint`, public deps, QA coverage, peer deps, package exports | dxos | Repo hygiene                          | Whole repo | `check` stage 1, on every PR, MQ, nightly | Yes          | pending | pending |
| Format, cache wiring, dev-stack config, `check:bindings` (wrangler binding parity), hub styles                                                                                                   | edge | Repo hygiene, Cloudflare config drift | Whole repo | `lint` job                                | Yes          | pending | pending |

### T1 — Compile and whole-repo analysis

| Kind                                                            | Repo | What it covers                                | Scope                    | Runs today                        | Blocks today                | Cost    | Flake   |
| :-------------------------------------------------------------- | :--- | :-------------------------------------------- | :----------------------- | :-------------------------------- | :-------------------------- | :------ | :------ |
| Lint (oxlint), build (tsc), type tests (tstyche, 8 files)       | dxos | Types and lint rules                          | Affected                 | `check` stage 2                   | Yes                         | pending | pending |
| Module structure, edge-release (plugin bundle loads in workerd) | dxos | Import bans, bundle loads                     | Affected                 | `check` stage 2                   | Yes                         | pending | pending |
| knip, plugin-set check, docs bundle (link check)                | dxos | Dead code, plugin wiring, docs                | Whole repo, never scoped | `check` stage 3                   | Yes                         | pending | pending |
| Boot budget                                                     | dxos | Static boot-graph size of the Composer bundle | Whole repo               | `boot-budget` job, PR and nightly | Fails its job, not required | pending | pending |
| Lint, build, Solid typecheck, `watch_dir` sync, bundle budgets  | edge | Types, worker bundle sizes                    | All                      | `lint`, `build` jobs              | Yes                         | pending | pending |

### T2 — Unit tests (node, no external state)

| Kind         | Repo | Size                                                                                                            | Runner             | Runs today            | Blocks today | Cost    | Flake   |
| :----------- | :--- | :-------------------------------------------------------------------------------------------------------------- | :----------------- | :-------------------- | :----------- | :------ | :------ |
| Node unit    | dxos | ~1,900 files (the ~76% of 2,499 node test files that start no stack); `common/*` and `ui/*` are almost all unit | vitest `node`      | `test-node`, every PR | Yes          | pending | pending |
| Node unit    | edge | 188 files, 32 packages (+3 in edge)                                                                             | vitest `node`      | `test-packages`       | Yes          | pending | pending |
| Script tests | edge | 4 `node --test`, 4 `bun test`, 1 cargo                                                                          | node / bun / cargo | **none**              | —            | —       | —       |

### T3 — Local runtime tests (workerd, D1, Miniflare)

| Kind                         | Repo | Size                                               | Runner                        | Runs today      | Blocks today | Cost    | Flake   |
| :--------------------------- | :--- | :------------------------------------------------- | :---------------------------- | :-------------- | :----------- | :------ | :------ |
| Workerd                      | dxos | 28 files, 23 packages                              | vitest-pool-workers           | `test-node`     | Yes          | pending | pending |
| Workerd                      | edge | 108 files, 17 packages (db-service 27, router 17)  | vitest-pool-workers           | `test-packages` | Yes          | pending | pending |
| D1                           | edge | 18 files, hub-service                              | vitest-pool-workers `node-d1` | `test-packages` | Yes          | pending | pending |
| Hand-built Miniflare in node | edge | mcp-space-service, sandbox-service, worker-bundler | vitest `node`                 | `test-packages` | Yes          | pending | pending |

### T4 — Integration tests (in-process stack)

| Kind             | Repo | Size                                                                                                            | What it starts                                                                         | Runs today            | Blocks today | Cost    | Flake   |
| :--------------- | :--- | :-------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- | :-------------------- | :----------- | :------ | :------ |
| Node integration | dxos | ~600 files (~24% of node tests); concentrated in `core/echo`, `sdk/client*`, `*-e2e` packages, AI/agent plugins | Full client stack, several peers, sqlite, child processes; 161 files use real timers   | `test-node`           | Yes          | pending | pending |
| Edge harness     | edge | 90 files in `edge:test`                                                                                         | Whole edge worker plus ~13 services in Miniflare, fakes for Discord, Google, mail, RSS | `test-edge`, 4 shards | Yes          | pending | pending |
| Memory and leak  | dxos | 2 files, echo-client-e2e                                                                                        | `--expose-gc`, `DX_DEBUG_LEAKS`                                                        | `advisory` job        | No           | pending | pending |

### T5 — Browser tests (headless Chromium)

| Kind                                  | Repo | Size                                                                                                 | Runner                    | Runs today                   | Blocks today | Cost    | Flake   |
| :------------------------------------ | :--- | :--------------------------------------------------------------------------------------------------- | :------------------------ | :--------------------------- | :----------- | :------ | :------ |
| Browser unit/integration              | dxos | 35 `*.browser.test` files, plus every plain `*.test.ts` again in the 15 packages that enable browser | vitest browser mode       | `test-browser`, ready PR, MQ | Yes          | pending | pending |
| Storybook interaction (UI in browser) | dxos | 835 story files, ~2,844 stories, 136 packages                                                        | `@storybook/addon-vitest` | `test-browser`               | Yes          | pending | pending |

### T6 — Model-fixture tests (recorded LLM replay)

| Kind                        | Repo | Size                                       | Fixtures                                               | Runs today                      | Blocks today | Cost    | Flake   |
| :-------------------------- | :--- | :----------------------------------------- | :----------------------------------------------------- | :------------------------------ | :----------- | :------ | :------ |
| Model fixture               | dxos | 15 files, 8 packages (tag `model-fixture`) | `.store/`, 469 recordings                              | `advisory` job                  | No           | pending | pending |
| Edge harness with fixtures  | edge | 7 files in `edge:test`                     | `.store/conversations`, 484 recordings                 | `test-edge`                     | Yes          | pending | pending |
| Discord agent with fixtures | edge | 6 files                                    | Recordings plus plugin bundles from R2 or a dxos build | `test-discord-agent` (no Trunk) | Yes          | pending | pending |

### T7 — End-to-end tests (real app, live EDGE preview)

| Kind                 | Repo | Size                                           | Depends on                                                              | Runs today                                   | Blocks today | Cost    | Flake   |
| :------------------- | :--- | :--------------------------------------------- | :---------------------------------------------------------------------- | :------------------------------------------- | :----------- | :------ | :------ |
| Composer e2e         | dxos | 17 specs, ~79 tests × 3 browsers               | `vite preview` bundle, EDGE preview                                     | `e2e-composer`, ready PR, main push, nightly | No           | pending | pending |
| Other Playwright e2e | dxos | The other 9 `e2e`-tagged packages × 3 browsers | Storybook server or app bundle                                          | `e2e-rest`                                   | No           | pending | pending |
| Deployed edge e2e    | edge | 5 files                                        | preview.dxos.network after deploy, admin key, real LLM via the AI proxy | `deploy-main` `e2e`, after merge             | No           | pending | pending |
| CLI packaging smoke  | dxos | 1 task                                         | npm pack and install                                                    | `cli`, `cli-foreign`                         | No           | pending | pending |

### T8 — Scripted model tests and evals (live LLM)

| Kind           | Repo | Size                            | Depends on                             | Runs today                           | Blocks today | Cost    | Flake   |
| :------------- | :--- | :------------------------------ | :------------------------------------- | :----------------------------------- | :----------- | :------ | :------ |
| Agent evals    | dxos | 20 `*.eval.ts`, assistant-evals | Anthropic key, MCP on preview/dev/prod | `assistant-evals.yml`, nightly 03:00 | No           | pending | pending |
| Live storybook | dxos | stories-assistant               | Claude Agent SDK                       | none (`runInCI: false`)              | —            | —       | —       |

### T9 — Live service tests (EDGE, third parties, deployments)

| Kind                            | Repo | Size                                           | Depends on                                                               | Runs today                             | Blocks today |
| :------------------------------ | :--- | :--------------------------------------------- | :----------------------------------------------------------------------- | :------------------------------------- | :----------- |
| Sync canary                     | dxos | 4 `sync-e2e` files; only the Gmail canary runs | Gmail, EDGE, R2 fixtures                                                 | `mail-canary-nightly.yml`, or PR label | No           |
| `sync`, `functions-e2e`         | dxos | 2 + 7 files                                    | EDGE, deploys to Cloudflare                                              | none                                   | —            |
| `manual`                        | dxos | 46 files                                       | Ollama, LM Studio, local services                                        | none                                   | —            |
| Edge live, stress, load         | edge | ~12 files, 7 packages                          | Deployed dev/preview, Workers AI, Claude CLI, DeepSeek, third-party APIs | none (opt-in env vars)                 | —            |
| Blade-runner join latency, soak | dxos | 2 jobs                                         | EDGE preview                                                             | `edge-nightly.yml`, 02:00              | No           |
| Plugins mode                    | edge | the `edge:test` suite with plugin routing      | Plugin bundles                                                           | `plugins-mode.yml`, manual only        | No           |

### T10 — Performance and benchmarks

| Kind                   | Repo | Size                                                        | Runs today                      |
| :--------------------- | :--- | :---------------------------------------------------------- | :------------------------------ |
| Benchmarks             | dxos | 13 `*.bench.ts` in 5 packages                               | `perf-nightly.yml` (echo-bench) |
| Perf harness, counters | dxos | `pnpm perf`, `e2e-perf` tasks, chat bench                   | `perf-nightly.yml`, 04:00       |
| Startup budget, stress | dxos | `check-startup-budget`, `e2e-stress`, `stories-brain:bench` | manual only                     |

### Tests that nothing runs

- **dxos:** 13 browser test files in 6 packages and 87 story files in 25 packages lack the moon tag
  that would run them. Spec files in testbench-app, sdk/examples and devtools-extension have no task.
  No workflow runs `:test-native` (the Rust tests). `plugin-projects` has model-fixture tests but not
  the moon tag, so they never replay.
- **edge:** about 25 `plugin-*.node.test.ts` suites skip in `test-edge` because that job loads no
  plugin bundles (inferred from the job's environment, to confirm in a CI log). The script, bun and
  cargo tests are not run by any workflow.
- **Skips:** dxos has 153 `.skip` (react-ui-table 27, composer-e2e 16, client-services 9) and 59
  `!test` stories; edge has 60 `.skip`/`skipIf` in edge itself. None carries a reason a tool can
  read. The `flaky` tag is declared in `vitest.tags.ts` and used by no test.

## Run policy

Two labels per test, independent of its tier. Both live in code, so a PR shows any change to them.

**Blocking or non-blocking** decides _when_ a test runs:

- **PR and merge queue** run blocking tests only.
- **Nightly** runs everything, blocking and non-blocking, on `main`, with no affected scoping and no
  cache.
- **On demand**, a PR can run the full nightly suite: a `workflow_dispatch` of Check on the PR branch
  with a `full` option (its check runs land on the head commit, so they show on the PR), or a label
  that triggers a separate workflow with its own check names. Not a `labeled` trigger on Check
  itself: that run posts skipped check runs over the PR's real results, and branch protection reads
  skipped as passing (`check.yml:9-11`).

**Stable or flaky** decides whether a failure _counts_:

- A flaky test still runs wherever its blocking label says, and its result is still recorded, but
  its failure does not fail CI.
- The flaky mark is in code, with an owner and a linked issue:
  - vitest (dxos and edge): `tags: ['flaky']`. dxos already declares the tag; edge needs it added
    to `vitest.shared.ts`. CI runs the suite twice: `--tagsFilter='!flaky'` must pass, and
    `--tagsFilter=flaky` runs with its failures reported but not failing the job.
  - Storybook: a `flaky` story tag, filtered the same way.
  - Playwright: a `@flaky` tag, with `--grep-invert @flaky` for the run that must pass and
    `--grep @flaky` for the reported run.
- The results store shows each flaky test's failure rate, so the mark can be removed once a test
  has passed for a set number of nightly runs, and a test that keeps failing becomes a fix or a
  delete.
- This replaces Trunk's dashboard quarantine.

Which tiers are blocking is still to decide from the cost and flake data. The current direction is
T0, T1 and T2 blocking, everything else nightly.

## Problems

- PRs are gated on many tests that are slow, costly to run, and flaky.
- Direction: move more tests off PRs into nightly jobs. PRs keep only unit tests (plus check:
  lint, build, types).
- We have no ontology of tests: what tier a test is, and what CI does with it.
- A test can be blocking or non-blocking, but that is not recorded anywhere a reviewer can see.
- Trunk's quarantine and stats are hard to see and hard to trust.

## What Trunk does for us today

Every test step runs inside `trunk-io/analytics-uploader@v1` with `quarantine: true`
(`.github/actions/vitest/action.yml`, the `e2e-composer` and `e2e-rest` jobs in `check.yml`, and
edge's `check.yml` and `deploy-main.yml`). The uploader runs the moon command, uploads the JUnit, asks
Trunk which failures are quarantined, and rewrites the exit code to 0 if all failures are. From the
nightly run of 2026-11-13, `test node (1/4)`:

```
Total: 4975   Pass: 4974   Fail: 1   Quarantined: 0   Pass Ratio: 100.0%
❌ 1 test failed and was not quarantined
⚠️  Some test failures were not quarantined, using exit code: 1
```

So Trunk does three things:

1. **Exit-code override** for quarantined tests. Quarantined tests still run and still cost CI time.
   `REPOSITORY_GUIDE.md` and the `trunk-quarantine` skill say they are "auto-skipped", which is wrong.
2. **Flake detection and history.** It is the only per-test history for node and browser tests.
3. **An MCP server** (`investigate-ci-failure`, `search-test`, `fix-flaky-test`). It is read-only and
   cannot quarantine.

### Why the stats and quarantine are hard to see

- **Quarantine lives only in Trunk's dashboard.** It is admin-gated, and git has no record of it. No
  PR shows what was quarantined, by whom, or why. A manual "Always" quarantine never expires.
- **Whether auto-quarantine (and auto-release) is on is unknown.** It is a dashboard setting; nothing
  in either repo shows it.
- **Cached results are probably counted as new runs.** `/test-results/$project/node/**` is an output
  of the moon `test` task (`.moon/tasks/tag-ts-test.yml`), so a cache hit restores the old
  `results.xml` and the uploader sends it again. In the nightly run above, 472 of 559 tasks came from
  cache. Unless Trunk removes duplicates, this inflates pass ratios. Not yet verified in Trunk.
- **Skipped tests are reported as passes.** `e2e rest (webkit 1/2)` ran 57 Playwright tests, 18 of
  them skipped, and Trunk printed `Total: 57 Pass: 57`.
- **Flake detection has little to work with.** CI never retries, so a flake shows only as different
  results for the same commit across runs. The `flaky` vitest tag that CI opts in to is used by no
  test; instead there are about 145 `.skip` calls and 59 `!test` stories with no record of why.
- **dxos and edge share one Trunk org.** edge keeps `plugins-mode` out of Trunk on purpose so its
  known failures don't read as flakes, which shows how easily the data is polluted.

### Gating today

- Required for merge: `check` and `test` (node, plus browser and storybook once a PR is ready).
- `e2e` reports results but does not block merges.
- Nightly is unreliable: of the last 5 scheduled Check runs, 1 succeeded, 1 failed, 3 were cancelled.

## Results store: PostHog

PostHog is the default because the infrastructure already exists: `scripts/ci-event.mjs` sends
events without person profiles, and `packages/e2e/composer-e2e` already publishes one event per e2e
test to the `Composer` project (126171, eu) for the nightly dashboard (`DASHBOARD.md`).

### Event shape

One event per test file, plus one event per failed or skipped test:

- **File event:** file, package, tier, tags filter, passed / skipped / failed counts, duration, and
  the 3 slowest tests with their durations.
- **Failed or skipped test event:** test id, file, status, error message (failed only).
- **Envelope** (from `ci-event.mjs`): commit, branch, run id, trigger, job, shard.

A passing file implies each of its non-skipped tests passed, so the pair gives a per-test flake rate
(failures of a test ÷ runs of its file) without a row for every passing test. A run whose counts
differ from the usual (a different `--tagsFilter`, `-t`, or new `.skip`) is a different population.

Only files whose moon task actually executed are sent. Cache replays are dropped, using moon's
task status (JUnit does not know a result came from cache). Skipped-test events are sent from the
nightly run only, since skips are mostly the same every run.

### Volume and cost

| Input                                        | Value                              |
| :------------------------------------------- | :--------------------------------- |
| dxos test files / stories / Playwright specs | 2,556 / 829 / 47 (× 3 browsers)    |
| edge test files                              | 428                                |
| Events per full dxos run                     | ~4k                                |
| Check runs                                   | ~200 per weekday, ~4,500 per month |

| Option                                                     | Events/month | Cost/month   |
| :--------------------------------------------------------- | :----------- | :----------- |
| Nightly full run only                                      | ~0.1M        | $0           |
| **Every run, executed files only, skips nightly (chosen)** | **~2–3.5M**  | **~$50–120** |
| Every run, every file row including cache replays          | ~7M          | ~$230        |
| Every run treated as a full run (worst case)               | ~18M         | ~$600        |

Prices assume PostHog's tiers for events without person profiles: first 1M free, $50 per 1M up to
2M, $34.30 per 1M up to 15M. The `Composer` project shares its free 1M with product analytics, so
expect the top of the range. The share of a PR run that actually executes (10–20% assumed) should be
measured from a week of moon task summaries before relying on these numbers.

For comparison: one event per test for every result Trunk ingests today would be ~65M events a
month, about $1,800–2,000.

## Alternative: Cloudflare Basin on R2

Cloudflare Basin (formerly Pipelines, R2 Data Catalog and R2 SQL) is a cheap alternative if PostHog
volume becomes a problem, or if we want to send **every test as a separate event**, for example to
track the duration of each test rather than only the 3 slowest per file. Not needed now.

How it works: CI sends events to a Pipeline HTTP endpoint, the Pipeline writes an Iceberg table
into R2, and Basin SQL queries it.

| Item                              | Rate                              | ~3.5 GB/month | ~18 GB/month    |
| :-------------------------------- | :-------------------------------- | :------------ | :-------------- |
| Pipeline ingest                   | free                              | $0            | $0              |
| Pipeline delivery to R2           | 50 GB free, then ~$0.06/GB        | $0            | $0              |
| R2 storage                        | 10 GB free, then $0.015/GB-month  | $0            | $0, then ~$0.15 |
| Catalog operations and compaction | 1M operations, 10 GB free         | $0            | $0              |
| Basin SQL                         | 10 GB scanned free, then $2.50/TB | ~$0–5         | ~$5             |

Per-test events at today's Trunk volume (~65M a month, ~65 GB raw, a few GB as Parquet) would still
cost roughly $5–15 a month.

Trade-offs against PostHog:

- **For:** about 10× cheaper or more; open Iceberg/Parquet files in our own bucket; retention is ours
  to set; same Cloudflare account and tooling as edge.
- **Against:** no dashboards or alerts. We would build a page (a Worker plus a Composer view over
  Basin SQL) or link the bucket into PostHog's data warehouse (not yet checked how PostHog bills
  linked tables). The ingest needs a new token in CI secrets.

Smaller Cloudflare options: Workers Analytics Engine (free at this volume, but 3-month retention,
sampling, no joins) and D1 (free at this volume, but a 10 GB database limit).

Prices are from Cloudflare's May 2026 pricing changelog and rate pages; check the official pricing
pages before committing.

## Open questions

1. Is Trunk auto-quarantine on, and which tests have a manual "Always" quarantine? Needs a Trunk
   admin.
2. Does Trunk remove duplicate results, or does it count cache replays as runs?
3. What does Trunk cost today? If it is under ~$100 a month, the PostHog move is about owning the
   data, not saving money.
4. Who owns a red nightly run: an automatic Linear issue, a rotating triage owner, or both?
