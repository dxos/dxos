//
// Copyright 2023 DXOS.org
//

import { SEARCH_PLUGIN } from './meta';

export const translations = [
  {
    'en-US': {
      [SEARCH_PLUGIN]: {
        'plugin name': 'Search',
        'search action label': 'Search spaces',
        'search placeholder': 'Search…',
        'search dialog title': 'Open',
        'recently closed heading': 'Recently closed',
        'pending results message': 'Searching…',
        'empty results message': 'No matching items in your spaces',
        'search label': 'Search',
      },
    },
  },
] as const;

export default translations;
