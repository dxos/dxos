# Metrics reference

Every field on a `StageRow`: what reads it, what it counts, what it does NOT count, and how to
read it. Canonical — the README summarises, this decides.

Each row is one stage of one flow in one mode. Everything here is a **stage delta** unless it says
otherwise: the harness reads a counter at both boundaries and reports the difference, so `cpuMsTotal`
is CPU spent _during_ that stage, not since boot.

Field names below match the JSON in `test-results/perf/<flow>-<mode>.rows.ndjson`.

## Identity and comparability

| Field                 | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flow`                | The flow id, e.g. `projects-tasks`. One `.mdl` `test` block.                                                                                                                                                                                                                                                                                                                                                              |
| `stage`, `stageIndex` | The stage id, matching the step `id:` in the flow's `.mdl` exactly. Renaming one means renaming both.                                                                                                                                                                                                                                                                                                                     |
| `mode`                | `measure` or `diagnose`. **Never compare across these** — see [Modes](#modes-and-why-timings-do-not-cross-them).                                                                                                                                                                                                                                                                                                          |
| `scale`               | The fixture shape, e.g. `tasks=200,depth=2,projects=1,docs=3x400`. The join key for a trend: if the fixture changes shape, the label changes and the trend visibly breaks rather than silently shifting.                                                                                                                                                                                                                  |
| `fixtureSize`         | Tasks actually created. Deliberately outside the `scale` join key, because a fixture that produces 199 of 200 tasks is still the same tier.                                                                                                                                                                                                                                                                               |
| `iteration`           | Which repeat of the flow this row is. Present for multi-sample runs; the nightly currently writes one iteration per mode.                                                                                                                                                                                                                                                                                                 |
| `ok`, `error`         | Whether the stage body completed. **A failed stage's `wallMs` is its timeout, not a measurement** — `writePosthogBatch` drops `ok: false` rows so a timeout can never enter a trend as a regression.                                                                                                                                                                                                                      |
| `comparability`       | Five things that change what every other number means: `servingMode` (`preview` over a production bundle vs `serve`, which costs ~2.5× on the main thread), `pluginSet`, `profileState` (`first-run` performs onboarding and loads a different module set), `settleMs`, and `instrumented`. Two rows that differ here are not comparable, whatever their stage ids say. Per `scripts/memory/README.md` §"Comparing runs". |

## Time

### `wallMs`

Wall-clock duration of the stage body, in milliseconds. The number a user would feel.

For a stage whose body waits on a locator, this includes the wait — which is the point, but also
the trap: a wait that expires reports the _timeout_ as the duration. That is why `ok` exists and why
a failed row is never trended. (This bit us once: a `waitForLoadState('networkidle')` in `open-space`
reported 60,676 ms because the app holds a websocket open and the network never idles. The real
figure was 553 ms.)

### `cpuMsTotal` and `cpuMsByProcess`

CPU milliseconds across **every Chrome process**, from `SystemInfo.getProcessInfo`.

This is the only reading that covers renderer, GPU, browser process, network service and the shared
worker together. It routinely exceeds `wallMs` several times over — that is correct, not a bug: four
processes each burning CPU for a second is 4,000 ms of CPU in 1,000 ms of wall.

`cpuMsByProcess` keys are `<type>:<pid>`, e.g. `renderer:5253`, `GPU:5208`. Read it when `cpuMsTotal`
moves and you need to know which process moved:

- **`renderer` dominant** → JS, style, layout, paint setup. Cross-check with `thread.*`.
- **`GPU` dominant** → compositing and raster. `scroll-tasks` shows 4,620 ms GPU against 42 ms of
  script; no amount of JS optimization touches that.
- **`browser` dominant** → IPC, storage, network orchestration. OPFS writes are proxied through
  this process, so disk-heavy stages show here rather than in the renderer.

**Caveat on workers.** A _shared_ worker gets its own process, so it is genuinely separated here. A
_dedicated_ worker runs as a thread inside the renderer process, so its CPU is folded into
`renderer:<pid>` and cannot be split out from this field. Use `cpuMsByRealm` for that.

### `cpuMsByRealm` — `diagnose` only

`{ kind, name, cpuMs, samples, idleSamples }` per realm, from the sampling profiler:
`cpuMs = (samples - idleSamples) x samplingInterval`.

Idle ticks are counted out because a profiler samples on a wall clock — a realm that slept through
a stage still produces a sample per interval, so raw sample count measures the stage's duration,
not its cost.

**The only instrument that reaches a worker.** `SystemInfo.getProcessInfo` folds a dedicated worker
into its renderer, and the `Performance` domain does not exist on a worker target at all
(`Performance.enable` answers `'Performance.enable' wasn't found` — verified, not assumed).

The reference run, whole flow: page 31,194 ms (55.4%, 29.2% idle), dedicated worker 13,944 ms
(24.7%, 62.6% idle), observability worker 11,201 ms (19.9%, 85.4% idle), coordinator shared worker
6 ms (100% idle). **Workers are 45% of JS CPU** — so the shared worker being idle says nothing
about worker cost generally, which is a mistake this field exists to prevent.

`boot` reads 0 for every realm: the profiler cannot attach before the page exists.

### `thread.*`

Blink's own attribution for the **page main thread**, from `Performance.getMetrics`.

| Field                             | Source metric         | Meaning                                                                                                         |
| --------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `taskMs`                          | `TaskDuration`        | Envelope: total time in tasks on this thread.                                                                   |
| `scriptMs`                        | `ScriptDuration`      | Executing JS.                                                                                                   |
| `layoutMs`                        | `LayoutDuration`      | Computing geometry.                                                                                             |
| `recalcStyleMs`                   | `RecalcStyleDuration` | Matching selectors and computing styles.                                                                        |
| `v8CompileMs`                     | `V8CompileDuration`   | Parsing/compiling JS. Non-zero mostly at boot.                                                                  |
| `threadTimeMs`                    | `ThreadTime`          | CPU on this thread, all of it.                                                                                  |
| `processTimeMs`                   | `ProcessTime`         | CPU across the whole renderer process, so it includes dedicated-worker threads.                                 |
| `layoutCount`, `recalcStyleCount` | counts                | How many times, not how long. A small count with a large duration is one expensive pass; the inverse is thrash. |

This split is the difference between "the database is slow" and "the list re-renders every row".
`open-tasks` is 6,961 ms script against 42 ms layout: the cost is JS, and no rendering change helps.

`processTimeMs − threadTimeMs` is a cheap lower bound on dedicated-worker CPU inside the renderer.

## Memory

**Four different quantities, differing by 3–5×.** Conflating them is the most common way to read
these rows wrongly. `scripts/memory/README.md` has the long version.

### `heap[]` — per realm, JS only

One entry per attached realm (page, each worker), each from `Runtime.getHeapUsage` after a
**three-pass forced GC** — one pass leaves `FinalizationRegistry` callbacks and `WeakRef` clears
pending, so a single collection under-reports what is actually garbage.

| Field           | Source                 | Meaning                                                                                                                             |
| --------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `usedBytes`     | `usedSize`             | Live JS objects. **Excludes wasm linear memory.**                                                                                   |
| `totalBytes`    | `totalSize`            | Heap capacity, including unused space V8 holds.                                                                                     |
| `backingBytes`  | `backingStorageSize`   | External backing stores — `ArrayBuffer`s and friends. **This is where wasm memory and automerge buffers become visible per realm.** |
| `embedderBytes` | `embedderHeapUsedSize` | Blink-side objects attributed to this realm (DOM, etc.).                                                                            |

The gap between the two matters. At `open-tasks` the dedicated worker holds **29 MB `usedBytes`
against 135 MB `backingBytes`** — the JS heap is small, the buffers are not.

`kind` is `page`, `worker` or `shared_worker`; `name` carries the script name, which is how you tell
the coordinator worker from the observability worker.

### `heapUsedTotalBytes`

Sum of `usedBytes` across realms. Convenient, and lossy: it hides which realm grew, and still
excludes wasm. Use `heap[]` when a number moves.

### `peakRssBytes` — the trended one

Peak resident set size over the browser **process tree**, sampled through the stage with `ps` so a
spike that is freed before the boundary still counts.

This is the trended memory figure for two reasons: it is what a user's machine actually feels, and
it is **the only number that counts wasm linear memory** — where automerge documents live, outside
every JS-heap reading and never returned to the OS.

Expect it to dwarf the heap. Our run: 1.2–2.3 GB RSS against an 87–323 MB JS heap.

**Linux/macOS only** (it shells out to `ps`).

### `domNodes`, `domListeners`, `domDocuments`

From `Memory.getDOMCounters`, for the renderer.

- **`domNodes`** — live DOM nodes. The direct signal for virtualization: a count that scales with
  the _data set_ rather than the _viewport_ means every row is rendered. 200 tasks produce 152,201
  nodes here, ~760 per task.
- **`domListeners`** — registered event listeners. Rises with nodes when each row wires its own
  handlers; a listener count rising _faster_ than nodes is usually a leak.
- **`domDocuments`** — live `Document` objects: the main document, every iframe, **and detached
  documents not yet collected**. A monotonically rising count across stages is a retained-document
  leak. Stable 9–11 is healthy; the 3 → 11 jump at `open-space` is the shell mounting iframes.

## Network

`network.*`, from Playwright `response` events. Content-length where the header is present, body
length otherwise — the resource-timing buffer caps out on a graph this size.

| Field                     | Meaning                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `codeBytes`               | JS/CSS/wasm module loads. Boot pulls 27 MB over 871 requests on a cold profile.                 |
| `apiBytes`                | Application traffic — the ECHO/edge calls.                                                      |
| `otherBytes`              | Everything else (images, fonts).                                                                |
| `requests`, `apiRequests` | Counts, so a stage making many small calls is distinguishable from one making a few large ones. |

Classified by URL and resource type in `collectors/network.ts`. The split exists because "the stage
got slower" has very different answers depending on whether it moved code or data.

## Responsiveness

Three fields measured by **two different instruments with different reach**. This is the section
most easily misread.

### `tbtMs`, `longTaskCount`, `longTaskMaxMs` — main thread only

From the **Long Tasks API** (`PerformanceObserver`, `longtask`), observed in the page.

- `longTaskCount` — tasks over 50 ms during the stage.
- `longTaskMaxMs` — the worst single one.
- `tbtMs` — total blocking time: `Σ (duration − 50 ms)` over those tasks. "How much time was the
  main thread blocked _beyond_ the responsiveness threshold."

Not gated to a paint event, unlike the web-vitals definition: inside a stage, every long task blocks
an interaction the user has already made.

`reopen-project`'s 3,267 ms TBT means roughly 3.3 s where input would not have been serviced.

**Reach: the page's main thread, nothing else.** A wedged worker is invisible here.

### `lagP95Ms`, `lagMaxMs` — every realm

From a **timer-drift probe**: a 16 ms `setInterval` records `actual − expected − 16` whenever the
overshoot exceeds an 8 ms floor (the floor keeps ordinary scheduler jitter out of a metric meant to
catch a blocked loop). Installed via `addInitScript` in the page **and pushed into every worker realm
over CDP**, because no page-side API can observe a blocked worker.

- `lagP95Ms` — 95th percentile, nearest-rank, of the pooled samples.
- `lagMaxMs` — the worst single sample.

### Reading them together

The two instruments disagreeing is informative, not contradictory:

| Pattern                        | Reading                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| High TBT, low `lagP95`         | Main thread badly blocked, but the pooled sample set is dominated by calm worker samples. `open-tasks`: TBT 1,459, p95 34. |
| `lagP95` ≈ `lagMax`, both high | Few samples and all bad — the stage was blocked throughout. `open-space`: 1,935 = 1,935.                                   |
| Low TBT, high `lagMax`         | Something outside the page's main thread blocked: a worker, or the process was descheduled.                                |

### `lagByRealm`

One entry per realm — `{ kind, name, p95Ms, maxMs, count }` — because the pooled percentile is not
attributable: page and worker samples in one distribution let whichever realm samples most dilute
the other, so a wedged worker could hide behind a calm page. `count: 0` means the realm stayed
responsive, not that the probe was missing.

Read this rather than `lagP95Ms` when a stall needs an owner. In the reference run every stall was
the page's: 298 page samples, worst p95 2,943 ms, and zero samples over the floor in any worker.

### `stillFrameMaxMs`, `stillFrameCount` — `diagnose` only

Inter-frame gaps from `Page.screencastFrame` timestamps: `stillFrameMaxMs` is the longest interval
during which the screen did not change, `stillFrameCount` how many such stalls occurred.

**The only metric here that measures what the SCREEN did** rather than what a thread did. A stage can
have healthy TBT and still show a 599 ms still frame, which is precisely the symptom a user reports.
Read it on scroll stages above all.

The same frames are written as the stage stills (`<stage>-first.png`, `<stage>-last.png`), so the
number and the picture come from one source.

## Modes, and why timings do not cross them

`measure` reads counters at stage boundaries only. It is the **sole mode trended**.

`diagnose` adds a per-realm V8 sampling profiler and a screencast, and produces artifacts
(`.cpuprofile` per realm, stage stills) that are never trended.

The separation is not fastidiousness, it is a measured effect:

- An attached CDP client makes Blink **retain response bodies**, which reads as linear memory growth
  (the finding `scripts/memory/plain-soak.mjs` controls for). So the memory-authoritative run cannot
  be the profiled one.
- Instrumentation is not a small tax. It took `open-tasks` from **6.8 s in `measure` to 15.2 s in
  `diagnose`**, having first blown a 60 s budget outright. `diagnose` therefore gets a 300 s locator
  budget, and its timings are meaningless next to `measure`'s.

`writePosthogBatch` drops every non-`measure` row rather than trusting a caller to remember, and
`toPosthogEvent` throws on one.

## Instrument cost, measured

One sample per configuration of the same flow, whole-flow wall time:

| configuration                          | wall      | vs `measure`      |
| -------------------------------------- | --------- | ----------------- |
| `measure` (no instruments)             | 36,887 ms | —                 |
| profiler only (`DX_PERF_SCREENCAST=0`) | 37,840 ms | +953 ms (+2.6%)   |
| `diagnose` (profiler + screencast)     | 54,335 ms | +17,448 ms (+47%) |

**The screencast is the whole cost; the profiler is close to free.** +2.6% sits below the
run-to-run noise documented under [Known gaps](#known-gaps) — `open-tasks` came out _faster_ in the
profiler-only run (4,976 ms vs 7,833 ms), which is noise, not an improvement. So the profiler's
overhead is not measurable with one sample, while the screencast's is far outside noise.

Why the screencast costs what it does: `Page.startScreencast` makes Chrome encode a JPEG per frame,
ship it over the CDP websocket, and wait for a `Page.screencastFrameAck` before the next one —
thousands of encode-and-transport round trips competing with the rendering being measured.

This is the evidence for making the profiler always-on, which would turn `cpuMsByRealm` into a
trended metric. Not done: one sample cannot distinguish +2.6% from 0%, so that change wants 3-5
samples per configuration first.

## Known gaps

Recorded here so nobody rediscovers them as bugs.

1. **Worker CPU is `diagnose`-only.** `cpuMsByRealm` needs the profiler, so a `measure` row carries
   no worker attribution. `Performance.getMetrics` cannot substitute: `Performance.enable` answers
   `'Performance.enable' wasn't found` on every worker target, which is why `threadByRealm` covers
   only realms that have the domain (the page, today). See **Instrument cost** for why always-on
   profiling looks affordable.
2. **No disk I/O.** Nothing in CDP reports read/write bytes; `Storage.getUsageAndQuota` gives a
   stored-bytes _level_, not operations. `/proc/<pid>/io` exists on Linux but counts the browser's
   own traffic alongside ours, so an attributable measurement has to come from the storage layer.
   The OPFS VFS is `AccessHandlePoolVFS` from `@dxos/wa-sqlite` — vendored, not ours — but it is
   registered in one place we own (`sql-sqlite/src/internal/opfs-client.ts`, `AccessHandlePoolVFS.create`
   then `vfs_register`), and its `jRead`/`jWrite`/`jTruncate`/`jSync` carry the byte count and
   offset, so a wrapper there would give bytes and ops attributable to SQLite rather than to Chrome.
   It runs in the DEDICATED worker (`worker-runtime.ts`'s `LocalSqliteOpfsLayer`), not the shared
   one, and node uses native SQLite with no JS VFS, so the instrument is browser-only. Nothing
   counts VFS operations today — the existing instrumentation there is per-SQL-statement
   (`recordSqliteQueryMetrics`, plus a slow-query log above 20 ms), a different granularity.
3. ~~Lag is pooled across realms.~~ Done: `lagByRealm` reports p95, max and sample count per realm.
   The pooled `lagP95Ms`/`lagMaxMs` remain, and remain the weaker reading.
4. **`backingBytes` is recorded but not surfaced** in the report tables, which is where wasm memory
   would be visible per realm.
5. **One iteration per mode.** `open-tasks` has moved 9,172 → 6,803 → 7,833 ms across runs (~26%
   spread), so separating a regression from noise needs several samples. `iteration` is on every row;
   the nightly does not yet use it.
6. **`boot` carries no profile** in either mode: there is no target to attach to until the page
   exists, so boot-time attribution belongs to the startup harness, not this one.

## Where the numbers go

- `test-results/perf/<flow>-<mode>.rows.ndjson` — every row, one JSON object per line.
- `test-results/perf/<flow>-<mode>-<runId>.json` — the per-run report.
- `test-results/perf/<flow>-<mode>.events.ndjson` — PostHog batch, `measure` and `ok` rows only.
  Event name `ci.perf-stage`; the dedup key is `<flow>:<scale>:<stage>:<iteration>` through a uuidV5,
  so re-running a stage updates its event rather than duplicating it.
- `test-results/perf/artifacts/<mode>-<runId>/` — `diagnose` profiles and stills. Never committed: a
  profiled run's output runs to hundreds of MB.
