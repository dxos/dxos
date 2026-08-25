//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, EID, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import completeTask from './complete-task';
import createMilestone from './create-milestone';
import createTask from './create-task';
import listMilestones from './list-milestones';

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

describe('list-milestones', () => {
  it.effect('sequences the set and reports progress derived from its tasks', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { milestone: snapshot } = yield* createMilestone.handler({
        taskSet: Ref.make(taskSet),
        name: 'Alpha',
        description: 'Ships to staging',
      });
      const milestone = yield* loadMilestone(snapshot);

      const { task: doneSnapshot } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Done',
        milestone: Ref.make(milestone),
      });
      yield* completeTask.handler({ task: Ref.make(yield* loadTask(doneSnapshot)) });
      yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Open', milestone: Ref.make(milestone) });
      yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Unfiled' });

      const { milestones } = yield* listMilestones.handler({ taskSet: Ref.make(taskSet) });

      // Progress is derived, so a milestone cannot disagree with the work filed under it — and the
      // unfiled task counts toward nothing.
      expect(milestones).toEqual([
        { id: milestone.id, name: 'Alpha', description: 'Ships to staging', targetDate: undefined, total: 2, done: 1 },
      ]);
    }).pipe(Effect.provide(testLayer())),
  );
});

/** Handlers return a JSON snapshot (wire-safe); reload the live object to assert graph state. */
const loadTask = (snapshot: unknown) =>
  Database.resolve(EID.parse(`echo:///${(snapshot as { id: string }).id}`), Task.Task);

const loadMilestone = (snapshot: unknown) =>
  Database.resolve(EID.parse(`echo:///${(snapshot as { id: string }).id}`), Milestone.Milestone);
