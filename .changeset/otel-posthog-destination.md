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

`PostHog.otelDestination(config)` builds a destination from the existing `DX_POSTHOG_API_HOST` and
`DX_POSTHOG_API_KEY` — PostHog serves OTLP under `/i` of the same host it ingests product analytics
on, and authenticates with the public `phc_` project token, so no server-side proxy is needed to
hold a secret and no new variable is needed to address it. Composer sends to it alongside SigNoz on
every deployed environment.
