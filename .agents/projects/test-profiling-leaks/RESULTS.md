# Phase 4 — leak & CPU-hotspot sweep (results)

Ran the `test-perf-leaks` tooling (`--force`) on 2026-08-09, one representative node suite per layer.
Scope differs by mode: **`DX_DEBUG_LEAKS` covered all eight suites**; **`DX_PROFILE_TESTS` clean
profiles were captured for the two heavy layers only** (`assistant`, `agent-runtime`) — the other
six were run with both vars together, so their CPU traces are dominated by `writeHeapSnapshot` and
not reported as hotspots. "Leak Δ" is `heapUsed` at the last test minus the warmed baseline (test 1,
post-`settle()`); negative/flat = no residual growth.

## Leak sweep — no leaks found

| Layer        | Package · suite                                       | Tests | Baseline → last  | Δ from baseline | Verdict |
| ------------ | ----------------------------------------------------- | ----- | ---------------- | --------------- | ------- |
| echo         | `echo` · Type.test.ts                                 | 27    | 45.7 → 45.0 MB   | **−0.7 MB**     | no leak |
| halo         | `credentials` · verifier.test.ts                      | 12    | 46.7 → 45.6 MB   | **−1.1 MB**     | no leak |
| mesh         | `messaging` · edge-signal-manager.test.ts             | 7     | 55.1 → 53.6 MB   | **−1.5 MB**     | no leak |
| app-sdk      | `app-graph` · util.test.ts                            | 10    | 23.1 → 22.8 MB   | **−0.3 MB**     | no leak |
| composer     | `plugin-markdown` · Versioning.test.ts                | 2     | 60.1 → 58.2 MB   | **−1.9 MB**     | no leak |
| compute      | `compute-runtime` · SwarmTraceSink.test.ts            | 3     | 44.0 → 42.7 MB   | **−1.3 MB**     | no leak |
| assistant    | `assistant` · util/execution-graph.test.ts            | 15    | 112.4 → 110.9 MB | **−1.5 MB**     | no leak |
| agentService | `agent-runtime` · agent-service/agent-process.test.ts | 15    | 128.9 → 127.9 MB | **−0.9 MB**     | no leak |

Every suite settles at or below its warmed baseline — no monotonic grower. The high baselines on
`assistant`/`agent-runtime` (112–129 MB) are the one-time heavy module graph (Effect + ECHO + AI),
captured _after_ the first test so lazy init is not mistaken for a leak; it does not grow after.

## CPU hotspots — startup-bound, no product hotspot

Clean profiles (leak mode OFF — see caveat) of the two heaviest layers:

- `assistant` execution-graph: **61.9% idle**, then `compileSourceTextModule` 4.0%, GC 3.5%,
  `Script`/`_runInlinedModule`/`get exports`/`internalModuleStat` (module loading), and Effect
  `Schema` construction (`make` 1.7% + `SchemaClass` 1.2%).
- `agent-runtime` agent-process: **61.7% idle**, near-identical shape — module compile/load +
  Effect `Schema` construction (`make` 1.3% + `SchemaClass` 0.8%) + GC 3.5%.

No product-code self-time frame surfaced at this scale. The non-idle time is dominated by the
vitest transform/module-load path; the only recurring _product-adjacent_ cost is import-time Effect
`Schema` class construction (~2.5–3%), which is an app-scale concern the `memory-usage` project
already tracks — not a test-harness hotspot to fix here. The high idle fraction reflects async
Effect suites awaiting I/O on the single fork's main thread.

## Methodology notes (fed back into the skill/DESIGN)

- **Do not combine `DX_PROFILE_TESTS` with `DX_DEBUG_LEAKS` when you want a clean CPU profile** —
  `writeHeapSnapshot` then dominates the profile (measured 24–33% self-time). Run leak and profile
  separately; combine only for a quick "is anything growing?" pass.
- **`heapUsed` excludes ArrayBuffer/external memory.** A probe that retained `Uint8Array` backing
  stores showed a flat slope; retaining V8-heap objects (or strings) is what the slope tracks. For
  buffer-heavy leaks, sample `process.memoryUsage().arrayBuffers`/`external` too.
- The injected setup file runs in the **same fork/isolate/heap** as the tests (verified: the sampler
  observes the tests' `globalThis` mutations and heap growth under one shared pid) — this is why the
  snapshots and slope reflect the suite.

## Conclusion & next step

Representative unit/service suites across all eight layers are clean — nothing to fix. The next
place worth pointing the tooling is the long-lived **integration** suites (spaces/replication in
`echo-host`, session lifecycle in `client-services`): they exercise longer-lived object lifetimes
than the unit suites here, so they are the better target when leak-hunting a specific subsystem.
They are tag-gated and slow, hence a dedicated follow-up rather than part of this sweep.
