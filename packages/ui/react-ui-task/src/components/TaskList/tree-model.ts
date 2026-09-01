//
// Copyright 2026 DXOS.org
//

import { type StaticTreeModel, createStaticTreeModel } from '@dxos/react-ui-list';
import { Task } from '@dxos/types';

/**
 * Adapts a `TaskSet`'s flat task array to the `Tree`'s model.
 *
 * `TaskSet.tasks` is flat and `Task.parentTask` carries the hierarchy — the same shape
 * {@link walkTaskTree} reads, so this is the tree that walk produces, expressed as nodes rather
 * than as pre-flattened rows. Array order decides sibling order and nothing else, which is why the
 * forest is rebuilt from `rootTasks`/`subTasks` rather than by grouping the array.
 *
 * A task has exactly one parent, so it appears at exactly one path. That is what lets collapsed
 * state stay keyed by id (as `TaskList` already keys it) while `Tree` addresses rows by path.
 */
export type TaskNode = {
  id: string;
  /** Absent on the synthetic root, which anchors the top-level tasks and is never rendered. */
  task?: Task.Task;
  children: TaskNode[];
};

/** Synthetic root; the tree renders its children. */
export const TASK_TREE_ROOT_ID = 'tasks';

/**
 * Builds the task forest. Cycle-safe in the same way as {@link walkTaskTree}: a malformed
 * `parentTask` loop is visited once and then skipped, so a corrupt set renders short rather than
 * hanging.
 */
export const buildTaskForest = (tasks: readonly Task.Task[]): TaskNode => {
  const seen = new Set<string>();

  const visit = (task: Task.Task): TaskNode => {
    seen.add(task.id);
    const children = Task.subTasks(tasks, task).filter((child) => !seen.has(child.id));
    return { id: task.id, task, children: children.map(visit) };
  };

  return {
    id: TASK_TREE_ROOT_ID,
    children: Task.rootTasks(tasks)
      .filter((task) => !seen.has(task.id))
      .map(visit),
  };
};

export type TaskTreeModelOptions = {
  /** Ids whose sub-tasks are hidden. Keyed by id, matching `TaskList`'s own collapsed set. */
  collapsed?: ReadonlySet<string>;
};

/**
 * A {@link StaticTreeModel} over the task forest.
 *
 * The model is rebuilt whenever the task array changes, so open state is seeded from `collapsed`
 * rather than held inside it — a collapse kept only in the model would be dropped by the next
 * rebuild, and tasks are live ECHO objects.
 */
export const createTaskTreeModel = (
  tasks: readonly Task.Task[],
  { collapsed }: TaskTreeModelOptions = {},
): StaticTreeModel<TaskNode> =>
  createStaticTreeModel(buildTaskForest(tasks), {
    getChildren: (node) => node.children,
    getProps: (node) => ({
      label: node.task?.title ?? node.id,
    }),
    isOpen: (node) => !collapsed?.has(node.id),
  });
