//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Command$ from '@effect/cli/Command';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability as Capability$, Plugin as Plugin$ } from '@dxos/app-framework';
import { type Type } from '@dxos/echo';

import { Translations } from '../app';
import * as AppCapabilities from './AppCapabilities';

/**
 * Body-bearing module options shared by the `addXModule` helpers.
 *
 * Always dependency mode: the module activates during the startup dependency pass,
 * `requires` declares typed capability access for the body (`yield* Tag`), and `provides`
 * defaults to the helper's capability (override when the body contributes additional
 * capabilities).
 */
export type CapabilityModuleOptions<
  C extends Capability$.AnyTag,
  Requires extends readonly Capability$.AnyTag[] = readonly [],
> = {
  id?: string;
  /** Capabilities the body accesses via `yield*`. */
  requires?: Requires;
  /** Overrides the helper's default provides (e.g. a body contributing additional capabilities). */
  provides?: readonly Capability$.AnyTag[];
  activate: () => Effect.Effect<
    ReadonlyArray<Capability$.Contribution<C>> | readonly Capability$.AnyContribution[],
    Error,
    Capability$.Requirements<Requires>
  >;
};

type AnyCapabilityModuleOptions = CapabilityModuleOptions<Capability$.AnyTag, readonly Capability$.AnyTag[]>;

/**
 * Shared helper implementation: always dependency-mode.
 */
const addCapabilityModule = <T>(args: {
  defaultId: string;
  /** Default provides; omitted for helpers whose bodies contribute foreign capabilities (callers pass `provides`). */
  capability?: Capability$.AnyTag;
  options: AnyCapabilityModuleOptions;
}): ((builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T>) => {
  const { options } = args;
  const id = Capability$.getModuleTag(options.activate) ?? options.id ?? args.defaultId;
  return (builder) =>
    builder.addModule({
      id,
      requires: options.requires ?? [],
      provides: options.provides ?? (args.capability ? [args.capability] : []),
      activate: options.activate,
    });
};

export type AppGraphModuleOptions<Requires extends readonly Capability$.AnyTag[] = readonly []> =
  CapabilityModuleOptions<typeof AppCapabilities.AppGraphBuilder, Requires>;

/**
 * Creates a module that contributes app graph builder extensions.
 */
export function addAppGraphModule<T = void, const Requires extends readonly Capability$.AnyTag[] = readonly []>(
  options: AppGraphModuleOptions<Requires>,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  return addCapabilityModule<T>({
    defaultId: 'app-graph-builder',
    capability: AppCapabilities.AppGraphBuilder,
    options,
  });
}

export type TranslationsModuleOptions = {
  id?: string;
  translations: Translations.Resource | Translations.Resource[];
};

/**
 * Creates a module that contributes translations.
 */
export function addTranslationsModule<T = void>(
  options: TranslationsModuleOptions,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  const resources: Translations.Resource[] = Array.isArray(options.translations)
    ? options.translations
    : [options.translations];
  return addCapabilityModule<T>({
    defaultId: 'translations',
    capability: AppCapabilities.Translations,
    options: {
      id: options.id,
      activate: () => Effect.succeed([Capability$.provide(AppCapabilities.Translations, resources)]),
    },
  });
}

export type SettingsModuleOptions<Requires extends readonly Capability$.AnyTag[] = readonly []> =
  CapabilityModuleOptions<typeof AppCapabilities.Settings, Requires>;

/**
 * Creates a module that contributes settings.
 */
export function addSettingsModule<T = void, const Requires extends readonly Capability$.AnyTag[] = readonly []>(
  options: SettingsModuleOptions<Requires>,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  return addCapabilityModule<T>({
    defaultId: 'settings',
    capability: AppCapabilities.Settings,
    options,
  });
}

export type SkillDefinitionModuleOptions<Requires extends readonly Capability$.AnyTag[] = readonly []> =
  CapabilityModuleOptions<typeof AppCapabilities.SkillDefinition, Requires>;

/**
 * Creates a module that contributes skill definitions.
 */
export function addSkillDefinitionModule<T = void, const Requires extends readonly Capability$.AnyTag[] = readonly []>(
  options: SkillDefinitionModuleOptions<Requires>,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  return addCapabilityModule<T>({
    defaultId: 'skill-definition',
    capability: AppCapabilities.SkillDefinition,
    options,
  });
}

export type PluginAssetModuleOptions = {
  id?: string;
  asset: AppCapabilities.PluginAsset | ReadonlyArray<AppCapabilities.PluginAsset>;
};

/**
 * Creates a module that contributes one or more static plugin assets
 * (typically the bundled `PLUGIN.mdl` spec).
 */
export function addPluginAssetModule<T = void>(
  options: PluginAssetModuleOptions,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  const assets: ReadonlyArray<AppCapabilities.PluginAsset> = Array.isArray(options.asset)
    ? (options.asset as ReadonlyArray<AppCapabilities.PluginAsset>)
    : [options.asset as AppCapabilities.PluginAsset];
  return addCapabilityModule<T>({
    defaultId: 'plugin-asset',
    capability: AppCapabilities.PluginAsset,
    options: {
      id: options.id,
      activate: () => Effect.succeed([Capability$.provideAll(AppCapabilities.PluginAsset, assets)]),
    },
  });
}

export type SchemaModuleOptions = {
  id?: string;
  schema: ReadonlyArray<Type.AnyEntity>;
};

/**
 * Creates a module that contributes schemas.
 */
export function addSchemaModule<T = void>(
  options: SchemaModuleOptions,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  return addCapabilityModule<T>({
    defaultId: 'schema',
    capability: AppCapabilities.Schema,
    options: {
      id: options.id,
      activate: () => Effect.succeed([Capability$.provide(AppCapabilities.Schema, options.schema)]),
    },
  });
}

export type CommandModuleOptions = {
  id?: string;
  commands: ReadonlyArray<Command$.Command<any, any, any, any>>;
};

/**
 * Creates a module that contributes CLI commands.
 */
export function addCommandModule<T = void>(
  options: CommandModuleOptions,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  return addCapabilityModule<T>({
    defaultId: 'cli-commands',
    capability: Capabilities.Command,
    options: {
      id: options.id,
      activate: () => Effect.succeed([Capability$.provideAll(Capabilities.Command, options.commands)]),
    },
  });
}

export type OperationHandlerModuleOptions<Requires extends readonly Capability$.AnyTag[] = readonly []> =
  CapabilityModuleOptions<typeof Capabilities.OperationHandler, Requires>;

/**
 * Creates a module that contributes operation handlers.
 */
export function addOperationHandlerModule<T = void, const Requires extends readonly Capability$.AnyTag[] = readonly []>(
  options: OperationHandlerModuleOptions<Requires>,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  return addCapabilityModule<T>({
    defaultId: 'operation-handler',
    capability: Capabilities.OperationHandler,
    options,
  });
}

export type UndoMappingsModuleOptions<Requires extends readonly Capability$.AnyTag[] = readonly []> =
  CapabilityModuleOptions<typeof Capabilities.UndoMapping, Requires>;

/**
 * Creates a module that contributes undo operation mappings.
 */
export function addUndoMappingsModule<T = void, const Requires extends readonly Capability$.AnyTag[] = readonly []>(
  options: UndoMappingsModuleOptions<Requires>,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  return addCapabilityModule<T>({
    defaultId: 'undo-mappings',
    capability: Capabilities.UndoMapping,
    options,
  });
}

export type ReactContextModuleOptions<Requires extends readonly Capability$.AnyTag[] = readonly []> =
  CapabilityModuleOptions<typeof Capabilities.ReactContext, Requires>;

/**
 * Creates a module that contributes a React context.
 */
export function addReactContextModule<T = void, const Requires extends readonly Capability$.AnyTag[] = readonly []>(
  options: ReactContextModuleOptions<Requires>,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  return addCapabilityModule<T>({
    defaultId: 'react-context',
    capability: Capabilities.ReactContext,
    options,
  });
}

export type ReactRootModuleOptions<Requires extends readonly Capability$.AnyTag[] = readonly []> =
  CapabilityModuleOptions<typeof Capabilities.ReactRoot, Requires>;

/**
 * Creates a module that contributes a React root.
 */
export function addReactRootModule<T = void, const Requires extends readonly Capability$.AnyTag[] = readonly []>(
  options: ReactRootModuleOptions<Requires>,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  return addCapabilityModule<T>({
    defaultId: 'react-root',
    capability: Capabilities.ReactRoot,
    options,
  });
}

export type NavigationResolverModuleOptions<Requires extends readonly Capability$.AnyTag[] = readonly []> =
  CapabilityModuleOptions<typeof AppCapabilities.NavigationTargetResolver, Requires>;

/**
 * Creates a module that contributes navigation target resolvers.
 */
export function addNavigationResolverModule<
  T = void,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
>(options: NavigationResolverModuleOptions<Requires>): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  return addCapabilityModule<T>({
    defaultId: 'navigation-resolver',
    capability: AppCapabilities.NavigationTargetResolver,
    options,
  });
}

export type NavigationHandlerModuleOptions<Requires extends readonly Capability$.AnyTag[] = readonly []> =
  CapabilityModuleOptions<typeof AppCapabilities.NavigationHandler, Requires>;

/**
 * Creates a module that contributes a navigation handler.
 * Navigation handlers are called by layout plugins on page load, popstate, and deep link events.
 * Accepts either static options or a function that receives plugin options.
 */
export function addNavigationHandlerModule<
  T = void,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
>(
  options: NavigationHandlerModuleOptions<Requires> | ((pluginOptions: T) => NavigationHandlerModuleOptions<Requires>),
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  if (typeof options === 'function') {
    return (builder) =>
      builder.addModule((pluginOptions: T) => {
        const resolved = options(pluginOptions);
        return {
          id: Capability$.getModuleTag(resolved.activate) ?? resolved.id ?? 'navigation-handler',
          requires: resolved.requires ?? [],
          provides: resolved.provides ?? [AppCapabilities.NavigationHandler],
          activate: resolved.activate,
        };
      });
  }
  return addCapabilityModule<T>({
    defaultId: 'navigation-handler',
    capability: AppCapabilities.NavigationHandler,
    options,
  });
}

export type SurfaceModuleOptions<Requires extends readonly Capability$.AnyTag[] = readonly []> =
  CapabilityModuleOptions<typeof Capabilities.ReactSurface, Requires>;

/**
 * Creates a module that contributes React surfaces.
 */
export function addSurfaceModule<T = void, const Requires extends readonly Capability$.AnyTag[] = readonly []>(
  options: SurfaceModuleOptions<Requires>,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  return addCapabilityModule<T>({
    defaultId: 'surfaces',
    capability: Capabilities.ReactSurface,
    options,
  });
}

export type CreateObjectModuleOptions<Requires extends readonly Capability$.AnyTag[] = readonly []> =
  CapabilityModuleOptions<Capability$.AnyTag, Requires>;

/**
 * Creates a module that contributes a create-object capability entry.
 * The entry capability lives in plugin-space, so dependency mode requires an explicit
 * `provides` from the caller.
 */
export function addCreateObjectModule<T = void, const Requires extends readonly Capability$.AnyTag[] = readonly []>(
  options: CreateObjectModuleOptions<Requires>,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  return addCapabilityModule<T>({
    defaultId: 'create-object',
    options,
  });
}

export type CommentConfigModuleOptions<Requires extends readonly Capability$.AnyTag[] = readonly []> =
  CapabilityModuleOptions<typeof AppCapabilities.CommentConfig, Requires>;

/**
 * Creates a module that contributes a comment configuration.
 */
export function addCommentConfigModule<T = void, const Requires extends readonly Capability$.AnyTag[] = readonly []>(
  options: CommentConfigModuleOptions<Requires>,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  return addCapabilityModule<T>({
    defaultId: 'comment-config',
    capability: AppCapabilities.CommentConfig,
    options,
  });
}

export type TextContentModuleOptions<Requires extends readonly Capability$.AnyTag[] = readonly []> =
  CapabilityModuleOptions<typeof AppCapabilities.TextContent, Requires>;

/**
 * Creates a module that contributes a text content extractor.
 */
export function addTextContentModule<T = void, const Requires extends readonly Capability$.AnyTag[] = readonly []>(
  options: TextContentModuleOptions<Requires>,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  return addCapabilityModule<T>({
    defaultId: 'text-content',
    capability: AppCapabilities.TextContent,
    options,
  });
}
