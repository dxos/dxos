//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { type Config, ConfigService } from '@dxos/config';
import { Hook } from '@dxos/effect';
import { type SignalManager, SignalManagerService } from '@dxos/messaging';
import { type TransportFactory } from '@dxos/network-manager';
import { RpcRouter } from '@dxos/rpc';
import type * as SqlExport from '@dxos/sql-sqlite/SqlExport';

import { ClientPlatformLayer, type TransportFactoryService } from './client-platform.ts';
import { NetworkingEnabled } from './events.ts';
import { type ServiceContextRuntimeProps, type ServiceContextStackContext, ServiceStack } from './service-stack.ts';

/**
 * Everything the client services runtime provides: the hook controller, config, the platform inputs,
 * the component layers, and the RPC handler layers.
 */
export type ClientServicesStackContext =
  | Hook.Controller
  | ConfigService
  | RpcRouter.RpcRouter
  | ServiceContextStackContext
  | SignalManagerService
  | TransportFactoryService;

/** The SQL services the stack persists through; the embedder provides them beneath the layer. */
export type ClientServicesSqlContext = SqlClient.SqlClient | SqlExport.SqlExport;

export type ClientServicesLayerOptions = {
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
 * platform inputs, persisting through the SQL services, config and the embedder's controller provided
 * beneath it. Build it with `ManagedRuntime`, then emit `Opening` and `StackOpened` to boot; disposing the
 * runtime tears everything down in reverse.
 */
export const ClientServicesLayer = ({
  runtimeProps,
  signalManager,
  transportFactory,
  connectionLog = true,
  autoConnect = true,
}: ClientServicesLayerOptions = {}): Layer.Layer<
  ClientServicesStackContext,
  never,
  ClientServicesSqlContext | ConfigService | Hook.Controller
> =>
  // The runtime props are read from the config eagerly, so the stack is unwrapped from an effect
  // that resolves the config the embedder provided beneath it.
  Layer.unwrap(
    Effect.gen(function* () {
      const config = yield* ConfigService;
      const controller = yield* Hook.Controller;
      return ServiceStack({
        ...runtimePropsFromConfig(config, runtimeProps),
        edgeFeatures: config.get('runtime.client.edgeFeatures'),
        connectionLog,
        autoConnect,
      }).pipe(
        Layer.provideMerge(ClientPlatformLayer({ signalManager, transportFactory })),
        // The router sits beneath every service: each registers itself into it, and a transport
        // attached later (a worker session) serves whatever is registered.
        Layer.provideMerge(RpcRouter.layer),
        // Re-provided so the built stack context carries them, as every consumer of the context expects.
        Layer.provideMerge(Layer.succeed(ConfigService, config)),
        Layer.provideMerge(Layer.succeed(Hook.Controller, controller)),
        Layer.orDie,
      );
    }),
  );

/**
 * Allows outbound network activity to begin; for embedders that build the stack with
 * `autoConnect: false`.
 */
export const enableNetworking: Effect.Effect<void, never, Hook.Controller> = Hook.emit(NetworkingEnabled, undefined);
