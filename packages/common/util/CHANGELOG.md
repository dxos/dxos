# @dxos/util

## 0.12.0

### Minor Changes

- 967b130: `@dxos/util` exports `gzip`, which compresses a string or `Blob` with the platform `CompressionStream`. The
  observability support API now uploads feedback logs gzipped (`Content-Type: application/gzip`), and the
  debug plugin's "Download logs" button saves a `.ndjson.gz` file.
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

- e8088ea: Fix logs and file exports in the native app, where both halves failed silently: downloads went through `<a download>`, which the Tauri webview drops, and are now saved via the native save dialog, falling back to the anchor where the dialog is unreachable; feedback log uploads posted to a relative path that does not exist on the app's own origin, and now take a configurable absolute endpoint.
- 1a3de22: Fix the command palette and search dialog keyboard contract. Both now focus their input on open
  (so Enter runs the highlighted entry instead of the dialog's Close button), keep the first result
  highlighted as the query changes, and close on Escape rather than only clearing the query.
  `Picker.Input`/`SearchList.Input` gain `escapeBehavior`, `SearchList.Root` gains
  `resetSelectionOnChange`, and `resolveKeyBinding` in `@dxos/util` applies the platform fallbacks
  everywhere a shortcut hint is rendered — shortcuts were blank on Linux despite firing.
- Updated dependencies [56276cd]
- Updated dependencies [4da1052]
  - @dxos/debug@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/debug@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/node-std@0.11.1

## 0.11.0

### Patch Changes

- 3f1fc67: Document versioning: Google-Docs-style suggestion review.
  - **@dxos/ui-editor**: `suggestChanges` (inline per-change accept/reject over a proposal) plus word-level `diffHunks`; a multi-author `suggestions({ sources })` overlay and `groupHunks` grouping; the `comments` / `diff` / `suggest` review extensions are grouped under a new `review/` folder (package barrel exports unchanged).
  - **@dxos/app-framework**: `NamePopover` moved to `@dxos/app-framework/ui`, decoupled from translations via a `submitLabel` prop.
  - **@dxos/plugin-markdown**: branch/merge/checkpoint exposed as agent skill tools; a `suggest` diff-view mode; the compare/diff overlay is reconfigured through a CodeMirror `Compartment` so switching views no longer remounts the editor (rebinding automerge / losing selection). The branch banner's Compare toggle becomes a three-way `[Base | Diff | Branch]` view selector — Base shows the parent content at the anchor read-only.
  - **@dxos/plugin-space**: `NamePopover` removed from `@dxos/plugin-space/components` (relocated to `@dxos/app-framework/ui`); `VersioningState.compare` (boolean) becomes `view` (`base | diff | branch`).
  - **@dxos/types**: new `ContentBlock.Change` (a suggested edit — `before`/`after`) so a suggestion renders through the message tile.
  - **@dxos/react-ui-thread**: `Message.Tile` renders the `change` block (struck original → proposed text) with Accept/Reject via new `onAcceptChange`/`onRejectChange` thread callbacks; `CommentThread` is decoupled from `@dxos/react-client` (metadata/activity/identity injected as props).
  - **@dxos/plugin-review**: a unified review companion — comment threads and suggestion cards in one surface. `Suggestions` reactively tracks the document's active `kind:'suggestion'` branches (one bound probe per branch) and renders each grouped change as a change-block tile, routing Accept/Reject to the durable `AcceptChange`/`RejectChange` ops.
  - **@dxos/plugin-markdown**: a `SuggestEdit` operation + "Suggest edits" authoring action that find-or-creates the caller's per-author suggestion branch and edits it.

- Updated dependencies [6a03a30]
  - @dxos/keys@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
