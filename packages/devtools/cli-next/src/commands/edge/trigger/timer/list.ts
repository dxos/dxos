//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';

import { spaceIdWithDefault } from '../../../../util';
import { Common } from '../../../options';

// TODO(wittjosiah): Merge this information into general trigger list command.
export const list = Command.make(
  'list',
  {
    spaceIdOption: Common.spaceId.pipe(Options.optional),
  },
  ({ spaceIdOption }) =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      const spaceId = yield* spaceIdWithDefault(spaceIdOption);
      const triggers = yield* Effect.promise(() => client.edge.getCronTriggers(spaceId));
      yield* Console.log(JSON.stringify(triggers, null, 2));
    }),
).pipe(Command.withDescription('List timer triggers.'));
