//
// Copyright 2025 DXOS.org
//

import type { Plugin } from '@dxos/app-framework';
import { type Config } from '@dxos/client';
import { AutomationPlugin } from '@dxos/plugin-automation/cli';
import { ClientPlugin } from '@dxos/plugin-client/cli';
import { SpacePlugin } from '@dxos/plugin-space/cli';
import { TokenManagerPlugin } from '@dxos/plugin-token-manager/cli';

export type PluginConfig = {
  config?: Config;
  isDev?: boolean;
  isLabs?: boolean;
  isStrict?: boolean;
};

export const getCore = (): string[] => [
  ClientPlugin.meta.id,
  SpacePlugin.meta.id,
  AutomationPlugin.meta.id,
  TokenManagerPlugin.meta.id,
];

export const getDefaults = (): string[] => [];

export const getPlugins = ({ config }: PluginConfig): Plugin[] => [
  AutomationPlugin(),
  ClientPlugin({ config }),
  SpacePlugin(),
  TokenManagerPlugin(),
];
