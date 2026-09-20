# Where Composer's memory goes, for a JavaScript developer

Every figure below comes from Chromium's native sampling heap profiler, which
records a C++ stack per allocation and drops the sample when the allocation is
freed. Run it with
[`scripts/memory/native-heap.mjs`](../../../packages/apps/composer-app/scripts/memory/native-heap.mjs).
It names **76–89% of the bytes the allocator reports as live** in `malloc` and
`partition_alloc` — the two nodes `ledger.mjs` could previously only weigh.

Read this together with the harness
[README](../../../packages/apps/composer-app/scripts/memory/README.md), which
covers what each allocator node means and why a tab's footprint is not the sum
of them.

## How to read the numbers

Three runs against the same production build, fresh profile, nothing opened:

| settle | footprint | named by the profiler | coverage of live objects |
| -----: | --------: | --------------------: | -----------------------: |
|   90 s |    382 MB |                145 MB |                      88% |
|   90 s |    312 MB |                 74 MB |                      76% |
|  240 s |    305 MB |                 91 MB |                      89% |

Footprint swings by 25% between identical runs and falls as the boot burst is
collected, so **quote the settle time with any number from this page**, and
treat a single run's total as a sample rather than a fact. These were measured
in Electron 44.4.3 (Chromium 152); the same page under Chrome for Testing 153
reads 417–445 MB, so compare figures within an engine, not across.

The profiler covers `malloc` and PartitionAlloc. It does not see the V8 JS heap's
contents, Oilpan (`blink_gc`), or WebAssembly linear memory, each of which has
its own instrument.

## What the profiler names

Shares of the 90 s / 240 s runs. First match wins, so work done inside a
callback is charged to the thing that called it.

| Mechanism                                    |  90 s a |  90 s b |   240 s |
| -------------------------------------------- | ------: | ------: | ------: |
| IndexedDB reads, and what their callbacks do | 44.6 MB | 11.6 MB | 31.3 MB |
| Script source: fetch, decode, retain         | 31.0 MB | 28.2 MB | 28.0 MB |
| WebAssembly compile and code                 | 10.0 MB |  9.2 MB |  8.9 MB |
| V8 heap pages and isolate tables             | 12.9 MB |  8.3 MB |  7.8 MB |
| Font shaping tables                          | 10.2 MB |  4.7 MB |  4.8 MB |
| `performance.measure(…, {detail})` clones    | 17.5 MB |  1.0 MB |  1.2 MB |
| everything else                              | 19.4 MB | 10.8 MB |  9.5 MB |

Two of these are spiky and four are steady. The spread on the IndexedDB and
`performance.measure` rows is not noise — it is what a periodic burst looks like
when you sample it at one instant.

## The mechanisms, in JavaScript terms

### 1. The log store reads and re-encodes itself every 30 seconds — up to 45 MB

The single largest thing the profiler found, and it is a loop, not a leak.

[`IdbLogStore#evict`](../../../packages/common/log-store-idb/src/idb-log-store.ts)
runs on a 30-second interval and does this:

```ts
const rows = (await promisifyRequest(store.getAll())) as LogChunk[];
const chunks = keys.map((key, index) => ({
  key,
  lineCount: key[3],
  byteLength: byteLengthUtf8(rows[index]!.lines), // new TextEncoder().encode(value).length
}));
```

Two costs, both avoidable:

- `store.getAll()` pulls **every log chunk** out of IndexedDB. The rows arrive
  over mojo as `mojo_base::BigBuffer` — 5.6–14.2 MB per sweep in these runs.
- `byteLengthUtf8` calls `TextEncoder.encode(value).length` on each row, which
  allocates a full `Uint8Array` copy of the chunk purely to read `.length` and
  then discards it — 6.5–23.9 MB per sweep, landing in
  `blink::ArrayBufferContents`.

The store's cap is 50 MB, so on a tab that has been open long enough to fill it
the sweep reads 50 MB and allocates another ~50 MB every 30 seconds. Nothing
retains it afterwards, which is why one 90-second run caught 44.6 MB and another
caught 11.6 MB — the difference is whether the dump landed mid-sweep.

Composer disables eviction in the tab and in the client worker
(`evictionInterval: 0`), but
[`observability-worker.ts`](../../../packages/apps/composer-app/src/workers/observability-worker.ts)
does not, and it is a **dedicated** worker, which runs inside the creating
renderer's process. `main.tsx` and `dedicated-worker.ts` each start one, so two
copies of the sweep run in two renderers over the same database.

todomvc, on the same SDK, shows zero here — it does not use the log store.

### 2. Script source text — 28–31 MB

The largest steady item, and the one that does not go away.

Composer loads ~920 scripts holding 12.55 MB of source. Blink downloads each as
bytes and decodes it to UTF-16 before handing it to V8, which is where the
factor of two comes from. The profiler splits it as:

- `ScriptDecoder::FinishDecode` on the thread pool, 4.8–16.9 MB — the off-thread
  decode of a script body.
- `TextCodecUtf8::Decode` under `TextResource::DecodedText`, ~4–6 MB — the same
  work on the main thread, mostly for worker main scripts via
  `WorkerModuleScriptFetcher`, plus stylesheets.
- `ModuleScript::ResolveModuleSpecifier`, 1.9–2.4 MB — resolving one import
  specifier against another, which scales with the number of modules rather than
  their size.

This is the native half of the earlier finding that a synthetic page of the same
shape — 927 modules, 56,547 functions, 13.28 MB of source, doing nothing — costs
96.9 MB. Fewer and larger modules is the lever; the bytes inside them matter
less than how many files they arrive in.

### 3. WebAssembly compile and code — 9–10 MB

`FetchDataLoaderForWasmStreaming::OnStateChange` and
`wasm::NativeModule::AddCompiledCode`: the module bytes as they stream in, and
the compiled machine code. This is **not** wasm linear memory, which no
allocator node and no profiler here can see — for that, see the `WebAssembly`
section below.

todomvc spends 8.2 MB here against Composer's 8.9–10.0, so this is the SDK's
automerge cost, not Composer's.

### 4. V8 heap pages and isolate tables — 8–13 MB

`MemoryAllocator::AllocatePage` and friends: the pages V8 hands its own
allocator, plus the string table and traced-handle blocks. This is the container,
not the contents — the objects inside are the `v8` node in `ledger.mjs`,
separately ~98–113 MB.

### 5. Font shaping tables — 5–10 MB

`HarfBuzzSkiaGetTable` under `HarfBuzzShaper::Shape`: HarfBuzz builds an
accelerator structure per font for the GSUB, GPOS, GDEF and morx tables the first
time it shapes text in that font. Composer spends 4.7–10.2 MB against todomvc's
1.9, which is a font-count difference, not a text-volume one.

### 6. `performance.measure(…, {detail})` — 1–17 MB

Passing `detail` to `performance.measure` structured-clones the object into a
`SerializedScriptValue` that the entry holds for the life of the timeline. The
profiler catches the serialization through
`PerformanceMeasure::Create → V8ScriptValueSerializer::Serialize`.

The call sites are ECHO query execution
([`query-executor.ts`](../../../packages/core/echo/echo-host/src/query/query-executor.ts)),
ECHO indexing
([`echo-host.ts`](../../../packages/core/echo/echo-host/src/db-host/echo-host.ts)),
SQLite queries
([`opfs-client.ts`](../../../packages/common/sql-sqlite/src/internal/opfs-client.ts))
and the Effect `addTrackEntry` helper
([`Performance.ts`](../../../packages/common/effect/src/Performance.ts)), each
attaching a `devtools` track-entry object.

Nothing in the repo calls `clearMeasures` or `clearMarks`. At idle a tab holds
about 1.2 MB of retained clones and 2,094 marks / 1,750 measures against
todomvc's 7 and 14, and one run caught 17.5 MB live during the boot indexing
burst. The retained figure is small today; it grows for as long as the tab is
open, and it buys nothing in production where no DevTools track is listening.

## What the profiler does not name

At 90 s the renderer's footprint was 382 MB. The profiler named 145 MB of it.
The rest is accounted for, just by other instruments:

| Where                                     |  MB | Instrument                   |
| ----------------------------------------- | --: | ---------------------------- |
| named above                               | 145 | `native-heap.mjs`            |
| allocator slack: committed but not in use | ~99 | `ledger.mjs` node vs subnode |
| V8 JS heap contents                       | 113 | `ledger.mjs --by-code`       |
| Oilpan (DOM, CSSOM, perf entries)         |  40 | `ledger.mjs --snapshot`      |

The slack row is `malloc` 152 MB against `malloc/allocated_objects` 83 MB, plus
`partition_alloc` 112 MB against its 82 MB of live objects. That is memory the
allocator has committed and not returned to the OS, and the size of it is a
direct consequence of the spiky mechanisms above: an allocator that has peaked at
45 MB of log-sweep buffers keeps the pages.

These rows do not sum to the footprint and are not meant to — `v8` and
`blink_gc` overlap the page allocations counted in the first row, and
`ledger.mjs` is the tool that does the ownership-edge subtraction properly.

### WebAssembly

Invisible to every allocator node and every JS heap API; `ledger.mjs` measures it
by shimming `WebAssembly.Memory`. Within one `--work` run, committed linear
memory goes from 28.4 MB at boot to 165.7 MB with 200 tasks and 3 documents open,
of which 146.6 MB is automerge across three instances, because the bundle ships
two distinct automerge Rust binaries and the tab runs its own replica alongside
the worker's. Committed is not resident: at that checkpoint only 24.8 MB was
resident, and it grows as pages are touched.

## What a thing costs

Unchanged from the previous revision, and independent of the above. Each row is
one pair of pages differing in one variable, generated by
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
between runs, so treat anything under ~3 MB as noise. Binary data costs the same
wherever it lives: 80 MB of `ArrayBuffer` held inside a dedicated worker moved
the renderer's footprint by 81.8 MB, because dedicated and shared workers run
inside the creating renderer. Only a service worker gets its own process.

## What this says to do

1. **Stop the log store's eviction sweep from reading and re-encoding the whole
   database.** `getAllKeys()` plus a byte count stored in the key removes both
   halves at once; failing that, count UTF-8 bytes without allocating. Largest
   single item found, up to 45 MB per sweep every 30 seconds, and the sweep runs
   in two renderers.
2. **Drop the `detail` payload from `performance.measure` outside development.**
   It is structured-cloned and retained for the life of the tab, and nothing
   reads it in production.
3. **Ship fewer modules.** 920 of them cost 28–31 MB of decoded source that never
   goes away, plus per-module overhead measured at ~24 KB each.
4. **Collapse the duplicate automerge instances.** Two Rust binaries plus a
   tab-side replica, 146.6 MB committed once data is open.

## What changed in this revision

The previous version of this page said the ~100 MB of
`partition_alloc/allocated_objects/<unspecified>` had no mechanism and that
naming it "needs a symbolized Chromium, which Chrome for Testing does not
publish". The first half is now wrong and the second was the wrong conclusion:

- Chromium's native sampling heap profiler has the stacks, reachable over CDP as
  `Memory.startSampling` / `Memory.getSamplingProfile`, or in a memory-infra dump
  as `heaps_v2` when the browser is launched with `--memlog`.
- Chrome for Testing is stripped (3 symbols in a 246 MB framework) and so are the
  Chromium snapshot builds (2,690 exports, no DWARF) — but **Electron embeds the
  same Chromium and publishes a breakpad symbol file per release**, 553,160
  function records whose UUID matches the shipped binary. Same engine, same page,
  resolvable frames.
- The Electron renderer's allocator profile matches Chrome for Testing's closely
  enough to stand in — at a matched 25 s settle, 103 MB of `<unspecified>` against
  101, `malloc` 172 against 193, `v8` 113 against 114.

Also corrected: macOS memory-infra _does_ emit `process_mmaps`, contrary to what
the harness README said, but only as a module map — it carries none of the
`byte_stats` that make it a decomposition on Linux, so it is useful for turning a
stack address into module+offset and nothing else.

## Reproducing

From `packages/apps/composer-app`, against a production build:

```bash
moon run composer-app:bundle
pnpm --filter @dxos/composer-app exec vite preview --port 4173 &

# One-time: Electron plus its breakpad symbols (~250 MB).
scripts/memory/fetch-electron.sh

node scripts/memory/native-heap.mjs http://localhost:4173 --settle 90 \
  --symbols "$(find ./tmp/electron -name 'Electron Framework.sym')" \
  --json ./tmp/native-heap.json

# The allocator ledger the shares above are a share of.
node scripts/memory/ledger.mjs http://localhost:4173 --detached --settle 90
```

Run it three times before believing any single number.
