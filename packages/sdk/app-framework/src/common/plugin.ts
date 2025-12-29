//
// Copyright 2025 DXOS.org
//

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
  // TODO(wittjosiah): Restrict type to only allow intent resolvers.
  export type IntentResolverModuleOptions = PluginModuleOptions;

  /**
   * Creates a module that contributes intent resolvers.
   *
   * @param options Module options including the activate function and optional configuration
   * @returns A function that can be used with Plugin.addModule() in a pipe chain
   *
   * @example
   * ```ts
   * Plugin.define(meta).pipe(
   *   Common.Plugin.addIntentResolverModule({
   *     activate: (context) =>
   *       Capability.contributes(Common.Capability.IntentResolver, [
   *         createResolver({ intent: MyAction.DoSomething, resolve: ... })
   *       ])
   *   })
   * )
   * ```
   */
  export function addIntentResolverModule<T = void>(
    options: IntentResolverModuleOptions,
  ): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
    return Plugin$.addModule({
      id: Capability$.getModuleTag(options.activate) ?? options.id ?? 'intent-resolver',
      activatesOn: options.activatesOn ?? ActivationEvent.SetupIntentResolver,
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
      activate: () =>
        Capability$.contributes(
          Capability.Translations,
          Array.isArray(options.translations) ? options.translations : ([options.translations] as Resource[]),
        ),
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
      activate: () => {
        const metadataArray = Array.isArray(options.metadata) ? options.metadata : [options.metadata];
        return metadataArray.map((m) => Capability$.contributes(Capability.Metadata, m));
      },
    });
  }
}
