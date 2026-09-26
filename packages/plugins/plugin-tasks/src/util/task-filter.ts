//
// Copyright 2026 DXOS.org
//

import { type Filter } from '@dxos/echo';
import { matchesFilter } from '@dxos/echo-query';
import { Task } from '@dxos/types';

/** A task reads the way a reader sees it: its title and its description. */
const taskText = (task: Task.Task) => [task.title, task.description];

export type TaskFilterOptions = {
  /** The toolbar's parsed query; absent matches every task. */
  filter?: Filter.Any;
  /** The statuses the reader kept; absent keeps every status, and empty keeps none. */
  statuses?: ReadonlySet<Task.Status>;
};

/**
 * The tasks the toolbar's two terms keep, in the array's order — which is the set's canonical one.
 *
 * The terms read the tree differently, because they answer different questions:
 *
 * - The status selector prunes branches. Hiding a status hides the tasks in it AND everything filed
 *   under them: a sub-task is part of the work its parent stands for, so a reader who has put a
 *   branch out of sight has put the whole branch out of sight.
 * - The query keeps the ancestors of a match. A reader searching for a task does not know where it
 *   is filed, and a match whose parent was dropped would render at the root — silently restructuring
 *   what they are looking at. Those ancestors are drawn from what the status selector left, so the
 *   query can never bring a hidden branch back.
 */
export const filterTasks = (
  tasks: readonly Task.Task[],
  { filter, statuses }: TaskFilterOptions = {},
): readonly Task.Task[] => {
  if (!filter && !statuses) {
    return tasks;
  }

  const byId = new Map(tasks.map((task) => [task.id, task]));
  const parentOf = (task: Task.Task): Task.Task | undefined => {
    const parentId = Task.parentTaskId(task);
    // A parent outside this set cannot be judged, so the branch is rooted here and stays visible.
    return parentId ? byId.get(parentId) : undefined;
  };

  const visible = statuses ? statusVisible(tasks, statuses, parentOf) : undefined;
  const shown = visible ? tasks.filter((task) => visible.has(task.id)) : tasks;
  if (!filter) {
    return shown;
  }

  const keep = new Set<string>();
  for (const task of shown) {
    // In memory rather than as a query: a query would drop the ancestors of a matching sub-task.
    if (!matchesFilter(filter, task, { text: taskText })) {
      continue;
    }
    for (let current: Task.Task | undefined = task; current && !keep.has(current.id); current = parentOf(current)) {
      keep.add(current.id);
    }
  }

  return shown.filter((task) => keep.has(task.id));
};

/**
 * The tasks whose own status is shown and whose every ancestor's is too.
 *
 * Resolved down the array with the answer for each parent memoized, so a deep branch is walked once
 * rather than once per descendant.
 */
const statusVisible = (
  tasks: readonly Task.Task[],
  statuses: ReadonlySet<Task.Status>,
  parentOf: (task: Task.Task) => Task.Task | undefined,
): ReadonlySet<string> => {
  const resolved = new Map<string, boolean>();
  const resolve = (task: Task.Task): boolean => {
    const cached = resolved.get(task.id);
    if (cached !== undefined) {
      return cached;
    }
    // Marked before the ancestors are walked: a cycle would otherwise recurse forever, and a task
    // filed under itself is a broken edge rather than a reason to drop the row.
    resolved.set(task.id, true);
    // `todo` is the status of a task that carries none, as every row that renders one assumes.
    const parent = parentOf(task);
    const answer = statuses.has(task.status ?? 'todo') && (!parent || resolve(parent));
    resolved.set(task.id, answer);
    return answer;
  };

  return new Set(tasks.filter(resolve).map(({ id }) => id));
};
