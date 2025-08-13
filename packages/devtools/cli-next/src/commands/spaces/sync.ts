//
// Copyright 2025 DXOS.org
//

import { Command, Options } from '@effect/cli';
import { Effect } from 'effect';

import { SpaceId } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';

import { ClientService } from '../../services';
import { waitForSync } from '../../util';

const spaceId = Options.text('spaceId').pipe(Options.withDescription('The space ID to sync'));

export const sync = Command.make('sync', { spaceId }, ({ spaceId }) =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    invariant(SpaceId.isValid(spaceId), 'Invalid space ID');
    const space = client.spaces.get(spaceId);
    invariant(space, 'Space not found');
    yield* waitForSync(space);
  }),
);
