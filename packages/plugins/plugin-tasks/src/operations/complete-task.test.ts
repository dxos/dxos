//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import completeTask from './complete-task';
import createTask from './create-task';

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

describe('complete-task', () => {
  it.effect('marks the task done', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Review' });

      yield* completeTask.handler({ task: Ref.make(task) });

      expect(task.status).toBe('done');
    }).pipe(Effect.provide(testLayer())),
  );
});
