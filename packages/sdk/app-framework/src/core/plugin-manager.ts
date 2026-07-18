//
// Copyright 2025 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Deferred from 'effect/Deferred';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as PubSub from 'effect/PubSub';
import * as Ref from 'effect/Ref';
import * as Scope from 'effect/Scope';

import { EffectEx, Performance } from '@dxos/effect';
import { BaseError } from '@dxos/errors';
import { log } from '@dxos/log';

import * as ActivationEvent from './activation-event';
import * as Capability from './capability';
import * as CapabilityManager from './capability-manager';
import {
  CapabilityNotFoundError,
  DependencyCycleError,
  DuplicateProviderError,
  MissingProviderError,
  ProvidesMismatchError,
} from './errors';
import * as Plugin from './plugin';
// Imported with a `PluginRegistry` alias because the unrelated `@effect-atom/atom-react`
// `Registry` is already imported above; from outside this file the namespace is
// re-exported as `Registry` via `./index.ts`.
import * as PluginRegistry from './registry';

/**
 * Tagged error for failures during the constructor-launched core/enabled
 * `enable()` chain. Surfaces via {@link PluginManager.activate}'s wait on
 * `_initialization` so a caller blocked on initialization gets a typed
 * failure (with the original error preserved as `cause`) instead of an
 * untyped `Error`.
 */
export class PluginInitializationError extends BaseError.extend(
  'PluginInitializationError',
  'Plugin manager initialization failed',
) {}

/**
 * Tagged error raised when a plugin exceeds its configured load or activation
 * timeout. The plugin manager records the failure on the `failed` atom and
 * auto-disables the plugin so that one stuck remote does not stall app boot.
 * `context.id` is the plugin id, `context.phase` is `'load'` or `'activation'`.
 */
export class PluginTimeoutError extends BaseError.extend('PluginTimeoutError', 'Plugin operation timed out') {}

/** Phase of the plugin lifecycle in which the failure was observed. */
export type PluginFailurePhase = 'load' | 'activation';

/** Why the plugin entered a failed state. */
export type PluginFailureReason = 'timeout' | 'error';

/**
 * Record of a plugin that failed to load or activate. Surfaced via the
 * {@link PluginManager.failed} atom so registry / UI consumers can flag
 * unhealthy plugins (e.g. a remote host that has gone offline) rather than
 * leaving the app in a half-broken state.
 */
export type PluginFailure = {
  readonly id: string;
  readonly phase: PluginFailurePhase;
  readonly reason: PluginFailureReason;
  readonly error: Error;
  /** `Date.now()` when the failure was recorded. */
  readonly timestamp: number;
};

/** Default deadline for resolving a lazy plugin's dynamic import. */
const DEFAULT_LOAD_TIMEOUT = Duration.seconds(30);

/** Default deadline for a single module's `activate()` body. */
const DEFAULT_ACTIVATION_TIMEOUT = Duration.seconds(30);

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

export type ActivationMessage = {
  event: string;
  state: 'activating' | 'activated' | 'error';
  /** Module ID when the message pertains to a specific module activation. */
  module?: string;
  error?: Error;
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
  private readonly _capabilities = new Map<string, Capability.Any[]>();
  private readonly _moduleScopes = new Map<string, Scope.CloseableScope>();
  private readonly _moduleMemoMap = new Map<Plugin.PluginModule['id'], Deferred.Deferred<Capability.Any[], Error>>();
  private readonly _moduleSemaphores = new Map<Plugin.PluginModule['id'], Effect.Semaphore>();
  // Coalesces concurrent `_resolveLazyPlugin` calls per plugin id. Without
  // this, two callers entering `enable(id)` before the swap completes would
  // each invoke `mod.default(options)` and produce distinct module objects,
  // defeating `_addModule`'s reference-equality dedupe and racing the
  // `_pluginsAtom` swap.
  private readonly _resolvingPlugins = new Map<string, Deferred.Deferred<Plugin.Plugin, Plugin.LazyPluginError>>();
  // Tracks dev-source plugins (loaded via a Vite dev server) keyed by id.
  // When `shadow` is present, the entry has displaced an existing plugin —
  // `remove` reinstates it and re-enables iff `wasEnabled`. Entries without a
  // shadow are dev plugins with no underlying registry/builtin to restore.
  // The atom mirrors the map's keys for UI subscribers (they don't need the
  // shadow internals); the two stay in sync via {@link _markDev}/{@link _unmarkDev}.
  private readonly _devPlugins = new Map<string, { shadow?: { plugin: Plugin.Plugin; wasEnabled: boolean } }>();
  private readonly _devPluginIdsAtom: Atom.Writable<string[]>;
  private readonly _activatingEvents = Effect.runSync(Ref.make<string[]>([]));
  private readonly _activatingModules = Effect.runSync(Ref.make<string[]>([]));
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

  /**
   * Marks `id` as dev-sourced. If the plugin displaced an existing one, pass
   * the shadow snapshot so `remove` can restore it. Repeat calls (e.g. a dev
   * plugin reload) preserve the original shadow target — restoration always
   * unwinds back to the real underlying plugin, never an intermediate dev build.
   */
  private _markDev(id: string, shadow?: { plugin: Plugin.Plugin; wasEnabled: boolean }): void {
    if (this._devPlugins.has(id)) {
      return;
    }
    this._devPlugins.set(id, { shadow });
    this._update(this._devPluginIdsAtom, (ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  /** Drops the dev-plugin entry and returns its shadow data (if any) for restoration. */
  private _unmarkDev(id: string): { plugin: Plugin.Plugin; wasEnabled: boolean } | undefined {
    const entry = this._devPlugins.get(id);
    this._devPlugins.delete(id);
    this._update(this._devPluginIdsAtom, (ids) => ids.filter((existing) => existing !== id));
    return entry?.shadow;
  }

  getDependencies(id: string, opts?: { transitive?: boolean }): readonly string[] {
    const transitive = opts?.transitive !== false;
    if (!transitive) {
      return this._directDependencies(id);
    }
    const walk = this._computeDependencyClosure(id);
    // Drop the target itself; callers asked for its dependencies, not the
    // closure including the root.
    return walk.order.filter((depId) => depId !== id);
  }

  getDependents(id: string, opts?: { transitive?: boolean; enabledOnly?: boolean }): readonly string[] {
    return this._collectDependents(id, {
      transitive: opts?.transitive !== false,
      enabledOnly: opts?.enabledOnly === true,
    });
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

  /**
   * Adds a plugin to the manager via the plugin loader.
   * The plugin is registered but not enabled; call `enable` separately to activate it.
   * @param id The id of the plugin.
   */
  add(id: string): Effect.Effect<Plugin.Plugin, Error> {
    return Effect.gen(this, function* () {
      log('add plugin', { id });
      const { plugin, dev = false } = yield* this._pluginLoader(id);
      const pluginId = plugin.meta.profile.key;
      const existing = this._getPlugin(pluginId);

      if (dev && existing && existing !== plugin) {
        // Shadow path: a plugin with this id is already registered (a builtin,
        // a registry install, or a previous dev load). Disable it, stash it,
        // and swap the dev plugin into the same id slot. The dialog will call
        // `enable(pluginId)` next, which activates the dev plugin's modules.
        // `_markDev` is a no-op when the id is already tracked, so a dev-plugin
        // reload (after editing source) keeps the *original* shadow target —
        // removal restores the real underlying plugin, not an intermediate build.
        const wasEnabled = this._get(this._enabledAtom).includes(pluginId);
        if (wasEnabled) {
          yield* this.disable(pluginId);
        }
        this._markDev(pluginId, { plugin: existing, wasEnabled });
        this._update(this._pluginsAtom, (plugins) =>
          plugins.map((p) => (p.meta.profile.key === pluginId ? plugin : p)),
        );
      } else {
        this._addPlugin(plugin);
        if (dev) {
          this._markDev(pluginId);
        }
      }

      return plugin;
    });
  }

  /**
   * Enables a plugin.
   * @param id The id of the plugin.
   * @param opts See {@link PluginManager.enable}.
   */
  enable(id: string, opts?: { resolveDependencies?: boolean }): Effect.Effect<boolean, Error> {
    const resolveDependencies = opts?.resolveDependencies !== false;
    return Effect.gen(this, function* () {
      log('enable plugin', { id, resolveDependencies });

      if (!resolveDependencies) {
        return yield* this._enableOne(id);
      }

      // If the root id is unknown to both the registered set and the catalog,
      // fall back to the silent `_enableOne` path (which returns `false`).
      // This preserves the prior contract for persisted `enabled` entries
      // whose plugins are no longer bundled, instead of recording a confusing
      // "missing self-dependency" failure.
      if (!this._getPlugin(id) && !this._getCatalogEntry(id)) {
        return yield* this._enableOne(id);
      }

      // Compute the transitive closure across registered plugins and catalog
      // entries. Missing or cyclic entries are recorded as failures and the
      // target plugin is left disabled.
      const walk = this._computeDependencyClosure(id);
      if (walk.cycle) {
        this._recordFailure(
          id,
          'load',
          new Plugin.PluginDependencyError({ context: { id, reason: 'cycle', path: walk.cycle } }),
        );
        return false;
      }
      if (walk.missing.length > 0) {
        this._recordFailure(
          id,
          'load',
          new Plugin.PluginDependencyError({ context: { id, reason: 'missing', missing: walk.missing } }),
        );
        return false;
      }

      // Install any catalog-only entries before enabling them. `add` may also
      // discover further declared deps once the plugin's real meta is loaded;
      // we re-walk after each install to absorb those.
      let queue = walk.toInstall.slice();
      const installed = new Set<string>();
      while (queue.length > 0) {
        const next = queue.shift()!;
        if (installed.has(next) || this._getPlugin(next)) {
          continue;
        }
        const installResult = yield* this.add(next).pipe(Effect.either);
        if (installResult._tag === 'Left') {
          this._recordFailure(
            id,
            'load',
            new Plugin.PluginDependencyError({
              context: { id, reason: 'install-failed', dependency: next },
              cause: installResult.left,
            }),
          );
          return false;
        }
        installed.add(next);
        const rewalk = this._computeDependencyClosure(id);
        if (rewalk.cycle) {
          this._recordFailure(
            id,
            'load',
            new Plugin.PluginDependencyError({ context: { id, reason: 'cycle', path: rewalk.cycle } }),
          );
          return false;
        }
        if (rewalk.missing.length > 0) {
          this._recordFailure(
            id,
            'load',
            new Plugin.PluginDependencyError({ context: { id, reason: 'missing', missing: rewalk.missing } }),
          );
          return false;
        }
        queue = rewalk.toInstall.filter((depId) => !installed.has(depId));
      }

      // Enable in dependency-first order. `_enableOne` is idempotent on the
      // enabled atom so previously-enabled deps short-circuit.
      const order = this._computeDependencyClosure(id).order;
      let succeeded = false;
      for (const depId of order) {
        const ok = yield* this._enableOne(depId);
        if (depId === id) {
          succeeded = ok;
        }
      }
      return succeeded;
    });
  }

  /**
   * Enables a single plugin without consulting its declared dependencies.
   * Used by {@link enable} as the leaf step after closure resolution, and
   * directly when callers pass `{ resolveDependencies: false }`.
   *
   * The underlying operations (`_addModule`, `_setPendingResetByModule`,
   * `activate`) are all idempotent, so this method is safe to call multiple
   * times for the same id. The constructor's bootstrap path relies on this:
   * the persisted `enabled` ids are written into `_enabledAtom` up front, so
   * the very first `enable(id)` for those plugins sees `alreadyEnabled`-style
   * state but still needs to perform the module registration and activation.
   */
  private _enableOne(id: string): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      const stub = this._getPlugin(id);
      if (!stub) {
        return false;
      }

      // Clear any prior failure record so a retry starts from a clean slate.
      // The failure stays on the atom only if this attempt also fails. Structural
      // exclusions are re-evaluated too: a newly enabled plugin may resolve them.
      this.clearFailure(id);
      this._structurallyFailed.clear();

      const plugin = yield* this._resolveLazyPlugin(stub);

      this._update(this._enabledAtom, (enabled) => (enabled.includes(id) ? enabled : [...enabled, id]));

      plugin.modules.forEach((module) => {
        this._addModule(module);
        this._setPendingResetByModule(module);
      });

      log('pending reset', { events: [...this.getPendingReset()] });
      yield* Effect.all(
        this.getPendingReset().map((event) => this.activate(event)),
        { concurrency: 'unbounded' },
      );

      // After startup, newly enabled dependency-mode modules activate incrementally against
      // the already-contributed capability set. Failures are scoped to this plugin.
      if (yield* Ref.get(this._started)) {
        const result = yield* this._activateDependencyGraph({ candidateModules: [...plugin.modules] }).pipe(
          Effect.either,
        );
        if (result._tag === 'Left') {
          this._recordFailure(id, 'activation', result.left);
        }
      }

      return true;
    });
  }

  /**
   * Resolves a lazy plugin stub (returned by {@link Plugin.lazy}) to its
   * loaded form and swaps it into `_pluginsAtom`. Returns the input unchanged
   * when the plugin is already resolved, so callers can `yield*` this
   * unconditionally. The lazy stub carries `meta` synchronously but its
   * `modules` list is empty until the loader resolves; the swap ensures
   * subsequent enable/disable operations see the resolved plugin.
   *
   * Concurrent calls for the same id are coalesced via `_resolvingPlugins`:
   * the first caller starts the resolution, every subsequent caller awaits
   * the same `Deferred`. On failure we publish a `lazy:<id>` error message
   * and skip the atom swap so the failure is observable to the activation
   * subscriber and a retry can be attempted.
   */
  private _resolveLazyPlugin(plugin: Plugin.Plugin): Effect.Effect<Plugin.Plugin, Plugin.LazyPluginError> {
    return Effect.gen(this, function* () {
      if (!Plugin.isLazy(plugin)) {
        return plugin;
      }
      const id = plugin.meta.profile.key;

      const existing = this._resolvingPlugins.get(id);
      if (existing) {
        return yield* Deferred.await(existing);
      }
      const deferred = yield* Deferred.make<Plugin.Plugin, Plugin.LazyPluginError>();
      this._resolvingPlugins.set(id, deferred);

      return yield* Effect.gen(this, function* () {
        log('resolving lazy plugin', { id });
        yield* PubSub.publish(this.activation, { event: '', state: 'activating', module: `lazy:${id}` });
        const resolvedPlugin = yield* Plugin.resolveLazy(plugin).pipe(
          // Cap how long a remote import can hang. Without this the host can
          // sit on a pending dynamic `import()` indefinitely if the plugin's
          // server is unreachable, which stalls every caller awaiting
          // `enable(id)` and (transitively) the manager's initialization.
          Effect.timeoutFail({
            duration: this._loadTimeout,
            onTimeout: () =>
              new Plugin.LazyPluginError({
                context: { id, reason: 'load-failed' },
                cause: new PluginTimeoutError({ context: { id, phase: 'load' as PluginFailurePhase } }),
              }),
          }),
        );
        this._update(this._pluginsAtom, (plugins) =>
          plugins.map((p) => (p.meta.profile.key === id ? resolvedPlugin : p)),
        );
        yield* PubSub.publish(this.activation, { event: '', state: 'activated', module: `lazy:${id}` });
        return resolvedPlugin;
      }).pipe(
        Effect.tapError((error) =>
          Effect.gen(this, function* () {
            yield* PubSub.publish(this.activation, { event: '', state: 'error', module: `lazy:${id}`, error });
            this._recordFailure(id, 'load', error);
            this._scheduleAutoDisable(id);
          }),
        ),
        Effect.tap((value) => Deferred.succeed(deferred, value)),
        Effect.tapErrorCause((cause) => Deferred.failCause(deferred, cause)),
        Effect.ensuring(Effect.sync(() => this._resolvingPlugins.delete(id))),
      );
    });
  }

  /**
   * Removes a plugin from the manager.
   * @param id The id of the plugin.
   * @param opts See {@link PluginManager.remove}.
   */
  remove(id: string, opts?: { cascade?: boolean }): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      log('remove plugin', { id });
      const wasDev = this._devPlugins.has(id);
      const disabled = yield* this.disable(id, opts);
      if (!disabled) {
        return false;
      }

      this._removePlugin(id);
      if (this._onRemove) {
        this._runForkedFiber(
          this._onRemove(id).pipe(
            Effect.tapError((error) => Effect.sync(() => log.warn('plugin remove hook failed', { id, error }))),
            Effect.ignore,
          ),
        );
      }

      // If a dev plugin was shadowing an existing plugin, reinstate the
      // original now that the dev plugin is gone. Re-enable only if the
      // original was enabled at shadow time — preserving the user's intent
      // for plugins they had explicitly disabled before iterating on a dev
      // build.
      if (wasDev) {
        const shadow = this._unmarkDev(id);
        if (shadow) {
          this._addPlugin(shadow.plugin);
          if (shadow.wasEnabled) {
            yield* this.enable(id);
          }
        }
      }
      return true;
    });
  }

  /**
   * Disables a plugin.
   * @param id The id of the plugin.
   * @param opts See {@link PluginManager.disable}.
   */
  disable(id: string, { cascade = true }: { cascade?: boolean } = {}): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      log('disable plugin', { id, cascade });
      if (this._get(this._coreAtom).includes(id)) {
        return false;
      }

      const plugin = this._getPlugin(id);
      if (!plugin) {
        return false;
      }

      if (cascade) {
        const enabledDependents = this._collectDependents(id, { transitive: true, enabledOnly: true });
        if (enabledDependents.length > 0) {
          const coreDependent = enabledDependents.find((dependentId) =>
            this._get(this._coreAtom).includes(dependentId),
          );
          if (coreDependent) {
            return yield* Effect.fail(
              new Plugin.PluginDependencyError({
                context: { id, reason: 'core-dependent', coreDependent },
              }),
            );
          }
          // Disable transitive dependents first (leaves before root). The
          // walk returns them in dependents-before-deps order — exactly what
          // we want for teardown.
          for (const dependentId of enabledDependents) {
            yield* this._disableOne(dependentId);
          }
        }
      }

      yield* this._disableOne(id);
      return true;
    });
  }

  /**
   * Disables a single plugin without consulting its dependents. Used by
   * {@link disable} after the dependents pass has run (or been skipped via
   * `cascade: false`).
   */
  private _disableOne(id: string): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      if (this._get(this._coreAtom).includes(id)) {
        return false;
      }
      const plugin = this._getPlugin(id);
      if (!plugin) {
        return false;
      }
      const enabledIndex = this._get(this._enabledAtom).findIndex((enabled) => enabled === id);
      if (enabledIndex !== -1) {
        this._update(this._enabledAtom, (enabled) => enabled.filter((item) => item !== id));
        yield* this.deactivate(id);
        plugin.modules.forEach((module) => {
          this._removeModule(module.id);
        });
      }
      return true;
    });
  }

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
      const globalCycle = this._findGlobalCapabilityCycle();
      if (globalCycle !== undefined) {
        yield* this._reportStructuralError(
          globalCycle.map((entry) => entry.module),
          new DependencyCycleError({ path: globalCycle }),
        );
        globalCycle.forEach((entry) => this._structurallyFailed.add(entry.module));
      }

      // The dependency pass and the event-mode pass (for any module explicitly targeting
      // Startup) run concurrently — both observe each other through the shared capability
      // manager, and sequencing them would delay whichever pass runs second.
      const results = yield* Effect.withFiberRuntime<[boolean, boolean], Error>((fiber) =>
        Effect.all(
          [
            // Graph-level failures (missing provider, duplicate provider, cycle) fail the
            // start call; publish them so boot UIs surface the root cause instead of a
            // silent hang behind their own watchdog.
            this._activateDependencyGraph().pipe(
              Effect.tapError((error) =>
                Effect.gen(this, function* () {
                  log.error('dependency activation failed', { error: String(error) });
                  yield* PubSub.publish(this.activation, { event: key, state: 'error', error });
                }),
              ),
            ),
            this._activateEvent(key, undefined, fiber, { suppressEventMessage: true }),
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
        this._activateEvent(key, params, fiber).pipe(
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
        yield* this._deactivateModule(dependent);
        this._pendingReactivate.add(dependent.id);
      }

      const results = yield* Effect.all(
        modules.map((module) => this._deactivateModule(module)),
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
        modules.map((module) => this._deactivateModule(module)),
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
          yield* this._deactivateModule(module);
        }

        this._set(this._eventsFiredAtom, []);
        this._set(this._pendingResetAtom, []);
        this._moduleMemoMap.clear();
        for (const scope of this._moduleScopes.values()) {
          yield* Scope.close(scope, Exit.void);
        }
        this._moduleScopes.clear();
        yield* Ref.set(this._activatingEvents, []);
        yield* Ref.set(this._activatingModules, []);
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

  /** Looks up an id in the cached registry catalog, returning the entry or `undefined`. */
  private _getCatalogEntry(id: string): Plugin.Meta | undefined {
    return this._get(this.pluginRegistry.plugins).entries.find((entry) => entry.profile.key === id);
  }

  /**
   * Returns the direct `dependsOn` declarations for an id, drawing from the
   * registered plugin's meta when available and falling back to the registry
   * catalog entry. Unknown ids return an empty list (callers detect "missing"
   * separately).
   */
  private _directDependencies(id: string): string[] {
    const plugin = this._getPlugin(id);
    if (plugin) {
      return [...(plugin.meta.profile.dependsOn ?? [])];
    }
    const catalog = this._getCatalogEntry(id);
    return catalog?.profile.dependsOn ? [...catalog.profile.dependsOn] : [];
  }

  /**
   * Computes the transitive dependency closure for an id.
   *
   * Walks {@link _directDependencies} (registered plugins ∪ catalog entries).
   * Returns:
   *  - `order`: closure including the root in dependency-first topological order.
   *  - `missing`: ids in the closure that are neither registered nor in the catalog.
   *  - `toInstall`: ids in the closure that are in the catalog but not yet registered.
   *  - `cycle`: when a cycle is detected, the cycle path; otherwise `undefined`.
   */
  private _computeDependencyClosure(id: string): {
    order: string[];
    missing: string[];
    toInstall: string[];
    cycle?: string[];
  } {
    const order: string[] = [];
    const visited = new Set<string>();
    const onStack = new Set<string>();
    const stackPath: string[] = [];
    const missing: string[] = [];
    const toInstall: string[] = [];
    let cycle: string[] | undefined;

    const knownIds = new Set<string>([
      ...this._get(this._pluginsAtom).map((plugin) => plugin.meta.profile.key),
      ...this._get(this.pluginRegistry.plugins).entries.map((entry) => entry.profile.key),
    ]);

    const visit = (currentId: string): void => {
      if (cycle) {
        return;
      }
      if (visited.has(currentId)) {
        return;
      }
      if (onStack.has(currentId)) {
        const cycleStart = stackPath.indexOf(currentId);
        cycle = [...stackPath.slice(cycleStart), currentId];
        return;
      }
      onStack.add(currentId);
      stackPath.push(currentId);

      if (!knownIds.has(currentId)) {
        missing.push(currentId);
      } else if (!this._getPlugin(currentId)) {
        toInstall.push(currentId);
      }

      for (const depId of this._directDependencies(currentId)) {
        visit(depId);
        if (cycle) {
          break;
        }
      }

      onStack.delete(currentId);
      stackPath.pop();
      if (!cycle) {
        visited.add(currentId);
        order.push(currentId);
      }
    };

    visit(id);
    return { order, missing, toInstall, cycle };
  }

  /**
   * Walks the reverse `dependsOn` edges across registered plugins. With
   * `enabledOnly`, filters the result to currently-enabled ids. Returns
   * dependents in dependents-before-deps order so callers (cascade-disable)
   * can iterate and tear down leaves first.
   */
  private _collectDependents(id: string, opts: { transitive: boolean; enabledOnly: boolean }): string[] {
    const direct = this._get(this._pluginsAtom)
      .filter((plugin) => plugin.meta.profile.dependsOn?.some((dep) => dep === id))
      .map((plugin) => plugin.meta.profile.key);

    if (!opts.transitive) {
      return opts.enabledOnly
        ? direct.filter((dependentId) => this._get(this._enabledAtom).includes(dependentId))
        : direct;
    }

    const result: string[] = [];
    const visited = new Set<string>();
    const visit = (currentId: string): void => {
      if (visited.has(currentId)) {
        return;
      }
      visited.add(currentId);
      const parents = this._get(this._pluginsAtom)
        .filter((plugin) => plugin.meta.profile.dependsOn?.some((dep) => dep === currentId))
        .map((plugin) => plugin.meta.profile.key);
      for (const parentId of parents) {
        visit(parentId);
        if (parentId !== id && !result.includes(parentId)) {
          result.push(parentId);
        }
      }
    };
    visit(id);

    return opts.enabledOnly
      ? result.filter((dependentId) => this._get(this._enabledAtom).includes(dependentId))
      : result;
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
  // Activation helpers
  //

  private _activateEvent(
    key: string,
    params: { before?: string; after?: string } | undefined,
    fiber: Fiber.Fiber<unknown, unknown>,
    opts?: { suppressEventMessage?: boolean },
  ): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      yield* this._trackFiber(this._inFlightFibers, fiber);
      log('activating', { key, ...params });
      yield* Ref.update(this._activatingEvents, (activating) => Array.append(activating, key));
      this._clearPendingReset(key);

      const activatingEvents = yield* this._activatingEvents;
      const activatingModules = yield* this._activatingModules;
      const modules = this._getModulesForActivation(key, activatingEvents, activatingModules);
      if (modules.length === 0) {
        log('no modules to activate', { key });
        if (!this._get(this._eventsFiredAtom).includes(key)) {
          this._update(this._eventsFiredAtom, (events) => [...events, key]);
        }
        return false;
      }

      // Event-mode modules resolve their requires on demand: inactive dependency-mode
      // providers of unsatisfied singleton requires are activated first (transitively).
      const eventModules = modules.filter((module) => module.activation.mode === 'event');
      if (eventModules.length > 0) {
        yield* this._pullDependencyProviders(eventModules);
      }

      const activated = yield* this._activateModulesForEvent(key, modules, activatingEvents, opts);

      // Cascade: this wave's contributions may unlock pending chain members (modules whose
      // providers were gated on this event). Cheap no-op when nothing became satisfiable.
      if (yield* Ref.get(this._started)) {
        yield* this._activateDependencyGraph({});
      }

      return activated;
    }).pipe(
      Effect.ensuring(
        Effect.all([
          this._untrackFiber(this._inFlightFibers, fiber),
          Ref.update(this._activatingEvents, (activating) => Array.filter(activating, (event) => event !== key)),
        ]),
      ),
    );
  }

  private _activateModulesForEvent(
    key: string,
    modules: Plugin.PluginModule[],
    activatingEvents: string[],
    opts?: { suppressEventMessage?: boolean },
  ): Effect.Effect<boolean, Error> {
    const activatingModuleIds = modules.map((module) => module.id);
    return Effect.gen(this, function* () {
      yield* Ref.update(this._activatingModules, (activating) => Array.appendAll(activating, activatingModuleIds));

      log('activation wave', { event: key, modules: activatingModuleIds });
      performance.mark(`event:${key}:start`);
      yield* PubSub.publish(this.activation, { event: key, state: 'activating' });

      // Same-event provider/consumer pairs are topologically ordered with per-module
      // contribution via the capability-graph machinery.
      yield* this._activateDependencyGraph({ candidateModules: modules });

      if (!this._get(this._eventsFiredAtom).includes(key)) {
        this._update(this._eventsFiredAtom, (events) => [...events, key]);
      }

      performance.mark(`event:${key}:end`);
      performance.measure(`event:${key}`, `event:${key}:start`, `event:${key}:end`);
      // `start()` suppresses the event-level message for Startup and publishes it itself
      // once the concurrent dependency pass has also completed (the useApp ready gate).
      if (!opts?.suppressEventMessage) {
        yield* PubSub.publish(this.activation, { event: key, state: 'activated' });
      }
      log('activated', { key });

      return true;
    }).pipe(
      Effect.ensuring(
        Ref.update(this._activatingModules, (activating) =>
          Array.filter(activating, (module) => !activatingModuleIds.includes(module)),
        ),
      ),
    );
  }

  private _getModulesForActivation(
    key: string,
    activatingEvents: string[],
    activatingModules: string[],
  ): Plugin.PluginModule[] {
    return this._getInactiveModulesByEvent(key).filter((module) => {
      const spec = module.activation;
      if (spec.mode === 'dependency') {
        return false;
      }
      const allOf = ActivationEvent.isAllOf(spec.activatesOn);
      if (!allOf) {
        return true;
      }

      // Check to see if all of the events in the `allOf` have been fired.
      // An event can be considered "fired" if it is in the `eventsFired` list or if it is currently being activated.
      const events = ActivationEvent.getEvents(spec.activatesOn).filter(
        (event) => ActivationEvent.eventKey(event) !== key,
      );
      return (
        events.every(
          (event) =>
            this._get(this._eventsFiredAtom).includes(ActivationEvent.eventKey(event)) ||
            activatingEvents.includes(ActivationEvent.eventKey(event)),
        ) && !activatingModules.includes(module.id)
      );
    });
  }

  //
  // Capability-dependency activation
  //

  /**
   * Activates inactive typed modules in topological order of the capability graph, to a
   * fixpoint. Candidates are dependency-mode modules plus event-mode modules whose
   * `activatesOn` events have already fired (the fired-events latch); modules whose singleton
   * requires cannot be satisfied by this pass stay PENDING — they are reconsidered by the
   * next cascade round (each round of contributions, and each event wave, can unlock them).
   * With `candidateModules`, the first round is scoped to those modules (plus pending
   * reactivations); cascade rounds always consider the full pool.
   *
   * Structural problems — duplicate singleton providers within a round, capability cycles,
   * or a singleton requirement no registered module of any mode could ever provide — put
   * the offending plugins into an error state (the `failed` atom, plus an error activation
   * message) and the pass continues with everything else. Individual module activation
   * failures are recorded per plugin (via `_loadModule`) and skip that module's transitive
   * dependents without aborting independent modules.
   */
  private _activateDependencyGraph(options?: {
    candidateModules?: Plugin.PluginModule[];
  }): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      let scoped = options?.candidateModules;
      let ranAny = false;
      let allSucceeded = true;
      // Fixpoint: contributions made by one round (or concurrently by event waves) can make
      // previously pending modules satisfiable. Each round activates at least one module or
      // ends the loop, so this terminates.
      for (;;) {
        const round = yield* this._activateDependencyRound(scoped);
        if (round === undefined) {
          break;
        }
        ranAny = true;
        allSucceeded = allSucceeded && round;
        // Cascade rounds consider everything that might have been unlocked.
        scoped = undefined;
      }
      return ranAny && allSucceeded;
    });
  }

  /**
   * Records a structural dependency-graph error against a plugin and publishes it on the
   * activation stream (so boot UIs surface it) without aborting the pass.
   */
  private _reportStructuralError(moduleIds: string[], error: Error): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      log.error('dependency graph error', { error: String(error), modules: moduleIds });
      const plugins = new Set<string>();
      for (const moduleId of moduleIds) {
        const pluginId = this._getPluginIdForModule(moduleId);
        if (pluginId !== undefined) {
          plugins.add(pluginId);
        }
      }
      plugins.forEach((pluginId) => this._recordFailure(pluginId, 'activation', error));
      yield* PubSub.publish(this.activation, {
        event: ActivationEvent.eventKey(ActivationEvent.Startup),
        state: 'error',
        error,
      });
    });
  }

  /**
   * One topological activation round. Returns `undefined` when nothing is runnable.
   */
  private _activateDependencyRound(
    candidateModules: Plugin.PluginModule[] | undefined,
  ): Effect.Effect<boolean | undefined, Error> {
    return Effect.gen(this, function* () {
      const key = ActivationEvent.eventKey(ActivationEvent.Startup);
      const active = this._get(this._activeAtom);
      const allModules = this._get(this._modulesAtom);
      const eventsFired = this._get(this._eventsFiredAtom);

      // Event-mode modules join a round once their activation events have fired (latch).
      const eventSatisfied = (module: Plugin.PluginModule): boolean => {
        const spec = module.activation;
        if (spec.mode !== 'event') {
          return false;
        }
        const events = ActivationEvent.getEvents(spec.activatesOn).map(ActivationEvent.eventKey);
        return ActivationEvent.isAllOf(spec.activatesOn)
          ? events.every((event) => eventsFired.includes(event))
          : events.some((event) => eventsFired.includes(event));
      };

      const pendingReactivate = allModules.filter((module) => this._pendingReactivate.has(module.id));
      // Explicitly passed candidates are trusted to be triggered (e.g. an event wave passes
      // its matched modules before the event key is latched); pooled candidates require
      // dependency mode or a satisfied event latch.
      const explicit = new Set((candidateModules ?? []).map((module) => module.id));
      const pool = candidateModules ? [...candidateModules, ...pendingReactivate] : allModules;
      const seen = new Set<string>();
      const candidates = pool.filter((module) => {
        if (
          active.includes(module.id) ||
          seen.has(module.id) ||
          this._structurallyFailed.has(module.id) ||
          // Already loading via another path (memoized): awaiting it here could deadlock —
          // e.g. a cascade triggered by an event wave that an in-flight module itself fired.
          this._moduleMemoMap.has(module.id)
        ) {
          return false;
        }
        if (!explicit.has(module.id) && module.activation.mode === 'event' && !eventSatisfied(module)) {
          return false;
        }
        seen.add(module.id);
        return true;
      });
      if (candidates.length === 0) {
        return undefined;
      }

      // Singleton provider index across candidates and already-active typed modules.
      // The duplicate check spans only modules in play, so mutually-exclusive event-gated
      // alternatives (only one latched) do not trip it. Duplicates put both providers into
      // an error state and exclude them; their dependents pend.
      const providerIndex = new Map<string, string>();
      const structurallyExcluded = new Set<string>();
      const activeTypedModules = allModules.filter((module) => active.includes(module.id));
      for (const module of [...activeTypedModules, ...candidates]) {
        for (const capability of module.activation.provides) {
          if (capability.arity !== 'single') {
            continue;
          }
          const existing = providerIndex.get(capability.identifier);
          if (existing !== undefined && existing !== module.id) {
            const error = new DuplicateProviderError({
              capability: capability.identifier,
              providers: [existing, module.id],
            });
            yield* this._reportStructuralError([existing, module.id], error);
            structurallyExcluded.add(existing);
            structurallyExcluded.add(module.id);
            this._structurallyFailed.add(existing);
            this._structurallyFailed.add(module.id);
            providerIndex.delete(capability.identifier);
            continue;
          }
          providerIndex.set(capability.identifier, module.id);
        }
      }

      // Does ANY registered module (active or not, latched or not) provide this?
      const anyRegisteredProvider = (identifier: string): boolean =>
        allModules.some((module) => module.activation.provides.some((provided) => provided.identifier === identifier));

      // Satisfiability fixpoint: a candidate is runnable when every unsatisfied singleton
      // require is provided by another runnable candidate. Everything else pends for a later
      // cascade round (e.g. providers gated on an event that has not fired yet). Requires with
      // no possible provider at all are a configuration error recorded against the requiring
      // plugin.
      const runnable = new Map(
        candidates.filter((module) => !structurallyExcluded.has(module.id)).map((module) => [module.id, module]),
      );
      let changed = true;
      while (changed) {
        changed = false;
        for (const module of [...runnable.values()]) {
          for (const capability of module.activation.requires) {
            if (capability.arity === 'multi' || this.capabilities.getAll(capability).length > 0) {
              continue;
            }
            const provider = providerIndex.get(capability.identifier);
            if (provider !== undefined && (runnable.has(provider) || active.includes(provider))) {
              // Ordered within this round, or active (an active provider whose capability
              // was conditionally skipped resolves via the bounded waitFor bridge).
              continue;
            }
            if (provider === undefined && !anyRegisteredProvider(capability.identifier)) {
              yield* this._reportStructuralError(
                [module.id],
                new MissingProviderError({
                  capability: capability.identifier,
                  requiredBy: [module.id],
                  registered: this.capabilities.listRegisteredIdentifiers(),
                }),
              );
              this._structurallyFailed.add(module.id);
            }
            // A provider exists but is not in play (event not fired, module pending in a
            // different chain, plugin disabled): pend until a cascade round unlocks it.
            log('module pending on capability', { module: module.id, capability: capability.identifier });
            runnable.delete(module.id);
            changed = true;
            break;
          }
        }
      }
      const roundModules = [...runnable.values()];
      if (roundModules.length === 0) {
        return undefined;
      }
      roundModules.forEach((module) => this._pendingReactivate.delete(module.id));

      // Multi-capability providers among the round (soft edges only).
      const multiProviders = new Map<string, string[]>();
      for (const module of roundModules) {
        for (const capability of module.activation.provides) {
          if (capability.arity === 'multi') {
            const providers = multiProviders.get(capability.identifier) ?? [];
            providers.push(module.id);
            multiProviders.set(capability.identifier, providers);
          }
        }
      }

      // Edges are provider -> consumer, labelled with the capability identifier.
      const hardEdges = new Map<string, Map<string, string>>();
      const softEdges = new Map<string, Map<string, string>>();
      const addEdge = (edges: Map<string, Map<string, string>>, from: string, to: string, capability: string) => {
        const targets = edges.get(from) ?? new Map<string, string>();
        targets.set(to, capability);
        edges.set(from, targets);
      };
      for (const module of roundModules) {
        for (const capability of module.activation.requires) {
          if (capability.arity === 'multi') {
            // Multi capabilities never gate; the soft edge is a best-effort ordering so
            // same-round providers are visible to one-shot snapshot reads.
            for (const provider of multiProviders.get(capability.identifier) ?? []) {
              if (provider !== module.id) {
                addEdge(softEdges, provider, module.id, capability.identifier);
              }
            }
            continue;
          }
          if (this.capabilities.getAll(capability).length > 0) {
            continue;
          }
          const provider = providerIndex.get(capability.identifier);
          if (provider !== undefined && runnable.has(provider)) {
            addEdge(hardEdges, provider, module.id, capability.identifier);
          }
        }
      }

      // Cycles within the round: record an error state on the involved plugins, exclude
      // the cycle members (their dependents skip via the failed set below), and continue
      // with the rest. Repeats until the remaining graph is acyclic.
      const cycleFailed = new Set<string>();
      let runnableModules = roundModules;
      let hardWaves = computeActivationWaves(runnableModules, hardEdges);
      while (hardWaves === undefined) {
        const path = findCyclePath(runnableModules, hardEdges);
        yield* this._reportStructuralError(
          path.map((entry) => entry.module),
          new DependencyCycleError({ path }),
        );
        const members = new Set(path.map((entry) => entry.module));
        members.forEach((member) => {
          cycleFailed.add(member);
          this._structurallyFailed.add(member);
        });
        runnableModules = runnableModules.filter((module) => !members.has(module.id));
        if (runnableModules.length === 0) {
          return undefined;
        }
        hardWaves = computeActivationWaves(runnableModules, hardEdges);
      }
      const combinedEdges = new Map(hardEdges);
      for (const [from, targets] of softEdges) {
        const merged = new Map(combinedEdges.get(from) ?? []);
        targets.forEach((capability, to) => merged.set(to, capability));
        combinedEdges.set(from, merged);
      }
      // Soft edges are best-effort: if they cycle, fall back to hard-edge order wholesale.
      const combinedWaves = computeActivationWaves(runnableModules, combinedEdges);
      if (combinedWaves === undefined && softEdges.size > 0) {
        log('multi-capability soft ordering dropped (cycle)', { modules: runnableModules.map((module) => module.id) });
      }
      const waves = combinedWaves ?? hardWaves;

      log('dependency activation waves', {
        waves: waves.map((wave) => wave.map((module) => module.id)),
      });

      // A module whose provider failed is skipped (its requires can never resolve) and
      // marked failed so its own dependents skip too. Independent modules proceed.
      // Cycle members count as failed so their dependents skip as well.
      const failed = new Set<string>(cycleFailed);
      const providersOf = (moduleId: string): string[] => {
        const providers: string[] = [];
        for (const [from, targets] of hardEdges) {
          if (targets.has(moduleId)) {
            providers.push(from);
          }
        }
        return providers;
      };
      let allSucceeded = true;
      for (const wave of waves) {
        yield* Effect.all(
          wave.map((module) =>
            Effect.gen(this, function* () {
              if (providersOf(module.id).some((provider) => failed.has(provider))) {
                log.warn('skipping module: provider failed', { module: module.id });
                failed.add(module.id);
                allSucceeded = false;
                return;
              }
              const result = yield* this._activateDependencyModule(module, key).pipe(Effect.either);
              if (result._tag === 'Left') {
                failed.add(module.id);
                allSucceeded = false;
              }
            }),
          ),
          { concurrency: 'unbounded' },
        );
      }
      return allSucceeded;
    });
  }

  /**
   * Detects capability cycles across the FULL module set, regardless of event gating.
   * Two modules on different activation events that require each other's provides would
   * otherwise pend forever (neither chain can start); this surfaces the lock at startup.
   */
  private _findGlobalCapabilityCycle(): Array<{ module: string; capability: string }> | undefined {
    const modules = this._get(this._modulesAtom);
    const providersByCapability = new Map<string, string[]>();
    for (const module of modules) {
      for (const capability of module.activation.provides) {
        if (capability.arity !== 'single') {
          continue;
        }
        const providers = providersByCapability.get(capability.identifier) ?? [];
        providers.push(module.id);
        providersByCapability.set(capability.identifier, providers);
      }
    }
    const edges = new Map<string, Map<string, string>>();
    for (const module of modules) {
      for (const capability of module.activation.requires) {
        if (capability.arity === 'multi') {
          continue;
        }
        for (const provider of providersByCapability.get(capability.identifier) ?? []) {
          if (provider === module.id) {
            continue;
          }
          const targets = edges.get(provider) ?? new Map<string, string>();
          targets.set(module.id, capability.identifier);
          edges.set(provider, targets);
        }
      }
    }
    return computeActivationWaves(modules, edges) === undefined ? findCyclePath(modules, edges) : undefined;
  }

  /**
   * Loads, contributes, and post-processes a single dependency-mode module.
   * Contribution happens as the module completes (not batched per wave), so singleton
   * gating is exactly wave ordering.
   */
  private _activateDependencyModule(module: Plugin.PluginModule, parentEvent: string): Effect.Effect<void, Error> {
    return Effect.gen(this, function* () {
      if (this._get(this._activeAtom).includes(module.id)) {
        return;
      }
      const capabilities = yield* this._loadModule(module, parentEvent);
      yield* this._contributeCapabilities(module, capabilities);
    });
  }

  /**
   * Activates the inactive dependency-mode providers (transitively) of the given modules'
   * unsatisfied singleton requires, plus any inactive dependency-mode providers of their
   * multi requires. Used before running event-mode modules so their requires resolve on
   * demand.
   *
   * Multi requires never gate (they resolve to whatever is currently contributed), but a
   * pulled provider that takes a one-shot snapshot of a multi capability (e.g. the process
   * manager's `Capabilities.LayerSpec` collection) needs its fellow multi providers activated
   * in the *same* scoped round so `_activateDependencyRound`'s soft-edge ordering can land
   * them first — otherwise a narrow pull (this provider alone) skips that ordering entirely
   * and the snapshot can be taken before sibling providers have contributed.
   */
  private _pullDependencyProviders(modules: Plugin.PluginModule[]): Effect.Effect<void, Error> {
    return Effect.gen(this, function* () {
      const active = this._get(this._activeAtom);
      const allModules = this._get(this._modulesAtom);
      const providerIndex = new Map<string, Plugin.PluginModule>();
      const multiProviderIndex = new Map<string, Plugin.PluginModule[]>();
      for (const module of allModules) {
        if (module.activation.mode !== 'dependency' || active.includes(module.id)) {
          continue;
        }
        for (const capability of module.activation.provides) {
          if (capability.arity === 'single') {
            if (!providerIndex.has(capability.identifier)) {
              providerIndex.set(capability.identifier, module);
            }
          } else {
            const providers = multiProviderIndex.get(capability.identifier) ?? [];
            providers.push(module);
            multiProviderIndex.set(capability.identifier, providers);
          }
        }
      }
      if (providerIndex.size === 0 && multiProviderIndex.size === 0) {
        return;
      }

      const needed = new Map<string, Plugin.PluginModule>();
      const visit = (requires: readonly Capability.AnyTag[]) => {
        for (const capability of requires) {
          if (capability.arity === 'multi') {
            for (const provider of multiProviderIndex.get(capability.identifier) ?? []) {
              if (!needed.has(provider.id)) {
                needed.set(provider.id, provider);
                visit(provider.activation.requires);
              }
            }
            continue;
          }
          if (this.capabilities.getAll(capability).length > 0) {
            continue;
          }
          const provider = providerIndex.get(capability.identifier);
          if (provider && !needed.has(provider.id)) {
            needed.set(provider.id, provider);
            if (provider.activation.mode === 'dependency') {
              visit(provider.activation.requires);
            }
          }
        }
      };
      for (const module of modules) {
        visit(module.activation.requires);
      }

      if (needed.size > 0) {
        log('pulling dependency providers', { modules: [...needed.keys()] });
        yield* this._activateDependencyGraph({ candidateModules: [...needed.values()] });
      }
    });
  }

  /**
   * Builds the Effect context for a module's declared requires: singleton capabilities
   * resolve to their implementation (waiting — bounded by the activation timeout — for
   * concurrent providers), multi capabilities to their live contributions view.
   */
  private _resolveRequires(module: Plugin.PluginModule): Effect.Effect<Context.Context<never>, Error> {
    return Effect.gen(this, function* () {
      const spec = module.activation;
      if (spec.requires.length === 0) {
        return Context.empty();
      }

      const services = new Map<string, unknown>();
      for (const capability of spec.requires) {
        if (capability.arity === 'multi') {
          services.set(capability.key, this.capabilities.contributions(capability));
          continue;
        }
        const [existing] = this.capabilities.getAll(capability);
        const implementation =
          existing !== undefined
            ? existing
            : yield* this.capabilities.waitFor(capability).pipe(
                Effect.timeoutFail({
                  duration: this._activationTimeout,
                  onTimeout: () =>
                    new CapabilityNotFoundError({
                      identifier: capability.identifier,
                      registered: this.capabilities.listRegisteredIdentifiers(),
                    }),
                }),
              );
        services.set(capability.key, implementation);
      }
      return Context.unsafeMake(services);
    });
  }

  //
  // Module lifecycle helpers
  //

  private _getModuleSemaphore(moduleId: Plugin.PluginModule['id']): Effect.Semaphore {
    let semaphore = this._moduleSemaphores.get(moduleId);
    if (!semaphore) {
      semaphore = Effect.runSync(Effect.makeSemaphore(1));
      this._moduleSemaphores.set(moduleId, semaphore);
    }
    return semaphore;
  }

  // `parentEvent` is the activation event that first triggered this module
  // load — included in `activating`/`activated` PubSub messages so subscribers
  // (e.g. the boot loader's status listener) can associate a module with its
  // triggering event in the trace. The same module may be referenced by
  // multiple events, but module loads are memoized via `_moduleMemoMap`, so
  // only the first event to need it will appear here; later events await the
  // cached deferred without re-publishing.
  private _loadModule = (module: Plugin.PluginModule, parentEvent: string): Effect.Effect<Capability.Any[], Error> =>
    Effect.gen(this, function* () {
      const semaphore = this._getModuleSemaphore(module.id);

      // Atomically check-and-set under per-module semaphore to prevent race conditions.
      const deferredToAwait = yield* Effect.gen(this, function* () {
        const existing = this._moduleMemoMap.get(module.id);
        if (existing) {
          return existing;
        }

        // First caller - create deferred, store it, and start loading in background.
        const deferred = yield* Deferred.make<Capability.Any[], Error>();
        this._moduleMemoMap.set(module.id, deferred);

        const scope = yield* Scope.make();
        const loadEffect = Effect.gen(this, function* () {
          log('loading module', { module: module.id, parentEvent });
          performance.mark(`module:${module.id}:start`);
          yield* PubSub.publish(this.activation, { event: parentEvent, state: 'activating', module: module.id });
          const pluginId = this._getPluginIdForModule(module.id);
          const requiresContext = yield* this._resolveRequires(module);
          const [duration, capabilities] = yield* module.activate().pipe(
            Effect.provide(requiresContext),
            Effect.provideService(Capability.Service, this.capabilities),
            Effect.provideService(Plugin.Service, this),
            Scope.extend(scope),
            // Cap activation so a single misbehaving module can't hold the
            // event chain open. On timeout the failure is recorded against
            // the plugin and surfaced as `PluginTimeoutError`.
            Effect.timeoutFail({
              duration: this._activationTimeout,
              onTimeout: () =>
                new PluginTimeoutError({
                  context: { id: pluginId ?? module.id, module: module.id, phase: 'activation' as PluginFailurePhase },
                }),
            }),
            Effect.timed,
          );
          const normalized = Capability.normalizeActivateResult(capabilities);

          // Runtime provides validation (the authoritative check; the type-level one is
          // best-effort). Validated on the raw items so an empty provideAll still counts
          // as covering its capability. Undeclared contributions fail (they would bypass
          // dependency ordering); missing ones only warn — a provider may legitimately
          // decide at runtime not to contribute (consumers then surface a bounded
          // CapabilityNotFoundError instead of silently proceeding).
          const declared = new Set(module.activation.provides.map((capability) => capability.identifier));
          const returned = new Set(
            normalized.map((item) =>
              Capability.isContribution(item) ? item.capability.identifier : item.interface.identifier,
            ),
          );
          const missing = [...declared].filter((identifier) => !returned.has(identifier));
          const undeclared = [...returned].filter((identifier) => !declared.has(identifier));
          if (undeclared.length > 0) {
            return yield* Effect.fail(new ProvidesMismatchError({ module: module.id, missing, undeclared }));
          }
          if (missing.length > 0) {
            log.warn('module did not contribute all declared capabilities', { module: module.id, missing });
          }

          this._moduleScopes.set(module.id, scope);
          const elapsed = Duration.toMillis(duration);
          performance.mark(`module:${module.id}:end`);
          performance.measure(`module:${module.id}`, `module:${module.id}:start`, `module:${module.id}:end`);
          yield* PubSub.publish(this.activation, { event: parentEvent, state: 'activated', module: module.id });
          log('loaded module', {
            module: module.id,
            parentEvent,
            elapsed,
            failed: false,
          });
          return Capability.expandContributions(normalized);
        }).pipe(
          Effect.tapErrorCause(() => Scope.close(scope, Exit.void)),
          Effect.withSpan('PluginManager._loadModule'),
          together(
            Effect.sleep(Duration.seconds(10)).pipe(
              Effect.andThen(
                Effect.sync(() => log.warn(`module is taking a long time to activate`, { module: module.id })),
              ),
            ),
          ),
          Performance.addTrackEntry({
            name: module.id,
            devtools: {
              dataType: 'track-entry',
              track: 'Module Activation',
              trackGroup: 'Composer',
              color: 'primary',
            },
          }),
        );

        // Fork the load to run in background, completing the deferred when done.
        const fiber = yield* Effect.forkDaemon(
          loadEffect.pipe(
            Effect.tap((result) => Deferred.succeed(deferred, result)),
            Effect.catchAllCause((cause) =>
              Effect.gen(this, function* () {
                const error = Cause.squash(cause);
                const errorMessage = error instanceof Error ? error.message : String(error);
                const missingCapability =
                  error instanceof CapabilityNotFoundError ? error.context.identifier : undefined;
                log.error('module failed to activate', {
                  module: module.id,
                  parentEvent,
                  missingCapability,
                  registeredCapabilities: this.capabilities.listRegisteredIdentifiers(),
                  error: errorMessage,
                  stack: error instanceof Error ? error.stack : undefined,
                  isDefect: !Cause.isFailure(cause),
                });
                const normalizedError = error instanceof Error ? error : new Error(String(error));
                const pluginId = this._getPluginIdForModule(module.id);
                if (pluginId !== undefined) {
                  this._recordFailure(pluginId, 'activation', normalizedError);
                  this._scheduleAutoDisable(pluginId);
                }
                // Symmetric with the 'activating'/'activated' messages published above so boot
                // UIs subscribed to `activation` observe a failed module, not just a silent stall.
                yield* PubSub.publish(this.activation, {
                  event: parentEvent,
                  state: 'error',
                  module: module.id,
                  error: normalizedError,
                });
                return yield* Deferred.fail(deferred, normalizedError);
              }),
            ),
          ),
        );
        yield* this._trackFiber(this._inFlightFibers, fiber);
        yield* Effect.forkDaemon(
          Fiber.await(fiber).pipe(Effect.andThen(() => this._untrackFiber(this._inFlightFibers, fiber))),
        );

        return deferred;
      }).pipe(semaphore.withPermits(1));

      // Wait for result outside the semaphore so multiple waiters can proceed concurrently.
      return yield* Deferred.await(deferredToAwait);
    });

  private _contributeCapabilities(
    module: Plugin.PluginModule,
    capabilities: Capability.Any[],
  ): Effect.Effect<void, Error> {
    return Effect.gen(this, function* () {
      // A module may be reached by more than one activation path (dependency pass, event
      // wave, on-demand provider pull); the load is memoized, so contribution is too.
      if (this._capabilities.has(module.id)) {
        return;
      }
      capabilities.forEach((capability) => {
        this.capabilities.contribute({ module: module.id, ...capability });
      });
      this._update(this._activeAtom, (active) => [...active, module.id]);
      this._capabilities.set(module.id, capabilities);
    });
  }

  private _deactivateModule(module: Plugin.PluginModule): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      const id = module.id;
      log('deactivating', { id });
      this._moduleMemoMap.delete(id);

      const capabilities = this._capabilities.get(id);
      if (capabilities) {
        for (const capability of capabilities) {
          this.capabilities.remove(capability.interface, capability.implementation);
          const program = capability.deactivate?.() ?? Effect.succeed(undefined);
          yield* program;
        }
        this._capabilities.delete(id);
      }

      const scope = this._moduleScopes.get(id);
      if (scope) {
        yield* Scope.close(scope, Exit.void);
        this._moduleScopes.delete(id);
      }

      const activeIndex = this._get(this._activeAtom).findIndex((event) => event === id);
      if (activeIndex !== -1) {
        this._update(this._activeAtom, (active) => active.filter((event) => event !== id));
      }

      log('deactivated', { id });
      return true;
    });
  }
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

/**
 * Runs an effect concurrently with another effect.
 * If the first effect completes, the second effect is interrupted.
 */
// TODO(dmaretskyi): Effect.race > Effect.asVoid
const together =
  <R1>(togetherEffect: Effect.Effect<void, never, R1>) =>
  <A, E, R2>(effect: Effect.Effect<A, E, R2>): Effect.Effect<A, E, R1 | R2> =>
    Effect.gen(function* () {
      const togetherFiber = yield* Effect.fork(togetherEffect);
      const result = yield* effect;
      yield* Fiber.interrupt(togetherFiber);
      return result;
    });

/**
 * Kahn's algorithm over the capability graph, returning topological activation waves
 * (modules in the same wave have no edges among them and activate concurrently).
 * Returns `undefined` when the graph is cyclic.
 * Edges are provider -> consumer maps labelled with the capability identifier.
 */
const computeActivationWaves = (
  modules: readonly Plugin.PluginModule[],
  edges: ReadonlyMap<string, ReadonlyMap<string, string>>,
): Plugin.PluginModule[][] | undefined => {
  const byId = new Map(modules.map((module) => [module.id, module]));
  const inDegree = new Map(modules.map((module) => [module.id, 0]));
  for (const [from, targets] of edges) {
    if (!byId.has(from)) {
      continue;
    }
    for (const to of targets.keys()) {
      if (inDegree.has(to)) {
        inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
      }
    }
  }

  const waves: Plugin.PluginModule[][] = [];
  let visited = 0;
  let frontier = modules.filter((module) => (inDegree.get(module.id) ?? 0) === 0);
  while (frontier.length > 0) {
    waves.push([...frontier]);
    visited += frontier.length;
    const next: Plugin.PluginModule[] = [];
    for (const module of frontier) {
      for (const to of edges.get(module.id)?.keys() ?? []) {
        if (!inDegree.has(to)) {
          continue;
        }
        const remaining = (inDegree.get(to) ?? 0) - 1;
        inDegree.set(to, remaining);
        if (remaining === 0) {
          const target = byId.get(to);
          if (target) {
            next.push(target);
          }
        }
      }
    }
    frontier = next;
  }
  return visited === modules.length ? waves : undefined;
};

/**
 * Finds one cycle in the capability graph for diagnostics: each entry is a module and the
 * capability identifier on its outgoing edge within the cycle.
 */
const findCyclePath = (
  modules: readonly Plugin.PluginModule[],
  edges: ReadonlyMap<string, ReadonlyMap<string, string>>,
): Array<{ module: string; capability: string }> => {
  const state = new Map<string, 'visiting' | 'done'>();
  let cycle: Array<{ module: string; capability: string }> = [];

  const visit = (id: string, stack: Array<{ module: string; capability: string }>): boolean => {
    state.set(id, 'visiting');
    for (const [to, capability] of edges.get(id) ?? []) {
      if (state.get(to) === 'done') {
        continue;
      }
      const entry = { module: id, capability };
      if (state.get(to) === 'visiting') {
        const start = stack.findIndex((frame) => frame.module === to);
        cycle = [...stack.slice(start === -1 ? 0 : start), entry];
        return true;
      }
      if (visit(to, [...stack, entry])) {
        return true;
      }
    }
    state.set(id, 'done');
    return false;
  };

  for (const module of modules) {
    if (!state.has(module.id) && visit(module.id, [])) {
      break;
    }
  }
  return cycle;
};
