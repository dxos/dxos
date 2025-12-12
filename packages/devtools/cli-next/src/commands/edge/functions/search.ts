//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { getDeployedFunctions } from '@dxos/functions-runtime/edge';

export const search = Command.make(
  'search',
  {},
  Effect.fn(function* () {
    const client = yield* ClientService;

    // Produce normalized in-memory FunctionType objects for display.
    const functions = yield* Effect.promise(() => getDeployedFunctions(client, true));
    yield* Console.log(JSON.stringify(functions, null, 2));
  }),
).pipe(Command.withDescription('Search functions deployed to EDGE.'));
