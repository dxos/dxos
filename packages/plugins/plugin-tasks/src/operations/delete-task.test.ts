//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, EID, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import createTask from './create-task';
import deleteTask from './delete-task';

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

describe('delete-task', () => {
  it.effect('sweeps the task and its sub-tasks out of the array', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parentSnapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Epic' });
      const parent = yield* loadTask(parentSnapshot);
      const { task: childSnapshot } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Step',
        parentTask: Ref.make(parent),
      });
      const child = yield* loadTask(childSnapshot);
      const { task: keptSnapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Kept' });
      const kept = yield* loadTask(keptSnapshot);

      const { deleted } = yield* deleteTask.handler({ task: Ref.make(parent) });

      // The database cascade takes the sub-task, so the array sweep must take it too — otherwise
      // the set keeps a ref to an object that no longer exists.
      expect([...deleted].sort()).toEqual([child.id, parent.id].sort());
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([kept.id]);
    }).pipe(Effect.provide(testLayer())),
  );
});

/** Handlers return a JSON snapshot (wire-safe); reload the live object to assert graph state. */
const loadTask = (snapshot: unknown) =>
  Database.resolve(EID.parse(`echo:///${(snapshot as { id: string }).id}`), Task.Task);
