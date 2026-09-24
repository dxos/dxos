//
// Copyright 2026 DXOS.org
//

import type * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { RegisterService } from '@dxos/client-protocol';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { type AutomergeReplicator, EchoHostLayer, EchoHostService } from '@dxos/echo-host';
import { EffectEx, Hook } from '@dxos/effect';
import { DataService, FeedService, QueryService } from '@dxos/protocols/rpc';
import { RpcRouter } from '@dxos/rpc';

import * as IdentityContract from '../../contracts/identity.ts';
import * as Events from '../../Events.ts';
import { SpaceManagerService } from './space/index.ts';

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

export const EchoHostSpec = (options: { useSubduction?: boolean }) =>
  LayerSpec.make(
    {
      affinity: 'application',
      requires: [IdentityContract.ManagerService, SpaceManagerService, SqlClient.SqlClient],
      provides: [EchoHostService],
    },
    () => echoHostLayer({ useSubduction: options.useSubduction }),
  );

//
// The three services the echo host projects directly. Each is a view onto the open host rather than
// a handler of its own, so the spec is the projection.
//

export const DataServiceSpec = LayerSpec.make(
  { affinity: 'application', requires: [EchoHostService], provides: [DataService.Tag] },
  () =>
    Layer.effect(
      DataService.Tag,
      Effect.map(EchoHostService, (echoHost) => echoHost.dataService),
    ),
);

export const DataServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [DataService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(DataService.Rpcs, DataService.Tag),
);

export const QueryServiceSpec = LayerSpec.make(
  { affinity: 'application', requires: [EchoHostService], provides: [QueryService.Tag] },
  () =>
    Layer.effect(
      QueryService.Tag,
      Effect.map(EchoHostService, (echoHost) => echoHost.queryService),
    ),
);

export const QueryServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [QueryService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(QueryService.Rpcs, QueryService.Tag),
);

export const FeedServiceSpec = LayerSpec.make(
  { affinity: 'application', requires: [EchoHostService], provides: [FeedService.Tag] },
  () =>
    Layer.effect(
      FeedService.Tag,
      Effect.map(EchoHostService, (echoHost) => echoHost.feedService),
    ),
);

export const FeedServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [FeedService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(FeedService.Rpcs, FeedService.Tag),
);
