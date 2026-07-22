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

import type * as ActivationEvent from './activation-event';
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
  capability: MultiTag<T, any> | InterfaceDef<T>,
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

/**
 * Constructs a layer from a capability by resolving it from the capability manager and passing the
 * value to `build`. Lets a consumer depend on a canonical service (e.g. `Identity.Service`) and
 * have it provided from a capability without the consumer referencing the capability system:
 *
 * ```ts
 * effect.pipe(
 *   Effect.provide(Capability.layerWith(ClientCapabilities.IdentityService, (service) =>
 *     Layer.succeed(Identity.Service, service),
 *   )),
 * );
 * ```
 */
export const layerWith = <T, A, E, R>(
  interfaceDef: InterfaceDef<T>,
  build: (value: T) => Layer.Layer<A, E, R>,
): Layer.Layer<A, E, R | Service> => Layer.unwrapEffect(get(interfaceDef).pipe(Effect.orDie, Effect.map(build)));

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
 * Branded by the capability's NSID (a string literal) and arity — never by the service type —
 * so the requirement channel names only local string literals, keeping module bodies'
 * declaration emit portable without per-file annotations. This mirrors Effect's own tags, whose
 * requirement identity is a nominal token (the `Self` class of `Context.Tag`/`Effect.Service`),
 * never the structural service shape. Arity keeps singleton and multi capabilities from crossing APIs.
 */
export interface CapabilityIdentifier<Id extends string, A extends Arity> {
  readonly [CapabilityBrand]: { readonly id: Id; readonly arity: A };
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
// `S` defaults to `any` (not `string`): `Context.Tag` is invariant in its identifier, so a bare
// annotation like `Tag<Example>` — meaning "a singleton tag of this service type, any NSID" —
// must be assignable from every concrete `Tag<Example, "the.actual.nsid">`; defaulting to `string`
// would reject all of them since neither is a subtype of the other under invariance.
export interface Tag<T, S extends string = any>
  extends Context.Tag<CapabilityIdentifier<S, 'single'>, T>, InterfaceDef<T> {
  readonly arity: 'single';
}

/**
 * A multi (registry) capability: `yield* tag` yields the live {@link Contributions} view.
 */
export interface MultiTag<T, S extends string = any>
  extends Context.Tag<CapabilityIdentifier<S, 'multi'>, Contributions<T>>, InterfaceDef<T> {
  readonly arity: 'multi';
}

export type AnyTag = Tag<any, any> | MultiTag<any, any>;

/**
 * Compile-time error surfaced when the service type is omitted from the curried factory form.
 * Mirrors Effect's `MissingSelfGeneric` guard on `Effect.Service`/`Context.Tag`: the service type
 * cannot be inferred (it is unrelated to the identifier string), so omitting it would silently
 * widen the identifier to `string` and make the requirement check vacuous — this turns that
 * footgun into a message instead.
 */
type MissingServiceType = 'Missing service type — write make<T>()(nsid) / makeSingleton<T>()(nsid)';

/** Identifier-string parameter, validated as a well-formed NSID at compile time via {@link DXN.Name}. */
type NsidParam<S extends string> = [DXN.Name<S>] extends [never]
  ? `Invalid NSID "${S}": final segment must be camelCase (no hyphens)`
  : S;

// Runtime tag construction — the phantom brand (`CapabilityIdentifier`) and `InterfaceDef` member
// are type-only, so assembling the concrete tag object requires a controlled cast at this boundary
// (as Effect's own tag constructors do internally). Isolated here so call sites stay cast-free.
const buildTag = <T, S extends string, A extends Arity>(identifier: S, arity: A) =>
  Object.assign(Context.GenericTag<CapabilityIdentifier<S, A>, T>(identifier), {
    identifier,
    arity,
  }) as unknown as A extends 'multi' ? MultiTag<T, S> : Tag<T, S>;

/**
 * Defines a multi (registry) capability — the default: an open registry contributed to by
 * many modules, yielding a live {@link Contributions} collection.
 *
 * Preferred (curried) form captures the NSID string literal, so the requirement channel stays
 * precise and portable — the same shape Effect uses for `Context.Tag`/`Effect.Service`:
 * `make<T>()('org.dxos…capability')`. The service type `T` is explicit (it cannot be inferred);
 * the NSID `S` is inferred as a literal in the second call.
 *
 * The single-call form `make<T>(nsid)` is a transitional shim that widens `S` to `string`
 * (identifier stays portable but the requirement check for that capability is coarse); migrate
 * to the curried form to restore a precise check. Static NSID strings are validated via {@link DXN.Name}.
 */
export const make: {
  <T = never>(): [T] extends [never]
    ? MissingServiceType
    : <const S extends string>(identifier: NsidParam<S>) => MultiTag<T, S>;
  <T, S extends string = string>(identifier: NsidParam<S>): MultiTag<T, string>;
} = ((identifier?: string) =>
  identifier === undefined
    ? <const S extends string>(id: S) => buildTag<unknown, S, 'multi'>(id, 'multi')
    : buildTag<unknown, string, 'multi'>(identifier, 'multi')) as any;

/**
 * Defines a singleton capability: exactly one provider, `yield*` yields the implementation.
 * Curried like {@link make} (and Effect's `Context.Tag`/`Effect.Service`): `makeSingleton<T>()(nsid)`;
 * the single-call `makeSingleton<T>(nsid)` is the same transitional shim. Validated via {@link DXN.Name}.
 */
export const makeSingleton: {
  <T = never>(): [T] extends [never]
    ? MissingServiceType
    : <const S extends string>(identifier: NsidParam<S>) => Tag<T, S>;
  <T, S extends string = string>(identifier: NsidParam<S>): Tag<T, string>;
} = ((identifier?: string) =>
  identifier === undefined
    ? <const S extends string>(id: S) => buildTag<unknown, S, 'single'>(id, 'single')
    : buildTag<unknown, string, 'single'>(identifier, 'single')) as any;

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
 * A single typed contribution returned from a module's activate, branded by the capability's
 * identifier (NSID + arity) rather than its full tag — so a module body's inferred return type
 * names only local string literals, never the (possibly non-portable) service type `T`, keeping
 * declaration emit portable. The value-type safety is enforced at the {@link provide} call, where
 * `T` is naturally in scope; downstream only the capability identity matters (completeness check).
 * Carries one value for a singleton capability, n values for a multi capability.
 */
// `Id` is a capability identifier (`CapabilityIdentifier<S, A>`) — left unconstrained because
// `Context.Tag.Identifier<C>` is opaque to the checker for a generic tag `C` and wouldn't satisfy
// an explicit bound; the default documents the intended shape.
export interface Contribution<Id = CapabilityIdentifier<string, Arity>> {
  readonly [ContributionTypeId]: Id;
  // Erased to the base tag union in the type (the real tag is present at runtime): a precise `C`
  // here would re-leak its service type into every consuming body's declaration emit.
  readonly capability: AnyTag;
  readonly values: readonly unknown[];
  readonly deactivate?: () => Effect.Effect<void, Error>;
}

export type AnyContribution = Contribution;

/**
 * The capability identifier (NSID + arity) of a tag. Extracted from our own {@link Tag}/
 * {@link MultiTag} `S` parameter rather than via Effect's `Context.Tag.Identifier`, which — for a
 * generic tag parameter — falls through to its `TagClassShape` branch and yields the raw tag
 * (leaking the service type again). Singleton checked first; a singleton never matches the multi
 * arm and vice versa (the arity brand differs).
 */
export type IdentifierOf<C> =
  C extends Tag<any, infer S>
    ? CapabilityIdentifier<S, 'single'>
    : C extends MultiTag<any, infer S>
      ? CapabilityIdentifier<S, 'multi'>
      : never;

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
  <C extends Tag<any, any>>(
    capability: C,
    implementation: C extends Tag<infer T, any> ? T : never,
    deactivate?: () => Effect.Effect<void, Error>,
  ): Contribution<IdentifierOf<C>>;
  <C extends MultiTag<any, any>>(
    capability: C,
    implementation: C extends MultiTag<infer T, any> ? T : never,
    deactivate?: () => Effect.Effect<void, Error>,
  ): Contribution<IdentifierOf<C>>;
} = <C extends AnyTag>(
  capability: C,
  implementation: unknown,
  deactivate?: () => Effect.Effect<void, Error>,
): Contribution<IdentifierOf<C>> => ({
  // Controlled brand cast: `[ContributionTypeId]` is a type-only identifier brand; at runtime it
  // holds the tag (isContribution checks presence only).
  [ContributionTypeId]: capability as unknown as IdentifierOf<C>,
  capability,
  values: [implementation],
  deactivate,
});

/**
 * Provides multiple entries for a multi capability from a single module.
 */
export const provideAll = <C extends MultiTag<any, any>>(
  capability: C,
  implementations: C extends MultiTag<infer T, any> ? readonly T[] : never,
  deactivate?: () => Effect.Effect<void, Error>,
): Contribution<IdentifierOf<C>> => ({
  // Controlled brand cast: see {@link provide}.
  [ContributionTypeId]: capability as unknown as IdentifierOf<C>,
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
  : ReadonlyArray<Contribution<ProvidedIds<Provides>>>;

/**
 * The capability identifiers of a provides tuple — the provides-side parallel to
 * {@link Requirements}. Contributions and the completeness check compare identities by these
 * (NSID + arity) rather than by the full tag, so neither leaks the service type.
 */
export type ProvidedIds<Provides extends readonly AnyTag[]> = IdentifierOf<Provides[number]>;

/**
 * The capability identifiers covered by an inferred activate return type.
 * The `never` element guard keeps an empty-array return (inferred as `never[]`) from
 * covering every capability via unconstrained inference.
 */
export type CoveredBy<Ret> =
  Ret extends ReadonlyArray<infer Item>
    ? [Item] extends [never]
      ? never
      : Item extends Contribution<infer Id>
        ? Id
        : never
    : never;

/**
 * Completeness constraint for a module's activate: evaluates to `unknown` (no-op) when every
 * declared capability is covered by the return type, otherwise to an unconstructible branded
 * type naming the missing capability identifiers.
 */
export type EnsureProvides<Ret, Provides extends readonly AnyTag[]> = [ProvidedIds<Provides>] extends [CoveredBy<Ret>]
  ? unknown
  : { readonly 'Missing declared capabilities in activate return': Exclude<ProvidedIds<Provides>, CoveredBy<Ret>> };

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
 * A module body carrying its activation spec as erased runtime values. The spec types are
 * enforced where the body is authored ({@link lazyModule} / {@link inlineModule}) and
 * deliberately absent from this type, so exporting a module never leaks foreign capability
 * types into declaration emit (TS2883). Runtime manager validation is authoritative.
 */
export interface Module<Options = void> {
  (options: Options): Effect.Effect<any, Error, any>;
  readonly requires: readonly AnyTag[];
  readonly provides: readonly AnyTag[];
  readonly activatesOn?: ActivationEvent.Events;
}

/**
 * Spec shared by {@link lazyModule} and {@link inlineModule}: the requires/provides
 * declaration checked at the authoring site, plus the optional event-mode and
 * props-mapping fields carried alongside it.
 */
type ModuleSpec<Provides extends readonly AnyTag[], Requires extends readonly AnyTag[], Props, Options> = {
  readonly requires?: Requires;
  readonly provides: Provides;
  /** Activates when this runtime event fires instead of during the dependency pass. */
  readonly activatesOn?: ActivationEvent.Events;
  /** Maps plugin options to the body's props; omit when they coincide. */
  readonly props?: (options: Options) => Props;
};

/**
 * Helper to define a lazily loaded module body with an eager requires/provides spec.
 * The spec is available without importing the chunk (dependency ordering happens before
 * code-splitting resolves) and the loaded default export is type-checked against it. The
 * returned {@link Module} is opaque with respect to requires/provides/props, parameterized
 * only by `Options` — this is what eliminates TS2883 at every call site.
 * The lazy pairing of {@link makeModule}.
 * @param name The export name (e.g., 'AppGraphBuilder') - used to auto-compute module IDs.
 * @param spec The requires/provides declaration, matching the module authoring site.
 * @param loader The lazy loader function.
 */
export const lazyModule = <
  const Provides extends readonly AnyTag[],
  const Requires extends readonly AnyTag[] = readonly [],
  Props = void,
  Options = Props,
>(
  name: string,
  spec: ModuleSpec<Provides, Requires, Props, Options>,
  loader: LoadModule<Props, Requires, Provides>,
): Module<Options> => {
  const lazyFn = (options: Options): Effect.Effect<any, Error, any> =>
    Effect.gen(function* () {
      const { default: getModule } = yield* Effect.promise(() => loader());
      // Correlation cast: when `spec.props` is absent, `Options` resolves to its `Props`
      // default, so `options` is a valid `Props` value.
      const props = spec.props ? spec.props(options) : (options as unknown as Props);
      return yield* getModule(props);
    });

  // Correlation cast: when `spec.requires` is absent, `Requires` resolves to its
  // `readonly []` default, so the fallback empty tuple is the correct value for it.
  const requires = (spec.requires ?? []) as Requires;
  return Object.assign(lazyFn, {
    [ModuleTag]: name,
    requires,
    provides: spec.provides,
    activatesOn: spec.activatesOn,
  });
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
  Options = Props,
>(
  name: string,
  spec: ModuleSpec<Provides, Requires, Props, Options>,
  activate: (props: Props) => Effect.Effect<ProvidesReturn<Provides>, Error, Requirements<Requires>>,
): Module<Options> => {
  // Correlation cast: when `spec.requires` is absent, `Requires` resolves to its
  // `readonly []` default, so the fallback empty tuple is the correct value for it.
  const requires = (spec.requires ?? []) as Requires;
  const body = (options: Options): Effect.Effect<any, Error, any> => {
    // Correlation cast: when `spec.props` is absent, `Options` resolves to its `Props`
    // default, so `options` is a valid `Props` value.
    const props = spec.props ? spec.props(options) : (options as unknown as Props);
    return activate(props);
  };
  return Object.assign(body, {
    [ModuleTag]: name,
    requires,
    provides: spec.provides,
    activatesOn: spec.activatesOn,
  });
};

/**
 * Options accepted by makers built with {@link moduleMaker}.
 */
export type MakerOptions<
  Requires extends readonly AnyTag[] = readonly [],
  Extra extends readonly AnyTag[] = readonly [],
  Props = void,
  Options = Props,
> = {
  /** Overrides the default module name (used to derive the module id). */
  name?: string;
  /** Capabilities the body accesses via `yield*`. */
  requires?: Requires;
  /** Additional capabilities the body contributes beyond the maker's default. */
  provides?: Extra;
  /** Activates when this runtime event fires instead of during the dependency pass. */
  activatesOn?: ActivationEvent.Events;
  /** Maps plugin options to the body's props; omit when they coincide. */
  props?: (options: Options) => Props;
};

/**
 * Builds a lazy-module maker for a capability, with the tag and default module name baked
 * in so the maker takes only a loader in the common case. Capability owners export makers
 * so consumers author modules without restating the spec.
 */
export const moduleMaker =
  <C extends AnyTag>(defaultName: string, capability: C) =>
  <
    Props = void,
    Options = Props,
    const Requires extends readonly AnyTag[] = readonly [],
    const Extra extends readonly AnyTag[] = readonly [],
  >(
    loader: LoadModule<Props, Requires, readonly [C, ...Extra]>,
    options?: MakerOptions<Requires, Extra, Props, Options>,
  ): Module<Options> => {
    // Correlation casts: when options are absent, Requires/Extra resolve to their
    // `readonly []` defaults, so the fallback empty tuples are the correct values.
    const requires = (options?.requires ?? []) as Requires;
    const extra = (options?.provides ?? []) as Extra;
    return lazyModule(
      options?.name ?? defaultName,
      { requires, provides: [capability, ...extra], activatesOn: options?.activatesOn, props: options?.props },
      loader,
    );
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
