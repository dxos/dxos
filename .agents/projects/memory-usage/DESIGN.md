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
- `BufferingTracingBackend#pending` — unbounded when no backend exports spans
  (noted in email-sync-stability backlog; edge-confirmed, browser unverified).
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
