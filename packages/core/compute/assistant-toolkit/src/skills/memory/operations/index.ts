//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DeleteMemory, QueryMemories, SaveMemory } from './definitions.ts';

export * as MemoryOperations from './definitions.ts';

export const MemoryHandlers = OperationHandlerSet.lazy([
  SaveMemory.pipe(Operation.lazyHandler(() => import('./save.ts'))),
  QueryMemories.pipe(Operation.lazyHandler(() => import('./query.ts'))),
  DeleteMemory.pipe(Operation.lazyHandler(() => import('./delete.ts'))),
]);
