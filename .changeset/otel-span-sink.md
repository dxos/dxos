---
'@dxos/observability': minor
---

Span export can now run in the observability worker: `OtelSpanSink` (`@dxos/observability/OtelSpanSink`) hosts the batch processor and OTLP exporter, fed by ended spans the realm's tracer provider forwards via `PortSpanProcessor` (active when the Otel extension's `observabilityWorker` option is set). Sampling, span IDs, and context propagation stay in the producing realm; only batching and export move out, so spans ended by code inside a long synchronous task export while the realm is still blocked.
