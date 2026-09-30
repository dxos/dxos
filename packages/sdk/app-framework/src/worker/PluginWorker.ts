//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';

import { LayerStack } from '@dxos/compute-runtime';
import { Config, ConfigService } from '@dxos/config';
import { Hook } from '@dxos/effect';
import { BaseError } from '@dxos/errors';
import { log } from '@dxos/log';
import { RpcRouter } from '@dxos/rpc';
import * as Worker from '@dxos/worker-framework/Worker';

import * as Capabilities from '../common/capabilities.ts';
import * as PluginManager from '../core/plugin-manager/index.ts';
import * as Plugin from '../core/plugin.ts';
import { normalizePluginExport } from '../core/url-loader.ts';
import * as WorkerCapabilities from './WorkerCapabilities.ts';
import * as WorkerEvents from './WorkerEvents.ts';

export class WorkerPluginLoadError extends BaseError.extend(
  'WorkerPluginLoadError',
  'A worker plugin failed to load or activate.',
) {}

export type RunOptions = {
  /** Web Lock key gating storage ownership; every generation of the app's worker must share it. */
  storageLockKey: string;
  /** Plugins compiled into the worker entry; those listed in `runtime.client.workerPlugins` join them. */
  plugins?: readonly Plugin.Plugin[];
  /** Runs once the tab's config arrives, before any plugin loads: the place for process-wide setup such as telemetry. */
  onBeforeStart?: (config: Config) => Effect.Effect<void>;
  /**
   * Runs once the stack is ready and every {@link WorkerEvents.StackReady} subscriber has finished, before any
   * session is admitted. A failure is logged: it must not keep the worker from serving its tabs.
   */
  onStart?: (stack: LayerStack.LayerStack) => Effect.Effect<void, unknown>;
};

/** Imports a worker plugin by URL; the module's default export is a plugin or a zero-arg factory. */
const loadPlugin = (url: string): Effect.Effect<Plugin.Plugin, WorkerPluginLoadError> =>
  Effect.tryPromise({
    try: async () => normalizePluginExport(await import(/* @vite-ignore */ url)),
    catch: (cause) => new WorkerPluginLoadError({ context: { url }, cause }),
  });

/**
 * Runs a dedicated worker whose content is plugins. The worker itself provides only a hook bus
 * ({@link Hook.Controller}), an RPC router attached to every tab session, the config the tab sent,
 * and a layer stack built from the {@link Capabilities.LayerSpec} its plugin modules contribute on
 * {@link WorkerEvents.Startup}. Everything else — which services, when to open them, what to do
 * per session — is a plugin's, through {@link WorkerCapabilities.Host} and {@link WorkerEvents}.
 */
export const run = ({ storageLockKey, plugins: builtIn = [], onBeforeStart, onStart }: RunOptions): void =>
  Worker.run({
    storageLockKey,
    createRuntime: ({ config: values, requestShutdown }) =>
      Effect.gen(function* () {
        const config = new Config(values ?? {});
        const hooks = Hook.makeController();
        const router = yield* RpcRouter.make;
        const provideHooks = Effect.provideService(Hook.Controller, hooks);
        if (onBeforeStart) {
          yield* onBeforeStart(config);
        }

        const urls = config.values.runtime?.client?.workerPlugins ?? [];
        log('plugin-worker: loading plugins', { urls });
        const loaded = yield* Effect.forEach(urls, loadPlugin, { concurrency: 'unbounded' });
        const plugins = [...builtIn, ...loaded];
        const manager = PluginManager.make({
          pluginLoader: (id) =>
            Effect.fromNullishOr(plugins.find((plugin) => plugin.meta.profile.key === id)).pipe(
              Effect.map((plugin) => ({ plugin })),
              Effect.mapError(() => new WorkerPluginLoadError({ context: { id } })),
            ),
          plugins: [...plugins],
          core: plugins.map((plugin) => plugin.meta.profile.key),
        });
        // Registered before the stack's scope is forked, so on shutdown the stack closes first and
        // the modules that drive it deactivate after.
        yield* Effect.addFinalizer(() => manager.shutdown().pipe(Effect.orDie));
        // Owns the stack; a plugin may close it ahead of the worker, as a reset does before wiping storage.
        const stackScope = yield* Scope.fork(yield* Effect.scope);
        manager.capabilities.contribute({
          interface: WorkerCapabilities.Host,
          implementation: {
            config,
            hooks,
            router,
            requestShutdown: Effect.sync(requestShutdown),
            closeStack: Scope.close(stackScope, Exit.void),
          },
          module: 'org.dxos.app-framework.worker.host',
        });

        yield* manager
          .activate(WorkerEvents.Startup)
          .pipe(Effect.mapError((cause) => new WorkerPluginLoadError({ cause })));
        // The manager records a failed module instead of failing the wave; without its specs the
        // worker has nothing to serve, so a failure here fails init and the tab sees why.
        const [failure] = manager.getFailed();
        if (failure) {
          return yield* Effect.fail(
            new WorkerPluginLoadError({ context: { plugin: failure.id }, cause: failure.error }),
          );
        }

        // Collected once: a module activating later cannot add to a built stack.
        const layers = manager.capabilities.getAll(Capabilities.LayerSpec);
        log('plugin-worker: building layer stack', { specs: layers.length });
        const stackContext = yield* Layer.build(
          LayerStack.layer({ layers, services: [ConfigService, Hook.Controller, RpcRouter.RpcRouter] }).pipe(
            Layer.provide(Layer.succeed(ConfigService, config)),
            Layer.provide(Layer.succeed(Hook.Controller, hooks)),
            Layer.provide(Layer.succeed(RpcRouter.RpcRouter, router)),
          ),
        ).pipe(Scope.provide(stackScope));
        const stack = Context.get(stackContext, LayerStack.Service);
        // Builds the eager specs — rpc registrations, lifecycle subscriptions — which nothing resolves.
        yield* stack.init().pipe(Effect.orDie, Scope.provide(stackScope));
        yield* Hook.emit(WorkerEvents.StackReady, { stack }).pipe(provideHooks);
        if (onStart) {
          yield* onStart(stack).pipe(Effect.catchCause((cause) => Effect.sync(() => log.catch(cause))));
        }
        log('plugin-worker: ready');

        let sessions = 0;
        return {
          createSession: Effect.fn('PluginWorker.createSession')(function* ({ clientId, isOwner }) {
            const appProtocol = yield* RpcServer.Protocol;
            const systemProtocol = yield* RpcClient.Protocol;
            yield* router.attach(appProtocol);
            sessions++;
            yield* Effect.addFinalizer(() =>
              Effect.gen(function* () {
                sessions--;
                // A failing subscriber must not skip the shutdown check below.
                yield* Hook.emit(WorkerEvents.SessionClosed, { clientId, isOwner }).pipe(
                  provideHooks,
                  Effect.catchCause((cause) => Effect.sync(() => log.catch(cause))),
                );
                if (sessions === 0) {
                  requestShutdown();
                }
              }),
            );
            yield* Hook.emit(WorkerEvents.SessionOpened, {
              clientId,
              isOwner,
              systemProtocol,
              scope: yield* Effect.scope,
            }).pipe(provideHooks);
          }),
        };
      }),
  });
