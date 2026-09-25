# Memory harness

Instruments for measuring where a Composer tab's memory goes. Each drives a
browser over CDP and prints a table — headless Chrome, except `native-heap.mjs`,
which needs Electron for its symbols. None of them run in CI.

Findings and the composition model they produced live in
[`.agents/projects/memory-usage/`](../../../../../.agents/projects/memory-usage).

## Measuring the right quantity

Four different numbers get called "memory", and they differ by 3–5×. Say which
one a result is:

| Quantity                | Read with                                  | Covers                                                   |
| ----------------------- | ------------------------------------------ | -------------------------------------------------------- |
| JS heap (used)          | `measure.mjs`                              | live JS objects, per execution context                   |
| Heap snapshot self size | `retainers.mjs`, `snapshot-diff.mjs`       | live JS + some native accounting, one context            |
| Attributed allocators   | `ledger.mjs`, `parse-trace-stream.mjs`     | V8 + malloc + PartitionAlloc + Blink + compositor        |
| Private footprint       | `ledger.mjs`, `soak.mjs`, `plain-soak.mjs` | everything committed, including free-but-committed pages |

Chrome's tab-hover figure is the last one. Code-residency work moves the first;
idle-churn work moves the last.

Only private footprint is complete. memory-infra has no wasm dump provider —
`BackingStore::AllocateWasmMemory` calls `AllocatePages` directly, so linear
memory appears in no allocator node, and summing the allocator tree undercounts
by the whole committed amount. A 512 MB `WebAssembly.Memory` reads as 20 MB
attributed against a 546 MB footprint. `ledger.mjs` reports both plus a
`WebAssembly` shim that names the module holding the gap.

`ledger.mjs` closes the books per process as: private allocator nodes +
committed wasm + residual. On the app's own renderer that residual is under 1%.
These rules make the arithmetic valid:

- **Measure with `--detached`.** A Playwright page costs this app ~130 MB of
  Blink PartitionAlloc, and an early `Network.enable` another ~45 MB, because
  Blink retains response bodies for a client that might ask for them. Composer
  idle measures 548 MB driven by Playwright and 417 MB with nothing attached;
  the second is what a user has. A session holding only `Runtime` and `Page`
  costs nothing measurable, which is all the wasm probe needs, so `--detached`
  keeps the probe. `--work` needs Playwright's page API and therefore carries
  the overhead — subtract a `--detached` boot run before reading it.
- **Subtract cross-tree ownership views.** `blink_objects` is not memory; every
  node in it owns a `blink_gc` node, so it restates Oilpan by Blink class rather
  than adding to it. Summing it double counts. The ledger subtracts any subtree
  whose nodes are the source of an ownership edge into a different allocator,
  and keeps `blink_objects` as the per-class naming of `blink_gc`.
- **Exclude the shared-backed nodes** (`cc`, `gpu`, `ioaccelerator`,
  `iosurface`, `shared_memory`) from a renderer's sum. They describe regions
  the GPU process owns, so counting them pushes the total past a footprint that
  never included them. Excluded, an idle tab's nodes match its footprint to
  within 1%.
- **Close with committed wasm, not the region match.** The probe reports
  `byteLength`, and across every run the residual tracks that total. Matching
  each memory to an anonymous VM region of the same size names which regions are
  wasm, but its DIRTY column comes in far under what those memories carry, so it
  is reported as a diagnostic rather than used as the closing term.
- **Read the app's renderer, not the app total.** Composer runs a second
  renderer that exposes no CDP target, so its realms cannot be read and ~25 MB of
  it stays unattributed. It is a rounding error against the tab, but it is why
  the app total closes to a few percent while the tab itself closes to under one.
- **Loaded, a few percent stays unattributed.** macOS puts every anonymous
  allocation under one VM tag, so `vmmap` cannot decompose it further.
  memory-infra does emit `process_mmaps` on macOS, contrary to what this file
  used to say, but only as a module map — address, size and mapped file per
  region, with none of the `byte_stats` that make it a decomposition on Linux.
  No script here reads it: `native-heap.mjs` gets the module bases it needs from
  the sampling profile instead.
- **Allocation is sampled, not tracked.** `--by-code` uses
  `HeapProfiler.startSampling`, which reports allocation volume per stack. The
  retained-bytes equivalent needs `startTrackingHeapObjects({trackAllocations})`,
  and that makes this app's boot take over ten minutes while
  `stopTrackingHeapObjects` returns no snapshot at all — so allocation is what is
  reported, and it answers which code churns rather than which code holds.
- **`partition_alloc/allocated_objects/<unspecified>` needs the native heap
  profiler, not the dump.** It is the part of Blink's allocator no dump provider
  claims, so no `ledger.mjs` run will ever name it. The allocation stacks do
  exist — `Memory.getSamplingProfile` returns them — but Chrome for Testing and
  the Chromium snapshot builds are both shipped stripped (3 and 2,690 symbols
  respectively, in a ~250 MB binary), so the frames come back as bare addresses.
  `native-heap.mjs` runs the same page in Electron, which embeds the same
  Chromium and publishes a breakpad symbol file per release, and resolves them.

Do not sum `ps` RSS across the browser's process tree. Every process's RSS
counts the shared pages it maps, so the total triple-counts: an empty headless
Chromium sums to 1,335 MB that way against 408 MB of actual physical footprint.

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
- **Which build the profile runs.** A seeded profile keeps the service worker
  and precache of the build that seeded it, and serves that bundle on every later
  run until the app's own update cycle replaces it, which a fresh copy per run
  never reaches. Three runs of a rebuilt bundle measured the previous one that
  way. `native-heap.mjs --profile` now clears the origin's service worker and
  cache storage before navigating (IndexedDB and OPFS stay), and its JSON records
  chunk names under `wasmByModule` and `measureCalls`, so check those against
  `out/composer/assets` before comparing two arms. `--keep-service-worker`
  turns the clearing off, for measuring the precached bundle on purpose.
- **Which build seeded the profile.** A seeded profile also pins every
  IndexedDB schema version the seeding build wrote. A build carrying an older
  `DB_VERSION` cannot open that database (IndexedDB refuses to downgrade) and
  the store goes silent rather than failing: six runs measured a log store
  that never wrote or swept, with nothing in the output to say so. For an A/B
  across builds, seed on the oldest arm and let the newer ones upgrade, and
  read `idbCalls` in the JSON for the reads the arm is supposed to make.

## Scripts

| Script                   | Answers                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ledger.mjs`             | Private footprint per process, the allocator breakdown with ownership views removed, per-realm heap and wasm linear memory per module, and a document census, at named checkpoints through a journey                                                                                                                                                         |
| `perf-snapshot-report.mjs` | Composition of the memory snapshots the perf flow took (`DX_PERF_SNAPSHOTS`): allocator breakdown per renderer and top constructors and ArrayBuffer holders per realm, cached as `report.json` beside each checkpoint |
| `alloc-report.mjs`       | Which code allocated during the perf flow's write burst (`DX_PERF_ALLOC_SAMPLE=1`), cumulative and collected objects included: by package and function of the allocating frame, and by the nearest first-party frame on the stack; `--only` narrows to one allocator and shows who drives it |
| `ledger.mjs --by-code`   | JS allocation per workspace package, from V8's sampling heap profiler resolved through the build's sourcemaps; needs `--dist`                                                                                                                                                                                                                                |
| `seed-profile.mjs`       | Builds a persistent profile holding several spaces of fixture data, so the other scripts can measure a loaded tab; `native-heap.mjs --profile <dir> --journey` then boots on it and opens what it recorded                                                                                                                                                   |
| `api-census.mjs`         | Which application code calls `TextEncoder.encode` and IndexedDB's bulk reads, per realm, with the JS stack — the caller-side half of `native-heap.mjs`, and the only one that reaches dedicated workers                                                                                                                                                      |
| `native-heap.mjs`        | The C++ call sites behind `malloc` and `partition_alloc` together, with byte totals and a rollup by mechanism — the naming that memory-infra's `<unspecified>` cannot give. Reports committed wasm per module per realm alongside them, which with `--journey` is the only reading taken while documents are open, and a `performance.measure` census per realm (calls and `detail` bytes per JS call site), since the native stack under a measure entry is only the clone. macOS only; run `fetch-electron.sh` first |
| `fetch-electron.sh`      | Downloads the Electron build and breakpad symbols `native-heap.mjs` symbolizes against and checks their UUIDs match: ~250 MB of downloads, ~1.5 GB on disk                                                                                                                                                                                                   |
| `cost-fixtures.mjs`      | Generates the single-variable pages behind the per-unit cost table in `.agents/projects/memory-usage/ALLOCATION.md`; measure each pair with `ledger.mjs --detached --ready none`                                                                                                                                                                             |
| `probes.mjs`             | The shims two of these install into a measured realm (the `WebAssembly.Memory` census). Shared rather than copied: they run as strings in realms reached only over CDP, so a drifted copy is invisible until two instruments disagree about one run                                                                                                          |
| `heap-attribution.mjs`   | What a realm's heap holds by constructor, and who retains its ArrayBuffer backing stores — the naming a heap snapshot can give that memory-infra cannot                                                                                                                                                                                                      |
| `measure.mjs`            | Heap per execution context (page, shared and dedicated workers) after a forced GC; optional snapshot capture                                                                                                                                                                                                                                                 |
| `soak.mjs`               | Footprint and heap over time; can block request patterns or stub the perf timeline to isolate a suspect                                                                                                                                                                                                                                                      |
| `plain-soak.mjs`         | The same, with no CDP client attached to the page — the control for instrumentation-induced growth                                                                                                                                                                                                                                                           |
| `parse-trace-stream.mjs` | The same ledger from a trace captured in a real browser (`chrome://tracing`, category `disabled-by-default-memory-infra`); streams, since these run to hundreds of MB                                                                                                                                                                                        |
| `boot-census.mjs`        | What a tab loads and executes: bytes per package via sourcemaps, execution ratio via precise coverage, and the module-activation roster split into boot and idle waves                                                                                                                                                                                       |
| `snapshot-diff.mjs`      | Which constructors grew between two points — the way to find an accumulator                                                                                                                                                                                                                                                                                  |
| `read-heap-snapshot.mjs` | The streaming `.heapsnapshot` reader `heap-attribution.mjs` and `retainers.mjs` use; a loaded page's snapshot passes V8's ~512 MB string cap, so `JSON.parse` of the file cannot read it |
| `retainers.mjs`          | Retainer chains for the largest strings in a snapshot — the way to find who holds them                                                                                                                                                                                                                                                                       |

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
# The honest idle number: nothing attached to the page while it loads.
node scripts/memory/ledger.mjs http://localhost:4173 --detached --json ./tmp/ledger.json

# Split SDK cost from app cost by measuring a smaller app on the same SDK first.
node scripts/memory/ledger.mjs http://localhost:4174 --detached --ready none --json ./tmp/todomvc.json
node scripts/memory/ledger.mjs http://localhost:4173 --detached --baseline ./tmp/todomvc.json

# Which package allocates the JS, and which plugin owns the DOM.
node scripts/memory/ledger.mjs http://localhost:4173 --detached --by-code --dist out/composer

# Name what the JS heap and the buffers hold (slow: parses a snapshot per realm).
node scripts/memory/ledger.mjs http://localhost:4173 --detached --snapshot

# Through a journey. Carries Playwright's instrumentation overhead; see above.
node scripts/memory/ledger.mjs http://localhost:4173 --work --json ./tmp/ledger.json

# Heap per context, plus snapshots.
node scripts/memory/measure.mjs http://localhost:4173 --snapshot ./tmp/snaps

# Ten-minute footprint soak.
node scripts/memory/soak.mjs http://localhost:4173 --minutes 10 --interval 30

# What loads at boot, attributed per package.
node scripts/memory/boot-census.mjs http://localhost:4173 out/composer --settle 150

# Which application code asks for the memory. No symbols needed; start here.
node scripts/memory/api-census.mjs http://localhost:4173 --settle 90

# Name the C++ call sites behind malloc and partition_alloc (macOS only).
scripts/memory/fetch-electron.sh
node scripts/memory/native-heap.mjs http://localhost:4173 --settle 90 \
  --symbols "$(find ./tmp/electron -name 'Electron Framework.sym' -print -quit)"

# Who retains the big strings in a snapshot.
node scripts/memory/retainers.mjs ./tmp/snaps/baseline-page.heapsnapshot --min 400000
```

Snapshots, traces and result files are large and are build output; write them
somewhere ignored, not into the package. `measure.mjs` defaults its result to
`./tmp/memory-last-run.json` under the working directory (`--out` to override).
