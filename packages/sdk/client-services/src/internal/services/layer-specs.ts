//
// Copyright 2026 DXOS.org
//

import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { RegisterService } from '@dxos/client-protocol';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { ConfigService } from '@dxos/config';
import { Hook } from '@dxos/effect';
import { HypercoreStoreService } from '@dxos/feed-store';
import { KeyringApiService } from '@dxos/keyring';
import { SignalManagerService } from '@dxos/messaging';
import { SwarmNetworkManagerService } from '@dxos/network-manager';
import {
  ContactsService,
  DevicesService,
  DevtoolsHost,
  EdgeAgentService,
  IdentityService,
  InvitationsService,
  LoggingService,
  SystemService,
} from '@dxos/protocols/rpc';
import { RpcRouter } from '@dxos/rpc';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';

import * as IdentityContract from '../../contracts/identity.ts';
import * as InvitationsContract from '../../contracts/invitations.ts';
import * as SpacesContract from '../../contracts/spaces.ts';
import * as Readiness from '../../Readiness.ts';
import { EdgeAgentManagerLayer, EdgeAgentManagerService, EdgeAgentServiceLayer } from '../agents/index.ts';
import { DevicesServiceLayer } from '../devices/index.ts';
import { DevtoolsHostLayer, DevtoolsHostService } from '../devtools/index.ts';
import * as Echo from '../echo/index.ts';
import { SpaceManagerService } from '../echo/space/index.ts';
import {
  EdgeIdentityRecoveryManagerLayer,
  EdgeIdentityRecoveryManagerService,
} from '../identity/identity-recovery-manager.ts';
import {
  ContactsServiceLayer,
  IdentityLifecycleLayer,
  IdentityManagerLayer,
  IdentityServiceLayer,
} from '../identity/index.ts';
import {
  InvitationFactoriesLayer,
  InvitationsHandlerLayer,
  InvitationsHandlerService,
  InvitationsManagerLayer,
  InvitationsServiceLayer,
} from '../invitations/index.ts';
import * as Kernel from '../kernel/index.ts';
import { IMetadataStoreService } from '../kernel/metadata/index.ts';
import { LoggingServiceLayer } from '../logging/index.ts';
import * as Mesh from '../mesh/index.ts';
import { SystemServiceLayer } from '../system/index.ts';
import { type ServiceStackServices, identityProviderLayer } from './service-stack.ts';

/**
 * Subduction needs the edge clients as well as the feature flag: the flag is set in config profiles
 * that configure no edge endpoint, and requiring a tag nothing provides would prune the specs that
 * declare it — silently taking the data space manager, and every service built on it, with them.
 */
const subductionEnabled = (options: ServiceStackServices): boolean =>
  !!options.edgeFeatures?.subductionReplicator && !!options.edgeAvailable;

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
// Identity and spaces.
//

export const IdentityManagerSpec = (options: ServiceStackServices) =>
  LayerSpec.make(
    {
      affinity: 'application',
      requires: [Hook.Controller, IMetadataStoreService, KeyringApiService, HypercoreStoreService, SpaceManagerService],
      provides: [IdentityContract.ManagerService],
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
  {
    affinity: 'application',
    requires: [IdentityContract.ManagerService],
    provides: [IdentityContract.ProviderService],
  },
  () => identityProviderLayer,
);

export const EdgeIdentityRecoverySpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [KeyringApiService, IdentityContract.ManagerService],
    provides: [EdgeIdentityRecoveryManagerService],
  },
  () => EdgeIdentityRecoveryManagerLayer(),
);

export const IdentityLifecycleSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [Hook.Controller, IdentityContract.ManagerService, EdgeIdentityRecoveryManagerService],
    provides: [IdentityContract.LifecycleService],
  },
  () => IdentityLifecycleLayer,
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
    provides: [InvitationsContract.ManagerService],
  },
  () => InvitationsManagerLayer(),
);

export const InvitationFactoriesSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [
      InvitationsContract.ManagerService,
      IdentityContract.ManagerService,
      IdentityContract.LifecycleService,
      KeyringApiService,
      SpacesContract.ManagerService,
      SpacesContract.SigningContextProviderService,
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
      requires: [Hook.Controller, SpacesContract.ManagerService, IdentityContract.ProviderService],
      provides: [EdgeAgentManagerService],
    },
    () => EdgeAgentManagerLayer({ edgeFeatures: options.edgeFeatures }),
  );

//
// Replication. Each replicator provides its own tag as well as registering itself with the echo
// host, because `SpacesContract.Manager` reads both tags with `Effect.serviceOption` to decide which
// replication paths a space gets. The ones that need the edge are pruned without it.
//

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
      IdentityContract.ManagerService,
      SpacesContract.ManagerService,
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
      IdentityContract.ManagerService,
      IdentityContract.LifecycleService,
      EdgeIdentityRecoveryManagerService,
      KeyringApiService,
      SpacesContract.ManagerService,
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
    requires: [
      IdentityContract.ManagerService,
      SpaceManagerService,
      SpacesContract.ManagerService,
      Readiness.StackReadinessService,
    ],
    provides: [ContactsService.Tag],
  },
  () => ContactsServiceLayer,
);

export const ContactsServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [ContactsService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(ContactsService.Rpcs, ContactsService.Tag),
);

export const InvitationsServiceSpec = LayerSpec.make(
  { affinity: 'application', requires: [InvitationsContract.ManagerService], provides: [InvitationsService.Tag] },
  () => InvitationsServiceLayer,
);

export const InvitationsServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [InvitationsService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(InvitationsService.Rpcs, InvitationsService.Tag),
);

export const DevicesServiceSpec = LayerSpec.make(
  { affinity: 'application', requires: [IdentityContract.ManagerService], provides: [DevicesService.Tag] },
  () => DevicesServiceLayer,
);

export const DevicesServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [DevicesService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(DevicesService.Rpcs, DevicesService.Tag),
);

export const EdgeAgentServiceSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [EdgeAgentManagerService, Readiness.StackReadinessService],
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
      SpacesContract.ManagerService,
      Readiness.StackReadinessService,
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
  ...Kernel.specs(),
  ...Mesh.specs({ ...options, edgeSignaling: !!options.edgeFeatures?.signaling }),

  ...Echo.specs({ ...options, subductionEnabled: subductionEnabled(options) }),
  IdentityManagerSpec(options),
  IdentityProviderSpec,
  EdgeIdentityRecoverySpec,
  IdentityLifecycleSpec,
  InvitationsHandlerSpec(options),
  InvitationsManagerSpec,
  InvitationFactoriesSpec,
  EdgeAgentManagerSpec(options),

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
  EdgeAgentServiceSpec,
  EdgeAgentServiceRegistrationSpec,
  LoggingServiceSpec,
  LoggingServiceRegistrationSpec,
  DevtoolsHostSpec,
  DevtoolsHostRegistrationSpec,
];
