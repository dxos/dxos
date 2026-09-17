---
'@dxos/echo-host': patch
---

Losing one Subduction peer no longer holds every in-flight sync round, and the local edits queued behind them, until the request timeout: rounds wake and re-sync against the peers still connected. A peer that reconnects is only queried for collections it newly qualifies for.
