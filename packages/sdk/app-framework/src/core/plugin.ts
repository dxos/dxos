//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Pipeable from 'effect/Pipeable';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';

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
 * A unit of containment of modular functionality that can be provided to an application.
 * Activation of a module is async allowing for code to split and loaded lazily.
 */
export interface PluginModule {
  readonly [PluginModuleTypeId]: PluginModuleTypeId;
  /**
   * Unique id of the module.
   */
  id: string;

  /**
   * Events for which the module will be activated.
   */
  activatesOn: ActivationEvent.Events;

  /**
   * Events that this module fires *before* its own activation runs.
   *
   * When this module is asked to activate (via {@link activatesOn}), the
   * plugin manager first activates every event listed here, ensuring any
   * other modules that contribute to those events have completed before
   * this module's {@link activate} body executes. These events are fired
   * by the framework on this module's behalf — the module does not need
   * to wait for some other code to fire them.
   *
   * The module is marked as needing reset if a module activated by one
   * of these events is later removed.
   *
   * Read as: "this module fires these events before [its] activation".
   */
  firesBeforeActivation?: ActivationEvent.ActivationEvent[];

  /**
   * Events that this module fires *after* its own activation completes.
   *
   * Once this module's {@link activate} body has finished executing, the
   * plugin manager activates every event listed here, causing any modules
   * listening on those events to run. These events are fired by the
   * framework on this module's behalf as part of this module's lifecycle.
   *
   * Read as: "this module fires these events after [its] activation".
   */
  firesAfterActivation?: ActivationEvent.ActivationEvent[];

  /**
   * Called when the module is activated.
   * CapabilityManager is accessed via the Effect layer system (Capability.Service).
   * PluginManager is accessed via Plugin.Service.
   * @param props Optional props passed to the module.
   * @returns The capabilities of the module.
   */
  activate: (
    props?: any,
  ) => Effect.Effect<Capability.ModuleReturn, Error, Capability.Service | Service | Scope.Scope | never>;
}

export type PluginModuleOptions = Omit<PluginModule, 'id' | typeof PluginModuleTypeId> & { id?: string };

class PluginModuleImpl implements PluginModule {
  readonly [PluginModuleTypeId]: PluginModuleTypeId = PluginModuleTypeId;
  readonly id: PluginModule['id'];
  readonly activatesOn: PluginModule['activatesOn'];
  readonly firesBeforeActivation?: PluginModule['firesBeforeActivation'];
  readonly firesAfterActivation?: PluginModule['firesAfterActivation'];
  readonly activate: PluginModule['activate'];

  constructor(options: Omit<PluginModule, typeof PluginModuleTypeId>) {
    this.id = options.id;
    this.activatesOn = options.activatesOn;
    this.firesBeforeActivation = options.firesBeforeActivation;
    this.firesAfterActivation = options.firesAfterActivation;
    this.activate = options.activate;
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
  readonly modules: ReadonlyArray<PluginModuleOptions | ((options: T) => PluginModuleOptions)>;
  addModule(moduleOptions: PluginModuleOptions | ((options: T) => PluginModuleOptions)): PluginBuilder<T>;
}

/**
 * Builder implementation for creating plugins incrementally.
 */
class PluginBuilderImpl<T = void> implements PluginBuilder<T> {
  readonly meta: Meta;
  private readonly _modules: Array<PluginModuleOptions | ((options: T) => PluginModuleOptions)> = [];

  constructor(meta: Meta) {
    this.meta = meta;
  }

  get modules(): ReadonlyArray<PluginModuleOptions | ((options: T) => PluginModuleOptions)> {
    return this._modules;
  }

  addModule(moduleOptions: PluginModuleOptions | ((options: T) => PluginModuleOptions)): PluginBuilder<T> {
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
 * Modules can be either PluginModuleOptions or functions that receive options.
 */
export function addModule<T>(
  moduleOptions: PluginModuleOptions | ((options: T) => PluginModuleOptions),
): (builder: PluginBuilder<T>) => PluginBuilder<T>;
export function addModule<T>(
  builder: PluginBuilder<T>,
  moduleOptions: PluginModuleOptions | ((options: T) => PluginModuleOptions),
): PluginBuilder<T>;
export function addModule<T>(
  moduleOptionsOrBuilder: PluginModuleOptions | ((options: T) => PluginModuleOptions) | PluginBuilder<T>,
  moduleOptions?: PluginModuleOptions | ((options: T) => PluginModuleOptions),
): ((builder: PluginBuilder<T>) => PluginBuilder<T>) | PluginBuilder<T> {
  // If second arg is provided, it's the direct call style: addModule(builder, moduleOptions)
  if (moduleOptions !== undefined) {
    return (moduleOptionsOrBuilder as PluginBuilder<T>).addModule(moduleOptions);
  }
  // Otherwise it's pipeline style: addModule(moduleOptions) returns a function
  const moduleOpts = moduleOptionsOrBuilder as PluginModuleOptions | ((options: T) => PluginModuleOptions);
  return (builder: PluginBuilder<T>) => builder.addModule(moduleOpts);
}

export type PluginFactory<T = void> = ((options: T) => Plugin) & { meta: Meta };

/**
 * Resolves a module from either PluginModuleOptions or a function that returns PluginModuleOptions.
 */
const resolveModule = (
  meta: Meta,
  module: PluginModuleOptions | ((options: any) => PluginModuleOptions),
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
  return new PluginModuleImpl({ ...moduleOptions, id });
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
