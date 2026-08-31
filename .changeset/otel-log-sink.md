---
'@dxos/observability': minor
---

Add `OtelLogSink` (`@dxos/observability/OtelLogSink`) and a `observabilityWorker` option on the Otel extension: OTLP log export can now run in the observability worker, on its own event loop, so a realm blocked by a long synchronous task keeps exporting the lines it logs in near-real-time. `OtelLogs` gains an `emit()` seam and stamps records with the producing log call's timestamp.
