//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import {
  ContextAdd,
  ContextRemove,
  RelationCreate,
  RelationDelete,
  SchemaAdd,
  SchemaList,
  TagAdd,
  TagRemove,
} from './definitions';

export * as DatabaseOperations from './definitions';

export const DatabaseHandlers = OperationHandlerSet.lazy([
  ContextAdd.pipe(Operation.lazyHandler(() => import('./context-add'))),
  ContextRemove.pipe(Operation.lazyHandler(() => import('./context-remove'))),
  RelationCreate.pipe(Operation.lazyHandler(() => import('./relation-create'))),
  RelationDelete.pipe(Operation.lazyHandler(() => import('./relation-delete'))),
  SchemaAdd.pipe(Operation.lazyHandler(() => import('./schema-add'))),
  SchemaList.pipe(Operation.lazyHandler(() => import('./schema-list'))),
  TagAdd.pipe(Operation.lazyHandler(() => import('./tag-add'))),
  TagRemove.pipe(Operation.lazyHandler(() => import('./tag-remove'))),
]);
