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

## Progression

One row per fix, appended as each lands. Every row is the mean of three
`native-heap.mjs --profile --journey --settle 90` runs on pristine copies of the
same profile, seeded on the baseline build so every arm can open its databases,
with the profile's service-worker precache cleared so each arm runs its own
bundle. Footprint is the app renderer's private footprint in MiB; the other
columns are the map's, defined under "The map after the fix".

| arm           | footprint |    Δ |  live | slack |    v8 |  wasm | sampled | notes                                         |
| ------------- | --------: | ---: | ----: | ----: | ----: | ----: | ------: | --------------------------------------------- |
| baseline      |     876.3 |    – | 509.7 | 255.3 | 174.1 | 109.0 |   442.8 | #13250's tree                                 |
| fix 1         |     684.6 | -192 | 228.2 | 183.9 | 176.3 | 111.3 |   179.6 | #13251, log store sweeps from keys            |
| fix 1 + fix 2 |     617.1 |  -67 | 134.0 | 153.0 | 177.4 | 112.8 |    97.5 | #13281, track entries gated out of production |

Per-run spread: baseline 830–939, fix 1 676–691, fix 1 + 2 575–647. The baseline
and the last arm swing by ±50 MB run to run; fix 1 is tight. Read a delta under
~30 MB as noise until it has more runs behind it.

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

**`performance.measure` was called churn here, and that was wrong.** This
revision said the 24–72 MB was serialization buffers in flight and that the
retained detail totalled ~0.1 MB, from `JSON.stringify` of 1,871 entries' `detail`
in an empty tab. On a loaded profile the worker holds over 100,000 entries with
42 MB of `detail` as JSON, and every one keeps its structured clone for the life
of the realm. It is retention, and removing it returned more footprint than the
profiler had charged to it. See "What the gate bought" below.

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
the block. (Answered below: it was the retained `performance.measure` clones,
and the gate takes `<unspecified>` from ~97 MB to ~43 MB on the same profile.)

One detail worth keeping: `getAllKeys` is 11-12 per run, not zero. A 30-second
timer alone would fire three times in 90 seconds, so `#writeBatch` still
re-enters the sweep after every flush — it is merely cheap now. The trigger was
not what changed.

## The map after the fix

Five journey runs on [#13251](https://github.com/dxos/dxos/pull/13251)'s head,
each on a pristine copy of the same three-space profile, `--journey --settle 90`.
Every column is the app's own renderer, which under a dedicated-worker
architecture holds the tab, the ECHO host and SQLite in one process.

| run  | footprint |    v8 | malloc |    PA | Oilpan |  live | slack | tab old | wkr old |  wasm |
| ---- | --------: | ----: | -----: | ----: | -----: | ----: | ----: | ------: | ------: | ----: |
| 1    |     615.7 | 174.1 |  173.2 | 116.9 |   60.3 | 209.0 | 141.4 |   101.0 |    22.4 |     - |
| 2    |     641.8 | 167.9 |  188.5 | 130.3 |   64.4 | 237.4 | 145.8 |    95.3 |    21.9 |     - |
| 3    |     654.6 | 170.7 |  190.2 | 135.1 |   67.6 | 243.9 | 149.0 |    97.0 |    22.1 |     - |
| 4    |     656.2 | 170.8 |  189.5 | 132.3 |   67.6 | 240.9 | 148.5 |    97.3 |    22.1 | 113.1 |
| 5    |     660.1 | 175.4 |  191.7 | 135.1 |   66.1 | 242.7 | 150.1 |   102.8 |    22.2 | 110.7 |
| mean |     645.7 | 171.8 |  186.6 | 129.9 |   65.2 | 234.8 | 146.9 |    98.6 |    22.1 |     - |

`live` is `allocated_objects` across malloc, PartitionAlloc and Oilpan; `slack`
is what those three have committed above it. Run 1 predates the wasm probe.

Three things this settles.

**A quarter of the tab is committed pages holding nothing.** 146.9 MB of the
645.7 MB mean, steady to within 6% across five runs, is memory the allocators
have taken from the OS and not given back. That is the same quantity the log-store
fix ran into from the other side: removing 287 MB of allocation returned 140 MB
of footprint because the rest was already-committed pages. Any churn fix pays out
at roughly half its allocation, and no churn fix touches the slack that is already
there.

**Wasm was the residual, and it is mostly automerge.** Linear memory appears in no
allocator node, so the ~90 MB that never reconciled had no name. The probe now
reports it per realm (run 5):

|    MB | realm  | module                      |
| ----: | ------ | --------------------------- |
| 34.63 | page   | `automerge_subduction_wasm` |
| 30.94 | worker | `automerge_wasm`            |
| 26.63 | worker | `automerge_subduction_wasm` |
| 16.63 | worker | `wa-sqlite`                 |
|  1.88 | both   | smaller modules             |

**92.2 MB of automerge linear memory, in three instances of two different
binaries.** The worker runs `automerge_wasm` and `automerge_subduction_wasm` side
by side, each with its own heap; the tab runs a third. At boot with nothing open
the same probe reads 4.4 MB, so this is the corpus, not the runtime — it is what
opening three spaces costs.

One caveat on the module column. The probe names a memory by the script on the
stack that created it, and a bundle chunk can carry more than one wasm binary —
`boot-9` contains both. So read the binary names as indicative and the realm
split and the sizes as solid: three separate linear memories, one in the page and
two in the worker, ~35, ~31 and ~27 MB.

Ownership, confirmed from source rather than from the probe:

- **The page heap is `@automerge/automerge`, not subduction.** The tab's
  automerge is `@dxos/echo-client`, whose `DocHandleProxy` and `RepoProxy` call
  `A.load` / `A.loadIncremental` on byte dumps the worker ships over RPC;
  `echo-client` has no subduction dependency. `initAutomergeWasm` in
  `composer-app` does instantiate both binaries in every realm, but nothing in
  the page constructs a `Subduction`, so that heap stays at its initial size and
  the probe's label on the 35 MB is wrong.
- **The two worker heaps hold different things.** The subduction fork of
  `automerge-repo` (`2.6.0-subduction.48`) materializes documents through
  `@automerge/automerge` — its `SubductionSource` imports `automerge/slim` and
  calls `loadIncremental` — and hands the `Subduction` wasm class only opaque
  commit and fragment bytes plus sedimentree ids. So one heap is the document
  corpus and the other is the sync engine's commit graphs and blob cache for the
  same documents. Persisted blobs go through `SubductionStorageBridge` to
  `SqliteStorageAdapter`, so the second heap is working state, not storage.
- **Eviction never reaches the second heap.** `AutomergeHost._evictDocument`
  calls `Repo.removeFromCache`, which calls `source.detach(documentId)` on every
  source, and `SubductionSource.detach` is an empty method
  (`src/subduction/source.ts:880`). The binding exposes `removeSedimentree`;
  nothing in the fork or in `echo-host` calls it. `MIN_RESIDENT_DOCUMENTS`
  therefore bounds the `automerge_wasm` heap and not the subduction one, which
  keeps every sedimentree touched since the worker started.

How much of the ~27-31 MB is the un-evicted set is unmeasured. The probe would
need a sedimentree count beside the byte count to say.

Committed is not resident: a `WebAssembly.Memory` reports the pages it has
reserved, and the footprint only counts the ones touched. Read the 110-113 MB as
naming where the residual lives, not as a term that closes the arithmetic.

**`performance.measure` is now the largest allocating mechanism in the tab**, at
52.7-80.7 MB per run, 36-47% of everything the profiler sampled. That is a
reversal: before the log-store fix it was a rounding error next to the sweep.
See [§5](#5-performancemeasure-details) below.

## 5. `performance.measure` details

[`recordSqliteQueryMetrics`](../../../packages/common/sql-sqlite/src/internal/opfs-client.ts)
puts one `performance.measure` on the timeline per SQL statement, carrying the
full statement text and the full bound-parameter array in `detail`:

```js
performance.measure(sql.slice(0, 128), {
  start: begin,
  end,
  detail: {
    devtools: {
      dataType: 'track-entry',
      track: 'Query',
      trackGroup: 'SQlite',
      properties: [
        ['sql', sql],
        ['params', params],
        ['resultCount', resultCount],
      ],
    },
  },
});
```

`detail` is structured-cloned on every call. That clone is the whole of the
mechanism: `ValueSerializer::WriteString` at 32-45 MB and
`SerializedScriptValue::Create` at 17-27 MB per run are the top two call sites in
the entire renderer.

The line above it already knows better. `logSqliteQuery` passes
`summarizeLoggedParams(params)`, which truncates strings at 64 characters, reduces
a `Uint8Array` to a size marker and caps arrays at 64 items — added for DX-1250,
where unbounded params were 80% of a 50 MB feedback upload. The
`performance.measure` call beside it passes `params` raw, so a bound automerge blob
is cloned in full, per query.

The entries are also retained. `PerformanceMeasure` objects are 6.5, 9.4 and
10.2 MB of the worker's Oilpan across runs 1-3 — 80% of everything live in that
heap — and the buffer has no cap.

Nine call sites carry a `dataType: 'track-entry'` detail; this is the only one on
a per-statement path, and `query-executor.ts` already disables its own. None of
them are gated: the DevTools custom track renders for a developer with the
Performance panel open, and is paid for by every user.

`DX_TRACE_QUERY_EXECUTION` in the same package is the shape to copy — an
`import.meta.env` flag the bundler can eliminate.

## What the gate bought

The fix gates every track entry behind a build-time flag (on under the dev
server, `VITE_PERF_TRACK_ENTRIES=true` for a production build) and bounds
`detail` for whoever turns it on. The row in "Progression" is the measurement:
684.6 MB to 617.1 MB, **67 MB, 10%**, three runs per arm on top of fix 1.

|              | footprint | `<unspecified>` | PartitionAlloc | malloc | sampled | `performance.measure` | Oilpan (workers) | entries |
| ------------ | --------: | --------------: | -------------: | -----: | ------: | --------------------: | ---------------: | ------: |
| fix 1, run 1 |     686.6 |            96.0 |          138.4 |  200.7 |   177.2 |                  81.2 |             27.8 |   ~100k |
| fix 1, run 2 |     676.4 |            97.1 |          138.6 |  198.8 |   180.5 |                  83.9 |             27.2 |   ~100k |
| fix 1, run 3 |     690.8 |            98.2 |          140.7 |  202.5 |   181.0 |                  84.3 |             28.9 |   ~100k |
| + gate, 1    |     574.7 |            43.2 |           70.0 |  151.4 |    97.8 |                   1.4 |             15.0 |   5,641 |
| + gate, 2    |     646.5 |            43.4 |           70.6 |  160.0 |    97.6 |                   1.3 |             15.2 |  ~5,600 |
| + gate, 3    |     630.0 |            42.8 |           73.9 |  153.7 |    97.2 |                   1.2 |             14.6 |  ~5,600 |

The category itself goes from ~83 MB to ~1.3 MB and `<unspecified>` from ~97 to
~43 MB, so the "~54 MB that scales with data and has no mechanism" recorded
after fix 1 was this. PartitionAlloc drops 68 MB and live native objects 94 MB,
which is more than the footprint moved: the last arm's footprint swings 575–647
across three runs, so the 67 MB mean carries about ±30 MB. The prediction of
30–50 MB was low for the wrong reason — it discounted churn, and this was
retention — and then landed near the truth because the allocator kept some of
the freed pages.

The `entries` column is the new census: after fix 1 the worker carries about
100,000 `PerformanceMeasure` objects after one journey, four SQL statements
account for 90% of them, and each keeps its serialized `detail` in
PartitionAlloc until the realm dies. What remains on the gated build is the
mark-based entries (`module:*`, `plugin-load:*`) that carry no detail.

**An earlier draft of this section reported 725 → 544 MB, 25%. Both arms of
that comparison ran with a dead log store.** Fix 1 bumps the log database's
schema version, the profile in use had been seeded on fix 1, and the worktree's
source did not include fix 1, so both builds opened the database at the old
version, IndexedDB refused, and the store neither wrote nor swept. The A/B was
internally valid and the direction right, but the control was not fix 1 and
the absolute figures belong to no arm anyone ships. The rows above come from a
profile seeded on the baseline build, which every arm can open; see
"Reproducing".

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

## The `v8` node, and why it has no single owner

171.5 MB on a loaded journey run, and never opened until now. The allocator tree
splits it per isolate and per space:

|     MB | node                         |
| -----: | ---------------------------- |
| 128.89 | `v8/main`                    |
| 100.13 | `v8/main/heap/old_space`     |
|  15.30 | `v8/main/heap/code_space`    |
|  10.83 | `v8/main/heap/trusted_space` |
|  40.62 | `v8/workers`                 |
|  22.66 | `v8/workers/heap/old_space`  |
|   6.08 | `v8/workers/heap/code_space` |
|   1.97 | `v8/shared/read_only_space`  |

**The tab holds 4.4x the live JS of the worker.** 100 MB against 23 MB, in an
architecture where ECHO and automerge are supposed to live in the worker. That
fits the tab-side automerge replica already recorded against the login-sync work.

A heap snapshot of the page realm on the same profile — three spaces opened,
140.72 MB of self size over 2,560,784 nodes — says the 100 MB has no dominant
holder. Grouping the constructors:

|    MB | what                                                                                  |
| ----: | ------------------------------------------------------------------------------------- |
| 24.75 | object machinery: property backing arrays, shapes, `PropertyArray`, `DescriptorArray` |
| 20.46 | `ExternalStringData` — strings whose bytes Blink owns, which is script source         |
| 19.27 | compiled code: `InstructionStream`, `BytecodeArray`, `ScopeInfo`, feedback            |
| 12.12 | closures                                                                              |
|  9.49 | plain objects and arrays                                                              |
|  7.41 | `Managed (WasmNativeModuleTag)` — the tab's own wasm module                           |
|  6.43 | `JSArrayBufferData`                                                                   |

The largest single line is 20 MB and the rest is a long tail. **There is no
second log-store sweep in here.** Code, closures and the shapes that describe
them come to roughly 56 MB, which is the 920-module cost again from the V8 side,
and the `byHolder` view finds nothing worth naming because only 6.43 MB of the
heap is array buffers at all.

Two things this rules out. The tab is not caching document bytes in JS: 6.43 MB
of `JSArrayBufferData` is the whole of it at this data scale, and whatever the
tab-side replica costs is in its wasm module and that module's linear memory,
which no JS-heap reading sees. And the heap is not leaking a structure: its shape
is a large application's, not a growing cache's.

So reducing it means shipping less code and instantiating fewer objects, not
finding a bug. Per-package attribution would sharpen that, and is not available:
it needs `trace_function_infos`, which only `startTrackingHeapObjects` produces,
and that takes over ten minutes on this app and then returns no snapshot.

Measured against the pre-fix build. The eviction sweep allocated in PartitionAlloc
and Blink strings rather than V8's heap, so this is not expected to have moved,
but it has not been re-measured since [#13251](https://github.com/dxos/dxos/pull/13251).

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

Ordered by measured size over cost, against the 645.7 MB mean above.

1. ~~**Fix the log store's eviction sweep.**~~ Done in
   [#13251](https://github.com/dxos/dxos/pull/13251): 287 MB less allocation and
   140 MB less footprint on a loaded profile. See "What the fix bought" above.
2. ~~**Stop cloning SQL text and parameters into `performance.measure` details.**~~
   Done in [#13281](https://github.com/dxos/dxos/pull/13281): 67 MB less
   footprint on a loaded profile, 10%, by gating every track entry out of
   production builds. See "What the gate bought" above.
3. **Collapse the duplicate automerge instances.** 92.2 MB of linear memory in
   three instances of two binaries: `automerge_wasm` and
   `automerge_subduction_wasm` side by side in the worker, and a third in the tab.
   [#13199](https://github.com/dxos/dxos/pull/13199) took the worker from 603
   held documents to a 259-document warm floor
   (`MIN_RESIDENT_DOCUMENTS = 256`); the corpus in each heap is the next lever,
   and two engines holding it twice is the one to pull first, because unlike the
   tab-side replica it buys nothing. The tab's own replica is not negotiable —
   synchronous handle access needs it.
4. **Ship fewer, larger modules.** 31 MB of decoded source and module-graph
   bookkeeping that does not go away, and the fixture puts the whole cost of
   Composer's code shape at 96.9 MB of footprint. Every user pays it; it is the
   one cost that does not scale with their data.
5. **Reclaim allocator slack.** 146.9 MB is committed and free, steady across
   runs. Fixing churn shrinks what refills it but returns only about half; nothing
   here returns the pages already taken. Whether PartitionAlloc can be made to
   purge on a memory-pressure signal is unmeasured and would need its own pass.
6. **Move work out of the tab.** Its 98.6 MB of live JS old_space is 4.5x the
   worker's 22.1 MB, in an architecture where the worker is supposed to hold the
   data. No single object owns it, so this is an architecture change rather than a
   fix.

Two things named earlier are now sized and are not worth chasing yet: the ~54 MB
of `<unspecified>` that scales with data has no mechanism, and the ~40 MB of
Oilpan that scales with data turns out to be mostly page slack — live Oilpan is
12-20 MB, and 45-55 MB of the node is committed pages, which item 5 covers.

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

Also corrected in this revision, twice: three "after" runs of the gate measured
the previous bundle, because the seeded profile's service worker served its
precache; then six re-runs measured a log store that could not open a database
seeded by a newer schema. The instrument now clears the precache, the README
says to seed on the oldest arm, and the "Progression" table at the top is the
first series taken with both rules in force.

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

# The same, against a loaded profile with objects opened in every space. This is
# the only run that reports wasm linear memory, which no allocator node covers.
node scripts/memory/seed-profile.mjs http://localhost:4173 --profile ./tmp/loaded-profile --spaces 3
cp -R tmp/loaded-profile tmp/run1   # a run mutates the profile; start each from a copy
# Seed on the OLDEST build you will compare: a newer build can upgrade the profile's IndexedDB
# schemas, an older one cannot open them and its stores go silent. The log store did that
# (DB_VERSION 2 -> 3 in #13251) and six runs measured a store that never wrote.
# A seeded profile also carries the service worker and precache of the build that seeded it,
# and serves that bundle on every later run. native-heap.mjs --profile clears both stores
# before navigating; check the chunk names in the JSON's wasmByModule against out/composer/assets.
node scripts/memory/native-heap.mjs http://localhost:4173 --settle 90 \
  --profile ./tmp/run1 --journey \
  --symbols "$(find ./tmp/electron -name 'Electron Framework.sym' -print -quit)"

# The allocator ledger the shares above are a share of.
node scripts/memory/ledger.mjs http://localhost:4173 --detached --settle 90
```

To re-run the control, make `IdbLogStore#maybeEvict` return immediately, rebuild,
and compare. Run each arm at least four times: half the built runs miss the sweep
entirely, and a single run of either arm looks like the other.
