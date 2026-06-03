//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { createIdFromSpaceKey } from '@dxos/echo-protocol';
import { runAndForwardErrors } from '@dxos/effect';
import { ObservabilityOperation } from '@dxos/plugin-observability';

import { ClientEvents } from '../types';
import { ClientCapabilities } from '../types';
import { CreateIdentity } from './definitions';

const handler: Operation.WithHandler<typeof CreateIdentity> = CreateIdentity.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (profile) {
      const manager = yield* Capability.get(Capabilities.PluginManager);
      const client = yield* Capability.get(ClientCapabilities.Client);
      const data = yield* Effect.promise(() => client.halo.createIdentity(profile));
      const spaceKey = data.spaceKey;
      const spaceId = spaceKey ? yield* Effect.promise(() => createIdFromSpaceKey(spaceKey)) : undefined;
      yield* Effect.promise(() => runAndForwardErrors(manager.activate(ClientEvents.IdentityCreated)));
      yield* Operation.schedule(ObservabilityOperation.SendEvent, { name: 'identity.create' });
      return {
        identityKey: data.identityKey,
        ...(spaceId !== undefined && { spaceId }),
        ...(data.profile !== undefined && { profile: data.profile }),
      };
    }),
  ),
);

export default handler;
