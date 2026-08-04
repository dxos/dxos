//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as OutlineOperation from '../types/OutlineOperation';
import * as TaskOperation from '../types/TaskOperation';

export const TasksOperationHandlerSet = OperationHandlerSet.keyed([
  [TaskOperation.AssignTask, () => import('./assign-task')],
  [TaskOperation.CompleteTask, () => import('./complete-task')],
  [OutlineOperation.ConvertToTask, () => import('./convert-to-task')],
  [OutlineOperation.CreateOutline, () => import('./create-outline')],
  [OutlineOperation.GetOutline, () => import('./get-outline')],
  [TaskOperation.CreateTask, () => import('./create-task')],
  [TaskOperation.ListTasks, () => import('./list-tasks')],
  [OutlineOperation.QuickJournalEntry, () => import('./quick-entry')],
  [OutlineOperation.UpdateOutline, () => import('./update-outline')],
  [TaskOperation.UpdateTask, () => import('./update-task')],
]);
