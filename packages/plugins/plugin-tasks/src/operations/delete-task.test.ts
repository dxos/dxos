//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import createTask from './create-task.ts';
import deleteTask from './delete-task.ts';

describe('delete-task', () => {
  it.effect('removes the task from its list and deletes its subtree', () =>
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
      expect(Obj.isDeleted(child)).toBe(true);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );

  it.effect("deleting a sub-task takes it out of its parent's list, leaving the parent", () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task: parent } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Epic' });
      const { task: child } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Step',
        parentTask: Ref.make(parent),
      });
      const { task: grandchild } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Detail',
        parentTask: Ref.make(child),
      });

      const { deleted } = yield* deleteTask.handler({ task: Ref.make(child) });

      expect([...deleted].sort()).toEqual([child.id, grandchild.id].sort());
      expect(parent.subtasks ?? []).toHaveLength(0);
      expect(Obj.isDeleted(parent)).toBe(false);
      expect(Obj.isDeleted(grandchild)).toBe(true);
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([parent.id]);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );
});
