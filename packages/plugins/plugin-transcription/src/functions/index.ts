//
// Copyright 2024 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';

export const TranscriptionHandlers = OperationHandlerSet.lazy(
  () => import('./open'),
  () => import('./summarize'),
);
