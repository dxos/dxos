---
'@dxos/observability': minor
---

Metrics can now be observed rather than pushed. `trace.metrics.observe(name, callback, data)` and `observability.metrics.observe(...)` register a callback that is read once per export interval and return a cleanup function, which is the correct instrument for any "current value" metric — a pushed gauge only lands in the export windows its producer happens to tick in, so a producer on a slower cadence than the exporter leaves the series full of gaps. Observations registered before a collector attaches are replayed to it, so SDK code can register at startup.

Metric instruments now carry `unit` and `description`, supplied via the new fourth `meta` argument on `gauge`/`increment`/`distribution`/`observe`.

Three fixes to the OTLP metrics exporter: it now requests **delta** temporality, so a client reload is no longer read downstream as a counter reset; the metrics resource no longer carries `session.id`, which minted a new time series on every page load; and instruments are cached instead of re-created on every sample.

Breaking for anyone implementing the observability extension API directly: the `metrics` kind now requires an `observe` method.
