//
// Copyright 2025 DXOS.org
//

export { TranscriptionPlugin } from '#plugin';

export { TranscriptionCapabilities } from './types';

// TODO(wittjosiah): Hooks should not be exported from the plugin package at all.
//   Either refactor callers to not need them or factor them out to a shared package.
export * from './meta';
export * from './hooks';
export * from './transcriber';
