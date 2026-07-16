//
// Copyright 2025 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { type EchoHost, EchoHostService } from '@dxos/echo-host';
import { EdgeConnectionService } from '@dxos/edge-client';
import { KeyringApiService } from '@dxos/keyring';
import { SignalManagerService } from '@dxos/messaging';
import { SwarmNetworkManagerService } from '@dxos/network-manager';
import { type FeedService } from '@dxos/protocols/rpc';

import { EdgeAgentServiceImpl } from '../agents';
import { DevicesServiceImpl } from '../devices';
import { IdentityManagerService, IdentityServiceImpl } from '../identity';
import { ContactsServiceImpl } from '../identity/contacts-service';
import { EdgeIdentityRecoveryManagerService } from '../identity/identity-recovery-manager';
import { InvitationsManagerService, InvitationsServiceImpl } from '../invitations';
import { NetworkServiceImpl } from '../network';
import { SpaceManagerService } from '../space';
import { SpacesServiceImpl } from '../spaces';
import { ClientLifecycleService } from './service-lifecycle';

//
// Each client RPC service handler is exposed as an individual Effect service tag. Handlers depend
// directly on the lower-level component tags they consume (EchoHostService, IdentityManagerService,
// …); only handlers that need lifecycle orchestration (identity creation, readiness gates)
// additionally depend on {@link ClientLifecycleService}.
//

export class IdentityServiceRpc extends EffectContext.Tag('@dxos/client-services/rpc/IdentityService')<
  IdentityServiceRpc,
  IdentityServiceImpl
>() {}

export class ContactsServiceRpc extends EffectContext.Tag('@dxos/client-services/rpc/ContactsService')<
  ContactsServiceRpc,
  ContactsServiceImpl
>() {}

export class InvitationsServiceRpc extends EffectContext.Tag('@dxos/client-services/rpc/InvitationsService')<
  InvitationsServiceRpc,
  InvitationsServiceImpl
>() {}

export class DevicesServiceRpc extends EffectContext.Tag('@dxos/client-services/rpc/DevicesService')<
  DevicesServiceRpc,
  DevicesServiceImpl
>() {}

export class SpacesServiceRpc extends EffectContext.Tag('@dxos/client-services/rpc/SpacesService')<
  SpacesServiceRpc,
  SpacesServiceImpl
>() {}

export class NetworkServiceRpc extends EffectContext.Tag('@dxos/client-services/rpc/NetworkService')<
  NetworkServiceRpc,
  NetworkServiceImpl
>() {}

export class EdgeAgentServiceRpc extends EffectContext.Tag('@dxos/client-services/rpc/EdgeAgentService')<
  EdgeAgentServiceRpc,
  EdgeAgentServiceImpl
>() {}

export class DataServiceRpc extends EffectContext.Tag('@dxos/client-services/rpc/DataService')<
  DataServiceRpc,
  EchoHost['dataService']
>() {}

export class QueryServiceRpc extends EffectContext.Tag('@dxos/client-services/rpc/QueryService')<
  QueryServiceRpc,
  EchoHost['queryService']
>() {}

export class FeedServiceRpc extends EffectContext.Tag('@dxos/client-services/rpc/FeedService')<
  FeedServiceRpc,
  FeedService.Handlers
>() {}

/**
 * Union of every client RPC service tag resolved from the stack.
 */
export type ClientServicesRpcContext =
  | IdentityServiceRpc
  | ContactsServiceRpc
  | InvitationsServiceRpc
  | DevicesServiceRpc
  | SpacesServiceRpc
  | NetworkServiceRpc
  | EdgeAgentServiceRpc
  | DataServiceRpc
  | QueryServiceRpc
  | FeedServiceRpc;

// Identity creation is a lifecycle sequence and profile broadcast iterates live spaces, so both
// remain lifecycle responsibilities resolved from {@link ClientLifecycleService}.
const identityServiceLayer = Layer.effect(
  IdentityServiceRpc,
  Effect.gen(function* () {
    const identityManager = yield* IdentityManagerService;
    const recoveryManager = yield* EdgeIdentityRecoveryManagerService;
    const keyring = yield* KeyringApiService;
    const lifecycle = yield* ClientLifecycleService;
    return new IdentityServiceImpl(
      identityManager,
      recoveryManager,
      keyring,
      async (params, ctx) => {
        const identity = await lifecycle.createIdentity(params, ctx);
        await lifecycle.whenInitialized();
        return identity;
      },
      (profile) => lifecycle.broadcastProfileUpdate(profile),
    );
  }),
);

const contactsServiceLayer = Layer.effect(
  ContactsServiceRpc,
  Effect.gen(function* () {
    const identityManager = yield* IdentityManagerService;
    const spaceManager = yield* SpaceManagerService;
    const lifecycle = yield* ClientLifecycleService;
    return new ContactsServiceImpl(identityManager, spaceManager, () => lifecycle.whenDataSpaceManagerReady());
  }),
);

const invitationsServiceLayer = Layer.effect(
  InvitationsServiceRpc,
  Effect.map(InvitationsManagerService, (invitationsManager) => new InvitationsServiceImpl(invitationsManager)),
);

const devicesServiceLayer = Layer.effect(
  DevicesServiceRpc,
  Effect.gen(function* () {
    const identityManager = yield* IdentityManagerService;
    // Edge connection is absent in the non-edge stack, so resolve it optionally.
    const edgeConnection = Option.getOrUndefined(yield* Effect.serviceOption(EdgeConnectionService));
    return new DevicesServiceImpl(identityManager, edgeConnection);
  }),
);

const spacesServiceLayer = Layer.effect(
  SpacesServiceRpc,
  Effect.gen(function* () {
    const identityManager = yield* IdentityManagerService;
    const spaceManager = yield* SpaceManagerService;
    const echoHost = yield* EchoHostService;
    const lifecycle = yield* ClientLifecycleService;
    return new SpacesServiceImpl(identityManager, spaceManager, echoHost, () => lifecycle.whenDataSpaceManagerReady());
  }),
);

const networkServiceLayer = Layer.effect(
  NetworkServiceRpc,
  Effect.gen(function* () {
    const networkManager = yield* SwarmNetworkManagerService;
    const signalManager = yield* SignalManagerService;
    const edgeConnection = Option.getOrUndefined(yield* Effect.serviceOption(EdgeConnectionService));
    return new NetworkServiceImpl(networkManager, signalManager, edgeConnection);
  }),
);

const edgeAgentServiceLayer = Layer.effect(
  EdgeAgentServiceRpc,
  Effect.gen(function* () {
    const edgeConnection = Option.getOrUndefined(yield* Effect.serviceOption(EdgeConnectionService));
    const lifecycle = yield* ClientLifecycleService;
    return new EdgeAgentServiceImpl(() => lifecycle.whenEdgeAgentManagerReady(), edgeConnection);
  }),
);

const dataServiceLayer = Layer.effect(
  DataServiceRpc,
  Effect.map(EchoHostService, (echoHost) => echoHost.dataService),
);

const queryServiceLayer = Layer.effect(
  QueryServiceRpc,
  Effect.map(EchoHostService, (echoHost) => echoHost.queryService),
);

const feedServiceLayer = Layer.effect(
  FeedServiceRpc,
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
  | ClientLifecycleService
> = Layer.mergeAll(
  identityServiceLayer,
  contactsServiceLayer,
  invitationsServiceLayer,
  devicesServiceLayer,
  spacesServiceLayer,
  networkServiceLayer,
  edgeAgentServiceLayer,
  dataServiceLayer,
  queryServiceLayer,
  feedServiceLayer,
);
