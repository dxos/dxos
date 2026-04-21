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

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);

    const clientSpec = LayerSpec.make(
      {
        affinity: 'application',
        requires: [],
        provides: [ClientService],
      },
      () => ClientService.fromClient(client),
    );

    const databaseSpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [ClientService],
        provides: [Database.Service],
      },
      (context) =>
        Layer.unwrapEffect(
          Effect.gen(function* () {
            invariant(context.space, 'space context required for Database layer');
            const space = client.spaces.get(context.space);
            if (!space) {
              return Database.notAvailable;
            }
            yield* Effect.promise(() => space.waitUntilReady());
            return Database.layer(space.db);
          }),
        ),
    );

    const queueServiceSpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [ClientService],
        provides: [QueueService],
      },
      (context) =>
        Layer.unwrapEffect(
          Effect.gen(function* () {
            invariant(context.space, 'space context required for QueueService layer');
            const space = client.spaces.get(context.space);
            if (!space) {
              return QueueService.notAvailable;
            }
            yield* Effect.promise(() => space.waitUntilReady());
            return QueueService.layer(space.queues);
          }),
        ),
    );

    const feedSpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [ClientService],
        provides: [Feed.FeedService],
      },
      (context) =>
        Layer.unwrapEffect(
          Effect.gen(function* () {
            invariant(context.space, 'space context required for Feed layer');
            const space = client.spaces.get(context.space);
            if (!space) {
              return Feed.notAvailable;
            }
            yield* Effect.promise(() => space.waitUntilReady());
            return createFeedServiceLayer(space.queues);
          }),
        ),
    );

    const credentialsSpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [Database.Service],
        provides: [CredentialsService],
      },
      () => CredentialsService.layerFromDatabase(),
    );

    return [
      Capability.contributes(Capabilities.LayerSpec, clientSpec),
      Capability.contributes(Capabilities.LayerSpec, databaseSpec),
      Capability.contributes(Capabilities.LayerSpec, queueServiceSpec),
      Capability.contributes(Capabilities.LayerSpec, feedSpec),
      Capability.contributes(Capabilities.LayerSpec, credentialsSpec),
    ];
  }),
);
