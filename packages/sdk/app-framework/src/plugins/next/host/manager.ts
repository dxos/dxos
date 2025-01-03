//
// Copyright 2025 DXOS.org
//

import { Event } from '@dxos/async';
import { log } from '@dxos/log';
import { nonNullable, type MaybePromise } from '@dxos/util';

import { StartupEvent } from './core';
import { type AnyContribution, type Plugin, type AnyActivationEvent, PluginsContext, type PluginMeta } from './plugin';

const RELOAD_APP = '*';

export const eventKey = (event: AnyActivationEvent) => (event.specifier ? `${event.id}/${event.specifier}` : event.id);

type ActivatedPlugin = {
  plugin: Plugin;
  contributions: AnyContribution[];
};

type PluginManagerOptions = {
  events?: AnyActivationEvent[];
  plugins?: Plugin[];
  pluginLoader: (id: string) => MaybePromise<Plugin>;
};

export class PluginManager {
  private readonly _onAdd = new Event<PluginMeta>();
  private readonly _context = new PluginsContext({
    activate: (event) => this.activate(event),
    reset: (id) => this.reset(id),
    subscribe: (cb) => this._onAdd.on(cb),
  });

  private readonly _activated: ActivatedPlugin[] = [];
  private readonly _events = new Map<string, AnyActivationEvent>();
  private readonly _fired = new Set<string>();
  private readonly _plugins: Plugin[];
  private readonly _pluginLoader: (id: string) => MaybePromise<Plugin>;
  private readonly _pendingReset = new Set<string>();

  constructor({ events = [StartupEvent], plugins = [], pluginLoader }: PluginManagerOptions) {
    this._plugins = plugins;
    this._pluginLoader = pluginLoader;
    events.forEach((event) => this.registerEvent(event));
  }

  get context() {
    return this._context;
  }

  get unactivatedPlugins() {
    return this._plugins;
  }

  get activatedPlugins() {
    return this._activated.map(({ plugin }) => plugin);
  }

  get needsReset() {
    return Array.from(this._pendingReset);
  }

  registerEvent(event: AnyActivationEvent) {
    this._events.set(eventKey(event), event);
  }

  async add(id: string) {
    const plugin = await this._pluginLoader(id);
    this._plugins.push(plugin);
    this._onAdd.emit(plugin.meta);

    if (plugin.meta.activationEvents.includes(StartupEvent.id) && this._fired.has(StartupEvent.id)) {
      this._pendingReset.add(RELOAD_APP);
    }

    await Promise.all(
      plugin.meta.activationEvents.map((eventKey) => {
        const dependentPlugin = this._activated.find((a) => a.plugin.meta.dependentEvents?.includes(eventKey));
        const event = this._events.get(eventKey);
        return dependentPlugin && event ? this.activate(event) : undefined;
      }),
    );
  }

  async remove(id: string) {
    const pluginIndex = this._plugins.findIndex((plugin) => plugin.meta.id === id);
    this._plugins.splice(pluginIndex, 1);
    if (pluginIndex >= 0) {
      return false;
    }

    const activatedIndex = this._activated.findIndex((plugin) => plugin.plugin.meta.id === id);
    const [{ plugin, contributions }] = this._activated.splice(activatedIndex, 1);

    if (!plugin) {
      return false;
    }

    await plugin.deactivate?.(this._context);
    if (plugin.meta.activationEvents.includes(StartupEvent.id)) {
      this._pendingReset.add(RELOAD_APP);
    }
    plugin.meta.activationEvents.forEach((event) => {
      this._activated
        .filter(({ plugin }) => plugin.meta.dependentEvents?.includes(event))
        .forEach(({ plugin }) => {
          this._pendingReset.add(plugin.meta.id);
        });
    });
    contributions.forEach((contribution) => {
      this._context.removeCapability(contribution.interface, contribution.implementation);
    });

    return true;
  }

  async activate(event: AnyActivationEvent) {
    if (this._fired.has(eventKey(event))) {
      log.warn('Event already fired. Reset before firing again.', { event: event.id });
      return false;
    }

    if (!this._events.has(eventKey(event))) {
      log.warn('Event not registered before activation.', { event: event.id });
      return false;
    }

    await Promise.all(
      this._plugins.map(async (plugin, index) => {
        if (!plugin.meta.activationEvents.includes(eventKey(event))) {
          return;
        }

        if (this._pendingReset.has(plugin.meta.id)) {
          this._pendingReset.delete(plugin.meta.id);
        }

        plugin.register?.forEach((event) => this.registerEvent(event));

        await Promise.all(
          plugin.meta.dependentEvents
            ?.map((key) => this._events.get(key))
            .filter(nonNullable)
            .map((event) => this.activate(event)) ?? [],
        );

        const maybeContributions = (await plugin.activate?.(this._context)) ?? [];
        const contributions = Array.isArray(maybeContributions)
          ? await Promise.all(maybeContributions)
          : [await maybeContributions];
        contributions.forEach((contribution) => {
          this._context.contributeCapability(contribution.interface, contribution.implementation);
        });
        this._plugins.splice(index, 1);
        this._activated.push({ plugin, contributions });
      }),
    );

    if (event.fires === 'once') {
      this._fired.add(eventKey(event));
    }

    return true;
  }

  async reset(id = RELOAD_APP) {
    if (id === RELOAD_APP) {
      this._pendingReset.clear();
      this._plugins.push(...this._activated.map(({ plugin }) => plugin));
      this._activated.forEach(({ contributions }) => {
        contributions.forEach((contribution) => {
          this._context.removeCapability(contribution.interface, contribution.implementation);
        });
      });
      this._activated.splice(0, this._activated.length);
      this._fired.clear();
      this._pendingReset.clear();
      await this.activate(StartupEvent);
      return true;
    }

    const index = this._activated.findIndex(({ plugin }) => plugin.meta.id === id);
    if (index === -1) {
      return false;
    }

    const { plugin, contributions: oldContributions } = this._activated[index];
    oldContributions.forEach((contribution) => {
      this._context.removeCapability(contribution.interface, contribution.implementation);
    });
    const maybeContributions = (await plugin.activate?.(this._context)) ?? [];
    const contributions = Array.isArray(maybeContributions)
      ? await Promise.all(maybeContributions)
      : [await maybeContributions];
    contributions.forEach((contribution) => {
      this._context.contributeCapability(contribution.interface, contribution.implementation);
    });
    this._pendingReset.delete(id);
    return true;
  }
}
