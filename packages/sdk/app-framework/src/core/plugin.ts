//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as Pipeable from 'effect/Pipeable';

import { invariant } from '@dxos/invariant';
import { type MaybePromise } from '@dxos/util';

import type * as ActivationEvent from './activation-event';
import type * as Capability from './capability';

/**
 * Computes a module ID from plugin ID and export name.
 */
const computeModuleId = (pluginId: string, moduleName: string): string => {
  return `${pluginId}/module/${moduleName}`;
};

/**
 * Extracts the export name from an activate function if it has the _exportName property.
 */
const getExportName = (activate: any): string | undefined => {
  return activate?._exportName;
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
   * Events which the plugin depends on being activated.
   * Plugin is marked as needing reset a plugin activated by a dependent event is removed.
   * Events are automatically activated before activation of the plugin.
   */
  activatesBefore?: ActivationEvent.ActivationEvent[];

  /**
   * Events which this plugin triggers upon activation.
   */
  activatesAfter?: ActivationEvent.ActivationEvent[];

  /**
   * Called when the module is activated.
   * @param context The plugin context.
   * @returns The capabilities of the module.
   */
  activate: (
    context: Capability.PluginContext,
  ) => MaybePromise<Capability.Any | Capability.Any[]> | Promise<() => Promise<Capability.Any | Capability.Any[]>>;
}

type PluginModuleOptions = Omit<PluginModule, 'id' | typeof PluginModuleTypeId> & { id?: string };

class PluginModuleImpl implements PluginModule {
  readonly [PluginModuleTypeId]: PluginModuleTypeId = PluginModuleTypeId;
  readonly id: PluginModule['id'];
  readonly activatesOn: PluginModule['activatesOn'];
  readonly activatesBefore?: PluginModule['activatesBefore'];
  readonly activatesAfter?: PluginModule['activatesAfter'];
  readonly activate: PluginModule['activate'];

  constructor(options: Omit<PluginModule, typeof PluginModuleTypeId>) {
    this.id = options.id;
    this.activatesOn = options.activatesOn;
    this.activatesBefore = options.activatesBefore;
    this.activatesAfter = options.activatesAfter;
    this.activate = options.activate;
  }
}

export type Meta = {
  /**
   * Globally unique ID.
   *
   * Expected to be in the form of a valid URL.
   *
   * @example dxos.org/plugin/example
   */
  id: string;

  /**
   * Human-readable name.
   */
  name: string;

  /**
   * Short description of plugin functionality.
   */
  description?: string;

  /**
   * URL of home page.
   */
  homePage?: string;

  /**
   * URL of source code.
   */
  source?: string;

  /**
   * URL of screenshot.
   */
  screenshots?: string[];

  /**
   * Tags to help categorize the plugin.
   */
  tags?: string[];

  /**
   * A grep-able symbol string which can be resolved to an icon asset by @ch-ui/icons, via @ch-ui/vite-plugin-icons.
   */
  icon?: string;

  /**
   * Icon hue (ChromaticPalette).
   */
  iconHue?: string;
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
  const id = Option.fromNullable(moduleOptions.id).pipe(
    Option.match({
      onNone: () => {
        const exportName = getExportName(moduleOptions.activate);
        invariant(exportName, `Plugin module missing name. Plugin: ${meta.id}`);
        return computeModuleId(meta.id, exportName);
      },
      onSome: (id) => computeModuleId(meta.id, id),
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

  const factory = (options: T) => {
    const modules = builder.modules.map((module) => resolveModule(meta, module, options));
    return new PluginImpl(meta, modules);
  };

  return Object.assign(factory, { meta });
}
