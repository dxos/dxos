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
`renderer:<pid>` and cannot be split out from this field. Per-worker attribution needs
`Performance.getMetrics` per target (see [Gaps](#known-gaps)).

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

**Known weakness:** page and worker samples go into **one pooled distribution**, so `lagP95Ms` is not
attributable to a realm and gets diluted by whichever realm samples most. Per-realm lag would be
strictly better — see [Gaps](#known-gaps).

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

## Known gaps

Recorded here so nobody rediscovers them as bugs.

1. **Dedicated-worker CPU is not attributed.** It lands in `renderer:<pid>` with the page.
   `readThreadMetrics` is called for the page target only (`stage.ts`); the harness already attaches
   every realm, so calling it per target would give per-worker `taskMs`/`scriptMs`.
2. **No disk I/O.** Nothing in CDP reports read/write bytes; `Storage.getUsageAndQuota` gives a
   stored-bytes _level_, not operations. On Linux, `/proc/<pid>/io` gives `rchar`/`wchar` (syscall
   bytes), `syscr`/`syscw` (op counts) and `read_bytes`/`write_bytes` (block layer), which
   `readProcessTreeRss`'s existing tree walk could diff per stage. Caveats: Linux only, so a dev
   machine must report _unavailable_ rather than 0; `read_bytes` is post-page-cache, so hot SQLite
   pages appear in `rchar` but not `read_bytes`; and attribution is per process, not per subsystem —
   SQLite-level counters (pages read, WAL churn) would need instrumentation in our own VFS.
3. **Lag is pooled across realms**, as above.
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
