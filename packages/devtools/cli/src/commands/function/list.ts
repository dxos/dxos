//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig, Common, printList, spaceLayer } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { Database, Filter } from '@dxos/echo';
import { Function } from '@dxos/functions';
import { getDeployedFunctions } from '@dxos/functions-runtime/edge';

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

    const dbFunctions = yield* Database.Service.runQuery(Filter.type(Function.Function));
    const functions = remote
      ? yield* Effect.gen(function* () {
          const client = yield* ClientService;
          return yield* Effect.promise(() => getDeployedFunctions(client, true));
        })
      : dbFunctions;

    // Only calculate status for remote functions (comparing against DB)
    const functionsWithStatus = functions.map((fn) => ({
      function: fn,
      status: remote ? getFunctionStatus(fn, dbFunctions) : undefined,
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
