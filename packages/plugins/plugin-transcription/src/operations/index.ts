//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as TranscriptOperation from './definitions';

export const TranscriptionOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./open'),
  () => import('./summarize'),
);
