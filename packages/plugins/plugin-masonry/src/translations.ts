//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Masonry } from './types';

export const translations = [
  {
    'en-US': {
      [Masonry.Masonry.typename]: {
        'typename label': 'Masonry',
        'typename label_zero': 'Masonries',
        'typename label_one': 'Masonry',
        'typename label_other': 'Masonries',
        'object name placeholder': 'New masonry',
      },
      [meta.id]: {
        'plugin name': 'Masonry',
      },
    },
  },
] as const satisfies Resource[];
