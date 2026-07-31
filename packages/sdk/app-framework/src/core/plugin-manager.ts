//
// Copyright 2025 DXOS.org
//

//
// The manager composes three collaborating units behind one public API, plus the lifecycle
// and state it owns itself (atoms, failure records, in-flight fibers, shutdown):
//
// 1. The plugin catalog (`plugin-catalog.ts`) — add/remove/enable/disable, lazy plugin
//    resolution, dev-plugin shadowing, and the declared-dependency closure
//    (`getDependencies`/`getDependents`).
//
// 2. The activation scheduler (`activation-scheduler.ts`) — deciding when each module's
//    `activate` runs. Its model:
//
//    - Dependency-mode modules activate in rounds. A round collects candidates, indexes
//      singleton providers (duplicates error out), selects what can run now (anything whose
//      provider is not in play waits for a later round), orders the selection so providers
//      run before consumers, and executes it in concurrent batches. The ordering logic and
//      its vocabulary (rounds, waves, edge kinds) live in `activation-graph.ts`. Rounds
//      repeat until one activates nothing new.
//
//    - Event-mode modules park until their `activatesOn` event fires, then activate
//      together. Inactive dependency-mode providers of their requires are pulled on
//      demand first.
//
// 3. The module loader (`module-loader.ts`) — the per-module load pipeline. Loads are
//    memoized (id -> Deferred): every activation path converges on `loader.load`, concurrent
//    paths await the same deferred, and contribution is idempotent per module.
//
//    - Rounds RUN CONCURRENTLY (e.g. the startup pass and an event fired mid-startup).
//      A provider mid-load in one round is invisible to another round's ordering, so the
//      loader waits for in-flight multi providers before a module's activate runs — the
//      cross-round complement to the ordering within a round.
//
//    - Failures are STRUCTURAL, not fatal: missing/duplicate providers and cycles put the
//      owning plugin into an error state (`failed` atom) and exclude its modules; everything
//      independent proceeds. Per-module failures skip transitive dependents only.
//

import { Atom, Registry } from '@effect-atom/atom';
import * as Array from 'effect/Array';
import * as Deferred from 'effect/Deferred';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as PubSub from 'effect/PubSub';
import * as Ref from 'effect/Ref';

import { EffectEx, Performance } from '@dxos/effect';
import { log } from '@dxos/log';

import * as ActivationEvent from './activation-event';
import { ActivationScheduler } from './activation-scheduler';
import * as CapabilityManager from './capability-manager';
import {
  type ActivationMessage,
  DEFAULT_ACTIVATION_TIMEOUT,
  DEFAULT_LOAD_TIMEOUT,
  type PluginFailure,
  type PluginFailurePhase,
  type PluginFailureReason,
  PluginInitializationError,
  PluginTimeoutError,
} from './manager-types';
import { ModuleLoader, together } from './module-loader';
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
  readonly activation = Effect.runSync(PubSub.unbounded<ActivationMessage>());
  readonly capabilities: CapabilityManager.CapabilityManager;
  readonly registry: Registry.Registry;
  readonly pluginRegistry: PluginRegistry.Manager;

  private readonly _pluginsAtom: Atom.Writable<Plugin.Plugin[]>;
  private readonly _coreAtom: Atom.Writable<string[]>;
  private readonly _enabledAtom: Atom.Writable<string[]>;
  private readonly _modulesAtom: Atom.Writable<Plugin.PluginModule[]>;
  private readonly _activeAtom: Atom.Writable<string[]>;
  private readonly _eventsFiredAtom: Atom.Writable<string[]>;
  private readonly _pendingResetAtom: Atom.Writable<string[]>;
  private readonly _failedAtom: Atom.Writable<PluginFailure[]>;
  private readonly _pluginLoader: ManagerOptions['pluginLoader'];
  private readonly _onRemove: ManagerOptions['onRemove'];
  private readonly _loadTimeout: Duration.DurationInput;
  private readonly _activationTimeout: Duration.DurationInput;
  private readonly _loader: ModuleLoader;
  private readonly _scheduler: ActivationScheduler;
  private readonly _catalog: PluginCatalog;
  private readonly _devPluginIdsAtom: Atom.Writable<string[]>;
  // Set by `start()`; gates the incremental dependency pass on later `enable()` calls.
  private readonly _started = Effect.runSync(Ref.make(false));
  // Modules deactivated because a singleton capability they require lost its provider
  // (provider plugin disabled). Re-included as candidates in the next dependency pass.
  private readonly _pendingReactivate = new Set<string>();
  // Modules in a structural error state (cycle member, duplicate provider, impossible
  // require): excluded from activation rounds until a plugin-set change re-evaluates them.
  private readonly _structurallyFailed = new Set<string>();
  private readonly _inFlightFibers = Effect.runSync(Ref.make<Array<Fiber.Fiber<unknown, unknown>>>([]));
  private readonly _shutdownSemaphore = Effect.runSync(Effect.makeSemaphore(1));
  private readonly _shuttingDown = Effect.runSync(Ref.make(false));
  // Tracks the constructor-launched core/enabled `enable()` calls so that
  // `activate` can wait for module registration before dispatching events.
  // Lazy plugins make `enable` asynchronous (a dynamic `import()` happens
  // inside it), so without this synchronization an `activate` triggered
  // immediately after `make` could fire on an empty module set. Failures
  // are wrapped in `PluginInitializationError` so awaiters get a tagged
  // error rather than the wide `Error` produced by the underlying chain.
  private readonly _initialization = Effect.runSync(Deferred.make<void, PluginInitializationError>());

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

    this._pluginLoader = pluginLoader;
    this._onRemove = onRemove;
    this._loadTimeout = loadTimeout;
    this._activationTimeout = activationTimeout;
    this._loader = new ModuleLoader({
      capabilities: this.capabilities,
      pluginService: () => this,
      getModules: () => this._get(this._modulesAtom),
      getPluginIdForModule: (moduleId) => this._getPluginIdForModule(moduleId),
      onActivationFailure: (pluginId, error) => {
        this._recordFailure(pluginId, 'activation', error);
        this._scheduleAutoDisable(pluginId);
      },
      publish: (message) => PubSub.publish(this.activation, message).pipe(Effect.asVoid),
      setActive: (moduleId, active) =>
        this._update(this._activeAtom, (ids) => (active ? [...ids, moduleId] : ids.filter((id) => id !== moduleId))),
      activationTimeout,
      trackFiber: (fiber) => this._trackFiber(this._inFlightFibers, fiber),
      untrackFiber: (fiber) => this._untrackFiber(this._inFlightFibers, fiber),
    });
    this._scheduler = new ActivationScheduler({
      capabilities: this.capabilities,
      loader: this._loader,
      publish: (message) => PubSub.publish(this.activation, message).pipe(Effect.asVoid),
      getActive: () => this._get(this._activeAtom),
      getModules: () => this._get(this._modulesAtom),
      getInactiveModulesByEvent: (key) => this._getInactiveModulesByEvent(key),
      eventsFired: {
        has: (key) => this._get(this._eventsFiredAtom).includes(key),
        markFired: (key) => {
          if (!this._get(this._eventsFiredAtom).includes(key)) {
            this._update(this._eventsFiredAtom, (events) => [...events, key]);
          }
        },
      },
      isStarted: () => Ref.get(this._started),
      clearPendingReset: (key) => this._clearPendingReset(key),
      pendingReactivate: this._pendingReactivate,
      structurallyFailed: this._structurallyFailed,
      getPluginIdForModule: (moduleId) => this._getPluginIdForModule(moduleId),
      recordFailure: (pluginId, error) => this._recordFailure(pluginId, 'activation', error),
      trackFiber: (fiber) => this._trackFiber(this._inFlightFibers, fiber),
      untrackFiber: (fiber) => this._untrackFiber(this._inFlightFibers, fiber),
    });
    this._catalog = new PluginCatalog({
      pluginLoader: this._pluginLoader,
      loadTimeout: this._loadTimeout,
      getPlugins: () => this._get(this._pluginsAtom),
      updatePlugins: (fn) => this._update(this._pluginsAtom, fn),
      getCore: () => this._get(this._coreAtom),
      getEnabled: () => this._get(this._enabledAtom),
      updateEnabled: (fn) => this._update(this._enabledAtom, fn),
      updateDevPluginIds: (fn) => this._update(this._devPluginIdsAtom, fn),
      getCatalogEntries: () => this._get(this.pluginRegistry.plugins).entries,
      registerPlugin: (plugin) => this._addPlugin(plugin),
      unregisterPlugin: (id) => this._removePlugin(id),
      addModule: (module) => this._addModule(module),
      removeModule: (moduleId) => this._removeModule(moduleId),
      setPendingResetByModule: (module) => this._setPendingResetByModule(module),
      getPendingReset: () => this.getPendingReset(),
      activate: (event) => this.activate(event),
      deactivate: (id) => this.deactivate(id),
      isStarted: () => Ref.get(this._started),
      runDependencyPass: (options) => this._scheduler.runDependencyPass(options),
      recordFailure: (id, phase, error) => this._recordFailure(id, phase, error),
      clearFailure: (id) => this.clearFailure(id),
      scheduleAutoDisable: (id) => this._scheduleAutoDisable(id),
      structurallyFailed: this._structurallyFailed,
      publish: (message) => PubSub.publish(this.activation, message).pipe(Effect.asVoid),
      runForked: (effect) => this._runForkedFiber(effect),
      onRemove: this._onRemove,
    });
    this._pluginsAtom = Atom.make(plugins).pipe(Atom.keepAlive);
    this._coreAtom = Atom.make(core).pipe(Atom.keepAlive);
    this._enabledAtom = Atom.make(enabled).pipe(Atom.keepAlive);
    this._modulesAtom = Atom.make<Plugin.PluginModule[]>([]).pipe(Atom.keepAlive);
    this._activeAtom = Atom.make<string[]>([]).pipe(Atom.keepAlive);
    this._eventsFiredAtom = Atom.make<string[]>([]).pipe(Atom.keepAlive);
    this._pendingResetAtom = Atom.make<string[]>([]).pipe(Atom.keepAlive);
    this._failedAtom = Atom.make<PluginFailure[]>([]).pipe(Atom.keepAlive);
    this._devPluginIdsAtom = Atom.make<string[]>([]).pipe(Atom.keepAlive);
    plugins.forEach((plugin) => this._addPlugin(plugin));
    // Dedupe before mapping to `enable` — `core` and `enabled` may overlap (an
    // app-supplied plugin can be in both), and concurrent `enable(id)` calls
    // for the same id are not idempotent (each would re-run the lazy resolve
    // and double-register modules). `new Set([...])` preserves first-seen
    // order which matches the natural core-before-enabled precedence.
    const initialIds = [...new Set([...core, ...enabled])];
    void Effect.all(initialIds.map((id) => this.enable(id)))
      .pipe(
        Effect.mapError((cause) => new PluginInitializationError({ cause })),
        Effect.tap(() => Deferred.succeed(this._initialization, undefined)),
        Effect.tapErrorCause((cause) => Deferred.failCause(this._initialization, cause)),
      )
      .pipe(EffectEx.runAndForwardErrors);
  }

  get plugins(): Atom.Atom<readonly Plugin.Plugin[]> {
    return this._pluginsAtom;
  }

  get core(): Atom.Atom<readonly string[]> {
    return this._coreAtom;
  }

  /**
   * Ids of plugins that are currently enabled.
   */
  get enabled(): Atom.Atom<readonly string[]> {
    return this._enabledAtom;
  }

  /**
   * Modules of plugins which are currently enabled.
   */
  get modules(): Atom.Atom<readonly Plugin.PluginModule[]> {
    return this._modulesAtom;
  }

  /**
   * Ids of modules which are currently active.
   */
  get active(): Atom.Atom<readonly string[]> {
    return this._activeAtom;
  }

  /**
   * Ids of events which have been fired.
   */
  get eventsFired(): Atom.Atom<readonly string[]> {
    return this._eventsFiredAtom;
  }

  /**
   * Ids of modules which are pending reset.
   */
  get pendingReset(): Atom.Atom<readonly string[]> {
    return this._pendingResetAtom;
  }

  /**
   * Plugins that failed to load or activate.
   */
  get failed(): Atom.Atom<readonly PluginFailure[]> {
    return this._failedAtom;
  }

  /**
   * Ids of currently-registered plugins that came from a dev source.
   */
  get devPluginIds(): Atom.Atom<readonly string[]> {
    return this._devPluginIdsAtom;
  }

  getPlugins(): readonly Plugin.Plugin[] {
    return this._get(this._pluginsAtom);
  }

  getCore(): readonly string[] {
    return this._get(this._coreAtom);
  }

  getEnabled(): readonly string[] {
    return this._get(this._enabledAtom);
  }

  getModules(): readonly Plugin.PluginModule[] {
    return this._get(this._modulesAtom);
  }

  getActive(): readonly string[] {
    return this._get(this._activeAtom);
  }

  getEventsFired(): readonly string[] {
    return this._get(this._eventsFiredAtom);
  }

  getPendingReset(): readonly string[] {
    return this._get(this._pendingResetAtom);
  }

  getFailed(): readonly PluginFailure[] {
    return this._get(this._failedAtom);
  }

  getDevPluginIds(): readonly string[] {
    return this._get(this._devPluginIdsAtom);
  }

  clearFailure(id: string): boolean {
    const current = this._get(this._failedAtom);
    if (!current.some((failure) => failure.id === id)) {
      return false;
    }
    this._set(
      this._failedAtom,
      current.filter((failure) => failure.id !== id),
    );
    return true;
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
    return this._catalog.enable(id, opts);
  }

  remove(id: string, opts?: { cascade?: boolean }): Effect.Effect<boolean, Error> {
    return this._catalog.remove(id, opts);
  }

  disable(id: string, opts?: { cascade?: boolean }): Effect.Effect<boolean, Error> {
    return this._catalog.disable(id, opts);
  }

  //
  // Lifecycle — start / activate / deactivate / reset / shutdown.
  //

  start(): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      if (yield* this._isShuttingDown()) {
        log('skipping start during shutdown');
        return false;
      }

      // Wait for the constructor's core/enabled `enable()` chain to finish registering
      // modules (see the note in `activate`).
      yield* Deferred.await(this._initialization);
      yield* Ref.set(this._started, true);

      const key = ActivationEvent.eventKey(ActivationEvent.Startup);

      // A capability cycle spanning event boundaries would leave both chains pending
      // forever. Surface the lock (error state on the involved plugins) and continue —
      // the cycle members simply never activate; everything else proceeds.
      yield* this._scheduler.reportGlobalCycle();

      // The dependency pass and the event-mode pass (for any module explicitly targeting
      // Startup) run concurrently — both observe each other through the shared capability
      // manager, and sequencing them would delay whichever pass runs second.
      const results = yield* Effect.withFiberRuntime<[boolean, boolean], Error>((fiber) =>
        Effect.all(
          [
            // Graph-level failures (missing provider, duplicate provider, cycle) fail the
            // start call; publish them so boot UIs surface the root cause instead of a
            // silent hang behind their own watchdog.
            this._scheduler.runDependencyPass().pipe(
              Effect.tapError((error) =>
                Effect.gen(this, function* () {
                  log.error('dependency activation failed', { error: String(error) });
                  yield* PubSub.publish(this.activation, { event: key, state: 'error', error });
                }),
              ),
            ),
            this._scheduler.activateEvent(key, undefined, fiber, { suppressEventMessage: true }),
          ],
          { concurrency: 'unbounded' },
        ),
      );

      // The event-level Startup `activated` message (no `module` field) is the app-ready
      // signal (see useApp); it must not publish before dependency-mode modules finish.
      if (!this._get(this._eventsFiredAtom).includes(key)) {
        this._update(this._eventsFiredAtom, (events) => [...events, key]);
      }
      yield* PubSub.publish(this.activation, { event: key, state: 'activated' });

      return results.some(Boolean);
    });
  }

  /**
   * Activates plugins based on the activation event.
   * @param event The activation event.
   * @returns Whether the activation was successful.
   */
  activate(
    event: ActivationEvent.ActivationEvent | string,
    params?: { before?: string; after?: string },
  ): Effect.Effect<boolean, Error> {
    const key = typeof event === 'string' ? event : ActivationEvent.eventKey(event);
    return Effect.gen(this, function* () {
      // Startup is no longer a plain event: it triggers the dependency pass alongside the
      // event-mode pass. Delegating keeps useApp/harness/cli call sites unchanged.
      if (key === ActivationEvent.eventKey(ActivationEvent.Startup)) {
        return yield* this.start();
      }

      if (yield* this._isShuttingDown()) {
        log('skipping activation during shutdown', { key, ...params });
        return false;
      }

      // Wait for the constructor's core/enabled `enable()` chain — including
      // any async dynamic imports for lazy plugins — to finish registering
      // modules. Without this, dispatching to an empty module set is the
      // observable symptom of the race.
      yield* Deferred.await(this._initialization);

      return yield* Effect.withFiberRuntime<boolean, Error>((fiber) =>
        this._scheduler.activateEvent(key, params, fiber).pipe(
          together(
            Effect.sleep(Duration.seconds(15)).pipe(
              Effect.andThen(Effect.sync(() => log.warn('event activation is taking a long time', { event: key }))),
            ),
          ),
          Performance.addTrackEntry({
            name: typeof event === 'string' ? event : ActivationEvent.eventKey(event),
            devtools: {
              dataType: 'track-entry',
              track: 'Event Activation',
              trackGroup: 'Composer',
              color: 'primary',
            },
          }),
        ),
      );
    });
  }

  /**
   * Deactivates all of the modules for a plugin.
   * @param id The id of the plugin.
   * @returns Whether the deactivation was successful.
   */
  deactivate(id: string): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      const plugin = this._getPlugin(id);
      if (!plugin) {
        return false;
      }

      const modules = plugin.modules;

      // Deactivate active modules elsewhere that require a singleton capability provided by
      // this plugin first (reverse activation order = reverse topological order), and mark
      // them for reactivation when a provider returns.
      const dependents = this._collectCapabilityDependents(modules);
      for (const dependent of dependents) {
        yield* this._loader.deactivate(dependent);
        this._pendingReactivate.add(dependent.id);
      }

      const results = yield* Effect.all(
        modules.map((module) => this._loader.deactivate(module)),
        { concurrency: 'unbounded' },
      );
      return results.every((result) => result);
    });
  }

  /**
   * Collects active modules (outside the given set) whose declared requires include a
   * singleton capability provided by the given modules, transitively. Returned in reverse
   * activation order, which is reverse topological order (safe deactivation order).
   */
  private _collectCapabilityDependents(modules: readonly Plugin.PluginModule[]): Plugin.PluginModule[] {
    const active = this._get(this._activeAtom);
    const allModules = this._get(this._modulesAtom);
    const ownIds = new Set(modules.map((module) => module.id));
    const providedIds = new Set<string>();
    const collectProvides = (module: Plugin.PluginModule) => {
      for (const capability of module.activation.provides) {
        if (capability.arity === 'single') {
          providedIds.add(capability.identifier);
        }
      }
    };
    modules.filter((module) => active.includes(module.id)).forEach(collectProvides);

    const dependents = new Map<string, Plugin.PluginModule>();
    let changed = providedIds.size > 0;
    while (changed) {
      changed = false;
      for (const module of allModules) {
        if (ownIds.has(module.id) || dependents.has(module.id) || !active.includes(module.id)) {
          continue;
        }
        if (module.activation.requires.some((capability) => providedIds.has(capability.identifier))) {
          dependents.set(module.id, module);
          collectProvides(module);
          changed = true;
        }
      }
    }

    const order = this._get(this._activeAtom);
    return [...dependents.values()].sort((a, b) => order.indexOf(b.id) - order.indexOf(a.id));
  }

  /**
   * Re-activates the modules that were activated by the event.
   * @param event The activation event.
   * @returns Whether the reset was successful.
   */
  reset(event: ActivationEvent.ActivationEvent | string): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      const key = typeof event === 'string' ? event : ActivationEvent.eventKey(event);
      log('reset', { key });
      const modules = this._getActiveModulesByEvent(key);
      const results = yield* Effect.all(
        modules.map((module) => this._loader.deactivate(module)),
        { concurrency: 'unbounded' },
      );

      if (results.every((result) => result)) {
        return yield* this.activate(key);
      } else {
        return false;
      }
    });
  }

  shutdown(): Effect.Effect<boolean, Error> {
    return this._shutdownSemaphore.withPermits(1)(
      Effect.gen(this, function* () {
        yield* Ref.set(this._shuttingDown, true);
        log('shutdown');

        yield* this._interruptInFlightActivations();

        const activeIds = [...this._get(this._activeAtom)].reverse();
        const allModules = this._get(this._modulesAtom);
        const modulesToDeactivate = activeIds
          .map((id) => allModules.find((module) => module.id === id))
          .filter((module): module is Plugin.PluginModule => module != null);

        for (const module of modulesToDeactivate) {
          yield* this._loader.deactivate(module);
        }

        this._set(this._eventsFiredAtom, []);
        this._set(this._pendingResetAtom, []);
        yield* this._loader.clear();
        yield* this._scheduler.reset();
        yield* Ref.set(this._started, false);
        this._pendingReactivate.clear();
        this._structurallyFailed.clear();

        log('shutdown complete');
        return true;
      }).pipe(Effect.ensuring(Ref.set(this._shuttingDown, false))),
    );
  }

  //
  // State helpers
  //

  //
  // State helpers and bookkeeping.
  //

  private _get<T>(atom: Atom.Atom<T>): T {
    return this.registry.get(atom);
  }

  private _set<T>(atom: Atom.Writable<T>, value: T): void {
    this.registry.set(atom, value);
  }

  private _update<T>(atom: Atom.Writable<T>, updater: (current: T) => T): void {
    this._set(atom, updater(this._get(atom)));
  }

  private _isShuttingDown(): Effect.Effect<boolean> {
    return Ref.get(this._shuttingDown);
  }

  private _getPlugin(id: string): Plugin.Plugin | undefined {
    return this._get(this._pluginsAtom).find((plugin) => plugin.meta.profile.key === id);
  }

  private _getPluginIdForModule(moduleId: string): string | undefined {
    return this._get(this._pluginsAtom).find((plugin) => plugin.modules.some((module) => module.id === moduleId))?.meta
      .profile.key;
  }

  /**
   * Records a failure for a plugin. Latest failure wins so the registry UI
   * always sees the most recent reason. Walks the `cause` chain when checking
   * for timeouts: lazy-load timeouts arrive wrapped in `LazyPluginError` (the
   * timeout is the cause), but the operator-visible reason should still be
   * `'timeout'`.
   */
  private _recordFailure(id: string, phase: PluginFailurePhase, error: Error): void {
    const reason: PluginFailureReason = isTimeoutCause(error) ? 'timeout' : 'error';
    const failure: PluginFailure = { id, phase, reason, error, timestamp: Date.now() };
    log.warn('plugin failed to activate', { id, phase, reason, error: error.message });
    this._update(this._failedAtom, (current) => [...current.filter((entry) => entry.id !== id), failure]);
  }

  /**
   * Fire-and-forget disable of a failed plugin. Forked because a failure can
   * happen mid-activation chain — yielding a `disable` inline would deadlock
   * on the shared semaphores. Core plugins are skipped (the host opted into
   * them being non-removable; the failure record is enough signal).
   */
  private _scheduleAutoDisable(id: string): void {
    if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
      // Transient HMR failures must not persist; skip auto-disable in dev server.
      return;
    }
    if (this._get(this._coreAtom).includes(id)) {
      return;
    }
    if (!this._get(this._enabledAtom).includes(id)) {
      return;
    }
    this._runForkedFiber(
      this.disable(id).pipe(
        Effect.tap(() => Effect.sync(() => log.error('plugin auto-disabled', { id }))),
        Effect.tapError((error) => Effect.sync(() => log.warn('auto-disable failed', { id, error }))),
        Effect.ignore,
      ),
    );
  }

  private _getActiveModules(): Plugin.PluginModule[] {
    const active = this._get(this._activeAtom);
    return this._get(this._modulesAtom).filter((module) => active.includes(module.id));
  }

  private _getInactiveModules(): Plugin.PluginModule[] {
    const active = this._get(this._activeAtom);
    return this._get(this._modulesAtom).filter((module) => !active.includes(module.id));
  }

  private _getActiveModulesByEvent(key: string): Plugin.PluginModule[] {
    return this._getActiveModules().filter(
      (module) =>
        module.activation.mode !== 'dependency' &&
        ActivationEvent.getEvents(module.activation.activatesOn).map(ActivationEvent.eventKey).includes(key),
    );
  }

  private _getInactiveModulesByEvent(key: string): Plugin.PluginModule[] {
    return this._getInactiveModules().filter(
      (module) =>
        module.activation.mode !== 'dependency' &&
        ActivationEvent.getEvents(module.activation.activatesOn).map(ActivationEvent.eventKey).includes(key),
    );
  }

  private _setPendingResetByModule(module: Plugin.PluginModule): void {
    // Dependency-mode modules do not participate in event-keyed resets.
    if (module.activation.mode === 'dependency') {
      return;
    }

    const activationEvents = ActivationEvent.getEvents(module.activation.activatesOn)
      .map(ActivationEvent.eventKey)
      .filter((key) => this._get(this._eventsFiredAtom).includes(key));

    const pendingReset = Array.fromIterable(new Set(activationEvents)).filter((event) => {
      const pending = this._get(this._pendingResetAtom);
      return !pending.includes(event);
    });
    if (pendingReset.length > 0) {
      log('pending reset', { events: pendingReset });
      this._update(this._pendingResetAtom, (current) => [...current, ...pendingReset]);
    }
  }

  private _clearPendingReset(key: string): void {
    const pendingIndex = this._get(this._pendingResetAtom).findIndex((event) => event === key);
    if (pendingIndex !== -1) {
      this._update(this._pendingResetAtom, (pending) => pending.filter((event) => event !== key));
    }
  }

  //
  // Fiber helpers
  //

  private _interruptInFlightActivations(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const inFlightFibers = yield* Ref.get(this._inFlightFibers);
      yield* Effect.forEach(inFlightFibers, (fiber) => Fiber.interrupt(fiber), {
        concurrency: 'unbounded',
      });
    });
  }

  private _trackFiber(
    ref: Ref.Ref<Array<Fiber.Fiber<unknown, unknown>>>,
    fiber: Fiber.Fiber<unknown, unknown>,
  ): Effect.Effect<void> {
    return Ref.update(ref, (fibers) => [...fibers, fiber]);
  }

  private _untrackFiber(
    ref: Ref.Ref<Array<Fiber.Fiber<unknown, unknown>>>,
    fiber: Fiber.Fiber<unknown, unknown>,
  ): Effect.Effect<void> {
    return Ref.update(ref, (fibers) => fibers.filter((trackedFiber) => trackedFiber !== fiber));
  }

  /**
   * Spawns an effect on the default runtime and registers the resulting fiber in
   * `_inFlightFibers` so {@link shutdown} can interrupt it. Used from sync entry
   * points like {@link remove} where there is no enclosing Effect to fork from;
   * inside an Effect chain prefer the existing track/await/untrack pattern.
   */
  private _runForkedFiber<E>(effect: Effect.Effect<void, E>): void {
    const fiber = Effect.runFork(effect);
    Effect.runSync(this._trackFiber(this._inFlightFibers, fiber));
    Effect.runFork(Fiber.await(fiber).pipe(Effect.andThen(() => this._untrackFiber(this._inFlightFibers, fiber))));
  }

  //
  // Registration helpers
  //

  private _addPlugin(plugin: Plugin.Plugin): void {
    log('add plugin', { id: plugin.meta.profile.key });
    // TODO(wittjosiah): Find a way to add a warning for duplicate plugins that doesn't cause log spam.
    this._update(this._pluginsAtom, (plugins) => (plugins.includes(plugin) ? plugins : [...plugins, plugin]));
  }

  private _removePlugin(id: string): void {
    log('remove plugin', { id });
    this._update(this._pluginsAtom, (plugins) => plugins.filter((plugin) => plugin.meta.profile.key !== id));
  }

  private _addModule(module: Plugin.PluginModule): void {
    log('add module', { id: module.id });
    // TODO(wittjosiah): Find a way to add a warning for duplicate modules that doesn't cause log spam.
    this._update(this._modulesAtom, (modules) => (modules.includes(module) ? modules : [...modules, module]));
  }

  private _removeModule(id: string): void {
    log('remove module', { id });
    this._update(this._modulesAtom, (modules) => modules.filter((module) => module.id !== id));
  }

  //
  // Activation scheduling is delegated to the ActivationScheduler (`activation-scheduler.ts`).
  //

  //
  // Module lifecycle helpers
  //

  //
  // Module load pipeline — memoized load, validation, contribution, deactivation.
  //

  // `parentEvent` is the activation event that first triggered this module
  // load — included in `activating`/`activated` PubSub messages so subscribers
  // (e.g. the boot loader's status listener) can associate a module with its
  // triggering event in the trace. The same module may be referenced by
  // multiple events, but module loads are memoized via `_moduleMemoMap`, so
  // only the first event to need it will appear here; later events await the
  // cached deferred without re-publishing.
}

/**
 * Creates a new Plugin Manager instance.
 */
export const make = (options: ManagerOptions): PluginManager => new ManagerImpl(options);

/**
 * True when `error` (or anything along its `cause` chain) is a
 * {@link PluginTimeoutError}. Lazy-load timeouts wrap the timeout inside
 * `LazyPluginError`, so a shallow check on the outer error misses them.
 * Bounded depth so a circular chain can't loop forever.
 */
const isTimeoutCause = (error: unknown, depth = 0): boolean => {
  if (depth > 5 || !(error instanceof Error)) {
    return false;
  }
  if (PluginTimeoutError.is(error)) {
    return true;
  }
  return isTimeoutCause((error as Error & { cause?: unknown }).cause, depth + 1);
};
