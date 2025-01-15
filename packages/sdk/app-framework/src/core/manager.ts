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

  constructor({ pluginLoader, plugins = [], core = [], enabled = [] }: PluginManagerOptions) {
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
  enable(id: string): boolean {
    return untracked(() => {
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
  disable(id: string): boolean {
    return untracked(() => {
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

        plugin.modules.forEach((module) => {
          if (this._state.active.includes(module.id)) {
            this._setPendingResetByModule(module);
            if (!this._state.pendingRemoval.includes(module.id)) {
              this._state.pendingRemoval.push(module.id);
            }
          } else {
            this._removeModule(module.id);
          }
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
      const parentEvents = activationEvents.flatMap((event) => {
        const modules = this._getActiveModules().filter((module) => module.dependsOn?.map(eventKey).includes(event));
        return modules.flatMap((module) => getEvents(module.activatesOn)).map(eventKey);
      });

      const pendingReset = Array.from(new Set([...activationEvents, ...parentEvents])).filter(
        (event) => !this._state.pendingReset.includes(event),
      );
      if (pendingReset.length > 0) {
        log('pending reset', { events: pendingReset });
        this._state.pendingReset.push(...pendingReset);
      }
    });
  }

  // TODO(wittjosiah): Improve error typing.
  private _activate(event: ActivationEvent | string): Effect.Effect<boolean, Error> {
    const self = this;
    return Effect.gen(function* () {
      const key = typeof event === 'string' ? event : eventKey(event);
      log('activating', { key });
      const pendingIndex = self._state.pendingReset.findIndex((event) => event === key);
      if (pendingIndex !== -1) {
        self._state.pendingReset.splice(pendingIndex, 1);
      }

      const modules = self._getInactiveModulesByEvent(key);
      if (modules.length === 0) {
        log('no modules to activate', { key });
        return false;
      }

      self.activation.emit({ event: key, state: 'activating' });

      for (const module of modules) {
        if (
          isAllOf(module.activatesOn) &&
          !module.activatesOn.events
            .filter((event) => eventKey(event) !== key)
            .every((event) => self._state.eventsFired.includes(eventKey(event)))
        ) {
          continue;
        }

        yield* Effect.all(module.dependsOn?.map((event) => self._activate(event)) ?? []);

        const result = yield* self._activateModule(module).pipe(Effect.either);
        if (Either.isLeft(result)) {
          self.activation.emit({ event: key, state: 'error', error: result.left });
          yield* Effect.fail(result.left);
        }

        yield* Effect.all(module.triggers?.map((event) => self._activate(event)) ?? []);
      }

      if (!self._state.eventsFired.includes(key)) {
        self._state.eventsFired.push(key);
      }

      self.activation.emit({ event: key, state: 'activated' });
      log('activated', { key });

      return true;
    });
  }

  private _activateModule(module: PluginModule): Effect.Effect<void, Error> {
    const self = this;
    return Effect.gen(function* () {
      // TODO(wittjosiah): This is not handling errors thrown if this is synchronous.
      const program = module.activate(self.context);
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
        self.context.contributeCapability({ module: module.id, ...capability });
      });
      self._state.active.push(module.id);
      self._capabilities.set(module.id, capabilities);
    });
  }

  private _deactivate(id: string): Effect.Effect<boolean, Error> {
    const self = this;
    return Effect.gen(function* () {
      const plugin = self._getPlugin(id);
      if (!plugin) {
        return false;
      }

      const modules = plugin.modules;
      const results = yield* Effect.all(modules.map((module) => self._deactivateModule(module)));
      return results.every((result) => result);
    });
  }

  private _deactivateModule(module: PluginModule): Effect.Effect<boolean, Error> {
    const self = this;
    return Effect.gen(function* () {
      const id = module.id;
      log('deactivating', { id });

      const capabilities = self._capabilities.get(id);
      if (capabilities) {
        for (const capability of capabilities) {
          self.context.removeCapability(capability.interface, capability.implementation);
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
        self._capabilities.delete(id);
      }

      const activeIndex = self._state.active.findIndex((event) => event === id);
      if (activeIndex !== -1) {
        self._state.active.splice(activeIndex, 1);
      }

      log('deactivated', { id });
      return true;
    });
  }

  private _reset(event: ActivationEvent | string): Effect.Effect<boolean, Error> {
    const self = this;
    return Effect.gen(function* () {
      const key = typeof event === 'string' ? event : eventKey(event);
      log('reset', { key });
      const modules = self._getActiveModulesByEvent(key);
      const results = yield* Effect.all(modules.map((module) => self._deactivateModule(module)));

      if (self._state.pendingRemoval.length > 0) {
        self._state.pendingRemoval.forEach((id) => {
          self._removeModule(id);
        });
        self._state.pendingRemoval.splice(0, self._state.pendingRemoval.length);
      }

      if (results.every((result) => result)) {
        return yield* self._activate(key);
      } else {
        return false;
      }
    });
  }
}
