//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { AssignTasks, PlanReminder, UpdateTasks } from './definitions.ts';

export * as PlanningOperations from './definitions.ts';

export const PlanningHandlers = OperationHandlerSet.lazy([
  UpdateTasks.pipe(Operation.lazyHandler(() => import('./update-tasks.ts'))),
  AssignTasks.pipe(Operation.lazyHandler(() => import('./assign-tasks.ts'))),
  PlanReminder.pipe(Operation.lazyHandler(() => import('./plan-reminder.ts'))),
]);
