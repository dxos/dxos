//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { TaskList, type TaskPatch, type TaskStatus } from '@dxos/react-ui-task';
import { Task, type TaskSet } from '@dxos/types';

import { meta } from '#meta';
import { TaskOperation } from '#types';

export type TaskSetArticleProps = AppSurface.ObjectArticleProps<TaskSet.TaskSet>;

/**
 * Status-grouped list of a task set's root tasks (children by the ECHO parent edge). CRUD flows
 * through the {@link TaskOperation} verbs so the article and external agents share one write path.
 */
export const TaskSetArticle = ({ role, attendableId, subject: taskSet }: TaskSetArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { hasAttention } = useAttention(attendableId);
  const space = getSpace(taskSet);
  const spaceId = space?.id;
  const { invokePromise } = useOperationInvoker();

  const children = useQuery(space?.db, Query.select(Filter.id(taskSet.id)).children());
  const tasks = useMemo(
    () => children.filter((child): child is Task.Task => Obj.instanceOf(Task.Task, child)),
    [children],
  );

  const statusLabel = useCallback((status: TaskStatus) => t(`task-status.${status}.label`), [t]);
  const handleCreate = useCallback(
    (title: string) => void invokePromise(TaskOperation.CreateTask, { taskSet: Ref.make(taskSet), title }, { spaceId }),
    [invokePromise, taskSet, spaceId],
  );
  const handleUpdate = useCallback(
    (task: Task.Task, patch: TaskPatch) =>
      void invokePromise(TaskOperation.UpdateTask, { task: Ref.make(task), ...patch }, { spaceId }),
    [invokePromise, spaceId],
  );
  const handleDelete = useCallback(
    (task: Task.Task) => {
      space?.db.remove(task);
    },
    [space],
  );

  const content = (
    <TaskList.Root
      tasks={tasks}
      statusLabel={statusLabel}
      onTaskCreate={handleCreate}
      onTaskUpdate={handleUpdate}
      onTaskDelete={handleDelete}
    >
      <TaskList.Viewport>
        <TaskList.Content />
      </TaskList.Viewport>
      <TaskList.Create placeholder={t('task-create.placeholder')} />
    </TaskList.Root>
  );

  // Embedded as a section (e.g. the ProjectArticle Tasks section): the host owns scroll and
  // chrome, so render the bare list — a nested Panel/scroll root would collapse width.
  if (role === AppSurface.Section.role) {
    return content;
  }

  return (
    <Panel.Root role={role} classNames='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root disabled={!hasAttention} />
      </Panel.Toolbar>
      <Panel.Content>{content}</Panel.Content>
    </Panel.Root>
  );
};

TaskSetArticle.displayName = 'TaskSetArticle';
