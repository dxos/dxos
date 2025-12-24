//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig, Common, getSpace, waitForSync } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { type Key } from '@dxos/echo';

export const handler = ({ spaceId }: { spaceId: Key.SpaceId }) =>
  Effect.gen(function* () {
    const { json } = yield* CommandConfig;
    const client = yield* ClientService;

    const space = yield* getSpace(spaceId);

    // Flush and sync before closing
    yield* Effect.tryPromise(() => space.db.flush({ indexes: true }));
    yield* waitForSync(space);

    yield* Effect.tryPromise(() => space.close());

    if (json) {
      yield* Console.log(JSON.stringify({ success: true, spaceId }, null, 2));
    } else {
      yield* Console.log(`Space ${spaceId} closed successfully.`);
    }
  });

export const close = Command.make(
  'close',
  {
    spaceId: Common.spaceId.pipe(Options.withDescription('Space ID to close.')),
  },
  handler,
).pipe(Command.withDescription('Close a space.'));
