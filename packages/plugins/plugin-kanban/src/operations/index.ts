// Copyright 2025 DXOS.org

import { OperationHandlerSet } from '@dxos/operation';

export * as KanbanOperation from './definitions';

export const KanbanOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./delete-card'),
  () => import('./delete-card-field'),
  () => import('./restore-card'),
  () => import('./restore-card-field'),
);
