//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Filter, Query, Ref } from '@dxos/echo';
import { TestDatabaseLayer, testStoragePath } from '@dxos/echo-client/testing';
import { PublicKey } from '@dxos/keys';
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

  it.effect(
    'sequences milestones written by a previous session, with progress',
    Effect.fnUntraced(function* () {
      const spaceKey = PublicKey.random();
      const storagePath = testStoragePath({ name: `list-milestones-fresh-session-${Date.now()}` });
      const sessionLayer = () =>
        TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet], spaceKey, storagePath });

      yield* Effect.gen(function* () {
        const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
        yield* Database.flush();
        const { milestone } = yield* createMilestone.handler({ taskSet: Ref.make(taskSet), name: 'Alpha' });
        yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Filed', milestone: Ref.make(milestone) });
        yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Unfiled' });
      }).pipe(Effect.provide(sessionLayer()));

      yield* Effect.gen(function* () {
        const sets = yield* Database.query(Query.select(Filter.type(TaskSet.TaskSet))).run;
        expect(sets).toHaveLength(1);

        const { milestones } = yield* listMilestones.handler({ taskSet: Ref.make(sets[0]) });
        expect(milestones.map(({ name, total, done }) => ({ name, total, done }))).toEqual([
          { name: 'Alpha', total: 1, done: 0 },
        ]);
      }).pipe(Effect.provide(sessionLayer()));
    }),
  );
});
