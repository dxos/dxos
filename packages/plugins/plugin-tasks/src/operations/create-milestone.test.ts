//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import createMilestone from './create-milestone';

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

      const alpha = first;
      const beta = second;
      expect(alpha.name).toBe('Alpha');
      expect(alpha.description).toBe('Ships to staging');
      expect(taskSet.milestones.map((ref) => ref.target?.id)).toEqual([alpha.id, beta.id]);
      expect(Obj.getParent(alpha)?.id).toBe(taskSet.id);
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }))),
  );
});
