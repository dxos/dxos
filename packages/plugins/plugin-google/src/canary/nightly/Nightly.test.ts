//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { Nightly } from './Nightly.ts';

describe('Nightly.run', () => {
  test('reports a copy still missing when the wait ends, however recently it was seeded', async ({ expect }) => {
    const seeded = { gmailId: 'copy-1', insertedAt: Date.now(), subject: 'Re: forecast', sender: 'a@enron.com' };
    const nightly = new Nightly({
      seeder: { rotate: () => Effect.succeed({ poolSize: 1, seeded: [seeded], trashed: 1 }) },
      space: { spaceId: 'space', snapshot: () => Effect.succeed({ invocations: [], messages: [], triggers: [] }) },
    });

    const report = await EffectEx.runPromise(
      nightly.run({
        count: 1,
        syncTimeout: Duration.millis(50),
        pollInterval: Duration.millis(10),
        window: Duration.hours(25),
      }),
    );
    const arrival = report.checks.find((check) => check.id === 'C5');
    expect(arrival?.failures).toEqual([expect.objectContaining({ gmailId: 'copy-1' })]);
    expect(report.syncMinutes).toBeUndefined();
  });
});
