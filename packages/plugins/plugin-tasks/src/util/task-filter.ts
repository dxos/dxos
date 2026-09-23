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

/**
 * The tasks a filter keeps, plus every ancestor of a match.
 *
 * Ancestors ride along because the list renders a tree: a matching sub-task whose parent was dropped
 * would render at the root, silently restructuring what the reader is looking at. They are kept in
 * the array's order, which is the set's canonical one.
 */
export const filterTasks = (tasks: readonly Task.Task[], filter: Filter.Any | undefined): readonly Task.Task[] => {
  if (!filter) {
    return tasks;
  }

  const byId = new Map(tasks.map((task) => [task.id, task]));
  const keep = new Set<string>();
  for (const task of tasks) {
    if (!matchesTask(filter, task)) {
      continue;
    }
    for (let current: Task.Task | undefined = task; current && !keep.has(current.id);) {
      keep.add(current.id);
      const parentId = Task.parentTaskId(current);
      current = parentId ? byId.get(parentId) : undefined;
    }
  }

  return tasks.filter((task) => keep.has(task.id));
};
