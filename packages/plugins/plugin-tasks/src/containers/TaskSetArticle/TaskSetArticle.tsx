//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { TaskList, type TaskPatch } from '@dxos/react-ui-task';
import { type Task, TaskSet } from '@dxos/types';

import { meta } from '#meta';
import { TaskOperation } from '#types';

export type TaskSetArticleProps = AppSurface.ObjectArticleProps<TaskSet.TaskSet>;

/**
 * Status-grouped list of every task in a set, in the `tasks` array's canonical order. Milestone
 * grouping and the sub-task tree are deliberately not rendered yet (see TASKS.md) — the flat array
 * holds both, so this is a complete list rather than a partial view. CRUD flows through the
 * {@link TaskOperation} verbs so the article and external agents share one write path: the verbs
 * are what keep the array, the refs and the lifecycle parent edges consistent.
 */
export const TaskSetArticle = ({ role, attendableId, subject: taskSet }: TaskSetArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { hasAttention } = useAttention(attendableId);
  const spaceId = Obj.getDatabase(taskSet)?.spaceId;
  const { invokePromise } = useOperationInvoker();

  const tasks = useSetTasks(taskSet);

  const statusLabel = useCallback((status: Task.Status) => t(`task-status.${status}.label`), [t]);

  const handleCreate = useCallback(
    (title: string) => void invokePromise(TaskOperation.CreateTask, { taskSet: Ref.make(taskSet), title }, { spaceId }),
    [invokePromise, taskSet, spaceId],
  );

  const handleUpdate = useCallback(
    (task: Task.Task, patch: TaskPatch) =>
      void invokePromise(TaskOperation.UpdateTask, { task: Ref.make(task), ...patch }, { spaceId }),
    [invokePromise, spaceId],
  );

  // Deleting through the verb (not `db.remove`) is what sweeps the task and its sub-tasks out of
  // the set's `tasks` array; the cascade alone would leave the refs behind.
  const handleDelete = useCallback(
    (task: Task.Task) => void invokePromise(TaskOperation.DeleteTask, { task: Ref.make(task) }, { spaceId }),
    [invokePromise, spaceId],
  );

  const content = (
    <TaskList.Root
      tasks={tasks}
      showDescriptions
      statusLabel={statusLabel}
      onTaskCreate={handleCreate}
      onTaskUpdate={handleUpdate}
      onTaskDelete={handleDelete}
    >
      <TaskList.Viewport classNames='dx-document'>
        <TaskList.Content />
      </TaskList.Viewport>
      <TaskList.Create classNames='dx-document' placeholder={t('task-create.placeholder')} />
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

/**
 * The set's tasks, subscribed to membership and order only. Refs resolve through `ref.atom`, which
 * tracks loading without tracking mutations, so a title or status edit re-renders just the row that
 * owns it — `TaskList` rows subscribe themselves.
 */
const useSetTasks = (taskSet: TaskSet.TaskSet): Task.Task[] => {
  const [taskSetSnapshot] = useObject(taskSet);
  const taskRefs = taskSetSnapshot?.tasks;
  const atom = useMemo(
    () => Atom.make((get) => TaskSet.dedupeById((taskRefs ?? []).map((ref) => get(ref.atom)))),
    [taskRefs],
  );
  return useAtomValue(atom);
};
