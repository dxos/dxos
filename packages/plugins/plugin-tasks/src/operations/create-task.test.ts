//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, EID, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import createMilestone from './create-milestone';
import createTask from './create-task';

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

describe('create-task', () => {
  it.effect("defaults status and joins the set's tasks array", () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();

      const { task: snapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: '  Ship it  ' });
      const task = yield* loadTask(snapshot);

      expect(task.title).toBe('Ship it');
      expect(task.status).toBe('todo');
      // Membership is the array; the parent edge rides along so the task cascades with the set.
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([task.id]);
      expect(Obj.getParent(task)?.id).toBe(taskSet.id);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('a sub-task joins the same flat array and points at its parent', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parentSnapshot } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Epic' });
      const parent = yield* loadTask(parentSnapshot);

      const { task: childSnapshot } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Step one',
        parentTask: Ref.make(parent),
      });
      const child = yield* loadTask(childSnapshot);

      expect(child.parentTask?.target?.id).toBe(parent.id);
      // Flat: enumerating the set is one array read, sub-tasks included.
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([parent.id, child.id]);
      expect(TaskSet.rootTasks(TaskSet.resolveTasks(taskSet)).map((task) => task.id)).toEqual([parent.id]);
      // The parent edge follows the hierarchy so the sub-task cascades with its parent task.
      expect(Obj.getParent(child)?.id).toBe(parent.id);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect("a task cannot be filed under another set's milestone", () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Ours' }));
      const other = yield* Database.add(TaskSet.make({ name: 'Theirs' }));
      yield* Database.flush();
      const { milestone: snapshot } = yield* createMilestone.handler({ taskSet: Ref.make(other), name: 'Foreign' });
      const foreign = yield* loadMilestone(snapshot);

      const exit = yield* Effect.exit(
        createTask.handler({ taskSet: Ref.make(taskSet), title: 'Nope', milestone: Ref.make(foreign) }),
      );
      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(testLayer())),
  );
});

/** Handlers return a JSON snapshot (wire-safe); reload the live object to assert graph state. */
const loadTask = (snapshot: unknown) =>
  Database.resolve(EID.parse(`echo:///${(snapshot as { id: string }).id}`), Task.Task);

const loadMilestone = (snapshot: unknown) =>
  Database.resolve(EID.parse(`echo:///${(snapshot as { id: string }).id}`), Milestone.Milestone);
