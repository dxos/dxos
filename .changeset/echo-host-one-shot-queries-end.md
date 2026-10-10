---
'@dxos/echo-host': patch
---

A one-shot query's stream now ends after its first result, so the query no longer stays registered and re-runs on invalidations until the client's interrupt arrives. Queries that register while the snapshot store is still filling share one completeness check instead of each running a full scan.
