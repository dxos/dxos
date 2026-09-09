---
# multiple-changesets: stacked on #12609, whose changeset describes the settings sync; this one describes observability on workerd and is read separately.
'@dxos/observability': minor
'@dxos/plugin-observability': minor
---

`@dxos/observability` runs on workerd. The three per-condition specifiers gain a `workerd` half: storage is a no-op (a worker has no installation to opt out), OTel traces attach `@dxos/tracing` spans to the provider the host already registered instead of creating one, and the PostHog transport is `posthog-node`, which ships a workerd build; the stub stays for browser workers, where posthog-js runs in the page. A new `ObservabilityExtension.Relay` implements the events, errors, AI and MCP kinds by handing a typed envelope to a host-supplied `publish`, for a host whose only egress is a tail consumer; `Relay.replay` plays an envelope back onto a facade on the consuming side, with the record's person ambient for its calls. Attribution is per capture where a host serves many people: the Relay and PostHog node transports take a `distinctId` resolver, and the PostHog transport can attribute what no person claims to a service id with person profiles off. `@dxos/observability/SpanProcessors` exposes the content-stripping, fanout and tag-injecting processors so a host can put them in a provider it owns elsewhere; the AI sink now attaches through the fanout, so it works on such a host too.

plugin-observability follows its settings atom into the running services, so the telemetry opt-in arriving from another device through the app's settings sync enables or disables the backends the same way the toggle does. The `Observability` and `Namespace` modules now split for workerd, and the workerd handler stub that dropped every event is gone.
