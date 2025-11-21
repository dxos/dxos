//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { getDeployedFunctions } from '@dxos/functions-runtime/edge';

import { ClientService } from '../../../services';

export const search = Command.make(
  'search',
  {},
  Effect.fn(function* () {
    const client = yield* ClientService;

    // Produce normalized in-memory FunctionType objects for display.
    const fns = yield* Effect.promise(() => getDeployedFunctions(client));
    yield* Console.log(JSON.stringify(fns, null, 2));
  }),
).pipe(Command.withDescription('Search functions deployed to EDGE.'));
