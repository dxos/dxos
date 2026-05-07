//
// Copyright 2025 DXOS.org
//

import { OperationPlugin, type Plugin, RuntimePlugin } from '@dxos/app-framework';
import { type Config } from '@dxos/client';
import { AutomationPlugin } from '@dxos/plugin-automation';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ClientPlugin } from '@dxos/plugin-client';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { ObservabilityPlugin } from '@dxos/plugin-observability';
import { RegistryPlugin } from '@dxos/plugin-registry';
import { SamplePlugin } from '@dxos/plugin-sample';
import { SpacePlugin } from '@dxos/plugin-space';
import { IntegrationPlugin } from '@dxos/plugin-integration/cli';

export type PluginConfig = {
  config?: Config;
  isDev?: boolean;
  isLabs?: boolean;
  isStrict?: boolean;
};

export const getCore = (): string[] => [
  AutomationPlugin.meta.id,
  ClientPlugin.meta.id,
  ObservabilityPlugin.meta.id,
  OperationPlugin.meta.id,
  RegistryPlugin.meta.id,
  RuntimePlugin.meta.id,
  SpacePlugin.meta.id,
  IntegrationPlugin.meta.id,
];

export const getDefaults = (): string[] => [
  ChessPlugin.meta.id,
  SamplePlugin.meta.id,
  InboxPlugin.meta.id,
  MarkdownPlugin.meta.id,
];

export const getPlugins = ({ config }: PluginConfig): Plugin.Plugin[] => {
  return [
    AutomationPlugin(),
    ChessPlugin(),
    SamplePlugin(),
    ClientPlugin({ config }),
    InboxPlugin(),
    MarkdownPlugin(),
    ObservabilityPlugin(),
    OperationPlugin(),
    RegistryPlugin(),
    RuntimePlugin(),
    SpacePlugin({}),
    IntegrationPlugin(),
  ];
};
