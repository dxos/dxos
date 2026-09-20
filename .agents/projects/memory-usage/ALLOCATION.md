# Where Composer's memory goes, for a JavaScript developer

`partition_alloc/allocated_objects/<unspecified>` was the largest unexplained block
in a Composer tab — around 100 MB that `ledger.mjs` could weigh and not name. It
has a floor of about 35 MB, and on top of that a spike that reaches 112 MB. The
spike is one function, and it is not subtle: Composer's log store re-reads its
whole IndexedDB database and re-encodes every row roughly twice a second, in two
workers at once, allocating **about 790 MB in 90 seconds** to compute numbers it
already has.

Two instruments, both in
[`scripts/memory`](../../../packages/apps/composer-app/scripts/memory):

- [`native-heap.mjs`](../../../packages/apps/composer-app/scripts/memory/native-heap.mjs)
  reads Chromium's native sampling heap profiler, which records a C++ stack per
  allocation and drops the sample when the allocation is freed. It says which C++
  call site allocated.
- [`api-census.mjs`](../../../packages/apps/composer-app/scripts/memory/api-census.mjs)
  shims `TextEncoder.encode` and IndexedDB's bulk reads in every realm before the
  app's first script runs, and records the JS stack. It says which application
  line asked.

Read both with the harness
[README](../../../packages/apps/composer-app/scripts/memory/README.md), which
covers what each allocator node means and why a tab's footprint is not their sum.

## 1. The log store's eviction sweep

[`IdbLogStore#evict`](../../../packages/common/log-store-idb/src/idb-log-store.ts):

```ts
const keys = (await promisifyRequest(store.getAllKeys())) as ChunkKey[];
const rows = (await promisifyRequest(store.getAll())) as LogChunk[];
const chunks = keys.map((key, index) => ({
  key,
  lineCount: key[3],
  byteLength: byteLengthUtf8(rows[index]!.lines), // new TextEncoder().encode(value).length
}));
```

`api-census.mjs`, shipped build, one 90-second run, fresh profile, nothing opened:

| realm                                |    `TextEncoder.encode` |                  bulk IDB reads |
| ------------------------------------ | ----------------------: | ------------------------------: |
| observability worker (tab)           | 398.4 MB / 38,302 calls | 196 `getAll` + 196 `getAllKeys` |
| observability worker (client worker) | 390.1 MB / 37,769 calls |                       180 + 180 |
| client dedicated worker              |   2.3 MB / 25,576 calls |                               0 |
| page                                 |      0.0 MB / 147 calls |                               0 |

A second run agreed within 3%. The JS stack on every one of those 38,302 calls is
`observability-worker.js:4:838` inside an `Array.map` — the `byteLengthUtf8` line
above. The database being read holds **2.4 MB**: measured directly at the
90-second mark, `composer-logs/logs` had 391 rows and 2.4 MB of text.

So each sweep reads 2.4 MB out of IndexedDB it does not need, and allocates a
`Uint8Array` copy of every row purely to read `.length` and throw it away. At
~190 sweeps per worker per 90 seconds that is about 8.6 MB of allocation per
second, in one renderer process.

**Two things make it run far more often than it looks.** `#scheduleEviction` sets
a 30-second timer, but `#writeBatch` also calls `void this.#maybeEvict()` after
**every flush**, and the flush interval is 250 ms. An origin-wide web lock
(`ifAvailable: true`) stops two sweeps overlapping, but the next one starts as
soon as the lock frees.

**And it runs in a renderer, twice.** Composer's tab-side `IdbLogStore` is a read
handle for log downloads with no log processor attached, so it never writes and
never sweeps. `main.tsx` and `dedicated-worker.ts` each start an
[`observability-worker`](../../../packages/apps/composer-app/src/workers/observability-worker.ts),
which owns the writes and passes no `evictionInterval`, so it takes the 30-second
default. Those are **dedicated** workers, so they run inside the creating
renderer's process rather than one of their own.

The store's cap is 50 MB. These runs saw it at 2.4 MB, 90 seconds into a fresh
profile. What a long-lived tab costs has not been measured; it is not smaller.

todomvc, on the same SDK, does none of this — it has no log store.

### What it does to the tab

The churn is not 790 MB of footprint. It is allocation the collector mostly keeps
up with, and the tab pays for it in two ways the native profiler can see.

Six runs of the shipped build against four of a **control** — the one-line change
that makes `IdbLogStore#maybeEvict` return immediately, and nothing else — at a
90-second settle, Electron 44.4.3 (Chromium 152):

| arm     | footprint | `<unspecified>` | sampled | of live objects | unresolved |
| ------- | --------: | --------------: | ------: | --------------: | ---------: |
| shipped |    259 MB |         36.8 MB | 66.6 MB |             70% |       0.9% |
| shipped |    329 MB |         34.8 MB | 61.7 MB |             70% |       1.0% |
| shipped |    335 MB |        100.7 MB |  147 MB |             94% |       0.3% |
| shipped |    345 MB |         69.9 MB |  103 MB |             82% |       0.6% |
| shipped |    388 MB |        112.1 MB |  178 MB |             99% |       0.3% |
| shipped |  341 MB\* |         93.6 MB |  146 MB |             96% |       0.4% |
| control |    281 MB |         35.2 MB | 60.3 MB |             70% |       1.0% |
| control |    284 MB |         35.2 MB | 60.3 MB |             70% |       0.6% |
| control |    285 MB |         34.8 MB | 60.1 MB |             70% |       1.0% |
| control |    301 MB |         79.8 MB |  119 MB |             84% |       0.5% |

\* 240-second settle; every other run is 90 seconds.

`<unspecified>` has a floor at **34.8–36.8 MB** that both arms reach, and above it
a spike to 70–112 MB that only appears when a sweep is in flight. Catching one is
luck: two of the six shipped runs missed it entirely and landed on the floor.

The sampled column tracks the spike one for one, because the extra bytes are
exactly what the profiler attributes to the IndexedDB path — up to 113 MB live in
a single instant, after a forced collection in every realm.

**One control run does not fit.** The fourth control row shows 79.8 MB of
`<unspecified>` and 53.8 MB in the IndexedDB category despite the stub, and it is
the only run of the ten with two service workers attached. `api-census.mjs`
against the same build records **zero** bulk IndexedDB reads in every realm, so
whatever that run did, it was not this sweep. It is unexplained and left in the
table rather than dropped.

Footprint does not separate the arms cleanly (259–388 against 281–301) because
churn of this kind mostly shows up as committed-but-unused allocator pages rather
than live bytes. That is the same 104 MB of slack in the table further down.

## 2. Script source — 31 MB, and it stays

The largest steady item: 30.8–31.9 MB in every one of the ten runs, both arms,
both settles. Composer loads ~920 scripts holding 12.55 MB of source, and the
profiler splits one run's 31.01 MB as:

|    MB | Call site                                                         |
| ----: | ----------------------------------------------------------------- |
| 10.07 | `TextResourceDecoder::Decode` ← `ScriptDecoder::DidReceiveData`   |
|  8.88 | `ScriptDecoder::FinishDecode` on the thread pool                  |
|  5.19 | `TextResourceDecoder::Decode` ← `TextResource::DecodedText`       |
|  2.53 | `ModuleScript::RunScriptOnScriptStateAndReturnValue`              |
|  1.97 | `ModuleScript::ResolveModuleSpecifier` ← `JSModuleScript::Create` |
|  0.91 | `BackgroundJSStreamManager::RunScriptStreamingTask`               |
|  0.63 | `TextResource::DecodedText` ← `ScriptResource::GetSourceText`     |

Those seven are the largest and come to 30.18 MB; the rest is spread over smaller
sites. Grouped: about 14.7 MB of decoded source text, 11.0 MB of decode buffers
still reachable 90 seconds later, and 4.5 MB of module-graph bookkeeping that
scales with the number of modules rather than their size. Blink stores ASCII as
one byte per character, so 12.55 MB of source becoming 14.7 MB of text is close to
one copy — the decode buffers on top of it are the part that looks avoidable, and
this measurement does not explain why they persist.

This is the native half of the fixture result that a synthetic page of the same
shape — 927 modules, 56,547 functions, 13.28 MB of source, doing nothing — costs
96.9 MB of footprint. Fewer, larger modules is the lever.

## 3. The rest

Ranges across the ten runs.

| Mechanism                                 |      MB | Notes                                                                                                                                                  |
| ----------------------------------------- | ------: | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WebAssembly compile and code              | 8.8–9.4 | module bytes and compiled code, not linear memory. todomvc spends 8.2, so it is the SDK's automerge, and this cannot separate it from the SQLite build |
| V8 heap pages and isolate tables          | 5.5–7.3 | the container V8's allocator draws from, not its contents                                                                                              |
| font shaping tables                       | 3.8–5.7 | `HarfBuzzSkiaGetTable`: a per-font accelerator built on first shaping. todomvc spends 1.9                                                              |
| network and streams                       | 1.6–4.6 |                                                                                                                                                        |
| `performance.measure(…, {detail})` clones | 0.7–4.1 | see below                                                                                                                                              |
| DOM, CSS, paint                           | 1.3–1.9 | Composer's DOM is small at rest, ~3,055 elements                                                                                                       |
| mojo plumbing                             | 0.9–1.7 |                                                                                                                                                        |
| everything else                           | 3.0–5.0 | Blink strings, other structured clone, uncategorised                                                                                                   |

Passing `detail` to `performance.measure` structured-clones the object into a
`SerializedScriptValue` the entry holds for the life of the timeline. The call
sites are ECHO query execution
([`query-executor.ts`](../../../packages/core/echo/echo-host/src/query/query-executor.ts)),
ECHO indexing
([`echo-host.ts`](../../../packages/core/echo/echo-host/src/db-host/echo-host.ts)),
SQLite queries
([`opfs-client.ts`](../../../packages/common/sql-sqlite/src/internal/opfs-client.ts))
and the Effect `addTrackEntry` helper
([`Performance.ts`](../../../packages/common/effect/src/Performance.ts)). Nothing
in the repo calls `clearMeasures` or `clearMarks`, and a tab holds 2,094 marks and
1,750 measures at idle against todomvc's 7 and 14. Small today, unread in
production, and it grows for as long as the tab is open.

## What the profiler does not name

One shipped run, footprint 334.5 MB, of which the profiler named 147.2 MB. Every
figure here comes from that run's own dump.

| Where                                                            |    MB |
| ---------------------------------------------------------------- | ----: |
| named above                                                      | 147.2 |
| live objects in `malloc` + PartitionAlloc that the sample missed |  10.1 |
| `malloc` + PartitionAlloc committed but holding no live objects  | 104.1 |
| the `v8` node                                                    |  98.5 |
| Oilpan, `blink_gc`                                               |  16.6 |

These exceed the footprint and are not meant to sum to it: the `v8` node is the
allocator's view of V8 — heap pages, code, metadata and external memory together
— and overlaps the page allocations counted in the first row. `ledger.mjs` is the
tool that does the ownership-edge subtraction properly; this table is a guide to
which instrument owns which slice.

The slack row is `malloc` 138.6 MB against 56.5 MB of live objects plus
`partition_alloc` 122.7 against 100.8. It is memory the allocator has committed
and not returned, and its size follows from the churn above: an allocator that has
just peaked at 100 MB of sweep buffers keeps the pages.

### WebAssembly linear memory

Invisible to every allocator node and every JS heap API; `ledger.mjs` measures it
by shimming `WebAssembly.Memory`. Within one `--work` run, committed linear memory
goes from 28.4 MB at boot to 165.7 MB with 200 tasks and 3 documents open, of
which 146.6 MB is automerge across three instances, because the bundle ships two
distinct automerge Rust binaries and the tab runs its own replica alongside the
worker's. Committed is not resident: at that checkpoint only 24.8 MB was resident,
and it grows as pages are touched.

## What a thing costs

Independent of everything above. Each row is one pair of pages differing in one
variable, generated by
[`cost-fixtures.mjs`](../../../packages/apps/composer-app/scripts/memory/cost-fixtures.mjs),
measured as the change in process footprint under `ledger.mjs --detached` and
divided by the number of units in the fixture.

| What you do                                            | Units in the fixture | Footprint cost per unit |
| ------------------------------------------------------ | -------------------- | ----------------------- |
| Hold 1 MB in an `ArrayBuffer`, anywhere in the process | 80 MB                | **1.02 MB**             |
| Spawn one dedicated worker                             | 4 workers            | **~2.6 MB**             |
| Ship one more ES module                                | 1,000 modules        | **~24 KB**              |
| Make one more HTTP request while loading               | 1,000 requests       | **~6.6 KB**             |
| One element with 6 CSS custom properties               | 3,000 elements       | **~1.2 KB**             |
| One element with a class list matching 9 rules         | 3,000 elements       | **~0.8 KB**             |
| Ship one more function                                 | 48,000 functions     | **~0.5 KB**             |

Each pair is n=1 against a blank-page baseline that varies 34.5–37.2 MB between
runs, so a pair whose whole delta is under ~3 MB is noise; the per-unit figure is
only as good as its pair's total. Binary data costs the same wherever it lives: 80
MB of `ArrayBuffer` held inside a **dedicated** worker moved the renderer's
footprint by 81.8 MB, because a dedicated worker runs inside the creating
renderer. Shared and service workers were not measured this way and Composer's
shared worker does get its own process.

## What this says to do

1. **Fix the log store's eviction sweep.** Store each chunk's byte length in the
   key next to `lineCount` and sweep with `getAllKeys()` alone; that removes both
   the `getAll()` payload and the `TextEncoder` copies. Stop re-entering the sweep
   on every 250 ms flush. ~790 MB of allocation per 90 seconds, up to 113 MB live
   at once, and the only item here with a control behind it.
2. **Drop the `detail` payload from `performance.measure` outside development.**
   Small today, retained for the life of the tab, unread in production.
3. **Ship fewer, larger modules.** 31 MB of decoded source and module-graph
   bookkeeping that does not go away, and the fixture puts the whole cost of
   Composer's code shape at 96.9 MB of footprint.
4. **Collapse the duplicate automerge instances.** Two Rust binaries plus a
   tab-side replica, 146.6 MB committed once data is open.

## What changed in this revision

The previous version said `<unspecified>` had no mechanism and that naming it
"needs a symbolized Chromium, which Chrome for Testing does not publish". The
first is now answered and the second was the wrong conclusion:

- Chromium's native sampling heap profiler has the stacks, over CDP as
  `Memory.startSampling` / `Memory.getSamplingProfile`, or in a memory-infra dump
  as `heaps_v2` when the browser is launched with `--memlog`.
- Chrome for Testing is stripped (3 symbols in a 246 MB framework) and so are the
  Chromium snapshot builds (2,690 exports, no DWARF) — but **Electron embeds the
  same Chromium and publishes a breakpad symbol file per release**, 553,160
  function records whose UUID matches the shipped binary.
- Electron's renderer profile is close to Chrome for Testing's — at a matched 25 s
  settle, 103 MB of `<unspecified>` against 101, `malloc` 172 against 193, `v8`
  113 against 114 — but one matched pair against a measurement this variable is
  weak evidence, so both arms above are Electron and the shares are not compared
  across engines.

Also corrected: macOS memory-infra _does_ emit `process_mmaps`, contrary to the
harness README, but only as a module map with no `byte_stats`, so it decomposes
nothing and no script here reads it.

## Reproducing

From `packages/apps/composer-app`, against a production build:

```bash
moon run composer-app:bundle
pnpm --filter @dxos/composer-app exec vite preview --port 4173 &

# Which application code allocates. No symbols needed; start here.
node scripts/memory/api-census.mjs http://localhost:4173 --settle 90

# Which C++ call site allocated. macOS only; ~250 MB of downloads and ~1.5 GB on
# disk once the symbol index is built.
scripts/memory/fetch-electron.sh
node scripts/memory/native-heap.mjs http://localhost:4173 --settle 90 \
  --symbols "$(find ./tmp/electron -name 'Electron Framework.sym' -print -quit)"

# The allocator ledger the shares above are a share of.
node scripts/memory/ledger.mjs http://localhost:4173 --detached --settle 90
```

To re-run the control, make `IdbLogStore#maybeEvict` return immediately, rebuild,
and compare. Run each arm at least three times: with the sweep in play, the spread
between runs is larger than most of the things being measured.
