//
// Copyright 2025 DXOS.org
//

import { Args, Command, Options } from '@effect/cli';
import { Effect } from 'effect';

import { ClientService } from '../../../services';

import { DatabaseService, FunctionType } from '@dxos/functions';
import { getDeployedFunctions } from './util';
import { withDatabase } from '../../../util';
import { Common } from '../../options';
import { Obj } from '@dxos/echo';

export const importCommand = Command.make(
  'import',
  {
    spaceId: Common.spaceId,
    key: Args.text({ name: 'key' }).pipe(Args.withDescription('The key of the function to invoke.')),
  },
  ({ spaceId, key }) =>
    Effect.gen(function* () {
      const client = yield* ClientService;

      // TODO(dmaretskyi): Extract.
      client.addTypes([FunctionType]);

      // Produce normalized in-memory FunctionType objects for display.
      const fns = yield* Effect.promise(() => getDeployedFunctions(client));

      // We take the last deployment under a given key.
      // TODO(dmaretskyi): Should we make the keys unique?
      const fn = fns.findLast((fn) => fn.key === key);
      if (!fn) {
        throw new Error(`Function ${key} not found`);
      }

      yield* DatabaseService.add(Obj.clone(fn));
      console.log(JSON.stringify(fn, null, 2));
    }).pipe(withDatabase(spaceId)),
).pipe(Command.withDescription('Import a function deployed to EDGE.'));
