//
// Copyright 2026 DXOS.org
//

import { Task } from '@dxos/types';

/**
 * The tree the list renders, and where a gesture puts a task in it. Kept out of the components
 * because this is the part a regression would break: a drop cannot be driven synthetically
 * (pragmatic-drag-and-drop uses native HTML5 drag events), so the placement calculation is tested
 * directly instead.
 *
 * `TaskSet.tasks` is flat and holds every task; `Task.parentTask` is the hierarchy. The array is
 * NOT a pre-order traversal and is deliberately not made into one: array order decides SIBLING
 * order only, and the walk supplies the rest. A parent therefore moves without dragging its
 * subtree's entries along, and a peer reordering one branch cannot corrupt another.
 */

/** One rendered row: the task, its depth, and where it sits among its siblings. */
export const subtreeIds = (tasks: readonly Task.Task[], task: Task.Task): Set<string> => {
  const ids = new Set<string>();
  const visit = (current: Task.Task): void => {
    if (ids.has(current.id)) {
      return;
    }
    ids.add(current.id);
    for (const child of Task.subTasks(tasks, current)) {
      visit(child);
    }
  };
  visit(task);
  return ids;
};

/** The three tree-item intents, matching `@atlaskit/pragmatic-drag-and-drop-hitbox`. */
export type TaskDropIntent = 'reorder-above' | 'reorder-below' | 'make-child';

/**
 * Places a task after `target`'s ancestor `levels` steps up — the tree hitbox's `reparent`, which
 * is how a drop past the last child escapes the subtree it would otherwise join. `levels` of 1 is
 * "after my parent", 2 "after my grandparent", and so on; running out of ancestors rejects rather
 * than silently landing at the root.
 */
export const resolveReparent = (
  tasks: readonly Task.Task[],
  source: Task.Task,
  target: Task.Task,
  levels: number,
): TaskPlacement | undefined => {
  if (levels < 1) {
    return undefined;
  }
  let ancestor: Task.Task | undefined = target;
  for (let step = 0; step < levels; step++) {
    const parentId: string | undefined = ancestor && Task.parentTaskId(ancestor);
    ancestor = parentId === undefined ? undefined : tasks.find((task) => task.id === parentId);
    if (!ancestor) {
      return undefined;
    }
  }
  return subtreeIds(tasks, source).has(ancestor.id)
    ? undefined
    : resolveTaskPlacement({ tasks, source, target: ancestor, intent: 'reorder-below' });
};

/**
 * Where a task lands, in the two terms `MoveTask` takes. `parentTask` is `null` for a root task
 * (matching the verb's convention) and `before` is undefined when the task goes last — which is
 * also last among its new siblings, since nothing after it in the array shares the parent.
 */
export type TaskPlacement = {
  parentTask: Task.Task | null;
  before?: Task.Task;
};

/**
 * Resolves a drop into a single `MoveTask` call, or `undefined` when the gesture is rejected.
 *
 * Rejected rather than silently ignored, so the caller can say no with the cursor:
 * - onto itself, or into its own subtree (the cycle `UpdateTask` rejects);
 * - onto a task from another set — a membership transfer, not a reorder.
 */
export const resolveTaskPlacement = ({
  tasks,
  source,
  target,
  intent,
}: {
  tasks: readonly Task.Task[];
  source: Task.Task;
  target: Task.Task;
  intent: TaskDropIntent;
}): TaskPlacement | undefined => {
  const present = new Set(tasks.map((task) => task.id));
  if (!present.has(source.id) || !present.has(target.id)) {
    return undefined;
  }
  if (subtreeIds(tasks, source).has(target.id)) {
    return undefined;
  }

  if (intent === 'make-child') {
    // Inserted as the FIRST child: the pointer is on the parent's own row, and the place directly
    // under that row is where the reader expects the task to appear. Appending it last puts it
    // somewhere off-screen for any parent with a few children.
    const firstChild = Task.subTasks(tasks, target).find((child) => child.id !== source.id);
    return { parentTask: target, before: firstChild };
  }

  const parentId = Task.parentTaskId(target);
  const parent = parentId === undefined ? null : (tasks.find((task) => task.id === parentId) ?? null);
  const siblings = parent === null ? Task.rootTasks(tasks) : Task.subTasks(tasks, parent);
  const index = siblings.findIndex((task) => task.id === target.id);

  if (intent === 'reorder-above') {
    return { parentTask: parent, before: target };
  }

  // Below the target is before the sibling that follows it; with none, the task goes last.
  const next = siblings.slice(index + 1).find((task) => task.id !== source.id);
  return { parentTask: parent, before: next };
};

/** A task's siblings (in sibling order) and its index among them. */
const siblingsOf = (
  tasks: readonly Task.Task[],
  task: Task.Task,
): { parent: Task.Task | null; siblings: Task.Task[]; index: number } => {
  const parentId = Task.parentTaskId(task);
  const parent = parentId === undefined ? null : (tasks.find((candidate) => candidate.id === parentId) ?? null);
  const siblings = parent === null ? Task.rootTasks(tasks) : Task.subTasks(tasks, parent);
  return { parent, siblings, index: siblings.findIndex((candidate) => candidate.id === task.id) };
};

/**
 * Indent: the task becomes the last child of its previous sibling — the outliner's `Tab`. Undefined
 * when it is the first among its siblings and so has nothing to indent under.
 */
export const resolveIndent = (tasks: readonly Task.Task[], task: Task.Task): TaskPlacement | undefined => {
  const { siblings, index } = siblingsOf(tasks, task);
  const previous = index > 0 ? siblings[index - 1] : undefined;
  return previous ? { parentTask: previous, before: undefined } : undefined;
};

/**
 * Outdent: the task becomes the next sibling of its parent — the outliner's `Shift-Tab`. Undefined
 * for a task already at the root.
 */
export const resolveOutdent = (tasks: readonly Task.Task[], task: Task.Task): TaskPlacement | undefined => {
  const { parent } = siblingsOf(tasks, task);
  if (!parent) {
    return undefined;
  }
  const { parent: grandparent, siblings, index } = siblingsOf(tasks, parent);
  return { parentTask: grandparent, before: siblings[index + 1] };
};

/**
 * Move within the current parent — `Alt-ArrowUp` / `Alt-ArrowDown`. Undefined at either end, so the
 * key is a no-op rather than silently jumping the task out of its branch.
 */
export const resolveNudge = (
  tasks: readonly Task.Task[],
  task: Task.Task,
  direction: 'up' | 'down',
): TaskPlacement | undefined => {
  const { parent, siblings, index } = siblingsOf(tasks, task);
  if (direction === 'up') {
    return index > 0 ? { parentTask: parent, before: siblings[index - 1] } : undefined;
  }
  // Past the next sibling: anchored on the one after it, or unanchored to land last.
  return index < siblings.length - 1 ? { parentTask: parent, before: siblings[index + 2] } : undefined;
};
