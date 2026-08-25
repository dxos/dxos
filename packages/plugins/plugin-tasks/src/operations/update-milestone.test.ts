//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import updateMilestone from './update-milestone';

const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

describe('update-milestone', () => {
  it.effect('patches only the provided fields', () =>
    Effect.gen(function* () {
      const milestone = yield* seed();

      yield* updateMilestone.handler({ milestone: Ref.make(milestone), name: 'Beta' });

      expect(milestone.name).toBe('Beta');
      // Omitted fields are untouched, so a partial patch cannot blank the rest of the milestone.
      expect(milestone.description).toBe('Feature complete.');
      expect(milestone.targetDate).toBe('2026-03-01');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('a null target date clears it, which undefined cannot express', () =>
    Effect.gen(function* () {
      const milestone = yield* seed();

      yield* updateMilestone.handler({ milestone: Ref.make(milestone), targetDate: null });

      expect(milestone.targetDate).toBeUndefined();
      expect(milestone.name).toBe('Alpha');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('an empty patch is a no-op', () =>
    Effect.gen(function* () {
      const milestone = yield* seed();

      yield* updateMilestone.handler({ milestone: Ref.make(milestone) });

      expect(milestone.name).toBe('Alpha');
      expect(milestone.description).toBe('Feature complete.');
      expect(milestone.targetDate).toBe('2026-03-01');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('returns the updated milestone as a plain snapshot', () =>
    Effect.gen(function* () {
      const seeded = yield* seed();

      const { milestone } = yield* updateMilestone.handler({ milestone: Ref.make(seeded), name: 'Beta' });

      // Serialized on the way out, so a remote caller reads values rather than a live proxy.
      expect(milestone).toMatchObject({ name: 'Beta', description: 'Feature complete.' });
    }).pipe(Effect.provide(testLayer())),
  );
});

const seed = () =>
  Effect.gen(function* () {
    const milestone = yield* Database.add(
      Milestone.make({ name: 'Alpha', description: 'Feature complete.', targetDate: '2026-03-01' }),
    );
    yield* Database.flush();
    return milestone;
  });
