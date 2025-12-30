//
// Copyright 2025 DXOS.org
//

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { ClientPlugin } from '@dxos/plugin-client';
import { GraphPlugin } from '@dxos/plugin-graph';
import { SpacePlugin } from '@dxos/plugin-space';
import { ThemePlugin } from '@dxos/plugin-theme';
import { defaultTx } from '@dxos/ui-theme';

export {
  // Re-export common framework plugins.
  AttentionPlugin,
  ClientPlugin,
  GraphPlugin,
  IntentPlugin,
  SettingsPlugin,
  SpacePlugin,
  ThemePlugin,
};

// TODO(burdon): Use uniformly and remove direct deps from devDependencies.
export const corePlugins = () => [
  AttentionPlugin(),
  GraphPlugin(),
  IntentPlugin(),
  SettingsPlugin(),
  SpacePlugin({}),
  ThemePlugin({ tx: defaultTx }),
];
