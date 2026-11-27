//
// Copyright 2026 DXOS.org
//

import React, { forwardRef } from 'react';

import { useObject } from '@dxos/echo-react';
import { StatusList, type StatusListRootProps, type StatusListStatus } from '@dxos/react-ui-list';
import * as Hooks from '@dxos/react-ui/Hooks';
import { type Task } from '@dxos/types';

import { translationKey } from '#translations';

/**
 * The row state each task status draws as. A status that ended a task short of `done` reads as failed, and one still
 * waiting on something (an answer, its turn) as not started; the row's label carries the status itself.
 */
const ROW_STATUS: Record<Task.Status, StatusListStatus> = {
  todo: 'not-started',
  backlog: 'not-started',
  blocked: 'not-started',
  started: 'working',
  review: 'working',
  done: 'success',
  failed: 'failed',
  cancelled: 'failed',
  duplicate: 'failed',
};

/** A task with no status set has not been started. */
const DEFAULT_STATUS: Task.Status = 'todo';

type TaskProgressItemProps = {
  task: Task.Task;
};

const TaskProgressItem = ({ task }: TaskProgressItemProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const [title] = useObject(task, 'title');
  const [status = DEFAULT_STATUS] = useObject(task, 'status');
  return (
    <StatusList.Item
      status={ROW_STATUS[status]}
      statusLabel={t(`status-${status}.label`)}
      data-task-status={status}
      data-testid='taskProgress.item'
    >
      {title}
    </StatusList.Item>
  );
};

TaskProgressItem.displayName = 'TaskProgress.Item';

type TaskProgressProps = Omit<StatusListRootProps, 'children'> & {
  /** The tasks in the order they run; each row follows its task's title and status as they change. */
  tasks: readonly Task.Task[];
};

/**
 * One card showing how far a run of tasks has got: a row per task with its status icon, the task being worked on the
 * brightest. `monochrome` draws the icons in the text colours.
 */
const TaskProgress = forwardRef<HTMLDivElement, TaskProgressProps>(({ tasks, ...props }, forwardedRef) => {
  const { t } = Hooks.useTranslation(translationKey);
  return (
    <StatusList.Root aria-label={t('task-list.label')} {...props} ref={forwardedRef}>
      {tasks.map((task) => (
        <TaskProgressItem key={task.id} task={task} />
      ))}
    </StatusList.Root>
  );
});

TaskProgress.displayName = 'TaskProgress';

export { TaskProgress };

export type { TaskProgressProps };
