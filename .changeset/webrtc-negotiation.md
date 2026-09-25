---
'@dxos/network-manager': patch
---

WebRTC frames arrive in the order they were sent, offers no longer interleave with a remote description being applied, and an empty end-of-candidates signal is no longer passed to the connection, which crashed WebKit.
