//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import createMilestone from './create-milestone.ts';
import createTask from './create-task.ts';

describe('create-task', () => {
  it.effect("defaults status and joins the set's tasks array", () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();

      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: '  Ship it  ' });

      expect(task.title).toBe('Ship it');
      expect(task.status).toBe('todo');
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([task.id]);
      expect(Obj.getParent(task)?.id).toBe(taskSet.id);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );

  it.effect('a sub-task joins the same flat array and points at its parent', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parent } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Epic' });

      const { task: child } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Step one',
        parentTask: Ref.make(parent),
      });

      expect(child.parentTask?.target?.id).toBe(parent.id);
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([parent.id, child.id]);
      expect(Task.rootTasks(TaskSet.resolveTasks(taskSet)).map((task) => task.id)).toEqual([parent.id]);
      // The parent edge means membership: a sub-task is parented to the set, not its `parentTask`.
      expect(Obj.getParent(child)?.id).toBe(taskSet.id);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );

  it.effect("a task cannot be filed under another set's milestone", () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Ours' }));
      const other = yield* Database.add(TaskSet.make({ name: 'Theirs' }));
      yield* Database.flush();
      const { milestone: foreign } = yield* createMilestone.handler({ taskSet: Ref.make(other), name: 'Foreign' });

      const exit = yield* Effect.exit(
        createTask.handler({ taskSet: Ref.make(taskSet), title: 'Nope', milestone: Ref.make(foreign) }),
      );
      expect(exit._tag).toBe('Failure');
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );
});
