//
// Copyright 2025 DXOS.org
//

import { Event } from '@dxos/async';
import { create, type ReactiveObject } from '@dxos/live-object';
import { log } from '@dxos/log';
import { type MaybePromise } from '@dxos/util';

import { type ActivationEvent, type AnyCapability, type Plugin, type PluginModule, PluginsContext } from './plugin';

export const eventKey = (event: ActivationEvent) => (event.specifier ? `${event.id}:${event.specifier}` : event.id);

type PluginManagerOptions = {
  pluginLoader: (id: string) => MaybePromise<Plugin>;
  plugins?: Plugin[];
  core?: string[];
};

export class PluginManager {
  readonly activation = new Event<{ event: string; state: 'activating' | 'activated' | 'error'; error?: any }>();

  private readonly _context = new PluginsContext({
    activate: (event) => this.activate(event),
    reset: (id) => this.reset(id),
  });

  private readonly _state: ReactiveObject<{
    core: string[];
    enabled: string[];
    active: string[];
    eventsFired: string[];
    pendingReset: string[];
  }>;

  private readonly _pluginLoader: PluginManagerOptions['pluginLoader'];
  private readonly _plugins = new Map<string, Plugin>();
  private readonly _modules = new Map<string, PluginModule>();
  private readonly _capabilities = new Map<string, AnyCapability[]>();

  constructor({ pluginLoader, plugins = [], core = [] }: PluginManagerOptions) {
    this._pluginLoader = pluginLoader;
    this._state = create({
      core,
      enabled: plugins.map((plugin) => plugin.meta.id),
      active: [],
      eventsFired: [],
      pendingReset: [],
    });
    plugins.forEach((plugin) => this._registerPlugin(plugin));
  }

  get context() {
    return this._context;
  }

  get enabled(): readonly string[] {
    return this._state.enabled;
  }

  get active(): readonly string[] {
    return this._state.active;
  }

  get pendingReset(): readonly string[] {
    return this._state.pendingReset;
  }

  /**
   * @internal
   */
  get modules(): readonly PluginModule[] {
    return Array.from(this._modules.values());
  }

  /**
   * Adds a plugin to the manager via the plugin loader.
   * @param id The ID of the plugin.
   */
  async add(id: string) {
    const plugin = await this._pluginLoader(id);
    this._registerPlugin(plugin);
    plugin.modules.forEach((module) => this._setPendingResetByModule(module));

    if (!this._state.enabled.includes(plugin.meta.id)) {
      this._state.enabled.push(plugin.meta.id);
    }
  }

  /**
   * Removes a plugin from the manager.
   * @param id The ID of the plugin.
   */
  async remove(id: string) {
    if (this._state.core.includes(id)) {
      return false;
    }

    const deactivated = await this.deactivate(id);
    if (!deactivated) {
      return false;
    }

    const plugin = this._plugins.get(id);
    this._plugins.delete(id);
    plugin?.modules.forEach((module) => this._modules.delete(module.id));

    const enabledIndex = this._state.enabled.findIndex((enabled) => enabled === id);
    if (enabledIndex !== -1) {
      this._state.enabled.splice(enabledIndex, 1);
    }

    return true;
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
    log('register plugin', { id: plugin.meta.id });
    plugin.modules.forEach((module) => this._modules.set(module.id, module));
    this._plugins.set(plugin.meta.id, plugin);
  }

  private _getActiveModules() {
    return this.modules.filter((module) => this._state.active.includes(module.id));
  }

  private _getInactiveModules() {
    return this.modules.filter((module) => !this._state.active.includes(module.id));
  }

  private _getActiveModulesByEvent(eventKey: string) {
    return this._getActiveModules().filter((module) => module.activationEvents.includes(eventKey));
  }

  private _getInactiveModulesByEvent(eventKey: string) {
    return this._getInactiveModules().filter((module) => module.activationEvents.includes(eventKey));
  }

  private _setPendingResetByModule(module: PluginModule) {
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
  }

  // TODO(wittjosiah): Use Effect.
  private async _activate(key: string) {
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
          await Promise.all(module.dependentEvents?.map((event) => this._activate(event)) ?? []);

          const maybeCapabilities = (await module.activate?.(this._context)) ?? [];
          const capabilities = Array.isArray(maybeCapabilities)
            ? await Promise.all(maybeCapabilities)
            : [await maybeCapabilities];
          await Promise.all(
            capabilities.map(async (capability) => {
              return this._context.contributeCapability(capability.interface, capability.implementation);
            }),
          );

          this._state.active.push(module.id);
          this._capabilities.set(module.id, capabilities);

          await Promise.all(module.triggeredEvents?.map((event) => this._activate(event)) ?? []);
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
  }

  private async _deactivate(id: string, resetting = false) {
    log('deactivating', { id, resetting });
    const module = this._modules.get(id);
    if (!module) {
      log('module not found', { id });
      return false;
    }

    await module.deactivate?.(this._context);

    const capabilities = this._capabilities.get(id);
    if (capabilities) {
      capabilities.forEach((capability) => {
        this._context.removeCapability(capability.interface, capability.implementation);
      });
      this._capabilities.delete(id);
    }

    const activeIndex = this._state.active.findIndex((event) => event === id);
    if (activeIndex !== -1) {
      this._state.active.splice(activeIndex, 1);
    }

    if (!resetting) {
      this._setPendingResetByModule(module);
    }

    log('deactivated', { id, resetting });
    return true;
  }
}
