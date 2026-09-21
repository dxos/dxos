//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { RegisterService } from '@dxos/client-protocol';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { ConfigService, resolveTelemetryTag } from '@dxos/config';
import {
  EchoEdgeSubductionReplicatorLayer,
  EchoHostService,
  EdgeAutomergeReplicatorService,
  MeshEchoReplicatorLayer,
  MeshEchoReplicatorService,
} from '@dxos/echo-host';
import {
  EdgeClient,
  EdgeConnectionService,
  EdgeHttpClient,
  EdgeHttpClientService,
  createStubEdgeIdentity,
} from '@dxos/edge-client';
import { Hook } from '@dxos/effect';
import {
  HypercoreFactoryLayer,
  HypercoreFactoryService,
  HypercoreStorageDirectoryService,
  HypercoreStoreLayer,
  HypercoreStoreService,
} from '@dxos/feed-store';
import { KeyringApiService, SqliteKeyringLayer } from '@dxos/keyring';
import {
  EdgeSignalManager,
  MemorySignalManager,
  MemorySignalManagerContext,
  SignalManagerService,
} from '@dxos/messaging';
import { SwarmNetworkManagerService, createIceProvider, createRtcTransportFactory } from '@dxos/network-manager';
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
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';

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

/**
 * Subduction needs the edge clients as well as the feature flag: the flag is set in config profiles
 * that configure no edge endpoint, and requiring a tag nothing provides would prune the specs that
 * declare it — silently taking the data space manager, and every service built on it, with them.
 */
const subductionEnabled = (options: ServiceStackServices): boolean =>
  !!options.edgeFeatures?.subductionReplicator && !!options.edgeAvailable;

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
/**
 * The client stack as {@link LayerSpec.LayerSpec}s for a `LayerStack` to aggregate: each spec
 * declares the tags it needs and the tags it provides, so build order — and which specs are built at
 * all — follows from the graph rather than from a hand-written `provideMerge` chain.
 *
 * Two conventions carry the behaviour the chain used to encode:
 *
 * - A spec whose point is a side effect provides no tag for anyone to request (a lifecycle
 *   subscription, an rpc registration, a replicator attaching itself to the echo host), so it is
 *   `eager`.
 * - Anything conditional is conditional *within* a spec: a spec that needs the edge requires the
 *   edge tags, which the embedder supplies ambiently only with an endpoint configured, and an
 *   unsatisfied requirement prunes the spec. Option-driven choices (p2p replication, subduction)
 *   pick which specs {@link clientServiceSpecs} returns.
 *
 * The embedder supplies {@link ConfigService}, {@link Hook.Controller}, the SQL services, the
 * platform inputs and — when configured — the edge clients as the stack's ambient services.
 */

//
// Platform inputs. These were a layer the embedder provided beneath the stack; as specs the edge
// clients are conditional like any other spec rather than an ambient service that may or may not be
// there, which is what lets the stack declare its ambient requirements as tags.
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

export const SignalManagerSpec = (options: ServiceStackServices) => {
  const signalManager = options.signalManager;
  if (signalManager) {
    return LayerSpec.make({ affinity: 'application', requires: [], provides: [SignalManagerService] }, () =>
      Layer.succeed(SignalManagerService, signalManager),
    );
  }
  // Edge is the only real signaling transport; without it there is no cross-process signaling, so
  // the spec takes the edge connection exactly when one will exist.
  const edgeSignaling = !!options.edgeFeatures?.signaling && !!options.edgeAvailable;
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

export const TransportFactorySpec = (options: ServiceStackServices) => {
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

//
// Storage.
//

export const SqliteStorageSpec = LayerSpec.make(
  { affinity: 'application', requires: [SqlClient.SqlClient], provides: [SqliteStorageService] },
  () => SqliteStorageLayer(),
);

export const HypercoreStorageDirectorySpec = LayerSpec.make(
  { affinity: 'application', requires: [SqliteStorageService], provides: [HypercoreStorageDirectoryService] },
  () => HypercoreStorageDirectoryLayer(),
);

export const KeyringSpec = LayerSpec.make(
  { affinity: 'application', requires: [SqlClient.SqlClient], provides: [KeyringApiService] },
  () => SqliteKeyringLayer(),
);

export const MetadataStoreSpec = LayerSpec.make(
  { affinity: 'application', requires: [SqlClient.SqlClient], provides: [IMetadataStoreService] },
  () => SqliteMetadataStoreLayer(),
);

export const HypercoreFactorySpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [KeyringApiService, HypercoreStorageDirectoryService],
    provides: [HypercoreFactoryService],
  },
  () => HypercoreFactoryLayer({ hypercore: { valueEncoding, stats: true } }),
);

export const HypercoreStoreSpec = LayerSpec.make(
  { affinity: 'application', requires: [HypercoreFactoryService], provides: [HypercoreStoreService] },
  () => HypercoreStoreLayer(),
);

export const StorageMigrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [SqlClient.SqlClient], provides: [StorageMigrationService] },
  () => storageMigrationLayer,
);

export const StorageLifecycleSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [SqlClient.SqlClient, StorageMigrationService, IMetadataStoreService, Hook.Controller],
    provides: [],
    eager: true,
  },
  () => storageLifecycleLayer,
);

//
// Network.
//

export const StackReadinessSpec = LayerSpec.make(
  { affinity: 'application', requires: [Hook.Controller], provides: [StackReadinessService] },
  () => StackReadinessLayer,
);

export const SwarmNetworkManagerSpec = (options: ServiceStackServices) =>
  LayerSpec.make(
    {
      affinity: 'application',
      requires: [SignalManagerService, TransportFactoryService],
      provides: [SwarmNetworkManagerService],
    },
    () => SwarmNetworkManagerLayer({ connectionLog: options.connectionLog }),
  );

export const NetworkLifecycleSpec = (options: ServiceStackServices) =>
  LayerSpec.make(
    {
      affinity: 'application',
      requires: [Hook.Controller, SwarmNetworkManagerService, IdentityManagerService, SignalManagerService],
      provides: [],
      eager: true,
    },
    () => NetworkLifecycleLayer({ autoConnect: options.autoConnect }),
  );

//
// Identity and spaces.
//

export const SpaceManagerSpec = (options: ServiceStackServices) =>
  LayerSpec.make(
    {
      affinity: 'application',
      requires: [Hook.Controller, HypercoreStoreService, SwarmNetworkManagerService, IMetadataStoreService],
      provides: [SpaceManagerService],
    },
    () => SpaceManagerLayer({ disableP2pReplication: options.disableP2pReplication }),
  );

export const IdentityManagerSpec = (options: ServiceStackServices) =>
  LayerSpec.make(
    {
      affinity: 'application',
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
  );

export const IdentityProviderSpec = LayerSpec.make(
  { affinity: 'application', requires: [IdentityManagerService], provides: [IdentityProviderService] },
  () => identityProviderLayer,
);

export const EdgeIdentityRecoverySpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [KeyringApiService, IdentityManagerService],
    provides: [EdgeIdentityRecoveryManagerService],
  },
  () => EdgeIdentityRecoveryManagerLayer(),
);

export const IdentityLifecycleSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [Hook.Controller, IdentityManagerService, EdgeIdentityRecoveryManagerService],
    provides: [IdentityLifecycleService],
  },
  () => IdentityLifecycleLayer,
);

export const SigningContextProviderSpec = LayerSpec.make(
  { affinity: 'application', requires: [IdentityProviderService], provides: [SigningContextProviderService] },
  () => SigningContextProviderLayer,
);

export const InvitationsHandlerSpec = (options: ServiceStackServices) =>
  LayerSpec.make(
    { affinity: 'application', requires: [SwarmNetworkManagerService], provides: [InvitationsHandlerService] },
    () => InvitationsHandlerLayer({ connectionProps: options.invitationConnectionDefaultProps }),
  );

export const InvitationsManagerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [Hook.Controller, InvitationsHandlerService, IMetadataStoreService],
    provides: [InvitationsManagerService],
  },
  () => InvitationsManagerLayer(),
);

export const EchoHostSpec = (options: ServiceStackServices) =>
  LayerSpec.make(
    {
      affinity: 'application',
      requires: [IdentityManagerService, SpaceManagerService, SqlClient.SqlClient],
      provides: [EchoHostService],
    },
    () => echoHostLayer({ useSubduction: options.edgeFeatures?.subductionReplicator }),
  );

export const DataSpaceManagerSpec = (options: ServiceStackServices) =>
  LayerSpec.make(
    {
      affinity: 'application',
      requires: [
        Hook.Controller,
        SpaceManagerService,
        IMetadataStoreService,
        KeyringApiService,
        SigningContextProviderService,
        HypercoreStoreService,
        EchoHostService,
        InvitationsManagerService,
        // Read with `Effect.serviceOption`, so each is required only where it is also provided.
        ...(options.disableP2pReplication ? [] : [MeshEchoReplicatorService]),
        ...(subductionEnabled(options) ? [EdgeAutomergeReplicatorService] : []),
      ],
      provides: [DataSpaceManagerService],
    },
    () => DataSpaceManagerLayer({ runtimeProps: options, edgeFeatures: options.edgeFeatures }),
  );

export const InvitationFactoriesSpec = LayerSpec.make(
  {
    affinity: 'application',
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
);

export const EdgeAgentManagerSpec = (options: ServiceStackServices) =>
  LayerSpec.make(
    {
      affinity: 'application',
      requires: [Hook.Controller, DataSpaceManagerService, IdentityProviderService],
      provides: [EdgeAgentManagerService],
    },
    () => EdgeAgentManagerLayer({ edgeFeatures: options.edgeFeatures }),
  );

// Eager: nothing asks for its tag — it exists to subscribe to space changes across devices.
export const CrossDeviceSpaceSynchronizerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [Hook.Controller, DataSpaceManagerService],
    provides: [CrossDeviceSpaceSynchronizerService],
    eager: true,
  },
  () => CrossDeviceSpaceSynchronizerLayer,
);

//
// Replication. Each replicator provides its own tag as well as registering itself with the echo
// host, because `DataSpaceManager` reads both tags with `Effect.serviceOption` to decide which
// replication paths a space gets. The ones that need the edge are pruned without it.
//

export const MeshReplicatorSpec = LayerSpec.make(
  { affinity: 'application', requires: [], provides: [MeshEchoReplicatorService] },
  () => MeshEchoReplicatorLayer(),
);

export const MeshReplicatorRegistrationSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [MeshEchoReplicatorService, EchoHostService, Hook.Controller],
    provides: [],
    eager: true,
  },
  () => registerReplicator(MeshEchoReplicatorService),
);

export const EdgeSubductionReplicatorSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [EdgeConnectionService, EdgeHttpClientService],
    provides: [EdgeAutomergeReplicatorService],
  },
  () => EchoEdgeSubductionReplicatorLayer(),
);

export const EdgeSubductionReplicatorRegistrationSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [EdgeAutomergeReplicatorService, EchoHostService, Hook.Controller],
    provides: [],
    eager: true,
  },
  () => registerReplicator(EdgeAutomergeReplicatorService),
);

export const FeedSyncerSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [Hook.Controller, SqlClient.SqlClient, EchoHostService, EdgeConnectionService],
    provides: [FeedSyncerService],
    eager: true,
  },
  () =>
    FeedSyncerLayer({
      peerId: '',
      syncNamespaces: [FeedProtocol.WellKnownNamespaces.data, FeedProtocol.WellKnownNamespaces.trace],
    }),
);

//
// RPC services. Each handler keeps its own tag, and its registration with the router is a separate
// spec — eager, because a registration provides nothing for anyone to ask for.
//

export const RpcRouterSpec = LayerSpec.make(
  { affinity: 'application', requires: [], provides: [RpcRouter.RpcRouter] },
  () => RpcRouter.layer,
);

export const SystemServiceSpec = LayerSpec.make(
  {
    affinity: 'application',
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
);

export const SystemServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [SystemService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(SystemService.Rpcs, SystemService.Tag),
);

export const IdentityServiceSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [
      Hook.Controller,
      IdentityManagerService,
      IdentityLifecycleService,
      EdgeIdentityRecoveryManagerService,
      KeyringApiService,
      DataSpaceManagerService,
      SqlClient.SqlClient,
    ],
    provides: [IdentityService.Tag],
  },
  () => IdentityServiceLayer,
);

export const IdentityServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [IdentityService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(IdentityService.Rpcs, IdentityService.Tag),
);

export const ContactsServiceSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [IdentityManagerService, SpaceManagerService, DataSpaceManagerService, StackReadinessService],
    provides: [ContactsService.Tag],
  },
  () => ContactsServiceLayer,
);

export const ContactsServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [ContactsService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(ContactsService.Rpcs, ContactsService.Tag),
);

export const InvitationsServiceSpec = LayerSpec.make(
  { affinity: 'application', requires: [InvitationsManagerService], provides: [InvitationsService.Tag] },
  () => InvitationsServiceLayer,
);

export const InvitationsServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [InvitationsService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(InvitationsService.Rpcs, InvitationsService.Tag),
);

export const DevicesServiceSpec = LayerSpec.make(
  { affinity: 'application', requires: [IdentityManagerService], provides: [DevicesService.Tag] },
  () => DevicesServiceLayer,
);

export const DevicesServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [DevicesService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(DevicesService.Rpcs, DevicesService.Tag),
);

export const SpacesServiceSpec = LayerSpec.make(
  {
    affinity: 'application',
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
);

export const SpacesServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [SpacesService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(SpacesService.Rpcs, SpacesService.Tag),
);

export const NetworkServiceSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [SwarmNetworkManagerService, SignalManagerService],
    provides: [NetworkService.Tag],
  },
  () => NetworkServiceLayer,
);

export const NetworkServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [NetworkService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(NetworkService.Rpcs, NetworkService.Tag),
);

export const EdgeAgentServiceSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [EdgeAgentManagerService, StackReadinessService],
    provides: [EdgeAgentService.Tag],
  },
  () => EdgeAgentServiceLayer,
);

export const EdgeAgentServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [EdgeAgentService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(EdgeAgentService.Rpcs, EdgeAgentService.Tag),
);

//
// Data, query and feed: thin projections of the echo host rather than package-local impls.
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

export const LoggingServiceSpec = LayerSpec.make(
  { affinity: 'application', requires: [], provides: [LoggingService.Tag] },
  () => LoggingServiceLayer,
);

export const LoggingServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [LoggingService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(LoggingService.Rpcs, LoggingService.Tag),
);

export const DevtoolsHostSpec = LayerSpec.make(
  {
    affinity: 'application',
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
      SqlExport.SqlExport,
    ],
    provides: [DevtoolsHost.Tag, DevtoolsHostService],
  },
  () => DevtoolsHostLayer,
);

export const DevtoolsHostRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [DevtoolsHost.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(DevtoolsHost.Rpcs, DevtoolsHost.Tag),
);

/**
 * Every spec the client stack is built from, with the option-driven ones applied.
 */
export const clientServiceSpecs = (options: ServiceStackServices): LayerSpec.LayerSpec[] => [
  ...(options.edgeAvailable ? [EdgeClientsSpec] : []),
  SignalManagerSpec(options),
  TransportFactorySpec(options),

  SqliteStorageSpec,
  HypercoreStorageDirectorySpec,
  KeyringSpec,
  MetadataStoreSpec,
  HypercoreFactorySpec,
  HypercoreStoreSpec,
  StorageMigrationSpec,
  StorageLifecycleSpec,

  StackReadinessSpec,
  SwarmNetworkManagerSpec(options),
  NetworkLifecycleSpec(options),

  SpaceManagerSpec(options),
  IdentityManagerSpec(options),
  IdentityProviderSpec,
  EdgeIdentityRecoverySpec,
  IdentityLifecycleSpec,
  SigningContextProviderSpec,
  InvitationsHandlerSpec(options),
  InvitationsManagerSpec,
  EchoHostSpec(options),
  DataSpaceManagerSpec(options),
  InvitationFactoriesSpec,
  EdgeAgentManagerSpec(options),
  CrossDeviceSpaceSynchronizerSpec,

  ...(options.disableP2pReplication ? [] : [MeshReplicatorSpec, MeshReplicatorRegistrationSpec]),
  ...(subductionEnabled(options) ? [EdgeSubductionReplicatorSpec, EdgeSubductionReplicatorRegistrationSpec] : []),
  FeedSyncerSpec,

  RpcRouterSpec,
  SystemServiceSpec,
  SystemServiceRegistrationSpec,
  IdentityServiceSpec,
  IdentityServiceRegistrationSpec,
  ContactsServiceSpec,
  ContactsServiceRegistrationSpec,
  InvitationsServiceSpec,
  InvitationsServiceRegistrationSpec,
  DevicesServiceSpec,
  DevicesServiceRegistrationSpec,
  SpacesServiceSpec,
  SpacesServiceRegistrationSpec,
  NetworkServiceSpec,
  NetworkServiceRegistrationSpec,
  EdgeAgentServiceSpec,
  EdgeAgentServiceRegistrationSpec,
  DataServiceSpec,
  DataServiceRegistrationSpec,
  QueryServiceSpec,
  QueryServiceRegistrationSpec,
  FeedServiceSpec,
  FeedServiceRegistrationSpec,
  LoggingServiceSpec,
  LoggingServiceRegistrationSpec,
  DevtoolsHostSpec,
  DevtoolsHostRegistrationSpec,
];
