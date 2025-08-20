//
// Copyright 2025 DXOS.org
//

import { Command, Options } from '@effect/cli';
import { Duration, Effect, Schedule } from 'effect';

import { getSpace, waitForSync, withTimeout } from '../../../util';
import { Common } from '../../options';

export const sync = Command.make(
  'sync',
  {
    spaceId: Common.spaceId,
    spaceTimeout: Options.integer('spaceTimeout').pipe(
      Options.withDescription('The timeout to wait for the space to be available in milliseconds.'),
      Options.withDefault(5000),
    ),
  },
  ({ spaceId, spaceTimeout }: { spaceId: string; spaceTimeout: number }) =>
    Effect.gen(function* () {
      // If space is not available locally, wait for it to sync.
      const space = yield* getSpace(spaceId).pipe(
        Effect.retry(Schedule.fixed('100 millis')),
        Effect.timeout(Duration.millis(spaceTimeout)),
      );

      yield* waitForSync(space);
    }).pipe(withTimeout),
).pipe(Command.withDescription('Wait for a space to be fully synchronized with EDGE.'));
