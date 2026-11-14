# CI testing — gating, test ontology and result tracking

Draft for discussion. Only the knip and boot-budget change is implemented.

## Problem

- PRs are gated on many tests that are slow, costly and flaky.
- There is no shared ontology of tests: nothing says what a test touches or what CI does with it.
- Trunk quarantines tests in a dashboard: no record in git, no owner, no expiry, and its stats
  probably count cached results again as new runs.

## Decisions

### Trunk → tags

Whether a test runs and whether its failure counts are vitest tags in code, reviewed in PRs. They
replace Trunk's dashboard quarantine. Results go to PostHog (existing infrastructure); Cloudflare
Basin on R2 is the fallback if we want one event per test.

### Blocking vs nightly

- Untagged tests are **blocking**: they run on every PR and in the merge queue.
- `nightly` tests run only in the nightly full run and on demand (a dispatched full run on a PR).
- The nightly run executes everything, uncached and unscoped.
- Already done: knip and the boot budget run nightly only.

### Stable, flaky, advisory

- **Stable** (untagged): a failure fails CI.
- `flaky`: runs and is recorded, never fails CI. Temporary: has an owner and an issue, and goes back
  to stable once fixed.
- `advisory`: runs and is recorded, never fails CI. Permanent: the result is information (budgets,
  trends, live environments, evals).

### Proposed structure

`B` blocks every PR; `N` runs nightly. Each item shows the estimated minutes of work for one full,
uncached run; a PR runs only affected packages, so it pays a fraction of the `B` total.

```text
T0 Static checks
├─ B  dxos repo scripts (format, cycles, peer deps, …)       3 min
└─ B  edge config checks (format, bindings, dev stack)       0.5 min
T1 Compile and analysis
├─ B  dxos lint, build, type tests                          25 min
├─ B  dxos module structure, edge release                   25 min   rebuilds what the line above built
├─ B  dxos plugin set, docs links                           10 min
├─ N  dxos knip                                              3.5 min
├─ N  dxos boot budget                                       4 min
└─ B  edge lint, build, bundle checks                        6 min
T2 Unit
├─ B  dxos node unit (common, ui, the rest)                 70 min
└─ B  edge node unit                                        20 min   ~1 min of tests; the rest is serial task start-up
T3 Local runtime
├─ B  dxos workerd                                           9 min
└─ B  edge workerd, D1, Miniflare in node                    in edge node unit above
T4 Integration
├─ B  dxos ECHO (except echo-client-e2e)                    11 min
├─ B  dxos process manager                                   3 min
├─ B  dxos plugins, light (≤5 s per file)                   45 min
├─ N  dxos plugins, heavy                                   65 min
├─ N  dxos echo-client-e2e, memory                           7 min
├─ N  dxos client/SDK, AI and agent packages                23 min
└─ N  edge harness (edge:test, incl. sync)                  57 min
T5 Browser
├─ B  dxos vitest browser mode                               5 min
└─ B  dxos storybook                                        91 min
T6 Model fixtures
├─ N  dxos model-fixture replay                              1 min
└─ N  edge fixtures, Discord agent                          18 min
T7 End-to-end
├─ N  dxos Composer e2e (3 browsers)                        75 min
├─ N  dxos other Playwright (3 browsers)                    25 min
├─ N  dxos CLI smoke                                         1 min
└─ N  edge deployed e2e (after deploy)                       6 min
T8 Evals                                                 N   not measured
T9 Live services                                         N   not measured; most never run today
T10 Perf and benchmarks                                  N   not measured

Blocking total  ~320 min per full run   (PRs: affected packages only)
Nightly total   ~290 min per full run
```

The rest of this document is the evidence behind these decisions.

## Test ontology

Every check and test in dxos and edge, ordered from fast and stable to slow and expensive. The
inventory is from the repos as of 2026-11-14. The cost and flake columns come from GitHub Actions
data, 2026-11-07 to 11-14:

- **dxos:** 916 Check runs; JUnit from all 5 nightlies, 6 merge-queue runs and 18 re-run PRs
  (178,759 distinct test executions after removing moon cache replays); 6,506 jobs.
- **edge:** every run from 2026-10-31 to 11-14 (8,009 jobs); JUnit from 37 Check runs and all 34
  post-deploy e2e runs (123k test rows).

"Flake candidate" means a test that both failed and passed on the same commit, or failed and passed
on the next run of the same trigger within 48 h. CI never retries, so these are lower bounds.
"Test time" is the sum of JUnit times; moon task wall time is 2–3× higher because of per-task
start-up. Raw data and scripts are kept outside the repo; the method is reproducible from the
Actions API and artifacts (kept 7 days). When and where each tier runs is decided separately (see
[Run policy details](#run-policy-details)).

### T0 — Static checks (no build)

| Kind                                                                                                                                                                                             | Repo | What it covers                        | Scope      | Runs today                                | Blocks today | Cost                                                                               | Flake                                      |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--- | :------------------------------------ | :--------- | :---------------------------------------- | :----------- | :--------------------------------------------------------------------------------- | :----------------------------------------- |
| Repo scripts (13): format, import cycles, publish config, changesets, spec changelog and decisions, version sync, cache wiring, `pkg-lint`, public deps, QA coverage, peer deps, package exports | dxos | Repo hygiene                          | Whole repo | `check` stage 1, on every PR, MQ, nightly | Yes          | 26 s format, 21 s cycles, 66 s peer deps (3× slower warm than cold), the rest ≤3 s | format 1.7%, spec changelogs 5.2%, rest ~0 |
| Format, cache wiring, dev-stack config, `check:bindings` (wrangler binding parity), hub styles                                                                                                   | edge | Repo hygiene, Cloudflare config drift | Whole repo | `lint` job                                | Yes          | ~25 s of steps (lint job 4.5 min incl. 87 s setup)                                 | 0–0.3%                                     |

### T1 — Compile and whole-repo analysis

| Kind                                                            | Repo | What it covers                                | Scope                    | Runs today                        | Blocks today                | Cost                                                                                          | Flake                                           |
| :-------------------------------------------------------------- | :--- | :-------------------------------------------- | :----------------------- | :-------------------------------- | :-------------------------- | :-------------------------------------------------------------------------------------------- | :---------------------------------------------- |
| Lint (oxlint), build (tsc), type tests (tstyche, 8 files)       | dxos | Types and lint rules                          | Affected                 | `check` stage 2                   | Yes                         | PR 76 s median, 12 min p90; cold nightly 18–32 min                                            | 20.2% on PRs (mostly real breakage), 6.7% in MQ |
| Module structure, edge-release (plugin bundle loads in workerd) | dxos | Import bans, bundle loads                     | Affected                 | `check` stage 2                   | Yes                         | PR 15 s, 73 s p90; cold 9–15 min, mostly rebuilding what the compile gate just built          | 2.6% (module structure), 4.0% (edge release)    |
| knip, plugin-set check, docs bundle (link check)                | dxos | Dead code, plugin wiring, docs                | Whole repo, never scoped | `check` stage 3                   | Yes                         | knip ~3.5 min on every run (never cached); plugin-set + docs 2 min PR, 10 min nightly         | 2.8% (knip), 4.5% (plugin-set + docs)           |
| Boot budget                                                     | dxos | Static boot-graph size of the Composer bundle | Whole repo               | `boot-budget` job, PR and nightly | Fails its job, not required | PR 4 min median, 12 min p90 (rebuilds affected packages)                                      | job fails on 14% of PRs                         |
| Lint, build, Solid typecheck, `watch_dir` sync, bundle budgets  | edge | Types, worker bundle sizes                    | All                      | `lint`, `build` jobs              | Yes                         | build 112 s, lint 55 s, bundle budgets 84 s, `watch_dir` 68 s, Solid 29 s; jobs 6.4 + 4.5 min | build 3.6% on PRs, 0% on main; rest ≤0.4%       |

### T2 — Unit tests (node, no external state)

| Kind         | Repo | Size                                                                                                            | Runner             | Runs today            | Blocks today | Cost                                                                                                                                                                                                             | Flake                                |
| :----------- | :--- | :-------------------------------------------------------------------------------------------------------------- | :----------------- | :-------------------- | :----------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------- |
| Node unit    | dxos | ~1,900 files (the ~76% of 2,499 node test files that start no stack); `common/*` and `ui/*` are almost all unit | vitest `node`      | `test-node`, every PR | Yes          | All node tests: 17,749 per full run, 71 min of test time, 5 ms median; ~220 min of moon task time, two thirds of it per-task overhead. `test-node` job: PR 4.6 min median, nightly 19 min, ~1,550 runner-h/month | 0.018% fail, 0.061% flake candidates |
| Node unit    | edge | 188 files, 32 packages (+3 in edge)                                                                             | vitest `node`      | `test-packages`       | Yes          | 1,467 tests, 70 s of test time; `test-packages` job 23 min, of which ~20 min is moon running tasks one at a time and per-package start-up                                                                        | 0.1%                                 |
| Script tests | edge | 4 `node --test`, 4 `bun test`, 1 cargo                                                                          | node / bun / cargo | **none**              | —            | —                                                                                                                                                                                                                | —                                    |

### T3 — Local runtime tests (workerd, D1, Miniflare)

| Kind                         | Repo | Size                                               | Runner                        | Runs today      | Blocks today | Cost                                        | Flake |
| :--------------------------- | :--- | :------------------------------------------------- | :---------------------------- | :-------------- | :----------- | :------------------------------------------ | :---- |
| Workerd                      | dxos | 28 files, 23 packages                              | vitest-pool-workers           | `test-node`     | Yes          | 82 tests, 0.7 min                           | 0%    |
| Workerd                      | edge | 108 files, 17 packages (db-service 27, router 17)  | vitest-pool-workers           | `test-packages` | Yes          | 1,024 tests, 88 s                           | 0.4%  |
| D1                           | edge | 18 files, hub-service                              | vitest-pool-workers `node-d1` | `test-packages` | Yes          | 347 tests, 18 s                             | 0%    |
| Hand-built Miniflare in node | edge | mcp-space-service, sandbox-service, worker-bundler | vitest `node`                 | `test-packages` | Yes          | mcp-space-service 24 s, sandbox-service 5 s | 0%    |

### T4 — Integration tests (in-process stack)

| Kind             | Repo | Size                                                                                                            | What it starts                                                                         | Runs today            | Blocks today | Cost                                                                                                                                | Flake                                               |
| :--------------- | :--- | :-------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- | :-------------------- | :----------- | :---------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------- |
| Node integration | dxos | ~600 files (~24% of node tests); concentrated in `core/echo`, `sdk/client*`, `*-e2e` packages, AI/agent plugins | Full client stack, several peers, sqlite, child processes; 161 files use real timers   | `test-node`           | Yes          | Heaviest per full run: echo-client-e2e 4.6 min, client-e2e 3.5, plugin-agent 3.4, echo-client 3.3 (counted in the node total above) | client-e2e 1.1%, echo-client-e2e 0.3%, others ~0    |
| Edge harness     | edge | 90 files in `edge:test`                                                                                         | Whole edge worker plus ~13 services in Miniflare, fakes for Discord, Google, mail, RSS | `test-edge`, 4 shards | Yes          | 505 tests, ~33 min of test time over 4 shards; `test-edge` 16 min per shard, ~48k runner-min/month                                  | 1.2% of tests; job fails 21.9% on PRs, 6.5% on main |
| Edge sync subset | edge | 66 tests in `edge:test` (automerge, subduction, feed, signal)                                                   | Same harness                                                                           | `test-edge`           | Yes          | 515 s; `automerge.node.test.ts` alone 206 s                                                                                         | 1.5% of tests                                       |
| Memory and leak  | dxos | 2 files, echo-client-e2e                                                                                        | `--expose-gc`, `DX_DEBUG_LEAKS`                                                        | `advisory` job        | No           | Part of `advisory` (PR 37 s median)                                                                                                 | 0%                                                  |

### T5 — Browser tests (headless Chromium)

| Kind                                  | Repo | Size                                                                                                 | Runner                    | Runs today                   | Blocks today | Cost                                                                                                                                                                 | Flake                                                                                    |
| :------------------------------------ | :--- | :--------------------------------------------------------------------------------------------------- | :------------------------ | :--------------------------- | :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| Browser unit/integration              | dxos | 35 `*.browser.test` files, plus every plain `*.test.ts` again in the 15 packages that enable browser | vitest browser mode       | `test-browser`, ready PR, MQ | Yes          | 320 tests, 2.9 min                                                                                                                                                   | 0%                                                                                       |
| Storybook interaction (UI in browser) | dxos | 835 story files, ~2,844 stories, 136 packages                                                        | `@storybook/addon-vitest` | `test-browser`               | Yes          | 2,520 stories per full run, 30 min of test time, ~93 min of moon task time. `test-browser` job: PR 4.7 min median, 13 min p90, nightly 14 min, ~1,690 runner-h/month | 0.06% fail, 0.47% flake candidates, concentrated in plugin-routine and stories-assistant |

### T6 — Model-fixture tests (recorded LLM replay)

| Kind                        | Repo | Size                                       | Fixtures                                               | Runs today                      | Blocks today | Cost                                      | Flake        |
| :-------------------------- | :--- | :----------------------------------------- | :----------------------------------------------------- | :------------------------------ | :----------- | :---------------------------------------- | :----------- |
| Model fixture               | dxos | 15 files, 8 packages (tag `model-fixture`) | `.store/`, 469 recordings                              | `advisory` job                  | No           | `advisory` job, PR 37 s median, 8 min p90 | 0%           |
| Edge harness with fixtures  | edge | 7 files in `edge:test`                     | `.store/conversations`, 484 recordings                 | `test-edge`                     | Yes          | 35 tests, 470 s; 16.5 s median per test   | 29% of tests |
| Discord agent with fixtures | edge | 6 files                                    | Recordings plus plugin bundles from R2 or a dxos build | `test-discord-agent` (no Trunk) | Yes          | 35 tests, 186 s; job 12 min               | 20% of tests |

### T7 — End-to-end tests (real app, live EDGE preview)

| Kind                 | Repo | Size                                           | Depends on                                                              | Runs today                                   | Blocks today | Cost                                                                                                                                                        | Flake                                                                                                               |
| :------------------- | :--- | :--------------------------------------------- | :---------------------------------------------------------------------- | :------------------------------------------- | :----------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| Composer e2e         | dxos | 17 specs, ~79 tests × 3 browsers               | `vite preview` bundle, EDGE preview                                     | `e2e-composer`, ready PR, main push, nightly | No           | 53 tests per browser, 20–29 min of test time per browser; job PR 11 min, ~2,180 runner-h/month (the largest line); 49% of PR runs cancelled by a newer push | 0.8–3.1% fail, up to 7% flake candidates (chromium); `tour.spec.ts` fails in Firefox on 5 of 5 nightlies            |
| Other Playwright e2e | dxos | The other 9 `e2e`-tagged packages × 3 browsers | Storybook server or app bundle                                          | `e2e-rest`                                   | No           | 5–10 min of test time per browser; ~1,000 runner-h/month                                                                                                    | 0%                                                                                                                  |
| Deployed edge e2e    | edge | 5 files                                        | preview.dxos.network after deploy, admin key, real LLM via the AI proxy | `deploy-main` `e2e`, after merge             | No           | 10 tests, 341 s; job 12 min                                                                                                                                 | Red in 34 of 34 runs: the same 4 tests fail on the preview environment (auth, registry, webhook upload), not flakes |
| CLI packaging smoke  | dxos | 1 task                                         | npm pack and install                                                    | `cli`, `cli-foreign`                         | No           | PR 65 s median, 4 min p90                                                                                                                                   | 3.7%                                                                                                                |

### T8 — Scripted model tests and evals (live LLM)

| Kind           | Repo | Size                            | Depends on                             | Runs today                           | Blocks today | Cost         | Flake        |
| :------------- | :--- | :------------------------------ | :------------------------------------- | :----------------------------------- | :----------- | :----------- | :----------- |
| Agent evals    | dxos | 20 `*.eval.ts`, assistant-evals | Anthropic key, MCP on preview/dev/prod | `assistant-evals.yml`, nightly 03:00 | No           | not measured | not measured |
| Live storybook | dxos | stories-assistant               | Claude Agent SDK                       | none (`runInCI: false`)              | —            | —            | —            |

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

## Run policy details

Two labels per test, independent of its tier. Both are vitest tags in code, so a PR shows any change
to them, and CI selects tests with `--tagsFilter`.

- **When it runs:** blocking (untagged) or `nightly`.
- **Whether a failure counts:** stable (untagged), `flaky` or `advisory`.

### Tags

| Tag        | Label              | Meaning                                                                                                                                          | Where declared                                        |
| :--------- | :----------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------- |
| _(none)_   | When: blocking     | Runs on every PR, merge queue and nightly                                                                                                        | —                                                     |
| `nightly`  | When: non-blocking | Runs nightly and on demand, not on PRs                                                                                                           | `vitest.tags.ts` (new); edge `vitest.shared.ts` (new) |
| _(none)_   | Counts: stable     | A failure fails CI                                                                                                                               | —                                                     |
| `flaky`    | Counts: flaky      | Runs and is recorded; a failure does not fail CI. Temporary: carries an owner and an issue, and is expected to return to stable                  | `vitest.tags.ts` (exists, unused); edge (new)         |
| `advisory` | Counts: advisory   | Runs and is recorded; a failure never fails CI. Permanent by design: the result is information (budgets, trends, environment checks), not a gate | `vitest.tags.ts` (new); edge (new)                    |

Untagged means blocking and stable, so the ~1,900 unit test files need no change; only what leaves
the PR run or the gate is tagged. The existing opt-in tags (`model-fixture`, `sync`, `sync-e2e`,
`functions-e2e`, `manual`, `memory`) keep their current gates and are all non-blocking.

A tag applies at three levels:

- **Whole file:** a `// @module-tag nightly` comment at the top of the file (vitest 4.1, which both
  repos use, reads it before the file runs). A script can add it to every file in a package.
- **Suite or test:** `describe('…', { tags: ['nightly'] }, …)` or the same option on `test`.
- **Stories and Playwright:** `nightly`, `flaky` and `advisory` story tags, filtered through the
  storybook addon's tag include and exclude lists; `@nightly`, `@flaky` and `@advisory` Playwright
  tags, selected with `--grep` and `--grep-invert`.

CI filters:

| Run                | Must pass                                                                  | Reported only                       |
| :----------------- | :------------------------------------------------------------------------- | :---------------------------------- |
| PR, merge queue    | `!nightly && !flaky && !advisory` (plus the existing opt-in tags excluded) | `(flaky \|\| advisory) && !nightly` |
| Nightly, on demand | `!flaky && !advisory`                                                      | `flaky \|\| advisory`               |

### Blocking or non-blocking

This label decides _when_ a test runs:

- **PR and merge queue** run blocking tests only.
- **Nightly** runs everything, blocking and non-blocking, on `main`, with no affected scoping and no
  cache.
- **On demand**, a PR can run the full nightly suite: a `workflow_dispatch` of Check on the PR branch
  with a `full` option (its check runs land on the head commit, so they show on the PR), or a label
  that triggers a separate workflow with its own check names. Not a `labeled` trigger on Check
  itself: that run posts skipped check runs over the PR's real results, and branch protection reads
  skipped as passing (`check.yml:9-11`).

### Stable, flaky or advisory

This label decides whether a failure _counts_:

- **Stable** (untagged): a failure fails CI.
- **Flaky:** the test runs wherever its blocking label says and its result is recorded, but a
  failure does not fail CI. CI runs the suite twice with the filters above. Every `flaky` tag
  carries an owner and a linked issue in a comment next to it. The results store shows each flaky
  test's failure rate, so the tag can be removed once a test has passed for a set number of nightly
  runs, and a test that keeps failing becomes a fix or a delete. This replaces Trunk's dashboard
  quarantine.
- **Advisory:** the test runs and its result is recorded and shown (a PR comment, a non-required
  check, a dashboard), but it never blocks and is not expected to become stable. It is for results
  that are information, not a gate. Candidates from the ontology:
  - dxos `advisory` job suites (`memory`, `model-fixture` replay) and the boot budget, which
    already report without gating;
  - perf, benchmarks and bundle-size trends (T10);
  - e2e against live environments (T7: composer e2e, edge's post-deploy e2e), which today report
    without gating;
  - evals (T8).

The difference between `flaky` and `advisory` is intent: a flaky test is a stable test that is
broken for now, so it has an owner and an exit; an advisory test is meant to inform and has neither.

### What stays blocking

Untagged, and so blocking on PRs:

- **T0, T1:** all static, compile and whole-repo checks.
- **T2, T3:** unit, workerd and D1 tests in both repos. Edge measures 70 s, 88 s and 18 s of test
  time with 0–0.4% flake candidates.
- **T4, selected integration tests** (per-file medians from the nightlies):
  - Most ECHO tests: every `packages/core/echo/*` package except `echo-client-e2e`. That keeps
    echo-client (199 s), echo-host (124 s) and the small packages, ~370 s of test time in 175 files.
    `echo-client-e2e` (281 s, 614 tests, the memory suites) gets `// @module-tag nightly`.
  - Process manager: all 8 files are cheap and have not failed: `compute-runtime`
    `ProcessManager.test.ts` (11 s) and `RemoteProcessManager*` (<1 s), `edge-compute`
    `EdgeProcessManager` and `app-framework` `plugin-process-manager` (<1.2 s each).
  - Light Composer plugin tests: plugin test files that replay no model fixtures and take ≤5 s.
    That is 838 of 937 plugin node files and 751 s of their 2,091 s. The other 99 files cost the
    remaining 1,340 s (64%) and get `// @module-tag nightly`.
- **T5, storybook: keep blocking.** A full run is 2,520 stories and 30 min of test time, but PRs run
  only affected packages: the `test-browser` job (storybook plus vitest browser) is 4.7 min median
  and 13 min p90 on PRs. Its failure rate is 0.06%, and its flake candidates are a handful of
  stories in `plugin-routine` (RoutineForm "Operation Round Trip") and `stories-assistant` (the
  "Scripted" stories), which get the `flaky` story tag. The heaviest story packages
  (`plugin-code` 4 min, `stories-assistant` 3.3 min, `stories-agent` 2.2 min per full run) are the
  first to tag `nightly` if the PR time grows.

Tagged `nightly`:

- The rest of T4: full-stack client and SDK integration (`client-e2e` 3.5 min per full run,
  `sdk/client*`, `client-services`, `network-manager`), AI and agent packages (`plugin-agent`
  3.4 min), and the edge harness (`edge:test`), which costs ~33 min of test time per run and fails
  21.9% of PR runs.
- T6 to T9: model fixtures, e2e, evals, live tests. Composer e2e alone is ~2,180 runner-hours a
  month, the largest line in either repo.

### What the data says beyond tagging

These cost as much as the tests, and no tag fixes them:

- **Per-task start-up dominates node tests.** dxos node tests are 71 min of test time but ~220 min
  of moon task time per full run; edge `test-packages` takes 23 min for 3 min of test time, because
  it runs tasks one at a time (`--concurrency=1`). Fewer, larger vitest runs (one run across
  packages) would cut more than moving tests to nightly.
- **Cold `check` builds everything twice.** Module structure and edge-release re-run ~680 builds the
  compile gate just made, 16–28 min of every nightly; 3 of the last 5 nightly `check` jobs hit the
  75-min timeout.
- **knip is never cached:** ~3.5 min on every run, the longest step on a warm PR. Now nightly only.
- **Cancelled runs are spent minutes.** A new push cancels the running Check: 49% of PR
  `e2e-composer` runs and 33% of `test-browser` runs, and 12% of edge `test-edge` minutes.
- **Setup is paid per job:** 87 s in each edge job (~10 runner-minutes per Check run); dxos PR jobs
  mount a workspace snapshot instead (29 s).
- **Two suites give no signal today:** edge's deployed e2e has failed all 34 runs on the same 4
  preview-environment errors, and composer-e2e `tour.spec.ts` fails in Firefox every nightly. Both
  should be fixed or tagged `flaky` with an owner, not left red.

## What Trunk does for us today

When `TRUNK_TOKEN` is set, every test step runs inside `trunk-io/analytics-uploader@v1` with
`quarantine: true` (`.github/actions/vitest/action.yml`, the `e2e-composer` and `e2e-rest` jobs in
`check.yml`, and edge's `check.yml` and `deploy-main.yml`). When it is empty (fork PRs, which get no
secrets), a fallback step runs moon directly, with no upload and no quarantine. The uploader runs the moon command, uploads the JUnit, asks
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
  test; instead there are 153 `.skip` calls and 59 `!test` stories with no record of why.
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
without a row for every passing test: failures of a test ÷ runs of its file in which that test was
not skipped. That denominator needs to know which tests were skipped in each run, so skipped-test
events are sent on every run, not only nightly. Without them the rate is only an estimate: a test
that failed once and was then skipped in nine runs would read as 1 failure in 10 runs, not 1 in 1.
Tests filtered out before they are collected (`--tagsFilter`, `-t`) do not appear as skips, so the
file event carries the filter, and runs with a different filter are counted separately. A file's
test list also changes when tests are added, renamed or removed, so the nightly file event carries
the full list of test names in that file, and a test's denominator starts at the first nightly that
lists it. Between nightlies the rate is an estimate.

Only files whose moon task actually executed are sent. Cache replays are dropped, using moon's
task status (JUnit does not know a result came from cache).

### Volume and cost

| Input                                        | Value                              |
| :------------------------------------------- | :--------------------------------- |
| dxos test files / stories / Playwright specs | 2,556 / 829 / 47 (× 3 browsers)    |
| edge test files                              | 428                                |
| Events per full dxos run                     | ~4k                                |
| Check runs                                   | ~200 per weekday, ~4,500 per month |

| Option                                                        | Events/month | Cost/month   |
| :------------------------------------------------------------ | :----------- | :----------- |
| Nightly full run only                                         | ~0.1M        | $0           |
| **Every run, executed files only, with their skips (chosen)** | **~2.2–4M**  | **~$55–135** |
| Every run, every file row including cache replays             | ~7M          | ~$230        |
| Every run treated as a full run (worst case)                  | ~18M         | ~$600        |

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
