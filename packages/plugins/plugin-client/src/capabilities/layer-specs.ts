//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capabilities, Capability } from '@dxos/app-framework';
import { ClientService } from '@dxos/client';
import { Credential, LayerSpec } from '@dxos/compute';
import { credentialsLayerFromDatabase } from '@dxos/compute-runtime';
import { Database } from '@dxos/echo';
import { Identity, Space } from '@dxos/halo';
import { layerIdentity, layerSpace } from '@dxos/halo-adapter-client';
import { invariant } from '@dxos/invariant';

import { ClientCapabilities } from '#types';

//
// Capability Module
//
// Contributes the core client/space service layer specs:
//   - {@link ClientService} (application affinity).
//   - {@link Database.Service}, {@link Credential.CredentialsService} (space affinity).
//
// Specs are declared at module level and resolve the underlying
// {@link ClientCapabilities.Client} through the Effect layer graph (via
// {@link Capability.Service}) rather than capturing it from an outer scope.
//

/**
 * Provides the Effect-level {@link ClientService} backed by the
 * {@link ClientCapabilities.Client} capability contributed by the plugin
 * runtime.
 */
const ClientLayerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [Capability.Service],
    provides: [ClientService],
  },
  () =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        const client = yield* Capability.get(ClientCapabilities.Client);
        return ClientService.fromClient(client);
      }).pipe(Effect.orDie),
    ),
);

/**
 * Space-scoped database/feed services resolved from the `Client`'s space
 * registry. One spec for both so the `client.spaces.get` / `waitUntilReady`
 * round-trip only happens once per space slice. Fails hard if the context is
 * missing a `space` id or the client cannot resolve it — both indicate a
 * configuration bug in the layer graph.
 */
const DatabaseLayerSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [ClientService],
    provides: [Database.Service],
  },
  (context) =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        invariant(context.space, 'space context required for Database layer');
        const client = yield* ClientService;
        const space = client.spaces.get(context.space);
        invariant(space, `space not found on client: ${context.space}`);
        yield* Effect.promise(() => space.waitUntilReady());
        return Database.layer(space.db);
      }),
    ),
);

const CredentialsLayerSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [Database.Service],
    provides: [Credential.CredentialsService],
  },
  () => credentialsLayerFromDatabase(),
);

/**
 * The HALO {@link Identity.Service} backed by the client adapter. Application-scoped: it manages
 * the local identity and its devices for the whole client.
 */
const IdentityLayerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [ClientService],
    provides: [Identity.Service],
  },
  () =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        const client = yield* ClientService;
        return layerIdentity(client);
      }),
    ),
);

/**
 * The HALO {@link Space.Service} backed by the client adapter. Application-scoped: its verbs are
 * keyed by {@link SpaceId} and cover every space on the client, not a single space slice.
 */
const SpaceLayerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [ClientService],
    provides: [Space.Service],
  },
  () =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        const client = yield* ClientService;
        return layerSpace(client);
      }),
    ),
);

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.provide(Capabilities.LayerSpec, ClientLayerSpec),
    Capability.provide(Capabilities.LayerSpec, DatabaseLayerSpec),
    Capability.provide(Capabilities.LayerSpec, CredentialsLayerSpec),
    Capability.provide(Capabilities.LayerSpec, IdentityLayerSpec),
    Capability.provide(Capabilities.LayerSpec, SpaceLayerSpec),
  ]),
);
