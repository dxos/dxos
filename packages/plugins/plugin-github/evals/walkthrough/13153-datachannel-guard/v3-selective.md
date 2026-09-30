# Guard the inbound data-channel path against disposal mid-blob

An inbound WebRTC frame delivered as a `Blob` awaits `arrayBuffer()` before it can be pushed onto
the duplex stream. If the channel is disposed during that await, the push has nothing to push to
and throws on the torn-down stream. This change drops the frame instead.

## Re-check the binding after the await

`Blob.arrayBuffer()` is the only await on the inbound path, so it is the only place disposal can
land between the read and the push. The fix re-reads `duplex` after the await and bails when it is
gone, rather than pushing into a stream that no longer exists.

```diff file=packages/core/mesh/network-manager/src/transport/webrtc/rtc-data-channel.ts lines=119-130

```

## Regression test for the disposal race

The test holds the blob's `arrayBuffer()` promise open, disposes the channel while it is pending,
then resolves it, and asserts the delivery settles without throwing — reproducing the exact
ordering the guard protects against.

```diff file=packages/core/mesh/network-manager/src/transport/webrtc/rtc-data-channel.test.ts lines=78-99

```
