//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import createMilestone from './create-milestone';
import createTask from './create-task';
import deleteMilestone from './delete-milestone';

describe('delete-milestone', () => {
  it.effect('releases its tasks to the backlog instead of deleting them', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { milestone } = yield* createMilestone.handler({ taskSet: Ref.make(taskSet), name: 'Alpha' });
      const { task } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Survives',
        milestone: Ref.make(milestone),
      });

      const { releasedTasks } = yield* deleteMilestone.handler({ milestone: Ref.make(milestone) });

      expect(releasedTasks).toBe(1);
      expect(taskSet.milestones).toHaveLength(0);
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([task.id]);
      expect(task.milestone).toBeUndefined();
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );
});
