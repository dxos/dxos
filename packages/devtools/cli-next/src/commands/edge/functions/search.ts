//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { Database, Filter } from '@dxos/echo';
import { Function } from '@dxos/functions';
import { getDeployedFunctions } from '@dxos/functions-runtime/edge';

import { CommandConfig } from '../../../services';
import { spaceLayer } from '../../../util';
import { Common } from '../../options';

import { getFunctionStatus, prettyPrintFunction } from './util';

export const search = Command.make(
  'search',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
  },
  Effect.fn(function* () {
    const { json } = yield* CommandConfig;
    const client = yield* ClientService;

    const deployedFunctions = yield* Effect.promise(() => getDeployedFunctions(client, true));
    const dbFunctions = yield* Database.Service.runQuery(Filter.type(Function.Function));

    if (json) {
      yield* Console.log(JSON.stringify(deployedFunctions, null, 2));
    } else {
      for (const fn of deployedFunctions) {
        const status = getFunctionStatus(fn, dbFunctions);
        yield* Console.log(prettyPrintFunction(fn, status));
        yield* Console.log('');
      }
    }
  }),
).pipe(
  Command.withDescription('Search functions deployed to EDGE.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
);
