---
'@dxos/edge-client': minor
---

The EDGE websocket supports credit-based flow control, negotiated as the `edge-ws-v2` subprotocol.
A client no longer runs arbitrarily far ahead of a router that cannot keep up, which previously
drove the router into resets that silently dropped in-flight messages while the socket stayed open.
Credit is per service channel, so a stalled replication sync no longer blocks presence or
invitations on the same connection.

`EdgeClient.createStream({ serviceId })` returns a `WritableStream<Message>` whose writes resolve
only once their bytes reach the socket, so `writer.ready` reports whether EDGE is keeping up and
`pipeTo` slows its source instead of buffering without bound. `EdgeClient.send` is unchanged and
still returns without waiting.

Breaking: `WebSocketMuxer.receiveData` returns a `ReceivedFrame`
(`{ message?, channelId?, byteLength }`) rather than `Message | undefined`; callers read `.message`.
