//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DeleteMemory, QueryMemories, SaveMemory } from './definitions';

export * as MemoryOperations from './definitions';

export const MemoryHandlers = OperationHandlerSet.keyed([
  [SaveMemory, () => import('./save')],
  [QueryMemories, () => import('./query')],
  [DeleteMemory, () => import('./delete')],
]);
