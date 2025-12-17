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

import { CommandConfig } from '../../services';
import { printList, spaceLayer } from '../../util';
import { Common } from '../options';

import { getFunctionStatus, printFunction } from './util';

export const list = Command.make(
  'list',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    remote: Options.boolean('remote').pipe(
      Options.withDescription('Query EDGE service (defaults to local)'),
      Options.withDefault(false),
    ),
  },
  Effect.fn(function* ({ remote }) {
    const { json } = yield* CommandConfig;

    // Fetch functions (local or remote)
    const functions = remote
      ? yield* Effect.gen(function* () {
          const client = yield* ClientService;
          return yield* Effect.promise(() => getDeployedFunctions(client, true));
        })
      : yield* Database.Service.runQuery(Filter.type(Function.Function));

    // Fetch local DB functions to calculate status
    const dbFunctions = yield* Database.Service.runQuery(Filter.type(Function.Function));

    // Normalize functions with status
    const functionsWithStatus = functions.map((fn) => ({
      function: fn,
      status: getFunctionStatus(fn, dbFunctions),
    }));

    // Print functions
    if (json) {
      yield* Console.log(
        JSON.stringify(
          functionsWithStatus.map(({ function: fn, status }) => ({ ...fn, status })),
          null,
          2,
        ),
      );
    } else {
      if (functionsWithStatus.length === 0) {
        yield* Console.log('No functions found.');
      } else {
        const items = functionsWithStatus.map(({ function: fn, status }) => printFunction(fn, status));
        yield* Console.log(printList(items));
      }
    }
  }),
).pipe(
  Command.withDescription('List functions deployed to EDGE.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
);
