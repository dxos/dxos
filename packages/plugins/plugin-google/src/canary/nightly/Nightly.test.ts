//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { Nightly } from './Nightly.ts';

describe('Nightly.run', () => {
  test('refuses a sync timeout shorter than the arrival grace before seeding', async ({ expect }) => {
    let rotated = false;
    const nightly = new Nightly({
      seeder: {
        rotate: () => Effect.sync(() => (rotated = true)).pipe(Effect.as({ poolSize: 0, seeded: [], trashed: 0 })),
      },
      space: { spaceId: 'space', snapshot: () => Effect.succeed({ invocations: [], messages: [], triggers: [] }) },
    });

    const exit = await EffectEx.runPromise(
      nightly
        .run({
          count: 1,
          syncTimeout: Duration.minutes(10),
          pollInterval: Duration.seconds(1),
          window: Duration.hours(25),
        })
        .pipe(Effect.exit),
    );
    expect(Exit.isFailure(exit)).toBe(true);
    expect(rotated).toBe(false);
  });
});
