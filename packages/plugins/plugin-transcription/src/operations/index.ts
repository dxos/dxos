//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as TranscriptOperation from '../types/TranscriptOperation';

export const TranscriptionOperationHandlerSet = OperationHandlerSet.keyed([
  [TranscriptOperation.Create, () => import('./create')],
  [TranscriptOperation.Open, () => import('./open')],
  [TranscriptOperation.Summarize, () => import('./summarize')],
  [TranscriptOperation.EnrichMessage, () => import('./enrich-message')],
]);
