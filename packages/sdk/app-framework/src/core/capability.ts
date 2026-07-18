//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
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
 * Get a single capability from the capability manager, if one is contributed.
 * Never fails — use this over {@link get} when the capability's absence (e.g. an optional plugin
 * isn't loaded) is a legitimate case to handle rather than an error.
 * @param interfaceDef The interface definition of the capability.
 * @returns The first capability implementation, or `Option.none()` if none is contributed.
 */
export const getOption = <T>(interfaceDef: InterfaceDef<T>): Effect.Effect<Option.Option<T>, never, Service> =>
  Effect.map(getAll(interfaceDef), (all) => Option.fromNullable(all[0]));

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
export const contributions = <T>(
  capability: MultiTag<T> | InterfaceDef<T>,
): Effect.Effect<Contributions<T>, never, Service> =>
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
 * Defines a multi (registry) capability — the default: an open registry contributed to by
 * many modules, yielding a live {@link Contributions} collection.
 * Static NSID strings are validated at compile time via {@link DXN.Name}.
 */
export const make: {
  <T, S extends string = string>(
    identifier: [DXN.Name<S>] extends [never] ? `Invalid NSID "${S}": final segment must be camelCase (no hyphens)` : S,
  ): MultiTag<T>;
} = <T>(identifier: string): MultiTag<T> => {
  const tag = Context.GenericTag<CapabilityIdentifier<T, 'multi'>, Contributions<T>>(identifier);
  // Controlled brand cast: the InterfaceDef phantom member is type-only.
  return Object.assign(tag, { identifier, arity: 'multi' as const }) as MultiTag<T>;
};

/**
 * Defines a singleton capability: exactly one provider, `yield*` yields the implementation.
 * Static NSID strings are validated at compile time via {@link DXN.Name}.
 */
export const makeSingleton: {
  <T, S extends string = string>(
    identifier: [DXN.Name<S>] extends [never] ? `Invalid NSID "${S}": final segment must be camelCase (no hyphens)` : S,
  ): Tag<T>;
} = <T>(identifier: string): Tag<T> => {
  const tag = Context.GenericTag<CapabilityIdentifier<T, 'single'>, T>(identifier);
  // Controlled brand cast: the InterfaceDef phantom member is type-only.
  return Object.assign(tag, { identifier, arity: 'single' as const }) as Tag<T>;
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
 * Union of the raw capability-entry shapes accepted where a module's return isn't
 * type-checked against a declared `provides` — direct manager injection (`withPluginManager`'s
 * `capabilities` fixture option, {@link CapabilityManager.contribute}) rather than authored
 * modules, which return typed {@link Contribution}s (see {@link makeModule}).
 */
export type ModuleReturn = void | Any | Any[] | readonly Any[] | [Any, ...Any[]] | readonly [Any, ...Any[]];

/**
 * Builds a raw capability entry for direct manager injection (test/story fixtures) — see
 * {@link ModuleReturn}. Authored modules return {@link provide}/{@link provideAll} instead.
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
export type CoveredBy<Ret> =
  Ret extends ReadonlyArray<infer Item>
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

/**
 * Loader for a spec-carrying lazy module body. The default export's environment is
 * constrained to the declared requires and its return must cover the declared provides.
 */
export type LoadModule<Props, Requires extends readonly AnyTag[], Provides extends readonly AnyTag[]> = () => Promise<{
  default: (props: Props) => Effect.Effect<ProvidesReturn<Provides>, Error, Requirements<Requires>>;
}>;

/**
 * A module body carrying its requires/provides spec eagerly, so dependency ordering never
 * needs to execute the body (or load its chunk, for lazy bodies). Produced by
 * {@link lazyModule} (code-split body) or {@link inlineModule} (eager body).
 */
export type Module<Props, Requires extends readonly AnyTag[], Provides extends readonly AnyTag[]> = ((
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
): Module<Props, Requires, Provides> => {
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
 * Helper to define an eager module body with the same spec-carrying shape as
 * {@link lazyModule} — for bodies that are plain values (translations, schema) or too small
 * to justify a chunk, so plugin definitions stay a uniform chain of spec-carrying modules.
 * @param name The module name — used to auto-compute module IDs.
 * @param spec The requires/provides declaration.
 * @param activate The module body.
 */
export const inlineModule = <
  const Provides extends readonly AnyTag[],
  const Requires extends readonly AnyTag[] = readonly [],
  Props = void,
>(
  name: string,
  spec: { readonly requires?: Requires; readonly provides: Provides },
  activate: (props: Props) => Effect.Effect<ProvidesReturn<Provides>, Error, Requirements<Requires>>,
): Module<Props, Requires, Provides> => {
  // Correlation cast: when `spec.requires` is absent, `Requires` resolves to its
  // `readonly []` default, so the fallback empty tuple is the correct value for it.
  const requires = (spec.requires ?? []) as Requires;
  const body = (props: Props) => activate(props);
  return Object.assign(body, { [ModuleTag]: name, requires, provides: spec.provides });
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
 * - Access declared `requires` via `yield*` (or the ambient `Capability.Service`/`Plugin.Service`)
 * - Return an array of typed {@link Contribution}s (see {@link provide}/{@link provideAll})
 *
 * @example
 * ```ts
 * // Module without options - single capability
 * export default Capability.makeModule(
 *   Effect.fnUntraced(function* () {
 *     const client = yield* ClientCapabilities.Client;
 *     return [Capability.provide(Capabilities.SettingsStore, store)];
 *   })
 * );
 *
 * // Module with multiple capabilities
 * export default Capability.makeModule(
 *   Effect.fnUntraced(function* () {
 *     return [
 *       Capability.provide(Capabilities.SettingsStore, store),
 *       Capability.provide(Capabilities.Translations, translations),
 *     ];
 *   })
 * );
 *
 * // Module with required options (context accessed via layer)
 * export default Capability.makeModule(
 *   Effect.fnUntraced(function* (props: { observability: boolean }) {
 *     const invoker = yield* Capabilities.OperationInvoker;
 *     return [Capability.provide(Capabilities.OperationHandler, ...)];
 *   })
 * );
 *
 * // Module with scoped resources (closed automatically on deactivation)
 * export default Capability.makeModule(
 *   Effect.fnUntraced(function* () {
 *     const scope = yield* Scope.Scope;
 *     yield* Scope.addFinalizer(scope, Effect.sync(() => cleanup()));
 *     return [Capability.provide(Capabilities.MyCapability, implementation)];
 *   })
 * );
 * ```
 */
export const makeModule = <
  TProps = void,
  TReturn extends readonly AnyContribution[] = readonly AnyContribution[],
  E extends Error = Error,
  R extends Requirements<readonly AnyTag[]> = Service,
>(
  fn: (props: TProps) => Effect.Effect<TReturn, E, R | Scope.Scope>,
): ((props: TProps) => Effect.Effect<TReturn, E, R | Scope.Scope>) => fn;
