//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { Database, Obj } from '@dxos/echo';
import { Function } from '@dxos/functions';
import { getDeployedFunctions } from '@dxos/functions-runtime/edge';

import { CommandConfig } from '../../../services';
import { spaceLayer } from '../../../util';
import { Common } from '../../options';

import { printFunction as printFunction } from './util';

export const importCommand = Command.make(
  'import',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    key: Args.text({ name: 'key' }).pipe(Args.withDescription('The key of the function to invoke.')),
  },
  ({ key }) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;
      const client = yield* ClientService;

      // TODO(dmaretskyi): Extract.
      yield* Effect.promise(() => client.addTypes([Function.Function]));

      // Produce normalized in-memory FunctionType objects for display.
      const fns = yield* Effect.promise(() => getDeployedFunctions(client));

      // We take the last deployment under a given key.
      // TODO(dmaretskyi): Should we make the keys unique?
      const fn = fns.findLast((fn) => fn.key === key);
      if (!fn) {
        throw new Error(`Function ${key} not found`);
      }

      yield* Database.Service.add(Obj.clone(fn));
      if (json) {
        yield* Console.log(JSON.stringify(fn, null, 2));
      } else {
        yield* Console.log(printFunction(fn));
      }
    }),
).pipe(
  Command.withDescription('Import a function deployed to EDGE.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
);
