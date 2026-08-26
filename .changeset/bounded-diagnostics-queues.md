---
'@dxos/echo': patch
---

Bound the long-lived diagnostics and reactivity containers: buffered trace spans are capped in a ring buffer, cached space-id derivations are capped with oldest-first eviction, host and query-service diagnostics unregister on close, and a throwing reactivity emission can no longer strand queued targets in the module-level batch queues.
