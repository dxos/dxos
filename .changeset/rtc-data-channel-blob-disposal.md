---
'@dxos/network-manager': patch
---

Drop an inbound WebRTC frame whose `Blob` is still being read when the data channel is disposed, instead of throwing on the torn-down stream.
