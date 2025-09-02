import { Command } from '@effect/cli';

import { Console, Effect } from 'effect';
import { EdgeClient } from '@dxos/edge-client';
import { ClientService } from '../../../../services';
import { Common } from '../../../options';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';

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
