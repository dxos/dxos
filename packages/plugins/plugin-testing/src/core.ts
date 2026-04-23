//
// Copyright 2025 DXOS.org
//

import { OperationPlugin, type Plugin, RuntimePlugin } from '@dxos/app-framework';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { GraphPlugin } from '@dxos/plugin-graph';
import { SettingsPlugin } from '@dxos/plugin-settings';
import { ThemePlugin } from '@dxos/plugin-theme';
import { defaultTx } from '@dxos/ui-theme';

/**
 * Core plugins for testing/storybook environments.
 * NOTE: Does not include SpacePlugin to avoid circular dependencies.
 * Import SpacePlugin directly in your stories if needed.
 */
export const corePlugins = (): Plugin.Plugin[] => [
  AttentionPlugin(),
  GraphPlugin(),
  OperationPlugin(),
  RuntimePlugin(),
  SettingsPlugin(),
  ThemePlugin({ tx: defaultTx }),
];
