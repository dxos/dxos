//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export * as MemoryOperations from './definitions';

export const MemoryHandlers = OperationHandlerSet.lazy(
  () => import('./save'),
  () => import('./query'),
  () => import('./delete'),
);
