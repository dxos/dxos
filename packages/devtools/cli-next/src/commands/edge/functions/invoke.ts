//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

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
    cpuTimeLimit: Options.integer('cpuTimeLimit').pipe(
      Options.withDescription('The CPU time limit in seconds.'),
      Options.optional,
    ),
    subrequestsLimit: Options.integer('subrequestsLimit').pipe(
      Options.withDescription('The subrequests limit for the function.'),
      Options.optional,
    ),
  },
  Effect.fn(function* ({ key, data, cpuTimeLimit, subrequestsLimit }) {
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
    const result = yield* Effect.promise(() =>
      invokeFunction(edgeClient, fn, data, {
        cpuTimeLimit: cpuTimeLimit.pipe(Option.getOrUndefined),
        subrequestsLimit: subrequestsLimit.pipe(Option.getOrUndefined),
      }),
    );
    yield* Console.log(JSON.stringify(result, null, 2));
  }),
).pipe(Command.withDescription('Invoke a function deployed to EDGE.'));
