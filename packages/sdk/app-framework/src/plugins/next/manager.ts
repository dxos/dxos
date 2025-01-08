//
// Copyright 2025 DXOS.org
//

import { untracked } from '@preact/signals-core';

import { Event } from '@dxos/async';
import { create, type ReactiveObject } from '@dxos/live-object';
import { log } from '@dxos/log';
import { type MaybePromise } from '@dxos/util';

import { type ActivationEvent, type AnyCapability, type Plugin, type PluginModule, PluginsContext } from './plugin';

export const eventKey = (event: ActivationEvent) => (event.specifier ? `${event.id}:${event.specifier}` : event.id);

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
   */
  get plugins(): readonly Plugin[] {
    return this._state.plugins;
  }

  /**
   * Ids of plugins that are core and cannot be removed.
   */
  get core(): readonly string[] {
    return this._state.core;
  }

  /**
   * Ids of plugins that are currently enabled.
   */
  get enabled(): readonly string[] {
    return this._state.enabled;
  }

  /**
   * Modules of plugins which are currently enabled.
   */
  get modules(): readonly PluginModule[] {
    return this._state.modules;
  }

  /**
   * Ids of modules which are currently active.
   */
  get active(): readonly string[] {
    return this._state.active;
  }

  /**
   * Ids of modules which are pending removal.
   */
  get pendingRemoval(): readonly string[] {
    return this._state.pendingRemoval;
  }

  /**
   * Ids of events which have been fired.
   */
  get eventsFired(): readonly string[] {
    return this._state.eventsFired;
  }

  /**
   * Ids of modules which are pending reset.
   */
  get pendingReset(): readonly string[] {
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
  // TODO(wittjosiah): Use Effect.
  async activate(event: ActivationEvent | string): Promise<boolean> {
    return untracked(async () => {
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
      try {
        await Promise.all(
          modules.map(async (module) => {
            await Promise.all(module.dependentEvents?.map((event) => this.activate(event)) ?? []);

            const maybeCapabilities = (await module.activate?.(this.context)) ?? [];
            const capabilities = Array.isArray(maybeCapabilities)
              ? await Promise.all(maybeCapabilities)
              : [await maybeCapabilities];
            await Promise.all(
              capabilities.map(async (capability) => {
                return this.context.contributeCapability(capability.interface, capability.implementation);
              }),
            );

            this._state.active.push(module.id);
            this._capabilities.set(module.id, capabilities);

            await Promise.all(module.triggeredEvents?.map((event) => this.activate(event)) ?? []);
          }),
        );

        if (!this._state.eventsFired.includes(key)) {
          this._state.eventsFired.push(key);
        }

        this.activation.emit({ event: key, state: 'activated' });
        log('activated', { key });
      } catch (err: any) {
        this.activation.emit({ event: key, state: 'error', error: err });
        throw err;
      }

      return true;
    });
  }

  /**
   * Deactivates all of the modules for a plugin.
   * @param id The id of the plugin.
   * @returns Whether the deactivation was successful.
   */
  async deactivate(id: string): Promise<boolean> {
    return untracked(async () => {
      log('deactivate plugin', { id });
      const plugin = this._getPlugin(id);
      if (!plugin) {
        return false;
      }

      const results = await Promise.all(plugin.modules.map((module) => this._deactivate(module.id)));
      return results.every((result) => result);
    });
  }

  /**
   * Re-activates the modules that were activated by the event.
   * @param event The activation event.
   * @returns Whether the reset was successful.
   */
  async reset(event: ActivationEvent): Promise<boolean> {
    return untracked(async () => {
      const key = eventKey(event);
      log('reset', { key });
      const modules = this._getActiveModulesByEvent(key);
      const results = await Promise.all(modules.map((module) => this._deactivate(module.id)));

      if (this._state.pendingRemoval.length > 0) {
        this._state.pendingRemoval.forEach((id) => {
          this._removeModule(id);
        });
        this._state.pendingRemoval.splice(0, this._state.pendingRemoval.length);
      }

      if (results.every((result) => result)) {
        return this.activate(key);
      } else {
        return false;
      }
    });
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

  private _getModule(id: string) {
    return this._state.modules.find((module) => module.id === id);
  }

  private _getActiveModules() {
    return this._state.modules.filter((module) => this._state.active.includes(module.id));
  }

  private _getInactiveModules() {
    return this._state.modules.filter((module) => !this._state.active.includes(module.id));
  }

  private _getActiveModulesByEvent(eventKey: string) {
    return this._getActiveModules().filter((module) => module.activationEvents.includes(eventKey));
  }

  private _getInactiveModulesByEvent(eventKey: string) {
    return this._getInactiveModules().filter((module) => module.activationEvents.includes(eventKey));
  }

  private _setPendingResetByModule(module: PluginModule) {
    return untracked(() => {
      const activationEvents = module.activationEvents.filter((event) => this._state.eventsFired.includes(event));
      const parentEvents = activationEvents.flatMap((event) => {
        const modules = this._getActiveModules().filter((module) => module.dependentEvents?.includes(event));
        return modules.flatMap((module) => module.activationEvents);
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

  private async _deactivate(id: string) {
    return untracked(async () => {
      log('deactivating', { id });
      const module = this._getModule(id);
      if (!module) {
        log('module not found', { id });
        return false;
      }

      await module.deactivate?.(this.context);

      const capabilities = this._capabilities.get(id);
      if (capabilities) {
        capabilities.forEach((capability) => {
          this.context.removeCapability(capability.interface, capability.implementation);
        });
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
}
