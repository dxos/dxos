//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import assignTask from './assign-task';
import completeTask from './complete-task';
import createMilestone from './create-milestone';
import createTask from './create-task';
import listTasks from './list-tasks';

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

describe('list-tasks', () => {
  it.effect('filters by status and assignee, and excludes sub-tasks by default', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();

      const { task: done } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Done thing' });
      yield* completeTask.handler({ task: Ref.make(done) });
      const { task: open } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Open thing' });
      yield* assignTask.handler({ task: Ref.make(open), assignee: { email: 'kai@example.com' } });
      yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Sub thing', parentTask: Ref.make(open) });

      // Root tasks only.
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
