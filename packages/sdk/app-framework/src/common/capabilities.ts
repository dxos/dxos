//
// Copyright 2025 DXOS.org
//

import type * as Tool from '@effect/ai/Tool';
import type * as Toolkit from '@effect/ai/Toolkit';
import { type Registry } from '@effect-rx/rx-react';
import type * as Layer from 'effect/Layer';
import type * as Schema from 'effect/Schema';
import { type FC, type PropsWithChildren } from 'react';

import { type AiService } from '@dxos/ai';
import type * as AiServiceRouter from '@dxos/ai/AiServiceRouter';
import { type BuilderExtensions, type GraphBuilder } from '@dxos/app-graph';
import { type Blueprint } from '@dxos/blueprints';
import { type Space } from '@dxos/client-protocol';
import { type FunctionDefinition } from '@dxos/functions';
import { type RootSettingsStore } from '@dxos/local-storage';
import { type AnchoredTo } from '@dxos/schema';

import { type PluginManager, defineCapability } from '../core';
import { type AnyIntentResolver, type IntentContext } from '../plugin-intent';

import { type FileInfo } from './file';
import { type NodeSerializer } from './graph';
import { type SurfaceDefinition } from './surface';
import { type Resource } from './translations';

// TODO(burdon): Sort.
export namespace Capabilities {
  /**
   * @category Capability
   */
  export const Null = defineCapability<null>('dxos.org/app-framework/capability/null');

  /**
   * @category Capability
   */
  export const PluginManager = defineCapability<PluginManager>('dxos.org/app-framework/capability/plugin-manager');

  /**
   * @category Capability
   */
  export const RxRegistry = defineCapability<Registry.Registry>('dxos.org/app-framework/capability/rx-registry');

  export type ReactContext = Readonly<{ id: string; dependsOn?: string[]; context: FC<PropsWithChildren> }>;

  /**
   * @category Capability
   */
  export const ReactContext = defineCapability<ReactContext>('dxos.org/app-framework/capability/react-context');

  export type ReactRoot = Readonly<{ id: string; root: FC<PropsWithChildren> }>;

  /**
   * @category Capability
   */
  export const ReactRoot = defineCapability<ReactRoot>('dxos.org/app-framework/capability/react-root');

  export type ReactSurface = SurfaceDefinition | readonly SurfaceDefinition[];

  /**
   * @category Capability
   */
  export const ReactSurface = defineCapability<ReactSurface>('dxos.org/app-framework/common/react-surface');

  export type IntentResolver = AnyIntentResolver | readonly AnyIntentResolver[];

  /**
   * @category Capability
   */
  export const IntentResolver = defineCapability<IntentResolver>('dxos.org/app-framework/capability/intent-resolver');

  /**
   * @category Capability
   */
  export const IntentDispatcher = defineCapability<IntentContext>(
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
  export const Layout = defineCapability<Layout>('dxos.org/app-framework/capability/layout');

  /**
   * @category Capability
   */
  export const Translations = defineCapability<Readonly<Resource[]>>('dxos.org/app-framework/capability/translations');

  /**
   * @category Capability
   */
  export const AppGraph = defineCapability<Readonly<Pick<GraphBuilder, 'graph' | 'explore'>>>(
    'dxos.org/app-framework/capability/app-graph',
  );

  /**
   * @category Capability
   */
  export const AppGraphBuilder = defineCapability<BuilderExtensions>(
    'dxos.org/app-framework/capability/app-graph-builder',
  );

  /**
   * @category Capability
   */
  export const AppGraphSerializer = defineCapability<NodeSerializer[]>(
    'dxos.org/app-framework/capability/app-graph-serializer',
  );

  /**
   * @category Capability
   */
  export const SettingsStore = defineCapability<RootSettingsStore>('dxos.org/app-framework/capability/settings-store');

  // TODO(wittjosiah): The generics caused type inference issues for schemas when contributing settings.
  // export type Settings = Parameters<RootSettingsStore['createStore']>[0];
  // export type Settings<T extends SettingsValue = SettingsValue> = SettingsProps<T>;
  export type Settings = {
    prefix: string;
    schema: Schema.Schema.All;
    value?: Record<string, any>;
  };

  /**
   * @category Capability
   */
  export const Settings = defineCapability<Settings>('dxos.org/app-framework/capability/settings');

  export type Metadata = Readonly<{ id: string; metadata: Record<string, any> }>;

  /**
   * @category Capability
   */
  export const Metadata = defineCapability<Metadata>('dxos.org/app-framework/capability/metadata');

  // TODO(dmaretskyi): Consider combining Toolkit and ToolkitHandler for type-safe context.

  /**
   * @category Capability
   */
  export const Toolkit = defineCapability<Toolkit.Any>('dxos.org/app-framework/capability/ai-toolkit');

  /**
   * @category Capability
   */
  export const ToolkitHandler = defineCapability<Layer.Layer<Tool.Handler<any>, never, never>>(
    'dxos.org/app-framework/capability/ai-toolkit-handler',
  );

  /**
   * @category Capability
   */
  export const BlueprintDefinition = defineCapability<Blueprint.Blueprint>(
    'dxos.org/app-framework/capability/blueprint-definition',
  );

  export type AiServiceLayer = Layer.Layer<AiService.AiService>;
  export const AiServiceLayer = defineCapability<AiServiceLayer>(
    'dxos.org/app-framework/capability/ai-service-factory',
  );

  /**
   * Plugins can contribute them to provide model resolvers.
   */
  export const AiModelResolver = defineCapability<Layer.Layer<AiServiceRouter.AiModelResolver>>(
    'dxos.org/app-framework/capability/ai-model-resolver',
  );

  /**
   * @category Capability
   */
  export const Functions = defineCapability<FunctionDefinition<any, any>[]>(
    'dxos.org/app-framework/capability/functions',
  );

  export type FileUploader = (space: Space, file: File) => Promise<FileInfo | undefined>;

  /**
   * @category Capability
   */
  export const FileUploader = defineCapability<FileUploader>('dxos.org/app-framework/capability/file-uploader');

  type AnchorSort = {
    key: string;
    sort: (anchorA: AnchoredTo, anchorB: AnchoredTo) => number;
  };

  /**
   * @category Capability
   */
  export const AnchorSort = defineCapability<AnchorSort>('dxos.org/app-framework/capability/anchor-sort');
}
