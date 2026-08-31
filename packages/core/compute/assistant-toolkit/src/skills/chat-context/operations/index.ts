//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ContextAdd, ContextRemove } from './definitions';

export * as ChatContextOperations from './definitions';

export const ChatContextHandlers = OperationHandlerSet.lazy([
  ContextAdd.pipe(Operation.lazyHandler(() => import('./context-add'))),
  ContextRemove.pipe(Operation.lazyHandler(() => import('./context-remove'))),
]);
