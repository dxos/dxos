//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Obj, Ref } from '@dxos/echo';
import { TaskList } from '@dxos/react-ui-task';
import { type Task } from '@dxos/types';

import { TaskOperation } from '#types';

import { useTaskActions } from '../../hooks/index.ts';

export type TaskRowProps = {
  subject: Task.Task;
};

/**
 * One task as a list row - status, title, assignee and the contributed actions menu - for a task shown
 * beside the object it relates to (e.g. under the email it was extracted from).
 */
export const TaskRow = ({ subject: task }: TaskRowProps) => {
  const spaceId = Obj.getDatabase(task)?.spaceId;
  const getTaskActions = useTaskActions();
  const handleUpdate = Hooks.useOperation(
    TaskOperation.UpdateTask,
    (task: Task.Task, props: Task.Edit) => ({ task: Ref.make(task), ...props }),
    { spaceId },
  );
  const tasks = useMemo(() => [task], [task]);

  // Ungrouped: one row needs no status heading, and its own status control already says it.
  return (
    <TaskList.Root
      tasks={tasks}
      flush
      groupByStatus={false}
      showAssignees
      getTaskActions={getTaskActions}
      onTaskUpdate={handleUpdate}
    >
      <TaskList.Content />
    </TaskList.Root>
  );
};
