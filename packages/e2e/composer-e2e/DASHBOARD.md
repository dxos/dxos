<!-- Copyright 2026 DXOS.org -->

# The PostHog dashboard

**[Composer e2e (nightly)](https://eu.posthog.com/project/126171/dashboard/963444)** — project
`Composer` (126171), `eu.posthog.com`.

What the e2e job publishes and how it is charted. How the tests themselves are written lives in
[`BEST-PRACTICES.md`](./BEST-PRACTICES.md); this file covers only the event contract and the tiles.

## One event per test

Every test result of every run is one `ci.e2e-test` event — **one row per test per browser**. There
is no per-run summary event and no per-suite event: a summary is `count()` over these rows, and a
suite is a `GROUP BY`. A summary event would also be unable to answer the question the second tile
exists for, which is _which tests are red right now_.

`src/report.ts` builds the rows from Playwright's **JSON** report (not the JUnit XML the Trunk
uploader consumes — the JSON carries the project, the per-attempt status and the describe chain as
structure, where JUnit flattens all three into `classname` strings). `scripts/publish-results.mjs`
writes them as NDJSON and hands them to `scripts/ci-event.mjs`, which namespaces every property to
`ci<Name>` and attaches the GitHub envelope (`ciCommitSha`, `ciBranch`, `ciRunId`, …). So the
report emits `status` and HogQL reads `properties.ciStatus`. The table below gives the names **as
they appear in PostHog**.

### Dimensions — what a row is

| property    | example                              | role                                                                                      |
| ----------- | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| `ciPackage` | `composer-e2e`                       | Which suite. Every tile pins it — the publisher sends whatever reports the cell produced. |
| `ciFile`    | `basic.spec.ts`                      | Spec file, relative to `src/playwright`.                                                  |
| `ciSuite`   | `Basic tests`                        | The `describe` chain, joined with `›`.                                                    |
| `ciTest`    | `Basic tests › create document`      | **The test.** Suite chain plus title — two files may each hold a `create`.                |
| `ciTestId`  | `4f1c…` (16 hex)                     | Stable identity across runs: sha1 of package, file, title and browser.                    |
| `ciBrowser` | `chromium`                           | Playwright project; one CI cell per browser.                                              |
| `ciQa`      | `@QA-1` (comma-separated if several) | The `.mdl` flow(s) this test automates, from its Playwright tags.                         |
| `ciLine`    | `42`                                 | Line of the `test(` call, absent where the reporter omits it.                             |

### Measures

| property       | unit    | notes                                                                             |
| -------------- | ------- | --------------------------------------------------------------------------------- |
| `ciStatus`     | enum    | `passed` \| `failed` \| `flaky` \| `skipped` — see below                          |
| `ciFailed`     | boolean | Redundant beside `ciStatus`, because both tiles filter on "is this a failure"     |
| `ciDurationMs` | ms      | The last attempt's duration; `0` for a skip                                       |
| `ciError`      | text    | First 300 characters of the failure, ANSI stripped; the trace is on the artifacts |

**`flaky` is kept distinct from both `passed` and `failed`.** This suite runs with `retries: 0`, so
a `flaky` row can only come from a config that overrode it — counting it as a pass would make that
override invisible on the very chart that exists to show it.

**An unrecognized reporter status is published as `failed`, not dropped.** A status `toStatus` does
not know means the reporter changed, and a silent drop would show up as the suite quietly shrinking.

## What is published, and when

**From `main`, or an explicit dispatch.** The publish step is gated on
`github.ref == 'refs/heads/main' || github.event_name == 'workflow_dispatch'`: a PR run measures a
branch and a fork PR has no project token at all, so neither publishes on its own. A
`workflow_dispatch` is a maintainer asking for this run's results — how the dashboard is seeded or
backfilled off-schedule — and every row it publishes carries `ciBranch` and `ciTrigger`.

**The nightly is the sample that matters.** `Check` runs on a `0 4 * * 1-5` schedule, where the
affected resolver returns a full run and `DX_E2E_RUN_ID` is set — which forces the moon tasks to
actually execute rather than replay a cache hit. A push to `main` is also a full run, but a cache
replay restores no report, and `publish-results.mjs` then no-ops. So the series is one point per
weekday night, and a mid-day point means someone dispatched a run.

**The step is `always()`.** The report of a RED run is the entire point; gating on success would
publish only the nights where nothing failed, and the failing-tests table would never fill.

**Rows are dated by the RUN**, not by the commit (`timestamp` is the Playwright run's start time).
`ci-event.mjs` would otherwise default to the commit date, and two nightlies days apart routinely
sit on one commit — collapsing exactly the two nights the trend exists to tell apart. The dedup
uuid is seeded from (commit, `dedup`), so re-publishing one run's batch collapses onto the rows it
already sent instead of doubling the counts.

**Nothing here can fail the build.** `publish-results.mjs` reports problems as workflow warnings
and exits 0. A test suite must not go red because the network did.

## Tiles

### 1. Test outcomes per run — stacked bar

One bar per run date, stacked by `ciStatus`, counted across all three browsers. A suite of N tests
contributes 3N to the bar.

Counted across browsers rather than per browser because the question is "how much of the suite is
green tonight", and a failure in webkit alone is still a failure.

The query returns **long** format (`day`, `outcome`, `tests`) rather than a column per status, so
the renderer's `seriesBreakdownColumn` stacks on the column's values — a status the query has never
seen then appears on its own instead of being silently dropped by a missing `countIf`.

**`skipped` is a band, not a filter.** Read it: a bar that shrinks with no failures appearing is
tests being skipped or deleted, and without the band that is indistinguishable from a suite that
got smaller on purpose.

### 2. Currently failing tests — table

The latest result of each `(test, browser)` in the last 30 days, kept when it failed. **Empty is
the good state.**

The inner query reduces each test's history to its latest row with `argMax(…, timestamp)` and the
outer one keeps the failures. Filtering to `ciStatus = 'failed'` _before_ the reduction is the
classic error here — it lists every test that has ever failed in the window, which is a history,
not a state.

Grouped by `(test, browser)`, not by test: a spec that is chromium-only by `test.skip` is green in
chromium and skipped elsewhere, and collapsing those into one row makes both unreadable.

30 days rather than 90: a test whose last run was a month ago is not _currently_ failing, it is a
test that stopped running — and that belongs to tile 1's shrinking stack.

`qa` carries the `.mdl` flow, so a row names the broken **journey** and not only the file. From
there, `--grep @QA-n` re-runs everything that automates it and the flow's own `do`/`expect` steps
are what a human re-runs by hand.

## Caveats

- **Branch is not filtered in the queries**, only by the publish gate. A dispatch from a branch does
  publish, so add `AND properties.ciBranch = 'main'` to a tile that must see only `main`.
- **A day with several runs is summed**, not averaged: three browser cells publish independently
  into the same date, which is intended, but a dispatch on the same day adds to the same bar.
- **`ciTestId` changes when a test is renamed.** That is a deliberate consequence of keying on the
  title: a renamed test is a new series, and the old one goes quiet rather than silently absorbing
  a different test's results.
