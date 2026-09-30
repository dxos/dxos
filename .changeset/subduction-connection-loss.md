---
'@dxos/echo-host': patch
---

Losing one Subduction peer no longer holds every in-flight sync round, and the local edits queued behind them, until the request timeout: the lost peer is disconnected in Subduction, which settles its pending requests, so rounds finish against the peers still connected.
