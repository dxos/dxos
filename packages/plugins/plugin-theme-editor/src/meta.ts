//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const THEME_EDITOR_PLUGIN = 'dxos.org/plugin/theme-editor';

export const meta: PluginMeta = {
  id: THEME_EDITOR_PLUGIN,
  name: 'Theme editor',
  description: 'DXOS theme editor.',
  icon: 'ph--palette--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-theme-editor',
  tags: ['experimental'],
};
