//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/search',
  name: 'Search',
  description: trim`
    Full-text search engine for finding content across all spaces and object types.
    Quickly locate documents, tables, and other objects with instant results and relevance ranking.
  `,
  icon: 'ph--magnifying-glass--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-search',
  tags: ['labs'],
};

export const SEARCH_RESULT = `${meta.id}/result`;
