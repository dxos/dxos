//
// Copyright 2025 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { untracked } from '@preact/signals-core';
import * as Array from 'effect/Array';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Function from 'effect/Function';
import * as HashSet from 'effect/HashSet';
import * as Match from 'effect/Match';
import * as Ref from 'effect/Ref';

import { Event } from '@dxos/async';
import { runAndForwardErrors } from '@dxos/effect';
import { type Live, live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { type MaybePromise } from '@dxos/util';

import { type AnyCapability, PluginContext } from './capabilities';
import { type ActivationEvent, eventKey, getEvents, isAllOf } from './events';
import { type Plugin, type PluginModule } from './plugin';

// TODO(wittjosiah): Factor out?
const isPromise = (value: unknown): value is Promise<unknown> => {
  return value !== null && typeof value === 'object' && 'then' in value;
};

export type PluginManagerOptions = {
  pluginLoader: (id: string) => MaybePromise<Plugin>;
  plugins?: Plugin[];
  core?: string[];
  enabled?: string[];
  registry?: Registry.Registry;
};

type PluginManagerState = {
  // Plugins
  plugins: Plugin[];
  core: string[];
  enabled: string[];

  // Modules
  modules: PluginModule[];
  active: string[];

  // Events
  eventsFired: string[];
  pendingReset: string[];
};

export class PluginManager {
  readonly activation = new Event<{ event: string; state: 'activating' | 'activated' | 'error'; error?: any }>();
  readonly context: PluginContext;
  readonly registry: Registry.Registry;

  // TODO(wittjosiah): Replace with Atom.
  private readonly _state: Live<PluginManagerState>;
  private readonly _pluginLoader: PluginManagerOptions['pluginLoader'];
  private readonly _capabilities = new Map<string, AnyCapability[]>();
  private readonly _moduleMemoMap = new Map<PluginModule['id'], Promise<AnyCapability[]>>();
  private readonly _activatingEvents = Effect.runSync(Ref.make<string[]>([]));
  private readonly _activatingModules = Effect.runSync(Ref.make<string[]>([]));

  constructor({
    pluginLoader,
    plugins = [],
    core = plugins.map(({ meta }) => meta.id),
    enabled = [],
    registry,
  }: PluginManagerOptions) {
    this.registry = registry ?? Registry.make();
    this.context = new PluginContext({
      registry: this.registry,
      activate: (event) => this._activate(event),
      reset: (id) => this._reset(id),
    });

    this._pluginLoader = pluginLoader;
    this._state = live({
      plugins,
      core,
      enabled,
      modules: [],
      active: [],
      eventsFired: [],
      pendingReset: [],
    });
    plugins.forEach((plugin) => this._addPlugin(plugin));
    core.forEach((id) => this.enable(id));
    enabled.forEach((id) => this.enable(id));
  }

  /**
   * Plugins that are currently registered.
   *
   * @reactive
   */
  get plugins(): Live<readonly Plugin[]> {
    return this._state.plugins;
  }

  /**
   * Ids of plugins that are core and cannot be removed.
   *
   * @reactive
   */
  get core(): Live<readonly string[]> {
    return this._state.core;
  }

  /**
   * Ids of plugins that are currently enabled.
   *
   * @reactive
   */
  get enabled(): Live<readonly string[]> {
    return this._state.enabled;
  }

  /**
   * Modules of plugins which are currently enabled.
   *
   * @reactive
   */
  get modules(): Live<readonly PluginModule[]> {
    return this._state.modules;
  }

  /**
   * Ids of modules which are currently active.
   *
   * @reactive
   */
  get active(): Live<readonly string[]> {
    return this._state.active;
  }

  /**
   * Ids of events which have been fired.
   *
   * @reactive
   */
  get eventsFired(): Live<readonly string[]> {
    return this._state.eventsFired;
  }

  /**
   * Ids of modules which are pending reset.
   *
   * @reactive
   */
  get pendingReset(): Live<readonly string[]> {
    return this._state.pendingReset;
  }

  /**
   * Adds a plugin to the manager via the plugin loader.
   * @param id The id of the plugin.
   */
  async add(id: string): Promise<boolean> {
    return untracked(async () => {
      log('add plugin', { id });
      const plugin = await this._pluginLoader(id);
      this._addPlugin(plugin);
      return this.enable(id);
    });
  }

  /**
   * Enables a plugin.
   * @param id The id of the plugin.
   */
  enable(id: string): Promise<boolean> {
    return untracked(async () => {
      log('enable plugin', { id });
      const plugin = this._getPlugin(id);
      if (!plugin) {
        return false;
      }

      if (!this._state.enabled.includes(id)) {
        this._state.enabled.push(id);
      }

      plugin.modules.forEach((module) => {
        this._addModule(module);
        this._setPendingResetByModule(module);
      });

      log('pending reset', { events: [...this.pendingReset] });
      await runAndForwardErrors(
        Effect.all(
          this.pendingReset.map((event) => this._activate(event)),
          { concurrency: 'unbounded' },
        ),
      );

      return true;
    });
  }

  /**
   * Removes a plugin from the manager.
   * @param id The id of the plugin.
   */
  remove(id: string): boolean {
    return untracked(() => {
      log('remove plugin', { id });
      const result = this.disable(id);
      if (!result) {
        return false;
      }

      this._removePlugin(id);
      return true;
    });
  }

  /**
   * Disables a plugin.
   * @param id The id of the plugin.
   */
  disable(id: string): Promise<boolean> {
    return untracked(async () => {
      log('disable plugin', { id });
      if (this._state.core.includes(id)) {
        return false;
      }

      const plugin = this._getPlugin(id);
      if (!plugin) {
        return false;
      }

      const enabledIndex = this._state.enabled.findIndex((enabled) => enabled === id);
      if (enabledIndex !== -1) {
        this._state.enabled.splice(enabledIndex, 1);
        await runAndForwardErrors(this._deactivate(id));

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
  activate(event: ActivationEvent | string): Promise<boolean> {
    return untracked(() => runAndForwardErrors(this._activate(event)));
  }

  /**
   * Deactivates all of the modules for a plugin.
   * @param id The id of the plugin.
   * @returns Whether the deactivation was successful.
   */
  deactivate(id: string): Promise<boolean> {
    return untracked(() => runAndForwardErrors(this._deactivate(id)));
  }

  /**
   * Re-activates the modules that were activated by the event.
   * @param event The activation event.
   * @returns Whether the reset was successful.
   */
  reset(event: ActivationEvent | string): Promise<boolean> {
    return untracked(() => runAndForwardErrors(this._reset(event)));
  }

  private _addPlugin(plugin: Plugin): void {
    untracked(() => {
      log('add plugin', { id: plugin.meta.id });
      // TODO(wittjosiah): Find a way to add a warning for duplicate plugins that doesn't cause log spam.
      if (!this._state.plugins.includes(plugin)) {
        this._state.plugins.push(plugin);
      }
    });
  }

  private _removePlugin(id: string): void {
    untracked(() => {
      log('remove plugin', { id });
      const pluginIndex = this._state.plugins.findIndex((plugin) => plugin.meta.id === id);
      if (pluginIndex !== -1) {
        this._state.plugins.splice(pluginIndex, 1);
      }
    });
  }

  private _addModule(module: PluginModule): void {
    untracked(() => {
      log('add module', { id: module.id });
      // TODO(wittjosiah): Find a way to add a warning for duplicate modules that doesn't cause log spam.
      if (!this._state.modules.includes(module)) {
        this._state.modules.push(module);
      }
    });
  }

  private _removeModule(id: string): void {
    untracked(() => {
      log('remove module', { id });
      const moduleIndex = this._state.modules.findIndex((module) => module.id === id);
      if (moduleIndex !== -1) {
        this._state.modules.splice(moduleIndex, 1);
      }
    });
  }

  private _getPlugin(id: string): Plugin | undefined {
    return this._state.plugins.find((plugin) => plugin.meta.id === id);
  }

  private _getActiveModules(): PluginModule[] {
    return this._state.modules.filter((module) => this._state.active.includes(module.id));
  }

  private _getInactiveModules(): PluginModule[] {
    return this._state.modules.filter((module) => !this._state.active.includes(module.id));
  }

  private _getActiveModulesByEvent(key: string): PluginModule[] {
    return this._getActiveModules().filter((module) => getEvents(module.activatesOn).map(eventKey).includes(key));
  }

  private _getInactiveModulesByEvent(key: string): PluginModule[] {
    return this._getInactiveModules().filter((module) => getEvents(module.activatesOn).map(eventKey).includes(key));
  }

  private _setPendingResetByModule(module: PluginModule): void {
    return untracked(() => {
      const activationEvents = getEvents(module.activatesOn)
        .map(eventKey)
        .filter((key) => this._state.eventsFired.includes(key));

      const pendingReset = Array.fromIterable(new Set(activationEvents)).filter(
        (event) => !this._state.pendingReset.includes(event),
      );
      if (pendingReset.length > 0) {
        log('pending reset', { events: pendingReset });
        this._state.pendingReset.push(...pendingReset);
      }
    });
  }

  /**
   * @internal
   */
  // TODO(wittjosiah): Improve error typing.
  _activate(
    event: ActivationEvent | string,
    params?: { before?: string; after?: string },
  ): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      const key = typeof event === 'string' ? event : eventKey(event);
      log('activating', { key, ...params });
      yield* Ref.update(this._activatingEvents, (activating) => Array.append(activating, key));
      const pendingIndex = this._state.pendingReset.findIndex((event) => event === key);
      if (pendingIndex !== -1) {
        this._state.pendingReset.splice(pendingIndex, 1);
      }

      const activatingEvents = yield* this._activatingEvents;
      const activatingModules = yield* this._activatingModules;
      const modules = this._getInactiveModulesByEvent(key).filter((module) => {
        const allOf = isAllOf(module.activatesOn);
        if (!allOf) {
          return true;
        }

        // Check to see if all of the events in the `allOf` have been fired.
        // An event can be considered "fired" if it is in the `eventsFired` list or if it is currently being activated.
        const events = module.activatesOn.events.filter((event) => eventKey(event) !== key);
        return (
          events.every(
            (event) => this._state.eventsFired.includes(eventKey(event)) || activatingEvents.includes(eventKey(event)),
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
        if (!this._state.eventsFired.includes(key)) {
          this._state.eventsFired.push(key);
        }
        return false;
      }

      log('activating modules', { key, modules: modules.map((module) => module.id) });
      this.activation.emit({ event: key, state: 'activating' });

      // Fire activatesBefore events.
      yield* Function.pipe(
        modules,
        Array.flatMap((module) => module.activatesBefore ?? []),
        HashSet.fromIterable,
        HashSet.toValues,
        Array.filter((event) => !activatingEvents.includes(eventKey(event))),
        Array.map((event) => this._activate(event, { before: key })),
        Effect.allWith({ concurrency: 'unbounded' }),
      );

      // Concurrently triggers loading of lazy capabilities.
      const getCapabilities = yield* Function.pipe(
        modules,
        Array.map((mod) => this._loadModule(mod)),
        Effect.allWith({ concurrency: 'unbounded' }),
        Effect.catchAll((error) => {
          this.activation.emit({ event: key, state: 'error', error });
          return Effect.fail(error);
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
      yield* Function.pipe(
        modules,
        Array.flatMap((module) => module.activatesAfter ?? []),
        HashSet.fromIterable,
        HashSet.toValues,
        Array.filter((event) => !activatingEvents.includes(eventKey(event))),
        Array.map((event) => this._activate(event, { after: key })),
        Effect.allWith({ concurrency: 'unbounded' }),
      );

      yield* Ref.update(this._activatingEvents, (activating) => Array.filter(activating, (event) => event !== key));
      yield* Ref.update(this._activatingModules, (activating) =>
        Array.filter(activating, (module) => !modules.map((module) => module.id).includes(module)),
      );

      if (!this._state.eventsFired.includes(key)) {
        this._state.eventsFired.push(key);
      }

      this.activation.emit({ event: key, state: 'activated' });
      log('activated', { key });

      return true;
    });
  }

  // Memoized with _moduleMemoMap
  private _loadModule = (mod: PluginModule): Effect.Effect<AnyCapability[], Error> =>
    Effect.tryPromise({
      try: async () => {
        const entry = this._moduleMemoMap.get(mod.id);
        if (entry) {
          return entry;
        }

        const promise = (async () => {
          const start = performance.now();
          let failed = false;
          try {
            log('loading module', { module: mod.id });
            // TODO(wittjosiah): Support activation with an effect.
            let activationResult = await mod.activate(this.context);
            if (typeof activationResult === 'function') {
              activationResult = await activationResult();
            }
            return Array.isArray(activationResult) ? activationResult : [activationResult];
          } catch (error) {
            failed = true;
            log.catch(error);
            throw error;
          } finally {
            performance.measure('activate-module', {
              start,
              end: performance.now(),
              detail: {
                module: mod.id,
              },
            });
            log('loaded module', { module: mod.id, elapsed: performance.now() - start, failed });
          }
        })();
        this._moduleMemoMap.set(mod.id, promise);
        return promise;
      },
      catch: (error) => error as Error,
    }).pipe(
      Effect.withSpan('PluginManager._loadModule'),
      together(
        Effect.sleep(Duration.seconds(10)).pipe(
          Effect.andThen(Effect.sync(() => log.warn(`module is taking a long time to activate`, { module: mod.id }))),
        ),
      ),
    );

  private _contributeCapabilities(module: PluginModule, capabilities: AnyCapability[]): Effect.Effect<void, Error> {
    return Effect.gen(this, function* () {
      capabilities.forEach((capability) => {
        this.context.contributeCapability({ module: module.id, ...capability });
      });
      this._state.active.push(module.id);
      this._capabilities.set(module.id, capabilities);
    });
  }

  private _deactivate(id: string): Effect.Effect<boolean, Error> {
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

  private _deactivateModule(module: PluginModule): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      const id = module.id;
      log('deactivating', { id });
      this._moduleMemoMap.delete(id);

      const capabilities = this._capabilities.get(id);
      if (capabilities) {
        for (const capability of capabilities) {
          this.context.removeCapability(capability.interface, capability.implementation);
          const program = capability.deactivate?.();
          yield* Match.value(program).pipe(
            Match.when(Effect.isEffect, (effect) => effect),
            Match.when(isPromise, (promise) =>
              Effect.tryPromise({
                try: () => promise,
                catch: (error) => error as Error,
              }),
            ),
            Match.orElse((program) => Effect.succeed(program)),
          );
        }
        this._capabilities.delete(id);
      }

      const activeIndex = this._state.active.findIndex((event) => event === id);
      if (activeIndex !== -1) {
        this._state.active.splice(activeIndex, 1);
      }

      log('deactivated', { id });
      return true;
    });
  }

  private _reset(event: ActivationEvent | string): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      const key = typeof event === 'string' ? event : eventKey(event);
      log('reset', { key });
      const modules = this._getActiveModulesByEvent(key);
      const results = yield* Effect.all(
        modules.map((module) => this._deactivateModule(module)),
        { concurrency: 'unbounded' },
      );

      if (results.every((result) => result)) {
        return yield* this._activate(key);
      } else {
        return false;
      }
    });
  }
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
