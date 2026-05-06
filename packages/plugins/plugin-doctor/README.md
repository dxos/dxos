# @dxos/plugin-doctor

Self-introspection blueprint for Composer. Contributes a single AI tool,
`queryComposerLogs`, that reads the browser tab's own NDJSON log store
(populated by `@dxos/log-store-idb`) and supports filtering, projection,
aggregation, and top-K counting — the same scenarios as
`scripts/query-logs.mjs`, but available to the in-app assistant.

The tool is read-only and never writes back to the log store.

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

License: [MIT](./LICENSE) Copyright 2026 © DXOS
