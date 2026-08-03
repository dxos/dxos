//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Command$ from '@effect/cli/Command';
import * as Effect from 'effect/Effect';

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability$ from '@dxos/app-framework/Capability';
import { type Type } from '@dxos/echo';

import { type Translations } from '../app';
import * as AppActivationEvents from './AppActivationEvents';
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

/**
 * Module maker contributing app-graph node builders. Gated by default on the host's idle event
 * rather than the contributing plugin's own start: a builder is what puts a plugin's items in
 * the navtree, so gating it on the plugin's own start (fired when its surface renders) is a
 * deadlock — the item never appears, so it can never be opened. Declare `activatesOn` to override.
 */
export const appGraphBuilder: Maker<typeof AppCapabilities.AppGraphBuilder> = Capability$.moduleMaker(
  'AppGraphBuilder',
  AppCapabilities.AppGraphBuilder,
  { activatesOn: ActivationEvents.Idle },
);

/**
 * Module maker contributing settings. Ungated by default because settings VALUES are read
 * app-wide through the strict `useAtomCapability` hook — including from components that mount
 * with the shell at ready (the transcription driver's `ReactContext`, `DeckLayout`) and from
 * `requires` on boot modules — where a post-ready gate trips the missing-capability invariant.
 * A plugin whose settings are read only from its own deferred surfaces declares
 * `activatesOn: ActivationEvents.Idle` to keep them off the startup pass.
 */
export const settings: Maker<typeof AppCapabilities.Settings> = Capability$.moduleMaker(
  'Settings',
  AppCapabilities.Settings,
);

/**
 * Module maker contributing skill definitions. Gated by default on the assistant plugin's start
 * event — a skill belongs to the assistant feature regardless of which plugin contributes it
 * (skills register into a shared registry whose consumers are reactive); declare `activatesOn`
 * to override.
 */
export const skillDefinition: Maker<typeof AppCapabilities.SkillDefinition> = Capability$.moduleMaker(
  'SkillDefinition',
  AppCapabilities.SkillDefinition,
  { activatesOn: AppActivationEvents.AssistantStart },
);

/**
 * Module maker contributing operation handlers. Handler sets register eagerly by default: a
 * keyed set is a definition→loader map with a thin closure (definitions carry no
 * implementations), so the operation registry is complete at boot while each handler's BODY
 * still loads per invocation. The deferral axis is the operation, not the module.
 * A feature plugin whose operations cannot be invoked before the app is interactive declares
 * `activatesOn: ActivationEvents.Idle` to register in that wave instead of on the startup pass;
 * the boot path (deck, layout, space, client) invokes operations during startup and stays eager.
 */
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

const surfaceMaker: Maker<typeof Capabilities.ReactSurface> = Capability$.moduleMaker(
  'ReactSurface',
  Capabilities.ReactSurface,
);

/**
 * Module maker contributing React surfaces. Declaring `roles` (the role NSIDs the module's
 * surfaces bind) gates the module on those roles' demand events
 * ({@link ActivationEvents.SurfacesRequested}) — it loads when a `Surface` for one of its roles
 * first renders instead of at startup. Modules without declared roles stay eager; an explicit
 * `activatesOn` wins over the derived gate.
 */
export const surface = <
  Props = void,
  Options = Props,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
  const Extra extends readonly Capability$.AnyTag[] = readonly [],
>(
  loader: Capability$.LoadModule<Props, Requires, readonly [typeof Capabilities.ReactSurface, ...Extra]>,
  options?: Capability$.MakerOptions<Requires, Extra, Props, Options> & { roles?: readonly string[] },
): Capability$.Module<Options> => {
  const { roles, ...rest } = options ?? {};
  return surfaceMaker(loader, {
    ...rest,
    activatesOn:
      rest.activatesOn ??
      (roles?.length
        ? ActivationEvent.oneOf(...roles.map((role) => ActivationEvents.SurfacesRequested(role)))
        : undefined),
  });
};

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

/**
 * Module contributing schemas. Prefer the loader form — schema objects ride whatever barrels
 * declare them, so an inline list drags those barrels into the plugin definition's static
 * closure (the boot evaluation floor); a loader keeps them in the module body chunk.
 */
export const schema = (
  types: ReadonlyArray<Type.AnyEntity> | (() => Promise<{ default: ReadonlyArray<Type.AnyEntity> }>),
  options?: { name?: string },
) => {
  if (typeof types === 'function') {
    const loader = types;
    return Capability$.lazyModule<readonly [typeof AppCapabilities.Schema]>(
      options?.name ?? 'schema',
      { provides: [AppCapabilities.Schema] },
      () =>
        loader().then(({ default: values }) => ({
          default: () => Effect.succeed([Capability$.contribute(AppCapabilities.Schema, values)]),
        })),
    );
  }
  return Capability$.inlineModule(options?.name ?? 'schema', { provides: [AppCapabilities.Schema] }, () =>
    Effect.succeed([Capability$.contribute(AppCapabilities.Schema, types)]),
  );
};

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
