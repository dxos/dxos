//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as MemoryOperations from './definitions';

export const MemoryHandlers = OperationHandlerSet.lazy(
  () => import('./save'),
  () => import('./query'),
  () => import('./delete'),
);
