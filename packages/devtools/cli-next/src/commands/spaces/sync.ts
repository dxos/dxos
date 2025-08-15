//
// Copyright 2025 DXOS.org
//

import { Command, Options } from '@effect/cli';
import { Duration, Effect, Schedule } from 'effect';

import { getSpace, waitForSync } from '../../util';

const spaceId = Options.text('spaceId').pipe(Options.withDescription('The space ID to sync'));

const spaceTimeout = Options.integer('spaceTimeout').pipe(
  Options.withDescription('The timeout to wait for the space to be available in milliseconds.'),
  Options.withDefault(5000),
);

export const syncSpace = Effect.fn(function* ({ spaceId, spaceTimeout }: { spaceId: string; spaceTimeout: number }) {
  // If space is not available locally, wait for it to sync.
  const space = yield* getSpace(spaceId).pipe(
    Effect.retry(Schedule.fixed('100 millis')),
    Effect.timeout(Duration.millis(spaceTimeout)),
  );

  yield* waitForSync(space);
});

export const sync = Command.make('sync', { spaceId, spaceTimeout }, syncSpace).pipe(
  Command.withDescription('Wait for a space to be fully synchronized with EDGE.'),
);
