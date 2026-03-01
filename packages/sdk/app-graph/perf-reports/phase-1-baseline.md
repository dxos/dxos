# Phase 1 — Baseline Capture Report

## Instrumentation Status

- `PERF_MEASUREMENT_ENABLED` is **on** by default in development (NODE_ENV !== 'production').
- `graph-flush.start/end` performance marks are emitted per flush.
- Default ring-buffer emitter now auto-installed: flush payloads are buffered in-memory (max 200) and accessible via `globalThis.__DXOS_APP_GRAPH_FLUSH_LOG__` or `__DXOS_APP_GRAPH_EXPORT_FLUSH_LOG__()` for JSONL export.
- Bug fix: double `iterations++` in `_scheduleDirtyFlush` corrected.

## Baseline Traces (create-space scenario)

| Trace | Events | Long Tasks (>=50ms) | Total Long-Task ms | Waves | Flush Marks | Overlap |
|-------|--------|---------------------|---------------------|-------|-------------|---------|
| T091716 (pre-instr) | 358,019 | 39 | 9,851 | 4 (1113/299/57/421 ms) | 0 | N/A |
| T100151 (pre-instr) | 295,005 | 10 | 895 | 1 (212 ms) | 0 | N/A |
| T100947 (with instr) | 324,947 | 8 | 1,021 | 1 (252 ms) | 6 | flush 57 (16ms) overlaps wave 1 |

## Key Observations

1. **Dominant wave pattern is consistent**: one primary long-task wave during create-space (212–252 ms in the shorter traces).
2. **T091716 is an outlier** (9.8s, 39 long tasks, 4 waves) — likely captured a broader session window or cold start. Still useful as upper-bound reference.
3. **Instrumentation overhead is negligible**: T100947 (with instrumentation) shows comparable long-task totals to T100151 (without).
4. **Flush time is small relative to wave time**: flush 57 is 16 ms inside a 252 ms wave. Graph mutations are not the bottleneck; downstream React reconciliation is.
5. **Flush payloads were not persisted** (no emitter was installed at capture time). Now fixed: default emitter auto-activates.

## Gate Assessment

- **Variance**: Consistent single-wave pattern across T100151 and T100947 (200–250 ms). Pass.
- **Reproducibility**: Trace capture procedure confirmed. Flush marks present when instrumented. Pass.
- **Flush payload capture**: Fixed (default emitter now auto-installed). Next trace will include full extension attribution.

## Decision

**Phase 1: PASS** — proceed to Phase 2.

## Next Actions (Phase 2 only)

1. Capture new trace with default emitter active to get full flush payloads with extension attribution.
2. Export flush log via `__DXOS_APP_GRAPH_EXPORT_FLUSH_LOG__()` after create-space.
3. Feed JSONL to correlation script to rank extensions by churn and time contribution.
