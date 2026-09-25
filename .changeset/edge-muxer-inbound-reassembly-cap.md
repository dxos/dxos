---
'@dxos/edge-client': patch
---

Bound inbound segmented-message reassembly in `WebSocketMuxer`. A peer that sends segments without ever setting the terminator flag previously drove unbounded per-channel memory growth. Accumulation is now capped per channel (32MB, `MAX_INBOUND_MESSAGE_BYTES`), by chunk count (`MAX_INBOUND_CHUNK_COUNT`) and across the muxer (`MAX_INBOUND_TOTAL_BYTES`); tripping a cap releases the channel's accumulator and throws `SegmentedMessageLimitError`, which the connection logs and drops.
