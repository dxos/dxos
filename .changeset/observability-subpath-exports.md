---
'@dxos/observability': minor
'@dxos/eslint-plugin-rules': patch
---

`@dxos/observability` exposes one entrypoint per namespace: `@dxos/observability/Observability`, `/ObservabilityExtension`, `/ObservabilityProvider`, `/ObservabilityClientProvider`, `/AiTelemetry`, `/OtelLogSink`, `/OtelMetricsSink`, and `/OtelSpanSink`. The barrel still exports the first four, so existing imports keep working, but importing it pulls the whole package into the consumer's eager graph. The `dxos-subpath-imports` lint now rewrites barrel imports of this package onto the subpaths.

The last four are standalone entrypoints rather than barrel namespaces: the AI sink is used only by a lazily-activated capability, and the `Otel*Sink` trio only by the log-writer worker, so hoisting any of them onto the barrel would put it in the eager graph of everyone importing the package. Each carries a header saying so in place of the `@import-as-namespace` directive, which is how `dxos-subpath-exports` tells the two apart.

The providers split in two. `ObservabilityProvider` carries the ones that depend on nothing heavy (`EventLoopLag`, `IPData`, `Memory`, `Storage`), and the new `ObservabilityClientProvider` carries those reaching `@dxos/client` and `@dxos/protocols` (`Client`, `SyncState`). `eventLoopLagProvider` moved from `Client` to `EventLoopLag`, where its tracker already lived, so a caller that only samples event-loop lag no longer drags the client stack in. Callers of `ObservabilityProvider.Client.*` move to `ObservabilityClientProvider.Client.*`, and `ObservabilityProvider.Client.eventLoopLagProvider` becomes `ObservabilityProvider.EventLoopLag.eventLoopLagProvider`.

`dxos-subpath-exports` resolved an exports entry only through its `source` condition. The toolbox strips that condition from every `dist-runtime` package, so the rule silently skipped them — a package could be opted into consumer rewriting while the check that keeps its barrel and its subpaths in agreement never ran. It now recovers the source from `types` when `source` is absent, which surfaced two barrels that had drifted while it was blind: `@dxos/sql-sqlite` was missing `SqlExport`, and the `Otel*Sink` entrypoints were declaring themselves namespaces while deliberately staying off their barrel.
