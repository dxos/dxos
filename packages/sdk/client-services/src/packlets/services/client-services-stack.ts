//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { LayerStack } from '@dxos/compute-runtime';
import type { ServiceNotAvailableError } from '@dxos/compute/errors';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { type Config, ConfigService } from '@dxos/config';
import { Hook } from '@dxos/effect';
import { type SignalManager } from '@dxos/messaging';
import { type TransportFactory } from '@dxos/network-manager';
import type * as SqlExport from '@dxos/sql-sqlite/SqlExport';

import { ClientPlatformLayer } from './client-platform.ts';
import { NetworkingEnabled } from './events.ts';
import { clientServiceSpecs } from './layer-specs.ts';
import { type ServiceContextRuntimeProps } from './service-stack.ts';

/** The SQL services the stack persists through; the embedder provides them beneath it. */
export type ClientServicesSqlContext = SqlClient.SqlClient | SqlExport.SqlExport;

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
 * The running client services stack: the {@link clientServiceSpecs} graph aggregated by a
 * {@link LayerStack}, over the ambient services the embedder supplies.
 *
 * Specs are built on demand — resolving a tag builds what that tag needs and nothing else — except
 * the `eager` ones (rpc registrations, lifecycle subscriptions, replicators), which the slice builds
 * as soon as it initialises, since nothing would ever ask for them.
 */
export class ClientServicesStack {
  readonly #stack: LayerStack.LayerStack;
  readonly #scope: Scope.Scope;

  constructor(stack: LayerStack.LayerStack, scope: Scope.Scope) {
    this.#stack = stack;
    this.#scope = scope;
  }

  /**
   * The service behind `tag`, building whatever the graph needs to produce it. Services live for
   * the lifetime of the stack rather than of the caller, so the stack's own scope is provided here.
   */
  resolve<Tag extends Context.Key<any, any>>(
    tag: Tag,
  ): Effect.Effect<Context.Service.Shape<Tag>, ServiceNotAvailableError> {
    return this.#stack.getServiceResolver().resolve(tag, {}).pipe(Scope.provide(this.#scope));
  }

  /**
   * The given tags as one {@link Context}, for handing to an effect that requires them.
   */
  resolveAll<const Tags extends readonly Context.Key<any, any>[]>(
    ...tags: Tags
  ): Effect.Effect<Context.Context<Tags[number]>, ServiceNotAvailableError> {
    return ServiceResolver.resolveAll(tags, {}).pipe(
      Effect.provideService(ServiceResolver.ServiceResolver, this.#stack.getServiceResolver()),
      Scope.provide(this.#scope),
    );
  }

  /**
   * Build the eager specs: the rpc registrations, the lifecycle subscriptions and the replicators.
   * Until this runs the graph is dormant, so an embedder calls it before emitting `Opening`.
   */
  open(): Effect.Effect<void, ServiceNotAvailableError> {
    return this.#stack.init().pipe(Scope.provide(this.#scope));
  }

  /**
   * Tear down every built spec. Slices dispose newest first, so a spec closes before the ones it
   * was built on.
   */
  destroy(): Promise<void> {
    return this.#stack.destroy();
  }
}

/**
 * Builds the stack: the embedder's config, controller, SQL services and platform inputs become the
 * ambient services every spec resolves against. Nothing in the graph is built until a tag is
 * resolved. Emit `Opening` and `StackOpened` to boot it; closing the scope tears it down.
 */
export const makeClientServicesStack = ({
  runtimeProps,
  signalManager,
  transportFactory,
  connectionLog = true,
  autoConnect = true,
}: ClientServicesStackOptions = {}): Effect.Effect<
  ClientServicesStack,
  never,
  ClientServicesSqlContext | ConfigService | Hook.Controller | Scope.Scope
> =>
  Effect.gen(function* () {
    const config = yield* ConfigService;
    const controller = yield* Hook.Controller;
    const scope = yield* Effect.scope;
    // The platform inputs are effects (the edge clients are constructed from the configured
    // endpoint), so they are built once into the stack's scope and handed over as plain services.
    const platform = yield* Layer.build(
      ClientPlatformLayer({ signalManager, transportFactory }).pipe(
        Layer.provide(Layer.succeed(ConfigService, config)),
      ),
    );
    const sql = yield* Effect.context<ClientServicesSqlContext>();

    const services = Context.empty().pipe(
      Context.add(ConfigService, config),
      Context.add(Hook.Controller, controller),
      Context.merge(platform),
      Context.merge(sql),
    );

    const stack = new LayerStack.LayerStack({
      layers: clientServiceSpecs({
        ...runtimePropsFromConfig(config, runtimeProps),
        edgeFeatures: config.get('runtime.client.edgeFeatures'),
        edgeAvailable: !!config.get('runtime.services.edge.url'),
        connectionLog,
        autoConnect,
      }),
      services,
    });
    const built = new ClientServicesStack(stack, scope);
    yield* Effect.addFinalizer(() => Effect.promise(() => built.destroy()));
    return built;
  });

/**
 * Allows outbound network activity to begin; for embedders that build the stack with
 * `autoConnect: false`.
 */
export const enableNetworking: Effect.Effect<void, never, Hook.Controller> = Hook.emit(NetworkingEnabled, undefined);
