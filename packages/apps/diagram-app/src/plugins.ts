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

import { DiagramAppPlugin } from './DiagramAppPlugin.ts';

export type PluginOptions = {
  client: Client;
  config: Config;
  services: ClientServicesProvider;
};

/**
 * The plugin set (spec F-1.2): the canvas article needs attention and the app graph its shortcuts resolve
 * against, and the illustrator owns the `Drawing` type and its variants. Each plugin body is a lazy chunk.
 */
export const getPlugins = ({ client, config, services }: PluginOptions): Plugin.Plugin[] => [
  AttentionPlugin.make(),
  CanvasPlugin.make(),
  ClientPlugin.make({ client, config, services, types: [Drawing.Drawing, Drawing.Canvas] }),
  DiagramAppPlugin(),
  GraphPlugin.make(),
  IllustratorPlugin.make(),
  ProcessManagerPlugin.make(),
  ThemePlugin.make({ appName: 'Diagram' }),
];
