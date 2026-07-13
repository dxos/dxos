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
import { EdgeConnectionService, EdgeHttpClientService } from '@dxos/edge-client';
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
 * Internal to the stack; run during open (stage 2) by the service lifecycle.
 */
export class StorageMigrationService extends EffectContext.Tag('@dxos/client-services/StorageMigration')<
  StorageMigrationService,
  Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag>
>() {}

export type ServiceContextLayerOptions = ServiceContextRuntimeProps & {
  edgeFeatures?: Runtime.Client.EdgeFeatures;
};

/**
 * Component tags the composed stack exposes so client RPC service layers and the service lifecycle
 * can depend on each component directly rather than reaching through an orchestrator. Optional
 * components (mesh/edge replicators, feed syncer) are resolved via `Effect.serviceOption` and are
 * therefore intentionally absent from this union.
 */
export type ServiceContextComponents =
  | EchoHostService
  | IMetadataStoreService
  | BlobStoreApiService
  | KeyringApiService
  | FeedStoreService
  | StorageMigrationService
  | SpaceManagerService
  | IdentityManagerService
  | EdgeIdentityRecoveryManagerService
  | InvitationsHandlerService
  | InvitationsManagerService
  | SigningContextProviderService
  | DataSpaceManagerService
  | EdgeAgentManagerService
  | CrossDeviceSpaceSynchronizerService;

/**
 * Effect Layer composing the dormant service components, constructed before identity is ready.
 * Exposes the component tags in {@link ServiceContextComponents}; the service lifecycle (see
 * `service-lifecycle.ts`) drives migrate/open, identity creation and readiness on top of them.
 *
 * Network, signal, transport and (when configured) edge clients are provided beneath this layer by
 * the host; the edge-only {@link feedSyncerLayer} / {@link edgeReplicatorLayer} are composed around
 * it by the host in edge mode (they resolve the edge clients from that base).
 */
export const ServiceContextLayer = (
  options: ServiceContextLayerOptions,
): Layer.Layer<
  ServiceContextComponents,
  never,
  SwarmNetworkManagerService | SignalManagerService | SqlClient.SqlClient | SqlTransactionTag
> => coreLayers(options);

/**
 * Composes the non-optional core layers into a single stack that callers merge beneath their top layer.
 */
const coreLayers = (options: ServiceContextLayerOptions) =>
  CrossDeviceSpaceSynchronizerLayer.pipe(
    Layer.provideMerge(EdgeAgentManagerLayer({ edgeFeatures: options.edgeFeatures })),
    Layer.provideMerge(DataSpaceManagerLayer({ runtimeProps: options, edgeFeatures: options.edgeFeatures })),
    Layer.provideMerge(SigningContextProviderLayer),
    Layer.provideMerge(identityProviderLayer),
    Layer.provideMerge(meshReplicatorLayer(options)),
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

/**
 * Optional mesh replicator: read via `serviceOption`, so its `ROut` is hidden (`Layer<never>`) —
 * absence when p2p is disabled is modelled by not providing it, not by a null value.
 */
const meshReplicatorLayer = (options: ServiceContextLayerOptions): Layer.Layer<never, never, never> =>
  options.disableP2pReplication ? Layer.empty : MeshEchoReplicatorLayer();

/**
 * Optional edge replicator (subduction / echo / none) — `ROut` hidden, read via `serviceOption`.
 * Composed beneath {@link ServiceContextLayer} by the host in edge mode; resolves the edge clients
 * from the base of the stack.
 */
export const edgeReplicatorLayer = (
  options: ServiceContextLayerOptions,
): Layer.Layer<never, never, EdgeConnectionService | EdgeHttpClientService> =>
  options.edgeFeatures?.subductionReplicator
    ? EchoEdgeSubductionReplicatorLayer()
    : options.edgeFeatures?.echoReplicator
      ? EchoEdgeReplicatorLayer()
      : Layer.empty;

/**
 * Feed syncer, composed above {@link ServiceContextLayer} by the host in edge mode: it needs
 * `EchoHostService` from the core (below it) and the `EdgeConnectionService` from the base.
 */
export const feedSyncerLayer = FeedSyncerLayer({
  peerId: '',
  syncNamespaces: [FeedProtocol.WellKnownNamespaces.data, FeedProtocol.WellKnownNamespaces.trace],
});

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
 * store layers individual. Run in stage 2 by the service lifecycle open sequence.
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
 * runtime is disposed. Identity-, network-, and storage-bound lifecycle stays in the service lifecycle.
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
