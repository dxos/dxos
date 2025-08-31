//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { Console, Effect } from 'effect';
import { colorize } from 'json-colorizer';

import { ClientService } from '../../../services';

import { getDeployedFunctions } from './util';

export const list = Command.make(
  'list',
  {},
  Effect.fn(function* () {
    const client = yield* ClientService;

    // Produce normalized in-memory FunctionType objects for display.
    const fns = yield* Effect.promise(() => getDeployedFunctions(client));
    yield* Console.log(colorize(fns));
  }),
).pipe(Command.withDescription('List functions deployed to EDGE.'));
