---
# multiple-changesets: the WebSocketMuxer send hang is unrelated to the reopened-space sync-state fix on this branch
'@dxos/edge-client': patch
---

`WebSocketMuxer.send` no longer hangs on a segmented (16 KiB or larger) message when the socket closes or throws mid-send. Queued segmented sends now reject: with `WebSocketClosedError` once the socket is closing or closed, or the muxer is destroyed, or with the error its `send` threw. A throwing socket no longer stalls every later segmented send on that muxer, and a service whose message was cut off mid-sequence moves to a fresh channel, so its next message is not appended to the segments the receiver already holds.
