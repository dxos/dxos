<!-- Copyright 2026 DXOS.org -->

# The PostHog dashboard

**[Composer performance (nightly)](https://eu.posthog.com/project/126171/dashboard/958200)** —
project `Composer` (126171), `eu.posthog.com`.

What the nightly publishes and how it is charted. Field semantics live in
[`METRICS.md`](./METRICS.md); this file covers only the event contract and the tiles.

## One event

Every stage of every measured flow is one `ci.perf-stage` event. There is no summary event and no
per-realm event: a summary is `sum()` over the stages of a run, and a per-realm row is a column on
the stage.

`scripts/ci-event.mjs` namespaces every property to `ci<Name>` on capture and attaches the GitHub
envelope (`ciCommitSha`, `ciBranch`, `ciRunId`, …), so the harness emits `wallMs` and HogQL reads
`properties.ciWallMs`. The tables below give the names as they appear **in PostHog**.

### Dimensions — what a point is

| property        | example                                   | role                                                                                          |
| --------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `ciFlow`        | `projects-tasks`                          | Which flow. One today.                                                                        |
| `ciStage`       | `open-document`                           | **The scenario.** Every chart breaks down by this.                                            |
| `ciStageIndex`  | `6`                                       | Order within the flow, for sorting a stacked bar.                                             |
| `ciScale`       | `tasks=200,depth=2,projects=1,docs=3x400` | Fixture shape label.                                                                          |
| `ciFixtureSize` | `200`                                     | Tasks actually created (`fixture.taskCount`). Not folded into `ciScale`, which is a join key. |
| `ciIteration`   | `1`                                       | Repeat within one run.                                                                        |
| `ciOk`          | `true`                                    | Always `true`; a failed stage is never published.                                             |

### Comparability — pinned in every `WHERE`

`ciServingMode`, `ciPluginSet`, `ciProfileState`, `ciSettleMs`, `ciInstruments`. A trend that mixes
`vite preview` with `vite serve` moves ~2.5x on main-thread cost alone, which reads exactly like a
regression. Filter on them rather than trusting them to be constant.

### Measures

| property                                                  | unit          | realm columns                                                                   |
| --------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------- |
| `ciWallMs`                                                | ms            | —                                                                               |
| `ciCpuMsTotal`                                            | ms            | — (every Chrome process, GPU included)                                          |
| `ciCpuMs*`                                                | ms            | `…Tab` `…Worker` `…SharedWorker` `…ServiceWorker`, plus `ciCpuMsWorkers` rollup |
| `ciHeapUsedBytes*`                                        | bytes         | same four suffixes, plus `ciHeapUsedTotalBytes`                                 |
| `ciLagP95Ms*` / `ciLagMaxMs*`                             | ms            | same four suffixes, plus the pooled `ciLagP95Ms` / `ciLagMaxMs`                 |
| `ciPeakRssBytes`                                          | bytes         | — (browser process tree)                                                        |
| `ciDomNodes`, `ciDomListeners`                            | count         | —                                                                               |
| `ciTaskMs`, `ciScriptMs`, `ciLayoutMs`, `ciRecalcStyleMs` | ms            | tab only, by construction                                                       |
| `ciTbtMs`, `ciLongTaskMaxMs`                              | ms            | tab only — the Long Tasks API is a page API                                     |
| `ciCodeBytes`, `ciApiBytes`, `ciApiRequests`              | bytes / count | —                                                                               |
| `ciEdgeApiBytes`, `ciEdgeSocketBytes`, `ciEdgeBytes`      | bytes         | the app's own backend only; `ciEdgeBytes` is the two summed                     |
| `ciEdgeApiRequests`, `ciEdgeSocketFrames`                 | count         | frames are counted in both directions                                           |
| `ciAnalyticsBytes`                                        | bytes         | telemetry, kept out of the edge columns and recorded so the split is auditable  |
| `ciSqliteReadBytes`, `ciSqliteWriteBytes`                 | bytes         | SQLite's own VFS I/O, browser only                                              |
| `ciSqliteReads`, `ciSqliteWrites`, `ciSqliteSyncs`        | count         | `syncs` is where write amplification shows up                                   |
| `ciSqliteRealms`                                          | count         | **read this first**: `0` means nothing was instrumented, not that I/O was zero  |
| `ciRealms`                                                | count         | how many realms the row read, so a `0` column is readable as absent             |

**The realm columns are keyed by KIND, not by script name.** A name-keyed column
(`cpuMs_shared_worker_client_js`) minted a new permanent property on every bundle rename and left
the old series flat. All four are always present; `0` means the realm was absent or idle.

## Tiles

**Every DISTRIBUTION tile is a run total with an error bar.** One box per night: the phases are
reduced within an iteration to a single run-level number, and the box then describes the spread
across the night's ten iterations. That is tiles 1-12 below.

The **two stacked tiles are the exception** and carry no error bar — they answer "where did it go"
rather than "how much and how variable", and they use means so their segments sum to a total shown
elsewhere. See "The two stacked tiles" below.

- **Box** = mean +/- one **sample** standard deviation. An error bar, not an interquartile range —
  the choice `EDGE nightly join latency` made, and the reason its tiles read as measurements. True
  quartiles are one edit away (`quantile(0.25)` / `quantile(0.75)`) if the spread is ever the wrong
  question.
- **Line** = median, **marker** = mean.
- **Whiskers** = the lowest and highest iteration, EXCEPT where the renderer needs them widened.
  A box plot requires `min <= p25 <= p75 <= max`, so when one sd reaches past the observed range
  the whisker is pushed out to enclose the box, and the lower edge is floored at zero. The two
  cases are worth keeping apart when reading a tile: a whisker at the box edge is the widening
  rule, not a night where the extreme iteration happened to sit exactly one sd out. The raw
  minimum and maximum are always available per iteration in the runs table.
- `stddevSamp` returns **NaN** for a single sample, and no `coalesce` catches a NaN — hence
  `if(count() > 1, stddevSamp(x), 0)`. Without it a one-iteration day renders an empty box rather
  than a degenerate one.

### The two reducers, and why a tile has the one it has

| reducer               | tiles                                        | why                                                                                                                                                   |
| --------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sum` over the phases | wall time, CPU (all three), TBT, code bytes  | Additive: the run cost what its phases cost.                                                                                                          |
| `max` over the phases | peak RSS, peak heap, peak DOM nodes, lag p95 | A **level**, not a quantity. Summing ten peaks reports memory never simultaneously resident, and summing ten p95s is a number with no interpretation. |

| #   | tile                                  | measure              | reducer |
| --- | ------------------------------------- | -------------------- | ------- |
| 1   | Total wall time per run               | `ciWallMs`           | sum     |
| 2   | Total CPU per run — all processes     | `ciCpuMsTotal`       | sum     |
| 3   | Total CPU per run — tab               | `ciCpuMsTab`         | sum     |
| 4   | Total CPU per run — dedicated workers | `ciCpuMsWorker`      | sum     |
| 5   | Peak DOM nodes per run                | `ciDomNodes`         | max     |
| 6   | Peak RSS per run                      | `ciPeakRssBytes`     | max     |
| 7   | Worst-phase lag p95 per run — tab     | `ciLagP95MsTab`      | max     |
| 8   | Peak heap per run — tab               | `ciHeapUsedBytesTab` | max     |
| 9   | Total app code transferred per run    | `ciCodeBytes`        | sum     |
| 10  | Total blocking time per run           | `ciTbtMs`            | sum     |
| 11  | Total edge traffic per run            | `ciEdgeBytes`        | sum     |
| 12  | Total SQLite disk I/O per run         | `ciSqliteWriteBytes` | sum     |

### The two stacked tiles

**Wall time by phase (mean, stacked)** answers a different question from the rest of the page. The
distributions say whether the run got slower; this says **where**, and a regression in `open-tasks`
(ECHO and list rendering) has nothing in common with one in `edit-document` (the editor keystroke
path).

It uses `avg`, not `median`, and that is load-bearing: the mean of a sum is the sum of the means, so
its ten segments add up to the mean on the wall-time distribution tile. Per-phase medians would not
sum to the total median, and a stacked chart whose segments do not add up to a number shown
elsewhere on the same dashboard is worse than no chart.

**Peak memory composition (mean, stacked)** is the memory counterpart, and it stacks by
**composition, not by phase** — deliberately. Time is additive, so phases stack; memory is a level,
so stacking ten phases' peaks would draw ~40 GB that never existed at any instant. What genuinely
sums is JS heap plus everything else = peak RSS, which puts the finding on the page: ~250 MB of heap
inside ~4 GB of RSS, so ~15x of this app's memory is wasm linear memory and native allocation and
optimizing the JS heap cannot move the memory number.

One honest caveat, recorded in the tile's SQL: the RSS peak and the heap peak need not occur at the
same instant within a phase, so the total is exact and the boundary between the two segments is
approximate.

### Edge traffic, and what it took to measure it

`ciEdgeBytes` is `fetch`/`xhr` **plus WebSocket frames** to the app's own backend, with analytics
excluded. Each half needed fixing before the tile meant anything:

- **Frames were invisible.** A WebSocket emits exactly ONE `response` — the 101, with an empty body
  — so the `response` handler saw none of ECHO's replication. On a real CI run that read as
  `edit-document`, `toggle-task`, `scroll-tasks` and `reopen-project` each recording **0 API bytes
  and 0 requests**, which is impossible for a flow that syncs. Counted via `page.on('websocket')`
  now, in both directions.
- **Analytics rode the same resource type** as a real API call, so whatever PostHog flushed during
  a stage landed in the same column as the app's own traffic. Origin is classified by host,
  suffix-matched so every deployment of the worker counts without being listed, with the analytics
  list tested FIRST so telemetry proxied through an edge subdomain cannot widen the backend column.

Origin accumulates alongside the code/API split rather than partitioning it: a deployed build
serves the bundle from the same host as the API, so `codeBytes` has to keep meaning the whole
bundle.

### Shared-worker panels are deliberately absent

The realm measured ~1 MB of heap flat across a run, a few hundred ms of CPU, and **lag p95 of 0 ms
on every stage of every run**. Three instruments agree it is idle, so its three tiles were noise on
a page where every tile should earn its space. The insights still exist unattached
(`CPU / Heap / Lag p95 — shared worker, by scenario`) for the day that stops being true.

### The runs table

The last tile is a table rather than a chart: **one row per iteration**, newest first, with when it
ran, its branch, commit, trigger, iteration index and its totals.

These rows are exactly the population each box summarizes — the charts reduce these same phases
within an iteration and then take the mean, sd and median across the run's iterations. So the
spread down a run's ten rows _is_ the box, available as numbers when the picture is not enough, and
it is also how a point that looks wrong gets traced back to a commit and a Depot run id.

Its `stages` column is the integrity check, and worth reading before any other number on the page.
The flow has **ten** stages and `writePosthogBatch` drops failed ones, so a row showing fewer than
ten is a partial iteration whose totals are not comparable to a complete one — it still feeds the
charts above, where nothing marks it as short.

## Two things to know before reading a tile

- **Tiles are dated by run, not by commit.** A nightly can run hours after the commit it measures,
  the same caveat the EDGE join-latency dashboard carries.
- **`ciDomNodes` is the only machine-independent measure here.** Across a CI runner and a local
  sandbox it differs by 1% while wall time differs 1.7x and TBT 3x. Read it for regressions; read
  the timing tiles as trends.
- **The box measures the noise floor, so read it before reading the trend.** The run-to-run spread
  on a stage is ~20%, and the nightly's ten iterations measure that directly rather than leaving it
  asserted — which one sample per night could never support.

  What the box is NOT: mean +/- one sd is a description of the samples, not a confidence interval
  and not a hypothesis test. Overlapping boxes are not evidence that nothing regressed, and
  separated boxes do not establish that something did. Read overlap as "this movement is within
  what the harness sees night to night" and separation as "worth investigating", and if a decision
  actually rests on it, take more samples rather than reading more into these.
