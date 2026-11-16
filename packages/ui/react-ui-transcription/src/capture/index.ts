//
// Copyright 2026 DXOS.org
//

// A UI-free entrypoint (`@dxos/react-ui-transcription/capture`): the transcriber construction with no
// React attached, so capability modules can build a pipeline without pulling the components in.

export * from './audio-inputs.ts';
export * from './create-transcriber.ts';
export * from './microphone-bridge.ts';
export * from './realtime-kit-transcriber.ts';
