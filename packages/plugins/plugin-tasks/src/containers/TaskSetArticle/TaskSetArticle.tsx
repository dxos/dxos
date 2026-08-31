//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as Optimistic from '@dxos/app-framework/Optimistic';
import { useOperation, useOperationHandler, useOptimisticQuery, useSpaceCallback } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Panel, Switch, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { type TaskDraft, type TaskEdit, TaskList, type TaskPlacement } from '@dxos/react-ui-task';
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
  const { tasks, overlay } = useTasks(taskSet);

  const handleCreate = useOperation(
    TaskOperation.CreateTask,
    (props: TaskDraft) => ({ taskSet: Ref.make(taskSet), ...props }),
    { spaceId },
  );

  const handleUpdate = useOperation(
    TaskOperation.UpdateTask,
    (task: Task.Task, props: TaskEdit) => ({ task: Ref.make(task), ...props }),
    { spaceId },
  );

  const handleDelete = useOperation(TaskOperation.DeleteTask, (task: Task.Task) => ({ task: Ref.make(task) }), {
    spaceId,
  });

  const moveTask = useOperationHandler(TaskOperation.MoveTask);
  const runMove = useSpaceCallback(
    spaceId,
    [Database.Service],
    (task: Task.Task, { parentTask, before }: TaskPlacement) =>
      moveTask({
        task: Ref.make(task),
        parentTask: parentTask ? Ref.make(parentTask) : null,
        ...(before ? { before: Ref.make(before) } : {}),
      }),
    [moveTask],
  );
  // The optimistic entry mirrors the MoveTask handler's array write (`TaskSet.reorder` via `reorderItems`),
  // so the dropped row renders in its target position on the drop frame instead of jumping back until
  // the query re-emits the db order. It retires when the handler settles: success commits (the next
  // source emission carries the real order), failure reverts.
  const handleMove = useCallback(
    (task: Task.Task, placement: TaskPlacement) => {
      const handle = overlay.mutate({
        apply: (rows) => TaskSet.reorderItems(rows, (row) => row.id, task.id, placement.before?.id),
      });
      runMove(task, placement).then(
        () => handle.commit(),
        () => handle.revert(),
      );
    },
    [overlay, runMove],
  );

  const content = (
    <TaskList.Root
      hierarchical
      selectable
      showDescriptions
      tasks={tasks}
      onTaskCreate={handleCreate}
      onTaskUpdate={handleUpdate}
      onTaskDelete={handleDelete}
      onTaskMove={handleMove}
    >
      <TaskList.Viewport classNames='grid grid-rows-[auto_1fr] gap-2'>
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

  return (
    <Switch.Root
      on={role}
      fallback={
        <Panel.Root role={role}>
          <Panel.Toolbar asChild>
            <Toolbar.Root disabled={!hasAttention} />
          </Panel.Toolbar>
          <Panel.Content>{content}</Panel.Content>
        </Panel.Root>
      }
    >
      {/* Embedded as a section (e.g., the ProjectArticle Tasks section): the host owns scroll and
          chrome, so render the bare list — a nested Panel/scroll root would collapse width. */}
      <Switch.Match when={AppSurface.Section.role}>{content}</Switch.Match>
    </Switch.Root>
  );
};

TaskSetArticle.displayName = 'TaskSetArticle';

/**
 * The set's tasks via `childOf` — membership is the ECHO parent edge, and transitive tolerates
 * legacy sub-tasks still parented to their parent task. The query re-emits on membership changes
 * only, never on a member's edit — `TaskList` rows subscribe themselves. The ordered query atom
 * is wrapped in an optimistic overlay: the source must stay stable across emissions (hence
 * `query.atom` instead of `useQuery`, whose fresh arrays would rebuild the overlay and lose
 * pending entries mid-operation).
 */
const useTasks = (
  taskSet: TaskSet.TaskSet,
): { tasks: readonly Task.Task[]; overlay: Optimistic.Overlay<Task.Task> } => {
  const { objects, overlay } = useOptimisticQuery(
    Obj.getDatabase(taskSet),
    Filter.and(Filter.type(Task.Task), Filter.childOf(taskSet)),
    // Subscribes each member's `parentTask` (the set's array does not carry hierarchy)
    // and orders by the set's canonical array.
    (get, tasks) => {
      tasks.forEach((task) => get(Obj.atomProperty(task, 'parentTask')));
      return Task.orderTasks(tasks, get(Obj.atomProperty(taskSet, 'tasks')) ?? []);
    },
    [taskSet],
  );

  return { tasks: objects, overlay };
};
