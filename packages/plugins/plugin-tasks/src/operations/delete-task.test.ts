//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import createTask from './create-task';
import deleteTask from './delete-task';

describe('delete-task', () => {
  it.effect('sweeps the task and its sub-tasks out of the array', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parent } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Epic' });
      const { task: child } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Step',
        parentTask: Ref.make(parent),
      });
      const { task: kept } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Kept' });

      const { deleted } = yield* deleteTask.handler({ task: Ref.make(parent) });

      expect([...deleted].sort()).toEqual([child.id, parent.id].sort());
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([kept.id]);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );
});
