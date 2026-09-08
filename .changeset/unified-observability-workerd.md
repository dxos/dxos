---
'@dxos/observability': minor
'@dxos/plugin-observability': minor
---

`@dxos/observability` runs on workerd. The three per-condition specifiers gain a `workerd` half: storage is a no-op (a worker has no installation to opt out), OTel traces attach `@dxos/tracing` spans to the provider the host already registered instead of creating one, and the PostHog transport is the stub. A new `ObservabilityExtension.Relay` implements the events, errors, AI and MCP kinds by handing a typed envelope to a host-supplied `publish`, for a host whose only egress is a tail consumer. `@dxos/observability/SpanProcessors` exposes the content-stripping, fanout and tag-injecting processors so a host can put them in a provider it owns elsewhere; the AI sink now attaches through the fanout, so it works on such a host too.

plugin-observability follows its settings atom into the running services, so the telemetry opt-in arriving from another device through the app's settings sync enables or disables the backends the same way the toggle does. The `Observability` and `Namespace` modules now split for workerd, and the workerd handler stub that dropped every event is gone.
