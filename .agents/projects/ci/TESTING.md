# CI testing — gating, test ontology and result tracking

Discussion notes for moving PR gating to fast tests only and making flakiness visible. Status: draft
for discussion; nothing here is implemented yet.

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

## Proposed test ontology

Two independent axes per test (or per suite, where tags are set):

| Axis                              | Values                                                                     |
| :-------------------------------- | :------------------------------------------------------------------------- |
| **Tier** — what the test touches  | unit → integration → browser/storybook → e2e → live (sync, functions, LLM) |
| **Status** — what CI does with it | blocking → advisory → quarantined → disabled                               |

- PRs block only on unit tests plus check.
- Quarantine becomes a status written in code and reviewed in a PR, with an owner and an expiry
  date, not a dashboard toggle.
- Trunk becomes an analytics store only, or is replaced by the results store below.

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
