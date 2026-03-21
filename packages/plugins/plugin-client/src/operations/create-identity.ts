//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { runAndForwardErrors } from '@dxos/effect';
import { Operation } from '@dxos/operation';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';

import { CreateIdentity } from './definitions';

import { ClientEvents } from '../types';
import { ClientCapabilities } from '../types';

export default CreateIdentity.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (profile) {
      const manager = yield* Capability.get(Capabilities.PluginManager);
      const client = yield* Capability.get(ClientCapabilities.Client);
      const data = yield* Effect.promise(() => client.halo.createIdentity(profile));
      yield* Effect.promise(() => runAndForwardErrors(manager.activate(ClientEvents.IdentityCreated)));
      yield* Operation.schedule(ObservabilityOperation.SendEvent, { name: 'identity.create' });
      return data;
    }),
  ),
);
