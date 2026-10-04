# @dxos/async

## 0.12.0

### Minor Changes

- 9d2466a: The MESH byte pipe is now WHATWG web streams rather than Node `Duplex`, and the browser-facing paths through it no longer use `Buffer`. The hypercore bridge still converts with `Buffer.from`, because hypercore requires it, and the node-only websocket upgrade path keeps `Buffer` deliberately.

  `WireProtocol.stream`, `TransportOptions.stream`, `Teleport.stream` and `Muxer.createStream()` now carry `{ readable: ReadableStream<T>; writable: WritableStream<T> }` — exported as `DuplexStream<T = Uint8Array>` from `@dxos/teleport` — instead of a `Duplex`. Cross-connect two of them with `connectDuplexStreams(a, b)` where you previously wrote `a.pipe(b).pipe(a)`; it returns a detach that stops both directions without ending either endpoint. The channel router — `Muxer.createPort()` and `RpcPort` — is unchanged.

  `WireProtocol` gains a `closed: Event<Error | undefined>`, since a web stream has no `close`/`error` events to listen to. Implementors outside this repo must supply it; a Teleport-backed protocol forwards `teleport.closed`.

  `TestStream` from `@dxos/async/testing` is no longer a `Duplex`: use `stream.readable` / `stream.writable` in place of `pipe`.

  Backpressure is preserved throughout and is now denominated in bytes: the framer reports it via `desiredSize` against a `ByteLengthQueuingStrategy`, the WebRTC transport via `bufferedAmount` / `bufferedAmountLow`, and the TCP transport via the socket's `drain`.

  Hypercore replication is unaffected. `@dxos/vendor-hypercore` dictates a Node stream, so `teleport-extension-replicator` keeps a single explicit `Duplex` bridge; that file and the Node-only TCP transport are the only places the stack still touches Node streams.

  `concatUint8Arrays` is added to `@dxos/util` as the `Buffer.concat` replacement.

  Space and device authentication now compares the auth nonce byte-wise rather than through
  `Buffer.prototype.equals`. The browser `buffer` polyfill's `isBuffer()` rejects a plain
  `Uint8Array` — which is what protobuf decoding yields for `credential.proof.nonce` — and threw
  `TypeError: Argument must be a Buffer`, failing every authentication and so blocking all feed
  replication in the browser. The remaining browser-reachable `Buffer` calls in `edge-client` are
  gone for the same reason: a Node `Buffer` is a `Uint8Array`, so one `instanceof` check covers both
  runtimes, and base64 is decoded with the protobuf wire codec already in use.

  Throughput: Node's web-stream primitives cost a promise and a microtask per chunk, so the framer alone measures ~5x slower than the `Duplex` it replaces (822k -> 126k frames/s at 64B). The full muxer stack peaks at ~27k frames/s, well below that ceiling, so the estimated end-to-end cost is ~18%. Frame batching and a manual pump were both tried and neither helps, because every producer awaits each send.

### Patch Changes

- ce194c0: Remove main-thread stalls: add `interactive`/`smooth`/`idle` yield strategies to `@dxos/async`, have routine registry sync yield under the `smooth` strategy, and initialize each layer slice under its own lock instead of one stack-wide lock.
- Updated dependencies [967b130]
- Updated dependencies [4aa6a33]
- Updated dependencies [9d2466a]
- Updated dependencies [56276cd]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [4da1052]
  - @dxos/util@0.12.0
  - @dxos/log@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/context@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/context@0.11.1
- @dxos/debug@0.11.1
- @dxos/invariant@0.11.1
- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- aea1e6e: Stop exporting `TestStream` from the package's main entry. The helper extends `node:stream`'s `Duplex`, and re-exporting it from the browser-reachable barrel leaked `node:stream` into every browser bundle — with source-first dev resolution (vite + rolldown build system) this threw `Module "node:stream" has been externalized for browser compatibility` at module scope on dev-server boot, hanging the app on the loading screen.

  Breaking: import `TestStream` from `@dxos/async/testing` (new Node-only subpath) instead of `@dxos/async`.

### Patch Changes

- Updated dependencies [3f1fc67]
- Updated dependencies [f6a01e3]
  - @dxos/util@0.11.0
  - @dxos/log@0.11.0
  - @dxos/context@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
