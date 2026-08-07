# Composer Memory Usage — Design

## Goal

Bring an idle Composer tab's resident memory to **300–400 MB** (500 MB
ceiling), and keep memory proportional to the data a user actually has open.
Comparable apps sit at 150–500 MB initialized (RESEARCH.md); Composer measured
~470–860 MB empty and multi-GB with a mailbox open.

## What "memory usage" means here

Chrome's tab-hover figure is the renderer process's **private footprint**, not
the JS heap — the two differ by 3–5×. Any statement about Composer's memory
must name which of these it measures:

| Quantity                | Where it is read                        | What it covers                                                           |
| ----------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| JS heap (used)          | DevTools Memory, `Runtime.getHeapUsage` | live JS objects only, per execution context                              |
| Heap snapshot self-size | `.heapsnapshot`                         | live JS + some native accounting for one context                         |
| Attributed allocators   | `memory-infra` trace                    | V8 + malloc + PartitionAlloc + Blink + compositor, per process           |
| Private footprint       | tab hover, `ps` RSS                     | everything the process has committed, including free-but-committed pages |

## Composition model

Normalized to a 1,000 MB idle tab (small profile, DevTools closed). Derived
from `memory-infra` traces and heap snapshots of both instrumented builds and
the user's real profile.

| Slice                                     | MB  | Notes                                                                                         |
| ----------------------------------------- | --- | --------------------------------------------------------------------------------------------- |
| V8 code machinery                         | 147 | compiled code, shapes, feedback vectors, closures for ~10 MB of executed JS (~11× multiplier) |
| V8 live app objects                       | 117 | ECHO objects, Effect contexts, registries, user data                                          |
| V8 committed headroom                     | 136 | grabbed at boot/GC peaks, not released                                                        |
| Allocator slack (malloc + PartitionAlloc) | 245 | pages kept warm by idle churn                                                                 |
| Native buffers and script sources         | 160 | source text held by the browser, wasm memories, ArrayBuffers                                  |
| DOM + compositor                          | 108 | rendered shell, rasterized tiles                                                              |
| Blink wrappers + misc                     | 87  | JS↔DOM bindings, GC bookkeeping                                                               |

Riders that stack on top when present: an attached DevTools adds ~260 MB and
grows; a mailbox open before the feed fix added ~800 MB.

## Findings that shape the plan

1. **Code is not the dominant slice, but it is the most tractable.** A fully
   activated tab executes ~13 MB of JS. Every loaded chunk evaluates (no
   fetched-but-never-run chunks), and only the enabled plugins' modules
   activate — demand-gated activation works as designed.
2. **Barrel re-exports are the recurring cause of resident bloat.** Every
   oversized item found so far entered through a barrel imported for one small
   symbol: the AI session runtime via a `Chat` schema, emoji-mart via a form
   picker, the mermaid grammar via a markdown bundle, the welcome screen via a
   surface-key constant.
3. **A static import for a lazily-_used_ value costs the same as eager use.**
   The ML runtime, EVM client and NER pipeline were all imported at module
   scope to be constructed inside already-async functions.
4. **Resting footprint tracks the boot peak and the idle rhythm, not live
   data.** A barebones tab with ~140 MB live across all heaps still reported
   861 MB footprint. Allocators keep pages committed while something keeps
   allocating — and an idle tab issues ~51 SQLite statements per second.
5. **Plugin count is not the lever.** Barebones (core + Markdown), minimal
   (11 plugins) and the full registry differ by ~150 MB RSS; the floor belongs
   to core infrastructure and shared dependencies.

## Idle-work inventory

Four loops run in a tab with nothing open:

| Source                                  | Interval         | Notes                                                                                                      |
| --------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| `TriggerDispatcher` (`compute-runtime`) | 1 s              | queries `Trigger` objects and runs scheduled triggers even when none exist; started by core plugin-routine |
| `FeedHandle.beginPolling`               | 1 s per feed     | refresh + reconcile per subscribed feed                                                                    |
| `DatabaseImpl` feed-sync state          | 2 s per space    | aggregate sync-state poll                                                                                  |
| `QueryService._executeQueries`          | per invalidation | the loops above generate hints; produces the observed SQL fan-out                                          |

## Measurement method

`memory-harness` (see TASKS.md) drives a headless Chrome over CDP:

- per-context heap with forced GC, and RSS per process for footprint;
- `memory-infra` dumps parsed into per-allocator ledgers (also parses traces
  captured from a real browser);
- heap-snapshot aggregation, constructor-level diffing between two points, and
  retainer-path extraction for large strings;
- a boot census combining precise coverage, sourcemap attribution per package,
  and the app-framework's module-activation marks, with an optional persistent
  profile so a _returning_ tab can be measured rather than a first run.

Comparisons must hold the serving mode, plugin set, settle time and profile
state constant: dev serving costs ~2.5× production on the main thread, and a
first run (which performs onboarding) loads a different set than a returning
one.

## Decisions

- Target 300–400 MB resting, 500 MB ceiling. Gmail-class (~200 MB) is not
  reachable without an architectural change of the Slack "tiny client" kind.
- Reduce in this order: idle churn (largest pool, single cause), then code
  residency (smaller but mechanical), then wasm/native.
- No CI regression guard and no perf-timeline gating for now (2026-08-06);
  verification is manual with the harness.
- Prefer structural fixes over persisted flags: deep imports and lazy
  boundaries have no staleness or reset-path hazard.

## Known issues not yet addressed

- `performance.mark`/`measure` entries accumulate unbounded (a real tab
  carried 135,976 in the client worker); emitters are unconditional in
  sql-sqlite, echo-host, query-executor, `@dxos/effect` and `@dxos/tracing`.
- `BufferingTracingBackend` buffers every span forever when no
  `DX_OTEL_ENDPOINT` is configured.
- Query results retain serialized payloads: `FeedObjectCore` keeps canonical
  JSON per live feed object, `IndexQuerySource` keeps `documentJson` per
  reactive result, and the host keeps its own result set — Linear DX-1148.
- Automerge wasm is instantiated on the main thread as well as the worker;
  wasm linear memory never shrinks.
- `chart.js` (146 KB) is resident via devtools' performance panel;
  `fast-check` (94 KB) is resident with no identified legitimate importer.
