//
// Copyright 2025 DXOS.org
//

import { type Registry, Rx } from '@effect-rx/rx-react';
import * as Effect from 'effect/Effect';

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type MaybePromise } from '@dxos/util';

import { type ActivationEvent } from './events';

const InterfaceDefTypeId: unique symbol = Symbol.for('InterfaceDefTypeId');

/**
 * The interface definition of a capability.
 */
export type InterfaceDef<T> = {
  [InterfaceDefTypeId]: T;
  identifier: string;
};

export namespace InterfaceDef {
  export type Implementation<I extends InterfaceDef<any>> = I extends InterfaceDef<infer T> ? T : never;
}

/**
 * Helper to define the interface of a capability.
 */
export const defineCapability = <T>(identifier: string) => {
  return { identifier } as InterfaceDef<T>;
};

/**
 * A unique string identifier with a Typescript type associated with it.
 * When a capability is contributed to the application an implementation of the interface is provided.
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
  registry: Registry.Registry;
  activate: (event: ActivationEvent) => Effect.Effect<boolean, Error>;
  reset: (event: ActivationEvent) => Effect.Effect<boolean, Error>;
};

// NOTE: This is implemented as a class to prevent it from being proxied by PluginManager state.
class CapabilityImpl<T> {
  constructor(
    readonly moduleId: string,
    readonly implementation: T,
  ) {}
}

/**
 * Helper to define the implementation of a capability.
 */
export const contributes = <I extends InterfaceDef<any>>(
  interfaceDef: I,
  implementation: Capability<InterfaceDef.Implementation<I>>['implementation'],
  deactivate?: Capability<InterfaceDef.Implementation<I>>['deactivate'],
): Capability<I> => {
  return { interface: interfaceDef, implementation, deactivate } satisfies Capability<I>;
};

type LoadCapability<T, U> = () => Promise<{ default: (props: T) => MaybePromise<Capability<U>> }>;
type LoadCapabilities<T> = () => Promise<{ default: (props: T) => MaybePromise<AnyCapability[]> }>;

// TODO(wittjosiah): Not having the array be `any` causes type errors when using the lazy capability.
type LazyCapability<T, U> = (props?: T) => Promise<() => Promise<Capability<U> | AnyCapability[]>>;

/**
 * Helper to define a lazily loaded implementation of a capability.
 */
export const lazy =
  <T, U>(c: LoadCapability<T, U> | LoadCapabilities<T>): LazyCapability<T, U> =>
  async (props?: T) => {
    const { default: getCapability } = await c();
    return async () => getCapability(props as T);
  };

/**
 * Facilitates the dependency injection between [plugin modules](#pluginmodule) by allowing them contribute and request capabilities from each other.
 * It tracks the capabilities that are contributed in an in-memory live object.
 * This allows the application to subscribe to this state and incorporate plugins which are added dynamically.
 */
export class PluginContext {
  private readonly _registry: Registry.Registry;

  private readonly _capabilityImpls = Rx.family<string, Rx.Writable<CapabilityImpl<unknown>[]>>(() => {
    return Rx.make<CapabilityImpl<unknown>[]>([]).pipe(Rx.keepAlive);
  });

  readonly _capabilities = Rx.family<string, Rx.Rx<unknown[]>>((id: string) => {
    return Rx.make((get) => {
      const current = get(this._capabilityImpls(id));
      return current.map((c) => c.implementation);
    });
  });

  readonly _capability = Rx.family<string, Rx.Rx<unknown>>((id: string) => {
    return Rx.make((get) => {
      const current = get(this._capabilities(id));
      invariant(current.length > 0, `No capability found for ${id}`);
      return current[0];
    });
  });

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

  constructor({ registry, activate, reset }: PluginsContextOptions) {
    this._registry = registry;
    this.activate = activate;
    this.reset = reset;
  }

  /**
   * @internal
   */
  contributeCapability<T>({
    module: moduleId,
    interface: interfaceDef,
    implementation,
  }: {
    module: string;
    interface: InterfaceDef<T>;
    implementation: T;
  }): void {
    const current = this._registry.get(this._capabilityImpls(interfaceDef.identifier));
    const capability = new CapabilityImpl(moduleId, implementation);
    if (current.includes(capability)) {
      return;
    }

    this._registry.set(this._capabilityImpls(interfaceDef.identifier), [...current, capability]);
    log('capability contributed', {
      id: interfaceDef.identifier,
      moduleId,
      count: current.length,
    });
  }

  /**
   * @internal
   */
  removeCapability<T>(interfaceDef: InterfaceDef<T>, implementation: T): void {
    const current = this._registry.get(this._capabilityImpls(interfaceDef.identifier));
    if (current.length === 0) {
      return;
    }

    const next = current.filter((c) => c.implementation !== implementation);
    if (next.length !== current.length) {
      this._registry.set(this._capabilityImpls(interfaceDef.identifier), next);
      log('capability removed', { id: interfaceDef.identifier, count: current.length });
    } else {
      log.warn('capability not removed', { id: interfaceDef.identifier });
    }
  }

  /**
   * Get the Rx reference to the available capabilities for a given interface.
   * Primarily useful for deriving other Rx values based on the capabilities or
   * for subscribing to changes in the capabilities.
   * @returns An Rx reference to the available capabilities.
   */
  capabilities<T>(interfaceDef: InterfaceDef<T>): Rx.Rx<T[]> {
    // NOTE: This the type-checking for capabilities is done at the time of contribution.
    return this._capabilities(interfaceDef.identifier) as Rx.Rx<T[]>;
  }

  /**
   * Get the Rx reference to the available capabilities for a given interface.
   * Primarily useful for deriving other Rx values based on the capability or
   * for subscribing to changes in the capability.
   * @returns An Rx reference to the available capability.
   * @throws If no capability is found.
   */
  capability<T>(interfaceDef: InterfaceDef<T>): Rx.Rx<T> {
    // NOTE: This the type-checking for capabilities is done at the time of contribution.
    return this._capability(interfaceDef.identifier) as Rx.Rx<T>;
  }

  /**
   * Get capabilities from the plugin context.
   * @returns An array of capabilities.
   */
  getCapabilities<T>(interfaceDef: InterfaceDef<T>): T[] {
    return this._registry.get(this.capabilities(interfaceDef));
  }

  /**
   * Requests a single capability from the plugin context.
   * @returns The capability.
   * @throws If no capability is found.
   */
  getCapability<T>(interfaceDef: InterfaceDef<T>): T {
    return this._registry.get(this.capability(interfaceDef));
  }

  /**
   * Waits for a capability to be available.
   * @returns The capability.
   */
  async waitForCapability<T>(interfaceDef: InterfaceDef<T>): Promise<T> {
    const [capability] = this.getCapabilities(interfaceDef);
    if (capability) {
      return capability;
    }

    const trigger = new Trigger<T>();
    const cancel = this._registry.subscribe(this.capabilities(interfaceDef), (capabilities) => {
      if (capabilities.length > 0) {
        trigger.wake(capabilities[0]);
      }
    });
    const result = await trigger.wait();
    cancel();
    return result;
  }

  async activatePromise(event: ActivationEvent): Promise<boolean> {
    return this.activate(event).pipe(Effect.runPromise);
  }

  async resetPromise(event: ActivationEvent): Promise<boolean> {
    return this.reset(event).pipe(Effect.runPromise);
  }
}
