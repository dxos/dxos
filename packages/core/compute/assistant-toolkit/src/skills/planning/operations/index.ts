//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { AskQuestion, PlanReminder, UpdateTasks } from './definitions.ts';

export * as PlanningOperations from './definitions.ts';

export const PlanningHandlers = OperationHandlerSet.lazy([
  UpdateTasks.pipe(Operation.lazyHandler(() => import('./update-tasks.ts'))),
  AskQuestion.pipe(Operation.lazyHandler(() => import('./ask-question.ts'))),
  PlanReminder.pipe(Operation.lazyHandler(() => import('./plan-reminder.ts'))),
]);
