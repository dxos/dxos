//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Pipeable from 'effect/Pipeable';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';
import type * as Types from 'effect/Types';

import { BaseError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { Config2, PluginProfileSchema, PluginReleaseSchema } from '@dxos/protocols';

import type * as ActivationEvent from './activation-event';
import * as Capability from './capability';
import type * as PluginManager from './plugin-manager';

//
// Plugin Service Layer
//

/**
 * Effect Context.Tag for accessing PluginManager via the Effect layer system.
 * This allows lifecycle operations to access the plugin manager without having it passed as an argument.
 */
export class Service extends Context.Tag('@dxos/app-framework/PluginManager')<Service, PluginManager.PluginManager>() {}

//
// Lifecycle Functions
//

/**
 * Activates plugins based on the activation event.
 * Accesses the PluginManager via the Effect layer system.
 * @param event The activation event.
 * @returns Whether the activation was successful.
 */
export const activate = (event: ActivationEvent.ActivationEvent): Effect.Effect<boolean, Error, Service> =>
  Effect.flatMap(Service, (manager) => manager.activate(event));

/**
 * Re-activates the modules that were activated by the event.
 * Accesses the PluginManager via the Effect layer system.
 * @param event The activation event.
 * @returns Whether the reset was successful.
 */
export const reset = (event: ActivationEvent.ActivationEvent): Effect.Effect<boolean, Error, Service> =>
  Effect.flatMap(Service, (manager) => manager.reset(event));

/**
 * Shuts down the plugin manager, deactivating all active modules and clearing lifecycle state.
 * Accesses the PluginManager via the Effect layer system.
 */
export const shutdown = (): Effect.Effect<boolean, Error, Service> =>
  Effect.flatMap(Service, (manager) => manager.shutdown());

/**
 * Computes a module ID from plugin ID and export name.
 */
const computeModuleId = (pluginId: string, moduleName: string): string => {
  return `${pluginId}.module.${moduleName}`;
};

/**
 * Identifier denoting a PluginModule.
 */
export const PluginModuleTypeId: unique symbol = Symbol.for('@dxos/app-framework/PluginModule');
export type PluginModuleTypeId = typeof PluginModuleTypeId;

/**
 * Type guard to check if a value is a PluginModule.
 */
export const isPluginModule = (value: unknown): value is PluginModule => {
  return typeof value === 'object' && value !== null && PluginModuleTypeId in value;
};

/**
 * Normalized activation specification of a module — how and when it activates.
 *
 * - `dependency`: activates during the startup dependency-resolution pass, topologically
 *   ordered by the capability graph (providers of `requires` activate first).
 * - `event`: activates when a runtime event fires; `requires` are resolved on demand.
 * - `legacy`: activates on an event with hand-wired `firesBeforeActivation` /
 *   `firesAfterActivation` ordering. Scaffolding for the migration; removed once all
 *   plugins declare capability dependencies.
 */
export type ActivationSpec =
  | {
      readonly mode: 'dependency';
      readonly requires: readonly Capability.AnyTag[];
      readonly provides: readonly Capability.AnyTag[];
      readonly compatFires?: readonly ActivationEvent.ActivationEvent[];
    }
  | {
      readonly mode: 'event';
      readonly activatesOn: ActivationEvent.Events;
      readonly requires: readonly Capability.AnyTag[];
      readonly provides: readonly Capability.AnyTag[];
      readonly compatFires?: readonly ActivationEvent.ActivationEvent[];
    }
  | {
      readonly mode: 'legacy';
      readonly activatesOn: ActivationEvent.Events;
      readonly firesBeforeActivation?: readonly ActivationEvent.ActivationEvent[];
      readonly firesAfterActivation?: readonly ActivationEvent.ActivationEvent[];
    };

/**
 * What a module's activate may produce at runtime: legacy capability contributions or
 * typed {@link Capability.Contribution}s.
 */
export type ModuleActivateResult = Capability.ModuleReturn | readonly Capability.AnyContribution[];

/**
 * A unit of containment of modular functionality that can be provided to an application.
 * Activation of a module is async allowing for code to split and loaded lazily.
 *
 * Ordering between modules is expressed through capability dependencies, not registration
 * order: a module declares the capabilities it `provides` and `requires`, and the plugin
 * manager activates providers before consumers (topological order). Runtime-event modules
 * (`activatesOn`) activate only when their event fires. See
 * `plugin-client/src/ClientPlugin.ts` for a worked example.
 *
 * @idiom org.dxos.app-framework.moduleActivationOrdering
 *   applies: sequencing one plugin module's activation before or after another
 *   instead-of: assuming module registration order controls activation order
 *   uses: {@link ActivationSpec}
 */
export interface PluginModule {
  readonly [PluginModuleTypeId]: PluginModuleTypeId;
  /**
   * Unique id of the module.
   */
  id: string;

  /**
   * Normalized activation specification — how and when the module activates.
   */
  readonly activation: ActivationSpec;

  /**
   * @deprecated Read {@link activation}. Undefined for dependency-mode modules.
   */
  readonly activatesOn?: ActivationEvent.Events;

  /**
   * @deprecated Read {@link activation}. Only set for legacy modules.
   */
  readonly firesBeforeActivation?: readonly ActivationEvent.ActivationEvent[];

  /**
   * @deprecated Read {@link activation}. Only set for legacy modules.
   */
  readonly firesAfterActivation?: readonly ActivationEvent.ActivationEvent[];

  /**
   * Called when the module is activated.
   * Declared `requires` are provided as Effect services; CapabilityManager and PluginManager
   * are ambient (Capability.Service, Plugin.Service).
   * @param props Optional props passed to the module.
   * @returns The capabilities of the module.
   */
  activate: (
    props?: any,
  ) => Effect.Effect<ModuleActivateResult, Error, Capability.Service | Service | Scope.Scope | never>;
}

/**
 * Legacy module authoring shape (event-driven with hand-wired ordering).
 * @deprecated Declare `provides`/`requires` (dependency mode) or `activatesOn` +
 *   `requires`/`provides` (runtime-event mode) instead.
 */
export type PluginModuleOptions = {
  id?: string;
  activatesOn: ActivationEvent.Events;
  firesBeforeActivation?: readonly ActivationEvent.ActivationEvent[];
  firesAfterActivation?: readonly ActivationEvent.ActivationEvent[];
  activate: (
    props?: any,
  ) => Effect.Effect<Capability.ModuleReturn, Error, Capability.Service | Service | Scope.Scope | never>;
};

/**
 * Structural authoring shape for typed modules — dependency mode (`provides` present, no
 * `activatesOn`; activates during the startup dependency pass, ordered by the capability
 * graph — an empty `provides` consciously declares a startup root) or runtime-event mode
 * (`activatesOn` present; activates when the event fires, `requires` resolved on demand,
 * `provides` land in the registry without participating in startup ordering).
 * Mode validity and activate-channel enforcement happen in {@link ValidateModuleOptions}.
 */
export type TypedModuleOptions = {
  readonly id?: string;
  readonly activatesOn?: ActivationEvent.Events;
  readonly requires?: readonly Capability.AnyTag[];
  readonly provides?: readonly Capability.AnyTag[];
  readonly firesBeforeActivation?: never;
  readonly firesAfterActivation?: never;
  /**
   * Legacy events fired by the framework after this module activates.
   * Migration bridge for unmigrated listeners; removed with the legacy API.
   */
  readonly compatFires?: readonly ActivationEvent.ActivationEvent[];
  readonly activate: (props?: any) => Effect.Effect<any, any, any>;
};

type OptRequires<Opts> = Opts extends { requires: infer R extends readonly Capability.AnyTag[] } ? R : readonly [];
type OptProvides<Opts> = Opts extends { provides: infer P extends readonly Capability.AnyTag[] } ? P : readonly [];

/**
 * Validates typed module options: evaluates to `true` for a valid module, otherwise to an
 * unconstructible branded type naming the violation. Checks that the options match one of
 * the two activation modes, that activate's environment only uses declared `requires`, that
 * its error channel extends `Error`, and that its return exactly covers the declared
 * `provides`. Options with no capability declarations are legacy and validate as `true`
 * (the runtime normalizer classifies them).
 *
 * Applied on {@link addModule}'s return type (not intersected with the parameter): inference
 * of `Opts` from an options object containing inline generator activates fails when the
 * parameter is an intersection with a conditional over `Opts`, but succeeds for a naked
 * `Opts` parameter. An invalid module surfaces as a non-callable branded return, which the
 * `.pipe(...)` site rejects with the brand's message.
 */
export type ValidateModuleOptions<Opts extends TypedModuleOptions> = Opts extends
  | { provides: readonly Capability.AnyTag[] }
  | { activatesOn: ActivationEvent.Events; requires: readonly Capability.AnyTag[] }
  ? Opts['activate'] extends (props?: any) => Effect.Effect<infer A, infer E, infer R>
    ? [R] extends [Capability.Requirements<OptRequires<Opts>>]
      ? [E] extends [Error]
        ? [A] extends [Capability.ProvidesReturn<OptProvides<Opts>>]
          ? [OptProvides<Opts>[number]] extends [Capability.CoveredBy<A>]
            ? true
            : {
                readonly 'activate return misses declared capabilities': Exclude<
                  OptProvides<Opts>[number],
                  Capability.CoveredBy<A>
                >;
              }
          : {
              readonly 'activate return includes undeclared capabilities': Exclude<
                Capability.CoveredBy<A>,
                OptProvides<Opts>[number]
              >;
            }
        : { readonly 'activate error channel must extend Error': E }
      : { readonly 'activate requires undeclared capabilities': Exclude<R, Capability.Requirements<OptRequires<Opts>>> }
    : { readonly 'activate must be an effect-returning function': Opts['activate'] }
  : Opts extends { requires: readonly Capability.AnyTag[] }
    ? { readonly 'module with requires must declare provides or activatesOn': Opts }
    : true;

/**
 * Erased module authoring record stored on the builder. Type enforcement happens at the
 * {@link addModule} overloads; the builder itself is intentionally heterogeneous.
 */
export type ModuleEntry = {
  readonly id?: string;
  readonly activatesOn?: ActivationEvent.Events;
  readonly firesBeforeActivation?: readonly ActivationEvent.ActivationEvent[];
  readonly firesAfterActivation?: readonly ActivationEvent.ActivationEvent[];
  readonly requires?: readonly Capability.AnyTag[];
  readonly provides?: readonly Capability.AnyTag[];
  readonly compatFires?: readonly ActivationEvent.ActivationEvent[];
  readonly activate: (props?: any) => Effect.Effect<any, Error, any>;
};

class PluginModuleImpl implements PluginModule {
  readonly [PluginModuleTypeId]: PluginModuleTypeId = PluginModuleTypeId;
  readonly id: string;
  readonly activation: ActivationSpec;
  readonly activate: PluginModule['activate'];

  constructor(options: { id: string; activation: ActivationSpec; activate: PluginModule['activate'] }) {
    this.id = options.id;
    this.activation = options.activation;
    this.activate = options.activate;
  }

  /** @deprecated Read {@link activation}. */
  get activatesOn(): ActivationEvent.Events | undefined {
    return this.activation.mode === 'dependency' ? undefined : this.activation.activatesOn;
  }

  /** @deprecated Read {@link activation}. */
  get firesBeforeActivation(): readonly ActivationEvent.ActivationEvent[] | undefined {
    return this.activation.mode === 'legacy' ? this.activation.firesBeforeActivation : undefined;
  }

  /** @deprecated Read {@link activation}. */
  get firesAfterActivation(): readonly ActivationEvent.ActivationEvent[] | undefined {
    return this.activation.mode === 'legacy' ? this.activation.firesAfterActivation : undefined;
  }
}

/**
 * Runtime plugin metadata, derived from the `@dxos/protocols` registry schemas (protocols owns the
 * config + registry schemas; the runtime projection lives here).
 *
 * - {@link Profile}: version-independent identity + display + provenance — the wire `PluginProfileSchema`
 *   (which carries `key`, the display fields, `dependsOn`, `spec`) plus `author` (resolved at runtime
 *   from the publisher's handle/DID for registry plugins, or self-declared for bundled).
 * - {@link Release}: a specific hosted release — the wire `PluginReleaseSchema` (version, moduleUrl, dependencies).
 * - {@link Meta}: a resolved single-release view — `{ profile, release? }`, both nested. `release` is
 *   unset for bundled plugins (compiled in) and set for registry plugins.
 */
export const Profile = Schema.Struct({
  ...PluginProfileSchema.fields,
  author: Schema.optional(Schema.String),
});
export type Profile = Schema.Schema.Type<typeof Profile>;

export const Release = PluginReleaseSchema;
export type Release = Schema.Schema.Type<typeof Release>;

export const Meta = Schema.Struct({
  profile: Profile,
  release: Schema.optional(Release),
});
export type Meta = Schema.Schema.Type<typeof Meta>;

/** Options for {@link makeMeta}: the {@link Profile} content fields plus the canonical DXN `key`. */
export type MakeMetaOptions = {
  key: DXN.DXN;
  name: string;
  description?: string;
  author?: string;
  homePage?: string;
  source?: string;
  tags?: readonly string[];
  dependsOn?: readonly string[];
  spec?: string;
  icon?: Config2.Icon;
  screenshots?: ReadonlyArray<Config2.Screenshot>;
};

/** Constructs a bundled-plugin {@link Meta} from a canonical DXN. `profile.key` is the bare NSID derived from `key`. */
export const makeMeta = (options: MakeMetaOptions): Meta => {
  const { key, ...rest } = options;
  return { profile: { ...rest, key: DXN.getName(key) } };
};

/** Returns the plugin's canonical DXN URI, constructed from `meta.profile.key` and `meta.release?.version`. */
export const getURI = (meta: Meta): DXN.DXN => DXN.make(meta.profile.key, meta.release?.version);

/**
 * Derives a runtime {@link Meta} from a loaded `dx.config.ts` (the `@dxos/protocols` `Config2.Config`).
 * Maps the flat authoring config to the nested profile; bundled plugins have no `release`.
 */
export const getMetaFromConfig = ({ plugin }: Config2.Config): Meta => {
  const { key, ...rest } = plugin;
  return makeMeta({ key: DXN.make(key), ...rest });
};

/**
 * Identifier denoting a Plugin.
 */
export const PluginTypeId: unique symbol = Symbol.for('@dxos/app-framework/Plugin');
export type PluginTypeId = typeof PluginTypeId;

/**
 * Type guard to check if a value is a Plugin.
 */
export const isPlugin = (value: unknown): value is Plugin => {
  return typeof value === 'object' && value !== null && PluginTypeId in value;
};

/**
 * A collection of modules that are be enabled/disabled as a unit.
 * Plugins provide things such as components, state, actions, etc. to the application.
 */
// TODO(burdon): Convert to ECHO schema.
export interface Plugin {
  readonly [PluginTypeId]: PluginTypeId;
  readonly meta: Readonly<Meta>;
  readonly modules: ReadonlyArray<PluginModule>;
}

/**
 * Internal implementation of Plugin.
 * @internal
 */
class PluginImpl implements Plugin {
  readonly [PluginTypeId]: PluginTypeId = PluginTypeId;

  constructor(
    private readonly _meta: Meta,
    private readonly _modules: PluginModule[],
  ) {}

  get meta(): Readonly<Meta> {
    return this._meta;
  }

  get modules(): ReadonlyArray<PluginModule> {
    return this._modules;
  }
}

/**
 * Builder interface for creating plugins incrementally.
 */
export interface PluginBuilder<T = void> extends Pipeable.Pipeable {
  readonly meta: Meta;
  readonly modules: ReadonlyArray<ModuleEntry | ((options: T) => ModuleEntry)>;
  addModule(moduleOptions: ModuleEntry | ((options: T) => ModuleEntry)): PluginBuilder<T>;
}

/**
 * Builder implementation for creating plugins incrementally.
 */
class PluginBuilderImpl<T = void> implements PluginBuilder<T> {
  readonly meta: Meta;
  private readonly _modules: Array<ModuleEntry | ((options: T) => ModuleEntry)> = [];

  constructor(meta: Meta) {
    this.meta = meta;
  }

  get modules(): ReadonlyArray<ModuleEntry | ((options: T) => ModuleEntry)> {
    return this._modules;
  }

  addModule(moduleOptions: ModuleEntry | ((options: T) => ModuleEntry)): PluginBuilder<T> {
    this._modules.push(moduleOptions);
    return this;
  }

  pipe() {
    // eslint-disable-next-line prefer-rest-params
    return Pipeable.pipeArguments(this, arguments);
  }
}

/**
 * Creates a new PluginBuilder to start building a plugin.
 */
export const define = <T = void>(meta: Meta): PluginBuilder<T> => new PluginBuilderImpl<T>(meta);

/**
 * Adds a module to a plugin builder.
 * Supports both pipeline and direct call styles.
 * Modules can be either module options or functions that receive plugin options.
 *
 * Typed modules declare `provides`/`requires` (dependency mode) or `activatesOn` +
 * `requires`/`provides` (runtime-event mode); the activate effect's environment is
 * constrained to the declared requires and its return must cover the declared provides.
 */
export function addModule<T, const Opts extends Types.NoExcessProperties<TypedModuleOptions, Opts>>(
  moduleOptions: Opts | ((options: T) => Opts),
): true extends ValidateModuleOptions<Opts>
  ? (builder: PluginBuilder<T>) => PluginBuilder<T>
  : ValidateModuleOptions<Opts>;
/** @deprecated Declare capability dependencies instead of legacy event wiring. */
export function addModule<T>(
  moduleOptions: PluginModuleOptions | ((options: T) => PluginModuleOptions),
): (builder: PluginBuilder<T>) => PluginBuilder<T>;
/** @deprecated Declare capability dependencies instead of legacy event wiring. */
export function addModule<T>(
  builder: PluginBuilder<T>,
  moduleOptions: PluginModuleOptions | ((options: T) => PluginModuleOptions),
): PluginBuilder<T>;
export function addModule<T>(
  moduleOptionsOrBuilder: ModuleEntry | ((options: T) => ModuleEntry) | PluginBuilder<T>,
  moduleOptions?: ModuleEntry | ((options: T) => ModuleEntry),
): ((builder: PluginBuilder<T>) => PluginBuilder<T>) | PluginBuilder<T> {
  // If second arg is provided, it's the direct call style: addModule(builder, moduleOptions)
  if (moduleOptions !== undefined) {
    return (moduleOptionsOrBuilder as PluginBuilder<T>).addModule(moduleOptions);
  }
  // Otherwise it's pipeline style: addModule(moduleOptions) returns a function
  const moduleOpts = moduleOptionsOrBuilder as ModuleEntry | ((options: T) => ModuleEntry);
  return (builder: PluginBuilder<T>) => builder.addModule(moduleOpts);
}

/**
 * Adds a module from a spec-carrying lazy body ({@link Capability.lazyModule}) taking no
 * props: requires/provides come from the spec and the id derives from the lazy name.
 * Dependency-mode by default; pass `activatesOn` for a runtime-event module.
 */
export const addLazyModule =
  <
    Requires extends readonly Capability.AnyTag[],
    Provides extends readonly Capability.AnyTag[],
    T = void,
  >(
    module: Capability.LazyModule<void, Requires, Provides>,
    options?: {
      id?: string;
      activatesOn?: ActivationEvent.Events;
      compatFires?: readonly ActivationEvent.ActivationEvent[];
    },
  ) =>
  (builder: PluginBuilder<T>): PluginBuilder<T> =>
    builder.addModule({
      id: options?.id,
      activatesOn: options?.activatesOn,
      requires: module.requires,
      provides: module.provides,
      compatFires: options?.compatFires,
      activate: module,
    });

export type PluginFactory<T = void> = ((options: T) => Plugin) & { meta: Meta };

/**
 * Normalizes an authoring record to an {@link ActivationSpec}.
 * Modules declaring `provides`/`requires` (even empty) are dependency- or event-mode;
 * everything else is legacy. Dependency mode requires `provides` as its discriminant.
 */
const normalizeActivation = (meta: Meta, options: ModuleEntry): ActivationSpec => {
  const declared = options.provides !== undefined || options.requires !== undefined;
  if (!declared) {
    invariant(
      options.activatesOn !== undefined,
      `Module missing activatesOn or provides/requires. Plugin: ${meta.profile.key}`,
    );
    return {
      mode: 'legacy',
      activatesOn: options.activatesOn,
      firesBeforeActivation: options.firesBeforeActivation,
      firesAfterActivation: options.firesAfterActivation,
    };
  }

  invariant(
    options.firesBeforeActivation === undefined && options.firesAfterActivation === undefined,
    `fires{Before,After}Activation are legacy-only; declare requires/compatFires. Plugin: ${meta.profile.key}`,
  );
  if (options.activatesOn !== undefined) {
    return {
      mode: 'event',
      activatesOn: options.activatesOn,
      requires: options.requires ?? [],
      provides: options.provides ?? [],
      compatFires: options.compatFires,
    };
  }

  invariant(options.provides !== undefined, `Dependency-mode module missing provides. Plugin: ${meta.profile.key}`);
  return {
    mode: 'dependency',
    requires: options.requires ?? [],
    provides: options.provides,
    compatFires: options.compatFires,
  };
};

/**
 * Resolves a module from either a module entry or a function that returns one.
 */
const resolveModule = (
  meta: Meta,
  module: ModuleEntry | ((options: any) => ModuleEntry),
  options?: any,
): PluginModuleImpl => {
  const moduleOptions = typeof module === 'function' ? module(options) : module;
  const pluginName = meta.profile.key;
  const id = Option.fromNullable(moduleOptions.id).pipe(
    Option.match({
      onNone: () => {
        const exportName = Capability.getModuleTag(moduleOptions.activate);
        invariant(exportName, `Plugin module missing name. Plugin: ${meta.profile.key}`);
        return computeModuleId(pluginName, exportName);
      },
      onSome: (id) => computeModuleId(pluginName, id),
    }),
  );
  return new PluginModuleImpl({
    id,
    activation: normalizeActivation(meta, moduleOptions),
    // Erasure boundary: the authoring layer constrained the effect's environment to the
    // declared requires; the manager supplies exactly those services plus the ambient ones.
    activate: moduleOptions.activate as PluginModule['activate'],
  });
};

/**
 * Creates a Plugin from a builder.
 * Supports both pipeline and direct call styles.
 * Always returns a factory function (options: T) => Plugin.
 * When T is void, the function takes no arguments: () => Plugin.
 */
export function make<T>(builder: PluginBuilder<T>): PluginFactory<T>;
export function make<T>(builder: PluginBuilder<T>): PluginFactory<T> {
  const meta = builder.meta;
  // `dependsOn` entries and `key` are both bare NSIDs, so compare directly.
  invariant(
    !meta.profile.dependsOn?.includes(meta.profile.key),
    `Plugin ${meta.profile.key} declares itself as a dependency.`,
  );

  const factory = (options: T) => {
    const modules = builder.modules.map((module) => resolveModule(meta, module, options));
    return new PluginImpl(meta, modules);
  };

  return Object.assign(factory, { meta });
}

//
// Lazy plugin loading
//

/**
 * Symbol used to tag lazy plugin stubs with their loader closure.
 * Hidden from enumeration so plugin manager iteration / serialization paths
 * don't trip over it.
 */
const LazyTag: unique symbol = Symbol.for('@dxos/app-framework/Plugin/Lazy');

/**
 * Async loader for a lazy plugin's real implementation.
 * The default export of the loaded module must be a `PluginFactory<T>` —
 * i.e. the same shape `Plugin.make` produces.
 */
export type LazyLoader<T = void> = () => Promise<{ default: PluginFactory<T> }>;

/** Internal: payload carried on a lazy stub. */
type LazyPayload = { loader: LazyLoader<any>; options: unknown };

/**
 * Defines a lazy plugin whose body is loaded on first enable.
 *
 * The returned factory produces a stub `Plugin` that exposes `meta`
 * synchronously (so callers can read `Plugin.meta.profile.key` for free) but defers
 * loading the real plugin's modules until the manager calls
 * `Plugin.resolveLazy`. This lets the plugin's main entry point ship as a
 * tiny meta-only chunk — the heavy capabilities, schema, React surfaces,
 * etc. live behind the dynamic `import()` and become a separate Rollup
 * chunk that is only fetched when the plugin is enabled.
 *
 * @example
 * ```ts
 * // plugin-markdown/src/index.ts
 * import { Plugin } from '@dxos/app-framework';
 * import { meta } from './meta';
 *
 * export const MarkdownPlugin = Plugin.lazy(meta, () => import('./MarkdownPlugin'));
 *
 * // plugin-markdown/src/MarkdownPlugin.tsx
 * export const MarkdownPlugin = Plugin.define(meta).pipe(...heavy modules..., Plugin.make);
 * export default MarkdownPlugin;
 * ```
 */
export const lazy = <T = void>(meta: Meta, loader: LazyLoader<T>): PluginFactory<T> => {
  const factory = (options: T): Plugin => {
    const stub = new PluginImpl(meta, []);
    Object.defineProperty(stub, LazyTag, {
      value: { loader, options } satisfies LazyPayload,
      enumerable: false,
    });
    return stub;
  };
  return Object.assign(factory, { meta });
};

/**
 * Type guard for lazy plugin stubs produced by {@link lazy}.
 */
export const isLazy = (plugin: Plugin): boolean => LazyTag in plugin;

/**
 * Tagged error for failures during lazy plugin resolution. `context.id` is
 * the lazy plugin's `meta.profile.key`; `context.reason` discriminates the failure
 * mode (`'load-failed' | 'missing-default' | 'invalid-plugin' |
 * 'meta-mismatch'`) so callers can route on it.
 */
export class LazyPluginError extends BaseError.extend('LazyPluginError', 'Failed to resolve lazy plugin') {}

/**
 * Tagged error for plugin-level dependency resolution failures.
 *
 * `context.id` is the plugin id the manager was acting on. `context.reason`
 * discriminates the failure mode:
 *  - `'missing'` — declared dep is neither registered nor in the catalog.
 *    `context.missing` lists offending ids.
 *  - `'install-failed'` — dep was found in the catalog but `add()` failed.
 *    `cause` carries the original error.
 *  - `'cycle'` — closure walk detected a cycle. `context.path` is the cycle path.
 *  - `'core-dependent'` — cascade-disable would have to disable a core plugin.
 *    `context.coreDependent` is the blocking id.
 */
export class PluginDependencyError extends BaseError.extend(
  'PluginDependencyError',
  'Plugin dependency resolution failed',
) {}

/**
 * Resolves a lazy plugin stub to its real plugin.
 * Returns the plugin unchanged if it is not lazy. Failures surface as
 * {@link LazyPluginError} with `context.reason` indicating the failure mode
 * and (for loader failures) `cause` set to the original error.
 */
export const resolveLazy = (plugin: Plugin): Effect.Effect<Plugin, LazyPluginError> =>
  Effect.gen(function* () {
    if (!isLazy(plugin)) {
      return plugin;
    }
    const id = plugin.meta.profile.key;
    const { loader, options } = (plugin as unknown as { [LazyTag]: LazyPayload })[LazyTag];
    const mod = yield* Effect.tryPromise({
      try: loader,
      catch: (error) => new LazyPluginError({ context: { id, reason: 'load-failed' }, cause: error }),
    });
    if (!mod || typeof mod.default !== 'function') {
      return yield* Effect.fail(new LazyPluginError({ context: { id, reason: 'missing-default' } }));
    }
    const result = mod.default(options);
    if (!isPlugin(result)) {
      return yield* Effect.fail(new LazyPluginError({ context: { id, reason: 'invalid-plugin' } }));
    }
    if (result.meta.profile.key !== id) {
      return yield* Effect.fail(
        new LazyPluginError({ context: { id, reason: 'meta-mismatch', returnedId: result.meta.profile.key } }),
      );
    }
    return result;
  });
