//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { EchoHostService } from '@dxos/echo-host';
import { KeyringApiService } from '@dxos/keyring';
import { SignalManagerService } from '@dxos/messaging';
import { SwarmNetworkManagerService } from '@dxos/network-manager';
import {
  ContactsService,
  DataService,
  DevicesService,
  EdgeAgentService,
  FeedService,
  IdentityService,
  InvitationsService,
  NetworkService,
  QueryService,
  SpacesService,
} from '@dxos/protocols/rpc';

import { EdgeAgentServiceLayer } from '../agents/edge-agent-service.ts';
import { DevicesServiceLayer } from '../devices/devices-service.ts';
import { ContactsServiceLayer } from '../identity/contacts-service.ts';
import { EdgeIdentityRecoveryManagerService } from '../identity/identity-recovery-manager.ts';
import { IdentityManagerService, IdentityServiceLayer } from '../identity/index.ts';
import { InvitationsManagerService, InvitationsServiceLayer } from '../invitations/index.ts';
import { NetworkServiceLayer } from '../network/network-service.ts';
import { SpaceManagerService } from '../space/index.ts';
import { SpacesServiceLayer } from '../spaces/spaces-service.ts';
import { ClientServicesHostService } from './service-host.ts';

//
// Each client RPC service handler is exposed as an individual Effect service tag. Handlers depend
// directly on the lower-level component tags they consume (EchoHostService, IdentityManagerService,
// …); only handlers that need lifecycle orchestration (identity creation, readiness gates)
// additionally depend on {@link ClientServicesHostService} (the host provides itself into the stack).
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
  | FeedService.Tag;

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
 * Each handler keeps its own tag so callers resolve them individually from the stack runtime.
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
  | ClientServicesHostService
> = Layer.mergeAll(
  IdentityServiceLayer,
  ContactsServiceLayer,
  InvitationsServiceLayer,
  DevicesServiceLayer,
  SpacesServiceLayer,
  NetworkServiceLayer,
  EdgeAgentServiceLayer,
  dataServiceLayer,
  queryServiceLayer,
  feedServiceLayer,
);
