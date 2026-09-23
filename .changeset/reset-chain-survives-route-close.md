---
'@dxos/client-services': patch
---

Fix a storage reset that never wiped anything. The reset chain ran on the RPC handler's fiber, and
its first step closes the stack — and with it the route scope that fiber is forked into — so it was
interrupted before reaching the wipe. The chain now runs detached, with the handler joining it.
