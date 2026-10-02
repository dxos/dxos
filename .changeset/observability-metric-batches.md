---
'@dxos/observability': minor
---

Metrics forwarded to an observability worker are aggregated per series and posted as one `otel-metric-batch` message per second instead of one `otel-metric` message per call; `OtelMetricsSink.Sink.append` now takes that batch. Breaking for anyone posting `otel-metric` records to the sink directly.
