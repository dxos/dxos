//
// Copyright 2025 DXOS.org
//

import { Args, Command } from '@effect/cli';
import { Console, Effect } from 'effect';

import { ClientService } from '../../../services';
import { getDeployedFunctions } from './util';

export const invoke = Command.make(
  'invoke',
  {
    name: Args.text({ name: 'name' }).pipe(Args.withDescription('The name of the function to invoke.')),
  },
  Effect.fn(function* ({ name }) {
    const client = yield* ClientService;

    // Produce normalized in-memory FunctionType objects for display.
    const fns = yield* Effect.promise(() => getDeployedFunctions(client));
    yield* Console.log(JSON.stringify(fns, null, 2));
  }),
).pipe(Command.withDescription('Invoke a function deployed to EDGE.'));
