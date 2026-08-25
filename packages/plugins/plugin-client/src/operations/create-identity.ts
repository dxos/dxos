//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';

import { ClientEvents } from '#types';

import { CreateIdentity } from './definitions';

const handler: Operation.WithHandler<typeof CreateIdentity> = CreateIdentity.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (profile) {
      const manager = yield* Capability.get(Capabilities.PluginManager);
      const identity = yield* Identity.create(profile);
      // Boot-waterfall milestone: the identity exists from here (first-run path).
      performance.mark('milestone:identity-created');
      const spaceId = yield* Identity.personalSpaceId;
      yield* manager.activate(ClientEvents.IdentityCreated);
      yield* Operation.schedule(ObservabilityOperation.SendEvent, { name: 'identity.create' });
      return {
        identityDid: identity.did,
        ...(Option.isSome(spaceId) && { spaceId: spaceId.value }),
        ...(identity.displayName !== undefined || identity.data !== undefined
          ? { profile: { displayName: identity.displayName, data: identity.data } }
          : {}),
      };
    }),
  ),
);

export default handler;
