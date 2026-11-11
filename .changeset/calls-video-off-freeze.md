---
'@dxos/plugin-calls': patch
'@dxos/react-ui-transcription': patch
---

Call toolbars and tile controls reveal on hover or focus and stay visible on touch screens, and a turned-off camera no longer freezes its last frame on call tiles. `@dxos/plugin-client/testing` adds `bindTestAccount` and `useTestAccount` to bind a story's identity to a test Hub account. `useAudioFile` reports a file that fails to load, resumes its audio context once playback starts, and ignores a load that a newer one replaced.
