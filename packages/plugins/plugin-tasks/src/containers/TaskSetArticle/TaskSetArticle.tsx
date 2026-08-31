//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperation, useOperationHandler, useOptimisticQuery, useSpaceCallback } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Panel, Switch, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { createMenuAction } from '@dxos/react-ui-menu';
import { TaskList, type TaskPlacement } from '@dxos/react-ui-task';
import { Task, TaskSet } from '@dxos/types';

import { meta } from '#meta';
import { TaskOperation } from '#types';

import { useTaskActions } from '../../hooks/useTaskActions';

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
  const tasks = useTasks(taskSet);

  const handleCreate = useOperation(
    TaskOperation.CreateTask,
    (props: Task.Draft) => ({ taskSet: Ref.make(taskSet), ...props }),
    { spaceId },
  );

  const handleUpdate = useOperation(
    TaskOperation.UpdateTask,
    (task: Task.Task, props: Task.Edit) => ({ task: Ref.make(task), ...props }),
    { spaceId },
  );

  const handleDelete = useOperation(TaskOperation.DeleteTask, (task: Task.Task) => ({ task: Ref.make(task) }), {
    spaceId,
  });

  // Delete is one item among the contributed ones, so a row has a single trailing affordance
  // whatever any plugin adds to it.
  const contributed = useTaskActions();
  const getTaskActions = useCallback(
    (task: Task.Task) => [
      ...contributed(task),
      createMenuAction(`delete-${task.id}`, () => handleDelete(task), {
        label: t('delete-task.label'),
        icon: 'ph--x--regular',
        testId: 'tasks.task.delete',
      }),
    ],
    [contributed, handleDelete, t],
  );

  // The handler runs directly against the local db, so the array write lands before the drop
  // frame paints — no optimistic overlay needed to hold the row in place.
  const handleMove = useSpaceCallback(
    spaceId,
    [Database.Service],
    useOperationHandler(TaskOperation.MoveTask, (task: Task.Task, { parentTask, before }: TaskPlacement) => ({
      task: Ref.make(task),
      parentTask: parentTask ? Ref.make(parentTask) : null,
      ...(before ? { before: Ref.make(before) } : {}),
    })),
  );

  const content = (
    <TaskList.Root
      hierarchical
      selectable
      showDescriptions
      tasks={tasks}
      onTaskCreate={handleCreate}
      onTaskUpdate={handleUpdate}
      getTaskActions={getTaskActions}
      onTaskMove={handleMove}
    >
      <TaskList.Viewport>
        <TaskList.Content classNames='dx-document' />
      </TaskList.Viewport>
      <div className='p-2 pt-0'>
        <TaskList.Edit
          showDescription
          classNames='dx-document bg-input-surface border border-separator rounded-md p-2'
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
 * only, never on a member's edit — `TaskList` rows subscribe themselves.
 */
const useTasks = (taskSet: TaskSet.TaskSet): readonly Task.Task[] => {
  const { objects } = useOptimisticQuery(
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

  return objects;
};
