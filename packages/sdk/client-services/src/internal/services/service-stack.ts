//
// Copyright 2022 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { type AutomergeReplicator, EchoHostLayer, EchoHostService } from '@dxos/echo-host';
import { EffectEx, Hook } from '@dxos/effect';
import { type SignalManager } from '@dxos/messaging';
import { type TransportFactory } from '@dxos/network-manager';
import { type Runtime_Client_EdgeFeatures } from '@dxos/protocols/buf/dxos/config_pb';

import * as IdentityContract from '../../contracts/identity.ts';
import * as Events from '../../Events.ts';
import { type IdentityManagerProps, identityProviderFromManager } from '../identity/index.ts';
import { type InvitationConnectionProps } from '../invitations/index.ts';
import { SpaceManagerService } from '../space/index.ts';
import { type DataSpaceManagerRuntimeProps } from '../spaces/index.ts';

export type ServiceContextRuntimeProps = Pick<
  IdentityManagerProps,
  'devicePresenceOfflineTimeout' | 'devicePresenceAnnounceInterval'
> &
  DataSpaceManagerRuntimeProps & {
    invitationConnectionDefaultProps?: InvitationConnectionProps;
    disableP2pReplication?: boolean;
    enableVectorIndexing?: boolean;
  };

export type ServiceStackServices = ServiceContextRuntimeProps & {
  edgeFeatures?: Runtime_Client_EdgeFeatures;
  connectionLog?: boolean;
  autoConnect?: boolean;
  /**
   * Whether an edge endpoint is configured. An edge feature can be enabled in config without one,
   * so the feature flag alone does not say whether an edge-dependent spec can be built.
   */
  edgeAvailable?: boolean;
  /** Overrides the config-derived signal manager; tests pass an in-memory one. */
  signalManager?: SignalManager;
  /** Overrides the WebRTC transport; tests pass the in-memory transport. */
  transportFactory?: TransportFactory;
};

/**
 * Attaches the replicator behind `tag`, when one is wired beneath, to the echo host once networking
 * is up. Each replicator registers itself through this; the stack does not enumerate them.
 */
export const registerReplicator = <Self>(
  tag: EffectContext.Key<Self, AutomergeReplicator>,
): Layer.Layer<never, never, EchoHostService | Hook.Controller> =>
  Layer.unwrap(
    Effect.map(Effect.serviceOption(tag), (replicator) =>
      Option.match(replicator, {
        onNone: () => Layer.empty,
        onSome: (replicator) =>
          Layer.effectDiscard(
            Effect.gen(function* () {
              const echoHost = yield* EchoHostService;
              const ctx = yield* EffectEx.contextFromScope();
              yield* Hook.on(
                Events.NetworkReady,
                Effect.fn('EchoHost.addReplicator')(function* () {
                  yield* Effect.promise(() => echoHost.addReplicator(ctx, replicator));
                }),
              );
            }),
          ),
      }),
    ),
  );

/**
 * Provides the {@link IdentityProviderService} from the resolved {@link IdentityContract.Manager}.
 */
export const identityProviderLayer = Layer.effect(
  IdentityContract.ProviderService,
  Effect.gen(function* () {
    const identityManager = yield* IdentityContract.ManagerService;
    return identityProviderFromManager(identityManager);
  }),
);

/**
 * Constructs the {@link EchoHost}, resolving the identity/space callbacks that point down the stack.
 * The feed sync handlers (which point up) are wired later via `EchoHost.setFeedSyncHandlers`.
 *
 * The host is self-contained (runs its own migrations, owns its feed/automerge stores), so its
 * open/close is owned by the layer scope: it opens when the stack is built and closes when the
 * runtime is disposed. Identity-, network-, and storage-bound lifecycle is driven by the events.
 */
export const echoHostLayer = (options: { useSubduction?: boolean }) =>
  Layer.effectDiscard(
    Effect.gen(function* () {
      const echoHost = yield* EchoHostService;
      yield* Effect.acquireRelease(
        Effect.promise(() => echoHost.open()),
        () => Effect.promise(() => echoHost.close()),
      );

      // Points back down the stack, like the feed sync handlers above: the identity manager anchors
      // the HALO space on a root document and needs the open host to do it.
      const identityManager = yield* IdentityContract.ManagerService;
      yield* Effect.promise(() => identityManager.setEchoHost(echoHost));
    }),
  ).pipe(
    Layer.provideMerge(
      Layer.unwrap(
        Effect.gen(function* () {
          const identityManager = yield* IdentityContract.ManagerService;
          const spaceManager = yield* SpaceManagerService;
          return EchoHostLayer({
            peerIdProvider: () => identityManager.identity?.deviceKey?.toHex(),
            getSpaceKeyByRootDocumentId: (documentId) => spaceManager.findSpaceByRootDocumentId(documentId)?.key,
            useSubduction: options.useSubduction,
          });
        }),
      ),
    ),
  );
