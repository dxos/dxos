//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin name': 'Feed',
        'empty feed message': 'No posts yet',
      },
    },
  },
] as const satisfies Resource[];
