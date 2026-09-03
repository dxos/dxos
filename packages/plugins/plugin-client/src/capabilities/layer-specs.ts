//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { ClientService, fromClient } from '@dxos/client';
import { accessTokenResolverFromEdge, credentialsLayerFromDatabase } from '@dxos/compute-runtime';
import * as Credential from '@dxos/compute/Credential';
import * as LayerSpec from '@dxos/compute/LayerSpec';
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
    Layer.unwrap(
      Effect.gen(function* () {
        const client = yield* Capability.get(ClientCapabilities.Client);
        // The capability is contributed while `initialize()` is still in flight, so every
        // initialized-only getter (`client.spaces`, `client.halo`) would throw for any layer built
        // before it settles. Bounded by the same budget the client capability resolved — a shorter
        // one here would fail a host that deliberately widened it — so a handshake that never
        // completes fails the materialization instead of leaving it pending forever.
        const timeout = yield* Capability.get(ClientCapabilities.InitializeTimeout);
        yield* Effect.tryPromise(() => client.waitUntilInitialized({ timeout }));
        return fromClient(client);
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
    Layer.unwrap(
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

/**
 * Resolves server-custodied access tokens through EDGE. Application-scoped: the resolver's cache is
 * keyed by token id and is worth sharing across spaces.
 */
const AccessTokenResolverLayerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [Capability.Service],
    provides: [Credential.AccessTokenResolver],
  },
  () =>
    Layer.unwrap(
      Effect.gen(function* () {
        const client = yield* Capability.get(ClientCapabilities.Client);
        return accessTokenResolverFromEdge(() => client.edge.http);
      }).pipe(Effect.orDie),
    ),
);

const CredentialsLayerSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [Database.Service, Credential.AccessTokenResolver],
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
    Layer.unwrap(
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
    Layer.unwrap(
      Effect.gen(function* () {
        const client = yield* ClientService;
        return layerSpace(client);
      }),
    ),
);

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contributeAll(Capabilities.LayerSpec, [
      ClientLayerSpec,
      DatabaseLayerSpec,
      AccessTokenResolverLayerSpec,
      CredentialsLayerSpec,
      IdentityLayerSpec,
      SpaceLayerSpec,
    ]),
  ]),
);
