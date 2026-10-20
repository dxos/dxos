---
'@dxos/plugin-calls': minor
'@dxos/react-ui-transcription': patch
---

Calls can be filled with simulated participants played from video files, including a timed screenshare, transcript lines and an agent visualization (from the new `@dxos/agent-visualization`, picked by id with config overrides) driven by an audio-only participant's voice, through the `setSimulatedParticipants` operation; call tiles now autoplay where the browser blocks unmuted video, and the transcript view no longer repeats its last line as a feed grows.
