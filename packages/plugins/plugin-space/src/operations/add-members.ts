//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { SpaceOperation } from '#types';

import { admitContacts, sendInvitationNotices } from './admit-contacts.ts';
import { SpaceOperationConfig } from './helpers.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.AddMembers> = SpaceOperation.AddMembers.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space, identityKeys, role }) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const result = yield* Effect.promise(() =>
        admitContacts(space, [...identityKeys], role, client.halo.contacts.get()),
      );
      yield* Effect.promise(() => sendInvitationNotices(client.halo.inbox, space.key, result.admitted, role));
      const { createJoinUrl } = yield* Capability.get(SpaceOperationConfig);
      // A link only helps someone who was admitted.
      return { joinUrl: result.admitted.length > 0 ? createJoinUrl(space.key) : '', ...result };
    }),
  ),
);
export default handler;
