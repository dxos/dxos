//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as LayerSpec from '@dxos/compute/LayerSpec';
import { ConfigService, resolveTelemetryTag } from '@dxos/config';
import {
  EdgeClient,
  EdgeConnectionService,
  EdgeHttpClient,
  EdgeHttpClientService,
  createStubEdgeIdentity,
} from '@dxos/edge-client';
import {
  EdgeSignalManager,
  MemorySignalManager,
  MemorySignalManagerContext,
  SignalManagerService,
} from '@dxos/messaging';
import { createIceProvider, createRtcTransportFactory } from '@dxos/network-manager';

import { type Options, TransportFactoryService } from './interface.ts';

//
// Layers the mesh pulls in from the wider monorepo. These were a layer the embedder provided
// beneath the stack; as specs the edge clients are conditional like any other spec rather than an
// ambient service that may or may not be there, which is what lets the stack declare its ambient
// requirements as tags.
//

/** Only included with a configured endpoint, so the tags exist exactly when the clients do. */
export const EdgeClientsSpec = LayerSpec.make(
  { affinity: 'application', requires: [ConfigService], provides: [EdgeConnectionService, EdgeHttpClientService] },
  () =>
    Layer.unwrap(
      Effect.gen(function* () {
        const config = yield* ConfigService;
        const endpoint = config.get('runtime.services.edge.url')!;
        const clientTag = resolveTelemetryTag(config);
        return Layer.mergeAll(
          // Dialing is driven by `NetworkingEnabled` rather than open, so boot RPCs are not competing
          // with the outbound connection.
          Layer.sync(
            EdgeConnectionService,
            () => new EdgeClient(createStubEdgeIdentity(), { socketEndpoint: endpoint, clientTag, deferConnect: true }),
          ),
          Layer.sync(EdgeHttpClientService, () => new EdgeHttpClient(endpoint, { clientTag })),
        );
      }),
    ),
);

export const SignalManagerSpec = (options: Options) => {
  const signalManager = options.signalManager;
  if (signalManager) {
    return LayerSpec.make({ affinity: 'application', requires: [], provides: [SignalManagerService] }, () =>
      Layer.succeed(SignalManagerService, signalManager),
    );
  }
  // Edge is the only real signaling transport; without it there is no cross-process signaling, so
  // the spec takes the edge connection exactly when one will exist.
  const edgeSignaling = !!options.edgeSignaling && !!options.edgeAvailable;
  return LayerSpec.make(
    {
      affinity: 'application',
      requires: edgeSignaling ? [EdgeConnectionService] : [],
      provides: [SignalManagerService],
    },
    () =>
      edgeSignaling
        ? Layer.effect(
            SignalManagerService,
            Effect.map(EdgeConnectionService, (edgeConnection) => new EdgeSignalManager({ edgeConnection })),
          )
        : Layer.sync(SignalManagerService, () => new MemorySignalManager(new MemorySignalManagerContext())),
  );
};

export const TransportFactorySpec = (options: Options) => {
  const transportFactory = options.transportFactory;
  if (transportFactory) {
    return LayerSpec.make({ affinity: 'application', requires: [], provides: [TransportFactoryService] }, () =>
      Layer.succeed(TransportFactoryService, transportFactory),
    );
  }
  return LayerSpec.make(
    { affinity: 'application', requires: [ConfigService], provides: [TransportFactoryService] },
    () =>
      Layer.effect(
        TransportFactoryService,
        Effect.gen(function* () {
          const config = yield* ConfigService;
          const iceProviders = config.get('runtime.services.iceProviders');
          return createRtcTransportFactory(
            { iceServers: config.get('runtime.services.ice') },
            iceProviders && createIceProvider(iceProviders),
          );
        }),
      ),
  );
};
