//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';

import { ClientService } from '../../../../services';
import { Common } from '../../../options';

export const list = Command.make(
  'list',
  {
    spaceId: Common.spaceId,
  },
  ({ spaceId }) =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      invariant(SpaceId.isValid(spaceId), 'Invalid spaceId');
      const triggers = yield* Effect.promise(() => client.edge.getCronTriggers(spaceId));
      yield* Console.log(JSON.stringify(triggers, null, 2));
    }),
).pipe(Command.withDescription('List timer triggers.'));
