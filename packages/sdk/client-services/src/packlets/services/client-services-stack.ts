//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { LayerStack } from '@dxos/compute-runtime';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { type Config, ConfigService } from '@dxos/config';
import { Hook } from '@dxos/effect';
import { type SignalManager } from '@dxos/messaging';
import { type TransportFactory } from '@dxos/network-manager';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';

import { NetworkingEnabled } from './events.ts';
import { clientServiceSpecs } from './layer-specs.ts';
import { type ServiceContextRuntimeProps } from './service-stack.ts';

/** The SQL services the stack persists through; the embedder provides them beneath it. */
export type ClientServicesSqlContext = SqlClient.SqlClient | SqlExport.SqlExport;

/** Everything the stack resolves against rather than building itself. */
const AMBIENT_SERVICES = [ConfigService, Hook.Controller, SqlClient.SqlClient, SqlExport.SqlExport] as const;

export type ClientServicesStackOptions = {
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
 * The client services stack: the {@link clientServiceSpecs} graph aggregated by a {@link LayerStack},
 * over the ambient services the embedder provides beneath it.
 *
 * Specs are built on demand — resolving a tag builds what that tag needs and nothing else — except
 * the `eager` ones (rpc registrations, lifecycle subscriptions, replicators), which this layer builds
 * as it is created, since nothing would ever ask for them. Reach a service with
 * `ServiceResolver.resolve`, which this layer provides alongside the stack; emit `Opening` and
 * `StackOpened` to boot the components, and closing the layer's scope tears everything down.
 */
export const layerClientServices = (
  options: ClientServicesStackOptions = {},
): Layer.Layer<
  LayerStack.Service | ServiceResolver.ServiceResolver,
  never,
  ClientServicesSqlContext | ConfigService | Hook.Controller
> => layerBuildEagerSpecs.pipe(Layer.provideMerge(layerSpecsFromConfig(options)));

/**
 * Allows outbound network activity to begin; for embedders that build the stack with
 * `autoConnect: false`.
 */
export const enableNetworking: Effect.Effect<void, never, Hook.Controller> = Hook.emit(NetworkingEnabled, undefined);

/**
 * The stack itself. Config decides which specs the graph has, so the layer is unwrapped from an
 * effect that reads it.
 */
const layerSpecsFromConfig = (
  options: ClientServicesStackOptions,
): Layer.Layer<
  LayerStack.Service | ServiceResolver.ServiceResolver,
  never,
  ClientServicesSqlContext | ConfigService | Hook.Controller
> =>
  Layer.unwrap(
    Effect.gen(function* () {
      const config = yield* ConfigService;
      return LayerStack.layer({
        layers: clientServiceSpecs({
          ...runtimePropsFromConfig(config, options.runtimeProps),
          edgeFeatures: config.get('runtime.client.edgeFeatures'),
          edgeAvailable: !!config.get('runtime.services.edge.url'),
          signalManager: options.signalManager,
          transportFactory: options.transportFactory,
          connectionLog: options.connectionLog ?? true,
          autoConnect: options.autoConnect ?? true,
        }),
        services: AMBIENT_SERVICES,
      });
    }),
  );

/**
 * A spec that only registers an rpc service or subscribes to a lifecycle event provides no tag for
 * anyone to resolve, so the graph stays dormant until its slice is initialized.
 */
const layerBuildEagerSpecs: Layer.Layer<never, never, LayerStack.Service> = Layer.effectDiscard(
  Effect.gen(function* () {
    const stack = yield* LayerStack.Service;
    yield* stack.init().pipe(Effect.orDie);
  }),
);
