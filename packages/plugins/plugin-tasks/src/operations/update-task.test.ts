//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, EID, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import createTask from './create-task';
import updateTask from './update-task';

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

describe('update-task', () => {
  it.effect('patches only the provided fields', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task: snapshot } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Draft',
        priority: 'low',
      });
      const task = yield* loadTask(snapshot);

      yield* updateTask.handler({ task: Ref.make(task), status: 'in-progress', estimate: 3 });

      expect(task.title).toBe('Draft');
      expect(task.priority).toBe('low');
      expect(task.status).toBe('in-progress');
      expect(task.estimate).toBe(3);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('refuses to re-parent a task under its own sub-task', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parentSnapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Parent' });
      const parent = yield* loadTask(parentSnapshot);
      const { task: childSnapshot } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Child',
        parentTask: Ref.make(parent),
      });
      const child = yield* loadTask(childSnapshot);

      const exit = yield* Effect.exit(updateTask.handler({ task: Ref.make(parent), parentTask: Ref.make(child) }));
      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('promotes a sub-task back to a root with a null parentTask', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parentSnapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Parent' });
      const parent = yield* loadTask(parentSnapshot);
      const { task: childSnapshot } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Child',
        parentTask: Ref.make(parent),
      });
      const child = yield* loadTask(childSnapshot);

      yield* updateTask.handler({ task: Ref.make(child), parentTask: null });

      expect(child.parentTask).toBeUndefined();
      // Lifecycle follows: a root task cascades with the set, not with its former parent.
      expect(Obj.getParent(child)?.id).toBe(taskSet.id);
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([parent.id, child.id]);
    }).pipe(Effect.provide(testLayer())),
  );
});

/** Handlers return a JSON snapshot (wire-safe); reload the live object to assert graph state. */
const loadTask = (snapshot: unknown) =>
  Database.resolve(EID.parse(`echo:///${(snapshot as { id: string }).id}`), Task.Task);
