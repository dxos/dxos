//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, EID, Ref } from '@dxos/echo';
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
      const { task: snapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Review' });
      const task = yield* loadTask(snapshot);

      yield* completeTask.handler({ task: Ref.make(task) });

      expect(task.status).toBe('done');
    }).pipe(Effect.provide(testLayer())),
  );
});

/** Handlers return a JSON snapshot (wire-safe); reload the live object to assert graph state. */
const loadTask = (snapshot: unknown) =>
  Database.resolve(EID.parse(`echo:///${(snapshot as { id: string }).id}`), Task.Task);
