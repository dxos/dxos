//
// Copyright 2025 DXOS.org
//

import { Args, Command } from '@effect/cli';
import { Console, Effect } from 'effect';

import { ClientService } from '../../../services';
import { createEdgeClient, getDeployedFunctions } from './util';
import { FUNCTIONS_PRESET_META_KEY } from '@dxos/functions';
import { Obj } from '@dxos/echo';

export const invoke = Command.make(
  'invoke',
  {
    key: Args.text({ name: 'key' }).pipe(Args.withDescription('The key of the function to invoke.')),
    data: Args.text({ name: 'data' }).pipe(Args.withDescription('The data to pass to the function.')),
  },
  Effect.fn(function* ({ key, data }) {
    const client = yield* ClientService;

    // Produce normalized in-memory FunctionType objects for display.
    const fns = yield* Effect.promise(() => getDeployedFunctions(client));
    const fn = fns.find((fn) => fn.key === key);
    if (!fn) {
      throw new Error(`Function ${key} not found`);
    }

    const edgeClient = createEdgeClient(client);
    const result = yield* Effect.promise(() => edgeClient.invokeFunction({ functionId: Obj.getMeta(fn).keys.find((key) => key.source === FUNCTIONS_PRESET_META_KEY)?.id }, JSON.parse(data)));
    yield* Console.log(JSON.stringify(result, null, 2));
  }),
).pipe(Command.withDescription('Invoke a function deployed to EDGE.'));

const 