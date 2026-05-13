//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig, Common, formatSpace, getSpace, print, printSpace, spaceIdWithDefault } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { type Key } from '@dxos/echo';

export const handler = Effect.fn(function* ({
  spaceId,
  wait,
}: {
  spaceId: Option.Option<string>;
  wait: Option.Option<number>;
}) {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;

  const resolvedSpaceId = yield* spaceIdWithDefault(spaceId as Option.Option<Key.SpaceId>);
  const space = yield* getSpace(resolvedSpaceId);

  const waitSeconds = Option.getOrElse(wait, () => 0);
  const formatted = yield* formatSpace(space, { waitSeconds });

  if (json) {
    yield* Console.log(JSON.stringify(formatted, null, 2));
  } else {
    yield* Console.log(print(printSpace(formatted)));
  }
});

export const info = Command.make(
  'info',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    wait: Options.integer('wait').pipe(
      Options.withDescription(
        'Wait up to this many seconds for the space to reach SPACE_READY. Default 0 — read whatever state is available immediately.',
      ),
      Options.optional,
    ),
  },
  handler,
).pipe(Command.withDescription('Show space info.'));
