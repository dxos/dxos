//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';

import { formatSpace } from './util';

// TODO(burdon): Move handler inline and test separate functions.
export const handler = Effect.fn(function* () {
  const client = yield* ClientService;
  const spaces = client.spaces.get();
  const formattedSpaces = yield* Effect.all(spaces.map(formatSpace));
  yield* Console.log(JSON.stringify(formattedSpaces, null, 2));
});

export const list = Command.make('list', {}, handler).pipe(
  Command.withDescription('List all spaces available on this device.'),
);
