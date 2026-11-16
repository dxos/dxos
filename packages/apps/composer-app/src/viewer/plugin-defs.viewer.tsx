//
// Copyright 2026 DXOS.org
//

import type * as Plugin from '@dxos/app-framework/Plugin';
import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { type Client, type ClientServicesProvider, type Config } from '@dxos/client';
import * as AttentionPlugin from '@dxos/plugin-attention/AttentionPlugin';
import * as CanvasPlugin from '@dxos/plugin-canvas/CanvasPlugin';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as DeckPlugin from '@dxos/plugin-deck/DeckPlugin';
import * as GraphPlugin from '@dxos/plugin-graph/GraphPlugin';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as MermaidPlugin from '@dxos/plugin-mermaid/MermaidPlugin';
import * as NavTreePlugin from '@dxos/plugin-navtree/NavTreePlugin';
import * as PresenterPlugin from '@dxos/plugin-presenter/PresenterPlugin';
import * as PreviewPlugin from '@dxos/plugin-preview/PreviewPlugin';
import * as SettingsPlugin from '@dxos/plugin-settings/SettingsPlugin';
import * as SheetPlugin from '@dxos/plugin-sheet/SheetPlugin';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import * as SupportPlugin from '@dxos/plugin-support/SupportPlugin';
import * as TablePlugin from '@dxos/plugin-table/TablePlugin';
import * as ThemePlugin from '@dxos/plugin-theme/ThemePlugin';

import { ViewerPlugin, type ViewerPluginOptions } from './ViewerPlugin.tsx';

export type ViewerPluginConfig = ViewerPluginOptions & {
  client: Client;
  config: Config;
  services: ClientServicesProvider;
};

/**
 * The read-only viewer's plugin set. Each plugin decides for itself how it reads in a viewer, through
 * its own options; a plugin with nothing to show read-only (comments, assistant, calls, history) is
 * left out rather than switched off.
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
  SpacePlugin.make({ invitationUrlHandler: false, readOnly: true }),
  SupportPlugin.make({ readOnly: true }),
  ThemePlugin.make({ appName: 'Composer', platform: 'desktop' }),
  ViewerPlugin(viewer),

  CanvasPlugin.make({ readOnly: true }),
  IllustratorPlugin.make({ readOnly: true }),
  MarkdownPlugin.make({ readOnly: true }),
  MermaidPlugin.make(),
  PresenterPlugin.make({ readOnly: true }),
  SheetPlugin.make({ readOnly: true }),
  TablePlugin.make({ readOnly: true }),
];
