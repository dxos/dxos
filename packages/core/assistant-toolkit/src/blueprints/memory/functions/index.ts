//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';

export const MemoryHandlers = OperationHandlerSet.lazy(
  () => import('./save'),
  () => import('./query'),
  () => import('./delete'),
);
