---
'@dxos/observability': minor
---

Metrics can now be observed rather than pushed. `trace.metrics.observe(name, callback, data)` and `observability.metrics.observe(...)` register a callback that is read once per export interval and return a cleanup function, which is the correct instrument for any "current value" metric — a pushed gauge only lands in the export windows its producer happens to tick in, so a producer on a slower cadence than the exporter leaves the series full of gaps. Observations registered before a collector attaches are replayed to it, so SDK code can register at startup, and `RemoteMetrics.unregisterProcessor` detaches a collector on shutdown so a closed one neither keeps receiving samples nor double-reports alongside its replacement.

Metric instruments now carry `unit` and `description`, supplied via the new fourth `meta` argument on `gauge`/`increment`/`distribution`/`observe`.

New client metrics: `dxos.client.spaces.count` / `.ready.count`, `dxos.echo.documents.count{location}` and `dxos.echo.documents.unsynced.count`, and `dxos.client.runtime.memory.bytes{scope}` — the last reporting cross-realm usage via `measureUserAgentSpecificMemory`, which is the only way to see shared and dedicated worker heaps. The existing heap gauges keep their names but are now observed with declared `By` units, and the `dxos.client.space.*` gauges report device-wide totals instead of carrying a per-space `key` attribute that cost one series per space.

Three fixes to the OTLP metrics exporter: it now requests **delta** temporality, so a client reload is no longer read downstream as a counter reset; the metrics resource no longer carries `session.id`, which minted a new time series on every page load; and instruments are cached instead of re-created on every sample.

Adds sync-timing metrics: `dxos.echo.sync.episode.duration` (how long a client takes to reach a synced state) and `dxos.echo.sync.stalled.duration` (how long it has made no progress). Both are needed — a client that never finishes syncing records no duration at all, so the stall gauge is what makes it visible.

Adds runtime responsiveness metrics: `dxos.client.runtime.eventLoop.lag` reports the peak time a timer fired behind schedule per export window (per realm, so the tab and the workers are separable), and `@dxos/worker-framework`'s `RpcTiming` now publishes `dxos.rpc.queueWait.duration` and `dxos.rpc.service.duration`. Queue wait is the cross-thread signal — time a message spent waiting for the receiving thread rather than time spent working — which makes a blocked worker visible without instrumenting it.

Breaking for anyone implementing the observability extension API directly: the `metrics` kind now requires an `observe` method.
