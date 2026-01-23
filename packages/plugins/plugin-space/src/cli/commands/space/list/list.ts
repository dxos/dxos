//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig, formatSpace, printSpace } from '@dxos/cli-util';
import { printList } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';

// TODO(burdon): Move handler inline and test separate functions.
export const handler = Effect.fn(function* () {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;
  const spaces = client.spaces.get();
  const formattedSpaces = yield* Effect.all(spaces.map(formatSpace));

  if (json) {
    yield* Console.log(JSON.stringify(formattedSpaces, null, 2));
  } else {
    const formatted = formattedSpaces.map(printSpace);
    yield* Console.log(printList(formatted));
  }
});

export const list = Command.make('list', {}, handler).pipe(
  Command.withDescription('List all spaces available on this device.'),
);
