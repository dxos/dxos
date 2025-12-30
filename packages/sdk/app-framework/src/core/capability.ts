//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import type * as ActivationEvent from './activation-event';

const InterfaceDefTypeId: unique symbol = Symbol.for('InterfaceDefTypeId');

/**
 * Symbol used to tag lazy capability functions with their module ID.
 */
export const ModuleTag: unique symbol = Symbol.for('@dxos/app-framework/ModuleTag');

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
export const make = <T>(identifier: string) => {
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
  readonly interface: InterfaceDef<T>;

  /**
   * The implementation of the capability.
   */
  readonly implementation: T;

  /**
   * Called when the capability is deactivated.
   */
  readonly deactivate?: () => Effect.Effect<void, Error>;
};

export type Any = Capability<any>;

/**
 * Union type representing all valid return types for a capability module.
 * Supports single capabilities, arrays, and tuples of different capability types.
 */
export type ModuleReturn = void | Any | Any[] | readonly Any[] | [Any, ...Any[]] | readonly [Any, ...Any[]];

/**
 * Helper to define the implementation of a capability.
 */
export const contributes = <I extends InterfaceDef<any>>(
  interfaceDef: I,
  implementation: Capability<InterfaceDef.Implementation<I>>['implementation'],
  deactivate?: Capability<InterfaceDef.Implementation<I>>['deactivate'],
): Capability<I> => {
  return {
    interface: interfaceDef,
    implementation,
    deactivate,
  } satisfies Capability<I>;
};

type LoadCapability<Props, Capabilities extends ModuleReturn = ModuleReturn> = () => Promise<{
  default: (props: Props) => Effect.Effect<Capabilities, Error>;
}>;
type LoadCapabilities<Props, Capabilities extends ModuleReturn = ModuleReturn> = () => Promise<{
  default: (props: Props) => Effect.Effect<Capabilities, Error>;
}>;

type NormalizeReturn<R> = R extends readonly (infer A)[]
  ? A[]
  : R extends (infer A)[]
    ? A[]
    : R extends Any
      ? [R]
      : Any[];

export type LazyCapability<Props = PluginContext, Capabilities extends ModuleReturn = ModuleReturn> = (
  props: Props,
) => Effect.Effect<NormalizeReturn<Capabilities>, Error>;

/**
 * Helper to define a lazily loaded implementation of a capability.
 * Supports single capabilities, arrays, and tuples of different capability types.
 * @param name The export name (e.g., 'AppGraphBuilder') - used to auto-compute module IDs
 * @param loader The lazy loader function
 * @returns A lazy capability function with ModuleTag symbol attached
 */
export const lazy = <T = PluginContext, R extends ModuleReturn = ModuleReturn>(
  name: string,
  c: LoadCapability<T, R> | LoadCapabilities<T, R>,
): LazyCapability<T, R> => {
  const lazyFn: LazyCapability<T, R> = (props: T) =>
    Effect.gen(function* () {
      const { default: getCapability } = yield* Effect.tryPromise(() => c());
      const result = yield* getCapability(props);
      const normalized = Array.isArray(result) ? Array.from(result) : [result];
      return normalized as NormalizeReturn<R>;
    });

  return Object.assign(lazyFn, { [ModuleTag]: name });
};

/**
 * Gets the module tag (export name) from a lazy capability function.
 * @param capability The lazy capability function
 * @returns The module tag if present, undefined otherwise
 */
// TODO(wittjosiah): Stricter type for capability.
export const getModuleTag = (capability: unknown): string | undefined => {
  return capability && typeof capability === 'function' && ModuleTag in capability
    ? String(capability[ModuleTag])
    : undefined;
};

/**
 * Helper to define a capability module with explicit typing.
 * Wraps the default export function to provide better type inference and make the pattern explicit.
 *
 * This helper provides explicit typing for the module activation function,
 * making it clear that the function should:
 * - Accept a PluginContext (or no parameters, or an object containing PluginContext)
 * - Return a capability, array of capabilities, or tuple of different capability types (sync or async)
 *
 * Supports returning multiple capabilities of different types as a tuple, which will be normalized
 * to an array at runtime for compatibility with the plugin system.
 *
 * @example
 * ```ts
 * // Module with context - single capability
 * export default Capability.makeModule((context: PluginContext) => {
 *   const store = new SettingsStore();
 *   return contributes(Capabilities.SettingsStore, store);
 * });
 *
 * // Module without context - single capability
 * export default Capability.makeModule(() => {
 *   return contributes(Capabilities.Translations, translations);
 * });
 *
 * // Module with multiple capabilities of different types
 * export default Capability.makeModule((context: PluginContext) => {
 *   return [
 *     contributes(Capabilities.SettingsStore, store),
 *     contributes(Capabilities.Translations, translations),
 *   ];
 * });
 *
 * // Module with context and additional options
 * export default Capability.makeModule(({ context, observability }: { context: PluginContext; observability?: boolean }) => {
 *   return contributes(Capabilities.IntentResolver, ...);
 * });
 * ```
 */
export const makeModule = <TArgs extends any[] = [PluginContext], TReturn extends ModuleReturn = ModuleReturn>(
  fn: (...args: TArgs) => Effect.Effect<TReturn, Error>,
): ((...args: TArgs) => Effect.Effect<TReturn, Error>) => fn;

// NOTE: This is implemented as a class to prevent it from being proxied by PluginManager state.
class CapabilityImpl<T> {
  constructor(
    readonly moduleId: string,
    readonly implementation: T,
  ) {}
}

/**
 * Options for creating a plugin context.
 * @internal
 */
export type PluginContextOptions = {
  registry: Registry.Registry;
  activate: (event: ActivationEvent.ActivationEvent) => Effect.Effect<boolean, Error>;
  reset: (event: ActivationEvent.ActivationEvent) => Effect.Effect<boolean, Error>;
};

/**
 * Interface for the Plugin Context.
 */
export interface PluginContext {
  /**
   * Activates plugins based on the activation event.
   * @param event The activation event.
   * @returns Whether the activation was successful.
   */
  readonly activate: (event: ActivationEvent.ActivationEvent) => Effect.Effect<boolean, Error>;

  /**
   * Re-activates the modules that were activated by the event.
   * @param event The activation event.
   * @returns Whether the reset was successful.
   */
  readonly reset: (event: ActivationEvent.ActivationEvent) => Effect.Effect<boolean, Error>;

  contributeCapability<T>(args: { module: string; interface: InterfaceDef<T>; implementation: T }): void;

  removeCapability<T>(interfaceDef: InterfaceDef<T>, implementation: T): void;

  /**
   * Get the Atom reference to the available capabilities for a given interface.
   * Primarily useful for deriving other Atom values based on the capabilities or
   * for subscribing to changes in the capabilities.
   * @returns An atom reference to the available capabilities.
   */
  capabilities<T>(interfaceDef: InterfaceDef<T>): Atom.Atom<T[]>;

  /**
   * Get the Atom reference to the available capabilities for a given interface.
   * Primarily useful for deriving other Atom values based on the capability or
   * for subscribing to changes in the capability.
   * @returns An atom reference to the available capability.
   * @throws If no capability is found.
   */
  capability<T>(interfaceDef: InterfaceDef<T>): Atom.Atom<T>;

  /**
   * Get capabilities from the plugin context.
   * @returns An array of capabilities.
   */
  getCapabilities<T>(interfaceDef: InterfaceDef<T>): T[];

  /**
   * Requests a single capability from the plugin context.
   * @returns The capability.
   * @throws If no capability is found.
   */
  getCapability<T>(interfaceDef: InterfaceDef<T>): T;

  /**
   * Waits for a capability to be available.
   * @returns The capability.
   */
  waitForCapability<T>(interfaceDef: InterfaceDef<T>): Effect.Effect<T, Error>;
}

/**
 * Internal implementation of PluginContext.
 * @internal
 */
export class PluginContextImpl implements PluginContext {
  private readonly _registry: Registry.Registry;

  private readonly _capabilityImpls = Atom.family<string, Atom.Writable<CapabilityImpl<unknown>[]>>(() => {
    return Atom.make<CapabilityImpl<unknown>[]>([]).pipe(Atom.keepAlive);
  });

  readonly _capabilities = Atom.family<string, Atom.Atom<unknown[]>>((id: string) => {
    return Atom.make((get) => {
      const current = get(this._capabilityImpls(id));
      return current.map((c) => c.implementation);
    });
  });

  readonly _capability = Atom.family<string, Atom.Atom<unknown>>((id: string) => {
    return Atom.make((get) => {
      const current = get(this._capabilities(id));
      invariant(current.length > 0, `No capability found for ${id}`);
      return current[0];
    });
  });

  readonly activate: PluginContextOptions['activate'];
  readonly reset: PluginContextOptions['reset'];

  constructor({ registry, activate, reset }: PluginContextOptions) {
    this._registry = registry;
    this.activate = activate;
    this.reset = reset;
  }

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
    const isDuplicate = current.some((c) => c.moduleId === moduleId && c.implementation === implementation);
    if (isDuplicate) {
      log('capability already contributed, skipping', { id: interfaceDef.identifier, moduleId });
      return;
    }

    this._registry.set(this._capabilityImpls(interfaceDef.identifier), [...current, capability]);
    log('capability contributed', {
      id: interfaceDef.identifier,
      moduleId,
      count: current.length,
    });
  }

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

  capabilities<T>(interfaceDef: InterfaceDef<T>): Atom.Atom<T[]> {
    // NOTE: This the type-checking for capabilities is done at the time of contribution.
    return this._capabilities(interfaceDef.identifier) as Atom.Atom<T[]>;
  }

  capability<T>(interfaceDef: InterfaceDef<T>): Atom.Atom<T> {
    // NOTE: This the type-checking for capabilities is done at the time of contribution.
    return this._capability(interfaceDef.identifier) as Atom.Atom<T>;
  }

  getCapabilities<T>(interfaceDef: InterfaceDef<T>): T[] {
    return this._registry.get(this.capabilities(interfaceDef));
  }

  getCapability<T>(interfaceDef: InterfaceDef<T>): T {
    return this._registry.get(this.capability(interfaceDef));
  }

  waitForCapability<T>(interfaceDef: InterfaceDef<T>): Effect.Effect<T, Error> {
    return Effect.gen(this, function* () {
      const [capability] = this.getCapabilities(interfaceDef);
      if (capability) {
        return capability;
      }

      const deferred = yield* Deferred.make<T, Error>();
      const cancel = this._registry.subscribe(this.capabilities(interfaceDef), (capabilities) => {
        if (capabilities.length > 0) {
          Effect.runSync(Deferred.succeed(deferred, capabilities[0]));
        }
      });
      const result = yield* Deferred.await(deferred);
      cancel();
      return result;
    });
  }
}
