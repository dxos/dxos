# Where Composer's memory goes, for a JavaScript developer

`partition_alloc/allocated_objects/<unspecified>` was the largest unexplained
block in a Composer tab — around 100 MB that `ledger.mjs` could weigh and not
name. It is **34.8 MB of baseline plus whatever the log store's eviction sweep
has in flight**, and the sweep can have 113 MB in flight.

The sweep reads Composer's whole IndexedDB log database and re-encodes every row
to measure it, several times a second, in two workers inside the tab's renderer.
Over 90 seconds it allocates about 770 MB from a 2.4 MB database, to compute
numbers the store already has.

Two instruments, both in
[`scripts/memory`](../../../packages/apps/composer-app/scripts/memory):

- [`native-heap.mjs`](../../../packages/apps/composer-app/scripts/memory/native-heap.mjs)
  reads Chromium's native sampling heap profiler, which records a C++ stack per
  allocation and drops the sample when the allocation is freed. It says which C++
  call site allocated, and it carries a small JS-side probe so a run can also say
  which IndexedDB reads happened while it was sampling.
- [`api-census.mjs`](../../../packages/apps/composer-app/scripts/memory/api-census.mjs)
  shims `TextEncoder.encode` and IndexedDB's reads in every realm before the app's
  first script runs, and records the JS stack. It says which application line
  asked, and how often.

Read both with the harness
[README](../../../packages/apps/composer-app/scripts/memory/README.md), which
covers what each allocator node means and why a tab's footprint is not their sum.

## The measurement

Eight runs of one tool revision: four of the app **as built**, four of a
**control** whose only difference is that `IdbLogStore#maybeEvict` returns
immediately. Production build, fresh profile, nothing opened, 90-second settle, a
forced collection in every attached realm before the profile is read, Electron
44.4.3 (Chromium 152).

| arm     | footprint | `<unspecified>` | sampled | of live objects | unresolved | IndexedDB category | `getAll` on `composer-logs` |
| ------- | --------: | --------------: | ------: | --------------: | ---------: | -----------------: | --------------------------: |
| built   |    259 MB |        36.33 MB | 65.7 MB |             70% |       1.1% |            0.23 MB |                        none |
| built   |    343 MB |        34.77 MB | 63.2 MB |             71% |       1.0% |            3.92 MB |                          75 |
| built   |    347 MB |       124.68 MB |  184 MB |            101% |       0.3% |          123.72 MB |                          74 |
| built   |    357 MB |       111.77 MB |  174 MB |            101% |       0.3% |          113.00 MB |                          71 |
| control |    282 MB |        34.76 MB | 58.6 MB |             68% |       1.1% |            0.23 MB |                        none |
| control |    285 MB |        34.77 MB | 58.8 MB |             68% |       1.1% |            0.22 MB |                        none |
| control |    282 MB |        34.77 MB | 58.6 MB |             68% |       1.0% |            0.18 MB |                        none |
| control |    281 MB |        34.83 MB | 60.4 MB |             70% |       1.1% |            0.29 MB |                        none |

The last two columns come from the same run as the rest of the row, which is what
makes this more than a correlation across runs:

- Every control run sits at **34.8 MB**, to two decimal places, and issues no bulk
  read of the log store at all.
- The two built runs that caught a sweep mid-flight put `<unspecified>` at 124.68
  and 111.77 MB while the profiler charged **123.72 and 113.00 MB** to the
  IndexedDB path. The block is the baseline plus the sweep's live buffers, within
  a rounding error, in the same run.
- The other two built runs ran sweeps too but were not sampling one at the
  instant of the dump, and land back on the control's floor.

Two notes on the numbers. "Sampled" is a Poisson estimate, so 101% of live objects
is the estimator, not an error. The `getAll` counts here are a lower bound: this
probe reaches a worker after it has started, so it misses the earliest calls;
`api-census.mjs`, which pauses each realm before its first script, counts roughly
190 per worker over the same 90 seconds.

## What it costs once there is data in it

Everything above and below this section is an empty tab on a fresh profile,
which is not the state anyone complains about.
[`seed-profile.mjs`](../../../packages/apps/composer-app/scripts/memory/seed-profile.mjs)
builds a persistent profile from the nightly's own fixture — here three spaces,
600 tasks and 9 documents of 400 paragraphs each — and `native-heap.mjs
--profile <dir> --journey` boots on it and opens a project's tasks and a document
in every space before measuring.

| profile                | footprint | `<unspecified>` | sampled | IndexedDB | `performance.measure` |
| ---------------------- | --------: | --------------: | ------: | --------: | --------------------: |
| empty, nothing open    |    259 MB |         36.3 MB |   66 MB |    0.2 MB |                0.7 MB |
| empty, nothing open    |    357 MB |        111.8 MB |  174 MB |    113 MB |                0.9 MB |
| 3 spaces, nothing open |    363 MB |        195.9 MB |  253 MB |    190 MB |                2.2 MB |
| 3 spaces, nothing open |    471 MB |        264.7 MB |  383 MB |    294 MB |               24.0 MB |
| 3 spaces, all opened   |    796 MB |        401.5 MB |  447 MB |    302 MB |               52.0 MB |
| 3 spaces, all opened   |    814 MB |        305.7 MB |  401 MB |    238 MB |               72.4 MB |

**The tab reaches 800 MB, and the log store's sweep is still most of it.** The
reason it scales so hard is the store's own cap: on a seeded profile the log
database is 44.3 MB at boot and hits its 50 MB limit within a minute of use, so
every sweep now reads 50 MB rather than the 2.4 MB an empty profile had. The JS
census counts 399 `getAll` pairs on `composer-logs` during one journey run, and
no other bulk IndexedDB read in any realm.

**And `TextEncoder.encode` charges twice for it.** Of the 447 MB sampled in the
first journey run:

- **141.2 MB** in `ArrayBufferContents` under `TextEncoder::encode` — the output
  `Uint8Array` per row, which is discarded after `.length` is read.
- **101.0 MB** in `ToBlinkString` under `NativeValueTraits<IDLUSVStringBase>` —
  Blink copying the JS string into its own heap to satisfy the binding's
  `USVString` parameter, before any encoding happens. Both have the same two JS
  frames beneath them.

That is **242 MB, 54% of everything the profiler sampled**, from one line that
wants a number it could have stored in the key.

**`performance.measure` is churn, not a leak.** It rises to 24–72 MB once there is
data to query and index, but the retained detail payloads across 1,871 entries
total ~0.1 MB: the bytes are serialization buffers in flight during a burst of
ECHO queries, not entries piling up. The entry count does grow without bound —
1,332 after boot, still climbing three passes later — but that costs kilobytes,
not megabytes. An earlier revision of this page said it "grows for as long as the
tab is open" in a way that implied the bytes grow with it; they do not.

Script source stays flat at 31–33 MB whatever the profile holds, which is what
makes it the floor rather than the problem.

## What the fix bought

[dxos/dxos#13251](https://github.com/dxos/dxos/pull/13251) put `byteLength` in the
chunk key beside `lineCount`, so `#evict` computes its retention budget from
`getAllKeys()` alone and the encoding happens once per chunk at write time
instead of once per row per sweep. Three runs per arm, each on a pristine copy of
the same three-space profile, `--journey --settle 90`:

|          | footprint | `<unspecified>` |  sampled | IndexedDB | `getAll` / `getAllKeys` |
| -------- | --------: | --------------: | -------: | --------: | ----------------------: |
| before 1 |    737 MB |        232.1 MB | 379.5 MB |  208.1 MB |               531 / 531 |
| before 2 |    730 MB |        339.7 MB | 446.6 MB |  277.8 MB |               507 / 507 |
| before 3 |    865 MB |        335.1 MB | 520.8 MB |  351.4 MB |               576 / 577 |
| after 1  |    614 MB |         77.8 MB | 142.8 MB |    1.9 MB |                  0 / 12 |
| after 2  |    650 MB |         94.7 MB | 171.0 MB |    1.9 MB |                  0 / 12 |
| after 3  |    647 MB |         95.4 MB | 173.2 MB |    0.7 MB |                  0 / 11 |

Every after-run sits below every before-run on every column. The mechanism is
gone rather than reduced: `getAll` to zero, and the IndexedDB category from a
279 MB mean to 1.5 MB.

**The footprint moved less than the allocation did, and the ratio is the point.**
287 MB of mean sampled allocation removed yields 140 MB of mean footprint —
777 MB down to 637 MB, 18%. About half of what the sweep allocated was pages the
allocator had committed and would have kept either way. That gap between "stops
allocating" and "gives memory back" is the thing to expect from any fix aimed at
churn, and it is why the estimate this page carried before the fix landed, which
put the sweep at roughly a third of the tab, came in about 2x high.

**It also raised a new question.** The after arm's `<unspecified>` floor is
78-95 MB on a loaded profile against 34.8 MB on an empty one, so roughly 54 MB of
that block scales with data and has nothing to do with the sweep. The
empty-profile work could not see it. It is the largest unexplained thing left in
the block.

One detail worth keeping: `getAllKeys` is 11-12 per run, not zero. A 30-second
timer alone would fire three times in 90 seconds, so `#writeBatch` still
re-enters the sweep after every flush — it is merely cheap now. The trigger was
not what changed.

## 1. The log store's eviction sweep

[`IdbLogStore#evict`](../../../packages/common/log-store-idb/src/idb-log-store.ts):

```ts
const keys = (await promisifyRequest(store.getAllKeys())) as ChunkKey[];
const rows = (await promisifyRequest(store.getAll())) as LogChunk[];
const chunks = keys.map((key, index) => ({
  key,
  lineCount: key[3],
  byteLength: byteLengthUtf8(rows[index]!.lines), // utf8Encoder.encode(value).length
}));
```

`api-census.mjs`, as built, 90 seconds:

| realm                   |    `TextEncoder.encode` | bulk IDB reads |
| ----------------------- | ----------------------: | -------------: |
| observability worker    | 397.2 MB / 39,349 calls |            390 |
| observability worker    | 376.5 MB / 36,716 calls |            350 |
| client dedicated worker |   2.5 MB / 26,575 calls |              0 |
| page                    |      0.0 MB / 159 calls |              0 |

Against the control: the observability workers issue no bulk read and encode
nothing, and the census reports only the page and the client worker's 2.4 MB of
SQLite parameter binding.

Every one of those 39,349 encode calls has the same JS stack,
`observability-worker.js:4:838` inside an `Array.map` — the `byteLengthUtf8` line
above. The database is small: measured directly at the 90-second mark,
`composer-logs/logs` held 391 rows and 2.4 MB of text. So each sweep reads 2.4 MB
it does not need and allocates a `Uint8Array` copy of every row purely to read
`.length`.

**It runs far more often than its timer suggests.** `#scheduleEviction` sets a
30-second timer, but `#writeBatch` also calls `void this.#maybeEvict()` after
**every flush**, and the flush interval is 250 ms. An origin-wide web lock
(`ifAvailable: true`) keeps two from overlapping, so the two workers' sweeps
serialise — 390 + 350 bulk reads over 90 seconds is about four a second across the
origin, which is the flush cadence, not the timer's.

**And it runs inside the tab's renderer, twice.** `main.tsx` and
`dedicated-worker.ts` each start an
[`observability-worker`](../../../packages/apps/composer-app/src/workers/observability-worker.ts),
and those are **dedicated** workers, which run in the creating renderer's process
rather than one of their own. The observability worker is the only `IdbLogStore`
in the app constructed without `evictionInterval: 0`, so it is the only one whose
timer arms. The tab's own store passes `evictionInterval: 0` and has no log
processor attached, so it neither writes nor sweeps at idle — though `exportBlob`
calls `#maybeEvict` directly, so every log download sweeps once regardless of the
option.

The store's cap is 50 MB. These runs saw it at 2.4 MB, 90 seconds into a fresh
profile. What a long-lived tab costs has not been measured; it is not smaller.

todomvc, on the same SDK, does none of this — it has no log store.

## 2. Script source — 31 MB, and it stays

The largest steady item: **30.5–31.6 MB in all eight runs**, both arms, and 30.8 MB
at a four-minute settle. Composer loads ~920 scripts holding 12.55 MB of source,
and the profiler splits one run's 31.01 MB as:

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
still reachable 90 seconds later, 2.0 MB of import-specifier resolution that
scales with module count, and 2.5 MB allocated by the module bodies themselves as
they run. Blink stores ASCII as one byte per character, so 12.55 MB of source
becoming 14.7 MB of text is close to one copy — the decode buffers on top of it
are the part that looks avoidable, and this measurement does not explain why they
persist.

This is the native half of the fixture result that a synthetic page of the same
shape — 927 modules, 56,547 functions, 13.28 MB of source, doing nothing — costs
96.9 MB of footprint. Fewer, larger modules is the lever.

## 3. The rest

Ranges across the eight runs.

| Mechanism                                 |      MB | Notes                                                                                                                                                        |
| ----------------------------------------- | ------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WebAssembly compile and code              | 8.8–9.4 | module bytes and compiled code, not linear memory. todomvc spends 8.2, so this is the SDK's automerge; the category cannot separate it from the SQLite build |
| V8 heap pages and isolate tables          | 5.8–6.9 | the container V8's allocator draws from, not its contents                                                                                                    |
| font shaping tables                       | 3.8–5.6 | `HarfBuzzSkiaGetTable`: a per-font accelerator built on first shaping. todomvc spends 1.9                                                                    |
| network and streams                       | 1.8–4.1 |                                                                                                                                                              |
| DOM, CSS, paint                           | 1.5–1.9 | Composer's DOM is small at rest, ~3,055 elements                                                                                                             |
| Blink strings not covered above           | 1.7–1.9 |                                                                                                                                                              |
| mojo plumbing                             | 0.8–1.6 |                                                                                                                                                              |
| `performance.measure(…, {detail})` clones | 0.7–0.9 | see below                                                                                                                                                    |
| structured clone elsewhere                | 0.5–0.7 |                                                                                                                                                              |
| uncategorised                             | 1.5–1.9 |                                                                                                                                                              |

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
1,750 measures at idle against todomvc's 7 and 14. Under 1 MB today, unread in
production, and it grows for as long as the tab is open.

## What the profiler does not name

One built run, footprint 346.83 MB, of which the profiler named 183.72 MB. Every
figure comes from that run's own dump.

| Where                                                            |    MB |
| ---------------------------------------------------------------- | ----: |
| named above                                                      | 183.7 |
| live objects in `malloc` + PartitionAlloc that the sample missed |  -1.1 |
| `malloc` + PartitionAlloc committed but holding no live objects  | 134.1 |
| the `v8` node                                                    |  98.3 |
| Oilpan, `blink_gc`                                               |  17.1 |

The second row is negative because the sample is a Poisson estimate that came in
0.6% over that run's 182.65 MB of live objects; read it as zero. In the runs
without a sweep the same row is 25–30 MB.

These exceed the footprint and are not meant to sum to it: the `v8` node is the
allocator's view of V8 — heap pages, code, metadata and external memory together
— and overlaps the page allocations in the first row. `ledger.mjs` is the tool
that does the ownership-edge subtraction properly; this table says which
instrument owns which slice.

The slack row is `malloc` 138.7 MB against 57.9 MB of live objects plus
`partition_alloc` 178.1 against 124.8. It is memory the allocator has committed
and not returned, and its size follows from the churn above: in the control runs,
where no sweep runs, `malloc` commits 98 MB against 51 MB live rather than 139
against 58.

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

| What you do                                            | Units in the fixture | Pair's total delta | Per unit    |
| ------------------------------------------------------ | -------------------- | -----------------: | ----------- |
| Hold 1 MB in an `ArrayBuffer`, anywhere in the process | 80 MB                |            81.8 MB | **1.02 MB** |
| Ship one more ES module                                | 1,000 modules        |            30.7 MB | **~24 KB**  |
| Spawn one dedicated worker                             | 4 workers            |            10.4 MB | **~2.6 MB** |
| Make one more HTTP request while loading               | 1,000 requests       |             6.6 MB | **~6.6 KB** |
| One element with 6 CSS custom properties               | 3,000 elements       |             3.6 MB | **~1.2 KB** |
| One element with a class list matching 9 rules         | 3,000 elements       |             2.4 MB | **~0.8 KB** |
| Ship one more function                                 | 48,000 functions     |            24.0 MB | **~0.5 KB** |

Each pair is n=1 against a blank-page baseline that varies 34.5–37.2 MB between
runs, so the CSS rows, whose whole delta is 2.4 and 3.6 MB, are at the noise floor
and should be treated as order-of-magnitude only.

An `ArrayBuffer` held inside a **dedicated** worker costs the creating renderer
exactly what one held on the page does — 80 MB moved the renderer's footprint by
81.8 MB — because a dedicated worker runs in that renderer. Shared and service
workers were not measured this way and Chromium may host them elsewhere.

## What this says to do

1. ~~**Fix the log store's eviction sweep.**~~ Done in
   [#13251](https://github.com/dxos/dxos/pull/13251): 287 MB less allocation and
   140 MB less footprint on a loaded profile. See "What the fix bought" above.
2. **Drop the `detail` payload from `performance.measure` outside development.**
   Under 1 MB today, retained for the life of the tab, unread in production.
3. **Ship fewer, larger modules.** 31 MB of decoded source and module-graph
   bookkeeping that does not go away, and the fixture puts the whole cost of
   Composer's code shape at 96.9 MB of footprint.
4. **Collapse the duplicate automerge instances.** Two Rust binaries plus a
   tab-side replica, 146.6 MB committed once data is open.
5. **Decompose the `v8` node.** 171 MB on a loaded journey run and never opened,
   which makes it the largest single thing on this page with no attribution
   behind it at all. The document data should be in there.

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
  113 against 114 — but one matched pair is weak evidence, so both arms above are
  Electron and no share is compared across engines.
- The native profiler alone could not separate the arms: its IndexedDB category
  matches the log store's writes as well as its sweep, and two earlier runs
  disagreed with the arm they were in. What settled it was instrumenting the JS
  side and putting the read counts in the same run as the profile.

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
and compare. Run each arm at least four times: half the built runs miss the sweep
entirely, and a single run of either arm looks like the other.
