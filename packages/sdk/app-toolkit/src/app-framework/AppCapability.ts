//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability$ from '@dxos/app-framework/Capability';
import { type Type } from '@dxos/echo';

import { type Translations } from '../app/index.ts';
import * as AppActivationEvents from './AppActivationEvents.ts';
import * as AppCapabilities from './AppCapabilities.ts';

/**
 * Type of a maker built by {@link Capability$.moduleMaker}. Naming it keeps declaration emit
 * portable: a capability tag whose type structurally carries a type this module doesn't re-export
 * (e.g. `@dxos/compute`'s `Skill.Definition`) would otherwise have to be named here (TS2883), and
 * `C` reaches this alias only through `typeof`.
 */
type Maker<C extends Capability$.AnyTag> = ReturnType<typeof Capability$.moduleMaker<C>>;
type LazyMaker<C extends Capability$.AnyTag> = ReturnType<typeof Capability$.lazyModuleMaker<C>>;

//
// Module maker pairs: the eager maker takes the activate function, its `lazy` pairing a loader for it.
//

const appGraphBuilderDefaults = {
  activatesOn: ActivationEvents.Idle,
  environments: ['node', 'workerd'],
} satisfies Capability$.MakerDefaults;
/**
 * Module maker contributing app-graph node builders. Gated by default on the host's idle event
 * rather than the contributing plugin's own start: a builder is what puts a plugin's items in
 * the navtree, so gating it on the plugin's own start (fired when its surface renders) is a
 * deadlock — the item never appears, so it can never be opened. Declare `activatesOn` to override.
 */
export const appGraphBuilder: Maker<typeof AppCapabilities.AppGraphBuilder> = Capability$.moduleMaker(
  'AppGraphBuilder',
  AppCapabilities.AppGraphBuilder,
  appGraphBuilderDefaults,
);
/** Lazy pairing of {@link appGraphBuilder}. */
export const lazyAppGraphBuilder: LazyMaker<typeof AppCapabilities.AppGraphBuilder> = Capability$.lazyModuleMaker(
  'AppGraphBuilder',
  AppCapabilities.AppGraphBuilder,
  appGraphBuilderDefaults,
);

// Stated explicitly rather than inherited: omitting `activatesOn` now normalizes to Idle, which
// is the post-ready gate the doc on `settings` rules out.
const settingsDefaults = {
  activatesOn: ActivationEvents.Startup,
  environments: ['node', 'workerd'],
} satisfies Capability$.MakerDefaults;
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
  settingsDefaults,
);
/** Lazy pairing of {@link settings}. */
export const lazySettings: LazyMaker<typeof AppCapabilities.Settings> = Capability$.lazyModuleMaker(
  'Settings',
  AppCapabilities.Settings,
  settingsDefaults,
);

const skillDefinitionDefaults = {
  activatesOn: AppActivationEvents.AssistantStart,
  environments: ['node', 'workerd'],
} satisfies Capability$.MakerDefaults;
/**
 * Module maker contributing skill definitions. Gated by default on the assistant plugin's start
 * event — a skill belongs to the assistant feature regardless of which plugin contributes it
 * (skills register into a shared registry whose consumers are reactive); declare `activatesOn`
 * to override.
 */
export const skillDefinition: Maker<typeof AppCapabilities.SkillDefinition> = Capability$.moduleMaker(
  'SkillDefinition',
  AppCapabilities.SkillDefinition,
  skillDefinitionDefaults,
);
/** Lazy pairing of {@link skillDefinition}. */
export const lazySkillDefinition: LazyMaker<typeof AppCapabilities.SkillDefinition> = Capability$.lazyModuleMaker(
  'SkillDefinition',
  AppCapabilities.SkillDefinition,
  skillDefinitionDefaults,
);

// Stated explicitly rather than inherited: omitting `activatesOn` now normalizes to Idle, which
// would leave the registry incomplete for the boot-path invocations the doc on `operationHandler` names.
const operationHandlerDefaults = {
  activatesOn: ActivationEvents.Startup,
  environments: ['node', 'workerd'],
} satisfies Capability$.MakerDefaults;
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
  operationHandlerDefaults,
);
/** Lazy pairing of {@link operationHandler}. */
export const lazyOperationHandler: LazyMaker<typeof Capabilities.OperationHandler> = Capability$.lazyModuleMaker(
  'OperationHandler',
  Capabilities.OperationHandler,
  operationHandlerDefaults,
);

const layerSpecDefaults = {
  activatesOn: ActivationEvents.Startup,
  environments: ['node', 'workerd'],
} satisfies Capability$.MakerDefaults;
/**
 * Module maker contributing a {@link Capabilities.LayerSpec}.
 *
 * LayerSpecs are RESTART-SCOPED: the process manager takes a one-shot snapshot of the collection
 * during boot and bakes it into a single Effect runtime. The list cannot be dynamic — rebuilding
 * the runtime for a late contribution would destroy every live service on it — so a LayerSpec
 * contributed after that snapshot (including by a plugin enabled post-boot) is ignored until the
 * next full boot, and the process manager logs an error naming the module.
 *
 * The gate is therefore baked in rather than left to the author: every contributor must be on the
 * startup pass, and they must all be there together. Multi requires never gate, so getting this
 * wrong does not fail loudly at the contribution site — it surfaces hops away as a missing service.
 */
export const layerSpec: Maker<typeof Capabilities.LayerSpec> = Capability$.moduleMaker(
  'LayerSpec',
  Capabilities.LayerSpec,
  layerSpecDefaults,
);
/** Lazy pairing of {@link layerSpec}. */
export const lazyLayerSpec: LazyMaker<typeof Capabilities.LayerSpec> = Capability$.lazyModuleMaker(
  'LayerSpec',
  Capabilities.LayerSpec,
  layerSpecDefaults,
);

const undoMappingsDefaults = { environments: ['node', 'workerd'] } satisfies Capability$.MakerDefaults;
/** Module maker contributing undo operation mappings. */
export const undoMappings: Maker<typeof Capabilities.UndoMapping> = Capability$.moduleMaker(
  'UndoMappings',
  Capabilities.UndoMapping,
  undoMappingsDefaults,
);
/** Lazy pairing of {@link undoMappings}. */
export const lazyUndoMappings: LazyMaker<typeof Capabilities.UndoMapping> = Capability$.lazyModuleMaker(
  'UndoMappings',
  Capabilities.UndoMapping,
  undoMappingsDefaults,
);

/** Module maker contributing observability event mappings. */
export const observabilityMappings: Maker<typeof AppCapabilities.ObservabilityMapping> = Capability$.moduleMaker(
  'ObservabilityMappings',
  AppCapabilities.ObservabilityMapping,
);
/** Lazy pairing of {@link observabilityMappings}. */
export const lazyObservabilityMappings: LazyMaker<typeof AppCapabilities.ObservabilityMapping> =
  Capability$.lazyModuleMaker('ObservabilityMappings', AppCapabilities.ObservabilityMapping);

// A context provider has to wrap the tree on the FIRST render, and shell components read what it
// provides through the strict `useCapability` hooks — arriving in the idle wave trips the
// missing-capability invariant rather than merely rendering late.
const reactContextDefaults = {
  activatesOn: ActivationEvents.Startup,
  environments: [],
} satisfies Capability$.MakerDefaults;
/** Module maker contributing a React context. */
export const reactContext: Maker<typeof Capabilities.ReactContext> = Capability$.moduleMaker(
  'ReactContext',
  Capabilities.ReactContext,
  reactContextDefaults,
);
/** Lazy pairing of {@link reactContext}. */
export const lazyReactContext: LazyMaker<typeof Capabilities.ReactContext> = Capability$.lazyModuleMaker(
  'ReactContext',
  Capabilities.ReactContext,
  reactContextDefaults,
);

// Same reason as `reactContext` — a root that mounts at idle is a blank shell until it does.
const reactRootDefaults = {
  activatesOn: ActivationEvents.Startup,
  environments: [],
} satisfies Capability$.MakerDefaults;
/** Module maker contributing a React root. */
export const reactRoot: Maker<typeof Capabilities.ReactRoot> = Capability$.moduleMaker(
  'ReactRoot',
  Capabilities.ReactRoot,
  reactRootDefaults,
);
/** Lazy pairing of {@link reactRoot}. */
export const lazyReactRoot: LazyMaker<typeof Capabilities.ReactRoot> = Capability$.lazyModuleMaker(
  'ReactRoot',
  Capabilities.ReactRoot,
  reactRootDefaults,
);

const navigationResolverDefaults = {
  activatesOn: ActivationEvents.Startup,
  environments: ['node', 'workerd'],
} satisfies Capability$.MakerDefaults;
/**
 * Module maker contributing navigation target resolvers. On the startup pass: URL restore runs as
 * part of boot, so a resolver that registers at idle is absent exactly when the deep link it
 * resolves is being handled — the shape behind the earlier not-found-redirect-on-load race.
 */
export const navigationResolver: Maker<typeof AppCapabilities.NavigationTargetResolver> = Capability$.moduleMaker(
  'NavigationResolver',
  AppCapabilities.NavigationTargetResolver,
  navigationResolverDefaults,
);
/** Lazy pairing of {@link navigationResolver}. */
export const lazyNavigationResolver: LazyMaker<typeof AppCapabilities.NavigationTargetResolver> =
  Capability$.lazyModuleMaker(
    'NavigationResolver',
    AppCapabilities.NavigationTargetResolver,
    navigationResolverDefaults,
  );

const navigationHandlerDefaults = {
  activatesOn: ActivationEvents.Startup,
  environments: [],
} satisfies Capability$.MakerDefaults;
/** Module maker contributing a navigation handler. On the startup pass for the same reason as
 * {@link navigationResolver} — the boot-time URL restore is what invokes it. */
export const navigationHandler: Maker<typeof AppCapabilities.NavigationHandler> = Capability$.moduleMaker(
  'NavigationHandler',
  AppCapabilities.NavigationHandler,
  navigationHandlerDefaults,
);
/** Lazy pairing of {@link navigationHandler}. */
export const lazyNavigationHandler: LazyMaker<typeof AppCapabilities.NavigationHandler> = Capability$.lazyModuleMaker(
  'NavigationHandler',
  AppCapabilities.NavigationHandler,
  navigationHandlerDefaults,
);

const surfaceMaker: Maker<typeof Capabilities.ReactSurface> = Capability$.moduleMaker(
  'ReactSurface',
  Capabilities.ReactSurface,
);
const lazySurfaceMaker: LazyMaker<typeof Capabilities.ReactSurface> = Capability$.lazyModuleMaker(
  'ReactSurface',
  Capabilities.ReactSurface,
);

type SurfaceOptions<
  Requires extends readonly Capability$.AnyTag[],
  Extra extends readonly Capability$.AnyTag[],
  Props,
  Options,
> = Capability$.MakerOptions<Requires, Extra, Props, Options> & { roles?: readonly string[] };

const surfaceOptions = <
  Requires extends readonly Capability$.AnyTag[],
  Extra extends readonly Capability$.AnyTag[],
  Props,
  Options,
>(
  options: SurfaceOptions<Requires, Extra, Props, Options> | undefined,
): Capability$.MakerOptions<Requires, Extra, Props, Options> => {
  const { roles, ...rest } = options ?? {};
  return {
    ...rest,
    activatesOn:
      rest.activatesOn ??
      (roles?.length
        ? ActivationEvent.oneOf(...roles.map((role) => ActivationEvents.SurfacesRequested(role)))
        : undefined),
  };
};

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
  activate: Capability$.Activate<Props, Requires, readonly [typeof Capabilities.ReactSurface, ...Extra]>,
  options?: SurfaceOptions<Requires, Extra, Props, Options>,
): Capability$.Module<Options> =>
  surfaceMaker(activate, { ...surfaceOptions(options), environments: options?.environments ?? [] });

/** Lazy pairing of {@link surface}. */
export const lazySurface = <
  Props = void,
  Options = Props,
  const Requires extends readonly Capability$.AnyTag[] = readonly [],
  const Extra extends readonly Capability$.AnyTag[] = readonly [],
>(
  loader: Capability$.LoadModule<Props, Requires, readonly [typeof Capabilities.ReactSurface, ...Extra]>,
  options?: SurfaceOptions<Requires, Extra, Props, Options>,
): Capability$.Module<Options> =>
  lazySurfaceMaker(loader, { ...surfaceOptions(options), environments: options?.environments ?? [] });

const commentConfigDefaults = { environments: ['node', 'workerd'] } satisfies Capability$.MakerDefaults;
/** Module maker contributing a comment configuration. */
export const commentConfig: Maker<typeof AppCapabilities.CommentConfig> = Capability$.moduleMaker(
  'CommentConfig',
  AppCapabilities.CommentConfig,
  commentConfigDefaults,
);
/** Lazy pairing of {@link commentConfig}. */
export const lazyCommentConfig: LazyMaker<typeof AppCapabilities.CommentConfig> = Capability$.lazyModuleMaker(
  'CommentConfig',
  AppCapabilities.CommentConfig,
  commentConfigDefaults,
);

const textContentDefaults = { environments: ['node', 'workerd'] } satisfies Capability$.MakerDefaults;
/** Module maker contributing a text content extractor. */
export const textContent: Maker<typeof AppCapabilities.TextContent> = Capability$.moduleMaker(
  'TextContent',
  AppCapabilities.TextContent,
  textContentDefaults,
);
/** Lazy pairing of {@link textContent}. */
export const lazyTextContent: LazyMaker<typeof AppCapabilities.TextContent> = Capability$.lazyModuleMaker(
  'TextContent',
  AppCapabilities.TextContent,
  textContentDefaults,
);

// Browser-only: a sort comparator is registered into the app graph, which no headless host builds.
const anchorSortDefaults = { environments: [] } satisfies Capability$.MakerDefaults;
/** Module maker contributing an anchor sort comparator. */
export const anchorSort: Maker<typeof AppCapabilities.AnchorSort> = Capability$.moduleMaker(
  'AnchorSort',
  AppCapabilities.AnchorSort,
  anchorSortDefaults,
);
/** Lazy pairing of {@link anchorSort}. */
export const lazyAnchorSort: LazyMaker<typeof AppCapabilities.AnchorSort> = Capability$.lazyModuleMaker(
  'AnchorSort',
  AppCapabilities.AnchorSort,
  anchorSortDefaults,
);

//
// Value makers: the contribution is built from the value passed in. `schema` and `commands` also have a
// `lazy` pairing that loads the value.
//

/** Module contributing translations. */
export const translations = (
  resources: Translations.Resource | Translations.Resource[],
  options?: { name?: string; environments?: readonly Capability$.Environment[] },
) => {
  const value: Translations.Resource[] = Array.isArray(resources) ? resources : [resources];
  return Capability$.makeModule(
    options?.name ?? 'translations',
    {
      provides: [AppCapabilities.Translations],
      environments: options?.environments ?? ['node', 'workerd'],
    },
    () => Effect.succeed([Capability$.contribute(AppCapabilities.Translations, value)]),
  );
};

/** Module contributing schemas. */
export const schema = (
  types: ReadonlyArray<Type.AnyEntity>,
  options?: { name?: string; environments?: readonly Capability$.Environment[] },
) =>
  Capability$.makeModule(
    options?.name ?? 'schema',
    { provides: [AppCapabilities.Schema], environments: options?.environments ?? ['node', 'workerd'] },
    () => Effect.succeed([Capability$.contribute(AppCapabilities.Schema, types)]),
  );

/**
 * Lazy pairing of {@link schema}: schema objects ride whatever barrels declare them, so this is
 * the form for a list whose barrels the plugin's chunk should not carry.
 */
export const lazySchema = (
  loader: () => Promise<{ default: ReadonlyArray<Type.AnyEntity> }>,
  options?: { name?: string; environments?: readonly Capability$.Environment[] },
) =>
  Capability$.makeLazyModule<readonly [typeof AppCapabilities.Schema]>(
    options?.name ?? 'schema',
    { provides: [AppCapabilities.Schema], environments: options?.environments ?? ['node', 'workerd'] },
    () =>
      loader().then(({ default: values }) => ({
        default: () => Effect.succeed([Capability$.contribute(AppCapabilities.Schema, values)]),
      })),
  );

/** Module contributing guided tours. */
export const tour = (
  tours: AppCapabilities.Tour | ReadonlyArray<AppCapabilities.Tour>,
  options?: { name?: string; environments?: readonly Capability$.Environment[] },
) => {
  const values: ReadonlyArray<AppCapabilities.Tour> = Array.isArray(tours) ? tours : [tours];
  return Capability$.makeModule(
    options?.name ?? 'tour',
    { provides: [AppCapabilities.Tour], environments: options?.environments ?? [] },
    () => Effect.succeed([Capability$.contributeAll(AppCapabilities.Tour, values)]),
  );
};

/** Module contributing steps into other plugins' tours. */
export const tourFragment = (
  fragments: AppCapabilities.TourFragment | ReadonlyArray<AppCapabilities.TourFragment>,
  options?: { name?: string; environments?: readonly Capability$.Environment[] },
) => {
  const values: ReadonlyArray<AppCapabilities.TourFragment> = Array.isArray(fragments) ? fragments : [fragments];
  return Capability$.makeModule(
    options?.name ?? 'tour-fragment',
    { provides: [AppCapabilities.TourFragment], environments: options?.environments ?? [] },
    () => Effect.succeed([Capability$.contributeAll(AppCapabilities.TourFragment, values)]),
  );
};

/** Module contributing static plugin assets (typically the bundled `PLUGIN.mdl` spec). */
export const pluginAsset = (
  asset: AppCapabilities.PluginAsset | ReadonlyArray<AppCapabilities.PluginAsset>,
  options?: { name?: string; environments?: readonly Capability$.Environment[] },
) => {
  const values: ReadonlyArray<AppCapabilities.PluginAsset> = Array.isArray(asset) ? asset : [asset];
  return Capability$.makeModule(
    options?.name ?? 'plugin-asset',
    { provides: [AppCapabilities.PluginAsset], environments: options?.environments ?? [] },
    () => Effect.succeed([Capability$.contributeAll(AppCapabilities.PluginAsset, values)]),
  );
};

/**
 * Module contributing space templates.
 *
 * Loader-only, so the content a template writes stays in its own chunk rather than the plugin
 * definition's closure.
 */
export const lazySpaceTemplates = (
  loader: () => Promise<{ default: ReadonlyArray<AppCapabilities.SpaceTemplate> }>,
  options?: { name?: string; environments?: readonly Capability$.Environment[] },
) =>
  Capability$.makeLazyModule<readonly [typeof AppCapabilities.SpaceTemplate]>(
    options?.name ?? 'SpaceTemplates',
    {
      activatesOn: ActivationEvents.SpaceTemplatesRequested,
      provides: [AppCapabilities.SpaceTemplate],
      environments: options?.environments ?? [],
    },
    () =>
      loader().then(({ default: templates }) => ({
        default: () => Effect.succeed([Capability$.contributeAll(AppCapabilities.SpaceTemplate, templates)]),
      })),
  );

/**
 * Module contributing CLI commands.
 *
 * Gated on demand rather than startup: the `dx` binary fires the event as part of its boot, so the
 * commands are there by the time it reads them, while a browser host — the devtools terminal —
 * pays for a plugin's command graph only once someone opens a terminal. Contributing at startup
 * instead would drag every command-bearing plugin onto the app's critical path to serve a panel
 * most sessions never open.
 */
export const commands = (
  values: ReadonlyArray<Capabilities.AnyCommand>,
  options?: { name?: string; environments?: readonly Capability$.Environment[] },
) =>
  Capability$.makeModule(
    options?.name ?? 'cli-commands',
    {
      activatesOn: ActivationEvents.CommandsRequested,
      provides: [Capabilities.Command],
      environments: options?.environments ?? ['node', 'workerd'],
    },
    () => Effect.succeed([Capability$.contributeAll(Capabilities.Command, values)]),
  );

/**
 * Lazy pairing of {@link commands}. Demand-gating the module defers only its activation, not its
 * code: `@effect/cli` and every handler's service graph would otherwise land in the plugin's chunk
 * and be paid by every session that enables it, to serve a panel most never open.
 */
export const lazyCommands = (
  loader: () => Promise<{ default: ReadonlyArray<Capabilities.AnyCommand> }>,
  options?: { name?: string; environments?: readonly Capability$.Environment[] },
) =>
  Capability$.makeLazyModule<readonly [typeof Capabilities.Command]>(
    options?.name ?? 'cli-commands',
    {
      activatesOn: ActivationEvents.CommandsRequested,
      provides: [Capabilities.Command],
      environments: options?.environments ?? ['node', 'workerd'],
    },
    () =>
      loader().then(({ default: commands }) => ({
        default: () => Effect.succeed([Capability$.contributeAll(Capabilities.Command, commands)]),
      })),
  );
