# Composer Memory Usage — Design

## Goal

Composer's runtime memory usage is reported as incredibly high. Profile it,
attribute the usage to subsystems (ECHO/automerge, indexing, tracing, React/UI,
plugin modules), and produce a ranked list of fixes with measurements to back
each one.

## Problem statement

"Memory usage" here means RAM of the running app across its execution contexts:

- **Main thread** (per tab) — React tree, plugin modules, ECHO client proxies,
  editor instances.
- **Shared/dedicated worker** (client services) — automerge repo + doc handles,
  indexing, feeds, replication.
- Browser-process overhead (GPU, caches) is out of scope unless measurements
  point there.

## Methodology

1. **Baseline** — fresh dev instance (`composer-app:serve`), measure heap per
   context at: app ready, after opening a space, after opening N documents,
   after 10 minutes idle (leak check).
2. **Attribution** — CDP heap snapshots per execution context (page + workers),
   dominator/retainer analysis; count live automerge doc handles, ECHO objects,
   query subscriptions; check `@dxos/tracing` buffered spans.
3. **Real-data profile** — the dev baseline may not reproduce the report; a
   loaded profile (many spaces/docs/mail) is where automerge bloat shows.
   Options: live inspection via the `/recovery.html` debug port
   (composer-forensics skill), or a synthetic large profile.
4. **Growth vs steady-state** — distinguish a leak (monotonic growth) from
   structural bloat (high but flat). Different fix classes.

Tooling: Playwright + CDP (`Runtime.getHeapUsage`, `HeapProfiler` snapshots,
worker targets), `performance.memory` for quick reads, plugin-doctor
diagnostics, `Client.diagnostics()`.

## Known suspects (prior art)

- ~~QUERIES diagnostics set retaining the client graph per query (DX-1140)~~ —
  **fixed**, PR #12366 merged to main (5f08a6a2b3).
- `BufferingTracingBackend#pending` — **verified in-browser 2026-08-06**:
  unbounded whenever `DX_OTEL_ENDPOINT` is absent (`otel/extension.ts` returns
  `stubExtension`, so `TRACE_PROCESSOR.tracingBackend` is never set and every
  `@trace.span()` buffers a `BufferedSpan` forever — page and dedicated worker
  both; the coordinator worker never initializes observability at all, so it
  always buffers). Fresh-baseline magnitude is negligible (9 spans on the
  page); an activity soak must quantify the rate before this earns a fix. The
  DX-1140 client-graph pinning per span is separate and already fixed.
- Automerge doc handles: every loaded doc stays resident; no eviction. A large
  space loads many docs (see feed-live-objects partial-replication roadmap).
- Mailbox/feed data: feeds are fully replicated client-side today.
- Plugin module growth (startup-latency project measured 322 modules at ready —
  code footprint, not heap, but contributes to baseline).

## Decisions

(Record decisions here as they are made.)

## Findings

### 2026-08-06 — dev-server baseline (fresh identity, vite serve, chromium headless)

Heap after forced GC, app-ready +5s (flat after 60s idle soak — no leak):

| Context                            | dev (`vite serve`) | serve-min (dev, min plugins) | production (`vite preview`, PWA off) |
| ---------------------------------- | ------------------ | ---------------------------- | ------------------------------------ |
| Page (main thread)                 | **247 MB**         | 170 MB                       | **96.7 MB**                          |
| Dedicated worker (client services) | 71.4 MB            | 70 MB                        | 24.2 MB                              |
| Shared worker (coordinator)        | 9.4 MB             | 9.4 MB                       | 0.6 MB                               |
| Page backing store                 | 254.6 MB           | 174 MB                       | 33.7 MB                              |

All modes flat over a 60s idle soak — no leak at fresh-identity baseline.

Page snapshot attribution (510 MB total self size incl. native):

- `system / ExternalStringData` **250 MB** (21.8k strings) + `(strings)`
  **126 MB** — module **source text and vite's inline base64 sourcemap data
  URLs**. Individual sourcemaps: comunica-sparql 6.9 MB, automerge fullfat
  bundle 6 MB, react-aria 5.3 MB, @xenova/transformers 2.9 MB, OpenAI client
  2.5+1.3 MB, viem 1.8+0.8 MB, chevrotain 2.9 MB…
- `(code)` 44.9 MB across 665k compiled-code objects (unminified dev modules).
- Everything else is single-digit MB; app data on a fresh identity is noise.

Dedicated worker (173 MB total self size): same shape — 68 MB
ExternalStringData + 42 MB strings (sources/sourcemaps), 25.5 MB
`JSArrayBufferData` across 230 buffers (automerge wasm memory), 13.8 MB code,
6.9 MB wasm NativeModule.

Serve-min (dev serving, minimal plugin set, port 5281): page 170 MB — smaller
than full dev (fewer plugins served) but still dev-mode; NOT a production
number (workers load unbuilt `src/workers/*.ts`). Same composition: 169.7 MB
ExternalStringData + 90.7 MB strings + 26.9 MB code of 351.6 MB total self
size. Confirms heap scales with _modules served_, dominated by source text.

App-object counts visible under the dev noise (these persist into prod):
`SchemaClass` closures ×43.8k, `annotations` closures ×33.2k, `system/Context`
×150k, `EffectPrimitive` ×7.3k — Effect/Schema machinery dominates object
count; `PerformanceMeasure` ×9.8k (1.1 MB) retained profiler marks;
`FiberNode` ×5.8k React nodes.

**Interpretation:** on a fresh dev instance, ~80% of the heap is _dev-serving
artifact_ — served module sources + inline sourcemaps + unoptimized code — not
app data. Two consequences:

1. If the complaint is about `vite serve` during development, the lever is
   dev-server config (e.g. sourcemap handling) and _loading fewer modules at
   boot_ — every boot-reachable module pays source+map+code resident in heap.
   The heavy names above (comunica, transformers, viem, OpenAI client) being
   resident at app-ready ties directly into the startup-latency project's
   demand-driven activation work.
2. If the complaint is about production (composer.space), the dev numbers
   don't transfer — need a loaded profile (Phase 2).

### 2026-08-06 — production composition (page, 96.7 MB used)

Snapshot (135.8 MB total self size incl. native):

- `(code)` 29.8 MB across 444k compiled-code objects.
- `ExternalStringData` 27.7 MB — minified script sources of loaded chunks +
  inline assets (0.73 MB emoji JSON, 0.41 MB webp data URL).
- Object machinery: shapes 14 MB, objects 12.1 MB, arrays 12.1 MB, hidden
  11.3 MB, closures 9.6 MB. Counts are the story: **503k objects, 349k
  closures, 120k `system/Context`**, `annotations`/`pipe` closures ~45k —
  Effect/Schema-heavy object graph.
- Automerge wasm on the MAIN thread too: 5.6 MB `Managed<wasm::NativeModule>`
  (×8) + 6 MB `JSArrayBufferData`.
- Fresh-identity totals: page 96.7 + worker 24.2 + coordinator 0.6 ≈ **122 MB**.

Open threads from this composition: why 27.7 MB of chunk sources are resident
at ready (matches startup-latency's boot-graph scope); whether the main thread
needs the automerge wasm instance at all; Effect object counts as a
scaling-with-data risk multiplier.

### 2026-08-06 — REPRODUCED: renderer footprint grows ~30 MB/min at idle (fresh identity, production)

User report: Chrome tab flags "High memory usage: 3.0 GB" on composer.space
within minutes, small profile, while DevTools shows JS heap ~941 MB (Main
816 MB + client worker 122 MB). Key fact: **Chrome's tab number is renderer
process footprint, not JS heap.**

10-min idle soak of the production preview (no forced GC, per-process RSS via
`ps`, fresh identity, headless):

- Renderer RSS: 762 MB at ready → dips to ~630 → climbs **linearly** to
  **994 MB at t=10 min** (~30 MB/min from t≈4 min on).
- JS heap the whole time: page oscillates 99–154 MB, worker 25–75 MB, backing
  30–110 MB — flat. The growth is entirely **outside the JS heap**.
- Extrapolation: hours-long session → multi-GB footprint. Matches the report
  without any data in the profile.
- Even at ready, RSS (762 MB) ≈ 2.7× total JS heap+backing (~280 MB) —
  ~480 MB of baseline non-JS memory also unattributed.

Allocation sampling (4 min idle, prod): page churns only ~3.4 MB/min — top
allocators are V8 API + **three Cloudflare Stream video iframe SDKs**
(`sdk-iframe-integration...?video=` ×3). Composer embeds autoplaying Stream
players on the fresh-identity home surface (`SpaceHomeWelcome` in
plugin-support; demo videos in plugin-markdown/plugin-game `dx.config.ts`),
and deck planks stay mounted. Media decode buffers live outside the JS heap —
prime suspect for the linear native growth. Control experiment in flight:
identical soak with `*cloudflarestream*` requests blocked.

**Control result: videos exonerated.** With the stream CDN blocked the
renderer grew _faster_: 777 MB → 1237 MB over 10 min (~46 MB/min), JS heap
flat throughout (page 87–140 MB, worker 26–68 MB). The growth is native
memory inside Composer's own behavior. Run-to-run rate varies (~30 vs
~46 MB/min) — treat rates as indicative, direction as certain.

Hypotheses for a native allocator growing with a flat sampled-JS heap:

1. An **unsampled nested worker's V8 heap** (e.g. the sqlite OPFS
   access-handle worker — nested dedicated workers don't appear in
   `/json/list`).
2. **malloc/partition_alloc retention** — e.g. network buffers from the 1 s
   EDGE polling loop, IDB log-store writes, unclosed streams.
3. Blink-side caches (web_cache, discardable) not under memory pressure.

Discriminator in flight: memory-infra dumps (per-allocator, per-process) at
t=1 min vs t=8 min, diffed.

### 2026-08-06 — CONFIRMED CONTRIBUTOR: unbounded performance-timeline entries (marks/measures never cleared)

memory-infra dump diff (renderer, t=1 → t=8 min idle, production):
`partition_alloc` **+44 MB** (buffer partition +15 MB, allocated_objects
+26 MB), `v8/main/heap/old_space` **+24.5 MB**, `malloc` +11 MB,
`blink_objects` +3.3 MB — including
`blink_objects/.../workers/.../PerformanceMeasure` **+2.7 MB** and a growing
main-thread `HashTable<AtomicString → HeapVector<PerformanceEntry>>` (the
performance timeline's per-name index). Compositor (`cc`) shrank; media/GPU
flat.

The performance timeline for marks/measures is **unbounded by spec** (unlike
resource timing's 250-entry buffer) and nothing in the codebase ever calls
`performance.clearMeasures()`/`clearMarks()`. Unconditional emitters:

- `sql-sqlite` `OpfsWorker.ts:165` + `internal/opfs-client.ts:108` — a
  measure per SQLite statement, named with `sql.slice(0, 128)` and carrying
  the **full SQL text** in `detail.properties`.
- `echo-host` `query/query-executor.ts:251` (per query execution) and
  `db-host/echo-host.ts:482–511` (marks + measures per index-update cycle).
- `common/effect` `Performance.ts:37` `addTrackEntry` (per instrumented
  effect).
- `tracing` `api.ts:77/159` — spans with `showInBrowserTimeline: true`.

Measured accumulation (production, fresh identity, idle):

- Dedicated worker: 465 → **9,715 measures in 3 min (~3,080/min ≈ 51
  SQL statements/second at idle)**, avg entry ~**5.2 KB** (SQL in name +
  detail) → ~16 MB/min raw in the worker alone before Blink/V8 overhead
  (AtomicString table, wrappers, old-space promotion).
- Page: +~400 entries/min at ~235 B each.

This explains: linear renderer-footprint growth at idle (~30–46 MB/min), the
user's "High memory usage: 3.0 GB" tab on a small profile after a long
session, DevTools JS heap (Main 816 MB) — old_space full of entry wrappers and
name strings — and why my GC-forced short-soak baselines looked flat (the
retention is mostly Blink-side and old-space, and my soaks were 1–10 min).

Secondary finding en route: ~51 SQLite statements/s at idle is the 1 s polling
loop fanning out — a perf issue in its own right (feed-live-objects roadmap
has the push replacement).

**Causation check result — contributor, NOT sole driver.** Stub soak
(mark/measure no-op'd in every listed context at t=0): renderer still grew
~20 MB/min (vs ~24–30 unstubbed), both runs converging near 1.2 GB after
10 min. So the timeline entries are one confirmed unbounded sink, but the
majority of the idle native growth remains unattributed. Follow-up in flight:
memory-infra allocator diff with the stub active, to see which allocator
still grows (candidates: Blink buffer partition — MessagePort/structured-clone
traffic from ~51 SQL ops/s, network buffers from the 1 s polling fetches,
IDB transaction buffers, log-store writes).

### 2026-08-06 — the idle-wave chunk import: big but BOUNDED; remaining tail still open

- Stubbed allocator diff (perf entries verified zero at both dumps):
  `partition_alloc` **+76.7 MB**, `v8/main old_space` +21 MB,
  `blink_objects` +4.3 MB over t=1→8 min. Growing Blink types are
  DOM/style-shaped: `GeometryMapperTransformCache::PlaneRootTransform`
  +2.3 MB, `StyleRule`/`ComputedStyle`/`HTMLLinkElement`/`UniqueElementData`.
- DOM grows after ready: 2,089 → 2,929 elements over 3 min, driven by
  `<link rel=modulepreload>` 799 → **971, then STOPS (~t+2–3 min)** — the
  **Idle activation wave**: 63 plugin capability modules
  (`activatesOn: ActivationEvents.Idle`) import their registration closures
  after first idle. Bounded, by design; costs ~170 chunks of code + module
  records shortly after every boot (7,231 chunk files exist in the bundle —
  the wave is a small fraction).
- AFTER the wave and with perf stubbed, RSS still climbs ~11 MB/min
  (t=4→10 min: 1143 → 1212 MB). Unattributed remainder. Candidates:
  (a) `BufferedSpan` accumulation — no OTEL endpoint in the local preview, so
  every `@trace.span()` buffers forever (the verified mechanism; rate scales
  with the ~51 SQL ops/s + span-per-query); (b) **harness artifact**:
  Playwright/DevTools enable the CDP Network domain, which makes Blink retain
  response bodies (`NetworkResourcesData::ResourceData` appears in the dump) —
  the user's DevTools-open tab has the same effect, a plain tab does not.
  Discriminator in flight: constructor-level heap-snapshot diff t=1→7 min.

### 2026-08-06 — FINAL ATTRIBUTION (fresh-profile production)

Three closing measurements:

1. Constructor-level heap diff (t=1→7 min, no stub): the ONLY JS accumulator
   is perf entries — worker +16,708 `PerformanceMeasure` (+2.16 MB native) +
   1,456 `PerformanceMark`; page grew just ~4 MB of code/shape noise.
   `BufferedSpan` growth: negligible. Native cost per entry ≈ 130 B + wrapper
   — the earlier ~5 KB/entry estimate came from a JS-side approximation of
   name+detail and OVERSTATES the retained cost. Recalibrated: perf-timeline
   leak ≈ **0.5–1 MB/min at idle** — real, unbounded, but not the dominant
   term.
2. 24-min watch: modulepreload plateau at exactly 971 chunks from t≈3 min on.
3. **Bare-chromium soak (no DevTools/CDP attached): renderer oscillates
   700–980 MB, NO monotonic growth over 12 min.** The linear 30–46 MB/min
   climb in earlier soaks was inflated by CDP page instrumentation
   (Playwright's always-on Network domain → Blink retains response bodies) —
   the same class of retention a DevTools-open tab has.

**Consolidated model of the user's 3.0 GB tab:**

- **~0.7–1.0 GB structural baseline in ANY Composer tab** — all 971 chunks'
  code + module records resident (incl. the idle wave importing registration
  closures of all 63 plugins, enabled or not), automerge wasm on main thread
  AND worker, DOM/styles, allocator overhead. This alone brushes Chrome's
  "high memory" flag; it is why the tab is "always" flagged.
- **DevTools-open retention** — with an inspector attached, footprint climbs
  linearly (measured ~11–46 MB/min idle, faster with activity — response
  bodies, console/object retention). A developer's workday tab with DevTools
  open reaches multi-GB. Not app-fixable, but app chatter (51 SQL/s idle,
  1 s polling) multiplies it.
- **Perf-timeline entries** — unbounded in-app leak, ~0.5–1 MB/min idle,
  more under activity; also mirrored into DevTools when open.
- **Data-proportional heap** — user's Main = 816 MB vs 97 MB fresh; needs a
  snapshot of the real tab to decompose (ECHO objects, editors, history).

### 2026-08-06 — USER-TAB LEDGER (memory-infra trace of the real 1.5 GB tab)

User captured a chrome://tracing memory-infra trace (`trace_composer.json`) of
the Chrome session whose Composer tab flagged 1.5 GB, plus a Main heap
snapshot (`Heap-20260806T185842.heapsnapshot`, 310 MB self size). Composer =
pid 4038 (the only renderer with SharedWorker + DedicatedWorker +
ServiceWorker threads). Attributed **1,444 MB ≈ the flag**:

- malloc 537 MB (471 live `<unspecified>`) — suspected DevTools-attach
  retention (tab had DevTools open); verify by closing DevTools.
- v8 473 MB — main 306 (old_space 228, large-object 43) + workers 160.
- partition_alloc 307 MB — Blink buffers (perf-entry storage, strings, DOM).
- blink_gc/objects 94 MB — DOM (Attr ×26k …) and **PerformanceMeasure
  ×135,976 in the client worker** (15.6 MB direct) + PerformanceMark ×4.4k.
- cc 29 MB.

Main heap snapshot findings (the 310 MB slice): strings 104 MB — top strings
are whole serialized `org.dxos.type.message` JSON (com.google.mail), **each
message retained TWICE** (`{"id":…}` and `{"@meta":…}` variants, 0.5–0.8 MB
each); native 78 MB across 768k nodes (DOM); code 38 MB; 1.15 M plain
objects. → New lead: doubled message-JSON retention on the main thread
(feed/inbox path).

Context: the same trace shows two other non-Composer renderers at ~1.3 GB
each (one blink_gc-heavy at 620 MB — likely a mail tab) — machine pressure
is not all Composer.

### 2026-08-06 — MAIL-OPEN LEDGER + the doubled-JSON mechanism (both retainers named)

Second user trace (`trace_abc.json.gz`, DevTools CLOSED, after reloading with
mail open): Composer renderer attributed **1,887 MB**:

- v8 **1,074 MB** — main 852 (old_space 587 + **large_object_space 166** —
  the big message strings) + workers 220.
- partition_alloc 411 MB; malloc 275 MB (**down from 537 with DevTools open —
  DevTools retention ≈ 260 MB, confirmed**); blink ~85 MB; cc 35 MB.

Retainer-path analysis of the user's Main heap snapshot pinned both copies of
each message's JSON:

1. **`FeedObjectCore.#state`** (echo-client `feed/feed-object-core.ts`) —
   canonical sorted JSON string of EVERY live feed-backed entity, kept for
   write reconciliation. All uses are string equality (`===` against inbound
   canonical / pending-append token) → **a 128-bit hash would serve
   identically**, reducing per-object cost from O(size) to ~16 bytes.
2. **`IndexQuerySourceProvider._lastRemoteResults`** (echo-client
   `client/index-query-source-provider.ts:257`) — reactive queries remember
   the raw wire records including each result's full `documentJson` string so
   later object-update events can re-hydrate. An open mailbox = a reactive
   query over all messages = every message JSON retained for the
   subscription's lifetime. Fix directions: drop `documentJson` after
   hydration and re-hydrate from the feed-handle identity map / re-fetch, or
   retain a parsed+shared form.

So mail-open main-thread memory ≈ 3× the mail data (materialized objects +
copy A + copy B) plus V8 overhead — matching old_space 587 MB + LO 166 MB.

### 2026-08-06 — worker heap snapshot: the mail-copy census is ~4–5×

User's `dxos-client-worker` snapshot (152 MB self size, ~30 min after
reload): the WORKER retains its own `results` array (680+ items) with
`documentJson` strings per message (built at echo-host
`query-executor.ts:601`), plus message content again as `text` inside feed
`blocks`. Also `PerformanceMeasure` ×47,398 (~1,600/min since reload).

Census per large message with a mailbox open: (1) worker query-result
`documentJson`, (2) worker feed-block `text`, (3) main
`_lastRemoteResults[].documentJson`, (4) main `FeedObjectCore.#state`
canonical string, (5) the materialized ECHO object. Four of five are
bookkeeping copies. Third trace (`trace_composer2.json.gz`, +15 min of use):
renderer 2,279 MB — partition_alloc 411 → 1,041 MB, worker large-object
space → 319 MB; growth tracks active sync payload churn through the same
pipeline.

### 2026-08-06 — plugin-tier curve: content plugins are NOT the floor

Three production bundles measured with the same harness (fresh identity,
headless, 8-min soaks; RSS values carry the CDP-attach inflation, so compare
relatively):

| Tier                          | Chunks | Disk   | Page heap (used) | Renderer RSS at ready |
| ----------------------------- | ------ | ------ | ---------------- | --------------------- |
| Full registry (labs defaults) | 7,231  | 375 MB | 95–155 MB        | ~720–780 MB           |
| Minimal (11 content plugins)  | 4,028  | 191 MB | 66–105 MB        | ~646–661 MB           |
| Barebones (core + Markdown)   | 3,591  | 184 MB | 52–91 MB         | ~615 MB               |

- All ~50 content plugins together cost only ~150 MB RSS / ~50 MB heap.
- **The floor is core**: barebones still compiles 370k code objects on Main
  (vs 500k full) and reaches 3,591 chunks — client/echo/deck/app-framework
  and shared deps dominate.
- User's barebones tab read 861 MB footprint with only ~140 MB live across
  both heaps: the rest is committed-but-idle memory (V8 headroom 334 vs ~150
  live, malloc 225 vs 144, PA 164 vs 122 incl. a 99 MB array_buffer partition
  with ~25 MB live). Resting footprint tracks BOOT PEAK + churn high-water
  marks, not live data; Chrome decommits lazily.
- User-set target (agreed): **300–500 MB resting, aim ~300–400** (Figma
  range; CRDT+wasm apps don't reach Gmail range without a Slack-style tiny
  client).

Whittle-down ranking (supersedes the earlier "idle-wave scope" framing —
disabled plugins were never the cost):

1. Reduce boot-executed CORE code (startup-latency continuation) — cuts live
   code and the commit peak the resting footprint inherits.
2. Kill idle churn (51 SQL/s, 1 s polling → push) — churn keeps allocator
   high-water marks pinned.
3. Perf-timeline gating (ready to implement).
4. Wasm consolidation: 8 modules in worker + 2 on main even in barebones;
   single instance, worker-only, terminate-to-reclaim.

**Fix ranking (Phase 3):**

1. Shrink the structural baseline — audit the Idle wave (why do disabled/Labs
   plugins' registration closures load at all?), drop automerge wasm from the
   main thread if possible. Biggest lever on the always-flagged tab.
2. Gate `performance.mark/measure` emitters behind a debug flag (off by
   default) — kills the only true in-app unbounded leak; cheap.
3. Reduce idle chatter (51 SQL/s, 1 s polling) — multiplies DevTools
   retention and churn; feed-live-objects roadmap already owns the push
   replacement.
4. Advisory: DevTools-open is itself a multi-GB amplifier on long sessions.

### Fix directions (Phase 3)

1. **Gate the devtools-track instrumentation off by default** — one shared
   helper (in `@dxos/tracing` or `@dxos/util`) that no-ops unless a debug
   flag is set (config/localStorage-seeded global that also reaches workers);
   call sites: sql-sqlite ×2, echo-host ×3, query-executor, Performance.ts,
   tracing api.ts.
2. **Bound the timeline even when enabled** — periodic
   `clearMeasures()`/`clearMarks()` keeping a rolling window.
3. **Bounded entry names** — never SQL text as the entry name; constant label
   with detail only when enabled.
