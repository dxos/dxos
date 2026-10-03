// Copyright 2025 DXOS.org

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { KanbanOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  KanbanOperation.DeleteCard.pipe(Operation.lazyHandler(() => import('./delete-card.ts'))),
  KanbanOperation.DeleteCardField.pipe(Operation.lazyHandler(() => import('./delete-card-field.ts'))),
  KanbanOperation.RestoreCard.pipe(Operation.lazyHandler(() => import('./restore-card.ts'))),
  KanbanOperation.RestoreCardField.pipe(Operation.lazyHandler(() => import('./restore-card-field.ts'))),
]);
