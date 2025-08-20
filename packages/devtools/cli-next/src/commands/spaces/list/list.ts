//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { Console, Effect } from 'effect';

import { ClientService } from '../../../services';

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
