//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { TaskList } from '@dxos/react-ui-task';
import { type Task } from '@dxos/types';

import { useDelegateActions, useTaskActions, useTaskMembers, useTaskUpdate } from '../../hooks/index.ts';

export type TaskRowProps = {
  subject: Task.Task;
};

/**
 * One task as a list row — status, title, assignee and the contributed actions menu — for a task shown
 * beside the object it relates to (e.g. under the email it was extracted from).
 */
export const TaskRow = ({ subject: task }: TaskRowProps) => {
  const spaceId = Obj.getDatabase(task)?.spaceId;
  const getTaskActions = useTaskActions();
  const getDelegateActions = useDelegateActions();
  const handleUpdate = useTaskUpdate(spaceId);
  const members = useTaskMembers(spaceId);
  const tasks = useMemo(() => [task], [task]);

  // Ungrouped: one row needs no status heading, and its own status control already says it.
  return (
    <TaskList.Root
      tasks={tasks}
      flush
      groupByStatus={false}
      members={members}
      getTaskActions={getTaskActions}
      getDelegateActions={getDelegateActions}
      onTaskUpdate={handleUpdate}
    >
      <TaskList.Content />
    </TaskList.Root>
  );
};
