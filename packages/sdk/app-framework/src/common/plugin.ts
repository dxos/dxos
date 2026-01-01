//
// Copyright 2025 DXOS.org
//

import type * as Command$ from '@effect/cli/Command';
import * as Effect from 'effect/Effect';

import { type Type } from '@dxos/echo';

import { Capability as Capability$, Plugin as Plugin$ } from '../core';

import { ActivationEvent } from './activation-event';
import { Capability } from './capability';
import { type Resource } from './translations';

type PluginModuleOptions = Partial<
  Pick<Plugin$.PluginModuleOptions, 'id' | 'activatesOn' | 'activatesBefore' | 'activatesAfter'>
> &
  Pick<Plugin$.PluginModuleOptions, 'activate'>;

/**
 * Helper functions for creating common plugin module patterns.
 */
export namespace Plugin {
  // TODO(wittjosiah): Restrict type to only allow operation handlers.
  export type OperationResolverModuleOptions = PluginModuleOptions;

  /**
   * Creates a module that contributes operation handlers.
   *
   * @param options Module options including the activate function and optional configuration
   * @returns A function that can be used with Plugin.addModule() in a pipe chain
   *
   * @example
   * ```ts
   * Plugin.define(meta).pipe(
   *   Common.Plugin.addOperationResolverModule({
   *     activate: (context) =>
   *       Capability.contributes(Common.Capability.OperationResolver, [{
   *         operation: MyOperation,
   *         handler: (input) => Effect.succeed(...)
   *       }])
   *   })
   * )
   * ```
   */
  export function addOperationResolverModule<T = void>(
    options: OperationResolverModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: Capability$.getModuleTag(options.activate) ?? options.id ?? 'operation-resolver',
      activatesOn: options.activatesOn ?? ActivationEvent.SetupOperationResolver,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: options.activate,
    });
  }

  // TODO(wittjosiah): Restrict type to only allow surfaces.
  export type SurfaceModuleOptions = PluginModuleOptions;

  /**
   * Creates a module that contributes React surfaces.
   *
   * @param options Module options including the activate function and optional configuration
   * @returns A function that can be used with Plugin.addModule() in a pipe chain
   *
   * @example
   * ```ts
   * Plugin.define(meta).pipe(
   *   Common.Plugin.addSurfaceModule({
   *     activate: (context) =>
   *       Capability.contributes(Common.Capability.ReactSurface, [
   *         Common.createSurface({ id: `${meta.id}/my-surface`, ... })
   *       ])
   *   })
   * )
   * ```
   */
  export function addSurfaceModule<T = void>(
    options: SurfaceModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: Capability$.getModuleTag(options.activate) ?? options.id ?? 'surfaces',
      activatesOn: options.activatesOn ?? ActivationEvent.SetupReactSurface,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: options.activate,
    });
  }

  // TODO(wittjosiah): Restrict type to only allow react roots.
  export type ReactRootModuleOptions = PluginModuleOptions;

  /**
   * Creates a module that contributes a React root.
   */
  export function addReactRootModule<T = void>(
    options: ReactRootModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: Capability$.getModuleTag(options.activate) ?? options.id ?? 'react-root',
      activatesOn: options.activatesOn ?? ActivationEvent.Startup,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: options.activate,
    });
  }

  // TODO(wittjosiah): Restrict type to only allow react contexts.
  export type ReactContextModuleOptions = PluginModuleOptions;

  /**
   * Creates a module that contributes a React context.
   */
  export function addReactContextModule<T = void>(
    options: ReactContextModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: Capability$.getModuleTag(options.activate) ?? options.id ?? 'react-context',
      activatesOn: options.activatesOn ?? ActivationEvent.Startup,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: options.activate,
    });
  }

  // TODO(wittjosiah): Restrict type to only allow app graph builders.
  export type AppGraphModuleOptions = PluginModuleOptions;

  /**
   * Creates a module that contributes app graph builder extensions.
   *
   * @param options Module options including the activate function and optional configuration
   * @returns A function that can be used with Plugin.addModule() in a pipe chain
   *
   * @example
   * ```ts
   * Plugin.define(meta).pipe(
   *   Common.Plugin.addAppGraphModule({
   *     activate: (context) =>
   *       Capability.contributes(Common.Capability.AppGraphBuilder, [
   *         GraphBuilder.createExtension({ id: meta.id, ... })
   *       ])
   *   })
   * )
   * ```
   */
  export function addAppGraphModule<T = void>(
    options: AppGraphModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: Capability$.getModuleTag(options.activate) ?? options.id ?? 'app-graph-builder',
      activatesOn: options.activatesOn ?? ActivationEvent.SetupAppGraph,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: options.activate,
    });
  }

  export type TranslationsModuleOptions = Omit<PluginModuleOptions, 'activate'> & {
    translations: Resource | Resource[];
  };

  /**
   * Creates a module that contributes translations.
   *
   * @param options Module options including translations and optional configuration
   * @returns A function that can be used with Plugin.addModule() in a pipe chain
   *
   * @example
   * ```ts
   * Plugin.define(meta).pipe(
   *   Common.Plugin.addTranslationsModule({
   *     translations: translations
   *   })
   * )
   * ```
   */
  export function addTranslationsModule<T = void>(
    options: TranslationsModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: options?.id ?? 'translations',
      activatesOn: options?.activatesOn ?? ActivationEvent.SetupTranslations,
      activatesBefore: options?.activatesBefore,
      activatesAfter: options?.activatesAfter,
      activate: Effect.fnUntraced(function* () {
        return Capability$.contributes(
          Capability.Translations,
          Array.isArray(options.translations) ? options.translations : ([options.translations] as Resource[]),
        );
      }),
    });
  }

  export type MetadataModuleOptions = Omit<PluginModuleOptions, 'activate'> & {
    metadata: Capability.Metadata | Capability.Metadata[];
  };

  /**
   * Creates a module that contributes metadata.
   *
   * @param options Module options including metadata and optional configuration
   * @returns A function that can be used with Plugin.addModule() in a pipe chain
   *
   * @example
   * ```ts
   * Plugin.define(meta).pipe(
   *   Common.Plugin.addMetadataModule({
   *     metadata: {
   *       id: MyType.typename,
   *       metadata: { icon: 'ph--icon', ... }
   *     }
   *   })
   * )
   * ```
   */
  export function addMetadataModule<T = void>(
    options: MetadataModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: options.id ?? 'metadata',
      activatesOn: options.activatesOn ?? ActivationEvent.SetupMetadata,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: Effect.fnUntraced(function* () {
        return (Array.isArray(options.metadata) ? options.metadata : [options.metadata]).map((m) =>
          Capability$.contributes(Capability.Metadata, m),
        );
      }),
    });
  }

  // TODO(wittjosiah): Restrict type to only allow settings.
  export type SettingsModuleOptions = PluginModuleOptions;

  /**
   * Creates a module that contributes settings.
   */
  export function addSettingsModule<T = void>(
    options: SettingsModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: Capability$.getModuleTag(options.activate) ?? options.id ?? 'settings',
      activatesOn: options.activatesOn ?? ActivationEvent.SetupSettings,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: options.activate,
    });
  }

  // TODO(wittjosiah): Restrict type to only allow blueprint definitions.
  export type BlueprintDefinitionModuleOptions = PluginModuleOptions;

  /**
   * Creates a module that contributes blueprint definitions.
   *
   * @param options Module options including the activate function and optional configuration
   * @returns A function that can be used with Plugin.addModule() in a pipe chain
   *
   * @example
   * ```ts
   * Plugin.define(meta).pipe(
   *   Common.Plugin.addBlueprintDefinitionModule({
   *     activate: (context) =>
   *       Capability.contributes(Common.Capability.BlueprintDefinition, [
   *         BlueprintDefinition.make({ key: 'my-blueprint', ... })
   *       ])
   *   })
   * )
   * ```
   */
  export function addBlueprintDefinitionModule<T = void>(
    options: BlueprintDefinitionModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: Capability$.getModuleTag(options.activate) ?? options.id ?? 'blueprint-definition',
      activatesOn: options.activatesOn ?? ActivationEvent.SetupArtifactDefinition,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: options.activate,
    });
  }

  export type SchemaModuleOptions = Omit<PluginModuleOptions, 'activate'> & {
    schema: ReadonlyArray<Type.Entity.Any>;
  };

  /**
   * Creates a module that contributes schemas.
   *
   * @param options Module options including schema array and optional configuration
   * @returns A function that can be used with Plugin.addModule() in a pipe chain
   *
   * @example
   * ```ts
   * Plugin.define(meta).pipe(
   *   Common.Plugin.addSchemaModule({
   *     schema: [MyType.Type, AnotherType.Type]
   *   })
   * )
   * ```
   */
  export function addSchemaModule<T = void>(
    options: SchemaModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: options.id ?? 'schema',
      activatesOn: options.activatesOn ?? ActivationEvent.SetupSchema,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: Effect.fnUntraced(function* () {
        return Capability$.contributes(Capability.Schema, options.schema);
      }),
    });
  }

  export type CommandModuleOptions = Omit<PluginModuleOptions, 'activate'> & {
    commands: ReadonlyArray<Command$.Command<any, any, any, any>>;
  };

  /**
   * Creates a module that contributes CLI commands.
   *
   * @param options Module options including commands and optional configuration
   * @returns A function that can be used with Plugin.addModule() in a pipe chain
   *
   * @example
   * ```ts
   * Plugin.define(meta).pipe(
   *   Common.Plugin.addCommandModule({
   *     commands: [myCommand, anotherCommand]
   *   })
   * )
   * ```
   */
  export function addCommandModule<T = void>(
    options: CommandModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: options.id ?? 'cli-commands',
      activatesOn: options.activatesOn ?? ActivationEvent.Startup,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: Effect.fnUntraced(function* () {
        return options.commands.map((cmd) => Capability$.contributes(Capability.Command, cmd));
      }),
    });
  }
}
