---
'@dxos/async': minor
---

Route `warnAfterTimeout` and `@timed` through `log.warn` instead of `console.warn`, so slow-action warnings reach log processors and telemetry exporters rather than only the console. Both now accept an optional context object that is attached to the warning; space-scoped callers pass `spaceId`, `tags`, and replication state. Breaking: both moved from `@dxos/debug` to `@dxos/async`.
