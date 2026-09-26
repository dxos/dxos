---
# multiple-changesets: the WebSocketMuxer send hang is unrelated to the reopened-space sync-state fix on this branch
'@dxos/edge-client': patch
---

`WebSocketMuxer.send` no longer hangs on a segmented (16 KiB or larger) message when the socket closes or throws mid-send. Queued segmented sends now reject: with `WebSocketClosedError` once the socket is closing or closed, or the muxer is destroyed, or with the error its `send` threw. A throwing socket no longer stalls every later segmented send on that muxer. Once a message is cut off mid-sequence, later segmented sends on that muxer reject, because the receiver still holds its first segments. Past 255 services, channels are shared instead of wrapping onto a channel id already in use. `EdgeWsConnection` no longer restarts a connection after heavy local work blocked its event loop for most of the 12s keepalive window; the restart cost a re-handshake and failed the in-flight sync rounds.
