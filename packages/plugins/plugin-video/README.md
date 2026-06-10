# @dxos/plugin-video

Video plugin for DXOS Composer.

Stores `Video` objects (a name, a URL, and optional links to a transcript and summary) and renders
them in an embedded player. A `Transcribe` operation calls a remote EDGE transcription service for a
video's URL and links the returned text back to the video. A `Summarize` operation uses the AI stack
to produce a markdown summary from the transcript.

See [`PLUGIN.mdl`](./PLUGIN.mdl) for the full specification.
