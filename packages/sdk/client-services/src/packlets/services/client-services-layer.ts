//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as EffectRpc from 'effect/unstable/rpc/Rpc';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { RegisterService, type ServiceDefinition } from '@dxos/client-protocol';
import { ConfigService } from '@dxos/config';
import { EchoHostService } from '@dxos/echo-host';
import { type Hook } from '@dxos/effect';
import { HypercoreStoreService } from '@dxos/feed-store';
import { KeyringApiService } from '@dxos/keyring';
import { SignalManagerService } from '@dxos/messaging';
import { SwarmNetworkManagerService } from '@dxos/network-manager';
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

import { EdgeAgentManagerService, EdgeAgentServiceLayer } from '../agents/index.ts';
import { DevicesServiceLayer } from '../devices/index.ts';
import { DevtoolsHostLayer, DevtoolsHostService } from '../devtools/index.ts';
import { EdgeIdentityRecoveryManagerService } from '../identity/identity-recovery-manager.ts';
import {
  ContactsServiceLayer,
  IdentityLifecycleService,
  IdentityManagerService,
  IdentityServiceLayer,
} from '../identity/index.ts';
import { InvitationsManagerService, InvitationsServiceLayer } from '../invitations/index.ts';
import { LoggingServiceLayer } from '../logging/index.ts';
import { IMetadataStoreService } from '../metadata/index.ts';
import { NetworkServiceLayer } from '../network/index.ts';
import { SpaceManagerService } from '../space/index.ts';
import { DataSpaceManagerService, SpacesServiceLayer } from '../spaces/index.ts';
import { SystemServiceLayer } from '../system/index.ts';
import { StackReadinessService } from './stack-readiness.ts';

//
// Each client RPC service handler is exposed as an individual Effect service tag and registers
// itself with the stack's RpcRouter, so no list of services is needed to serve a connection.
// Handlers depend directly on the lower-level component tags they consume (EchoHostService,
// IdentityManagerService, …); the ones that need lifecycle orchestration depend on
// IdentityLifecycleService and the StackReadinessService gate.
//

/**
 * Union of every client RPC service tag resolved from the stack.
 */
export type ClientServicesRpcContext =
  | IdentityService.Tag
  | ContactsService.Tag
  | InvitationsService.Tag
  | DevicesService.Tag
  | SpacesService.Tag
  | NetworkService.Tag
  | EdgeAgentService.Tag
  | DataService.Tag
  | QueryService.Tag
  | FeedService.Tag
  | LoggingService.Tag
  | DevtoolsHost.Tag
  | SystemService.Tag
  | DevtoolsHostService;

/**
 * Keeps a handler layer and its RPC registration separate: the returned layer still exposes the
 * service's tag, and registering it with the router is what makes it reachable over a transport.
 */
const withRpc = <Provided, ErrorType, RequirementsType, Rpcs extends EffectRpc.Any, Identifier extends Provided>(
  layer: Layer.Layer<Provided, ErrorType, RequirementsType>,
  service: ServiceDefinition<Rpcs, Identifier>,
) => RegisterService(service).pipe(Layer.provideMerge(layer));

// The Data/Query/Feed services are thin projections of {@link EchoHostService} properties rather
// than package-local ServiceImpl classes, so their layers stay here as trivial maps.
const dataServiceLayer = Layer.effect(
  DataService.Tag,
  Effect.map(EchoHostService, (echoHost) => echoHost.dataService),
);

const queryServiceLayer = Layer.effect(
  QueryService.Tag,
  Effect.map(EchoHostService, (echoHost) => echoHost.queryService),
);

const feedServiceLayer = Layer.effect(
  FeedService.Tag,
  Effect.map(EchoHostService, (echoHost) => echoHost.feedService),
);

/**
 * Composes every client RPC service handler on top of the component tags exposed by the stack.
 * Each handler keeps its own tag so callers resolve them individually from the stack runtime, and
 * registers itself with the {@link RpcRouter.RpcRouter} beneath it.
 */
export const ClientServicesRpcLayer: Layer.Layer<
  ClientServicesRpcContext,
  never,
  | EchoHostService
  | IdentityManagerService
  | SpaceManagerService
  | InvitationsManagerService
  | EdgeIdentityRecoveryManagerService
  | KeyringApiService
  | SwarmNetworkManagerService
  | SignalManagerService
  | DataSpaceManagerService
  | EdgeAgentManagerService
  | IdentityLifecycleService
  | StackReadinessService
  | RpcRouter.RpcRouter
  | Hook.Controller
  | ConfigService
  | HypercoreStoreService
  | IMetadataStoreService
  | SqlClient.SqlClient
  | SqlExport.SqlExport
> = Layer.mergeAll(
  withRpc(SystemServiceLayer, SystemService),
  withRpc(IdentityServiceLayer, IdentityService),
  withRpc(ContactsServiceLayer, ContactsService),
  withRpc(InvitationsServiceLayer, InvitationsService),
  withRpc(DevicesServiceLayer, DevicesService),
  withRpc(SpacesServiceLayer, SpacesService),
  withRpc(NetworkServiceLayer, NetworkService),
  withRpc(EdgeAgentServiceLayer, EdgeAgentService),
  withRpc(dataServiceLayer, DataService),
  withRpc(queryServiceLayer, QueryService),
  withRpc(feedServiceLayer, FeedService),
  withRpc(LoggingServiceLayer, LoggingService),
  withRpc(DevtoolsHostLayer, DevtoolsHost),
);
