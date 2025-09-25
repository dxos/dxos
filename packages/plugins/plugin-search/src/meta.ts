//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const SEARCH_RESULT = 'dxos.org/plugin/search/result';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/search',
  name: 'Search',
  description: 'Search ECHO spaces for content.',
  icon: 'ph--magnifying-glass--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-search',
  tags: ['labs'],
};
