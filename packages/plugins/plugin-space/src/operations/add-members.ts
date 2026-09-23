//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';

import { SpaceOperation } from '#types';

import { admitContacts } from './admit-contacts.ts';
import { SpaceOperationConfig } from './helpers.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.AddMembers> = SpaceOperation.AddMembers.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space, identityKeys, role }) {
      const result = yield* Effect.promise(() => admitContacts(space, [...identityKeys], role));
      const { createJoinUrl } = yield* Capability.get(SpaceOperationConfig);
      return { joinUrl: createJoinUrl(space.key), ...result };
    }),
  ),
);
export default handler;
