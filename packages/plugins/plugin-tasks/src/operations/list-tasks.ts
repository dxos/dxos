//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, type Obj, type Ref } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors.ts';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const handler: Operation.WithHandler<typeof TaskOperation.ListTasks> = TaskOperation.ListTasks.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      taskSet: taskSetRef,
      project,
      status,
      assignee,
      milestone,
      includeSubtasks,
      after,
      limit,
    }) {
      if (!taskSetRef && !project) {
        return yield* Effect.fail(new InvalidOperationInput({ message: 'Provide either `taskSet` or `project`.' }));
      }
      if (taskSetRef && project) {
        return yield* Effect.fail(
          new InvalidOperationInput({ message: 'Provide exactly one of `taskSet` or `project`.' }),
        );
      }

      let taskSet: TaskSet.TaskSet | undefined;
      if (taskSetRef) {
        taskSet = yield* Database.load(taskSetRef);
      } else if (project) {
        const projectObject = yield* Database.load(project);
        // Read the ref structurally: `Project` lives in @dxos/compute, which plugin-tasks must
        // not depend on (it would invert the publishable-plugin dependency direction).
        const ref = (projectObject as { taskSet?: Ref.Ref<Obj.Unknown> }).taskSet;
        taskSet = ref
          ? ((yield* Database.load(ref).pipe(Effect.orElseSucceed(() => undefined))) as TaskSet.TaskSet | undefined)
          : undefined;
      }

      // Loaded, not resolved: cold refs dropped from the list would silently shorten it.
      const all = taskSet ? yield* TaskSet.loadTasks(taskSet) : [];
      const scoped = includeSubtasks ? all : Task.rootTasks(all);
      // Resolved against the whole set, not `scoped`: a root task's milestone can only be its own,
      // but the inheritance walk still has to see every ancestor.
      // Loaded, not read off `.target`: an unresolved ref would leave `milestoneId` undefined and
      // silently return every task instead of the filtered set.
      const milestoneId = milestone ? (yield* Database.load(milestone)).id : undefined;
      // Built once — `effectiveMilestoneId` maps the whole set per call, so filtering with it is quadratic.
      const milestoneIds = milestoneId === undefined ? undefined : Task.effectiveMilestoneIds(all);
      const filtered = scoped.filter(
        (task) =>
          (status === undefined || (task.status ?? 'todo') === status) &&
          (assignee === undefined || matchesAssignee(task, assignee)) &&
          (milestoneId === undefined || milestoneIds?.get(task.id) === milestoneId),
      );

      const pageSize = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
      const offset = decodeCursor(after);
      const page = filtered.slice(offset, offset + pageSize);
      const nextOffset = offset + page.length;

      return {
        tasks: page,
        nextCursor: nextOffset < filtered.length ? encodeCursor(nextOffset) : undefined,
      };
    }),
  ),
);

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
