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

/**
 * Type of a maker built by {@link Capability$.moduleMaker}, spelled out explicitly (rather than
 * inferred) so a capability tag whose type structurally carries a type this module doesn't
 * re-export (e.g. `@dxos/compute`'s `Skill.Definition`) doesn't force that foreign type to be
 * named in this package's declaration emit (TS2883) — `C` is referenced here via `typeof`.
 */
type Maker<C extends Capability$.AnyTag> = <
  Props = void,
  Options = Props,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
  const Extra extends readonly Capability$.AnyTag[] = readonly [],
>(
  loader: Capability$.LoadModule<Props, Requires, readonly [C, ...Extra]>,
  options?: Capability$.MakerOptions<Requires, Extra, Props, Options>,
) => Capability$.Module<Options>;

//
// Lazy module makers (loader-based bodies).
//

/** Module maker contributing app graph builder extensions. */
export const appGraphBuilder: Maker<typeof AppCapabilities.AppGraphBuilder> = Capability$.moduleMaker(
  'AppGraphBuilder',
  AppCapabilities.AppGraphBuilder,
);

/** Module maker contributing settings. */
export const settings: Maker<typeof AppCapabilities.Settings> = Capability$.moduleMaker(
  'Settings',
  AppCapabilities.Settings,
);

/** Module maker contributing skill definitions. */
export const skillDefinition: Maker<typeof AppCapabilities.SkillDefinition> = Capability$.moduleMaker(
  'SkillDefinition',
  AppCapabilities.SkillDefinition,
);

/** Module maker contributing operation handlers. */
export const operationHandler: Maker<typeof Capabilities.OperationHandler> = Capability$.moduleMaker(
  'OperationHandler',
  Capabilities.OperationHandler,
);

/** Module maker contributing undo operation mappings. */
export const undoMappings: Maker<typeof Capabilities.UndoMapping> = Capability$.moduleMaker(
  'UndoMappings',
  Capabilities.UndoMapping,
);

/** Module maker contributing a React context. */
export const reactContext: Maker<typeof Capabilities.ReactContext> = Capability$.moduleMaker(
  'ReactContext',
  Capabilities.ReactContext,
);

/** Module maker contributing a React root. */
export const reactRoot: Maker<typeof Capabilities.ReactRoot> = Capability$.moduleMaker(
  'ReactRoot',
  Capabilities.ReactRoot,
);

/** Module maker contributing navigation target resolvers. */
export const navigationResolver: Maker<typeof AppCapabilities.NavigationTargetResolver> = Capability$.moduleMaker(
  'NavigationResolver',
  AppCapabilities.NavigationTargetResolver,
);

/** Module maker contributing a navigation handler. */
export const navigationHandler: Maker<typeof AppCapabilities.NavigationHandler> = Capability$.moduleMaker(
  'NavigationHandler',
  AppCapabilities.NavigationHandler,
);

/** Module maker contributing React surfaces. */
export const surface: Maker<typeof Capabilities.ReactSurface> = Capability$.moduleMaker(
  'ReactSurface',
  Capabilities.ReactSurface,
);

/** Module maker contributing a comment configuration. */
export const commentConfig: Maker<typeof AppCapabilities.CommentConfig> = Capability$.moduleMaker(
  'CommentConfig',
  AppCapabilities.CommentConfig,
);

/** Module maker contributing a text content extractor. */
export const textContent: Maker<typeof AppCapabilities.TextContent> = Capability$.moduleMaker(
  'TextContent',
  AppCapabilities.TextContent,
);

/** Module maker contributing an anchor sort comparator. */
export const anchorSort: Maker<typeof AppCapabilities.AnchorSort> = Capability$.moduleMaker(
  'AnchorSort',
  AppCapabilities.AnchorSort,
);

//
// Inline module makers (value-based bodies).
//

/** Module contributing translations. */
export const translations = (
  resources: Translations.Resource | Translations.Resource[],
  options?: { name?: string },
) => {
  const value: Translations.Resource[] = Array.isArray(resources) ? resources : [resources];
  return Capability$.inlineModule(options?.name ?? 'translations', { provides: [AppCapabilities.Translations] }, () =>
    Effect.succeed([Capability$.contribute(AppCapabilities.Translations, value)]),
  );
};

/** Module contributing schemas. */
export const schema = (types: ReadonlyArray<Type.AnyEntity>, options?: { name?: string }) =>
  Capability$.inlineModule(options?.name ?? 'schema', { provides: [AppCapabilities.Schema] }, () =>
    Effect.succeed([Capability$.contribute(AppCapabilities.Schema, types)]),
  );

/** Module contributing static plugin assets (typically the bundled `PLUGIN.mdl` spec). */
export const pluginAsset = (
  asset: AppCapabilities.PluginAsset | ReadonlyArray<AppCapabilities.PluginAsset>,
  options?: { name?: string },
) => {
  const values: ReadonlyArray<AppCapabilities.PluginAsset> = Array.isArray(asset) ? asset : [asset];
  return Capability$.inlineModule(options?.name ?? 'plugin-asset', { provides: [AppCapabilities.PluginAsset] }, () =>
    Effect.succeed([Capability$.contributeAll(AppCapabilities.PluginAsset, values)]),
  );
};

/** Module contributing CLI commands. */
export const commands = (values: ReadonlyArray<Command$.Command<any, any, any, any>>, options?: { name?: string }) =>
  Capability$.inlineModule(options?.name ?? 'cli-commands', { provides: [Capabilities.Command] }, () =>
    Effect.succeed([Capability$.contributeAll(Capabilities.Command, values)]),
  );
