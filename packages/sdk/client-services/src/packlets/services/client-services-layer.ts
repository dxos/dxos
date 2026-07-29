//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { EchoHostService } from '@dxos/echo-host';
import { EdgeConnectionService } from '@dxos/edge-client';
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

import { EdgeAgentServiceImpl } from '../agents';
import { DevicesServiceImpl } from '../devices';
import { IdentityManagerService, IdentityServiceImpl } from '../identity';
import { ContactsServiceImpl } from '../identity/contacts-service';
import { EdgeIdentityRecoveryManagerService } from '../identity/identity-recovery-manager';
import { InvitationsManagerService, InvitationsServiceImpl } from '../invitations';
import { NetworkServiceImpl } from '../network';
import { SpaceManagerService } from '../space';
import { SpacesServiceImpl } from '../spaces';
import { ClientServicesHostService } from './service-host';

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

// Identity creation is a lifecycle sequence and profile broadcast iterates live spaces, so both
// remain orchestrator responsibilities resolved from {@link ClientServicesHostService}.
// The impl is a {@link Resource}; its open/close lifecycle is bound to the layer scope.
const identityServiceLayer = Layer.scoped(
  IdentityService.Tag,
  Effect.gen(function* () {
    const identityManager = yield* IdentityManagerService;
    const recoveryManager = yield* EdgeIdentityRecoveryManagerService;
    const keyring = yield* KeyringApiService;
    const host = yield* ClientServicesHostService;
    const service = new IdentityServiceImpl(
      identityManager,
      recoveryManager,
      keyring,
      async (params, ctx) => {
        const identity = await host.createIdentity(params, ctx);
        await host.initialized.wait();
        return identity;
      },
      (profile) => host.broadcastProfileUpdate(profile),
    );
    yield* Effect.acquireRelease(
      Effect.promise(() => service.open()),
      () => Effect.promise(() => service.close()),
    );
    return service;
  }),
);

const contactsServiceLayer = Layer.effect(
  ContactsService.Tag,
  Effect.gen(function* () {
    const identityManager = yield* IdentityManagerService;
    const spaceManager = yield* SpaceManagerService;
    const host = yield* ClientServicesHostService;
    return new ContactsServiceImpl(identityManager, spaceManager, () => host.whenDataSpaceManagerReady());
  }),
);

const invitationsServiceLayer = Layer.effect(
  InvitationsService.Tag,
  Effect.map(InvitationsManagerService, (invitationsManager) => new InvitationsServiceImpl(invitationsManager)),
);

const devicesServiceLayer = Layer.effect(
  DevicesService.Tag,
  Effect.gen(function* () {
    const identityManager = yield* IdentityManagerService;
    // Edge connection is absent in the non-edge stack, so resolve it optionally.
    const edgeConnection = Option.getOrUndefined(yield* Effect.serviceOption(EdgeConnectionService));
    return new DevicesServiceImpl(identityManager, edgeConnection);
  }),
);

const spacesServiceLayer = Layer.effect(
  SpacesService.Tag,
  Effect.gen(function* () {
    const identityManager = yield* IdentityManagerService;
    const spaceManager = yield* SpaceManagerService;
    const echoHost = yield* EchoHostService;
    const host = yield* ClientServicesHostService;
    return new SpacesServiceImpl(identityManager, spaceManager, echoHost, () => host.whenDataSpaceManagerReady());
  }),
);

const networkServiceLayer = Layer.effect(
  NetworkService.Tag,
  Effect.gen(function* () {
    const networkManager = yield* SwarmNetworkManagerService;
    const signalManager = yield* SignalManagerService;
    const edgeConnection = Option.getOrUndefined(yield* Effect.serviceOption(EdgeConnectionService));
    return new NetworkServiceImpl(networkManager, signalManager, edgeConnection);
  }),
);

const edgeAgentServiceLayer = Layer.effect(
  EdgeAgentService.Tag,
  Effect.gen(function* () {
    const edgeConnection = Option.getOrUndefined(yield* Effect.serviceOption(EdgeConnectionService));
    const host = yield* ClientServicesHostService;
    return new EdgeAgentServiceImpl(() => host.whenEdgeAgentManagerReady(), edgeConnection);
  }),
);

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
