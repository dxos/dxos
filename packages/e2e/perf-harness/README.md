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
- **instruments** — `profiler` or `profiler+screencast`; neither mode is bare.
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
