//
// Copyright 2025 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { Mutex } from '@dxos/async';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { Context } from '@dxos/context';
import { warnAfterTimeout } from '@dxos/debug';
import {
  EdgeConnectionService,
  EdgeHttpClientService,
  type EdgeIdentity,
  createChainEdgeIdentity,
  createEphemeralEdgeIdentity,
} from '@dxos/edge-client';
import { EffectEx, Hook } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { SignalManagerService } from '@dxos/messaging';
import { SwarmNetworkManager, SwarmNetworkManagerService } from '@dxos/network-manager';
import { PeerSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { ChainSchema, type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import * as IdentityContract from '../../contracts/identity.ts';
import * as Events from '../../Events.ts';
import { type Identity } from '../../Identity.ts';
import { type Options, TransportFactoryService } from './interface.ts';

/**
 * Constructs the swarm network manager over the ambient signal manager and transport factory.
 */
export const SwarmNetworkManagerLayer = (
  options: Pick<Options, 'connectionLog'> = {},
): Layer.Layer<SwarmNetworkManagerService, never, SignalManagerService | TransportFactoryService> =>
  Layer.effect(
    SwarmNetworkManagerService,
    Effect.gen(function* () {
      const signalManager = yield* SignalManagerService;
      const transportFactory = yield* TransportFactoryService;
      const edgeConnection = Option.getOrUndefined(yield* Effect.serviceOption(EdgeConnectionService));
      return new SwarmNetworkManager({
        enableDevtoolsLogging: options.connectionLog ?? true,
        transportFactory,
        signalManager,
        peerInfo:
          edgeConnection &&
          create(PeerSchema, { identityDid: edgeConnection.identityDid, peerKey: edgeConnection.peerKey }),
      });
    }),
  );

/**
 * Binds the current identity to edge, signaling, and swarm networking, and drives their lifecycle:
 * opens them once the identity is loaded, starts the edge dial when networking is enabled, and
 * closes them when the layer is destroyed.
 */
export const NetworkLifecycleLayer = (
  options: Pick<Options, 'autoConnect'> = {},
): Layer.Layer<never, never, Hook.Controller | SwarmNetworkManagerService | SignalManagerService> =>
  Layer.effectDiscard(
    Effect.gen(function* () {
      const networkManager = yield* SwarmNetworkManagerService;
      const signalManager = yield* SignalManagerService;
      const edgeConnection = Option.getOrUndefined(yield* Effect.serviceOption(EdgeConnectionService));
      const edgeHttpClient = Option.getOrUndefined(yield* Effect.serviceOption(EdgeHttpClientService));
      const identityUpdateMutex = new Mutex();

      const setNetworkIdentity = async (params?: { deviceCredential?: Credential; identity?: Identity }) => {
        log('setting network identity...');
        using _ = await identityUpdateMutex.acquire();
        const edgeIdentity = await createEdgeIdentity(params);
        edgeConnection?.setIdentity(edgeIdentity);
        edgeHttpClient?.setIdentity(edgeIdentity);
        networkManager.setPeerInfo(
          create(PeerSchema, { identityDid: edgeIdentity.identityDid, peerKey: edgeIdentity.peerKey }),
        );
        log('network identity set');
      };

      const ctx = yield* EffectEx.contextFromScope();
      yield* Effect.addFinalizer(() =>
        Effect.promise(async () => {
          await networkManager.close(Context.default());
          await signalManager.close();
          await edgeConnection?.close();
        }),
      );

      yield* Hook.on(
        Events.IdentityLoaded,
        Effect.fn('NetworkLifecycle.onIdentityLoaded')(function* ({ identity }) {
          yield* Effect.promise(async () => {
            await setNetworkIdentity({ identity });
            log('opening edge connection...');
            await edgeConnection?.open(ctx);
            log('opening signal manager...');
            await signalManager.open(ctx);
            log('opening network manager...');
            await networkManager.open();
          });
          yield* Hook.emit(Events.NetworkReady, undefined);
        }),
      );

      yield* Hook.on(
        Events.IdentityBound,
        Effect.fn('NetworkLifecycle.onIdentityBound')(function* ({ identity, deviceCredential }) {
          yield* Effect.promise(() => setNetworkIdentity({ identity, deviceCredential }));
        }),
      );

      // Only the edge dial is gated: subduction and feed sync resume from the edge reconnect.
      yield* Hook.on(
        Events.NetworkingEnabled,
        Effect.fn('NetworkLifecycle.onNetworkingEnabled')(function* () {
          log('starting edge networking');
          edgeConnection?.startNetworking();
        }),
      );

      if (options.autoConnect) {
        yield* Hook.on(
          Events.StackOpened,
          Effect.fn('NetworkLifecycle.onStackOpened')(function* () {
            yield* Hook.emit(Events.NetworkingEnabled, undefined);
          }),
        );
      }
    }),
  );

const createEdgeIdentity = async (params?: {
  deviceCredential?: Credential;
  identity?: Identity;
}): Promise<EdgeIdentity> => {
  const identity = params?.identity;
  if (!identity) {
    return createEphemeralEdgeIdentity();
  }
  if (params?.deviceCredential) {
    return createChainEdgeIdentity(
      identity.signer,
      identity.identityKey,
      identity.deviceKey,
      create(ChainSchema, { credential: params.deviceCredential }),
      [], // TODO(dmaretskyi): Service access credentials.
    );
  }
  // TODO: throw here or from identity if device chain can't be loaded, to avoid indefinite hangup
  await warnAfterTimeout(10_000, 'Waiting for identity to be ready for edge connection', async () => {
    await identity.ready();
  });
  invariant(identity.deviceCredentialChain);
  return createChainEdgeIdentity(
    identity.signer,
    identity.identityKey,
    identity.deviceKey,
    identity.deviceCredentialChain,
    [], // TODO(dmaretskyi): Service access credentials.
  );
};

/**
 * Spec constructing the swarm network manager.
 */
export const SwarmNetworkManagerSpec = (options: Pick<Options, 'connectionLog'>) =>
  LayerSpec.make(
    {
      affinity: 'application',
      requires: [SignalManagerService, TransportFactoryService],
      provides: [SwarmNetworkManagerService],
    },
    () => SwarmNetworkManagerLayer({ connectionLog: options.connectionLog }),
  );

/**
 * Spec driving the network lifecycle. Eager: it provides no tag, it subscribes to identity.
 */
export const NetworkLifecycleSpec = (options: Pick<Options, 'autoConnect'>) =>
  LayerSpec.make(
    {
      affinity: 'application',
      requires: [Hook.Controller, SwarmNetworkManagerService, IdentityContract.ManagerService, SignalManagerService],
      provides: [],
      eager: true,
    },
    () => NetworkLifecycleLayer({ autoConnect: options.autoConnect }),
  );
