//
// Copyright 2022 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import {
  EchoEdgeReplicatorLayer,
  EchoEdgeSubductionReplicatorLayer,
  EchoHostLayer,
  EchoHostService,
  MeshEchoReplicatorLayer,
} from '@dxos/echo-host';
import {
  type EdgeConnection,
  EdgeConnectionService,
  type EdgeHttpClient,
  EdgeHttpClientService,
} from '@dxos/edge-client';
import { RuntimeProvider } from '@dxos/effect';
import { FeedFactoryLayer, FeedStoreLayer, FeedStoreService } from '@dxos/feed-store';
import { KeyringApiService, SqliteKeyring, SqliteKeyringLayer } from '@dxos/keyring';
import { SignalManagerService } from '@dxos/messaging';
import { SwarmNetworkManagerService } from '@dxos/network-manager';
import { FeedProtocol } from '@dxos/protocols';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import { SqlTransaction } from '@dxos/sql-sqlite';
import { BlobStoreApiService, SqliteBlobStore, SqliteBlobStoreLayer } from '@dxos/teleport-extension-object-sync';

import { EdgeAgentManagerLayer, EdgeAgentManagerService } from '../agents';
import {
  IdentityManagerLayer,
  type IdentityManagerProps,
  IdentityManagerService,
  IdentityProviderService,
  identityProviderFromManager,
} from '../identity';
import {
  EdgeIdentityRecoveryManagerLayer,
  EdgeIdentityRecoveryManagerService,
} from '../identity/identity-recovery-manager';
import {
  type InvitationConnectionProps,
  InvitationsHandlerLayer,
  InvitationsHandlerService,
  InvitationsManagerLayer,
  InvitationsManagerService,
} from '../invitations';
import { IMetadataStoreService, SqliteMetadataStore, SqliteMetadataStoreLayer } from '../metadata';
import { valueEncoding } from '../pipeline';
import { SpaceManagerLayer, SpaceManagerService } from '../space';
import {
  DataSpaceManagerLayer,
  type DataSpaceManagerRuntimeProps,
  DataSpaceManagerService,
  SigningContextProviderLayer,
  SigningContextProviderService,
} from '../spaces';
import {
  CrossDeviceSpaceSynchronizerLayer,
  CrossDeviceSpaceSynchronizerService,
} from './cross-device-space-synchronizer';
import { FeedSyncerLayer } from './feed-syncer';
import { FeedStorageDirectoryLayer, SqliteStorage, SqliteStorageLayer } from './sqlite-storage';

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
 * Run by {@link ClientServicesHost} during open (storage migration stage).
 */
export class StorageMigrationService extends EffectContext.Tag('@dxos/client-services/StorageMigration')<
  StorageMigrationService,
  Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag>
>() {}

export type ServiceContextLayerOptions = ServiceContextRuntimeProps & {
  edgeFeatures?: Runtime.Client.EdgeFeatures;
  edgeConnection?: EdgeConnection;
  edgeHttpClient?: EdgeHttpClient;
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
  | BlobStoreApiService
  | FeedStoreService
  | StorageMigrationService;

/**
 * Effect Layer composing the dormant client-stack components, constructed before identity is ready.
 * {@link ClientServicesHost} resolves these tags and drives their lifecycle.
 */
export const ServiceContextLayer = (
  options: ServiceContextLayerOptions,
): Layer.Layer<
  ServiceContextStackContext,
  never,
  SwarmNetworkManagerService | SignalManagerService | SqlClient.SqlClient | SqlTransactionTag
> => {
  const { edgeConnection, edgeHttpClient } = options;

  // Core stack, flattened into a single pipe. Optional replicators expose their service via
  // `provideMerge` and are read with `serviceOption` down the stack; their absence is modelled by
  // not wiring the layer, not by a null value.
  const core = CrossDeviceSpaceSynchronizerLayer.pipe(
    Layer.provideMerge(EdgeAgentManagerLayer({ edgeFeatures: options.edgeFeatures })),
    Layer.provideMerge(DataSpaceManagerLayer({ runtimeProps: options, edgeFeatures: options.edgeFeatures })),
    Layer.provideMerge(SigningContextProviderLayer),
    Layer.provideMerge(identityProviderLayer),
    Layer.provideMerge(options.disableP2pReplication ? Layer.empty : MeshEchoReplicatorLayer()),
    Layer.provideMerge(echoHostLayer({ useSubduction: options.edgeFeatures?.subductionReplicator })),
    Layer.provideMerge(InvitationsManagerLayer()),
    Layer.provideMerge(InvitationsHandlerLayer({ connectionProps: options.invitationConnectionDefaultProps })),
    Layer.provideMerge(EdgeIdentityRecoveryManagerLayer()),
    Layer.provideMerge(
      IdentityManagerLayer({
        devicePresenceOfflineTimeout: options.devicePresenceOfflineTimeout,
        devicePresenceAnnounceInterval: options.devicePresenceAnnounceInterval,
        edgeFeatures: options.edgeFeatures,
      }),
    ),
    Layer.provideMerge(SpaceManagerLayer({ disableP2pReplication: options.disableP2pReplication })),
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
    Layer.provideMerge(
      options.edgeFeatures?.subductionReplicator
        ? EchoEdgeSubductionReplicatorLayer()
        : options.edgeFeatures?.echoReplicator
          ? EchoEdgeReplicatorLayer()
          : Layer.empty,
    ),
    Layer.provideMerge(
      Layer.mergeAll(
        Layer.succeed(EdgeConnectionService, edgeConnection),
        Layer.succeed(EdgeHttpClientService, edgeHttpClient),
      ),
    ),
  );
};

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
 * store layers individual. Run by {@link ClientServicesHost} during open.
 */
const storageMigrationLayer = Layer.effect(
  StorageMigrationService,
  Effect.gen(function* () {
    const runtime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransactionTag>();
    return Effect.all(
      [
        new SqliteMetadataStore({ runtime }).migrate,
        new SqliteBlobStore({ runtime }).migrate,
        new SqliteKeyring({ runtime }).migrate,
        new SqliteStorage({ runtime }).migrate,
      ],
      { discard: true },
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
  Layer.provideMerge(SqliteBlobStoreLayer()),
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
  Layer.scopedDiscard(
    Effect.gen(function* () {
      const echoHost = yield* EchoHostService;
      yield* Effect.acquireRelease(
        Effect.promise(() => echoHost.open()),
        () => Effect.promise(() => echoHost.close()),
      );
    }),
  ).pipe(
    Layer.provideMerge(
      Layer.unwrapEffect(
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
