//
// Copyright 2025 DXOS.org
//

/*
- activation events in meta
- plugins can contribute activation events
- activate/deactivate functions (passed context to request capabilities from other plugins)
- contribution point function contributing capabilities based on well-defined interfaces with with fully qualified names
- allow plugin defs to be arrays of plugin defs
- laziness needs to move from pluign def to the contribution point function
*/

import { type MaybePromise } from '@dxos/util';

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
  name?: string;

  /**
   * A grep-able symbol string which can be resolved to an icon asset by @ch-ui/icons, via @ch-ui/vite-plugin-icons.
   */
  icon?: string;

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
};

export type InterfaceDef<T> = {
  // Pattern borrowed from effect, they use symbols which I ommited for brewity.
  _TypeId: {
    // This is gonna be `null` at runtime, here it's just so that the InterfaceDef holds on to the type-param
    _T: T;
  };
  identifier: string;
};

export type ActivationEvent = {
  id: string;
  specifier?: string;
};

export const defineEvent = (id: string, specifier?: string) => {
  return { id, specifier } as ActivationEvent;
};

type PluginsContextOptions = {
  activate: (event: ActivationEvent) => MaybePromise<boolean>;
  reset: (event: ActivationEvent) => void;
};

// Shared for all plugins
export class PluginsContext {
  // It's okay to use unknown here since we will do strict type-safe API
  private readonly _definedCapabilities = new Map<string, unknown[]>();

  readonly activate: PluginsContextOptions['activate'];
  readonly reset: PluginsContextOptions['reset'];

  constructor({ activate, reset }: PluginsContextOptions) {
    this.activate = activate;
    this.reset = reset;
  }

  /**
   * @internal
   */
  contributeCapability<T>(interfaceDef: InterfaceDef<T>, implementation: T) {
    this._definedCapabilities.set(interfaceDef.identifier, [
      ...(this._definedCapabilities.get(interfaceDef.identifier) ?? []),
      implementation,
    ]);
  }

  /**
   * @internal
   */
  removeCapability<T>(interfaceDef: InterfaceDef<T>, implementation: T) {
    this._definedCapabilities.set(
      interfaceDef.identifier,
      (this._definedCapabilities.get(interfaceDef.identifier) ?? []).filter((i) => i !== implementation),
    );
  }

  requestCapability<T>(interfaceDef: InterfaceDef<T>) {
    return (this._definedCapabilities.get(interfaceDef.identifier) ?? []) as T[];
  }
}

export type Contribution<T> = {
  interface: InterfaceDef<T>;
  implementation: T;
};

export type AnyContribution = Contribution<any>;

export type Plugin = {
  meta: PluginMeta;
  modules: PluginModule[];
};

export const definePlugin = (meta: PluginMeta, modules: PluginModule[]) => {
  return { meta, modules } satisfies Plugin;
};

export type PluginModule = {
  /**
   * Unique sub-ID of the plugin.
   */
  id: string;

  /**
   * Events for which the module will be activated.
   */
  activationEvents: string[];

  /**
   * Events which the plugin depends on being activated.
   * Plugin is marked as needing reset a plugin activated by a dependent event is removed.
   * Events are automatically activated before activation of the plugin.
   */
  dependentEvents?: string[];

  /**
   * Events which this plugin triggers upon activation.
   */
  triggeredEvents?: string[];

  /**
   * Called when the module is activated.
   * @param context The plugin context.
   * @returns The contributions of the module.
   */
  activate: (context: PluginsContext) => MaybePromise<MaybePromise<AnyContribution> | MaybePromise<AnyContribution>[]>;

  /**
   * Called when the module is deactivated.
   * @param context The plugin context.
   */
  deactivate?: (context: PluginsContext) => MaybePromise<void>;
};

export const defineModule = (module: PluginModule) => module;

export const defineInterface = <T>(identifier: string) => {
  return { identifier } as InterfaceDef<T>;
};

export const contributes = <T>(interfaceDef: InterfaceDef<T>, implementation: T): Contribution<T> => {
  return { interface: interfaceDef, implementation } satisfies Contribution<T>;
};

type LazyContribution<T, U> = () => Promise<{ default: (props: T) => Contribution<U> }>;
export const lazy = <T, U>(c: LazyContribution<T, U>, props?: T) => {
  return () =>
    c().then(({ default: contribution }) => {
      return contribution(props as T);
    });
};
