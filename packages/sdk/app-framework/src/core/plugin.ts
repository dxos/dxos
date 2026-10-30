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

import * as Environment from '#environment';

import * as ActivationEvent from './activation-event.ts';
import * as Capability from './capability.ts';
import * as HotModules from './hot-modules.ts';
import type * as PluginManager from './plugin-manager/index.ts';

//
// Plugin Service Layer
//

/**
 * Effect Context.Tag for accessing PluginManager via the Effect layer system.
 * This allows lifecycle operations to access the plugin manager without having it passed as an argument.
 */
export class Service extends Context.Service<Service, PluginManager.PluginManager>()(
  '@dxos/app-framework/PluginManager',
) {}

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
 * Normalized activation specification of a module — which wave it belongs to and what it
 * exchanges with the capability graph.
 *
 * Every module names a wave: `activatesOn` defaults to {@link ActivationEvent.Idle} when the
 * authoring record omits it. Within a wave, modules are ordered topologically (providers of
 * `requires` activate first) and a module may pull a provider whose own wave has already fired.
 * Because a fired event stays fired, a module gated on an event that has already passed remains
 * eligible in every later round — which is what lets a consumer activate once a provider from
 * some other wave finally lands.
 */
export type ActivationSpec = {
  readonly activatesOn: ActivationEvent.Events;
  readonly requires: readonly Capability.AnyTag[];
  readonly provides: readonly Capability.AnyTag[];
};

/**
 * What a module's activate may produce at runtime: raw capability entries (see
 * {@link Capability.ModuleReturn}) or typed {@link Capability.Contribution}s.
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
 * `plugin-client/dx.config.ts` for a worked example.
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
   * Called when the module is activated.
   * Declared `requires` are provided as Effect services; CapabilityManager and PluginManager
   * are ambient (Capability.Service, Plugin.Service).
   * @param props Optional props passed to the module.
   * @returns The capabilities of the module.
   */
  activate: (
    props?: any,
  ) => Effect.Effect<ModuleActivateResult, Error, Capability.Service | Service | Scope.Scope | never>;

  /** Imports a lazy module's body without activating it; absent on inline modules. */
  readonly load?: () => Promise<unknown>;
}

/**
 * Structural authoring shape for typed modules. A module without `requires` is a root,
 * triggered by `activatesOn` (implicitly Idle). A module with `requires` is a chain
 * member: it activates once every declared capability has been contributed — by whichever
 * event's chain produced the providers, not necessarily during startup — additionally gated
 * on `activatesOn` when declared. Consumers of event-gated providers stay pending until the
 * event fires and the provider contributes; capability cycles fail at runtime
 * (DependencyCycleError). Channel enforcement happens in {@link ValidateModuleOptions}.
 */
export type TypedModuleOptions = {
  readonly id?: string;
  readonly activatesOn?: ActivationEvent.Events;
  readonly requires?: readonly Capability.AnyTag[];
  readonly provides?: readonly Capability.AnyTag[];
  readonly activate: (props?: any) => Effect.Effect<any, any, any>;
};

type OptRequires<Opts> = Opts extends { requires: infer R extends readonly Capability.AnyTag[] } ? R : readonly [];
type OptProvides<Opts> = Opts extends { provides: infer P extends readonly Capability.AnyTag[] } ? P : readonly [];

/**
 * Validates typed module options: evaluates to `true` for a valid module, otherwise to an
 * unconstructible branded type naming the violation. Checks that activate's environment only
 * uses declared `requires`, that its error channel extends `Error`, and that its return
 * exactly covers the declared `provides`. Options with no capability declarations are a
 * dependency-mode root and validate as `true` (the runtime normalizer classifies them).
 *
 * Applied on {@link addModule}'s return type (not intersected with the parameter): inference
 * of `Opts` from an options object containing inline generator activates fails when the
 * parameter is an intersection with a conditional over `Opts`, but succeeds for a naked
 * `Opts` parameter. An invalid module surfaces as a non-callable branded return, which the
 * `.pipe(...)` site rejects with the brand's message.
 */
export type ValidateModuleOptions<Opts extends TypedModuleOptions> = Opts extends
  | { provides: readonly Capability.AnyTag[] }
  | { requires: readonly Capability.AnyTag[] }
  | { activatesOn: ActivationEvent.Events; requires: readonly Capability.AnyTag[] }
  ? Opts['activate'] extends (props?: any) => Effect.Effect<infer A, infer E, infer R>
    ? [R] extends [Capability.Requirements<OptRequires<Opts>>]
      ? [E] extends [Error]
        ? [A] extends [Capability.ProvidesReturn<OptProvides<Opts>>]
          ? [Capability.ProvidedIds<OptProvides<Opts>>] extends [Capability.CoveredBy<A>]
            ? true
            : {
                readonly 'activate return misses declared capabilities': Exclude<
                  Capability.ProvidedIds<OptProvides<Opts>>,
                  Capability.CoveredBy<A>
                >;
              }
          : {
              readonly 'activate return includes undeclared capabilities': Exclude<
                Capability.CoveredBy<A>,
                Capability.ProvidedIds<OptProvides<Opts>>
              >;
            }
        : { readonly 'activate error channel must extend Error': E }
      : { readonly 'activate requires undeclared capabilities': Exclude<R, Capability.Requirements<OptRequires<Opts>>> }
    : { readonly 'activate must be an effect-returning function': Opts['activate'] }
  : true;

/**
 * Erased module authoring record stored on the builder. Type enforcement happens at the
 * {@link addModule} overloads; the builder itself is intentionally heterogeneous.
 */
export type ModuleEntry = {
  readonly id?: string;
  readonly activatesOn?: ActivationEvent.Events;
  readonly requires?: readonly Capability.AnyTag[];
  readonly provides?: readonly Capability.AnyTag[];
  readonly activate: (props?: any) => Effect.Effect<any, Error, any>;
  readonly load?: () => Promise<unknown>;
  /** What the module was authored from, when `activate` wraps it; defaults to `activate`. */
  readonly source?: unknown;
};

class PluginModuleImpl implements PluginModule {
  readonly [PluginModuleTypeId]: PluginModuleTypeId = PluginModuleTypeId;
  readonly id: string;
  readonly activation: ActivationSpec;
  readonly activate: PluginModule['activate'];
  readonly load: PluginModule['load'];
  readonly source: unknown;

  constructor(options: {
    id: string;
    activation: ActivationSpec;
    activate: PluginModule['activate'];
    load: PluginModule['load'];
    source: unknown;
  }) {
    this.id = options.id;
    this.activation = options.activation;
    this.activate = options.activate;
    this.load = options.load;
    this.source = options.source;
  }
}

/**
 * Whether two modules come from the same authored definition — the same module object, as when a
 * re-created plugin reuses it. Re-creating a plugin keeps such a module running rather than repeating
 * its activation's side effects.
 */
export const isSameDefinition = (left: PluginModule, right: PluginModule): boolean =>
  left instanceof PluginModuleImpl &&
  right instanceof PluginModuleImpl &&
  left.id === right.id &&
  left.source === right.source;

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
 * A plugin's identity as a leaf module: its config and its capability tags both derive from it, so
 * the config can list the tags its modules provide without the tags importing the config.
 *
 * @example
 * ```ts
 * // src/namespace.ts
 * export const MarkdownNamespace = Plugin.namespace('org.dxos.plugin.markdown');
 * // src/types/MarkdownCapabilities.ts
 * export const Settings = MarkdownNamespace.makeSingleton<Atom.Writable<Settings>>()('settings');
 * // dx.config.ts
 * Plugin.config({ plugin: { key: MarkdownNamespace.key, … }, modules: [ … ] });
 * ```
 */
export const namespace = <const K extends string>(key: K) => ({
  key,
  /** A multi capability with identifier `<key>.capability.<name>`. */
  make:
    <T>() =>
    <const N extends string>(name: N) =>
      Capability.makeTag<T, `${K}.capability.${N}`, 'multi'>(`${key}.capability.${name}`, 'multi'),
  /** A singleton capability with identifier `<key>.capability.<name>`. */
  makeSingleton:
    <T>() =>
    <const N extends string>(name: N) =>
      Capability.makeTag<T, `${K}.capability.${N}`, 'single'>(`${key}.capability.${name}`, 'single'),
});

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
 * Adds a module to a plugin builder. Supports both pipeline and direct call styles.
 *
 * Accepts either:
 * - A spec-carrying module ({@link Capability.lazyModule} / {@link Capability.inlineModule}):
 *   requires/provides/activatesOn/props all come from the module's own spec (declared where
 *   it is authored), so the call needs only an optional id override.
 * - An inline authoring record (or a function receiving plugin options): declares
 *   `provides`/`requires` (dependency mode) or `activatesOn` + `requires`/`provides`
 *   (runtime-event mode); the activate effect's environment is constrained to the declared
 *   requires and its return must cover the declared provides.
 */
export function addModule<T = void>(
  module: Capability.Module<void> | undefined,
  options?: { id?: string },
): (builder: PluginBuilder<T>) => PluginBuilder<T>;
/** Spec-carrying module whose props are mapped from the plugin options. */
export function addModule<Options, T extends Options = Options>(
  module: Capability.Module<Options>,
  options?: { id?: string },
): (builder: PluginBuilder<T>) => PluginBuilder<T>;
export function addModule<T, const Opts extends Types.NoExcessProperties<TypedModuleOptions, Opts>>(
  moduleOptions: Opts | ((options: T) => Opts),
): true extends ValidateModuleOptions<Opts>
  ? (builder: PluginBuilder<T>) => PluginBuilder<T>
  : ValidateModuleOptions<Opts>;
/** Direct-call variant of the typed record overload above (see {@link PluginBuilder.addModule}). */
export function addModule<T>(
  builder: PluginBuilder<T>,
  moduleOptions: TypedModuleOptions | ((options: T) => TypedModuleOptions),
): PluginBuilder<T>;
export function addModule<T>(
  moduleOrOptionsOrBuilder:
    | Capability.Module<any>
    | ModuleEntry
    | ((options: T) => ModuleEntry)
    | PluginBuilder<T>
    | undefined,
  moduleOptions?: ModuleEntry | ((options: T) => ModuleEntry) | { id?: string },
): ((builder: PluginBuilder<T>) => PluginBuilder<T>) | PluginBuilder<T> {
  // Headless capability barrels stub excluded modules as `undefined`, letting one canonical
  // plugin entry serve every environment.
  if (moduleOrOptionsOrBuilder === undefined) {
    return (builder: PluginBuilder<T>) => builder;
  }
  // Spec-carrying module: a tagged function whose requires/provides/activatesOn come from its
  // own spec; only an optional id override is supplied at the call site.
  if (typeof moduleOrOptionsOrBuilder === 'function' && Capability.ModuleTag in moduleOrOptionsOrBuilder) {
    const module = moduleOrOptionsOrBuilder as Capability.Module<any>;
    const { id } = (moduleOptions as { id?: string } | undefined) ?? {};
    return (builder: PluginBuilder<T>) =>
      builder.addModule((pluginOptions: T) => ({
        id: id ?? Capability.getModuleTag(module),
        activatesOn: module.activatesOn,
        requires: module.requires,
        provides: module.provides,
        activate: () => module(pluginOptions),
        load: module.load,
        source: module,
      }));
  }
  // Direct-call style: addModule(builder, moduleOptions).
  if (moduleOptions !== undefined) {
    return (moduleOrOptionsOrBuilder as PluginBuilder<T>).addModule(
      moduleOptions as ModuleEntry | ((options: T) => ModuleEntry),
    );
  }
  // Pipeline style: addModule(moduleOptions) returns a function.
  const moduleOpts = moduleOrOptionsOrBuilder as ModuleEntry | ((options: T) => ModuleEntry);
  return (builder: PluginBuilder<T>) => builder.addModule(moduleOpts);
}

/**
 * A plugin factory. The options parameter is optional exactly when `T` has no required members
 * (`{} extends T` — every field is optional, or `T` is `void`), so `SomePlugin()` is accepted
 * without an empty `{}`; a plugin whose options include a required field still demands them.
 */
export type PluginFactory<T = void> = ({} extends T ? (options?: T) => Plugin : (options: T) => Plugin) & {
  meta: Meta;
};

/**
 * Normalizes an authoring record to an {@link ActivationSpec} — the single boundary where the
 * optional authoring shape becomes the concrete runtime shape.
 *
 * Omitting `activatesOn` means the module belongs to the IDLE wave: a module that must run at
 * boot states `activatesOn: ActivationEvents.Startup` explicitly. Inverted from a startup default
 * so that forgetting the annotation costs post-paint responsiveness rather than time-to-
 * interactive — startup was the dumping ground, and its cost becomes the transitive demand
 * closure of the boot path, enforced by the capability graph instead of by remembering to
 * annotate. Un-annotated modules stay pullable as providers because the baseline wave is
 * `Startup u Idle`; see `ActivationScheduler.#isBaselineWave`, which moves with this default.
 */
const normalizeActivation = (options: ModuleEntry): ActivationSpec => ({
  activatesOn: options.activatesOn ?? ActivationEvent.Idle,
  requires: options.requires ?? [],
  provides: options.provides ?? [],
});

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
  const id = Option.fromNullishOr(moduleOptions.id).pipe(
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
    activation: normalizeActivation(moduleOptions),
    // Erasure boundary: the authoring layer constrained the effect's environment to the
    // declared requires; the manager supplies exactly those services plus the ambient ones.
    activate: moduleOptions.activate as PluginModule['activate'],
    load: moduleOptions.load,
    source: moduleOptions.source ?? moduleOptions.activate,
  });
};

/**
 * Creates a Plugin from a builder.
 * Supports both pipeline and direct call styles.
 * Always returns a factory function (options: T) => Plugin.
 * When T is void, the function takes no arguments: () => Plugin.
 */
export function make<T>(builder: PluginBuilder<T>): PluginFactory<T>;
// The impl return names the required-parameter form; the public overload above narrows it to the
// optional-parameter form when `T` has no required members (the conditional can't be reduced for a
// generic `T` inside the body, so it is stated on the overload instead).
export function make<T>(builder: PluginBuilder<T>): ((options: T) => Plugin) & { meta: Meta } {
  const meta = builder.meta;
  // `dependsOn` entries and `key` are both bare NSIDs, so compare directly.
  invariant(
    !meta.profile.dependsOn?.includes(meta.profile.key),
    `Plugin ${meta.profile.key} declares itself as a dependency.`,
  );

  const factory = (options?: T) => {
    // Default to `{}` so an omitted all-optional options object (see {@link PluginFactory}) is
    // safe for option-reading module callbacks; ignored by `void` and record modules.
    const resolved = (options ?? {}) as T;
    const modules = builder.modules.map((module) => resolveModule(meta, module, resolved));
    // The manager keys modules by id, so a second module with the same id would be dropped silently.
    const ids = new Set<string>();
    for (const module of modules) {
      invariant(!ids.has(module.id), `Duplicate module id ${module.id} in plugin ${meta.profile.key}.`);
      ids.add(module.id);
    }
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
 * import * as Plugin from '@dxos/app-framework/Plugin';
 * import { meta } from './meta';
 *
 * export const MarkdownPlugin = Plugin.lazy(meta, () => import('./MarkdownPlugin'));
 *
 * // plugin-markdown/src/MarkdownPlugin.tsx
 * export const MarkdownPlugin = Plugin.define(meta).pipe(...heavy modules..., Plugin.make);
 * export default MarkdownPlugin;
 * ```
 */
export function lazy<T = void>(meta: Meta, loader: LazyLoader<T>): PluginFactory<T>;
// Impl names the required-parameter form; the overload narrows to optional when `T` has no
// required members (see {@link make} / {@link PluginFactory}).
export function lazy<T = void>(meta: Meta, loader: LazyLoader<T>): ((options: T) => Plugin) & { meta: Meta } {
  const factory = (options?: T): Plugin => {
    const stub = new PluginImpl(meta, []);
    Object.defineProperty(stub, LazyTag, {
      value: { loader, options } satisfies LazyPayload,
      enumerable: false,
    });
    return stub;
  };
  return Object.assign(factory, { meta });
}

/**
 * Type guard for lazy plugin stubs produced by {@link lazy}.
 */
export const isLazy = (plugin: Plugin): boolean => LazyTag in plugin;

/**
 * Builds a plugin from its module list, keeping only the modules that run in this build's
 * {@link Environment.current}; a module with no `environments` runs everywhere.
 */
export const fromModules = <T = void>(
  meta: Meta,
  modules: ReadonlyArray<Capability.Module<any> | undefined>,
): PluginFactory<T> =>
  make(
    modules
      .filter((module) => module !== undefined)
      .filter((module) => module.environments?.includes(Environment.current) ?? true)
      .reduce((builder, module) => addModule<T>(module)(builder), define<T>(meta)),
  );

/** Authoring input for {@link config}: the `dx.config.ts` data plus the plugin's modules. */
export type ConfigOptions = Config2.Config & {
  /** Module specs only; each body is a dynamic import, so reading the config loads no plugin code. */
  modules: ReadonlyArray<Capability.Module<any> | undefined>;
};

/** A plugin's `dx.config.ts` default export: its config data, runtime {@link Meta} and factory. */
export type PluginConfig<T = void> = Config2.Config & {
  meta: Meta;
  make: PluginFactory<T>;
  /** The authored module list, read by build tools to emit the plugin's {@link Manifest}. */
  modules: ReadonlyArray<Capability.Module<any> | undefined>;
};

/**
 * Defines a plugin entirely from its `dx.config.ts`.
 *
 * @example
 * ```ts
 * // dx.config.ts
 * export default Plugin.config({
 *   plugin: { key: 'org.dxos.plugin.markdown', name: 'Markdown' },
 *   modules: [AppCapability.schema(() => import('./src/capabilities/schema.ts'))],
 * });
 * ```
 */
export const config = <T = void>({ modules, ...data }: ConfigOptions): PluginConfig<T> => {
  const meta = getMetaFromConfig(data);
  return { ...data, meta, make: fromModules<T>(meta, modules), modules };
};

/**
 * The module named `name` in a plugin's config, for tests and stories that compose a plugin from a
 * subset of another plugin's modules.
 */
export const getModule = <T>({ modules }: Pick<PluginConfig<T>, 'modules'>, name: string): Capability.Module<T> => {
  const module = modules.find((candidate) => candidate && Capability.getModuleTag(candidate) === name);
  invariant(module, `No module named ${name}.`);
  return module;
};

/** A capability tag as serialized in a {@link Manifest}: the identity the plugin manager matches on. */
export type ManifestTag = { identifier: string; arity: Capability.Arity };

/** One module of a {@link Manifest}: its activation spec as data and the URL of its body. */
export type ManifestModule = {
  id: string;
  url: string;
  activatesOn?: ActivationEvent.Events;
  requires: readonly ManifestTag[];
  provides: readonly ManifestTag[];
  /** Transform applied to what `url` exports, when the module's maker adapts a data module. */
  adapter?: { url: string; args?: unknown };
  /** Runtimes the module loads in; present only in a library build, which serves every runtime. */
  environments?: readonly Capability.Environment[];
};

/**
 * Static loaders for a manifest's URLs, keyed by URL. A library build passes them so downstream
 * bundlers (e.g. a worker's) can follow each body; an app build omits them and loads by URL.
 */
export type ManifestLoaders = Readonly<Record<string, () => Promise<unknown>>>;

/**
 * One registry item (type, operation, skill) a plugin contributes: enough to list and route it, plus
 * the URL of its JSON descriptor, which a reader fetches without running plugin code.
 */
export type ManifestRegistryEntry = { uri: string; kind: string; name?: string; hash: string; url: string };

/**
 * Static description of a plugin, emitted at build time from its `dx.config.ts` for one target
 * environment, so the app loads only data plus the module bodies it activates.
 */
export type Manifest = Config2.Config & {
  modules: readonly ManifestModule[];
  /** Present only when the build was asked to describe registry items (spike). */
  registry?: readonly ManifestRegistryEntry[];
};

type ModuleBody = { default: (props: unknown) => Effect.Effect<any, Error, any> };
type ModuleAdapter = { default: (loaded: unknown, args: unknown) => unknown };

// Loaded by URL, so the module's shape is only known at runtime.
const hasDefaultFunction = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && 'default' in value && typeof value.default === 'function';
const isModuleBody = (value: unknown): value is ModuleBody => hasDefaultFunction(value);
const isModuleAdapter = (value: unknown): value is ModuleAdapter => hasDefaultFunction(value);

/**
 * Builds a plugin from a build-time {@link Manifest}. Each module body loads on activation, through
 * `loaders` when the build supplied static imports, otherwise from its URL.
 */
export const fromManifest = <T = void>(
  { modules, ...data }: Manifest,
  loaders: ManifestLoaders = {},
): Pick<PluginConfig<T>, 'plugin' | 'meta' | 'make'> => {
  const meta = getMetaFromConfig(data);
  const toTags = (tags: readonly ManifestTag[]) =>
    tags.map(({ identifier, arity }) => Capability.fromIdentifier(identifier, arity));
  const load = (url: string) => loaders[url]?.() ?? import(/* @vite-ignore */ url);
  return {
    plugin: data.plugin,
    meta,
    make: fromModules<T>(
      meta,
      modules.map(({ id, url, activatesOn, requires, provides, adapter, environments }) =>
        Capability.lazyModule(
          id,
          { activatesOn, requires: toTags(requires), provides: toTags(provides), environments },
          async () => {
            const loaded = await load(url);
            if (!adapter) {
              invariant(isModuleBody(loaded), `Module ${id} at ${url} has no default export.`);
              return loaded;
            }
            const adapterModule = await load(adapter.url);
            invariant(isModuleAdapter(adapterModule), `Adapter at ${adapter.url} has no default export.`);
            const adapted = adapterModule.default(loaded, adapter.args);
            invariant(isModuleBody(adapted), `Adapter at ${adapter.url} returned no module body.`);
            return adapted;
          },
        ),
      ),
    ),
  };
};

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
    HotModules.trackPlugin(mod, id);
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
