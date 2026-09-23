# Guard the inbound data-channel path against disposal mid-blob

WebRTC data channels deliver inbound `Blob` payloads asynchronously, and disposal can land while a
blob is still being read. This change drops such a frame instead of pushing it into a torn-down
stream.

## The blob read is the one await on the inbound path

Reading a `Blob` requires an async `arrayBuffer()` call, which is the only point in the message
handler where control yields back to the event loop. Everything else in the handler runs
synchronously against whatever `duplex` was bound at the time. If the channel is disposed while
that read is in flight, the binding that was captured before the await is stale: pushing into it
throws, because the stream is already torn down.

```diff file=packages/core/mesh/network-manager/src/transport/webrtc/rtc-data-channel.ts lines=119-130

```

## Re-checking after the await, not relying on the captured binding

The fix re-reads whether the channel is still bound after the await resolves, rather than trusting
the reference captured before it. When disposal happened in the meantime, there is nothing to push
to, so the frame is dropped and the handler returns cleanly instead of throwing.

## Test simulates the race by holding the blob read open

The regression test constructs a blob whose `arrayBuffer()` promise it controls directly, so it can
dispose the channel while the read is still pending and only then resolve it. This exercises the
exact interleaving the fix depends on, rather than a best-effort timing approximation.

```diff file=packages/core/mesh/network-manager/src/transport/webrtc/rtc-data-channel.test.ts lines=81-97

```
