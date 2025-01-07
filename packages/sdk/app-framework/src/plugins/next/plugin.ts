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

import { untracked } from '@preact/signals-core';

import { create } from '@dxos/live-object';
import { log } from '@dxos/log';
import { type MaybePromise } from '@dxos/util';

/**
 *
 */
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

/**
 *
 */
export type InterfaceDef<T> = {
  // TODO(dima): Pattern borrowed from effect, they use symbols which I ommited for brewity.
  _TypeId: {
    // This is gonna be `null` at runtime, here it's just so that the InterfaceDef holds on to the type-param
    _T: T;
  };
  identifier: string;
};

/**
 *
 */
export type Capability<T> = {
  interface: InterfaceDef<T>;
  implementation: T;
};

export type AnyCapability = Capability<any>;

/**
 *
 */
export type ActivationEvent = {
  id: string;
  specifier?: string;
};

/**
 *
 */
export const defineEvent = (id: string, specifier?: string) => {
  return { id, specifier } as ActivationEvent;
};

type PluginsContextOptions = {
  activate: (event: ActivationEvent) => MaybePromise<boolean>;
  reset: (event: ActivationEvent) => void;
};

class CapabilityDef<T> {
  constructor(readonly implementation: T) {}
}

/**
 *
 */
export class PluginsContext {
  private readonly _definedCapabilities = new Map<string, CapabilityDef<unknown>[]>();

  /**
   *
   */
  readonly activate: PluginsContextOptions['activate'];

  /**
   *
   */
  readonly reset: PluginsContextOptions['reset'];

  constructor({ activate, reset }: PluginsContextOptions) {
    this.activate = activate;
    this.reset = reset;
  }

  /**
   * @internal
   */
  contributeCapability<T>(interfaceDef: InterfaceDef<T>, implementation: T) {
    let current = this._definedCapabilities.get(interfaceDef.identifier);
    if (!current) {
      const object = create<{ value: CapabilityDef<unknown>[] }>({ value: [] });
      current = untracked(() => object.value);
      this._definedCapabilities.set(interfaceDef.identifier, current);
    }

    current.push(new CapabilityDef(implementation));
    log('capability contributed', { id: interfaceDef.identifier, count: untracked(() => current.length) });
  }

  /**
   * @internal
   */
  removeCapability<T>(interfaceDef: InterfaceDef<T>, implementation: T) {
    const current = this._definedCapabilities.get(interfaceDef.identifier);
    if (!current) {
      return;
    }

    const index = current.findIndex((i) => i.implementation === implementation);
    if (index !== -1) {
      current.splice(index, 1);
      log('capability removed', { id: interfaceDef.identifier, count: untracked(() => current.length) });
    }
  }

  /**
   *
   */
  requestCapability<T>(interfaceDef: InterfaceDef<T>) {
    let current = this._definedCapabilities.get(interfaceDef.identifier);
    if (!current) {
      const object = create<{ value: CapabilityDef<unknown>[] }>({ value: [] });
      current = untracked(() => object.value);
      this._definedCapabilities.set(interfaceDef.identifier, current);
    }

    // NOTE: This the type-checking for capabilities is done at the time of contribution.
    // TODO(wittjosiah): This should be maintained as a live array that can be subscribed to.
    //   This could be done with a `computed` utility for live objects.
    return current.map((i) => i.implementation) as T[];
  }
}

/**
 *
 */
export type Plugin = {
  meta: PluginMeta;
  modules: PluginModule[];
};

/**
 *
 */
export const definePlugin = (meta: PluginMeta, modules: PluginModule[]) => {
  return { meta, modules } satisfies Plugin;
};

/**
 *
 */
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
   * @returns The capabilities of the module.
   */
  activate: (context: PluginsContext) => MaybePromise<AnyCapability | AnyCapability[]>;

  /**
   * Called when the module is deactivated.
   * @param context The plugin context.
   */
  deactivate?: (context: PluginsContext) => MaybePromise<void>;
};

/**
 *
 */
export const defineModule = (module: PluginModule) => module;

/**
 *
 */
export const defineInterface = <T>(identifier: string) => {
  return { identifier } as InterfaceDef<T>;
};

/**
 *
 */
export const contributes = <T>(interfaceDef: InterfaceDef<T>, implementation: T): Capability<T> => {
  return { interface: interfaceDef, implementation } satisfies Capability<T>;
};

type LazyCapability<T, U> = () => Promise<{ default: (props: T) => Capability<U> }>;

/**
 *
 */
export const lazy =
  <T, U>(c: LazyCapability<T, U>, props?: T) =>
  (): Promise<Capability<U>> =>
    c().then(({ default: getCapability }) => {
      return getCapability(props as T);
    });
