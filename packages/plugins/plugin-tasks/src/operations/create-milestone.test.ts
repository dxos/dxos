//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, EID, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import createMilestone from './create-milestone';

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

describe('create-milestone', () => {
  it.effect("appends to the set's milestone sequence", () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();

      const { milestone: first } = yield* createMilestone.handler({
        taskSet: Ref.make(taskSet),
        name: 'Alpha',
        description: 'Ships to staging',
      });
      const { milestone: second } = yield* createMilestone.handler({ taskSet: Ref.make(taskSet), name: 'Beta' });

      const alpha = yield* loadMilestone(first);
      const beta = yield* loadMilestone(second);
      expect(alpha.name).toBe('Alpha');
      expect(alpha.description).toBe('Ships to staging');
      // Sequence is the array order, so a new milestone lands at the end.
      expect(taskSet.milestones.map((ref) => ref.target?.id)).toEqual([alpha.id, beta.id]);
      expect(Obj.getParent(alpha)?.id).toBe(taskSet.id);
    }).pipe(Effect.provide(testLayer())),
  );
});

const loadMilestone = (snapshot: unknown) =>
  Database.resolve(EID.parse(`echo:///${(snapshot as { id: string }).id}`), Milestone.Milestone);
