//
// Copyright 2025 DXOS.org
//

import { untracked } from '@preact/signals-core';
import { type Effect } from 'effect';

import { create } from '@dxos/live-object';
import { log } from '@dxos/log';
import { type MaybePromise } from '@dxos/util';

import { type PluginMeta } from '../plugin-host';

/**
 * Interface definition for a capability.
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
 * Functionality contributed to the application by a plugin module.
 */
export type Capability<T> = {
  /**
   * The interface definition of the capability.
   */
  interface: InterfaceDef<T>;

  /**
   * The implementation of the capability.
   */
  implementation: T;

  /**
   * Called when the capability is deactivated.
   */
  deactivate?: () => MaybePromise<void> | Effect.Effect<void, Error>;
};

export type AnyCapability = Capability<any>;

/**
 * An event which activates a plugin module.
 */
export type ActivationEvent = {
  id: string;
  specifier?: string;
};

/**
 * Helper to define an activation event.
 */
export const defineEvent = (id: string, specifier?: string) => {
  return { id, specifier } as ActivationEvent;
};

type PluginsContextOptions = {
  activate: (event: ActivationEvent) => MaybePromise<boolean>;
  reset: (event: ActivationEvent) => MaybePromise<boolean>;
};

class CapabilityDef<T> {
  constructor(readonly implementation: T) {}
}

/**
 * Context which is passed to plugins, allowing them to interact with each other.
 */
export class PluginsContext {
  private readonly _definedCapabilities = new Map<string, CapabilityDef<unknown>[]>();

  /**
   * Activates plugins based on the activation event.
   * @param event The activation event.
   * @returns Whether the activation was successful.
   */
  readonly activate: PluginsContextOptions['activate'];

  /**
   * Re-activates the modules that were activated by the event.
   * @param event The activation event.
   * @returns Whether the reset was successful.
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
  requestCapability<T, U extends T = T>(
    interfaceDef: InterfaceDef<T>,
    filter?: (capability: T) => capability is U,
  ): U[] {
    let current = this._definedCapabilities.get(interfaceDef.identifier);
    if (!current) {
      const object = create<{ value: CapabilityDef<unknown>[] }>({ value: [] });
      current = untracked(() => object.value);
      this._definedCapabilities.set(interfaceDef.identifier, current);
    }

    // NOTE: This the type-checking for capabilities is done at the time of contribution.
    const capabilities = current.map((i) => i.implementation) as T[];
    if (filter) {
      return capabilities.filter(filter);
    } else {
      return capabilities as U[];
    }
  }
}

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

interface PluginModuleInterface {
  /**
   * Unique id of the module.
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
  readonly activationEvents: PluginModuleInterface['activationEvents'];
  readonly dependentEvents?: PluginModuleInterface['dependentEvents'];
  readonly triggeredEvents?: PluginModuleInterface['triggeredEvents'];
  readonly activate: PluginModuleInterface['activate'];

  constructor(options: PluginModuleInterface) {
    this.id = options.id;
    this.activationEvents = options.activationEvents;
    this.dependentEvents = options.dependentEvents;
    this.triggeredEvents = options.triggeredEvents;
    this.activate = options.activate;
  }
}

/**
 * Helper to define a module.
 */
export const defineModule = (options: PluginModuleInterface) => new PluginModule(options);

/**
 * Helper to define the interface of a capability.
 */
export const defineCapability = <T>(identifier: string) => {
  return { identifier } as InterfaceDef<T>;
};

/**
 * Helper to define the implementation of a capability.
 */
export const contributes = <T>(
  interfaceDef: Capability<T>['interface'],
  implementation: Capability<T>['implementation'],
  deactivate?: Capability<T>['deactivate'],
): Capability<T> => {
  return { interface: interfaceDef, implementation, deactivate } satisfies Capability<T>;
};

type LazyCapability<T, U> = () => Promise<{ default: (props: T) => MaybePromise<Capability<U>> }>;

/**
 * Helper to define a lazily loaded implementation of a capability.
 */
export const lazy =
  <T, U>(c: LazyCapability<T, U>) =>
  (props?: T): Promise<Capability<U>> =>
    c().then(({ default: getCapability }) => {
      return getCapability(props as T);
    });
