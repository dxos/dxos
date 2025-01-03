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
   * Events for which the plugin will be activated.
   */
  activationEvents: string[];

  /**
   * Events which the plugin depends on being activated.
   * Plugin is marked as needing reset a plugin activated by a dependent event is removed.
   * Events are automatically activated before activation of the plugin.
   */
  dependentEvents?: string[];

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

type PluginsContextOptions = {
  activate: (event: AnyActivationEvent) => MaybePromise<boolean>;
  reset: (id: string) => void;
  subscribe: (onEnable: (meta: PluginMeta) => MaybePromise<void>) => () => void;
};

// Shared for all plugins
export class PluginsContext {
  // It's okay to use unknown here since we will do strict type-safe API
  private readonly _definedCapabilities = new Map<string, unknown[]>();

  readonly activate: PluginsContextOptions['activate'];
  readonly reset: PluginsContextOptions['reset'];
  readonly subscribe: PluginsContextOptions['subscribe'];

  constructor({ activate, reset, subscribe }: PluginsContextOptions) {
    this.activate = activate;
    this.reset = reset;
    this.subscribe = subscribe;
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
  register?: AnyActivationEvent[];
  activate?: (context: PluginsContext) => MaybePromise<MaybePromise<AnyContribution> | MaybePromise<AnyContribution>[]>;
  deactivate?: (context: PluginsContext) => MaybePromise<void>;
};

export const define = (meta: PluginMeta, rest: Omit<Plugin, 'meta'> = {}) => {
  return { meta, ...rest } satisfies Plugin;
};

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
