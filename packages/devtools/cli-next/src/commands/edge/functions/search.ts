//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '../../../services';

import { getDeployedFunctions } from './util';

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
