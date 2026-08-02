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
import listTasks from './list-tasks';
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

  it.effect('list-tasks filters by status and assignee, and excludes sub-tasks by default', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();

      const { task: doneSnapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Done thing' });
      const done = yield* loadTask(doneSnapshot);
      yield* completeTask.handler({ task: Ref.make(done) });
      const { task: openSnapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Open thing' });
      const open = yield* loadTask(openSnapshot);
      yield* assignTask.handler({ task: Ref.make(open), assignee: { email: 'kai@example.com' } });
      yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Sub thing', parent: Ref.make(open) });

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

  it.effect('list-tasks pages with after/limit and stops issuing a cursor at the end', () =>
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

  it.effect('list-tasks requires a container', () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(listTasks.handler({}));
      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(testLayer())),
  );
});

/** Titles off the JSON snapshots the handler returns. */
const titles = (tasks: readonly unknown[]): string[] => tasks.map((task) => (task as { title: string }).title);

/** Handlers return a JSON snapshot (wire-safe); reload the live object to assert graph state. */
const loadTask = (snapshot: unknown) =>
  Database.resolve(EID.parse(`echo:///${(snapshot as { id: string }).id}`), Task.Task);
