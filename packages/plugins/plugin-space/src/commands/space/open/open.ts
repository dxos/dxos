//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { CommandConfig, Common, getSpace, waitForSync } from '@dxos/cli-util';
import { type Key } from '@dxos/echo';

export const handler = ({ spaceId }: { spaceId: Key.SpaceId }) =>
  Effect.gen(function* () {
    const { json } = yield* CommandConfig;
    const space = yield* getSpace(spaceId);
    yield* Effect.tryPromise(() => space.open());

    // Flush and sync after opening
    yield* Effect.tryPromise(() => space.db.flush());
    yield* waitForSync(space);

    if (json) {
      yield* Console.log(JSON.stringify({ success: true, spaceId }, null, 2));
    } else {
      yield* Console.log(`Space ${spaceId} opened successfully.`);
    }
  });

export const open = Command.make(
  'open',
  {
    spaceId: Common.spaceId.pipe(Options.withDescription('Space ID to open.')),
  },
  handler,
).pipe(Command.withDescription('Open a space.'));
