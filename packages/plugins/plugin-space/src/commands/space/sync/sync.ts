//
// Copyright 2025 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schedule from 'effect/Schedule';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { Common, getSpace, syncAllToEdge, waitForSync, withTimeout } from '@dxos/cli-util';
import { type Key } from '@dxos/echo';

/** Sync the named space to EDGE, or every space of the identity when no id is given. */
export const handler = ({ spaceId, spaceTimeout }: { spaceId: Option.Option<Key.SpaceId>; spaceTimeout: number }) =>
  Effect.gen(function* () {
    // Every space rather than the default one: the spaces holding a profile's settings and
    // designations are the ones a user never names, and leaving them behind is what a bare
    // `dx space sync` is asked to prevent.
    if (Option.isNone(spaceId)) {
      return yield* syncAllToEdge();
    }

    // If space is not available locally, wait for it to sync.
    const space = yield* getSpace(spaceId.value).pipe(
      Effect.retry(Schedule.fixed('100 millis')),
      Effect.timeout(Duration.millis(spaceTimeout)),
    );

    yield* waitForSync(space);
  });

export const sync = Command.make(
  'sync',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    spaceTimeout: Options.integer('spaceTimeout').pipe(
      Options.withDescription('The timeout to wait for the space to be available in milliseconds.'),
      Options.withDefault(5000),
    ),
  },
  (options) => handler(options).pipe(withTimeout),
).pipe(
  Command.withDescription('Wait for a space to be fully synchronized with EDGE, or every space if none is given.'),
);
