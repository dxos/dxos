//
// Copyright 2025 DXOS.org
//

import { type MaybePromise } from '@dxos/util';

import { type AnyCapability, type PluginContext } from './capabilities';
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
    context: PluginContext,
  ) => MaybePromise<AnyCapability | AnyCapability[]> | Promise<() => Promise<AnyCapability | AnyCapability[]>>;
}

/**
 * A unit of containment of modular functionality that can be provided to an application.
 * Activation of a module is async allowing for code to split and loaded lazily.
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
   * Human-readable name.
   */
  name: string;

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
   * URL of screenshot.
   */
  screenshots?: string[];

  /**
   * Tags to help categorize the plugin.
   */
  tags?: string[];

  /**
   * A grep-able symbol string which can be resolved to an icon asset by @ch-ui/icons, via @ch-ui/vite-plugin-icons.
   */
  icon?: string;

  /**
   * Icon hue (ChromaticPalette).
   */
  iconHue?: string;
};

/**
 * A collection of modules that are be enabled/disabled as a unit.
 * Plugins provide things such as components, state, actions, etc. to the application.
 */
// NOTE: This is implemented as a class to prevent it from being proxied by PluginManager state.
export class Plugin {
  constructor(
    readonly meta: PluginMeta,
    readonly modules: PluginModule[],
  ) {}
}

export type PluginFactory<T = void> = ((args: T) => Plugin) & { meta: PluginMeta };

/**
 * Helper to define a plugin.
 */
export const definePlugin = <T = void>(meta: PluginMeta, provider: (args: T) => PluginModule[]): PluginFactory<T> => {
  const factory = (args: T) => new Plugin(meta, provider(args));

  return Object.assign(factory, { meta });
};
