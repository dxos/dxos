//
// Copyright 2025 DXOS.org
//

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { ClientPlugin } from '@dxos/plugin-client';
import { GraphPlugin } from '@dxos/plugin-graph';
import { ThemePlugin } from '@dxos/plugin-theme';
import { defaultTx } from '@dxos/ui-theme';

export {
  // Re-export common framework plugins.
  AttentionPlugin,
  ClientPlugin,
  GraphPlugin,
  IntentPlugin,
  SettingsPlugin,
  ThemePlugin,
};

/**
 * Core plugins for testing/storybook environments.
 * NOTE: Does not include SpacePlugin to avoid circular dependencies.
 * Import SpacePlugin directly in your stories if needed.
 */
export const corePlugins = () => [
  AttentionPlugin(),
  GraphPlugin(),
  IntentPlugin(),
  SettingsPlugin(),
  ThemePlugin({ tx: defaultTx }),
];
