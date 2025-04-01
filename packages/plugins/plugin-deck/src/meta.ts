//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const DECK_PLUGIN = 'dxos.org/plugin/deck' as const;

export const meta: PluginMeta = {
  id: DECK_PLUGIN,
  name: 'Deck',
  icon: 'ph--columns--regular',
};
