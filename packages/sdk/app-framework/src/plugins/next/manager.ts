//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';
import { nonNullable, type MaybePromise } from '@dxos/util';

import { type AnyContribution, PluginsContext, type Plugin, defineInterface, type Contribution } from './plugin';

export type ActivationEvent<T> = {
  // Pattern borrowed from effect, they use symbols which I ommited for brewity.
  _TypeId: {
    // This is gonna be `null` at runtime, here it's just so that the InterfaceDef holds on to the type-param
    _T: T;
  };
  id: string;
  fires: 'once' | 'many';
  specifier?: string;
};

export type AnyActivationEvent = ActivationEvent<any>;

export const defineEvent = <T>(id: string, fires: 'once' | 'many', specifier?: string) => {
  return { id, fires, specifier } as ActivationEvent<T>;
};

const eventKey = (event: AnyActivationEvent) => (event.specifier ? `${event.id}/${event.specifier}` : event.id);

type ActivationEventInterface = {
  event: AnyActivationEvent;
  onReset?: (context: PluginsContext) => MaybePromise<void>;
};

/**
 * Contribution interface for activation events.
 */
export const ActivationEvent = defineInterface<ActivationEventInterface>('@dxos/app-framework/common/activation-event');

export const StartupEvent = defineEvent('@dxos/app-framework/activation/startup', 'once');

type ActivatedPlugin = {
  plugin: Plugin;
  contributions: AnyContribution[];
};

type PluginManagerOptions = {
  events?: ActivationEventInterface[];
  plugins?: Plugin[];
  pluginLoader: (id: string) => MaybePromise<Plugin>;
};

export class PluginManager {
  private readonly _context = new PluginsContext({
    activate: (event) => this.activate(event),
    reset: (id) => this.reset(id),
  });

  private readonly _activated: ActivatedPlugin[] = [];
  private readonly _events = new Map<string, ActivationEventInterface>();
  private readonly _fired = new Set<string>();
  private readonly _plugins: Plugin[];
  private readonly _pluginLoader: (id: string) => MaybePromise<Plugin>;
  private readonly _pendingReset = new Set<string>();

  constructor({ events = [{ event: StartupEvent }], plugins = [], pluginLoader }: PluginManagerOptions) {
    events.forEach((event) => this.registerEvent(event));
    this._plugins = plugins;
    this._pluginLoader = pluginLoader;
  }

  get context() {
    return this._context;
  }

  get events() {
    return this._events;
  }

  get unactivatedPlugins() {
    return this._plugins;
  }

  get activatedPlugins() {
    return this._activated.map(({ plugin }) => plugin);
  }

  registerEvent(event: ActivationEventInterface) {
    this._events.set(eventKey(event.event), event);
  }

  async add(id: string) {
    const plugin = await this._pluginLoader(id);
    this._plugins.push(plugin);
  }

  async remove(id: string) {
    const pluginIndex = this._plugins.findIndex((plugin) => plugin.meta.id === id);
    this._plugins.splice(pluginIndex, 1);
    if (pluginIndex >= 0) {
      return;
    }

    const activatedIndex = this._activated.findIndex((plugin) => plugin.plugin.meta.id === id);
    const [{ plugin, contributions }] = this._activated.splice(activatedIndex, 1);

    if (plugin) {
      await plugin.deactivate?.(this._context);
      plugin.meta.dependentEvents?.forEach((event) => {
        this._activated
          .filter(({ plugin }) => plugin.meta.activationEvents.includes(event))
          .forEach(({ plugin }) => {
            this._pendingReset.add(plugin.meta.id);
          });
      });
      contributions.forEach((contribution) => {
        this._context.removeCapability(contribution.interface, contribution.implementation);
      });
    }
  }

  async activate(event: AnyActivationEvent) {
    console.log('activate', event.id);
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
        if (!plugin.meta.activationEvents.includes(event.id)) {
          return;
        }

        if (this._pendingReset.has(plugin.meta.id)) {
          this._pendingReset.delete(plugin.meta.id);
        }

        console.log('activating', plugin.meta.id, plugin.meta.dependentEvents, this._events);

        await Promise.all(
          plugin.meta.dependentEvents
            ?.map((key) => this._events.get(key)?.event)
            .filter(nonNullable)
            .map((event) => this.activate(event)) ?? [],
        );

        const maybeContributions = plugin.activate(this._context);
        const contributions = Array.isArray(maybeContributions)
          ? await Promise.all(maybeContributions)
          : [await maybeContributions];
        contributions.forEach((contribution) => {
          if (contribution.interface.identifier === ActivationEvent.identifier) {
            this.registerEvent((contribution as Contribution<ActivationEventInterface>).implementation);
          } else {
            this._context.contributeCapability(contribution.interface, contribution.implementation);
          }
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

  async reset(id: string) {
    const { event, onReset } = this._events.get(id) ?? {};
    if (!event || event.fires === 'many') {
      return false;
    }

    await onReset?.(this._context);
    this._fired.delete(id);
    return this.activate(event);
  }
}
