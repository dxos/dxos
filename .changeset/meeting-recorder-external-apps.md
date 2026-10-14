---
'@dxos/plugin-meeting': minor
---

`MeetingOperation.Create` accepts a `db` to create an unanchored meeting, `MeetingOperation.Summarize` works when invoked outside a space context, and `TranscriptionManager` gains `flush()` to transcribe buffered audio before closing.
