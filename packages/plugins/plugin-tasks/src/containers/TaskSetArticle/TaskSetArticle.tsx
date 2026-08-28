//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
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

  // One verb per gesture: `MoveTask` re-parents and repositions together, so a drop cannot leave the
  // task hanging at the end of its new parent while a second call lands.
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

  const [selected, setSelected] = useState<string>();
  const handleSelect = useCallback((task: Task.Task) => setSelected(task.id), []);

  const content = (
    <TaskList.Root
      tasks={tasks}
      showDescriptions
      hierarchical
      statusLabel={statusLabel}
      onTaskCreate={handleCreate}
      onTaskUpdate={handleUpdate}
      onTaskDelete={handleDelete}
      onTaskMove={handleMove}
      // Selection is local to the list today (it styles the row); opening the task is a separate
      // affordance, so this only makes the row report which task the reader is looking at.
      onTaskSelect={handleSelect}
      selected={selected}
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
 * The set's tasks via the space index rather than the ref array: every member's ECHO parent is the
 * set (`SetParent` on `tasks`), so `childOf` is membership — transitive tolerates legacy sub-tasks
 * still parented to their parent task until a write heals them. A query re-emits on membership
 * changes only, never on a member's edit — `TaskList` rows subscribe themselves. Order is the
 * set's `tasks` array (canonical there), subscribed as a property atom and applied as a sort.
 */
const useSetTasks = (taskSet: TaskSet.TaskSet): Task.Task[] => {
  const db = Obj.getDatabase(taskSet);
  const tasks = useQuery(db, Filter.and(Filter.type(Task.Task), Filter.childOf(taskSet)));
  const [taskRefs] = useObject(taskSet, 'tasks');
  return useMemo(() => TaskSet.orderTasks(tasks, taskRefs ?? []), [tasks, taskRefs]);
};
