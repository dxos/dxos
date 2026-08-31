//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestDatabaseLayer, testStoragePath } from '@dxos/echo-client/testing';
import { PublicKey, URI } from '@dxos/keys';
import { Milestone, Task, TaskSet } from '@dxos/types';

import createMilestone from './create-milestone';
import createTask from './create-task';
import listTasks from './list-tasks';
import updateTask from './update-task';

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

describe('list-tasks', () => {
  it.effect('filters by status and assignee, and excludes sub-tasks by default', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();

      const { task: done } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Done thing' });
      yield* updateTask.handler({ task: Ref.make(done), status: 'done' });
      const { task: open } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Open thing' });
      yield* updateTask.handler({ task: Ref.make(open), assignee: { email: 'kai@example.com' } });
      yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Sub thing', parentTask: Ref.make(open) });

      const all = yield* listTasks.handler({ taskSet: Ref.make(taskSet) });
      expect(titles(all.tasks)).toEqual(['Done thing', 'Open thing']);

      const withSubtasks = yield* listTasks.handler({ taskSet: Ref.make(taskSet), includeSubtasks: true });
      expect(titles(withSubtasks.tasks).sort()).toEqual(['Done thing', 'Open thing', 'Sub thing']);

      const byStatus = yield* listTasks.handler({ taskSet: Ref.make(taskSet), status: 'done' });
      expect(titles(byStatus.tasks)).toEqual(['Done thing']);

      const byAssignee = yield* listTasks.handler({ taskSet: Ref.make(taskSet), assignee: 'KAI@example.com' });
      expect(titles(byAssignee.tasks)).toEqual(['Open thing']);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('pages with after/limit and stops issuing a cursor at the end', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      for (const title of ['a', 'b', 'c']) {
        yield* createTask.handler({ taskSet: Ref.make(taskSet), title });
      }

      const first = yield* listTasks.handler({ taskSet: Ref.make(taskSet), limit: 2 });
      expect(first.tasks).toHaveLength(2);
      expect(first.nextCursor).toBeDefined();

      const second = yield* listTasks.handler({ taskSet: Ref.make(taskSet), limit: 2, after: first.nextCursor });
      expect(second.tasks).toHaveLength(1);
      expect(second.nextCursor).toBeUndefined();

      expect([...titles(first.tasks), ...titles(second.tasks)].sort()).toEqual(['a', 'b', 'c']);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('requires a container', () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(listTasks.handler({}));
      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect(
    'lists tasks written by a previous session, skipping a dangling ref',
    Effect.fnUntraced(function* () {
      const spaceKey = PublicKey.random();
      const storagePath = testStoragePath({ name: `list-tasks-fresh-session-${Date.now()}` });
      const sessionLayer = () =>
        TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet], spaceKey, storagePath });

      yield* Effect.gen(function* () {
        const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
        yield* Database.flush();
        yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'First' });
        yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Second' });

        const { db } = yield* Database.Service;
        Obj.update(taskSet, (taskSet) => {
          taskSet.tasks = [...taskSet.tasks, db.makeRef(URI.make('echo:///01M122P4GNVZ1P982K1K0QG8AY'))];
        });
        yield* Database.flush();
      }).pipe(Effect.provide(sessionLayer()));

      yield* Effect.gen(function* () {
        const sets = yield* Database.query(Query.select(Filter.type(TaskSet.TaskSet))).run;
        expect(sets).toHaveLength(1);

        const { tasks } = yield* listTasks.handler({ taskSet: Ref.make(sets[0]) });
        expect(titles(tasks).sort()).toEqual(['First', 'Second']);
      }).pipe(Effect.provide(sessionLayer()));
    }),
  );

  it.effect('filters by milestone', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { milestone } = yield* createMilestone.handler({ taskSet: Ref.make(taskSet), name: 'Alpha' });
      yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Filed', milestone: Ref.make(milestone) });
      yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Unfiled' });

      const filed = yield* listTasks.handler({ taskSet: Ref.make(taskSet), milestone: Ref.make(milestone) });

      expect(titles(filed.tasks)).toEqual(['Filed']);
    }).pipe(Effect.provide(testLayer())),
  );
});

const titles = (tasks: readonly Task.Task[]): (string | undefined)[] => tasks.map((task) => task.title);
