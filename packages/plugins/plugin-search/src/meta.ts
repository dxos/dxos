//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const SEARCH_PLUGIN = 'dxos.org/plugin/search';
export const SEARCH_RESULT = `${SEARCH_PLUGIN}/result`;

export const meta: PluginMeta = {
  id: SEARCH_PLUGIN,
  name: 'Search',
  description: 'Search ECHO spaces for content.',
  icon: 'ph--magnifying-glass--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-search',
  tags: ['labs'],
};
