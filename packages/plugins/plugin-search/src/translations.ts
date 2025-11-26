//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin name': 'Search',
        'search action label': 'Search spaces',
        'search placeholder': 'Search…',
        'search dialog title': 'Open',
        'recently closed heading': 'Recently closed',
        'pending results message': 'Searching…',
        'empty results message': 'No matching objects in your spaces',
        'search label': 'Search',
      },
    },
  },
] as const satisfies Resource[];
