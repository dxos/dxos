//
// Copyright 2025 DXOS.org
//

import type * as Plugin from '@dxos/app-framework/Plugin';
import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
// The `/testing` entrypoints re-export each plugin's config (`export * as XPlugin from '#meta'`), which
// builds the plugin eagerly with lazy module bodies - use them from any storybook `withPluginManager` setup.
import { AttentionPlugin } from '@dxos/plugin-attention/testing';
import { GraphPlugin } from '@dxos/plugin-graph/testing';
import { SettingsPlugin } from '@dxos/plugin-settings/testing';
import { ThemePlugin } from '@dxos/plugin-theme/testing';
import * as Theme from '@dxos/react-ui/Theme';

/**
 * Core plugins for testing/storybook environments.
 * NOTE: Does not include SpacePlugin to avoid circular dependencies.
 * Import SpacePlugin directly in your stories if needed.
 */
export const corePlugins = (): Plugin.Plugin[] => [
  AttentionPlugin.make(),
  GraphPlugin.make(),
  ProcessManagerPlugin.make(),
  SettingsPlugin.make(),
  ThemePlugin.make({ tx: Theme.defaultTx }),
];
