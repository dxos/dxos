//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import type * as CapabilityManager from './capability-manager';
import type * as Plugin from './plugin';

//
// Capability Service Layer
//

/**
 * Effect Context.Tag for accessing CapabilityManager via the Effect layer system.
 * This allows capability modules to access the capability manager without having it passed as an argument.
 */
export class Service extends Context.Tag('@dxos/app-framework/CapabilityManager')<
  Service,
  CapabilityManager.CapabilityManager
>() {}

/**
 * Get a single capability from the capability manager.
 * @param interfaceDef The interface definition of the capability.
 * @returns The capability implementation.
 * @throws If no capability is found.
 */
// TODO(wittjosiah): Add custom tagged errors (Data.TaggedError) for app-framework to enable
//   type-safe error handling with Effect. Consider CapabilityNotFoundError, ModuleActivationError, etc.
export const get = <T>(interfaceDef: InterfaceDef<T>): Effect.Effect<T, Error, Service> =>
  Effect.flatMap(Service, (manager) =>
    Effect.try({
      try: () => manager.get(interfaceDef),
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    }),
  );

/**
 * Get all capabilities from the capability manager for a given interface.
 * @param interfaceDef The interface definition of the capability.
 * @returns An array of capability implementations.
 */
export const getAll = <T>(interfaceDef: InterfaceDef<T>): Effect.Effect<T[], never, Service> =>
  Effect.map(Service, (manager) => manager.getAll(interfaceDef));

/**
 * Wait for a capability to be available.
 * @param interfaceDef The interface definition of the capability.
 * @returns The capability implementation once available.
 */
export const waitFor = <T>(interfaceDef: InterfaceDef<T>): Effect.Effect<T, Error, Service> =>
  Effect.flatMap(Service, (manager) => manager.waitFor(interfaceDef));

/**
 * Get the Atom reference to capabilities for reactive access.
 * @param interfaceDef The interface definition of the capability.
 * @returns An Atom containing the array of capability implementations.
 */
export const atom = <T>(interfaceDef: InterfaceDef<T>): Effect.Effect<Atom.Atom<T[]>, never, Service> =>
  Effect.map(Service, (manager) => manager.atom(interfaceDef));

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
  default: (props?: Props) => Effect.Effect<Capabilities, Error, Service | Plugin.Service | never>;
}>;
type LoadCapabilities<Props, Capabilities extends ModuleReturn = ModuleReturn> = () => Promise<{
  default: (props?: Props) => Effect.Effect<Capabilities, Error, Service | Plugin.Service | never>;
}>;

type NormalizeReturn<R> = R extends readonly (infer A)[]
  ? A[]
  : R extends (infer A)[]
    ? A[]
    : R extends Any
      ? [R]
      : Any[];

export type LazyCapability<Props = void, Capabilities extends ModuleReturn = ModuleReturn, E extends Error = Error> = (
  props?: Props,
) => Effect.Effect<NormalizeReturn<Capabilities>, E, Service | Plugin.Service | never>;

/**
 * Helper to define a lazily loaded implementation of a capability.
 * Supports single capabilities, arrays, and tuples of different capability types.
 * @param name The export name (e.g., 'AppGraphBuilder') - used to auto-compute module IDs.
 * @param loader The lazy loader function.
 * @returns A lazy capability function with ModuleTag symbol attached.
 */
export const lazy = <T = void, R extends ModuleReturn = ModuleReturn>(
  name: string,
  c: LoadCapability<T, R> | LoadCapabilities<T, R>,
): LazyCapability<T, R> => {
  const lazyFn: LazyCapability<T, R> = (props?: T) =>
    Effect.gen(function* () {
      const { default: getCapability } = yield* Effect.tryPromise(() => c());
      const result = yield* getCapability(props);
      const normalized = result == null ? [] : Array.isArray(result) ? Array.from(result) : [result];
      return normalized as NormalizeReturn<R>;
    });

  return Object.assign(lazyFn, { [ModuleTag]: name });
};

/**
 * Gets the module tag (export name) from a lazy capability function.
 * @param capability The lazy capability function.
 * @returns The module tag if present, undefined otherwise.
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
 * - Access CapabilityManager via the Effect layer system (Capability.get, Capability.getAll, etc.)
 * - Return a capability, array of capabilities, or tuple of different capability types (sync or async)
 *
 * Supports returning multiple capabilities of different types as a tuple, which will be normalized
 * to an array at runtime for compatibility with the plugin system.
 *
 * @example
 * ```ts
 * // Module without options - single capability
 * export default Capability.makeModule(
 *   Effect.fnUntraced(function* () {
 *     const client = yield* Capability.get(ClientCapabilities.Client);
 *     return contributes(Capabilities.SettingsStore, store);
 *   })
 * );
 *
 * // Module with multiple capabilities
 * export default Capability.makeModule(
 *   Effect.fnUntraced(function* () {
 *     return [
 *       contributes(Capabilities.SettingsStore, store),
 *       contributes(Capabilities.Translations, translations),
 *     ];
 *   })
 * );
 *
 * // Module with additional options (context accessed via layer)
 * export default Capability.makeModule(
 *   Effect.fnUntraced(function* ({ observability }: { observability?: boolean }) {
 *     const invoker = yield* Capability.get(Capabilities.OperationInvoker);
 *     return contributes(Capabilities.IntentResolver, ...);
 *   })
 * );
 * ```
 */
export const makeModule = <
  TProps = void,
  TReturn extends ModuleReturn = ModuleReturn,
  E extends Error = Error,
  R extends Service | Plugin.Service | never = Service,
>(
  fn: (props?: TProps) => Effect.Effect<TReturn, E, R>,
): ((props?: TProps) => Effect.Effect<TReturn, E, R>) => fn;
