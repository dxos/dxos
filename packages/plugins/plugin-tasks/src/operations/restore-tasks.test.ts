//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import createTask from './create-task.ts';
import deleteTask from './delete-task.ts';
import restoreTasks from './restore-tasks.ts';

describe('restore-tasks', () => {
  it.effect('puts the subtree back at the positions it held', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: first } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'First' });
      const { task: parent } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Epic' });
      const { task: child } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Step',
        parentTask: Ref.make(parent),
      });
      const { task: last } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Last' });

      const { restore } = yield* deleteTask.handler({ task: Ref.make(parent) });
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([first.id, last.id]);

      yield* restoreTasks.handler(restore);

      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([first.id, parent.id, child.id, last.id]);
      expect(Obj.isDeleted(parent)).toBe(false);
      expect(Obj.isDeleted(child)).toBe(false);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );

  it.effect('restores a task that belonged to no set', () =>
    Effect.gen(function* () {
      const task = yield* Database.add(Task.make({ title: 'Loose', status: 'todo' }));
      yield* Database.flush();

      const { restore } = yield* deleteTask.handler({ task: Ref.make(task) });
      expect(Obj.isDeleted(task)).toBe(true);

      yield* restoreTasks.handler(restore);
      expect(Obj.isDeleted(task)).toBe(false);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );
});
