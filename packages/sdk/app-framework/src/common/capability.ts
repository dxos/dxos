//
// Copyright 2025 DXOS.org
//

import type * as Command$ from '@effect/cli/Command';
import type { Registry } from '@effect-atom/atom-react';
import type * as Layer$ from 'effect/Layer';
import type * as Schema$ from 'effect/Schema';
import type { FC, PropsWithChildren } from 'react';

import type { AiModelResolver as AiModelResolver$, AiService as AiService$ } from '@dxos/ai';
import type { BuilderExtensions, GraphBuilder } from '@dxos/app-graph';
import type { GenericToolkit } from '@dxos/assistant';
import type { Blueprint } from '@dxos/blueprints';
import type { Database, Type } from '@dxos/echo';
import type { FunctionDefinition } from '@dxos/functions';
import type { RootSettingsStore } from '@dxos/local-storage';
import type { AnchoredTo } from '@dxos/types';

import { Capability as Capability$, type PluginManager as PluginManager$ } from '../core';
import type { AnyIntentResolver, IntentContext } from '../plugin-intent';
import type {
  HistoryTracker as HistoryTracker$,
  OperationInvoker as OperationInvoker$,
  OperationResolver as OperationResolver$,
  UndoMappingRegistration as UndoMappingRegistration$,
  UndoRegistry as UndoRegistry$,
} from '../plugin-operation';

import type { FileInfo } from './file';
import type { NodeSerializer } from './graph';
import type { SurfaceDefinition } from './surface';
import type { Resource } from './translations';

export namespace Capability {
  // TODO(burdon): Sort.

  /**
   * @category Capability
   */
  export const Null = Capability$.make<null>('dxos.org/app-framework/capability/null');

  /**
   * @category Capability
   */
  export const PluginManager = Capability$.make<PluginManager$.PluginManager>(
    'dxos.org/app-framework/capability/plugin-manager',
  );

  /**
   * @category Capability
   */
  export const AtomRegistry = Capability$.make<Registry.Registry>('dxos.org/app-framework/capability/atom-registry');

  export type ReactContext = Readonly<{
    id: string;
    dependsOn?: string[];
    context: FC<PropsWithChildren>;
  }>;

  /**
   * @category Capability
   */
  export const ReactContext = Capability$.make<ReactContext>('dxos.org/app-framework/capability/react-context');

  export type ReactRoot = Readonly<{ id: string; root: FC<PropsWithChildren> }>;

  /**
   * @category Capability
   */
  export const ReactRoot = Capability$.make<ReactRoot>('dxos.org/app-framework/capability/react-root');

  /**
   * Surface definitions that can be either React components or Web Components.
   */
  export type ReactSurface = SurfaceDefinition | readonly SurfaceDefinition[];

  /**
   * @category Capability
   */
  export const ReactSurface = Capability$.make<ReactSurface>('dxos.org/app-framework/common/react-surface');

  export type IntentResolver = AnyIntentResolver | readonly AnyIntentResolver[];

  /**
   * @category Capability
   */
  export const IntentResolver = Capability$.make<IntentResolver>('dxos.org/app-framework/capability/intent-resolver');

  /**
   * @category Capability
   */
  export const IntentDispatcher = Capability$.make<IntentContext>(
    'dxos.org/app-framework/capability/intent-dispatcher',
  );

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
   * @category Capability
   */
  export const Layout = Capability$.make<Layout>('dxos.org/app-framework/capability/layout');

  /**
   * @category Capability
   */
  export const Translations = Capability$.make<Readonly<Resource[]>>('dxos.org/app-framework/capability/translations');

  export type AppGraph = Readonly<{
    graph: GraphBuilder.GraphBuilder['graph'];
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

  /**
   * @category Capability
   */
  export const SettingsStore = Capability$.make<RootSettingsStore>('dxos.org/app-framework/capability/settings-store');

  // TODO(wittjosiah): The generics caused type inference issues for schemas when contributing settings.
  // export type Settings = Parameters<RootSettingsStore['createStore']>[0];
  // export type Settings<T extends SettingsValue = SettingsValue> = SettingsProps<T>;
  export type Settings = {
    prefix: string;
    schema: Schema$.Schema.All;
    value?: Record<string, any>;
  };

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

  /**
   * @category Capability
   */
  export const BlueprintDefinition = Capability$.make<Blueprint.Blueprint>(
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

  export type AnyCommand = Command$.Command<any, any, any, any>;

  /**
   * @category Capability
   */
  export const Command = Capability$.make<AnyCommand>('dxos.org/app-framework/capability/command');

  /**
   * @category Capability
   */
  export const Layer = Capability$.make<Layer$.Layer<any, any, any>>('dxos.org/app-framework/capability/layer');

  //
  // Operation System Capabilities
  //

  export type OperationResolver = OperationResolver$.OperationResolver;

  /**
   * Handler registration for operations - contributed by plugins.
   * @category Capability
   */
  export const OperationHandler = Capability$.make<OperationResolver[]>(
    'dxos.org/app-framework/capability/operation-handler',
  );

  export type UndoMappingRegistration = UndoMappingRegistration$;

  /**
   * Undo mapping registration - contributed by plugins.
   * @category Capability
   */
  export const UndoMapping = Capability$.make<UndoMappingRegistration$[]>(
    'dxos.org/app-framework/capability/undo-mapping',
  );

  export type OperationInvoker = OperationInvoker$.OperationInvoker;

  /**
   * Operation invoker - provided by OperationPlugin.
   * @category Capability
   */
  export const OperationInvoker = Capability$.make<OperationInvoker>(
    'dxos.org/app-framework/capability/operation-invoker',
  );

  export type UndoRegistry = UndoRegistry$.UndoRegistry;

  /**
   * Undo registry - provided by OperationPlugin.
   * @category Capability
   */
  export const UndoRegistry = Capability$.make<UndoRegistry>('dxos.org/app-framework/capability/undo-registry');

  export type HistoryTracker = HistoryTracker$.HistoryTracker;

  /**
   * History tracker - provided by OperationPlugin.
   * @category Capability
   */
  export const HistoryTracker = Capability$.make<HistoryTracker>('dxos.org/app-framework/capability/history-tracker');
}
