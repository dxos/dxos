//
// Copyright 2025 DXOS.org
//

import * as EffectContext from 'effect/Context';

import { type ClientServicesHandlers } from '@dxos/client-protocol';
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

/** The effect-rpc handler tags of the stack's domain services. */
export type RpcServicesContext =
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
  | DevtoolsHost.Tag;

/**
 * The domain service handlers a built stack serves, keyed by service name; what the system service
 * collects diagnostics over.
 */
export const rpcHandlersFromStack = (
  stack: EffectContext.Context<RpcServicesContext>,
): Partial<ClientServicesHandlers> => ({
  IdentityService: EffectContext.get(stack, IdentityService.Tag),
  ContactsService: EffectContext.get(stack, ContactsService.Tag),
  InvitationsService: EffectContext.get(stack, InvitationsService.Tag),
  DevicesService: EffectContext.get(stack, DevicesService.Tag),
  SpacesService: EffectContext.get(stack, SpacesService.Tag),
  DataService: EffectContext.get(stack, DataService.Tag),
  QueryService: EffectContext.get(stack, QueryService.Tag),
  FeedService: EffectContext.get(stack, FeedService.Tag),
  NetworkService: EffectContext.get(stack, NetworkService.Tag),
  LoggingService: EffectContext.get(stack, LoggingService.Tag),
  DevtoolsHost: EffectContext.get(stack, DevtoolsHost.Tag),
  EdgeAgentService: EffectContext.get(stack, EdgeAgentService.Tag),
});

/**
 * Every RPC handler a built stack serves, keyed by service name.
 */
export const handlersFromStack = (
  stack: EffectContext.Context<RpcServicesContext | SystemService.Tag>,
): Partial<ClientServicesHandlers> => ({
  ...rpcHandlersFromStack(stack),
  SystemService: EffectContext.get(stack, SystemService.Tag),
});
