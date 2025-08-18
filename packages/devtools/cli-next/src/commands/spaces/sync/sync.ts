//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { Duration, Effect, Schedule } from 'effect';

import { getSpace, waitForSync } from '../../../util';
import { Common } from '../../options';

const spaceId = Common.spaceId;
const timeout = Common.timeout;

export const sync = Command.make(
  'sync',
  {
    spaceId,
    timeout,
  },
  Effect.fn(function* ({ spaceId, timeout }: { spaceId: string; timeout: number }) {
    // If space is not available locally, wait for it to sync.
    const space = yield* getSpace(spaceId).pipe(
      Effect.retry(Schedule.fixed('100 millis')),
      Effect.timeout(Duration.millis(timeout)),
    );

    yield* waitForSync(space);
  }),
).pipe(Command.withDescription('Wait for a space to be fully synchronized with EDGE.'));
