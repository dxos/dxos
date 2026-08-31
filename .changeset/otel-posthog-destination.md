---
'@dxos/observability': patch
---

OTel export fans out to a list of destinations instead of a single endpoint, so a second collector
can be trialled without moving the first. Each destination gets its own batch processor (traces,
logs) or metric reader (metrics), so a slow or failing backend only stalls its own queue. Delta
counters are not split across readers — the temporal processor holds one unreported accumulation per
collector — but observable-gauge callbacks now run once per destination, so they must stay
side-effect free.

The list is resolved in the producing realm and shipped in the log-writer worker's init messages, so
the worker sinks fan out too. A span still crosses the port once, whatever the destination count.

`PostHog.otelDestination(config)` builds a destination from `DX_POSTHOG_OTEL_HOST` and the existing
`DX_POSTHOG_API_KEY`. PostHog serves OTLP under `/i` rather than the root, and authenticates with
the public `phc_` project token, so no server-side proxy is needed to hold a secret. Composer sends
to it alongside SigNoz on dev, preview, and staging; production is unchanged until the trial says
what it costs.
