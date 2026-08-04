//
// Copyright 2025 DXOS.org
//

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

export const DatabaseHandlers = OperationHandlerSet.keyed([
  [ContextAdd, () => import('./context-add')],
  [ContextRemove, () => import('./context-remove')],
  [Load, () => import('./load')],
  [ObjectCreate, () => import('./object-create')],
  [ObjectDelete, () => import('./object-delete')],
  [ObjectUpdate, () => import('./object-update')],
  [Query, () => import('./query')],
  [RelationCreate, () => import('./relation-create')],
  [RelationDelete, () => import('./relation-delete')],
  [SchemaAdd, () => import('./schema-add')],
  [SchemaList, () => import('./schema-list')],
  [TagAdd, () => import('./tag-add')],
  [TagRemove, () => import('./tag-remove')],
]);
