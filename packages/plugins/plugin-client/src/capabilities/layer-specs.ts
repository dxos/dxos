//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capabilities, Capability } from '@dxos/app-framework';
import { ClientService } from '@dxos/client';
import { Database, Feed } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { CredentialsService, LayerSpec, QueueService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';

import { ClientCapabilities } from '#types';

//
// Capability Module
//
// Contributes the core client/space service layer specs:
//   - {@link ClientService} (application affinity).
//   - {@link Database.Service}, {@link QueueService}, {@link Feed.FeedService},
//     {@link CredentialsService} (space affinity).
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
      }),
    ),
);

/**
 * Space-scoped {@link Database.Service} resolved from the `Client`'s space
 * registry. Fails hard if the context is missing a `space` id or the client
 * cannot resolve it — both indicate a configuration bug in the layer graph.
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

const QueueServiceLayerSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [ClientService],
    provides: [QueueService],
  },
  (context) =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        invariant(context.space, 'space context required for QueueService layer');
        const client = yield* ClientService;
        const space = client.spaces.get(context.space);
        invariant(space, `space not found on client: ${context.space}`);
        yield* Effect.promise(() => space.waitUntilReady());
        return QueueService.layer(space.queues);
      }),
    ),
);

const FeedLayerSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [ClientService],
    provides: [Feed.FeedService],
  },
  (context) =>
    Layer.unwrapEffect(
      Effect.gen(function* () {
        invariant(context.space, 'space context required for Feed layer');
        const client = yield* ClientService;
        const space = client.spaces.get(context.space);
        invariant(space, `space not found on client: ${context.space}`);
        yield* Effect.promise(() => space.waitUntilReady());
        return createFeedServiceLayer(space.queues);
      }),
    ),
);

const CredentialsLayerSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [Database.Service],
    provides: [CredentialsService],
  },
  () => CredentialsService.layerFromDatabase(),
);

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contributes(Capabilities.LayerSpec, ClientLayerSpec),
    Capability.contributes(Capabilities.LayerSpec, DatabaseLayerSpec),
    Capability.contributes(Capabilities.LayerSpec, QueueServiceLayerSpec),
    Capability.contributes(Capabilities.LayerSpec, FeedLayerSpec),
    Capability.contributes(Capabilities.LayerSpec, CredentialsLayerSpec),
  ]),
);
