//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { RegisterService } from '@dxos/client-protocol';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { ConfigService } from '@dxos/config';
import {
  EchoEdgeSubductionReplicatorLayer,
  EchoHostService,
  EdgeAutomergeReplicatorService,
  MeshEchoReplicatorLayer,
  MeshEchoReplicatorService,
} from '@dxos/echo-host';
import { EdgeConnectionService, EdgeHttpClientService } from '@dxos/edge-client';
import { Hook } from '@dxos/effect';
import {
  HypercoreFactoryLayer,
  HypercoreFactoryService,
  HypercoreStorageDirectoryService,
  HypercoreStoreLayer,
  HypercoreStoreService,
} from '@dxos/feed-store';
import { KeyringApiService, SqliteKeyringLayer } from '@dxos/keyring';
import { SignalManagerService } from '@dxos/messaging';
import { SwarmNetworkManagerService } from '@dxos/network-manager';
import { FeedProtocol } from '@dxos/protocols';
import {
  ContactsService,
  DataService,
  DevicesService,
  DevtoolsHost,
  EdgeAgentService,
  FeedService,
  IdentityService,
  InvitationsService,
  LoggingService,
  NetworkService,
  QueryService,
  SpacesService,
  SystemService,
} from '@dxos/protocols/rpc';
import { RpcRouter } from '@dxos/rpc';
import type * as SqlExport from '@dxos/sql-sqlite/SqlExport';

import { EdgeAgentManagerLayer, EdgeAgentManagerService, EdgeAgentServiceLayer } from '../agents/index.ts';
import { DevicesServiceLayer } from '../devices/index.ts';
import { DevtoolsHostLayer, DevtoolsHostService } from '../devtools/index.ts';
import {
  EdgeIdentityRecoveryManagerLayer,
  EdgeIdentityRecoveryManagerService,
} from '../identity/identity-recovery-manager.ts';
import {
  ContactsServiceLayer,
  IdentityLifecycleLayer,
  IdentityLifecycleService,
  IdentityManagerLayer,
  IdentityManagerService,
  IdentityProviderService,
  IdentityServiceLayer,
} from '../identity/index.ts';
import {
  InvitationFactoriesLayer,
  InvitationsHandlerLayer,
  InvitationsHandlerService,
  InvitationsManagerLayer,
  InvitationsManagerService,
  InvitationsServiceLayer,
} from '../invitations/index.ts';
import { LoggingServiceLayer } from '../logging/index.ts';
import { IMetadataStoreService, SqliteMetadataStoreLayer } from '../metadata/index.ts';
import { NetworkServiceLayer } from '../network/index.ts';
import { valueEncoding } from '../pipeline/index.ts';
import { SpaceManagerLayer, SpaceManagerService } from '../space/index.ts';
import {
  DataSpaceManagerLayer,
  DataSpaceManagerService,
  SigningContextProviderLayer,
  SigningContextProviderService,
  SpacesServiceLayer,
} from '../spaces/index.ts';
import { SystemServiceLayer } from '../system/index.ts';
import { TransportFactoryService } from './client-platform.ts';
import {
  CrossDeviceSpaceSynchronizerLayer,
  CrossDeviceSpaceSynchronizerService,
} from './cross-device-space-synchronizer.ts';
import { FeedSyncerLayer, FeedSyncerService } from './feed-syncer.ts';
import { NetworkLifecycleLayer, SwarmNetworkManagerLayer } from './network-lifecycle.ts';
import {
  type ServiceStackServices,
  StorageMigrationService,
  echoHostLayer,
  identityProviderLayer,
  registerReplicator,
  storageLifecycleLayer,
  storageMigrationLayer,
} from './service-stack.ts';
import { HypercoreStorageDirectoryLayer, SqliteStorageLayer, SqliteStorageService } from './sqlite-storage.ts';
import { StackReadinessLayer, StackReadinessService } from './stack-readiness.ts';

const application = 'application' as const;

/**
 * The client stack as a list of {@link LayerSpec.LayerSpec}s for a `LayerStack` to aggregate: each
 * spec declares the tags it needs and the tags it provides, so build order — and which specs are
 * built at all — follows from the graph rather than from a hand-written `provideMerge` chain.
 *
 * Two conventions carry the behaviour the chain used to encode:
 *
 * - A spec whose point is a side effect provides no tag for anyone to request (a lifecycle
 *   subscription, an rpc registration, a replicator attaching itself to the echo host), so it is
 *   `eager`.
 * - Anything conditional is conditional *within* a spec: a spec that needs the edge requires the
 *   edge tags, which the embedder supplies ambiently only with an endpoint configured, and an
 *   unsatisfied requirement prunes the spec. Option-driven choices (p2p replication, subduction)
 *   are made inside the spec body.
 *
 * The embedder supplies {@link ConfigService}, {@link Hook.Controller}, the SQL services, the
 * platform inputs and — when configured — the edge clients as the stack's ambient services.
 */
export const clientServiceSpecs = (options: ServiceStackServices): LayerSpec.LayerSpec[] => [
  //
  // Storage.
  //

  LayerSpec.make({ affinity: application, requires: [SqlClient.SqlClient], provides: [SqliteStorageService] }, () =>
    SqliteStorageLayer(),
  ),
  LayerSpec.make(
    { affinity: application, requires: [SqliteStorageService], provides: [HypercoreStorageDirectoryService] },
    () => HypercoreStorageDirectoryLayer(),
  ),
  LayerSpec.make({ affinity: application, requires: [SqlClient.SqlClient], provides: [KeyringApiService] }, () =>
    SqliteKeyringLayer(),
  ),
  LayerSpec.make({ affinity: application, requires: [SqlClient.SqlClient], provides: [IMetadataStoreService] }, () =>
    SqliteMetadataStoreLayer(),
  ),
  LayerSpec.make(
    {
      affinity: application,
      requires: [KeyringApiService, HypercoreStorageDirectoryService],
      provides: [HypercoreFactoryService],
    },
    () => HypercoreFactoryLayer({ hypercore: { valueEncoding, stats: true } }),
  ),
  LayerSpec.make(
    { affinity: application, requires: [HypercoreFactoryService], provides: [HypercoreStoreService] },
    () => HypercoreStoreLayer(),
  ),
  LayerSpec.make(
    { affinity: application, requires: [SqlClient.SqlClient], provides: [StorageMigrationService] },
    () => storageMigrationLayer,
  ),
  LayerSpec.make(
    {
      affinity: application,
      requires: [SqlClient.SqlClient, StorageMigrationService, IMetadataStoreService, Hook.Controller],
      provides: [],
      eager: true,
    },
    () => storageLifecycleLayer,
  ),

  //
  // Network.
  //

  LayerSpec.make(
    { affinity: application, requires: [Hook.Controller], provides: [StackReadinessService] },
    () => StackReadinessLayer,
  ),
  LayerSpec.make(
    {
      affinity: application,
      requires: [SignalManagerService, TransportFactoryService],
      provides: [SwarmNetworkManagerService],
    },
    () => SwarmNetworkManagerLayer({ connectionLog: options.connectionLog }),
  ),
  LayerSpec.make(
    {
      affinity: application,
      requires: [Hook.Controller, SwarmNetworkManagerService, IdentityManagerService],
      provides: [],
      eager: true,
    },
    () => NetworkLifecycleLayer({ autoConnect: options.autoConnect }),
  ),

  //
  // Identity and spaces.
  //

  LayerSpec.make(
    {
      affinity: application,
      requires: [Hook.Controller, HypercoreStoreService, SwarmNetworkManagerService, IMetadataStoreService],
      provides: [SpaceManagerService],
    },
    () => SpaceManagerLayer({ disableP2pReplication: options.disableP2pReplication }),
  ),
  LayerSpec.make(
    {
      affinity: application,
      requires: [Hook.Controller, IMetadataStoreService, KeyringApiService, HypercoreStoreService, SpaceManagerService],
      provides: [IdentityManagerService],
    },
    () =>
      IdentityManagerLayer({
        devicePresenceOfflineTimeout: options.devicePresenceOfflineTimeout,
        devicePresenceAnnounceInterval: options.devicePresenceAnnounceInterval,
        edgeFeatures: options.edgeFeatures,
        automergeCredentials: options.automergeCredentials,
      }),
  ),
  LayerSpec.make(
    { affinity: application, requires: [IdentityManagerService], provides: [IdentityProviderService] },
    () => identityProviderLayer,
  ),
  LayerSpec.make(
    {
      affinity: application,
      requires: [KeyringApiService, IdentityManagerService],
      provides: [EdgeIdentityRecoveryManagerService],
    },
    () => EdgeIdentityRecoveryManagerLayer(),
  ),
  LayerSpec.make(
    {
      affinity: application,
      requires: [Hook.Controller, IdentityManagerService, EdgeIdentityRecoveryManagerService],
      provides: [IdentityLifecycleService],
    },
    () => IdentityLifecycleLayer,
  ),
  LayerSpec.make(
    { affinity: application, requires: [IdentityProviderService], provides: [SigningContextProviderService] },
    () => SigningContextProviderLayer,
  ),
  LayerSpec.make(
    {
      affinity: application,
      requires: [SwarmNetworkManagerService],
      provides: [InvitationsHandlerService],
    },
    () => InvitationsHandlerLayer({ connectionProps: options.invitationConnectionDefaultProps }),
  ),
  LayerSpec.make(
    {
      affinity: application,
      requires: [Hook.Controller, InvitationsHandlerService, IMetadataStoreService],
      provides: [InvitationsManagerService],
    },
    () => InvitationsManagerLayer(),
  ),
  LayerSpec.make(
    {
      affinity: application,
      requires: [IdentityManagerService, SpaceManagerService],
      provides: [EchoHostService],
    },
    () => echoHostLayer({ useSubduction: options.edgeFeatures?.subductionReplicator }),
  ),
  LayerSpec.make(
    {
      affinity: application,
      requires: [
        Hook.Controller,
        SpaceManagerService,
        IMetadataStoreService,
        KeyringApiService,
        SigningContextProviderService,
        HypercoreStoreService,
        EchoHostService,
        InvitationsManagerService,
      ],
      provides: [DataSpaceManagerService],
    },
    () => DataSpaceManagerLayer({ runtimeProps: options, edgeFeatures: options.edgeFeatures }),
  ),
  LayerSpec.make(
    {
      affinity: application,
      requires: [
        InvitationsManagerService,
        IdentityManagerService,
        IdentityLifecycleService,
        KeyringApiService,
        DataSpaceManagerService,
        SigningContextProviderService,
      ],
      provides: [],
      eager: true,
    },
    () => InvitationFactoriesLayer,
  ),
  LayerSpec.make(
    {
      affinity: application,
      requires: [Hook.Controller, DataSpaceManagerService, IdentityProviderService],
      provides: [EdgeAgentManagerService],
    },
    () => EdgeAgentManagerLayer({ edgeFeatures: options.edgeFeatures }),
  ),
  LayerSpec.make(
    {
      affinity: application,
      requires: [Hook.Controller, DataSpaceManagerService],
      provides: [CrossDeviceSpaceSynchronizerService],
    },
    () => CrossDeviceSpaceSynchronizerLayer,
  ),

  //
  // Replication. Each replicator registers itself with the echo host, so none of them provides a tag
  // the rest of the stack asks for; the ones that need the edge are pruned without it.
  //

  LayerSpec.make(
    { affinity: application, requires: [EchoHostService, Hook.Controller], provides: [], eager: true },
    () =>
      options.disableP2pReplication
        ? Layer.empty
        : registerReplicator(MeshEchoReplicatorService).pipe(Layer.provide(MeshEchoReplicatorLayer())),
  ),
  LayerSpec.make(
    {
      affinity: application,
      requires: [EchoHostService, Hook.Controller, EdgeConnectionService, EdgeHttpClientService],
      provides: [],
      eager: true,
    },
    () =>
      options.edgeFeatures?.subductionReplicator
        ? registerReplicator(EdgeAutomergeReplicatorService).pipe(Layer.provide(EchoEdgeSubductionReplicatorLayer()))
        : Layer.empty,
  ),
  LayerSpec.make(
    {
      affinity: application,
      requires: [Hook.Controller, SqlClient.SqlClient, EchoHostService, EdgeConnectionService],
      provides: [FeedSyncerService],
      eager: true,
    },
    () =>
      FeedSyncerLayer({
        peerId: '',
        syncNamespaces: [FeedProtocol.WellKnownNamespaces.data, FeedProtocol.WellKnownNamespaces.trace],
      }),
  ),

  //
  // RPC services. Each handler keeps its own tag, and its registration with the router is a separate
  // spec — eager, because a registration provides nothing for anyone to ask for.
  //

  LayerSpec.make({ affinity: application, requires: [], provides: [RpcRouter.RpcRouter] }, () => RpcRouter.layer),

  // System.
  LayerSpec.make(
    {
      affinity: application,
      requires: [
        RpcRouter.RpcRouter,
        ConfigService,
        Hook.Controller,
        IdentityManagerService,
        DataSpaceManagerService,
        SwarmNetworkManagerService,
      ],
      provides: [SystemService.Tag],
    },
    () => SystemServiceLayer,
  ),
  LayerSpec.make(
    { affinity: application, requires: [SystemService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
    () => RegisterService(SystemService.Rpcs, SystemService.Tag),
  ),

  // Identity.
  LayerSpec.make(
    {
      affinity: application,
      requires: [
        IdentityManagerService,
        IdentityLifecycleService,
        EdgeIdentityRecoveryManagerService,
        KeyringApiService,
        DataSpaceManagerService,
      ],
      provides: [IdentityService.Tag],
    },
    () => IdentityServiceLayer,
  ),
  LayerSpec.make(
    { affinity: application, requires: [IdentityService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
    () => RegisterService(IdentityService.Rpcs, IdentityService.Tag),
  ),

  // Contacts.
  LayerSpec.make(
    {
      affinity: application,
      requires: [IdentityManagerService, SpaceManagerService, DataSpaceManagerService, StackReadinessService],
      provides: [ContactsService.Tag],
    },
    () => ContactsServiceLayer,
  ),
  LayerSpec.make(
    { affinity: application, requires: [ContactsService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
    () => RegisterService(ContactsService.Rpcs, ContactsService.Tag),
  ),

  // Invitations.
  LayerSpec.make(
    { affinity: application, requires: [InvitationsManagerService], provides: [InvitationsService.Tag] },
    () => InvitationsServiceLayer,
  ),
  LayerSpec.make(
    { affinity: application, requires: [InvitationsService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
    () => RegisterService(InvitationsService.Rpcs, InvitationsService.Tag),
  ),

  // Devices.
  LayerSpec.make(
    { affinity: application, requires: [IdentityManagerService], provides: [DevicesService.Tag] },
    () => DevicesServiceLayer,
  ),
  LayerSpec.make(
    { affinity: application, requires: [DevicesService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
    () => RegisterService(DevicesService.Rpcs, DevicesService.Tag),
  ),

  // Spaces.
  LayerSpec.make(
    {
      affinity: application,
      requires: [
        IdentityManagerService,
        SpaceManagerService,
        EchoHostService,
        DataSpaceManagerService,
        StackReadinessService,
      ],
      provides: [SpacesService.Tag],
    },
    () => SpacesServiceLayer,
  ),
  LayerSpec.make(
    { affinity: application, requires: [SpacesService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
    () => RegisterService(SpacesService.Rpcs, SpacesService.Tag),
  ),

  // Network.
  LayerSpec.make(
    {
      affinity: application,
      requires: [SwarmNetworkManagerService, SignalManagerService],
      provides: [NetworkService.Tag],
    },
    () => NetworkServiceLayer,
  ),
  LayerSpec.make(
    { affinity: application, requires: [NetworkService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
    () => RegisterService(NetworkService.Rpcs, NetworkService.Tag),
  ),

  // Edge agents.
  LayerSpec.make(
    {
      affinity: application,
      requires: [EdgeAgentManagerService, StackReadinessService],
      provides: [EdgeAgentService.Tag],
    },
    () => EdgeAgentServiceLayer,
  ),
  LayerSpec.make(
    { affinity: application, requires: [EdgeAgentService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
    () => RegisterService(EdgeAgentService.Rpcs, EdgeAgentService.Tag),
  ),

  // Data, query and feed: thin projections of the echo host rather than package-local impls.
  LayerSpec.make({ affinity: application, requires: [EchoHostService], provides: [DataService.Tag] }, () =>
    Layer.effect(
      DataService.Tag,
      Effect.map(EchoHostService, (echoHost) => echoHost.dataService),
    ),
  ),
  LayerSpec.make(
    { affinity: application, requires: [DataService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
    () => RegisterService(DataService.Rpcs, DataService.Tag),
  ),
  LayerSpec.make({ affinity: application, requires: [EchoHostService], provides: [QueryService.Tag] }, () =>
    Layer.effect(
      QueryService.Tag,
      Effect.map(EchoHostService, (echoHost) => echoHost.queryService),
    ),
  ),
  LayerSpec.make(
    { affinity: application, requires: [QueryService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
    () => RegisterService(QueryService.Rpcs, QueryService.Tag),
  ),
  LayerSpec.make({ affinity: application, requires: [EchoHostService], provides: [FeedService.Tag] }, () =>
    Layer.effect(
      FeedService.Tag,
      Effect.map(EchoHostService, (echoHost) => echoHost.feedService),
    ),
  ),
  LayerSpec.make(
    { affinity: application, requires: [FeedService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
    () => RegisterService(FeedService.Rpcs, FeedService.Tag),
  ),

  // Logging.
  LayerSpec.make({ affinity: application, requires: [], provides: [LoggingService.Tag] }, () => LoggingServiceLayer),
  LayerSpec.make(
    { affinity: application, requires: [LoggingService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
    () => RegisterService(LoggingService.Rpcs, LoggingService.Tag),
  ),

  // Devtools.
  LayerSpec.make(
    {
      affinity: application,
      requires: [
        ConfigService,
        KeyringApiService,
        HypercoreStoreService,
        SpaceManagerService,
        IMetadataStoreService,
        DataSpaceManagerService,
        StackReadinessService,
        SignalManagerService,
        SwarmNetworkManagerService,
        SqlClient.SqlClient,
      ],
      provides: [DevtoolsHost.Tag, DevtoolsHostService],
    },
    () => DevtoolsHostLayer,
  ),
  LayerSpec.make(
    { affinity: application, requires: [DevtoolsHost.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
    () => RegisterService(DevtoolsHost.Rpcs, DevtoolsHost.Tag),
  ),
];
