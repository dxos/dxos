---
'@dxos/echo-host': patch
---

The worker now logs a warning, above its default log filter, when an index pass, a query batch, full-text catch-up or a storage-only document load takes 1 s or more. A slow query batch names its slowest query.
