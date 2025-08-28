//
// Copyright 2025 DXOS.org
//

import { Args, Command } from '@effect/cli';
import { Console, Effect, Schema } from 'effect';

import { ClientService } from '../../../services';
import { createEdgeClient, getDeployedFunctions, invokeFunction } from './util';

export const invoke = Command.make(
  'invoke',
  {
    key: Args.text({ name: 'key' }).pipe(Args.withDescription('The key of the function to invoke.')),
    data: Args.text({ name: 'data' }).pipe(
      Args.withDescription('The data to pass to the function.'),
      Args.withSchema(Schema.parseJson(Schema.Unknown)),
    ),
  },
  Effect.fn(function* ({ key, data }) {
    const client = yield* ClientService;

    // Produce normalized in-memory FunctionType objects for display.
    const fns = yield* Effect.promise(() => getDeployedFunctions(client));

    // We take the last deployment under a given key.
    // TODO(dmaretskyi): Should we make the keys unique?
    const fn = fns.findLast((fn) => fn.key === key);
    if (!fn) {
      throw new Error(`Function ${key} not found`);
    }

    const edgeClient = createEdgeClient(client);
    const result = yield* Effect.promise(() => invokeFunction(edgeClient, fn, data));
    yield* Console.log(JSON.stringify(result, null, 2));
  }),
).pipe(Command.withDescription('Invoke a function deployed to EDGE.'));
