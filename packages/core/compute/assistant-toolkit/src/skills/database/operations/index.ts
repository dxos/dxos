//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import {
  ContextAdd,
  ContextRemove,
  Load,
  ObjectCreate,
  ObjectDelete,
  ObjectUpdate,
  Query,
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
  Load.pipe(Operation.lazyHandler(() => import('./load'))),
  ObjectCreate.pipe(Operation.lazyHandler(() => import('./object-create'))),
  ObjectDelete.pipe(Operation.lazyHandler(() => import('./object-delete'))),
  ObjectUpdate.pipe(Operation.lazyHandler(() => import('./object-update'))),
  Query.pipe(Operation.lazyHandler(() => import('./query'))),
  RelationCreate.pipe(Operation.lazyHandler(() => import('./relation-create'))),
  RelationDelete.pipe(Operation.lazyHandler(() => import('./relation-delete'))),
  SchemaAdd.pipe(Operation.lazyHandler(() => import('./schema-add'))),
  SchemaList.pipe(Operation.lazyHandler(() => import('./schema-list'))),
  TagAdd.pipe(Operation.lazyHandler(() => import('./tag-add'))),
  TagRemove.pipe(Operation.lazyHandler(() => import('./tag-remove'))),
]);
