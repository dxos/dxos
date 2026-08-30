//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { OutlineOperation, TaskOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  OutlineOperation.ConvertToTask.pipe(Operation.lazyHandler(() => import('./convert-to-task'))),
  TaskOperation.CreateMilestone.pipe(Operation.lazyHandler(() => import('./create-milestone'))),
  TaskOperation.CreateTask.pipe(Operation.lazyHandler(() => import('./create-task'))),
  TaskOperation.DeleteMilestone.pipe(Operation.lazyHandler(() => import('./delete-milestone'))),
  TaskOperation.DeleteTask.pipe(Operation.lazyHandler(() => import('./delete-task'))),
  OutlineOperation.GetOutline.pipe(Operation.lazyHandler(() => import('./get-outline'))),
  TaskOperation.ListMilestones.pipe(Operation.lazyHandler(() => import('./list-milestones'))),
  TaskOperation.ListTasks.pipe(Operation.lazyHandler(() => import('./list-tasks'))),
  TaskOperation.MoveMilestone.pipe(Operation.lazyHandler(() => import('./move-milestone'))),
  TaskOperation.MoveTask.pipe(Operation.lazyHandler(() => import('./move-task'))),
  OutlineOperation.QuickJournalEntry.pipe(Operation.lazyHandler(() => import('./quick-entry'))),
  TaskOperation.RestoreTasks.pipe(Operation.lazyHandler(() => import('./restore-tasks'))),
  OutlineOperation.UpdateOutline.pipe(Operation.lazyHandler(() => import('./update-outline'))),
  TaskOperation.UpdateTask.pipe(Operation.lazyHandler(() => import('./update-task'))),
]);
