//
// Copyright 2025 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import * as Context from 'effect/Context';
import * as Deferred from 'effect/Deferred';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Function from 'effect/Function';
import * as HashSet from 'effect/HashSet';
import * as Layer from 'effect/Layer';
import * as PubSub from 'effect/PubSub';
import * as Ref from 'effect/Ref';

import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';

import * as ActivationEvent from './activation-event';
import * as Capability from './capability';
import type * as Plugin from './plugin';

/**
 * Identifier denoting a Manager.
 */
export const ManagerTypeId: unique symbol = Symbol.for('@dxos/app-framework/Manager');
export type ManagerTypeId = typeof ManagerTypeId;

export type ManagerOptions = {
  pluginLoader: (id: string) => Effect.Effect<Plugin.Plugin, Error>;
  plugins?: Plugin.Plugin[];
  core?: string[];
  enabled?: string[];
  registry?: Registry.Registry;
};

type ActivationMessage = { event: string; state: 'activating' | 'activated' | 'error'; error?: Error };

/**
 * Interface for the Plugin Manager.
 */
export interface PluginManager {
  readonly [ManagerTypeId]: ManagerTypeId;
  readonly activation: PubSub.PubSub<ActivationMessage>;
  readonly context: Capability.PluginContext;
  readonly registry: Registry.Registry;

  readonly plugins: Atom.Atom<readonly Plugin.Plugin[]>;
  readonly core: Atom.Atom<readonly string[]>;
  readonly enabled: Atom.Atom<readonly string[]>;
  readonly modules: Atom.Atom<readonly Plugin.PluginModule[]>;
  readonly active: Atom.Atom<readonly string[]>;
  readonly eventsFired: Atom.Atom<readonly string[]>;
  readonly pendingReset: Atom.Atom<readonly string[]>;

  getPlugins(): readonly Plugin.Plugin[];
  getCore(): readonly string[];
  getEnabled(): readonly string[];
  getModules(): readonly Plugin.PluginModule[];
  getActive(): readonly string[];
  getEventsFired(): readonly string[];
  getPendingReset(): readonly string[];

  add(id: string): Effect.Effect<boolean, Error>;
  enable(id: string): Effect.Effect<boolean, Error>;
  remove(id: string): boolean;
  disable(id: string): Effect.Effect<boolean, Error>;
  // TODO(wittjosiah): Improve error typing.
  activate(
    event: ActivationEvent.ActivationEvent | string,
    params?: { before?: string; after?: string },
  ): Effect.Effect<boolean, Error>;
  deactivate(id: string): Effect.Effect<boolean, Error>;
  reset(event: ActivationEvent.ActivationEvent | string): Effect.Effect<boolean, Error>;
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
  readonly context: Capability.PluginContext;
  readonly registry: Registry.Registry;

  private readonly _pluginsAtom: Atom.Writable<Plugin.Plugin[]>;
  private readonly _coreAtom: Atom.Writable<string[]>;
  private readonly _enabledAtom: Atom.Writable<string[]>;
  private readonly _modulesAtom: Atom.Writable<Plugin.PluginModule[]>;
  private readonly _activeAtom: Atom.Writable<string[]>;
  private readonly _eventsFiredAtom: Atom.Writable<string[]>;
  private readonly _pendingResetAtom: Atom.Writable<string[]>;
  private readonly _pluginLoader: ManagerOptions['pluginLoader'];
  private readonly _capabilities = new Map<string, Capability.Any[]>();
  private readonly _moduleMemoMap = new Map<Plugin.PluginModule['id'], Deferred.Deferred<Capability.Any[], Error>>();
  private readonly _moduleSemaphores = new Map<Plugin.PluginModule['id'], Effect.Semaphore>();
  private readonly _activatingEvents = Effect.runSync(Ref.make<string[]>([]));
  private readonly _activatingModules = Effect.runSync(Ref.make<string[]>([]));

  constructor({
    pluginLoader,
    plugins = [],
    core = plugins.map(({ meta }) => meta.id),
    enabled = [],
    registry,
  }: ManagerOptions) {
    this.registry = registry ?? Registry.make();
    this.context = new Capability.PluginContextImpl({
      registry: this.registry,
      activate: (event) => this.activate(event),
      reset: (id) => this.reset(id),
    });

    this._pluginLoader = pluginLoader;
    this._pluginsAtom = Atom.make(plugins).pipe(Atom.keepAlive);
    this._coreAtom = Atom.make(core).pipe(Atom.keepAlive);
    this._enabledAtom = Atom.make(enabled).pipe(Atom.keepAlive);
    this._modulesAtom = Atom.make<Plugin.PluginModule[]>([]).pipe(Atom.keepAlive);
    this._activeAtom = Atom.make<string[]>([]).pipe(Atom.keepAlive);
    this._eventsFiredAtom = Atom.make<string[]>([]).pipe(Atom.keepAlive);
    this._pendingResetAtom = Atom.make<string[]>([]).pipe(Atom.keepAlive);
    plugins.forEach((plugin) => this._addPlugin(plugin));
    void Effect.all([...core, ...enabled].map((id) => this.enable(id))).pipe(runAndForwardErrors);
  }

  get plugins(): Atom.Atom<readonly Plugin.Plugin[]> {
    return this._pluginsAtom;
  }

  get core(): Atom.Atom<readonly string[]> {
    return this._coreAtom;
  }

  /**
   * Ids of plugins that are currently enabled.
   *
   * @reactive
   */
  get enabled(): Atom.Atom<readonly string[]> {
    return this._enabledAtom;
  }

  /**
   * Modules of plugins which are currently enabled.
   *
   * @reactive
   */
  get modules(): Atom.Atom<readonly Plugin.PluginModule[]> {
    return this._modulesAtom;
  }

  /**
   * Ids of modules which are currently active.
   *
   * @reactive
   */
  get active(): Atom.Atom<readonly string[]> {
    return this._activeAtom;
  }

  /**
   * Ids of events which have been fired.
   *
   * @reactive
   */
  get eventsFired(): Atom.Atom<readonly string[]> {
    return this._eventsFiredAtom;
  }

  /**
   * Ids of modules which are pending reset.
   *
   * @reactive
   */
  get pendingReset(): Atom.Atom<readonly string[]> {
    return this._pendingResetAtom;
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

  /**
   * Adds a plugin to the manager via the plugin loader.
   * @param id The id of the plugin.
   */
  add(id: string): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      log('add plugin', { id });
      const plugin = yield* this._pluginLoader(id);
      this._addPlugin(plugin);
      return yield* this.enable(id);
    });
  }

  /**
   * Enables a plugin.
   * @param id The id of the plugin.
   */
  enable(id: string): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      log('enable plugin', { id });
      const plugin = this._getPlugin(id);
      if (!plugin) {
        return false;
      }

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

      return true;
    });
  }

  /**
   * Removes a plugin from the manager.
   * @param id The id of the plugin.
   */
  remove(id: string): boolean {
    log('remove plugin', { id });
    const result = this.disable(id);
    if (!result) {
      return false;
    }

    this._removePlugin(id);
    return true;
  }

  /**
   * Disables a plugin.
   * @param id The id of the plugin.
   */
  disable(id: string): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      log('disable plugin', { id });
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
      log('activating', { key, ...params });
      yield* Ref.update(this._activatingEvents, (activating) => Array.append(activating, key));
      const pendingIndex = this._get(this._pendingResetAtom).findIndex((event) => event === key);
      if (pendingIndex !== -1) {
        this._update(this._pendingResetAtom, (pending) => pending.filter((event) => event !== key));
      }

      const activatingEvents = yield* this._activatingEvents;
      const activatingModules = yield* this._activatingModules;
      const modules = this._getInactiveModulesByEvent(key).filter((module) => {
        const allOf = ActivationEvent.isAllOf(module.activatesOn);
        if (!allOf) {
          return true;
        }

        // Check to see if all of the events in the `allOf` have been fired.
        // An event can be considered "fired" if it is in the `eventsFired` list or if it is currently being activated.
        const events = ActivationEvent.getEvents(module.activatesOn).filter(
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
      yield* Ref.update(this._activatingModules, (activating) =>
        Array.appendAll(
          activating,
          modules.map((module) => module.id),
        ),
      );
      if (modules.length === 0) {
        log('no modules to activate', { key });
        if (!this._get(this._eventsFiredAtom).includes(key)) {
          this._update(this._eventsFiredAtom, (events) => [...events, key]);
        }
        return false;
      }

      log('activating modules', { key, modules: modules.map((module) => module.id) });
      yield* PubSub.publish(this.activation, { event: key, state: 'activating' });

      // Fire activatesBefore events.
      const beforeEvents = Function.pipe(
        modules,
        Array.flatMap((module) => module.activatesBefore ?? []),
        HashSet.fromIterable,
        HashSet.toValues,
        Array.filter((event) => !activatingEvents.includes(ActivationEvent.eventKey(event))),
      );
      yield* Function.pipe(
        beforeEvents,
        Array.map((event) => this.activate(event, { before: key })),
        Effect.allWith({ concurrency: 'unbounded' }),
        together(
          Effect.sleep(Duration.seconds(10)).pipe(
            Effect.andThen(
              Effect.sync(() =>
                log.warn('activatesBefore is taking a long time', {
                  event: key,
                  beforeEvents: beforeEvents.map(ActivationEvent.eventKey),
                }),
              ),
            ),
          ),
        ),
      );

      // Concurrently triggers loading of lazy capabilities.
      const getCapabilities = yield* Function.pipe(
        modules,
        Array.map((mod) => this._loadModule(mod)),
        Effect.allWith({ concurrency: 'unbounded' }),
        Effect.catchAll((error) => {
          return Effect.gen(this, function* () {
            yield* PubSub.publish(this.activation, { event: key, state: 'error', error });
            return yield* Effect.fail(error);
          });
        }),
      );

      // Contribute the capabilities from the activated modules.
      yield* Function.pipe(
        modules,
        Array.zip(getCapabilities),
        Array.map(([module, capabilities]) => this._contributeCapabilities(module, capabilities)),
        // TODO(wittjosiah): This currently can't be run in parallel.
        //   Running this with concurrency causes races with `allOf` activation events.
        Effect.all,
      );

      // Fire activatesAfter events.
      const afterEvents = Function.pipe(
        modules,
        Array.flatMap((module) => module.activatesAfter ?? []),
        HashSet.fromIterable,
        HashSet.toValues,
        Array.filter((event) => !activatingEvents.includes(ActivationEvent.eventKey(event))),
      );
      yield* Function.pipe(
        afterEvents,
        Array.map((event) => this.activate(event, { after: key })),
        Effect.allWith({ concurrency: 'unbounded' }),
        together(
          Effect.sleep(Duration.seconds(10)).pipe(
            Effect.andThen(
              Effect.sync(() =>
                log.warn('activatesAfter is taking a long time', {
                  event: key,
                  afterEvents: afterEvents.map(ActivationEvent.eventKey),
                }),
              ),
            ),
          ),
        ),
      );

      yield* Ref.update(this._activatingEvents, (activating) => Array.filter(activating, (event) => event !== key));
      yield* Ref.update(this._activatingModules, (activating) =>
        Array.filter(activating, (module) => !modules.map((module) => module.id).includes(module)),
      );

      if (!this._get(this._eventsFiredAtom).includes(key)) {
        this._update(this._eventsFiredAtom, (events) => [...events, key]);
      }

      yield* PubSub.publish(this.activation, { event: key, state: 'activated' });
      log('activated', { key });

      return true;
    }).pipe(
      together(
        Effect.sleep(Duration.seconds(15)).pipe(
          Effect.andThen(Effect.sync(() => log.warn('event activation is taking a long time', { event: key }))),
        ),
      ),
    );
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
      const results = yield* Effect.all(
        modules.map((module) => this._deactivateModule(module)),
        { concurrency: 'unbounded' },
      );
      return results.every((result) => result);
    });
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

  private _get<T>(atom: Atom.Atom<T>): T {
    return this.registry.get(atom);
  }

  private _set<T>(atom: Atom.Writable<T>, value: T): void {
    this.registry.set(atom, value);
  }

  private _update<T>(atom: Atom.Writable<T>, updater: (current: T) => T): void {
    this._set(atom, updater(this._get(atom)));
  }

  private _addPlugin(plugin: Plugin.Plugin): void {
    log('add plugin', { id: plugin.meta.id });
    // TODO(wittjosiah): Find a way to add a warning for duplicate plugins that doesn't cause log spam.
    this._update(this._pluginsAtom, (plugins) => (plugins.includes(plugin) ? plugins : [...plugins, plugin]));
  }

  private _removePlugin(id: string): void {
    log('remove plugin', { id });
    this._update(this._pluginsAtom, (plugins) => plugins.filter((plugin) => plugin.meta.id !== id));
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

  private _getPlugin(id: string): Plugin.Plugin | undefined {
    return this._get(this._pluginsAtom).find((plugin) => plugin.meta.id === id);
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
    return this._getActiveModules().filter((module) =>
      ActivationEvent.getEvents(module.activatesOn).map(ActivationEvent.eventKey).includes(key),
    );
  }

  private _getInactiveModulesByEvent(key: string): Plugin.PluginModule[] {
    return this._getInactiveModules().filter((module) =>
      ActivationEvent.getEvents(module.activatesOn).map(ActivationEvent.eventKey).includes(key),
    );
  }

  private _setPendingResetByModule(module: Plugin.PluginModule): void {
    const activationEvents = ActivationEvent.getEvents(module.activatesOn)
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

  private _getModuleSemaphore(moduleId: Plugin.PluginModule['id']): Effect.Semaphore {
    let semaphore = this._moduleSemaphores.get(moduleId);
    if (!semaphore) {
      semaphore = Effect.runSync(Effect.makeSemaphore(1));
      this._moduleSemaphores.set(moduleId, semaphore);
    }
    return semaphore;
  }

  private _loadModule = (module: Plugin.PluginModule): Effect.Effect<Capability.Any[], Error> =>
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

        const loadEffect = Effect.gen(this, function* () {
          log('loading module', { module: module.id });
          const [duration, capabilities] = yield* module
            .activate()
            .pipe(Effect.provideService(Capability.PluginContextService, this.context), Effect.timed);
          const normalized = capabilities == null ? [] : Array.isArray(capabilities) ? capabilities : [capabilities];
          log('loaded module', {
            module: module.id,
            elapsed: Duration.toMillis(duration),
            failed: false,
          });
          return normalized as Capability.Any[];
        }).pipe(
          Effect.withSpan('PluginManager._loadModule'),
          together(
            Effect.sleep(Duration.seconds(10)).pipe(
              Effect.andThen(
                Effect.sync(() => log.warn(`module is taking a long time to activate`, { module: module.id })),
              ),
            ),
          ),
        );

        // Fork the load to run in background, completing the deferred when done.
        yield* Effect.forkDaemon(
          loadEffect.pipe(
            Effect.tap((result) => Deferred.succeed(deferred, result)),
            Effect.catchAll((error) => {
              log.error('module failed to activate', { module: module.id, error });
              return Deferred.fail(deferred, error);
            }),
          ),
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
      capabilities.forEach((capability) => {
        this.context.contributeCapability({ module: module.id, ...capability });
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
          this.context.removeCapability(capability.interface, capability.implementation);
          const program = capability.deactivate?.() ?? Effect.succeed(undefined);
          yield* program;
        }
        this._capabilities.delete(id);
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

export class Service extends Context.Tag('PluginService')<Service, PluginManager>() {
  static fromManager = (manager: PluginManager) => Layer.succeed(Service, manager);
}

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
