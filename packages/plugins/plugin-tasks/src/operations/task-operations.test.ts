//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, EID, Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Task, TaskSet } from '@dxos/types';

import assignTask from './assign-task';
import completeTask from './complete-task';
import createTask from './create-task';
import updateTask from './update-task';

const testLayer = () =>
  TestDatabaseLayer({
    types: [Task.Task, TaskSet.TaskSet],
  });

describe('task operations', () => {
  it.effect('create-task defaults status and parents to the task set', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();

      const { task: snapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: '  Ship it  ' });
      const task = yield* loadTask(snapshot);

      expect(task.title).toBe('Ship it');
      expect(task.status).toBe('todo');
      expect(Obj.getParent(task)?.id).toBe(taskSet.id);

      const children = yield* Database.query(Query.select(Filter.id(taskSet.id)).children()).run;
      expect(children.map(({ id }) => id)).toContain(task.id);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('create-task parents a sub-task to its parent task', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parentSnapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Epic' });
      const parent = yield* loadTask(parentSnapshot);

      const { task: childSnapshot } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Step one',
        parent: Ref.make(parent),
      });
      const child = yield* loadTask(childSnapshot);

      expect(Obj.getParent(child)?.id).toBe(parent.id);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('update-task patches only the provided fields', () =>
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

  it.effect('complete-task marks done; assign-task sets the actor', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({}));
      yield* Database.flush();
      const { task: snapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Review' });
      const task = yield* loadTask(snapshot);

      yield* assignTask.handler({ task: Ref.make(task), assignee: { role: 'assistant', name: 'Scout' } });
      yield* completeTask.handler({ task: Ref.make(task) });

      expect(task.assignee).toMatchObject({ role: 'assistant', name: 'Scout' });
      expect(task.status).toBe('done');
    }).pipe(Effect.provide(testLayer())),
  );
});

/** Handlers return a JSON snapshot (wire-safe); reload the live object to assert graph state. */
const loadTask = (snapshot: unknown) =>
  Database.resolve(EID.parse(`echo:///${(snapshot as { id: string }).id}`), Task.Task);
