//
// Copyright 2025 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { type ClientServicesHandlers } from '@dxos/client-protocol';
import { type Config, ConfigService } from '@dxos/config';
import { type Context } from '@dxos/context';
import { EffectEx, Event, RuntimeProvider } from '@dxos/effect';
import { log } from '@dxos/log';
import { type SignalManager, SignalManagerService } from '@dxos/messaging';
import { type TransportFactory } from '@dxos/network-manager';
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
} from '@dxos/protocols/rpc';
import type * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import type * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';

import { ClientPlatformLayer, type TransportFactoryService } from './client-platform.ts';
import { type ClientServicesRpcContext, ClientServicesRpcLayer } from './client-services-layer.ts';
import { NetworkingEnabled, Opening, StackOpened } from './events.ts';
import { type ServiceContextRuntimeProps, type ServiceContextStackContext, ServiceStack } from './service-stack.ts';

/**
 * Everything the client services runtime provides: the event bus, config, the platform inputs,
 * the component layers, and the RPC handler layers.
 */
export type ClientServicesStackContext =
  | Event.Bus
  | ConfigService
  | ClientServicesRpcContext
  | ServiceContextStackContext
  | SignalManagerService
  | TransportFactoryService;

export type ClientServicesLayerOptions = {
  config: Config;
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlExport.SqlExport | SqlTransaction.SqlTransaction>;
  /** Overrides for the config-derived runtime props. */
  runtimeProps?: ServiceContextRuntimeProps;
  /** Overrides the config-derived signal manager; tests pass an in-memory one. */
  signalManager?: SignalManager;
  /** Overrides the WebRTC transport; tests pass the in-memory transport. */
  transportFactory?: TransportFactory;
  /** @default true */
  connectionLog?: boolean;
  /**
   * Emit `NetworkingEnabled` as soon as the stack is open. Set `false` when the embedder decides
   * when connecting is safe, as the worker does so the dial cannot compete with boot RPCs.
   * @default true
   */
  autoConnect?: boolean;
};

/**
 * Runtime props from config, with explicit overrides winning where defined.
 */
export const runtimePropsFromConfig = (
  config: Config,
  overrides: ServiceContextRuntimeProps = {},
): ServiceContextRuntimeProps => ({
  disableP2pReplication: config.get('runtime.client.disableP2pReplication', false),
  enableVectorIndexing: config.get('runtime.client.enableVectorIndexing', false),
  automergeCredentials: config.get('runtime.client.automergeCredentials', false),
  ...Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== undefined)),
});

/**
 * The whole client services runtime as one layer: RPC handlers over the component stack over the
 * platform inputs, config, the event bus, and the SQL runtime. Build it with `ManagedRuntime` and
 * run {@link openStack} to boot; disposing the runtime tears everything down in reverse.
 */
export const ClientServicesLayer = ({
  config,
  runtime,
  runtimeProps,
  signalManager,
  transportFactory,
  connectionLog = true,
  autoConnect = true,
}: ClientServicesLayerOptions): Layer.Layer<ClientServicesStackContext> =>
  ClientServicesRpcLayer.pipe(
    Layer.provideMerge(
      ServiceStack({
        ...runtimePropsFromConfig(config, runtimeProps),
        edgeFeatures: config.get('runtime.client.edgeFeatures'),
        connectionLog,
        autoConnect,
      }),
    ),
    Layer.provideMerge(ClientPlatformLayer({ signalManager, transportFactory })),
    Layer.provideMerge(Layer.succeed(ConfigService, config)),
    Layer.provideMerge(Event.busLayer),
    Layer.provideMerge(RuntimeProvider.toLayer(runtime)),
    Layer.orDie,
  );

/**
 * Starts the open event chain; each emit returns once every handler it triggered (transitively)
 * has completed, so `StackOpened` fires after storage, identity, network, and spaces are up. Under
 * `ctx` the handlers nest under its trace and stop when it disposes.
 */
export const openStack = (ctx?: Context): Effect.Effect<void, never, Event.Bus> => {
  const open = Effect.gen(function* () {
    yield* Event.emit(Opening, undefined);
    yield* Event.emit(StackOpened, undefined);
    log('stack opened');
  });
  return ctx ? EffectEx.withContext(ctx)(open) : open;
};

/**
 * Allows outbound network activity to begin; for embedders that build the stack with
 * `autoConnect: false`.
 */
export const enableNetworking: Effect.Effect<void, never, Event.Bus> = Event.emit(NetworkingEnabled, undefined);

/**
 * The RPC handlers a built stack serves, keyed by service name.
 */
export const handlersFromStack = (
  stack: EffectContext.Context<ClientServicesRpcContext>,
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
