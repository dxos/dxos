//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { OutlineOperation, TaskOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  OutlineOperation.ConvertToTask.pipe(Operation.lazyHandler(() => import('./convert-to-task.ts'))),
  TaskOperation.CreateMilestone.pipe(Operation.lazyHandler(() => import('./create-milestone.ts'))),
  TaskOperation.CreateTask.pipe(Operation.lazyHandler(() => import('./create-task.ts'))),
  TaskOperation.DeleteMilestone.pipe(Operation.lazyHandler(() => import('./delete-milestone.ts'))),
  TaskOperation.DeleteTask.pipe(Operation.lazyHandler(() => import('./delete-task.ts'))),
  OutlineOperation.GetOutline.pipe(Operation.lazyHandler(() => import('./get-outline.ts'))),
  TaskOperation.ListMilestones.pipe(Operation.lazyHandler(() => import('./list-milestones.ts'))),
  TaskOperation.ListTasks.pipe(Operation.lazyHandler(() => import('./list-tasks.ts'))),
  TaskOperation.MoveMilestone.pipe(Operation.lazyHandler(() => import('./move-milestone.ts'))),
  TaskOperation.MoveTask.pipe(Operation.lazyHandler(() => import('./move-task.ts'))),
  OutlineOperation.QuickJournalEntry.pipe(Operation.lazyHandler(() => import('./quick-entry.ts'))),
  TaskOperation.RestoreTasks.pipe(Operation.lazyHandler(() => import('./restore-tasks.ts'))),
  OutlineOperation.UpdateOutline.pipe(Operation.lazyHandler(() => import('./update-outline.ts'))),
  TaskOperation.UpdateTask.pipe(Operation.lazyHandler(() => import('./update-task.ts'))),
]);
