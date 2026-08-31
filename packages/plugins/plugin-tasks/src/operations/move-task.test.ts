//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import createTask from './create-task';
import moveTask from './move-task';

describe('move-task', () => {
  it.effect('reorders within the set, since array order is the task order', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const created = [];
      for (const title of ['a', 'b', 'c']) {
        const { task: snapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title });
        created.push(snapshot);
      }
      const [first, , third] = created;

      yield* moveTask.handler({ task: Ref.make(third), before: Ref.make(first) });
      expect(titles(TaskSet.resolveTasks(taskSet))).toEqual(['c', 'a', 'b']);

      yield* moveTask.handler({ task: Ref.make(third) });
      expect(titles(TaskSet.resolveTasks(taskSet))).toEqual(['a', 'b', 'c']);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );

  it.effect('re-parents and repositions in one call, so a drop is a single mutation', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const [first, second, third] = yield* seedTasks(taskSet, ['a', 'b', 'c']);

      // `c` becomes a child of `a`, positioned before `b` in the array.
      yield* moveTask.handler({ task: Ref.make(third), before: Ref.make(second), parentTask: Ref.make(first) });

      const tasks = TaskSet.resolveTasks(taskSet);
      expect(titles(tasks)).toEqual(['a', 'c', 'b']);
      expect(titles(Task.rootTasks(tasks))).toEqual(['a', 'b']);
      expect(titles(Task.subTasks(tasks, tasks[0]))).toEqual(['c']);

      // `null` promotes back to a root, still repositioning in the same call.
      yield* moveTask.handler({ task: Ref.make(third), parentTask: null });
      const promoted = TaskSet.resolveTasks(taskSet);
      expect(titles(promoted)).toEqual(['a', 'b', 'c']);
      expect(titles(Task.rootTasks(promoted))).toEqual(['a', 'b', 'c']);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );

  it.effect('a moved task keeps its sub-tasks: the subtree travels with it', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const [parent, child, grandchild, other] = yield* seedTasks(taskSet, ['a', 'b', 'c', 'd']);
      yield* moveTask.handler({ task: Ref.make(child), parentTask: Ref.make(parent) });
      yield* moveTask.handler({ task: Ref.make(grandchild), parentTask: Ref.make(child) });

      // `a` (holding b -> c) becomes a child of `d`. Only `a`'s own entry and parent ref are written;
      // the descendants' `parentTask` refs are untouched, which is what carries them along.
      yield* moveTask.handler({ task: Ref.make(parent), parentTask: Ref.make(other) });

      const tasks = TaskSet.resolveTasks(taskSet);
      expect(titles(Task.rootTasks(tasks))).toEqual(['d']);
      const [movedParent] = Task.subTasks(
        tasks,
        tasks.find(({ title }) => title === 'd')!,
      );
      expect(movedParent.title).toEqual('a');
      const [movedChild] = Task.subTasks(tasks, movedParent);
      expect(movedChild.title).toEqual('b');
      expect(titles(Task.subTasks(tasks, movedChild))).toEqual(['c']);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );

  it.effect('the optimistic reorder transform predicts the handler resulting order', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const [first, , third, fourth] = yield* seedTasks(taskSet, ['a', 'b', 'c', 'd']);

      // Anchored move: `TaskSetArticle`'s overlay entry must render the exact order the handler
      // commits, otherwise the list would still jump when the query re-emits.
      const anchored = TaskSet.reorderItems(TaskSet.resolveTasks(taskSet), (row) => row.id, third.id, first.id);
      yield* moveTask.handler({ task: Ref.make(third), before: Ref.make(first) });
      expect(titles(TaskSet.resolveTasks(taskSet))).toEqual(titles(anchored));

      // Unanchored move to the end.
      const unanchored = TaskSet.reorderItems(TaskSet.resolveTasks(taskSet), (row) => row.id, fourth.id, undefined);
      yield* moveTask.handler({ task: Ref.make(fourth) });
      expect(titles(TaskSet.resolveTasks(taskSet))).toEqual(titles(unanchored));
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );

  it.effect('rejects a parent inside its own subtree, leaving the order untouched', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const [parent, child, other] = yield* seedTasks(taskSet, ['a', 'b', 'c']);
      yield* moveTask.handler({ task: Ref.make(child), parentTask: Ref.make(parent) });
      const before = titles(TaskSet.resolveTasks(taskSet));

      const result = yield* Effect.exit(
        moveTask.handler({ task: Ref.make(parent), before: Ref.make(other), parentTask: Ref.make(child) }),
      );
      expect(result._tag).toEqual('Failure');
      // The reorder must not have run either: the whole gesture is rejected, not half-applied.
      expect(titles(TaskSet.resolveTasks(taskSet))).toEqual(before);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );
});

const seedTasks = (taskSet: TaskSet.TaskSet, names: string[]) =>
  Effect.gen(function* () {
    const created: Task.Task[] = [];
    for (const title of names) {
      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title });
      created.push(task);
    }
    return created;
  });

const titles = (tasks: readonly Task.Task[]): (string | undefined)[] => tasks.map((task) => task.title);
