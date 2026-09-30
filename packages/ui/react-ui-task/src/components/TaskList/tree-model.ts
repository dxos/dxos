//
// Copyright 2026 DXOS.org
//

import { type StaticTreeModel, createStaticTreeModel } from '@dxos/react-ui-list';
import { Task } from '@dxos/types';
import { type Label } from '@dxos/ui-types';

/**
 * Adapts a set's tasks to the `Tree`'s model.
 *
 * The list is taken flat (every task the set holds) and the forest rebuilt from
 * `rootTasks`/`subTasks`: parent edges place each task, `subtasks` order its siblings.
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
  /** Set on a host-defined group (see {@link TaskGroup}), whose row is a collapsible header. */
  group?: TaskGroupHeader;
  children: TaskNode[];
};

/**
 * A section of a grouped task list, as the host computed it — by status, priority, assignee,
 * milestone or anything else. The list only renders the partition; deciding it is the host's.
 */
export type TaskGroup = {
  /** Unique among the list's groups. */
  id: string;
  label: Label;
  icon?: string;
  iconClassNames?: string;
  /** The group's tasks, in the order they render; sub-tasks nest under a parent in the same group. */
  tasks: readonly Task.Task[];
};

/** What a group's header row shows. */
export type TaskGroupHeader = Omit<TaskGroup, 'tasks'> & { count: number };

/** Prefix so a host group's node id cannot collide with a task's, nor with a status group's. */
export const TASK_GROUP_ID_PREFIX = 'group:';

/** The tree node id of a host group, which is also its key in the list's collapsed set. */
export const taskGroupNodeId = (group: Pick<TaskGroup, 'id'>): string => `${TASK_GROUP_ID_PREFIX}${group.id}`;

/**
 * One collapsible header per non-empty group, its tasks beneath. Nested within a group when
 * `hierarchical`: a sub-task whose parent landed in another group is a root of its own group, since
 * the forest is built from the group's tasks alone.
 */
export const buildTaskGroups = (groups: readonly TaskGroup[], hierarchical = true): TaskNode => ({
  id: TASK_TREE_ROOT_ID,
  children: groups
    .filter((group) => group.tasks.length > 0)
    .map(({ tasks, ...header }) => ({
      id: taskGroupNodeId(header),
      group: { ...header, count: tasks.length },
      children: (hierarchical ? buildTaskForest(tasks) : buildFlatList(tasks)).children,
    })),
});

/** Synthetic root; the tree renders its children. */
export const TASK_TREE_ROOT_ID = 'tasks';

/**
 * Builds the task forest. Cycle-safe: a malformed parent loop is visited once and then
 * skipped, so a corrupt set renders short rather than hanging.
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
  /**
   * Host-defined groups, rendered as collapsible headers with counts. Takes precedence over
   * `groupByStatus`, and keeps the hierarchy within each group when `hierarchical`.
   */
  groups?: readonly TaskGroup[];
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

/** The forest a list renders under `options` — shared by the model and the paths into it. */
export const buildTaskTree = (
  tasks: readonly Task.Task[],
  {
    groups,
    groupByStatus,
    hierarchical = true,
  }: Pick<TaskTreeModelOptions, 'groups' | 'groupByStatus' | 'hierarchical'> = {},
): TaskNode =>
  groups
    ? buildTaskGroups(groups, hierarchical)
    : groupByStatus
      ? buildStatusGroups(tasks, groupByStatus)
      : hierarchical
        ? buildTaskForest(tasks)
        : buildFlatList(tasks);

/** A task's title, a group's label or translated status, or the synthetic root's id. */
const groupLabel = (node: TaskNode, translationKey?: string): Label => {
  if (node.task) {
    return node.task.title ?? node.id;
  }
  if (node.group) {
    return node.group.label;
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
  { collapsed, groups, groupByStatus, translationKey, hierarchical = true }: TaskTreeModelOptions = {},
): StaticTreeModel<TaskNode> =>
  createStaticTreeModel(buildTaskTree(tasks, { groups, groupByStatus, hierarchical }), {
    getChildren: (node) => node.children,
    getProps: (node) => ({
      label: groupLabel(node, translationKey),
      // `group` makes `Tree` render a section header and splice the node out of the collection's
      // topology, so the keyboard never lands on a header.
      ...(node.status
        ? { disposition: 'group' as const }
        : node.group
          ? // A branch (its children make it one) rather than a `group` disposition: a section
            // header cannot be collapsed, and folding away the `Done` group is half the point.
            { testId: 'taskList.group' }
          : {
              testId: 'taskList.item',
              // The selection fill already marks the row, so a focus ring on top of it reads as a
              // second, conflicting highlight; unselected rows keep the ring for keyboard travel.
              className: 'data-[selected]:ring-0',
            }),
    }),
    isOpen: (node) => !collapsed?.has(node.id),
  });

/**
 * Tasks in the order the tree shows them, a collapsed branch contributing only its own row.
 *
 * Derived from the forest the tree renders rather than from a second walk, so the ordinals a reader
 * counts down cannot drift from the rows they number.
 */
export const flattenVisibleTasks = (root: TaskNode, collapsed?: ReadonlySet<string>): Task.Task[] => {
  const tasks: Task.Task[] = [];
  const visit = (nodes: readonly TaskNode[]): void => {
    for (const node of nodes) {
      if (node.task) {
        tasks.push(node.task);
      }
      if (!collapsed?.has(node.id)) {
        visit(node.children);
      }
    }
  };
  visit(root.children);
  return tasks;
};
