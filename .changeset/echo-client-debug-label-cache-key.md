---
'@dxos/echo-client': patch
---

Identical queries that differ only in `debugLabel` now share one cached query result, and so one worker query.
