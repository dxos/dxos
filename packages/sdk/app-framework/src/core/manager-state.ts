//
// Copyright 2026 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as PubSub from 'effect/PubSub';
import * as Ref from 'effect/Ref';

import { log } from '@dxos/log';

import * as ActivationEvent from './activation-event';
import {
  type ActivationMessage,
  type PluginFailure,
  type PluginFailurePhase,
  type PluginFailureReason,
  type PluginInitializationError,
  PluginTimeoutError,
} from './manager-types';
import type * as Plugin from './plugin';

/**
 * The plugin manager's shared substrate, owned by no single unit: the observable state, the
 * activation status channel, the fiber tracker, and the lifecycle flags the manager and its
 * collaborating units (catalog, scheduler, loader) coordinate through. One object with named
 * operations instead of per-unit getter and setter callbacks: this IS shared mutable state, and
 * giving it a single home makes the sharing visible and its invariants enforceable.
 *
 * The atoms are the manager's public reactive surface (exposed via the `PluginManager`
 * interface); everything else is internal bookkeeping.
 */
export class ManagerState {
  /** All registered plugins (enabled or not). */
  readonly plugins: Atom.Writable<Plugin.Plugin[]>;
  /** Ids of system plugins (snapshot of the initial set; never disabled). */
  readonly core: Atom.Writable<string[]>;
  /** Ids of enabled plugins. */
  readonly enabled: Atom.Writable<string[]>;
  /** Modules of enabled plugins. */
  readonly modules: Atom.Writable<Plugin.PluginModule[]>;
  /** Ids of modules whose activate has completed and contributed. */
  readonly active: Atom.Writable<string[]>;
  /** Activation events that have fired. */
  readonly eventsFired: Atom.Writable<string[]>;
  /** Events whose modules changed after the event fired — replayed on the next enable. */
  readonly pendingReset: Atom.Writable<string[]>;
  /** Plugins that failed to load or activate (latest failure per id). */
  readonly failed: Atom.Writable<PluginFailure[]>;
  /** Ids of currently-registered dev-sourced plugins. */
  readonly devPluginIds: Atom.Writable<string[]>;

  /** Status channel: `activating`/`activated`/`error` messages per event and module. */
  readonly activation = Effect.runSync(PubSub.unbounded<ActivationMessage>());
  /** Fibers forked by the units, so shutdown can interrupt in-flight work. */
  readonly fibers = new FiberTracker();
  /**
   * Completed when the constructor's core/enabled `enable()` chain has registered all
   * modules; event dispatch awaits it so lazy plugin imports can't race activation.
   */
  readonly initialized = Effect.runSync(Deferred.make<void, PluginInitializationError>());
  /** Whether `start()` has run — gates incremental activation on later enables. */
  readonly started = Effect.runSync(Ref.make(false));
  /** Set for the duration of `shutdown()` — new starts/activations are skipped meanwhile. */
  readonly shuttingDown = Effect.runSync(Ref.make(false));
  /**
   * Modules deactivated because a singleton capability they require lost its provider
   * (provider plugin disabled). Re-included as candidates in the next dependency pass.
   */
  readonly reactivateOnNextPass = new Set<string>();
  /**
   * Modules in a structural error state (cycle member, duplicate provider, impossible
   * require): excluded from activation rounds until a plugin-set change re-evaluates them.
   */
  readonly structurallyFailed = new Set<string>();

  readonly #registry: Registry.Registry;

  constructor(
    registry: Registry.Registry,
    initial: { plugins: readonly Plugin.Plugin[]; core: readonly string[]; enabled: readonly string[] },
  ) {
    this.#registry = registry;
    this.plugins = Atom.make<Plugin.Plugin[]>([...initial.plugins]).pipe(Atom.keepAlive);
    this.core = Atom.make<string[]>([...initial.core]).pipe(Atom.keepAlive);
    this.enabled = Atom.make<string[]>([...initial.enabled]).pipe(Atom.keepAlive);
    this.modules = Atom.make<Plugin.PluginModule[]>([]).pipe(Atom.keepAlive);
    this.active = Atom.make<string[]>([]).pipe(Atom.keepAlive);
    this.eventsFired = Atom.make<string[]>([]).pipe(Atom.keepAlive);
    this.pendingReset = Atom.make<string[]>([]).pipe(Atom.keepAlive);
    this.failed = Atom.make<PluginFailure[]>([]).pipe(Atom.keepAlive);
    this.devPluginIds = Atom.make<string[]>([]).pipe(Atom.keepAlive);
  }

  /** Generic read of any atom through the manager's registry. */
  read<T>(atom: Atom.Atom<T>): T {
    return this.#registry.get(atom);
  }

  #update<T>(atom: Atom.Writable<T>, fn: (value: T) => T): void {
    this.#registry.set(atom, fn(this.#registry.get(atom)));
  }

  //
  // Plugins.
  //

  getPlugins(): readonly Plugin.Plugin[] {
    return this.read(this.plugins);
  }

  getPlugin(id: string): Plugin.Plugin | undefined {
    return this.getPlugins().find((plugin) => plugin.meta.profile.key === id);
  }

  registerPlugin(plugin: Plugin.Plugin): void {
    log('add plugin', { id: plugin.meta.profile.key });
    // TODO(wittjosiah): Find a way to add a warning for duplicate plugins that doesn't cause log spam.
    this.#update(this.plugins, (plugins) => (plugins.includes(plugin) ? plugins : [...plugins, plugin]));
  }

  /** Swaps the plugin registered under the id (lazy resolution, dev shadowing). */
  replacePlugin(id: string, plugin: Plugin.Plugin): void {
    this.#update(this.plugins, (plugins) => plugins.map((p) => (p.meta.profile.key === id ? plugin : p)));
  }

  unregisterPlugin(id: string): void {
    log('remove plugin', { id });
    this.#update(this.plugins, (plugins) => plugins.filter((plugin) => plugin.meta.profile.key !== id));
  }

  isCore(id: string): boolean {
    return this.read(this.core).includes(id);
  }

  isEnabled(id: string): boolean {
    return this.read(this.enabled).includes(id);
  }

  markEnabled(id: string): void {
    this.#update(this.enabled, (enabled) => (enabled.includes(id) ? enabled : [...enabled, id]));
  }

  markDisabled(id: string): void {
    this.#update(this.enabled, (enabled) => enabled.filter((item) => item !== id));
  }

  markDevPlugin(id: string): void {
    this.#update(this.devPluginIds, (ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  unmarkDevPlugin(id: string): void {
    this.#update(this.devPluginIds, (ids) => ids.filter((existing) => existing !== id));
  }

  //
  // Modules.
  //

  getModules(): readonly Plugin.PluginModule[] {
    return this.read(this.modules);
  }

  addModule(module: Plugin.PluginModule): void {
    log('add module', { id: module.id });
    // TODO(wittjosiah): Find a way to add a warning for duplicate modules that doesn't cause log spam.
    this.#update(this.modules, (modules) => (modules.includes(module) ? modules : [...modules, module]));
  }

  removeModule(id: string): void {
    log('remove module', { id });
    this.#update(this.modules, (modules) => modules.filter((module) => module.id !== id));
  }

  pluginIdOfModule(moduleId: string): string | undefined {
    return this.getPlugins().find((plugin) => plugin.modules.some((module) => module.id === moduleId))?.meta.profile
      .key;
  }

  getActiveIds(): readonly string[] {
    return this.read(this.active);
  }

  isActive(moduleId: string): boolean {
    return this.getActiveIds().includes(moduleId);
  }

  markActive(moduleId: string): void {
    this.#update(this.active, (ids) => [...ids, moduleId]);
  }

  markInactive(moduleId: string): void {
    this.#update(this.active, (ids) => ids.filter((id) => id !== moduleId));
  }

  getActiveModules(): Plugin.PluginModule[] {
    const active = this.getActiveIds();
    return this.getModules().filter((module) => active.includes(module.id));
  }

  getInactiveModules(): Plugin.PluginModule[] {
    const active = this.getActiveIds();
    return this.getModules().filter((module) => !active.includes(module.id));
  }

  getActiveModulesByEvent(key: string): Plugin.PluginModule[] {
    return this.getActiveModules().filter(
      (module) =>
        module.activation.mode !== 'dependency' &&
        ActivationEvent.getEvents(module.activation.activatesOn).map(ActivationEvent.eventKey).includes(key),
    );
  }

  getInactiveModulesByEvent(key: string): Plugin.PluginModule[] {
    return this.getInactiveModules().filter(
      (module) =>
        module.activation.mode !== 'dependency' &&
        ActivationEvent.getEvents(module.activation.activatesOn).map(ActivationEvent.eventKey).includes(key),
    );
  }

  //
  // Activation events.
  //

  eventFired(key: string): boolean {
    return this.read(this.eventsFired).includes(key);
  }

  markEventFired(key: string): void {
    if (!this.eventFired(key)) {
      this.#update(this.eventsFired, (events) => [...events, key]);
    }
  }

  clearEventsFired(): void {
    this.#update(this.eventsFired, () => []);
  }

  isStarted(): Effect.Effect<boolean> {
    return Ref.get(this.started);
  }

  isShuttingDown(): Effect.Effect<boolean> {
    return Ref.get(this.shuttingDown);
  }

  //
  // Pending reset: events that already fired but whose module set changed (a plugin was
  // enabled after the fact) — replayed so the new modules activate.
  //

  getPendingReset(): readonly string[] {
    return this.read(this.pendingReset);
  }

  markPendingResetFor(module: Plugin.PluginModule): void {
    // Dependency-mode modules do not participate in event-keyed resets.
    if (module.activation.mode === 'dependency') {
      return;
    }

    const activationEvents = ActivationEvent.getEvents(module.activation.activatesOn)
      .map(ActivationEvent.eventKey)
      .filter((key) => this.eventFired(key));

    const pendingReset = [...new Set(activationEvents)].filter((event) => !this.getPendingReset().includes(event));
    if (pendingReset.length > 0) {
      log('pending reset', { events: pendingReset });
      this.#update(this.pendingReset, (current) => [...current, ...pendingReset]);
    }
  }

  clearPendingReset(key: string): void {
    if (this.getPendingReset().includes(key)) {
      this.#update(this.pendingReset, (pending) => pending.filter((event) => event !== key));
    }
  }

  clearAllPendingReset(): void {
    this.#update(this.pendingReset, () => []);
  }

  //
  // Failures.
  //

  getFailures(): readonly PluginFailure[] {
    return this.read(this.failed);
  }

  /**
   * Records a failure for a plugin. Latest failure wins so the registry UI always sees the
   * most recent reason. Walks the `cause` chain when checking for timeouts: lazy-load
   * timeouts arrive wrapped in `LazyPluginError` (the timeout is the cause), but the
   * operator-visible reason should still be `'timeout'`.
   */
  recordFailure(id: string, phase: PluginFailurePhase, error: Error): void {
    const reason: PluginFailureReason = isTimeoutCause(error) ? 'timeout' : 'error';
    const failure: PluginFailure = { id, phase, reason, error, timestamp: Date.now() };
    log.warn('plugin failed to activate', { id, phase, reason, error: error.message });
    this.#update(this.failed, (current) => [...current.filter((entry) => entry.id !== id), failure]);
  }

  clearFailure(id: string): boolean {
    if (!this.getFailures().some((failure) => failure.id === id)) {
      return false;
    }
    this.#update(this.failed, (current) => current.filter((failure) => failure.id !== id));
    return true;
  }
}

/**
 * Tracks fibers forked by the manager's units so shutdown can interrupt in-flight work.
 */
export class FiberTracker {
  readonly #fibers = Effect.runSync(Ref.make<Array<Fiber.Fiber<unknown, unknown>>>([]));

  track(fiber: Fiber.Fiber<unknown, unknown>): Effect.Effect<void> {
    return Ref.update(this.#fibers, (fibers) => [...fibers, fiber]);
  }

  untrack(fiber: Fiber.Fiber<unknown, unknown>): Effect.Effect<void> {
    return Ref.update(this.#fibers, (fibers) => fibers.filter((existing) => existing !== fiber));
  }

  /** Fire-and-forget: fork the effect and track the fiber until it settles. */
  fork(effect: Effect.Effect<unknown>): void {
    const fiber = Effect.runFork(effect);
    Effect.runSync(this.track(fiber));
    Effect.runFork(Fiber.await(fiber).pipe(Effect.andThen(() => this.untrack(fiber))));
  }

  interruptAll(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const fibers = yield* Ref.get(this.#fibers);
      yield* Effect.forEach(fibers, (fiber) => Fiber.interrupt(fiber), { concurrency: 'unbounded', discard: true });
      yield* Ref.set(this.#fibers, []);
    });
  }
}

/**
 * True when `error` (or anything along its `cause` chain) is a {@link PluginTimeoutError}.
 * Lazy-load timeouts wrap the timeout inside `LazyPluginError`, so a shallow check on the
 * outer error misses them. Bounded depth so a circular chain can't loop forever.
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
