//
// Copyright 2025 DXOS.org
//

import { OperationPlugin, type Plugin, RuntimePlugin } from '@dxos/app-framework';
// Each `/plugin` entrypoint re-exports the plugin eagerly (without
// `Plugin.lazy`). The default `.` export wraps the plugin in a lazy stub
// (`() => import('./XPlugin')`), which webkit cannot reliably resolve under
// vite-dev: the dynamic-import promise can settle with a partially-evaluated
// namespace, throwing `ReferenceError: Cannot access 'default' before
// initialization` from the loader's `mod.default` access. Stories run inside
// `storybook dev` (vite-dev) and are the only host that hits this. Production
// hosts (composer-app via `vite preview`) still get the lazy `.` export and
// their associated code splitting.
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
