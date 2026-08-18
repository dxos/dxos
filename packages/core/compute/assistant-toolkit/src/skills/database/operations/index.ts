//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ContextAdd, ContextRemove, RelationCreate, SchemaAdd } from './definitions';

export * as DatabaseOperations from './definitions';

export const DatabaseHandlers = OperationHandlerSet.lazy([
  ContextAdd.pipe(Operation.lazyHandler(() => import('./context-add'))),
  ContextRemove.pipe(Operation.lazyHandler(() => import('./context-remove'))),
  RelationCreate.pipe(Operation.lazyHandler(() => import('./relation-create'))),
  SchemaAdd.pipe(Operation.lazyHandler(() => import('./schema-add'))),
]);
