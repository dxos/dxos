//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, EID, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import createMilestone from './create-milestone';
import createTask from './create-task';
import deleteMilestone from './delete-milestone';

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

describe('delete-milestone', () => {
  it.effect('releases its tasks to the backlog instead of deleting them', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { milestone: snapshot } = yield* createMilestone.handler({ taskSet: Ref.make(taskSet), name: 'Alpha' });
      const milestone = yield* loadMilestone(snapshot);
      const { task: taskSnapshot } = yield* createTask.handler({
        taskSet: Ref.make(taskSet),
        title: 'Survives',
        milestone: Ref.make(milestone),
      });
      const task = yield* loadTask(taskSnapshot);

      const { releasedTasks } = yield* deleteMilestone.handler({ milestone: Ref.make(milestone) });

      // Matches Linear/GitHub: removing a milestone is not a way to delete the work under it.
      expect(releasedTasks).toBe(1);
      expect(taskSet.milestones).toHaveLength(0);
      expect(taskSet.tasks.map((ref) => ref.target?.id)).toEqual([task.id]);
      expect(task.milestone).toBeUndefined();
    }).pipe(Effect.provide(testLayer())),
  );
});

/** Handlers return a JSON snapshot (wire-safe); reload the live object to assert graph state. */
const loadTask = (snapshot: unknown) =>
  Database.resolve(EID.parse(`echo:///${(snapshot as { id: string }).id}`), Task.Task);

const loadMilestone = (snapshot: unknown) =>
  Database.resolve(EID.parse(`echo:///${(snapshot as { id: string }).id}`), Milestone.Milestone);
