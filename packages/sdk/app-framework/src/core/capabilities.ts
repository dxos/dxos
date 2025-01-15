/**
 * Interface definition for a capability.
 */
//
// Copyright 2025 DXOS.org
//

import { effect, untracked } from '@preact/signals-core';
import { type Effect } from 'effect';

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { create } from '@dxos/live-object';
import { log } from '@dxos/log';
import { type MaybePromise } from '@dxos/util';

import { type ActivationEvent } from './events';

const InterfaceDefTypeId: unique symbol = Symbol.for('InterfaceDefTypeId');

export type InterfaceDef<T> = {
  [InterfaceDefTypeId]: T;
  identifier: string;
};

/**
 * Helper to define the interface of a capability.
 */
export const defineCapability = <T>(identifier: string) => {
  return { identifier } as InterfaceDef<T>;
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

type PluginsContextOptions = {
  activate: (event: ActivationEvent) => MaybePromise<boolean>;
  reset: (event: ActivationEvent) => MaybePromise<boolean>;
};

class CapabilityImpl<T> {
  constructor(readonly implementation: T) {}
}

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

/**
 * Context which is passed to plugins, allowing them to interact with each other.
 */
export class PluginsContext {
  private readonly _definedCapabilities = new Map<string, CapabilityImpl<unknown>[]>();

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
      const object = create<{ value: CapabilityImpl<unknown>[] }>({ value: [] });
      current = untracked(() => object.value);
      this._definedCapabilities.set(interfaceDef.identifier, current);
    }

    current.push(new CapabilityImpl(implementation));
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
   * Requests capabilities from the plugin context.
   * @returns An array of capabilities.
   * @reactive
   */
  requestCapabilities<T, U extends T = T>(
    interfaceDef: InterfaceDef<T>,
    filter?: (capability: T) => capability is U,
  ): U[] {
    let current = this._definedCapabilities.get(interfaceDef.identifier);
    if (!current) {
      const object = create<{ value: CapabilityImpl<unknown>[] }>({ value: [] });
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

  /**
   * Requests a single capability from the plugin context.
   * @returns The capability.
   * @throws If no capability is found.
   * @reactive
   */
  requestCapability<T, U extends T = T>(interfaceDef: InterfaceDef<T>, filter?: (capability: T) => capability is U): U {
    const capability = this.requestCapabilities(interfaceDef, filter)[0];
    invariant(capability, `No capability found for ${interfaceDef.identifier}`);
    return capability;
  }

  async waitForCapability<T, U extends T = T>(
    interfaceDef: InterfaceDef<T>,
    filter?: (capability: T) => capability is U,
  ): Promise<U> {
    const trigger = new Trigger<U>();
    const unsubscribe = effect(() => {
      const capabilities = this.requestCapabilities(interfaceDef, filter);
      if (capabilities[0]) {
        trigger.wake(capabilities[0]);
      }
    });
    const capability = await trigger.wait();
    unsubscribe();
    return capability;
  }
}
