//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { OutlineOperation, TaskOperation } from '#types';

export const TasksOperationHandlerSet = OperationHandlerSet.lazy([
  TaskOperation.AssignTask.pipe(Operation.lazyHandler(() => import('./assign-task'))),
  TaskOperation.CompleteTask.pipe(Operation.lazyHandler(() => import('./complete-task'))),
  OutlineOperation.ConvertToTask.pipe(Operation.lazyHandler(() => import('./convert-to-task'))),
  OutlineOperation.CreateOutline.pipe(Operation.lazyHandler(() => import('./create-outline'))),
  OutlineOperation.GetOutline.pipe(Operation.lazyHandler(() => import('./get-outline'))),
  TaskOperation.CreateTask.pipe(Operation.lazyHandler(() => import('./create-task'))),
  TaskOperation.ListTasks.pipe(Operation.lazyHandler(() => import('./list-tasks'))),
  OutlineOperation.QuickJournalEntry.pipe(Operation.lazyHandler(() => import('./quick-entry'))),
  OutlineOperation.UpdateOutline.pipe(Operation.lazyHandler(() => import('./update-outline'))),
  TaskOperation.UpdateTask.pipe(Operation.lazyHandler(() => import('./update-task'))),
]);
