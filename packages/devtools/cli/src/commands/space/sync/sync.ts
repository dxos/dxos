//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';

import { getSpace, spaceIdWithDefault, waitForSync, withTimeout } from '../../../util';
import { Common } from '../../options';

export const sync = Command.make(
  'sync',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    spaceTimeout: Options.integer('spaceTimeout').pipe(
      Options.withDescription('The timeout to wait for the space to be available in milliseconds.'),
      Options.withDefault(5000),
    ),
  },
  ({ spaceId, spaceTimeout }) =>
    Effect.gen(function* () {
      // If space is not available locally, wait for it to sync.
      const resolvedSpaceId = yield* spaceIdWithDefault(spaceId);
      const space = yield* getSpace(resolvedSpaceId).pipe(
        Effect.retry(Schedule.fixed('100 millis')),
        Effect.timeout(Duration.millis(spaceTimeout)),
      );

      yield* waitForSync(space);
    }).pipe(withTimeout),
).pipe(Command.withDescription('Wait for a space to be fully synchronized with EDGE.'));
