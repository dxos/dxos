//
// Copyright 2025 DXOS.org
//

import type { Plugin } from '@dxos/app-framework';
import { ClientPlugin } from '@dxos/plugin-client/cli';

export type PluginConfig = {
  isDev?: boolean;
  isLabs?: boolean;
  isStrict?: boolean;
};

export const getCore = (): string[] => [ClientPlugin.meta.id];

export const getDefaults = (): string[] => [];

export const getPlugins = (): Plugin[] => [ClientPlugin()];
