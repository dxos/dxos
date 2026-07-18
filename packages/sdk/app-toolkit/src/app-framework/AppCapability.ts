//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Command$ from '@effect/cli/Command';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability as Capability$ } from '@dxos/app-framework';
import { type Type } from '@dxos/echo';

import { type Translations } from '../app';
import * as AppCapabilities from './AppCapabilities';

//
// Lazy module makers (loader-based bodies).
//

/** Module contributing app graph builder extensions. */
export interface AppGraphBuilderModule<
  Props = void,
  Requires extends readonly Capability$.AnyTag[] = readonly [],
  Extra extends readonly Capability$.AnyTag[] = readonly [],
> extends Capability$.Module<Props, Requires, readonly [typeof AppCapabilities.AppGraphBuilder, ...Extra]> {}
export const appGraphBuilder = <
  Props = void,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
  const Extra extends readonly Capability$.AnyTag[] = readonly [],
>(
  loader: Capability$.LoadModule<Props, Requires, readonly [typeof AppCapabilities.AppGraphBuilder, ...Extra]>,
  options?: Capability$.MakerOptions<Requires, Extra>,
): AppGraphBuilderModule<Props, Requires, Extra> =>
  Capability$.moduleMaker('AppGraphBuilder', AppCapabilities.AppGraphBuilder)(loader, options);

/** Module contributing settings. */
export interface SettingsModule<
  Props = void,
  Requires extends readonly Capability$.AnyTag[] = readonly [],
  Extra extends readonly Capability$.AnyTag[] = readonly [],
> extends Capability$.Module<Props, Requires, readonly [typeof AppCapabilities.Settings, ...Extra]> {}
export const settings = <
  Props = void,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
  const Extra extends readonly Capability$.AnyTag[] = readonly [],
>(
  loader: Capability$.LoadModule<Props, Requires, readonly [typeof AppCapabilities.Settings, ...Extra]>,
  options?: Capability$.MakerOptions<Requires, Extra>,
): SettingsModule<Props, Requires, Extra> =>
  Capability$.moduleMaker('Settings', AppCapabilities.Settings)(loader, options);

/** Module contributing skill definitions. */
export interface SkillDefinitionModule<
  Props = void,
  Requires extends readonly Capability$.AnyTag[] = readonly [],
  Extra extends readonly Capability$.AnyTag[] = readonly [],
> extends Capability$.Module<Props, Requires, readonly [typeof AppCapabilities.SkillDefinition, ...Extra]> {}
export const skillDefinition = <
  Props = void,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
  const Extra extends readonly Capability$.AnyTag[] = readonly [],
>(
  loader: Capability$.LoadModule<Props, Requires, readonly [typeof AppCapabilities.SkillDefinition, ...Extra]>,
  options?: Capability$.MakerOptions<Requires, Extra>,
): SkillDefinitionModule<Props, Requires, Extra> =>
  Capability$.moduleMaker('SkillDefinition', AppCapabilities.SkillDefinition)(loader, options);

/** Module contributing operation handlers. */
export interface OperationHandlerModule<
  Props = void,
  Requires extends readonly Capability$.AnyTag[] = readonly [],
  Extra extends readonly Capability$.AnyTag[] = readonly [],
> extends Capability$.Module<Props, Requires, readonly [typeof Capabilities.OperationHandler, ...Extra]> {}
export const operationHandler = <
  Props = void,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
  const Extra extends readonly Capability$.AnyTag[] = readonly [],
>(
  loader: Capability$.LoadModule<Props, Requires, readonly [typeof Capabilities.OperationHandler, ...Extra]>,
  options?: Capability$.MakerOptions<Requires, Extra>,
): OperationHandlerModule<Props, Requires, Extra> =>
  Capability$.moduleMaker('OperationHandler', Capabilities.OperationHandler)(loader, options);

/** Module contributing undo operation mappings. */
export interface UndoMappingsModule<
  Props = void,
  Requires extends readonly Capability$.AnyTag[] = readonly [],
  Extra extends readonly Capability$.AnyTag[] = readonly [],
> extends Capability$.Module<Props, Requires, readonly [typeof Capabilities.UndoMapping, ...Extra]> {}
export const undoMappings = <
  Props = void,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
  const Extra extends readonly Capability$.AnyTag[] = readonly [],
>(
  loader: Capability$.LoadModule<Props, Requires, readonly [typeof Capabilities.UndoMapping, ...Extra]>,
  options?: Capability$.MakerOptions<Requires, Extra>,
): UndoMappingsModule<Props, Requires, Extra> =>
  Capability$.moduleMaker('UndoMappings', Capabilities.UndoMapping)(loader, options);

/** Module contributing a React context. */
export interface ReactContextModule<
  Props = void,
  Requires extends readonly Capability$.AnyTag[] = readonly [],
  Extra extends readonly Capability$.AnyTag[] = readonly [],
> extends Capability$.Module<Props, Requires, readonly [typeof Capabilities.ReactContext, ...Extra]> {}
export const reactContext = <
  Props = void,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
  const Extra extends readonly Capability$.AnyTag[] = readonly [],
>(
  loader: Capability$.LoadModule<Props, Requires, readonly [typeof Capabilities.ReactContext, ...Extra]>,
  options?: Capability$.MakerOptions<Requires, Extra>,
): ReactContextModule<Props, Requires, Extra> =>
  Capability$.moduleMaker('ReactContext', Capabilities.ReactContext)(loader, options);

/** Module contributing a React root. */
export interface ReactRootModule<
  Props = void,
  Requires extends readonly Capability$.AnyTag[] = readonly [],
  Extra extends readonly Capability$.AnyTag[] = readonly [],
> extends Capability$.Module<Props, Requires, readonly [typeof Capabilities.ReactRoot, ...Extra]> {}
export const reactRoot = <
  Props = void,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
  const Extra extends readonly Capability$.AnyTag[] = readonly [],
>(
  loader: Capability$.LoadModule<Props, Requires, readonly [typeof Capabilities.ReactRoot, ...Extra]>,
  options?: Capability$.MakerOptions<Requires, Extra>,
): ReactRootModule<Props, Requires, Extra> =>
  Capability$.moduleMaker('ReactRoot', Capabilities.ReactRoot)(loader, options);

/** Module contributing navigation target resolvers. */
export interface NavigationResolverModule<
  Props = void,
  Requires extends readonly Capability$.AnyTag[] = readonly [],
  Extra extends readonly Capability$.AnyTag[] = readonly [],
> extends Capability$.Module<Props, Requires, readonly [typeof AppCapabilities.NavigationTargetResolver, ...Extra]> {}
export const navigationResolver = <
  Props = void,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
  const Extra extends readonly Capability$.AnyTag[] = readonly [],
>(
  loader: Capability$.LoadModule<Props, Requires, readonly [typeof AppCapabilities.NavigationTargetResolver, ...Extra]>,
  options?: Capability$.MakerOptions<Requires, Extra>,
): NavigationResolverModule<Props, Requires, Extra> =>
  Capability$.moduleMaker('NavigationResolver', AppCapabilities.NavigationTargetResolver)(loader, options);

/** Module contributing a navigation handler. */
export interface NavigationHandlerModule<
  Props = void,
  Requires extends readonly Capability$.AnyTag[] = readonly [],
  Extra extends readonly Capability$.AnyTag[] = readonly [],
> extends Capability$.Module<Props, Requires, readonly [typeof AppCapabilities.NavigationHandler, ...Extra]> {}
export const navigationHandler = <
  Props = void,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
  const Extra extends readonly Capability$.AnyTag[] = readonly [],
>(
  loader: Capability$.LoadModule<Props, Requires, readonly [typeof AppCapabilities.NavigationHandler, ...Extra]>,
  options?: Capability$.MakerOptions<Requires, Extra>,
): NavigationHandlerModule<Props, Requires, Extra> =>
  Capability$.moduleMaker('NavigationHandler', AppCapabilities.NavigationHandler)(loader, options);

/** Module contributing React surfaces. */
export interface SurfaceModule<
  Props = void,
  Requires extends readonly Capability$.AnyTag[] = readonly [],
  Extra extends readonly Capability$.AnyTag[] = readonly [],
> extends Capability$.Module<Props, Requires, readonly [typeof Capabilities.ReactSurface, ...Extra]> {}
export const surface = <
  Props = void,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
  const Extra extends readonly Capability$.AnyTag[] = readonly [],
>(
  loader: Capability$.LoadModule<Props, Requires, readonly [typeof Capabilities.ReactSurface, ...Extra]>,
  options?: Capability$.MakerOptions<Requires, Extra>,
): SurfaceModule<Props, Requires, Extra> =>
  Capability$.moduleMaker('ReactSurface', Capabilities.ReactSurface)(loader, options);

/** Module contributing a comment configuration. */
export interface CommentConfigModule<
  Props = void,
  Requires extends readonly Capability$.AnyTag[] = readonly [],
  Extra extends readonly Capability$.AnyTag[] = readonly [],
> extends Capability$.Module<Props, Requires, readonly [typeof AppCapabilities.CommentConfig, ...Extra]> {}
export const commentConfig = <
  Props = void,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
  const Extra extends readonly Capability$.AnyTag[] = readonly [],
>(
  loader: Capability$.LoadModule<Props, Requires, readonly [typeof AppCapabilities.CommentConfig, ...Extra]>,
  options?: Capability$.MakerOptions<Requires, Extra>,
): CommentConfigModule<Props, Requires, Extra> =>
  Capability$.moduleMaker('CommentConfig', AppCapabilities.CommentConfig)(loader, options);

/** Module contributing a text content extractor. */
export interface TextContentModule<
  Props = void,
  Requires extends readonly Capability$.AnyTag[] = readonly [],
  Extra extends readonly Capability$.AnyTag[] = readonly [],
> extends Capability$.Module<Props, Requires, readonly [typeof AppCapabilities.TextContent, ...Extra]> {}
export const textContent = <
  Props = void,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
  const Extra extends readonly Capability$.AnyTag[] = readonly [],
>(
  loader: Capability$.LoadModule<Props, Requires, readonly [typeof AppCapabilities.TextContent, ...Extra]>,
  options?: Capability$.MakerOptions<Requires, Extra>,
): TextContentModule<Props, Requires, Extra> =>
  Capability$.moduleMaker('TextContent', AppCapabilities.TextContent)(loader, options);

/** Module contributing an anchor sort comparator. */
export interface AnchorSortModule<
  Props = void,
  Requires extends readonly Capability$.AnyTag[] = readonly [],
  Extra extends readonly Capability$.AnyTag[] = readonly [],
> extends Capability$.Module<Props, Requires, readonly [typeof AppCapabilities.AnchorSort, ...Extra]> {}
export const anchorSort = <
  Props = void,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
  const Extra extends readonly Capability$.AnyTag[] = readonly [],
>(
  loader: Capability$.LoadModule<Props, Requires, readonly [typeof AppCapabilities.AnchorSort, ...Extra]>,
  options?: Capability$.MakerOptions<Requires, Extra>,
): AnchorSortModule<Props, Requires, Extra> =>
  Capability$.moduleMaker('AnchorSort', AppCapabilities.AnchorSort)(loader, options);

//
// Inline module makers (value-based bodies).
//

/** Module contributing translations. */
export interface TranslationsModule extends Capability$.Module<
  void,
  readonly [],
  readonly [typeof AppCapabilities.Translations]
> {}
export const translations = (
  resources: Translations.Resource | Translations.Resource[],
  options?: { name?: string },
): TranslationsModule => {
  const value: Translations.Resource[] = Array.isArray(resources) ? resources : [resources];
  return Capability$.inlineModule(options?.name ?? 'translations', { provides: [AppCapabilities.Translations] }, () =>
    Effect.succeed([Capability$.provide(AppCapabilities.Translations, value)]),
  );
};

/** Module contributing schemas. */
export interface SchemaModule extends Capability$.Module<void, readonly [], readonly [typeof AppCapabilities.Schema]> {}
export const schema = (types: ReadonlyArray<Type.AnyEntity>, options?: { name?: string }): SchemaModule =>
  Capability$.inlineModule(options?.name ?? 'schema', { provides: [AppCapabilities.Schema] }, () =>
    Effect.succeed([Capability$.provide(AppCapabilities.Schema, types)]),
  );

/** Module contributing static plugin assets (typically the bundled `PLUGIN.mdl` spec). */
export interface PluginAssetModule extends Capability$.Module<
  void,
  readonly [],
  readonly [typeof AppCapabilities.PluginAsset]
> {}
export const pluginAsset = (
  asset: AppCapabilities.PluginAsset | ReadonlyArray<AppCapabilities.PluginAsset>,
  options?: { name?: string },
): PluginAssetModule => {
  const values: ReadonlyArray<AppCapabilities.PluginAsset> = Array.isArray(asset) ? asset : [asset];
  return Capability$.inlineModule(options?.name ?? 'plugin-asset', { provides: [AppCapabilities.PluginAsset] }, () =>
    Effect.succeed([Capability$.provideAll(AppCapabilities.PluginAsset, values)]),
  );
};

/** Module contributing CLI commands. */
export interface CommandsModule extends Capability$.Module<void, readonly [], readonly [typeof Capabilities.Command]> {}
export const commands = (
  values: ReadonlyArray<Command$.Command<any, any, any, any>>,
  options?: { name?: string },
): CommandsModule =>
  Capability$.inlineModule(options?.name ?? 'cli-commands', { provides: [Capabilities.Command] }, () =>
    Effect.succeed([Capability$.provideAll(Capabilities.Command, values)]),
  );
