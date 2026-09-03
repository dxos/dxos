---
'@dxos/echo-client': patch
---

Object core pinning no longer installs a timer per registry touch — a single sweep timer expires pins by last-touch timestamp, removing the dominant timer churn of a bulk object load.
