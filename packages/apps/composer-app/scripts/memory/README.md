# Memory harness

Instruments for measuring where a Composer tab's memory goes. Each script drives
headless Chrome over CDP and prints a table; none of them run in CI.

Findings and the composition model they produced live in
[`.agents/projects/memory-usage/`](../../../../../.agents/projects/memory-usage).

## Measuring the right quantity

Four different numbers get called "memory", and they differ by 3–5×. Say which
one a result is:

| Quantity                | Read with                                   | Covers                                                   |
| ----------------------- | ------------------------------------------- | -------------------------------------------------------- |
| JS heap (used)          | `measure.mjs`                               | live JS objects, per execution context                   |
| Heap snapshot self size | `retainers.mjs`, `snapshot-diff.mjs`        | live JS + some native accounting, one context            |
| Attributed allocators   | `memory-dump.mjs`, `parse-trace-stream.mjs` | V8 + malloc + PartitionAlloc + Blink + compositor        |
| Private footprint       | `ledger.mjs`, `soak.mjs`, `plain-soak.mjs`  | everything committed, including free-but-committed pages |

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
Six rules make the arithmetic valid:

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
  allocation under one VM tag, so `vmmap` cannot decompose it further, and
  memory-infra emits no `process_mmaps` provider outside Linux and Windows.
  Closing that slice on Linux needs a `process_mmaps` reader, which is not
  implemented — the region reads here shell out to `vmmap`.
- **Allocation is sampled, not tracked.** `--by-code` uses
  `HeapProfiler.startSampling`, which reports allocation volume per stack. The
  retained-bytes equivalent needs `startTrackingHeapObjects({trackAllocations})`,
  and that makes this app's boot take over ten minutes while
  `stopTrackingHeapObjects` returns no snapshot at all — so allocation is what is
  reported, and it answers which code churns rather than which code holds.
- **`partition_alloc/allocated_objects/<unspecified>` has no finer breakdown.**
  It is the part of Blink's allocator no dump provider claims. Nothing decomposes
  it here: `Memory.getSamplingProfile` returns real stacks but Chrome for Testing
  is stripped, so `atos` resolves only `ChromeMain+offset`; a heap snapshot sees
  JS objects, and this memory is C++. Attribute it by layer instead — run the
  same measurement against a smaller app on the same SDK and pass it as
  `--baseline`. Against `todomvc`, Composer's share of that block is +72 MB.

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

## Scripts

| Script                   | Answers                                                                                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ledger.mjs`             | Private footprint per process, the allocator breakdown with ownership views removed, per-realm heap and wasm linear memory per module, and a document census, at named checkpoints through a journey |
| `ledger.mjs --by-code`   | JS allocation per workspace package, from V8's sampling heap profiler resolved through the build's sourcemaps; needs `--dist`                                                                        |
| `heap-attribution.mjs`   | What a realm's heap holds by constructor, and who retains its ArrayBuffer backing stores — the naming a heap snapshot can give that memory-infra cannot                                              |
| `measure.mjs`            | Heap per execution context (page, shared and dedicated workers) after a forced GC; optional snapshot capture                                                                                         |
| `soak.mjs`               | Footprint and heap over time; can block request patterns or stub the perf timeline to isolate a suspect                                                                                              |
| `plain-soak.mjs`         | The same, with no CDP client attached to the page — the control for instrumentation-induced growth                                                                                                   |
| `memory-dump.mjs`        | Per-allocator ledger from two `memory-infra` dumps, with the delta between them                                                                                                                      |
| `parse-trace-stream.mjs` | The same ledger from a trace captured in a real browser (`chrome://tracing`, category `disabled-by-default-memory-infra`); streams, since these run to hundreds of MB                                |
| `boot-census.mjs`        | What a tab loads and executes: bytes per package via sourcemaps, execution ratio via precise coverage, and the module-activation roster split into boot and idle waves                               |
| `snapshot-diff.mjs`      | Which constructors grew between two points — the way to find an accumulator                                                                                                                          |
| `retainers.mjs`          | Retainer chains for the largest strings in a snapshot — the way to find who holds them                                                                                                               |

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

# Where the non-JS memory is, and what grew between two points.
node scripts/memory/memory-dump.mjs http://localhost:4173 --wait1 60 --wait2 480

# Who retains the big strings in a snapshot.
node scripts/memory/retainers.mjs ./tmp/snaps/baseline-page.heapsnapshot --min 400000
```

Snapshots, traces and result files are large and are build output; write them
somewhere ignored, not into the package. `measure.mjs` defaults its result to
`./tmp/memory-last-run.json` under the working directory (`--out` to override).
