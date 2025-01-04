//
// Copyright 2025 DXOS.org
//

import { type MaybePromise } from '@dxos/util';

import { type ActivationEvent, type AnyContribution, type Plugin, type PluginModule, PluginsContext } from './plugin';

export const eventKey = (event: ActivationEvent) => (event.specifier ? `${event.id}:${event.specifier}` : event.id);

type PluginManagerOptions = {
  pluginLoader: (id: string) => MaybePromise<Plugin>;
  plugins?: Plugin[];
};

export class PluginManager {
  private readonly _context = new PluginsContext({
    activate: (event) => this.activate(event),
    reset: (id) => this.reset(id),
  });

  private readonly _pluginLoader: PluginManagerOptions['pluginLoader'];
  private readonly _plugins = new Map<string, Plugin>();
  private readonly _modules = new Map<string, PluginModule>();
  private readonly _activated = new Map<string, AnyContribution[]>();
  private readonly _fired = new Set<string>();
  private readonly _pendingReset = new Set<string>();

  constructor({ pluginLoader, plugins = [] }: PluginManagerOptions) {
    this._pluginLoader = pluginLoader;
    plugins.forEach((plugin) => this._registerPlugin(plugin));
  }

  get context() {
    return this._context;
  }

  get modules() {
    return Array.from(this._modules.values());
  }

  get activated() {
    return Array.from(this._activated.keys());
  }

  get pendingReset() {
    return Array.from(this._pendingReset);
  }

  /**
   * Adds a plugin to the manager via the plugin loader.
   * @param id The ID of the plugin.
   */
  async add(id: string) {
    const plugin = await this._pluginLoader(id);
    this._registerPlugin(plugin);
    plugin.modules.forEach((module) => this._setPendingResetByModule(module));
  }

  /**
   * Removes a plugin from the manager.
   * @param id The ID of the plugin.
   */
  async remove(id: string) {
    const deactivated = await this.deactivate(id);
    if (deactivated) {
      const plugin = this._plugins.get(id);
      this._plugins.delete(id);
      plugin?.modules.forEach((module) => this._modules.delete(module.id));
    }

    return deactivated;
  }

  /**
   * Activates plugins based on the activation event.
   * @param event The activation event.
   * @returns Whether the activation was successful.
   */
  async activate(event: ActivationEvent) {
    return this._activate(eventKey(event));
  }

  /**
   * Deactivates all of the modules for a plugin.
   * @param id The ID of the plugin.
   * @returns Whether the deactivation was successful.
   */
  async deactivate(id: string) {
    const plugin = this._plugins.get(id);
    if (!plugin) {
      return false;
    }

    const results = await Promise.all(plugin.modules.map((module) => this._deactivate(module.id)));
    return results.every((result) => result);
  }

  /**
   * Re-activates the modules that were activated by the event.
   * @param event The activation event.
   * @returns Whether the reset was successful.
   */
  async reset(event: ActivationEvent) {
    const key = eventKey(event);
    const modules = this._getActiveModulesByEvent(key);
    const results = await Promise.all(modules.map((module) => this._deactivate(module.id, true)));
    if (results.every((result) => result)) {
      return this._activate(key);
    } else {
      return false;
    }
  }

  private _registerPlugin(plugin: Plugin) {
    plugin.modules.forEach((module) => this._modules.set(module.id, module));
    this._plugins.set(plugin.meta.id, plugin);
  }

  private _getActiveModules() {
    return this.modules.filter((module) => this._activated.has(module.id));
  }

  private _getInactiveModules() {
    return this.modules.filter((module) => !this._activated.has(module.id));
  }

  private _getActiveModulesByEvent(eventKey: string) {
    return this._getActiveModules().filter((module) => module.activationEvents.includes(eventKey));
  }

  private _getInactiveModulesByEvent(eventKey: string) {
    return this._getInactiveModules().filter((module) => module.activationEvents.includes(eventKey));
  }

  private _setPendingResetByModule(module: PluginModule) {
    const activationEvents = module.activationEvents.filter((event) => this._fired.has(event));
    const parentEvents = activationEvents.flatMap((event) => {
      const modules = this._getActiveModules().filter((module) => module.dependentEvents?.includes(event));
      return modules.flatMap((module) => module.activationEvents);
    });

    [...activationEvents, ...parentEvents].forEach((event) => this._pendingReset.add(event));
  }

  // TODO(wittjosiah): Use Effect.
  private async _activate(key: string) {
    this._pendingReset.delete(key);
    const modules = this._getInactiveModulesByEvent(key);
    if (modules.length === 0) {
      return false;
    }

    await Promise.all(
      modules.map(async (module) => {
        await Promise.all(module.dependentEvents?.map((event) => this._activate(event)) ?? []);

        const maybeContributions = (await module.activate?.(this._context)) ?? [];
        const contributions = Array.isArray(maybeContributions)
          ? await Promise.all(maybeContributions)
          : [await maybeContributions];
        await Promise.all(
          contributions.map(async (contribution) => {
            this._context.contributeCapability(contribution.interface, contribution.implementation);
          }),
        );

        this._activated.set(module.id, contributions);

        await Promise.all(module.triggeredEvents?.map((event) => this._activate(event)) ?? []);
      }),
    );

    this._fired.add(key);

    return true;
  }

  private async _deactivate(id: string, resetting = false) {
    const module = this._modules.get(id);
    if (!module) {
      return false;
    }

    const contributions = this._activated.get(id);
    if (contributions) {
      resetting || this._setPendingResetByModule(module);
      await module.deactivate?.(this._context);
      contributions.forEach((contribution) => {
        this._context.removeCapability(contribution.interface, contribution.implementation);
      });
      this._activated.delete(id);
    }

    return true;
  }
}
