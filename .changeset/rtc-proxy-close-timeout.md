---
'@dxos/network-manager': patch
---

Raise the `RtcTransportProxy` close RPC budget from 3s to 15s so a slow-but-alive transport host no longer reports normal teardown as a `TimeoutError`.
