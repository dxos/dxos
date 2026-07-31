//
// Copyright 2026 DXOS.org
//

import * as Deferred from 'effect/Deferred';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

import { type ActivationMessage, type PluginFailurePhase, PluginTimeoutError } from './manager-types';
import * as Plugin from './plugin';

/**
 * Everything the catalog needs from its owner. Callbacks rather than a manager reference so
 * each operation's true dependencies stay visible.
 */
export type PluginCatalogContext = {
  pluginLoader: (id: string) => Effect.Effect<{ plugin: Plugin.Plugin; dev?: boolean }, Error>;
  loadTimeout: Duration.DurationInput;
  getPlugins: () => readonly Plugin.Plugin[];
  updatePlugins: (fn: (plugins: Plugin.Plugin[]) => Plugin.Plugin[]) => void;
  getCore: () => readonly string[];
  getEnabled: () => readonly string[];
  updateEnabled: (fn: (enabled: string[]) => string[]) => void;
  updateDevPluginIds: (fn: (ids: string[]) => string[]) => void;
  /** Entries of the cached registry catalog. */
  getCatalogEntries: () => readonly Plugin.Meta[];
  registerPlugin: (plugin: Plugin.Plugin) => void;
  unregisterPlugin: (id: string) => void;
  addModule: (module: Plugin.PluginModule) => void;
  removeModule: (moduleId: string) => void;
  setPendingResetByModule: (module: Plugin.PluginModule) => void;
  getPendingReset: () => readonly string[];
  /** Fires an activation event (used to replay pending resets on enable). */
  activate: (event: string) => Effect.Effect<boolean, Error>;
  /** Plugin-level deactivation (owned by the manager's lifecycle). */
  deactivate: (id: string) => Effect.Effect<boolean, Error>;
  isStarted: () => Effect.Effect<boolean>;
  /** Incremental dependency pass for a plugin enabled after startup. */
  runDependencyPass: (options: { candidateModules: Plugin.PluginModule[] }) => Effect.Effect<boolean, Error>;
  recordFailure: (id: string, phase: PluginFailurePhase, error: Error) => void;
  clearFailure: (id: string) => boolean;
  scheduleAutoDisable: (id: string) => void;
  /** Modules excluded by a structural error — cleared on enable so a retry re-evaluates. */
  structurallyFailed: Set<string>;
  publish: (message: ActivationMessage) => Effect.Effect<void>;
  /** Fire-and-forget effect tracked by the manager (used for the onRemove hook). */
  runForked: (effect: Effect.Effect<unknown>) => void;
  onRemove?: (id: string) => Effect.Effect<void, unknown>;
};

/**
 * The plugin catalog: add / enable / disable / remove, lazy plugin resolution, dev-plugin
 * shadowing, and the declared-dependency closure (`getDependencies` / `getDependents`).
 * Enabling resolves declared dependencies (installing catalog-only entries), enables in
 * dependency-first order, and — after startup — runs an incremental activation pass for the
 * newly enabled modules. Disabling tears down dependents first.
 */
export class PluginCatalog {
  /** Coalesces concurrent lazy-plugin resolutions per plugin id. */
  readonly #resolving = new Map<string, Deferred.Deferred<Plugin.Plugin, Plugin.LazyPluginError>>();
  /** Dev-sourced plugin ids, with the shadowed original (if any) for restoration on remove. */
  readonly #devPlugins = new Map<string, { shadow?: { plugin: Plugin.Plugin; wasEnabled: boolean } }>();
  readonly #ctx: PluginCatalogContext;

  constructor(ctx: PluginCatalogContext) {
    this.#ctx = ctx;
  }

  /** Whether the id is currently dev-sourced. */
  isDev(id: string): boolean {
    return this.#devPlugins.has(id);
  }

  #getPlugin(id: string): Plugin.Plugin | undefined {
    return this.#ctx.getPlugins().find((plugin) => plugin.meta.profile.key === id);
  }

  /**
   * Marks `id` as dev-sourced. If the plugin displaced an existing one, pass
   * the shadow snapshot so `remove` can restore it. Repeat calls (e.g. a dev
   * plugin reload) preserve the original shadow target — restoration always
   * unwinds back to the real underlying plugin, never an intermediate dev build.
   */
  #markDev(id: string, shadow?: { plugin: Plugin.Plugin; wasEnabled: boolean }): void {
    if (this.#devPlugins.has(id)) {
      return;
    }
    this.#devPlugins.set(id, { shadow });
    this.#ctx.updateDevPluginIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  /** Drops the dev-plugin entry and returns its shadow data (if any) for restoration. */
  #unmarkDev(id: string): { plugin: Plugin.Plugin; wasEnabled: boolean } | undefined {
    const entry = this.#devPlugins.get(id);
    this.#devPlugins.delete(id);
    this.#ctx.updateDevPluginIds((ids) => ids.filter((existing) => existing !== id));
    return entry?.shadow;
  }

  //
  // Plugin catalog — dependency closure, add / enable / remove / disable, dev plugins.
  //

  getDependencies(id: string, opts?: { transitive?: boolean }): readonly string[] {
    const transitive = opts?.transitive !== false;
    if (!transitive) {
      return this.#directDependencies(id);
    }
    const walk = this.#computeDependencyClosure(id);
    // Drop the target itself; callers asked for its dependencies, not the
    // closure including the root.
    return walk.order.filter((depId) => depId !== id);
  }

  getDependents(id: string, opts?: { transitive?: boolean; enabledOnly?: boolean }): readonly string[] {
    return this.#collectDependents(id, {
      transitive: opts?.transitive !== false,
      enabledOnly: opts?.enabledOnly === true,
    });
  }

  /**
   * Adds a plugin to the manager via the plugin loader.
   * The plugin is registered but not enabled; call `enable` separately to activate it.
   * @param id The id of the plugin.
   */
  add(id: string): Effect.Effect<Plugin.Plugin, Error> {
    return Effect.gen(this, function* () {
      log('add plugin', { id });
      const { plugin, dev = false } = yield* this.#ctx.pluginLoader(id);
      const pluginId = plugin.meta.profile.key;
      const existing = this.#getPlugin(pluginId);

      if (dev && existing && existing !== plugin) {
        // Shadow path: a plugin with this id is already registered (a builtin,
        // a registry install, or a previous dev load). Disable it, stash it,
        // and swap the dev plugin into the same id slot. The dialog will call
        // `enable(pluginId)` next, which activates the dev plugin's modules.
        // Marking as dev is a no-op when the id is already tracked, so a dev-plugin
        // reload (after editing source) keeps the *original* shadow target —
        // removal restores the real underlying plugin, not an intermediate build.
        const wasEnabled = this.#ctx.getEnabled().includes(pluginId);
        if (wasEnabled) {
          yield* this.disable(pluginId);
        }
        this.#markDev(pluginId, { plugin: existing, wasEnabled });
        this.#ctx.updatePlugins((plugins) => plugins.map((p) => (p.meta.profile.key === pluginId ? plugin : p)));
      } else {
        this.#ctx.registerPlugin(plugin);
        if (dev) {
          this.#markDev(pluginId);
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
        return yield* this.#enableOne(id);
      }

      // If the root id is unknown to both the registered set and the catalog,
      // fall back to the silent `_enableOne` path (which returns `false`).
      // This preserves the prior contract for persisted `enabled` entries
      // whose plugins are no longer bundled, instead of recording a confusing
      // "missing self-dependency" failure.
      if (!this.#getPlugin(id) && !this.#getCatalogEntry(id)) {
        return yield* this.#enableOne(id);
      }

      // Compute the transitive closure across registered plugins and catalog
      // entries. Missing or cyclic entries are recorded as failures and the
      // target plugin is left disabled.
      const walk = this.#computeDependencyClosure(id);
      if (walk.cycle) {
        this.#ctx.recordFailure(
          id,
          'load',
          new Plugin.PluginDependencyError({ context: { id, reason: 'cycle', path: walk.cycle } }),
        );
        return false;
      }
      if (walk.missing.length > 0) {
        this.#ctx.recordFailure(
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
      for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
        if (installed.has(next) || this.#getPlugin(next)) {
          continue;
        }
        const installResult = yield* this.add(next).pipe(Effect.either);
        if (installResult._tag === 'Left') {
          this.#ctx.recordFailure(
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
        const rewalk = this.#computeDependencyClosure(id);
        if (rewalk.cycle) {
          this.#ctx.recordFailure(
            id,
            'load',
            new Plugin.PluginDependencyError({ context: { id, reason: 'cycle', path: rewalk.cycle } }),
          );
          return false;
        }
        if (rewalk.missing.length > 0) {
          this.#ctx.recordFailure(
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
      const order = this.#computeDependencyClosure(id).order;
      let succeeded = false;
      for (const depId of order) {
        const ok = yield* this.#enableOne(depId);
        if (depId === id) {
          succeeded = ok;
        }
      }
      return succeeded;
    });
  }

  /**
   * Enables a single plugin without consulting its declared dependencies.
   * Used by {@link PluginCatalog.enable} as the leaf step after closure resolution, and
   * directly when callers pass `{ resolveDependencies: false }`.
   *
   * The underlying operations (module registration and pending-reset marking,
   * `activate`) are all idempotent, so this method is safe to call multiple
   * times for the same id. The constructor's bootstrap path relies on this:
   * the persisted `enabled` ids are written into `_enabledAtom` up front, so
   * the very first `enable(id)` for those plugins sees `alreadyEnabled`-style
   * state but still needs to perform the module registration and activation.
   */
  #enableOne(id: string): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      const stub = this.#getPlugin(id);
      if (!stub) {
        return false;
      }

      // Clear any prior failure record so a retry starts from a clean slate.
      // The failure stays on the atom only if this attempt also fails. Structural
      // exclusions are re-evaluated too: a newly enabled plugin may resolve them.
      this.#ctx.clearFailure(id);
      this.#ctx.structurallyFailed.clear();

      const plugin = yield* this.#resolveLazy(stub);

      this.#ctx.updateEnabled((enabled) => (enabled.includes(id) ? enabled : [...enabled, id]));

      plugin.modules.forEach((module) => {
        this.#ctx.addModule(module);
        this.#ctx.setPendingResetByModule(module);
      });

      log('pending reset', { events: [...this.#ctx.getPendingReset()] });
      yield* Effect.all(
        this.#ctx.getPendingReset().map((event) => this.#ctx.activate(event)),
        { concurrency: 'unbounded' },
      );

      // After startup, newly enabled dependency-mode modules activate incrementally against
      // the already-contributed capability set. Failures are scoped to this plugin.
      if (yield* this.#ctx.isStarted()) {
        const result = yield* this.#ctx
          .runDependencyPass({ candidateModules: [...plugin.modules] })
          .pipe(Effect.either);
        if (result._tag === 'Left') {
          this.#ctx.recordFailure(id, 'activation', result.left);
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
   * Concurrent calls for the same id are coalesced:
   * the first caller starts the resolution, every subsequent caller awaits
   * the same `Deferred`. On failure we publish a `lazy:<id>` error message
   * and skip the atom swap so the failure is observable to the activation
   * subscriber and a retry can be attempted.
   */
  #resolveLazy(plugin: Plugin.Plugin): Effect.Effect<Plugin.Plugin, Plugin.LazyPluginError> {
    return Effect.gen(this, function* () {
      if (!Plugin.isLazy(plugin)) {
        return plugin;
      }
      const id = plugin.meta.profile.key;

      const existing = this.#resolving.get(id);
      if (existing) {
        return yield* Deferred.await(existing);
      }
      const deferred = yield* Deferred.make<Plugin.Plugin, Plugin.LazyPluginError>();
      this.#resolving.set(id, deferred);

      return yield* Effect.gen(this, function* () {
        log('resolving lazy plugin', { id });
        yield* this.#ctx.publish({ event: '', state: 'activating', module: `lazy:${id}` });
        const resolvedPlugin = yield* Plugin.resolveLazy(plugin).pipe(
          // Cap how long a remote import can hang. Without this the host can
          // sit on a pending dynamic `import()` indefinitely if the plugin's
          // server is unreachable, which stalls every caller awaiting
          // `enable(id)` and (transitively) the manager's initialization.
          Effect.timeoutFail({
            duration: this.#ctx.loadTimeout,
            onTimeout: () =>
              new Plugin.LazyPluginError({
                context: { id, reason: 'load-failed' },
                cause: new PluginTimeoutError({ context: { id, phase: 'load' as PluginFailurePhase } }),
              }),
          }),
        );
        this.#ctx.updatePlugins((plugins) => plugins.map((p) => (p.meta.profile.key === id ? resolvedPlugin : p)));
        yield* this.#ctx.publish({ event: '', state: 'activated', module: `lazy:${id}` });
        return resolvedPlugin;
      }).pipe(
        Effect.tapError((error) =>
          Effect.gen(this, function* () {
            yield* this.#ctx.publish({ event: '', state: 'error', module: `lazy:${id}`, error });
            this.#ctx.recordFailure(id, 'load', error);
            this.#ctx.scheduleAutoDisable(id);
          }),
        ),
        Effect.tap((value) => Deferred.succeed(deferred, value)),
        Effect.tapErrorCause((cause) => Deferred.failCause(deferred, cause)),
        Effect.ensuring(Effect.sync(() => this.#resolving.delete(id))),
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
      const wasDev = this.#devPlugins.has(id);
      const disabled = yield* this.disable(id, opts);
      if (!disabled) {
        return false;
      }

      this.#ctx.unregisterPlugin(id);
      if (this.#ctx.onRemove) {
        this.#ctx.runForked(
          this.#ctx.onRemove(id).pipe(
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
        const shadow = this.#unmarkDev(id);
        if (shadow) {
          this.#ctx.registerPlugin(shadow.plugin);
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
      if (this.#ctx.getCore().includes(id)) {
        return false;
      }

      const plugin = this.#getPlugin(id);
      if (!plugin) {
        return false;
      }

      if (cascade) {
        const enabledDependents = this.#collectDependents(id, { transitive: true, enabledOnly: true });
        if (enabledDependents.length > 0) {
          const coreDependent = enabledDependents.find((dependentId) => this.#ctx.getCore().includes(dependentId));
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
            yield* this.#disableOne(dependentId);
          }
        }
      }

      yield* this.#disableOne(id);
      return true;
    });
  }

  /**
   * Disables a single plugin without consulting its dependents. Used by
   * {@link PluginCatalog.disable} after the dependents pass has run (or been skipped via
   * `cascade: false`).
   */
  #disableOne(id: string): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      if (this.#ctx.getCore().includes(id)) {
        return false;
      }
      const plugin = this.#getPlugin(id);
      if (!plugin) {
        return false;
      }
      const enabledIndex = this.#ctx.getEnabled().findIndex((enabled) => enabled === id);
      if (enabledIndex !== -1) {
        this.#ctx.updateEnabled((enabled) => enabled.filter((item) => item !== id));
        yield* this.#ctx.deactivate(id);
        plugin.modules.forEach((module) => {
          this.#ctx.removeModule(module.id);
        });
      }
      return true;
    });
  }

  /** Looks up an id in the cached registry catalog, returning the entry or `undefined`. */
  #getCatalogEntry(id: string): Plugin.Meta | undefined {
    return this.#ctx.getCatalogEntries().find((entry) => entry.profile.key === id);
  }

  /**
   * Returns the direct `dependsOn` declarations for an id, drawing from the
   * registered plugin's meta when available and falling back to the registry
   * catalog entry. Unknown ids return an empty list (callers detect "missing"
   * separately).
   */
  #directDependencies(id: string): string[] {
    const plugin = this.#getPlugin(id);
    if (plugin) {
      return [...(plugin.meta.profile.dependsOn ?? [])];
    }
    const catalog = this.#getCatalogEntry(id);
    return catalog?.profile.dependsOn ? [...catalog.profile.dependsOn] : [];
  }

  /**
   * Computes the transitive dependency closure for an id.
   *
   * Walks {@link #directDependencies} (registered plugins ∪ catalog entries).
   * Returns:
   *  - `order`: closure including the root in dependency-first topological order.
   *  - `missing`: ids in the closure that are neither registered nor in the catalog.
   *  - `toInstall`: ids in the closure that are in the catalog but not yet registered.
   *  - `cycle`: when a cycle is detected, the cycle path; otherwise `undefined`.
   */
  #computeDependencyClosure(id: string): {
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
      ...this.#ctx.getPlugins().map((plugin) => plugin.meta.profile.key),
      ...this.#ctx.getCatalogEntries().map((entry) => entry.profile.key),
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
      } else if (!this.#getPlugin(currentId)) {
        toInstall.push(currentId);
      }

      for (const depId of this.#directDependencies(currentId)) {
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
  #collectDependents(id: string, opts: { transitive: boolean; enabledOnly: boolean }): string[] {
    const direct = this.#ctx
      .getPlugins()
      .filter((plugin) => plugin.meta.profile.dependsOn?.some((dep) => dep === id))
      .map((plugin) => plugin.meta.profile.key);

    if (!opts.transitive) {
      return opts.enabledOnly ? direct.filter((dependentId) => this.#ctx.getEnabled().includes(dependentId)) : direct;
    }

    const result: string[] = [];
    const visited = new Set<string>();
    const visit = (currentId: string): void => {
      if (visited.has(currentId)) {
        return;
      }
      visited.add(currentId);
      const parents = this.#ctx
        .getPlugins()
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

    return opts.enabledOnly ? result.filter((dependentId) => this.#ctx.getEnabled().includes(dependentId)) : result;
  }
}
