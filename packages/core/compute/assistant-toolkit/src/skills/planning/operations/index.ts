//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { AssignTasks, PlanReminder, UpdateTasks } from './definitions';

export * as PlanningOperations from './definitions';

export const PlanningHandlers = OperationHandlerSet.lazy([
  UpdateTasks.pipe(Operation.lazyHandler(() => import('./update-tasks'))),
  AssignTasks.pipe(Operation.lazyHandler(() => import('./assign-tasks'))),
  PlanReminder.pipe(Operation.lazyHandler(() => import('./plan-reminder'))),
]);
