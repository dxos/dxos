//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import type * as Effect$ from 'effect/Effect';
import type * as Layer$ from 'effect/Layer';
import type * as Option from 'effect/Option';
import type * as Schema$ from 'effect/Schema';

import type { AiModelResolver as AiModelResolver$, AiService as AiService$ } from '@dxos/ai';
import type { GenericToolkit } from '@dxos/ai';
import { Capability as Capability$ } from '@dxos/app-framework';
import type { BuilderExtensions, Graph, GraphBuilder } from '@dxos/app-graph';
import type { Blueprint } from '@dxos/blueprints';
import type { Database, DXN, Type } from '@dxos/echo';
import type { AnchoredTo } from '@dxos/types';
import type { FileInfo } from './file';
import type { NodeSerializer } from './graph';
import type { Resource } from './translations';

export namespace AppCapabilities {
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
  export const Layout = Capability$.make<Atom.Atom<Layout>>('org.dxos.app-framework.capability.layout');

  /**
   * @category Capability
   */
  export const Translations = Capability$.make<Readonly<Resource[]>>('org.dxos.app-framework.capability.translations');

  export type AppGraph = Readonly<{
    graph: Graph.ExpandableGraph;
    explore: typeof GraphBuilder.explore;
  }>;

  /**
   * @category Capability
   */
  export const AppGraph = Capability$.make<AppGraph>('org.dxos.app-framework.capability.app-graph');

  /**
   * @category Capability
   */
  export const AppGraphBuilder = Capability$.make<BuilderExtensions>(
    'org.dxos.app-framework.capability.app-graph-builder',
  );

  /**
   * @category Capability
   */
  export const AppGraphSerializer = Capability$.make<NodeSerializer[]>(
    'org.dxos.app-framework.capability.app-graph-serializer',
  );

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

  export type Metadata = Readonly<{
    id: string;
    metadata: Record<string, any>;
  }>;

  /**
   * @category Capability
   */
  export const Metadata = Capability$.make<Metadata>('org.dxos.app-framework.capability.metadata');

  export type Schema = ReadonlyArray<Type.AnyEntity>;

  /**
   * @category Capability
   */
  export const Schema = Capability$.make<Schema>('org.dxos.app-framework.capability.schema');

  export type Toolkit = GenericToolkit.GenericToolkit;

  /**
   * @category Capability
   */
  export const Toolkit = Capability$.make<Toolkit>('org.dxos.app-framework.capability.ai-toolkit');

  // TODO(burdon): Move type upstream (into blueprint package).
  export type BlueprintDefinition = {
    key: string;
    make: () => Blueprint.Blueprint;
  };

  /**
   * @category Capability
   */
  export const BlueprintDefinition = Capability$.make<BlueprintDefinition>(
    'org.dxos.app-framework.capability.blueprint-definition',
  );

  export type AiServiceLayer = Layer$.Layer<AiService$.AiService>;
  export const AiServiceLayer = Capability$.make<AiServiceLayer>(
    'org.dxos.app-framework.capability.ai-service-factory',
  );

  /**
   * Plugins can contribute them to provide model resolvers.
   */
  export const AiModelResolver = Capability$.make<Layer$.Layer<AiModelResolver$.AiModelResolver>>(
    'org.dxos.app-framework.capability.ai-model-resolver',
  );

  export type FileUploader = (db: Database.Database, file: File) => Promise<FileInfo | undefined>;

  /**
   * @category Capability
   */
  export const FileUploader = Capability$.make<FileUploader>('org.dxos.app-framework.capability.file-uploader');

  export type AnchorSort = {
    key: string;
    sort: (anchorA: AnchoredTo.AnchoredTo, anchorB: AnchoredTo.AnchoredTo) => number;
  };

  /**
   * @category Capability
   */
  export const AnchorSort = Capability$.make<AnchorSort>('org.dxos.app-framework.capability.anchor-sort');

  export type NavigationTarget = {
    /** Navigation path usable with the Open operation. */
    path: string;
    /** Human-readable label. */
    label: string;
    /** Object type. */
    type: string;
  };

  export type NavigationQuery = {
    dxn?: DXN.String;
  };

  /**
   * Resolves a query to navigation targets.
   * Each plugin interprets the query and returns matching targets.
   * When called without a query, returns the plugin's default navigable pages.
   * @category Capability
   */
  export type NavigationTargetResolver = (query?: NavigationQuery) => Effect$.Effect<NavigationTarget[]>;

  export const NavigationTargetResolver = Capability$.make<NavigationTargetResolver>(
    'org.dxos.app-framework.capability.navigation-target-resolver',
  );

  /**
   * Resolves a qualified graph path to a DXN.
   * Each plugin recognizes its own path patterns and returns the corresponding DXN.
   * Returns None if the path is not recognized by this resolver.
   * Used to validate navigation targets against remote services (e.g., edge).
   * @category Capability
   */
  export type NavigationPathResolver = (qualifiedPath: string) => Effect$.Effect<Option.Option<DXN>>;

  export const NavigationPathResolver = Capability$.make<NavigationPathResolver>(
    'org.dxos.app-framework.capability.navigation-path-resolver',
  );
}
