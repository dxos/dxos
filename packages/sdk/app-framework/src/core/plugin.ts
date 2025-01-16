//
// Copyright 2025 DXOS.org
//

import { type Effect } from 'effect';

import { type MaybePromise } from '@dxos/util';

import { type AnyCapability, type PluginsContext } from './capabilities';
import { type ActivationEvent, type ActivationEvents } from './events';

interface PluginModuleInterface {
  /**
   * Unique id of the module.
   */
  id: string;

  /**
   * Events for which the module will be activated.
   */
  activatesOn: ActivationEvents;

  /**
   * Events which the plugin depends on being activated.
   * Plugin is marked as needing reset a plugin activated by a dependent event is removed.
   * Events are automatically activated before activation of the plugin.
   */
  activatesBefore?: ActivationEvent[];

  /**
   * Events which this plugin triggers upon activation.
   */
  activatesAfter?: ActivationEvent[];

  /**
   * Called when the module is activated.
   * @param context The plugin context.
   * @returns The capabilities of the module.
   */
  activate: (
    context: PluginsContext,
  ) => MaybePromise<AnyCapability | AnyCapability[]> | Effect.Effect<AnyCapability | AnyCapability[], Error>;
}

/**
 * A unit of containment of modular functionality that can be provided to an application.
 * Plugins provide things like components, state, actions, etc. to the application.
 */
// NOTE: This is implemented as a class to prevent it from being proxied by PluginManager state.
export class PluginModule implements PluginModuleInterface {
  readonly id: PluginModuleInterface['id'];
  readonly activatesOn: PluginModuleInterface['activatesOn'];
  readonly activatesBefore?: PluginModuleInterface['activatesBefore'];
  readonly activatesAfter?: PluginModuleInterface['activatesAfter'];
  readonly activate: PluginModuleInterface['activate'];

  constructor(options: PluginModuleInterface) {
    this.id = options.id;
    this.activatesOn = options.activatesOn;
    this.activatesBefore = options.activatesBefore;
    this.activatesAfter = options.activatesAfter;
    this.activate = options.activate;
  }
}

/**
 * Helper to define a module.
 */
export const defineModule = (options: PluginModuleInterface) => new PluginModule(options);

export type PluginMeta = {
  /**
   * Globally unique ID.
   *
   * Expected to be in the form of a valid URL.
   *
   * @example dxos.org/plugin/example
   */
  id: string;

  /**
   * Short ID for use in URLs.
   *
   * NOTE: This is especially experimental and likely to change.
   */
  // TODO(wittjosiah): How should these be managed?
  shortId?: string;

  /**
   * Human-readable name.
   */
  name?: string;

  /**
   * Short description of plugin functionality.
   */
  description?: string;

  /**
   * URL of home page.
   */
  homePage?: string;

  /**
   * URL of source code.
   */
  source?: string;

  /**
   * Tags to help categorize the plugin.
   */
  tags?: string[];

  /**
   * A grep-able symbol string which can be resolved to an icon asset by @ch-ui/icons, via @ch-ui/vite-plugin-icons.
   */
  icon?: string;
};

/**
 * A collection of modules that are be enabled/disabled as a unit.
 */
// NOTE: This is implemented as a class to prevent it from being proxied by PluginManager state.
export class Plugin {
  constructor(
    readonly meta: PluginMeta,
    readonly modules: PluginModule[],
  ) {}
}

/**
 * Helper to define a plugin.
 */
export const definePlugin = (meta: PluginMeta, modules: PluginModule[]) => {
  return new Plugin(meta, modules);
};
