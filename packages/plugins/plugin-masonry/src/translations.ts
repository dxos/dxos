//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Masonry } from './types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Masonry.Masonry)]: {
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
