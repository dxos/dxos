---
'@dxos/teleport': minor
'@dxos/network-manager': minor
'@dxos/teleport-extension-replicator': minor
'@dxos/client-services': minor
'@dxos/edge-client': minor
'@dxos/websocket-rpc': minor
'@dxos/async': minor
'@dxos/util': minor
---

The MESH byte pipe is now WHATWG web streams rather than Node `Duplex`, and the stack no longer uses `Buffer`.

`WireProtocol.stream`, `TransportOptions.stream`, `Teleport.stream` and `Muxer.createStream()` now carry `{ readable: ReadableStream<Uint8Array>; writable: WritableStream<Uint8Array> }` (exported as `DuplexStream` from `@dxos/teleport`) instead of a `Duplex`. Cross-connect two of them with `connectDuplexStreams(a, b)` where you previously wrote `a.pipe(b).pipe(a)`. The channel router — `Muxer.createPort()` and `RpcPort` — is unchanged.

`WireProtocol` gains a `closed: Event<Error | undefined>`, since a web stream has no `close`/`error` events to listen to. Implementors outside this repo must supply it; a Teleport-backed protocol forwards `teleport.closed`.

`TestStream` from `@dxos/async/testing` is no longer a `Duplex`: use `stream.readable` / `stream.writable` in place of `pipe`.

Backpressure is preserved throughout and is now denominated in bytes: the framer reports it via `desiredSize` against a `ByteLengthQueuingStrategy`, the WebRTC transport via `bufferedAmount` / `bufferedAmountLow`, and the TCP transport via the socket's `drain`.

Hypercore replication is unaffected. `@dxos/vendor-hypercore` dictates a Node stream, so `teleport-extension-replicator` keeps a single explicit `Duplex` bridge; that file and the Node-only TCP transport are the only places the stack still touches Node streams.

`concatUint8Arrays` is added to `@dxos/util` as the `Buffer.concat` replacement.
