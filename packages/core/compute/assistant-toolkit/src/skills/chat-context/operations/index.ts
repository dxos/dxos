//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ContextAdd, ContextRemove } from './definitions.ts';

export * as ChatContextOperations from './definitions.ts';

export const ChatContextHandlers = OperationHandlerSet.lazy([
  ContextAdd.pipe(Operation.lazyHandler(() => import('./context-add.ts'))),
  ContextRemove.pipe(Operation.lazyHandler(() => import('./context-remove.ts'))),
]);
