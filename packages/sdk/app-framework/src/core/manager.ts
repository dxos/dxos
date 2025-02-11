//
// Copyright 2025 DXOS.org
//

import { untracked } from '@preact/signals-core';
import { Effect, Either, Match } from 'effect';

import { Event } from '@dxos/async';
import { create, type ReactiveObject } from '@dxos/live-object';
import { log } from '@dxos/log';
import { type MaybePromise } from '@dxos/util';

import { type AnyCapability, PluginsContext } from './capabilities';
import { type ActivationEvent, eventKey, getEvents, isAllOf } from './events';
import { type PluginModule, type Plugin } from './plugin';

// TODO(wittjosiah): Factor out?
const isPromise = (value: unknown): value is Promise<unknown> => {
  return value !== null && typeof value === 'object' && 'then' in value;
};

export type PluginManagerOptions = {
  pluginLoader: (id: string) => MaybePromise<Plugin>;
  plugins?: Plugin[];
  core?: string[];
  enabled?: string[];
};

type PluginManagerState = {
  // Plugins
  plugins: Plugin[];
  core: string[];
  enabled: string[];

  // Modules
  modules: PluginModule[];
  active: string[];
  pendingRemoval: string[];

  // Events
  eventsFired: string[];
  pendingReset: string[];
};

export class PluginManager {
  readonly activation = new Event<{ event: string; state: 'activating' | 'activated' | 'error'; error?: any }>();

  readonly context = new PluginsContext({
    activate: (event) => this.activate(event),
    reset: (id) => this.reset(id),
  });

  private readonly _state: ReactiveObject<PluginManagerState>;
  private readonly _pluginLoader: PluginManagerOptions['pluginLoader'];
  private readonly _capabilities = new Map<string, AnyCapability[]>();

  constructor({
    pluginLoader,
    plugins = [],
    core = plugins.map(({ meta }) => meta.id),
    enabled = [],
  }: PluginManagerOptions) {
    this._pluginLoader = pluginLoader;
    this._state = create({
      plugins,
      core,
      enabled,
      modules: [],
      active: [],
      pendingRemoval: [],
      pendingReset: [],
      eventsFired: [],
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
  get plugins(): ReactiveObject<readonly Plugin[]> {
    return this._state.plugins;
  }

  /**
   * Ids of plugins that are core and cannot be removed.
   *
   * @reactive
   */
  get core(): ReactiveObject<readonly string[]> {
    return this._state.core;
  }

  /**
   * Ids of plugins that are currently enabled.
   *
   * @reactive
   */
  get enabled(): ReactiveObject<readonly string[]> {
    return this._state.enabled;
  }

  /**
   * Modules of plugins which are currently enabled.
   *
   * @reactive
   */
  get modules(): ReactiveObject<readonly PluginModule[]> {
    return this._state.modules;
  }

  /**
   * Ids of modules which are currently active.
   *
   * @reactive
   */
  get active(): ReactiveObject<readonly string[]> {
    return this._state.active;
  }

  /**
   * Ids of modules which are pending removal.
   *
   * @reactive
   */
  get pendingRemoval(): ReactiveObject<readonly string[]> {
    return this._state.pendingRemoval;
  }

  /**
   * Ids of events which have been fired.
   *
   * @reactive
   */
  get eventsFired(): ReactiveObject<readonly string[]> {
    return this._state.eventsFired;
  }

  /**
   * Ids of modules which are pending reset.
   *
   * @reactive
   */
  get pendingReset(): ReactiveObject<readonly string[]> {
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
      await Effect.runPromise(Effect.all(this.pendingReset.map((event) => this._activate(event))));

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
        await Effect.runPromise(this._deactivate(id));

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
    return untracked(() => Effect.runPromise(this._activate(event)));
  }

  /**
   * Deactivates all of the modules for a plugin.
   * @param id The id of the plugin.
   * @returns Whether the deactivation was successful.
   */
  deactivate(id: string): Promise<boolean> {
    return untracked(() => Effect.runPromise(this._deactivate(id)));
  }

  /**
   * Re-activates the modules that were activated by the event.
   * @param event The activation event.
   * @returns Whether the reset was successful.
   */
  reset(event: ActivationEvent | string): Promise<boolean> {
    return untracked(() => Effect.runPromise(this._reset(event)));
  }

  /**
   * Calls reset on all pending reset events until there are none left.
   *
   * @deprecated
   */
  async resetAll(): Promise<void> {
    do {
      await Promise.all(this.pendingReset.map((event) => this.reset(event)));
    } while (this.pendingReset.length > 0);
  }

  private _addPlugin(plugin: Plugin) {
    untracked(() => {
      log('add plugin', { id: plugin.meta.id });
      if (!this._state.plugins.includes(plugin)) {
        this._state.plugins.push(plugin);
      }
    });
  }

  private _removePlugin(id: string) {
    untracked(() => {
      log('remove plugin', { id });
      const pluginIndex = this._state.plugins.findIndex((plugin) => plugin.meta.id === id);
      if (pluginIndex !== -1) {
        this._state.plugins.splice(pluginIndex, 1);
      }
    });
  }

  private _addModule(module: PluginModule) {
    untracked(() => {
      log('add module', { id: module.id });
      if (!this._state.modules.includes(module)) {
        this._state.modules.push(module);
      }
    });
  }

  private _removeModule(id: string) {
    untracked(() => {
      log('remove module', { id });
      const moduleIndex = this._state.modules.findIndex((module) => module.id === id);
      if (moduleIndex !== -1) {
        this._state.modules.splice(moduleIndex, 1);
      }
    });
  }

  private _getPlugin(id: string) {
    return this._state.plugins.find((plugin) => plugin.meta.id === id);
  }

  private _getActiveModules() {
    return this._state.modules.filter((module) => this._state.active.includes(module.id));
  }

  private _getInactiveModules() {
    return this._state.modules.filter((module) => !this._state.active.includes(module.id));
  }

  private _getActiveModulesByEvent(key: string) {
    return this._getActiveModules().filter((module) => getEvents(module.activatesOn).map(eventKey).includes(key));
  }

  private _getInactiveModulesByEvent(key: string) {
    return this._getInactiveModules().filter((module) => getEvents(module.activatesOn).map(eventKey).includes(key));
  }

  private _setPendingResetByModule(module: PluginModule) {
    return untracked(() => {
      const activationEvents = getEvents(module.activatesOn)
        .map(eventKey)
        .filter((key) => this._state.eventsFired.includes(key));

      const pendingReset = Array.from(new Set(activationEvents)).filter(
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
  _activate(event: ActivationEvent | string): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      const key = typeof event === 'string' ? event : eventKey(event);
      log('activating', { key });
      const pendingIndex = this._state.pendingReset.findIndex((event) => event === key);
      if (pendingIndex !== -1) {
        this._state.pendingReset.splice(pendingIndex, 1);
      }

      const modules = this._getInactiveModulesByEvent(key);
      if (modules.length === 0) {
        log('no modules to activate', { key });
        return false;
      }

      this.activation.emit({ event: key, state: 'activating' });

      log('activating modules', { key, modules: modules.map((module) => module.id) });
      for (const module of modules) {
        if (
          isAllOf(module.activatesOn) &&
          !module.activatesOn.events
            .filter((event) => eventKey(event) !== key)
            .every((event) => this._state.eventsFired.includes(eventKey(event)))
        ) {
          continue;
        }

        yield* Effect.all(module.activatesBefore?.map((event) => this._activate(event)) ?? []);

        log('activating module', { module: module.id });
        const result = yield* this._activateModule(module).pipe(Effect.either);
        if (Either.isLeft(result)) {
          this.activation.emit({ event: key, state: 'error', error: result.left });
          yield* Effect.fail(result.left);
        }
        log('activated module', { module: module.id });

        yield* Effect.all(module.activatesAfter?.map((event) => this._activate(event)) ?? []);
      }

      if (!this._state.eventsFired.includes(key)) {
        this._state.eventsFired.push(key);
      }

      this.activation.emit({ event: key, state: 'activated' });
      log('activated', { key });

      return true;
    });
  }

  private _activateModule(module: PluginModule): Effect.Effect<void, Error> {
    return Effect.gen(this, function* () {
      // TODO(wittjosiah): This is not handling errors thrown if this is synchronous.
      const program = module.activate(this.context);
      const maybeCapabilities = yield* Match.value(program).pipe(
        Match.when(Effect.isEffect, (effect) => effect),
        Match.when(isPromise, (promise) =>
          Effect.tryPromise({
            try: () => promise,
            catch: (error) => error as Error,
          }),
        ),
        Match.orElse((program) => Effect.succeed(program)),
      );
      const capabilities = Match.value(maybeCapabilities).pipe(
        Match.when(Array.isArray, (array) => array),
        Match.orElse((value) => [value]),
      );
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
      const results = yield* Effect.all(modules.map((module) => this._deactivateModule(module)));
      return results.every((result) => result);
    });
  }

  private _deactivateModule(module: PluginModule): Effect.Effect<boolean, Error> {
    return Effect.gen(this, function* () {
      const id = module.id;
      log('deactivating', { id });

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
      const results = yield* Effect.all(modules.map((module) => this._deactivateModule(module)));

      if (this._state.pendingRemoval.length > 0) {
        this._state.pendingRemoval.forEach((id) => {
          this._removeModule(id);
        });
        this._state.pendingRemoval.splice(0, this._state.pendingRemoval.length);
      }

      if (results.every((result) => result)) {
        return yield* this._activate(key);
      } else {
        return false;
      }
    });
  }
}
