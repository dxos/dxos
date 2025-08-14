//
// Copyright 2025 DXOS.org
//

import { Command, Options } from '@effect/cli';
import { Duration, Effect, Option, Schedule } from 'effect';

import { SpaceId } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';

import { ClientService } from '../../services';
import { waitForSync } from '../../util';

const spaceId = Options.text('spaceId').pipe(Options.withDescription('The space ID to sync'));

const timeout = Options.integer('timeout').pipe(
  Options.withDescription('The timeout in milliseconds'),
  Options.withDefault(5000),
);

const getSpace = Effect.fn(function* (spaceId: SpaceId) {
  const client = yield* ClientService;
  return yield* Option.fromNullable(client.spaces.get(spaceId));
});

export const syncSpace = Effect.fn(function* ({ spaceId, timeout }: { spaceId: string; timeout: number }) {
  invariant(SpaceId.isValid(spaceId), 'Invalid space ID');

  // If space is not available locally, wait for it to sync.
  const space = yield* getSpace(spaceId).pipe(
    Effect.retry(Schedule.fixed('100 millis')),
    Effect.timeout(Duration.millis(timeout)),
  );

  yield* waitForSync(space);
});

export const sync = Command.make('sync', { spaceId, timeout }, syncSpace);
