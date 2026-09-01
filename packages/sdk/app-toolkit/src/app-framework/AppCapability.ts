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
  { activatesOn: ActivationEvents.Idle, environments: ['node', 'workerd'] },
);

/**
 * Module maker contributing settings. Ungated by default because settings VALUES are read
 * app-wide through the strict `useAtomCapability` hook — including from components that mount
 * with the shell at ready (the transcription driver's `ReactContext`, `DeckLayout`) and from
 * `requires` on boot modules — where a post-ready gate trips the missing-capability invariant.
 * A plugin whose settings are read only from its own deferred surfaces declares
 * `activatesOn: ActivationEvents.Idle` to keep them off the startup pass.
 *
 * Stated explicitly rather than inherited: omitting `activatesOn` now normalizes to Idle, which
 * is precisely the post-ready gate this paragraph rules out.
 */
export const settings: Maker<typeof AppCapabilities.Settings> = Capability$.moduleMaker(
  'Settings',
  AppCapabilities.Settings,
  { activatesOn: ActivationEvents.Startup, environments: ['node', 'workerd'] },
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
  { activatesOn: AppActivationEvents.AssistantStart, environments: ['node', 'workerd'] },
);

/**
 * Module maker contributing operation handlers. Handler sets register eagerly by default: a
 * keyed set is a definition→loader map with a thin closure (definitions carry no
 * implementations), so the operation registry is complete at boot while each handler's BODY
 * still loads per invocation. The deferral axis is the operation, not the module.
 * A feature plugin whose operations cannot be invoked before the app is interactive declares
 * `activatesOn: ActivationEvents.Idle` to register in that wave instead of on the startup pass;
 * the boot path (deck, layout, space, client) invokes operations during startup and stays eager.
 *
 * Stated explicitly rather than inherited: omitting `activatesOn` now normalizes to Idle, which
 * would leave the registry incomplete for exactly those boot-path invocations.
 */
export const operationHandler: Maker<typeof Capabilities.OperationHandler> = Capability$.moduleMaker(
  'OperationHandler',
  Capabilities.OperationHandler,
  { activatesOn: ActivationEvents.Startup, environments: ['node', 'workerd'] },
);

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
  { activatesOn: ActivationEvents.Startup, environments: ['node', 'workerd'] },
);

/** Module maker contributing undo operation mappings. */
export const undoMappings: Maker<typeof Capabilities.UndoMapping> = Capability$.moduleMaker(
  'UndoMappings',
  Capabilities.UndoMapping,
  { environments: ['node', 'workerd'] },
);

/** Module maker contributing observability event mappings. */
export const observabilityMappings: Maker<typeof AppCapabilities.ObservabilityMapping> = Capability$.moduleMaker(
  'ObservabilityMappings',
  AppCapabilities.ObservabilityMapping,
);

/** Module maker contributing a React context. */
export const reactContext: Maker<typeof Capabilities.ReactContext> = Capability$.moduleMaker(
  'ReactContext',
  Capabilities.ReactContext,
  // A context provider has to wrap the tree on the FIRST render, and shell components read what it
  // provides through the strict `useCapability` hooks — arriving in the idle wave trips the
  // missing-capability invariant rather than merely rendering late.
  { activatesOn: ActivationEvents.Startup, environments: [] },
);

/** Module maker contributing a React root. */
export const reactRoot: Maker<typeof Capabilities.ReactRoot> = Capability$.moduleMaker(
  'ReactRoot',
  Capabilities.ReactRoot,
  // Same reason as `reactContext` — a root that mounts at idle is a blank shell until it does.
  { activatesOn: ActivationEvents.Startup, environments: [] },
);

/**
 * Module maker contributing navigation target resolvers. On the startup pass: URL restore runs as
 * part of boot, so a resolver that registers at idle is absent exactly when the deep link it
 * resolves is being handled — the shape behind the earlier not-found-redirect-on-load race.
 */
export const navigationResolver: Maker<typeof AppCapabilities.NavigationTargetResolver> = Capability$.moduleMaker(
  'NavigationResolver',
  AppCapabilities.NavigationTargetResolver,
  { activatesOn: ActivationEvents.Startup, environments: ['node', 'workerd'] },
);

/** Module maker contributing a navigation handler. On the startup pass for the same reason as
 * {@link navigationResolver} — the boot-time URL restore is what invokes it. */
export const navigationHandler: Maker<typeof AppCapabilities.NavigationHandler> = Capability$.moduleMaker(
  'NavigationHandler',
  AppCapabilities.NavigationHandler,
  { activatesOn: ActivationEvents.Startup, environments: [] },
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
    environments: rest.environments ?? [],
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
  { environments: ['node', 'workerd'] },
);

/** Module maker contributing a text content extractor. */
export const textContent: Maker<typeof AppCapabilities.TextContent> = Capability$.moduleMaker(
  'TextContent',
  AppCapabilities.TextContent,
  { environments: ['node', 'workerd'] },
);

/** Module maker contributing an anchor sort comparator. */
export const anchorSort: Maker<typeof AppCapabilities.AnchorSort> = Capability$.moduleMaker(
  'AnchorSort',
  AppCapabilities.AnchorSort,
  // Browser-only: a sort comparator is registered into the app graph, which no headless host builds.
  { environments: [] },
);

//
// Inline module makers (value-based bodies).
//

/** Module contributing translations. */
export const translations = (
  resources: Translations.Resource | Translations.Resource[],
  options?: { name?: string; environments?: readonly Capability$.Environment[] },
) => {
  const value: Translations.Resource[] = Array.isArray(resources) ? resources : [resources];
  return Capability$.inlineModule(
    options?.name ?? 'translations',
    {
      provides: [AppCapabilities.Translations],
      environments: options?.environments ?? ['node', 'workerd'],
    },
    () => Effect.succeed([Capability$.contribute(AppCapabilities.Translations, value)]),
  );
};

/**
 * Module contributing schemas. Prefer the loader form — schema objects ride whatever barrels
 * declare them, so an inline list drags those barrels into the plugin definition's static
 * closure (the boot evaluation floor); a loader keeps them in the module body chunk.
 */
export const schema = (
  types: ReadonlyArray<Type.AnyEntity> | (() => Promise<{ default: ReadonlyArray<Type.AnyEntity> }>),
  options?: { name?: string; environments?: readonly Capability$.Environment[] },
) => {
  const spec = {
    provides: [AppCapabilities.Schema],
    environments: options?.environments ?? ['node', 'workerd'],
  } as const;
  if (typeof types === 'function') {
    const loader = types;
    return Capability$.lazyModule<readonly [typeof AppCapabilities.Schema]>(options?.name ?? 'schema', spec, () =>
      loader().then(({ default: values }) => ({
        default: () => Effect.succeed([Capability$.contribute(AppCapabilities.Schema, values)]),
      })),
    );
  }
  return Capability$.inlineModule(options?.name ?? 'schema', spec, () =>
    Effect.succeed([Capability$.contribute(AppCapabilities.Schema, types)]),
  );
};

/** Module contributing static plugin assets (typically the bundled `PLUGIN.mdl` spec). */
export const pluginAsset = (
  asset: AppCapabilities.PluginAsset | ReadonlyArray<AppCapabilities.PluginAsset>,
  options?: { name?: string; environments?: readonly Capability$.Environment[] },
) => {
  const values: ReadonlyArray<AppCapabilities.PluginAsset> = Array.isArray(asset) ? asset : [asset];
  return Capability$.inlineModule(
    options?.name ?? 'plugin-asset',
    { provides: [AppCapabilities.PluginAsset], environments: options?.environments ?? [] },
    () => Effect.succeed([Capability$.contributeAll(AppCapabilities.PluginAsset, values)]),
  );
};

/**
 * Module contributing CLI commands.
 *
 * Gated on demand rather than startup: the `dx` binary fires the event as part of its boot, so the
 * commands are there by the time it reads them, while a browser host — the devtools terminal —
 * pays for a plugin's command graph only once someone opens a terminal. Contributing at startup
 * instead would drag every command-bearing plugin onto the app's critical path to serve a panel
 * most sessions never open.
 *
 * Prefer the loader form. Demand-gating the module defers only its activation, not its code: an
 * inline list is a static import in the plugin definition, so `@effect/cli` and every handler's
 * service graph land in the definition's closure and are paid at boot by every session. A loader
 * keeps them in the module body chunk, which is what makes the gating worth anything.
 */
export const commands = (
  values: ReadonlyArray<Capabilities.AnyCommand> | (() => Promise<{ default: ReadonlyArray<Capabilities.AnyCommand> }>),
  options?: { name?: string; environments?: readonly Capability$.Environment[] },
) => {
  const spec = {
    activatesOn: ActivationEvents.CommandsRequested,
    provides: [Capabilities.Command],
    environments: options?.environments ?? ['node', 'workerd'],
  } as const;
  if (typeof values === 'function') {
    const loader = values;
    return Capability$.lazyModule<readonly [typeof Capabilities.Command]>(options?.name ?? 'cli-commands', spec, () =>
      loader().then(({ default: commands }) => ({
        default: () => Effect.succeed([Capability$.contributeAll(Capabilities.Command, commands)]),
      })),
    );
  }

  return Capability$.inlineModule(options?.name ?? 'cli-commands', spec, () =>
    Effect.succeed([Capability$.contributeAll(Capabilities.Command, values)]),
  );
};
