//
// Copyright 2026 DXOS.org
//

import { type StaticTreeModel, createStaticTreeModel } from '@dxos/react-ui-list';
import { Task } from '@dxos/types';
import { type Label } from '@dxos/ui-types';

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
  /** Absent on the synthetic root and on a status group, neither of which is a task. */
  task?: Task.Task;
  /** Set on a status group, whose children are the tasks in that status. */
  status?: Task.Status;
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

/**
 * Path to each task, keyed by id and including the synthetic root — what `Tree` addresses rows by.
 * Unambiguous because a task has exactly one parent, so it appears at exactly one path.
 */
export const buildTaskPaths = (root: TaskNode): Map<string, string[]> => {
  const paths = new Map<string, string[]>();
  const visit = (node: TaskNode, path: string[]): void => {
    const next = [...path, node.id];
    if (node.task) {
      paths.set(node.id, next);
    }
    node.children.forEach((child) => visit(child, next));
  };
  visit(root, []);
  return paths;
};

export type TaskTreeModelOptions = {
  /** Ids whose sub-tasks are hidden. Keyed by id, matching `TaskList`'s own collapsed set. */
  collapsed?: ReadonlySet<string>;
  /**
   * Group the tasks under status headers instead of rendering the hierarchy.
   *
   * Grouping and hierarchy are alternatives, not layers: a status group holds the tasks in that
   * status flat, because a sub-task's status need not match its parent's and nesting one inside a
   * group its parent does not belong to reads as a contradiction.
   */
  groupByStatus?: readonly Task.Status[];
  /** Namespace for the group headers' labels; without it a header reads as a raw status id. */
  translationKey?: string;
  /**
   * Nest sub-tasks under their parent. Off renders one row per task, which is the flat list — a
   * tree of depth one rather than a second rendering path.
   */
  hierarchical?: boolean;
};

/** Every task as a root: the flat list, expressed as a tree of depth one. */
export const buildFlatList = (tasks: readonly Task.Task[]): TaskNode => ({
  id: TASK_TREE_ROOT_ID,
  children: tasks.map((task) => ({ id: task.id, task, children: [] })),
});

/** Prefix so a group's node id cannot collide with a task's. */
const GROUP_ID_PREFIX = 'status:';

/** Builds the status-grouped forest: one group node per non-empty status, tasks flat within it. */
export const buildStatusGroups = (tasks: readonly Task.Task[], order: readonly Task.Status[]): TaskNode => ({
  id: TASK_TREE_ROOT_ID,
  children: order
    .map((status) => ({
      id: `${GROUP_ID_PREFIX}${status}`,
      status,
      children: tasks
        .filter((task) => (task.status ?? 'todo') === status)
        .map((task) => ({ id: task.id, task, children: [] })),
    }))
    .filter((group) => group.children.length > 0),
});

/** A task's title, a group's translated status, or the synthetic root's id. */
const groupLabel = (node: TaskNode, translationKey?: string): Label => {
  if (node.task) {
    return node.task.title ?? node.id;
  }
  if (node.status) {
    // Without a namespace the key cannot resolve, so the raw status is the honest fallback.
    return translationKey ? [`status-${node.status}.label`, { ns: translationKey }] : node.status;
  }
  return node.id;
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
  { collapsed, groupByStatus, translationKey, hierarchical = true }: TaskTreeModelOptions = {},
): StaticTreeModel<TaskNode> =>
  createStaticTreeModel(
    groupByStatus
      ? buildStatusGroups(tasks, groupByStatus)
      : hierarchical
        ? buildTaskForest(tasks)
        : buildFlatList(tasks),
    {
      getChildren: (node) => node.children,
      getProps: (node) => ({
        label: groupLabel(node, translationKey),
        // `group` makes `Tree` render a section header and splice the node out of the collection's
        // topology, so the keyboard never lands on a header.
        ...(node.status ? { disposition: 'group' as const } : { testId: 'taskList.item' }),
      }),
      isOpen: (node) => !collapsed?.has(node.id),
    },
  );
