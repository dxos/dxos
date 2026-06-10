//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

// TODO(burdon): Import from EDGE.
export * as TranscriptionService from './TranscriptionService';

export const VideoOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./transcribe'),
  () => import('./summarize'),
  () => import('./fetch-description'),
  () => import('./fetch-transcript'),
);
