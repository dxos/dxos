//
// Copyright 2025 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as BrowserKeyValueStore from '@effect/platform-browser/BrowserKeyValueStore';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { AiService, OpaqueToolkit } from '@dxos/ai';
import { Capabilities, Capability, type CapabilityManager } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AiContextBinder, AiContextService, AiSession, AiSessionService } from '@dxos/assistant';
import { McpServer } from '@dxos/assistant-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { ClientService } from '@dxos/client';
import { SpaceProperties } from '@dxos/client-protocol';
import { Resource } from '@dxos/context';
import { Database, DXN, Feed, Filter, Obj } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { acquireReleaseResource, asyncTaskTaggingLayer } from '@dxos/effect';
import {
  CredentialsService,
  FunctionInvocationService,
  feedServiceFromQueueServiceLayer,
  QueueService,
  ServiceNotAvailableError,
} from '@dxos/functions';
import { AgentService } from '@dxos/functions-runtime';
import {
  FeedTraceSink,
  FunctionImplementationResolver,
  FunctionInvocationServiceLayerWithLocalLoopbackExecutor,
  ProcessManager,
  RemoteFunctionExecutionService,
  ServiceResolver,
  TriggerDispatcher,
  TriggerStateStore,
} from '@dxos/functions-runtime';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Operation, OperationHandlerSet, OperationRegistry } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client/types';

import { AutomationCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const provider = yield* Effect.tryPromise(() => new ComputeRuntimeProviderImpl(capabilities).open());
    return Capability.contributes(AutomationCapabilities.ComputeRuntime, provider, () =>
      Effect.tryPromise(() => provider.close()),
    );
  }),
);

declare global {
  interface ImportMeta {
    env: ImportMetaEnv;
  }

  interface ImportMetaEnv {
    DEV: boolean;
  }
}

const isDev = import.meta.env.DEV ?? false;

/** Node / test environments have no `localStorage`; browser keeps persistent trigger state. */
const triggerStateStoreLayer =
  typeof globalThis.localStorage !== 'undefined'
    ? TriggerStateStore.layerKv.pipe(Layer.provide(BrowserKeyValueStore.layerLocalStorage))
    : TriggerStateStore.layerMemory;

/**
 * Adapts plugin capabilities to runtime layers.
 */
class ComputeRuntimeProviderImpl extends Resource implements AutomationCapabilities.ComputeRuntimeProvider {
  readonly #runtimes = new Map<SpaceId, AutomationCapabilities.ComputeRuntime>();
  readonly #subscriptions = new Map<SpaceId, () => void>();
  readonly #capabilities: CapabilityManager.CapabilityManager;

  constructor(capabilities: CapabilityManager.CapabilityManager) {
    super();
    this.#capabilities = capabilities;
  }

  protected override async _open() {}

  protected override async _close() {
    for (const unsubscribe of this.#subscriptions.values()) {
      unsubscribe();
    }
    this.#subscriptions.clear();
    await Promise.all(Array.from(this.#runtimes.values()).map((rt) => rt.dispose()));
    this.#runtimes.clear();
  }

  getRuntime(spaceId: SpaceId): AutomationCapabilities.ComputeRuntime {
    if (this.#runtimes.has(spaceId)) {
      log('getRuntime cache hit', { spaceId });
      return this.#runtimes.get(spaceId)!;
    }
    log('getRuntime building', { spaceId });

    const layer = Layer.unwrapScoped(
      Effect.gen(this, function* () {
        log('compute runtime layer build: start', { spaceId });
        const client = this.#capabilities.get(ClientCapabilities.Client);
        const aiServiceLayer =
          this.#capabilities.get(AppCapabilities.AiServiceLayer) ?? Layer.die('AiService not found');
        const registry = this.#capabilities.get(Capabilities.AtomRegistry);

        // TODO(dmaretskyi): Make these reactive.
        const operationHandlers = OperationHandlerSet.merge(
          ...this.#capabilities.getAll(Capabilities.OperationHandler),
        );

        const opaqueToolkitProvider = Layer.succeed(OpaqueToolkit.OpaqueToolkitProvider, {
          getToolkit: () => {
            const toolkits = this.#capabilities.getAll(AppCapabilities.Toolkit);
            return OpaqueToolkit.merge(...toolkits);
          },
        });

        const blueprints = this.#capabilities
          .getAll(AppCapabilities.BlueprintDefinition)
          .flatMap((blueprint) => blueprint.make());

        const space = client.spaces.get(spaceId);
        invariant(space, `Invalid space: ${spaceId}`);
        log('compute runtime layer build: waiting for space ready', { spaceId });
        const waitStarted = Date.now();
        yield* Effect.promise(() => space.waitUntilReady());
        log('compute runtime layer build: space ready', { spaceId, waitMs: Date.now() - waitStarted });

        // Maintain a live query of space-level MCP server configs.
        const mcpQuery = space.db.query(Filter.type(McpServer.McpServer));
        this.#subscriptions.set(spaceId, mcpQuery.subscribe());

        log('compute runtime layer build: composing inner layer', { spaceId });
        return Layer.scopedDiscard(
          Effect.gen(function* () {
            log('compute runtime inner layer: acquiring services', { spaceId });
            const registry = yield* Registry.AtomRegistry;
            const triggerDispatcher = yield* TriggerDispatcher;
            log('compute runtime inner layer: services acquired', { spaceId });
            // Track the in-flight start/stop so a new transition cancels the previous one
            // (preserving ordering on rapid toggles) and surfaces failures via the Effect logger.
            let inFlight: Fiber.RuntimeFiber<unknown, unknown> | undefined;
            const transition = (effect: Effect.Effect<unknown, unknown>) => {
              if (inFlight) {
                Effect.runFork(Fiber.interrupt(inFlight));
              }
              inFlight = Effect.runFork(
                effect.pipe(
                  Effect.tapErrorCause((cause) => Effect.logError('trigger dispatcher transition failed', cause)),
                ),
              );
            };
            const unsubscribe = registry.subscribe(
              AtomObj.make(space.properties),
              (properties: Obj.Snapshot<SpaceProperties>) => {
                const computeEnvironment = properties.computeEnvironment ?? 'local';
                transition(computeEnvironment === 'local' ? triggerDispatcher.start() : triggerDispatcher.stop());
              },
              { immediate: true },
            );
            yield* Effect.addFinalizer(() =>
              Effect.sync(() => {
                log('compute runtime inner layer: finalize', { spaceId });
                unsubscribe();
                if (inFlight) {
                  Effect.runFork(Fiber.interrupt(inFlight));
                }
              }),
            );
            log('compute runtime inner layer: acquire complete', { spaceId });
          }),
        )
          .pipe(
            Layer.provideMerge(TriggerDispatcher.layer({ timeControl: 'natural' })),
            Layer.provideMerge(
              AgentService.layer({
                getMcpServers: () =>
                  mcpQuery.results
                    .filter(Obj.instanceOf(McpServer.McpServer))
                    .filter((server) => server.enabled !== false)
                    .map(({ url, protocol, apiKey }) => ({ url, protocol, apiKey })),
              }),
            ),
            Layer.provideMerge(ProcessManager.ProcessOperationInvoker.layer),
            Layer.provideMerge(ProcessManager.layer()),
            // TODO(dmaretskyi): Duped in assistant testing layer.
            Layer.provideMerge(
              // TODO(dmaretskyi): Refactor to be able to merge resovler layers, also consider service mesh achitecture.
              Layer.effect(
                ServiceResolver.ServiceResolver,
                Effect.gen(function* () {
                  const services = yield* Effect.context<Database.Service | Feed.FeedService>().pipe(
                    Effect.map(Context.pick(Database.Service, Feed.FeedService)),
                    Effect.map(Layer.succeedContext),
                  );
                  // AiContextBinder.
                  return ServiceResolver.compose(
                    ServiceResolver.succeed(AiContextService, (context) =>
                      Effect.gen(function* () {
                        if (!context.conversation) {
                          return yield* Effect.fail(new ServiceNotAvailableError(AiContextService.key));
                        }
                        const feed = yield* Database.resolve(DXN.parse(context.conversation), Feed.Feed).pipe(
                          Effect.orDie,
                        );
                        const runtime = yield* Effect.runtime<Feed.FeedService>();
                        const binder = yield* acquireReleaseResource(
                          () =>
                            new AiContextBinder({
                              feed,
                              runtime,
                            }),
                        );
                        return { binder };
                      }).pipe(Effect.provide(services)),
                    ),
                    // AiSessionService.
                    ServiceResolver.succeed(AiSessionService, (context) =>
                      Effect.gen(function* () {
                        if (!context.conversation) {
                          return yield* Effect.fail(new ServiceNotAvailableError(AiSessionService.key));
                        }
                        const feed = yield* Database.resolve(DXN.parse(context.conversation), Feed.Feed).pipe(
                          Effect.orDie,
                        );
                        const runtime = yield* Effect.runtime<Feed.FeedService>();
                        const session = yield* acquireReleaseResource(
                          () =>
                            new AiSession({
                              feed,
                              runtime,
                            }),
                        );
                        return session;
                      }).pipe(Effect.provide(services)),
                    ),
                    yield* ServiceResolver.fromRequirements(
                      Database.Service,
                      OpaqueToolkit.OpaqueToolkitProvider,
                      Feed.FeedService,
                      QueueService,
                      AiService.AiService,
                      OperationRegistry.Service,
                      Blueprint.RegistryService,
                      CredentialsService,
                    ),
                  );
                }),
              ),
            ),
            Layer.provideMerge(Layer.succeed(Blueprint.RegistryService, new Blueprint.Registry(blueprints))),
            Layer.provideMerge(Layer.succeed(Capability.Service, this.#capabilities)),
            Layer.provideMerge(Layer.succeed(Registry.AtomRegistry, registry)),
            Layer.provideMerge(
              Layer.mergeAll(FeedTraceSink.layerLive, triggerStateStoreLayer, KeyValueStore.layerMemory),
            ),
            Layer.provideMerge(OperationRegistry.layer),
            Layer.provideMerge(feedServiceFromQueueServiceLayer),
            Layer.provideMerge(OperationHandlerSet.provide(operationHandlers)),
            Layer.provideMerge(
              Layer.effect(
                Operation.Service,
                Effect.gen(function* () {
                  const fis = yield* FunctionInvocationService;
                  return {
                    invoke: (op: any, ...args: any[]) => (fis.invokeFunction as any)(op, args[0]),
                    schedule: (op: any, ...args: any[]) =>
                      (fis.invokeFunction as any)(op, args[0]).pipe(Effect.fork, Effect.asVoid),
                    invokePromise: async () => ({ error: new Error('Not implemented') }),
                  } as unknown as Operation.OperationService;
                }),
              ),
            ),
            Layer.provideMerge(
              FunctionInvocationServiceLayerWithLocalLoopbackExecutor.pipe(
                Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions: operationHandlers })),
                Layer.provideMerge(
                  client.config.values.runtime?.services?.edge?.url
                    ? RemoteFunctionExecutionService.fromClient(
                        client,
                        client.config.get('runtime.client.edgeFeatures.agents') ? spaceId : undefined,
                      )
                    : RemoteFunctionExecutionService.layerMock,
                ),
              ),
            ),
            Layer.provideMerge(opaqueToolkitProvider),
            Layer.provideMerge(aiServiceLayer),
            Layer.provideMerge(CredentialsService.layerFromDatabase()),
            Layer.provideMerge(ClientService.fromClient(client)),
            Layer.provideMerge(space ? Database.layer(space.db) : Database.notAvailable),
          )
          .pipe(
            Layer.provideMerge(space ? QueueService.layer(space.queues) : QueueService.notAvailable),
            Layer.provideMerge(space ? createFeedServiceLayer(space.queues) : Feed.notAvailable),
            Layer.provideMerge(isDev ? asyncTaskTaggingLayer() : Layer.empty),
          );
      }),
    );

    const runtime = ManagedRuntime.make(layer);
    log('getRuntime ready (managed runtime created)', { spaceId });
    this.#runtimes.set(spaceId, runtime);
    return runtime;
  }
}
