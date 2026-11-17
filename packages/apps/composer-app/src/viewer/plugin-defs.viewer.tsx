//
// Copyright 2026 DXOS.org
//

import type * as Plugin from '@dxos/app-framework/Plugin';
import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { type Client, type ClientServicesProvider, type Config } from '@dxos/client';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as AttentionPlugin from '@dxos/plugin-attention/AttentionPlugin';
import * as CanvasPlugin from '@dxos/plugin-canvas/CanvasPlugin';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as DeckPlugin from '@dxos/plugin-deck/DeckPlugin';
import * as ExcalidrawPlugin from '@dxos/plugin-excalidraw/ExcalidrawPlugin';
import * as GraphPlugin from '@dxos/plugin-graph/GraphPlugin';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as KanbanPlugin from '@dxos/plugin-kanban/KanbanPlugin';
import * as MapPlugin from '@dxos/plugin-map/MapPlugin';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as MermaidPlugin from '@dxos/plugin-mermaid/MermaidPlugin';
import * as NavTreePlugin from '@dxos/plugin-navtree/NavTreePlugin';
import * as PresenterPlugin from '@dxos/plugin-presenter/PresenterPlugin';
import * as PreviewPlugin from '@dxos/plugin-preview/PreviewPlugin';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as SettingsPlugin from '@dxos/plugin-settings/SettingsPlugin';
import * as SheetPlugin from '@dxos/plugin-sheet/SheetPlugin';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import * as SupportPlugin from '@dxos/plugin-support/SupportPlugin';
import * as TablePlugin from '@dxos/plugin-table/TablePlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import * as ThemePlugin from '@dxos/plugin-theme/ThemePlugin';
import * as TldrawPlugin from '@dxos/plugin-tldraw/TldrawPlugin';

import { ViewerPlugin, type ViewerPluginOptions } from './ViewerPlugin.tsx';

export type ViewerPluginConfig = ViewerPluginOptions & {
  client: Client;
  config: Config;
  services: ClientServicesProvider;
};

/**
 * The read-only viewer's plugin set. {@link ViewerPlugin} contributes the app-wide read-only capability,
 * and each plugin decides from it how it reads; a plugin with nothing to show read-only (comments,
 * calls, history) is left out.
 */
export const getPlugins = ({ client, config, services, ...viewer }: ViewerPluginConfig): Plugin.Plugin[] => [
  AttentionPlugin.make(),
  ClientPlugin.make({ client, config, services, invitationUrlHandler: false, identityTestActions: false }),
  DeckPlugin.make({ platform: 'desktop', banner: true, companionsClosed: true }),
  GraphPlugin.make(),
  NavTreePlugin.make({ rail: false }),
  PreviewPlugin.make(),
  ProcessManagerPlugin.make(),
  SettingsPlugin.make(),
  SpacePlugin.make({ invitationUrlHandler: false }),
  SupportPlugin.make(),
  ThemePlugin.make({ appName: 'Composer', platform: 'desktop' }),
  ViewerPlugin(viewer),

  AssistantPlugin.make({ experimentalTypes: false }),
  CanvasPlugin.make(),
  ExcalidrawPlugin.make(),
  IllustratorPlugin.make(),
  KanbanPlugin.make(),
  MapPlugin.make(),
  MarkdownPlugin.make(),
  MermaidPlugin.make(),
  PresenterPlugin.make(),
  ProjectsPlugin.make(),
  RoutinePlugin.make(),
  SheetPlugin.make(),
  TablePlugin.make(),
  TasksPlugin.make(),
  TldrawPlugin.make(),
];
