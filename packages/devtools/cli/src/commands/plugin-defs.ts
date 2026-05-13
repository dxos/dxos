//
// Copyright 2025 DXOS.org
//

import { OperationPlugin, type Plugin, RuntimePlugin } from '@dxos/app-framework';
import { type Config } from '@dxos/client';
import { AutomationPlugin } from '@dxos/plugin-automation/plugin';
import { ChessPlugin } from '@dxos/plugin-chess/plugin';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { InboxPlugin } from '@dxos/plugin-inbox/plugin';
import { IntegrationPlugin } from '@dxos/plugin-integration/plugin';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { ObservabilityPlugin } from '@dxos/plugin-observability/plugin';
import { RegistryPlugin } from '@dxos/plugin-registry/plugin';
import { SamplePlugin } from '@dxos/plugin-sample/plugin';
import { SpacePlugin } from '@dxos/plugin-space/plugin';

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
    // TODO(wittjosiah): Align browser and node variant option types for ObservabilityPlugin.
    ObservabilityPlugin({} as any),
    OperationPlugin(),
    RegistryPlugin(),
    RuntimePlugin(),
    SpacePlugin({}),
    IntegrationPlugin(),
  ];
};
