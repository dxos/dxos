//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig, formatSpace, printSpace } from '@dxos/cli-util';
import { printList } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';

// TODO(burdon): Move handler inline and test separate functions.
export const handler = Effect.fn(function* ({ wait }: { wait: Option.Option<number> }) {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;
  const spaces = client.spaces.get();
  const waitSeconds = Option.getOrElse(wait, () => 0);
  const formattedSpaces = yield* Effect.all(spaces.map((space) => formatSpace(space, { waitSeconds })));

  if (json) {
    yield* Console.log(JSON.stringify(formattedSpaces, null, 2));
  } else {
    const formatted = formattedSpaces.map(printSpace);
    yield* Console.log(printList(formatted));
  }
});

export const list = Command.make(
  'list',
  {
    wait: Options.integer('wait').pipe(
      Options.withDescription(
        'Wait up to this many seconds for each space to reach SPACE_READY before reading. Default 0 — print whatever state is available immediately so a stuck space cannot hang the command.',
      ),
      Options.optional,
    ),
  },
  handler,
).pipe(Command.withDescription('List all spaces available on this device.'));
