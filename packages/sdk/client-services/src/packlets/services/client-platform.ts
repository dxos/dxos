//
// Copyright 2025 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

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
  type SignalManager,
  SignalManagerService,
} from '@dxos/messaging';
import { type TransportFactory, createIceProvider, createRtcTransportFactory } from '@dxos/network-manager';

/**
 * Effect service tag for the swarm {@link TransportFactory}.
 */
export class TransportFactoryService extends EffectContext.Service<TransportFactoryService, TransportFactory>()(
  '@dxos/client-services/TransportFactory',
) {}

export type ClientPlatformLayerOptions = {
  /** Overrides the config-derived signal manager; tests pass an in-memory one. */
  signalManager?: SignalManager;
  /** Overrides the WebRTC transport; tests pass the in-memory transport. */
  transportFactory?: TransportFactory;
  /**
   * Overrides the config-derived edge HTTP client, which otherwise exists only with a configured
   * endpoint; tests pass a stub to exercise the paths that go through edge, such as anchoring a
   * legacy space on the root it mints. Provided on its own, without the socket: the two are
   * independent, and the credential paths need only this one.
   */
  edgeHttpClient?: EdgeHttpClient;
};

/**
 * The transport-level inputs of the stack, derived from config: the edge clients when an edge
 * endpoint is configured, the signal manager (edge-backed when edge signaling is enabled, otherwise
 * an isolated in-memory one), and the WebRTC transport factory.
 *
 * Only the always-present services are declared: the edge tags exist just with an endpoint, and a
 * layer cannot claim an output it may not provide, so consumers read them with `Effect.serviceOption`.
 */
export const ClientPlatformLayer = (
  options: ClientPlatformLayerOptions = {},
): Layer.Layer<SignalManagerService | TransportFactoryService, never, ConfigService> => {
  const httpClientLayer = options.edgeHttpClient
    ? Layer.succeed(EdgeHttpClientService, options.edgeHttpClient)
    : undefined;
  const edgeLayer = Layer.unwrap(
    Effect.gen(function* () {
      const config = yield* ConfigService;
      const endpoint = config.get('runtime.services.edge.url');
      if (!endpoint) {
        // An override still applies with no endpoint: the HTTP client does not need the socket.
        return httpClientLayer ?? Layer.empty;
      }
      const clientTag = resolveTelemetryTag(config);
      return Layer.mergeAll(
        // Dialing is driven by `NetworkingEnabled` rather than open, so boot RPCs are not competing
        // with the outbound connection.
        Layer.sync(
          EdgeConnectionService,
          () => new EdgeClient(createStubEdgeIdentity(), { socketEndpoint: endpoint, clientTag, deferConnect: true }),
        ),
        httpClientLayer ?? Layer.sync(EdgeHttpClientService, () => new EdgeHttpClient(endpoint, { clientTag })),
      );
    }),
  );

  const signalManagerLayer = options.signalManager
    ? Layer.succeed(SignalManagerService, options.signalManager)
    : Layer.effect(
        SignalManagerService,
        Effect.gen(function* () {
          const config = yield* ConfigService;
          const edgeConnection = Option.getOrUndefined(yield* Effect.serviceOption(EdgeConnectionService));
          // Edge is the only real signaling transport; without it there is no cross-process signaling.
          return edgeConnection && config.get('runtime.client.edgeFeatures')?.signaling
            ? new EdgeSignalManager({ edgeConnection })
            : new MemorySignalManager(new MemorySignalManagerContext());
        }),
      );

  const transportFactoryLayer = options.transportFactory
    ? Layer.succeed(TransportFactoryService, options.transportFactory)
    : Layer.effect(
        TransportFactoryService,
        Effect.gen(function* () {
          const config = yield* ConfigService;
          const iceProviders = config.get('runtime.services.iceProviders');
          return createRtcTransportFactory(
            { iceServers: config.get('runtime.services.ice') },
            iceProviders && createIceProvider(iceProviders),
          );
        }),
      );

  return Layer.mergeAll(signalManagerLayer, transportFactoryLayer).pipe(Layer.provideMerge(edgeLayer));
};
