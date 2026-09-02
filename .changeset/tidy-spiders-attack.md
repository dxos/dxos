---
'@dxos/observability': minor
'@dxos/cli': minor
---

Observability now works outside the browser. The package ships a node-resolved bundle alongside the browser one, so a node host reaches the node halves of the storage and OTel-traces splits instead of the browser stubs its single bundle used to inline; PostHog gains a `posthog-node` transport, selected by runtime; and MCP server sessions and tool calls are a new `mcp` extension kind. Opting out now stops OTel: the exporters were constructed before the consent check, so a metric reader kept exporting on its own schedule whatever the user had chosen. `isObservabilityDisabled` reports disabled when the state cannot be read, and the first-run notice creates the profile directory it writes its marker into.

`dx` sends usage and performance data, matching what Composer collects: an event per command, the operations plugins map to events, errors, and MCP `initialize` and `tools/call` when `dx mcp serve` is running. Events are attributed to the identity DID once there is one, and to a per-installation id before that. Only a released binary reports: it sends OTel through the deployment's ingestion proxy, which holds the credential server-side, and to whichever PostHog project was injected when it was built. A source checkout reports nothing unless `DX_POSTHOG_API_KEY` or `DX_OTEL_ENDPOINT` says where. Manage it with `dx telemetry [status|enable|disable]`, or `DX_DISABLE_OBSERVABILITY=true`.
