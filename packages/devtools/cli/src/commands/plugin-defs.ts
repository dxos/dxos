//
// Copyright 2025 DXOS.org
//

import { OperationPlugin, type Plugin } from '@dxos/app-framework';
import { type Config } from '@dxos/client';
import { AutomationPlugin } from '@dxos/plugin-automation/cli';
import { ChessPlugin } from '@dxos/plugin-chess/cli';
import { ClientPlugin } from '@dxos/plugin-client/cli';
import { InboxPlugin } from '@dxos/plugin-inbox/cli';
import { MarkdownPlugin } from '@dxos/plugin-markdown/cli';
import { ObservabilityPlugin } from '@dxos/plugin-observability/cli';
import { RegistryPlugin } from '@dxos/plugin-registry/cli';
import { SpacePlugin } from '@dxos/plugin-space/cli';
import { TokenManagerPlugin } from '@dxos/plugin-token-manager/cli';

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
  SpacePlugin.meta.id,
  TokenManagerPlugin.meta.id,
];

export const getDefaults = (): string[] => [ChessPlugin.meta.id, InboxPlugin.meta.id, MarkdownPlugin.meta.id];

export const getPlugins = ({ config }: PluginConfig): Plugin.Plugin[] => [
  AutomationPlugin(),
  ChessPlugin(),
  ClientPlugin({ config }),
  InboxPlugin(),
  MarkdownPlugin(),
  ObservabilityPlugin(),
  OperationPlugin(),
  RegistryPlugin(),
  SpacePlugin({}),
  TokenManagerPlugin(),
];
