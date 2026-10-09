# @dxos/perf-harness

Stage-scoped browser performance and memory instrumentation for e2e flows.

A flow is described once, in a `.mdl` QA test, and executed once, as a Playwright spec whose
`stage()` ids match that test's step ids. This package is the measuring half.

- Flows: [`composer-app/spec/PERF.mdl`](../../apps/composer-app/spec/PERF.mdl)
- Specs: `composer-app/src/playwright/perf-*.spec.ts`, task `composer-app:e2e-perf`
- Nightly: [`.depot/workflows/perf-nightly.yml`](../../../.depot/workflows/perf-nightly.yml)

## Two modes, never mixed

| Mode       | Instrumentation                   | Authoritative for            | Trended |
| ---------- | --------------------------------- | ---------------------------- | ------- |
| `measure`  | counter reads at boundaries only  | memory, wall time            | yes     |
| `diagnose` | V8 sampling profiler + screencast | hotspots, visible stalls     | no      |

The split is not caution, it is a measured effect, and a much larger one than "a few percent":

- An attached CDP client makes Blink retain response bodies, which reads as linear memory growth
  over a run — the finding `composer-app/scripts/memory/plain-soak.mjs` exists to control for.
- The screencast writes a PNG per frame, and the sampling profiler runs in every realm. On the
  `normal` tier's `open-tasks` (a 200-task render) that took the stage from **6.8s in `measure` to
  past a 60s timeout in `diagnose`** — an order of magnitude, not a constant bias.

So `diagnose` numbers are not comparable to `measure` numbers, and are not comparable to each
other across a change in instrumentation either. They exist to attribute a regression `measure`
has already detected, and nothing more. `writePosthogBatch` drops every non-`measure` row rather
than trusting a caller to remember.

## What each metric actually reads

| Metric                     | Source                                | Note |
| -------------------------- | ------------------------------------- | ---- |
| `cpuMsTotal`               | `SystemInfo.getProcessInfo` (browser) | The only reading covering the shared worker, GPU and browser process. A renderer-only number misleads for a DXOS flow, where the shared worker running ECHO is usually the dominant cost. |
| `thread.*`                 | `Performance.getMetrics` (page only — the domain does not exist on a worker) | `taskMs` is the envelope; the script/layout/recalcStyle split is what separates "the database is slow" from "the list re-renders every row". |
| `heap[]`                   | `Runtime.getHeapUsage` per target     | After a three-pass forced GC, per realm. |
| `appFootprintBytes`        | `memory-infra` light dump, renderers  | Private footprint of the renderers, which in this harness is the app. Includes wasm linear memory. Read at the stage boundary; the read costs ~100 ms. |
| `chromeFootprintBytes`     | the same dump, everything else        | Chrome's browser, GPU and service processes. Reported beside the app's figure so it is visible rather than folded in. |
| `domNodes`, `domListeners` | `Memory.getDOMCounters`               | The cheap leak canary, and the direct signal for a list that renders every row rather than a viewport. |
| `network.*`                | Playwright `response` events          | Classified code-load vs API. Content-length where present, body otherwise — the resource-timing buffer caps out on a graph this size. |
| `responsiveness.lag*`      | timer-drift probe, page AND workers   | The page-side Long Tasks API cannot see a blocked shared worker; the worker probe is pushed in over CDP. |
| `responsiveness.tbtMs`     | Long Tasks API                        | Not gated to a paint event: inside a stage, every long task blocks an interaction already made. |
| `stillFrame*`              | `Page.screencastFrame` timestamps     | `diagnose` only. The only measurement of what the SCREEN did. Same frames serve as the stage stills. |

## Work counters

Wall time and CPU move 10–30% run to run with the runner's load. Counts of work done do not: the
same render restyles the same elements on a fast machine and a slow one. These fields exist so a
budget can sit within a few percent of the measured value. Each is a delta over the stage unless
marked a level.

| Field (row → PostHog `ci…`)                         | Source                                            | Cost / switch |
| --------------------------------------------------- | ------------------------------------------------- | ------------- |
| `thread.layoutCount`, `recalcStyleCount`            | `Performance.getMetrics` (page)                   | free, always  |
| `thread.layoutObjects` (level), `taskOtherMs`, `devToolsCommandMs` | the same read                      | free, always  |
| `traceCounters.render.*` → `styleRecalcElements`, `layoutDirtyObjects`, `forcedLayouts`, … | a `devtools.timeline` trace per stage, cut at the stage marks | `trace`: opt-in, +7% wall / +10–15% CPU |
| `traceCounters.instructions[]` → `instructions*`, `instructionThreads` | `--enable-thread-instruction-count` deltas on the same trace | needs a PMU; see METRICS.md |
| `jsCalls[]` → `jsCalls*`, `jsCallsTotal`            | V8 precise coverage, `callCount: true`            | `calls`: opt-in, +12–29% wall |
| `react` → `reactCommits`, `reactRenders`, `reactMounts`, `reactWastedRenders` | React devtools global hook, installed by `installReactProbe` | `react`: on by default, +3–5% |
| `data.counters` → `sqlite*`, `automerge*`, `echo*`  | the app's `__dxosWorkCounters` and `__dxosSqliteIo` | free, always |
| `rpcCallsByMethod`                                  | `__dxosRpcTiming`'s per-method totals             | free, NDJSON only |
| `network.byEndpoint`, `network.socketFrames`        | Playwright `response` / `websocket` events        | free; endpoints NDJSON only |

`DX_PERF_COUNTERS` takes `all`, `none`, `default` (unset: `react` alone, the one cheap enough to
leave on — METRICS.md §"The work counters' cost"), or a list such as `trace,react`; every
row records the set as `comparability.counters`. A counter that did not run publishes no column,
so a missing column means "not measured" and a `0` means "no work". Per-stage breakdowns —
`<stage>-calls.json` (top functions by calls, per realm) and `<stage>-react.json` (top components
by renders, with wasted renders) — land in `artifacts/.../counters/`.

## Why raw CDP

Playwright's `newCDPSession` reaches the page and its dedicated workers, but **not a shared
worker** — where ECHO, automerge and the database live. So the harness launches chromium with
`--remote-debugging-port` and opens a websocket per target, the approach
`composer-app/scripts/memory/measure.mjs` arrived at first. `SystemInfo.getProcessInfo` is
browser-scoped and unreachable from a page session for the same reason.

## Comparing runs

Every row carries `comparability`, and a comparison that does not hold these constant is noise
(`composer-app/scripts/memory/README.md` §"Comparing runs"):

- **servingMode** — `vite serve` costs ~2.5x production on the main thread.
- **pluginSet** — a different set is a different app.
- **profileState** — a first run performs onboarding and loads a different module set.
- **settleMs** — modules keep arriving for ~3 minutes after ready.
- **instruments** — `profiler` or `profiler+screencast`, each with `+allocations` when
  `DX_PERF_ALLOC_SAMPLE=1`; no mode is bare, and a sampled run does not compare with an unsampled one.
- **snapshotStages** — present only when `DX_PERF_SNAPSHOTS` is set; every stage after a listed one
  is perturbed.
- **Playwright's own tracing**, which no row records. `playwright-perf.config.ts` sets `trace: 'off'`
  because `retain-on-failure` still RECORDS: the recorder's DOM snapshotter runs on the page's main
  thread and, on the 94k-node task list, took ~960 ms of the `reopen-project` stage — a third of
  that stage's TBT, spent by the instrument. Rows written before it was turned off therefore carry
  an inflated `tbtMs`/`wallMs` and do not compare with later ones.

Memory means four different things that differ by 3-5x (JS heap, snapshot self size, attributed
allocators, private footprint). The trended one is the renderers' private footprint, because it is
the app's own cost and it is a quantity: footprints are disjoint per process, so they can be added.

## Output

Written under `test-results/perf/`:

- `<flow>-<mode>-<scale>.rows.ndjson` — one row per stage, appended across runs.
- `<flow>-<mode>-<scale>.events.ndjson` — `measure` rows as PostHog events, for
  `node scripts/ci-event.mjs --batch`.
- `artifacts/<mode>-<scale>-<runId>/` — `.cpuprofile` per stage per realm, and each stage's first
  and last frame, plus one screenshot per stage. ~19 MB for a whole run. Never committed.
- `artifacts/.../snapshots/<checkpoint>/` — only with `DX_PERF_SNAPSHOTS` (stage ids, `idle` for
  the settled app before the fixture, or `end` for the app 10 s after the last stage, past the
  registry's idle TTL): a detailed memory-infra dump per process (`allocators.json`,
  raw `memory-infra.json`) and a `.heapsnapshot` per realm. Hundreds of MB. Every stage after a
  checkpoint inherits what the snapshot committed, so measure clean runs separately; rows carry
  `comparability.snapshotStages`. `composer-app/scripts/memory/perf-snapshot-report.mjs` reads it.
  A stage checkpoint also records the same dump and a per-realm heap read taken before the heap
  read's forced GC (`allocators-pre-gc.json`, `heap-pre-gc.json`): the difference is garbage and
  young-generation space the stage's footprint includes.
- `artifacts/.../allocations/` — only with `DX_PERF_ALLOC_SAMPLE=1`: a `.heapprofile` per realm
  from V8's sampling heap profiler, run from the fixture through `await-replication`, collected
  objects included. `composer-app/scripts/memory/alloc-report.mjs` names the code behind it.

`DX_PERF_JS_FLAGS` passes V8 flags to Chromium for an experiment, e.g.
`--max-semi-space-size=1` to cap the young generation. A run with flags is not comparable to one
without.

Running beside another worktree: `DX_PERF_PORT` serves the bundle on its own port (locally the
config reuses whatever already listens on 4173) and `DX_PERF_DEBUG_PORT` moves the CDP port.

## Did a change help? `pnpm perf`

The nightly answers whether main is healthy. `pnpm perf` (`src/cli/`) answers whether one change
helped, on a laptop shared with other worktrees.

```bash
pnpm perf doctor                              # ports, load, lock, tree; exit 4 if blocked
pnpm perf compare --base main --metric 'wall > boot'
pnpm perf compare --base HEAD                 # A/A: this machine's noise floor
pnpm perf run -n 3                            # the working tree, scored against the CI budgets
pnpm perf gate                                # the boot-graph budget CI gates every PR on
pnpm perf ledger                              # what this worktree measured before
```

`compare` builds both refs in this worktree (patching the clean tree to the base and back; bundles
are cached under `.perf/arms` by tree hash), then runs rounds: each round measures both arms back
to back, in a random order, on the same port. Two runs of one commit differ by ~20% per stage
(METRICS.md), while arms paired inside a round differ by a few percent, so pairing is what makes a
per-change verdict possible at all.

For each metric it reports the mean of the per-round differences, its Student-t interval and Cliff's
delta. A metric has **regressed** or **improved** only when the whole interval clears the threshold
and the effect is large, **no change** only when the whole interval sits inside the threshold, and
is **inconclusive** otherwise; three rounds is the least that decides anything. A counter that read
the same in every round of each arm is deterministic, and its difference needs no interval. The
exit code carries the verdict: 0 improved, 1 regressed, 2 no change, 3 inconclusive, 4 could not
measure.

The verdict rests on the target metrics: `--metric` patterns, or by default the work counters the
nightly budgets, since calibration kept only those that hold steady run to run. Targets share one 5%
chance of a false call (Bonferroni), so each extra target widens every interval and needs more
rounds. Name the one to three metrics a change is about. On this repo's A/A runs (both arms the same
tree), a percentile bootstrap called three of 45 unchanged counters regressions after six rounds;
the t-interval with the shared budget called none. Every other metric is listed only when it moved,
as a lead rather than a verdict.

Ports are derived from the worktree path and a machine-wide lock (`~/.cache/dxos-perf/measure.lock`)
runs one measurement at a time, so worktrees never measure each other. Before the first round,
compare waits for the load average to fall below the core count, since the build it just ran is
load the rounds would otherwise measure. Every run appends a row to `.perf/ledger.tsv`.

### Guardrails for an optimization loop

An agent asked to make a number smaller will, sooner or later, make the measurement smaller instead.
Telling it not to does not work, so the CLI makes it structural:

- `compare` voids its verdict (exit 4) when the harness differs between the two arms: the files
  listed under `harness` in `src/cli/targets.ts`, budgets and budget scripts included. A harness
  change is its own PR; `--allow-harness-change` measures anyway and says so in the output.
- `pnpm perf freeze` pins the harness for a loop. While frozen, the `guard-perf-harness.sh` hook
  refuses edits to those files, `score-perf.ts calibrate --write` refuses to rewrite budgets, and
  `compare` voids a verdict measured after the harness moved. `pnpm perf thaw` ends it.
- `--check '<command>'` must pass before anything is measured, so a change that breaks the app
  never reaches a timing.
- A work counter that fell by more than half is listed whatever the targets are: a stage that
  stopped doing its job wins on every timing.

### Where did the time go? `summarize` and `expand`

Every measured stage already writes a `.cpuprofile` per realm. `pnpm perf summarize [<run>]` reads
them for the newest run (or a named one) and prints about 30 lines: the functions with the most self
time, or, for a `compare` run, the functions whose self time changed most between the arms, averaged
per round. Frames are mapped back to source through each arm's own source maps, and worker realms
drop the chunk hash so the same worker lines up across two builds. Each row gets a handle;
`pnpm perf expand h3` prints that function's callers and callees, with the arm-to-arm change.

`compare` also uses the profiles to flag an implausible win: a stage timing that fell by more than
the changed files spent there at base. That is usually skipped work or a moved wait, not the change.

`pnpm perf run --snapshots idle,end` takes heap snapshots (they perturb every later stage), and
`pnpm perf summarize --heap` prints their composition through `scripts/memory/perf-snapshot-report.mjs`.
