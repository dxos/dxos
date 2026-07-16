//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Scope from 'effect/Scope';

import type { DXN } from '@dxos/keys';

import type * as CapabilityManager from './capability-manager';
import { CapabilityNotFoundError } from './errors';
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
export const get = <T>(interfaceDef: InterfaceDef<T>): Effect.Effect<T, CapabilityNotFoundError, Service> =>
  Effect.flatMap(Service, (manager) =>
    Effect.try({
      try: () => manager.get(interfaceDef),
      catch: (error) =>
        error instanceof CapabilityNotFoundError
          ? error
          : new CapabilityNotFoundError({ identifier: interfaceDef.identifier, cause: error }),
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
export const waitFor = <T>(interfaceDef: InterfaceDef<T>): Effect.Effect<T, never, Service> =>
  Effect.flatMap(Service, (manager) => manager.waitFor(interfaceDef));

/**
 * Get the live contributions view for a multi capability.
 * @param capability The multi capability tag.
 * @returns The live, reactive {@link Contributions} collection.
 */
export const contributions = <T>(capability: MultiTag<T> | InterfaceDef<T>): Effect.Effect<Contributions<T>, never, Service> =>
  Effect.map(Service, (manager) => manager.contributions(capability));

/**
 * Get the Atom reference to capabilities for reactive access.
 * @param interfaceDef The interface definition of the capability.
 * @returns An Atom containing the array of capability implementations.
 */
export const atom = <T>(interfaceDef: InterfaceDef<T>): Effect.Effect<Atom.Atom<T[]>, never, Service> =>
  Effect.map(Service, (manager) => manager.atom(interfaceDef));

/**
 * Get capabilities grouped by the module that contributed them.
 * @param interfaceDef The interface definition of the capability.
 * @returns An Atom containing a record from module ID to capability implementations.
 */
export const atomByModule = <T>(
  interfaceDef: InterfaceDef<T>,
): Effect.Effect<Atom.Atom<Record<string, T[]>>, never, Service> =>
  Effect.map(Service, (manager) => manager.atomByModule(interfaceDef));

/**
 * Constructs a layer that will request its interface implementation from the capability manager.
 */
export const asLayer = <T, I>(interfaceDef: InterfaceDef<T>, tag: Context.Tag<I, T>): Layer.Layer<I, never, Service> =>
  Layer.effect(tag, get(interfaceDef).pipe(Effect.orDie));

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

//
// Capability tags
//

/**
 * Arity of a capability. `single` capabilities have exactly one provider and yield the
 * implementation directly; `multi` capabilities are open registries contributed to by many
 * modules and yield a live {@link Contributions} collection.
 */
export type Arity = 'single' | 'multi';

declare const CapabilityBrand: unique symbol;

/**
 * Phantom identifier of a capability in the Effect context.
 * Branded by service type and arity so singleton and multi capabilities cannot cross APIs.
 */
export interface CapabilityIdentifier<T, A extends Arity> {
  readonly [CapabilityBrand]: { readonly type: T; readonly arity: A };
}

/**
 * Live, reactive view over all contributions to a multi capability.
 * The collection is not a barrier: entries may be added or removed as plugins are
 * enabled/disabled — consume reactively.
 */
export interface Contributions<T> {
  /**
   * Reactive atom of the current contributions.
   */
  readonly atom: Atom.Atom<T[]>;

  /**
   * Snapshot of the current values.
   */
  get(): readonly T[];

  /**
   * Subscribe to changes.
   * @returns Unsubscribe function.
   */
  subscribe(cb: (values: readonly T[]) => void): () => void;
}

/**
 * A singleton capability: a yieldable Effect tag (`yield* tag` yields the implementation)
 * that is also a legacy {@link InterfaceDef}, so string-keyed helpers and hooks accept it
 * unchanged. The tag's runtime `key` equals the capability `identifier`.
 */
export interface Tag<T> extends Context.Tag<CapabilityIdentifier<T, 'single'>, T>, InterfaceDef<T> {
  readonly arity: 'single';
}

/**
 * A multi (registry) capability: `yield* tag` yields the live {@link Contributions} view.
 */
export interface MultiTag<T> extends Context.Tag<CapabilityIdentifier<T, 'multi'>, Contributions<T>>, InterfaceDef<T> {
  readonly arity: 'multi';
}

export type AnyTag = Tag<any> | MultiTag<any>;

/**
 * Defines a singleton capability.
 * Static NSID strings are validated at compile time via {@link DXN.Name}.
 */
export const make: {
  <T, S extends string = string>(
    identifier: [DXN.Name<S>] extends [never] ? `Invalid NSID "${S}": final segment must be camelCase (no hyphens)` : S,
  ): Tag<T>;
} = <T>(identifier: string): Tag<T> => {
  const tag = Context.GenericTag<CapabilityIdentifier<T, 'single'>, T>(identifier);
  // Controlled brand cast: the InterfaceDef phantom member is type-only.
  return Object.assign(tag, { identifier, arity: 'single' as const }) as Tag<T>;
};

/**
 * Defines a multi (registry) capability.
 * Static NSID strings are validated at compile time via {@link DXN.Name}.
 */
export const makeMulti: {
  <T, S extends string = string>(
    identifier: [DXN.Name<S>] extends [never] ? `Invalid NSID "${S}": final segment must be camelCase (no hyphens)` : S,
  ): MultiTag<T>;
} = <T>(identifier: string): MultiTag<T> => {
  const tag = Context.GenericTag<CapabilityIdentifier<T, 'multi'>, Contributions<T>>(identifier);
  // Controlled brand cast: the InterfaceDef phantom member is type-only.
  return Object.assign(tag, { identifier, arity: 'multi' as const }) as MultiTag<T>;
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
 * Returns the opaque base type so callers cannot discriminate on capability kind,
 * keeping d.ts emit portable across packages.
 */
export const contributes = <I extends InterfaceDef<any>>(
  interfaceDef: I,
  implementation: Capability<InterfaceDef.Implementation<I>>['implementation'],
  deactivate?: Capability<InterfaceDef.Implementation<I>>['deactivate'],
): Any => {
  return {
    interface: interfaceDef,
    implementation,
    deactivate,
  } satisfies Capability<I>;
};

//
// Contributions (typed activate returns)
//

export const ContributionTypeId: unique symbol = Symbol.for('@dxos/app-framework/Contribution');
export type ContributionTypeId = typeof ContributionTypeId;

/**
 * A single typed contribution returned from a module's activate, branded by the capability
 * it satisfies. Carries one value for a singleton capability, n values for a multi capability.
 */
export interface Contribution<C extends AnyTag> {
  readonly [ContributionTypeId]: C;
  readonly capability: C;
  readonly values: readonly unknown[];
  readonly deactivate?: () => Effect.Effect<void, Error>;
}

export type AnyContribution = Contribution<AnyTag>;

/**
 * Type guard to check if a value is a {@link Contribution}.
 */
export const isContribution = (value: unknown): value is AnyContribution => {
  return typeof value === 'object' && value !== null && ContributionTypeId in value;
};

/**
 * Normalizes a module activate result into a flat list of items (legacy capabilities and
 * typed contributions).
 */
export const normalizeActivateResult = (
  result: ModuleReturn | readonly AnyContribution[],
): Array<Any | AnyContribution> => {
  if (result == null) {
    return [];
  }
  // Cast: Array.isArray does not narrow the ReadonlyArray members of ModuleReturn.
  return (Array.isArray(result) ? [...result] : [result]) as Array<Any | AnyContribution>;
};

/**
 * Expands typed contributions into per-value capability entries; legacy capability entries
 * pass through. A multi-value contribution's deactivate hook is attached to its first entry
 * so deactivation runs it exactly once.
 */
export const expandContributions = (items: ReadonlyArray<Any | AnyContribution>): Any[] =>
  items.flatMap((item) =>
    isContribution(item)
      ? item.values.map(
          (value, index): Any => ({
            interface: item.capability,
            implementation: value,
            deactivate: index === 0 ? item.deactivate : undefined,
          }),
        )
      : [item],
  );

/**
 * Provides an implementation for a declared capability.
 * Arity-aware: passing a multi capability where a singleton is expected (or vice versa)
 * is rejected by the value parameter type.
 */
export const provide: {
  <C extends Tag<any>>(
    capability: C,
    implementation: C extends Tag<infer T> ? T : never,
    deactivate?: () => Effect.Effect<void, Error>,
  ): Contribution<C>;
  <C extends MultiTag<any>>(
    capability: C,
    implementation: C extends MultiTag<infer T> ? T : never,
    deactivate?: () => Effect.Effect<void, Error>,
  ): Contribution<C>;
} = <C extends AnyTag>(
  capability: C,
  implementation: unknown,
  deactivate?: () => Effect.Effect<void, Error>,
): Contribution<C> => ({
  [ContributionTypeId]: capability,
  capability,
  values: [implementation],
  deactivate,
});

/**
 * Provides multiple entries for a multi capability from a single module.
 */
export const provideAll = <C extends MultiTag<any>>(
  capability: C,
  implementations: C extends MultiTag<infer T> ? readonly T[] : never,
  deactivate?: () => Effect.Effect<void, Error>,
): Contribution<C> => ({
  [ContributionTypeId]: capability,
  capability,
  values: implementations,
  deactivate,
});

/**
 * What a module's activate may return for a declared provides tuple: an unordered array of
 * contributions whose element type rejects undeclared capabilities. Completeness (every
 * declared capability covered) is checked by {@link EnsureProvides}; the plugin manager's
 * runtime validation is authoritative for both.
 */
export type ProvidesReturn<Provides extends readonly AnyTag[]> = Provides extends readonly []
  ? void | ReadonlyArray<never>
  : ReadonlyArray<Contribution<Provides[number]>>;

/**
 * The capability union covered by an inferred activate return type.
 * The `never` element guard keeps an empty-array return (inferred as `never[]`) from
 * covering every capability via unconstrained inference.
 */
export type CoveredBy<Ret> = Ret extends ReadonlyArray<infer Item>
  ? [Item] extends [never]
    ? never
    : Item extends Contribution<infer C>
      ? C
      : never
  : never;

/**
 * Completeness constraint for a module's activate: evaluates to `unknown` (no-op) when every
 * declared capability is covered by the return type, otherwise to an unconstructible branded
 * type naming the missing capabilities.
 */
export type EnsureProvides<Ret, Provides extends readonly AnyTag[]> = [Provides[number]] extends [CoveredBy<Ret>]
  ? unknown
  : { readonly 'Missing declared capabilities in activate return': Exclude<Provides[number], CoveredBy<Ret>> };

/**
 * The Effect environment available to a module's activate for a declared requires tuple.
 * The framework services ({@link Service}, Plugin.Service) and the module scope stay ambient.
 */
export type Requirements<Requires extends readonly AnyTag[]> =
  | Context.Tag.Identifier<Requires[number]>
  | Service
  | Plugin.Service
  | Scope.Scope;

type LoadCapability<Props, Capabilities extends ModuleReturn = ModuleReturn> = () => Promise<{
  default: (props: Props) => Effect.Effect<Capabilities, Error, Service | Plugin.Service | Scope.Scope | never>;
}>;
type LoadCapabilities<Props, Capabilities extends ModuleReturn = ModuleReturn> = () => Promise<{
  default: (props: Props) => Effect.Effect<Capabilities, Error, Service | Plugin.Service | Scope.Scope | never>;
}>;

type NormalizeReturn<R> = R extends readonly (infer A)[]
  ? A[]
  : R extends (infer A)[]
    ? A[]
    : R extends Any
      ? [R]
      : Any[];

export type LazyCapability<Props = void, Capabilities extends ModuleReturn = ModuleReturn, E extends Error = Error> = (
  props: Props,
) => Effect.Effect<NormalizeReturn<Capabilities>, E, Service | Plugin.Service | Scope.Scope | never>;

/**
 * Helper to define a lazily loaded implementation of a capability.
 * Supports single capabilities, arrays, and tuples of different capability types.
 * @param name The export name (e.g., 'AppGraphBuilder') - used to auto-compute module IDs.
 * @param loader The lazy loader function.
 * @returns A lazy capability function with ModuleTag symbol attached.
 * @deprecated Use {@link lazyModule} with a requires/provides spec.
 */
export const lazy = <T = void, R extends ModuleReturn = ModuleReturn>(
  name: string,
  c: LoadCapability<T, R> | LoadCapabilities<T, R>,
): LazyCapability<T> => {
  const lazyFn = (props: T) =>
    Effect.gen(function* () {
      const { default: getCapability } = yield* Effect.promise(() => c());
      const result = yield* getCapability(props);
      const normalized = result == null ? [] : Array.isArray(result) ? Array.from(result) : [result];
      return normalized as NormalizeReturn<R>;
    });

  // Props (T) are preserved so callers pass correctly-typed options, but the contributed
  // Capabilities type is widened to the opaque base. The concrete capability type often traces to a
  // module-internal source path that TypeScript cannot name in declaration files (TS2883); the base
  // type is portable. The contributed type is checked at Capability.contributes regardless.
  return Object.assign(lazyFn, { [ModuleTag]: name }) as LazyCapability<T>;
};

/**
 * Loader for a spec-carrying lazy module body. The default export's environment is
 * constrained to the declared requires and its return must cover the declared provides.
 */
export type LoadModule<Props, Requires extends readonly AnyTag[], Provides extends readonly AnyTag[]> = () => Promise<{
  default: (props: Props) => Effect.Effect<ProvidesReturn<Provides>, Error, Requirements<Requires>>;
}>;

/**
 * A lazy module body carrying its requires/provides spec eagerly, so dependency ordering
 * never needs to load the chunk. The spec values are attached for the module authoring site.
 */
export type LazyModule<Props, Requires extends readonly AnyTag[], Provides extends readonly AnyTag[]> = ((
  props: Props,
) => Effect.Effect<ProvidesReturn<Provides>, Error, Requirements<Requires>>) & {
  readonly requires: Requires;
  readonly provides: Provides;
};

/**
 * Helper to define a lazily loaded module body with an eager requires/provides spec.
 * The spec is available without importing the chunk (dependency ordering happens before
 * code-splitting resolves) and the loaded default export is type-checked against it.
 * The lazy pairing of {@link makeModule}.
 * @param name The export name (e.g., 'AppGraphBuilder') - used to auto-compute module IDs.
 * @param spec The requires/provides declaration, matching the module authoring site.
 * @param loader The lazy loader function.
 */
export const lazyModule = <
  const Provides extends readonly AnyTag[],
  const Requires extends readonly AnyTag[] = readonly [],
  Props = void,
>(
  name: string,
  spec: { readonly requires?: Requires; readonly provides: Provides },
  loader: LoadModule<Props, Requires, Provides>,
): LazyModule<Props, Requires, Provides> => {
  const lazyFn = (props: Props): Effect.Effect<ProvidesReturn<Provides>, Error, Requirements<Requires>> =>
    Effect.gen(function* () {
      const { default: getModule } = yield* Effect.promise(() => loader());
      return yield* getModule(props);
    });

  // Correlation cast: when `spec.requires` is absent, `Requires` resolves to its
  // `readonly []` default, so the fallback empty tuple is the correct value for it.
  const requires = (spec.requires ?? []) as Requires;
  return Object.assign(lazyFn, { [ModuleTag]: name, requires, provides: spec.provides });
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
 * // Module with required options (context accessed via layer)
 * export default Capability.makeModule(
 *   Effect.fnUntraced(function* (props: { observability: boolean }) {
 *     const invoker = yield* Capability.get(Capabilities.OperationInvoker);
 *     return contributes(Capabilities.OperationHandler, ...);
 *   })
 * );
 *
 * // Module with scoped resources (closed automatically on deactivation)
 * export default Capability.makeModule(
 *   Effect.fnUntraced(function* () {
 *     const scope = yield* Scope.Scope;
 *     yield* Scope.addFinalizer(scope, Effect.sync(() => cleanup()));
 *     return contributes(Capabilities.MyCapability, implementation);
 *   })
 * );
 * ```
 */
export const makeModule = <
  TProps = void,
  TReturn extends ModuleReturn | readonly AnyContribution[] = ModuleReturn,
  E extends Error = Error,
  R extends Requirements<readonly AnyTag[]> = Service,
>(
  fn: (props: TProps) => Effect.Effect<TReturn, E, R | Scope.Scope>,
): ((props: TProps) => Effect.Effect<TReturn, E, R | Scope.Scope>) => fn;
