---
'@dxos/edge-client': minor
'@dxos/protocols': minor
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

Credit is counted in bytes and in messages: `EDGE_FLOW_CONTROL_MAX_MESSAGES` bounds how many messages
one channel may have unacknowledged, since a byte window alone admits thousands of small replication
frames and each is its own request downstream. `EDGE_FLOW_CONTROL_MAX_CONNECTION_MESSAGES` bounds the
whole connection the same way, since a channel is one space and a device with many spaces would
otherwise hold thousands of messages in flight to its router at once, as a reconnect's feed burst does. A receiver rebuilt mid-connection (the router after
hibernation or a reset) asks for the sender's totals and rebases onto them, so a channel never stalls
on grants counted from zero.

`WebSocketMuxer.receiveFrame` and `consumed` expose the credit loop to a muxer's owner;
`receiveData` keeps its signature for callers without flow control.
