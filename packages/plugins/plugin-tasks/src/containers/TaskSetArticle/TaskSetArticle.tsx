//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { TaskList, type TaskPatch, type TaskPlacement } from '@dxos/react-ui-task';
import { Task, TaskSet } from '@dxos/types';

import { meta } from '#meta';
import { TaskOperation } from '#types';

export type TaskSetArticleProps = AppSurface.ObjectArticleProps<TaskSet.TaskSet>;

/**
 * Every task in a set, rendered as the sub-task tree the flat `tasks` array plus `parentTask`
 * describe, and restructurable by dragging a row or with `Alt`+arrow. Milestone grouping is
 * deliberately not rendered yet (see TASKS.md). CRUD flows through the
 * {@link TaskOperation} verbs so the article and external agents share one write path: the verbs
 * are what keep the array, the refs and `parentTask` consistent.
 */
export const TaskSetArticle = ({ role, attendableId, subject: taskSet }: TaskSetArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { hasAttention } = useAttention(attendableId);
  const spaceId = Obj.getDatabase(taskSet)?.spaceId;
  const { invokePromise } = useOperationInvoker();

  const statusLabel = useCallback((status: Task.Status) => t(`task-status.${status}.label`), [t]);

  const tasks = useSetTasks(taskSet);

  const handleCreate = useCallback(
    (title: string) => void invokePromise(TaskOperation.CreateTask, { taskSet: Ref.make(taskSet), title }, { spaceId }),
    [invokePromise, spaceId, taskSet],
  );

  const handleUpdate = useCallback(
    (task: Task.Task, patch: TaskPatch) =>
      void invokePromise(TaskOperation.UpdateTask, { task: Ref.make(task), ...patch }, { spaceId }),
    [invokePromise, spaceId],
  );

  const handleDelete = useCallback(
    (task: Task.Task) => void invokePromise(TaskOperation.DeleteTask, { task: Ref.make(task) }, { spaceId }),
    [invokePromise, spaceId],
  );

  const handleMove = useCallback(
    (task: Task.Task, { parentTask, before }: TaskPlacement) =>
      void invokePromise(
        TaskOperation.MoveTask,
        {
          task: Ref.make(task),
          parentTask: parentTask ? Ref.make(parentTask) : null,
          ...(before ? { before: Ref.make(before) } : {}),
        },
        { spaceId },
      ),
    [invokePromise, spaceId],
  );

  const content = (
    <TaskList.Root
      hierarchical
      selectable
      tasks={tasks}
      showDescriptions
      statusLabel={statusLabel}
      onTaskCreate={handleCreate}
      onTaskUpdate={handleUpdate}
      onTaskDelete={handleDelete}
      onTaskMove={handleMove}
    >
      <TaskList.Viewport classNames='dx-container grid grid-rows-[auto_1fr] gap-2'>
        <TaskList.Content classNames='dx-document' />
      </TaskList.Viewport>
      <div className='p-2'>
        <TaskList.Edit
          classNames='dx-document border border-separator rounded-md p-2'
          placeholder={t('task-create.placeholder')}
        />
      </div>
    </TaskList.Root>
  );

  // Embedded as a section (e.g., the ProjectArticle Tasks section): the host owns scroll and
  // chrome, so render the bare list — a nested Panel/scroll root would collapse width.
  if (role === AppSurface.Section.role) {
    return content;
  }

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root disabled={!hasAttention} />
      </Panel.Toolbar>
      <Panel.Content>{content}</Panel.Content>
    </Panel.Root>
  );
};

TaskSetArticle.displayName = 'TaskSetArticle';

/**
 * The set's tasks via `childOf` — membership is the ECHO parent edge, and transitive tolerates
 * legacy sub-tasks still parented to their parent task. The query re-emits on membership changes
 * only, never on a member's edit — `TaskList` rows subscribe themselves.
 */
const useSetTasks = (taskSet: TaskSet.TaskSet): Task.Task[] => {
  const db = Obj.getDatabase(taskSet);
  const tasks = useQuery(db, Filter.and(Filter.type(Task.Task), Filter.childOf(taskSet)));
  const orderedAtom = useMemo(
    () =>
      Atom.make((get) => {
        subscribeHierarchy(get, tasks);
        return Task.orderTasks(tasks, get(Obj.atomProperty(taskSet, 'tasks')) ?? []);
      }),
    [taskSet, tasks],
  );
  return useAtomValue(orderedAtom);
};

/** Subscribes to every member's `parentTask`, which the set's array does not carry. */
const subscribeHierarchy = (get: Atom.AtomContext, tasks: readonly Task.Task[]): void => {
  tasks.forEach((task) => get(Obj.atomProperty(task, 'parentTask')));
};
