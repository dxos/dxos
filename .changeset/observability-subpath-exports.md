---
'@dxos/observability': minor
'@dxos/eslint-plugin-rules': patch
---

`@dxos/observability` exposes one entrypoint per namespace: `@dxos/observability/Observability`, `/ObservabilityExtension`, `/ObservabilityProvider`, `/ObservabilityClientProvider`, and `/AiObservability`. The barrel still exports all of them, so existing imports keep working, but importing it pulls the whole package into the consumer's eager graph. The `dxos-subpath-imports` lint now rewrites barrel imports of this package onto the subpaths.

The providers split in two. `ObservabilityProvider` carries the ones that depend on nothing heavy (`EventLoopLag`, `IPData`, `Memory`, `Storage`), and the new `ObservabilityClientProvider` carries those reaching `@dxos/client` and `@dxos/protocols` (`Client`, `SyncState`). `eventLoopLagProvider` moved from `Client` to `EventLoopLag`, where its tracker already lived, so a caller that only samples event-loop lag no longer drags the client stack in. Callers of `ObservabilityProvider.Client.*` move to `ObservabilityClientProvider.Client.*`, and `ObservabilityProvider.Client.eventLoopLagProvider` becomes `ObservabilityProvider.EventLoopLag.eventLoopLagProvider`.

`dxos-subpath-exports` resolved an exports entry only through its `source` condition. The toolbox strips that condition from every `dist-runtime` package, so the rule silently skipped them — a package could be opted into consumer rewriting while the check that keeps its barrel and its subpaths in agreement never ran. It now recovers the source from `types` when `source` is absent.
