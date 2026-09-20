# Where Composer's memory goes, for a JavaScript developer

`partition_alloc/allocated_objects/<unspecified>` was the largest unexplained
block in a Composer tab — around 100 MB that `ledger.mjs` could weigh and not
name. It has a cause, and most of it is one function.

Everything below comes from Chromium's native sampling heap profiler, which
records a C++ stack per allocation and drops the sample when the allocation is
freed. Run it with
[`scripts/memory/native-heap.mjs`](../../../packages/apps/composer-app/scripts/memory/native-heap.mjs).
Read it together with the harness
[README](../../../packages/apps/composer-app/scripts/memory/README.md), which
covers what each allocator node means and why a tab's footprint is not the sum
of them.

## Method, and what the numbers are not

The profiler is one process wide and covers `malloc` and PartitionAlloc
**together**; it does not separate them, and it does not see the V8 JS heap's
contents, Oilpan (`blink_gc`), or WebAssembly linear memory, each of which has
its own instrument. Percentages below are shares of what it sampled, not of the
tab's footprint.

Every run: production build, fresh profile, nothing opened, 90 s settle, a
forced collection in all four realms before the profile is read, Electron 44.4.3
(Chromium 152). The same page under Chrome for Testing 153 reads a higher
footprint, so compare within an engine.

Two arms. **As shipped**, and a **control** with `IdbLogStore#maybeEvict` stubbed
out to return immediately — the one-line change that removes the log store's
eviction sweep and nothing else.

| arm     | run | footprint | `<unspecified>` | sampled | of live objects | unresolved |
| ------- | --: | --------: | --------------: | ------: | --------------: | ---------: |
| shipped |   1 |    259 MB |         36.8 MB | 66.6 MB |             70% |       0.9% |
| shipped |   2 |    388 MB |        112.1 MB |  178 MB |             99% |       0.3% |
| shipped |   3 |    335 MB |        100.7 MB |  147 MB |             94% |       0.3% |
| control |   1 |    284 MB |         35.2 MB | 60.3 MB |             70% |       0.6% |
| control |   2 |    281 MB |         35.2 MB | 60.3 MB |             70% |       1.0% |

"unresolved" is the share of sampled bytes whose attributed frame has no symbol
and is printed as `module+0x…`. It is under 1%, so the call sites below are
names, not guesses.

The control is reproducible to two decimal places. The shipped arm is not,
because whether a run lands on a sweep is luck — shipped run 1 missed one and
lands exactly on the control's baseline.

## What the profiler names

Megabytes. Categories are matched against the whole stack and the first match in
this order wins, so an allocation made inside an IndexedDB callback is charged to
IndexedDB rather than to whatever allocated it.

| Mechanism                                  | shipped 1 | shipped 2 | shipped 3 | control 1 | control 2 |
| ------------------------------------------ | --------: | --------: | --------: | --------: | --------: |
| IndexedDB, including what its callbacks do |      0.27 |    112.80 |     88.46 |      0.22 |      0.30 |
| script source: fetch, decode, retain       |     31.74 |     31.42 |     31.20 |     31.01 |     31.62 |
| WebAssembly compile and code               |      9.27 |      9.18 |      9.07 |      9.44 |      8.78 |
| V8 heap pages and isolate tables           |      6.42 |      7.31 |      5.90 |      5.75 |      5.87 |
| font shaping tables                        |      5.60 |      3.85 |      3.81 |      3.76 |      3.96 |
| network and streams                        |      4.12 |      2.10 |      2.37 |      1.95 |      1.99 |
| `performance.measure(…, {detail})` clones  |      0.81 |      4.07 |      0.72 |      0.91 |      0.83 |
| DOM, CSS, paint                            |      1.84 |      1.68 |      1.67 |      1.75 |      1.52 |
| Blink strings not covered above            |      1.71 |      1.98 |      1.17 |      1.78 |      1.71 |
| structured clone elsewhere                 |      1.28 |      0.56 |      0.47 |      1.32 |      1.30 |
| mojo plumbing                              |      1.74 |      0.97 |      0.91 |      0.86 |      0.86 |
| uncategorised                              |      1.83 |      1.72 |      1.46 |      1.53 |      1.54 |

One row moves with the control. Everything else is within its own run-to-run
spread, including the two rows — fonts and `performance.measure` — that vary by
more than 2× between shipped runs for reasons this measurement does not settle.

## 1. The log store's eviction sweep — 0 to 113 MB

The answer to `<unspecified>`. With the sweep stubbed out, the block is 35.2 MB
in both control runs; with it running and caught, 100.7 and 112.1 MB.

[`IdbLogStore#evict`](../../../packages/common/log-store-idb/src/idb-log-store.ts)
does this:

```ts
const keys = (await promisifyRequest(store.getAllKeys())) as ChunkKey[];
const rows = (await promisifyRequest(store.getAll())) as LogChunk[];
const chunks = keys.map((key, index) => ({
  key,
  lineCount: key[3],
  byteLength: byteLengthUtf8(rows[index]!.lines), // new TextEncoder().encode(value).length
}));
```

Two costs, both avoidable, and the profiler separates them. Of shipped run 2's
112.8 MB:

- **63.1 MB in `blink::ArrayBufferContents` under `TextEncoder::encode`.**
  `byteLengthUtf8` allocates a full `Uint8Array` copy of each chunk purely to
  read `.length`, then discards it. Nothing needs the bytes.
- **36.0 MB in `mojo_base::BigBuffer`** — the rows themselves, arriving from the
  browser process. `getAll()` reads every chunk in the store even though only
  each chunk's size is wanted, and the size could ride in the key the way
  `lineCount` already does.
- the remainder is IndexedDB key and value deserialization on the same path.

The sweep is not on a 30-second cycle. `#scheduleEviction` sets a 30 s timer, but
`#writeBatch` also calls `void this.#maybeEvict()` after **every flush**, and the
flush interval is 250 ms. An origin-wide web lock (`ifAvailable: true`) stops two
from running concurrently, but the sweep is re-entered as fast as the lock frees.
That is why 99 MB of it can be simultaneously reachable after a forced
collection, against a database holding only 2.4 MB: measured directly, the
`composer-logs` store held 391 rows and 2.4 MB of text at the 90-second mark.

It runs in the observability worker. Composer's tab-side `IdbLogStore` is a read
handle for log downloads with no log processor attached, so it never writes and
never sweeps; `main.tsx` and `dedicated-worker.ts` each start an
[`observability-worker`](../../../packages/apps/composer-app/src/workers/observability-worker.ts),
which owns the writes and passes no `evictionInterval`. Those are **dedicated**
workers, so they run inside the creating renderer's process rather than one of
their own, and the cost shows up in the tab's footprint.

The store's cap is 50 MB. These runs saw it at 2.4 MB, 90 seconds into a fresh
profile. What a long-lived tab costs has not been measured, and the relationship
is not a simple multiple, but it is not smaller.

todomvc, on the same SDK, shows nothing here — it does not use the log store.

## 2. Script source — 31 MB, and it stays

The largest steady item, identical across both arms and still 28 MB at a
four-minute settle. Composer loads ~920 scripts holding 12.55 MB of source, and
the profiler splits the 31.01 MB of control run 1 as:

|    MB | Call site                                                         |
| ----: | ----------------------------------------------------------------- |
| 10.07 | `TextResourceDecoder::Decode` ← `ScriptDecoder::DidReceiveData`   |
|  8.88 | `ScriptDecoder::FinishDecode` on the thread pool                  |
|  5.19 | `TextResourceDecoder::Decode` ← `TextResource::DecodedText`       |
|  2.53 | `ModuleScript::RunScriptOnScriptStateAndReturnValue`              |
|  1.97 | `ModuleScript::ResolveModuleSpecifier` ← `JSModuleScript::Create` |
|  0.91 | `BackgroundJSStreamManager::RunScriptStreamingTask`               |
|  0.63 | `TextResource::DecodedText` ← `ScriptResource::GetSourceText`     |

So roughly 14.7 MB of decoded source text held, 11 MB of decode buffers that are
still reachable 90 seconds later, and 4.5 MB of module-graph bookkeeping that
scales with the number of modules rather than their size. Blink stores ASCII as
one byte per character, so 12.55 MB of source becoming 14.7 MB of text is close
to one copy; the decode buffers on top of it are the part that looks avoidable
and this measurement does not explain why they persist.

This is the native half of the fixture result that a synthetic page of the same
shape — 927 modules, 56,547 functions, 13.28 MB of source, doing nothing — costs
96.9 MB of footprint. Fewer, larger modules is the lever.

## 3. WebAssembly compile and code — 9 MB

`FetchDataLoaderForWasmStreaming::OnStateChange` and
`wasm::NativeModule::AddCompiledCode`: module bytes as they stream in, and the
compiled machine code. This is **not** wasm linear memory, which no allocator
node and no profiler here can see; see below. todomvc spends 8.2 MB here against
Composer's 8.8–9.4, so it is the SDK's automerge, not Composer. The category
cannot separate automerge's wasm from the SQLite build's.

## 4. V8 heap pages — 6 MB, and font shaping tables — 4–6 MB

`MemoryAllocator::AllocatePage` and friends is the container V8's own allocator
draws from, not its contents; the objects inside are the `v8` node, separately
~99–101 MB.

`HarfBuzzSkiaGetTable` under `HarfBuzzShaper::Shape` is HarfBuzz building a
per-font accelerator for the GSUB, GPOS, GDEF and morx tables the first time it
shapes text in that font. todomvc spends 1.9 MB against Composer's 3.8–5.6. The
gap is real; whether it is font count or text volume is not established, and the
row's own 1.5× spread between shipped runs is most of the difference.

## 5. `performance.measure(…, {detail})` — 0.7 to 4 MB

Passing `detail` structured-clones the object into a `SerializedScriptValue` the
entry holds for the life of the timeline; the profiler catches it as
`PerformanceMeasure::Create → V8ScriptValueSerializer::Serialize`. The call sites
are ECHO query execution
([`query-executor.ts`](../../../packages/core/echo/echo-host/src/query/query-executor.ts)),
ECHO indexing
([`echo-host.ts`](../../../packages/core/echo/echo-host/src/db-host/echo-host.ts)),
SQLite queries
([`opfs-client.ts`](../../../packages/common/sql-sqlite/src/internal/opfs-client.ts))
and the Effect `addTrackEntry` helper
([`Performance.ts`](../../../packages/common/effect/src/Performance.ts)), each
attaching a `devtools` track-entry object.

Nothing in the repo calls `clearMeasures` or `clearMarks`, and a tab holds 2,094
marks and 1,750 measures at idle against todomvc's 7 and 14. Under 4 MB today, it
grows for as long as the tab is open, and nothing reads it in production.

## What the profiler does not name

Shipped run 3, footprint 334.5 MB, of which the profiler named 147.2 MB:

| Where                                                              |    MB | Instrument                                   |
| ------------------------------------------------------------------ | ----: | -------------------------------------------- |
| named above                                                        | 147.2 | `native-heap.mjs`                            |
| `malloc` and PartitionAlloc committed but not holding live objects | 104.1 | `ledger.mjs`: node minus `allocated_objects` |
| the `v8` node                                                      |  98.5 | `ledger.mjs`                                 |
| Oilpan, `blink_gc`                                                 |  16.6 | `ledger.mjs`                                 |

These do not sum to the footprint and are not meant to: `v8` and `blink_gc` are
separate mappings from the first two rows, and `ledger.mjs` is the tool that does
the ownership-edge subtraction properly. The `v8` node is the allocator's view of
V8 — heap pages, code, metadata and external memory together — not the live JS
heap, which `--snapshot` measures separately.

The slack row is `malloc` 138.6 MB against 56.5 MB of live objects plus
`partition_alloc` 122.7 against 100.8. It is memory the allocator has committed
and not returned, and the size of it follows directly from the spiky mechanism
above: an allocator that has just peaked at 100 MB of sweep buffers keeps the
pages.

### WebAssembly linear memory

Invisible to every allocator node and every JS heap API; `ledger.mjs` measures it
by shimming `WebAssembly.Memory`. Within one `--work` run, committed linear
memory goes from 28.4 MB at boot to 165.7 MB with 200 tasks and 3 documents open,
of which 146.6 MB is automerge across three instances, because the bundle ships
two distinct automerge Rust binaries and the tab runs its own replica alongside
the worker's. Committed is not resident: at that checkpoint only 24.8 MB was
resident, and it grows as pages are touched.

## What a thing costs

Independent of the above, and unchanged. Each row is one pair of pages differing
in one variable, generated by
[`cost-fixtures.mjs`](../../../packages/apps/composer-app/scripts/memory/cost-fixtures.mjs),
measured as the change in process footprint under `ledger.mjs --detached`.

| What you do                                            | Footprint cost | Largest contributor       |
| ------------------------------------------------------ | -------------- | ------------------------- |
| Hold 1 MB in an `ArrayBuffer`, anywhere in the process | **1.02 MB**    | `partition_alloc`         |
| Spawn one dedicated worker                             | **~2.6 MB**    | `v8`, `malloc`            |
| Ship one more ES module                                | **~24 KB**     | `malloc` 62%              |
| One element with 6 CSS custom properties               | **~1.2 KB**    | `malloc`                  |
| One element with a class list matching 9 rules         | **~0.8 KB**    | `malloc`                  |
| Make one more HTTP request while loading               | **~6.6 KB**    | `malloc`, `web_cache`     |
| Ship one more function                                 | **~0.5 KB**    | `v8` 47%, `web_cache` 27% |

Each is n=1 per fixture against a blank-page baseline that varies 34.5–37.2 MB
between runs, so treat anything under ~3 MB as noise. These are whole-footprint
deltas and overlap the mechanisms above rather than adding to them. Binary data
costs the same wherever it lives: 80 MB of `ArrayBuffer` held inside a dedicated
worker moved the renderer's footprint by 81.8 MB, because dedicated and shared
workers run inside the creating renderer. Only a service worker gets its own
process.

## What this says to do

1. **Fix the log store's eviction sweep.** Store each chunk's byte length in the
   key next to `lineCount` and sweep with `getAllKeys()` alone; that removes both
   the `getAll()` payload and the `TextEncoder` copies. Failing that, count UTF-8
   bytes without allocating, and stop re-entering the sweep on every 250 ms
   flush. Worth up to ~100 MB and ~77 MB of `<unspecified>`, and it is the only
   item here with a control behind it.
2. **Drop the `detail` payload from `performance.measure` outside development.**
   Small today, retained for the life of the tab, and unread in production.
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
- Electron's renderer profile is close enough to stand in: at a matched 25 s
  settle, 103 MB of `<unspecified>` against Chrome for Testing's 101, `malloc`
  172 against 193, `v8` 113 against 114. One matched pair against a measurement
  that varies by 25% between identical runs is weak evidence for equivalence, so
  the comparison arms here are all Electron.

Also corrected: macOS memory-infra _does_ emit `process_mmaps`, contrary to the
harness README, but only as a module map with no `byte_stats`, so it decomposes
nothing and no script here reads it.

## Reproducing

From `packages/apps/composer-app`, against a production build:

```bash
moon run composer-app:bundle
pnpm --filter @dxos/composer-app exec vite preview --port 4173 &

# One-time: Electron plus its breakpad symbols. macOS only; ~250 MB of
# downloads and ~1.5 GB on disk once the symbol index is built.
scripts/memory/fetch-electron.sh

node scripts/memory/native-heap.mjs http://localhost:4173 --settle 90 \
  --symbols "$(find ./tmp/electron -name 'Electron Framework.sym' -print -quit)" \
  --json ./tmp/native-heap.json

# The allocator ledger the shares above are a share of.
node scripts/memory/ledger.mjs http://localhost:4173 --detached --settle 90
```

To re-run the control, make `IdbLogStore#maybeEvict` return immediately, rebuild,
and compare. Run each arm at least twice: the shipped arm's spread is the finding.
