//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const TranscriptionOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./open'),
  () => import('./summarize'),
);
