// Copyright 2025 DXOS.org

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { KanbanOperation } from '../types';

export const KanbanOperationHandlerSet = OperationHandlerSet.keyed([
  [KanbanOperation.DeleteCard, () => import('./delete-card')],
  [KanbanOperation.DeleteCardField, () => import('./delete-card-field')],
  [KanbanOperation.RestoreCard, () => import('./restore-card')],
  [KanbanOperation.RestoreCardField, () => import('./restore-card-field')],
]);
