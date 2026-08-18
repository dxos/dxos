//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { Fragment, useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { getSpace } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { TaskList, type TaskPatch, type TaskStatus } from '@dxos/react-ui-task';
import { type Milestone, type Task, TaskSet } from '@dxos/types';

import { meta } from '#meta';
import { TaskOperation } from '#types';

export type TaskSetArticleProps = AppSurface.ObjectArticleProps<TaskSet.TaskSet>;

/**
 * A task set's root tasks, grouped by milestone and then by status. Membership and order come from
 * the set's `tasks` array, so the view is a partition of one list rather than a tree walk; a set
 * with no milestones renders as a single flat list. CRUD flows through the {@link TaskOperation}
 * verbs so the article and external agents share one write path — the verbs are what keep the
 * array, the milestone refs, and the lifecycle parent edges consistent.
 */
export const TaskSetArticle = ({ role, attendableId, subject: taskSet }: TaskSetArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { hasAttention } = useAttention(attendableId);
  const space = getSpace(taskSet);
  const spaceId = space?.id;
  const { invokePromise } = useOperationInvoker();

  const groups = useTaskSetGroups(taskSet);

  const statusLabel = useCallback((status: TaskStatus) => t(`task-status.${status}.label`), [t]);
  const handleCreate = useCallback(
    (title: string, milestone?: Milestone.Milestone) =>
      void invokePromise(
        TaskOperation.CreateTask,
        { taskSet: Ref.make(taskSet), title, milestone: milestone ? Ref.make(milestone) : undefined },
        { spaceId },
      ),
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

  const content =
    groups.milestoneGroups.length === 0 ? (
      <TaskGroup
        tasks={groups.backlog}
        statusLabel={statusLabel}
        placeholder={t('task-create.placeholder')}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    ) : (
      <>
        {groups.milestoneGroups.map(({ milestone, tasks: milestoneTasks, allTasks: allMilestoneTasks }) => (
          <Fragment key={milestone.id}>
            <h2 className='flex items-baseline gap-2 my-2 px-3 text-sm font-medium text-subdued'>
              <span className='text-baseText'>{milestone.name}</span>
              <MilestoneProgress tasks={allMilestoneTasks} />
            </h2>
            <TaskGroup
              tasks={milestoneTasks}
              statusLabel={statusLabel}
              placeholder={t('task-create.placeholder')}
              onCreate={(title) => handleCreate(title, milestone)}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          </Fragment>
        ))}
        <h2 className='my-2 px-3 text-sm font-medium text-subdued'>{t('backlog.label')}</h2>
        <TaskGroup
          tasks={groups.backlog}
          statusLabel={statusLabel}
          placeholder={t('task-create.placeholder')}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </>
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

type TaskGroupProps = {
  tasks: readonly Task.Task[];
  statusLabel: (status: TaskStatus) => string;
  placeholder: string;
  onCreate: (title: string) => void;
  onUpdate: (task: Task.Task, patch: TaskPatch) => void;
  onDelete: (task: Task.Task) => void;
};

/** One milestone's (or the backlog's) tasks, status-grouped, with its own create row. */
const TaskGroup = ({ tasks, statusLabel, placeholder, onCreate, onUpdate, onDelete }: TaskGroupProps) => (
  <TaskList.Root
    tasks={tasks}
    statusLabel={statusLabel}
    onTaskCreate={onCreate}
    onTaskUpdate={onUpdate}
    onTaskDelete={onDelete}
  >
    <TaskList.Viewport>
      <TaskList.Content />
    </TaskList.Viewport>
    <TaskList.Create placeholder={placeholder} />
  </TaskList.Root>
);

type MilestoneGroup = {
  milestone: Milestone.Milestone;
  /** Root tasks shown under the milestone. */
  tasks: Task.Task[];
  /** Every task counting toward it, sub-tasks included — what progress is derived from. */
  allTasks: Task.Task[];
};

/**
 * The set's partition into milestone groups and backlog.
 *
 * Subscribes to set membership and to each task's two structural fields only — never to a whole
 * task — so editing a title or ticking a status re-renders the row that owns it (`TaskList` rows
 * subscribe themselves) and the affected milestone's {@link MilestoneProgress}, not the article.
 * Refs are resolved through `ref.atom`, which tracks loading without tracking mutations.
 */
const useTaskSetGroups = (taskSet: TaskSet.TaskSet): { backlog: Task.Task[]; milestoneGroups: MilestoneGroup[] } => {
  const [taskSetSnapshot] = useObject(taskSet);
  const taskRefs = taskSetSnapshot?.tasks;
  const milestoneRefs = taskSetSnapshot?.milestones;

  const atom = useMemo(
    () =>
      Atom.make((get) => {
        const tasks = TaskSet.dedupeById((taskRefs ?? []).map((ref) => get(ref.atom)));
        const milestones = TaskSet.dedupeById((milestoneRefs ?? []).map((ref) => get(ref.atom)));
        // Read the structural fields through property atoms so a re-file or re-parent re-partitions,
        // while title/status edits stay local to their row.
        for (const task of tasks) {
          get(Obj.atomProperty(task, 'milestone'));
          get(Obj.atomProperty(task, 'parentTask'));
        }

        // Only root tasks are listed: a sub-task appears under its parent, and the flat array holds both.
        const roots = TaskSet.rootTasks(tasks);
        return {
          backlog: TaskSet.backlogTasks(roots),
          milestoneGroups: milestones.map((milestone) => ({
            milestone,
            tasks: TaskSet.tasksForMilestone(roots, milestone),
            allTasks: TaskSet.tasksForMilestone(tasks, milestone),
          })),
        };
      }),
    [taskRefs, milestoneRefs],
  );

  return useAtomValue(atom);
};

/** A milestone's derived done/total, subscribed to just its own tasks' statuses. */
const MilestoneProgress = ({ tasks }: { tasks: readonly Task.Task[] }) => {
  const { t } = useTranslation(meta.profile.key);
  const atom = useMemo(
    () =>
      Atom.make((get) => {
        const statuses = tasks.map((task) => get(Obj.atomProperty(task, 'status')));
        const counted = statuses.filter((status) => status !== 'cancelled');
        return { total: counted.length, done: counted.filter((status) => status === 'done').length };
      }),
    [tasks],
  );
  const { total, done } = useAtomValue(atom);
  return <span>{t('milestone-progress.label', { done, total })}</span>;
};
