# Phase 2 — Extension Attribution Report

## Trace

- **Trace**: Trace-20260301T103512.json (303,558 events)
- **Flush records**: flush-records.json (70 payloads, 45.1 ms total flush time)
- **Main-thread**: 15 long tasks, 2,287 ms total; dominant script: chunk-6CWFTEBD.js (React) at 530 ms

## Key Finding: Massive No-Op Churn

**Every extension fires on every root+outbound flush, always emitting the same 24–27 nodes, with zero removals.**

- `root+outbound` fires **28 times** across 70 flushes
- Each time, **16–17 extensions** emit the **exact same nodes** (identical IDs, identical counts)
- `nodesIn` is always 24, 26, or 27 — the delta between flushes is 0–3 nodes
- `removedEdgeCount` is always **0**
- Yet all 24+ nodes are re-added every single flush (addedEdgeCount = nodesIn)

This means the graph re-processes identical node sets repeatedly, emitting `onNodeChanged` for nodes that haven't actually changed, which triggers React reconciliation.

## Top Extensions by Flush Frequency (Churn)

All listed extensions fire on **every** root+outbound flush (169 extension invocations each):

| Extension | Plugin | Nodes (total) | Flushes | Estimated ms |
|-----------|--------|---------------|---------|-------------|
| plugin/registry/plugins/connector | registry | 132 | 169 | 1.5 |
| plugin/space/primary-actions/actions | space | 112 | 169 | 1.8 |
| plugin/deck/actions | deck | 112 | 169 | 1.8 |
| plugin/space/root-collection/connector | space | 84 | 169 | 2.4 |
| plugin/space/spaces/connector | space | 66 | 169 | 0.8 |
| plugin/help/actions | help | 56 | 169 | 0.9 |
| plugin/assistant/assistant/actions | assistant | 56 | 169 | 0.9 |
| plugin/space/object-actions/actions | space | 44 | 169 | 2.1 |
| plugin/debug/devtools/connector | debug | 33 | 169 | 2.4 |

## Top Connector Keys by Frequency

| Key | Flushes | Total nodesIn | Total Added | Total Removed |
|-----|---------|---------------|-------------|---------------|
| root+outbound | 28 | 738 | 738 | 0 |
| debug.devtools-root+outbound | 11 | 0 | 0 | 0 |
| root~search+outbound | 10 | 0 | 0 | 0 |
| layout/close/current+outbound | 7 | 0 | 0 | 0 |

## Mutation Step Breakdown

| Step | Calls | Items | Duration (ms) |
|------|-------|-------|---------------|
| addNodes | 555 | 2,624 | 47.8 |
| addNode | 2,624 | 2,624 | 47.1 |
| addEdges | 555 | 2,624 | 6.6 |
| addEdge | 2,624 | 2,624 | 6.2 |
| removeEdges | 169 | 0 | 0.0 |
| sortEdges | 13 | 177 | 0.0 |

**2,624 addNode calls** — almost all of which re-add already-existing nodes.

## Wave Correlation

- **Wave 1** (281 ms, 10 long tasks): overlaps flush 1 and 2 (3 ms flush time, 278 ms React aftermath)
- **Wave 2** (149 ms, 5 long tasks): no flush overlap (pure React/scheduler work)

## Semantic Churn Ratio

- **Emitted nodes per session**: 2,624
- **Net new nodes**: ~27 (final root+outbound count)
- **Churn ratio**: ~97x over-emission (2,624 / 27)
- The graph's `addNodeImpl` checks `typeChanged || dataChanged || propertiesChanged` and skips `onNodeChanged` if nothing changed. But it still runs the comparison logic for all 2,624 nodes, and each extension connector atom re-fires producing new array instances.

## Root Cause

The `_connectors` atom for each key recomputes by calling every extension's connector function and flatMapping the results. Any upstream atom change (even unrelated) invalidates the connector atom, causing it to produce a new array reference. This triggers the subscription callback, which stages a dirty flush with the full node set — even when the content is identical.

## Gate Assessment

- **Top offenders ranked with evidence**: Yes. All 16+ extensions on root+outbound are equally guilty — they all re-emit identical outputs every flush.
- **Extension-level attribution complete**: Yes. Per-extension node counts and timing available.
- **Semantic churn ratio computed**: 97x over-emission.

## Decision

**Phase 2: PASS** — proceed to Phase 3 (causality experiments).

## Recommended Focus for Phase 3

1. The problem is not one bad extension — it's the **connector invalidation pattern**. All extensions re-fire because the connector atom recomputes on any upstream change.
2. A/B experiment should focus on: does adding **structural equality** or **output memoization** at the connector level eliminate the churn cascade?
3. Secondary experiment: disable the highest-node-count extensions (registry/plugins/connector at 132 nodes, space/primary-actions at 112) and measure impact on wave duration.
