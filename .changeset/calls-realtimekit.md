---
'@dxos/plugin-calls': minor
'@dxos/client': minor
'@dxos/av': minor
---

Calls and live transcription now run on Cloudflare RealtimeKit through EDGE's authenticated RealtimeKit proxy (`CallsServiceClient` in `@dxos/client/calls`): a room shares one meeting agreed over the swarm, and transcription outside a call streams through a one-person meeting instead of Whisper. Both join through one RealtimeKit session seam, `connectRealtimeKit` in `@dxos/av`. Breaking: the `/transcribe` endpoint, `EdgeServiceName.Transcription`, the Whisper `Transcriber` class and `MediaStreamRecorder` are removed (`Transcriber` is now an interface built by `createRealtimeKitTranscriber`); `MediaTransport`, `CallManager`'s constructor and the swarm `Tracks` message are reshaped, the `CallsCapabilities.EventHandler` capability is gone in favour of `CallManager` events, and clients need dxos/edge#1387 deployed before calls or transcription connect.
