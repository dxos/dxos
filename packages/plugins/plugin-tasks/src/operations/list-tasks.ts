//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Entity, Filter, Obj, Query, type Ref } from '@dxos/echo';
import { Task } from '@dxos/types';

import { TaskOperation } from '../types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Reads the tasks of a container. Containment is the ECHO parent edge, so membership is resolved
 * by walking children rather than filtering a field; a project lists across every task set it owns.
 *
 * Pagination is an opaque offset cursor: `Query.children()` has no stable sort key to page by, and
 * an opaque token keeps the wire shape unchanged if this moves to a key cursor later.
 */
const handler: Operation.WithHandler<typeof TaskOperation.ListTasks> = TaskOperation.ListTasks.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ taskSet, project, status, assignee, includeSubtasks, after, limit }) {
      if (!taskSet && !project) {
        return yield* Effect.fail(new Error('Provide either `taskSet` or `project`.'));
      }

      const containers: string[] = [];
      if (taskSet) {
        containers.push((yield* Database.load(taskSet)).id);
      }
      if (project) {
        const projectObject = yield* Database.load(project);
        // Read the ref array structurally: `Project` lives in @dxos/compute, which plugin-tasks
        // must not depend on (it would invert the publishable-plugin dependency direction).
        const taskSets = (projectObject as { taskSets?: ReadonlyArray<Ref.Ref<Obj.Unknown>> }).taskSets ?? [];
        for (const ref of taskSets) {
          const loaded = yield* Database.load(ref).pipe(Effect.orElseSucceed(() => undefined));
          if (loaded) {
            containers.push(loaded.id);
          }
        }
      }

      const collected: Task.Task[] = [];
      for (const containerId of containers) {
        collected.push(...(yield* childTasks(containerId, includeSubtasks ?? false)));
      }

      const filtered = collected.filter(
        (task) =>
          (status === undefined || (task.status ?? 'todo') === status) &&
          (assignee === undefined || matchesAssignee(task, assignee)),
      );

      const pageSize = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
      const offset = decodeCursor(after);
      const page = filtered.slice(offset, offset + pageSize);
      const nextOffset = offset + page.length;

      return {
        tasks: page.map((task) => Entity.toJSON(task)),
        nextCursor: nextOffset < filtered.length ? encodeCursor(nextOffset) : undefined,
      };
    }),
  ),
);

/** Root tasks of a container, optionally descending into sub-tasks (one tree, so recursion terminates). */
const childTasks = (
  containerId: string,
  includeSubtasks: boolean,
): Effect.Effect<Task.Task[], never, Database.Service> =>
  Effect.gen(function* () {
    const children = yield* Database.query(Query.select(Filter.id(containerId)).children()).run.pipe(
      Effect.orElseSucceed(() => []),
    );
    const tasks = children.filter((child): child is Task.Task => Obj.instanceOf(Task.Task, child));
    if (!includeSubtasks) {
      return tasks;
    }

    const nested: Task.Task[] = [];
    for (const task of tasks) {
      nested.push(task, ...(yield* childTasks(task.id, true)));
    }
    return nested;
  });

/** Matches whichever identifier the actor carries — DID, email, or display name (case-insensitive). */
const matchesAssignee = (task: Task.Task, assignee: string): boolean => {
  const actor = task.assignee;
  if (!actor) {
    return false;
  }
  const needle = assignee.toLowerCase();
  return [actor.identityDid, actor.email, actor.name].some((value) => value?.toLowerCase() === needle);
};

const encodeCursor = (offset: number): string => `offset:${offset}`;

const decodeCursor = (cursor: string | undefined): number => {
  if (!cursor) {
    return 0;
  }
  const parsed = Number.parseInt(cursor.replace(/^offset:/, ''), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export default handler;
