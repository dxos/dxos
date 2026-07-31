//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export * as DatabaseOperations from './definitions';

export const DatabaseHandlers = OperationHandlerSet.lazy(
  () => import('./context-add'),
  () => import('./context-remove'),
  () => import('./load'),
  () => import('./object-create'),
  () => import('./object-delete'),
  () => import('./object-update'),
  () => import('./query'),
  () => import('./relation-create'),
  () => import('./relation-delete'),
  () => import('./schema-add'),
  () => import('./schema-list'),
  () => import('./tag-add'),
  () => import('./tag-remove'),
);
