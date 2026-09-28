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

| property                                                  | unit          | realm columns                                                                       |
| --------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------- |
| `ciWallMs`                                                | ms            | —                                                                                   |
| `ciCpuMsTotal`                                            | ms            | — (every Chrome process, GPU included)                                              |
| `ciCpuMs*`                                                | ms            | `…Tab` `…Worker` `…SharedWorker` `…ServiceWorker`, plus `ciCpuMsWorkers` rollup     |
| `ciHeapUsedBytes*`                                        | bytes         | same four suffixes, plus `ciHeapUsedTotalBytes`                                     |
| `ciLagP95Ms*` / `ciLagMaxMs*`                             | ms            | same four suffixes, plus the pooled `ciLagP95Ms` / `ciLagMaxMs`                     |
| `ciLagSamples*`                                           | count         | **read this before a zero above**: `0` means the drift probe produced nothing       |
| `ciHeapBackingBytes*`                                     | bytes         | RAW backing: wasm AND `ArrayBuffer`s. **Do not stack beside `ciWasmBytes*`**        |
| `ciHeapBackingNonWasmBytes*`                              | bytes         | backing with wasm removed — the disjoint column, safe to stack                      |
| `ciEmbedderBytes*`                                        | bytes         | Blink-side objects for the realm: DOM, listeners, the document                      |
| `ciWasmAutomergeBytes*` / `ciWasmSubductionBytes*`        | bytes         | wasm by library; subduction is matched first, its module is `automerge_subduction…` |
| `ciWasmSqliteBytes*` / `ciWasmOtherBytes*`                | bytes         | the other two libraries; the four partition `ciWasmBytes*` exactly                  |
| `ciWasmBytes*`                                            | bytes         | same four suffixes, plus `ciWasmBytesTotal`; counted by no heap column              |
| `ciWasmRealms`                                            | count         | realms that published the wasm probe; `0` means uninstrumented, not "no wasm"       |
| `ciRpcQueueWaitP95Ms*` / `ciRpcQueueWaitMaxMs*`           | ms            | same four suffixes — time a request waited for that realm's event loop              |
| `ciRpcServiceMaxMs*`                                      | ms            | same four suffixes — worst handler duration in the realm that served it             |
| `ciRpcRoundTripP95Ms*` / `ciRpcRoundTripMaxMs*`           | ms            | same four suffixes, attributed to the realm that ISSUED the call                    |
| `ciRpcCalls*`                                             | count         | same four suffixes, plus `ciRpcCallsTotal`                                          |
| `ciRpcSamples`, `ciRpcRealms`                             | count         | `ciRpcCallsTotal` above `ciRpcSamples` means the percentiles cover the stage's tail |
| `ciAppFootprintBytes`                                     | bytes         | — private footprint of the RENDERER processes: the app, wasm included               |
| `ciChromeFootprintBytes`                                  | bytes         | — browser, GPU and service processes: Chrome's own cost, beside the app's           |
| `ciDomNodes`, `ciDomListeners`                            | count         | —                                                                                   |
| `ciTaskMs`, `ciScriptMs`, `ciLayoutMs`, `ciRecalcStyleMs` | ms            | tab only, by construction                                                           |
| `ciTbtMs`, `ciLongTaskMaxMs`                              | ms            | tab only — the Long Tasks API is a page API                                         |
| `ciCodeBytes`, `ciApiBytes`, `ciApiRequests`              | bytes / count | —                                                                                   |
| `ciEdgeApiBytes`, `ciEdgeSocketBytes`, `ciEdgeBytes`      | bytes         | the app's own backend only; `ciEdgeBytes` is the two summed                         |
| `ciEdgeApiRequests`, `ciEdgeSocketFrames`                 | count         | frames are counted in both directions                                               |
| `ciAnalyticsBytes`                                        | bytes         | telemetry, kept out of the edge columns and recorded so the split is auditable      |
| `ciSqliteReadBytes`, `ciSqliteWriteBytes`                 | bytes         | SQLite's own VFS I/O, browser only                                                  |
| `ciSqliteReads`, `ciSqliteWrites`, `ciSqliteSyncs`        | count         | `syncs` is where write amplification shows up                                       |
| `ciSqliteRealms`                                          | count         | **read this first**: `0` means nothing was instrumented, not that I/O was zero      |
| `ciRealms`                                                | count         | how many realms the row read, so a `0` column is readable as absent                 |

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

| reducer               | tiles                                       | why                                                                                                                                                         |
| --------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sum` over the phases | wall time, CPU (all three), TBT, code bytes | Additive: the run cost what its phases cost.                                                                                                                |
| `max` over the phases | peak RSS, peak heap, lag p95                | A **level**, not a quantity. Summing eleven peaks reports memory never simultaneously resident, and summing eleven p95s is a number with no interpretation. |

| #   | tile                                  | measure                   | reducer |
| --- | ------------------------------------- | ------------------------- | ------- |
| 1   | Total wall time per run               | `ciWallMs`                | sum     |
| 2   | Total CPU per run — all processes     | `ciCpuMsTotal`            | sum     |
| 3   | Total CPU per run — tab               | `ciCpuMsTab`              | sum     |
| 4   | Total CPU per run — dedicated workers | `ciCpuMsWorker`           | sum     |
| 5   | Peak app footprint per run            | `ciAppFootprintBytes`     | max     |
| 6   | Worst-phase lag p95 per run — tab     | `ciLagP95MsTab`           | max     |
| 7   | Peak realm memory per run — tab       | tab heap+embedder+wasm    | max     |
| 8   | Total app code transferred per run    | `ciCodeBytes`             | sum     |
| 9   | Total blocking time per run           | `ciTbtMs`                 | sum     |
| 10  | Total edge traffic per run            | `ciEdgeBytes`             | sum     |
| 11  | Total SQLite read bytes per run       | `ciSqliteReadBytes`       | sum     |
| 12  | Total SQLite write bytes per run      | `ciSqliteWriteBytes`      | sum     |
| 13  | Worst-phase lag p95 per run — worker  | `ciLagP95MsWorker`        | max     |
| 14  | Peak realm memory per run — worker    | worker heap+embedder+wasm | max     |

### The realm memory tiles sum three allocators, and exclude a fourth

Tiles 7 and 14 report `ciHeapUsedBytes{realm} + ciEmbedderBytes{realm} + ciWasmBytes{realm}`, not
JS heap alone. `usedSize` counts live JS objects only, and almost nothing this app holds is a JS
object: the worker read ~32 MB of heap against ~186 MB of realm memory, which is why a heap-only
tile made the realm running ECHO look like the cheapest one in the browser.

`ciHeapBackingBytes{realm}` is deliberately NOT a fourth term. It counts wasm memories and ordinary
ArrayBuffers in one number, so adding it double-counts wasm — and it does not reproduce across
machines: on one commit and one flow the tab read 14.0 MB in CI against 65.2 MB locally, and the
worker 17.4 MB against 127.3 MB, while `used` and `wasm` agreed to within 3%. A term that changes by
5-7x with the machine cannot be trended, and `max(0, backing - wasm)` inherits that by changing
sign. The cost of the exclusion is that a non-wasm ArrayBuffer goes uncounted.

Both tiles filter on `ciWasmRealms > 0`, the wasm probe's integrity column: rows before 2026-09-22
carry no wasm term, and without the predicate the series steps ~120 MB on the day the probe landed
and reads as a regression rather than as the metric widening.

### Tile 13 filters on `ciLagSamplesWorker > 0`, and must

Unlike its tab twin, the worker lag tile carries a predicate on the probe's integrity column. Every
row written before 2026-09-22 reports `ciLagP95MsWorker` as zero because the probe never armed —
the drain expression defined the global the installer's guard tested — so 671 historical stage rows
say `0` meaning "not measured". Averaging those in would read as a worker that used to be perfectly
responsive and has since regressed. The predicate also drops genuinely idle phases, which is the
same judgement the tile already makes by taking a max.

### `open-space` is not yet trustworthy

Worth knowing before reading any tile that includes it. Across four runs its wall time is 254,
378, 648 and 1,638 ms — a **6.4x** span — and its within-run CV is **41.6%**, against 1-3% for
most phases. Every other phase is stable both within and across runs, so this is the stage and not
the harness. Until it is understood, a movement in a run total is more likely to be `open-space`
than anything else in the flow, and the phase-stacked tile is where to check.

### The footprint tiles MUST filter on `ciFootprintProcesses > 0` — and do not yet

Not a description of the dashboard, but a requirement on it. The memory-infra dump can fail or be
pre-empted by another trace, and a failed read yields no processes — which sums to zero bytes and
is indistinguishable from an app holding no memory once it is a point on a chart. `report.ts`
publishes `footprintProcesses` so the two are separable, but **separable is not separated**: no
tile currently carries the filter, so a failed collection would plot as a floor of zero and read
as a dramatic improvement, exactly as a pre-VFS run did before the SQLite tiles were gated.

Anything trending `ciAppFootprintBytes` or `ciChromeFootprintBytes` — tile 5 and the memory
composition tile — needs `AND properties.ciFootprintProcesses > 0` in its `WHERE`, for the same
reason and by the same precedent as the section below. Until someone makes that dashboard edit,
this section describes a gap rather than a safeguard, in the spirit of the completeness-filter
defect recorded further down.

### The SQLite tiles filter on `ciSqliteRealms > 0`

Alone among the tiles, these two carry a `WHERE` that is not about comparability. Zero bytes means
either that SQLite did no I/O or that nothing was instrumented, and the byte columns cannot tell
those apart — so without the filter every run predating the VFS wrapper plots as a floor of zero
and reads as a dramatic improvement that never happened. The integrity column is what makes the
absence droppable rather than plottable.

The two are not symmetric, and the difference is in the VFS contract rather than in the tiles:

- **Read bytes are REQUESTED.** SQLite asks for a whole page past end-of-file during recovery and
  the VFS zero-fills the remainder, so this is the I/O asked of storage.
- **Write bytes are DELIVERED.** A short write is an error the VFS reports rather than a partial
  success, so a rejected write contributes nothing and lands in `writeErrors`.

Read the write tile against `ciSqliteSyncs`: bytes rising while syncs stay flat is a bigger
transaction, while syncs rising with bytes flat is write amplification — the journal mode doing
more fsyncs for the same data. `applyOpfsPragmas` sets journal mode and `synchronous`, so a change
there should move these tiles and nothing else on the page.

### The two stacked tiles

**Wall time by phase (mean, stacked)** answers a different question from the rest of the page. The
distributions say whether the run got slower; this says **where**, and a regression in `open-tasks`
(ECHO and list rendering) has nothing in common with one in `edit-document` (the editor keystroke
path).

It uses `avg`, not `median`, and that is load-bearing: the mean of a sum is the sum of the means, so
its eleven segments add up to the mean on the wall-time distribution tile. Per-phase medians would
not sum to the total median, and a stacked chart whose segments do not add up to a number shown
elsewhere on the same dashboard is worse than no chart.

**Peak memory composition (mean, stacked)** is the memory counterpart, and it stacks by
**composition, not by phase** — deliberately. Time is additive, so phases stack; memory is a level,
so stacking eleven phases' peaks would draw ~40 GB that never existed at any instant. What
genuinely sums is the realms' JS heaps plus everything else = `ciAppFootprintBytes`, the private
footprint of the renderer processes. The gap is the finding: most of this app's memory is wasm
linear memory and native allocation, so optimizing a JS heap cannot move the memory number.

**The `Native / unattributed` band is mostly garbage, not native memory.** The segments and the
total are read at different points in the garbage collector's cycle: `readHeap` forces a three-pass
GC before every heap, wasm and backing-store reading, while `readProcessFootprint` asks for a
`light` dump with `deterministic: false`, which forces nothing. On Linux — where the nightly runs —
`private_footprint_bytes` tracked `RssAnon` to within a megabyte on every process of every run taken
here, so the total is whatever anonymous memory happened to be resident at the boundary and the band
absorbs every collectable byte between the two reads. (Read that as an observation, not an identity:
shared memory is accounted separately and these runs held little of it.) Measured against
`composer-app/scripts/memory/ledger.mjs`, whose footprint and allocator tree both come out of ONE
`deterministic: true` dump and are therefore the same instant, after the GC that dump forces:

| stage         | band, this harness | residual, post-GC ledger |
| ------------- | -----------------: | -----------------------: |
| boot          |       275 MB (66%) |               18 MB (6%) |
| open-tasks    |       290 MB (40%) |               10 MB (2%) |
| scroll-tasks  |       178 MB (29%) |                7 MB (1%) |
| edit-document |       283 MB (42%) |               25 MB (5%) |

So the genuinely unnamed part is single-digit percent — anonymous pages no dump provider claims
(PartitionAlloc's `<unspecified>`, malloc slack, thread stacks, V8's code range). File-backed
mappings are outside the metric by construction: the 17 MB of private-clean chrome binary a renderer
maps is in no band because `RssAnon` does not count it. Read the band as "garbage plus slack at the
boundary" until the footprint is read after the same GC the heaps are.

Two further caveats, both recorded in the tile's SQL. The footprint is read at each phase boundary
while a heap peak is that phase's maximum, and — per the paragraph above — the two are read under
different GC states, so the stack is not a decomposition of any total that existed at one instant:
read the footprint as the level and the segments as a lower bound on what is named within it. And the size of the gap is NOT what this file claimed before `ciPeakRssBytes` was
retired: that figure divided the heap into a sum of RSS over Chrome's whole process tree, which
multi-counts shared pages and included the browser, GPU and service processes. Read the ratio off
the tile rather than from any number written here.

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

### Peak DOM nodes is off the page

The insight still exists (`UXeKiR4q`) and `ciDomNodes` is still on every row — it is simply not a
tile. Earlier revisions of this file called it "the only machine-independent measure, read this one
for regressions"; that claim is gone rather than the tile being restored, because a dashboard is
not obliged to carry every field the harness records.

### No aggregate tile requires a COMPLETE iteration, and that is a defect

`writePosthogBatch` drops a failed stage, so an iteration that lost one publishes ten rows rather
than eleven. A run total summed over ten phases is smaller than one summed over eleven, and nothing
about the number says so — a partial iteration enters the distribution looking like a fast one and
drags the whole box down.

Earlier revisions of this file said each distribution and stacked query reduces an iteration only
if it has every stage (`HAVING count() = …` on the per-iteration group). **It does not, and no
version of the dashboard ever did.** All fifteen insights were read on 2026-09-18: not one carries
a `HAVING` clause or any other completeness filter, and the only literal count in their HogQL is
the `count() > 1` guard that keeps `stddevSamp` from returning NaN on a single-iteration night.

Two consequences follow, and both are live:

- A partial iteration is silently in every box, undersized by whatever its missing stages cost. The
  `stages` column of the runs table is the only place it is visible, which is why that column is
  worth reading before any other number on the page.
- A change to the STAGE SET moves every run total on the night it lands, because the totals sum
  whatever rows an iteration published rather than a fixed set. Adding `await-replication` is
  exactly that, so run totals do not compare across 2026-09-18.

Adding the gate is a dashboard edit rather than a repo one; until someone makes it, this section
describes what the tiles do rather than what they should do.

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
The flow has **eleven** stages and `writePosthogBatch` drops failed ones, so a row showing fewer
than eleven is a partial iteration whose totals are not comparable to a complete one — and since
nothing filters it out, that iteration is inside every box above. This table is where you catch it.

`await-replication` is the eleventh, added after the per-stage I/O spread was traced to setup: the
fixture's writes were still replicating through whichever stage happened to be running. Its own
columns are therefore setup's cost rather than the app's, and it is the one phase to read as an
absorber rather than a measurement — it is nonetheless summed into the run totals, so a run
compared across the change it was added in moves on every total.

## Two things to know before reading a tile

- **Tiles are dated by run, not by commit.** A nightly can run hours after the commit it measures,
  the same caveat the EDGE join-latency dashboard carries.
- **The timing tiles are trends, not absolutes.** Across a CI runner and a local sandbox wall time
  differs 1.7x and TBT 3x, so a number is comparable only to numbers from the same runner.
- **The box measures WITHIN-night noise, which is much smaller than night-to-night, so it is not
  the error bar the trend needs.** Measured on the first ten-iteration run (`0cb927f5`, 100 rows):
  the coefficient of variation across ten iterations of one run is **1.6%** on total wall time,
  2.9% CPU, 1.9% TBT, 3.1% peak RSS and **0.11%** DOM nodes. The same phases compared ACROSS runs
  move far more — `edit-document` spans 1,438-1,589 ms over four runs (~10%) against 1.2% inside
  one, and `boot` spans 3,720-4,219 ms (~13%) against 9.2% inside one.

  So a box being narrow says the harness is repeatable on one machine in one job; it does NOT say a
  night-to-night move of that size is meaningful. The between-night component — a different runner
  cell, a different bundle, a cold cache — is the larger term and no tile currently measures it.
  Two nights whose boxes do not overlap can still differ by less than the machine does.

  This corrects the figure this file carried before any of it was measured, "~20% run-to-run spread
  per stage". That number came from comparing separate runs and was then used to describe
  iterations, which are an order of magnitude tighter.

  What the box is NOT: mean +/- one sd is a description of the samples, not a confidence interval
  and not a hypothesis test. Overlapping boxes are not evidence that nothing regressed, and
  separated boxes do not establish that something did. Read overlap as "this movement is within
  what the harness sees night to night" and separation as "worth investigating", and if a decision
  actually rests on it, take more samples rather than reading more into these.
