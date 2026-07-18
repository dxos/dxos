//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { Atom } from '@effect-atom/atom-react';
import * as Context from 'effect/Context';
import type * as Effect$ from 'effect/Effect';
import type * as Layer$ from 'effect/Layer';
import type * as Option from 'effect/Option';
import * as Schema$ from 'effect/Schema';

import type { AiModelResolver as AiModelResolver$ } from '@dxos/ai';
import type { OpaqueToolkit } from '@dxos/ai';
import { Capability as Capability$ } from '@dxos/app-framework';
import type { BuilderExtensions, Graph, GraphBuilder } from '@dxos/app-graph';
import type { Credential, Operation, Skill } from '@dxos/compute';
import type { Database, Type } from '@dxos/echo';
import { type Translator as Translator$ } from '@dxos/i18n';
import { EID, type URI } from '@dxos/keys';
import { Progress } from '@dxos/progress';
import type { AnchoredTo } from '@dxos/types';

// eslint-disable-next-line @dxos/rules/import-as-namespace
import type * as Translations$ from '../app/Translations';

export const LAYOUT_CAPABILITY_ID = 'org.dxos.app-framework.capability.layout';

// TODO(burdon): See Accept attribute (uses MIME types).
// E.g., 'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
export const defaultFileTypes = {
  images: ['png', 'jpg', 'jpeg', 'gif'],
  media: ['mp3', 'mp4', 'mov', 'avi'],
  text: ['pdf', 'txt', 'md'],
};

export const FileInfoSchema = Schema$.Struct({
  name: Schema$.String,
  type: Schema$.String,
  url: Schema$.optional(Schema$.String),
  cid: Schema$.optional(Schema$.String),
});

export type FileInfo = Schema$.Schema.Type<typeof FileInfoSchema>;

export type Layout = Readonly<{
  mode: string;
  dialogOpen: boolean;
  sidebarOpen: boolean;
  complementarySidebarOpen: boolean;
  /**
   * The id of the active workspace, where a workspace is a set of active items.
   */
  workspace: string;
  /**
   * Identifiers of items which are currently active in the application.
   */
  active: string[];
  /**
   * Identifiers of items which were previously active in the application.
   */
  inactive: string[];
  /**
   * Identifier of the item which should be scrolled into view.
   */
  scrollIntoView: string | undefined;
}>;

/**
 * Layout capability - provides reactive access to the current layout state.
 * @category Capability
 */
export const Layout = Capability$.make<Atom.Atom<Layout>>(LAYOUT_CAPABILITY_ID);

/**
 * @category Capability
 */
export const Translations = Capability$.makeMulti<Readonly<Translations$.Resource[]>>(
  'org.dxos.app-framework.capability.translations',
);

/**
 * Provides access to the shared, framework-agnostic translation instance so non-React code
 * (operations, services, Effect programs) can translate strings dynamically.
 * @category Capability
 */
export const Translator = Capability$.make<Translator$>('org.dxos.app-framework.capability.translator');

/**
 * Effect service for the {@link Translator} capability, consumable via `yield* TranslatorService`
 * once {@link translatorLayer} is provided.
 */
export class TranslatorService extends Context.Tag('@dxos/app-toolkit/TranslatorService')<
  TranslatorService,
  Translator$
>() {}

/**
 * Layer that resolves {@link TranslatorService} from the {@link Translator} capability.
 */
export const translatorLayer: Layer$.Layer<TranslatorService, never, Capability$.Service> = Capability$.asLayer(
  Translator,
  TranslatorService,
);

/** A writer scoped to a single plugin's compartment — the only way to mutate the stats store. */
export type StatsCompartment = Readonly<{
  /** Replace this compartment's value. */
  set: (stats: unknown) => void;
  /** Remove this compartment. */
  clear: () => void;
}>;

/**
 * A generic, reactive store for stats/telemetry, partitioned into one compartment per plugin. Every
 * consumer can READ the entire store (all compartments) reactively, but can only WRITE its own
 * compartment — obtained via `compartment(pluginKey)` with the plugin's own key (`meta.profile.key`).
 * Currently in-memory (discarded on reload); persistence may be layered on later, so the name is not
 * tied to transience. Contributed by a host plugin (plugin-debug) — writers resolve it with
 * `Capability.getAll` so writing is a no-op when no host is loaded (e.g. production without devtools).
 * @category Capability
 */
export type StatsPanelStore = Readonly<{
  /** Reactive map of all compartments keyed by plugin key (full read access). */
  statsAtom: Atom.Writable<Record<string, unknown>>;
  /** Read one plugin's compartment. */
  get: (pluginKey: string) => unknown;
  /** A writer scoped to one plugin's compartment — the only write path. */
  compartment: (pluginKey: string) => StatsCompartment;
}>;

/**
 * @category Capability
 */
export const StatsPanel = Capability$.make<StatsPanelStore>('org.dxos.app-toolkit.capability.statsPanel');

export type AppGraph = Readonly<{
  graph: Graph.ExpandableGraph;
  explore: typeof GraphBuilder.explore;
}>;

/**
 * @category Capability
 */
export const AppGraph = Capability$.make<AppGraph>('org.dxos.app-framework.capability.appGraph');

/**
 * @category Capability
 */
export const AppGraphBuilder = Capability$.makeMulti<BuilderExtensions>(
  'org.dxos.app-framework.capability.appGraphBuilder',
);

export type Settings = {
  prefix: string;
  // Settings are persisted as plain atoms, so the schema is always context-free
  // (`R = never`); this lets a schema-driven form decode/validate it directly.
  schema: Schema$.Schema.AnyNoContext;
  atom: Atom.Writable<any>;
};

/**
 * Type guard to check if a value is a Settings object.
 */
export const isSettings = (value: unknown): value is Settings =>
  typeof value === 'object' &&
  value !== null &&
  'prefix' in value &&
  typeof (value as Settings).prefix === 'string' &&
  'atom' in value &&
  Atom.isAtom(value.atom) &&
  Atom.isWritable(value.atom);

/**
 * @category Capability
 */
export const Settings = Capability$.makeMulti<Settings>('org.dxos.app-framework.capability.settings');

export type Schema = ReadonlyArray<Type.AnyEntity>;

/**
 * @category Capability
 */
export const Schema = Capability$.makeMulti<Schema>('org.dxos.app-framework.capability.schema');

export type Toolkit = OpaqueToolkit.OpaqueToolkit;

/**
 * @category Capability
 */
export const Toolkit = Capability$.makeMulti<Toolkit>('org.dxos.app-framework.capability.aiToolkit');

/**
 * @category Capability
 */
export const SkillDefinition = Capability$.makeMulti<Skill.Definition>(
  'org.dxos.app-framework.capability.skillDefinition',
);

/**
 * A static asset bundled with a plugin's published package, exposed for
 * other plugins to read.
 *
 * Contributors import the raw file (e.g. `import spec from '../PLUGIN.mdl?raw'`)
 * and contribute it via this capability from a dependency-mode module. Consumers
 * read all contributions with `Capability.getAll(AppCapabilities.PluginAsset)`.
 */
export type PluginAsset = Readonly<{
  /** Owning plugin id (matches `Plugin.Meta.id`). */
  pluginId: string;
  /** Path within the plugin package — typically equal to `Plugin.Meta.spec`. */
  path: string;
  /** Raw text content. */
  content: string;
  /** Optional MIME type (e.g. `text/markdown`, `application/x-mdl`). */
  mimeType?: string;
}>;

/**
 * @category Capability
 */
export const PluginAsset = Capability$.makeMulti<PluginAsset>('org.dxos.app-framework.capability.pluginAsset');

/**
 * Plugins can contribute model resolvers. The `Credential.CredentialsService` requirement is
 * supplied by the active-space resolver — BYOK-aware resolvers wrap their HTTP client with
 * `Header.byokLayer(...)`; the rest carry it through unused.
 */
export const AiModelResolver = Capability$.makeMulti<
  Layer$.Layer<AiModelResolver$.AiModelResolver, never, Credential.CredentialsService>
>('org.dxos.app-framework.capability.aiModelResolver');

export type FileUploader = (db: Database.Database, file: File) => Promise<FileInfo | undefined>;

/**
 * @category Capability
 */
export const FileUploader = Capability$.makeMulti<FileUploader>('org.dxos.app-framework.capability.fileUploader');

export type AnchorSort = {
  key: string;
  sort: (anchorA: AnchoredTo.AnchoredTo, anchorB: AnchoredTo.AnchoredTo) => number;
};

/**
 * @category Capability
 */
export const AnchorSort = Capability$.makeMulti<AnchorSort>('org.dxos.app-framework.capability.anchorSort');

/** Text content extractor contributed per typename by plugins that support text extraction. */
export type TextContent = Readonly<{
  id: string;
  getTextContent: (object: any) => Promise<string | undefined>;
}>;

/**
 * @category Capability
 */
export const TextContent = Capability$.makeMulti<TextContent>('org.dxos.app-framework.capability.textContent');

/** Comment configuration contributed per typename by plugins that support commenting. */
export type CommentConfig = Readonly<{
  id: string;
  comments: 'anchored' | 'unanchored';
  selectionMode?: string;
  getAnchorLabel?: (obj: any, anchor: string) => string | undefined;
  scrollToAnchor?: Operation.Definition.Any;
}>;

/**
 * @category Capability
 */
export const CommentConfig = Capability$.makeMulti<CommentConfig>('org.dxos.app-framework.capability.commentConfig');

export type NavigationTarget = {
  /** Navigation path usable with the Open operation. */
  path: string;
  /** Human-readable label. */
  label: string;
  /** Object type. */
  type: string;
};

export type NavigationQuery = {
  uri?: URI.URI;
};

/**
 * Resolves a query to navigation targets.
 * Each plugin interprets the query and returns matching targets.
 * When called without a query, returns the plugin's default navigable pages.
 * @category Capability
 */
export type NavigationTargetResolver = (query?: NavigationQuery) => Effect$.Effect<NavigationTarget[]>;

export const NavigationTargetResolver = Capability$.makeMulti<NavigationTargetResolver>(
  'org.dxos.app-framework.capability.navigationTargetResolver',
);

/**
 * Handler called by layout plugins on navigation events (page load, popstate, deep link).
 * Plugins contribute handlers to react to URL query params or other URL parts
 * without the layout plugin needing to know about specific params.
 * @category Capability
 */
export type NavigationHandler = (url: URL) => Effect$.Effect<void>;

export const NavigationHandler = Capability$.makeMulti<NavigationHandler>(
  'org.dxos.app-toolkit.capability.navigationHandler',
);

/**
 * Resolves a qualified graph path to a DXN.
 * Each plugin recognizes its own path patterns and returns the corresponding DXN.
 * Returns None if the path is not recognized by this resolver.
 * Used to validate navigation targets against remote services (e.g., edge).
 * @category Capability
 */
export type NavigationPathResolver = (qualifiedPath: string) => Effect$.Effect<Option.Option<EID.EID>>;

export const NavigationPathResolver = Capability$.makeMulti<NavigationPathResolver>(
  'org.dxos.app-framework.capability.navigationPathResolver',
);

/** A transient progress monitor handle — the update side of one registry entry. */
export type ProgressMonitor = Progress.TaskHandle;

/**
 * A registry of live progress providers, exposed as reactive atoms. Producers `register` a monitor
 * (keyed by a stable `name`, with a display `label`), advance/complete it, and `remove()` it when
 * done. Consumers read the aggregate `snapshotAtom` (e.g. the R0 rail popover) or a single provider's
 * `monitorAtom(name)` (e.g. an article's inline meter). Contributed by an always-loaded host
 * (`plugin-progress`); backed by the shared `@dxos/progress` core.
 */
export type ProgressRegistry = Readonly<{
  /** Aggregate snapshot of all active providers. */
  snapshotAtom: Atom.Atom<Progress.ProgressSnapshot>;
  /** One provider's reactive state, by name (stable/memoized per name). */
  monitorAtom: (name: string) => Atom.Atom<Progress.TaskProgress | undefined>;
  /**
   * Register (or resume) a provider and mark it running. Pass `onCancel` to make it cancellable — the
   * meter then shows a cancel control that invokes {@link ProgressRegistry.cancel}.
   */
  register: (name: string, options?: { label?: string; total?: number; onCancel?: () => void }) => ProgressMonitor;
  /** Invoke a provider's registered `onCancel` handler (no-op if it is not cancellable). */
  cancel: (name: string) => void;
  /** Non-reactive read of the current snapshot. */
  snapshot: () => Progress.ProgressSnapshot;
}>;

/**
 * @category Capability
 */
export const ProgressRegistry = Capability$.make<ProgressRegistry>('org.dxos.app-toolkit.capability.progressRegistry');
