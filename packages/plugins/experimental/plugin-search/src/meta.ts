//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const SEARCH_PLUGIN = 'dxos.org/plugin/search';
export const SEARCH_RESULT = `${SEARCH_PLUGIN}/result`;

export default {
  id: SEARCH_PLUGIN,
  name: 'Search',
  description: 'Search ECHO spaces for content.',
  tags: ['experimental'],
  icon: 'ph--magnifying-glass--regular',
} satisfies PluginMeta;
