# @dxos/av

## 0.17.0

### Minor Changes

- d338edb: Calls and live transcription now run on Cloudflare RealtimeKit through EDGE's authenticated RealtimeKit proxy (`CallsServiceClient` in `@dxos/client/calls`): a room shares one meeting agreed over the swarm, and transcription outside a call streams through a one-person meeting instead of Whisper. Both join through one RealtimeKit session seam, `connectRealtimeKit` in `@dxos/av`. Breaking: the `/transcribe` endpoint, `EdgeServiceName.Transcription`, the Whisper `Transcriber` class and `MediaStreamRecorder` are removed (`Transcriber` is now an interface built by `createRealtimeKitTranscriber`); `MediaTransport`, `CallManager`'s constructor and the swarm `Tracks` message are reshaped, the `CallsCapabilities.EventHandler` capability is gone in favour of `CallManager` events, and clients need dxos/edge#1387 deployed before calls or transcription connect.

### Patch Changes

- Updated dependencies [034e231]
- Updated dependencies [e50d1e5]
  - @dxos/context@0.17.0
  - @dxos/async@0.17.0

## 0.16.0

### Patch Changes

- @dxos/async@0.16.0
  - @dxos/context@0.16.0

## 0.15.0

### Patch Changes

- Updated dependencies [1e9c017]
  - @dxos/async@0.15.0
  - @dxos/context@0.15.0

## 0.14.0

### Patch Changes

- @dxos/async@0.14.0
  - @dxos/context@0.14.0

## 0.13.0

### Patch Changes

- @dxos/async@0.13.0
  - @dxos/context@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies [ce194c0]
- Updated dependencies [9d2466a]
- Updated dependencies [56276cd]
  - @dxos/async@0.12.0
  - @dxos/context@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/context@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [aea1e6e]
  - @dxos/async@0.11.0
  - @dxos/context@0.11.0
