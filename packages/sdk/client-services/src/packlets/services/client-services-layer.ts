//
// Copyright 2025 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type EchoHost } from '@dxos/echo-host';

import { EdgeAgentServiceImpl } from '../agents';
import { DevicesServiceImpl } from '../devices';
import { IdentityServiceImpl } from '../identity';
import { ContactsServiceImpl } from '../identity/contacts-service';
import { InvitationsServiceImpl } from '../invitations';
import { NetworkServiceImpl } from '../network';
import { SpacesServiceImpl } from '../spaces';
import { ServiceContextService } from './service-context';

//
// Each client RPC service handler is exposed as an individual Effect service tag constructed from
// the resolved {@link ServiceContextService}. Every component the handlers need is reachable from
// the orchestrator, so the layers require nothing beyond it and stay flat.
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
  EchoHost['feedService']
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

const identityServiceLayer = Layer.effect(
  IdentityServiceRpc,
  Effect.gen(function* () {
    const serviceContext = yield* ServiceContextService;
    return new IdentityServiceImpl(
      serviceContext.identityManager,
      serviceContext.recoveryManager,
      serviceContext.keyring,
      async (params, ctx) => {
        const identity = await serviceContext.createIdentity(params, ctx);
        await serviceContext.initialized.wait();
        return identity;
      },
      (profile) => serviceContext.broadcastProfileUpdate(profile),
    );
  }),
);

const contactsServiceLayer = Layer.effect(
  ContactsServiceRpc,
  Effect.gen(function* () {
    const serviceContext = yield* ServiceContextService;
    return new ContactsServiceImpl(serviceContext.identityManager, serviceContext.spaceManager, () =>
      serviceContext.whenDataSpaceManagerReady(),
    );
  }),
);

const invitationsServiceLayer = Layer.effect(
  InvitationsServiceRpc,
  Effect.map(ServiceContextService, (serviceContext) => new InvitationsServiceImpl(serviceContext.invitationsManager)),
);

const devicesServiceLayer = Layer.effect(
  DevicesServiceRpc,
  Effect.map(
    ServiceContextService,
    (serviceContext) => new DevicesServiceImpl(serviceContext.identityManager, serviceContext.edgeConnection),
  ),
);

const spacesServiceLayer = Layer.effect(
  SpacesServiceRpc,
  Effect.gen(function* () {
    const serviceContext = yield* ServiceContextService;
    return new SpacesServiceImpl(
      serviceContext.identityManager,
      serviceContext.spaceManager,
      serviceContext.echoHost,
      () => serviceContext.whenDataSpaceManagerReady(),
    );
  }),
);

const networkServiceLayer = Layer.effect(
  NetworkServiceRpc,
  Effect.map(
    ServiceContextService,
    (serviceContext) =>
      new NetworkServiceImpl(
        serviceContext.networkManager,
        serviceContext.signalManager,
        serviceContext.edgeConnection,
      ),
  ),
);

const edgeAgentServiceLayer = Layer.effect(
  EdgeAgentServiceRpc,
  Effect.map(
    ServiceContextService,
    (serviceContext) =>
      new EdgeAgentServiceImpl(() => serviceContext.whenEdgeAgentManagerReady(), serviceContext.edgeConnection),
  ),
);

const dataServiceLayer = Layer.effect(
  DataServiceRpc,
  Effect.map(ServiceContextService, (serviceContext) => serviceContext.echoHost.dataService),
);

const queryServiceLayer = Layer.effect(
  QueryServiceRpc,
  Effect.map(ServiceContextService, (serviceContext) => serviceContext.echoHost.queryService),
);

const feedServiceLayer = Layer.effect(
  FeedServiceRpc,
  Effect.map(ServiceContextService, (serviceContext) => serviceContext.echoHost.feedService),
);

/**
 * Composes every client RPC service handler on top of the resolved {@link ServiceContextService}.
 * Each handler keeps its own tag so callers resolve them individually from the stack runtime.
 */
export const ClientServicesRpcLayer: Layer.Layer<ClientServicesRpcContext, never, ServiceContextService> =
  Layer.mergeAll(
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
