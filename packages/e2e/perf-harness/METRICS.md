# Metrics reference

Every field on a `StageRow`: what reads it, what it counts, what it does NOT count, and how to
read it. Canonical — the README summarises, this decides.

Each row is one stage of one flow in one mode. Everything here is a **stage delta** unless it says
otherwise: the harness reads a counter at both boundaries and reports the difference, so `cpuMsTotal`
is CPU spent _during_ that stage, not since boot.

Field names below match the JSON in `test-results/perf/<flow>-<mode>.rows.ndjson`.

## Identity and comparability

| Field                 | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flow`                | The flow id, e.g. `projects-tasks`. One `.mdl` `test` block.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `stage`, `stageIndex` | The stage id, matching the step `id:` in the flow's `.mdl` exactly. Renaming one means renaming both.                                                                                                                                                                                                                                                                                                                                                                                 |
| `mode`                | `measure` or `diagnose`. **Never compare across these** — see [Modes](#modes-and-why-timings-do-not-cross-them).                                                                                                                                                                                                                                                                                                                                                                      |
| `scale`               | The fixture shape, e.g. `tasks=200,depth=2,projects=1,docs=3x400`. The join key for a trend: if the fixture changes shape, the label changes and the trend visibly breaks rather than silently shifting.                                                                                                                                                                                                                                                                              |
| `fixtureSize`         | Tasks actually created. Deliberately outside the `scale` join key, because a fixture that produces 199 of 200 tasks is still the same tier.                                                                                                                                                                                                                                                                                                                                           |
| `iteration`           | Which repeat of the flow this row is, zero-based. The nightly runs 10 per mode (`DX_PERF_ITERATIONS`), each a fresh browser and fixture, so a stage's tiles have a distribution to take a median over rather than one sample.                                                                                                                                                                                                                                                         |
| `ok`, `error`         | Whether the stage body completed. **A failed stage's `wallMs` is its timeout, not a measurement** — `writePosthogBatch` drops `ok: false` rows so a timeout can never enter a trend as a regression.                                                                                                                                                                                                                                                                                  |
| `comparability`       | Five things that change what every other number means: `servingMode` (`preview` over a production bundle vs `serve`, which costs ~2.5× on the main thread), `pluginSet`, `profileState` (`first-run` performs onboarding and loads a different module set), `settleMs`, and `instruments` (`profiler` or `profiler+screencast` — neither mode is bare). Two rows that differ here are not comparable, whatever their stage ids say. Per `scripts/memory/README.md` §"Comparing runs". |

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

### `cpuMsByRealm`

`{ kind, name, cpuMs, samples, idleSamples }` per realm, from the sampling profiler:
`cpuMs = (samples - idleSamples) x samplingInterval`.

**Present in both modes and trended**, as `cpuMsTab`, `cpuMsWorkers` and one fixed column per realm
kind (`cpuMsTab`, `cpuMsWorker`, `cpuMsSharedWorker`, `cpuMsServiceWorker`). The columns are keyed
by KIND, not by the target's script name: a name-keyed column minted a new series on every bundle
rename and left the old one flat. All four are always present, `0` meaning the realm was absent or
idle, so a chart series never gaps. The profiler runs always, and both modes keep the profiles — a whole run's artifacts are
~19 MB (see [Instrument cost](#instrument-cost-measured)). `boot` is the exception: no profiler
target exists before the page, so that row carries no `cpuMsByRealm` at all.

Idle ticks are counted out because a profiler samples on a wall clock — a realm that slept through
a stage still produces a sample per interval, so raw sample count measures the stage's duration,
not its cost. **Only `(idle)` is idle.** `(program)` is V8's bucket for work it could not attribute
to a script (native code, compilation, an external callback) and `(garbage collector)` is a realm
collecting; both count. Treating `(program)` as idle understated CPU by ~2.0 s of a measured run.

**The only instrument that reaches a worker.** `SystemInfo.getProcessInfo` folds a dedicated worker
into its renderer, and the `Performance` domain does not exist on a worker target at all
(`Performance.enable` answers `'Performance.enable' wasn't found` — verified, not assumed).

The reference run, whole flow: page 31,194 ms (55.4%, 29.2% idle), dedicated worker 13,944 ms
(24.7%, 62.6% idle), observability worker 11,201 ms (19.9%, 85.4% idle), coordinator shared worker
6 ms (100% idle). **Workers are 45% of JS CPU** — so the shared worker being idle says nothing
about worker cost generally, which is a mistake this field exists to prevent.

`boot` reads 0 for every realm: the profiler cannot attach before the page exists.

### `tracedCpuMsByRealm` — boot only

Per-realm TASK TIME for the `boot` stage, from a browser-wide CDP trace rather than the profiler.
It exists because `boot` is the one stage `cpuMsByRealm` cannot cover: there is no target to attach
a profiler to until the page exists, so boot-time worker cost is otherwise unattributed.

Note the semantics differ from `cpuMsByRealm`: this is time spent INSIDE tasks on a thread (what
`Performance.getMetrics` calls `TaskDuration`), not sampled CPU. A thread parked inside a task
waiting on I/O counts as busy here and idle there, so the two agree for a JS-bound realm and
diverge for one that blocks.

**Boot only, because that is all a trace can deliver.** At `toplevel` granularity boot alone emits
~35,000 tasks and fills Chrome's trace buffer, after which recording stops silently. A whole-run
trace measured 53.6 MB gzipped / 806 MB uncompressed and contained `perf-stage:boot:begin|end` and
**not one mark** from the nine stages that followed. The trace is therefore ended as soon as `boot`
closes, and every later stage belongs to the profiler.

Reading it is two streaming passes over the gzipped file — 18 s and ~190 MB of RSS for that 806 MB
trace. `readTrace(file)` is exported, so a saved `trace.json.gz` artifact can be re-read offline
without reproducing the run.

A measured boot, for scale: page 4,408 ms across 34,919 tasks, three dedicated workers at 2,773 /
362 / 175 ms, shared worker 58 ms.

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

| Field           | Source                 | Meaning                                                                                                    |
| --------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `usedBytes`     | `usedSize`             | Live JS objects. **Excludes wasm linear memory.**                                                          |
| `totalBytes`    | `totalSize`            | Heap capacity, including unused space V8 holds.                                                            |
| `backingBytes`  | `backingStorageSize`   | External backing stores — `ArrayBuffer`s and friends, which is where automerge's buffers sit.              |
| `embedderBytes` | `embedderHeapUsedSize` | Blink-side objects attributed to this realm (DOM, etc.).                                                   |
| `wasmBytes`     | `@dxos/util` probe     | Wasm linear memory this realm holds — automerge, subduction and SQLite. Counted by nothing else per realm. |
| `wasmInstances` | `@dxos/util` probe     | Memories counted. The integrity column: absent fields mean an uninstrumented realm, `0` means no wasm.     |

The gap between the two matters. At `open-tasks` the dedicated worker holds **29 MB `usedBytes`
against 135 MB `backingBytes`** — the JS heap is small, the buffers are not.

`wasmBytes` comes from `installWasmMemoryProbe()` (`@dxos/util`), which wraps
`WebAssembly.instantiate`/`instantiateStreaming` and keeps a weak set of every memory an instance
exports or imports. The app calls it at the top of `initAutomergeWasm()`, which every realm that
runs wasm awaits before its first module — including the dedicated worker, where it precedes the
runtime that opens SQLite. **A module compiled before the probe is installed is invisible to it**,
which is what `wasmInstances` exists to make visible: a realm that reports fewer memories than it
should has had its initialization reordered.

`wasmBytesTotal` sums the EXCLUSIVE bytes only. A `SharedArrayBuffer`-backed memory is visible in
every realm it was posted to and nothing in the readings identifies one allocation across realms,
so a deduplicated cross-realm total cannot be computed from them — `wasmSharedBytesSum` is the
shared subtotal summed over realms, an upper bound rather than a union. Read it beside the total
rather than adding the two.

`kind` is `page`, `worker` or `shared_worker`; `name` carries the script name, which is how you tell
the coordinator worker from the observability worker.

### The disjoint set, and what not to stack

Four per-realm columns partition a realm's memory and can be stacked without double counting:

| column                     | what it holds                                                                  |
| -------------------------- | ------------------------------------------------------------------------------ |
| `heapUsedBytes*`           | live JS objects                                                                |
| `wasmBytes*`               | wasm linear memory, committed                                                  |
| `heapBackingNonWasmBytes*` | external backing stores that are NOT wasm — `ArrayBuffer`s and friends         |
| `embedderBytes*`           | Blink-side objects attributed to the realm: DOM nodes, listeners, the document |

`heapBackingBytes*` is the RAW reading and is **not** in that set: `backingStorageSize` counts wasm
linear memory and `ArrayBuffer`s alike, so stacking it beside `wasmBytes` draws every wasm byte
twice. It is published because it is the cross-check that validated the probe — on a real boot the
worker read 31,949,677 backing against 23,396,352 wasm, and the difference is its non-wasm buffers.

`wasmBytes*` is split by library into `wasmAutomergeBytes*`, `wasmSubductionBytes*`,
`wasmSqliteBytes*` and `wasmOtherBytes*`, which partition it exactly. The classifier keys on the
`.wasm` module's own filename rather than the chunk that created it, because a chunk name carries a
content hash and changes on every build. **It tests subduction before automerge**: subduction ships
as `automerge_subduction_wasm_bg.wasm`, so the other order reports all of it as automerge.

### `heapUsedTotalBytes`

Sum of `usedBytes` across realms. Convenient, and lossy: it hides which realm grew, and still
excludes wasm — `wasmBytesTotal` is the companion column. Use `heap[]` when a number moves.

### `appFootprintBytes` — the trended one

`footprintProcesses` is its integrity column, the role `sqliteRealms` plays for disk: the dump can
fail or be pre-empted by another trace, and a failed read yields no processes — which sums to zero
bytes and is otherwise indistinguishable from an app holding no memory. Zero processes means the
row's footprints are ABSENT, not measured.

Private footprint of the **renderer** processes at the stage's end, from a `light` memory-infra
dump. It counts wasm linear memory, where automerge documents live, outside every JS-heap reading
and never returned to the OS.

It replaced a peak of `ps` RSS summed over the browser's process tree, which was not a quantity.
Every process's RSS counts the shared pages it maps, so the sum multi-counts: an empty headless
Chromium sums to 1,335 MB that way against 408 MB of actual footprint. Private footprints are
disjoint per process, which is what makes adding the renderers legitimate.

It is the figure closest to what a user's machine feels, and it counts wasm linear memory, which no
JS-heap column does. It cannot ATTRIBUTE that memory: a dedicated worker is allocated in its
creating context's renderer and a shared worker takes the creator's `SiteInstance`, so no
process-level reading can separate ECHO's worker from the tab that spawned it. `wasmBytes` and
`heapBackingBytes` are the per-realm answers; this is the whole-app one.

Renderers only, by Chrome's own process name. The browser, GPU and service processes measured
218 MB in a probe — Chrome's cost, not the app's — and they are reported separately as
`chromeFootprintBytes` rather than hidden in the total. `Extension Renderer` and
`WebUI Top Renderer` carry their own names and are excluded with them.

A boundary read rather than a sampler: memory-infra delivers through the tracing stream, so each
reading starts and ends a short trace around one dump, measured at 93-131 ms. A `light` dump costs
19-24 ms against `detailed`'s 122 ms and carries `process_totals`, which is all this reads.

`boot` is the exception. CDP records one trace at a time and the CPU trace is still running when
boot's boundary arrives, so boot's reading is backfilled once that trace ends — a few seconds late,
by the same offset every run.

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

`network.*`, from two sources. Everything but the socket fields comes from Playwright `response`
events — content-length where the header is present, body length otherwise, since the
resource-timing buffer caps out on a graph this size. `edgeSocketBytes` and `edgeSocketFrames` come
from `page.on('websocket')` frame callbacks instead, because a socket emits no further responses.

| Field                     | Meaning                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `codeBytes`               | JS/CSS/wasm module loads. Boot pulls 27 MB over 871 requests on a cold profile.                  |
| `apiBytes`                | The whole API bucket — analytics and third parties included, not the edge alone.                 |
| `otherBytes`              | Everything else (images, fonts).                                                                 |
| `requests`, `apiRequests` | Counts, so a stage making many small calls is distinguishable from one making a few large ones.  |
| `edgeApiBytes`            | `fetch`/`xhr` bytes to the EDGE hosts alone — `apiBytes` counts analytics and third parties too. |
| `edgeApiRequests`         | Same population as `edgeApiBytes`: `fetch`/`xhr` only, so a socket handshake is not a call.      |
| `edgeSocketBytes`         | WebSocket FRAME bytes to the edge, both directions. Most of the backend traffic lives here.      |
| `edgeSocketFrames`        | Frame count, so a chatty sync is distinguishable from a bulky one.                               |
| `edgeBytes`               | `edgeApiBytes + edgeSocketBytes` — what the app costs its own backend. The trended figure.       |
| `analyticsBytes`          | Telemetry, recorded separately so the edge columns are auditable rather than merely asserted.    |

Classified by URL and resource type in `collectors/network.ts`. The split exists because "the stage
got slower" has very different answers depending on whether it moved code or data.

`apiBytes` and `apiRequests` are kept for continuity and are the WIDER measure: any host, analytics
included, and a socket handshake counted as a request. The `edge*` fields are the narrow ones, and
they are what the dashboard trends. The socket half exists at all because a WebSocket emits exactly
one `response` — the 101, with an empty body — so before `page.on('websocket')` the four
data-syncing stages of the flow recorded zero bytes and zero requests.

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

Read this rather than `lagP95Ms` when a stall needs an owner. A measured run shows the dedicated
worker stalling 2.0 s in `await-replication` and 344 ms in `edit-document`, neither of which any
page-side metric sees.

**`boot` reports no worker samples and cannot.** The worker realms are created BY that stage, so
nothing exists to probe at its opening boundary; catching them would need browser-level
`Target.setAutoAttach` with `waitForDebuggerOnStart`. Every later stage is covered.

**Read `count` before believing a zero.** Every worker lag column read zero for weeks on rows that
also showed the dedicated workers burning 1,464 ms of CPU in `edit-document`, and nothing published
said whether the probe had produced anything. It was the probe: the drain expression defines
`globalThis.__perfLag`, and the installer's idempotence guard tested that same array, so a realm
first drained at the closing boundary of the stage that created it answered `present` for the rest
of the run with no interval ever armed. The guard is now a separate `__perfLagArmed` marker. Those
zeros were an instrument reading its own absence, which is why `lagSamples{Tab,Worker,…}` is
trended — it is to the drift probe what `sqliteRealms` is to the disk counters.

### `rpc[]` — lag measured from real traffic

One entry per realm, from the app's own RPC timing middleware
(`RpcTiming` in `@dxos/worker-framework`) rather than from a probe the harness installs. The
middleware stamps a send timestamp on every outbound call and the server derives two quantities
from it; the client records a third.

| Field                              | Measured in           | Meaning                                                                                                                                                    |
| ---------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `calls`                            | the realm that SERVED | Requests dispatched here during the stage, from the running total's difference.                                                                            |
| `queueWaitP95Ms`, `queueWaitMaxMs` | the realm that SERVED | How long a request sat before this event loop picked it up. **This is the realm's responsiveness**, measured by the traffic a user is actually waiting on. |
| `serviceMaxMs`                     | the realm that SERVED | Worst handler duration.                                                                                                                                    |
| `clientCalls`                      | the realm that ISSUED | Requests this realm sent.                                                                                                                                  |
| `roundTripP95Ms`, `roundTripMaxMs` | the realm that ISSUED | Send to settle, including the transport in both directions.                                                                                                |
| `samples`, `clientSamples`         | both                  | How many samples the percentiles cover.                                                                                                                    |

**Round trip is not the other two added up**, and the gap is the point: a worker reporting 2 ms of
queue wait and 3 ms of service while the tab waited 400 ms says the time went somewhere neither
column covers. Queue wait is the complement to `lagByRealm` — same quantity, different instrument,
and this one cannot silently produce nothing while the app is working, because it is driven by the
app's own calls.

`samples` is the integrity column. The middleware keeps a bounded ring (100 entries), so a stage
serving more calls than it holds reports a percentile over the stage's TAIL; `rpcCallsTotal` above
`rpcSamples` in the trended columns is what says so. A realm that published no counters at all is
absent from the array entirely, which `rpcRealms` counts.

### `latency` — prompt to model request

How long the app holds a chat turn's input before asking the model, joined from every realm's
work marks (`markWork` in `@dxos/util`): User Timing marks named `dxos:<name>`, which also show on the
DevTools Timings track. The harness reads each realm's marks with `performance.getEntriesByType` and
places them at `performance.timeOrigin + startTime`, so a mark taken in a worker compares with one
taken in the tab, which `startTime` alone does not allow. `chat.submit` is taken by the chat UI;
`ai.request` and `ai.response` by `@dxos/ai` around every model call, for the scripted model and
HTTP providers alike. The calls offering a toolkit are the agent's turns.

| Field               | Trended as                         | Meaning                                                                                       |
| ------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `submitToRequestMs` | `submitToRequest{P50,Max,Count}Ms` | A user submit to the first agent request it caused.                                           |
| `turnToRequestMs`   | `turnToRequest{P50,Max,Count}Ms`   | The end of one agent response to the next request: tool calls, their writes, context rebuild. |
| `submitPath`        | NDJSON only                        | Every mark between the first submit and its request, in ms since the submit.                  |
| `turnPath`          | NDJSON only                        | Each mark's median offset into the later turns.                                               |
| `realms`            | `markRealms`                       | Realms that wrote any work mark; `0` means nothing was instrumented.                          |

The paths are how a regression is attributed: the marks name the hops from the UI handler through
the agent process waking, history and context assembly, to the request. The row is absent from a
stage that made no model request.

### `stillFrameMaxMs`, `stillFrameCount` — `diagnose` only

Inter-frame gaps from `Page.screencastFrame` timestamps: `stillFrameMaxMs` is the longest interval
during which the screen did not change, `stillFrameCount` how many such stalls occurred.

**The only metric here that measures what the SCREEN did** rather than what a thread did. A stage can
have healthy TBT and still show a 599 ms still frame, which is precisely the symptom a user reports.
Read it on scroll stages above all.

The same frames are written as the stage stills (`<stage>-first.png`, `<stage>-last.png`), so the
number and the picture come from one source.

## Modes, and why timings do not cross them

`measure` reads counters at stage boundaries and runs the sampling profiler for `cpuMsByRealm`,
**keeping its profiles** — a `measure` run writes a `.cpuprofile` per realm per stage and a still
per stage, same as `diagnose`. It is the **sole mode trended**. The `measure (no instruments)` row
in the cost table below is a no-profiler baseline for comparison, not how `measure` is configured.

`diagnose` adds the screencast on top, and its stills come from screencast frames rather than
one-off captures.

The line between them is the screencast, not instrumentation in general.

**`diagnose` is for an agent investigating a regression, run on demand and locally. The scheduled
nightly never runs it** — it defaults to `measure`, though a manual `workflow_dispatch` can ask for
`diagnose` explicitly, which is the one way it reaches a runner — and an untested one.

Its output is evidence to read — a flame chart per realm per stage, a still of what the screen
showed, a frame-gap figure — not a number to trend, and its timings are incomparable to the trend by
construction. Reach for it when a tile has moved and the question is _why_:

```bash
DX_PERF_MODES=diagnose moon run composer-app:e2e-perf
# artifacts land in test-results/perf/artifacts/diagnose-<runId>/
#   <stage>-<realm>.cpuprofile   import into Chrome DevTools -> Performance -> Load profile
#   stages/<stage>.png           what the screen showed at the end of each stage
```

`DX_PERF_SCREENCAST=0` keeps the profiles but drops the screencast, which is the middle setting
worth knowing: it removes the mode's dominant cost when the question is CPU rather than what the
screen did.

The separation is not fastidiousness, it is a measured effect:

- An attached CDP client makes Blink **retain response bodies**, which reads as linear memory growth
  (the finding `scripts/memory/plain-soak.mjs` controls for). So the memory-authoritative run cannot
  be the profiled one.
- The screencast is not a small tax. It took `open-tasks` from **6.8 s to past 60 s**, blowing that
  budget outright, which is why `diagnose` gets a 300 s locator budget and its timings are
  meaningless next to `measure`'s. The profiler is the opposite — +2.6%, below noise — which is why
  it runs in both.

`writePosthogBatch` drops every non-`measure` row rather than trusting a caller to remember, and
`toPosthogEvent` throws on one.

## Work counters

Counts of work done, for budgets that sit within a few percent of the measured value. Wall time and
CPU move 10–30% between runs with the runner's load; a count moves only when the code does more
or less work. Each is a delta over the stage unless marked a level. The costed ones run per
`DX_PERF_COUNTERS` (`trace`, `calls`, `react`; recorded as `comparability.counters`), and a counter
that did not run leaves its fields absent rather than zero.

### `thread.layoutCount`, `recalcStyleCount`, `layoutObjects` — free

The counts `Performance.getMetrics` was already returning, now published. `layoutObjects` is a
level, the size of the render tree at the stage's end. `devToolsCommandMs` is the time the tab
spent answering CDP: the harness's own cost, published so a jump in it is attributable.

### `traceCounters` — a trace per stage (`trace`)

Chrome records one trace at a time. The boot trace (`startTracing`, `counters: true`) carries
`devtools.timeline` so `boot` gets the counts from it; every other stage gets its own short trace,
started before the opening boundary and stopped before the footprint read (which needs the tracing
slot itself). Only events between the stage's `perf-stage:` marks count, so the harness's own
boundary reads do not.

- `render.styleRecalcs` / `styleRecalcElements` — `UpdateLayoutTree` events and the summed
  `elementCount`: how much styling the stage invalidated.
- `render.layouts` / `layoutDirtyObjects` — `Layout` events and the summed `dirtyObjects`.
- `render.forcedLayouts` — `Layout` events nested inside a script event (`FunctionCall`,
  `EventDispatch`, `TimerFire`, `FireAnimationFrame`, `RunMicrotasks`, …) on the same thread:
  script read geometry it had invalidated. A virtualized list that measures its rows in a scroll
  handler shows up here as one forced layout per scroll step.
- `instructions[]` — instructions retired per realm kind, summed over the OUTERMOST `toplevel`
  tasks' `tidelta` (nested ones carry their own delta and would double count). `threads` is the
  integrity column.
- `events`, `dataLoss` — how many events the pass read, and whether Chrome reported dropping any;
  with `dataLoss` every count is a lower bound.

Task time from the same pass (`tracedCpuMsByRealm`) counts only `toplevel` events, so adding
`devtools.timeline` to the boot trace does not inflate it.

### `jsCalls[]` — V8 precise coverage (`calls`)

`Profiler.startPreciseCoverage({ callCount: true, detailed: false })` in every attached realm,
left on across stages; `takePreciseCoverage` zeroes the counters as it reads them, so each stage
reads once at its start (discarded) and once at its end. `calls` is the sum of every function's
invocation count, exact rather than sampled; `functions` is how many distinct functions ran.
`<stage>-calls.json` lists the top 50 per realm with script and offset. A realm that appears
mid-stage is not counted until the next stage, which is why `boot` has the page alone.

### `react` — the devtools global hook (`react`)

`installReactProbe` defines `__REACT_DEVTOOLS_GLOBAL_HOOK__` from an init script, before React
loads; `react-dom` injects into it and calls `onCommitFiberRoot` after every commit. Per commit
the probe visits only the fibers that rendered: React sets `PerformedWork` on a component whose
render ran and bubbles it into `subtreeFlags` only along paths that were not bailed out.

- `commits` — React commits. `renders` — component renders (function, class, `forwardRef`, `memo`).
- `mounts` — renders with no previous fiber.
- `wastedRenders` — re-renders whose props were shallow-equal to the previous ones and whose
  stateful hooks and context values were identical: renders `memo` would have skipped. Effects and
  memos rebuild their cells every render, so only hooks with an update queue are compared.

`<stage>-react.json` lists the top 50 components by renders. Production bundles minify component
names, so `projects-tasks` (`vite preview`) names fewer components than `assistant-chat`
(storybook dev); the totals are unaffected.

### `data` — the app's probes (free)

`countWork(name, by)` in `@dxos/util` adds to a running total published as `__dxosWorkCounters`;
the SQLite counters extend `__dxosSqliteIo`. Both are read in every realm at the boundaries the
harness already crosses and summed over realms, keyed by name:

- `sqlite.*` — statements by leading keyword, rows returned, rows changed (`sqlite3_changes`, read
  after writes only), statement errors, and page-cache hits and misses sampled from
  `sqlite3_db_status` when the counters are read rather than per statement.
- `automerge.*` — storage-adapter chunk saves by automerge-repo kind (snapshot, incremental,
  sync-state) and bytes, chunk and range loads and bytes, removes; documents leased into and
  evicted from the host's repo; mutations applied from and sent to clients by the documents
  synchronizer, with bytes.
- `echo.*` — host query executions and the result batches and rows sent; client one-shot runs,
  reactive recomputes, the objects they presented, and the subscriber callbacks fired; index
  passes and the objects indexed.

`rpcCallsByMethod` is the served-call count per Effect RPC method (`rpc._tag`), from the timing
middleware. It has no byte counts: page↔worker messages are structured-cloned with no
serialization step to measure, and walking every payload to estimate one would cost more than the
call. `network.byEndpoint` groups requests, bytes and socket frames by host and first path segment.

### Scoring them

`src/score/stages.ts` scores a counter per stage as `<counter> > <stage>` (`reactRenders >
assistant-turns`), the shape `wall > <stage>` has, so the heatmap splits the stage and the counter
from the id without knowing about counters. They roll up into a `work` group (`busy work` for the
chat flow's busy space), so a work regression moves the suite score as one group rather than being
diluted into the timings.

- `DEFAULT_WORK_METRICS` — what the nightly rows already carry: React commits, renders and wasted
  renders; `recalcStyleCount` and `layoutCount`; SQLite statements by kind and rows changed;
  Automerge saves (all kinds summed) and bytes; ECHO index passes, query runs and recomputes. Scored
  in each flow's own suite.
- `COSTED_WORK_METRICS` — the trace and coverage counts. The nightly runs them in jobs of their own
  (`perf-counters`, `chat-counters`) with `DX_PERF_COUNTERS=trace,calls,react`, scores only them as
  the `composer-work` and `chat-work` suites, and publishes none of that pass's stage rows: no
  `ci.perf-stage` tile pins `ciCounters`, so a row inflated 7–29% would read there as a regression.

Budgets are opt-in per stage: a counter with no budget is not measured, rather than warned about,
since a zero or a network-paced stage (`seed`, `await-replication`) has no budget on purpose.
`score-perf.ts calibrate --run <dir> --run <dir> …` proposes them from several nights' artifacts
(`proposeWorkBudgets`): the target is the median of each night's median; the limit three spreads
above it, at least 5% and one count, where the spread is the larger of the night-to-night CV and the
per-iteration CV over √n. A counter noisier than 10% per iteration is left out — it is not counting
deterministic work.

## Instrument cost, measured

One sample per configuration of the same flow, whole-flow wall time:

| configuration                          | wall      | vs `measure`      |
| -------------------------------------- | --------- | ----------------- |
| `measure` (no instruments)             | 36,887 ms | —                 |
| profiler only (`DX_PERF_SCREENCAST=0`) | 37,840 ms | +953 ms (+2.6%)   |
| `diagnose` (profiler + screencast)     | 54,335 ms | +17,448 ms (+47%) |

**Read these as bounds, not measurements.** One sample each, against a noise floor that a later
run established directly: with the profiler always on, the `boot` stage — which has NO
instrumentation attached in either configuration, since no target exists before the page — moved
**+20.9%** between two runs. Run-to-run variance is therefore ~20% per stage, which swamps the
profiler's apparent +2.6%. `open-tasks` also came out _faster_ in the profiler-only run (4,976 ms
vs 7,833 ms), which is the same noise.

What survives: the screencast's +47% is large enough to exceed that floor, and the profiler's cost
is bounded above by something too small to separate from zero. Resolving it properly needs 3-5
samples per configuration — the same shortfall as gap 4 below, which makes repeated iterations the
most load-bearing gap in this list rather than a refinement.

Why the screencast costs what it does: `Page.startScreencast` makes Chrome encode a JPEG per frame,
ship it over the CDP websocket, and wait for a `Page.screencastFrameAck` before the next one —
thousands of encode-and-transport round trips competing with the rendering being measured.

On this evidence the profiler runs in **both** modes, which makes `cpuMsByRealm` a trended metric
rather than a diagnose artifact, and its profiles are kept in both (a whole run's artifacts come to
~19 MB, including one screenshot per stage — not the "hundreds of MB" an earlier revision of this
file guessed at).

### The work counters' cost

Three iterations per configuration, interleaved (`none`, `trace`, `react`, `calls`, then again) so
drift lands on all four alike, in the Claude Code cloud sandbox (4 cores). Medians of the flow's
summed stages; `assistant-chat` (`blank`) excludes `seed`, whose cold storybook compile dominates
it. `none` already includes the free counters (getMetrics, data probes, the instruction-count
flag), so these are each costed counter's own increment.

| counters | projects-tasks wall | CPU, all processes | tab task time | assistant-chat wall | CPU, all processes | tab task time |
| -------- | ------------------- | ------------------ | ------------- | ------------------- | ------------------ | ------------- |
| `none`   | 57.1 s              | 103.3 s            | 28.4 s        | 67.1 s              | 98.1 s             | 38.1 s        |
| `react`  | +5.3%               | +4.2%              | +3.5%         | +3.1%               | +4.6%              | +4.8%         |
| `trace`  | +7.2%               | +10.5%             | +8.2%         | +6.7%               | +14.5%             | +10.4%        |
| `calls`  | +29.3%              | +26.0%             | +66.3%        | +11.7%              | +8.9%              | +22.5%        |

So the default is `react` alone: a few percent, the same order as the profiler. `trace` costs
past that in CPU — `devtools.timeline` records an event per script entry in every realm — and
`calls` far past it, since precise coverage keeps every function's invocation counter live; both
run on request (`DX_PERF_COUNTERS=trace,react` for a counting run) and in the nightly's separate
counters-on jobs, never inside the trended one.

Across the same three iterations, the counts held where the stage is user-driven: on
`assistant-turns`, `scroll-*`, `open-*` and `reopen-project` the coefficient of variation of
`recalcStyleCount`, `styleRecalcElements`, `layoutDirtyObjects`, `reactRenders` and `jsCalls` was
0–5% and mostly under 1%, against 1–5% for wall time and 2–8% for CPU on the same stages. Stages
paced by the network (`await-replication`, `seed`) vary in counts too, because how much work they
do depends on what arrived.

## Known gaps

Recorded here so nobody rediscovers them as bugs.

1. ~~Worker CPU is `diagnose`-only.~~ Done: the profiler runs in both modes, so `cpuMsByRealm` is
   trended. `Performance.getMetrics` still cannot substitute — `Performance.enable` answers
   `'Performance.enable' wasn't found` on every worker target, which is why `threadByRealm` covers
   only realms that have the domain (the page, today). What remains: `boot` has no profile in
   either mode, since there is no target to attach to before the page exists.
2. **Analytics used to contaminate the API column, and socket traffic was missing entirely.**
   Fixed: `edgeApiBytes`/`edgeSocketBytes` count the app's own backend alone, and
   `analyticsBytes` is recorded separately so the split is auditable rather than assumed. The
   socket half was the serious one — a WebSocket emits exactly ONE `response` (the 101, empty
   body), so before frame accounting every data-syncing stage recorded 0 API bytes and 0 requests:
   `edit-document`, `toggle-task`, `scroll-tasks` and `reopen-project` all read as zero network on
   a real CI run, which is impossible for a flow that replicates through ECHO. Frames are counted
   in both directions, since an upload regression is as real as a download one.
3. ~~No disk I/O.~~ Done, and it needed a change outside this package. Nothing in CDP reports
   read/write bytes, `Storage.getUsageAndQuota` gives a stored LEVEL rather than operations, and
   `/proc/<pid>/io` counts Chrome's own traffic alongside ours — so the only layer where a byte
   count is attributable to SQLite is its VFS. `instrumentVfs` in
   `sql-sqlite/src/internal/vfs-metrics.ts` wraps `jRead`/`jWrite`/`jTruncate`/`jSync` on the
   `AccessHandlePoolVFS` before `vfs_register` hands it to wasm, and the harness reads the counters
   per realm over CDP (`collectors/disk.ts`).

   Three things worth knowing about the numbers:

   - **`sqliteRealms` is the integrity column.** A zero byte count means either that SQLite did no
     I/O or that nothing was instrumented, and those are different facts the byte columns cannot
     separate. `0` realms is a broken harness; `1` realm and zero bytes is a real result.
   - **Read bytes are REQUESTED, not delivered.** SQLite asks for a whole page past end-of-file
     during recovery and the VFS zero-fills the remainder, so `readBytes` is the I/O SQLite asked
     storage for and `shortReads` counts how often that differed. A rejected write contributes no
     bytes, since a short write is an error rather than a partial success.
   - **Browser only.** Node uses native SQLite with no JS VFS, so a node run reports zeroes with
     `realms: 0` — correctly indistinguishable from an uninstrumented run, because that is what it
     is. The database also lives in the DEDICATED worker, not the shared one.

   The counters are unconditional rather than flag-gated. Two integer increments beside a
   synchronous `FileSystemSyncAccessHandle` call are not measurable, and a build-time flag would
   mean the measured bundle is not the shipped one — the comparability problem this harness exists
   to avoid.

4. ~~Lag is pooled across realms.~~ Done: `lagByRealm` reports p95, max and sample count per realm.
   The pooled `lagP95Ms`/`lagMaxMs` remain, and remain the weaker reading.
5. ~~`backingBytes` is recorded but not surfaced.~~ Done, and wasm no longer depends on it:
   `heapBackingBytes{realm}` is trended, and `wasmBytes{realm}` measures linear memory directly
   from an instantiation probe rather than inferring it from a backing-store total that also counts
   every `Uint8Array` automerge passes around.

6. ~~Worker timer drift has never produced a sample.~~ Done: the installer's idempotence guard
   tested `globalThis.__perfLag`, which the drain expression itself defines, so every worker realm
   — first drained at the closing boundary of the stage that created it — answered `present`
   forever and never armed an interval. Instrumenting a full flow showed 40 installs, all
   `present`, none `installed`. The guard is a separate `__perfLagArmed` marker now, and
   `lagSamples{realm}` is what made the failure visible rather than plausible; `rpc[]`'s queue wait
   measures the same responsiveness from traffic the app generates itself.
7. ~~One iteration per mode.~~ Done: the nightly runs `DX_PERF_ITERATIONS=10` per mode — and the
   first ten-iteration run corrected the premise. WITHIN a run the spread is tiny (CV 1.6% on total
   wall time, 0.11% on DOM nodes); the ~20% figure below came from comparing separate RUNS, which
   also differ by machine cell and cache state. Ten iterations therefore pin down one job very
   precisely and say nothing about the night-to-night term, which is the larger one and is still
   unmeasured. The remaining variance — `open-tasks` moved
   9,172 → 6,803 → 7,833 → 10,195 ms across single runs, and `boot` moved +20.9% between two runs
   instrumented identically (not at all) — but those are BETWEEN-run figures. Measured within one
   run: `edit-document` 1.2%, `boot` 9.2%, `open-space` 41.6%. The read side is settled too: each tile
   is a box over the ten run totals — mean +/- one sample sd, with the median drawn — so the
   spread is now measured rather than asserted. Both statistics are shown because they answer
   different questions: one slow but SUCCESSFUL iteration moves the mean and not the median. A
   failed stage is not that case and never was — `writePosthogBatch` filters on `row.ok`, so an
   expired stage lowers the sample count instead of dragging anything.
8. **`boot` carries no profile** in either mode: there is no target to attach to until the page
   exists, so boot-time attribution belongs to the startup harness, not this one.
9. **Instruction counts need a hardware PMU, and the machines measured so far have none.**
   `--enable-thread-instruction-count` reads per-thread instruction counters through
   `perf_event_open`, which needs a kernel PMU driver. The Claude Code cloud sandbox is a
   Firecracker VM whose kernel logs `Performance Events: … no PMU driver, software events only`
   (`perf_event_paranoid` is 2, which would otherwise allow user-space counting), and Chrome then
   emits no `tidelta` at all. The flag stays on because it costs nothing without a PMU, and
   `instructionThreads` says per row whether the counts exist — so the first nightly on the Depot
   runner answers whether it has one. If it reads `0` there too, the runner is virtualized without
   PMU passthrough and instructions need a bare-metal runner.
10. **No valgrind instruction counts for the node ECHO benchmarks.** `cachegrind` on
    `node --predictable --single-threaded` would give deterministic instruction counts with no PMU,
    but it runs the benchmark 20–50x slower and needs valgrind on the runner; it was left out of
    this change as optional.
11. **RPC has call counts per method, not bytes.** See `rpcCallsByMethod` above: the transport is
    structured clone, so there is no serialized size to read without walking every payload.
12. **`calls` and `react` skip what happened before they could attach.** Coverage starts in a
    realm at the first stage boundary that sees it, so a worker created during `boot` is counted
    from the next stage; the React probe only sees commits after `react-dom` loads, which is all of
    them only because the init script runs before the bundle.

## Where the numbers go

- **Publishing happens per ITERATION, from inside the flow, and there is no end-of-run step.**
  `publishPosthogBatch` shells out to `scripts/ci-event.mjs` after each iteration writes its batch,
  so a run that loses its runner partway has already published what it measured. A step afterwards
  cannot do that — it does not run when the job dies, which is exactly when the rows matter. The
  obvious backstop is deliberately absent: it would be a second publish path relying on PostHog's
  dedup to collapse re-sent rows, and a dedup miss puts duplicates into the distributions, which
  tightens a box with nothing on the page to reveal it. A failed publish retries once and is then
  logged at `warn` — the loss is made visible rather than papered over.
- `test-results/perf/<flow>-<mode>.rows.ndjson` — every row, one JSON object per line.
- `test-results/perf/<flow>-<mode>-<runId>.json` — the per-run report.
- `test-results/perf/<flow>-<mode>.events.ndjson` — PostHog batch, `measure` and `ok` rows only.
  Event name `ci.perf-stage`; the dedup key is `<flow>:<scale>:<stage>:<iteration>` through a uuidV5,
  so re-running a stage updates its event rather than duplicating it.
- `test-results/perf/artifacts/<mode>-<runId>/` — per-realm `.cpuprofile` per stage (both modes;
  load one into Chrome DevTools → Performance), `stages/<stage>.png` (both modes), and the
  screencast stills (`diagnose`). ~19 MB for a whole run. Never committed.
