//
// Copyright 2025 DXOS.org
//

import { type Registry } from '@effect-rx/rx-react';
import { type Schema } from 'effect';
import { type FC, type PropsWithChildren } from 'react';

import { type ExecutableTool } from '@dxos/ai';
import { type GraphBuilder, type BuilderExtensions } from '@dxos/app-graph';
import { type ArtifactDefinition } from '@dxos/artifact';
import { type Space } from '@dxos/client-protocol';
import { type RootSettingsStore } from '@dxos/local-storage';
import { type AnchoredTo } from '@dxos/schema';

import { type FileInfo } from './file';
import { type NodeSerializer } from './graph';
import { type SurfaceDefinition } from './surface';
import { type Resource } from './translations';
import { type PluginManager, defineCapability } from '../core';
import { type AnyIntentResolver, type IntentContext } from '../plugin-intent';

export namespace Capabilities {
  export const PluginManager = defineCapability<PluginManager>('dxos.org/app-framework/capability/plugin-manager');

  export const Null = defineCapability<null>('dxos.org/app-framework/capability/null');

  export const RxRegistry = defineCapability<Registry.Registry>('dxos.org/app-framework/capability/rx-registry');

  export type ReactContext = Readonly<{ id: string; dependsOn?: string[]; context: FC<PropsWithChildren> }>;
  export const ReactContext = defineCapability<ReactContext>('dxos.org/app-framework/capability/react-context');

  export type ReactRoot = Readonly<{ id: string; root: FC<PropsWithChildren> }>;
  export const ReactRoot = defineCapability<ReactRoot>('dxos.org/app-framework/capability/react-root');

  export type ReactSurface = SurfaceDefinition | readonly SurfaceDefinition[];
  export const ReactSurface = defineCapability<ReactSurface>('dxos.org/app-framework/common/react-surface');

  export type IntentResolver = AnyIntentResolver | readonly AnyIntentResolver[];
  export const IntentResolver = defineCapability<IntentResolver>('dxos.org/app-framework/capability/intent-resolver');

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
  export const Layout = defineCapability<Layout>('dxos.org/app-framework/capability/layout');

  // TODO(burdon): Why array?
  export const Translations = defineCapability<Readonly<Resource[]>>('dxos.org/app-framework/capability/translations');

  export const AppGraph = defineCapability<Readonly<Pick<GraphBuilder, 'graph' | 'explore'>>>(
    'dxos.org/app-framework/capability/app-graph',
  );

  export const AppGraphBuilder = defineCapability<BuilderExtensions>(
    'dxos.org/app-framework/capability/app-graph-builder',
  );

  export const AppGraphSerializer = defineCapability<NodeSerializer[]>(
    'dxos.org/app-framework/capability/app-graph-serializer',
  );

  export const SettingsStore = defineCapability<RootSettingsStore>('dxos.org/app-framework/capability/settings-store');

  // TODO(wittjosiah): The generics caused type inference issues for schemas when contributing settings.
  // export type Settings = Parameters<RootSettingsStore['createStore']>[0];
  // export type Settings<T extends SettingsValue = SettingsValue> = SettingsProps<T>;
  export type Settings = {
    prefix: string;
    schema: Schema.Schema.All;
    value?: Record<string, any>;
  };
  export const Settings = defineCapability<Settings>('dxos.org/app-framework/capability/settings');

  export type Metadata = Readonly<{ id: string; metadata: Record<string, any> }>;
  export const Metadata = defineCapability<Metadata>('dxos.org/app-framework/capability/metadata');

  export const Tools = defineCapability<ExecutableTool[]>('dxos.org/app-framework/capability/tools');
  export const ArtifactDefinition = defineCapability<ArtifactDefinition>(
    'dxos.org/app-framework/capability/artifact-definition',
  );

  export type FileUploader = (file: File, space: Space) => Promise<FileInfo | undefined>;
  export const FileUploader = defineCapability<FileUploader>('dxos.org/app-framework/capability/file-uploader');

  type AnchorSort = {
    key: string;
    sort: (anchorA: AnchoredTo, anchorB: AnchoredTo) => number;
  };
  export const AnchorSort = defineCapability<AnchorSort>('dxos.org/app-framework/capability/anchor-sort');
}
