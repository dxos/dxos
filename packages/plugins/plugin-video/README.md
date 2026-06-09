# @dxos/plugin-video

Video plugin for DXOS Composer.

Stores `Video` objects (a name, a URL, and an optional link to a transcript) and renders them in an
embedded player. A `Transcribe` operation calls a remote EDGE transcription service for a video's URL
and links the returned text back to the video.

See [`PLUGIN.mdl`](./PLUGIN.mdl) for the full specification.
