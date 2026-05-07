//
// Copyright 2025 DXOS.org
//

import { OperationPlugin, type Plugin, RuntimePlugin } from '@dxos/app-framework';
// `/plugin` entrypoints — `@dxos/plugin-attention/plugin`, `/plugin-client/plugin`,
// `/plugin-graph/plugin`, `/plugin-preview/plugin`, `/plugin-settings/plugin`,
// `/plugin-space/plugin`, `/plugin-theme/plugin` — re-export the plugin eagerly
// (without `Plugin.lazy`). The default `.` export wraps each plugin in a lazy
// stub (`() => import('./XPlugin')`), which webkit cannot reliably resolve
// under vite-dev: the dynamic-import promise can settle with a
// partially-evaluated namespace, throwing `ReferenceError: Cannot access
// 'default' before initialization` from the loader's `mod.default` access.
// Storybook runs inside `storybook dev` (vite-dev) and is currently the only
// host that hits this. Production hosts (composer-app via `vite preview`)
// keep using the lazy `.` exports and their associated code splitting.
//
// Use these `/plugin` entrypoints from any storybook `withPluginManager`
// setup. The single-line `export * from './XPlugin'` re-exports avoid the
// dynamic-import path entirely — see e.g. `plugin-attention/src/plugin.ts`.
import { AttentionPlugin } from '@dxos/plugin-attention/plugin';
import { GraphPlugin } from '@dxos/plugin-graph/plugin';
import { SettingsPlugin } from '@dxos/plugin-settings/plugin';
import { ThemePlugin } from '@dxos/plugin-theme/plugin';
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
