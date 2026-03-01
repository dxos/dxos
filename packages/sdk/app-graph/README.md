# @dxos/app-graph

## Performance measurement

Graph-builder and graph mutation paths can be instrumented to quantify per-flush node/edge churn and correlate with DevTools long-task waves.

- **Default**: Instrumentation is **off** in all environments.
- **Enable**: Set `globalThis.__DXOS_APP_GRAPH_PERF__ = true` or `DXOS_APP_GRAPH_PERF=1`.
- **Capture**: Set an emitter via `setFlushMeasurementEmitter((payload) => { ... })` to log or write flush records (e.g. one JSON line per flush to a file).
- **Correlate**: Run the analysis script with a Chrome trace and optional flush-records JSONL:
  `pnpm run correlate-flush-trace -- --trace <trace.json> [--flush-records <flush.jsonl>]`
- **Tooling**: Correlation tooling is kept in `scripts/correlate-flush-trace.ts`.
- **Reports**: Investigation writeups are kept in `perf-reports/`.
- **Local captures**: Store raw local captures under `perf-reports/captures/` (ignored from git).
- **Validate overhead**: Run the same flow (e.g. create-space) with the flag off and on; compare trace duration and long-task counts to confirm instrumentation overhead is acceptable.

## Relation naming

Edges are stored as directional relation keys.

- **Default relation**: `outbound` and `inbound` remain the default pair.
- **Typed outbound**: A custom relation like `actions` is treated as outbound.
- **Typed inbound**: The inverse of a typed relation uses the `:inbound` suffix (for example, `actions:inbound`).
- **Traversal**: Reverse traversal for typed relations should use `graph.connections(id, '<relation>:inbound')`.
- **Compatibility**: Existing code using `relation: 'actions'` remains valid and now records reverse links under `actions:inbound`.
- **TODO**: Evaluate replacing string-pattern relation keys with a structured API (for example, `{ kind: 'actions', direction: 'inbound' }`) while preserving backwards compatibility for string callers.

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2023 © DXOS
