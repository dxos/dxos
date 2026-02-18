//
// Copyright 2025 DXOS.org
//

import type * as Command$ from '@effect/cli/Command';
import * as Effect from 'effect/Effect';

import { ActivationEvents, Capabilities, Capability as Capability$, Plugin as Plugin$ } from '@dxos/app-framework';
import { type Type } from '@dxos/echo';

import { AppActivationEvents } from './activation-events';
import { AppCapabilities } from './capabilities';
import { type Resource } from './translations';

type PluginModuleOptions = Partial<
  Pick<Plugin$.PluginModuleOptions, 'id' | 'activatesOn' | 'activatesBefore' | 'activatesAfter'>
> &
  Pick<Plugin$.PluginModuleOptions, 'activate'>;

/**
 * Helper functions for creating common plugin module patterns.
 */
export namespace AppPlugin {
  export type AppGraphModuleOptions = PluginModuleOptions;

  /**
   * Creates a module that contributes app graph builder extensions.
   */
  export function addAppGraphModule<T = void>(
    options: AppGraphModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: Capability$.getModuleTag(options.activate) ?? options.id ?? 'app-graph-builder',
      activatesOn: options.activatesOn ?? AppActivationEvents.SetupAppGraph,
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
   */
  export function addTranslationsModule<T = void>(
    options: TranslationsModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: options?.id ?? 'translations',
      activatesOn: options?.activatesOn ?? AppActivationEvents.SetupTranslations,
      activatesBefore: options?.activatesBefore,
      activatesAfter: options?.activatesAfter,
      activate: Effect.fnUntraced(function* () {
        return Capability$.contributes(
          AppCapabilities.Translations,
          Array.isArray(options.translations) ? options.translations : ([options.translations] as Resource[]),
        );
      }),
    });
  }

  export type MetadataModuleOptions = Omit<PluginModuleOptions, 'activate'> & {
    metadata: AppCapabilities.Metadata | AppCapabilities.Metadata[];
  };

  /**
   * Creates a module that contributes metadata.
   */
  export function addMetadataModule<T = void>(
    options: MetadataModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: options.id ?? 'metadata',
      activatesOn: options.activatesOn ?? AppActivationEvents.SetupMetadata,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: Effect.fnUntraced(function* () {
        return (Array.isArray(options.metadata) ? options.metadata : [options.metadata]).map((m) =>
          Capability$.contributes(AppCapabilities.Metadata, m),
        );
      }),
    });
  }

  export type SettingsModuleOptions = PluginModuleOptions;

  /**
   * Creates a module that contributes settings.
   */
  export function addSettingsModule<T = void>(
    options: SettingsModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: Capability$.getModuleTag(options.activate) ?? options.id ?? 'settings',
      activatesOn: options.activatesOn ?? AppActivationEvents.SetupSettings,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: options.activate,
    });
  }

  export type BlueprintDefinitionModuleOptions = PluginModuleOptions;

  /**
   * Creates a module that contributes blueprint definitions.
   */
  export function addBlueprintDefinitionModule<T = void>(
    options: BlueprintDefinitionModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: Capability$.getModuleTag(options.activate) ?? options.id ?? 'blueprint-definition',
      activatesOn: options.activatesOn ?? AppActivationEvents.SetupArtifactDefinition,
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
   */
  export function addSchemaModule<T = void>(
    options: SchemaModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: options.id ?? 'schema',
      activatesOn: options.activatesOn ?? AppActivationEvents.SetupSchema,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: Effect.fnUntraced(function* () {
        return Capability$.contributes(AppCapabilities.Schema, options.schema);
      }),
    });
  }

  export type CommandModuleOptions = Omit<PluginModuleOptions, 'activate'> & {
    commands: ReadonlyArray<Command$.Command<any, any, any, any>>;
  };

  /**
   * Creates a module that contributes CLI commands.
   */
  export function addCommandModule<T = void>(
    options: CommandModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: options.id ?? 'cli-commands',
      activatesOn: options.activatesOn ?? ActivationEvents.Startup,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: Effect.fnUntraced(function* () {
        return options.commands.map((cmd) => Capability$.contributes(Capabilities.Command, cmd));
      }),
    });
  }

  export type OperationResolverModuleOptions = PluginModuleOptions;

  /**
   * Creates a module that contributes operation handlers.
   */
  export function addOperationResolverModule<T = void>(
    options: OperationResolverModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: Capability$.getModuleTag(options.activate) ?? options.id ?? 'operation-resolver',
      activatesOn: options.activatesOn ?? ActivationEvents.SetupOperationResolver,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: options.activate,
    });
  }

  export type ReactContextModuleOptions = PluginModuleOptions;

  /**
   * Creates a module that contributes a React context.
   */
  export function addReactContextModule<T = void>(
    options: ReactContextModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: Capability$.getModuleTag(options.activate) ?? options.id ?? 'react-context',
      activatesOn: options.activatesOn ?? ActivationEvents.Startup,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: options.activate,
    });
  }

  export type ReactRootModuleOptions = PluginModuleOptions;

  /**
   * Creates a module that contributes a React root.
   */
  export function addReactRootModule<T = void>(
    options: ReactRootModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: Capability$.getModuleTag(options.activate) ?? options.id ?? 'react-root',
      activatesOn: options.activatesOn ?? ActivationEvents.Startup,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: options.activate,
    });
  }

  export type SurfaceModuleOptions = PluginModuleOptions;

  /**
   * Creates a module that contributes React surfaces.
   */
  export function addSurfaceModule<T = void>(
    options: SurfaceModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: Capability$.getModuleTag(options.activate) ?? options.id ?? 'surfaces',
      activatesOn: options.activatesOn ?? ActivationEvents.SetupReactSurface,
      activatesBefore: options.activatesBefore,
      activatesAfter: options.activatesAfter,
      activate: options.activate,
    });
  }
}
