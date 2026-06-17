//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { Atom } from '@effect-atom/atom-react';
import type * as Effect$ from 'effect/Effect';
import type * as Layer$ from 'effect/Layer';
import type * as Option from 'effect/Option';
import * as Schema$ from 'effect/Schema';

import type { AiModelResolver as AiModelResolver$ } from '@dxos/ai';
import type { OpaqueToolkit } from '@dxos/ai';
import { Capability as Capability$ } from '@dxos/app-framework';
import type { BuilderExtensions, Graph, GraphBuilder } from '@dxos/app-graph';
import type { Blueprint, Credential, Operation } from '@dxos/compute';
import type { Database, Type } from '@dxos/echo';
import { EID } from '@dxos/keys';
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
export const Translations = Capability$.make<Readonly<Translations$.Resource[]>>(
  'org.dxos.app-framework.capability.translations',
);

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
export const AppGraphBuilder = Capability$.make<BuilderExtensions>('org.dxos.app-framework.capability.appGraphBuilder');

export type Settings = {
  prefix: string;
  schema: Schema$.Schema.All;
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
export const Settings = Capability$.make<Settings>('org.dxos.app-framework.capability.settings');

export type Schema = ReadonlyArray<Type.AnyEntity>;

/**
 * @category Capability
 */
export const Schema = Capability$.make<Schema>('org.dxos.app-framework.capability.schema');

export type Toolkit = OpaqueToolkit.OpaqueToolkit;

/**
 * @category Capability
 */
export const Toolkit = Capability$.make<Toolkit>('org.dxos.app-framework.capability.aiToolkit');

/**
 * @category Capability
 */
export const BlueprintDefinition = Capability$.make<Blueprint.Definition>(
  'org.dxos.app-framework.capability.blueprintDefinition',
);

/**
 * A static asset bundled with a plugin's published package, exposed for
 * other plugins to read.
 *
 * Contributors import the raw file (e.g. `import spec from '../PLUGIN.mdl?raw'`)
 * and contribute it via this capability on
 * {@link AppActivationEvents.SetupPluginAssets}. Consumers read all
 * contributions with `Capability.getAll(AppCapabilities.PluginAsset)`.
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
export const PluginAsset = Capability$.make<PluginAsset>('org.dxos.app-framework.capability.pluginAsset');

/**
 * Plugins can contribute model resolvers. The `Credential.CredentialsService` requirement is
 * supplied by the active-space resolver — BYOK-aware resolvers wrap their HTTP client with
 * `Header.byokLayer(...)`; the rest carry it through unused.
 */
export const AiModelResolver = Capability$.make<
  Layer$.Layer<AiModelResolver$.AiModelResolver, never, Credential.CredentialsService>
>('org.dxos.app-framework.capability.aiModelResolver');

export type FileUploader = (db: Database.Database, file: File) => Promise<FileInfo | undefined>;

/**
 * @category Capability
 */
export const FileUploader = Capability$.make<FileUploader>('org.dxos.app-framework.capability.fileUploader');

export type AnchorSort = {
  key: string;
  sort: (anchorA: AnchoredTo.AnchoredTo, anchorB: AnchoredTo.AnchoredTo) => number;
};

/**
 * @category Capability
 */
export const AnchorSort = Capability$.make<AnchorSort>('org.dxos.app-framework.capability.anchorSort');

/** Text content extractor contributed per typename by plugins that support text extraction. */
export type TextContent = Readonly<{
  id: string;
  getTextContent: (object: any) => Promise<string | undefined>;
}>;

/**
 * @category Capability
 */
export const TextContent = Capability$.make<TextContent>('org.dxos.app-framework.capability.textContent');

/** Comment configuration contributed per typename by plugins that support commenting. */
export type CommentConfig = Readonly<{
  id: string;
  comments: 'anchored' | 'unanchored';
  selectionMode?: string;
  getAnchorLabel?: (obj: any, anchor: string) => string | undefined;
  scrollToAnchor?: Operation.Definition.Any;
  /**
   * Create a comment using the type's own anchoring UI (e.g. an editor's selection/hunk snap),
   * branch-tagging the thread itself. Return `true` when handled; the comment toolbar action falls
   * back to the attention-selection anchor (branch-tagged generically) when absent or it returns false.
   */
  createComment?: (obj: any) => boolean;
  /**
   * The current anchor for a new comment, derived from the type's own selection (e.g. a sheet's
   * selected cells). Used by the comment toolbar action in preference to the attention selection.
   */
  getAnchor?: (obj: any) => string | undefined;
  /**
   * Accept an individual change from `branch` at the comment's `anchor` — a partial cherry-pick of
   * the latest compare-branch content into the subject's current branch (not a snapshot), without
   * merging the whole branch. Invoked by the generic `AcceptChange` operation, dispatched per type.
   */
  acceptChange?: (obj: any, anchor: string, branch: string) => Promise<void>;
  /**
   * Whether the comment's `anchor` currently overlaps a change relative to `branch`. Used to show
   * the accept-change affordance only on comments that sit on an actual diff. Defaults to shown.
   */
  isOnChange?: (obj: any, anchor: string, branch: string) => Promise<boolean>;
}>;

/**
 * @category Capability
 */
export const CommentConfig = Capability$.make<CommentConfig>('org.dxos.app-framework.capability.commentConfig');

export type NavigationTarget = {
  /** Navigation path usable with the Open operation. */
  path: string;
  /** Human-readable label. */
  label: string;
  /** Object type. */
  type: string;
};

export type NavigationQuery = {
  dxn?: string;
};

/**
 * Resolves a query to navigation targets.
 * Each plugin interprets the query and returns matching targets.
 * When called without a query, returns the plugin's default navigable pages.
 * @category Capability
 */
export type NavigationTargetResolver = (query?: NavigationQuery) => Effect$.Effect<NavigationTarget[]>;

export const NavigationTargetResolver = Capability$.make<NavigationTargetResolver>(
  'org.dxos.app-framework.capability.navigationTargetResolver',
);

/**
 * Handler called by layout plugins on navigation events (page load, popstate, deep link).
 * Plugins contribute handlers to react to URL query params or other URL parts
 * without the layout plugin needing to know about specific params.
 * @category Capability
 */
export type NavigationHandler = (url: URL) => Effect$.Effect<void>;

export const NavigationHandler = Capability$.make<NavigationHandler>(
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

export const NavigationPathResolver = Capability$.make<NavigationPathResolver>(
  'org.dxos.app-framework.capability.navigationPathResolver',
);
