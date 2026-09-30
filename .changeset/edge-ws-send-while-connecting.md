---
'@dxos/edge-client': patch
---

Messages sent on an EDGE WebSocket that is still completing its handshake are now buffered and flushed on `open`, instead of throwing `InvalidStateError: Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.` (V0 path) or being silently dropped (muxer path). The queue is bounded at 256 messages and cleared on close.
