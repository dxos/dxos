//
// Copyright 2026 DXOS.org
//

// A UI-free entrypoint (`@dxos/react-ui-transcription/capture`): the recorder and transcriber
// construction with no React attached, so capability modules that run under node or workerd can
// build a pipeline without pulling the components in.

export * from './audio-inputs';
export * from './create-transcriber';
export * from './media-stream-recorder';
export * from './microphone-bridge';
