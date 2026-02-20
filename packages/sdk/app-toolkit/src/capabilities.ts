//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import type * as Layer$ from 'effect/Layer';
import type * as Schema$ from 'effect/Schema';

import type { AiModelResolver as AiModelResolver$, AiService as AiService$ } from '@dxos/ai';
import { Capability as Capability$ } from '@dxos/app-framework';
import type { BuilderExtensions, Graph, GraphBuilder } from '@dxos/app-graph';
import type { GenericToolkit } from '@dxos/assistant';
import type { Blueprint } from '@dxos/blueprints';
import type { Database, Type } from '@dxos/echo';
import type { FunctionDefinition } from '@dxos/functions';
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
  export const Layout = Capability$.make<Atom.Atom<Layout>>('dxos.org/app-framework/capability/layout');

  /**
   * @category Capability
   */
  export const Translations = Capability$.make<Readonly<Resource[]>>('dxos.org/app-framework/capability/translations');

  export type AppGraph = Readonly<{
    graph: Graph.ExpandableGraph;
    explore: typeof GraphBuilder.explore;
  }>;

  /**
   * @category Capability
   */
  export const AppGraph = Capability$.make<AppGraph>('dxos.org/app-framework/capability/app-graph');

  /**
   * @category Capability
   */
  export const AppGraphBuilder = Capability$.make<BuilderExtensions>(
    'dxos.org/app-framework/capability/app-graph-builder',
  );

  /**
   * @category Capability
   */
  export const AppGraphSerializer = Capability$.make<NodeSerializer[]>(
    'dxos.org/app-framework/capability/app-graph-serializer',
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
  export const Settings = Capability$.make<Settings>('dxos.org/app-framework/capability/settings');

  export type Metadata = Readonly<{
    id: string;
    metadata: Record<string, any>;
  }>;

  /**
   * @category Capability
   */
  export const Metadata = Capability$.make<Metadata>('dxos.org/app-framework/capability/metadata');

  export type Schema = ReadonlyArray<Type.Entity.Any>;

  /**
   * @category Capability
   */
  export const Schema = Capability$.make<Schema>('dxos.org/app-framework/capability/schema');

  export type Toolkit = GenericToolkit.GenericToolkit;

  /**
   * @category Capability
   */
  export const Toolkit = Capability$.make<Toolkit>('dxos.org/app-framework/capability/ai-toolkit');

  // TODO(burdon): Move type upstream (into blueprint package).
  export type BlueprintDefinition = {
    key: string;
    // TODO(burdon): Is this currently used by the framework?
    functions: FunctionDefinition.Any[];
    make: () => Blueprint.Blueprint;
  };

  /**
   * @category Capability
   */
  export const BlueprintDefinition = Capability$.make<BlueprintDefinition>(
    'dxos.org/app-framework/capability/blueprint-definition',
  );

  export type AiServiceLayer = Layer$.Layer<AiService$.AiService>;
  export const AiServiceLayer = Capability$.make<AiServiceLayer>(
    'dxos.org/app-framework/capability/ai-service-factory',
  );

  /**
   * Plugins can contribute them to provide model resolvers.
   */
  export const AiModelResolver = Capability$.make<Layer$.Layer<AiModelResolver$.AiModelResolver>>(
    'dxos.org/app-framework/capability/ai-model-resolver',
  );

  /**
   * @category Capability
   */
  export const Functions = Capability$.make<FunctionDefinition.Any[]>('dxos.org/app-framework/capability/functions');

  export type FileUploader = (db: Database.Database, file: File) => Promise<FileInfo | undefined>;

  /**
   * @category Capability
   */
  export const FileUploader = Capability$.make<FileUploader>('dxos.org/app-framework/capability/file-uploader');

  export type AnchorSort = {
    key: string;
    sort: (anchorA: AnchoredTo.AnchoredTo, anchorB: AnchoredTo.AnchoredTo) => number;
  };

  /**
   * @category Capability
   */
  export const AnchorSort = Capability$.make<AnchorSort>('dxos.org/app-framework/capability/anchor-sort');
}
