//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as VideoOperation from '../types/VideoOperation';

// TODO(burdon): Import from EDGE.
export * as TranscriptionService from './TranscriptionService';

export const VideoOperationHandlerSet = OperationHandlerSet.keyed([
  [VideoOperation.Transcribe, () => import('./transcribe')],
  [VideoOperation.Summarize, () => import('./summarize')],
  [VideoOperation.FetchDescription, () => import('./fetch-description')],
  [VideoOperation.FetchTranscript, () => import('./fetch-transcript')],
]);
