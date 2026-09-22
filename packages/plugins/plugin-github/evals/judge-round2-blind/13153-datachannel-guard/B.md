# Guard the inbound data-channel path against disposal mid-blob

This change stops an inbound WebRTC frame from throwing when the data channel is disposed while
its `Blob` payload is still being read. The frame is dropped instead of pushed to a torn-down
stream.

## Re-checking the binding after the await

`Blob.arrayBuffer()` is the only await on the inbound message path, so it is the only point where
disposal can happen concurrently with delivery. The fix re-reads `duplex` after that await and
bails out if it is gone.

```diff file=packages/core/mesh/network-manager/src/transport/webrtc/rtc-data-channel.ts lines=115-131

```

Before this change, `duplex.push(data)` ran unconditionally after the await, so a channel disposed
during the blob read pushed into a stream that no longer existed and threw.

## Test coverage for the race

The added test resolves the blob's `arrayBuffer()` promise only after calling `dispose()`, so the
push happens on an already-torn-down duplex.

```diff file=packages/core/mesh/network-manager/src/transport/webrtc/rtc-data-channel.test.ts lines=81-97

```

The assertion is that the delivery promise resolves rather than rejects, confirming the frame is
dropped silently instead of throwing.
