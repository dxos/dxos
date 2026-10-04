# @dxos/network-manager

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

- 3e08678: Rename the WebRTC bridge to `RTCService` and transfer the `RTCDataChannel` to the worker instead of relaying every packet through RPC.

  `RTCDataChannel` is a transferable object on every platform we support, so the tab now hands the established channel straight to the worker and the worker reads and writes it directly. Only signalling crosses the rpc boundary. `RTCService.open` takes the caller's end of a dedicated `MessageChannel` as part of its payload (transferred via effect's worker protocol) and posts the channel to it; the response stream is now purely a stream of signalling messages. The channel cannot ride that stream — a browser only allows an `RTCDataChannel` to be transferred in the task it was created in, and a stream chunk is encoded and sent a task later.

  Removed with it: the `sendData` rpc and its `DataRequest` message, the `BridgeEvent` data/connection-state events, and the duplex relay and manual backpressure callbacks that existed on both sides to carry them. The channel's own send buffer is now the only flow-control signal, applied by a single shared `bindDataChannel` helper used by the direct and proxied transports alike.

  A transferred channel does not deliver its events in the order the creating context would have seen, so that helper attaches the two directions separately: it starts reading on whichever of the first message or the `open` event arrives first, since dropping that first frame stalls the wire protocol's handshake for good, and it starts writing only once the channel is really open, since `send` throws while it is still connecting. A `*.browser.test.ts` suite covers the handover end to end against real Chromium WebRTC and a real worker, and unit tests pin each of those orderings.

  Breaking for embedders that wire the worker themselves:

  - `@dxos/protocols/rpc`: `BridgeService` → `RTCService`; its proto payloads moved from `dxos.mesh.bridge` to `dxos.mesh.rtc` and the `dxos.mesh.bridge.BridgeService` protobuf service is gone (the surface is effect-rpc only).
  - `@dxos/network-manager`: `RtcTransportService` → `RtcService`, now implementing the effect-rpc handlers directly; `RtcTransportProxyFactory.setBridgeService` → `setRtcService`, which takes an `RTCService.Client` rather than a proto-shaped service. `TransportKind.WEB_RTC_PROXY` is gone — the proxy transport needs a real browser now, so it is covered by the browser suite rather than the node `TestBuilder`.
  - `@dxos/client-protocol`: `serveBridgeService`/`makeBridgeServiceClient`/`makeBridgeServiceClientOverProtocol` → `serveRtcService`/`makeRtcServiceClient`/`makeRtcServiceClientOverProtocol`, the latter two now scoped effects rather than promises.
  - `@dxos/client-services`: `WorkerSession.bridgeService` → `rtcService`, `WorkerRuntimeService.connectWebrtcBridge` → `connectWebrtc`.

### Patch Changes

- bab13fe: Fix peer connections that stalled or were torn down while connecting or closing: a failed session tells the remote, buffered channel frames keep their order, pending sends are released on close, and rate-limited topology updates run later instead of being dropped.
- 5959b41: The project pipeline chart no longer burns CPU while it is closed.

  `ProjectArticle` mounted `ProjectPipeline` unconditionally inside the splitter's end panel and let `showPipeline` collapse it visually, so the chart kept rebuilding its whole timeline from the space's trace feed with nothing on screen. It is now mounted only while shown.

  `useSessionTimeline` additionally debounces the trace feed by 500ms, matching the debounce already applied to the process tree. `buildSessionTimeline` is not incremental — it re-flattens the full message history on every emission — and the feed emits per message, far faster than a reader can read. `useTraceMessages` takes the interval as a new optional `debounce` option; callers that omit it (such as `TracePanel`) are unchanged.

  `RtcTransportProxy` also no longer logs whole bridge events. A data event carries the packet as a `Uint8Array`, which the logger serialises as one JSON key per byte — 20MB across a few minutes of an idle session. It now logs the event's case and the payload's byte length.

  `SpaceProxy` no longer re-applies an unchanged automerge root. The host re-sends the space several times a second as its feeds advance, and the root is the same in nearly all of those updates; the redundant ones were walked down into the database only to be discarded there.

- a858612: Drop an inbound WebRTC frame whose `Blob` is still being read when the data channel is disposed, instead of throwing on the torn-down stream.
- 2374d17: Raise the `RtcTransportProxy` close RPC budget from 3s to 15s so a slow-but-alive transport host no longer reports normal teardown as a `TimeoutError`.
- ceff869: WebRTC frames arrive in the order they were sent, offers no longer interleave with a remote description being applied, and an empty end-of-candidates signal is no longer passed to the connection, which crashed WebKit.
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [6388838]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [a069511]
- Updated dependencies [066b35d]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [73daef4]
- Updated dependencies [fd23a8b]
- Updated dependencies [4e417e9]
- Updated dependencies [194b1d3]
- Updated dependencies [23d2d8c]
- Updated dependencies [782a442]
- Updated dependencies [472ca95]
- Updated dependencies [e56276b]
- Updated dependencies [967b130]
- Updated dependencies [882ac2a]
- Updated dependencies [3ea0b0f]
- Updated dependencies [ce194c0]
- Updated dependencies [4aa6a33]
- Updated dependencies [9d2466a]
- Updated dependencies [78e5596]
- Updated dependencies [b1bb838]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [4663f24]
- Updated dependencies [2896a58]
- Updated dependencies [9e91762]
- Updated dependencies [2df0297]
- Updated dependencies [3e08678]
- Updated dependencies [f8bfba0]
- Updated dependencies [56276cd]
- Updated dependencies [e8088ea]
- Updated dependencies [dac61d5]
- Updated dependencies [1a3de22]
- Updated dependencies [85e6347]
- Updated dependencies [4da1052]
- Updated dependencies [6dadb41]
  - @dxos/effect@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/teleport@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/context@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/messaging@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/codec-protobuf@0.11.1
- @dxos/context@0.11.1
- @dxos/debug@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/messaging@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/rpc@0.11.1
- @dxos/teleport@0.11.1
- @dxos/tracing@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [aea1e6e]
- Updated dependencies [3f1fc67]
- Updated dependencies [962c8cd]
- Updated dependencies [6a03a30]
- Updated dependencies [f6a01e3]
- Updated dependencies [c727a43]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [c727a43]
- Updated dependencies [b3a3fcf]
- Updated dependencies [08a3eea]
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/log@0.11.0
  - @dxos/messaging@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/tracing@0.11.0
  - @dxos/rpc@0.11.0
  - @dxos/teleport@0.11.0
  - @dxos/context@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
