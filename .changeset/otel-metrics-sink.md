---
'@dxos/observability': minor
---

Metric export can now run in the observability worker: `OtelMetricsSink` (`@dxos/observability/OtelMetricsSink`) hosts the `MeterProvider` and export timer, fed by instrument calls the producing realm forwards synchronously (`RemoteMetricsForwarder`, active when the Otel extension's `observabilityWorker` option is set). A realm blocked by a long synchronous task keeps landing datapoints. Observable gauges are sampled producer-side on a timer and forwarded as plain gauges.
