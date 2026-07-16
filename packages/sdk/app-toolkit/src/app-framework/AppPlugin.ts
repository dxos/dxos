//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Command$ from '@effect/cli/Command';
import * as Effect from 'effect/Effect';

import {
  ActivationEvents,
  Capabilities,
  ActivationEvent as ActivationEvent$,
  Capability as Capability$,
  Plugin as Plugin$,
} from '@dxos/app-framework';
import { type Type } from '@dxos/echo';

import { Translations } from '../app';
import * as AppActivationEvents from './AppActivationEvents';
import * as AppCapabilities from './AppCapabilities';

/**
 * Body-bearing module options shared by the `addXModule` helpers.
 *
 * Declaring `requires` and/or `provides` opts the module into dependency mode: it activates
 * during the startup dependency pass, `requires` declares typed capability access for the
 * body (`yield* Tag`), and `provides` defaults to the helper's capability. Calls without
 * capability declarations keep the legacy event wiring until their plugin migrates.
 */
export type CapabilityModuleOptions<
  C extends Capability$.AnyTag,
  Requires extends readonly Capability$.AnyTag[] = readonly [],
> = {
  id?: string;
  /** Capabilities the body accesses via `yield*`. Declaring this opts into dependency mode. */
  requires?: Requires;
  /**
   * Overrides the helper's default provides (e.g. a body contributing additional
   * capabilities). Declaring this opts into dependency mode.
   */
  provides?: readonly Capability$.AnyTag[];
  /** Legacy events fired by the framework after activation (migration bridge). */
  compatFires?: readonly ActivationEvent$.ActivationEvent[];
  /** @deprecated Legacy event wiring; declare capability dependencies instead. */
  activatesOn?: ActivationEvent$.Events;
  /** @deprecated Legacy event wiring; declare `requires` instead. */
  firesBeforeActivation?: ActivationEvent$.ActivationEvent[];
  /** @deprecated Legacy event wiring; providers gate consumers via capabilities instead. */
  firesAfterActivation?: ActivationEvent$.ActivationEvent[];
  activate:
    | ((props?: any) => Effect.Effect<Capability$.ModuleReturn, Error, Capability$.Service | Plugin$.Service | never>)
    | (() => Effect.Effect<
        ReadonlyArray<Capability$.Contribution<C>> | readonly Capability$.AnyContribution[],
        Error,
        Capability$.Requirements<Requires>
      >);
};

type AnyCapabilityModuleOptions = CapabilityModuleOptions<Capability$.AnyTag, readonly Capability$.AnyTag[]>;

/**
 * Shared helper implementation: modules declaring `requires`/`provides` become
 * dependency-mode; everything else keeps the legacy event wiring (removed with the
 * legacy API).
 */
const addCapabilityModule = <T>(args: {
  defaultId: string;
  /** Default provides for dependency mode; omitted for helpers whose bodies contribute foreign capabilities (callers pass `provides`). */
  capability?: Capability$.AnyTag;
  legacyActivatesOn: ActivationEvent$.Events;
  options: AnyCapabilityModuleOptions;
  /** Force dependency mode even without caller declarations (helper-owned bodies). */
  alwaysDependency?: boolean;
}): ((builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T>) => {
  const { options } = args;
  const id = Capability$.getModuleTag(options.activate) ?? options.id ?? args.defaultId;
  const hasLegacyWiring =
    options.activatesOn !== undefined ||
    options.firesBeforeActivation !== undefined ||
    options.firesAfterActivation !== undefined;
  const declared = options.requires !== undefined || options.provides !== undefined;
  if (hasLegacyWiring || (!declared && !args.alwaysDependency)) {
    return (builder) =>
      builder.addModule({
        id,
        activatesOn: options.activatesOn ?? args.legacyActivatesOn,
        firesBeforeActivation: options.firesBeforeActivation,
        firesAfterActivation: options.firesAfterActivation,
        activate: options.activate,
      });
  }
  return (builder) =>
    builder.addModule({
      id,
      requires: options.requires ?? [],
      provides: options.provides ?? (args.capability ? [args.capability] : []),
      compatFires: options.compatFires,
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
    legacyActivatesOn: ActivationEvent$.allOf(AppActivationEvents.SetupSettings, AppActivationEvents.SetupAppGraph),
    options,
  });
}

export type TranslationsModuleOptions = {
  id?: string;
  translations: Translations.Resource | Translations.Resource[];
  /** @deprecated Legacy event wiring. */
  activatesOn?: ActivationEvent$.Events;
  /** @deprecated Legacy event wiring. */
  firesBeforeActivation?: ActivationEvent$.ActivationEvent[];
  /** @deprecated Legacy event wiring. */
  firesAfterActivation?: ActivationEvent$.ActivationEvent[];
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
    legacyActivatesOn: AppActivationEvents.SetupTranslations,
    alwaysDependency: true,
    options: {
      id: options.id,
      activatesOn: options.activatesOn,
      firesBeforeActivation: options.firesBeforeActivation,
      firesAfterActivation: options.firesAfterActivation,
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
    legacyActivatesOn: AppActivationEvents.SetupSettings,
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
    legacyActivatesOn: AppActivationEvents.SetupArtifactDefinition,
    options,
  });
}

export type PluginAssetModuleOptions = {
  id?: string;
  asset: AppCapabilities.PluginAsset | ReadonlyArray<AppCapabilities.PluginAsset>;
  /** @deprecated Legacy event wiring. */
  activatesOn?: ActivationEvent$.Events;
  /** @deprecated Legacy event wiring. */
  firesBeforeActivation?: ActivationEvent$.ActivationEvent[];
  /** @deprecated Legacy event wiring. */
  firesAfterActivation?: ActivationEvent$.ActivationEvent[];
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
    legacyActivatesOn: AppActivationEvents.SetupPluginAssets,
    alwaysDependency: true,
    options: {
      id: options.id,
      activatesOn: options.activatesOn,
      firesBeforeActivation: options.firesBeforeActivation,
      firesAfterActivation: options.firesAfterActivation,
      activate: () => Effect.succeed([Capability$.provideAll(AppCapabilities.PluginAsset, assets)]),
    },
  });
}

export type SchemaModuleOptions = {
  id?: string;
  schema: ReadonlyArray<Type.AnyEntity>;
  /** @deprecated Legacy event wiring. */
  activatesOn?: ActivationEvent$.Events;
  /** @deprecated Legacy event wiring. */
  firesBeforeActivation?: ActivationEvent$.ActivationEvent[];
  /** @deprecated Legacy event wiring. */
  firesAfterActivation?: ActivationEvent$.ActivationEvent[];
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
    legacyActivatesOn: AppActivationEvents.SetupSchema,
    alwaysDependency: true,
    options: {
      id: options.id,
      activatesOn: options.activatesOn,
      firesBeforeActivation: options.firesBeforeActivation,
      firesAfterActivation: options.firesAfterActivation,
      activate: () => Effect.succeed([Capability$.provide(AppCapabilities.Schema, options.schema)]),
    },
  });
}

export type CommandModuleOptions = {
  id?: string;
  commands: ReadonlyArray<Command$.Command<any, any, any, any>>;
  /** @deprecated Legacy event wiring. */
  activatesOn?: ActivationEvent$.Events;
  /** @deprecated Legacy event wiring. */
  firesBeforeActivation?: ActivationEvent$.ActivationEvent[];
  /** @deprecated Legacy event wiring. */
  firesAfterActivation?: ActivationEvent$.ActivationEvent[];
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
    legacyActivatesOn: ActivationEvents.Startup,
    alwaysDependency: true,
    options: {
      id: options.id,
      activatesOn: options.activatesOn,
      firesBeforeActivation: options.firesBeforeActivation,
      firesAfterActivation: options.firesAfterActivation,
      activate: () => Effect.succeed([Capability$.provideAll(Capabilities.Command, options.commands)]),
    },
  });
}

export type OperationHandlerModuleOptions<Requires extends readonly Capability$.AnyTag[] = readonly []> =
  CapabilityModuleOptions<typeof Capabilities.OperationHandler, Requires>;

/**
 * Creates a module that contributes operation handlers.
 */
export function addOperationHandlerModule<
  T = void,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
>(
  options: OperationHandlerModuleOptions<Requires>,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  return addCapabilityModule<T>({
    defaultId: 'operation-handler',
    capability: Capabilities.OperationHandler,
    legacyActivatesOn: ActivationEvents.SetupProcessManager,
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
    legacyActivatesOn: ActivationEvents.SetupProcessManager,
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
    legacyActivatesOn: ActivationEvents.Startup,
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
    legacyActivatesOn: ActivationEvents.Startup,
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
>(
  options: NavigationResolverModuleOptions<Requires>,
): (builder: Plugin$.PluginBuilder<T>) => Plugin$.PluginBuilder<T> {
  return addCapabilityModule<T>({
    defaultId: 'navigation-resolver',
    capability: AppCapabilities.NavigationTargetResolver,
    legacyActivatesOn: ActivationEvents.ProcessManagerReady,
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
        const declared = resolved.requires !== undefined || resolved.provides !== undefined;
        if (!declared || resolved.activatesOn || resolved.firesBeforeActivation || resolved.firesAfterActivation) {
          return {
            id: Capability$.getModuleTag(resolved.activate) ?? resolved.id ?? 'navigation-handler',
            activatesOn: resolved.activatesOn ?? ActivationEvents.ProcessManagerReady,
            firesBeforeActivation: resolved.firesBeforeActivation,
            firesAfterActivation: resolved.firesAfterActivation,
            activate: resolved.activate,
          };
        }
        return {
          id: Capability$.getModuleTag(resolved.activate) ?? resolved.id ?? 'navigation-handler',
          requires: resolved.requires ?? [],
          provides: resolved.provides ?? [AppCapabilities.NavigationHandler],
          compatFires: resolved.compatFires,
          activate: resolved.activate,
        };
      });
  }
  return addCapabilityModule<T>({
    defaultId: 'navigation-handler',
    capability: AppCapabilities.NavigationHandler,
    legacyActivatesOn: ActivationEvents.ProcessManagerReady,
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
    legacyActivatesOn: ActivationEvents.SetupReactSurface,
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
    legacyActivatesOn: AppActivationEvents.SetupSchema,
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
    legacyActivatesOn: AppActivationEvents.SetupSchema,
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
    legacyActivatesOn: AppActivationEvents.SetupSchema,
    options,
  });
}
