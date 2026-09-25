//
// Copyright 2026 DXOS.org
//

import { type Filter, Obj, type QueryAST } from '@dxos/echo';
import { Task } from '@dxos/types';

/**
 * Evaluate a parsed filter against a task in memory, the way plugin-inbox matches a message
 * (`util/match-filter.ts`).
 *
 * In memory rather than as a query, because the list is a tree: a query would drop the ancestors of
 * a matching sub-task and leave the rows it did return orphaned (see {@link filterTasks}). The same
 * reason keeps the filter off the `childOf` query the article already runs.
 */
export const matchesTask = (filter: Filter.Any, task: Task.Task): boolean => matchesAst(filter.ast, task);

/** A task's tag ids — the uri space `#tag` terms and `Obj.getMeta().tags` share. */
const tagUris = (task: Task.Task): string[] => {
  try {
    return Obj.getMeta(task).tags.map((tag) => tag.uri);
  } catch {
    // A task outside a database carries no meta; a tag term then matches nothing rather than throwing.
    return [];
  }
};

const matchesAst = (ast: QueryAST.Filter | undefined, task: Task.Task): boolean => {
  if (!ast || typeof ast !== 'object') {
    return false;
  }

  switch (ast.type) {
    case 'and':
      return ast.filters.every((sub) => matchesAst(sub, task));
    case 'or':
      return ast.filters.some((sub) => matchesAst(sub, task));
    case 'not':
      return !matchesAst(ast.filter, task);
    case 'tag':
      return tagUris(task).includes(ast.tag);
    case 'text-search':
      return matchesText(ast.text ?? '', task);
    case 'object': {
      // `typename` is null for `Filter.everything()`/`Filter.props()`, which match any type.
      if (ast.typename && Obj.getTypeURI(task)?.toString() !== ast.typename) {
        return false;
      }
      // An `id:` term lands here rather than in `props`, so a filter naming one id would otherwise
      // match every task.
      if (ast.id && !ast.id.includes(task.id)) {
        return false;
      }
      return Object.entries(ast.props ?? {}).every(([key, predicate]) =>
        matchesPredicate(predicate, getPath(task, key), task),
      );
    }
    default:
      // Unknown node — fail closed, so an unhandled filter never silently broadens the list.
      return false;
  }
};

const matchesPredicate = (ast: any, value: unknown, task: Task.Task): boolean => {
  switch (ast?.type) {
    case 'compare': {
      switch (ast.operator) {
        case 'eq':
          return matchesValue(value, ast.value);
        case 'neq':
          return !matchesValue(value, ast.value);
        case 'gt':
          return (value as any) > ast.value;
        case 'gte':
          return (value as any) >= ast.value;
        case 'lt':
          return (value as any) < ast.value;
        case 'lte':
          return (value as any) <= ast.value;
        default:
          return false;
      }
    }
    case 'object': {
      if (typeof value !== 'object' || value === null) {
        return false;
      }
      return Object.entries(ast.props ?? {}).every(([key, sub]) => matchesPredicate(sub, getPath(value, key), task));
    }
    default:
      return matchesAst(ast, task);
  }
};

/**
 * A property value against a typed term's value: strings match as case-insensitive substrings (so
 * `status:start` finds `started` and `assignee:rich` finds an actor's name or email), arrays match
 * on any element, objects on any field.
 */
const matchesValue = (value: unknown, query: unknown): boolean => {
  if (value === query) {
    return true;
  }
  if (typeof query === 'string' && typeof value === 'string') {
    return value.toLowerCase().includes(query.toLowerCase());
  }
  if (Array.isArray(value)) {
    return value.some((entry) => matchesValue(entry, query));
  }
  if (typeof query === 'string' && typeof value === 'object' && value !== null) {
    return Object.values(value).some((entry) => matchesValue(entry, query));
  }
  return false;
};

const getPath = (object: any, path: string): unknown =>
  path.split('.').reduce<any>((acc, key) => (acc != null ? acc[key] : undefined), object);

/** Free text reads the task the way a reader does: its title and its description. */
const matchesText = (needle: string, task: Task.Task): boolean => {
  if (!needle) {
    return true;
  }
  const haystack = `${task.title ?? ''}\n${task.description ?? ''}`;
  return haystack.toLowerCase().includes(needle.toLowerCase());
};

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
    if (!matchesTask(filter, task)) {
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
