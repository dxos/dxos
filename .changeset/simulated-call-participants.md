---
'@dxos/plugin-calls': minor
'@dxos/react-ui-experimental': minor
'@dxos/react-ui-transcription': patch
---

Calls can be filled with simulated participants played from video files, including a timed screenshare, transcript lines and an agent avatar driven by an audio-only participant's voice, through the `setSimulatedParticipants` operation; call tiles now autoplay where the browser blocks unmuted video, and the transcript view no longer repeats its last line as a feed grows.

`@dxos/react-ui-experimental` adds the `Avatar` namespace: voice-driven visualizations (orb, chaos, kube, spectrum and ink variants) picked by id with config overrides, with audio and scripted signal providers. `Chaos` and the newly exported `Kube` are rewritten on plain three.js and shared with the avatars: `shaderPresets` becomes `chaosPresets`, `ChaosOptions.color` is a hex string, and `Chaos` drops its `debug` prop.
