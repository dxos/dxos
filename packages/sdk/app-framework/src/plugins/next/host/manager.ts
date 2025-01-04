//
// Copyright 2025 DXOS.org
//

import { type MaybePromise } from '@dxos/util';

import { type AnyContribution, type Plugin, PluginsContext, type PluginMeta, type ActivationEvent } from './plugin';

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
  private readonly _activated = new Map<string, AnyContribution[]>();
  private readonly _fired = new Set<string>();
  private readonly _pendingReset = new Set<string>();

  constructor({ pluginLoader, plugins = [] }: PluginManagerOptions) {
    this._pluginLoader = pluginLoader;
    plugins.forEach((plugin) => this._plugins.set(plugin.meta.id, plugin));
  }

  get context() {
    return this._context;
  }

  get plugins() {
    return Array.from(this._plugins.values());
  }

  get activated() {
    return Array.from(this._activated.keys());
  }

  get pendingReset() {
    return Array.from(this._pendingReset);
  }

  async add(id: string) {
    const plugin = await this._pluginLoader(id);
    this._plugins.set(id, plugin);
    this._setPendingResetByPlugin(plugin.meta);
  }

  async remove(id: string) {
    const deactivated = await this.deactivate(id);
    if (deactivated) {
      this._plugins.delete(id);
    }

    return deactivated;
  }

  async activate(event: ActivationEvent) {
    return this._activate(eventKey(event));
  }

  async deactivate(id: string, resetting = false) {
    const plugin = this._plugins.get(id);
    if (!plugin) {
      return false;
    }

    const contributions = this._activated.get(id);
    if (contributions) {
      resetting || this._setPendingResetByPlugin(plugin.meta);
      await plugin.deactivate?.(this._context);
      contributions.forEach((contribution) => {
        this._context.removeCapability(contribution.interface, contribution.implementation);
      });
      this._activated.delete(id);
    }

    return true;
  }

  async reset(event: ActivationEvent) {
    const key = eventKey(event);
    const plugins = this._getActivePluginsByEvent(key);
    const results = await Promise.all(plugins.map((plugin) => this.deactivate(plugin.meta.id, true)));
    if (results.every((result) => result)) {
      return this._activate(key);
    } else {
      return false;
    }
  }

  private _getActivePlugins() {
    return this.plugins.filter((plugin) => this._activated.has(plugin.meta.id));
  }

  private _getInactivePlugins() {
    return this.plugins.filter((plugin) => !this._activated.has(plugin.meta.id));
  }

  private _getActivePluginsByEvent(eventKey: string) {
    return this._getActivePlugins().filter((plugin) => plugin.meta.activationEvents.includes(eventKey));
  }

  private _getInactivePluginsByEvent(eventKey: string) {
    return this._getInactivePlugins().filter((plugin) => plugin.meta.activationEvents.includes(eventKey));
  }

  private _setPendingResetByPlugin(meta: PluginMeta) {
    const activationEvents = meta.activationEvents.filter((event) => this._fired.has(event));
    const parentEvents = activationEvents.flatMap((event) => {
      const plugins = this._getActivePlugins().filter((plugin) => plugin.meta.dependentEvents?.includes(event));
      return plugins.flatMap((plugin) => plugin.meta.activationEvents);
    });

    [...activationEvents, ...parentEvents].forEach((event) => this._pendingReset.add(event));
  }

  // TODO(wittjosiah): Use Effect.
  private async _activate(key: string) {
    this._pendingReset.delete(key);
    const plugins = this._getInactivePluginsByEvent(key);
    if (plugins.length === 0) {
      return false;
    }

    await Promise.all(
      plugins.map(async (plugin) => {
        await Promise.all(plugin.meta.dependentEvents?.map((event) => this._activate(event)) ?? []);

        const maybeContributions = (await plugin.activate?.(this._context)) ?? [];
        const contributions = Array.isArray(maybeContributions)
          ? await Promise.all(maybeContributions)
          : [await maybeContributions];
        await Promise.all(
          contributions.map(async (contribution) => {
            this._context.contributeCapability(contribution.interface, contribution.implementation);
          }),
        );

        this._activated.set(plugin.meta.id, contributions);

        await Promise.all(plugin.meta.triggeredEvents?.map((event) => this._activate(event)) ?? []);
      }),
    );

    this._fired.add(key);

    return true;
  }
}
