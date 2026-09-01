---
'@dxos/observability': minor
---

Metric export can now run in the log-writer worker: `OtelMetricsSink` (`@dxos/observability/otel-metrics-sink`) hosts the `MeterProvider` and export timer, fed by instrument calls the producing realm forwards synchronously (`RemoteMetricsForwarder`, active when the Otel extension's `logWriter` option is set). A realm blocked by a long synchronous task keeps landing datapoints. Observable gauges are sampled producer-side on a timer and forwarded as plain gauges.
