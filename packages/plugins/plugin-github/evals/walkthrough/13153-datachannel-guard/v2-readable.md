# Guard the inbound data-channel path against disposal mid-blob

Reading an inbound WebRTC `Blob` is the one await on the data-channel message path. If the channel
is disposed while that read is in flight, the code resumed and pushed into a duplex stream that no
longer exists. The fix drops the frame instead of throwing on the torn-down stream.

## Re-check the binding after the await

`data.arrayBuffer()` suspends the handler. `duplex` is captured by closure, so disposal during the
suspension clears the binding the handler still holds a reference to. The handler re-checks
`duplex` right after the await and returns without pushing when it is gone.

```diff file=packages/core/mesh/network-manager/src/transport/webrtc/rtc-data-channel.ts lines=119-130

```

## Test: dispose while the blob read is pending

The test holds the `arrayBuffer()` promise open, disposes the channel, then resolves it. Before the
fix this rejected; now it resolves without pushing.

```diff file=packages/core/mesh/network-manager/src/transport/webrtc/rtc-data-channel.test.ts lines=81-96

```
