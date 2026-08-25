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
import listMilestones from './list-milestones';
import updateTask from './update-task';

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

describe('list-milestones', () => {
  it.effect('sequences the set and reports progress derived from its tasks', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { milestone } = yield* createMilestone.handler({
        taskSet: Ref.make(taskSet),
        name: 'Alpha',
        description: 'Ships to staging',
      });

      const { task: done } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Done',
        milestone: Ref.make(milestone),
      });
      yield* updateTask.handler({ task: Ref.make(done), status: 'done' });
      yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Open', milestone: Ref.make(milestone) });
      yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Unfiled' });

      const { milestones } = yield* listMilestones.handler({ taskSet: Ref.make(taskSet) });

      expect(milestones).toEqual([
        { id: milestone.id, name: 'Alpha', description: 'Ships to staging', targetDate: undefined, total: 2, done: 1 },
      ]);
    }).pipe(Effect.provide(testLayer())),
  );
});
