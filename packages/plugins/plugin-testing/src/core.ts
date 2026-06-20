//
// Copyright 2025 DXOS.org
//

import { type Plugin, ProcessManagerPlugin } from '@dxos/app-framework';
// `/testing` entrypoints re-export the plugin eagerly (without `Plugin.lazy`).
// The default `.` and `/plugin` exports wrap each plugin in a lazy stub
// (`() => import('./XPlugin')`), which webkit cannot reliably resolve under
// vite-dev: the dynamic-import promise can settle with a partially-evaluated
// namespace, throwing `ReferenceError: Cannot access 'default' before
// initialization` from the loader's `mod.default` access. Storybook runs
// inside `storybook dev` (vite-dev) and is currently the only host that hits
// this. Production hosts (composer-app via `vite preview`) keep using the
// lazy `.` exports and their associated code splitting.
//
// Use these `/testing` entrypoints from any storybook `withPluginManager`
// setup. The single-line `export * from './XPlugin'` re-exports avoid the
// dynamic-import path entirely — see e.g. `plugin-attention/src/testing.ts`.
import { AttentionPlugin } from '@dxos/plugin-attention/testing';
import { GraphPlugin } from '@dxos/plugin-graph/testing';
import { SettingsPlugin } from '@dxos/plugin-settings/testing';
import { ThemePlugin } from '@dxos/plugin-theme/testing';
import { defaultTx } from '@dxos/react-ui';

/**
 * Core plugins for testing/storybook environments.
 * NOTE: Does not include SpacePlugin to avoid circular dependencies.
 * Import SpacePlugin directly in your stories if needed.
 */
export const corePlugins = (): Plugin.Plugin[] => [
  AttentionPlugin(),
  GraphPlugin(),
  ProcessManagerPlugin(),
  SettingsPlugin(),
  ThemePlugin({ tx: defaultTx }),
];
