//
// Copyright 2025 DXOS.org
//

//
// The manager composes collaborating units behind one public API. Each unit receives the
// shared substrate — `ManagerState` (`manager-state.ts`): the reactive atoms, the activation
// status channel, the fiber tracker, and the lifecycle flags — plus the collaborators it
// drives and its own host configuration. Nothing receives a manager reference or a callback
// into another unit:
//
// 1. The plugin catalog (`plugin-catalog.ts`) — add/remove/enable/disable, lazy plugin
//    resolution, dev-plugin shadowing, and the declared-dependency closure
//    (`getDependencies`/`getDependents`). Collaborators: the scheduler (event replay and
//    plugin deactivation) and the registry catalog.
//
// 2. The activation scheduler (`activation-scheduler.ts`) — the lifecycle engine
//    (start / activate / deactivate / reset) and the decision of when each module's
//    `activate` runs. Dependency-mode modules activate in rounds (ordering logic and
//    vocabulary in `activation-graph.ts`), repeated until one activates nothing new;
//    event-mode modules park until their `activatesOn` fires, with inactive dependency
//    providers pulled on demand first. Collaborator: the loader.
//
// 3. The module loader (`module-loader.ts`) — the per-module load pipeline. Loads are
//    memoized (id -> Deferred): every activation path converges on `loader.load`, concurrent
//    paths await the same deferred, and contribution is idempotent per module. Because
//    rounds run concurrently (the startup pass and an event fired mid-startup), the loader
//    also waits for in-flight multi providers before a module's activate runs.
//
// Module bodies receive the manager as the ambient `Plugin.Service`. That dependency is
// carried as a typed Effect requirement (`R = Plugin.Service`) through the loader, scheduler,
// and catalog, and satisfied exactly once here, at the public boundary.
//
// Failures are STRUCTURAL, not fatal: missing/duplicate providers and cycles put the owning
// plugin into an error state (the `failed` atom) and exclude its modules; everything
// independent proceeds. Per-module failures skip transitive dependents only. The
// failure -> auto-disable policy is wired here at the composition root, by observing the
// status channel (the loader publishes module errors; the catalog owns disabling).
//

import { Atom, Registry } from '@effect-atom/atom';
import * as Deferred from 'effect/Deferred';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as PubSub from 'effect/PubSub';
import * as Queue from 'effect/Queue';
import * as Ref from 'effect/Ref';

import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';

import type * as ActivationEvent from './activation-event';
import { ActivationScheduler } from './activation-scheduler';
import * as CapabilityManager from './capability-manager';
import { ManagerState } from './manager-state';
import {
  type ActivationMessage,
  DEFAULT_ACTIVATION_TIMEOUT,
  DEFAULT_LOAD_TIMEOUT,
  type PluginFailure,
  PluginInitializationError,
  PluginTimeoutError,
} from './manager-types';
import { ModuleLoader } from './module-loader';
import * as Plugin from './plugin';
import { PluginCatalog } from './plugin-catalog';
// Imported with a `PluginRegistry` alias because the unrelated `@effect-atom/atom-react`
// `Registry` is already imported above; from outside this file the namespace is
// re-exported as `Registry` via `./index.ts`.
import * as PluginRegistry from './registry';

// Shared with the manager's collaborating units; the canonical public surface stays here.
export { PluginInitializationError, PluginTimeoutError } from './manager-types';
export type { ActivationMessage, PluginFailure, PluginFailurePhase, PluginFailureReason } from './manager-types';

/**
 * Identifier denoting a Manager.
 */
export const ManagerTypeId: unique symbol = Symbol.for('@dxos/app-framework/Manager');
export type ManagerTypeId = typeof ManagerTypeId;

/**
 * Loader result that carries optional metadata about how the plugin was sourced.
 *
 * `dev: true` marks a plugin as session-only and triggers shadow-on-id-collision
 * inside the manager: if a plugin with the same id is already registered (a
 * builtin, or a previously-installed plugin from the registry), the dev plugin
 * temporarily takes over that id slot. The original is restored when the dev
 * plugin is removed (or on page reload, since dev plugins aren't persisted).
 */
export type LoadedPlugin = {
  plugin: Plugin.Plugin;
  /** True when the plugin came from a dev source. See type doc for semantics. */
  dev?: boolean;
};

export type ManagerOptions = {
  pluginLoader: (id: string) => Effect.Effect<LoadedPlugin, Error>;
  plugins?: Plugin.Plugin[];
  enabled?: string[];
  registry?: Registry.Registry;
  /**
   * Backend for the plugin registry catalog. When omitted the manager exposes a
   * no-op `pluginRegistry` (empty list, no versions endpoint). Implementations
   * live in app-framework alongside the interface (e.g.
   * `EdgeRegistryPluginProvider`); the host app instantiates one and passes it in.
   */
  pluginRegistryProvider?: PluginRegistry.PluginProvider;
  /**
   * Hook called when a plugin is removed via {@link PluginManager.remove}. Used by the
   * host app to clean up persisted state (e.g. evict offline-cached plugin assets).
   * Failures are logged and swallowed; removal still succeeds even if the hook fails.
   */
  onRemove?: (id: string) => Effect.Effect<void, unknown>;
  /**
   * Maximum time allowed for a lazy plugin's dynamic `import()` to resolve.
   * Plugins that exceed this are flagged on the {@link PluginManager.failed}
   * atom and auto-disabled so a stuck remote host can't stall app boot.
   * Defaults to 30 seconds; pass `Duration.infinity` to disable.
   */
  loadTimeout?: Duration.DurationInput;
  /**
   * Maximum time allowed for a single module's `activate()` Effect to settle.
   * Modules that exceed this fail with {@link PluginTimeoutError}; the owning
   * plugin is recorded on `failed` and auto-disabled. Defaults to 30 seconds;
   * pass `Duration.infinity` to disable.
   */
  activationTimeout?: Duration.DurationInput;
};

/**
 * Interface for the Plugin Manager.
 */
export interface PluginManager {
  readonly [ManagerTypeId]: ManagerTypeId;
  readonly activation: PubSub.PubSub<ActivationMessage>;
  readonly capabilities: CapabilityManager.CapabilityManager;
  readonly registry: Registry.Registry;
  /**
   * Cached registry catalog state plus pass-throughs for `listVersions` /
   * `getPlugin`. Always present — the host supplies a `pluginRegistryProvider`
   * via {@link ManagerOptions} for real backends, or it falls back to a no-op
   * implementation that yields an empty catalog.
   */
  readonly pluginRegistry: PluginRegistry.Manager;

  readonly plugins: Atom.Atom<readonly Plugin.Plugin[]>;
  readonly core: Atom.Atom<readonly string[]>;
  readonly enabled: Atom.Atom<readonly string[]>;
  readonly modules: Atom.Atom<readonly Plugin.PluginModule[]>;
  readonly active: Atom.Atom<readonly string[]>;
  readonly eventsFired: Atom.Atom<readonly string[]>;
  readonly pendingReset: Atom.Atom<readonly string[]>;
  /**
   * Plugins that failed to load or activate. Subscribers (e.g. the registry
   * UI) can use this to flag unhealthy entries; a plugin id appears here at
   * most once with its most recent failure.
   */
  readonly failed: Atom.Atom<readonly PluginFailure[]>;
  /**
   * Ids of currently-registered plugins that came from a dev source (loaded
   * via {@link LoadedPlugin} with `dev: true`). Subscribers can use this to
   * badge dev-overridden plugins or to derive the id of the active dev plugin
   * for an "uninstall dev plugin" affordance.
   */
  readonly devPluginIds: Atom.Atom<readonly string[]>;

  getPlugins(): readonly Plugin.Plugin[];
  getCore(): readonly string[];
  getEnabled(): readonly string[];
  getModules(): readonly Plugin.PluginModule[];
  getActive(): readonly string[];
  getEventsFired(): readonly string[];
  getPendingReset(): readonly string[];
  getFailed(): readonly PluginFailure[];
  getDevPluginIds(): readonly string[];

  /**
   * Clears the failure record for a plugin so it can be retried. Returns
   * whether a failure record existed and was removed.
   */
  clearFailure(id: string): boolean;

  /**
   * Loads a plugin via the plugin loader and registers it without enabling it.
   * Returns the loaded plugin so callers can enable it by its canonical id
   * (which may differ from the locator used to load it, e.g. URL loaders).
   */
  add(id: string): Effect.Effect<Plugin.Plugin, Error>;

  /**
   * Enables a plugin.
   *
   * Default behavior auto-resolves the plugin's declared `dependsOn` closure:
   * missing entries that exist in the plugin registry catalog are installed via
   * {@link add}, then enabled in dependency-first order. Set `resolveDependencies`
   * to `false` to enable only the named plugin and skip the closure walk
   * entirely — useful when substituting an alternative plugin that satisfies
   * the dependent's capability needs in its own way.
   */
  enable(id: string, opts?: { resolveDependencies?: boolean }): Effect.Effect<boolean, Error>;

  /**
   * Removes a plugin from the manager (disables then unregisters).
   *
   * Honors the same cascade option as {@link disable}.
   */
  remove(id: string, opts?: { cascade?: boolean }): Effect.Effect<boolean, Error>;

  /**
   * Disables a plugin.
   *
   * By default, cascades to currently-enabled dependents (transitively, leaves
   * first) so disabling a depended-upon plugin never leaves its dependents
   * stranded. Pass `cascade: false` to disable only the named plugin and leave
   * its dependents enabled-but-broken — VS Code-style disable parity for
   * callers that want the escape hatch (e.g. when swapping in an alternative
   * implementation that satisfies the dependents' needs in its own way).
   *
   * Fails with {@link Plugin.PluginDependencyError} (`reason: 'core-dependent'`)
   * when cascading would require disabling a core plugin; UI flows should
   * surface their own confirmation before calling `disable` with the default.
   */
  disable(id: string, opts?: { cascade?: boolean }): Effect.Effect<boolean, Error>;

  /**
   * Returns the plugin ids that the given plugin declares as dependencies.
   *
   * Walks `meta.dependsOn` from both registered plugins and the plugin registry
   * catalog so callers can preview the closure for a plugin that isn't yet
   * installed. With `transitive: true` (default), returns the full dependency
   * closure in dependency-first order (deps before dependents). Without it,
   * returns the direct declarations only.
   */
  getDependencies(id: string, opts?: { transitive?: boolean }): readonly string[];

  /**
   * Returns the plugin ids that declare the given plugin as a dependency.
   *
   * Walks `meta.dependsOn` over registered plugins. With `transitive: true`
   * (default), returns the full reverse closure. With `enabledOnly: true`,
   * filters to currently-enabled dependents — used by UI flows to preview what
   * a cascading disable would touch.
   */
  getDependents(id: string, opts?: { transitive?: boolean; enabledOnly?: boolean }): readonly string[];
  /**
   * Runs startup: the capability-dependency resolution pass for dependency-mode modules,
   * concurrently with the event-mode activation pass for any module explicitly targeting the
   * Startup event. The event-level Startup `activated` message publishes only after both
   * passes complete. Idempotent — subsequent calls activate whatever registered since.
   * `activate(Startup)` delegates here.
   */
  start(): Effect.Effect<boolean, Error>;
  // TODO(wittjosiah): Improve error typing.
  activate(
    event: ActivationEvent.ActivationEvent | string,
    params?: { before?: string; after?: string },
  ): Effect.Effect<boolean, Error>;
  deactivate(id: string): Effect.Effect<boolean, Error>;
  reset(event: ActivationEvent.ActivationEvent | string): Effect.Effect<boolean, Error>;

  /**
   * Shuts down the manager by deactivating all active modules in reverse activation order,
   * clearing all capabilities, and resetting lifecycle bookkeeping.
   * Plugins, core, enabled, and modules remain intact so the manager can be reused.
   */
  shutdown(): Effect.Effect<boolean, Error>;
}

/**
 * Type guard to check if a value is a PluginManager.
 */
export const isManager = (value: unknown): value is PluginManager => {
  return typeof value === 'object' && value !== null && ManagerTypeId in value;
};

/**
 * Internal implementation of PluginManager.
 */
class ManagerImpl implements PluginManager {
  readonly [ManagerTypeId]: ManagerTypeId = ManagerTypeId;
  readonly capabilities: CapabilityManager.CapabilityManager;
  readonly registry: Registry.Registry;
  readonly pluginRegistry: PluginRegistry.Manager;

  private readonly _state: ManagerState;
  private readonly _loader: ModuleLoader;
  private readonly _scheduler: ActivationScheduler;
  private readonly _catalog: PluginCatalog;
  private readonly _shutdownSemaphore = Effect.runSync(Effect.makeSemaphore(1));
  /** The failure-supervision fiber; stopped by `shutdown`, restarted by `_withRuntime`. */
  private _supervisor: Fiber.RuntimeFiber<never> | undefined;

  constructor({
    pluginLoader,
    plugins = [],
    enabled = [],
    registry,
    pluginRegistryProvider,
    onRemove,
    loadTimeout = DEFAULT_LOAD_TIMEOUT,
    activationTimeout = DEFAULT_ACTIVATION_TIMEOUT,
  }: ManagerOptions) {
    // Core plugins are derived from `meta.tags.includes('system')`; the set is
    // a snapshot of the initial `plugins` array (later `add()` calls do not
    // promote plugins to core).
    const core: string[] = plugins
      .filter(({ meta }) => meta.profile.tags?.includes('system'))
      .map(({ meta }) => meta.profile.key);
    this.registry = registry ?? Registry.make();
    this.capabilities = CapabilityManager.make({
      registry: this.registry,
    });
    this.pluginRegistry = new PluginRegistry.Manager(pluginRegistryProvider, this.registry);

    this._state = new ManagerState(this.registry, { plugins, core, enabled });
    this._loader = new ModuleLoader(this._state, this.capabilities, activationTimeout);
    this._scheduler = new ActivationScheduler(this._state, this.capabilities, this._loader);
    this._catalog = new PluginCatalog(this._state, this._scheduler, this.pluginRegistry, {
      pluginLoader,
      loadTimeout,
      onRemove,
    });
    this._superviseFailures();

    // The initialization flag lets event dispatch wait for the constructor-launched
    // core/enabled `enable()` calls to finish registering modules. Lazy plugins make
    // `enable` asynchronous (a dynamic `import()` happens inside it), so without this
    // synchronization an `activate` triggered immediately after `make` could fire on an
    // empty module set. Failures are wrapped in `PluginInitializationError` so awaiters
    // get a tagged error rather than the wide `Error` produced by the underlying chain.
    //
    // Dedupe before mapping to `enable` — `core` and `enabled` may overlap (an
    // app-supplied plugin can be in both), and concurrent `enable(id)` calls
    // for the same id are not idempotent (each would re-run the lazy resolve
    // and double-register modules). `new Set([...])` preserves first-seen
    // order which matches the natural core-before-enabled precedence.
    const initialIds = [...new Set([...core, ...enabled])];
    void Effect.all(initialIds.map((id) => this.enable(id)))
      .pipe(
        Effect.mapError((cause) => new PluginInitializationError({ cause })),
        Effect.tap(() => Deferred.succeed(this._state.initialized, undefined)),
        Effect.tapErrorCause((cause) => Deferred.failCause(this._state.initialized, cause)),
      )
      .pipe(EffectEx.runAndForwardErrors);
  }

  get activation(): PubSub.PubSub<ActivationMessage> {
    return this._state.activation;
  }

  /**
   * Cross-unit failure policy, wired at the composition root: the loader publishes a module
   * error message for every failed activation; the catalog owns disabling. Idempotent —
   * a supervisor that is already running is kept.
   */
  private _superviseFailures(): void {
    if (this._supervisor !== undefined) {
      return;
    }
    this._supervisor = PubSub.subscribe(this._state.activation).pipe(
      Effect.flatMap((subscription) =>
        Queue.take(subscription).pipe(
          Effect.tap((message) => Effect.sync(() => this._autoDisableOnModuleError(message))),
          Effect.forever,
        ),
      ),
      Effect.scoped,
      Effect.runFork,
    );
  }

  /**
   * Auto-disables the plugin owning a failed module. Error messages without a registered
   * module id (structural failures, lazy plugin loads) are handled by their own paths.
   */
  private _autoDisableOnModuleError(message: ActivationMessage): void {
    if (message.state !== 'error' || message.module === undefined) {
      return;
    }
    const pluginId = this._state.pluginIdOfModule(message.module);
    if (pluginId !== undefined) {
      this._catalog.scheduleAutoDisable(pluginId);
    }
  }

  /**
   * Entry wrapper for the unit effects that can run module activations: provides this manager
   * as the ambient `Plugin.Service` (the typed requirement carried by the units) and ensures
   * the failure supervisor is running (shutdown stops it).
   */
  private readonly _withRuntime = <A, E>(effect: Effect.Effect<A, E, Plugin.Service>): Effect.Effect<A, E> => {
    return Effect.suspend(() => {
      this._superviseFailures();
      return Effect.provideService(effect, Plugin.Service, this);
    });
  };

  get plugins(): Atom.Atom<readonly Plugin.Plugin[]> {
    return this._state.plugins;
  }

  get core(): Atom.Atom<readonly string[]> {
    return this._state.core;
  }

  /**
   * Ids of plugins that are currently enabled.
   */
  get enabled(): Atom.Atom<readonly string[]> {
    return this._state.enabled;
  }

  /**
   * Modules of plugins which are currently enabled.
   */
  get modules(): Atom.Atom<readonly Plugin.PluginModule[]> {
    return this._state.modules;
  }

  /**
   * Ids of modules which are currently active.
   */
  get active(): Atom.Atom<readonly string[]> {
    return this._state.active;
  }

  /**
   * Ids of events which have been fired.
   */
  get eventsFired(): Atom.Atom<readonly string[]> {
    return this._state.eventsFired;
  }

  /**
   * Ids of modules which are pending reset.
   */
  get pendingReset(): Atom.Atom<readonly string[]> {
    return this._state.pendingReset;
  }

  /**
   * Plugins that failed to load or activate.
   */
  get failed(): Atom.Atom<readonly PluginFailure[]> {
    return this._state.failed;
  }

  /**
   * Ids of currently-registered plugins that came from a dev source.
   */
  get devPluginIds(): Atom.Atom<readonly string[]> {
    return this._state.devPluginIds;
  }

  getPlugins(): readonly Plugin.Plugin[] {
    return this._state.getPlugins();
  }

  getCore(): readonly string[] {
    return this._state.read(this._state.core);
  }

  getEnabled(): readonly string[] {
    return this._state.read(this._state.enabled);
  }

  getModules(): readonly Plugin.PluginModule[] {
    return this._state.getModules();
  }

  getActive(): readonly string[] {
    return this._state.getActiveIds();
  }

  getEventsFired(): readonly string[] {
    return this._state.read(this._state.eventsFired);
  }

  getPendingReset(): readonly string[] {
    return this._state.getPendingReset();
  }

  getFailed(): readonly PluginFailure[] {
    return this._state.getFailures();
  }

  getDevPluginIds(): readonly string[] {
    return this._state.read(this._state.devPluginIds);
  }

  clearFailure(id: string): boolean {
    return this._state.clearFailure(id);
  }

  getDependencies(id: string, opts?: { transitive?: boolean }): readonly string[] {
    return this._catalog.getDependencies(id, opts);
  }

  getDependents(id: string, opts?: { transitive?: boolean; enabledOnly?: boolean }): readonly string[] {
    return this._catalog.getDependents(id, opts);
  }

  add(id: string): Effect.Effect<Plugin.Plugin, Error> {
    return this._catalog.add(id);
  }

  enable(id: string, opts?: { resolveDependencies?: boolean }): Effect.Effect<boolean, Error> {
    return this._catalog.enable(id, opts).pipe(this._withRuntime);
  }

  remove(id: string, opts?: { cascade?: boolean }): Effect.Effect<boolean, Error> {
    return this._catalog.remove(id, opts).pipe(this._withRuntime);
  }

  disable(id: string, opts?: { cascade?: boolean }): Effect.Effect<boolean, Error> {
    return this._catalog.disable(id, opts);
  }

  //
  // Lifecycle — delegated to the scheduler; `shutdown` is composition-wide and stays here.
  //

  start(): Effect.Effect<boolean, Error> {
    return this._scheduler.start().pipe(this._withRuntime);
  }

  activate(
    event: ActivationEvent.ActivationEvent | string,
    params?: { before?: string; after?: string },
  ): Effect.Effect<boolean, Error> {
    return this._scheduler.activate(event, params).pipe(this._withRuntime);
  }

  deactivate(id: string): Effect.Effect<boolean, Error> {
    return this._scheduler.deactivatePlugin(id);
  }

  reset(event: ActivationEvent.ActivationEvent | string): Effect.Effect<boolean, Error> {
    return this._scheduler.resetEvent(event).pipe(this._withRuntime);
  }

  shutdown(): Effect.Effect<boolean, Error> {
    return this._shutdownSemaphore.withPermits(1)(
      Effect.gen(this, function* () {
        yield* Ref.set(this._state.shuttingDown, true);
        log('shutdown');

        if (this._supervisor !== undefined) {
          yield* Fiber.interrupt(this._supervisor);
          this._supervisor = undefined;
        }
        yield* this._state.fibers.interruptAll();

        const activeIds = [...this._state.getActiveIds()].reverse();
        const allModules = this._state.getModules();
        const modulesToDeactivate = activeIds
          .map((id) => allModules.find((module) => module.id === id))
          .filter((module): module is Plugin.PluginModule => module != null);

        for (const module of modulesToDeactivate) {
          yield* this._loader.deactivate(module);
        }

        this._state.clearEventsFired();
        this._state.clearAllPendingReset();
        yield* this._loader.clear();
        yield* this._scheduler.clearClaims();
        yield* Ref.set(this._state.started, false);
        this._state.reactivateOnNextPass.clear();
        this._state.structurallyFailed.clear();

        log('shutdown complete');
        return true;
      }).pipe(Effect.ensuring(Ref.set(this._state.shuttingDown, false))),
    );
  }
}

/**
 * Creates a new Plugin Manager instance.
 */
export const make = (options: ManagerOptions): PluginManager => new ManagerImpl(options);
