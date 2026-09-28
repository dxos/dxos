---
'@dxos/echo-host': patch
---

The EDGE subduction replicator no longer waits for the socket to reconnect before sending. While
the device is offline it drops the frame and logs a warning, instead of holding every queued write
for the 10 s send timeout and then logging `failed to send message` as an error. The reconnect opens
a fresh connection and re-syncs every collection, so nothing the wait used to deliver is lost.
