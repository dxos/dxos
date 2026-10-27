//
// Copyright 2026 DXOS.org
//

import type * as Plugin from '@dxos/app-framework/Plugin';
import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { type Client, type ClientServicesProvider, type Config } from '@dxos/client';
import * as AttentionPlugin from '@dxos/plugin-attention/AttentionPlugin';
import * as CanvasPlugin from '@dxos/plugin-canvas/CanvasPlugin';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as GraphPlugin from '@dxos/plugin-graph/GraphPlugin';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as ThemePlugin from '@dxos/plugin-theme/ThemePlugin';

import { DrawingAppPlugin } from './DrawingAppPlugin.ts';

export type PluginOptions = {
  client: Client;
  config: Config;
  services: ClientServicesProvider;
};

/**
 * The whole plugin set: the client, attention (the canvas keeps its selection and camera in attention view
 * state) with the app graph its keyboard shortcuts resolve against, operations, the theme, the illustrator with its Canvas variant, and this app's shell. Each plugin
 * body is a lazy chunk, so the entry carries only their metadata.
 */
export const getPlugins = ({ client, config, services }: PluginOptions): Plugin.Plugin[] => [
  AttentionPlugin.make(),
  ClientPlugin.make({ client, config, services, types: [Drawing.Drawing, Drawing.Canvas] }),
  GraphPlugin.make(),
  ProcessManagerPlugin.make(),
  ThemePlugin.make({ appName: 'drawing.sh' }),
  IllustratorPlugin.make(),
  CanvasPlugin.make(),
  DrawingAppPlugin(),
];
