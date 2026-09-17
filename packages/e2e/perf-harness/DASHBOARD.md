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

| property        | example             | role                                                                      |
| --------------- | ------------------- | ------------------------------------------------------------------------- |
| `ciFlow`        | `projects`          | Which flow. One today.                                                    |
| `ciStage`       | `open-document`     | **The scenario.** Every chart breaks down by this.                        |
| `ciStageIndex`  | `6`                 | Order within the flow, for sorting a stacked bar.                         |
| `ciScale`       | `tasks=200,depth=2` | Fixture size label.                                                       |
| `ciFixtureSize` | `203`               | Objects actually created. Not folded into `ciScale`, which is a join key. |
| `ciIteration`   | `1`                 | Repeat within one run.                                                    |
| `ciOk`          | `true`              | Always `true`; a failed stage is never published.                         |

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
| `ciRealms`                                                | count         | how many realms the row read, so a `0` column is readable as absent             |

**The realm columns are keyed by KIND, not by script name.** A name-keyed column
(`cpuMs_shared_worker_client_js`) minted a new permanent property on every bundle rename and left
the old series flat. All four are always present; `0` means the realm was absent or idle.

## Tiles

Every tile is the same shape: **x axis is days, one line per scenario.** A trends insight with
`interval: day`, `math: avg` on the measure property, and a breakdown on `properties.ciStage` — not
HogQL, because the native controls give the dashboard a working date range and interval picker.

Realms get separate tiles rather than separate series, so a tile's ten lines are always the ten
scenarios and never a ten-by-four grid nobody can read.

| #   | tile                    | measure                       |
| --- | ----------------------- | ----------------------------- |
| 1   | Wall time               | `ciWallMs`                    |
| 2   | CPU, all processes      | `ciCpuMsTotal`                |
| 3   | CPU — tab               | `ciCpuMsTab`                  |
| 4   | CPU — shared worker     | `ciCpuMsSharedWorker`         |
| 5   | CPU — dedicated workers | `ciCpuMsWorker`               |
| 6   | Heap — tab              | `ciHeapUsedBytesTab`          |
| 7   | Heap — shared worker    | `ciHeapUsedBytesSharedWorker` |
| 8   | Peak RSS                | `ciPeakRssBytes`              |
| 9   | DOM nodes               | `ciDomNodes`                  |
| 10  | Total blocking time     | `ciTbtMs`                     |
| 11  | Lag p95 — tab           | `ciLagP95MsTab`               |
| 12  | Lag p95 — shared worker | `ciLagP95MsSharedWorker`      |
| 13  | App code transferred    | `ciCodeBytes`                 |

### The runs table

The last tile is a table rather than a chart: one row per run, newest first, with when it ran, its
branch, commit, trigger and Depot run id, and its totals. The charts aggregate by day and so cannot
answer _which runs is this point made of_ — this is how a point that looks wrong gets traced back to
a commit and a run.

Its `stages` column is the integrity check, and worth reading before any other number on the page.
The flow has **ten** stages and `writePosthogBatch` drops failed ones, so a row showing fewer than
ten is a partial run whose totals are not comparable to a complete one — it will still be averaged
into the charts above, where nothing marks it as short.

## Two things to know before reading a tile

- **Tiles are dated by run, not by commit.** A nightly can run hours after the commit it measures,
  the same caveat the EDGE join-latency dashboard carries.
- **`ciDomNodes` is the only machine-independent measure here.** Across a CI runner and a local
  sandbox it differs by 1% while wall time differs 1.7x and TBT 3x. Read it for regressions; read
  the timing tiles as trends.
- **The run-to-run noise floor is ~20% per stage, and the nightly runs one iteration per mode.** A
  single point moving is not a regression; only a level shift sustained over several nights is. The
  fix is more iterations per night charted as a median, not a tighter chart — until then, read
  levels and not points.
