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
import { DevtoolsHost, LoggingService, SystemService } from '@dxos/protocols/rpc';
import { RpcRouter } from '@dxos/rpc';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';

import * as IdentityContract from '../../contracts/identity.ts';
import * as SpacesContract from '../../contracts/spaces.ts';
import * as Readiness from '../../Readiness.ts';
import { DevtoolsHostLayer, DevtoolsHostService } from '../devtools/index.ts';
import * as Echo from '../echo/index.ts';
import { SpaceManagerService } from '../echo/space/index.ts';
import * as Halo from '../halo/index.ts';
import * as Kernel from '../kernel/index.ts';
import { IMetadataStoreService } from '../kernel/metadata/index.ts';
import { LoggingServiceLayer } from '../logging/index.ts';
import * as Mesh from '../mesh/index.ts';
import { SystemServiceLayer } from '../system/index.ts';
import { type ServiceStackServices } from './service-stack.ts';

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
  ...Halo.specs(options),

  RpcRouterSpec,
  SystemServiceSpec,
  SystemServiceRegistrationSpec,
  LoggingServiceSpec,
  LoggingServiceRegistrationSpec,
  DevtoolsHostSpec,
  DevtoolsHostRegistrationSpec,
];
