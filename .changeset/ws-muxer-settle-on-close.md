---
'@dxos/edge-client': patch
---

`WebSocketMuxer.send()` of a segmented (>16 KB) message now rejects with `EdgeConnectionClosedError` when the socket is closing or closed, instead of never settling and holding its queued chunks in memory.
