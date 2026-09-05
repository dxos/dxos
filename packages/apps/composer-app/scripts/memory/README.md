# Memory harness

Instruments for measuring where a Composer tab's memory goes. Each script drives
headless Chrome over CDP and prints a table; none of them run in CI.

Findings and the composition model they produced live in
[`.agents/projects/memory-usage/`](../../../../../.agents/projects/memory-usage).

## Measuring the right quantity

Four different numbers get called "memory", and they differ by 3–5×. Say which
one a result is:

| Quantity                | Read with                         | Covers                                                       |
| ----------------------- | --------------------------------- | ------------------------------------------------------------ |
| JS heap (used)          | `measure.mjs`                     | live JS objects, per execution context                       |
| Heap snapshot self size | `retainers.mjs`, `snapshot-diff.mjs` | live JS + some native accounting, one context             |
| Attributed allocators   | `memory-dump.mjs`, `parse-trace-stream.mjs` | V8 + malloc + PartitionAlloc + Blink + compositor |
| Private footprint       | `soak.mjs`, `plain-soak.mjs`      | everything committed, including free-but-committed pages     |

Chrome's tab-hover figure is the last one. Code-residency work moves the first;
idle-churn work moves the last.

## Comparing runs

A comparison is only meaningful if these are held constant, so record them
alongside any number:

- **Serving mode.** `vite serve` costs ~2.5× production on the main thread —
  module sources and inline sourcemaps stay resident. Measure `vite preview` or
  a static server over `out/composer`.
- **Plugin set and profile.** A first run performs onboarding and loads a
  different set than a returning one; use `boot-census.mjs --profile <dir>`
  twice against the same directory to measure a returning tab.
- **Settle time.** Modules keep arriving for ~3 minutes after ready.
- **Instrumentation.** An attached CDP client (including DevTools) makes Blink
  retain response bodies, which reads as linear growth. `plain-soak.mjs` is the
  control for that.

## Scripts

| Script                   | Answers                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `measure.mjs`            | Heap per execution context (page, shared and dedicated workers) after a forced GC; optional snapshot capture |
| `soak.mjs`               | Footprint and heap over time; can block request patterns or stub the perf timeline to isolate a suspect |
| `plain-soak.mjs`         | The same, with no CDP client attached to the page — the control for instrumentation-induced growth |
| `memory-dump.mjs`        | Per-allocator ledger from two `memory-infra` dumps, with the delta between them       |
| `parse-trace-stream.mjs` | The same ledger from a trace captured in a real browser (`chrome://tracing`, category `disabled-by-default-memory-infra`); streams, since these run to hundreds of MB |
| `boot-census.mjs`        | What a tab loads and executes: bytes per package via sourcemaps, execution ratio via precise coverage, and the module-activation roster split into boot and idle waves |
| `snapshot-diff.mjs`      | Which constructors grew between two points — the way to find an accumulator          |
| `retainers.mjs`          | Retainer chains for the largest strings in a snapshot — the way to find who holds them |
| `native-soak.mjs`        | Footprint over time of the installed macOS app: WebContent, GPU, Networking and the host process, with WebContent's dirty-memory categories; also reports the app's own host log |

## Running

These use the repo's pinned Node (24.x) for its global `WebSocket` — the raw
CDP connections need no dependency beyond Playwright. Run them through the
toolchain (`moon`, or a shell with proto's shims on `PATH`); a stray Node 20
fails with `WebSocket is not defined`.

Serve a production build first (numbers from `vite serve` are not comparable):

```bash
moon run composer-app:bundle
pnpm --filter @dxos/composer-app exec vite preview --port 4173
```

Then, from `packages/apps/composer-app`:

```bash
# Heap per context, plus snapshots.
node scripts/memory/measure.mjs http://localhost:4173 --snapshot ./tmp/snaps

# Ten-minute footprint soak.
node scripts/memory/soak.mjs http://localhost:4173 --minutes 10 --interval 30

# What loads at boot, attributed per package.
node scripts/memory/boot-census.mjs http://localhost:4173 out/composer --settle 150

# Where the non-JS memory is, and what grew between two points.
node scripts/memory/memory-dump.mjs http://localhost:4173 --wait1 60 --wait2 480

# Who retains the big strings in a snapshot.
node scripts/memory/retainers.mjs ./tmp/snaps/baseline-page.heapsnapshot --min 400000
```

Snapshots, traces and result files are large and are build output; write them
somewhere ignored, not into the package. `measure.mjs` defaults its result to
`./tmp/memory-last-run.json` under the working directory (`--out` to override).

## The native app (macOS, WebKit)

The Chrome tools above do not apply to the Tauri app: WKWebView has no
`performance.memory`, no `measureUserAgentSpecificMemory`, and no CDP, so a
page cannot measure its own heap. What macOS does expose, unprivileged, is the
footprint of every process: `proc_pid_rusage` for the number WebKit's own
memory-kill logic uses (`phys_footprint`), and `footprint`/`vmmap` for the
dirty memory per category. Two categories stand in for the realms:

| Category                                        | Holds                                                       |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `WebKit malloc`                                 | JSC's GC heap plus DOM, CSS and every other bmalloc client  |
| `JS VM Gigacage`                                | ArrayBuffers and typed arrays (wasm memories, Automerge)    |
| `JS JIT generated code`                         | compiled JS                                                 |
| `Owned physical footprint (unmapped) (graphics)` | IOSurfaces and layer backing stores, even while hidden      |

`native-soak.mjs` samples the running app (or launches it hidden with
`--launch`, the state in which WebKit throttles and, under memory pressure,
kills WebContent), attributes the WebKit helpers to it through the
responsibility API, and appends one NDJSON line per process per sample:

```bash
node scripts/memory/native-soak.mjs --app "Composer Dev" --launch --minutes 480 --interval 30
```

A WebContent pid change is logged as a `pid-change` event with the last
footprint seen before it, which is the number to compare against the kill.
The Networking helper's `disk_written` delta is the idle disk churn.

The app writes the same line shape itself, once a minute for as long as it
runs, to `~/Library/Logs/org.dxos.composer.<channel>/memory.ndjson`
(`src-tauri/src/memory_log.rs`), so an overnight incident has its trajectory
without anyone having started a soak:

```bash
node scripts/memory/native-soak.mjs --report ~/Library/Logs/org.dxos.composer.dev/memory.ndjson
```

To join a trajectory with the app's own logs, download the log bundle from
the app after the soak and query it with `scripts/query-logs.mjs` over the
same wall-clock window; the bundle keeps roughly the last 25 minutes.

Hidden-boot baseline of 0.11.3-dev.12 on 2026-09-04 (macOS 26.5.2, 5 spaces,
~485 documents), 30 minutes hidden starting two minutes after launch:

| Process    | Resting MB | Max sampled MB | Lifetime peak MB | CPU s / 30 min | Disk write KB/s |
| ---------- | ---------- | -------------- | ---------------- | -------------- | --------------- |
| WebContent | 1,152      | 1,294          | 2,187            | 291            | 0               |
| GPU        | 31         | 254            | 284              | 4              | 0               |
| Networking | 41         | 70             | 178              | 166            | 129             |
| host app   | 84         | 85             | 97               | 3              | 0               |

The lifetime peak is the kernel's `ri_lifetime_max_phys_footprint`; WebContent
reached 2.2 GB before sampling began, so boot itself passes the 1.86 GB at
which macOS killed it on 2026-09-03. Between +5.5 and +16.5 minutes it held a
1,270 MB plateau while the GPU helper rose to 254 MB, then both fell back.
WebContent's dirty split at rest: WebKit malloc 734, graphics 235, JS VM
Gigacage 116, JIT 52; none of them moved over the half hour, so the 30-minute
slope is zero and the growth to a kill happens on a longer clock or on a
different event.

The boot peak, sampled every 2 s on a second hidden launch (this one rested
at 976 MB; resting footprint varies by ~180 MB between launches):

| t    | Footprint MB | WebKit malloc | Graphics | JS VM Gigacage | JIT |
| ---- | ------------ | ------------- | -------- | -------------- | --- |
| 2 s  | 247          | 133           | 121      | 4              | 6   |
| 4 s  | 2,023        | 1,313         | 435      | 169            | 35  |
| 15 s | 1,054        | 833           | 117      | 37             | 51  |
| 3 m  | 976          | 756           | 117      | 35             | 53  |

Half of WebContent's resting footprint is bmalloc, which holds JSC's GC heap,
the DOM and CSS together and is opaque from outside the process; at rest
another ~1 GB of it is reclaimable (freed but not yet returned). The Web
Inspector's heap snapshot (Safari, Develop menu, the app's window) is the
only breakdown of the JS part in WebKit.
