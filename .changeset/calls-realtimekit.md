---
'@dxos/plugin-calls': minor
'@dxos/edge-client': minor
---

Calls now run on Cloudflare RealtimeKit: joining a room asks EDGE for a meeting token (`EdgeHttpClient.joinCallRoom`), every participant in a room shares one meeting, and meeting transcripts come from RealtimeKit's native transcription, each participant writing its own segments. Breaking: `MediaState.peer` is now a `MediaTransport`, and pulled remote tracks are plain `MediaStreamTrack`/`MediaStream` values.
