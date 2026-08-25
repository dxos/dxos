//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import assignTask from './assign-task';
import createTask from './create-task';

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

describe('assign-task', () => {
  it.effect('sets the actor', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Review' });

      yield* assignTask.handler({ task: Ref.make(task), assignee: { role: 'assistant', name: 'Scout' } });

      expect(task.assignee).toMatchObject({ role: 'assistant', name: 'Scout' });
    }).pipe(Effect.provide(testLayer())),
  );
});
