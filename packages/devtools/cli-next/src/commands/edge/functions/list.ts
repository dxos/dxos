//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { Console, Effect } from 'effect';

import { ClientService } from '../../../services';

export const list = Command.make(
  'list',
  {},
  Effect.fn(function* () {
    const client = yield* ClientService;
    const result = yield* Effect.promise(() => client.edge.listFunctions());
    yield* Console.log(JSON.stringify(result, null, 2));
  }),
).pipe(Command.withDescription('List functions deployed to EDGE.'));
