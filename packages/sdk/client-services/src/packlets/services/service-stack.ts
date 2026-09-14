//
// Copyright 2022 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { type ConfigService } from '@dxos/config';
import {
  EchoEdgeSubductionReplicatorLayer,
  EchoHostLayer,
  EchoHostService,
  EdgeAutomergeReplicatorService,
  MeshEchoReplicatorLayer,
  MeshEchoReplicatorService,
  runSqliteHealthCheck,
} from '@dxos/echo-host';
import {
  type EdgeConnection,
  EdgeConnectionService,
  type EdgeHttpClient,
  EdgeHttpClientService,
} from '@dxos/edge-client';
import { Event, RuntimeProvider } from '@dxos/effect';
import { FeedFactoryLayer, FeedStoreLayer, FeedStoreService } from '@dxos/feed-store';
import { KeyringApiService, SqliteKeyring, SqliteKeyringLayer } from '@dxos/keyring';
import { log } from '@dxos/log';
import { SignalManagerService } from '@dxos/messaging';
import { SwarmNetworkManagerService, type TransportFactory } from '@dxos/network-manager';
import { InvalidStorageVersionError, STORAGE_VERSION } from '@dxos/protocols';
import { FeedProtocol } from '@dxos/protocols';
import { type Runtime_Client_EdgeFeatures } from '@dxos/protocols/buf/dxos/config_pb';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { EdgeAgentManagerLayer, EdgeAgentManagerService } from '../agents/index.ts';
import {
  EdgeIdentityRecoveryManagerLayer,
  EdgeIdentityRecoveryManagerService,
} from '../identity/identity-recovery-manager.ts';
import {
  IdentityLifecycleLayer,
  IdentityLifecycleService,
  IdentityManagerLayer,
  type IdentityManagerProps,
  IdentityManagerService,
  IdentityProviderService,
  identityProviderFromManager,
} from '../identity/index.ts';
import {
  type InvitationConnectionProps,
  InvitationFactoriesLayer,
  InvitationsHandlerLayer,
  InvitationsHandlerService,
  InvitationsManagerLayer,
  InvitationsManagerService,
} from '../invitations/index.ts';
import { IMetadataStoreService, SqliteMetadataStore, SqliteMetadataStoreLayer } from '../metadata/index.ts';
import { valueEncoding } from '../pipeline/index.ts';
import { SpaceManagerLayer, SpaceManagerService } from '../space/index.ts';
import {
  DataSpaceManagerLayer,
  type DataSpaceManagerRuntimeProps,
  DataSpaceManagerService,
  SigningContextProviderLayer,
  SigningContextProviderService,
} from '../spaces/index.ts';
import {
  CrossDeviceSpaceSynchronizerLayer,
  CrossDeviceSpaceSynchronizerService,
} from './cross-device-space-synchronizer.ts';
import { NetworkReady, Opening, StorageReady } from './events.ts';
import { FeedSyncerLayer } from './feed-syncer.ts';
import { NetworkLifecycleLayer, SwarmNetworkManagerLayer } from './network-lifecycle.ts';
import { FeedStorageDirectoryLayer, SqliteStorage, SqliteStorageLayer } from './sqlite-storage.ts';
import { StackReadinessLayer, StackReadinessService } from './stack-readiness.ts';

// SqlTransaction.SqlTransaction is the Tag class exported from the SqlTransaction namespace.
type SqlTransactionTag = SqlTransaction.SqlTransaction;

export type ServiceContextRuntimeProps = Pick<
  IdentityManagerProps,
  'devicePresenceOfflineTimeout' | 'devicePresenceAnnounceInterval'
> &
  DataSpaceManagerRuntimeProps & {
    invitationConnectionDefaultProps?: InvitationConnectionProps;
    disableP2pReplication?: boolean;
    enableVectorIndexing?: boolean;
  };

/**
 * Combined storage migration effect gathered from the concrete SQLite stores.
 * Run by the storage lifecycle handler when the host starts opening.
 */
export class StorageMigrationService extends EffectContext.Service<
  StorageMigrationService,
  Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag>
>()('@dxos/client-services/StorageMigration') {}

export type ServiceStackServices = ServiceContextRuntimeProps & {
  edgeFeatures?: Runtime_Client_EdgeFeatures;
  edgeConnection?: EdgeConnection;
  edgeHttpClient?: EdgeHttpClient;
  transportFactory?: TransportFactory;
  connectionLog?: boolean;
  autoConnect?: boolean;
};

/**
 * Component tags the composed stack exposes so {@link ClientServicesHost} and the client RPC service
 * layers can depend on each component directly.
 */
export type ServiceContextStackContext =
  | EchoHostService
  | IdentityManagerService
  | IdentityProviderService
  | SpaceManagerService
  | InvitationsManagerService
  | InvitationsHandlerService
  | EdgeIdentityRecoveryManagerService
  | KeyringApiService
  | DataSpaceManagerService
  | EdgeAgentManagerService
  | CrossDeviceSpaceSynchronizerService
  | SigningContextProviderService
  | IMetadataStoreService
  | FeedStoreService
  | StorageMigrationService
  | IdentityLifecycleService
  | StackReadinessService
  | SwarmNetworkManagerService;

/**
 * Effect Layer composing the dormant client-stack components, constructed before identity is ready.
 * Each layer opens its component on the lifecycle event it depends on (see `events.ts`) and closes
 * it in its finalizer; {@link ClientServicesHost} only emits `Opening` and `StackOpened`.
 */
export const ServiceStack = (
  options: ServiceStackServices,
): Layer.Layer<
  ServiceContextStackContext,
  never,
  Event.Bus | ConfigService | SignalManagerService | SqlClient.SqlClient | SqlTransactionTag
> => {
  const { edgeConnection, edgeHttpClient } = options;

  // Core stack, flattened into a single pipe. Optional replicators expose their service via
  // `provideMerge` and are read with `serviceOption` down the stack; their absence is modelled by
  // not wiring the layer, not by a null value.
  // The chain order is load-bearing for teardown: layer finalizers close components in reverse
  // build order, so a dependent must sit above what it depends on.
  const core = CrossDeviceSpaceSynchronizerLayer.pipe(
    Layer.provideMerge(EdgeAgentManagerLayer({ edgeFeatures: options.edgeFeatures })),
    Layer.provideMerge(InvitationFactoriesLayer),
    Layer.provideMerge(DataSpaceManagerLayer({ runtimeProps: options, edgeFeatures: options.edgeFeatures })),
    Layer.provideMerge(SigningContextProviderLayer),
    Layer.provideMerge(identityProviderLayer),
    Layer.provideMerge(replicatorsLayer),
    Layer.provideMerge(options.disableP2pReplication ? Layer.empty : MeshEchoReplicatorLayer()),
    Layer.provideMerge(echoHostLayer({ useSubduction: options.edgeFeatures?.subductionReplicator })),
    Layer.provideMerge(InvitationsManagerLayer()),
    Layer.provideMerge(InvitationsHandlerLayer({ connectionProps: options.invitationConnectionDefaultProps })),
    Layer.provideMerge(IdentityLifecycleLayer),
    Layer.provideMerge(EdgeIdentityRecoveryManagerLayer()),
    Layer.provideMerge(
      IdentityManagerLayer({
        devicePresenceOfflineTimeout: options.devicePresenceOfflineTimeout,
        devicePresenceAnnounceInterval: options.devicePresenceAnnounceInterval,
        edgeFeatures: options.edgeFeatures,
        automergeCredentials: options.automergeCredentials,
      }),
    ),
    Layer.provideMerge(SpaceManagerLayer({ disableP2pReplication: options.disableP2pReplication })),
    Layer.provideMerge(NetworkLifecycleLayer({ autoConnect: options.autoConnect })),
    Layer.provideMerge(
      SwarmNetworkManagerLayer({ transportFactory: options.transportFactory, connectionLog: options.connectionLog }),
    ),
    Layer.provideMerge(StackReadinessLayer),
    Layer.provideMerge(storageLifecycleLayer),
    Layer.provideMerge(storageLayer),
  );

  // Non-edge: just the core.
  if (!edgeConnection || !edgeHttpClient) {
    return core;
  }

  // Edge: the feed syncer sits above the core for its `EchoHostService` requirement; the edge
  // replicator sits below — it needs only the edge inputs, resolved via `serviceOption` inside the
  // core. Edge inputs are provided internally so they never surface as stack requirements.
  return FeedSyncerLayer({
    peerId: '',
    syncNamespaces: [FeedProtocol.WellKnownNamespaces.data, FeedProtocol.WellKnownNamespaces.trace],
  }).pipe(
    Layer.provideMerge(core),
    Layer.provideMerge(options.edgeFeatures?.subductionReplicator ? EchoEdgeSubductionReplicatorLayer() : Layer.empty),
    Layer.provideMerge(
      Layer.mergeAll(
        Layer.succeed(EdgeConnectionService, edgeConnection),
        Layer.succeed(EdgeHttpClientService, edgeHttpClient),
      ),
    ),
  );
};

/**
 * Attaches the configured replicators to the echo host once networking is up. Sits above both
 * replicator layers so it can see whichever of them is wired.
 */
const replicatorsLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const echoHost = yield* EchoHostService;
    const meshReplicator = Option.getOrUndefined(yield* Effect.serviceOption(MeshEchoReplicatorService));
    const edgeReplicator = Option.getOrUndefined(yield* Effect.serviceOption(EdgeAutomergeReplicatorService));
    yield* NetworkReady.pipe(
      Event.handler(({ ctx }) =>
        Effect.promise(async () => {
          if (meshReplicator) {
            await echoHost.addReplicator(ctx, meshReplicator);
          }
          if (edgeReplicator) {
            await echoHost.addReplicator(ctx, edgeReplicator);
          }
        }),
      ),
      Event.subscribe,
    );
  }),
);

/**
 * Provides the {@link IdentityProviderService} from the resolved {@link IdentityManager}.
 */
const identityProviderLayer = Layer.effect(
  IdentityProviderService,
  Effect.gen(function* () {
    const identityManager = yield* IdentityManagerService;
    return identityProviderFromManager(identityManager);
  }),
);

/**
 * Combined storage migration effect. Storage migrations are idempotent `CREATE TABLE` effects that
 * do not depend on store instance state, so they are extracted from throwaway instances to keep the
 * store layers individual.
 */
const storageMigrationLayer = Layer.effect(
  StorageMigrationService,
  Effect.gen(function* () {
    const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransactionTag>();
    return Effect.all(
      [
        new SqliteMetadataStore({ runtime }).migrate,
        new SqliteKeyring({ runtime }).migrate,
        new SqliteStorage({ runtime }).migrate,
      ],
      { discard: true },
    );
  }),
);

/**
 * Opens storage when the host starts opening: migrations, the storage version check, and the SQLite
 * health check run in this order inside one handler, since a `serial` event would order them by
 * subscription instead.
 */
const storageLifecycleLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransactionTag>();
    const migrate = yield* StorageMigrationService;
    const metadataStore = yield* IMetadataStoreService;
    yield* Opening.pipe(
      Event.handler(({ ctx }) =>
        Effect.gen(function* () {
          log('running storage migrations...');
          yield* Effect.promise(() => RuntimeProvider.runPromise(runtime)(migrate));
          yield* Effect.promise(() => metadataStore.load());
          if (metadataStore.version !== STORAGE_VERSION) {
            // TODO(mykola): Migrate storage to a new version if incompatibility is detected.
            throw new InvalidStorageVersionError(STORAGE_VERSION, metadataStore.version);
          }
          log('running sqlite health check...');
          yield* Effect.promise(() => runSqliteHealthCheck(runtime));
          log('storage ready');
          yield* Event.emit(StorageReady, { ctx });
        }),
      ),
      Event.subscribe,
    );
  }),
);

/**
 * Storage / feed layers composed from the individual store layers plus the combined migration.
 */
const storageLayer = Layer.empty.pipe(
  Layer.provideMerge(FeedStoreLayer()),
  Layer.provideMerge(FeedFactoryLayer({ hypercore: { valueEncoding, stats: true } })),
  Layer.provideMerge(FeedStorageDirectoryLayer()),
  Layer.provideMerge(SqliteMetadataStoreLayer()),
  Layer.provideMerge(SqliteKeyringLayer()),
  Layer.provideMerge(SqliteStorageLayer()),
  Layer.provideMerge(storageMigrationLayer),
);

/**
 * Constructs the {@link EchoHost}, resolving the identity/space callbacks that point down the stack.
 * The feed sync handlers (which point up) are wired later via `EchoHost.setFeedSyncHandlers`.
 *
 * The host is self-contained (runs its own migrations, owns its feed/automerge stores), so its
 * open/close is owned by the layer scope: it opens when the stack is built and closes when the
 * runtime is disposed. Identity-, network-, and storage-bound lifecycle stays in `ClientServicesHost`.
 */
const echoHostLayer = (options: { useSubduction?: boolean }) =>
  Layer.effectDiscard(
    Effect.gen(function* () {
      const echoHost = yield* EchoHostService;
      yield* Effect.acquireRelease(
        Effect.promise(() => echoHost.open()),
        () => Effect.promise(() => echoHost.close()),
      );

      // Points back down the stack, like the feed sync handlers above: the identity manager anchors
      // the HALO space on a root document and needs the open host to do it.
      const identityManager = yield* IdentityManagerService;
      yield* Effect.promise(() => identityManager.setEchoHost(echoHost));
    }),
  ).pipe(
    Layer.provideMerge(
      Layer.unwrap(
        Effect.gen(function* () {
          const identityManager = yield* IdentityManagerService;
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
