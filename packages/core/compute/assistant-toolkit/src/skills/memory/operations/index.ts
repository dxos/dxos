//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DeleteMemory, QueryMemories, SaveMemory } from './definitions';

export * as MemoryOperations from './definitions';

export const MemoryHandlers = OperationHandlerSet.lazy([
  SaveMemory.pipe(Operation.lazyHandler(() => import('./save'))),
  QueryMemories.pipe(Operation.lazyHandler(() => import('./query'))),
  DeleteMemory.pipe(Operation.lazyHandler(() => import('./delete'))),
]);
