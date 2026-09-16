---
'@dxos/observability': minor
'@dxos/plugin-observability': patch
---

`@dxos/observability` exposes one entrypoint per namespace (`/Observability`, `/ObservabilityExtension`, `/ObservabilityProvider`, `/ObservabilityClientProvider`, `/AiObservability`, `/OtelLogSink`, `/OtelMetricsSink`, `/OtelSpanSink`), and the `dxos-subpath-imports` lint rewrites barrel imports onto them, so a consumer no longer pulls the whole package into its eager graph. The barrel keeps exporting the first four. The AI sink and the `Otel*Sink` trio are standalone entrypoints off the barrel, since only a lazily activated capability and the log-writer worker use them.

Breaking: the providers that reach `@dxos/client` moved from `ObservabilityProvider.Client` to `ObservabilityClientProvider.Client`, and `eventLoopLagProvider` to `ObservabilityProvider.EventLoopLag`.

`dxos-subpath-exports` now resolves a `dist-runtime` package's entrypoints from `types` when the toolbox has stripped `source`, so the barrel-versus-subpath check runs for those packages too; it caught `@dxos/sql-sqlite` missing `SqlExport` from its barrel.
