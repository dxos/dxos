//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import moveMilestone from './move-milestone';

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

describe('move-milestone', () => {
  it.effect('inserts before the anchor, since array order is the milestone sequence', () =>
    Effect.gen(function* () {
      const { taskSet, milestones } = yield* seed(['alpha', 'beta', 'gamma']);
      const [alpha, , gamma] = milestones;

      yield* moveMilestone.handler({ milestone: Ref.make(gamma), before: Ref.make(alpha) });

      expect(names(taskSet)).toEqual(['gamma', 'alpha', 'beta']);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('an omitted anchor moves to the end', () =>
    Effect.gen(function* () {
      const { taskSet, milestones } = yield* seed(['alpha', 'beta', 'gamma']);
      const [alpha] = milestones;

      yield* moveMilestone.handler({ milestone: Ref.make(alpha) });

      expect(names(taskSet)).toEqual(['beta', 'gamma', 'alpha']);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('anchoring a milestone on itself leaves the sequence alone', () =>
    Effect.gen(function* () {
      const { taskSet, milestones } = yield* seed(['alpha', 'beta']);
      const [alpha] = milestones;

      yield* moveMilestone.handler({ milestone: Ref.make(alpha), before: Ref.make(alpha) });

      expect(names(taskSet)).toEqual(['alpha', 'beta']);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('a milestone belonging to no set is rejected rather than silently dropped', () =>
    Effect.gen(function* () {
      const orphan = yield* Database.add(Milestone.make({ name: 'orphan' }));
      yield* Database.flush();

      const exit = yield* Effect.exit(moveMilestone.handler({ milestone: Ref.make(orphan) }));

      expect(exit._tag).toBe('Failure');
      expect(String(exit)).toContain('InvalidOperationInput');
    }).pipe(Effect.provide(testLayer())),
  );
});

const seed = (names: readonly string[]) =>
  Effect.gen(function* () {
    const taskSet = yield* Database.add(TaskSet.make({ name: 'Roadmap' }));
    const milestones = [];
    for (const name of names) {
      const milestone = yield* Database.add(Milestone.make({ name }));
      TaskSet.addMilestoneToSet(taskSet, milestone);
      milestones.push(milestone);
    }
    yield* Database.flush();
    return { taskSet, milestones };
  });

const names = (taskSet: TaskSet.TaskSet): (string | undefined)[] => taskSet.milestones.map((ref) => ref.target?.name);
