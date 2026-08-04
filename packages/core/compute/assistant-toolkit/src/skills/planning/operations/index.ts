//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { PlanReminder, UpdateTasks } from './definitions';

export * as PlanningOperations from './definitions';

export const PlanningHandlers = OperationHandlerSet.keyed([
  [UpdateTasks, () => import('./update-tasks')],
  [PlanReminder, () => import('./plan-reminder')],
]);
