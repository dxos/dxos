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

## Relation API

Graph relation APIs use a structured relation object:

- `Relation = { kind: string; direction: 'outbound' | 'inbound' }`.
- Public methods accept `RelationInput = Relation | string`.
- If a string is passed, it is normalized to `{ kind: <string>, direction: 'outbound' }`.
- String values are always treated as relation kinds (`'inbound'` and `'outbound'` are not direction aliases).
- Callers must pass a relation explicitly (no implicit default relation argument).

Examples:

- Child traversal: `graph.connections(id, 'child')`.
- Child reverse traversal: `graph.connections(id, { kind: 'child', direction: 'inbound' })`.
- Actions traversal: `graph.connections(id, 'actions')`.
- Actions reverse traversal: `graph.connections(id, { kind: 'actions', direction: 'inbound' })`.

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2023 © DXOS
